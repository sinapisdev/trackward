import { NextResponse } from 'next/server'
import { instrucoes, semChave, type ContextoConversa } from '@/lib/conversa'
import { doNomeDaFerramenta, ferramentas, validaTodas, type Acao } from '@/lib/secretario'
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

type Medida = {
  modelo: string; entrada: number; saida: number
  cacheLeitura: number; cacheEscrita: number
}

type Volta = { texto: string | null; acoes: Acao[] }

async function porModelo(
  ctx: ContextoConversa, chave: string, modelo: string, medida: { valor: Medida | null },
): Promise<Volta | null> {
  const pode = { equipe: !!ctx.pode?.equipe }
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': chave,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: modelo,
      max_tokens: 1600,
      system: instrucoes(ctx),
      // As ferramentas só existem para o secretário. Dentro de uma nota a
      // conversa não cria nada, e oferecer a ferramenta ali seria convidar o
      // modelo a usá-la contra a regra escrita na instrução.
      ...(ctx.secretario ? { tools: ferramentas(pode) } : {}),
      messages: ctx.falas.map((f) => ({
        role: f.de === 'ia' ? 'assistant' : 'user',
        content: f.texto,
      })),
    }),
  })
  if (!r.ok) return null

  const corpo = await r.json() as {
    content?: { type: string; text?: string; name?: string; input?: unknown }[]
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

  /* O que o modelo pediu para fazer, conferido aqui antes de ir para a tela.
     Quem ESCREVE no banco é o navegador, com a sessão da pessoa, como em todo
     o resto: o servidor não tem sessão, e dar-lhe a chave de serviço para isto
     seria uma terceira rota com ela. */
  const acoes = ctx.secretario
    ? validaTodas(
        (corpo.content || [])
          .filter((b) => b.type === 'tool_use')
          .map((b) => ({ ...(b.input as object), faz: doNomeDaFerramenta(b.name || '') })),
        { equipe: !!ctx.pode?.equipe },
      )
    : []

  // Fez alguma coisa e não disse nada: o recibo que o app escreve embaixo conta
  // o que foi criado, mas uma tela que responde com silêncio parece travada.
  if (!texto && acoes.length) return { texto: 'Pronto.', acoes }
  return texto || acoes.length ? { texto: texto || null, acoes } : null
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
    if (resposta) {
      return NextResponse.json({
        resposta: resposta.texto, acoes: resposta.acoes, motor: 'ia', modelo,
      })
    }
  } catch {
    // Modelo fora do ar não pode derrubar a tela: a pessoa escreveu, e o que
    // ela escreveu já está guardado na nota.
  }
  return NextResponse.json({ erro: 'Não consegui responder agora.' }, { status: 502 })
}
