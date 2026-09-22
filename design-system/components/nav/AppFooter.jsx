import React from "react";
import { Logo } from "../core/Logo.jsx";

export function AppFooter({ org = "Grupo Meridiano", note = "Trabalho que avança.", tagline = "move work forward.", style }) {
  return (
    <footer style={{
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20,
      height: "var(--footer-h)", padding: "0 var(--gutter-page)",
      borderTop: "1px solid var(--border-hairline)", color: "var(--ink-3)", font: "var(--type-meta)", ...style,
    }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 14 }}>
        <Logo size={15} />
        <span>{tagline}</span>
      </span>
      <span>{org} · {note}</span>
    </footer>
  );
}
