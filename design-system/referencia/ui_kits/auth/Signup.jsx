function Signup({ go }) {
  const [path, setPath] = React.useState("Para minha equipe");
  const steps = [
    ["Crie seu espaço", "Configure sua organização em poucos passos."],
    ["Organize projetos e rotinas", "Estruture o trabalho da sua equipe."],
    ["Convide sua equipe", "Traga as pessoas e comece a colaborar."],
  ];
  return (
    <div style={{ display: "grid", gridTemplateRows: "auto 1fr auto", minHeight: "100vh" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 30px" }}>
        <Logo size={20} />
        <Button variant="ghost" iconRight={<Icon name="arrow-right" size={17} />} onClick={() => go("Entrar")}>Já tenho conta</Button>
      </header>
      <div style={{ display: "grid", gap: 34, padding: "26px 60px 40px", justifyItems: "center", alignContent: "start" }}>
        <div style={{ display: "grid", gap: 10, justifyItems: "center", textAlign: "center" }}>
          <h1 style={{ font: "var(--fw-bold) 46px/1.06 var(--font-display)", letterSpacing: "-.026em", color: "var(--ink-0)" }}>Como você quer começar?</h1>
          <span style={{ color: "var(--ink-2)", font: "var(--fw-regular) var(--fs-body-lg)/1.4 var(--font-ui)" }}>Um login. Seus espaços de trabalho.</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 22, width: "100%", maxWidth: 1330 }}>
          <RadioCard name="path" checked={path === "Para minha equipe"} onChange={() => setPath("Para minha equipe")}
            icon={<Icon name="users" size={26} />} title="Para minha equipe" description="Crie o espaço da sua organização." />
          <RadioCard name="path" checked={path === "Só para mim"} onChange={() => setPath("Só para mim")}
            icon={<Icon name="user" size={26} />} title="Só para mim" description="Organize seus projetos e rotinas." />
          <RadioCard name="path" checked={path === "Tenho um convite"} onChange={() => setPath("Tenho um convite")}
            icon={<Icon name="mail" size={26} />} title="Tenho um convite" description="Entre com um código de 6 letras." />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.25fr) minmax(0,1fr)", gap: 48, width: "100%", maxWidth: 1330, paddingTop: 14 }}>
          <div style={{ display: "grid", gap: 20 }}>
            <h2 style={{ font: "var(--type-h2)", letterSpacing: "var(--ls-h2)", color: "var(--ink-0)" }}>
              {path === "Tenho um convite" ? "Entre com seu convite" : "Crie seu espaço"}
            </h2>
            {path === "Tenho um convite" ? (
              <>
                <Field label="Código do convite"><Input size="lg" placeholder="MVKQRT" style={{ maxWidth: 320 }} /></Field>
                <Field label="Seu nome"><Input size="lg" placeholder="Como podemos chamar você?" /></Field>
              </>
            ) : (
              <>
                <Field label="Seu nome"><Input size="lg" placeholder="Como podemos chamar você?" /></Field>
                {path === "Para minha equipe" && <Field label="Nome da organização"><Input size="lg" placeholder="Nome da sua equipe" /></Field>}
              </>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }}>
              <Field label="E-mail"><Input size="lg" placeholder="voce@empresa.com" /></Field>
              <Field label="Senha"><Input size="lg" type="password" revealable defaultValue="senha1234" /></Field>
            </div>
            <div style={{ display: "flex", gap: 14, paddingTop: 6 }}>
              <Button variant="secondary" shape="rounded" onClick={() => go("Entrar")}>Voltar</Button>
              <Button shape="rounded" iconRight={<Icon name="arrow-right" size={17} />}>
                {path === "Tenho um convite" ? "Entrar no espaço" : "Criar espaço"}
              </Button>
            </div>
          </div>
          <div style={{ display: "grid", gap: 22, paddingLeft: 48, borderLeft: "1px solid var(--border-hairline)", alignContent: "start" }}>
            <h3 style={{ font: "var(--type-h3)", letterSpacing: "var(--ls-h3)", color: "var(--ink-0)" }}>Comece e avance juntos</h3>
            {steps.map(([t, d], i) => (
              <div key={t} style={{ display: "grid", gridTemplateColumns: "34px minmax(0,1fr)", gap: 16, alignItems: "start" }}>
                <span style={{ display: "grid", placeItems: "center", width: 34, height: 34, borderRadius: "var(--r-pill)", background: "var(--n-800)", color: "var(--ink-1)", font: "var(--fw-semibold) 15px/1 var(--font-ui)" }}>{i + 1}</span>
                <span style={{ display: "grid", gap: 4 }}>
                  <span style={{ color: "var(--ink-0)", font: "var(--fw-medium) var(--fs-body)/1.3 var(--font-ui)" }}>{t}</span>
                  <span style={{ color: "var(--ink-2)", font: "var(--type-meta)" }}>{d}</span>
                </span>
              </div>
            ))}
            <Divider inset={4} />
            <div style={{ display: "grid", gridTemplateColumns: "34px minmax(0,1fr)", gap: 16, alignItems: "start" }}>
              <Icon name="users" size={26} style={{ color: "var(--ink-1)" }} />
              <span style={{ color: "var(--ink-2)", font: "var(--type-body)" }}>Você poderá acessar outros espaços com o mesmo login.</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "34px minmax(0,1fr)", gap: 16, alignItems: "start" }}>
              <Icon name="mail" size={26} style={{ color: "var(--ink-1)" }} />
              <span style={{ color: "var(--ink-2)", font: "var(--type-body)" }}>Com convite, o papel e a área vêm definidos por quem convidou.</span>
            </div>
          </div>
        </div>
      </div>
      <footer style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, padding: "18px 0 26px", color: "var(--ink-3)", font: "var(--type-meta)" }}>
        <Logo size={15} /><span>move work forward.</span>
      </footer>
    </div>
  );
}
