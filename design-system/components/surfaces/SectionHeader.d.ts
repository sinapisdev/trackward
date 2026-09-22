import type * as React from "react";

/** Section title with optional count, inline controls and a trailing "Ver tudo →". */
export interface SectionHeaderProps {
  title: React.ReactNode;
  count?: number | string;
  subtitle?: React.ReactNode;
  /** Trailing affordance, normally a ghost "Ver tudo →" button. */
  action?: React.ReactNode;
  /** Controls that belong to the section: SegmentedControl, Select, pager. */
  controls?: React.ReactNode;
  size?: "h2" | "h3";
  style?: React.CSSProperties;
}
export declare function SectionHeader(props: SectionHeaderProps): React.JSX.Element;
