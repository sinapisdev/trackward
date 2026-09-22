import type * as React from "react";

/** Task completion box — 22px, 6px radius, white fill with a dark check when done. */
export interface CheckboxProps {
  checked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label?: string;
  /** Second line under the label, e.g. the task's one-line instruction. */
  sublabel?: string;
  disabled?: boolean;
  size?: number;
  style?: React.CSSProperties;
}
export declare function Checkbox(props: CheckboxProps): React.JSX.Element;
