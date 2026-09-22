import React from "react";
import { Icon } from "../core/Icon.jsx";

export function Input({
  leading, trailing, size = "md", invalid, type = "text", revealable, onChange, value, style, ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const [shown, setShown] = React.useState(false);
  const h = size === "sm" ? 36 : size === "lg" ? 52 : 46;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, height: h, padding: "0 14px",
      background: "rgba(255,255,255,.03)", borderRadius: "var(--r-md)",
      border: `1px solid ${invalid ? "var(--danger)" : focus ? "var(--accent)" : "var(--border-default)"}`,
      boxShadow: focus ? "0 0 0 3px rgba(208,250,60,.14)" : "none",
      transition: "var(--t-hover),box-shadow var(--dur-fast) var(--ease-out)", ...style,
    }}>
      {leading && <span style={{ color: "var(--ink-3)", display: "grid", flex: "none" }}>{leading}</span>}
      <input
        type={revealable && shown ? "text" : type} value={value} onChange={onChange}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        style={{
          flex: 1, minWidth: 0, background: "transparent", border: 0, outline: "none",
          color: "var(--ink-0)", font: "var(--type-body)", letterSpacing: type === "password" ? ".18em" : 0,
        }}
        {...rest}
      />
      {revealable && (
        <button type="button" onClick={() => setShown(s => !s)} aria-label={shown ? "Ocultar senha" : "Mostrar senha"}
          style={{ background: "none", border: 0, cursor: "pointer", color: "var(--ink-2)", display: "grid", padding: 0 }}>
          <Icon name={shown ? "eye-off" : "eye"} style={{ width: 18, height: 18, strokeWidth: 1.75 }} />
        </button>
      )}
      {trailing && <span style={{ color: "var(--ink-3)", display: "grid", flex: "none" }}>{trailing}</span>}
    </div>
  );
}
