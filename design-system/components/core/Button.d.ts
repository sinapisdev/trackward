import type * as React from "react";

/**
 * The TrackWard action button: lime pill for the one forward move, outline for
 * everything beside it.
 * @startingPoint section="Core" subtitle="Primary, secondary, quiet, disabled" viewport="700x150"
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** primary = lime "move it forward"; secondary = outline; quiet = dark chip button (Executar / Usar / Liberar); ghost = bare; danger = destructive outline. */
  variant?: "primary" | "secondary" | "quiet" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  /** pill (default, used almost everywhere) or rounded (form-footer buttons e.g. Salvar processo). */
  shape?: "pill" | "rounded";
  iconLeft?: React.ReactNode;
  /** Usually an arrow-right for "this moves you forward" actions. */
  iconRight?: React.ReactNode;
  block?: boolean;
  disabled?: boolean;
  loading?: boolean;
  as?: "button" | "a";
}
export declare function Button(props: ButtonProps): React.JSX.Element;
