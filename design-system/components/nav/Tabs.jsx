import React from "react";
import { Badge } from "../core/Badge.jsx";

export function Tabs({ items = [], active, onChange, variant = "pill", style }) {
  const [hover, setHover] = React.useState(null);
  return (
    <div role="tablist" style={{
      display: "flex", alignItems: "center", gap: variant === "pill" ? 6 : 26,
      borderBottom: variant === "underline" ? "1px solid var(--border-hairline)" : "none", ...style,
    }}>
      {items.map(it => {
        const label = typeof it === "string" ? it : it.label;
        const isActive = active === label;
        const base = { display: "inline-flex", alignItems: "center", gap: 8, border: 0, cursor: "pointer", background: "transparent", transition: "var(--t-hover)", whiteSpace: "nowrap" };
        const skin = variant === "pill"
          ? { padding: "9px 18px", borderRadius: "var(--r-md)", background: isActive ? "var(--n-800)" : hover === label ? "var(--white-04)" : "transparent", color: isActive ? "var(--ink-0)" : "var(--ink-2)" }
          : { padding: "0 2px 14px", marginBottom: -1, borderBottom: `2px solid ${isActive ? "var(--ink-0)" : "transparent"}`, color: isActive ? "var(--ink-0)" : "var(--ink-2)" };
        return (
          <button key={label} role="tab" aria-selected={isActive}
            onMouseEnter={() => setHover(label)} onMouseLeave={() => setHover(null)}
            onClick={() => onChange && onChange(label)}
            style={{ ...base, ...skin, font: `${isActive ? "var(--fw-semibold)" : "var(--fw-medium)"} var(--fs-body)/1 var(--font-ui)` }}>
            {label}
            {typeof it !== "string" && it.count != null && <Badge tone={isActive ? "neutral" : "outline"}>{it.count}</Badge>}
          </button>
        );
      })}
    </div>
  );
}
