import React from "react";
import { Icon } from "../core/Icon.jsx";
import { Badge } from "../core/Badge.jsx";

export function SideRail({ groups = [], active, onSelect, header, footer, width = "var(--rail-w)", style }) {
  const [hover, setHover] = React.useState(null);
  return (
    <aside style={{ width, flex: "none", display: "grid", gap: 22, alignContent: "start", padding: "0 20px 0 0", borderRight: "1px solid var(--border-hairline)", ...style }}>
      {header}
      {groups.map((g, gi) => (
        <div key={gi} style={{ display: "grid", gap: 4 }}>
          {g.title && <span style={{ color: "var(--ink-2)", font: "var(--fw-medium) var(--fs-body)/1.2 var(--font-ui)", padding: "0 12px 6px" }}>{g.title}</span>}
          {g.items.map(it => {
            const label = typeof it === "string" ? it : it.label;
            const isActive = active === label;
            return (
              <button key={label} onClick={() => onSelect && onSelect(label)}
                onMouseEnter={() => setHover(label)} onMouseLeave={() => setHover(null)}
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "11px 12px", width: "100%",
                  borderRadius: "var(--r-md)", border: 0, cursor: "pointer", textAlign: "left",
                  background: isActive ? "var(--n-800)" : hover === label ? "var(--white-04)" : "transparent",
                  color: isActive ? "var(--ink-0)" : "var(--ink-1)",
                  font: `${isActive ? "var(--fw-semibold)" : "var(--fw-medium)"} var(--fs-body)/1.2 var(--font-ui)`,
                  transition: "var(--t-hover)",
                }}>
                {typeof it !== "string" && it.icon && (
                  <Icon name={it.icon} style={{ width: 19, height: 19, strokeWidth: 1.75, color: isActive ? "var(--ink-0)" : "var(--ink-2)", flex: "none" }} />
                )}
                {typeof it !== "string" && it.prefix}
                <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
                {typeof it !== "string" && it.trailing}
                {typeof it !== "string" && it.count != null && <Badge tone={isActive ? "neutral" : "outline"}>{it.count}</Badge>}
              </button>
            );
          })}
        </div>
      ))}
      {footer}
    </aside>
  );
}
