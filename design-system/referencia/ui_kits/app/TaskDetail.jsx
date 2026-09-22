function TaskDetail({ data, go }) {
  return (
    <SplitContent railWidth="400px"
      main={<>
        <Breadcrumbs items={["Meu trabalho", "Validar base"]} onNavigate={l => l === "Meu trabalho" && go("Meu trabalho")} />
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 22, flexWrap: "wrap" }}>
            <h1 style={{ font: "var(--type-title)", letterSpacing: "var(--ls-title)", color: "var(--ink-0)" }}>Validar base</h1>
            <StatusPill status="blocked" variant="chip" label="Aguardando dependência" />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Button variant="secondary">Editar tarefa</Button>
            <IconButton label="Mais ações" size={44} style={{ border: "1px solid var(--border-default)", borderRadius: "var(--r-pill)" }}><Icon name="more-horizontal" size={20} /></IconButton>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 26, paddingTop: 6 }}>
          {[["Contexto", "Implantação do ERP / Validação"], ["Responsável", null], ["Prazo", "em 4 dias"], ["Visibilidade", null]].map(([label, value], i) => (
            <div key={label} style={{ display: "grid", gap: 12 }}>
              <span style={{ color: "var(--ink-2)", font: "var(--type-meta)" }}>{label}</span>
              {value
                ? <span style={{ color: "var(--ink-0)", font: "var(--type-body)" }}>{value}</span>
                : i === 1
                  ? <span style={{ display: "inline-flex", alignItems: "center", gap: 12, color: "var(--ink-0)", font: "var(--type-body)" }}><Avatar name="Leonardo Esteves" size="md" />Você</span>
                  : <span style={{ display: "inline-flex", alignItems: "center", gap: 12, color: "var(--ink-0)", font: "var(--type-body)" }}><Icon name="users" size={19} style={{ color: "var(--ink-2)" }} />Conforme a track</span>}
            </div>
          ))}
        </div>
        <Divider inset={0} />
        <div style={{ display: "grid", gap: 10 }}>
          <span style={{ color: "var(--ink-2)", font: "var(--type-meta)" }}>Descrição</span>
          <span style={{ color: "var(--ink-1)", font: "var(--fw-regular) var(--fs-body-lg)/1.45 var(--font-ui)" }}>Valide a base após a revisão dos dados de origem.</span>
        </div>
        <Divider inset={0} />
        <h2 style={{ font: "var(--type-h2)", letterSpacing: "var(--ls-h2)", color: "var(--ink-0)", fontSize: 30 }}>O que impede esta tarefa</h2>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 14, color: "var(--ink-2)", font: "var(--type-body)" }}>
          <Icon name="lock" size={22} />Esta tarefa depende da conclusão da tarefa abaixo, em outra track.
        </span>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, padding: "20px 22px", borderRadius: "var(--r-lg)", background: "var(--white-04)", border: "1px solid var(--border-hairline)", flexWrap: "wrap" }}>
          <span style={{ display: "grid", gap: 5 }}>
            <span style={{ color: "var(--ink-0)", font: "var(--fw-medium) var(--fs-body-lg)/1.2 var(--font-ui)" }}>Revisar base de clientes</span>
            <span style={{ color: "var(--ink-3)", font: "var(--type-meta)" }}>Preparação de dados / Revisão</span>
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 14 }}>
            <Avatar name="Mariana Costa" size="lg" />
            <span style={{ color: "var(--ink-1)", font: "var(--type-body)" }}>Mariana</span>
            <span style={{ color: "var(--ink-4)" }}>·</span>
            <span style={{ color: "var(--warn-text)", font: "var(--type-body)" }}>Em andamento</span>
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 60px minmax(0,1fr)", alignItems: "center", gap: 10, maxWidth: 880, margin: "4px auto 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", borderRadius: "var(--r-lg)", background: "var(--n-850)", border: "1px solid var(--border-hairline)" }}>
            <Avatar name="Mariana Costa" size="md" />
            <span style={{ display: "grid", gap: 2 }}>
              <span style={{ color: "var(--ink-0)", font: "var(--fw-medium) var(--fs-body)/1.2 var(--font-ui)" }}>Revisar base de clientes</span>
              <span style={{ color: "var(--ink-3)", font: "var(--type-meta)" }}>Mariana</span>
            </span>
          </div>
          <Icon name="arrow-right" size={26} style={{ color: "var(--ink-2)", justifySelf: "center" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", borderRadius: "var(--r-lg)", background: "transparent", border: "1px solid var(--border-default)" }}>
            <span style={{ display: "grid", placeItems: "center", width: 32, height: 32, borderRadius: "var(--r-pill)", background: "var(--n-800)" }}>
              <Icon name="lock" size={17} style={{ color: "var(--ink-1)" }} />
            </span>
            <span style={{ display: "grid", gap: 2 }}>
              <span style={{ color: "var(--ink-0)", font: "var(--fw-medium) var(--fs-body)/1.2 var(--font-ui)" }}>Validar base</span>
              <span style={{ color: "var(--ink-3)", font: "var(--type-meta)" }}>Você</span>
            </span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 26, flexWrap: "wrap" }}>
          <Button iconRight={<Icon name="arrow-right" size={17} />} onClick={() => go("Projeto")}>Ver dependência</Button>
          <TextLink>Editar dependências</TextLink>
        </div>
        <Divider inset={0} />
        <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
          <Button disabled size="lg" iconLeft={<Icon name="lock" size={19} />} style={{ minWidth: 300 }}>Concluir tarefa</Button>
          <span style={{ color: "var(--ink-2)", font: "var(--type-body)" }}>Disponível quando Mariana concluir a revisão.</span>
        </div>
      </>}
      rail={<>
        <span style={{ color: "var(--ink-2)", font: "var(--type-body)" }}>Nesta track</span>
        <h3 style={{ font: "var(--fw-bold) 30px/1.1 var(--font-display)", letterSpacing: "-.018em", color: "var(--ink-0)" }}>Implantação do ERP</h3>
        <CheckpointTrail orientation="vertical" current={1} size={30}
          steps={[{ label: "Preparação", meta: "Aprovado" }, { label: "Cadastro", meta: "1 de 3 tarefas" }, { label: "Validação", meta: "Esta tarefa" }, { label: "Entrega", meta: "Final" }]} />
        <Divider inset={2} />
        <div style={{ display: "grid", gap: 10 }}>
          <span style={{ color: "var(--ink-1)", font: "var(--fw-medium) var(--fs-body-lg)/1.2 var(--font-ui)" }}>Critério de Validação</span>
          <span style={{ color: "var(--ink-1)", font: "var(--type-body)" }}>Base revisada e pronta para migração.</span>
          <span style={{ color: "var(--ink-3)", font: "var(--type-meta)" }}>Aprovação: Leonardo</span>
        </div>
        <TextLink onClick={() => go("Projeto")}>Abrir track →</TextLink>
      </>} />
  );
}
