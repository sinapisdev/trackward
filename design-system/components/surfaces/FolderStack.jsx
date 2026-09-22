import React from "react";

/* "Em movimento": a shallow carousel of folders. The focused folder sits forward with two
   ghost sheets behind it; neighbours shrink and fade so the eye lands on one place to act. */
export function FolderStack({ items = [], active = 0, onActiveChange, render, gap = 26, style }) {
  const i0 = Math.max(0, Math.min(items.length - 1, active));
  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", gap, minHeight: 300, overflow: "hidden", ...style }}>
      {items.map((it, i) => {
        const d = i - i0;
        if (Math.abs(d) > 2) return null;
        const scale = d === 0 ? 1 : Math.abs(d) === 1 ? 0.86 : 0.74;
        const opacity = d === 0 ? 1 : Math.abs(d) === 1 ? 0.55 : 0.25;
        return (
          <div key={i}
            onClick={() => d !== 0 && onActiveChange && onActiveChange(i)}
            style={{
              position: "relative", transform: `scale(${scale}) translateY(${d === 0 ? -6 : 0}px)`,
              opacity, zIndex: 10 - Math.abs(d), cursor: d === 0 ? "default" : "pointer",
              transition: "transform var(--dur-slow) var(--ease-out),opacity var(--dur-slow) var(--ease-out)",
              marginInline: d === 0 ? 10 : 0,
            }}>
            {d === 0 && (
              <>
                <span aria-hidden style={{ position: "absolute", inset: "-14px 14px auto 14px", height: 60, borderRadius: "var(--r-xl)", background: "linear-gradient(180deg,#2E3332,#222625)", opacity: .5, boxShadow: "var(--sh-card)" }} />
                <span aria-hidden style={{ position: "absolute", inset: "-7px 7px auto 7px", height: 60, borderRadius: "var(--r-xl)", background: "linear-gradient(180deg,#333837,#252928)", opacity: .75, boxShadow: "var(--sh-card)" }} />
              </>
            )}
            <div style={{ position: "relative" }}>{render(it, d === 0, i)}</div>
          </div>
        );
      })}
    </div>
  );
}
