import React from "react";

/* Mark geometry copied verbatim from the supplied assets/logo.svg <g id="symbol">:
   two stacked rounded bars + an open lime checkpoint ring. The wordmark is set in the
   product UI face (see tokens/fonts.css), which is how the app chrome renders it. */
export function Logo({ size = 22, wordmark = true, tone = "light", accent, style, ...rest }) {
  const ink = tone === "dark" ? "var(--ink-0)" : tone === "ink" ? "#171717" : "var(--ink-0)";
  const ring = accent || "var(--lime-600)";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: size * 0.52, ...style }} {...rest}>
      <svg width={size * 3.02} height={size} viewBox="24 38 302 100" aria-label="TrackWard" role="img" style={{ display: "block", flex: "none" }}>
        <rect x="24" y="70" width="72" height="36" rx="18" fill={ink} />
        <rect x="116" y="70" width="80" height="36" rx="18" fill={ink} />
        <circle cx="276" cy="88" r="50" fill="none" stroke={ring} strokeWidth="20" />
      </svg>
      {wordmark && (
        <span style={{ font: `var(--fw-bold) ${size * 0.95}px/1 var(--font-display)`, letterSpacing: "-.02em", color: ink, whiteSpace: "nowrap" }}>
          TrackWard
        </span>
      )}
    </span>
  );
}
