import type * as React from "react";

/** Two-or-three-way display switch: Pastas / Lista, Semana / Mês. */
export interface SegmentedControlProps {
  options?: (string | { label: string })[];
  value?: string;
  onChange?: (label: string) => void;
  size?: "sm" | "md";
  style?: React.CSSProperties;
}
export declare function SegmentedControl(props: SegmentedControlProps): React.JSX.Element;
