import type * as React from "react";

/** 1px hairline rule that separates sections, rows and rail groups. */
export interface DividerProps {
  vertical?: boolean;
  /** Vertical margin (px) around a horizontal rule. */
  inset?: number;
  tone?: "hairline" | "strong";
  style?: React.CSSProperties;
}
export declare function Divider(props: DividerProps): React.JSX.Element;
