function Agenda({ data, go }) {
  const [view, setView] = React.useState("Semana");
  const [sel, setSel] = React.useState("impl");
  const [busy, setBusy] = React.useState(true);
  const [visible, setVisible] = React.useState(false);
  return (
    <div style={{ display: "grid", gridTemplateColumns: sel ? "minmax(0,1fr) 420px" : "minmax(0,1fr)", alignItems: "start" }}>
      <div style={{ padding: "26px var(--gutter-page) 34px", display: "grid", gap: 22, minWidth: 0 }}>
        <PageHeader title="Agenda" subtitle="Compromissos e prazos no mesmo lugar."
          actions={<Button variant="secondary" iconLeft={<Icon name="plus" size={17} />}>Compromisso</Button>} />
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <IconButton label="Semana anterior" size={40} style={{ border: "1px solid var(--border-default)", borderRadius: "var(--r-md)" }}><Icon name="chevron-left" size={19} /></IconButton>
          <IconButton label="Próxima semana" size={40} style={{ border: "1px solid var(--border-default)", borderRadius: "var(--r-md)" }}><Icon name="chevron-right" size={19} /></IconButton>
          <Button variant="secondary" size="sm">Hoje</Button>
          <span style={{ color: "var(--ink-1)", font: "var(--fw-medium) var(--fs-body-lg)/1.2 var(--font-ui)", marginLeft: 10 }}>21 a 25 de setembro de 2026</span>
          <span style={{ marginLeft: "auto", display: "inline-flex", gap: 12 }}>
            <SegmentedControl options={["Semana", "Mês"]} value={view} onChange={setView} />
            <Select size="sm" options={["Dias úteis", "Semana inteira"]} value="Dias úteis" onChange={() => {}} style={{ width: 170 }} />
          </span>
        </div>
        <WeekGrid {...data.agenda} hours={[8, 9, 10, 11, 12, 13, 14, 15, 16]} activeEvent={sel}
          onEventClick={e => setSel(e.id || e.title)} />
      </div>
      {sel && (
        <div style={{ borderLeft: "1px solid var(--border-hairline)", padding: "26px 28px", display: "grid", gap: 20, alignContent: "start" }}>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <IconButton label="Fechar" onClick={() => setSel(null)}><Icon name="x" size={20} /></IconButton>
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            <h2 style={{ font: "var(--type-h2)", letterSpacing: "var(--ls-h2)", color: "var(--ink-0)", fontSize: 30 }}>Reunião de implantação</h2>
            <span style={{ color: "var(--ink-2)", font: "var(--type-body)" }}>Hoje · 10:30 às 11:30</span>
          </div>
          <InfoRow icon="folder" value="Implantação do ERP" />
          <InfoRow icon="user" value="Você" />
          <Divider inset={2} />
          <Switch checked={busy} onChange={() => setBusy(!busy)} label="Ocupa minha agenda" style={{ justifyContent: "space-between", width: "100%", flexDirection: "row-reverse" }} />
          <Switch checked={visible} onChange={() => setVisible(!visible)} label="Outros veem o título" style={{ justifyContent: "space-between", width: "100%", flexDirection: "row-reverse" }} />
          <span style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--ink-3)", font: "var(--type-meta)" }}>
            Para outras pessoas, aparece apenas <em style={{ color: "var(--ink-2)" }}>Ocupado</em>.
            <Icon name="lock" size={17} style={{ marginLeft: "auto" }} />
          </span>
          <Divider inset={2} />
          <span style={{ color: "var(--ink-1)", font: "var(--type-body)" }}>Alinhar os dados para a próxima etapa.</span>
          <Button variant="secondary" block>Editar compromisso</Button>
          <Button variant="ghost" block iconRight={<Icon name="arrow-right" size={17} />} onClick={() => go("Projeto")}>Abrir track</Button>
          <span style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--ink-3)", font: "var(--type-meta)" }}>
            <Icon name="calendar" size={18} />Agenda externa conectada · Somente livre ou ocupado.
          </span>
        </div>
      )}
    </div>
  );
}
