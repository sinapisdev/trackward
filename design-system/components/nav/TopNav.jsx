import React from "react";
import { Icon } from "../core/Icon.jsx";
import { Logo } from "../core/Logo.jsx";
import { Avatar } from "../core/Avatar.jsx";
import { IconButton } from "../core/IconButton.jsx";
import { Badge } from "../core/Badge.jsx";
import { Kbd } from "../core/Kbd.jsx";

export function TopNav({
  items = [], active, onNavigate, org = "Grupo Meridiano", onOrgClick,
  user = { name: "Leonardo Esteves" }, onSearch, searchPlaceholder = "Buscar tracks",
  rightExtra, settingsActive, onTeamClick, onSettingsClick, style,
}) {
  const [hover, setHover] = React.useState(null);
  const [focus, setFocus] = React.useState(false);
  return (
    <header style={{
      display: "flex", alignItems: "center", gap: 18, height: "var(--topbar-h)", padding: "0 20px 0 24px",
      background: "var(--bg-bar)", borderBottom: "1px solid var(--border-hairline)", ...style,
    }}>
      <Logo size={20} />
      <span aria-hidden style={{ width: 1, height: 22, background: "var(--border-default)", flex: "none" }} />
      <button onClick={onOrgClick} style={{
        display: "inline-flex", alignItems: "center", gap: 8, background: "transparent", border: 0,
        color: "var(--ink-1)", font: "var(--fw-medium) var(--fs-ui)/1 var(--font-ui)", cursor: "pointer",
        padding: "8px 10px", borderRadius: "var(--r-md)", whiteSpace: "nowrap",
      }}>
        {org}
        <Icon name="chevron-down" style={{ width: 16, height: 16, strokeWidth: 1.75, color: "var(--ink-2)" }} />
      </button>

      <nav style={{ display: "flex", alignItems: "center", gap: 4, margin: "0 auto", minWidth: 0, overflow: "hidden" }}>
        {items.map((it, i) => {
          const label = typeof it === "string" ? it : it.label;
          const isActive = active === label;
          return (
            <button key={label} onClick={() => onNavigate && onNavigate(label)}
              onMouseEnter={() => setHover(label)} onMouseLeave={() => setHover(null)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 16px",
                borderRadius: "var(--r-md)", border: 0, cursor: "pointer", whiteSpace: "nowrap",
                background: isActive ? "var(--n-800)" : hover === label ? "var(--white-04)" : "transparent",
                color: isActive ? "var(--ink-0)" : "var(--ink-1)",
                font: `${isActive ? "var(--fw-semibold)" : "var(--fw-medium)"} var(--fs-ui)/1 var(--font-ui)`,
                transition: "var(--t-hover)",
              }}>
              {label}
              {typeof it !== "string" && it.count != null && <Badge>{it.count}</Badge>}
            </button>
          );
        })}
      </nav>

      <div style={{ display: "flex", alignItems: "center", gap: 6, flex: "none" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10, width: 226, height: 38, padding: "0 12px 0 14px",
          borderRadius: "var(--r-pill)", background: "var(--white-04)",
          border: `1px solid ${focus ? "var(--accent)" : "var(--border-hairline)"}`, transition: "var(--t-hover)",
        }}>
          <Icon name="search" style={{ width: 17, height: 17, strokeWidth: 1.75, color: "var(--ink-3)", flex: "none" }} />
          <input placeholder={searchPlaceholder} onChange={onSearch} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
            style={{ flex: 1, minWidth: 0, background: "transparent", border: 0, outline: "none", color: "var(--ink-0)", font: "var(--fw-regular) var(--fs-ui)/1 var(--font-ui)" }} />
          <Kbd>/</Kbd>
        </div>
        {rightExtra}
        <IconButton label="Equipe" onClick={onTeamClick}><Icon name="users" style={{ width: 20, height: 20, strokeWidth: 1.75 }} /></IconButton>
        <IconButton label="Ajustes" active={settingsActive} onClick={onSettingsClick}><Icon name="settings" style={{ width: 20, height: 20, strokeWidth: 1.75 }} /></IconButton>
        <Avatar {...user} size={34} style={{ marginLeft: 4 }} />
      </div>
    </header>
  );
}
