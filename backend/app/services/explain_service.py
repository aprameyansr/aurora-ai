"""
AURORA Explain Service - Production Grade
Structured Gemini explanations with root cause, risk, mitigation, compliance
"""

import os
import json
from dotenv import load_dotenv
from app.utils.logger import get_logger

load_dotenv()
logger = get_logger(__name__)

try:
    import google.generativeai as genai
    genai.configure(api_key=os.environ.get("GEMINI_API_KEY", ""))
    GEMINI_AVAILABLE = True
except Exception:
    GEMINI_AVAILABLE = False


SCHEMA = {
    "bias_detected": "bool",
    "summary": "1-2 sentence plain-language overview",
    "severity_explanation": "why this risk level was assigned",
    "root_causes": ["list of specific root cause strings"],
    "affected_groups": ["list of group names impacted"],
    "real_world_impact": "concrete examples of harm in context (jobs/loans/healthcare)",
    "mitigation_steps": [
        {"action": "short label", "description": "detailed explanation", "priority": "HIGH|MEDIUM|LOW"}
    ],
    "compliance_flags": ["EEOC 80% Rule", "EU AI Act Article 10", "etc."],
    "monitoring_recommendations": ["what to track post-deployment"],
    "confidence_note": "note about statistical reliability of the analysis",
}


def _build_prompt(bias_result: dict) -> str:
    metrics = bias_result.get("metrics", {})
    risk = bias_result.get("risk", {})
    proxies = bias_result.get("proxy_variables", {})
    group_fairness = bias_result.get("group_fairness", {})
    intersectional = bias_result.get("intersectional_bias", {})
    profile = bias_result.get("dataset_profile", {})
    confidence = bias_result.get("statistical_confidence", {})
    feature_importance = bias_result.get("feature_importance", {})

    return f"""You are an expert AI fairness auditor for a national AI governance platform.
Analyze the following bias metrics and generate a structured JSON report.

FAIRNESS METRICS:
{json.dumps(metrics, indent=2)}

RISK ASSESSMENT:
{json.dumps(risk, indent=2)}

GROUP OUTCOME RATES (raw data):
{json.dumps(group_fairness, indent=2)}

INTERSECTIONAL BIAS:
{json.dumps(intersectional, indent=2)}

PROXY VARIABLES DETECTED:
{json.dumps(proxies, indent=2)}

TOP INFLUENTIAL FEATURES:
{json.dumps(feature_importance, indent=2)}

DATASET PROFILE:
{json.dumps(profile, indent=2)}

STATISTICAL CONFIDENCE:
{json.dumps(confidence, indent=2)}

METRIC THRESHOLDS:
- Disparate Impact Ratio: Must be >= 0.8 (EEOC 80% rule)
- Demographic Parity Difference: Should be < 0.1
- Equalized Odds Difference: Should be < 0.1
- Statistical Parity Ratio: Should be >= 0.8

INSTRUCTIONS:
Respond ONLY with a valid JSON object. No markdown. No preamble.
Use this exact schema:
{json.dumps(SCHEMA, indent=2)}

Focus on actionable, specific insights. Reference specific metric values.
If proxy variables exist, explain why they are problematic.
If intersectional bias exists, call out the most affected intersection.
"""


def _rule_based_fallback(bias_result: dict) -> dict:
    """Generate explanation without LLM when Gemini unavailable."""
    metrics = bias_result.get("metrics", {})
    risk = bias_result.get("risk", {})
    proxies = bias_result.get("proxy_variables", {})
    group_fairness = bias_result.get("group_fairness", {})
    profile = bias_result.get("dataset_profile", {})

    dp = abs(metrics.get("demographic_parity_difference", 0))
    di = metrics.get("disparate_impact_ratio", 1.0)
    eo = abs(metrics.get("equalized_odds_difference", 0))
    level = risk.get("level", "LOW")

    root_causes = []
    if dp > 0.1:
        root_causes.append(f"Demographic parity difference of {dp:.3f} exceeds the 0.1 threshold, indicating unequal positive outcome rates across groups.")
    if di < 0.8:
        root_causes.append(f"Disparate impact ratio of {di:.3f} violates the EEOC 80% rule, meaning the disadvantaged group receives favorable decisions at less than 80% the rate of the privileged group.")
    if eo > 0.1:
        root_causes.append(f"Equalized odds difference of {eo:.3f} indicates the model makes proportionally different error types for different demographic groups.")
    if proxies:
        root_causes.append(f"Proxy variables detected ({', '.join(list(proxies.keys())[:3])}) that are correlated with the sensitive attribute and may be transmitting bias indirectly.")

    if not root_causes:
        root_causes = ["No significant bias detected. Metrics are within acceptable thresholds."]

    compliance_flags = []
    if di < 0.8:
        compliance_flags.append("VIOLATION: Disparate Impact Ratio < 0.8 — EEOC 80% Rule not satisfied")
    if dp > 0.1:
        compliance_flags.append("WARNING: Demographic Parity Difference > 0.1")
    if eo > 0.1:
        compliance_flags.append("WARNING: Equalized Odds Difference > 0.1")

    mitigation_steps = []
    if level in ("MEDIUM", "HIGH"):
        mitigation_steps = [
            {"action": "Reweighting", "description": "Apply sample weights inversely proportional to group frequency to balance training signal across demographic groups.", "priority": "HIGH"},
            {"action": "Feature Suppression", "description": "Remove the sensitive attribute and any detected proxy variables from the feature set.", "priority": "HIGH" if proxies else "MEDIUM"},
            {"action": "Fairness-Aware Training", "description": "Use constrained optimization (e.g., ExponentiatedGradient with DemographicParity) to enforce fairness during model training.", "priority": "MEDIUM"},
        ]

    groups = list(group_fairness.keys())
    rates = list(group_fairness.values())
    if len(rates) >= 2:
        min_idx = rates.index(min(rates))
        affected_groups = [str(groups[min_idx])]
    else:
        affected_groups = groups

    return {
        "bias_detected": level in ("MEDIUM", "HIGH"),
        "summary": f"Risk level: {level} (score: {risk.get('score', 0)}/100). " + (
            "Bias patterns were detected in this dataset that may lead to discriminatory outcomes."
            if level != "LOW" else
            "The model appears relatively fair across groups based on current metrics."
        ),
        "severity_explanation": f"Risk score of {risk.get('score', 0)}/100 based on demographic parity ({dp:.3f}), equalized odds ({eo:.3f}), and disparate impact ({di:.3f}).",
        "root_causes": root_causes,
        "affected_groups": affected_groups,
        "real_world_impact": "In high-stakes decisions (loan approvals, hiring, healthcare), these disparities translate directly to unequal access to opportunities for disadvantaged groups.",
        "mitigation_steps": mitigation_steps,
        "compliance_flags": compliance_flags,
        "monitoring_recommendations": [
            "Re-run bias audit quarterly or after each model retraining.",
            "Track approval rates by group in production to detect drift.",
            "Log all model decisions with demographic breakdown for auditability.",
        ],
        "confidence_note": bias_result.get("statistical_confidence", {}).get("note", ""),
        "_source": "rule_based_fallback",
    }


def generate_explanation(bias_result: dict) -> dict:
    if not GEMINI_AVAILABLE or not os.environ.get("GEMINI_API_KEY"):
        logger.warning("Gemini unavailable — using rule-based fallback")
        return _rule_based_fallback(bias_result)

    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        prompt = _build_prompt(bias_result)
        response = model.generate_content(prompt)
        text = response.text.strip()

        # Strip markdown fences
        if text.startswith("```"):
            parts = text.split("```")
            text = parts[1] if len(parts) > 1 else text
            if text.startswith("json"):
                text = text[4:]
        text = text.strip()

        parsed = json.loads(text)
        parsed["_source"] = "gemini"
        return parsed

    except json.JSONDecodeError as e:
        logger.warning(f"Gemini returned non-JSON: {e}")
        risk = bias_result.get("risk", {})
        return {
            **_rule_based_fallback(bias_result),
            "_source": "rule_based_fallback_json_error",
        }
    except Exception as e:
        logger.error(f"Gemini API error: {e}")
        return {
            **_rule_based_fallback(bias_result),
            "_source": "rule_based_fallback_api_error",
            "_error": str(e),
        }
