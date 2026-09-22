import React from "react";

export function Switch({ checked, onChange, label, sublabel, disabled, style }) {
  return (
    <label style={{ display: "inline-flex", alignItems: sublabel ? "flex-start" : "center", gap: 14, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .5 : 1, ...style }}>
      <input type="checkbox" role="switch" checked={!!checked} onChange={onChange} disabled={disabled} style={{ position: "absolute", opacity: 0, width: 0, height: 0 }} />
      <span aria-hidden style={{
        width: 48, height: 26, flex: "none", borderRadius: "var(--r-pill)", padding: 3,
        background: checked ? "var(--ink-0)" : "var(--n-600)",
        display: "flex", justifyContent: checked ? "flex-end" : "flex-start",
        transition: "background-color var(--dur-base) var(--ease-out)",
      }}>
        <span style={{
          width: 20, height: 20, borderRadius: "var(--r-pill)",
          background: checked ? "var(--n-950)" : "var(--ink-0)",
          transition: "background-color var(--dur-base) var(--ease-out)",
        }} />
      </span>
      {(label || sublabel) && (
        <span style={{ display: "grid", gap: 3 }}>
          {label && <span style={{ color: "var(--ink-0)", font: "var(--type-body)" }}>{label}</span>}
          {sublabel && <span style={{ color: "var(--ink-3)", font: "var(--type-meta)" }}>{sublabel}</span>}
        </span>
      )}
    </label>
  );
}
