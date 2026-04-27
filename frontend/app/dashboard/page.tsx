"use client";

import { useAppContext } from "@/Context/AppContext";
import Link from "next/link";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, CartesianGrid, Legend,
} from "recharts";

const RISK_COLORS: Record<string, string> = { HIGH: "#ef4444", MEDIUM: "#f59e0b", LOW: "#10b981" };
const RISK_BG: Record<string, string> = {
  HIGH: "rgba(239,68,68,0.08)",
  MEDIUM: "rgba(245,158,11,0.08)",
  LOW: "rgba(16,185,129,0.08)",
};
const RISK_BORDER: Record<string, string> = {
  HIGH: "rgba(239,68,68,0.3)",
  MEDIUM: "rgba(245,158,11,0.3)",
  LOW: "rgba(16,185,129,0.3)",
};

function MetricCard({ label, value, threshold, invert = false }: any) {
  const v = typeof value === "number" ? value : 0;
  const pass = invert ? v >= threshold : Math.abs(v) <= threshold;
  const color = pass ? "#10b981" : Math.abs(v) > threshold * 2 ? "#ef4444" : "#f59e0b";
  return (
    <div style={{
      background: "#0d0d14", border: `1px solid ${color}30`,
      borderRadius: 14, padding: "20px 22px",
    }}>
      <div style={{ fontSize: 11, color: "#64748b", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.08em", marginBottom: 10 }}>
        {label.toUpperCase()}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color, fontFamily: "'JetBrains Mono',monospace", marginBottom: 8 }}>
        {typeof value === "number" ? value.toFixed(4) : value}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{
          fontSize: 11, padding: "2px 8px", borderRadius: 20,
          background: pass ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
          color: pass ? "#6ee7b7" : "#fca5a5",
          border: `1px solid ${pass ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`,
        }}>
          {pass ? "✓ PASS" : "✗ FAIL"}
        </span>
        <span style={{ fontSize: 11, color: "#475569" }}>
          threshold: {invert ? `≥ ${threshold}` : `< ${threshold}`}
        </span>
      </div>
    </div>
  );
}

function RiskGauge({ score, level }: { score: number; level: string }) {
  const color = RISK_COLORS[level] || "#64748b";
  const pct = Math.min(score, 100);
  const r = 60;
  const circumference = Math.PI * r;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 0" }}>
      <svg width={160} height={90} viewBox="0 0 160 90">
        <path d={`M 20 80 A ${r} ${r} 0 0 1 140 80`} fill="none" stroke="#1a1a2e" strokeWidth={10} strokeLinecap="round" />
        <path
          d={`M 20 80 A ${r} ${r} 0 0 1 140 80`}
          fill="none" stroke={color} strokeWidth={10} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
        <text x={80} y={72} textAnchor="middle" fill={color} fontSize={22} fontWeight={700} fontFamily="'JetBrains Mono',monospace">
          {Math.round(score)}
        </text>
        <text x={80} y={86} textAnchor="middle" fill="#64748b" fontSize={9} fontFamily="'JetBrains Mono',monospace">
          RISK SCORE / 100
        </text>
      </svg>
      <span style={{
        marginTop: 8, padding: "4px 16px", borderRadius: 20, fontSize: 13, fontWeight: 700,
        background: RISK_BG[level], border: `1px solid ${RISK_BORDER[level]}`,
        color: RISK_COLORS[level],
      }}>{level} RISK</span>
    </div>
  );
}

export default function DashboardPage() {
  const { biasMetrics, explanation, target, sensitive, uploadedFileName } = useAppContext();

  if (!biasMetrics) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 16 }}>
        <div style={{ fontSize: 48 }}>◈</div>
        <div style={{ fontSize: 20, fontWeight: 600, color: "#e2e8f0" }}>No analysis data</div>
        <div style={{ color: "#64748b", marginBottom: 16 }}>Upload a dataset first to see results</div>
        <Link href="/upload">
          <button style={{ padding: "12px 28px", background: "linear-gradient(135deg,#7c3aed,#2563eb)", color: "white", border: "none", borderRadius: 12, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
            Upload Dataset →
          </button>
        </Link>
      </div>
    );
  }

  const { metrics, risk, group_fairness, model_group_rates, intersectional_bias,
    proxy_variables, feature_importance, dataset_profile, statistical_confidence } = biasMetrics;

  const level = risk?.level || "LOW";
  const score = risk?.score || 0;

  // Radar chart data
  const radarData = [
    { metric: "Dem. Parity", value: Math.max(0, 1 - Math.abs(metrics?.demographic_parity_difference || 0) / 0.3) },
    { metric: "Eq. Odds", value: Math.max(0, 1 - Math.abs(metrics?.equalized_odds_difference || 0) / 0.3) },
    { metric: "Disp. Impact", value: Math.min(1, (metrics?.disparate_impact_ratio || 1) / 0.8) },
    { metric: "Stat. Parity", value: Math.min(1, (metrics?.statistical_parity_ratio || 1) / 0.8) },
  ].map(d => ({ ...d, value: parseFloat((d.value * 100).toFixed(1)) }));

  // Group outcome bar data
  const groupBarData = Object.entries(group_fairness || {}).map(([k, v]) => ({
    group: String(k), rate: parseFloat(((v as number) * 100).toFixed(1)),
  }));

  // Feature importance bar data
  const featData = Object.entries(feature_importance || {})
    .slice(0, 8)
    .map(([k, v]) => ({ feature: k.slice(0, 18), importance: parseFloat(((v as number) * 100).toFixed(2)) }));

  // Intersectional heatmap data
  const intersectData = Object.entries(intersectional_bias || {}).map(([k, v]: any) => ({
    group: k.slice(0, 28),
    rate: parseFloat((v.outcome_rate * 100).toFixed(1)),
    n: v.sample_size,
  }));

  const GROUP_COLORS = ["#7c3aed", "#2563eb", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"];

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px 80px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 36 }}>
        <div>
          <div style={{ fontSize: 11, color: "#7c3aed", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.1em", marginBottom: 8 }}>
            BIAS ANALYSIS RESULTS
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 6 }}>
            {uploadedFileName || "Dataset"} Analysis
          </h1>
          <div style={{ color: "#64748b", fontSize: 14 }}>
            Target: <span style={{ color: "#a78bfa" }}>{target}</span>  ·  Sensitive: <span style={{ color: "#60a5fa" }}>{sensitive}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/audit">
            <button style={{ padding: "10px 18px", background: "linear-gradient(135deg,#7c3aed,#2563eb)", border: "none", borderRadius: 10, color: "white", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
              ◉ Full Audit
            </button>
          </Link>
        </div>
      </div>

      {/* Top row: risk gauge + key metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 16, marginBottom: 16 }}>
        {/* Risk Gauge */}
        <div style={{ background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 16 }}>
          <RiskGauge score={score} level={level} />
          {risk?.breakdown && (
            <div style={{ padding: "0 20px 20px" }}>
              {Object.entries(risk.breakdown).map(([k, v]: any) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: "#64748b" }}>{k.replace(/_contribution$/, "").replace(/_/g, " ")}</span>
                  <span style={{ fontSize: 11, color: "#a78bfa", fontFamily: "'JetBrains Mono',monospace" }}>{v}/100</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Fairness metrics grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          <MetricCard label="Demographic Parity Diff" value={metrics?.demographic_parity_difference} threshold={0.1} />
          <MetricCard label="Equalized Odds Diff" value={metrics?.equalized_odds_difference} threshold={0.1} />
          <MetricCard label="Disparate Impact Ratio" value={metrics?.disparate_impact_ratio} threshold={0.8} invert />
          <MetricCard label="Statistical Parity Ratio" value={metrics?.statistical_parity_ratio} threshold={0.8} invert />
        </div>
      </div>

      {/* Statistical confidence */}
      {statistical_confidence && (
        <div style={{
          padding: "12px 18px", borderRadius: 10, marginBottom: 16,
          background: statistical_confidence.reliability === "HIGH"
            ? "rgba(16,185,129,0.06)" : statistical_confidence.reliability === "MEDIUM"
            ? "rgba(245,158,11,0.06)" : "rgba(239,68,68,0.06)",
          border: `1px solid ${statistical_confidence.reliability === "HIGH" ? "rgba(16,185,129,0.2)" : statistical_confidence.reliability === "MEDIUM" ? "rgba(245,158,11,0.2)" : "rgba(239,68,68,0.2)"}`,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{ fontSize: 16 }}>
            {statistical_confidence.reliability === "HIGH" ? "✓" : statistical_confidence.reliability === "MEDIUM" ? "⚠" : "✗"}
          </span>
          <span style={{ fontSize: 13, color: "#94a3b8" }}>
            <strong style={{ color: "#e2e8f0" }}>Statistical Confidence: {statistical_confidence.reliability}</strong> — {statistical_confidence.note}
          </span>
        </div>
      )}

      {/* Charts row 1 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* Radar */}
        <div style={{ background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 16, padding: "24px" }}>
          <div style={{ fontSize: 12, color: "#64748b", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.08em", marginBottom: 16 }}>
            FAIRNESS RADAR
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#1a1a2e" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: "#64748b", fontSize: 11, fontFamily: "'JetBrains Mono',monospace" }} />
              <Radar dataKey="value" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.18} strokeWidth={2} dot={{ fill: "#7c3aed", r: 4 }} />
            </RadarChart>
          </ResponsiveContainer>
          <div style={{ fontSize: 11, color: "#475569", textAlign: "center", marginTop: 4 }}>
            Higher = Fairer. 100 = perfect fairness on each metric.
          </div>
        </div>

        {/* Group outcome bar chart */}
        <div style={{ background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 16, padding: "24px" }}>
          <div style={{ fontSize: 12, color: "#64748b", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.08em", marginBottom: 16 }}>
            OUTCOME RATES BY GROUP (Raw Data)
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={groupBarData} margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
              <XAxis dataKey="group" tick={{ fill: "#64748b", fontSize: 11 }} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} unit="%" />
              <Tooltip
                contentStyle={{ background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 8, fontSize: 12 }}
                formatter={(v: any) => [`${v}%`, "Positive Rate"]}
              />
              <Bar dataKey="rate" radius={[6, 6, 0, 0]}>
                {groupBarData.map((_, i) => (
                  <Cell key={i} fill={GROUP_COLORS[i % GROUP_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row 2 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* Feature importance */}
        {featData.length > 0 && (
          <div style={{ background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 16, padding: "24px" }}>
            <div style={{ fontSize: 12, color: "#64748b", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.08em", marginBottom: 16 }}>
              FEATURE INFLUENCE (Model Coefficients)
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={featData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
                <XAxis type="number" tick={{ fill: "#64748b", fontSize: 10 }} unit="%" />
                <YAxis type="category" dataKey="feature" tick={{ fill: "#94a3b8", fontSize: 10, fontFamily: "'JetBrains Mono',monospace" }} width={120} />
                <Tooltip
                  contentStyle={{ background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: any) => [`${v}%`, "Importance"]}
                />
                <Bar dataKey="importance" fill="#2563eb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Proxy variables */}
        <div style={{ background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 16, padding: "24px" }}>
          <div style={{ fontSize: 12, color: "#64748b", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.08em", marginBottom: 16 }}>
            PROXY VARIABLE CORRELATION (to {sensitive})
          </div>
          {proxy_variables && Object.keys(proxy_variables).length > 0 ? (
            <div>
              {Object.entries(proxy_variables).map(([col, corr]: any, i) => (
                <div key={col} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: "#e2e8f0", fontFamily: "'JetBrains Mono',monospace" }}>{col}</span>
                    <span style={{ fontSize: 13, color: corr > 0.7 ? "#ef4444" : corr > 0.5 ? "#f59e0b" : "#a78bfa", fontFamily: "'JetBrains Mono',monospace" }}>
                      {(corr * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div style={{ height: 6, background: "#1a1a2e", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: `${corr * 100}%`,
                      background: corr > 0.7 ? "#ef4444" : corr > 0.5 ? "#f59e0b" : "#7c3aed",
                      borderRadius: 3,
                      transition: "width 1s ease",
                    }} />
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 12, fontSize: 12, color: "#475569" }}>
                ⚠ These features are correlated with {sensitive} and may be transmitting bias indirectly.
              </div>
            </div>
          ) : (
            <div style={{ color: "#10b981", fontSize: 14, textAlign: "center", marginTop: 60 }}>
              ✓ No significant proxy variables detected
            </div>
          )}
        </div>
      </div>

      {/* Intersectional bias */}
      {intersectData.length > 0 && (
        <div style={{ background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 16, padding: "24px", marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: "#64748b", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.08em", marginBottom: 16 }}>
            INTERSECTIONAL BIAS (Combined Sensitive Groups)
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={intersectData} margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
              <XAxis dataKey="group" tick={{ fill: "#64748b", fontSize: 10 }} />
              <YAxis tick={{ fill: "#64748b", fontSize: 10 }} unit="%" />
              <Tooltip
                contentStyle={{ background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 8, fontSize: 12 }}
                formatter={(v: any, _: any, p: any) => [`${v}% (n=${p.payload.n})`, "Outcome Rate"]}
              />
              <Bar dataKey="rate" fill="#06b6d4" radius={[4, 4, 0, 0]}>
                {intersectData.map((d, i) => (
                  <Cell key={i} fill={d.rate < 30 ? "#ef4444" : d.rate < 50 ? "#f59e0b" : "#10b981"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ fontSize: 11, color: "#475569", marginTop: 8 }}>
            Color: red = low outcome rate (&lt;30%), amber = medium, green = high. Only groups with ≥10 samples shown.
          </div>
        </div>
      )}

      {/* AI Explanation */}
      {explanation && (
        <div style={{ background: "#0d0d14", border: "1px solid rgba(124,58,237,0.25)", borderRadius: 16, padding: "28px", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: "#64748b", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.08em" }}>AI EXPLANATION</div>
            <span style={{ fontSize: 10, padding: "2px 8px", background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", borderRadius: 20, color: "#a78bfa" }}>
              {explanation._source === "gemini" ? "Gemini AI" : "Rule-Based"}
            </span>
          </div>

          <p style={{ color: "#94a3b8", fontSize: 15, lineHeight: 1.8, marginBottom: 20 }}>{explanation.summary}</p>

          {explanation.root_causes?.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10, fontWeight: 600, letterSpacing: "0.05em" }}>ROOT CAUSES</div>
              {explanation.root_causes.map((c: string, i: number) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                  <span style={{ color: "#7c3aed", marginTop: 2, flexShrink: 0 }}>▸</span>
                  <span style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.6 }}>{c}</span>
                </div>
              ))}
            </div>
          )}

          {explanation.real_world_impact && (
            <div style={{
              padding: "14px 16px", background: "rgba(239,68,68,0.06)",
              border: "1px solid rgba(239,68,68,0.15)", borderRadius: 10, marginBottom: 20,
            }}>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6, fontFamily: "'JetBrains Mono',monospace" }}>REAL-WORLD IMPACT</div>
              <div style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.6 }}>{explanation.real_world_impact}</div>
            </div>
          )}

          {explanation.compliance_flags?.length > 0 && (
            <div>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10, fontWeight: 600, letterSpacing: "0.05em" }}>COMPLIANCE FLAGS</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {explanation.compliance_flags.map((f: string, i: number) => (
                  <span key={i} style={{
                    padding: "4px 12px", borderRadius: 20, fontSize: 12,
                    background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", color: "#fcd34d",
                  }}>{f}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dataset profile */}
      {dataset_profile && (
        <div style={{ background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 16, padding: "24px" }}>
          <div style={{ fontSize: 12, color: "#64748b", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.08em", marginBottom: 16 }}>
            DATASET PROFILE
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
            {[
              ["Rows", dataset_profile.total_rows],
              ["Columns", dataset_profile.total_columns],
              ["Groups", Object.keys(dataset_profile.group_sizes || {}).length],
              ["Missing Cols", Object.keys(dataset_profile.missing_values || {}).length],
            ].map(([k, v]) => (
              <div key={k} style={{ background: "#080810", borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#a78bfa", fontFamily: "'JetBrains Mono',monospace" }}>{v}</div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>{k}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Group sizes */}
            <div>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>Group Distribution</div>
              {Object.entries(dataset_profile.group_sizes || {}).map(([k, v]: any, i) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #1a1a2e" }}>
                  <span style={{ fontSize: 13, color: "#94a3b8" }}>{k}</span>
                  <span style={{ fontSize: 13, color: GROUP_COLORS[i % GROUP_COLORS.length], fontFamily: "'JetBrains Mono',monospace" }}>{v}</span>
                </div>
              ))}
            </div>
            {/* Outcome rates */}
            <div>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>Outcome Rates per Group</div>
              {Object.entries(dataset_profile.outcome_rates_per_group || {}).map(([k, v]: any, i) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #1a1a2e" }}>
                  <span style={{ fontSize: 13, color: "#94a3b8" }}>{k}</span>
                  <span style={{ fontSize: 13, color: "#a78bfa", fontFamily: "'JetBrains Mono',monospace" }}>
                    {(v * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
