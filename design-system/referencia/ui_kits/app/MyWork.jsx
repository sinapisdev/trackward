function MyWork({ data, go }) {
  const [filter, setFilter] = React.useState("Tudo");
  const [open, setOpen] = React.useState("Conferir documentos");
  const [done, setDone] = React.useState({});
  return (
    <div style={{ position: "relative", display: "grid", gridTemplateColumns: "minmax(0,1fr) 0", minWidth: 0 }}>
      <Content style={{ paddingRight: open ? 720 : "var(--gutter-page)" }}>
        <PageHeader kicker="Sua fila" title="Meu trabalho" subtitle="5 pendências. Um próximo passo de cada vez."
          actions={<>
            <Button variant="secondary" iconLeft={<Icon name="filter" size={17} />}>Filtrar</Button>
            <Button variant="secondary" iconLeft={<Icon name="plus" size={17} />}>Tarefa</Button>
          </>} />
        <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, padding: 4, borderRadius: "var(--r-pill)", background: "var(--white-04)" }}>
            {[["Tudo", 5], ["Executar", 3], ["Aprovar", 1], ["Aguardando", 1]].map(([l, c]) => (
              <Chip key={l} selected={filter === l} count={c} onClick={() => setFilter(l)}>{l}</Chip>
            ))}
          </div>
          <Input size="sm" leading={<Icon name="search" size={17} />} placeholder="Buscar na minha fila" style={{ width: 290 }} />
        </div>
        <button style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "transparent", border: 0, color: "var(--ink-2)", font: "var(--type-body)", cursor: "pointer", justifySelf: "start", padding: 0 }}>
          Ordenado por urgência <Icon name="chevron-down" size={17} />
        </button>
        <div style={{ display: "grid", gap: 0 }}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 210px", padding: "0 6px 10px", color: "var(--ink-2)", font: "var(--type-meta)" }}>
            <span>Pendência</span><span>Prazo</span>
          </div>
          {data.queue.map((g, gi) => (
            <div key={gi} style={{ display: "grid", gap: 0 }}>
              <div style={{ padding: "18px 6px 10px", color: g.tone === "danger" ? "var(--danger-text)" : "var(--ink-1)", font: "var(--fw-medium) var(--fs-body)/1.2 var(--font-ui)" }}>{g.group}</div>
              {g.items.map((it, i) => {
                const active = open === it.title;
                return (
                  <div key={i} onClick={() => setOpen(it.title)}
                    style={{
                      display: "grid", gridTemplateColumns: "minmax(0,1fr) 120px 42px 180px 24px", gap: 14, alignItems: "center",
                      padding: "14px 6px", borderTop: "1px solid var(--border-hairline)", cursor: "pointer",
                      background: active ? "var(--bg-row-active)" : "transparent",
                      boxShadow: active ? "inset 2px 0 0 var(--accent)" : "none",
                    }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 14, minWidth: 0 }}>
                      {it.blocked ? <Icon name="lock" size={20} style={{ color: "var(--ink-2)", marginTop: 2 }} />
                        : it.check ? <Icon name="check-circle-2" size={20} style={{ color: "var(--ink-1)", marginTop: 2 }} />
                        : <Checkbox checked={!!done[it.title]} onChange={() => setDone({ ...done, [it.title]: !done[it.title] })} />}
                      <span style={{ display: "grid", gap: 4, minWidth: 0 }}>
                        <span style={{ color: "var(--ink-0)", font: "var(--fw-medium) var(--fs-body)/1.3 var(--font-ui)" }}>{it.title}</span>
                        <span style={{ color: "var(--ink-3)", font: "var(--type-meta)" }}>{it.context}</span>
                        {it.note && <span style={{ color: "var(--ink-3)", font: "var(--type-meta)" }}>{it.note}</span>}
                      </span>
                    </div>
                    <Button variant="quiet" size="sm" style={{ justifySelf: "start" }}
                      onClick={e => { e.stopPropagation(); it.blocked ? go("Tarefa") : setOpen(it.title); }}>{it.action}</Button>
                    <Avatar name="Leonardo Esteves" size="md" />
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 9, color: it.dueTone === "danger" ? "var(--danger-text)" : "var(--ink-1)", font: "var(--type-body)" }}>
                      {it.check && <Icon name="check-circle-2" size={17} style={{ color: "var(--ink-2)" }} />}
                      {it.blocked && <Icon name="lock" size={17} style={{ color: "var(--ink-2)" }} />}
                      {it.due}
                    </span>
                    {active ? <Icon name="chevron-right" size={18} style={{ color: "var(--ink-1)" }} /> : <span />}
                  </div>
                );
              })}
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "18px 6px 0", borderTop: "1px solid var(--border-hairline)", color: "var(--ink-2)", font: "var(--type-meta)" }}>
            <Icon name="clock" size={18} style={{ color: "var(--ink-3)" }} />
            <span>Última atividade: Ana concluiu Importar clientes · há 12 min</span>
          </div>
        </div>
      </Content>

      {open && (
        <div style={{ position: "absolute", top: 22, right: 22, width: 660, zIndex: 20 }}>
          <span aria-hidden style={{ position: "absolute", inset: "-12px 18px auto 18px", height: 90, borderRadius: "var(--r-xl)", background: "linear-gradient(180deg,#2A2E2E,#1D2121)", opacity: .7, boxShadow: "var(--sh-card)" }} />
          <Panel variant="drawer" padding="26px 30px 30px" style={{ position: "relative", gap: 22 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
              <Breadcrumbs items={["Implantação do ERP", "Cadastro"]} />
              <span style={{ display: "flex", gap: 2 }}>
                <IconButton label="Mais ações"><Icon name="more-horizontal" size={20} /></IconButton>
                <IconButton label="Fechar" onClick={() => setOpen(null)}><Icon name="x" size={20} /></IconButton>
              </span>
            </div>
            <h2 style={{ font: "var(--type-title)", letterSpacing: "var(--ls-title)", color: "var(--ink-0)" }}>{open}</h2>
            <StatusPill status="todo" variant="chip" style={{ justifySelf: "start" }} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <div style={{ display: "grid", gap: 10 }}>
                <span style={{ color: "var(--ink-2)", font: "var(--type-meta)" }}>Responsável</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 12, color: "var(--ink-0)", font: "var(--type-body)" }}><Avatar name="Leonardo Esteves" size="md" />Você</span>
              </div>
              <div style={{ display: "grid", gap: 10, paddingLeft: 24, borderLeft: "1px solid var(--border-hairline)" }}>
                <span style={{ color: "var(--ink-2)", font: "var(--type-meta)" }}>Prazo</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 12, color: "var(--ink-0)", font: "var(--type-body)" }}><Icon name="calendar" size={19} style={{ color: "var(--ink-2)" }} />Hoje</span>
              </div>
            </div>
            <p style={{ color: "var(--ink-1)", font: "var(--fw-regular) var(--fs-body-lg)/1.45 var(--font-ui)" }}>Confira os documentos recebidos antes da validação dos cadastros.</p>
            <div style={{ display: "grid", gap: 16 }}>
              <h3 style={{ font: "var(--type-h3)", letterSpacing: "var(--ls-h3)", color: "var(--ink-0)" }}>Onde esta tarefa está</h3>
              <CheckpointTrail steps={data.trail.map(s => ({ label: s.label }))} current={1} numbered={false} nowLabel={null} size={26} />
              <span style={{ color: "var(--ink-2)", font: "var(--type-meta)" }}>Checkpoint 2 de 4 · 1 de 3 tarefas prontas</span>
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              <h3 style={{ font: "var(--type-h3)", letterSpacing: "var(--ls-h3)", color: "var(--ink-0)" }}>Critério de passagem</h3>
              <span style={{ color: "var(--ink-1)", font: "var(--type-body)" }}>Dados de clientes e fornecedores conferidos.</span>
              <span style={{ color: "var(--ink-3)", font: "var(--type-meta)" }}>Aprovação do checkpoint: Leonardo</span>
            </div>
            <Button block size="lg" iconLeft={<Icon name="check-circle-2" size={19} />} onClick={() => setOpen(null)}>Marcar como feita</Button>
            <Button variant="ghost" block iconRight={<Icon name="arrow-right" size={17} />} onClick={() => go("Projeto")}>Abrir track</Button>
          </Panel>
        </div>
      )}
    </div>
  );
}
