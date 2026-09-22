import React from "react";

export function Panel({ title, actions, children, variant = "rail", padding, style }) {
  const skins = {
    rail: { background: "var(--bg-rail)", border: "none", borderRadius: 0 },
    card: { background: "var(--white-04)", border: "1px solid var(--border-hairline)", borderRadius: "var(--r-lg)" },
    drawer: { background: "linear-gradient(180deg,#1C1F1F,#131616)", border: "1px solid var(--border-default)", borderRadius: "var(--r-xl)", boxShadow: "var(--sh-drawer)" },
    plain: { background: "transparent", border: "none", borderRadius: 0 },
  };
  return (
    <section style={{ ...skins[variant], padding: padding ?? (variant === "plain" ? 0 : "22px 24px"), display: "grid", gap: 18, alignContent: "start", minWidth: 0, ...style }}>
      {(title || actions) && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          {typeof title === "string"
            ? <h3 style={{ font: "var(--type-h3)", letterSpacing: "var(--ls-h3)", color: "var(--ink-0)" }}>{title}</h3>
            : title}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}
