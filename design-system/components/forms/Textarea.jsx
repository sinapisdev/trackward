import React from "react";

export function Textarea({ rows = 3, style, ...rest }) {
  const [focus, setFocus] = React.useState(false);
  return (
    <textarea rows={rows} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
      style={{
        width: "100%", padding: "13px 14px", background: "rgba(255,255,255,.03)",
        borderRadius: "var(--r-md)", border: `1px solid ${focus ? "var(--accent)" : "var(--border-default)"}`,
        color: "var(--ink-0)", font: "var(--type-body)", outline: "none", resize: "vertical",
        boxShadow: focus ? "0 0 0 3px rgba(208,250,60,.14)" : "none", transition: "var(--t-hover)", ...style,
      }} {...rest} />
  );
}
