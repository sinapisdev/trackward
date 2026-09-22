function CreateTrack({ data, go }) {
  const [tipo, setTipo] = React.useState("Projeto");
  const [vis, setVis] = React.useState("Toda a equipe");
  const [name, setName] = React.useState("Implantação do ERP");
  return (
    <Content>
      <div style={{ display: "grid", gap: 10 }}>
        <Breadcrumbs items={["Projetos", "Nova track"]} onNavigate={l => l === "Projetos" && go("Projetos")} />
        <h1 style={{ font: "var(--type-title)", letterSpacing: "var(--ls-title)", color: "var(--ink-0)" }}>Criar track</h1>
        <span style={{ color: "var(--ink-2)", font: "var(--fw-regular) var(--fs-body-lg)/1.4 var(--font-ui)" }}>Defina o trabalho. Depois, desenhe a trilha.</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.6fr) minmax(0,1fr)", gap: 44, alignItems: "start" }}>
        <div style={{ display: "grid", gap: 22, minWidth: 0 }}>
          <Field label="Tipo">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
              <RadioCard name="tipo" radioSide="left" checked={tipo === "Projeto"} onChange={() => setTipo("Projeto")} title="Projeto" description="Tem início e conclusão" />
              <RadioCard name="tipo" radioSide="left" checked={tipo === "Rotina"} onChange={() => setTipo("Rotina")} title="Rotina" description="Repete dentro de uma área" />
            </div>
          </Field>
          <Field label="Nome"><Input value={name} onChange={e => setName(e.target.value)} size="lg" /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }}>
            <Field label="Área" optional><Select options={["Operações", "Financeiro", "Comercial", "Pessoas"]} value="Operações" onChange={() => {}} /></Field>
            <Field label="Responsável pela track">
              <Select options={["Leonardo", "Ana", "Mariana"]} value="Leonardo" onChange={() => {}} leading={<Avatar name="Leonardo Esteves" size="sm" />} />
            </Field>
          </div>
          <Field label="Quem pode ver" hint="Participar de uma tarefa ou aprovação também dá acesso.">
            <div style={{ display: "grid", gap: 12 }}>
              {["Toda a equipe", "Pessoas escolhidas", "Só eu"].map(o => (
                <Radio key={o} name="vis" checked={vis === o} onChange={() => setVis(o)} label={o} />
              ))}
            </div>
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }}>
            <Field label="Começar com um processo"><Select options={["Implantação do ERP", "Abertura de unidade", "Contratação"]} value="Implantação do ERP" onChange={() => {}} /></Field>
            <Field label="Data de início"><Input defaultValue="Hoje" trailing={<Icon name="calendar" size={18} />} /></Field>
          </div>
          <TextLink style={{ justifySelf: "start" }}>Começar com uma trilha vazia</TextLink>
          <div style={{ display: "flex", gap: 14, paddingTop: 6 }}>
            <Button variant="secondary" onClick={() => go("Projetos")}>Cancelar</Button>
            <Button iconRight={<Icon name="arrow-right" size={17} />} onClick={() => go("Projeto")}>Criar e abrir trilha</Button>
          </div>
        </div>
        <div style={{ display: "grid", gap: 22, paddingLeft: 44, borderLeft: "1px solid var(--border-hairline)" }}>
          <div style={{ display: "grid", gap: 8 }}>
            <h3 style={{ font: "var(--type-h3)", letterSpacing: "var(--ls-h3)", color: "var(--ink-0)", fontSize: 26 }}>Sua trilha inicial</h3>
            <span style={{ color: "var(--ink-2)", font: "var(--type-body)" }}>A partir do processo Implantação do ERP</span>
          </div>
          <CheckpointTrail orientation="vertical" steps={data.processTrail} current={-1} nowLabel={null} labelIndex={false} size={32} />
          <Divider inset={2} />
          <span style={{ color: "var(--ink-1)", font: "var(--type-body)" }}>4 checkpoints · 8 tarefas</span>
          <span style={{ color: "var(--ink-2)", font: "var(--type-body)" }}>Os responsáveis serão definidos pelas áreas.<br />Os prazos partem da data de início.</span>
          <span style={{ color: "var(--ink-2)", font: "var(--type-body)" }}>Você poderá ajustar a trilha após criar.</span>
        </div>
      </div>
    </Content>
  );
}
