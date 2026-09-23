import { NextResponse } from 'next/server'
import { semChave, type ContextoConversa } from '@/lib/conversa'
import { clienteServidor } from '@/lib/supabase/servidor'
import { custoMicro } from '@/lib/precos'

/**
 * A conversa com a leitura, dentro do caderno.
 *
 * Mesma regra da leitura da conversa: a chave mora só no servidor, o teto é
 * conferido aqui e não na tela, e o gasto é gravado mesmo quando a resposta não
 * serviu, porque o token foi cobrado de qualquer jeito.
 *
 * O que muda é o que volta: texto, não proposta. Quem transforma conversa em
 * trabalho continua sendo "Organizar com a IA", que passa pelo /api/leitor e
 * devolve fichas para alguém aceitar. Aqui ela só responde.
 */

export const runtime = 'nodejs'
export const maxDuration = 30

const MODELO = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5'

function instrucoes(ctx: ContextoConversa) {
  const aprendido = ctx.memoria
    ? `\nO QUE ESTA CASA JÁ ENSINOU (use, e não contrarie):\n${ctx.memoria}\n`
    : ''

  const naNota = ctx.nota
    ? `A conversa acontece DENTRO de uma nota, e o assunto dela é este:

Título: ${ctx.nota.titulo}
${ctx.nota.onde ? `Endereço: ${ctx.nota.onde}\n` : ''}Texto:
${ctx.nota.texto || '(a nota ainda está vazia)'}

Fale desse assunto. Se a pessoa mudar de assunto, acompanhe ela, mas lembre que
o que for dito aqui fica guardado nesta nota.`
    : `A conversa é solta: não está dentro de nenhuma nota. A pessoa pode falar do
que quiser, inclusive de coisas que ela guardou em outras notas.`

  const perto = ctx.caderno.length
    ? `
O QUE ELA JÁ GUARDOU E PARECE TER A VER:
${ctx.caderno.map((n) => `- "${n.titulo}": ${n.trecho}`).join('\n')}
`
    : ''

  const tudo = ctx.indice.length
    ? `
TÍTULOS DE TUDO QUE EXISTE NO CADERNO DELA:
${ctx.indice.slice(0, 120).map((t) => `- ${t}`).join('\n')}
`
    : ''

  return `Você conversa com uma pessoa dentro do caderno de notas dela, no TrackWard.

Hoje é ${ctx.hoje}.${aprendido}
${naNota}
${perto}${tudo}
Como responder:
- Português do Brasil, direto, sem travessão e sem emoji.
- Curto. Três parágrafos no máximo, quase sempre um.
- Puxe o que ela já guardou quando fizer sentido, citando o título entre
  colchetes duplos, assim: [[título da nota]]. É o que faz o caderno somar: ela
  escreveu para não precisar lembrar, então lembrar é o seu trabalho.
- Só cite nota que exista nas listas acima. Nunca invente título, número, nome,
  data ou fato que ela não tenha escrito.
- Se ela estiver pensando um negócio, uma decisão ou um problema, ajude a
  pensar: pergunte o que falta, aponte o que não fecha, sugira o próximo passo.
- Não crie tarefa, prazo nem compromisso, e não diga que criou. Quem faz isso é
  o botão "Organizar com a IA", e quem decide é ela.
- Se não souber, diga que não sabe.`
}

type Medida = {
  modelo: string; entrada: number; saida: number
  cacheLeitura: number; cacheEscrita: number
}

async function porModelo(
  ctx: ContextoConversa, chave: string, modelo: string, medida: { valor: Medida | null },
): Promise<string | null> {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': chave,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: modelo,
      max_tokens: 1200,
      system: instrucoes(ctx),
      messages: ctx.falas.map((f) => ({
        role: f.de === 'ia' ? 'assistant' : 'user',
        content: f.texto,
      })),
    }),
  })
  if (!r.ok) return null

  const corpo = await r.json() as {
    content?: { type: string; text?: string }[]
    usage?: {
      input_tokens?: number; output_tokens?: number
      cache_read_input_tokens?: number; cache_creation_input_tokens?: number
    }
  }

  medida.valor = {
    modelo,
    entrada: corpo.usage?.input_tokens ?? 0,
    saida: corpo.usage?.output_tokens ?? 0,
    cacheLeitura: corpo.usage?.cache_read_input_tokens ?? 0,
    cacheEscrita: corpo.usage?.cache_creation_input_tokens ?? 0,
  }

  const texto = (corpo.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text || '')
    .join('\n')
    .trim()
  return texto || null
}

export async function POST(req: Request) {
  let ctx: ContextoConversa
  try {
    ctx = await req.json() as ContextoConversa
  } catch {
    return NextResponse.json({ erro: 'Corpo inválido.' }, { status: 400 })
  }
  if (!Array.isArray(ctx?.falas) || !ctx.falas.length) {
    return NextResponse.json({ erro: 'Sem nada para responder.' }, { status: 400 })
  }

  // A conversa inteira não cabe nem ajuda: o assunto está nas últimas trocas.
  ctx.falas = ctx.falas.slice(-24)
  ctx.caderno = (ctx.caderno || []).slice(0, 8)
  ctx.indice = (ctx.indice || []).slice(0, 120)

  // A primeira fala tem que ser da pessoa: a API recusa histórico que começa
  // pelo assistente, e isso acontece sempre que a nota abre com a leitura.
  while (ctx.falas.length && ctx.falas[0].de === 'ia') ctx.falas.shift()
  if (!ctx.falas.length) {
    return NextResponse.json({ erro: 'Sem nada para responder.' }, { status: 400 })
  }

  const chave = process.env.ANTHROPIC_API_KEY
  if (!chave) return NextResponse.json({ resposta: semChave(ctx), motor: 'nenhum' })

  let modelo = MODELO
  let podeGastar = false
  let sb: Awaited<ReturnType<typeof clienteServidor>> | null = null

  try {
    sb = await clienteServidor()
    const [{ data: pode }, { data: daOrg }] = await Promise.all([
      sb.rpc('pode_chamar_modelo'),
      sb.rpc('modelo_da_org'),
    ])
    podeGastar = pode === true
    if (typeof daOrg === 'string' && daOrg) modelo = daOrg
  } catch {
    podeGastar = false
  }

  if (!podeGastar || !sb) {
    return NextResponse.json({ resposta: semChave(ctx), motor: 'nenhum', porque: 'teto' })
  }

  const medida: { valor: Medida | null } = { valor: null }
  try {
    const resposta = await porModelo(ctx, chave, modelo, medida)
    if (medida.valor) {
      const m = medida.valor
      await sb.rpc('registrar_consumo', {
        p_onde: 'conversa',
        p_modelo: m.modelo,
        p_entrada: m.entrada,
        p_saida: m.saida,
        p_cache_leitura: m.cacheLeitura,
        p_cache_escrita: m.cacheEscrita,
        p_custo_micro: custoMicro(m.modelo, {
          entrada: m.entrada, saida: m.saida,
          cacheLeitura: m.cacheLeitura, cacheEscrita: m.cacheEscrita,
        }),
        p_canal: null,
      })
    }
    if (resposta) return NextResponse.json({ resposta, motor: 'ia', modelo })
  } catch {
    // Modelo fora do ar não pode derrubar a tela: a pessoa escreveu, e o que
    // ela escreveu já está guardado na nota.
  }
  return NextResponse.json({ erro: 'Não consegui responder agora.' }, { status: 502 })
}
