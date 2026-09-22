import React from "react";

export function Badge({ children, tone = "neutral", style, ...rest }) {
  const tones = {
    neutral: { background: "var(--n-700)", color: "var(--ink-1)" },
    accent: { background: "var(--accent)", color: "var(--accent-ink)" },
    danger: { background: "var(--danger)", color: "#1A0505" },
    outline: { background: "transparent", color: "var(--ink-2)", boxShadow: "inset 0 0 0 1px var(--border-default)" },
  };
  return (
    <span style={{
      display: "inline-grid", placeItems: "center", minWidth: 22, height: 22, padding: "0 7px",
      borderRadius: "var(--r-pill)", font: "var(--fw-semibold) var(--fs-micro)/1 var(--font-ui)",
      ...tones[tone], ...style,
    }} {...rest}>{children}</span>
  );
}
