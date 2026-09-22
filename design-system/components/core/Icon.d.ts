import type * as React from "react";

/**
 * Lucide glyph wrapper — the single icon entry point for the whole system.
 * Requires the Lucide CDN script on the page:
 * <script src="https://unpkg.com/lucide@0.454.0/dist/umd/lucide.min.js"></script>
 */
export interface IconProps {
  /** Lucide icon name, kebab-case: "arrow-right", "lock", "clock", "refresh-cw", "sparkles". */
  name: string;
  /** Box size in px. 18 in rows, 16 in meta, 20 in the top bar, 24 in stat blocks. */
  size?: number;
  /** Stroke width. 1.75 is the product default. */
  stroke?: number;
  color?: string;
  style?: React.CSSProperties;
}
export declare function Icon(props: IconProps): React.JSX.Element;
