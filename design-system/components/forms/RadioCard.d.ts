import type * as React from "react";

/** Bordered choice card: track type (Projeto / Rotina), onboarding path, appearance picker. */
export interface RadioCardProps {
  checked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  /** Optional preview block above the text (the Escuro/Claro/Automático mini screenshots). */
  media?: React.ReactNode;
  radioSide?: "left" | "right";
  name?: string;
  style?: React.CSSProperties;
}
export declare function RadioCard(props: RadioCardProps): React.JSX.Element;
