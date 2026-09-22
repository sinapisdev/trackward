import React from "react";

/* The folder — how TrackWard draws a container of work (project, area, routine, process).
   Glass body with a folder tab, deep drop shadow, 1px inner light. */
export function FolderCard({
  kicker, title, children, footer, width = 330, tone = "default",
  dim, elevated = true, onClick, style,
}) {
  const [hover, setHover] = React.useState(false);
  const muted = tone === "muted" || dim;
  return (
    <div
      onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        position: "relative", width, flex: "none", paddingTop: 22, cursor: onClick ? "pointer" : "default",
        filter: muted ? "saturate(.6)" : "none", opacity: muted ? .62 : 1,
        transform: hover && onClick ? "translateY(-3px)" : "none",
        transition: "transform var(--dur-base) var(--ease-out),opacity var(--dur-base) var(--ease-out)", ...style,
      }}>
      {/* folder tab */}
      <div aria-hidden style={{
        position: "absolute", top: 0, left: 0, width: "54%", height: 24,
        background: "linear-gradient(180deg,#313635 0%,#262A29 100%)",
        borderRadius: "var(--r-lg) 20px 0 0",
        clipPath: "polygon(0 0,84% 0,100% 100%,0 100%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,.1)",
      }} />
      <div style={{
        position: "relative", background: "var(--surface-card)", backdropFilter: "var(--blur-glass)",
        borderRadius: "0 var(--r-xl) var(--r-xl) var(--r-xl)",
        boxShadow: elevated ? "var(--sh-folder)" : "0 0 0 1px rgba(255,255,255,.07) inset",
        padding: "20px 22px 18px", display: "grid", gap: 14, minHeight: 168,
      }}>
        {kicker && <span style={{ font: "var(--type-kicker)", letterSpacing: "var(--ls-kicker)", textTransform: "uppercase", color: "var(--ink-2)" }}>{kicker}</span>}
        {title && <h3 style={{ font: "var(--fw-semibold) var(--fs-card)/var(--lh-card) var(--font-display)", letterSpacing: "var(--ls-card)", color: "var(--ink-0)" }}>{title}</h3>}
        {children}
        {footer && (
          <>
            <span aria-hidden style={{ height: 1, background: "var(--border-hairline)" }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, color: "var(--ink-2)", font: "var(--type-meta)" }}>{footer}</div>
          </>
        )}
      </div>
    </div>
  );
}
