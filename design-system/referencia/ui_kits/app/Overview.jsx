function Overview({ data, go }) {
  const [folder, setFolder] = React.useState(2);
  const [view, setView] = React.useState("Pastas");
  const focus = data.movement[folder];
  return (
    <SplitContent
      main={<>
        <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 32 }}>
          <div style={{ display: "grid", gap: 10 }}>
            <span style={{ color: "var(--ink-2)", font: "var(--type-body)" }}>Terça-feira, 22 de setembro</span>
            <h1 style={{ font: "var(--type-display)", letterSpacing: "var(--ls-display)", color: "var(--ink-0)" }}>Bom dia, Leonardo.</h1>
            <span style={{ font: "var(--type-body)" }}>
            <span style={{ color: "var(--danger-text)" }}>2 atrasadas</span>
            <span style={{ color: "var(--ink-3)" }}> · </span>
            <span style={{ color: "var(--ink-1)" }}>1 travada</span>
            <span style={{ color: "var(--ink-3)" }}> · </span>
            <span style={{ color: "var(--ink-1)" }}>5 itens aguardam você</span>
            </span>
          </div>
          <Button variant="secondary" iconLeft={<Icon name="plus" size={17} />} onClick={() => go("Criar track")}>Criar</Button>
        </header>

        <SectionHeader
          title="Em movimento"
          controls={<>
            <SegmentedControl options={["Pastas", "Lista"]} value={view} onChange={setView} />
            <Select size="sm" options={["Toda a equipe", "Só eu"]} value="Toda a equipe" onChange={() => {}}
              leading={<Icon name="users" size={17} style={{ color: "var(--ink-2)" }} />} style={{ width: 186 }} />
            <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
              <IconButton label="Anterior" onClick={() => setFolder(Math.max(0, folder - 1))}><Icon name="chevron-left" size={18} /></IconButton>
              <span style={{ color: "var(--ink-2)", font: "var(--type-meta)", minWidth: 44, textAlign: "center" }}>{folder + 1} de 8</span>
              <IconButton label="Próximo" onClick={() => setFolder(Math.min(data.movement.length - 1, folder + 1))}><Icon name="chevron-right" size={18} /></IconButton>
            </span>
          </>} />

        <FolderStack items={data.movement} active={folder} onActiveChange={setFolder}
          render={(it, isActive) => (
            <FolderCard dim={!isActive} kicker={it.kind} title={it.name} width={isActive ? 330 : 250}
              onClick={isActive ? () => go("Projetos") : undefined}
              footer={isActive && it.tasks ? <><span>{it.tasks}</span><AvatarGroup people={it.team} size="sm" /></> : undefined}>
              {it.checkpoint && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 11 }}>
                  <span style={{ width: 18, height: 18, borderRadius: "var(--r-pill)", border: `2px solid ${it.progress ? "var(--accent)" : "var(--ink-4)"}` }} />
                  <span style={{ color: "var(--ink-1)", font: "var(--type-body)" }}>{it.checkpoint}</span>
                </span>
              )}
              {it.progress != null && (
                <div style={{ display: "grid", gap: 2 }}>
                  <span style={{ font: "var(--fw-bold) var(--fs-metric)/1 var(--font-display)", letterSpacing: "var(--ls-metric)", color: "var(--ink-0)" }}>
                    {it.progress}<span style={{ fontSize: 20 }}>%</span>
                  </span>
                  <span style={{ color: "var(--ink-2)", font: "var(--type-meta)" }}>de progresso</span>
                </div>
              )}
              {it.late && <span style={{ display: "inline-flex", alignItems: "center", gap: 9, color: "var(--danger-text)", font: "var(--type-body)" }}><StatusDot tone="danger" />{it.late}</span>}
              {it.due && <span style={{ color: "var(--warn-text)", font: "var(--type-body)" }}>{it.due}</span>}
              {it.meta && !it.progress && !it.late && <span style={{ color: "var(--ink-2)", font: "var(--type-meta)" }}>{it.meta}</span>}
            </FolderCard>
          )} />

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", alignItems: "center", gap: 40, marginTop: -6 }}>
          <CheckpointTrail steps={data.trail.map(s => ({ label: s.label }))} current={1} numbered={false} size={26} style={{ maxWidth: 560 }} />
          <Button size="lg" iconRight={<Icon name="arrow-right" size={18} />} onClick={() => go("Projeto")}>Abrir track</Button>
        </div>

        <Divider inset={2} />

        <SectionHeader title="Aguardando você" count={5} size="h2"
          action={<Button variant="ghost" size="sm" iconRight={<Icon name="arrow-right" size={16} />} onClick={() => go("Meu trabalho")}>Ver tudo</Button>} />
        <div>
          <ListRow chevron leading={<Icon name="file-text" size={19} />} title="Conferir documentos"
            meta={<span style={{ display: "flex", alignItems: "center", gap: 26 }}><span style={{ color: "var(--ink-2)", width: 200 }}>Implantação do ERP</span><span style={{ display: "inline-flex", alignItems: "center", gap: 9, color: "var(--ink-1)" }}><Icon name="clock" size={17} style={{ color: "var(--ink-2)" }} />Hoje</span></span>}
            onClick={() => go("Tarefa")} />
          <ListRow chevron leading={<Icon name="file-text" size={19} />} title="Revisar contrato"
            meta={<span style={{ display: "flex", alignItems: "center", gap: 26 }}><span style={{ color: "var(--ink-2)", width: 200 }}>Financeiro</span><span style={{ display: "inline-flex", alignItems: "center", gap: 9, color: "var(--danger-text)" }}><StatusDot tone="danger" />há 2 dias</span></span>}
            onClick={() => go("Meu trabalho")} />
          <ListRow chevron leading={<Icon name="circle" size={19} />} title="Aprovar fornecedores"
            meta={<span style={{ display: "flex", alignItems: "center", gap: 26 }}><span style={{ color: "var(--ink-2)", width: 200 }}>Nova unidade</span><span style={{ display: "inline-flex", alignItems: "center", gap: 9, color: "var(--ink-1)" }}><Icon name="check-circle-2" size={17} style={{ color: "var(--ink-2)" }} />5 de 5 prontas</span></span>}
            onClick={() => go("Meu trabalho")} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 18, color: "var(--ink-2)", font: "var(--type-meta)" }}>
          <span>Atividade recente</span>
          <Avatar name="Mariana Costa" size="md" />
          <span style={{ color: "var(--ink-1)", font: "var(--type-body)" }}>Mariana concluiu Importar clientes · há 12 min</span>
        </div>
      </>}
      rail={<>
        <Panel variant="plain" title="Radar da operação" actions={<IconButton label="Opções do radar"><Icon name="more-horizontal" size={20} /></IconButton>}>
          <div style={{ display: "grid", gridAutoFlow: "column", gridAutoColumns: "1fr", gap: 18, paddingBottom: 6 }}>
            <MetricStat icon="alert-circle" tone="danger" value={2} label="Atrasadas" />
            <MetricStat icon="lock" value={1} label="Travada" style={{ paddingLeft: 18, borderLeft: "1px solid var(--border-hairline)" }} />
            <MetricStat icon="clock" tone="warn" value={3} label="Vencem em breve" style={{ paddingLeft: 18, borderLeft: "1px solid var(--border-hairline)" }} />
          </div>
        </Panel>
        <Panel variant="plain" padding={0} title={<h3 style={{ font: "var(--type-h3)", letterSpacing: "var(--ls-h3)", color: "var(--ink-0)" }}>Atrasadas (2)</h3>}
          actions={<Button variant="ghost" size="sm">Ver todas</Button>}>
          <div>{data.radar.late.map((r, i) => <RadarRow key={i} tone="danger" title={r.title} area={r.area} when={r.when} whenTone="danger" />)}</div>
        </Panel>
        <Panel variant="plain" padding={0} title={<h3 style={{ font: "var(--type-h3)", letterSpacing: "var(--ls-h3)", color: "var(--ink-0)" }}>Travada (1)</h3>}
          actions={<Button variant="ghost" size="sm">Ver todas</Button>}>
          <div>{data.radar.blocked.map((r, i) => <RadarRow key={i} icon="lock" title={r.title} area={r.area} when={r.when} />)}</div>
        </Panel>
        <Panel variant="plain" padding={0} title={<h3 style={{ font: "var(--type-h3)", letterSpacing: "var(--ls-h3)", color: "var(--ink-0)" }}>Vencem em breve (3)</h3>}
          actions={<Button variant="ghost" size="sm">Ver todas</Button>}>
          <div>{data.radar.soon.map((r, i) => <RadarRow key={i} icon="clock" title={r.title} area={r.area} when={r.when} />)}</div>
        </Panel>
        <Button variant="ghost" size="sm" iconRight={<Icon name="arrow-right" size={16} />} style={{ justifySelf: "start" }} onClick={() => go("Projetos")}>Ver todas as tracks</Button>
      </>} />
  );
}
