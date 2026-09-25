import { NextResponse } from 'next/server'
import { clienteDeServico } from '@/lib/supabase/servico'

/**
 * O link de feedback, atendido de fora.
 *
 * Quem recebeu o trabalho não tem conta no app e nunca vai ter: exigir cadastro
 * para dizer se gostou é o jeito mais eficiente de nunca saber. Então o link é
 * a credencial, e esta rota é quem o atende.
 *
 * Ela usa a chave de serviço, e é a segunda parte do sistema a fazer isso (a
 * outra é `/api/avisar`). O motivo é o mesmo nas duas: quem chama não tem
 * sessão. A diferença é que aqui quem chama é um estranho com um link, e por
 * isso a rota é estreita de propósito:
 *
 * - devolve **só** o nome da track, o nome de quem pediu e o estado do link.
 *   Não devolve tarefa, gente, empresa, nem o id da track. O que vaza por um
 *   link público vaza para sempre.
 *   
 * - aceita **uma** resposta por link, e recusa link vencido. Sem isso o mesmo
 *   endereço vira um formulário aberto para qualquer um escrever quantas vezes
 *   quiser dentro do seu banco.
 *
 * - a nota é 1 a 5 e o texto tem teto. Campo sem teto vindo de fora é como se
 *   enche uma tabela de graça.
 */

export const runtime = 'nodejs'

const TETO = 4000

type Linha = {
  id: string
  fluxo_id: string
  para: string
  vence_em: string
  respondido_em: string | null
  fluxos: { nome: string } | null
  perfis: { nome: string } | null
}

/** O que dá para dizer a quem só tem o link. */
function comoMostrar(f: Linha) {
  return {
    track: f.fluxos?.nome || 'um trabalho',
    pediu: f.perfis?.nome || '',
    para: f.para || '',
    vencido: new Date(f.vence_em).getTime() < Date.now(),
    respondido: !!f.respondido_em,
  }
}

async function achar(token: string) {
  if (!token || token.length < 20 || token.length > 100) return null
  const sb = clienteDeServico()
  if (!sb) return null
  const { data } = await sb
    .from('feedbacks')
    .select('id,fluxo_id,para,vence_em,respondido_em,fluxos(nome),perfis:pediu_id(nome)')
    .eq('token', token)
    .maybeSingle()
  return (data as unknown as Linha) || null
}

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('t') || ''
  const f = await achar(token)
  if (!f) return NextResponse.json({ erro: 'nao-existe' }, { status: 404 })
  return NextResponse.json(comoMostrar(f))
}

export async function POST(req: Request) {
  let corpo: { t?: string; nota?: number; texto?: string }
  try { corpo = await req.json() } catch { return NextResponse.json({ erro: 'corpo' }, { status: 400 }) }

  const f = await achar(String(corpo.t || ''))
  if (!f) return NextResponse.json({ erro: 'nao-existe' }, { status: 404 })
  if (f.respondido_em) return NextResponse.json({ erro: 'ja-respondido' }, { status: 409 })
  if (new Date(f.vence_em).getTime() < Date.now()) {
    return NextResponse.json({ erro: 'vencido' }, { status: 410 })
  }

  const nota = Number(corpo.nota)
  if (!Number.isInteger(nota) || nota < 1 || nota > 5) {
    return NextResponse.json({ erro: 'nota' }, { status: 400 })
  }
  const texto = String(corpo.texto || '').slice(0, TETO).trim()

  const sb = clienteDeServico()
  if (!sb) return NextResponse.json({ erro: 'servidor' }, { status: 500 })
  const { error } = await sb
    .from('feedbacks')
    .update({ nota, texto, respondido_em: new Date().toISOString() })
    .eq('id', f.id)
    .is('respondido_em', null)
  if (error) return NextResponse.json({ erro: 'gravar' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
