import type * as React from "react";

/** Donut progress that sits left of the big "NN%" figure on folder cards. */
export interface ProgressRingProps {
  value?: number;
  size?: number;
  stroke?: number;
  tone?: "ink" | "accent";
  style?: React.CSSProperties;
}
export declare function ProgressRing(props: ProgressRingProps): React.JSX.Element;
