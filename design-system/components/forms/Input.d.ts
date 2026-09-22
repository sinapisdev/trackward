import type * as React from "react";

/**
 * Text field — also the search field (leading icon + Kbd) and password field (revealable).
 * @startingPoint section="Forms" subtitle="Text, search, password and select fields" viewport="700x150"
 */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Leading adornment, normally <Icon name="search" />. */
  leading?: React.ReactNode;
  /** Trailing adornment, e.g. <Kbd>/</Kbd> or a unit label. */
  trailing?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  invalid?: boolean;
  /** Adds the eye / eye-off reveal toggle used on password fields. */
  revealable?: boolean;
}
export declare function Input(props: InputProps): React.JSX.Element;
