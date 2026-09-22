import type * as React from "react";

/** Top of every page: optional kicker, 40px title, one-line subtitle, actions on the right. */
export interface PageHeaderProps {
  /** Small uppercase label above the title, e.g. "SUA FILA". */
  kicker?: string;
  title: React.ReactNode;
  /** One sentence that says what the page is for: "A operação que continua." */
  subtitle?: React.ReactNode;
  /** Inline status row under the subtitle (responsável, situação, progresso). */
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function PageHeader(props: PageHeaderProps): React.JSX.Element;
