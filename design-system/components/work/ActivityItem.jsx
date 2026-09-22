import React from "react";
import { Icon } from "../core/Icon.jsx";
import { Avatar } from "../core/Avatar.jsx";

export function ActivityItem({ who, action, target, time, icon, style }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "10px 0", ...style }}>
      {icon ? <Icon name={icon} style={{ width: 20, height: 20, strokeWidth: 1.75, color: "var(--ink-2)", flex: "none", marginTop: 2 }} /> : <Avatar name={who} size="md" />}
      <span style={{ display: "grid", gap: 3, flex: 1, minWidth: 0 }}>
        <span style={{ color: "var(--ink-1)", font: "var(--type-body)" }}>
          <span style={{ color: "var(--ink-0)" }}>{who}</span> {action}{target ? " " : ""}<span style={{ color: "var(--ink-0)" }}>{target}</span>
        </span>
        <span style={{ color: "var(--ink-3)", font: "var(--type-meta)" }}>{time}</span>
      </span>
    </div>
  );
}
