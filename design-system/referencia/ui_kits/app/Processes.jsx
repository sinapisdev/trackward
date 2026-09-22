function Processes({ data, go }) {
  const [tab, setTab] = React.useState("Todos");
  const [sel, setSel] = React.useState(0);
  const p = data.processes[sel];
  return (
    <Content>
      <PageHeader title="Processos" subtitle="Descreva o caminho. Reutilize na próxima execução."
        actions={<Button variant="secondary" iconLeft={<Icon name="plus" size={17} />} onClick={() => go("Editor")}>Novo processo</Button>} />
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4, padding: 4, borderRadius: "var(--r-pill)", background: "var(--white-04)" }}>
          {[["Todos", 7], ["Projetos", 4], ["Rotinas", 3]].map(([l, c]) => <Chip key={l} selected={tab === l} count={c} onClick={() => setTab(l)}>{l}</Chip>)}
        </div>
        <Input size="sm" leading={<Icon name="search" size={17} />} placeholder="Buscar processo" style={{ width: 400 }} />
        <Select size="sm" options={["Área", "Operações", "Financeiro", "Pessoas", "Comercial"]} onChange={() => {}} style={{ width: 130 }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.9fr) minmax(0,1fr)", gap: 36, alignItems: "start" }}>
        <DataTable
          activeRow={sel} onRowClick={setSel}
          columns={[{ key: "n", label: "Processo", sortable: true, width: "minmax(0,1.5fr)" }, { key: "t", label: "Tipo", sortable: true }, { key: "a", label: "Área", sortable: true }, { key: "c", label: "Checkpoints", sortable: true }, { key: "m", width: "44px", align: "right" }]}
          rows={data.processes
            .filter(x => tab === "Todos" || (tab === "Projetos" ? x.type === "Projeto" : x.type === "Rotina"))
            .map(x => ({
              n: <span style={{ display: "inline-flex", alignItems: "center", gap: 14 }}><Icon name="file-text" size={20} style={{ color: "var(--ink-2)" }} />{x.name}</span>,
              t: x.type, a: x.area, c: x.checkpoints,
              m: <IconButton label="Mais ações"><Icon name="more-horizontal" size={19} /></IconButton>,
            }))}
          footer={<><span>6 de 7 processos</span><span /></>} />
        <div style={{ display: "grid", gap: 20, paddingLeft: 36, borderLeft: "1px solid var(--border-hairline)" }}>
          <h2 style={{ font: "var(--type-h2)", letterSpacing: "var(--ls-h2)", color: "var(--ink-0)", fontSize: 30 }}>{p.name}</h2>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 10, justifySelf: "start", padding: "7px 14px", borderRadius: "var(--r-pill)", background: "var(--bg-chip)", border: "1px solid var(--border-hairline)", color: "var(--ink-1)", font: "var(--type-meta)" }}>
            Molde de {p.type.toLowerCase()}
          </span>
          <span style={{ color: "var(--ink-1)", font: "var(--type-body)" }}>{p.checkpoints} checkpoints · 8 tarefas</span>
          <span style={{ color: "var(--ink-1)", font: "var(--fw-medium) var(--fs-body)/1.2 var(--font-ui)" }}>Prazos a partir do início</span>
          <CheckpointTrail orientation="vertical" steps={data.processTrail} current={-1} nowLabel={null} labelIndex={false} size={30} />
          <div style={{ display: "grid", gap: 8 }}>
            <span style={{ color: "var(--ink-1)", font: "var(--fw-medium) var(--fs-body)/1.2 var(--font-ui)" }}>Critério de Cadastro</span>
            <span style={{ color: "var(--ink-2)", font: "var(--type-body)" }}>Dados de clientes e fornecedores conferidos.</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <Button iconRight={<Icon name="arrow-right" size={17} />} onClick={() => go("Criar track")}>Usar processo</Button>
            <Button variant="secondary" iconLeft={<Icon name="pencil" size={17} />} onClick={() => go("Editor")}>Editar</Button>
            <IconButton label="Mais ações" size={44} style={{ border: "1px solid var(--border-default)", borderRadius: "var(--r-pill)" }}><Icon name="more-horizontal" size={20} /></IconButton>
          </div>
          <span style={{ color: "var(--ink-3)", font: "var(--type-meta)" }}>Ao criar a track, as áreas definem os responsáveis.</span>
        </div>
      </div>
    </Content>
  );
}
