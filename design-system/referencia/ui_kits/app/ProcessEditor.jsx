function ProcessEditor({ data, go }) {
  const [step, setStep] = React.useState(1);
  const [name, setName] = React.useState("Cadastro");
  const [criterion, setCriterion] = React.useState("Dados de clientes e fornecedores conferidos.");
  const [days, setDays] = React.useState(5);
  const tasks = [
    { title: "Importar clientes", area: "Comercial" },
    { title: "Conferir documentos", area: "Operações" },
    { title: "Revisar cadastros", area: "Financeiro" },
  ];
  return (
    <Content>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
        <div style={{ display: "grid", gap: 10 }}>
          <Breadcrumbs items={["Processos", "Implantação do ERP"]} onNavigate={l => l === "Processos" && go("Processos")} />
          <h1 style={{ font: "var(--type-title)", letterSpacing: "var(--ls-title)", color: "var(--ink-0)" }}>Implantação do ERP</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ display: "grid", placeItems: "center", width: 30, height: 30, borderRadius: "var(--r-md)", background: "var(--n-800)", border: "1px solid var(--border-hairline)" }}>
              <Icon name="square-pen" size={17} style={{ color: "var(--ink-1)" }} />
            </span>
            <span style={{ color: "var(--ink-1)", font: "var(--type-body)" }}>Molde de projeto</span>
            <span style={{ color: "var(--ink-4)" }}>·</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 9, color: "var(--ink-2)", font: "var(--type-body)" }}>
              <Icon name="circle" size={16} />Alterações não salvas
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <Button variant="secondary" shape="rounded" onClick={() => go("Processos")}>Cancelar</Button>
          <Button shape="rounded" onClick={() => go("Processos")}>Salvar processo</Button>
        </div>
      </div>
      <Divider inset={0} />
      <div style={{ display: "grid", gridTemplateColumns: "var(--rail-w) minmax(0,1fr)", gap: 40, alignItems: "start" }}>
        <div style={{ display: "grid", gap: 18, paddingRight: 24, borderRight: "1px solid var(--border-hairline)" }}>
          <SectionHeader size="h3" title="Checkpoints" action={<Button variant="secondary" size="sm" iconLeft={<Icon name="plus" size={16} />}>Checkpoint</Button>} />
          <div style={{ display: "grid" }}>
            {data.processTrail.map((s, i) => (
              <button key={i} onClick={() => { setStep(i); setName(s.label); }}
                style={{ display: "grid", gridTemplateColumns: "30px minmax(0,1fr)", gap: 16, alignItems: "center", textAlign: "left", padding: "12px 14px", border: 0, cursor: "pointer", borderRadius: "var(--r-lg)", background: step === i ? "var(--bg-row-active)" : "transparent" }}>
                <span style={{ display: "grid", placeItems: "center", width: 30, height: 30, borderRadius: "var(--r-pill)", border: "2px solid var(--n-700)", color: "var(--ink-1)", font: "var(--fw-semibold) 14px/1 var(--font-ui)" }}>{i + 1}</span>
                <span style={{ display: "grid", gap: 3 }}>
                  <span style={{ color: "var(--ink-0)", font: "var(--fw-medium) var(--fs-body)/1.2 var(--font-ui)" }}>{s.label}</span>
                  <span style={{ color: "var(--ink-3)", font: "var(--type-meta)" }}>{s.meta}</span>
                </span>
              </button>
            ))}
          </div>
          <Divider inset={4} />
          <div style={{ display: "grid", gap: 4 }}>
            <Button variant="ghost" iconLeft={<Icon name="arrow-up" size={18} />} style={{ justifyContent: "flex-start" }}>Mover antes</Button>
            <Button variant="ghost" iconLeft={<Icon name="arrow-down" size={18} />} style={{ justifyContent: "flex-start" }}>Mover depois</Button>
            <Button variant="ghost" iconLeft={<Icon name="trash-2" size={18} />} style={{ justifyContent: "flex-start" }}>Excluir checkpoint</Button>
          </div>
        </div>
        <div style={{ display: "grid", gap: 22, minWidth: 0 }}>
          <h2 style={{ font: "var(--type-h2)", letterSpacing: "var(--ls-h2)", color: "var(--ink-0)", fontSize: 30 }}>{name}</h2>
          <Field layout="row" label="Nome do checkpoint"><Input value={name} onChange={e => setName(e.target.value)} /></Field>
          <Field layout="row" label="Só passa quando"><Textarea value={criterion} onChange={e => setCriterion(e.target.value)} /></Field>
          <Field layout="row" label="Área que aprova"><Select options={["Operações", "Financeiro", "Comercial", "Pessoas"]} value="Operações" onChange={() => {}} style={{ maxWidth: 266 }} /></Field>
          <Field layout="row" label="Prazo após o início">
            <span style={{ display: "inline-flex", alignItems: "center", gap: 14 }}>
              <Input value={days} onChange={e => setDays(e.target.value)} style={{ width: 146 }} />
              <span style={{ color: "var(--ink-1)", font: "var(--type-body)" }}>dias</span>
            </span>
          </Field>
          <Divider inset={2} />
          <SectionHeader size="h3" title="Tarefas deste checkpoint" action={<Button variant="secondary" size="sm" iconLeft={<Icon name="plus" size={16} />}>Tarefa</Button>} />
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 360px 44px", gap: 16, color: "var(--ink-2)", font: "var(--type-meta)" }}>
              <span>Tarefa</span><span>Área responsável</span><span />
            </div>
            {tasks.map((t, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 360px 44px", gap: 16, alignItems: "center" }}>
                <Input defaultValue={t.title} />
                <Select options={["Comercial", "Operações", "Financeiro", "Pessoas"]} value={t.area} onChange={() => {}} />
                <IconButton label="Mais ações"><Icon name="more-horizontal" size={19} /></IconButton>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 12, color: "var(--ink-2)", font: "var(--type-meta)" }}>
              <Icon name="info" size={19} />Na criação da track, as áreas viram responsáveis e os dias viram datas.
            </span>
            <Button variant="ghost" size="sm" iconRight={<Icon name="arrow-right" size={16} />} onClick={() => go("Projeto")}>Prévia da trilha</Button>
          </div>
        </div>
      </div>
    </Content>
  );
}
