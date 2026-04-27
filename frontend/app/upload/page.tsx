"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "@/Context/AppContext";
import { uploadDataset, analyzeBias, getExplanation } from "@/lib/api";

const STEPS = ["Upload CSV", "Configure Columns", "Run Analysis"];

export default function UploadPage() {
  const {
    file, setFile,
    setUploadedFileName,
    columns, setColumns,
    setSuggestedSensitive,
    target, setTarget,
    sensitive, setSensitive,
    setBiasMetrics,
    setExplanation,
  } = useAppContext();

  const router = useRouter();
  const [step, setStep] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<any[]>([]);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(async (f: File) => {
    if (!f.name.endsWith(".csv")) { setError("Only CSV files supported"); return; }
    setFile(f);
    setUploading(true);
    setError("");
    setProgress(20);
    try {
      const res = await uploadDataset(f);
      setProgress(80);
      setUploadedFileName(res.filename);
      setColumns(res.columns);
      setSuggestedSensitive(res.suggested_sensitive_attributes || []);
      setPreview(res.preview || []);
      setProgress(100);
      setStep(1);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }, []);

  const handleAnalyze = async () => {
    if (!target || !sensitive || !file) return;
    setAnalyzing(true);
    setError("");
    setProgress(10);
    try {
      setProgress(30);
      const biasRes = await analyzeBias({ file_path: `uploads/${file.name}`, target, sensitive });
      setProgress(70);
      setBiasMetrics(biasRes.bias_metrics);
      const explRes = await getExplanation(biasRes.bias_metrics);
      setExplanation(explRes.explanation);
      setProgress(100);
      router.push("/dashboard");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px" }}>
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 12, color: "#7c3aed", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.1em", marginBottom: 10 }}>
          STEP {step + 1} OF 3
        </div>
        <h1 style={{ fontSize: 36, fontWeight: 700, marginBottom: 8 }}>
          {STEPS[step]}
        </h1>
        <p style={{ color: "#64748b", fontSize: 15 }}>
          {step === 0 && "Upload your CSV dataset to begin bias analysis"}
          {step === 1 && "Select which columns to analyze for bias"}
          {step === 2 && "Review your configuration and run the analysis"}
        </p>
      </div>

      {/* Step indicator */}
      <div style={{ display: "flex", gap: 8, marginBottom: 40 }}>
        {STEPS.map((s, i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ height: 3, borderRadius: 2, background: i <= step ? "#7c3aed" : "#1a1a2e", transition: "background 0.3s" }} />
            <div style={{ fontSize: 11, color: i <= step ? "#a78bfa" : "#64748b", fontFamily: "'JetBrains Mono',monospace" }}>{s}</div>
          </div>
        ))}
      </div>

      {error && (
        <div style={{
          padding: "12px 16px", borderRadius: 10,
          background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)",
          color: "#fca5a5", fontSize: 14, marginBottom: 24,
        }}>{error}</div>
      )}

      {/* Step 0: Upload */}
      {step === 0 && (
        <div>
          <label
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault(); setDragOver(false);
              const f = e.dataTransfer.files[0];
              if (f) handleFile(f);
            }}
            htmlFor="fileInput"
            style={{
              display: "block",
              border: `2px dashed ${dragOver ? "#7c3aed" : "#1a1a2e"}`,
              borderRadius: 16,
              padding: "60px 40px",
              textAlign: "center",
              cursor: "pointer",
              background: dragOver ? "rgba(124,58,237,0.06)" : "#0d0d14",
              transition: "all 0.2s",
            }}
          >
            <input id="fileInput" type="file" accept=".csv" style={{ display: "none" }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

            <div style={{ fontSize: 40, marginBottom: 16 }}>
              {uploading ? "⌛" : file ? "✓" : "⬆"}
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: "#e2e8f0" }}>
              {uploading ? "Uploading..." : file ? file.name : "Drop CSV here or click to browse"}
            </div>
            <div style={{ fontSize: 13, color: "#64748b" }}>
              Supports tabular CSV datasets up to 50MB
            </div>
          </label>

          {(uploading || progress > 0 && progress < 100) && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12, color: "#64748b" }}>
                <span>Processing dataset</span><span>{progress}%</span>
              </div>
              <div style={{ height: 4, background: "#1a1a2e", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg, #7c3aed, #2563eb)", transition: "width 0.3s" }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 1: Configure */}
      {step === 1 && columns.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Dataset summary */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 8,
          }}>
            {[
              ["File", file?.name || ""],
              ["Rows", preview.length ? `${preview.length}+ rows` : "—"],
              ["Columns", `${columns.length} columns`],
            ].map(([k, v]) => (
              <div key={k} style={{ background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>{k}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Column selectors */}
          {[
            { label: "Target Column", sublabel: "What the AI is predicting (e.g., loan_approved, hired)", val: target, set: setTarget },
            { label: "Sensitive Attribute", sublabel: "Protected characteristic to audit (e.g., gender, race, age)", val: sensitive, set: setSensitive },
          ].map(({ label, sublabel, val, set }) => (
            <div key={label}>
              <label style={{ display: "block", fontWeight: 600, fontSize: 14, marginBottom: 4, color: "#e2e8f0" }}>{label}</label>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>{sublabel}</div>
              <select
                value={val}
                onChange={e => set(e.target.value)}
                style={{
                  width: "100%", padding: "10px 14px",
                  background: "#0d0d14", border: "1px solid #1a1a2e",
                  borderRadius: 10, color: "#e2e8f0", fontSize: 14,
                  outline: "none", cursor: "pointer",
                }}
              >
                <option value="">— Select column —</option>
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          ))}

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setStep(0)} style={{
              padding: "12px 20px", background: "#0d0d14", border: "1px solid #1a1a2e",
              borderRadius: 10, color: "#64748b", cursor: "pointer", fontSize: 14,
            }}>← Back</button>
            <button
              onClick={() => setStep(2)}
              disabled={!target || !sensitive || target === sensitive}
              style={{
                flex: 1, padding: "12px 24px",
                background: target && sensitive && target !== sensitive ? "linear-gradient(135deg, #7c3aed, #2563eb)" : "#1a1a2e",
                border: "none", borderRadius: 10, color: "white",
                cursor: target && sensitive && target !== sensitive ? "pointer" : "not-allowed",
                fontSize: 14, fontWeight: 600,
              }}
            >
              {target === sensitive ? "Target and Sensitive must differ" : "Continue →"}
            </button>
          </div>

          {/* Preview table */}
          {preview.length > 0 && (
            <div>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8, fontFamily: "'JetBrains Mono',monospace" }}>
                DATASET PREVIEW (first {preview.length} rows)
              </div>
              <div style={{ overflowX: "auto", background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 10 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "'JetBrains Mono',monospace" }}>
                  <thead>
                    <tr>
                      {Object.keys(preview[0]).map(k => (
                        <th key={k} style={{
                          padding: "10px 12px", textAlign: "left", color: "#64748b",
                          borderBottom: "1px solid #1a1a2e", whiteSpace: "nowrap",
                          fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em",
                        }}>{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i}>
                        {Object.values(row).map((v: any, j) => (
                          <td key={j} style={{ padding: "8px 12px", borderBottom: "1px solid rgba(26,26,46,0.6)", color: "#94a3b8" }}>
                            {String(v).slice(0, 30)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Run */}
      {step === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 16, padding: 24 }}>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16, fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.08em" }}>
              ANALYSIS CONFIGURATION
            </div>
            {[
              ["Dataset", file?.name],
              ["Target Variable", target],
              ["Sensitive Attribute", sensitive],
              ["Fairness Metrics", "Demographic Parity, Equalized Odds, Disparate Impact, Statistical Parity"],
              ["Features", "Proxy detection, Intersectional bias, Risk scoring, AI explanation"],
            ].map(([k, v]) => (
              <div key={k} style={{
                display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                padding: "12px 0", borderBottom: "1px solid #1a1a2e",
              }}>
                <span style={{ color: "#64748b", fontSize: 14, minWidth: 160 }}>{k}</span>
                <span style={{ color: "#e2e8f0", fontSize: 14, textAlign: "right", maxWidth: 400 }}>{v}</span>
              </div>
            ))}
          </div>

          {analyzing && (
            <div style={{ padding: "16px", background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13, color: "#a78bfa" }}>
                <span>Running bias analysis...</span><span>{progress}%</span>
              </div>
              <div style={{ height: 4, background: "#1a1a2e", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg, #7c3aed, #2563eb)", transition: "width 0.5s" }} />
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setStep(1)} style={{
              padding: "12px 20px", background: "#0d0d14", border: "1px solid #1a1a2e",
              borderRadius: 10, color: "#64748b", cursor: "pointer", fontSize: 14,
            }}>← Back</button>
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              style={{
                flex: 1, padding: "14px 24px",
                background: analyzing ? "#1a1a2e" : "linear-gradient(135deg, #7c3aed, #2563eb)",
                border: "none", borderRadius: 10, color: "white",
                cursor: analyzing ? "not-allowed" : "pointer",
                fontSize: 15, fontWeight: 700,
              }}
            >
              {analyzing ? "Analyzing..." : "⬡ Run Bias Analysis"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
