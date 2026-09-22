import React from "react";

const SIZES = { xs: 24, sm: 28, md: 32, lg: 40, xl: 52 };

export function Avatar({ name = "", initials, src, size = "md", ring, style, ...rest }) {
  const px = typeof size === "number" ? size : SIZES[size];
  const text = (initials || name.replace(/[^\p{L} ]/gu, "").split(" ").filter(Boolean).slice(0, 2).map(w => w[0]).join("")).toUpperCase();
  return (
    <span title={name} style={{
      display: "inline-grid", placeItems: "center", width: px, height: px, flex: "none",
      borderRadius: "var(--r-pill)", background: src ? `center/cover url(${src})` : "var(--bg-avatar)",
      color: "var(--ink-1)", font: `var(--fw-semibold) ${Math.max(10, Math.round(px * 0.36))}px/1 var(--font-ui)`,
      letterSpacing: ".01em", boxShadow: ring ? `0 0 0 2px ${ring}` : "none", overflow: "hidden", ...style,
    }} {...rest}>{!src && text}</span>
  );
}

export function AvatarGroup({ people = [], size = "md", max = 3, style }) {
  const px = typeof size === "number" ? size : SIZES[size];
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", ...style }}>
      {shown.map((p, i) => (
        <Avatar key={i} {...(typeof p === "string" ? { name: p } : p)} size={px}
          style={{ marginLeft: i ? -px * 0.28 : 0, boxShadow: "0 0 0 2px var(--bg-page)" }} />
      ))}
      {rest > 0 && (
        <span style={{ marginLeft: 10, color: "var(--ink-2)", font: "var(--fw-semibold) var(--fs-meta)/1 var(--font-ui)" }}>+{rest}</span>
      )}
    </span>
  );
}
