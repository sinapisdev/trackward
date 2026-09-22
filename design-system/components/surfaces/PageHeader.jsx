import React from "react";

export function PageHeader({ kicker, title, subtitle, meta, actions, style }) {
  return (
    <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 32, flexWrap: "wrap", ...style }}>
      <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
        {kicker && <span style={{ font: "var(--type-kicker)", letterSpacing: "var(--ls-kicker)", textTransform: "uppercase", color: "var(--ink-2)" }}>{kicker}</span>}
        <h1 style={{ font: "var(--type-title)", letterSpacing: "var(--ls-title)", color: "var(--ink-0)" }}>{title}</h1>
        {subtitle && <p style={{ color: "var(--ink-2)", font: "var(--fw-regular) var(--fs-body-lg)/1.4 var(--font-ui)" }}>{subtitle}</p>}
        {meta && <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginTop: 4 }}>{meta}</div>}
      </div>
      {actions && <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>{actions}</div>}
    </header>
  );
}
