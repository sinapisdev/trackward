function Recover({ go }) {
  const [sent, setSent] = React.useState(false);
  return (
    <div style={{ display: "grid", gridTemplateRows: "auto 1fr auto", minHeight: "100vh" }}>
      <header style={{ display: "grid", gap: 14, padding: "26px 34px" }}>
        <Logo size={21} />
        <Button variant="ghost" size="sm" iconLeft={<Icon name="arrow-left" size={18} />} style={{ justifySelf: "start" }} onClick={() => go("Entrar")}>Voltar para entrar</Button>
      </header>
      <div style={{ display: "grid", justifyItems: "center", alignContent: "start", gap: 22, padding: "30px 30px 40px" }}>
        <span style={{ display: "grid", placeItems: "center", width: 74, height: 74, borderRadius: "var(--r-pill)", border: "1px solid var(--border-default)" }}>
          <Icon name="key" size={30} style={{ color: "var(--ink-0)" }} />
        </span>
        <div style={{ display: "grid", gap: 10, justifyItems: "center", textAlign: "center" }}>
          <h1 style={{ font: "var(--fw-bold) 42px/1.08 var(--font-display)", letterSpacing: "-.024em", color: "var(--ink-0)" }}>Recuperar acesso</h1>
          <span style={{ color: "var(--ink-2)", font: "var(--fw-regular) var(--fs-body-lg)/1.4 var(--font-ui)" }}>Receba um link para definir uma nova senha.</span>
        </div>
        <div style={{ display: "grid", gap: 16, width: "100%", maxWidth: 560 }}>
          <Field label="E-mail"><Input size="lg" placeholder="voce@empresa.com" /></Field>
          <Button block size="lg" shape="rounded" iconRight={<Icon name="arrow-right" size={18} />} onClick={() => setSent(true)}>Enviar link de recuperação</Button>
          <span style={{ textAlign: "center", color: sent ? "var(--ink-1)" : "var(--ink-3)", font: "var(--type-meta)" }}>
            {sent ? "Link enviado. Confira sua caixa de entrada." : "Se houver uma conta com este e-mail, você receberá as instruções."}
          </span>
          <TextLink style={{ justifySelf: "center" }} onClick={() => go("Entrar")}>Lembrei minha senha</TextLink>
        </div>
        <Divider inset={10} style={{ width: "100%", maxWidth: 700 }} />
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 60px minmax(0,1fr)", alignItems: "center", gap: 10, width: "100%", maxWidth: 700 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ display: "grid", placeItems: "center", width: 56, height: 56, borderRadius: "var(--r-pill)", border: "1px solid var(--border-default)", flex: "none" }}>
              <Icon name="mail" size={23} style={{ color: "var(--ink-1)" }} />
            </span>
            <span style={{ display: "grid", gap: 4 }}>
              <span style={{ color: "var(--ink-0)", font: "var(--fw-medium) var(--fs-body)/1.2 var(--font-ui)" }}>1. Receba o link</span>
              <span style={{ color: "var(--ink-3)", font: "var(--type-meta)" }}>Enviamos por e-mail.</span>
            </span>
          </span>
          <Icon name="arrow-right" size={22} style={{ color: "var(--ink-2)", justifySelf: "center" }} />
          <span style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ display: "grid", placeItems: "center", width: 56, height: 56, borderRadius: "var(--r-pill)", border: "1px solid var(--border-default)", flex: "none" }}>
              <Icon name="lock" size={23} style={{ color: "var(--ink-1)" }} />
            </span>
            <span style={{ display: "grid", gap: 4 }}>
              <span style={{ color: "var(--ink-0)", font: "var(--fw-medium) var(--fs-body)/1.2 var(--font-ui)" }}>2. Crie uma nova senha</span>
              <span style={{ color: "var(--ink-3)", font: "var(--type-meta)" }}>Defina sua nova senha.</span>
            </span>
          </span>
        </div>
        <span style={{ color: "var(--ink-2)", font: "var(--type-body)" }}>Depois, você volta ao seu espaço.</span>
      </div>
      <footer style={{ display: "flex", alignItems: "center", gap: 16, padding: "18px 34px 26px", color: "var(--ink-3)", font: "var(--type-meta)" }}>
        <Logo size={15} wordmark={false} /><span>move work forward.</span>
      </footer>
    </div>
  );
}
