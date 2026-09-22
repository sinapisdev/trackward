function Signin({ go }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", minHeight: "100vh" }}>
      <div style={{ display: "grid", alignContent: "space-between", gap: 40, padding: "44px 56px 40px" }}>
        <Logo size={24} />
        <div style={{ display: "grid", gap: 34, maxWidth: 620 }}>
          <h1 style={{ font: "var(--fw-bold) 76px/.98 var(--font-display)", letterSpacing: "-.03em", color: "var(--ink-0)" }}>move work<br />forward.</h1>
          <span style={{ color: "var(--ink-1)", font: "var(--fw-regular) 22px/1.4 var(--font-ui)" }}>Projetos, rotinas e pessoas em movimento.</span>
          <CheckpointTrail steps={["Preparar", "Executar", "Validar", "Concluir"]} current={1} numbered={false} nowLabel={null} size={30} style={{ maxWidth: 560, marginTop: 14 }} />
        </div>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 18, color: "var(--ink-3)", font: "var(--type-meta)" }}>
          <Logo size={15} /><span>move work forward.</span>
        </span>
      </div>
      <div style={{ borderLeft: "1px solid var(--border-hairline)", display: "grid", alignContent: "center", justifyItems: "stretch", padding: "44px 80px" }}>
        <div style={{ display: "grid", gap: 22, maxWidth: 560, width: "100%", margin: "0 auto" }}>
          <div style={{ display: "grid", gap: 8 }}>
            <h2 style={{ font: "var(--fw-bold) 38px/1.1 var(--font-display)", letterSpacing: "-.022em", color: "var(--ink-0)" }}>Bem-vindo de volta.</h2>
            <span style={{ color: "var(--ink-2)", font: "var(--fw-regular) var(--fs-body-lg)/1.4 var(--font-ui)" }}>Entre para acessar seu espaço.</span>
          </div>
          <Field label="E-mail"><Input size="lg" placeholder="voce@empresa.com" /></Field>
          <Field label="Senha"><Input size="lg" type="password" revealable defaultValue="senha1234" /></Field>
          <TextLink style={{ justifySelf: "end" }} onClick={() => go("Recuperar")}>Esqueci minha senha</TextLink>
          <Button block size="lg" shape="rounded" iconRight={<Icon name="arrow-right" size={18} />}>Entrar</Button>
          <Divider inset={10} />
          <span style={{ textAlign: "center", color: "var(--ink-2)", font: "var(--type-body)" }}>
            Ainda não tem conta? <TextLink onClick={() => go("Criar conta")}>Criar conta</TextLink>
          </span>
        </div>
      </div>
    </div>
  );
}
