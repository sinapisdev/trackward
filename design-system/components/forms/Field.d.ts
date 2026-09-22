import type * as React from "react";

/** Label + control + hint wrapper. Stacked on auth/forms, row-labelled in the process editor. */
export interface FieldProps {
  label?: string;
  hint?: string;
  /** Appends the literal "(opcional)" the product uses next to optional labels. */
  optional?: boolean;
  error?: string;
  layout?: "stack" | "row";
  htmlFor?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function Field(props: FieldProps): React.JSX.Element;
