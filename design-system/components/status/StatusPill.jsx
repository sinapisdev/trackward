import React from "react";
import { Icon } from "../core/Icon.jsx";

const MAP = {
  late:    { icon: "circle-dot", label: "Atrasado",  color: "var(--danger-text)", dot: "danger" },
  soon:    { icon: "clock",      label: "Vence em breve", color: "var(--warn-text)", dot: "warn" },
  blocked: { icon: "lock",       label: "Travado",   color: "var(--ink-1)", dot: null },
  onTrack: { icon: null,         label: "Em dia",    color: "var(--ink-1)", dot: "neutral" },
  done:    { icon: "check-circle-2", label: "Concluída", color: "var(--ink-2)", dot: null },
  todo:    { icon: "circle",     label: "A fazer",   color: "var(--ink-1)", dot: null },
  pending: { icon: "clock",      label: "Pendente",  color: "var(--warn-text)", dot: null },
};

export function StatusPill({ status = "onTrack", label, variant = "text", icon, style }) {
  const s = MAP[status] || MAP.onTrack;
  const text = label || s.label;
  const body = (
    <>
      {s.dot && !icon && !s.icon
        ? <span style={{ width: 10, height: 10, borderRadius: "var(--r-pill)", background: s.dot === "danger" ? "var(--danger)" : s.dot === "warn" ? "var(--warn)" : "var(--neutral-status)", flex: "none" }} />
        : null}
      {(icon || s.icon) && (status === "late"
        ? <span style={{ width: 10, height: 10, borderRadius: "var(--r-pill)", background: "var(--danger)", flex: "none" }} />
        : <Icon name={s.icon} style={{ width: 16, height: 16, strokeWidth: 1.75, color: status === "soon" || status === "pending" ? "var(--warn)" : "currentColor", flex: "none" }} />)}
      <span>{text}</span>
    </>
  );
  if (variant === "chip") {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 8, height: 32, padding: "0 14px 0 12px",
        borderRadius: "var(--r-pill)", background: "var(--bg-chip)", border: "1px solid var(--border-hairline)",
        color: s.color, font: "var(--fw-medium) var(--fs-ui)/1 var(--font-ui)", ...style,
      }}>{body}</span>
    );
  }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 9, color: s.color, font: "var(--fw-medium) var(--fs-ui)/1.2 var(--font-ui)", ...style }}>{body}</span>
  );
}
