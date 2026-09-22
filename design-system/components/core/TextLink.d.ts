import type * as React from "react";

/** Inline text link — underlined, ink-coloured, never blue. */
export interface TextLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  underline?: boolean;
  tone?: "default" | "muted";
  children: React.ReactNode;
}
export declare function TextLink(props: TextLinkProps): React.JSX.Element;
