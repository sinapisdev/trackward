import { NextResponse } from 'next/server'
import { clienteServidor } from '@/lib/supabase/servidor'

/**
 * A ponte para o que não é o Track.
 *
 * Um agente com ação de webhook chama uma URL da empresa. Isto precisa sair do
 * SERVIDOR, e não do navegador, por três razões que não são detalhe:
 *
 *   o navegador seria barrado pelo CORS na maioria dos destinos
 *   a URL do cliente ficaria visível para qualquer pessoa da empresa
 *   e o mais importante: quem decide qual URL chamar tem que ser o banco, não o
 *   navegador, senão bastaria alterar o pedido para o app chamar qualquer
 *   endereço do mundo em nome do cliente
 *
 * Por isso a rota recebe só o ID do agente. Ela lê a URL do banco, com a
 * identidade de quem pediu, e nunca aceita URL vinda de fora.
 *
 * Uma só ação destrava muitas: com webhook, o cliente liga o Track no Zapier, no
 * Make, no n8n ou no sistema que a TI dele já tem, sem eu escrever um conector
 * para cada um.
 */

export const runtime = 'nodejs'
export const maxDuration = 15

/** Endereços que não fazem sentido e que um app não deve alcançar de dentro. */
function enderecoAceitavel(url: string): boolean {
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:') return false
    const host = u.hostname.toLowerCase()
    // Rede interna: um webhook apontando para dentro do servidor seria um jeito
    // de usar o app para varrer a máquina de quem o hospeda.
    if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal')) return false
    if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host)) return false
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false
    if (host === '[::1]' || host === '::1') return false
    return true
  } catch {
    return false
  }
}

export async function POST(req: Request) {
  let pedido: { agente_id?: string; contexto?: Record<string, unknown> }
  try {
    pedido = await req.json()
  } catch {
    return NextResponse.json({ erro: 'Corpo inválido.' }, { status: 400 })
  }
  if (!pedido.agente_id) {
    return NextResponse.json({ erro: 'Falta o agente.' }, { status: 400 })
  }

  const sb = await clienteServidor()

  // A URL vem do banco, nunca do pedido. Com RLS, quem não pode ver o agente não
  // consegue disparar o webhook dele.
  const { data, error } = await sb
    .from('agentes')
    .select('id,nome,ativo,url,faz')
    .eq('id', pedido.agente_id)
    .single()

  if (error || !data) {
    return NextResponse.json({ erro: 'Agente não encontrado.' }, { status: 404 })
  }
  const a = data as { id: string; nome: string; ativo: boolean; url: string; faz: string }
  if (!a.ativo || a.faz !== 'webhook') {
    return NextResponse.json({ erro: 'Este agente não chama endereço nenhum.' }, { status: 400 })
  }
  if (!enderecoAceitavel(a.url)) {
    return NextResponse.json({
      erro: 'O endereço do agente precisa ser https e público.',
    }, { status: 400 })
  }

  try {
    const r = await fetch(a.url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        // Quem recebe precisa saber de onde veio sem ter que adivinhar.
        'user-agent': 'Track/1.0 (agente)',
      },
      body: JSON.stringify({
        agente: a.nome,
        quando: new Date().toISOString(),
        ...(pedido.contexto || {}),
      }),
      signal: AbortSignal.timeout(10_000),
    })
    return NextResponse.json({ ok: r.ok, status: r.status })
  } catch {
    // Destino fora do ar não pode derrubar o aceite da proposta: o trabalho no
    // Track já aconteceu, e o aviso lá fora é o que falhou.
    return NextResponse.json({ ok: false, erro: 'O endereço não respondeu.' })
  }
}
