import type * as React from "react";

/**
 * Mobile bottom navigation — five destinations, 44px minimum targets.
 * @startingPoint section="Navigation" subtitle="Mobile bottom tab bar" viewport="430x92"
 */
export interface MobileTabItem { label: string; icon: string; count?: number }
export interface MobileTabBarProps {
  items?: (string | MobileTabItem)[];
  active?: string;
  onChange?: (label: string) => void;
  /** Adds the iOS home-indicator inset. Default true. */
  safeArea?: boolean;
  style?: React.CSSProperties;
}
export declare function MobileTabBar(props: MobileTabBarProps): React.JSX.Element;
