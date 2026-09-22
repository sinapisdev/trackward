import type * as React from "react";

/**
 * Initials avatar (and the overlapping group) used for responsáveis, participants and activity.
 * @startingPoint section="Core" subtitle="Initials avatars and stacked groups" viewport="700x150"
 */
export interface AvatarProps {
  /** Full name — initials are derived from it and it becomes the tooltip. */
  name?: string;
  /** Override the derived initials (always 2 letters in the product art). */
  initials?: string;
  src?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | number;
  /** Ring colour, e.g. "var(--bg-page)" when stacked on a card. */
  ring?: string;
  style?: React.CSSProperties;
}
export interface AvatarGroupProps {
  /** Names, or Avatar prop objects. */
  people?: (string | AvatarProps)[];
  size?: AvatarProps["size"];
  /** How many faces before the "+N" tail. Default 3. */
  max?: number;
  style?: React.CSSProperties;
}
export declare function Avatar(props: AvatarProps): React.JSX.Element;
export declare function AvatarGroup(props: AvatarGroupProps): React.JSX.Element;
