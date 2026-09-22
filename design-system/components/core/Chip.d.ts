import type * as React from "react";

/** Filter chip with an optional count — the "Tudo / Executar / Aprovar / Aguardando" row. */
export interface ChipProps {
  children: React.ReactNode;
  count?: number | string;
  selected?: boolean;
  icon?: React.ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
}
export declare function Chip(props: ChipProps): React.JSX.Element;
