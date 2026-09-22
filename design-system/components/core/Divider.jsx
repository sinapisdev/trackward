import React from "react";

export function Divider({ vertical, inset = 0, tone = "hairline", style }) {
  const color = tone === "strong" ? "var(--border-strong)" : "var(--border-hairline)";
  return vertical
    ? <span aria-hidden style={{ width: 1, alignSelf: "stretch", background: color, margin: `${inset}px 0`, flex: "none", ...style }} />
    : <hr style={{ border: 0, height: 1, background: color, margin: `${inset}px 0`, ...style }} />;
}
