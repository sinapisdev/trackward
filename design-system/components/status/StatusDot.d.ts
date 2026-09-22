import type * as React from "react";

/** The 10px situation dot: red = atrasado, amber = vence em breve, grey = em dia, lime = agora. */
export interface StatusDotProps {
  tone?: "danger" | "warn" | "ok" | "neutral" | "idle";
  size?: number;
  /** Soft halo, used on the "today" marker in Agenda. */
  pulse?: boolean;
  style?: React.CSSProperties;
}
export declare function StatusDot(props: StatusDotProps): React.JSX.Element;
