import type * as React from "react";

/**
 * The application top bar: logo, org switcher, route nav, global search, team/settings, avatar.
 * @startingPoint section="Navigation" subtitle="App top bar with org switcher and search" viewport="1400x66"
 */
export interface TopNavItem { label: string; count?: number }
export interface TopNavProps {
  items?: (string | TopNavItem)[];
  /** Label of the current route. */
  active?: string;
  onNavigate?: (label: string) => void;
  /** Organisation / business name in the switcher. */
  org?: string;
  onOrgClick?: () => void;
  user?: { name?: string; initials?: string; src?: string };
  onSearch?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  searchPlaceholder?: string;
  rightExtra?: React.ReactNode;
  settingsActive?: boolean;
  /** Opens the Equipe screen from the people icon. */
  onTeamClick?: () => void;
  /** Opens Ajustes from the gear icon. */
  onSettingsClick?: () => void;
  style?: React.CSSProperties;
}
export declare function TopNav(props: TopNavProps): React.JSX.Element;
