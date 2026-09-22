import type * as React from "react";

/**
 * A task inside a checkpoint: checkbox (or lock), title + instruction, responsável, prazo, action.
 * @startingPoint section="Work" subtitle="Checkpoint task rows with lime complete action" viewport="700x220"
 */
export interface TaskRowProps {
  title: string;
  /** One-line instruction under the title. */
  description?: string;
  done?: boolean;
  onToggle?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Full name — drives the avatar initials. */
  assignee?: string;
  /** Display label if it differs, e.g. "Você". */
  assigneeLabel?: string;
  due?: React.ReactNode;
  dueTone?: "default" | "warn" | "danger";
  /** Right-hand action, e.g. <Button size="sm">Concluir tarefa</Button>. */
  action?: React.ReactNode;
  /** Shows a lock instead of the checkbox — the task waits on a dependency. */
  blocked?: boolean;
  onOverflow?: () => void;
  style?: React.CSSProperties;
}
export declare function TaskRow(props: TaskRowProps): React.JSX.Element;
