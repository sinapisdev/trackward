import React from "react";

export function Field({ label, hint, optional, error, layout = "stack", htmlFor, children, style }) {
  const lbl = label && (
    <label htmlFor={htmlFor} style={{
      display: "block", color: layout === "row" ? "var(--ink-2)" : "var(--ink-1)",
      font: "var(--fw-medium) var(--fs-ui)/1.3 var(--font-ui)",
      paddingTop: layout === "row" ? 13 : 0,
    }}>
      {label}{optional && <span style={{ color: "var(--ink-3)", fontWeight: "var(--fw-regular)" }}> (opcional)</span>}
    </label>
  );
  return (
    <div style={layout === "row"
      ? { display: "grid", gridTemplateColumns: "224px minmax(0,1fr)", gap: 16, alignItems: "start", ...style }
      : { display: "grid", gap: 8, ...style }}>
      {lbl}
      <div style={{ display: "grid", gap: 6 }}>
        {children}
        {(hint || error) && (
          <p style={{ color: error ? "var(--danger-text)" : "var(--ink-3)", font: "var(--type-meta)" }}>{error || hint}</p>
        )}
      </div>
    </div>
  );
}
