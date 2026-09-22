function Content({ children, wide, style }) {
  return (
    <div style={{ padding: "26px var(--gutter-page) 40px", maxWidth: wide ? "none" : "var(--content-max)", margin: "0 auto", width: "100%", display: "grid", gap: 26, alignContent: "start", ...style }}>
      {children}
    </div>
  );
}

function SplitContent({ main, rail, railWidth = "var(--panel-w)" }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `minmax(0,1fr) ${railWidth}`, alignItems: "start", minHeight: 0 }}>
      <div style={{ padding: "26px var(--gutter-page) 34px", display: "grid", gap: 24, alignContent: "start", minWidth: 0 }}>{main}</div>
      <div style={{ borderLeft: "1px solid var(--border-hairline)", padding: "26px 30px 34px", display: "grid", gap: 26, alignContent: "start", minWidth: 0 }}>{rail}</div>
    </div>
  );
}

function RadarRow({ tone, icon, title, area, when, whenTone }) {
  return (
    <ListRow
      chevron
      leading={icon ? <Icon name={icon} size={19} /> : <StatusDot tone={tone} />}
      title={title} subtitle={area}
      meta={<span style={{ color: whenTone === "danger" ? "var(--danger-text)" : "var(--ink-1)", font: "var(--type-body)" }}>{when}</span>}
      style={{ padding: "13px 0" }} />
  );
}
