function Settings({ data, go }) {
  const [section, setSection] = React.useState("Geral");
  const [multi, setMulti] = React.useState(false);
  const [ai, setAi] = React.useState(true);
  const [aiMode, setAiMode] = React.useState("Sugerir alterações");
  const [theme, setTheme] = React.useState("Escuro");
  return (
    <Content>
      <PageHeader title="Ajustes" subtitle="Seu espaço, sua operação."
        actions={<>
          <Button variant="secondary" shape="rounded" onClick={() => go("Visão geral")}>Cancelar</Button>
          <Button shape="rounded" onClick={() => go("Visão geral")}>Salvar alterações</Button>
        </>} />
      <Divider inset={0} />
      <div style={{ display: "grid", gridTemplateColumns: "260px minmax(0,1fr) minmax(0,1fr)", gap: 40, alignItems: "start" }}>
        <SideRail width="100%" active={section} onSelect={setSection} style={{ borderRight: "none", padding: 0 }}
          groups={[{ items: ["Geral", "Organização", "Leitura da conversa", "Mais de um negócio", "Minha agenda externa", "Aparência"] }]} />

        <div style={{ display: "grid", gap: 26, paddingLeft: 40, borderLeft: "1px solid var(--border-hairline)", minWidth: 0 }}>
          <h3 style={{ font: "var(--type-h3)", letterSpacing: "var(--ls-h3)", color: "var(--ink-0)", fontSize: 26 }}>Organização</h3>
          <Field label="Nome"><Input defaultValue="Grupo Meridiano" /></Field>
          <Divider inset={2} />
          <div style={{ display: "grid", gap: 14 }}>
            <h3 style={{ font: "var(--type-h3)", letterSpacing: "var(--ls-h3)", color: "var(--ink-0)", fontSize: 26 }}>Mais de um negócio</h3>
            <span style={{ color: "var(--ink-2)", font: "var(--type-body)" }}>Separe a operação por empresa ou unidade.</span>
            <Switch checked={multi} onChange={() => setMulti(!multi)} label="Ativar mais de um negócio" />
          </div>
          <Divider inset={2} />
          <div style={{ display: "grid", gap: 16 }}>
            <h3 style={{ font: "var(--type-h3)", letterSpacing: "var(--ls-h3)", color: "var(--ink-0)", fontSize: 26 }}>Leitura da conversa</h3>
            <Switch checked={ai} onChange={() => setAi(!ai)} label="Ativar leitura com IA" />
            <div style={{ display: "grid", gap: 12, opacity: ai ? 1 : .5 }}>
              <Radio name="ai" checked={aiMode === "Sugerir alterações"} onChange={() => setAiMode("Sugerir alterações")} label="Sugerir alterações" />
              <Radio name="ai" checked={aiMode === "Aplicar sozinho"} onChange={() => setAiMode("Aplicar sozinho")} label="Aplicar sozinho" />
            </div>
            <span style={{ color: "var(--ink-3)", font: "var(--type-meta)" }}>Você revisa as propostas antes de aplicar.</span>
            <span style={{ color: "var(--ink-0)", font: "var(--fw-semibold) var(--fs-body)/1.4 var(--font-ui)" }}>Prazos e travas sempre exigem confirmação.</span>
          </div>
        </div>

        <div style={{ display: "grid", gap: 26, paddingLeft: 40, borderLeft: "1px solid var(--border-hairline)", minWidth: 0 }}>
          <h3 style={{ font: "var(--type-h3)", letterSpacing: "var(--ls-h3)", color: "var(--ink-0)", fontSize: 26 }}>Aparência</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 14 }}>
            {[["Escuro", "#0E1011", "#1E2223"], ["Claro", "#FFFFFF", "#EDEEEA"], ["Automático", "#0E1011", "#FFFFFF"]].map(([label, a, b]) => (
              <RadioCard key={label} name="theme" checked={theme === label} onChange={() => setTheme(label)} title={label} radioSide="left"
                media={<div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 4, height: 84, padding: 8, borderRadius: "var(--r-sm)", background: a, border: "1px solid var(--border-hairline)" }}>
                  <div style={{ display: "grid", gap: 4, alignContent: "start" }}>
                    {[0, 1, 2].map(i => <span key={i} style={{ height: 9, borderRadius: 3, background: b }} />)}
                  </div>
                  <span style={{ borderRadius: 4, background: b }} />
                </div>} />
            ))}
          </div>
          <span style={{ color: "var(--ink-3)", font: "var(--type-meta)" }}>Vale para você neste navegador.</span>
          <Divider inset={2} />
          <div style={{ display: "grid", gap: 16 }}>
            <h3 style={{ font: "var(--type-h3)", letterSpacing: "var(--ls-h3)", color: "var(--ink-0)", fontSize: 26 }}>Minha agenda externa</h3>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <span style={{ display: "grid", placeItems: "center", width: 52, height: 52, borderRadius: "var(--r-md)", background: "var(--n-800)", border: "1px solid var(--border-hairline)" }}>
                <Icon name="calendar-days" size={24} style={{ color: "var(--ink-1)" }} />
              </span>
              <span style={{ display: "grid", gap: 4 }}>
                <span style={{ color: "var(--ink-0)", font: "var(--fw-medium) var(--fs-body)/1.2 var(--font-ui)" }}>Conectada</span>
                <span style={{ color: "var(--ink-2)", font: "var(--type-meta)" }}>12 blocos de ocupação importados</span>
              </span>
            </div>
            <Field layout="row" label="Link iCal" style={{ gridTemplateColumns: "90px minmax(0,1fr)" }}>
              <Input type="password" defaultValue="webcal://meridiano" />
            </Field>
            <div style={{ display: "flex", gap: 12 }}>
              <Button variant="secondary" iconLeft={<Icon name="refresh-cw" size={17} />}>Atualizar</Button>
              <Button variant="secondary" iconLeft={<Icon name="eye-off" size={17} />}>Desconectar</Button>
            </div>
            <span style={{ color: "var(--ink-3)", font: "var(--type-meta)" }}>Importamos apenas livre ou ocupado.<br />Título, local e descrição não aparecem.</span>
          </div>
          <Divider inset={2} />
          <div style={{ display: "grid", gap: 16 }}>
            <h3 style={{ font: "var(--type-h3)", letterSpacing: "var(--ls-h3)", color: "var(--ink-0)", fontSize: 26 }}>Sua conta</h3>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 14 }}>
                <Avatar name="Leonardo Esteves" size="xl" />
                <span style={{ display: "grid", gap: 4 }}>
                  <span style={{ color: "var(--ink-0)", font: "var(--fw-medium) var(--fs-body-lg)/1.2 var(--font-ui)" }}>Leonardo</span>
                  <span style={{ color: "var(--ink-2)", font: "var(--type-meta)" }}>Trabalhando no Grupo Meridiano</span>
                </span>
              </span>
              <Button variant="secondary" iconLeft={<Icon name="log-out" size={17} />}>Sair da conta</Button>
            </div>
          </div>
        </div>
      </div>
    </Content>
  );
}
