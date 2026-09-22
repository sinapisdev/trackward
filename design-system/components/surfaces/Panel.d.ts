import type * as React from "react";

/** Container for the right-hand context column, inline cards and floating detail drawers. */
export interface PanelProps {
  title?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  /** rail = flush context column; card = subtle inline card; drawer = floating detail sheet; plain = no chrome. */
  variant?: "rail" | "card" | "drawer" | "plain";
  padding?: number | string;
  style?: React.CSSProperties;
}
export declare function Panel(props: PanelProps): React.JSX.Element;
