function Projects({ data, go }) {
  const [view, setView] = React.useState("Pastas");
  const [tab, setTab] = React.useState("Em andamento");
  const cards = [
    { kind: "Projeto", name: "Nova unidade", blocked: true, checkpoint: "Viabilidade", meta: "4 tarefas" },
    { kind: "Projeto", name: "Implantação do ERP", progress: 33, meta: "Cadastro · 1 de 3 prontas", team: ["Leonardo E", "Ana N", "Mariana C"] },
    { kind: "Projeto", name: "Contratação de analista", progress: 65, meta: "5 tarefas", team: ["Ana N"] },
  ];
  return (
    <Content>
      <PageHeader title="Projetos"
        subtitle={<span><span style={{ color: "var(--ink-1)" }}>8 projetos</span><span style={{ color: "var(--ink-3)" }}> · </span><span style={{ color: "var(--danger-text)" }}>2 precisam de atenção</span></span>}
        actions={<Button variant="secondary" iconLeft={<Icon name="plus" size={17} />} onClick={() => go("Criar track")}>Novo projeto</Button>} />

      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", justifyContent: "flex-end" }}>
        <Input size="sm" leading={<Icon name="search" size={17} />} placeholder="Buscar projeto" style={{ width: 300, marginRight: "auto" }} />
        <Select size="sm" options={["Situação", "Atrasado", "Travado", "Em dia"]} onChange={() => {}} style={{ width: 150 }} />
        <Select size="sm" options={["Responsável", "Leonardo", "Ana", "Mariana"]} onChange={() => {}} style={{ width: 168 }} />
        <Select size="sm" options={["Área", "Operações", "Financeiro"]} onChange={() => {}} style={{ width: 120 }} />
        <SegmentedControl options={["Pastas", "Lista"]} value={view} onChange={setView} />
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", gap: 28, padding: "10px 0 4px" }}>
        {cards.map((c, i) => (
          <div key={i} style={{ display: "grid", gap: 22, justifyItems: "center" }}>
            <FolderCard kicker={c.kind} title={c.name} width={i === 1 ? 356 : 320} dim={i !== 1}
              onClick={() => go("Projeto")}
              footer={<><span>{c.meta}</span>{c.team && <AvatarGroup people={c.team} size="sm" />}</>}>
              {c.blocked && <StatusPill status="blocked" />}
              {c.checkpoint && <span style={{ color: "var(--ink-1)", font: "var(--type-body)" }}>{c.checkpoint}</span>}
              {c.progress != null && (
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <ProgressRing value={c.progress} size={44} />
                  <span style={{ display: "grid" }}>
                    <span style={{ font: "var(--fw-bold) var(--fs-metric)/1 var(--font-display)", letterSpacing: "var(--ls-metric)", color: "var(--ink-0)" }}>{c.progress}<span style={{ fontSize: 20 }}>%</span></span>
                    <span style={{ color: "var(--ink-2)", font: "var(--type-meta)" }}>de progresso</span>
                  </span>
                </div>
              )}
            </FolderCard>
            {i === 1 && <Button size="lg" iconRight={<Icon name="arrow-right" size={18} />} onClick={() => go("Projeto")}>Abrir projeto</Button>}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 34 }}>
        <h2 style={{ font: "var(--type-h2)", letterSpacing: "var(--ls-h2)", color: "var(--ink-0)" }}>Todos os projetos</h2>
        <Tabs variant="underline" items={[{ label: "Em andamento", count: 6 }, { label: "Concluídos", count: 2 }]} active={tab} onChange={setTab} style={{ flex: 1 }} />
      </div>

      <DataTable
        activeRow={2}
        onRowClick={() => go("Projeto")}
        columns={[
          { key: "n", label: "Projeto", sortable: true, sorted: "desc", width: "minmax(0,1.4fr)" },
          { key: "c", label: "Checkpoint atual" },
          { key: "r", label: "Responsável" },
          { key: "s", label: "Situação" },
          { key: "p", label: "Progresso", width: "minmax(0,1.2fr)" },
          { key: "m", width: "44px", align: "right" },
        ]}
        rows={data.projects.map(p => ({
          n: <span style={{ whiteSpace: "nowrap" }}>{p.name}</span>,
          c: p.cp,
          r: <><Avatar name={p.who} size="md" /><span>{p.short}</span></>,
          s: <StatusPill status={p.status} />,
          p: <><span style={{ color: "var(--ink-1)", width: 42 }}>{p.progress}%</span><ProgressBar value={p.progress} width={148} /></>,
          m: <IconButton label="Mais ações"><Icon name="more-horizontal" size={19} /></IconButton>,
        }))}
        footer={<><span>5 de 6 em andamento</span><Button variant="ghost" size="sm" iconRight={<Icon name="arrow-right" size={16} />}>Ver mais</Button></>} />
    </Content>
  );
}
