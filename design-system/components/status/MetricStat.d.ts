import type * as React from "react";

/** One figure of the "Radar da operação" trio: icon + count + word. */
export interface MetricStatProps {
  /** Lucide name: alert-circle, lock, clock. */
  icon?: string;
  value?: React.ReactNode;
  label?: string;
  tone?: "neutral" | "danger" | "warn";
  style?: React.CSSProperties;
}
export declare function MetricStat(props: MetricStatProps): React.JSX.Element;
