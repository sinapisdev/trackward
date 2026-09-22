import type * as React from "react";

/** Icon + "Label: value" line used down the context panels ("Prazo: Hoje"). */
export interface InfoRowProps {
  /** Lucide name: calendar, user, target, list, users. */
  icon?: string;
  label?: string;
  value?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function InfoRow(props: InfoRowProps): React.JSX.Element;
