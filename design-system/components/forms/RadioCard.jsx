import React from "react";

export function RadioCard({ checked, onChange, title, description, icon, media, radioSide = "right", name, style }) {
  const [hover, setHover] = React.useState(false);
  return (
    <label
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: "grid", gap: 14, padding: media ? "14px" : "18px 20px", cursor: "pointer",
        borderRadius: "var(--r-lg)", background: checked ? "var(--white-04)" : hover ? "var(--white-04)" : "transparent",
        border: `1px solid ${checked ? "var(--ink-0)" : "var(--border-hairline)"}`,
        transition: "var(--t-hover)", ...style,
      }}>
      <input type="radio" name={name} checked={!!checked} onChange={onChange} style={{ position: "absolute", opacity: 0, width: 0, height: 0 }} />
      {media}
      <span style={{ display: "flex", alignItems: media ? "center" : "flex-start", gap: 14, flexDirection: radioSide === "left" ? "row" : "row" }}>
        {radioSide === "left" && <Dot checked={checked} />}
        {icon && <span style={{ color: "var(--ink-1)", display: "grid", flex: "none", marginTop: 1 }}>{icon}</span>}
        <span style={{ display: "grid", gap: 4, flex: 1, minWidth: 0 }}>
          <span style={{ color: "var(--ink-0)", font: "var(--fw-semibold) var(--fs-body-lg)/1.25 var(--font-ui)" }}>{title}</span>
          {description && <span style={{ color: "var(--ink-2)", font: "var(--type-meta)" }}>{description}</span>}
        </span>
        {radioSide === "right" && <Dot checked={checked} />}
      </span>
    </label>
  );
}

function Dot({ checked }) {
  return (
    <span aria-hidden style={{
      width: 20, height: 20, flex: "none", borderRadius: "var(--r-pill)", display: "grid", placeItems: "center",
      border: `1.5px solid ${checked ? "var(--ink-0)" : "var(--ink-4)"}`, marginTop: 2,
    }}>{checked && <span style={{ width: 10, height: 10, borderRadius: "var(--r-pill)", background: "var(--ink-0)" }} />}</span>
  );
}
