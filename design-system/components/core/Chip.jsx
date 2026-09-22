import React from "react";
import { Badge } from "./Badge.jsx";

export function Chip({ children, count, selected, icon, onClick, style, ...rest }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onClick={onClick} aria-pressed={!!selected}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 13px",
        borderRadius: "var(--r-pill)", border: "1px solid transparent", cursor: "pointer",
        background: selected ? "var(--n-800)" : hover ? "var(--white-04)" : "transparent",
        color: selected ? "var(--ink-0)" : "var(--ink-2)",
        font: `${selected ? "var(--fw-semibold)" : "var(--fw-medium)"} var(--fs-ui)/1.2 var(--font-ui)`,
        transition: "var(--t-hover)", ...style,
      }}
      {...rest}
    >
      {icon}
      {children}
      {count != null && <Badge tone={selected ? "neutral" : "outline"}>{count}</Badge>}
    </button>
  );
}
