"use client";

import { useState } from "react";
import { useAppContext } from "@/Context/AppContext";
import { runMitigation } from "@/lib/api";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, Legend,
} from "recharts";

const STRATEGY_META: Record<string, { icon: string; desc: string; color: string }> = {
  reweighting: {
    icon: "⚖",
    color: "#7c3aed",
    desc: "Assigns higher sample weights to underrepresented (group, outcome) pairs during training to balance learning signal.",
  },
  feature_suppression: {
    icon: "⊗",
    color: "#2563eb",
    desc: "Removes the sensitive attribute and detected proxy variables before training, eliminating direct discrimination channels.",
  },
  fairness_aware: {
    icon: "⬡",
    color: "#06b6d4",
    desc: "Uses ExponentiatedGradient with DemographicParity constraint to enforce fairness as a hard constraint during optimization.",
  },
};

function MetricDiff({ label, before, after }: { label: string; before: number; after: number }) {
  const improved = Math.abs(after) < Math.abs(before);
  const delta = after - before;
  return (
    <div style={{ padding: "10px 0", borderBottom: "1px solid #1a1a2e" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: "#64748b" }}>{label}</span>
        <span style={{ fontSize: 12, color: improved ? "#10b981" : "#ef4444", fontFamily: "'JetBrains Mono',monospace" }}>
          {delta > 0 ? "+" : ""}{delta.toFixed(4)}
        </span>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <span style={{ fontSize: 13, color: "#94a3b8", fontFamily: "'JetBrains Mono',monospace", width: 70 }}>{before.toFixed(4)}</span>
        <span style={{ color: "#475569", fontSize: 11 }}>→</span>
        <span style={{ fontSize: 13, color: improved ? "#10b981" : "#ef4444", fontFamily: "'JetBrains Mono',monospace" }}>{after.toFixed(4)}</span>
        <span style={{ marginLeft: "auto", fontSize: 11, padding: "2px 8px", borderRadius: 20,
          background: improved ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
          color: improved ? "#6ee7b7" : "#fca5a5",
        }}>
          {improved ? "↓ improved" : "↑ worse"}
        </span>
      </div>
    </div>
  );
}

export default function MitigationPage() {
  const { uploadedFileName, target, sensitive, setMitigationResult, mitigationResult } = useAppContext();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const runAll = async () => {
    if (!uploadedFileName || !target || !sensitive) {
      setError("Complete bias analysis on the Upload page first.");
      return;
    }
    setRunning(true);
    setError("");
    try {
      const res = await runMitigation({ file_path: `uploads/${uploadedFileName}`, target, sensitive });
      setMitigationResult(res.mitigation_results);
      const keys = Object.keys(res.mitigation_results);
      if (keys.length) setSelected(keys[0]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  };

  const results = mitigationResult || {};
  const selectedResult = selected ? results[selected] : null;

  // Comparison chart across strategies
  const comparisonData = Object.entries(results)
    .filter(([, v]: any) => v.before && v.after)
    .map(([k, v]: any) => ({
      name: STRATEGY_META[k]?.icon || k,
      label: k,
      before: parseFloat((v.before.risk.score).toFixed(1)),
      after: parseFloat((v.after.risk.score).toFixed(1)),
      improvement: parseFloat((v.improvement || 0).toFixed(1)),
    }));

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px 80px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 36 }}>
        <div>
          <div style={{ fontSize: 11, color: "#7c3aed", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.1em", marginBottom: 8 }}>
            BIAS MITIGATION
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 6 }}>Mitigation Strategies</h1>
          <p style={{ color: "#64748b", fontSize: 14 }}>
            Apply fairness-aware techniques to reduce bias — with before/after comparison.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/dashboard">
            <button style={{ padding: "10px 18px", background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 10, color: "#e2e8f0", cursor: "pointer", fontSize: 13 }}>
              ← Analysis
            </button>
          </Link>
          <Link href="/audit">
            <button style={{ padding: "10px 18px", background: "linear-gradient(135deg,#7c3aed,#2563eb)", border: "none", borderRadius: 10, color: "white", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
              ◉ Generate Audit
            </button>
          </Link>
        </div>
      </div>

      {!uploadedFileName && (
        <div style={{ padding: "32px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 16, textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 20, marginBottom: 8 }}>⚠</div>
          <div style={{ color: "#fcd34d", marginBottom: 12 }}>No dataset loaded. Upload a dataset first.</div>
          <Link href="/upload">
            <button style={{ padding: "10px 20px", background: "linear-gradient(135deg,#7c3aed,#2563eb)", border: "none", borderRadius: 10, color: "white", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
              Upload Dataset →
            </button>
          </Link>
        </div>
      )}

      {error && (
        <div style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", fontSize: 14, marginBottom: 24 }}>
          {error}
        </div>
      )}

      {/* Strategy cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
        {Object.entries(STRATEGY_META).map(([key, meta]) => {
          const result = results[key];
          const hasResult = result && result.before;
          const isSelected = selected === key;
          return (
            <div
              key={key}
              onClick={() => hasResult && setSelected(key)}
              style={{
                background: "#0d0d14",
                border: `1px solid ${isSelected ? meta.color + "60" : "#1a1a2e"}`,
                borderRadius: 14, padding: "20px",
                cursor: hasResult ? "pointer" : "default",
                background: isSelected ? `${meta.color}10` : "#0d0d14",
                transition: "all 0.15s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: `${meta.color}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: meta.color }}>
                  {meta.icon}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0", textTransform: "capitalize" }}>
                    {key.replace(/_/g, " ")}
                  </div>
                  {hasResult && (
                    <div style={{ fontSize: 11, color: result.improvement > 0 ? "#10b981" : "#64748b" }}>
                      {result.improvement > 0 ? `↓ ${result.improvement} risk score` : "No improvement"}
                    </div>
                  )}
                </div>
              </div>
              <p style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>{meta.desc}</p>

              {hasResult && (
                <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                  {["before", "after"].map(phase => (
                    <div key={phase} style={{
                      flex: 1, background: "#080810", borderRadius: 8, padding: "10px", textAlign: "center",
                    }}>
                      <div style={{ fontSize: 10, color: "#475569", marginBottom: 4, textTransform: "uppercase" }}>{phase}</div>
                      <div style={{
                        fontSize: 18, fontWeight: 700,
                        color: phase === "before" ? "#f59e0b" : "#10b981",
                        fontFamily: "'JetBrains Mono',monospace",
                      }}>
                        {result[phase].risk.score}
                      </div>
                      <div style={{ fontSize: 10, color: result[phase].risk.level === "HIGH" ? "#ef4444" : result[phase].risk.level === "MEDIUM" ? "#f59e0b" : "#10b981" }}>
                        {result[phase].risk.level}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Run button */}
      {!Object.keys(results).length && (
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <button
            onClick={runAll}
            disabled={running || !uploadedFileName}
            style={{
              padding: "16px 48px",
              background: running ? "#1a1a2e" : "linear-gradient(135deg, #7c3aed, #2563eb)",
              border: "none", borderRadius: 14,
              color: "white", fontSize: 16, fontWeight: 700,
              cursor: running || !uploadedFileName ? "not-allowed" : "pointer",
            }}
          >
            {running ? "⌛ Running All Strategies..." : "⚡ Run All Mitigation Strategies"}
          </button>
          {running && (
            <div style={{ marginTop: 16, color: "#64748b", fontSize: 13 }}>
              Training models with reweighting, feature suppression, and fairness constraints…
            </div>
          )}
        </div>
      )}

      {/* Comparison chart */}
      {comparisonData.length > 0 && (
        <div style={{ background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 16, padding: "24px", marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: "#64748b", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.08em", marginBottom: 16 }}>
            RISK SCORE COMPARISON: BEFORE vs AFTER
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={comparisonData} margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
              <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 13 }} />
              <YAxis domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 8, fontSize: 12 }}
                formatter={(v: any, name: string) => [v, name === "before" ? "Before" : "After"]}
                labelFormatter={(l) => comparisonData.find(d => d.name === l)?.label || l}
              />
              <Legend formatter={(v) => v === "before" ? "Before" : "After"} wrapperStyle={{ color: "#64748b", fontSize: 12 }} />
              <Bar dataKey="before" fill="#ef4444" radius={[4, 4, 0, 0]} opacity={0.7} />
              <Bar dataKey="after" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Detail view for selected strategy */}
      {selectedResult && selected && (
        <div style={{ background: "#0d0d14", border: `1px solid ${STRATEGY_META[selected]?.color}40`, borderRadius: 16, padding: "28px" }}>
          <div style={{ fontSize: 12, color: "#64748b", fontFamily: "'JetBrains Mono',monospace", marginBottom: 20, letterSpacing: "0.08em" }}>
            DETAILED RESULTS — {selected.replace(/_/g, " ").toUpperCase()}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>METRIC CHANGES</div>
              {["demographic_parity_difference", "equalized_odds_difference", "disparate_impact_ratio"].map(m => {
                const b = selectedResult.before?.metrics?.[m];
                const a = selectedResult.after?.metrics?.[m];
                if (b === undefined || a === undefined) return null;
                return <MetricDiff key={m} label={m.replace(/_/g, " ")} before={b} after={a} />;
              })}
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>RISK REDUCTION</div>
              <div style={{ display: "flex", gap: 12 }}>
                {["before", "after"].map(phase => (
                  <div key={phase} style={{
                    flex: 1, background: "#080810", border: `1px solid ${phase === "after" ? "#10b98130" : "#1a1a2e"}`,
                    borderRadius: 12, padding: "20px", textAlign: "center",
                  }}>
                    <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", marginBottom: 8, letterSpacing: "0.08em" }}>{phase}</div>
                    <div style={{
                      fontSize: 36, fontWeight: 700,
                      color: phase === "before" ? "#ef4444" : "#10b981",
                      fontFamily: "'JetBrains Mono',monospace",
                    }}>
                      {selectedResult[phase].risk.score}
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>/ 100</div>
                    <div style={{
                      padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, display: "inline-block",
                      background: selectedResult[phase].risk.level === "HIGH" ? "rgba(239,68,68,0.15)" : selectedResult[phase].risk.level === "MEDIUM" ? "rgba(245,158,11,0.15)" : "rgba(16,185,129,0.15)",
                      color: selectedResult[phase].risk.level === "HIGH" ? "#fca5a5" : selectedResult[phase].risk.level === "MEDIUM" ? "#fcd34d" : "#6ee7b7",
                    }}>
                      {selectedResult[phase].risk.level}
                    </div>
                  </div>
                ))}
              </div>

              {selectedResult.improvement !== undefined && (
                <div style={{
                  marginTop: 16, padding: "16px", textAlign: "center",
                  background: selectedResult.improvement > 0 ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
                  border: `1px solid ${selectedResult.improvement > 0 ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`,
                  borderRadius: 10,
                }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: selectedResult.improvement > 0 ? "#10b981" : "#ef4444", fontFamily: "'JetBrains Mono',monospace" }}>
                    {selectedResult.improvement > 0 ? "-" : "+"}{Math.abs(selectedResult.improvement)}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Risk Score Change</div>
                </div>
              )}

              {selectedResult.removed_features?.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>Removed Features</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {selectedResult.removed_features.map((f: string) => (
                      <span key={f} style={{ padding: "3px 10px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 20, fontSize: 11, color: "#fca5a5", fontFamily: "'JetBrains Mono',monospace" }}>
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Re-run button */}
      {Object.keys(results).length > 0 && (
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <button onClick={runAll} disabled={running} style={{
            padding: "12px 32px", background: "#0d0d14", border: "1px solid #1a1a2e",
            borderRadius: 10, color: "#64748b", cursor: "pointer", fontSize: 14,
          }}>
            {running ? "⌛ Running..." : "↻ Re-run Analysis"}
          </button>
        </div>
      )}
    </div>
  );
}
