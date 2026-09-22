import React from "react";

export function IconButton({ label, active, size = 36, shape = "rounded", children, style, ...rest }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      aria-label={label} title={label}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: "inline-grid", placeItems: "center", width: size, height: size, flex: "none",
        borderRadius: shape === "circle" ? "var(--r-pill)" : "var(--r-md)",
        background: active ? "var(--n-700)" : hover ? "var(--white-06)" : "transparent",
        color: active || hover ? "var(--ink-0)" : "var(--ink-2)",
        border: "1px solid transparent", cursor: "pointer", transition: "var(--t-hover)", ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
