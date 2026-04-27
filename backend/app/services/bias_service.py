"""
AURORA Bias Service - Production Grade
Merges: app/bias_service.py + aurora/bias_service.py
Features: dataset profiling, proxy detection, fairness metrics (fairlearn),
          intersectional bias, confidence scoring, risk scoring
"""

import pandas as pd
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import LabelEncoder
from typing import Optional
import warnings

warnings.filterwarnings("ignore")

try:
    from fairlearn.metrics import demographic_parity_difference, equalized_odds_difference
    FAIRLEARN_AVAILABLE = True
except ImportError:
    FAIRLEARN_AVAILABLE = False

from app.utils.logger import get_logger

logger = get_logger(__name__)

KNOWN_SENSITIVE = [
    "gender", "sex", "race", "ethnicity", "age", "religion",
    "nationality", "marital_status", "disability", "caste", "color",
]


# ─────────────────────────────────────────
# DATASET PROFILING
# ─────────────────────────────────────────

def detect_sensitive_attributes(df: pd.DataFrame) -> list:
    found = []
    for col in df.columns:
        for s in KNOWN_SENSITIVE:
            if s in col.lower():
                found.append(col)
                break
    return found


def profile_dataset(df: pd.DataFrame, sensitive_col: str, target_col: str) -> dict:
    total = len(df)
    missing = {k: int(v) for k, v in df.isnull().sum().items() if v > 0}

    target_dist = {str(k): round(float(v), 4)
                   for k, v in df[target_col].value_counts(normalize=True).items()}

    group_dist = {str(k): round(float(v), 4)
                  for k, v in df[sensitive_col].value_counts(normalize=True).items()}

    outcome_rates = {str(k): round(float(v), 4)
                     for k, v in df.groupby(sensitive_col)[target_col].mean().items()}

    group_sizes = {str(k): int(v)
                   for k, v in df[sensitive_col].value_counts().items()}

    return {
        "total_rows": total,
        "total_columns": len(df.columns),
        "missing_values": missing,
        "target_distribution": target_dist,
        "group_distribution": group_dist,
        "outcome_rates_per_group": outcome_rates,
        "group_sizes": group_sizes,
    }


# ─────────────────────────────────────────
# PROXY VARIABLE DETECTION
# ─────────────────────────────────────────

def detect_proxy_variables(df: pd.DataFrame, sensitive_col: str, threshold: float = 0.4) -> dict:
    df_enc = df.copy()
    for col in df_enc.select_dtypes(include="object").columns:
        le = LabelEncoder()
        df_enc[col] = le.fit_transform(df_enc[col].astype(str))

    # Ensure sensitive col is encoded
    if sensitive_col not in df_enc.columns:
        return {}

    try:
        corr = df_enc.corr(numeric_only=True)
        if sensitive_col not in corr.columns:
            return {}
        proxy_corr = corr[sensitive_col].drop(sensitive_col).abs().sort_values(ascending=False)
        return {col: round(float(v), 4) for col, v in proxy_corr.items() if v >= threshold}
    except Exception as e:
        logger.warning(f"Proxy detection failed: {e}")
        return {}


# ─────────────────────────────────────────
# FAIRNESS METRICS (with fallbacks)
# ─────────────────────────────────────────

def _compute_disparate_impact(y_pred: np.ndarray, sensitive: pd.Series) -> float:
    df = pd.DataFrame({"y": y_pred, "s": sensitive})
    rates = df.groupby("s")["y"].mean()
    if len(rates) < 2 or rates.max() == 0:
        return 1.0
    return float(rates.min() / rates.max())


def _compute_demographic_parity_diff_manual(y_pred: np.ndarray, sensitive: pd.Series) -> float:
    df = pd.DataFrame({"y": y_pred, "s": sensitive})
    rates = df.groupby("s")["y"].mean()
    if len(rates) < 2:
        return 0.0
    return float(rates.max() - rates.min())


def _compute_equalized_odds_diff_manual(y_true, y_pred, sensitive: pd.Series) -> float:
    df = pd.DataFrame({"y_true": y_true, "y_pred": y_pred, "s": sensitive})
    tpr_list, fpr_list = [], []
    for group in df["s"].unique():
        g = df[df["s"] == group]
        tp = ((g["y_pred"] == 1) & (g["y_true"] == 1)).sum()
        fn = ((g["y_pred"] == 0) & (g["y_true"] == 1)).sum()
        fp = ((g["y_pred"] == 1) & (g["y_true"] == 0)).sum()
        tn = ((g["y_pred"] == 0) & (g["y_true"] == 0)).sum()
        tpr = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        fpr = fp / (fp + tn) if (fp + tn) > 0 else 0.0
        tpr_list.append(tpr)
        fpr_list.append(fpr)
    return float(max(max(tpr_list) - min(tpr_list), max(fpr_list) - min(fpr_list)))


def _compute_statistical_parity_ratio(df: pd.DataFrame, sensitive_col: str, target_col: str) -> float:
    rates = df.groupby(sensitive_col)[target_col].mean()
    if len(rates) < 2 or rates.max() == 0:
        return 1.0
    return float(rates.min() / rates.max())


def _compute_group_fairness(df: pd.DataFrame, sensitive_col: str, target_col: str) -> dict:
    return {str(k): round(float(v), 4)
            for k, v in df.groupby(sensitive_col)[target_col].mean().items()}


# ─────────────────────────────────────────
# INTERSECTIONAL BIAS
# ─────────────────────────────────────────

def compute_intersectional_bias(df: pd.DataFrame, sensitive_cols: list, target_col: str) -> dict:
    if len(sensitive_cols) < 2:
        return {}
    try:
        grouped = df.groupby(sensitive_cols)[target_col].agg(["mean", "count"])
        result = {}
        for keys, row in grouped.iterrows():
            if isinstance(keys, tuple):
                label = " & ".join([f"{sensitive_cols[i]}={keys[i]}" for i in range(len(sensitive_cols))])
            else:
                label = f"{sensitive_cols[0]}={keys}"
            if row["count"] >= 10:  # minimum sample size for reliability
                result[label] = {
                    "outcome_rate": round(float(row["mean"]), 4),
                    "sample_size": int(row["count"]),
                }
        return result
    except Exception as e:
        logger.warning(f"Intersectional bias computation failed: {e}")
        return {}


# ─────────────────────────────────────────
# CONFIDENCE / STATISTICAL RELIABILITY
# ─────────────────────────────────────────

def compute_confidence_score(df: pd.DataFrame, sensitive_col: str) -> dict:
    """Rate how statistically reliable the analysis is"""
    group_sizes = df[sensitive_col].value_counts()
    min_size = int(group_sizes.min())
    n_groups = len(group_sizes)

    if min_size < 30:
        reliability = "LOW"
        note = f"Smallest group has only {min_size} samples. Results may be unreliable."
    elif min_size < 100:
        reliability = "MEDIUM"
        note = f"Smallest group has {min_size} samples. Results are moderately reliable."
    else:
        reliability = "HIGH"
        note = f"All groups have 100+ samples. Results are statistically reliable."

    return {
        "reliability": reliability,
        "min_group_size": min_size,
        "n_groups": n_groups,
        "note": note,
    }


# ─────────────────────────────────────────
# RISK SCORING
# ─────────────────────────────────────────

def compute_risk_score(dp: float, eo: float, di: float, spr: float) -> dict:
    dp_score  = min(abs(dp) / 0.3, 1.0) * 30
    eo_score  = min(abs(eo) / 0.3, 1.0) * 30
    di_score  = max(0.0, (0.8 - di) / 0.8) * 25
    spr_score = max(0.0, (0.8 - spr) / 0.8) * 15

    total = dp_score + eo_score + di_score + spr_score

    if total < 20:
        level = "LOW"
    elif total < 50:
        level = "MEDIUM"
    else:
        level = "HIGH"

    breakdown = {
        "demographic_parity_contribution": round(dp_score, 1),
        "equalized_odds_contribution": round(eo_score, 1),
        "disparate_impact_contribution": round(di_score, 1),
        "statistical_parity_contribution": round(spr_score, 1),
    }

    return {"score": round(total, 1), "level": level, "breakdown": breakdown}


# ─────────────────────────────────────────
# MAIN ANALYSIS PIPELINE
# ─────────────────────────────────────────

def analyze_bias(
    file_path: str,
    target: str,
    sensitive_feature: str,
    extra_sensitive: Optional[list] = None,
) -> dict:
    logger.info(f"Starting bias analysis: target={target}, sensitive={sensitive_feature}")

    df = pd.read_csv(file_path)

    if target not in df.columns:
        raise ValueError(f"Target column '{target}' not found. Available: {list(df.columns)}")
    if sensitive_feature not in df.columns:
        raise ValueError(f"Sensitive column '{sensitive_feature}' not found. Available: {list(df.columns)}")

    # Dataset profile
    profile = profile_dataset(df, sensitive_feature, target)

    # Statistical confidence
    confidence = compute_confidence_score(df, sensitive_feature)

    # Proxy detection
    proxies = detect_proxy_variables(df, sensitive_feature)

    # Auto detect additional sensitive
    auto_sensitive = detect_sensitive_attributes(df)

    # Statistical parity ratio (raw data)
    spr = _compute_statistical_parity_ratio(df, sensitive_feature, target)

    # Group fairness raw rates
    group_fairness = _compute_group_fairness(df, sensitive_feature, target)

    # Encode for model
    df_encoded = pd.get_dummies(df, drop_first=True)

    sensitive_cols_enc = [col for col in df_encoded.columns if sensitive_feature in col]
    if not sensitive_cols_enc:
        raise ValueError(f"Sensitive column '{sensitive_feature}' not found after encoding")
    sensitive_col_enc = sensitive_cols_enc[0]

    if target not in df_encoded.columns:
        raise ValueError("Target column lost after one-hot encoding (it may be categorical)")

    X = df_encoded.drop(columns=[target])
    y = df_encoded[target]
    sensitive_enc = df_encoded[sensitive_col_enc]

    model = LogisticRegression(max_iter=1000, random_state=42)
    model.fit(X, y)
    y_pred = model.predict(X)

    # Compute fairness metrics
    if FAIRLEARN_AVAILABLE:
        try:
            dp = float(demographic_parity_difference(y, y_pred, sensitive_features=sensitive_enc))
            eo = float(equalized_odds_difference(y, y_pred, sensitive_features=sensitive_enc))
        except Exception:
            dp = _compute_demographic_parity_diff_manual(y_pred, sensitive_enc)
            eo = _compute_equalized_odds_diff_manual(y, y_pred, sensitive_enc)
    else:
        dp = _compute_demographic_parity_diff_manual(y_pred, sensitive_enc)
        eo = _compute_equalized_odds_diff_manual(y, y_pred, sensitive_enc)

    di = _compute_disparate_impact(y_pred, sensitive_enc)

    # Intersectional bias
    candidates = list(extra_sensitive or [])
    for s in auto_sensitive:
        if s != sensitive_feature and s in df.columns and s not in candidates:
            candidates.append(s)
    intersectional = {}
    if candidates:
        intersectional = compute_intersectional_bias(df, [sensitive_feature] + candidates[:2], target)

    # Risk scoring
    risk = compute_risk_score(dp, eo, di, spr)

    # Feature importance from model coefficients
    feature_importance = {}
    if hasattr(model, "coef_"):
        coefs = model.coef_[0]
        raw = {fname: float(abs(coef)) for fname, coef in zip(X.columns, coefs)}
        total = sum(raw.values()) or 1
        feature_importance = dict(
            sorted(
                {k: round(v / total, 4) for k, v in raw.items()}.items(),
                key=lambda x: x[1],
                reverse=True,
            )[:10]
        )

    # Per-group model predictions
    model_group_rates = {}
    df_pred = df_encoded.copy()
    df_pred["_pred"] = y_pred
    df_pred["_sensitive"] = sensitive_enc
    for grp in df_pred["_sensitive"].unique():
        subset = df_pred[df_pred["_sensitive"] == grp]
        model_group_rates[str(grp)] = round(float(subset["_pred"].mean()), 4)

    logger.info(f"Analysis complete. Risk: {risk['level']} ({risk['score']})")

    return {
        "metrics": {
            "demographic_parity_difference": round(dp, 4),
            "equalized_odds_difference": round(eo, 4),
            "disparate_impact_ratio": round(di, 4),
            "statistical_parity_ratio": round(spr, 4),
        },
        "group_fairness": group_fairness,
        "model_group_rates": model_group_rates,
        "intersectional_bias": intersectional,
        "proxy_variables": proxies,
        "auto_detected_sensitive": auto_sensitive,
        "feature_importance": feature_importance,
        "dataset_profile": profile,
        "statistical_confidence": confidence,
        "risk": risk,
    }
