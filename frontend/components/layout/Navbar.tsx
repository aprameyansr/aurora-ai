"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/upload",     label: "Upload",     icon: "⬆" },
  { href: "/dashboard",  label: "Analysis",   icon: "◈" },
  { href: "/mitigation", label: "Mitigate",   icon: "⚡" },
  { href: "/audit",      label: "Audit",      icon: "◉" },
  { href: "/simulation", label: "Simulate",   icon: "⌬" },
];

export default function Navbar() {
  const path = usePathname();
  return (
    <nav style={{
      width: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 32px",
      height: "64px",
      background: "rgba(5, 5, 8, 0.9)",
      borderBottom: "1px solid #1a1a2e",
      backdropFilter: "blur(12px)",
      position: "sticky",
      top: 0,
      zIndex: 100,
    }}>
      <Link href="/" style={{ textDecoration: "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{
            width: 28, height: 28,
            background: "linear-gradient(135deg, #7c3aed, #2563eb)",
            borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 700, color: "white",
          }}>A</span>
          <span style={{
            fontSize: 16,
            fontWeight: 700,
            background: "linear-gradient(135deg, #a78bfa, #60a5fa)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: "0.08em",
          }}>AURORA</span>
          <span style={{
            fontSize: 10,
            color: "#64748b",
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: "0.12em",
            paddingTop: 2,
          }}>AI GOVERNANCE</span>
        </div>
      </Link>

      <div style={{ display: "flex", gap: "4px" }}>
        {links.map(({ href, label, icon }) => {
          const active = path === href;
          return (
            <Link key={href} href={href} style={{ textDecoration: "none" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "6px 14px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                color: active ? "#a78bfa" : "#64748b",
                background: active ? "rgba(124, 58, 237, 0.12)" : "transparent",
                border: active ? "1px solid rgba(124, 58, 237, 0.25)" : "1px solid transparent",
                transition: "all 0.15s",
                cursor: "pointer",
              }}>
                <span style={{ fontSize: 11 }}>{icon}</span>
                {label}
              </div>
            </Link>
          );
        })}
      </div>

      <div style={{
        display: "flex", alignItems: "center", gap: "8px",
        padding: "5px 12px",
        borderRadius: "20px",
        border: "1px solid rgba(16, 185, 129, 0.3)",
        background: "rgba(16, 185, 129, 0.06)",
      }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981", display: "block" }} />
        <span style={{ fontSize: 12, color: "#6ee7b7", fontFamily: "'JetBrains Mono', monospace" }}>v2.0</span>
      </div>
    </nav>
  );
}
