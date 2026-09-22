import type * as React from "react";

/**
 * Agenda week grid: day columns, an all-day "Prazos" band, and positioned time blocks.
 * @startingPoint section="Agenda" subtitle="Week grid with deadlines band and busy blocks" viewport="1000x420"
 */
export interface WeekGridDay { label: string; date: string | number; today?: boolean }
export interface WeekGridEvent {
  id?: string;
  /** Column index. */
  day: number;
  /** Decimal hours, e.g. 10.5 for 10:30. */
  start: number;
  end: number;
  title: string;
  /** "10:30 – 11:30" */
  time?: string;
  /** event = normal block; busy = hatched external-calendar block with no details. */
  kind?: "event" | "busy";
}
export interface WeekGridDeadline { day: number; title: string; tone?: "warn" | "danger" }
export interface WeekGridProps {
  days?: WeekGridDay[];
  /** Integer hours to render, e.g. [8,9,10,…,16]. */
  hours?: number[];
  deadlines?: WeekGridDeadline[];
  events?: WeekGridEvent[];
  hourHeight?: number;
  onEventClick?: (event: WeekGridEvent) => void;
  activeEvent?: string;
  style?: React.CSSProperties;
}
export interface EventBlockProps {
  title: string;
  time?: string;
  kind?: "event" | "busy";
  top?: number;
  height?: number;
  active?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}
export declare function WeekGrid(props: WeekGridProps): React.JSX.Element;
export declare function EventBlock(props: EventBlockProps): React.JSX.Element;
