import type * as React from "react";

/** Quiet page footer: lockup + "move work forward." on the left, org + note on the right. */
export interface AppFooterProps {
  org?: string;
  note?: string;
  tagline?: string;
  style?: React.CSSProperties;
}
export declare function AppFooter(props: AppFooterProps): React.JSX.Element;
