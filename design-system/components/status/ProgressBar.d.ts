import type * as React from "react";

/** Thin linear progress used in tables, the project header and folder cards. */
export interface ProgressBarProps {
  /** 0–100. */
  value?: number;
  height?: number;
  width?: number | string;
  /** ink (default, light grey fill) or accent (lime — reserve for "this is yours to move"). */
  tone?: "ink" | "accent";
  /** Show the "NN%" figure before the bar. */
  label?: boolean;
  style?: React.CSSProperties;
}
export declare function ProgressBar(props: ProgressBarProps): React.JSX.Element;
