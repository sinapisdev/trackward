import React from "react";

/* TrackWard's glyph set is Lucide (24px grid, 1.75 stroke, round caps). No icon binaries
   shipped with the source art, so the set is loaded from the Lucide CDN and rendered as
   React SVG from lucide's icon data — never by DOM-mutating createIcons(), which fights React.
   Page requirement: <script src="https://unpkg.com/lucide@0.454.0/dist/umd/lucide.min.js"></script> */
const pascal = n => String(n).split(/[-_ ]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join("");

export function Icon({ name, size, stroke, color, style = {}, ...rest }) {
  const L = typeof window !== "undefined" ? window.lucide : null;
  const set = L && (L.icons || L);
  const node = set && (set[pascal(name)] || set[name]);
  const box = size ?? style.width ?? 18;
  const sw = stroke ?? style.strokeWidth ?? 1.75;
  const { width, height, strokeWidth, ...restStyle } = style;
  const parts = Array.isArray(node) ? (Array.isArray(node[2]) ? node[2] : node) : [];
  const children = parts.filter(p => Array.isArray(p) && typeof p[0] === "string").map(([tag, attrs], i) =>
    React.createElement(tag, { key: i, ...attrs })
  );
  return (
    <svg width={box} height={box} viewBox="0 0 24 24" fill="none" aria-hidden
      stroke={color ?? restStyle.color ?? "currentColor"} strokeWidth={sw}
      strokeLinecap="round" strokeLinejoin="round"
      style={{ display: "block", flex: "none", ...restStyle }} {...rest}>
      {children}
    </svg>
  );
}
