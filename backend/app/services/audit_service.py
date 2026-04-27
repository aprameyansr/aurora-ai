"""
AURORA Audit Service - Production Grade
Generates compliance-style fairness audit reports
"""

from datetime import datetime
from app.utils.logger import get_logger

logger = get_logger(__name__)


def _get_recommendation(level: str) -> str:
    return {
        "LOW": "System passes basic fairness checks. Continue monitoring in production.",
        "MEDIUM": "Bias patterns detected. Apply mitigation strategies before deployment.",
        "HIGH": "Severe bias detected. DO NOT DEPLOY. Immediate remediation required.",
    }.get(level, "Manual review required.")


def generate_audit_report(
    filename: str,
    target: str,
    sensitive: str,
    bias_result: dict,
    explanation: dict,
    mitigation_result: dict = None,
) -> dict:
    logger.info(f"Generating audit report for {filename}")

    metrics = bias_result.get("metrics", {})
    risk = bias_result.get("risk", {})
    profile = bias_result.get("dataset_profile", {})
    proxies = bias_result.get("proxy_variables", {})
    group_fairness = bias_result.get("group_fairness", {})
    intersectional = bias_result.get("intersectional_bias", {})
    confidence = bias_result.get("statistical_confidence", {})

    dp  = metrics.get("demographic_parity_difference", 0)
    di  = metrics.get("disparate_impact_ratio", 1)
    eo  = metrics.get("equalized_odds_difference", 0)
    spr = metrics.get("statistical_parity_ratio", 1)

    # Compliance flags
    flags = []
    if di < 0.8:
        flags.append(f"VIOLATION: Disparate Impact Ratio = {di:.3f} < 0.8 (EEOC 80% Rule / EU AI Act)")
    if abs(dp) > 0.1:
        flags.append(f"WARNING: Demographic Parity Difference = {abs(dp):.3f} > 0.1 threshold")
    if abs(eo) > 0.1:
        flags.append(f"WARNING: Equalized Odds Difference = {abs(eo):.3f} > 0.1 threshold")
    if spr < 0.8:
        flags.append(f"WARNING: Statistical Parity Ratio = {spr:.3f} < 0.8 threshold")
    if proxies:
        top_proxies = list(proxies.keys())[:3]
        flags.append(f"INFO: Proxy variables detected: {', '.join(top_proxies)}")
    if confidence.get("reliability") == "LOW":
        flags.append(f"INFO: Low statistical reliability ({confidence.get('note', '')})")

    # Best mitigation strategy
    best_mitigation = None
    if mitigation_result:
        valid = [(k, v) for k, v in mitigation_result.items()
                 if isinstance(v, dict) and "improvement" in v]
        if valid:
            best_k, best_v = max(valid, key=lambda x: x[1]["improvement"])
            best_mitigation = {
                "strategy": best_v.get("strategy", best_k),
                "description": best_v.get("description", ""),
                "risk_before": best_v["before"]["risk"]["level"],
                "risk_after": best_v["after"]["risk"]["level"],
                "score_before": best_v["before"]["risk"]["score"],
                "score_after": best_v["after"]["risk"]["score"],
                "improvement_score": best_v["improvement"],
            }

    # All mitigation summaries
    mitigation_summary = {}
    if mitigation_result:
        for k, v in mitigation_result.items():
            if isinstance(v, dict) and "improvement" in v:
                mitigation_summary[k] = {
                    "strategy": v.get("strategy", k),
                    "improvement": v.get("improvement", 0),
                    "before_risk": v["before"]["risk"]["level"],
                    "after_risk": v["after"]["risk"]["level"],
                }

    recommended_actions = []
    for step in explanation.get("mitigation_steps", []):
        if isinstance(step, dict):
            action = step.get("action", "")
            desc = step.get("description", "")
            priority = step.get("priority", "")
            recommended_actions.append(f"[{priority}] {action}: {desc}")
        elif isinstance(step, str):
            recommended_actions.append(step)

    report = {
        "report_metadata": {
            "generated_at": datetime.utcnow().isoformat() + "Z",
            "dataset": filename,
            "target_variable": target,
            "sensitive_attribute": sensitive,
            "aurora_version": "2.0.0",
        },
        "executive_summary": {
            "overall_risk": risk.get("level", "UNKNOWN"),
            "risk_score": risk.get("score", 0),
            "bias_detected": risk.get("level") in ("MEDIUM", "HIGH"),
            "total_compliance_flags": len(flags),
            "recommendation": _get_recommendation(risk.get("level", "LOW")),
        },
        "dataset_overview": {
            "rows": profile.get("total_rows"),
            "columns": profile.get("total_columns"),
            "missing_values": profile.get("missing_values", {}),
            "group_sizes": profile.get("group_sizes", {}),
            "outcome_rates_per_group": profile.get("outcome_rates_per_group", {}),
            "statistical_confidence": confidence,
        },
        "fairness_metrics": {
            "demographic_parity_difference": round(dp, 4),
            "equalized_odds_difference": round(eo, 4),
            "disparate_impact_ratio": round(di, 4),
            "statistical_parity_ratio": round(spr, 4),
            "risk_breakdown": risk.get("breakdown", {}),
            "thresholds": {
                "disparate_impact": ">= 0.8 (EEOC 80% Rule)",
                "demographic_parity": "< 0.1",
                "equalized_odds": "< 0.1",
                "statistical_parity": ">= 0.8",
            },
        },
        "group_analysis": {
            "outcome_rates_by_group": group_fairness,
            "intersectional_bias": intersectional,
        },
        "compliance_flags": flags,
        "proxy_variables_detected": proxies,
        "ai_analysis": {
            "summary": explanation.get("summary", ""),
            "root_causes": explanation.get("root_causes", []),
            "affected_groups": explanation.get("affected_groups", []),
            "real_world_impact": explanation.get("real_world_impact", ""),
            "compliance_flags_ai": explanation.get("compliance_flags", []),
        },
        "mitigation_strategies": mitigation_summary,
        "best_mitigation": best_mitigation,
        "recommended_actions": recommended_actions,
        "monitoring_recommendations": explanation.get("monitoring_recommendations", []),
        "deployment_decision": {
            "safe_to_deploy": risk.get("level") == "LOW",
            "requires_review": risk.get("level") == "MEDIUM",
            "blocked": risk.get("level") == "HIGH",
            "reason": _get_recommendation(risk.get("level", "LOW")),
        },
    }

    return report
