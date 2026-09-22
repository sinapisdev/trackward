import type * as React from "react";

/** In-page tabs: pill for view switches (Trilha / Conversa / Atividade), underline for list scopes. */
export interface TabItem { label: string; count?: number }
export interface TabsProps {
  items?: (string | TabItem)[];
  active?: string;
  onChange?: (label: string) => void;
  variant?: "pill" | "underline";
  style?: React.CSSProperties;
}
export declare function Tabs(props: TabsProps): React.JSX.Element;
