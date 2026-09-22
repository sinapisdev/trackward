import type * as React from "react";

/** Native-backed dropdown: filters (Situação, Responsável, Área) and form pickers. */
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options?: (string | { value: string; label: string })[];
  /** Leading adornment, e.g. an <Avatar size="xs" /> for a responsável picker. */
  leading?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  placeholder?: string;
}
export declare function Select(props: SelectProps): React.JSX.Element;
