import type * as React from "react";

/** A message in a channel: avatar, author, time, optional quoted reply and @mention. */
export interface ChatMessageProps {
  author: string;
  /** Clock time ("09:14") inside a day group. */
  time?: string;
  children?: React.ReactNode;
  /** Quoted message being replied to. */
  quote?: { author: string; text: string };
  /** Name to render as an @mention chip before the text. */
  mention?: string;
  /** Show the hover action cluster (reply / delete / more). Default true. */
  actions?: boolean;
  style?: React.CSSProperties;
}
export declare function ChatMessage(props: ChatMessageProps): React.JSX.Element;
