import React from "react";
import { Icon } from "../core/Icon.jsx";

export function MetricStat({ icon, value, label, tone = "neutral", style }) {
  const color = tone === "danger" ? "var(--danger)" : tone === "warn" ? "var(--warn)" : "var(--ink-0)";
  const iconColor = tone === "danger" ? "var(--danger)" : tone === "warn" ? "var(--warn)" : "var(--ink-1)";
  return (
    <div style={{ display: "grid", gap: 8, minWidth: 0, ...style }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {icon && <Icon name={icon} style={{ width: 24, height: 24, strokeWidth: 1.9, color: iconColor, flex: "none" }} />}
        <span style={{ font: "var(--fw-bold) var(--fs-metric)/1 var(--font-display)", letterSpacing: "var(--ls-metric)", color }}>{value}</span>
      </div>
      <span style={{ color: "var(--ink-2)", font: "var(--type-meta)" }}>{label}</span>
    </div>
  );
}
