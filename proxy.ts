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
 */
const ABERTAS = ['/auth', '/feedback', '/api/feedback', '/api/avisar', '/api/pulso']
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

  const { data: { user } } = await supabase.auth.getUser()
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
