import type * as React from "react";

/**
 * The trilha — TrackWard's signature component. Ordered checkpoints with a lime "Agora" node.
 * @startingPoint section="Status" subtitle="The trilha: checkpoints with a lime Agora node" viewport="700x180"
 */
export interface CheckpointTrailStep {
  label: string;
  /** Second line: "1 de 3 tarefas", "Operações · dia 5", "Aprovado", "Final". */
  meta?: string;
}
export interface CheckpointTrailProps {
  steps?: (string | CheckpointTrailStep)[];
  /** Index of the checkpoint in progress; everything before it renders done. */
  current?: number;
  orientation?: "horizontal" | "vertical";
  /** Marker above/beside the current node. Pass null to hide. Default "Agora". */
  nowLabel?: string | null;
  /** Numbers inside the nodes. Default true. */
  numbered?: boolean;
  /** Prefix labels with "1. ", "2. ". Defaults to `numbered`; set false for panel trails where only the nodes carry numbers. */
  labelIndex?: boolean;
  onSelect?: (index: number) => void;
  /** Node diameter, 28 in headers, 24 in compact panels. */
  size?: number;
  style?: React.CSSProperties;
}
export declare function CheckpointTrail(props: CheckpointTrailProps): React.JSX.Element;
