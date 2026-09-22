import React from "react";
import { Icon } from "../core/Icon.jsx";

export function Select({ options = [], value, onChange, leading, size = "md", placeholder, style, ...rest }) {
  const [focus, setFocus] = React.useState(false);
  const h = size === "sm" ? 36 : size === "lg" ? 52 : 46;
  return (
    <div style={{
      position: "relative", display: "flex", alignItems: "center", gap: 10, height: h, padding: "0 14px",
      background: "rgba(255,255,255,.03)", borderRadius: "var(--r-md)",
      border: `1px solid ${focus ? "var(--accent)" : "var(--border-default)"}`,
      transition: "var(--t-hover)", ...style,
    }}>
      {leading && <span style={{ display: "grid", flex: "none" }}>{leading}</span>}
      <select value={value} onChange={onChange} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        style={{
          appearance: "none", WebkitAppearance: "none", flex: 1, minWidth: 0, background: "transparent",
          border: 0, outline: "none", color: value ? "var(--ink-0)" : "var(--ink-3)",
          font: "var(--fw-medium) var(--fs-ui)/1.2 var(--font-ui)", paddingRight: 18, cursor: "pointer",
        }} {...rest}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => {
          const v = typeof o === "string" ? o : o.value;
          return <option key={v} value={v} style={{ background: "var(--n-850)" }}>{typeof o === "string" ? o : o.label}</option>;
        })}
      </select>
      <Icon name="chevron-down" style={{ width: 17, height: 17, strokeWidth: 1.75, color: "var(--ink-2)", flex: "none" }} />
    </div>
  );
}
