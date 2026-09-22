import type * as React from "react";

/** Slash-separated trail above a detail title ("Projetos / Implantação do ERP"). */
export interface BreadcrumbsProps {
  items?: (string | { label: string })[];
  onNavigate?: (label: string, index: number) => void;
  style?: React.CSSProperties;
}
export declare function Breadcrumbs(props: BreadcrumbsProps): React.JSX.Element;
