import React from "react";

export function Breadcrumbs({ items = [], onNavigate, style }) {
  return (
    <nav style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", ...style }}>
      {items.map((it, i) => {
        const label = typeof it === "string" ? it : it.label;
        const last = i === items.length - 1;
        return (
          <React.Fragment key={label + i}>
            <button onClick={() => onNavigate && onNavigate(label, i)} disabled={last}
              style={{
                background: "transparent", border: 0, padding: 0, cursor: last ? "default" : "pointer",
                color: last ? "var(--ink-1)" : "var(--ink-3)", font: "var(--fw-regular) var(--fs-ui)/1.2 var(--font-ui)",
              }}>{label}</button>
            {!last && <span style={{ color: "var(--ink-4)" }}>/</span>}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
