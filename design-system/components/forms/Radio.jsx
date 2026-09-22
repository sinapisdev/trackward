import React from "react";

export function Radio({ checked, onChange, label, sublabel, name, disabled, style }) {
  return (
    <label style={{ display: "inline-flex", alignItems: sublabel ? "flex-start" : "center", gap: 12, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .55 : 1, ...style }}>
      <input type="radio" name={name} checked={!!checked} onChange={onChange} disabled={disabled} style={{ position: "absolute", opacity: 0, width: 0, height: 0 }} />
      <span aria-hidden style={{
        width: 20, height: 20, flex: "none", borderRadius: "var(--r-pill)", display: "grid", placeItems: "center",
        border: `1.5px solid ${checked ? "var(--ink-0)" : "var(--ink-4)"}`, transition: "var(--t-hover)", marginTop: sublabel ? 2 : 0,
      }}>
        {checked && <span style={{ width: 10, height: 10, borderRadius: "var(--r-pill)", background: "var(--ink-0)" }} />}
      </span>
      {(label || sublabel) && (
        <span style={{ display: "grid", gap: 2 }}>
          {label && <span style={{ color: "var(--ink-0)", font: "var(--type-body)" }}>{label}</span>}
          {sublabel && <span style={{ color: "var(--ink-3)", font: "var(--type-meta)" }}>{sublabel}</span>}
        </span>
      )}
    </label>
  );
}
