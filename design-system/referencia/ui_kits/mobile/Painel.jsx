function StatusBar() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px 4px", color: "var(--ink-0)" }}>
      <span style={{ font: "var(--fw-semibold) 17px/1 var(--font-ui)" }}>9:41</span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
        <Icon name="signal" size={17} /><Icon name="wifi" size={17} /><Icon name="battery-full" size={22} />
      </span>
    </div>
  );
}

function Painel({ data, go, tab, setTab }) {
  const [folder, setFolder] = React.useState(1);
  const strip = React.useRef(null);
  React.useEffect(() => {
    const el = strip.current, card = el && el.children[folder];
    if (el && card) el.scrollTo({ left: card.offsetLeft - (el.clientWidth - card.offsetWidth) / 2, behavior: "smooth" });
  }, [folder]);
  const cards = [
    { kind: "Área", name: "Financeiro", late: "1 atrasada" },
    { kind: "Projeto", name: "Implantação do ERP", checkpoint: "Cadastro", progress: 33, tasks: "1 de 3 tarefas prontas", team: ["Leonardo E", "Ana N", "Mariana C"] },
    { kind: "Projeto", name: "Nova unidade", checkpoint: "Viabilidade", due: "Prazo amanhã" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateRows: "auto 1fr auto", height: "100%", minHeight: 0, background: "var(--bg-page)" }}>
      <MobileHeader org={data.org} user={data.user} statusBar={<StatusBar />} />
      <div style={{ overflow: "auto", display: "grid", gap: 22, alignContent: "start", padding: "22px 0 26px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, padding: "0 20px" }}>
          <div style={{ display: "grid", gap: 8 }}>
            <h1 style={{ font: "var(--fw-bold) 34px/1.05 var(--font-display)", letterSpacing: "-.024em", color: "var(--ink-0)" }}>Bom dia, Leonardo.</h1>
            <span style={{ font: "var(--type-body)" }}>
              <span style={{ color: "var(--danger-text)" }}>2 atrasadas</span>
              <span style={{ color: "var(--ink-3)" }}> · </span>
              <span style={{ color: "var(--ink-1)" }}>1 travada</span>
            </span>
          </div>
          <IconButton label="Criar" size={48} style={{ border: "1px solid var(--border-default)", borderRadius: "var(--r-md)", color: "var(--ink-0)" }}><Icon name="plus" size={22} /></IconButton>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "0 20px" }}>
          <h2 style={{ font: "var(--fw-semibold) 24px/1.1 var(--font-display)", letterSpacing: "-.014em", color: "var(--ink-0)" }}>Em movimento</h2>
          <Button variant="ghost" size="sm" iconRight={<Icon name="chevron-right" size={17} />} onClick={() => setTab("Tracks")}>Ver lista</Button>
        </div>

        <div ref={strip} style={{ display: "flex", alignItems: "flex-start", gap: 14, overflowX: "auto", minHeight: 212, padding: "4px 20px 10px", scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}>
          {cards.map((c, i) => (
            <div key={i} style={{ scrollSnapAlign: "center", flex: "none" }}>
              <FolderCard kicker={c.kind} title={c.name} width={i === folder ? 300 : 250} dim={i !== folder} onClick={() => setFolder(i)}
                footer={i === folder && c.tasks ? <><span>{c.tasks}</span><AvatarGroup people={c.team} size="sm" /></> : undefined}>
                {c.checkpoint && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 11 }}>
                    <span style={{ width: 18, height: 18, borderRadius: "var(--r-pill)", border: `2px solid ${i === folder ? "var(--accent)" : "var(--ink-4)"}` }} />
                    <span style={{ color: "var(--ink-1)", font: "var(--type-body)" }}>{c.checkpoint}</span>
                  </span>
                )}
                {c.progress != null && (
                  <div style={{ display: "grid", gap: 2 }}>
                    <span style={{ font: "var(--fw-bold) var(--fs-metric)/1 var(--font-display)", letterSpacing: "var(--ls-metric)", color: "var(--ink-0)" }}>{c.progress}<span style={{ fontSize: 20 }}>%</span></span>
                  </div>
                )}
                {c.late && <span style={{ display: "inline-flex", alignItems: "center", gap: 9, color: "var(--danger-text)", font: "var(--type-body)" }}><StatusDot tone="danger" />{c.late}</span>}
                {c.due && <span style={{ color: "var(--warn-text)", font: "var(--type-body)" }}>{c.due}</span>}
              </FolderCard>
            </div>
          ))}
        </div>

        <CheckpointTrail steps={data.trail.map(s => ({ label: s.label }))} current={1} nowLabel={null} size={28} style={{ padding: "0 14px" }} />

        <div style={{ padding: "0 20px" }}>
          <Button block size="lg" iconRight={<Icon name="arrow-right" size={18} />} onClick={() => setTab("Tracks")}>Abrir track</Button>
        </div>

        <Divider inset={2} />

        <div style={{ display: "grid", gap: 18, padding: "0 20px" }}>
          <h2 style={{ font: "var(--fw-semibold) 24px/1.1 var(--font-display)", letterSpacing: "-.014em", color: "var(--ink-0)" }}>Radar da operação</h2>
          <div style={{ display: "grid", gridAutoFlow: "column", gridAutoColumns: "1fr" }}>
            <MetricStat icon="alert-circle" tone="danger" value={2} label="Atrasadas" />
            <MetricStat icon="lock" value={1} label="Travada" style={{ paddingLeft: 16, borderLeft: "1px solid var(--border-hairline)" }} />
            <MetricStat icon="clock" tone="warn" value={3} label="Vencem em breve" style={{ paddingLeft: 16, borderLeft: "1px solid var(--border-hairline)" }} />
          </div>
          <div>
            <ListRow chevron leading={<StatusDot tone="danger" />} title="Enviar documentos fiscais" subtitle="Financeiro"
              meta={<span style={{ color: "var(--danger-text)", font: "var(--type-body)" }}>há 2 dias</span>} />
            <ListRow chevron leading={<Icon name="lock" size={19} />} title="Aguardar retorno jurídico" subtitle="Nova unidade" meta="Travado" />
          </div>
          <Button variant="ghost" size="sm" iconRight={<Icon name="arrow-right" size={16} />} style={{ justifySelf: "start" }}>Ver radar completo</Button>
        </div>

        <Divider inset={2} />

        <div style={{ display: "grid", gap: 14, padding: "0 20px" }}>
          <SectionHeader size="h3" title="Aguardando você" count={5} />
          <ListRow chevron leading={<Icon name="file-text" size={19} />} title="Conferir documentos" subtitle="Implantação do ERP · Hoje" onClick={() => setTab("Você")} />
        </div>
      </div>
      <MobileTabBar active={tab} onChange={setTab}
        items={[{ label: "Painel", icon: "home" }, { label: "Você", icon: "user", count: 5 }, { label: "Conversa", icon: "message-square" }, { label: "Tracks", icon: "folder" }, { label: "Mais", icon: "more-horizontal" }]} />
    </div>
  );
}

function NotInSource({ tab, setTab }) {
  return (
    <div style={{ display: "grid", gridTemplateRows: "auto 1fr auto", height: "100%", background: "var(--bg-page)" }}>
      <MobileHeader statusBar={<StatusBar />} />
      <div style={{ display: "grid", placeItems: "center", padding: 34, textAlign: "center", gap: 14 }}>
        <Icon name="info" size={26} style={{ color: "var(--ink-3)" }} />
        <span style={{ color: "var(--ink-1)", font: "var(--fw-medium) var(--fs-body-lg)/1.4 var(--font-ui)" }}>“{tab}” no mobile</span>
        <span style={{ color: "var(--ink-3)", font: "var(--type-body)", maxWidth: 300 }}>
          Esta aba não estava no material de origem, por isso não foi recriada. O painel mobile é a única tela de telefone documentada.
        </span>
        <Button variant="secondary" size="sm" onClick={() => setTab("Painel")}>Voltar ao painel</Button>
      </div>
      <MobileTabBar active={tab} onChange={setTab}
        items={[{ label: "Painel", icon: "home" }, { label: "Você", icon: "user", count: 5 }, { label: "Conversa", icon: "message-square" }, { label: "Tracks", icon: "folder" }, { label: "Mais", icon: "more-horizontal" }]} />
    </div>
  );
}
