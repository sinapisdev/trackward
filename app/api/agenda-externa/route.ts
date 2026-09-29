import { NextResponse, type NextRequest } from 'next/server'
import { buscar } from '@/lib/saida'
import { blocosOcupados, nomeDoCalendario } from '@/lib/ical'

/**
 * Lê um calendário externo (Google, Apple, Outlook, qualquer coisa que publique
 * um link no formato iCal) e devolve APENAS os intervalos ocupados.
 *
 * O título, o local, os convidados e a descrição são descartados aqui, antes de
 * qualquer coisa ser guardada ou devolvida. É o "livre ou ocupado": a equipe fica
 * sabendo que a pessoa não está disponível, e nada além disso.
 */

const LIMITE_BYTES = 4 * 1024 * 1024

/** Endereços que um feed legítimo nunca tem, e que abririam a porta da rede interna. */
function interno(ip: string) {
  if (/^(127\.|0\.|169\.254\.|10\.)/.test(ip)) return true
  if (/^192\.168\./.test(ip)) return true
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return true
  if (ip === '::1' || ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80')) return true
  return false
}

export async function POST(req: NextRequest) {
  const { url, de, ate } = (await req.json().catch(() => ({}))) as
    { url?: string; de?: string; ate?: string }

  if (!url) return NextResponse.json({ erro: 'Informe o endereço do calendário.' }, { status: 400 })


  const inicioJanela = de ? new Date(de) : new Date(Date.now() - 14 * 864e5)
  const fimJanela = ate ? new Date(ate) : new Date(Date.now() + 120 * 864e5)

  let texto: string
  try {
    // `soHttps: false` porque calendário publicado em intranet velha existe, e o
    // que volta daqui são intervalos de tempo, nunca título nem local.
    const saida = await buscar(url, {
      soHttps: false,
      headers: { accept: 'text/calendar, text/plain, */*' },
      signal: AbortSignal.timeout(12000),
    })
    if (!saida.ok) {
      return NextResponse.json(
        { erro: 'Endereço inválido. Cole o link no formato iCal (ics) da sua agenda.' },
        { status: 400 },
      )
    }
    const r = saida.r
    if (!r.ok) {
      return NextResponse.json(
        { erro: `A agenda respondeu ${r.status}. Confira se o link é o secreto no formato iCal.` },
        { status: 502 },
      )
    }
    const tamanho = Number(r.headers.get('content-length') || 0)
    if (tamanho > LIMITE_BYTES) {
      return NextResponse.json({ erro: 'Esse calendário é grande demais para ler.' }, { status: 413 })
    }
    texto = (await r.text()).slice(0, LIMITE_BYTES)
  } catch {
    return NextResponse.json({ erro: 'Não foi possível alcançar essa agenda.' }, { status: 502 })
  }

  try {
    return NextResponse.json({
      blocos: blocosOcupados(texto, inicioJanela, fimJanela),
      nome: nomeDoCalendario(texto),
      lido_em: new Date().toISOString(),
    })
  } catch {
    return NextResponse.json(
      { erro: 'Esse endereço não parece ser um calendário no formato iCal.' },
      { status: 422 },
    )
  }
}
