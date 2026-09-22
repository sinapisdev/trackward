import React from "react";

/* Agenda week view: all-day "Prazos" band + hour grid with positioned blocks. */
export function WeekGrid({
  days = [], hours = [8, 9, 10, 11, 12, 13, 14, 15, 16], deadlines = [], events = [],
  hourHeight = 62, onEventClick, activeEvent, style,
}) {
  const start = hours[0];
  const top = (h) => (h - start) * hourHeight;
  return (
    <div style={{ display: "grid", gridTemplateColumns: `72px repeat(${days.length},minmax(0,1fr))`, border: "1px solid var(--border-hairline)", borderRadius: 2, ...style }}>
      <span style={{ borderBottom: "1px solid var(--border-hairline)", borderRight: "1px solid var(--border-hairline)" }} />
      {days.map((d, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px 0", borderBottom: "1px solid var(--border-hairline)", borderRight: i < days.length - 1 ? "1px solid var(--border-hairline)" : "none", color: d.today ? "var(--ink-0)" : "var(--ink-1)", font: "var(--fw-medium) var(--fs-body)/1 var(--font-ui)" }}>
          <span>{d.label}</span><span style={{ color: d.today ? "var(--ink-0)" : "var(--ink-2)" }}>{d.date}</span>
          {d.today && <span style={{ width: 7, height: 7, borderRadius: "var(--r-pill)", background: "var(--accent)" }} />}
        </div>
      ))}

      <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border-hairline)", borderRight: "1px solid var(--border-hairline)", color: "var(--ink-2)", font: "var(--type-meta)" }}>Prazos</div>
      {days.map((d, i) => (
        <div key={i} style={{ padding: 8, borderBottom: "1px solid var(--border-hairline)", borderRight: i < days.length - 1 ? "1px solid var(--border-hairline)" : "none", minHeight: 52 }}>
          {deadlines.filter(x => x.day === i).map((x, j) => (
            <div key={j} style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 12px", borderRadius: "var(--r-sm)", background: "var(--n-850)", border: "1px solid var(--border-hairline)", color: "var(--ink-1)", font: "var(--type-meta)" }}>
              <span style={{ width: 9, height: 9, borderRadius: "var(--r-pill)", background: x.tone === "danger" ? "var(--danger)" : "var(--warn)", flex: "none" }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.title}</span>
            </div>
          ))}
        </div>
      ))}

      <div style={{ borderRight: "1px solid var(--border-hairline)" }}>
        {hours.map(h => (
          <div key={h} style={{ height: hourHeight, paddingRight: 14, textAlign: "right", color: "var(--ink-3)", font: "var(--type-micro,var(--type-meta))", transform: "translateY(-7px)" }}>
            {String(h).padStart(2, "0")}:00
          </div>
        ))}
      </div>
      {days.map((d, i) => (
        <div key={i} style={{ position: "relative", borderRight: i < days.length - 1 ? "1px solid var(--border-hairline)" : "none" }}>
          {hours.map((h, hi) => (
            <div key={h} style={{ height: hourHeight, borderTop: hi ? "1px solid var(--border-hairline)" : "none" }} />
          ))}
          {events.filter(e => e.day === i).map((e, j) => (
            <EventBlock key={j} {...e} top={top(e.start)} height={(e.end - e.start) * hourHeight - 6}
              active={activeEvent === e.id} onClick={onEventClick && (() => onEventClick(e))} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function EventBlock({ title, time, kind = "event", top, height, active, onClick, style }) {
  const busy = kind === "busy";
  return (
    <div onClick={onClick} style={{
      position: top != null ? "absolute" : "relative", top, left: 4, right: 4, height,
      padding: "10px 12px", borderRadius: "var(--r-sm)", cursor: onClick ? "pointer" : "default",
      background: busy
        ? "repeating-linear-gradient(135deg,rgba(255,255,255,.05) 0 6px,transparent 6px 12px),var(--n-850)"
        : active ? "var(--n-800)" : "var(--n-850)",
      border: "1px solid var(--border-hairline)",
      borderTop: active ? "2px solid var(--accent)" : "1px solid var(--border-hairline)",
      display: "grid", gap: 4, alignContent: "start", overflow: "hidden",
      transition: "var(--t-hover)", ...style,
    }}>
      <span style={{ color: busy ? "var(--ink-2)" : "var(--ink-0)", font: "var(--fw-medium) var(--fs-meta)/1.25 var(--font-ui)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</span>
      {time && <span style={{ color: "var(--ink-3)", font: "var(--type-micro,var(--type-meta))" }}>{time}</span>}
    </div>
  );
}
