import { NextResponse, type NextRequest } from 'next/server'
import { clienteServidor } from '@/lib/supabase/servidor'

/** Recebe o link enviado por e-mail, abre a sessão e segue para a tela pedida. */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl
  const code = searchParams.get('code')
  const proximo = searchParams.get('proximo') || '/'

  if (code) {
    const sb = await clienteServidor()
    const { error } = await sb.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${proximo}`)
  }
  return NextResponse.redirect(`${origin}/entrar?erro=link`)
}
