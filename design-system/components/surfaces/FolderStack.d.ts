import type * as React from "react";

/** The "Em movimento" folder carousel: one focused folder, neighbours scaled back. */
export interface FolderStackProps {
  items?: any[];
  /** Index of the focused folder. */
  active?: number;
  onActiveChange?: (index: number) => void;
  /** (item, isActive, index) => ReactNode — normally returns a <FolderCard />. */
  render: (item: any, isActive: boolean, index: number) => React.ReactNode;
  gap?: number;
  style?: React.CSSProperties;
}
export declare function FolderStack(props: FolderStackProps): React.JSX.Element;
