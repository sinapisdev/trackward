function Routines({ data, go }) {
  const [area, setArea] = React.useState("Financeiro");
  return (
    <Content>
      <PageHeader title="Rotinas" subtitle="A operação que continua."
        actions={<Button variant="secondary" iconLeft={<Icon name="plus" size={17} />}>Nova área</Button>} />
      <Divider inset={0} />
      <div style={{ display: "grid", gridTemplateColumns: "var(--rail-w) minmax(0,1fr)", gap: 34, alignItems: "start" }}>
        <SideRail active={area} onSelect={setArea}
          header={<Input size="sm" leading={<Icon name="search" size={16} />} placeholder="Buscar área" />}
          groups={[{ items: data.areas }]}
          footer={<div style={{ display: "grid", gap: 4, paddingTop: 16, borderTop: "1px solid var(--border-hairline)" }}>
            <Button variant="ghost" size="sm" iconLeft={<Icon name="pencil" size={17} />} style={{ justifyContent: "flex-start" }}>Editar área</Button>
            <Button variant="ghost" size="sm" style={{ justifyContent: "flex-start" }}>···</Button>
          </div>} />
        <div style={{ display: "grid", gap: 26, minWidth: 0 }}>
          <SectionHeader title={area} subtitle="3 rotinas · 1 atrasada"
            controls={<Select size="sm" options={["Por pessoa", "Por prazo"]} value="Por pessoa" onChange={() => {}} style={{ width: 168 }} />}
            action={<Button variant="secondary" iconLeft={<Icon name="plus" size={17} />}>Nova rotina</Button>} />
          {data.routines.map((r, i) => (
            <div key={r.name} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 420px auto", gap: 30, alignItems: "center", padding: "22px 0", borderTop: i ? "1px solid var(--border-hairline)" : "none" }}>
              <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
                  <Icon name="refresh-cw" size={20} style={{ color: "var(--ink-2)" }} />
                  <span style={{ color: "var(--ink-0)", font: "var(--fw-semibold) var(--fs-h3)/1.1 var(--font-display)", letterSpacing: "var(--ls-h3)" }}>{r.name}</span>
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                  <StatusPill status={r.status} label={r.statusLabel} />
                  <span style={{ color: "var(--ink-2)", font: "var(--type-body)" }}>{r.meta}</span>
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 12, color: "var(--ink-1)", font: "var(--type-body)" }}>
                  <Avatar name={r.who} size="md" />{r.short}
                </span>
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                <CheckpointTrail steps={r.steps} current={r.current} numbered={false} size={30} nowLabel={i === 2 ? "Agora" : "Agora"} />
                <span style={{ textAlign: "center", color: "var(--ink-2)", font: "var(--type-meta)" }}>{r.tasks}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {i === 0
                  ? <><Button iconRight={<Icon name="arrow-right" size={17} />} onClick={() => go("Rotina")}>Abrir rotina</Button>
                      <IconButton label="Mais ações"><Icon name="more-horizontal" size={20} /></IconButton></>
                  : <IconButton label="Abrir rotina" onClick={() => go("Rotina")}><Icon name="chevron-right" size={22} /></IconButton>}
              </div>
            </div>
          ))}
          <Divider inset={6} />
          <div style={{ display: "grid", gap: 8 }}>
            <h3 style={{ font: "var(--type-h3)", letterSpacing: "var(--ls-h3)", color: "var(--ink-0)" }}>Processos disponíveis para {area}</h3>
            <span style={{ color: "var(--ink-2)", font: "var(--type-body)" }}>Use um processo para criar uma nova rotina nesta área.</span>
          </div>
          <div>
            {data.processes.filter(p => p.area === "Financeiro").map(p => (
              <ListRow key={p.name} leading={<Icon name="file-text" size={20} />} title={p.name}
                meta={<span style={{ color: "var(--ink-2)" }}>{p.checkpoints} checkpoints</span>}
                trailing={<Button variant="secondary" size="sm" onClick={() => go("Criar track")}>Usar</Button>} />
            ))}
          </div>
        </div>
      </div>
    </Content>
  );
}
