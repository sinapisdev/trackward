import type * as React from "react";

/**
 * Borderless list table: hairline row rules, 58px rows, hover tint, no zebra, no outer box.
 * @startingPoint section="Surfaces" subtitle="Hairline data table with status and progress" viewport="700x300"
 */
export interface DataTableColumn {
  key: string;
  label?: React.ReactNode;
  /** Any grid track value; defaults to minmax(0,1fr). */
  width?: string;
  align?: "left" | "right";
  sortable?: boolean;
  sorted?: "asc" | "desc";
}
export interface DataTableProps {
  columns?: DataTableColumn[];
  /** Cell values may be nodes or (row, index) => node. */
  rows?: Record<string, any>[];
  activeRow?: number;
  onRowClick?: (index: number) => void;
  /** Left/right footer pair, e.g. "5 de 6 em andamento" and "Ver mais →". */
  footer?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function DataTable(props: DataTableProps): React.JSX.Element;
