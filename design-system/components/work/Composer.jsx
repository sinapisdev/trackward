import React from "react";
import { Icon } from "../core/Icon.jsx";

export function Composer({ placeholder = "Escreva uma mensagem...", onSend, mention = true, value, onChange, style }) {
  const [focus, setFocus] = React.useState(false);
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, padding: "0 14px 0 20px", minHeight: 56,
      borderRadius: "var(--r-lg)", background: "var(--white-04)",
      border: `1px solid ${focus ? "var(--accent)" : "var(--border-default)"}`, transition: "var(--t-hover)", ...style,
    }}>
      <input value={value} onChange={onChange} placeholder={placeholder}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        onKeyDown={e => { if (e.key === "Enter" && onSend) onSend(e.currentTarget.value); }}
        style={{ flex: 1, minWidth: 0, background: "transparent", border: 0, outline: "none", color: "var(--ink-0)", font: "var(--fw-regular) var(--fs-body-lg)/1.4 var(--font-ui)" }} />
      {mention && (
        <button aria-label="Mencionar alguém" style={{ display: "grid", placeItems: "center", width: 40, height: 40, background: "transparent", border: 0, borderRadius: "var(--r-md)", color: "var(--ink-2)", cursor: "pointer" }}>
          <Icon name="at-sign" style={{ width: 20, height: 20, strokeWidth: 1.75 }} />
        </button>
      )}
      <button aria-label="Enviar" onClick={() => onSend && onSend(value)}
        style={{ display: "grid", placeItems: "center", width: 40, height: 40, background: "transparent", border: 0, borderRadius: "var(--r-md)", color: "var(--ink-1)", cursor: "pointer" }}>
        <Icon name="send" style={{ width: 20, height: 20, strokeWidth: 1.75 }} />
      </button>
    </div>
  );
}
