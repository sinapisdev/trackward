import type * as React from "react";

/**
 * Named situation label — the product's fixed vocabulary of work states.
 * @startingPoint section="Status" subtitle="Atrasado, Travado, Vence em breve, Em dia" viewport="700x150"
 */
export interface StatusPillProps {
  /** late=Atrasado, soon=Vence em breve, blocked=Travado, onTrack=Em dia, done=Concluída, todo=A fazer, pending=Pendente. */
  status?: "late" | "soon" | "blocked" | "onTrack" | "done" | "todo" | "pending";
  /** Override the label while keeping the icon/colour, e.g. "Aguardando dependência". */
  label?: string;
  /** text = inline in a table cell; chip = capsule next to a page title. */
  variant?: "text" | "chip";
  icon?: string;
  style?: React.CSSProperties;
}
export declare function StatusPill(props: StatusPillProps): React.JSX.Element;
