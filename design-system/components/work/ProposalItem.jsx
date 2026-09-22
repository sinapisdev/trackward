import React from "react";
import { Icon } from "../core/Icon.jsx";
import { StatusPill } from "../status/StatusPill.jsx";
import { IconButton } from "../core/IconButton.jsx";

export function ProposalItem({ kind, title, meta, status = "pending", selected, onClick, icon, style }) {
  const [hover, setHover] = React.useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", alignItems: "center", gap: 16, padding: "16px 18px", cursor: "pointer",
        borderRadius: "var(--r-lg)", background: selected ? "var(--white-04)" : hover ? "var(--white-04)" : "transparent",
        border: `1px solid ${selected ? "var(--border-default)" : "transparent"}`,
        transition: "var(--t-hover)", ...style,
      }}>
      <span style={{ display: "grid", placeItems: "center", width: 44, height: 44, flex: "none", borderRadius: "var(--r-md)", background: "var(--n-800)", color: "var(--ink-1)" }}>
        <Icon name={icon || (kind === "Prazo" ? "calendar" : kind === "Decisão" ? "message-square" : "file-text")} style={{ width: 20, height: 20, strokeWidth: 1.75 }} />
      </span>
      <span style={{ display: "grid", gap: 3, flex: 1, minWidth: 0 }}>
        <span style={{ color: "var(--ink-3)", font: "var(--type-meta)" }}>{kind}</span>
        <span style={{ color: "var(--ink-0)", font: "var(--fw-medium) var(--fs-body)/1.3 var(--font-ui)" }}>{title}</span>
        {meta && <span style={{ color: "var(--ink-3)", font: "var(--type-meta)" }}>{meta}</span>}
      </span>
      <StatusPill status={status} variant="chip" />
      <IconButton label="Mais ações"><Icon name="more-horizontal" style={{ width: 19, height: 19, strokeWidth: 1.75 }} /></IconButton>
    </div>
  );
}
