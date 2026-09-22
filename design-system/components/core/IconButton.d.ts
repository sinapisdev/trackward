import type * as React from "react";

/** Bare square icon control used across the top bar and row overflow menus. */
export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible label — required, these controls never carry text. */
  label: string;
  /** Renders the pressed/route-active chip background. */
  active?: boolean;
  size?: number;
  shape?: "rounded" | "circle";
  children: React.ReactNode;
}
export declare function IconButton(props: IconButtonProps): React.JSX.Element;
