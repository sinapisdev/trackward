import type * as React from "react";

/** Message input for channels and track conversations. */
export interface ComposerProps {
  placeholder?: string;
  onSend?: (text: string) => void;
  /** Show the @ mention button. Default true. */
  mention?: boolean;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  style?: React.CSSProperties;
}
export declare function Composer(props: ComposerProps): React.JSX.Element;
