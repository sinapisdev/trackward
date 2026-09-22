import React from "react";

export function TextLink({ children, underline = true, tone = "default", style, ...rest }) {
  const [hover, setHover] = React.useState(false);
  return (
    <a
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        color: tone === "muted" ? "var(--ink-2)" : "var(--ink-0)", cursor: "pointer",
        font: "var(--fw-medium) var(--fs-ui)/1.4 var(--font-ui)",
        textDecoration: underline ? "underline" : "none",
        textDecorationColor: hover ? "var(--ink-0)" : "var(--white-20)", textUnderlineOffset: "3px",
        transition: "var(--t-hover)", ...style,
      }}
      {...rest}
    >{children}</a>
  );
}
