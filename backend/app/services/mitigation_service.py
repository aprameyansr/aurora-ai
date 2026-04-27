"""
AURORA Mitigation Service - Production Grade
Strategies: reweighting, feature suppression, fairness-aware (ExponentiatedGradient)
Returns before/after comparison with risk scores
"""

import pandas as pd
import numpy as np
from sklearn.linear_model import LogisticRegression
import warnings

warnings.filterwarnings("ignore")

try:
    from fairlearn.metrics import demographic_parity_difference, equalized_odds_difference
    from fairlearn.reductions import ExponentiatedGradient, DemographicParity
    FAIRLEARN_AVAILABLE = True
except ImportError:
    FAIRLEARN_AVAILABLE = False

from app.services.bias_service import (
    _compute_disparate_impact,
    compute_risk_score,
    detect_proxy_variables,
)
from app.utils.logger import get_logger

logger = get_logger(__name__)


def _encode(df: pd.DataFrame, target: str):
    df_enc = pd.get_dummies(df, drop_first=True)
    X = df_enc.drop(columns=[target])
    y = df_enc[target]
    return X, y, df_enc


def _get_sensitive_enc(df_enc: pd.DataFrame, sensitive_feature: str) -> pd.Series:
    cols = [c for c in df_enc.columns if sensitive_feature in c]
    if not cols:
        raise ValueError(f"Sensitive column '{sensitive_feature}' not found after encoding")
    return df_enc[cols[0]]


def _compute_metrics(y, y_pred, sensitive) -> dict:
    if FAIRLEARN_AVAILABLE:
        try:
            dp = float(demographic_parity_difference(y, y_pred, sensitive_features=sensitive))
            eo = float(equalized_odds_difference(y, y_pred, sensitive_features=sensitive))
        except Exception:
            dp = float(abs(y_pred[sensitive == sensitive.unique()[0]].mean() -
                          y_pred[sensitive == sensitive.unique()[-1]].mean())) if len(sensitive.unique()) >= 2 else 0.0
            eo = dp
    else:
        groups = sensitive.unique()
        rates = [y_pred[sensitive == g].mean() for g in groups]
        dp = float(max(rates) - min(rates)) if len(rates) >= 2 else 0.0
        eo = dp

    di = _compute_disparate_impact(y_pred, sensitive)
    return {
        "demographic_parity_difference": round(dp, 4),
        "equalized_odds_difference": round(eo, 4),
        "disparate_impact_ratio": round(di, 4),
    }


# ─────────────────────────────────────────
# STRATEGY 1: REWEIGHTING
# ─────────────────────────────────────────

def mitigate_reweighting(df: pd.DataFrame, target: str, sensitive_feature: str) -> dict:
    X, y, df_enc = _encode(df, target)
    sensitive = _get_sensitive_enc(df_enc, sensitive_feature)

    combo = pd.DataFrame({"s": sensitive.values, "y": y.values})
    freq = combo.groupby(["s", "y"]).transform("count").iloc[:, 0]
    weights = 1.0 / (freq + 1e-6)
    weights = weights / weights.sum() * len(weights)

    base_model = LogisticRegression(max_iter=1000, random_state=42)
    base_model.fit(X, y)
    base_pred = base_model.predict(X)
    before = _compute_metrics(y, base_pred, sensitive)

    fair_model = LogisticRegression(max_iter=1000, random_state=42)
    fair_model.fit(X, y, sample_weight=weights.values)
    fair_pred = fair_model.predict(X)
    after = _compute_metrics(y, fair_pred, sensitive)

    before_risk = compute_risk_score(
        before["demographic_parity_difference"], before["equalized_odds_difference"],
        before["disparate_impact_ratio"], before["disparate_impact_ratio"],
    )
    after_risk = compute_risk_score(
        after["demographic_parity_difference"], after["equalized_odds_difference"],
        after["disparate_impact_ratio"], after["disparate_impact_ratio"],
    )

    return {
        "strategy": "Reweighting",
        "description": "Sample weights inversely proportional to group frequency, upweighting underrepresented (sensitive, outcome) combinations.",
        "before": {"metrics": before, "risk": before_risk},
        "after": {"metrics": after, "risk": after_risk},
        "improvement": round(before_risk["score"] - after_risk["score"], 1),
    }


# ─────────────────────────────────────────
# STRATEGY 2: FEATURE SUPPRESSION
# ─────────────────────────────────────────

def mitigate_feature_suppression(
    df: pd.DataFrame, target: str, sensitive_feature: str, proxy_threshold: float = 0.4
) -> dict:
    proxies = detect_proxy_variables(df, sensitive_feature, threshold=proxy_threshold)
    cols_to_remove = list(proxies.keys()) + [sensitive_feature]
    cols_to_remove = [c for c in cols_to_remove if c in df.columns and c != target]

    df_suppressed = df.drop(columns=cols_to_remove)

    X_base, y_base, df_enc_base = _encode(df, target)
    sensitive_base = _get_sensitive_enc(df_enc_base, sensitive_feature)

    X_fair, y_fair, _ = _encode(df_suppressed, target)

    base_model = LogisticRegression(max_iter=1000, random_state=42)
    base_model.fit(X_base, y_base)
    base_pred = base_model.predict(X_base)
    before = _compute_metrics(y_base, base_pred, sensitive_base)

    fair_model = LogisticRegression(max_iter=1000, random_state=42)
    fair_model.fit(X_fair, y_fair)
    fair_pred = fair_model.predict(X_fair)
    after = _compute_metrics(y_fair, fair_pred, sensitive_base)

    before_risk = compute_risk_score(
        before["demographic_parity_difference"], before["equalized_odds_difference"],
        before["disparate_impact_ratio"], before["disparate_impact_ratio"],
    )
    after_risk = compute_risk_score(
        after["demographic_parity_difference"], after["equalized_odds_difference"],
        after["disparate_impact_ratio"], after["disparate_impact_ratio"],
    )

    return {
        "strategy": "Feature Suppression",
        "description": f"Removed sensitive attribute and {len(proxies)} proxy variables before training.",
        "removed_features": cols_to_remove,
        "proxy_correlations": proxies,
        "before": {"metrics": before, "risk": before_risk},
        "after": {"metrics": after, "risk": after_risk},
        "improvement": round(before_risk["score"] - after_risk["score"], 1),
    }


# ─────────────────────────────────────────
# STRATEGY 3: FAIRNESS-AWARE TRAINING
# ─────────────────────────────────────────

def mitigate_fairness_aware(df: pd.DataFrame, target: str, sensitive_feature: str) -> dict:
    X, y, df_enc = _encode(df, target)
    sensitive = _get_sensitive_enc(df_enc, sensitive_feature)

    base_model = LogisticRegression(max_iter=1000, random_state=42)
    base_model.fit(X, y)
    base_pred = base_model.predict(X)
    before = _compute_metrics(y, base_pred, sensitive)

    success = False
    error_msg = None

    if FAIRLEARN_AVAILABLE:
        try:
            constraint = DemographicParity()
            mitigator = ExponentiatedGradient(
                LogisticRegression(max_iter=1000, random_state=42), constraint
            )
            mitigator.fit(X, y, sensitive_features=sensitive)
            fair_pred = mitigator.predict(X)
            after = _compute_metrics(y, fair_pred, sensitive)
            success = True
        except Exception as e:
            error_msg = str(e)
            after = before.copy()
    else:
        error_msg = "fairlearn not installed"
        after = before.copy()

    before_risk = compute_risk_score(
        before["demographic_parity_difference"], before["equalized_odds_difference"],
        before["disparate_impact_ratio"], before["disparate_impact_ratio"],
    )
    after_risk = compute_risk_score(
        after["demographic_parity_difference"], after["equalized_odds_difference"],
        after["disparate_impact_ratio"], after["disparate_impact_ratio"],
    )

    result = {
        "strategy": "Fairness-Aware Training",
        "description": "Uses ExponentiatedGradient with DemographicParity constraint to enforce fairness during optimization.",
        "success": success,
        "before": {"metrics": before, "risk": before_risk},
        "after": {"metrics": after, "risk": after_risk},
        "improvement": round(before_risk["score"] - after_risk["score"], 1),
    }
    if error_msg:
        result["error"] = error_msg
    return result


# ─────────────────────────────────────────
# RUN ALL STRATEGIES
# ─────────────────────────────────────────

def run_all_mitigations(file_path: str, target: str, sensitive_feature: str) -> dict:
    logger.info(f"Running all mitigations: target={target}, sensitive={sensitive_feature}")
    df = pd.read_csv(file_path)
    results = {}

    for name, fn in [
        ("reweighting", mitigate_reweighting),
        ("feature_suppression", mitigate_feature_suppression),
        ("fairness_aware", mitigate_fairness_aware),
    ]:
        try:
            results[name] = fn(df.copy(), target, sensitive_feature)
            logger.info(f"  {name}: improvement={results[name].get('improvement', 0)}")
        except Exception as e:
            logger.error(f"  {name} failed: {e}")
            results[name] = {"error": str(e), "strategy": name}

    return results
