import React from "react";

export function ProgressRing({ value = 0, size = 44, stroke = 5, tone = "ink", style }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block", flex: "none", ...style }} aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--n-700)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={tone === "accent" ? "var(--accent)" : "var(--ink-1)"} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={`${(c * Math.max(0, Math.min(100, value))) / 100} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dasharray var(--dur-slow) var(--ease-out)" }} />
    </svg>
  );
}
