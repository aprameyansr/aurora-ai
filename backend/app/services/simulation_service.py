"""
AURORA Simulation Service - Production Grade
Merges: app/simulation_service.py + aurora/simulation_service.py
Features: what-if, counterfactuals, bias sensitivity test, scenario generation, decision boundary
"""

import pandas as pd
import numpy as np
from sklearn.linear_model import LogisticRegression
from typing import Any

from app.utils.logger import get_logger

logger = get_logger(__name__)


class SimulationEngine:
    def __init__(self, file_path: str, target: str, sensitive_feature: str = ""):
        self.file_path = file_path
        self.target = target
        self.sensitive_feature = sensitive_feature

        self.df = pd.read_csv(file_path)
        self.original_df = self.df.copy()

        self.categorical_cols = self.df.select_dtypes(include="object").columns.tolist()
        self.numeric_cols = self.df.select_dtypes(include=["int64", "float64"]).columns.tolist()
        if target in self.numeric_cols:
            self.numeric_cols.remove(target)

        self.df_encoded = pd.get_dummies(self.df, drop_first=True)
        self.X = self.df_encoded.drop(columns=[target])
        self.y = self.df_encoded[target]

        self.model = LogisticRegression(max_iter=1000, random_state=42)
        self.model.fit(self.X, self.y)
        self.feature_names = list(self.X.columns)

        logger.info(f"SimulationEngine ready: {len(self.feature_names)} features, {len(self.df)} rows")

    def _encode_input(self, input_data: dict) -> pd.DataFrame:
        input_df = pd.DataFrame([input_data])
        input_encoded = pd.get_dummies(input_df)
        input_encoded = input_encoded.reindex(columns=self.feature_names, fill_value=0)
        return input_encoded

    def predict(self, input_data: dict) -> dict:
        enc = self._encode_input(input_data)
        pred = int(self.model.predict(enc)[0])
        proba = self.model.predict_proba(enc)[0]
        prob_positive = float(proba[1]) if len(proba) > 1 else float(proba[0])
        confidence = round(float(max(proba)), 4)
        return {
            "prediction": pred,
            "probability": round(prob_positive, 4),
            "confidence": confidence,
            "label": "Approved" if pred == 1 else "Rejected",
        }

    def what_if(self, original: dict, modified: dict) -> dict:
        orig_result = self.predict(original)
        mod_result = self.predict(modified)
        prob_delta = round(mod_result["probability"] - orig_result["probability"], 4)
        return {
            "original": orig_result,
            "modified": mod_result,
            "changes": {k: v for k, v in modified.items() if original.get(k) != v},
            "decision_changed": orig_result["prediction"] != mod_result["prediction"],
            "probability_delta": prob_delta,
            "impact": f"Probability {'increased' if prob_delta > 0 else 'decreased'} by {abs(prob_delta):.2%}",
        }

    def generate_counterfactuals(self, input_data: dict, desired_outcome: int = 1, n: int = 5) -> list:
        enc = self._encode_input(input_data)
        current_pred = int(self.model.predict(enc)[0])

        if current_pred == desired_outcome:
            return [{"message": "Input already achieves the desired outcome", "changes": {}}]

        counterfactuals = []
        numeric_features = [f for f in self.feature_names if any(nf in f for nf in self.numeric_cols)]

        for feat in numeric_features[:10]:
            if feat not in enc.columns:
                continue
            original_val = float(enc[feat].values[0])
            col_vals = self.X[feat]
            for candidate in np.linspace(float(col_vals.quantile(0.05)), float(col_vals.quantile(0.95)), 30):
                trial = enc.copy()
                trial[feat] = candidate
                new_pred = int(self.model.predict(trial)[0])
                if new_pred == desired_outcome:
                    change_pct = round((candidate - original_val) / (abs(original_val) + 1e-6) * 100, 1)
                    counterfactuals.append({
                        "changed_feature": feat,
                        "from_value": round(original_val, 2),
                        "to_value": round(float(candidate), 2),
                        "change_percent": change_pct,
                        "direction": "increase" if candidate > original_val else "decrease",
                        "outcome": "Approved" if desired_outcome == 1 else "Rejected",
                    })
                    break
            if len(counterfactuals) >= n:
                break

        return counterfactuals

    def bias_sensitivity_test(self, input_data: dict, sensitive_feature: str) -> dict:
        results = {}
        enc_cols = [f for f in self.feature_names if sensitive_feature in f]

        if enc_cols:
            for val in [0, 1]:
                trial = self._encode_input(input_data)
                for c in enc_cols:
                    trial[c] = 0
                trial[enc_cols[0]] = val
                pred = int(self.model.predict(trial)[0])
                proba = self.model.predict_proba(trial)[0]
                label = f"{sensitive_feature}={'B' if val else 'A'}"
                results[label] = {
                    "prediction": pred,
                    "probability": round(float(proba[1]) if len(proba) > 1 else float(proba[0]), 4),
                    "confidence": round(float(max(proba)), 4),
                    "label": "Approved" if pred == 1 else "Rejected",
                }
        elif sensitive_feature in self.original_df.columns:
            for val in self.original_df[sensitive_feature].unique():
                trial = input_data.copy()
                trial[sensitive_feature] = val
                result = self.predict(trial)
                results[f"{sensitive_feature}={val}"] = result

        decisions = [v["prediction"] for v in results.values()]
        bias_detected = len(set(decisions)) > 1
        prob_values = [v.get("probability", 0) for v in results.values()]
        prob_delta = round(max(prob_values) - min(prob_values), 4) if prob_values else 0

        return {
            "sensitive_feature": sensitive_feature,
            "results_by_group": results,
            "bias_detected": bias_detected,
            "probability_delta": prob_delta,
            "verdict": (
                f"BIAS DETECTED: Decision changes when {sensitive_feature} changes (all else equal)."
                if bias_detected else
                f"No decision-level bias detected for '{sensitive_feature}'. Probability delta: {prob_delta:.3f}."
            ),
        }

    def generate_scenarios(self, base_input: dict, n_scenarios: int = 4) -> list:
        labels = ["Conservative", "Baseline", "Optimistic", "Best Case"]
        factors = [0.7, 1.0, 1.2, 1.4]

        scenarios = []
        for label, factor in zip(labels[:n_scenarios], factors[:n_scenarios]):
            scenario = {}
            for k, v in base_input.items():
                if isinstance(v, (int, float)):
                    scenario[k] = round(v * factor, 2)
                else:
                    scenario[k] = v
            result = self.predict(scenario)
            scenarios.append({"scenario": label, "factor": factor, "inputs": scenario, "result": result})
        return scenarios

    def feature_sweep(self, base_input: dict, feature: str, steps: int = 12) -> dict:
        if feature not in self.X.columns:
            raise ValueError(f"Feature '{feature}' not in model features")

        lo = float(self.X[feature].quantile(0.05))
        hi = float(self.X[feature].quantile(0.95))
        values = np.linspace(lo, hi, steps)

        probs = []
        for v in values:
            enc = self._encode_input(base_input)
            enc[feature] = v
            proba = self.model.predict_proba(enc)[0]
            probs.append(round(float(proba[1]) if len(proba) > 1 else float(proba[0]), 4))

        threshold_val = None
        for i in range(len(probs) - 1):
            if (probs[i] < 0.5) != (probs[i + 1] < 0.5):
                threshold_val = round((values[i] + values[i + 1]) / 2, 2)

        return {
            "feature": feature,
            "values": [round(v, 2) for v in values],
            "probabilities": probs,
            "decision_threshold_value": threshold_val,
            "current_value": base_input.get(feature),
        }

    def decision_boundary_sample(self, feature_x: str, feature_y: str, base_input: dict, steps: int = 8) -> list:
        if feature_x not in self.X.columns or feature_y not in self.X.columns:
            return []

        x_vals = np.linspace(float(self.X[feature_x].min()), float(self.X[feature_x].max()), steps)
        y_vals = np.linspace(float(self.X[feature_y].min()), float(self.X[feature_y].max()), steps)

        points = []
        for xv in x_vals:
            for yv in y_vals:
                trial = self._encode_input(base_input)
                trial[feature_x] = xv
                trial[feature_y] = yv
                pred = int(self.model.predict(trial)[0])
                proba = self.model.predict_proba(trial)[0]
                points.append({
                    feature_x: round(xv, 2),
                    feature_y: round(yv, 2),
                    "prediction": pred,
                    "probability": round(float(proba[1]) if len(proba) > 1 else float(proba[0]), 4),
                })
        return points
