import type * as React from "react";

/** Left column of Rotinas (areas) and Conversa (channels): grouped, icon + label + count. */
export interface SideRailItem {
  label: string;
  /** Lucide glyph name. */
  icon?: string;
  count?: number;
  /** Node before the label, e.g. a "#" for channels. */
  prefix?: React.ReactNode;
  trailing?: React.ReactNode;
}
export interface SideRailGroup { title?: string; items: (string | SideRailItem)[] }
export interface SideRailProps {
  groups?: SideRailGroup[];
  active?: string;
  onSelect?: (label: string) => void;
  /** Slot above the groups — normally a search Input. */
  header?: React.ReactNode;
  /** Slot below, e.g. "Editar área" + overflow. */
  footer?: React.ReactNode;
  width?: number | string;
  style?: React.CSSProperties;
}
export declare function SideRail(props: SideRailProps): React.JSX.Element;
