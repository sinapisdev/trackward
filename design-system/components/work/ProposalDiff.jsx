import React from "react";
import { Icon } from "../core/Icon.jsx";

export function ProposalDiff({ fromLabel = "Prazo atual", from, toLabel = "Prazo proposto", to, icon = "clock", style }) {
  const box = (label, value, emphasis) => (
    <div style={{ display: "grid", gap: 10, padding: "18px 20px", borderRadius: "var(--r-lg)", background: "var(--white-04)", border: "1px solid var(--border-hairline)", minWidth: 0 }}>
      <span style={{ color: "var(--ink-3)", font: "var(--type-meta)" }}>{label}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Icon name={icon} style={{ width: 22, height: 22, strokeWidth: 1.75, color: "var(--warn)", flex: "none" }} />
        <span style={{ color: "var(--ink-0)", font: `${emphasis ? "var(--fw-semibold)" : "var(--fw-medium)"} var(--fs-h3)/1.1 var(--font-display)`, letterSpacing: "-.01em" }}>{value}</span>
      </span>
    </div>
  );
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 40px minmax(0,1fr)", alignItems: "center", gap: 8, ...style }}>
      {box(fromLabel, from, false)}
      <span style={{ display: "grid", placeItems: "center", color: "var(--ink-2)" }}>
        <Icon name="arrow-right" style={{ width: 22, height: 22, strokeWidth: 1.75 }} />
      </span>
      {box(toLabel, to, true)}
    </div>
  );
}
