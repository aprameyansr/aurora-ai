"use client";

import { useState } from "react";
import { useAppContext } from "@/Context/AppContext";
import { initSimulation, simPredict, simWhatIf, simCounterfactual, simBiasTest, simSweep } from "@/lib/api";
import Link from "next/link";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

const TAB_LIST = [
  { id: "whatif",   label: "What-If",       icon: "⌬" },
  { id: "counter",  label: "Counterfactual",icon: "⊕" },
  { id: "bias",     label: "Bias Test",     icon: "◈" },
  { id: "sweep",    label: "Feature Sweep", icon: "∿" },
];

export default function SimulationPage() {
  const { uploadedFileName, target, sensitive } = useAppContext();
  const [tab, setTab] = useState("whatif");
  const [engineReady, setEngineReady] = useState(false);
  const [initMsg, setInitMsg] = useState("");
  const [features, setFeatures] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // What-if state
  const [inputVals, setInputVals] = useState<Record<string, string>>({});
  const [modifiedVals, setModifiedVals] = useState<Record<string, string>>({});
  const [whatIfResult, setWhatIfResult] = useState<any>(null);

  // Counterfactual state
  const [cfInput, setCfInput] = useState<Record<string, string>>({});
  const [cfResult, setCfResult] = useState<any[]>([]);

  // Bias test state
  const [biasInput, setBiasInput] = useState<Record<string, string>>({});
  const [biasTestResult, setBiasTestResult] = useState<any>(null);

  // Sweep state
  const [sweepInput, setSweepInput] = useState<Record<string, string>>({});
  const [sweepFeature, setSweepFeature] = useState("");
  const [sweepResult, setSweepResult] = useState<any>(null);

  const handleInit = async () => {
    if (!uploadedFileName || !target) { setError("Upload and analyze a dataset first."); return; }
    setLoading(true); setError("");
    try {
      const res = await initSimulation(`uploads/${uploadedFileName}`, target, sensitive);
      setFeatures(res.features || []);
      setEngineReady(true);
      setInitMsg(`${res.rows} rows, ${res.features.length} features loaded`);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const parseInput = (vals: Record<string, string>) =>
    Object.fromEntries(Object.entries(vals).map(([k, v]) => [k, isNaN(Number(v)) ? v : Number(v)]));

  const runWhatIf = async () => {
    setLoading(true); setError("");
    try {
      const res = await simWhatIf(parseInput(inputVals), parseInput(modifiedVals));
      setWhatIfResult(res);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const runCounterfactual = async () => {
    setLoading(true); setError("");
    try {
      const res = await simCounterfactual(parseInput(cfInput), 1, 5);
      setCfResult(res.counterfactuals || []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const runBiasTest = async () => {
    setLoading(true); setError("");
    try {
      const res = await simBiasTest(parseInput(biasInput), sensitive);
      setBiasTestResult(res);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const runSweep = async () => {
    if (!sweepFeature) return;
    setLoading(true); setError("");
    try {
      const res = await simSweep(parseInput(sweepInput), sweepFeature, 12);
      setSweepResult(res);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const sweepChartData = sweepResult
    ? sweepResult.values.map((v: number, i: number) => ({
        value: v,
        probability: sweepResult.probabilities[i],
      }))
    : [];

  const InputGrid = ({ vals, setVals, features: feats }: { vals: Record<string, string>; setVals: (v: any) => void; features: string[] }) => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
      {feats.slice(0, 12).map(f => (
        <div key={f}>
          <label style={{ fontSize: 10, color: "#64748b", fontFamily: "'JetBrains Mono',monospace", display: "block", marginBottom: 3 }}>{f.slice(0, 20)}</label>
          <input
            type="text"
            value={vals[f] || ""}
            onChange={e => setVals((prev: any) => ({ ...prev, [f]: e.target.value }))}
            placeholder="0"
            style={{ width: "100%", padding: "7px 10px", background: "#080810", border: "1px solid #1a1a2e", borderRadius: 6, color: "#e2e8f0", fontSize: 12, fontFamily: "'JetBrains Mono',monospace", outline: "none" }}
          />
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px 80px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 36 }}>
        <div>
          <div style={{ fontSize: 11, color: "#7c3aed", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.1em", marginBottom: 8 }}>SIMULATION ENGINE</div>
          <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 6 }}>What-If Testing</h1>
          <p style={{ color: "#64748b", fontSize: 14 }}>Probe the model's decision boundary without touching production.</p>
        </div>
        <Link href="/dashboard">
          <button style={{ padding: "10px 18px", background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 10, color: "#e2e8f0", cursor: "pointer", fontSize: 13 }}>← Analysis</button>
        </Link>
      </div>

      {error && (
        <div style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", fontSize: 14, marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* Init engine */}
      {!engineReady ? (
        <div style={{ background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 16, padding: "40px", textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⌬</div>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Initialize Simulation Engine</div>
          <div style={{ color: "#64748b", fontSize: 14, marginBottom: 24 }}>
            Trains a model on your uploaded dataset and prepares the simulation environment.
          </div>
          {!uploadedFileName ? (
            <div>
              <div style={{ color: "#f59e0b", marginBottom: 12, fontSize: 13 }}>⚠ No dataset loaded.</div>
              <Link href="/upload">
                <button style={{ padding: "10px 24px", background: "linear-gradient(135deg,#7c3aed,#2563eb)", border: "none", borderRadius: 10, color: "white", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                  Upload Dataset →
                </button>
              </Link>
            </div>
          ) : (
            <button
              onClick={handleInit}
              disabled={loading}
              style={{ padding: "14px 40px", background: loading ? "#1a1a2e" : "linear-gradient(135deg,#7c3aed,#2563eb)", border: "none", borderRadius: 12, color: "white", fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer" }}
            >
              {loading ? "⌛ Initializing..." : "⬡ Initialize Engine"}
            </button>
          )}
        </div>
      ) : (
        <div>
          {/* Engine status */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 10, marginBottom: 24, fontSize: 13, color: "#6ee7b7" }}>
            <span>✓</span> Engine ready — {initMsg}
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 12, padding: 4, width: "fit-content" }}>
            {TAB_LIST.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                padding: "8px 18px", borderRadius: 8, border: "none",
                background: tab === t.id ? "#7c3aed" : "transparent",
                color: tab === t.id ? "white" : "#64748b",
                fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
              }}>
                <span style={{ fontSize: 11 }}>{t.icon}</span>{t.label}
              </button>
            ))}
          </div>

          {/* ── WHAT-IF ── */}
          {tab === "whatif" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 16, padding: 24 }}>
                <div style={{ fontSize: 12, color: "#64748b", fontFamily: "'JetBrains Mono',monospace", marginBottom: 12, letterSpacing: "0.08em" }}>ORIGINAL PROFILE</div>
                <InputGrid vals={inputVals} setVals={setInputVals} features={features} />
              </div>
              <div style={{ background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 16, padding: 24 }}>
                <div style={{ fontSize: 12, color: "#64748b", fontFamily: "'JetBrains Mono',monospace", marginBottom: 12, letterSpacing: "0.08em" }}>MODIFIED PROFILE (change values to test)</div>
                <InputGrid vals={modifiedVals} setVals={setModifiedVals} features={features} />
              </div>

              <div style={{ gridColumn: "1 / -1", display: "flex", gap: 12 }}>
                <button onClick={runWhatIf} disabled={loading} style={{ flex: 1, padding: "14px", background: loading ? "#1a1a2e" : "linear-gradient(135deg,#7c3aed,#2563eb)", border: "none", borderRadius: 12, color: "white", fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer" }}>
                  {loading ? "⌛ Running..." : "⌬ Run What-If Comparison"}
                </button>
              </div>

              {whatIfResult && (
                <div style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  {["original", "modified"].map(side => {
                    const r = whatIfResult[side];
                    return (
                      <div key={side} style={{
                        background: "#080810", border: `1px solid ${r.prediction === 1 ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}`,
                        borderRadius: 14, padding: 20, textAlign: "center",
                      }}>
                        <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", marginBottom: 8 }}>{side}</div>
                        <div style={{ fontSize: 32, fontWeight: 700, color: r.prediction === 1 ? "#10b981" : "#ef4444", fontFamily: "'JetBrains Mono',monospace" }}>
                          {r.label}
                        </div>
                        <div style={{ fontSize: 13, color: "#64748b", marginTop: 6 }}>
                          {(r.probability * 100).toFixed(1)}% probability
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ background: "#080810", border: `1px solid ${whatIfResult.decision_changed ? "rgba(239,68,68,0.25)" : "rgba(16,185,129,0.25)"}`, borderRadius: 14, padding: 20, textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", marginBottom: 8 }}>Impact</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: whatIfResult.decision_changed ? "#ef4444" : "#10b981", marginBottom: 6 }}>
                      {whatIfResult.decision_changed ? "Decision Changed!" : "No Change"}
                    </div>
                    <div style={{ fontSize: 13, color: "#94a3b8" }}>{whatIfResult.impact}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── COUNTERFACTUAL ── */}
          {tab === "counter" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 16, padding: 24 }}>
                <div style={{ fontSize: 12, color: "#64748b", fontFamily: "'JetBrains Mono',monospace", marginBottom: 6, letterSpacing: "0.08em" }}>PROFILE TO TEST</div>
                <div style={{ fontSize: 12, color: "#475569", marginBottom: 16 }}>Find the minimal feature changes needed to flip the decision to "Approved".</div>
                <InputGrid vals={cfInput} setVals={setCfInput} features={features} />
                <button onClick={runCounterfactual} disabled={loading} style={{ marginTop: 16, width: "100%", padding: "13px", background: loading ? "#1a1a2e" : "linear-gradient(135deg,#7c3aed,#2563eb)", border: "none", borderRadius: 10, color: "white", fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer" }}>
                  {loading ? "⌛ Computing..." : "⊕ Find Counterfactuals"}
                </button>
              </div>

              {cfResult.length > 0 && (
                <div style={{ background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 16, padding: 24 }}>
                  <div style={{ fontSize: 12, color: "#64748b", fontFamily: "'JetBrains Mono',monospace", marginBottom: 16, letterSpacing: "0.08em" }}>
                    MINIMAL CHANGES FOR APPROVAL ({cfResult.length} paths found)
                  </div>
                  {cfResult.map((cf: any, i: number) => (
                    cf.message ? (
                      <div key={i} style={{ color: "#10b981", fontSize: 14, padding: 12, background: "rgba(16,185,129,0.08)", borderRadius: 8 }}>{cf.message}</div>
                    ) : (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #1a1a2e" }}>
                        <div>
                          <span style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0", fontFamily: "'JetBrains Mono',monospace" }}>{cf.changed_feature}</span>
                          <span style={{ fontSize: 12, color: "#64748b", marginLeft: 12 }}>
                            {cf.from_value} → {cf.to_value} ({cf.direction})
                          </span>
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <span style={{ fontSize: 13, color: cf.change_percent > 0 ? "#10b981" : "#ef4444", fontFamily: "'JetBrains Mono',monospace" }}>
                            {cf.change_percent > 0 ? "+" : ""}{cf.change_percent}%
                          </span>
                          <span style={{ padding: "3px 10px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 20, fontSize: 11, color: "#6ee7b7" }}>
                            → {cf.outcome}
                          </span>
                        </div>
                      </div>
                    )
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── BIAS TEST ── */}
          {tab === "bias" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 16, padding: 24 }}>
                <div style={{ fontSize: 12, color: "#64748b", fontFamily: "'JetBrains Mono',monospace", marginBottom: 6, letterSpacing: "0.08em" }}>PROFILE (all else equal)</div>
                <div style={{ fontSize: 12, color: "#475569", marginBottom: 16 }}>
                  Tests whether changing <span style={{ color: "#a78bfa" }}>{sensitive || "the sensitive attribute"}</span> (all else equal) changes the decision.
                </div>
                <InputGrid vals={biasInput} setVals={setBiasInput} features={features} />
                <button onClick={runBiasTest} disabled={loading || !sensitive} style={{ marginTop: 16, width: "100%", padding: "13px", background: loading || !sensitive ? "#1a1a2e" : "linear-gradient(135deg,#7c3aed,#2563eb)", border: "none", borderRadius: 10, color: "white", fontSize: 14, fontWeight: 700, cursor: loading || !sensitive ? "not-allowed" : "pointer" }}>
                  {loading ? "⌛ Testing..." : `◈ Test Bias on "${sensitive || "sensitive attr"}"`}
                </button>
              </div>

              {biasTestResult && (
                <div style={{
                  background: "#0d0d14",
                  border: `1px solid ${biasTestResult.bias_detected ? "rgba(239,68,68,0.3)" : "rgba(16,185,129,0.3)"}`,
                  borderRadius: 16, padding: 24,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                    <div style={{ fontSize: 28 }}>{biasTestResult.bias_detected ? "⚠" : "✓"}</div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: biasTestResult.bias_detected ? "#fca5a5" : "#6ee7b7" }}>
                        {biasTestResult.bias_detected ? "BIAS DETECTED" : "No Bias Detected"}
                      </div>
                      <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 2 }}>{biasTestResult.verdict}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {Object.entries(biasTestResult.results_by_group || {}).map(([group, result]: any) => (
                      <div key={group} style={{
                        flex: "1 1 160px", background: "#080810",
                        border: `1px solid ${result.prediction === 1 ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`,
                        borderRadius: 12, padding: 16, textAlign: "center",
                      }}>
                        <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8, fontFamily: "'JetBrains Mono',monospace" }}>{group}</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: result.prediction === 1 ? "#10b981" : "#ef4444" }}>{result.label}</div>
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{(result.probability * 100).toFixed(1)}%</div>
                      </div>
                    ))}
                  </div>
                  {biasTestResult.probability_delta !== undefined && (
                    <div style={{ marginTop: 16, fontSize: 13, color: "#94a3b8", textAlign: "center" }}>
                      Probability delta across groups: <span style={{ color: "#a78bfa", fontFamily: "'JetBrains Mono',monospace" }}>{(biasTestResult.probability_delta * 100).toFixed(2)}%</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── SWEEP ── */}
          {tab === "sweep" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 16, padding: 24 }}>
                <div style={{ fontSize: 12, color: "#64748b", fontFamily: "'JetBrains Mono',monospace", marginBottom: 6, letterSpacing: "0.08em" }}>FEATURE SENSITIVITY SWEEP</div>
                <div style={{ fontSize: 12, color: "#475569", marginBottom: 16 }}>See how the model probability changes as one feature varies across its range.</div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 6 }}>Feature to sweep</label>
                  <select
                    value={sweepFeature}
                    onChange={e => setSweepFeature(e.target.value)}
                    style={{ width: "100%", padding: "9px 12px", background: "#080810", border: "1px solid #1a1a2e", borderRadius: 8, color: "#e2e8f0", fontSize: 13, outline: "none" }}
                  >
                    <option value="">— Select feature —</option>
                    {features.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <InputGrid vals={sweepInput} setVals={setSweepInput} features={features} />
                <button onClick={runSweep} disabled={loading || !sweepFeature} style={{ marginTop: 16, width: "100%", padding: "13px", background: loading || !sweepFeature ? "#1a1a2e" : "linear-gradient(135deg,#7c3aed,#2563eb)", border: "none", borderRadius: 10, color: "white", fontSize: 14, fontWeight: 700, cursor: loading || !sweepFeature ? "not-allowed" : "pointer" }}>
                  {loading ? "⌛ Sweeping..." : `∿ Sweep "${sweepFeature || "feature"}"`}
                </button>
              </div>

              {sweepResult && sweepChartData.length > 0 && (
                <div style={{ background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 16, padding: 24 }}>
                  <div style={{ fontSize: 12, color: "#64748b", fontFamily: "'JetBrains Mono',monospace", marginBottom: 16, letterSpacing: "0.08em" }}>
                    PROBABILITY vs {sweepResult.feature?.toUpperCase()}
                  </div>
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={sweepChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
                      <XAxis dataKey="value" tick={{ fill: "#64748b", fontSize: 11 }} />
                      <YAxis domain={[0, 1]} tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={v => `${(v * 100).toFixed(0)}%`} />
                      <Tooltip
                        contentStyle={{ background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 8, fontSize: 12 }}
                        formatter={(v: any) => [`${(v * 100).toFixed(1)}%`, "Approval Probability"]}
                        labelFormatter={v => `${sweepResult.feature} = ${v}`}
                      />
                      <ReferenceLine y={0.5} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: "Decision Boundary", fill: "#f59e0b", fontSize: 11, position: "right" }} />
                      <Line type="monotone" dataKey="probability" stroke="#7c3aed" strokeWidth={2.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                  {sweepResult.decision_threshold_value !== null && (
                    <div style={{ marginTop: 12, fontSize: 13, color: "#94a3b8", textAlign: "center" }}>
                      Decision threshold at <span style={{ color: "#f59e0b", fontFamily: "'JetBrains Mono',monospace" }}>{sweepResult.feature} ≈ {sweepResult.decision_threshold_value}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
