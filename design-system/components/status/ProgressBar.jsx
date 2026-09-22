import React from "react";

export function ProgressBar({ value = 0, height = 6, width = "100%", tone = "ink", label, style }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 12, width, ...style }}>
      {label && <span style={{ color: "var(--ink-0)", font: "var(--fw-semibold) var(--fs-ui)/1 var(--font-ui)", flex: "none" }}>{value}%</span>}
      <span style={{ flex: 1, height, borderRadius: "var(--r-pill)", background: "var(--n-800)", overflow: "hidden" }}>
        <span style={{
          display: "block", height: "100%", width: `${Math.max(0, Math.min(100, value))}%`,
          borderRadius: "var(--r-pill)", background: tone === "accent" ? "var(--accent)" : "var(--ink-1)",
          transition: "width var(--dur-slow) var(--ease-out)",
        }} />
      </span>
    </span>
  );
}
