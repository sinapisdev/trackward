'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/browser'
import { Ic } from './Icones'
import { confere, normaliza, palpite, PORQUE, escrito, type Recusa } from '@/lib/apelido'
import { paraE164, foneEscrito } from '@/lib/fone'

type Modo = 'entrar' | 'escolher' | 'criar' | 'esqueci'
/** Os três jeitos de a conta nascer. Ver novo_usuario() em supabase/schema.sql. */
type Jeito = 'equipe' | 'pessoal' | 'convite'

/**
 * A escolha do cadastro, e o que cada uma muda na tela.
 *
 * Os textos moram aqui, e não em ternário no meio do JSX: eram dois jeitos e
 * cada rótulo virava um `a ? b : c`; com três, isso vira um encadeado que
 * ninguém lê. Ver "Dois workspaces" no AGENTS.md.
 */
const ESCOLHAS: {
  id: Jeito; titulo: string; resumo: string
  /** O título do formulário, o do lado direito e o texto do botão. */
  forma: string; lado: string; acao: string
  passos: [string, string][]
}[] = [
  {
    id: 'equipe',
    titulo: 'Para minha equipe',
    resumo: 'Crie o espaço da sua organização.',
    forma: 'Crie seu espaço', lado: 'Comece e avance juntos', acao: 'Criar espaço',
    passos: [
      ['Organize projetos e rotinas', 'Estruture o trabalho da sua equipe.'],
      ['Convide sua equipe', 'Traga as pessoas e comece a colaborar.'],
      /* Desde a seção 70 o pessoal nasce nos TRÊS caminhos, e não só em "só
         para mim". É ganho real e passou a ser verdade: a agenda, a fila e a
         carga da pessoa precisam de um lugar que seja dela. */
      ['Seu espaço pessoal vem junto', 'Suas notas e a sua agenda, ao lado da empresa.'],
    ],
  },
  {
    id: 'pessoal',
    titulo: 'Só para mim',
    resumo: 'Seu espaço, sem equipe e sem convite.',
    forma: 'Crie seu espaço pessoal', lado: 'O app inteiro, para uma pessoa',
    acao: 'Criar meu espaço',
    passos: [
      ['Guarde o que aparece', 'Notas, tarefas e compromissos no mesmo lugar.'],
      ['Ponha as rotinas para andar', 'O que se repete volta sozinho, com prazo.'],
      ['Ninguém entra aqui', 'O espaço é seu, e continua seu se você entrar numa empresa.'],
    ],
  },
  {
    id: 'convite',
    titulo: 'Tenho um convite',
    resumo: 'Recebeu um link ou um código de 6 letras.',
    forma: 'Entre com o convite', lado: 'O convite já traz tudo', acao: 'Entrar na empresa',
    passos: [
      /* O caminho normal é o link, que pula estes cartões e já traz o código
         dentro. Quem chega aqui recebeu o código por fora: lido no telefone,
         num recado repassado. Por isso o passo 1 fala das duas formas. */
      ['Pelo link, é um toque', 'Pelo código, são seis letras. Os dois levam ao mesmo lugar.'],
      ['Entre já liberado', 'Sem esperar aprovação de ninguém.'],
      ['Seu espaço pessoal vem junto', 'Fica ao lado da empresa, com o mesmo login.'],
    ],
  },
]

function Formulario() {
  const router = useRouter()
  const params = useSearchParams()
  /**
   * O código que veio no endereço, de `/convite/<codigo>`.
   *
   * Com ele, a tela não pergunta "como você quer começar?": a pessoa já
   * respondeu isso ao abrir um link que alguém mandou para ela. Perguntar de
   * novo é oferecer a quem foi convidado a chance de abrir uma empresa por
   * engano, que é o erro mais caro possível aqui: ela entra, não acha ninguém
   * conhecido, e conclui que o app está vazio.
   */
  const doLinkConvite = (params.get('c') || '').trim().toUpperCase()
  const [modo, setModo] = useState<Modo>(doLinkConvite ? 'criar' : 'entrar')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [convite, setConvite] = useState(doLinkConvite)
  const [apelido, setApelido] = useState('')
  /**
   * A entrada por telefone, que é a que a pessoa espera de um app de hoje.
   *
   * `porFone` decide se a tela pede número ou e-mail, e `codigo` só existe
   * depois de o SMS sair: enquanto ele é vazio, a tela pede o número; com ele
   * em aberto, pede os seis dígitos. Uma tela só com dois estados, em vez de
   * duas rotas, porque é um gesto só do ponto de vista de quem usa.
   */
  const [porFone, setPorFone] = useState(true)
  const [fone, setFone] = useState('')
  const [codigo, setCodigo] = useState('')
  const [esperandoCodigo, setEsperandoCodigo] = useState(false)
  const [reenviarEm, setReenviarEm] = useState(0)
  /**
   * O que o banco respondeu sobre o @, e se ele ainda está respondendo.
   *
   * A conferência é em DUAS camadas, e as duas são necessárias. `confere()` em
   * `lib/apelido.ts` responde na tecla, sem ida à rede, e cobre formato e
   * tamanho; `apelido_livre` responde se está tomado e se é reservado, que são
   * as duas coisas que só o banco sabe. A segunda é esperada meio segundo
   * depois da última tecla: perguntar a cada letra é uma ida por caractere.
   */
  const [doBanco, setDoBanco] = useState<string | null>(null)
  const [conferindo, setConferindo] = useState(false)
  const [mexeuNoApelido, setMexeuNoApelido] = useState(false)
  const [jeito, setJeito] = useState<Jeito>(doLinkConvite ? 'convite' : 'equipe')
  const [empresa, setEmpresa] = useState('')
  const [erro, setErro] = useState('')
  const [ok, setOk] = useState('')
  const [indo, setIndo] = useState(false)

  /**
   * O link do e-mail não funcionou, e por quê.
   *
   * Cair na tela de entrada sem explicação é o pior fim possível para quem só
   * queria trocar a senha: a pessoa tenta de novo, cai no mesmo lugar, e
   * conclui que o app está quebrado. Cada motivo aqui tem uma saída diferente,
   * e é a saída que a frase precisa dizer.
   */
  const doLink = params.get('erro') === 'link' ? {
    vencido: 'Esse link já venceu, ou já tinha sido usado. Peça outro aqui embaixo, '
      + 'em "esqueci a senha", e abra dentro de uma hora.',
    'outro-aparelho': 'Esse link precisa ser aberto no mesmo navegador em que você '
      + 'pediu a troca. Peça de novo aqui, e clique no link a partir deste aparelho.',
    vazio: 'O link chegou incompleto. Pode ter sido o e-mail cortando o endereço: '
      + 'peça outro e, se puder, copie e cole o endereço inteiro na barra do navegador.',
    recusado: 'O link não foi aceito. Peça outro em "esqueci a senha".',
    servidor: 'O servidor não conseguiu conferir o link agora. Tente de novo em um minuto; '
      + 'se insistir, é configuração do app, e não a sua senha.',
  }[params.get('porque') || 'recusado'] || 'O link não foi aceito. Peça outro em "esqueci a senha".'
    : ''

  const traduzir = (m: string) => {
    if (/Invalid login credentials/i.test(m)) return 'E-mail ou senha não conferem.'
    if (/Email not confirmed/i.test(m)) return 'Confirme o e-mail pelo link que enviamos antes de entrar.'
    if (/User already registered/i.test(m)) return 'Este e-mail já tem cadastro. Use "entrar".'
    if (/at least 6 characters|Password should be/i.test(m)) return 'A senha precisa de pelo menos 6 caracteres.'
    if (/rate limit|too many/i.test(m)) return 'Muitas tentativas seguidas. Espere um minuto e tente de novo.'
    /* As do telefone. A Twilio e o Supabase falam inglês e falam de API: o que
       chega aqui tem que dizer o que fazer, como as recusas do schema fazem. */
    if (/Token has expired|expired/i.test(m)) return 'Esse código venceu. Peça outro.'
    if (/Token.*invalid|invalid.*token|otp/i.test(m)) return 'Código errado. Confira os seis dígitos.'
    if (/Signups not allowed|User not found|not found/i.test(m)) {
      return 'Não achei conta com esse número. Crie uma conta, é rápido.'
    }
    if (/unverified|21608/i.test(m)) {
      return 'Esse número ainda não está liberado para receber o código. Fale com quem cuida do app.'
    }
    if (/Invalid phone|phone/i.test(m) && /invalid/i.test(m)) return 'Esse número não parece um telefone.'
    if (/already registered|already been registered/i.test(m)) {
      return 'Este número já tem cadastro. Use "entrar".'
    }
    return m
  }

  /**
   * A conta de trás para a frente: o relógio do "reenviar".
   *
   * Sem ele, quem não recebe o SMS aperta de novo três vezes em dez segundos, e
   * cada aperto é uma mensagem paga que também não vai chegar. Trinta segundos
   * é o tempo em que a operadora costuma entregar.
   */
  useEffect(() => {
    if (reenviarEm <= 0) return
    const t = setTimeout(() => setReenviarEm((n) => n - 1), 1000)
    return () => clearTimeout(t)
  }, [reenviarEm])

  /**
   * Manda o código para o número.
   *
   * `shouldCreateUser` é a chave inteira: no CADASTRO ele cria a conta e leva
   * junto nome, @ e a escolha do espaço, porque os metadados só valem no
   * instante em que o login nasce; na ENTRADA ele é falso, senão digitar um
   * número errado criaria uma conta vazia em silêncio em vez de dizer que não
   * achou ninguém.
   */
  const mandarCodigo = async (criando: boolean) => {
    const e164 = paraE164(fone)
    if (!e164) { setErro('Esse número não parece um telefone. Ponha o DDD.'); return false }
    const { error } = await supabase().auth.signInWithOtp({
      phone: e164,
      options: criando
        ? {
            shouldCreateUser: true,
            data: {
              nome: nome.trim(),
              apelido: normaliza(apelido),
              ...(jeito === 'convite' ? { convite: convite.trim().toUpperCase() } : {}),
              ...(jeito === 'equipe' ? { organizacao: empresa.trim() } : {}),
              ...(jeito === 'pessoal' ? { espaco: 'pessoal' } : {}),
            },
          }
        : { shouldCreateUser: false },
    })
    if (error) { setErro(traduzir(error.message)); return false }
    setEsperandoCodigo(true)
    setReenviarEm(30)
    setOk(`Mandei um código por SMS para ${foneEscrito(e164)}.`)
    return true
  }

  /** Confere os seis dígitos e abre a sessão. */
  const conferirCodigo = async () => {
    const e164 = paraE164(fone)
    const { error } = await supabase().auth.verifyOtp({
      phone: e164, token: codigo.replace(/\D/g, ''), type: 'sms',
    })
    if (error) { setErro(traduzir(error.message)); return false }
    return true
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
      /**
       * O caminho do telefone, que é dois passos e não um.
       *
       * Primeiro manda o código, depois confere. A mesma tela faz os dois
       * porque, para quem usa, é um gesto só: pôr o número e provar que é seu.
       */
      if (porFone) {
        if (modo === 'criar') {
          if (!nome.trim()) { setErro('Diga seu nome, é assim que as pessoas vão te reconhecer.'); return }
          if (!apelidoOk) { setErro('Escolha um @ que esteja livre.'); return }
          if (jeito === 'equipe' && !empresa.trim()) { setErro('Diga o nome da empresa.'); return }
          if (jeito === 'convite' && !convite.trim()) { setErro('Cole o código que te mandaram.'); return }
        }
        if (!esperandoCodigo) { await mandarCodigo(modo === 'criar'); return }
        if (!await conferirCodigo()) return
        // Daqui para baixo é o mesmo destino dos outros caminhos.
      } else if (modo === 'criar') {
        if (!nome.trim()) { setErro('Diga seu nome, é assim que as pessoas vão te reconhecer.'); return }
        if (!apelidoOk) { setErro('Escolha um @ que esteja livre.'); return }
        if (jeito === 'equipe' && !empresa.trim()) { setErro('Diga o nome da empresa.'); return }
        // O pessoal não pede mais nada: o espaço é a pessoa, e o nome dele é o
        // nome dela. Pedir "nome da organização" para quem escolheu "só para
        // mim" é devolver a pergunta que ela acabou de responder.
        if (jeito === 'convite' && !convite.trim()) { setErro('Cole o código que te mandaram.'); return }
        const { data, error } = await sb.auth.signUp({
          email: email.trim(),
          password: senha,
          options: {
            data: {
              nome: nome.trim(),
              /* O banco confere de novo e NÃO falha se tiver sido tomado entre
                 o formulário e o clique: `dar_apelido` acrescenta um número. Um
                 @ que virou de outro no meio do caminho não pode impedir
                 alguém de se cadastrar. */
              apelido: normaliza(apelido),
              // Um campo por jeito. O banco decide o resto, e o papel nunca vem daqui.
              ...(jeito === 'convite' ? { convite: convite.trim().toUpperCase() } : {}),
              ...(jeito === 'equipe' ? { organizacao: empresa.trim() } : {}),
              ...(jeito === 'pessoal' ? { espaco: 'pessoal' } : {}),
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
      } else if (!porFone) {
        const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password: senha })
        if (error) throw error
      }
      /**
       * Para onde ir depois, e por que os dois casos do link diferem.
       *
       * Quem chegou pelo link e ENTROU numa conta que já existia volta para o
       * convite, porque é lá que ele é aceito: sem isso, autenticar-se era
       * perder o convite no caminho, já que o código tinha saído do endereço.
       *
       * Quem CRIOU a conta vai para a casa, e não pode voltar: `novo_usuario`
       * já consumiu o convite no mesmo instante em que o perfil nasceu, então
       * a página do link receberia a pessoa com "código inválido ou vencido"
       * logo depois de ele ter funcionado.
       */
      const voltarAoConvite = doLinkConvite && modo !== 'criar'
      const destino = voltarAoConvite ? `/convite/${encodeURIComponent(doLinkConvite)}`
        : params.get('de') || '/'
      router.push(destino)
      router.refresh()
    } catch (e) {
      setErro(traduzir((e as { message?: string }).message || 'Não foi possível continuar.'))
    } finally {
      setIndo(false)
    }
  }

  /**
   * O @ nasce do nome, e é editável.
   *
   * Campo vazio num cadastro é um campo que a pessoa pula ou abandona, e este
   * não dá para pular: o @ não se escolhe depois sem uma segunda conversa.
   * Preenchido, ela vê a FORMA antes de inventar o dela, e quase sempre aceita.
   * Depois que ela mexe, o app não escreve mais por cima: reescrever o que
   * alguém acabou de digitar é o pior que um campo pode fazer.
   */
  useEffect(() => {
    if (mexeuNoApelido) return
    setApelido(palpite(nome))
  }, [nome, mexeuNoApelido])

  /* A segunda camada, meio segundo depois da última tecla. A primeira já
     recusou o que é torto, então só chega aqui o que tem forma de @. */
  useEffect(() => {
    const a = normaliza(apelido)
    setDoBanco(null)
    if (!a || confere(a)) return
    setConferindo(true)
    const t = setTimeout(() => {
      void supabase().rpc('apelido_livre', { p_apelido: a })
        .then(({ data }) => setDoBanco(typeof data === 'string' ? data : null))
        .catch(() => {})
        .finally(() => setConferindo(false))
    }, 500)
    return () => { clearTimeout(t); setConferindo(false) }
  }, [apelido])

  const recusaDoApelido = confere(apelido) || (doBanco as Recusa | 'tomado' | null)
  const apelidoOk = !!normaliza(apelido) && !recusaDoApelido && !conferindo

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
              <p>Objetivos, rotinas e pessoas em movimento.</p>
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

            {!erro && !!doLink && <div className="erro"><Ic.x />{doLink}</div>}
            {erro && <div className="erro"><Ic.x />{erro}</div>}
            {ok && <div className="ok-box"><Ic.check />{ok}</div>}

            {/* Telefone primeiro, e-mail ao lado. É o que a pessoa espera de
                um app de hoje, e é o único que ela não esquece. O e-mail fica
                porque quem já tem conta tem senha. Recuperar senha é assunto
                de e-mail, e ali a escolha não aparece. */}
            {!recuperando && (
              <div className="seg ent-como" role="group" aria-label="Como entrar">
                <button type="button" className={porFone ? 'on' : ''}
                  onClick={() => { setPorFone(true); setErro(''); setOk('') }}>Telefone</button>
                <button type="button" className={!porFone ? 'on' : ''}
                  onClick={() => { setPorFone(false); setErro(''); setOk(''); setEsperandoCodigo(false) }}>
                  E-mail e senha
                </button>
              </div>
            )}

            <form onSubmit={enviar}>
              {porFone && !recuperando ? (
                <>
                  <div className="fld">
                    <label htmlFor="a-fone">Telefone</label>
                    <input className="inp" id="a-fone" type="tel" required value={fone}
                      autoComplete="tel" autoFocus={!esperandoCodigo}
                      disabled={esperandoCodigo}
                      placeholder="42 99978-3288"
                      onChange={(e) => setFone(e.target.value)} />
                    {!esperandoCodigo && (
                      <p className="hint">Mandamos um código por SMS. Não precisa de senha.</p>
                    )}
                  </div>

                  {/* O campo do código só nasce depois de o SMS sair: antes
                      dele, ele seria uma caixa pedindo algo que não existe. */}
                  {esperandoCodigo && (
                    <div className="fld">
                      <label htmlFor="a-codigo">Código de 6 dígitos</label>
                      <input className="inp ent-codigo" id="a-codigo" value={codigo}
                        inputMode="numeric" autoComplete="one-time-code" autoFocus
                        maxLength={6} placeholder="000000"
                        onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))} />
                      <div className="ent-reenviar">
                        <button type="button" disabled={reenviarEm > 0 || indo}
                          onClick={() => { setErro(''); void mandarCodigo(false) }}>
                          {reenviarEm > 0 ? `Reenviar em ${reenviarEm}s` : 'Reenviar o código'}
                        </button>
                        <button type="button" onClick={() => {
                          setEsperandoCodigo(false); setCodigo(''); setErro(''); setOk('')
                        }}>Trocar o número</button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
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
                </>
              )}
              <button className="btn pri larga" type="submit" disabled={indo}>
                {indo ? 'Um instante...'
                  : recuperando ? 'Enviar link de recuperação'
                    : porFone ? (esperandoCodigo ? 'Confirmar e entrar' : 'Mandar o código')
                      : 'Entrar'}<Ic.seta />
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

      {doLinkConvite ? (
        <>
          <h1>Seu convite está pronto</h1>
          <p className="ent-sub centro">
            Diga seu nome e escolha uma senha. O resto já vem com o convite.
          </p>
        </>
      ) : (
        <>
          <h1>Como você quer começar?</h1>
          <p className="ent-sub centro">Um login. Seus espaços de trabalho.</p>

          <div className="ent-jeitos" role="radiogroup" aria-label="Como você quer começar">
            {ESCOLHAS.map((x) => (
              <button key={x.id} role="radio" aria-checked={jeito === x.id}
                className={`ent-jeito ${jeito === x.id ? 'on' : ''}`}
                onClick={() => { setJeito(x.id); setModo('criar'); setErro(''); setOk('') }}>
                <span className="ic">
                  {x.id === 'equipe' ? <Ic.team /> : x.id === 'pessoal' ? <Ic.eu /> : <Ic.carta />}
                </span>
                <span className="txt"><b>{x.titulo}</b><small>{x.resumo}</small></span>
                <span className="radio" aria-hidden />
              </button>
            ))}
          </div>
        </>
      )}

      <div className="ent-duas">
          <div>
            <h2>{doLinkConvite ? 'Falta só você' : escolha.forma}</h2>
            {erro && <div className="erro"><Ic.x />{erro}</div>}
            {ok && <div className="ok-box"><Ic.check />{ok}</div>}

            <form onSubmit={enviar}>
              <div className="fld">
                <label htmlFor="a-nome">Seu nome</label>
                <input className="inp" id="a-nome" value={nome} autoFocus placeholder="Como podemos chamar você?"
                  onChange={(e) => setNome(e.target.value)} />
              </div>
              {/* O @ vem logo depois do nome porque nasce dele: a pessoa vê o
                  palpite se formar enquanto digita, e quase sempre aceita. */}
              <div className="fld">
                <label htmlFor="a-apelido">Seu @</label>
                <div className="ent-apelido">
                  <span aria-hidden>@</span>
                  <input className="inp" id="a-apelido" value={apelido}
                    autoCapitalize="none" autoCorrect="off" spellCheck={false}
                    placeholder="comoteachamam"
                    aria-invalid={!!normaliza(apelido) && !!recusaDoApelido}
                    onChange={(e) => { setMexeuNoApelido(true); setApelido(normaliza(e.target.value)) }} />
                  {apelidoOk && <Ic.check />}
                </div>
                <p className={`hint ${normaliza(apelido) && recusaDoApelido ? 'ruim' : ''}`}>
                  {conferindo ? 'Vendo se está livre...'
                    : !normaliza(apelido) ? 'É assim que as pessoas vão te chamar e te convidar.'
                      : recusaDoApelido === 'tomado' ? 'Esse já tem dono. Escolha outro.'
                        : recusaDoApelido ? PORQUE[recusaDoApelido as Recusa]
                          : `${escrito(normaliza(apelido))} é seu. Dá para trocar depois, em Ajustes.`}
                </p>
              </div>
              {jeito === 'equipe' && (
                <div className="fld">
                  <label htmlFor="a-empresa">Nome da organização</label>
                  <input className="inp" id="a-empresa" value={empresa} placeholder="Nome da sua equipe"
                    onChange={(e) => setEmpresa(e.target.value)} />
                  {/* O convite vence a escolha, e isso é regra escrita: ele foi
                      combinado com alguém, a escolha não. O que estava errado
                      era o SILÊNCIO: quem já tinha convite aberto no e-mail
                      pedia "Construtora da Erika", clicava em criar, e caía
                      como colaboradora dentro de outra empresa, sem a dela
                      existir em lugar nenhum. Dito antes, deixa de ser susto.
                      E é dito aqui, e não conferido: perguntar ao banco se um
                      e-mail tem convite aberto deixaria qualquer um sondar
                      quem foi convidado para onde. */}
                  <p className="hint">
                    Se alguém já te convidou com este e-mail, você entra na empresa de quem
                    convidou em vez de abrir uma nova. A sua você abre depois, pelo seletor
                    de espaços.
                  </p>
                </div>
              )}
              {/* Pelo link, o código é um recibo e não um campo: oferecer uma
                  caixa de texto preenchida convida a pessoa a mexer no que está
                  certo, e o que ela digitar por cima não tem como estar. */}
              {jeito === 'convite' && (doLinkConvite ? (
                <p className="ent-convite-ok">
                  <Ic.check />Convite <b>{doLinkConvite}</b> reconhecido.
                </p>
              ) : (
                <div className="fld">
                  <label htmlFor="a-convite">Código do convite</label>
                  <input className="inp" id="a-convite" value={convite} placeholder="Ex.: ENG7K2"
                    autoCapitalize="characters" spellCheck={false}
                    onChange={(e) => setConvite(e.target.value.toUpperCase())} />
                </div>
              ))}
              {/* Telefone ou e-mail, e a escolha fica embaixo do @ porque é a
                  última coisa que muda: nome e @ são iguais nos dois. */}
              <div className="seg ent-como" role="group" aria-label="Como criar a conta">
                <button type="button" className={porFone ? 'on' : ''}
                  onClick={() => { setPorFone(true); setErro(''); setOk('') }}>Telefone</button>
                <button type="button" className={!porFone ? 'on' : ''}
                  onClick={() => { setPorFone(false); setErro(''); setOk(''); setEsperandoCodigo(false) }}>
                  E-mail e senha
                </button>
              </div>

              {porFone ? (
                <>
                  <div className="fld">
                    <label htmlFor="a-fone2">Telefone</label>
                    <input className="inp" id="a-fone2" type="tel" required value={fone}
                      autoComplete="tel" disabled={esperandoCodigo}
                      placeholder="42 99978-3288"
                      onChange={(e) => setFone(e.target.value)} />
                    {!esperandoCodigo && (
                      <p className="hint">
                        Mandamos um código por SMS. Sem senha para inventar e sem senha para esquecer.
                      </p>
                    )}
                  </div>
                  {esperandoCodigo && (
                    <div className="fld">
                      <label htmlFor="a-codigo2">Código de 6 dígitos</label>
                      <input className="inp ent-codigo" id="a-codigo2" value={codigo}
                        inputMode="numeric" autoComplete="one-time-code" autoFocus
                        maxLength={6} placeholder="000000"
                        onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))} />
                      <div className="ent-reenviar">
                        <button type="button" disabled={reenviarEm > 0 || indo}
                          onClick={() => { setErro(''); void mandarCodigo(true) }}>
                          {reenviarEm > 0 ? `Reenviar em ${reenviarEm}s` : 'Reenviar o código'}
                        </button>
                        <button type="button" onClick={() => {
                          setEsperandoCodigo(false); setCodigo(''); setErro(''); setOk('')
                        }}>Trocar o número</button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
              <div className="ent-par">
                <div className="fld">
                  <label htmlFor="a-email">E-mail</label>
                  {/* Quem escolheu "só para mim" não tem empresa, e o exemplo
                      não pode sugerir que precisa de uma. */}
                  <input className="inp" id="a-email" type="email" required value={email}
                    autoComplete="email"
                    placeholder={jeito === 'pessoal' ? 'voce@email.com' : 'voce@empresa.com'}
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
              )}
              <div className="ent-acoes">
                <button type="button" className="btn"
                  onClick={() => { setModo(doLinkConvite ? 'entrar' : 'escolher'); setErro(''); setOk('') }}>
                  {doLinkConvite ? 'Já tenho conta' : 'Voltar'}
                </button>
                <button className="btn pri" type="submit" disabled={indo}>
                  {indo ? 'Um instante...'
                    : porFone && !esperandoCodigo ? 'Mandar o código'
                      : porFone ? 'Confirmar e entrar'
                        : escolha.acao}<Ic.seta />
                </button>
              </div>
            </form>
          </div>

          <aside className="ent-lado">
            <h3>{escolha.lado}</h3>
            <ol>
              {escolha.passos.map((t, k) => (
                <li key={k}><span className="n num">{k + 1}</span><span><b>{t[0]}</b><small>{t[1]}</small></span></li>
              ))}
            </ol>
            <div className="ent-lado-notas">
              {jeito === 'pessoal' ? (
                <>
                  {/* O que a pessoa precisa saber antes de escolher: aqui não
                      tem canal nem gente, e ela não fica presa a isso. */}
                  <p><Ic.eu />Sem canais, sem equipe e sem ninguém aprovando o seu trabalho.</p>
                  <p><Ic.team />Depois dá para abrir uma empresa ao lado, com o mesmo login.</p>
                </>
              ) : (
                <>
                  <p><Ic.team />Você poderá acessar outros espaços com o mesmo login.</p>
                  <p><Ic.carta />Com convite, o papel vem definido por quem convidou.</p>
                </>
              )}
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
