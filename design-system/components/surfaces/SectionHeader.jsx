import React from "react";

export function SectionHeader({ title, count, subtitle, action, controls, size = "h2", style }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap", ...style }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        <h2 style={size === "h3"
          ? { font: "var(--type-h3)", letterSpacing: "var(--ls-h3)", color: "var(--ink-0)" }
          : { font: "var(--type-h2)", letterSpacing: "var(--ls-h2)", color: "var(--ink-0)" }}>{title}</h2>
        {count != null && (
          <span style={{ display: "inline-grid", placeItems: "center", minWidth: 24, height: 24, padding: "0 8px", borderRadius: "var(--r-pill)", background: "var(--n-700)", color: "var(--ink-1)", font: "var(--fw-semibold) var(--fs-meta)/1 var(--font-ui)" }}>{count}</span>
        )}
        {subtitle && <span style={{ color: "var(--ink-2)", font: "var(--type-body)" }}>{subtitle}</span>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {controls}
        {action}
      </div>
    </div>
  );
}
