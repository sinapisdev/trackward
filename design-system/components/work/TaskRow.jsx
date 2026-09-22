import React from "react";
import { Icon } from "../core/Icon.jsx";
import { Checkbox } from "../forms/Checkbox.jsx";
import { Avatar } from "../core/Avatar.jsx";
import { IconButton } from "../core/IconButton.jsx";

export function TaskRow({
  title, description, done, onToggle, assignee, assigneeLabel, due, dueTone = "default",
  action, blocked, onOverflow, style,
}) {
  const [hover, setHover] = React.useState(false);
  const dueColor = dueTone === "danger" ? "var(--danger-text)" : dueTone === "warn" ? "var(--warn-text)" : "var(--ink-1)";
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: "grid", gridTemplateColumns: "minmax(0,1fr) 190px 150px auto 44px", gap: 16, alignItems: "center",
        padding: "14px 4px", borderBottom: "1px solid var(--border-hairline)",
        background: hover ? "var(--bg-row-hover)" : "transparent", transition: "background-color var(--dur-fast) var(--ease-out)", ...style,
      }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, minWidth: 0 }}>
        {blocked
          ? <Icon name="lock" style={{ width: 20, height: 20, strokeWidth: 1.75, color: "var(--ink-2)", flex: "none", marginTop: 2 }} />
          : <Checkbox checked={done} onChange={onToggle} />}
        <span style={{ display: "grid", gap: 4, minWidth: 0 }}>
          <span style={{ color: done ? "var(--ink-2)" : "var(--ink-0)", font: "var(--fw-medium) var(--fs-body)/1.3 var(--font-ui)" }}>{title}</span>
          {description && <span style={{ color: "var(--ink-3)", font: "var(--type-meta)" }}>{description}</span>}
        </span>
      </div>
      <span style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--ink-1)", font: "var(--type-body)", minWidth: 0 }}>
        {assignee && <Avatar name={assignee} size="md" />}
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{assigneeLabel || assignee}</span>
      </span>
      <span style={{ color: dueColor, font: "var(--type-body)" }}>{due}</span>
      <span style={{ display: "flex", justifyContent: "flex-end" }}>{action}</span>
      <span style={{ display: "flex", justifyContent: "flex-end", opacity: hover ? 1 : .55, transition: "opacity var(--dur-fast) var(--ease-out)" }}>
        <IconButton label="Mais ações" onClick={onOverflow}><Icon name="more-horizontal" style={{ width: 19, height: 19, strokeWidth: 1.75 }} /></IconButton>
      </span>
    </div>
  );
}
