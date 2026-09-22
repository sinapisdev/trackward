import type * as React from "react";

/** The AI hand-off strip: N proposals are waiting, and the human decides. */
export interface AiBannerProps {
  /** e.g. "3 propostas aguardam revisão". */
  title: string;
  /** What kinds of proposal: "Tarefa, prazo e decisão". */
  subtitle?: string;
  /** Button label, normally "Revisar propostas". */
  action?: string;
  onAction?: () => void;
  /** Extra reassurance line, e.g. "A IA sugere. Você decide." */
  note?: string;
  style?: React.CSSProperties;
}
export declare function AiBanner(props: AiBannerProps): React.JSX.Element;
