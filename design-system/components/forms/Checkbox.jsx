import React from "react";
import { Icon } from "../core/Icon.jsx";

export function Checkbox({ checked, onChange, label, sublabel, disabled, size = 22, style }) {
  return (
    <label style={{ display: "inline-flex", alignItems: sublabel ? "flex-start" : "center", gap: 12, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .55 : 1, ...style }}>
      <input type="checkbox" checked={!!checked} onChange={onChange} disabled={disabled} style={{ position: "absolute", opacity: 0, width: 0, height: 0 }} />
      <span aria-hidden style={{
        width: size, height: size, flex: "none", borderRadius: "var(--r-xs)", display: "grid", placeItems: "center",
        background: checked ? "var(--ink-0)" : "transparent",
        border: `1.5px solid ${checked ? "var(--ink-0)" : "var(--ink-4)"}`,
        transition: "var(--t-hover)", marginTop: sublabel ? 1 : 0,
      }}>
        {checked && <Icon name="check" style={{ width: size - 8, height: size - 8, strokeWidth: 3, color: "var(--n-950)" }} />}
      </span>
      {(label || sublabel) && (
        <span style={{ display: "grid", gap: 3 }}>
          {label && <span style={{ color: checked ? "var(--ink-2)" : "var(--ink-0)", font: "var(--type-body)", textDecoration: checked ? "none" : "none" }}>{label}</span>}
          {sublabel && <span style={{ color: "var(--ink-3)", font: "var(--type-meta)" }}>{sublabel}</span>}
        </span>
      )}
    </label>
  );
}
