import React from "react";

export function SegmentedControl({ options = [], value, onChange, size = "md", style }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 2, padding: 3, borderRadius: "var(--r-pill)",
      background: "var(--bg-chip)", border: "1px solid var(--border-hairline)", ...style,
    }}>
      {options.map(o => {
        const label = typeof o === "string" ? o : o.label;
        const isActive = value === label;
        return (
          <button key={label} onClick={() => onChange && onChange(label)}
            style={{
              padding: size === "sm" ? "6px 14px" : "8px 18px", borderRadius: "var(--r-pill)", border: 0, cursor: "pointer",
              background: isActive ? "var(--n-700)" : "transparent",
              color: isActive ? "var(--ink-0)" : "var(--ink-2)",
              font: `${isActive ? "var(--fw-semibold)" : "var(--fw-medium)"} var(--fs-ui)/1 var(--font-ui)`,
              transition: "var(--t-hover)", whiteSpace: "nowrap",
            }}>{label}</button>
        );
      })}
    </div>
  );
}
