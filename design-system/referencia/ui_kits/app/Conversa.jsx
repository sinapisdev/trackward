function Conversa({ data, go }) {
  const [channel, setChannel] = React.useState("implantação-erp");
  const [msgs, setMsgs] = React.useState(data.messages);
  const send = text => { if (text && text.trim()) setMsgs([...msgs, { author: "Leonardo", time: "09:20", text }]); };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "var(--rail-w) minmax(0,1fr) 360px", alignItems: "start", minWidth: 0 }}>
      <div style={{ padding: "26px 24px 34px 30px" }}>
        <SideRail width="100%" active={channel} onSelect={setChannel} style={{ borderRight: "none", padding: 0 }}
          header={<SectionHeader size="h3" title="Conversa" action={<IconButton label="Novo canal"><Icon name="plus" size={20} /></IconButton>} style={{ paddingBottom: 6 }} />}
          groups={[
            { title: "Canais", items: [{ label: "geral", prefix: "#", count: 2 }, { label: "financeiro", prefix: "#" }, { label: "operações", prefix: "#" }] },
            { title: "Projetos", items: [{ label: "implantação-erp", prefix: "#", trailing: <Icon name="sparkles" size={17} style={{ color: "var(--accent)" }} /> }, { label: "nova-unidade", prefix: "#", count: 1 }] },
            { title: "Conversas", items: [{ label: "Ana", prefix: <Avatar name="Ana Nunes" size="md" /> }, { label: "Mariana", prefix: <Avatar name="Mariana Costa" size="md" /> }] },
          ]} />
      </div>

      <div style={{ borderLeft: "1px solid var(--border-hairline)", padding: "26px 30px 30px", display: "grid", gap: 20, alignContent: "start", minHeight: "calc(100vh - 120px)", gridTemplateRows: "auto auto 1fr auto" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <h2 style={{ font: "var(--type-h2)", letterSpacing: "var(--ls-h2)", color: "var(--ink-0)" }}>
              <span style={{ color: "var(--ink-3)" }}># </span>{channel}
            </h2>
            <span style={{ color: "var(--ink-2)", font: "var(--type-meta)" }}>Implantação do ERP · 6 participantes</span>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Button variant="secondary" iconLeft={<Icon name="sparkles" size={18} />} onClick={() => go("Propostas")}>Ler conversa</Button>
            <IconButton label="Mais ações"><Icon name="more-horizontal" size={20} /></IconButton>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, color: "var(--ink-3)", font: "var(--type-meta)" }}>
          <span style={{ flex: 1, height: 1, background: "var(--border-hairline)" }} /><span>Hoje</span><span style={{ flex: 1, height: 1, background: "var(--border-hairline)" }} />
        </div>
        <div style={{ display: "grid", gap: 4, alignContent: "start" }}>
          {msgs.map((m, i) => (
            <ChatMessage key={i} author={m.author} time={m.time} quote={m.quote} mention={m.mention}>{m.text}</ChatMessage>
          ))}
          <AiBanner title="3 propostas aguardam revisão" subtitle="Tarefa, prazo e decisão" action="Revisar propostas" onAction={() => go("Propostas")} style={{ marginTop: 14 }} />
        </div>
        <Composer onSend={send} />
      </div>

      <div style={{ borderLeft: "1px solid var(--border-hairline)", padding: "26px 28px", display: "grid", gap: 22, alignContent: "start" }}>
        <span style={{ color: "var(--ink-2)", font: "var(--type-body)" }}>Nesta track</span>
        <h3 style={{ font: "var(--type-h3)", letterSpacing: "var(--ls-h3)", color: "var(--ink-0)", fontSize: 26 }}>Implantação do ERP</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ width: 26, height: 26, borderRadius: "var(--r-pill)", border: "2px solid var(--accent)", flex: "none" }} />
          <span style={{ display: "grid", gap: 3 }}>
            <span style={{ color: "var(--ink-0)", font: "var(--fw-medium) var(--fs-body-lg)/1.2 var(--font-ui)" }}>Cadastro</span>
            <span style={{ color: "var(--ink-2)", font: "var(--type-meta)" }}>1 de 3 tarefas prontas</span>
          </span>
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          <span style={{ color: "var(--ink-2)", font: "var(--type-meta)" }}>Aprovador</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 12, color: "var(--ink-0)", font: "var(--type-body)" }}><Avatar name="Leonardo Esteves" size="lg" />Leonardo</span>
        </div>
        <TextLink onClick={() => go("Projeto")}>Abrir track →</TextLink>
        <Divider inset={2} />
        <div style={{ display: "grid", gap: 12 }}>
          <span style={{ color: "var(--ink-1)", font: "var(--fw-medium) var(--fs-body)/1.2 var(--font-ui)" }}>Participantes</span>
          <AvatarGroup people={["Leonardo E", "Ana N", "Mariana C", "Bruno R", "Caio M", "Duda R"]} size="lg" max={3} />
        </div>
        <Divider inset={2} />
        <div style={{ display: "grid", gap: 10 }}>
          <span style={{ color: "var(--ink-1)", font: "var(--fw-medium) var(--fs-body)/1.2 var(--font-ui)" }}>Critério de passagem</span>
          <span style={{ color: "var(--ink-2)", font: "var(--type-body)" }}>Dados de clientes e fornecedores conferidos.</span>
        </div>
      </div>
    </div>
  );
}
