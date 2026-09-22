import { NextResponse } from 'next/server'
import { clienteServidor } from '@/lib/supabase/servidor'
import { cifrar, decifrar, dicaDe, podeCifrar } from '@/lib/cifra'

/**
 * Os conectores da empresa: guardar a chave, e usar a chave.
 *
 * Duas coisas acontecem aqui e em nenhum outro lugar, porque as duas envolvem o
 * segredo do cliente:
 *
 *   PUT     recebe a chave em claro, cifra, e guarda só o texto cifrado. A chave
 *           em claro nunca chega ao banco.
 *   POST    faz a chamada ao sistema de fora, decifrando o segredo aqui dentro. O
 *           segredo nunca volta para o navegador em nenhuma resposta.
 *
 * O navegador manda o ID do conector e o caminho, nunca o endereço completo nem a
 * chave. Quem resolve o endereço é o banco, com a identidade de quem pediu: se o
 * navegador escolhesse o endereço, bastaria alterar o pedido para o app falar com
 * qualquer lugar do mundo usando a chave do cliente.
 */

export const runtime = 'nodejs'
export const maxDuration = 20

type Conector = {
  id: string
  nome: string
  base_url: string
  auth_tipo: 'bearer' | 'header' | 'query'
  auth_nome: string
  segredo_cifrado: string
  ativo: boolean
}

/** Endereços que um app não deve alcançar de dentro. Ver /api/webhook. */
function enderecoAceitavel(url: string): boolean {
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:') return false
    const h = u.hostname.toLowerCase()
    if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.internal')) return false
    if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(h)) return false
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return false
    if (h === '[::1]' || h === '::1') return false
    return true
  } catch {
    return false
  }
}

/** Guarda a chave cifrada. O corpo em claro morre nesta função. */
export async function PUT(req: Request) {
  if (!podeCifrar()) {
    return NextResponse.json({
      erro: 'Falta a variável TRACK_SEGREDO no servidor. Sem ela não dá para guardar chave com segurança, e guardar sem segurança não é opção.',
    }, { status: 503 })
  }

  let p: { id?: string; segredo?: string }
  try { p = await req.json() } catch { return NextResponse.json({ erro: 'Corpo inválido.' }, { status: 400 }) }
  if (!p.id || !p.segredo) return NextResponse.json({ erro: 'Falta o conector ou a chave.' }, { status: 400 })

  const sb = await clienteServidor()
  // A política de update decide: o conector pessoal é do dono, o da casa é de
  // admin. Se a pessoa não pode, nenhuma linha é alterada e o erro sai daqui.
  const { error } = await sb.from('conectores').update({
    segredo_cifrado: cifrar(p.segredo),
    dica: dicaDe(p.segredo),
  }).eq('id', p.id)

  if (error) {
    return NextResponse.json({
      erro: 'Este conector não é seu. Conector da empresa é mexido por administrador.',
    }, { status: 403 })
  }
  return NextResponse.json({ ok: true, dica: dicaDe(p.segredo) })
}

/** Faz a chamada. O segredo é decifrado aqui e não sai daqui. */
export async function POST(req: Request) {
  let p: {
    id?: string
    caminho?: string
    metodo?: string
    corpo?: string
    /** Só para o teste de conexão na tela. */
    teste?: boolean
  }
  try { p = await req.json() } catch { return NextResponse.json({ erro: 'Corpo inválido.' }, { status: 400 }) }
  if (!p.id) return NextResponse.json({ erro: 'Falta o conector.' }, { status: 400 })

  const sb = await clienteServidor()
  const { data, error } = await sb
    .from('conectores')
    .select('id,nome,base_url,auth_tipo,auth_nome,segredo_cifrado,ativo')
    .eq('id', p.id)
    .single()

  if (error || !data) return NextResponse.json({ erro: 'Conector não encontrado.' }, { status: 404 })
  const c = data as Conector
  if (!c.ativo) return NextResponse.json({ erro: `O conector ${c.nome} está desligado.` }, { status: 400 })

  const segredo = decifrar(c.segredo_cifrado)
  if (!segredo) {
    return NextResponse.json({
      erro: 'A chave deste conector não abre. Ou ela nunca foi guardada, ou a variável TRACK_SEGREDO mudou desde que ela foi guardada.',
    }, { status: 400 })
  }

  // O caminho vem de fora, o endereço base vem do banco. Assim o pedido não pode
  // trocar o destino, só escolher o caminho dentro daquele serviço.
  const caminho = (p.caminho || '').trim()
  if (caminho.startsWith('http')) {
    return NextResponse.json({ erro: 'O caminho é relativo ao conector, não um endereço completo.' }, { status: 400 })
  }
  const alvo = `${c.base_url.replace(/\/+$/, '')}/${caminho.replace(/^\/+/, '')}`
  if (!enderecoAceitavel(alvo)) {
    return NextResponse.json({ erro: 'O endereço do conector precisa ser https e público.' }, { status: 400 })
  }

  const cabecalhos: Record<string, string> = {
    'content-type': 'application/json',
    'user-agent': 'Track/1.0 (conector)',
  }
  let url = alvo
  if (c.auth_tipo === 'bearer') cabecalhos.authorization = `Bearer ${segredo}`
  else if (c.auth_tipo === 'header') cabecalhos[c.auth_nome || 'x-api-key'] = segredo
  else url += `${alvo.includes('?') ? '&' : '?'}${encodeURIComponent(c.auth_nome || 'key')}=${encodeURIComponent(segredo)}`

  const metodo = (p.metodo || (p.teste ? 'GET' : 'POST')).toUpperCase()

  try {
    const r = await fetch(url, {
      method: metodo,
      headers: cabecalhos,
      body: metodo === 'GET' || metodo === 'HEAD' ? undefined : (p.corpo || '{}'),
      signal: AbortSignal.timeout(15_000),
    })
    // Devolvemos um pedaço da resposta para a tela poder dizer o que o serviço
    // respondeu. Cortado, porque resposta de API pode vir com meio mundo dentro.
    const texto = (await r.text()).slice(0, 600)
    return NextResponse.json({ ok: r.ok, status: r.status, resposta: texto })
  } catch {
    return NextResponse.json({ ok: false, erro: 'O serviço não respondeu em 15 segundos.' })
  }
}
