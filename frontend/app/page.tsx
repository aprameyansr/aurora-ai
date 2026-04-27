"use client";

import Link from "next/link";

const features = [
  { icon: "◈", title: "Bias Detection",     desc: "Demographic parity, equalized odds, disparate impact, proxy variables — across any dataset." },
  { icon: "✦", title: "AI Explanation",     desc: "Gemini-powered root cause analysis with compliance flags and structured governance reports." },
  { icon: "⚡", title: "Bias Mitigation",   desc: "Three fairness strategies: reweighting, feature suppression, fairness-aware training — with before/after comparison." },
  { icon: "⌬", title: "What-If Simulation", desc: "Test counterfactuals, sensitivity sweeps, and bias sensitivity — without touching production." },
  { icon: "◉", title: "Audit Reports",      desc: "EEOC, EU AI Act compliance checks. Deployment readiness decision with full audit trail." },
  { icon: "⊕", title: "Intersectional Bias", desc: "Detect compounded discrimination across multiple sensitive attributes simultaneously." },
];

const metrics = [
  { value: "4", label: "Fairness Metrics" },
  { value: "3", label: "Mitigation Strategies" },
  { value: "80%", label: "EEOC Rule Enforcement" },
  { value: "0.01s", label: "Analysis Latency" },
];

export default function Home() {
  return (
    <div style={{ padding: "0 0 80px 0", overflow: "hidden" }}>
      {/* Hero */}
      <div style={{
        textAlign: "center",
        padding: "100px 32px 60px",
        position: "relative",
      }}>
        <div style={{
          position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
          width: 600, height: 400,
          background: "radial-gradient(ellipse, rgba(124,58,237,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "6px 16px", borderRadius: 20,
          border: "1px solid rgba(124,58,237,0.3)",
          background: "rgba(124,58,237,0.08)",
          fontSize: 12, color: "#a78bfa",
          fontFamily: "'JetBrains Mono', monospace",
          marginBottom: 32,
          letterSpacing: "0.08em",
        }}>
          <span style={{ width: 6, height: 6, background: "#7c3aed", borderRadius: "50%", display: "block" }} />
          AI GOVERNANCE PLATFORM — SOLUTION CHALLENGE 2026
        </div>

        <h1 style={{
          fontSize: "clamp(52px, 8vw, 84px)",
          fontWeight: 700,
          lineHeight: 1.05,
          marginBottom: 24,
          letterSpacing: "-0.02em",
        }}>
          <span style={{
            background: "linear-gradient(135deg, #e2e8f0 0%, #a78bfa 40%, #60a5fa 70%, #34d399 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            Detect, Explain &<br />Fix AI Bias
          </span>
        </h1>

        <p style={{
          fontSize: 18,
          color: "#94a3b8",
          maxWidth: 540,
          margin: "0 auto 48px",
          lineHeight: 1.7,
        }}>
          A production-grade AI governance layer that audits datasets for discrimination,
          explains bias in human terms, and applies mitigation — before deployment.
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/upload" style={{ textDecoration: "none" }}>
            <button style={{
              padding: "14px 32px",
              background: "linear-gradient(135deg, #7c3aed, #2563eb)",
              color: "white",
              border: "none",
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}>
              Start Audit ⬆
            </button>
          </Link>
          <Link href="/dashboard" style={{ textDecoration: "none" }}>
            <button style={{
              padding: "14px 32px",
              background: "rgba(255,255,255,0.04)",
              color: "#e2e8f0",
              border: "1px solid #1a1a2e",
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
            }}>
              View Demo →
            </button>
          </Link>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{
        display: "flex",
        justifyContent: "center",
        gap: 0,
        maxWidth: 700,
        margin: "0 auto 80px",
        background: "#0d0d14",
        border: "1px solid #1a1a2e",
        borderRadius: 16,
        overflow: "hidden",
      }}>
        {metrics.map((m, i) => (
          <div key={i} style={{
            flex: 1,
            textAlign: "center",
            padding: "24px 16px",
            borderRight: i < metrics.length - 1 ? "1px solid #1a1a2e" : "none",
          }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#a78bfa", fontFamily: "'JetBrains Mono', monospace" }}>{m.value}</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* Features grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: 16,
        maxWidth: 1100,
        margin: "0 auto",
        padding: "0 32px",
      }}>
        {features.map((f, i) => (
          <div key={i} style={{
            background: "#0d0d14",
            border: "1px solid #1a1a2e",
            borderRadius: 16,
            padding: "28px 24px",
            transition: "border-color 0.2s",
          }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(124,58,237,0.4)")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = "#1a1a2e")}
          >
            <div style={{
              width: 40, height: 40,
              background: "rgba(124,58,237,0.12)",
              borderRadius: 10,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, marginBottom: 16,
              color: "#a78bfa",
            }}>{f.icon}</div>
            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8, color: "#e2e8f0" }}>{f.title}</div>
            <div style={{ fontSize: 14, color: "#64748b", lineHeight: 1.6 }}>{f.desc}</div>
          </div>
        ))}
      </div>

      {/* CTA bottom */}
      <div style={{ textAlign: "center", marginTop: 80, padding: "0 32px" }}>
        <div style={{
          display: "inline-block",
          background: "linear-gradient(135deg, rgba(124,58,237,0.08), rgba(37,99,235,0.08))",
          border: "1px solid rgba(124,58,237,0.2)",
          borderRadius: 20,
          padding: "48px 64px",
        }}>
          <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>Ready to audit your AI?</div>
          <div style={{ color: "#64748b", marginBottom: 28, fontSize: 15 }}>Upload any CSV dataset. Get a full bias report in seconds.</div>
          <Link href="/upload" style={{ textDecoration: "none" }}>
            <button style={{
              padding: "14px 36px",
              background: "linear-gradient(135deg, #7c3aed, #2563eb)",
              color: "white",
              border: "none",
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
            }}>
              Upload Dataset →
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
