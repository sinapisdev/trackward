function Proposals({ data, go }) {
  const [sel, setSel] = React.useState(1);
  const [applied, setApplied] = React.useState(false);
  const p = data.proposals[sel];
  return (
    <Content>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24 }}>
        <div style={{ display: "grid", gap: 10 }}>
          <Breadcrumbs items={["Conversa", "Implantação-erp", "Revisar propostas"]} onNavigate={l => l === "Conversa" && go("Conversa")} />
          <h1 style={{ font: "var(--type-title)", letterSpacing: "var(--ls-title)", color: "var(--ink-0)" }}>Da conversa para a execução</h1>
          <span style={{ color: "var(--ink-2)", font: "var(--fw-regular) var(--fs-body-lg)/1.4 var(--font-ui)" }}>3 propostas aguardam sua revisão.</span>
        </div>
        <Button variant="ghost" iconLeft={<Icon name="chevron-left" size={18} />} onClick={() => go("Conversa")}>Voltar à conversa</Button>
      </div>
      <Divider inset={0} />
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.6fr)", gap: 40, alignItems: "start" }}>
        <div style={{ display: "grid", gap: 14 }}>
          <SectionHeader size="h3" title="Propostas da IA" count={3} />
          <div style={{ display: "grid", gap: 8 }}>
            {data.proposals.map((x, i) => (
              <ProposalItem key={i} kind={x.kind} title={x.title} meta={x.meta} selected={sel === i} onClick={() => { setSel(i); setApplied(false); }} />
            ))}
          </div>
        </div>
        <div style={{ display: "grid", gap: 22, paddingLeft: 40, borderLeft: "1px solid var(--border-hairline)", minWidth: 0 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <h2 style={{ font: "var(--type-h2)", letterSpacing: "var(--ls-h2)", color: "var(--ink-0)" }}>{p.kind === "Prazo" ? "Alterar prazo" : p.kind === "Tarefa" ? "Criar tarefa" : "Registrar decisão"}</h2>
            <span style={{ color: "var(--ink-2)", font: "var(--type-meta)" }}>Implantação do ERP / Cadastro</span>
            <span style={{ color: "var(--ink-0)", font: "var(--fw-semibold) var(--fs-h3)/1.2 var(--font-display)", letterSpacing: "var(--ls-h3)" }}>{p.title}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ color: "var(--ink-2)", font: "var(--type-body)" }}>Responsável</span>
            <Avatar name="Ana Nunes" size="lg" /><span style={{ color: "var(--ink-1)", font: "var(--type-body)" }}>Ana</span>
          </div>
          <ProposalDiff from="Amanhã" to="em 3 dias" />
          <div style={{ display: "grid", gap: 10 }}>
            <span style={{ color: "var(--ink-1)", font: "var(--fw-medium) var(--fs-body)/1.2 var(--font-ui)" }}>Trecho que originou a proposta</span>
            <div style={{ display: "grid", gap: 8, padding: "16px 18px", background: "var(--white-04)", border: "1px solid var(--border-hairline)", borderRadius: "var(--r-lg)" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
                <Avatar name="Ana Nunes" size="md" />
                <span style={{ color: "var(--ink-1)", font: "var(--type-meta)" }}>Ana · Hoje, 09:10</span>
              </span>
              <span style={{ color: "var(--ink-1)", font: "var(--type-body)" }}>“Preciso de mais dois dias para revisar os cadastros.”</span>
              <TextLink onClick={() => go("Conversa")} style={{ justifySelf: "start" }}>Ver na conversa</TextLink>
            </div>
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            <span style={{ color: "var(--ink-1)", font: "var(--fw-medium) var(--fs-body)/1.2 var(--font-ui)" }}>O que será alterado</span>
            <span style={{ color: "var(--ink-1)", font: "var(--type-body)" }}>Somente o prazo desta tarefa.</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 12, color: "var(--ink-2)", font: "var(--type-meta)", marginTop: 4 }}>
              <Icon name="shield-check" size={19} />Alterações de prazo sempre precisam de confirmação.
            </span>
          </div>
          <Divider inset={0} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12, flexWrap: "wrap" }}>
            <Button variant="secondary" onClick={() => go("Conversa")}>Descartar proposta</Button>
            <Button variant="secondary">Ajustar prazo</Button>
            <Button onClick={() => setApplied(true)}>Confirmar novo prazo</Button>
          </div>
          <span style={{ textAlign: "right", color: applied ? "var(--ink-1)" : "var(--ink-3)", font: "var(--type-meta)" }}>
            {applied ? "Prazo atualizado para em 3 dias. Registrado na atividade." : "Nenhuma alteração foi aplicada."}
          </span>
          <Divider inset={0} />
          <span style={{ color: "var(--ink-2)", font: "var(--type-body)" }}>
            Checkpoint atual: <span style={{ color: "var(--ink-0)" }}>Cadastro</span><span style={{ color: "var(--ink-4)" }}> · </span>1 de 3 tarefas prontas
          </span>
        </div>
      </div>
    </Content>
  );
}
