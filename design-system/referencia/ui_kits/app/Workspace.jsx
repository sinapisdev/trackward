function Workspace({ data, go }) {
  const [tab, setTab] = React.useState("Trilha");
  const [tasks, setTasks] = React.useState(data.tasks);
  const doneCount = tasks.filter(t => t.done).length;
  const toggle = i => setTasks(tasks.map((t, j) => j === i ? { ...t, done: !t.done } : t));
  return (
    <SplitContent
      main={<>
        <Breadcrumbs items={["Projetos", "Implantação do ERP"]} onNavigate={l => l === "Projetos" && go("Projetos")} />
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 32, flexWrap: "wrap" }}>
          <div style={{ display: "grid", gap: 14 }}>
            <h1 style={{ font: "var(--type-title)", letterSpacing: "var(--ls-title)", color: "var(--ink-0)" }}>Implantação do ERP</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <Avatar name="Leonardo Esteves" size="md" />
              <span style={{ color: "var(--ink-1)", font: "var(--type-body)" }}>Responsável: <span style={{ color: "var(--ink-0)" }}>Leonardo</span></span>
              <span style={{ color: "var(--ink-4)" }}>·</span>
              <StatusPill status="soon" />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ display: "grid", gap: 10, minWidth: 224 }}>
              <span style={{ color: "var(--ink-1)", font: "var(--type-body)" }}><span style={{ color: "var(--ink-0)", fontWeight: "var(--fw-semibold)" }}>33%</span> de progresso</span>
              <ProgressBar value={33} />
            </div>
            <Button variant="secondary" iconLeft={<Icon name="settings" size={17} />}>Ajustes</Button>
            <Button variant="secondary" iconLeft={<Icon name="lock" size={17} />}>Travar</Button>
            <IconButton label="Mais ações" size={44} style={{ border: "1px solid var(--border-default)", borderRadius: "var(--r-pill)" }}><Icon name="more-horizontal" size={20} /></IconButton>
          </div>
        </div>
        <Tabs items={["Trilha", "Conversa", "Atividade"]} active={tab} onChange={t => t === "Conversa" ? go("Conversa") : setTab(t)} />
        <Divider inset={0} />
        <div style={{ display: "grid", gap: 14 }}>
          <span style={{ color: "var(--ink-1)", font: "var(--fw-medium) var(--fs-body-lg)/1.2 var(--font-ui)" }}>Trilha do projeto</span>
          <CheckpointTrail steps={data.trail} current={1} size={34} style={{ padding: "18px 0 6px" }} />
        </div>
        <Divider inset={0} />
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <span className="tw-kicker">Checkpoint 2 de 4</span>
            <h2 style={{ font: "var(--type-h2)", letterSpacing: "var(--ls-h2)", color: "var(--ink-0)", fontSize: 34 }}>Cadastro</h2>
          </div>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 12, color: "var(--ink-2)", font: "var(--type-body)" }}>
            Aprovação: <span style={{ color: "var(--ink-0)" }}>Leonardo</span><Avatar name="Leonardo Esteves" size="lg" />
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
          <span style={{ color: "var(--ink-1)", font: "var(--fw-medium) var(--fs-body)/1.3 var(--font-ui)" }}>Só passa quando</span>
          <span style={{ width: 1, height: 22, background: "var(--border-hairline)" }} />
          <span style={{ color: "var(--ink-2)", font: "var(--type-body)" }}>Dados de clientes e fornecedores conferidos.</span>
        </div>
        <SectionHeader size="h3" title="Tarefas" subtitle={`${doneCount} de ${tasks.length} prontas`}
          action={<Button variant="secondary" iconLeft={<Icon name="plus" size={17} />}>Tarefa</Button>} />
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 190px 150px auto 44px", gap: 16, padding: "0 4px 10px", color: "var(--ink-2)", font: "var(--type-meta)" }}>
            <span>Tarefa</span><span>Responsável</span><span>Prazo</span><span /><span />
          </div>
          {tasks.map((t, i) => (
            <TaskRow key={t.title} {...t} onToggle={() => toggle(i)}
              onOverflow={() => go("Tarefa")}
              action={!t.done && i === 0 ? <Button size="sm" onClick={() => toggle(i)}>Concluir tarefa</Button> : null} />
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 22, flexWrap: "wrap" }}>
          <Button disabled size="lg" iconLeft={<Icon name="lock" size={19} />} style={{ minWidth: 318 }}>Aprovar saída</Button>
          <span style={{ color: "var(--ink-2)", font: "var(--type-body)" }}>Conclua as {tasks.length - doneCount} tarefas restantes para aprovar.</span>
        </div>
      </>}
      rail={<>
        <Panel variant="plain" padding={0}
          title={<div style={{ display: "grid", gap: 8 }}>
            <h3 style={{ font: "var(--type-h3)", letterSpacing: "var(--ls-h3)", color: "var(--ink-0)" }}>Conversa da track</h3>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 10, color: "var(--ink-2)", font: "var(--type-body)" }}>
              <span style={{ color: "var(--ink-3)", fontSize: 19 }}>#</span> implantação-erp
            </span>
          </div>}
          actions={<IconButton label="Opções da conversa"><Icon name="more-horizontal" size={20} /></IconButton>}>
          <div style={{ display: "grid", gap: 4 }}>
            <ChatMessage author="Ana" time="há 8 min" actions={false}>Reviso os cadastros amanhã.</ChatMessage>
            <ChatMessage author="Mariana" time="há 12 min" actions={false}>A importação dos clientes já foi concluída.</ChatMessage>
          </div>
          <Button variant="secondary" block iconLeft={<Icon name="sparkles" size={18} />} onClick={() => go("Propostas")}>Ler conversa</Button>
          <span style={{ textAlign: "center", color: "var(--ink-3)", font: "var(--type-meta)" }}>A IA sugere. Você decide.</span>
          <Composer placeholder="Escreva no canal..." mention={false} />
        </Panel>
        <Divider inset={2} />
        <Panel variant="plain" padding={0} title="Atividade">
          <div>{data.activity.map((a, i) => <ActivityItem key={i} {...a} />)}</div>
        </Panel>
      </>} />
  );
}
