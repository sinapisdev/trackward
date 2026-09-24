import { NextResponse, type NextRequest } from 'next/server'
import { clienteServidor } from '@/lib/supabase/servidor'
import type { EmailOtpType } from '@supabase/supabase-js'

/**
 * A porta do link que chega por e-mail: abre a sessão e segue para a tela pedida.
 *
 * O Supabase manda esse link de três jeitos diferentes, e qual deles depende de
 * configuração que mora fora daqui. Aceitar os três é o que faz o link
 * funcionar sem alguém precisar acertar template de e-mail no painel:
 *
 *   ?code=            fluxo PKCE. Exige que o NAVEGADOR que abriu o link seja o
 *                     mesmo que pediu o e-mail, porque metade da chave ficou
 *                     num cookie dele. Pedir no computador e abrir no celular
 *                     cai aqui, e falha.
 *   ?token_hash=&type= verificação direta. Não depende de cookie nenhum, então
 *                     atravessa aparelho e navegador. É o caminho bom.
 *   #access_token=    fluxo antigo, com a sessão no pedaço da URL depois do
 *                     "#". O servidor NUNCA vê isso: o navegador não manda o
 *                     fragmento. Quem resolve é a tela, em /auth/abrir.
 *
 * E quando nada disso dá certo, o motivo vai junto na volta. Mandar todo mundo
 * para uma tela de login sem dizer por quê é o que transforma um problema de
 * cinco minutos numa tarde perdida.
 */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl
  const proximo = searchParams.get('proximo') || '/'
  const code = searchParams.get('code')
  const hash = searchParams.get('token_hash')
  const tipo = searchParams.get('type') as EmailOtpType | null

  const volta = (porque: string) =>
    NextResponse.redirect(`${origin}/entrar?erro=link&porque=${porque}`)

  // O próprio Supabase pode devolver o erro dele na volta.
  const erroDele = searchParams.get('error_description') || searchParams.get('error')
  if (erroDele) return volta(erroDele.includes('expired') ? 'vencido' : 'recusado')

  // Servidor mal configurado não pode virar tela branca de erro: quem clicou no
  // link não tem como saber que o problema é de ambiente, e uma tela em branco
  // não dá nem a chance de pedir outro link.
  try {
    if (hash && tipo) {
      const sb = await clienteServidor()
      const { error } = await sb.auth.verifyOtp({ token_hash: hash, type: tipo })
      if (!error) return NextResponse.redirect(`${origin}${proximo}`)
      return volta(/expired|invalid/i.test(error.message) ? 'vencido' : 'recusado')
    }

    if (code) {
      const sb = await clienteServidor()
      const { error } = await sb.auth.exchangeCodeForSession(code)
      if (!error) return NextResponse.redirect(`${origin}${proximo}`)
      // Sem o cookie da metade da chave, a troca falha e a mensagem do Supabase
      // fala de "code verifier", que não quer dizer nada para quem só quis
      // trocar a senha. A tradução acontece na tela de entrada.
      return volta(/verifier|challenge/i.test(error.message) ? 'outro-aparelho' : 'recusado')
    }
  } catch (e) {
    console.error('Link de e-mail não pôde ser conferido:', e)
    return volta('servidor')
  }

  // Sem nada na querystring: ou o link veio com a sessão no fragmento, e aí só
  // a tela enxerga, ou veio vazio mesmo. A tela decide, e ela sabe ler o "#".
  return NextResponse.redirect(`${origin}/auth/abrir?proximo=${encodeURIComponent(proximo)}`)
}
