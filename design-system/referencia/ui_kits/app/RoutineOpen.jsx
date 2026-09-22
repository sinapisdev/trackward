function RoutineOpen({ data, go }) {
  const steps = [{ label: "Coleta" }, { label: "Conciliação" }, { label: "Aprovação" }];
  const tasks = [
    { title: "Conferir demonstrativos", who: "Mariana Costa", short: "Mariana" },
    { title: "Validar lançamentos", who: "Ana Nunes", short: "Ana" },
    { title: "Revisar fechamento", who: "Leonardo Esteves", short: "Você" },
  ];
  return (
    <SplitContent railWidth="380px"
      main={<>
        <Breadcrumbs items={["Rotinas", "Financeiro", "Fechamento mensal"]} onNavigate={l => l === "Rotinas" && go("Rotinas")} />
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 28, flexWrap: "wrap" }}>
          <div style={{ display: "grid", gap: 14 }}>
            <h1 style={{ font: "var(--type-title)", letterSpacing: "var(--ls-title)", color: "var(--ink-0)" }}>Fechamento mensal</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}><Avatar initials="FI" size="md" /><span style={{ color: "var(--ink-1)", font: "var(--type-body)" }}>Financeiro</span></span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 10, color: "var(--ink-1)", font: "var(--type-body)" }}><Icon name="refresh-cw" size={18} style={{ color: "var(--ink-2)" }} />Volta de setembro</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}><Avatar name="Leonardo Esteves" size="md" /><span style={{ color: "var(--ink-1)", font: "var(--type-body)" }}>Responsável: <span style={{ color: "var(--ink-0)" }}>Leonardo</span></span></span>
              <span style={{ color: "var(--ink-4)" }}>·</span>
              <StatusPill status="soon" label="Vence hoje" />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Button variant="secondary" iconLeft={<Icon name="settings" size={17} />}>Ajustes</Button>
            <Button variant="secondary" iconLeft={<Icon name="lock" size={17} />}>Travar</Button>
            <IconButton label="Mais ações" size={44} style={{ border: "1px solid var(--border-default)", borderRadius: "var(--r-pill)" }}><Icon name="more-horizontal" size={20} /></IconButton>
          </div>
        </div>
        <CheckpointTrail steps={steps} current={2} size={32} style={{ padding: "26px 0 6px" }} />
        <Divider inset={0} />
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <span className="tw-kicker">Checkpoint 3 de 3</span>
            <h2 style={{ font: "var(--type-h2)", letterSpacing: "var(--ls-h2)", color: "var(--ink-0)", fontSize: 34 }}>Aprovação</h2>
          </div>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 12, color: "var(--ink-2)", font: "var(--type-body)" }}>
            Aprovador: <span style={{ color: "var(--ink-0)" }}>Leonardo</span><Avatar name="Leonardo Esteves" size="lg" />
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
          <span style={{ color: "var(--ink-1)", font: "var(--fw-medium) var(--fs-body)/1.3 var(--font-ui)" }}>Só passa quando</span>
          <span style={{ width: 1, height: 22, background: "var(--border-hairline)" }} />
          <span style={{ color: "var(--ink-2)", font: "var(--type-body)" }}>Demonstrativos conferidos e fechamento validado.</span>
        </div>
        <SectionHeader size="h3" title="Tarefas" subtitle="3 de 3 prontas" />
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 190px 150px 150px", gap: 16, padding: "0 4px 10px", color: "var(--ink-2)", font: "var(--type-meta)" }}>
            <span>Tarefa</span><span>Responsável</span><span>Prazo</span><span>Status</span>
          </div>
          {tasks.map(t => (
            <div key={t.title} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 190px 150px 150px", gap: 16, alignItems: "center", padding: "14px 4px", borderBottom: "1px solid var(--border-hairline)" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 14 }}><Checkbox checked /><span style={{ color: "var(--ink-1)", font: "var(--type-body)" }}>{t.title}</span></span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 12, color: "var(--ink-1)", font: "var(--type-body)" }}><Avatar name={t.who} size="md" />{t.short}</span>
              <span style={{ color: "var(--ink-1)", font: "var(--type-body)" }}>Hoje</span>
              <span style={{ color: "var(--ink-2)", font: "var(--type-body)" }}>Concluída</span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 22, flexWrap: "wrap" }}>
          <Button size="lg" onClick={() => go("Rotinas")}>Aprovar e fechar volta</Button>
          <span style={{ color: "var(--ink-2)", font: "var(--type-body)" }}>Esta volta será registrada no histórico.</span>
        </div>
        <SectionHeader size="h3" title="Voltas anteriores" />
        <DataTable
          columns={[{ key: "v", label: "Volta" }, { key: "s", label: "Status" }, { key: "a", label: "Ações", align: "right" }]}
          rows={[
            { v: "Agosto", s: <StatusPill status="onTrack" />, a: <Button variant="ghost" size="sm">Ver volta</Button> },
            { v: "Julho", s: <StatusPill status="onTrack" />, a: <Button variant="ghost" size="sm">Ver volta</Button> },
            { v: "Junho", s: <StatusPill status="late" label="Atrasada" />, a: <Button variant="ghost" size="sm">Ver volta</Button> },
          ]} />
      </>}
      rail={<>
        <Panel variant="plain" padding={0} title="Nesta volta">
          <InfoRow icon="calendar" label="Prazo" value="Hoje" />
          <InfoRow icon="user" label="Responsável" value="Leonardo" />
          <InfoRow icon="target" value="3 checkpoints" />
          <InfoRow icon="list" value="6 tarefas concluídas" />
        </Panel>
        <Divider inset={2} />
        <Panel variant="plain" padding={0} title="Atividade">
          <div>
            <ActivityItem who="Você" action="concluiu" target="Revisar fechamento" time="há 5 min" />
            <ActivityItem who="Ana" action="concluiu" target="Validar lançamentos" time="há 20 min" />
            <ActivityItem who="Leonardo" action="aprovou" target="Conciliação" time="ontem" />
          </div>
        </Panel>
        <Button variant="secondary" block iconLeft={<Icon name="message-square" size={18} />} onClick={() => go("Conversa")}>Abrir conversa</Button>
      </>} />
  );
}
