import React from "react";
import { Icon } from "../core/Icon.jsx";

export function ListRow({ leading, title, subtitle, trailing, meta, chevron, active, tone = "default", onClick, style }) {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", alignItems: "center", gap: 16, padding: "14px 12px", minHeight: 56,
        borderBottom: "1px solid var(--border-hairline)", cursor: onClick ? "pointer" : "default",
        background: active ? "var(--bg-row-active)" : hover ? "var(--bg-row-hover)" : "transparent",
        boxShadow: active ? "inset 2px 0 0 var(--accent)" : "none",
        transition: "background-color var(--dur-fast) var(--ease-out)", ...style,
      }}>
      {leading && <span style={{ display: "grid", placeItems: "center", flex: "none", color: "var(--ink-2)" }}>{leading}</span>}
      <span style={{ display: "grid", gap: 3, flex: 1, minWidth: 0 }}>
        <span style={{ color: tone === "danger" ? "var(--danger-text)" : "var(--ink-0)", font: "var(--fw-medium) var(--fs-body)/1.3 var(--font-ui)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</span>
        {subtitle && <span style={{ color: "var(--ink-3)", font: "var(--type-meta)" }}>{subtitle}</span>}
      </span>
      {meta && <span style={{ color: "var(--ink-2)", font: "var(--type-body)", flex: "none" }}>{meta}</span>}
      {trailing}
      {chevron && <Icon name="chevron-right" style={{ width: 18, height: 18, strokeWidth: 1.75, color: hover ? "var(--ink-1)" : "var(--ink-3)", flex: "none" }} />}
    </div>
  );
}
