import type * as React from "react";

/** Mobile top chrome: lockup + avatar, then org switcher + search. */
export interface MobileHeaderProps {
  org?: string;
  user?: { name?: string; initials?: string; src?: string };
  onOrgClick?: () => void;
  onSearch?: () => void;
  /** Optional simulated status bar row (used in the UI kit mockups). */
  statusBar?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function MobileHeader(props: MobileHeaderProps): React.JSX.Element;
