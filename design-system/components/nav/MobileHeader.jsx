import React from "react";
import { Icon } from "../core/Icon.jsx";
import { Logo } from "../core/Logo.jsx";
import { Avatar } from "../core/Avatar.jsx";

export function MobileHeader({ org = "Grupo Meridiano", user = { name: "Leonardo Esteves" }, onOrgClick, onSearch, statusBar, style }) {
  return (
    <header style={{ background: "var(--bg-bar)", ...style }}>
      {statusBar}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 18px" }}>
        <Logo size={21} />
        <Avatar {...user} size={36} />
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "0 18px 14px", borderBottom: "1px solid var(--border-hairline)" }}>
        <button onClick={onOrgClick} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "transparent", border: 0, color: "var(--ink-1)", font: "var(--fw-medium) var(--fs-body)/1 var(--font-ui)", cursor: "pointer", padding: "8px 0", minHeight: "var(--tap-min)" }}>
          {org}
          <Icon name="chevron-down" style={{ width: 17, height: 17, strokeWidth: 1.75, color: "var(--ink-2)" }} />
        </button>
        <button onClick={onSearch} aria-label="Buscar" style={{ display: "grid", placeItems: "center", width: 44, height: 44, background: "transparent", border: 0, color: "var(--ink-0)", cursor: "pointer" }}>
          <Icon name="search" style={{ width: 22, height: 22, strokeWidth: 1.75 }} />
        </button>
      </div>
    </header>
  );
}
