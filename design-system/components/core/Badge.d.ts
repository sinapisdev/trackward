import type * as React from "react";

/** Small count pill that rides beside nav items, tabs and section titles. */
export interface BadgeProps {
  children: React.ReactNode;
  tone?: "neutral" | "accent" | "danger" | "outline";
  style?: React.CSSProperties;
}
export declare function Badge(props: BadgeProps): React.JSX.Element;
