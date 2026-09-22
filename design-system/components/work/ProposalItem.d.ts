import type * as React from "react";

/** One AI proposal in the review queue: type, what it changes, and its review state. */
export interface ProposalItemProps {
  /** Proposal type label: "Tarefa", "Prazo", "Decisão". */
  kind?: string;
  title: string;
  /** Change summary: "Amanhã → em 3 dias", "Mariana · Amanhã". */
  meta?: React.ReactNode;
  status?: "pending" | "done" | "late";
  selected?: boolean;
  onClick?: () => void;
  /** Override the Lucide glyph derived from kind. */
  icon?: string;
  style?: React.CSSProperties;
}
export declare function ProposalItem(props: ProposalItemProps): React.JSX.Element;
