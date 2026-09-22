import type * as React from "react";

/**
 * TrackWard lockup: checkpoint mark + wordmark.
 * @startingPoint section="Brand" subtitle="Mark and wordmark lockup" viewport="700x150"
 */
export interface LogoProps {
  /** Cap height of the mark in px (wordmark scales from it). Default 22. */
  size?: number;
  /** Show the "TrackWard" wordmark next to the mark. Default true. */
  wordmark?: boolean;
  /** "light" = white ink for dark UI, "ink" = #171717 for light backgrounds. */
  tone?: "light" | "ink";
  /** Override the ring colour (defaults to --lime-600). */
  accent?: string;
  style?: React.CSSProperties;
}
export declare function Logo(props: LogoProps): React.JSX.Element;
