import type * as React from "react";

/** Generic hairline row: queue items, radar entries, process lists, mobile lists. */
export interface ListRowProps {
  /** Icon, checkbox, StatusDot or avatar at the start of the row. */
  leading?: React.ReactNode;
  title: React.ReactNode;
  /** Context line: "Implantação do ERP / Cadastro", "Financeiro". */
  subtitle?: React.ReactNode;
  /** Right-aligned value before the chevron: a deadline, a count, a StatusPill. */
  meta?: React.ReactNode;
  trailing?: React.ReactNode;
  chevron?: boolean;
  active?: boolean;
  /** danger paints the title red for overdue items. */
  tone?: "default" | "danger";
  onClick?: () => void;
  style?: React.CSSProperties;
}
export declare function ListRow(props: ListRowProps): React.JSX.Element;
