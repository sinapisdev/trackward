function Team({ data, go }) {
  const [seesArea, setSeesArea] = React.useState({ "Ana Nunes": true, "Mariana Costa": false });
  const [copied, setCopied] = React.useState(false);
  return (
    <Content>
      <PageHeader title="Equipe" subtitle={<span>3 pessoas com acesso<span style={{ color: "var(--ink-4)" }}> · </span>1 aguardando liberação.</span>} />
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.7fr) minmax(0,1fr)", gap: 44, alignItems: "start" }}>
        <div style={{ display: "grid", gap: 26, minWidth: 0 }}>
          <SectionHeader title="Aguardando liberação" count={1} />
          <DataTable
            columns={[{ key: "p", label: "Pessoa" }, { key: "e", label: "E-mail" }, { key: "s", label: "Solicitação" }, { key: "a", label: "Ações", width: "200px" }]}
            rows={[{
              p: <><Avatar name="Bruno Ribeiro" size="lg" /><span>Bruno Ribeiro</span></>,
              e: "bruno@meridiano.com", s: "Solicitou acesso hoje",
              a: <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}><Button variant="secondary" size="sm">Liberar</Button><IconButton label="Mais ações"><Icon name="more-horizontal" size={19} /></IconButton></span>,
            }]} />
          <SectionHeader title="Com acesso"
            controls={<Input size="sm" leading={<Icon name="search" size={16} />} placeholder="Buscar pessoa" style={{ width: 300 }} />}
            action={<Select size="sm" options={["Papel", "Admin", "Gestor", "Colaborador"]} onChange={() => {}} style={{ width: 150 }} />} />
          <DataTable
            columns={[{ key: "p", label: "Pessoa" }, { key: "r", label: "Papel" }, { key: "a", label: "Área" }, { key: "g", label: "Gestor" }, { key: "v", label: "Vê a área inteira" }, { key: "m", width: "44px", align: "right" }]}
            rows={data.team.map(t => ({
              p: <><Avatar name={t.name} size="lg" /><span>{t.short}</span></>,
              r: <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>{t.role}{t.owner && <Icon name="lock" size={17} style={{ color: "var(--ink-2)" }} />}</span>,
              a: t.area, g: t.manager,
              v: t.owner ? "Sim" : <Switch checked={!!seesArea[t.name]} onChange={() => setSeesArea({ ...seesArea, [t.name]: !seesArea[t.name] })} />,
              m: t.owner ? <span style={{ color: "var(--ink-3)" }}>—</span> : <IconButton label="Mais ações"><Icon name="more-horizontal" size={19} /></IconButton>,
            }))} />
          <span style={{ color: "var(--ink-2)", font: "var(--type-body)" }}>Leonardo acompanha 2 pessoas.</span>
        </div>
        <div style={{ display: "grid", gap: 20, paddingLeft: 44, borderLeft: "1px solid var(--border-hairline)" }}>
          <h3 style={{ font: "var(--type-h3)", letterSpacing: "var(--ls-h3)", color: "var(--ink-0)", fontSize: 26 }}>Convidar alguém</h3>
          <Field label="Papel"><Select options={["Colaborador", "Gestor", "Admin"]} value="Colaborador" onChange={() => {}} /></Field>
          <Field label="Área"><Select options={["Financeiro", "Operações", "Comercial", "Pessoas"]} value="Financeiro" onChange={() => {}} /></Field>
          <Field label="Gestor"><Select options={["Leonardo", "Ana"]} value="Leonardo" onChange={() => {}} /></Field>
          <Divider inset={2} />
          <div style={{ display: "grid", gap: 14 }}>
            <span style={{ color: "var(--ink-1)", font: "var(--fw-medium) var(--fs-body)/1.2 var(--font-ui)" }}>Convite pronto</span>
            <div style={{ display: "grid", placeItems: "center", padding: "22px 0", borderRadius: "var(--r-lg)", background: "var(--white-04)", border: "1px solid var(--border-hairline)" }}>
              <span style={{ font: "var(--fw-bold) 34px/1 var(--font-display)", letterSpacing: ".34em", color: "var(--ink-0)", paddingLeft: ".34em" }}>MVKQRT</span>
            </div>
            <span style={{ color: "var(--ink-2)", font: "var(--type-meta)" }}>Quem entrar com este código receberá o papel definido acima.</span>
            <Button block shape="rounded" onClick={() => setCopied(true)}>{copied ? "Código copiado" : "Copiar código"}</Button>
            <TextLink style={{ justifySelf: "center" }}>Criar outro convite</TextLink>
          </div>
        </div>
      </div>
    </Content>
  );
}
