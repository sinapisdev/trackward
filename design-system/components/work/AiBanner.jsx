import React from "react";
import { Icon } from "../core/Icon.jsx";
import { Button } from "../core/Button.jsx";

export function AiBanner({ title, subtitle, action, onAction, note, style }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 18, padding: "18px 20px",
      borderRadius: "var(--r-lg)", background: "var(--white-04)", border: "1px solid var(--border-hairline)", ...style,
    }}>
      <Icon name="sparkles" style={{ width: 22, height: 22, strokeWidth: 1.75, color: "var(--accent)", flex: "none" }} />
      <span style={{ display: "grid", gap: 4, flex: 1, minWidth: 0 }}>
        <span style={{ color: "var(--ink-0)", font: "var(--fw-semibold) var(--fs-body-lg)/1.25 var(--font-ui)" }}>{title}</span>
        {subtitle && <span style={{ color: "var(--ink-2)", font: "var(--type-meta)" }}>{subtitle}</span>}
        {note && <span style={{ color: "var(--ink-3)", font: "var(--type-meta)" }}>{note}</span>}
      </span>
      {action && <Button size="sm" onClick={onAction} iconRight={<Icon name="arrow-right" style={{ width: 16, height: 16, strokeWidth: 2 }} />}>{action}</Button>}
    </div>
  );
}
