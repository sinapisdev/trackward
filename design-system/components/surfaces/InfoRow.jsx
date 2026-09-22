import React from "react";
import { Icon } from "../core/Icon.jsx";

export function InfoRow({ icon, label, value, style }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0, ...style }}>
      {icon && <Icon name={icon} style={{ width: 19, height: 19, strokeWidth: 1.75, color: "var(--ink-2)", flex: "none" }} />}
      <span style={{ color: "var(--ink-2)", font: "var(--type-body)", minWidth: 0 }}>
        {label && <span>{label}: </span>}
        <span style={{ color: "var(--ink-0)", fontWeight: "var(--fw-medium)" }}>{value}</span>
      </span>
    </div>
  );
}
