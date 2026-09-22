import React from "react";
import { Icon } from "../core/Icon.jsx";
import { Badge } from "../core/Badge.jsx";

export function MobileTabBar({ items = [], active, onChange, safeArea = true, style }) {
  return (
    <nav style={{
      display: "grid", gridAutoFlow: "column", gridAutoColumns: "1fr", alignItems: "center",
      background: "var(--bg-bar)", borderTop: "1px solid var(--border-hairline)",
      padding: safeArea ? "10px 6px 22px" : "10px 6px", ...style,
    }}>
      {items.map(it => {
        const label = typeof it === "string" ? it : it.label;
        const isActive = active === label;
        return (
          <button key={label} onClick={() => onChange && onChange(label)}
            style={{
              display: "grid", justifyItems: "center", gap: 6, background: "transparent", border: 0,
              cursor: "pointer", minHeight: "var(--tap-min)", padding: "4px 0",
              color: isActive ? "var(--ink-0)" : "var(--ink-3)", position: "relative",
            }}>
            <span style={{ position: "relative", display: "grid", placeItems: "center" }}>
              <Icon name={typeof it === "string" ? "circle" : it.icon} style={{ width: 23, height: 23, strokeWidth: isActive ? 2.1 : 1.75 }} />
              {typeof it !== "string" && it.count != null && (
                <span style={{ position: "absolute", top: -6, left: 12 }}><Badge>{it.count}</Badge></span>
              )}
            </span>
            <span style={{ font: `${isActive ? "var(--fw-semibold)" : "var(--fw-medium)"} var(--fs-micro)/1 var(--font-ui)` }}>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
