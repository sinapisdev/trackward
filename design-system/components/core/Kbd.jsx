import React from "react";

export function Kbd({ children, style }) {
  return (
    <span style={{
      display: "inline-grid", placeItems: "center", minWidth: 22, height: 22, padding: "0 6px",
      borderRadius: "var(--r-xs)", border: "1px solid var(--border-default)", color: "var(--ink-3)",
      font: "var(--fw-medium) var(--fs-micro)/1 var(--font-ui)", ...style,
    }}>{children}</span>
  );
}
