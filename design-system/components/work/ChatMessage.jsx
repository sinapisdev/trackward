import React from "react";
import { Icon } from "../core/Icon.jsx";
import { Avatar } from "../core/Avatar.jsx";
import { IconButton } from "../core/IconButton.jsx";

export function ChatMessage({ author, time, children, quote, mention, actions = true, style }) {
  const [hover, setHover] = React.useState(false);
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ position: "relative", display: "flex", gap: 16, padding: "12px 0", ...style }}>
      <Avatar name={author} size="lg" />
      <div style={{ display: "grid", gap: 8, flex: 1, minWidth: 0 }}>
        <span style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span style={{ color: "var(--ink-0)", font: "var(--fw-semibold) var(--fs-body)/1.2 var(--font-ui)" }}>{author}</span>
          <span style={{ color: "var(--ink-3)", font: "var(--type-meta)" }}>· {time}</span>
        </span>
        {quote && (
          <div style={{ display: "grid", gap: 4, padding: "12px 16px", background: "var(--n-800)", borderRadius: "var(--r-sm)", borderLeft: "2px solid var(--ink-4)" }}>
            <span style={{ color: "var(--ink-1)", font: "var(--fw-medium) var(--fs-meta)/1.3 var(--font-ui)" }}>{quote.author}</span>
            <span style={{ color: "var(--ink-2)", font: "var(--type-body)" }}>{quote.text}</span>
          </div>
        )}
        <p style={{ color: "var(--ink-1)", font: "var(--fw-regular) var(--fs-body-lg)/1.5 var(--font-ui)", textWrap: "pretty" }}>
          {mention && (
            <span style={{ background: "var(--n-800)", borderRadius: "var(--r-xs)", padding: "2px 6px", color: "var(--ink-0)", marginRight: 4 }}>@{mention}</span>
          )}
          {children}
        </p>
      </div>
      {actions && hover && (
        <div style={{ position: "absolute", right: 0, top: 0, display: "flex", gap: 2, padding: 4, borderRadius: "var(--r-md)", background: "var(--n-850)", border: "1px solid var(--border-hairline)", boxShadow: "var(--sh-pop)" }}>
          <IconButton label="Responder" size={32}><Icon name="reply" style={{ width: 17, height: 17, strokeWidth: 1.75 }} /></IconButton>
          <IconButton label="Excluir" size={32}><Icon name="trash-2" style={{ width: 17, height: 17, strokeWidth: 1.75 }} /></IconButton>
          <IconButton label="Mais" size={32}><Icon name="more-horizontal" style={{ width: 17, height: 17, strokeWidth: 1.75 }} /></IconButton>
        </div>
      )}
    </div>
  );
}
