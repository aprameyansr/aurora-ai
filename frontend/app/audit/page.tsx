"use client";

import { useState } from "react";
import { useAppContext } from "@/Context/AppContext";
import { generateAudit } from "@/lib/api";
import Link from "next/link";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, color: "#64748b", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.1em", marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid #1a1a2e" }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Flag({ text }: { text: string }) {
  const isViolation = text.startsWith("VIOLATION");
  const isWarning = text.startsWith("WARNING");
  const color = isViolation ? "#fca5a5" : isWarning ? "#fcd34d" : "#94a3b8";
  const bg = isViolation ? "rgba(239,68,68,0.08)" : isWarning ? "rgba(245,158,11,0.08)" : "rgba(100,116,139,0.08)";
  const border = isViolation ? "rgba(239,68,68,0.25)" : isWarning ? "rgba(245,158,11,0.25)" : "rgba(100,116,139,0.2)";
  return (
    <div style={{ padding: "10px 14px", borderRadius: 8, background: bg, border: `1px solid ${border}`, marginBottom: 8, fontSize: 13, color, display: "flex", gap: 10 }}>
      <span>{isViolation ? "✗" : isWarning ? "⚠" : "ℹ"}</span>
      <span>{text}</span>
    </div>
  );
}

export default function AuditPage() {
  const { uploadedFileName, target, sensitive, biasMetrics, explanation, mitigationResult, auditReport, setAuditReport } = useAppContext();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    if (!biasMetrics || !explanation) {
      setError("Complete bias analysis first (Upload → Dashboard).");
      return;
    }
    setGenerating(true);
    setError("");
    try {
      const res = await generateAudit({
        filename: uploadedFileName || "dataset.csv",
        target,
        sensitive,
        bias_result: biasMetrics,
        explanation,
        mitigation_result: mitigationResult || undefined,
      });
      setAuditReport(res.audit_report);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const report = auditReport;
  const exec = report?.executive_summary;
  const level = exec?.overall_risk || "UNKNOWN";
  const RISK_COLORS: Record<string, string> = { HIGH: "#ef4444", MEDIUM: "#f59e0b", LOW: "#10b981" };
  const rColor = RISK_COLORS[level] || "#64748b";

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px 80px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 36 }}>
        <div>
          <div style={{ fontSize: 11, color: "#7c3aed", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.1em", marginBottom: 8 }}>COMPLIANCE AUDIT</div>
          <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 6 }}>Audit Report</h1>
          <p style={{ color: "#64748b", fontSize: 14 }}>EEOC · EU AI Act · Full governance trail</p>
        </div>
        <Link href="/dashboard">
          <button style={{ padding: "10px 18px", background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 10, color: "#e2e8f0", cursor: "pointer", fontSize: 13 }}>
            ← Analysis
          </button>
        </Link>
      </div>

      {error && (
        <div style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", fontSize: 14, marginBottom: 24 }}>
          {error}
        </div>
      )}

      {!report ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>◉</div>
          <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Generate Audit Report</div>
          <div style={{ color: "#64748b", marginBottom: 32, fontSize: 14 }}>
            Synthesizes bias metrics, AI explanation, and mitigation results<br />into a compliance-ready governance document.
          </div>
          <button
            onClick={generate}
            disabled={generating || !biasMetrics}
            style={{
              padding: "16px 48px",
              background: !biasMetrics ? "#1a1a2e" : "linear-gradient(135deg, #7c3aed, #2563eb)",
              border: "none", borderRadius: 14,
              color: "white", fontSize: 16, fontWeight: 700,
              cursor: !biasMetrics ? "not-allowed" : "pointer",
            }}
          >
            {generating ? "⌛ Generating..." : "◉ Generate Full Audit Report"}
          </button>
          {!biasMetrics && (
            <div style={{ marginTop: 16, color: "#64748b", fontSize: 13 }}>
              ← Complete bias analysis first.{" "}
              <Link href="/upload" style={{ color: "#a78bfa" }}>Upload dataset</Link>
            </div>
          )}
        </div>
      ) : (
        <div>
          {/* Deployment banner */}
          <div style={{
            padding: "24px 28px", borderRadius: 16, marginBottom: 24,
            background: report.deployment_decision?.safe_to_deploy
              ? "rgba(16,185,129,0.08)" : report.deployment_decision?.blocked
              ? "rgba(239,68,68,0.08)" : "rgba(245,158,11,0.08)",
            border: `1px solid ${report.deployment_decision?.safe_to_deploy ? "rgba(16,185,129,0.3)" : report.deployment_decision?.blocked ? "rgba(239,68,68,0.3)" : "rgba(245,158,11,0.3)"}`,
            display: "flex", alignItems: "center", gap: 20,
          }}>
            <div style={{
              fontSize: 36,
              color: report.deployment_decision?.safe_to_deploy ? "#10b981" : report.deployment_decision?.blocked ? "#ef4444" : "#f59e0b",
            }}>
              {report.deployment_decision?.safe_to_deploy ? "✓" : report.deployment_decision?.blocked ? "✗" : "⚠"}
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>
                {report.deployment_decision?.safe_to_deploy
                  ? "SAFE TO DEPLOY"
                  : report.deployment_decision?.blocked
                  ? "DEPLOYMENT BLOCKED"
                  : "REVIEW REQUIRED BEFORE DEPLOYMENT"}
              </div>
              <div style={{ color: "#94a3b8", fontSize: 14 }}>{report.deployment_decision?.reason}</div>
            </div>
            <div style={{ marginLeft: "auto", textAlign: "right" }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: rColor, fontFamily: "'JetBrains Mono',monospace" }}>{exec?.risk_score}</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>RISK SCORE</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, marginBottom: 20 }}>
            {/* Left column */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Report metadata */}
              <div style={{ background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 16, padding: "24px" }}>
                <Section title="REPORT METADATA">
                  {Object.entries(report.report_metadata || {}).map(([k, v]) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #1a1a2e" }}>
                      <span style={{ color: "#64748b", fontSize: 13 }}>{k.replace(/_/g, " ")}</span>
                      <span style={{ color: "#e2e8f0", fontSize: 13, fontFamily: "'JetBrains Mono',monospace", maxWidth: 300, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{String(v)}</span>
                    </div>
                  ))}
                </Section>
              </div>

              {/* Fairness metrics */}
              <div style={{ background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 16, padding: "24px" }}>
                <Section title="FAIRNESS METRICS">
                  {Object.entries(report.fairness_metrics || {}).filter(([k]) => !["thresholds", "risk_breakdown"].includes(k)).map(([k, v]) => {
                    const numVal = typeof v === "number" ? v : null;
                    const thresholds: Record<string, { t: number; invert: boolean }> = {
                      demographic_parity_difference: { t: 0.1, invert: false },
                      equalized_odds_difference: { t: 0.1, invert: false },
                      disparate_impact_ratio: { t: 0.8, invert: true },
                      statistical_parity_ratio: { t: 0.8, invert: true },
                    };
                    const th = thresholds[k];
                    const pass = numVal !== null && th ? (th.invert ? numVal >= th.t : Math.abs(numVal) <= th.t) : null;
                    return (
                      <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #1a1a2e" }}>
                        <span style={{ color: "#94a3b8", fontSize: 13 }}>{k.replace(/_/g, " ")}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ color: pass === false ? "#ef4444" : pass === true ? "#10b981" : "#94a3b8", fontFamily: "'JetBrains Mono',monospace", fontSize: 14 }}>
                            {typeof v === "number" ? v.toFixed(4) : String(v)}
                          </span>
                          {pass !== null && (
                            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20,
                              background: pass ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                              color: pass ? "#6ee7b7" : "#fca5a5" }}>
                              {pass ? "PASS" : "FAIL"}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </Section>
              </div>

              {/* Compliance flags */}
              <div style={{ background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 16, padding: "24px" }}>
                <Section title={`COMPLIANCE FLAGS (${report.compliance_flags?.length || 0})`}>
                  {(report.compliance_flags || []).length > 0
                    ? report.compliance_flags.map((f: string, i: number) => <Flag key={i} text={f} />)
                    : <div style={{ color: "#10b981", fontSize: 14 }}>✓ No compliance violations detected</div>
                  }
                </Section>
              </div>

              {/* AI Summary */}
              {report.ai_analysis?.summary && (
                <div style={{ background: "#0d0d14", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 16, padding: "24px" }}>
                  <Section title="AI GOVERNANCE ANALYSIS">
                    <p style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>{report.ai_analysis.summary}</p>
                    {report.ai_analysis.root_causes?.length > 0 && (
                      <div>
                        <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>ROOT CAUSES</div>
                        {report.ai_analysis.root_causes.map((c: string, i: number) => (
                          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                            <span style={{ color: "#7c3aed" }}>▸</span>
                            <span style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.6 }}>{c}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </Section>
                </div>
              )}
            </div>

            {/* Right column */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Dataset overview */}
              <div style={{ background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 16, padding: "24px" }}>
                <Section title="DATASET OVERVIEW">
                  {[
                    ["Rows", report.dataset_overview?.rows],
                    ["Columns", report.dataset_overview?.columns],
                    ["Statistical Reliability", report.dataset_overview?.statistical_confidence?.reliability],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #1a1a2e" }}>
                      <span style={{ color: "#64748b", fontSize: 13 }}>{k}</span>
                      <span style={{ color: "#e2e8f0", fontSize: 13, fontFamily: "'JetBrains Mono',monospace" }}>{String(v)}</span>
                    </div>
                  ))}
                  {report.dataset_overview?.group_sizes && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>Group Sizes</div>
                      {Object.entries(report.dataset_overview.group_sizes).map(([k, v]: any) => (
                        <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 12 }}>
                          <span style={{ color: "#94a3b8" }}>{k}</span>
                          <span style={{ color: "#a78bfa", fontFamily: "'JetBrains Mono',monospace" }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </Section>
              </div>

              {/* Best mitigation */}
              {report.best_mitigation && (
                <div style={{ background: "#0d0d14", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 16, padding: "24px" }}>
                  <Section title="BEST MITIGATION STRATEGY">
                    <div style={{ fontSize: 15, fontWeight: 600, color: "#e2e8f0", marginBottom: 8 }}>{report.best_mitigation.strategy}</div>
                    <p style={{ fontSize: 12, color: "#64748b", marginBottom: 12, lineHeight: 1.6 }}>{report.best_mitigation.description}</p>
                    <div style={{ display: "flex", gap: 10 }}>
                      {["before", "after"].map(phase => (
                        <div key={phase} style={{ flex: 1, textAlign: "center", background: "#080810", borderRadius: 8, padding: 12 }}>
                          <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>{phase}</div>
                          <div style={{ fontSize: 22, fontWeight: 700, color: phase === "before" ? "#ef4444" : "#10b981", fontFamily: "'JetBrains Mono',monospace" }}>
                            {phase === "before" ? report.best_mitigation.score_before : report.best_mitigation.score_after}
                          </div>
                          <div style={{ fontSize: 10, color: "#64748b" }}>
                            {phase === "before" ? report.best_mitigation.risk_before : report.best_mitigation.risk_after}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 12, textAlign: "center", fontSize: 14, color: "#10b981", fontWeight: 700 }}>
                      ↓ {report.best_mitigation.improvement_score} risk score reduction
                    </div>
                  </Section>
                </div>
              )}

              {/* Recommended actions */}
              {report.recommended_actions?.length > 0 && (
                <div style={{ background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 16, padding: "24px" }}>
                  <Section title="RECOMMENDED ACTIONS">
                    {report.recommended_actions.map((a: string, i: number) => (
                      <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, fontSize: 13, color: "#94a3b8", lineHeight: 1.5 }}>
                        <span style={{ color: "#7c3aed", flexShrink: 0 }}>{i + 1}.</span>
                        {a}
                      </div>
                    ))}
                  </Section>
                </div>
              )}

              {/* Monitoring */}
              {report.monitoring_recommendations?.length > 0 && (
                <div style={{ background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 16, padding: "24px" }}>
                  <Section title="MONITORING RECOMMENDATIONS">
                    {report.monitoring_recommendations.map((m: string, i: number) => (
                      <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, fontSize: 13, color: "#94a3b8" }}>
                        <span style={{ color: "#06b6d4", flexShrink: 0 }}>◆</span>
                        {m}
                      </div>
                    ))}
                  </Section>
                </div>
              )}
            </div>
          </div>

          {/* Re-generate */}
          <div style={{ textAlign: "center" }}>
            <button onClick={generate} disabled={generating} style={{
              padding: "12px 32px", background: "#0d0d14", border: "1px solid #1a1a2e",
              borderRadius: 10, color: "#64748b", cursor: "pointer", fontSize: 14,
            }}>
              {generating ? "⌛ Regenerating..." : "↻ Regenerate Report"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
