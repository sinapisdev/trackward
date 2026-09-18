import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/** Aberta para quem está logado e para quem não está (o link do e-mail cai aqui). */
const ABERTAS = ['/auth']
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

export const org = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icone.svg|.*\\.(?:png|jpg|svg)$).*)'],
}
