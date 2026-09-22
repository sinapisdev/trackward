import type * as React from "react";

/**
 * Glass folder card — the way TrackWard represents a container of work.
 * @startingPoint section="Surfaces" subtitle="Glass folder card for projects, areas and routines" viewport="700x250"
 */
export interface FolderCardProps {
  /** Uppercase type label: PROJETO, ÁREA, ROTINA, PROCESSO. */
  kicker?: string;
  title?: string;
  children?: React.ReactNode;
  /** Bottom row after a hairline: counts, avatars, "1 de 3 tarefas prontas". */
  footer?: React.ReactNode;
  width?: number | string;
  tone?: "default" | "muted";
  /** Push the card back (used for the neighbours in a FolderStack). */
  dim?: boolean;
  elevated?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}
export declare function FolderCard(props: FolderCardProps): React.JSX.Element;
