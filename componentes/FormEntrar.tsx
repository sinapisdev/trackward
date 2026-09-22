'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/browser'
import { Ic } from './Icones'

type Modo = 'entrar' | 'escolher' | 'criar' | 'esqueci'
/** Os dois jeitos de a conta nascer. Ver novo_usuario() em supabase/schema.sql. */
type Jeito = 'equipe' | 'convite'

const ESCOLHAS: {
  id: Jeito; titulo: string; resumo: string; passos: [string, string][]
}[] = [
  {
    id: 'equipe',
    titulo: 'Para minha equipe',
    resumo: 'Crie o espaço da sua organização.',
    passos: [
      ['Crie seu espaço', 'Configure sua organização em poucos passos.'],
      ['Organize projetos e rotinas', 'Estruture o trabalho da sua equipe.'],
      ['Convide sua equipe', 'Traga as pessoas e comece a colaborar.'],
    ],
  },
  {
    id: 'convite',
    titulo: 'Tenho um convite',
    resumo: 'Entre com um código de 6 letras.',
    passos: [
      ['Use o código', 'Quem convidou mandou um código de 6 letras.'],
      ['Entre já liberado', 'Sem esperar aprovação de ninguém.'],
      ['Seu lugar já vem pronto', 'Papel, área e a quem você responde.'],
    ],
  },
]

function Formulario() {
  const router = useRouter()
  const params = useSearchParams()
  const [modo, setModo] = useState<Modo>('entrar')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [convite, setConvite] = useState('')
  const [jeito, setJeito] = useState<Jeito>('equipe')
  const [empresa, setEmpresa] = useState('')
  const [erro, setErro] = useState('')
  const [ok, setOk] = useState('')
  const [indo, setIndo] = useState(false)

  const traduzir = (m: string) => {
    if (/Invalid login credentials/i.test(m)) return 'E-mail ou senha não conferem.'
    if (/Email not confirmed/i.test(m)) return 'Confirme o e-mail pelo link que enviamos antes de entrar.'
    if (/User already registered/i.test(m)) return 'Este e-mail já tem cadastro. Use "entrar".'
    if (/at least 6 characters|Password should be/i.test(m)) return 'A senha precisa de pelo menos 6 caracteres.'
    if (/rate limit|too many/i.test(m)) return 'Muitas tentativas seguidas. Espere um minuto e tente de novo.'
    return m
  }

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro(''); setOk(''); setIndo(true)
    const sb = supabase()
    try {
      if (modo === 'esqueci') {
        const { error } = await sb.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${location.origin}/auth/confirmar?proximo=/nova-senha`,
        })
        if (error) throw error
        setOk('Link enviado. Confira seu e-mail para escolher uma senha nova.')
        return
      }
      if (modo === 'criar') {
        if (!nome.trim()) { setErro('Diga seu nome, é assim que as pessoas vão te reconhecer.'); return }
        if (jeito === 'equipe' && !empresa.trim()) { setErro('Diga o nome da empresa.'); return }
        if (jeito === 'convite' && !convite.trim()) { setErro('Cole o código que te mandaram.'); return }
        const { data, error } = await sb.auth.signUp({
          email: email.trim(),
          password: senha,
          options: {
            data: {
              nome: nome.trim(),
              // Um campo por jeito. O banco decide o resto, e o papel nunca vem daqui.
              ...(jeito === 'convite' ? { convite: convite.trim().toUpperCase() } : {}),
              ...(jeito === 'equipe' ? { organizacao: empresa.trim() } : {}),
            },
          },
        })
        if (error) throw error
        // Com a confirmação de e-mail ligada, o Supabase não acusa e-mail repetido:
        // devolve um usuário sem identidade nenhuma e sem sessão, para não contar a
        // estranhos quem tem conta aqui. Sem esta checagem o app mandava a pessoa
        // esperar um e-mail que nunca sai.
        if (data.user && (data.user.identities?.length ?? 0) === 0) {
          setErro('Este e-mail já tem cadastro. Use "entrar", ou recupere a senha.')
          setModo('entrar')
          return
        }
        if (!data.session) {
          setOk('Cadastro criado. Confirme o e-mail pelo link que enviamos e depois entre por aqui.')
          setModo('entrar')
          return
        }
      } else {
        const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password: senha })
        if (error) throw error
      }
      const destino = params.get('de') || '/'
      router.push(destino)
      router.refresh()
    } catch (e) {
      setErro(traduzir((e as { message?: string }).message || 'Não foi possível continuar.'))
    } finally {
      setIndo(false)
    }
  }

  /** O olho da senha: quem digita errado precisa poder conferir. */
  const [vendo, setVendo] = useState(false)

  /* --------------------------------------------------------------- entrar */
  if (modo === 'entrar' || modo === 'esqueci') {
    const recuperando = modo === 'esqueci'
    return (
      <div className={`ent ${recuperando ? 'so-um' : ''}`}>
        {!recuperando && (
          <section className="ent-arte">
            <span className="ent-marca"><Ic.logo /><b>TrackWard</b></span>
            <div className="ent-arte-miolo">
              <h2>move work<br />forward.</h2>
              <p>Projetos, rotinas e pessoas em movimento.</p>
              <ol className="ent-trilho">
                {['Preparar', 'Executar', 'Validar', 'Concluir'].map((n, k) => (
                  <li key={n} className={k === 0 ? 'feita' : k === 1 ? 'vez' : ''}>
                    <span className="m">{k === 0 ? <Ic.check /> : null}</span>
                    <small>{n}</small>
                  </li>
                ))}
              </ol>
            </div>
            <span className="ent-pe"><b>TrackWard</b> move work forward.</span>
          </section>
        )}

        <section className="ent-form">
          {recuperando && (
            <>
              <span className="ent-marca alto"><Ic.logo /><b>TrackWard</b></span>
              <button className="ent-voltar" onClick={() => { setModo('entrar'); setErro(''); setOk('') }}>
                <Ic.volta />Voltar para entrar
              </button>
            </>
          )}
          <div className="ent-miolo">
            {recuperando && <span className="ent-chave"><Ic.lock /></span>}
            <h1>{recuperando ? 'Recuperar acesso' : 'Bem-vindo de volta.'}</h1>
            <p className="ent-sub">
              {recuperando ? 'Receba um link para definir uma nova senha.' : 'Entre para acessar seu espaço.'}
            </p>

            {erro && <div className="erro"><Ic.x />{erro}</div>}
            {ok && <div className="ok-box"><Ic.check />{ok}</div>}

            <form onSubmit={enviar}>
              <div className="fld">
                <label htmlFor="a-email">E-mail</label>
                <input className="inp" id="a-email" type="email" required value={email} autoComplete="email"
                  autoFocus placeholder="voce@empresa.com" onChange={(e) => setEmail(e.target.value)} />
              </div>
              {!recuperando && (
                <div className="fld">
                  <label htmlFor="a-senha">Senha</label>
                  <div className="ent-senha">
                    <input className="inp" id="a-senha" type={vendo ? 'text' : 'password'} required
                      value={senha} minLength={6} autoComplete="current-password"
                      onChange={(e) => setSenha(e.target.value)} />
                    <button type="button" className="iconbtn" onClick={() => setVendo((v) => !v)}
                      aria-label={vendo ? 'Esconder a senha' : 'Mostrar a senha'}>
                      {vendo ? <Ic.olhoOff /> : <Ic.olho />}
                    </button>
                  </div>
                  <button type="button" className="ent-esqueci"
                    onClick={() => { setModo('esqueci'); setErro(''); setOk('') }}>Esqueci minha senha</button>
                </div>
              )}
              <button className="btn pri larga" type="submit" disabled={indo}>
                {indo ? 'Um instante...' : recuperando ? 'Enviar link de recuperação' : 'Entrar'}<Ic.seta />
              </button>
            </form>

            {recuperando ? (
              <>
                <p className="hint centro">Se houver uma conta com este e-mail, você receberá as instruções.</p>
                <button className="ent-troca" onClick={() => { setModo('entrar'); setErro(''); setOk('') }}>
                  Lembrei minha senha
                </button>
                <div className="ent-passos">
                  <span><i><Ic.carta /></i><b>1. Receba o link</b><small>Enviamos por e-mail.</small></span>
                  <span className="seta"><Ic.seta /></span>
                  <span><i><Ic.lock /></i><b>2. Crie uma nova senha</b><small>Defina sua nova senha.</small></span>
                </div>
                <p className="hint centro">Depois, você volta ao seu espaço.</p>
              </>
            ) : (
              <p className="ent-troca-linha">
                Ainda não tem conta?{' '}
                <button onClick={() => { setModo('escolher'); setErro(''); setOk('') }}>Criar conta</button>
              </p>
            )}
          </div>
        </section>
      </div>
    )
  }

  /* ----------------------------------------------------------- criar conta */
  const escolha = ESCOLHAS.find((x) => x.id === jeito)!
  return (
    <div className="ent-criar">
      <header>
        <span className="ent-marca"><Ic.logo /><b>TrackWard</b></span>
        <button onClick={() => { setModo('entrar'); setErro(''); setOk('') }}>Já tenho conta <Ic.seta /></button>
      </header>

      <h1>Como você quer começar?</h1>
      <p className="ent-sub centro">Um login. Seus espaços de trabalho.</p>

      <div className="ent-jeitos" role="radiogroup" aria-label="Como você quer começar">
        {ESCOLHAS.map((x) => (
          <button key={x.id} role="radio" aria-checked={jeito === x.id}
            className={`ent-jeito ${jeito === x.id ? 'on' : ''}`}
            onClick={() => { setJeito(x.id); setModo('criar'); setErro(''); setOk('') }}>
            <span className="ic">{x.id === 'equipe' ? <Ic.team /> : <Ic.carta />}</span>
            <span className="txt"><b>{x.titulo}</b><small>{x.resumo}</small></span>
            <span className="radio" aria-hidden />
          </button>
        ))}
      </div>

      <div className="ent-duas">
          <div>
            <h2>{jeito === 'equipe' ? 'Crie seu espaço' : 'Entre com o convite'}</h2>
            {erro && <div className="erro"><Ic.x />{erro}</div>}
            {ok && <div className="ok-box"><Ic.check />{ok}</div>}

            <form onSubmit={enviar}>
              <div className="fld">
                <label htmlFor="a-nome">Seu nome</label>
                <input className="inp" id="a-nome" value={nome} autoFocus placeholder="Como podemos chamar você?"
                  onChange={(e) => setNome(e.target.value)} />
              </div>
              {jeito === 'equipe' ? (
                <div className="fld">
                  <label htmlFor="a-empresa">Nome da organização</label>
                  <input className="inp" id="a-empresa" value={empresa} placeholder="Nome da sua equipe"
                    onChange={(e) => setEmpresa(e.target.value)} />
                </div>
              ) : (
                <div className="fld">
                  <label htmlFor="a-convite">Código do convite</label>
                  <input className="inp" id="a-convite" value={convite} placeholder="Ex.: ENG7K2"
                    autoCapitalize="characters" spellCheck={false}
                    onChange={(e) => setConvite(e.target.value.toUpperCase())} />
                </div>
              )}
              <div className="ent-par">
                <div className="fld">
                  <label htmlFor="a-email">E-mail</label>
                  <input className="inp" id="a-email" type="email" required value={email}
                    autoComplete="email" placeholder="voce@empresa.com"
                    onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="fld">
                  <label htmlFor="a-senha2">Senha</label>
                  <div className="ent-senha">
                    <input className="inp" id="a-senha2" type={vendo ? 'text' : 'password'} required
                      value={senha} minLength={6} autoComplete="new-password"
                      onChange={(e) => setSenha(e.target.value)} />
                    <button type="button" className="iconbtn" onClick={() => setVendo((v) => !v)}
                      aria-label={vendo ? 'Esconder a senha' : 'Mostrar a senha'}>
                      {vendo ? <Ic.olhoOff /> : <Ic.olho />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="ent-acoes">
                <button type="button" className="btn"
                  onClick={() => { setModo('escolher'); setErro(''); setOk('') }}>Voltar</button>
                <button className="btn pri" type="submit" disabled={indo}>
                  {indo ? 'Um instante...' : jeito === 'equipe' ? 'Criar espaço' : 'Entrar na empresa'}<Ic.seta />
                </button>
              </div>
            </form>
          </div>

          <aside className="ent-lado">
            <h3>{jeito === 'equipe' ? 'Comece e avance juntos' : 'O convite já traz tudo'}</h3>
            <ol>
              {escolha.passos.map((t, k) => (
                <li key={k}><span className="n num">{k + 1}</span><span><b>{t[0]}</b><small>{t[1]}</small></span></li>
              ))}
            </ol>
            <div className="ent-lado-notas">
              <p><Ic.team />Você poderá acessar outros espaços com o mesmo login.</p>
              <p><Ic.carta />Com convite, o papel e a área vêm definidos por quem convidou.</p>
            </div>
          </aside>
      </div>

      <footer><b>TrackWard</b> move work forward.</footer>
    </div>
  )
}

export function FormEntrar() {
  return (
    <Suspense fallback={<div className="auth"><div className="auth-card">Carregando…</div></div>}>
      <Formulario />
    </Suspense>
  )
}
