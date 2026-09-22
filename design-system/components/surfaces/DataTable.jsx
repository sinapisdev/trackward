import React from "react";
import { Icon } from "../core/Icon.jsx";

export function DataTable({ columns = [], rows = [], activeRow, onRowClick, footer, style }) {
  const [hoverRow, setHoverRow] = React.useState(null);
  const grid = columns.map(c => c.width || "minmax(0,1fr)").join(" ");
  return (
    <div style={{ display: "grid", gap: 0, ...style }}>
      <div style={{ display: "grid", gridTemplateColumns: grid, gap: 16, padding: "0 12px 10px", borderBottom: "1px solid var(--border-hairline)" }}>
        {columns.map((c, i) => (
          <span key={i} style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--ink-2)", font: "var(--type-meta)", justifyContent: c.align === "right" ? "flex-end" : "flex-start", cursor: c.sortable ? "pointer" : "default" }}>
            {c.label}
            {c.sortable && <Icon name={c.sorted === "desc" ? "arrow-down" : c.sorted === "asc" ? "arrow-up" : "chevrons-up-down"} style={{ width: 13, height: 13, strokeWidth: 1.75 }} />}
          </span>
        ))}
      </div>
      {rows.map((r, ri) => {
        const active = activeRow === ri, hover = hoverRow === ri;
        return (
          <div key={ri}
            onMouseEnter={() => setHoverRow(ri)} onMouseLeave={() => setHoverRow(null)}
            onClick={onRowClick && (() => onRowClick(ri))}
            style={{
              display: "grid", gridTemplateColumns: grid, gap: 16, alignItems: "center",
              padding: "0 12px", minHeight: "var(--row-h)",
              background: active ? "var(--bg-row-active)" : hover ? "var(--bg-row-hover)" : "transparent",
              borderBottom: "1px solid var(--border-hairline)", cursor: onRowClick ? "pointer" : "default",
              transition: "background-color var(--dur-fast) var(--ease-out)",
            }}>
            {columns.map((c, ci) => (
              <span key={ci} style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, justifyContent: c.align === "right" ? "flex-end" : "flex-start", color: ci === 0 ? "var(--ink-0)" : "var(--ink-1)", font: ci === 0 ? "var(--fw-medium) var(--fs-body)/1.3 var(--font-ui)" : "var(--type-body)" }}>
                {typeof r[c.key] === "function" ? r[c.key](r, ri) : r[c.key]}
              </span>
            ))}
          </div>
        );
      })}
      {footer && <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "16px 12px 0", color: "var(--ink-2)", font: "var(--type-meta)" }}>{footer}</div>}
    </div>
  );
}
