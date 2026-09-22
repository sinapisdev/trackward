import React from "react";

const TONES = { danger: "var(--danger)", warn: "var(--warn)", ok: "var(--accent)", neutral: "var(--neutral-status)", idle: "var(--ink-4)" };

export function StatusDot({ tone = "neutral", size = 10, pulse, style }) {
  return (
    <span aria-hidden style={{
      width: size, height: size, flex: "none", borderRadius: "var(--r-pill)", background: TONES[tone],
      boxShadow: pulse ? `0 0 0 4px ${tone === "danger" ? "rgba(255,75,75,.18)" : "rgba(208,250,60,.18)"}` : "none",
      display: "inline-block", ...style,
    }} />
  );
}
