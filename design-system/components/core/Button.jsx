import React from "react";

const PAD = { sm: "7px 14px", md: "11px 20px", lg: "14px 26px" };
const FS = { sm: "13px", md: "var(--fs-ui)", lg: "15px" };

export function Button({
  variant = "primary", size = "md", shape = "pill", iconLeft, iconRight,
  block, disabled, loading, as = "button", children, style, ...rest
}) {
  const base = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "10px",
    font: `var(--fw-semibold) ${FS[size]}/1.1 var(--font-ui)`, letterSpacing: "-.005em",
    padding: PAD[size], minHeight: size === "sm" ? "32px" : size === "md" ? "40px" : "48px",
    borderRadius: shape === "pill" ? "var(--r-pill)" : "var(--r-md)",
    border: "1px solid transparent", cursor: disabled ? "not-allowed" : "pointer",
    width: block ? "100%" : undefined, transition: "var(--t-hover)", whiteSpace: "nowrap",
    textDecoration: "none", WebkitTapHighlightColor: "transparent",
  };
  const skins = {
    primary: { background: "var(--accent)", color: "var(--accent-ink)", boxShadow: "0 10px 30px -18px var(--lime-glow)" },
    secondary: { background: "transparent", color: "var(--ink-0)", borderColor: "var(--border-default)" },
    quiet: { background: "var(--bg-chip)", color: "var(--ink-1)", borderColor: "var(--border-hairline)" },
    ghost: { background: "transparent", color: "var(--ink-1)" },
    danger: { background: "transparent", color: "var(--danger-text)", borderColor: "rgba(255,75,75,.4)" },
  };
  const off = disabled ? { background: "var(--n-850)", color: "var(--ink-3)", borderColor: "var(--border-hairline)", boxShadow: "none", opacity: 1 } : null;
  const El = as;
  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);
  const hoverSkin = !disabled && hover ? {
    primary: { background: "var(--accent-hover)" },
    secondary: { background: "var(--white-06)", borderColor: "var(--border-strong)" },
    quiet: { background: "var(--n-800)", color: "var(--ink-0)" },
    ghost: { background: "var(--white-06)", color: "var(--ink-0)" },
    danger: { background: "rgba(255,75,75,.1)" },
  }[variant] : null;
  return (
    <El
      disabled={as === "button" ? disabled : undefined}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => { setHover(false); setPress(false); }}
      onMouseDown={() => setPress(true)} onMouseUp={() => setPress(false)}
      style={{ ...base, ...skins[variant], ...hoverSkin, ...off,
        transform: press && !disabled ? "scale(.985)" : "none", ...style }}
      {...rest}
    >
      {iconLeft}
      <span>{loading ? "…" : children}</span>
      {iconRight}
    </El>
  );
}
