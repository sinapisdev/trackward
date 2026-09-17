import { NextResponse, type NextRequest } from 'next/server'
import dns from 'node:dns/promises'
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

async function seguro(bruta: string): Promise<URL | null> {
  let u: URL
  try { u = new URL(bruta.trim().replace(/^webcal:/i, 'https:')) } catch { return null }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
  if (/^(localhost|.*\.local)$/i.test(u.hostname)) return null
  try {
    const enderecos = await dns.lookup(u.hostname, { all: true })
    if (!enderecos.length || enderecos.some((e) => interno(e.address))) return null
  } catch { return null }
  return u
}

export async function POST(req: NextRequest) {
  const { url, de, ate } = (await req.json().catch(() => ({}))) as
    { url?: string; de?: string; ate?: string }

  if (!url) return NextResponse.json({ erro: 'Informe o endereço do calendário.' }, { status: 400 })

  const alvo = await seguro(url)
  if (!alvo) {
    return NextResponse.json(
      { erro: 'Endereço inválido. Cole o link no formato iCal (ics) da sua agenda.' },
      { status: 400 },
    )
  }

  const inicioJanela = de ? new Date(de) : new Date(Date.now() - 14 * 864e5)
  const fimJanela = ate ? new Date(ate) : new Date(Date.now() + 120 * 864e5)

  let texto: string
  try {
    const r = await fetch(alvo, {
      headers: { accept: 'text/calendar, text/plain, */*' },
      signal: AbortSignal.timeout(12000),
      redirect: 'follow',
    })
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
