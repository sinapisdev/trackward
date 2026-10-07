import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Abertas para quem está logado e para quem não está.
 *
 * Não é frouxidão: **cada uma destas tem credencial própria**, e a porta da
 * frente aqui só sabe perguntar por sessão. Quem chega nelas não tem sessão
 * nem deveria ter, e mandá-lo para a tela de entrar transforma a recusa num
 * redirecionamento que ninguém consegue depurar, porque nada falha: a chamada
 * responde 307 e a coisa simplesmente nunca acontece.
 *
 * - `/auth`          o link do e-mail cai aqui para trocar o código por sessão.
 * - `/feedback`      a página que o cliente abre pelo link. Ela não tem conta,
 *                    e é esse o ponto: pedir cadastro para dizer se gostou é o
 *                    jeito mais eficiente de nunca saber.
 * - `/api/feedback`  o outro lado da mesma página. O token é a credencial.
 * - `/api/avisar`    o relógio, que confere o próprio segredo antes de tudo.
 * - `/api/pulso`     idem.
 * - `/api/whats`     o webhook do WhatsApp, que confere a assinatura da Twilio
 *                    ou o segredo na url. Quem chega nele é gente de fora, e
 *                    de fora não existe sessão nem nunca vai existir.
 */
// `/convite` entra aqui porque ele atende os DOIS casos, e um deles é de quem
// não tem conta: barrá-lo mandaria a pessoa para `/entrar` sem o código, que é
// o convite chegando vazio. Quem decide o que fazer com a sessão é a página.
const ABERTAS = ['/auth', '/feedback', '/api/feedback', '/api/avisar', '/api/pulso', '/api/whats',
  '/convite']
/** Só faz sentido para quem ainda não entrou. */
const SO_DESLOGADO = ['/entrar']

/**
 * Renova a sessão a cada navegação e barra quem não está logado.
 * A proteção dos dados em si é do banco (RLS); isto aqui é só a porta da frente.
 */
export async function proxy(req: NextRequest) {
  let res = NextResponse.next({ request: req })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !chave) return res
  // Modo demonstração ligado na mão: não existe sessão para renovar.
  if (process.env.NEXT_PUBLIC_MODO === 'local') return res

  /**
   * O endereço tem que ser o da API, `https://<ref>.supabase.co`, e não a
   * string de conexão do Postgres, que é o que o painel do Supabase mostra
   * primeiro e é fácil de copiar por engano.
   *
   * Sem esta conferência, o cliente estoura aqui dentro e o Next devolve 500 em
   * TODA página, sem dizer o que aconteceu: a tela fica branca e o erro real
   * mora no terminal, que é justamente onde quem está configurando não olha.
   */
  if (!/^https?:\/\//.test(url)) {
    console.error(
      'NEXT_PUBLIC_SUPABASE_URL não é um endereço http. '
      + 'Use a Project URL (https://<ref>.supabase.co), não a string de conexão do banco. '
      + 'Enquanto isso, a porta da frente fica aberta e quem barra é o banco.',
    )
    return res
  }

  const supabase = createServerClient(url, chave, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll(lista) {
        lista.forEach(({ name, value }) => req.cookies.set(name, value))
        res = NextResponse.next({ request: req })
        lista.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
      },
    },
  })

  /**
   * `getClaims()` e não `getUser()`, e a diferença é um segundo por clique.
   *
   * `getUser()` vai à REDE a cada chamada, para o servidor de autenticação
   * dizer se o token vale. Isso roda aqui em TODA navegação, e o layout
   * perguntava outras três vezes: eram quatro idas em fila ao banco antes de
   * qualquer coisa aparecer. Medido em 05/10/2026, com a régua do `?medir=1`:
   * cada pedido de rota levava de 600 a 1000ms, e o Supabase respondia em 461ms
   * no pior caso. O tempo não estava no banco, estava em ir até ele quatro
   * vezes.
   *
   * `getClaims()` faz o mesmo trabalho sem sair: ele pega a sessão (renovando
   * quando vencida, como antes) e CONFERE A ASSINATURA aqui mesmo, com a chave
   * pública do projeto, que é buscada uma vez e fica guardada. Não é afrouxar a
   * trava: é parar de perguntar ao outro lado do mundo uma coisa que dá para
   * conferir na mão.
   */
  const { data: cl, error: erroCl } = await supabase.auth.getClaims()
  /**
   * Se a conferência local falhar, pergunta do jeito antigo.
   *
   * `getClaims()` depende de buscar a chave pública do projeto uma vez. Num dia
   * em que isso falhar, sem esta volta atrás TODO MUNDO cairia na tela de
   * entrar, inclusive quem está com sessão boa, e ninguém entenderia por quê.
   * Erro de verificação é diferente de não ter sessão, e só o primeiro merece
   * uma segunda pergunta.
   */
  const claims = erroCl
    ? (await supabase.auth.getUser()).data.user
    : (cl?.claims ? { id: String(cl.claims.sub || '') } : null)
  const user = claims
  const caminho = req.nextUrl.pathname

  if (ABERTAS.some((p) => caminho.startsWith(p))) return res

  const soDeslogado = SO_DESLOGADO.some((p) => caminho.startsWith(p))

  if (!user && !soDeslogado) {
    const destino = req.nextUrl.clone()
    destino.pathname = '/entrar'
    destino.search = ''
    destino.searchParams.set('de', caminho)
    return NextResponse.redirect(destino)
  }
  if (user && soDeslogado) {
    const destino = req.nextUrl.clone()
    destino.pathname = '/'
    destino.search = ''
    return NextResponse.redirect(destino)
  }
  return res
}

// `config` é nome exigido pelo Next para o filtro de rotas. Não renomear.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icone.svg|.*\\.(?:png|jpg|svg)$).*)'],
}
