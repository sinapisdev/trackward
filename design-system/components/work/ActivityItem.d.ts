import type * as React from "react";

/** One line of the activity feed: who did what, and when. */
export interface ActivityItemProps {
  /** Person's name (drives the avatar) or "Você". */
  who?: string;
  /** Past-tense verb: "concluiu", "aprovou", "criou". */
  action?: string;
  /** Object of the action: the task or checkpoint name. */
  target?: string;
  /** Relative time: "há 12 min", "ontem". */
  time?: string;
  /** Use a Lucide glyph instead of an avatar (system events). */
  icon?: string;
  style?: React.CSSProperties;
}
export declare function ActivityItem(props: ActivityItemProps): React.JSX.Element;
