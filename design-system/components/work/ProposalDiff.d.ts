import type * as React from "react";

/** Before → after comparison for a proposed change (deadline, owner, decision). */
export interface ProposalDiffProps {
  fromLabel?: string;
  from?: React.ReactNode;
  toLabel?: string;
  to?: React.ReactNode;
  /** Lucide glyph shown in both boxes. Default "clock". */
  icon?: string;
  style?: React.CSSProperties;
}
export declare function ProposalDiff(props: ProposalDiffProps): React.JSX.Element;
