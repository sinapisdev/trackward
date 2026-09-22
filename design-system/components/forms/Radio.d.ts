import type * as React from "react";

/** Single-choice control: visibility ("Toda a equipe / Pessoas escolhidas / Só eu"), AI mode. */
export interface RadioProps {
  checked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label?: string;
  sublabel?: string;
  name?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
}
export declare function Radio(props: RadioProps): React.JSX.Element;
