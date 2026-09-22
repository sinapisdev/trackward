import { NextResponse } from 'next/server'
import { porRegras, podar, type Contexto, type Proposta } from '@/lib/leitor'
import { clienteServidor } from '@/lib/supabase/servidor'
import { custoMicro } from '@/lib/precos'
import type { TipoProposta } from '@/lib/tipos'

/**
 * Leitura da conversa.
 *
 * Com ANTHROPIC_API_KEY no ambiente, quem lê é o modelo, que entende contexto,
 * ironia e a frase que se espalha por três mensagens. Sem chave, ou se a chamada
 * falhar, as regras de lib/leitor.ts assumem. O app nunca fica sem ler.
 *
 * A chave mora só no servidor. O navegador manda a conversa para cá e recebe
 * propostas de volta, nunca o contrário.
 */

export const runtime = 'nodejs'
export const maxDuration = 30

const MODELO = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5'
const TIPOS: TipoProposta[] = ['tarefa', 'prazo', 'concluir', 'decisao', 'trava', 'distribuir']

const FERRAMENTA = {
  name: 'registrar',
  description: 'Registra o que a conversa produziu de trabalho concreto.',
  input_schema: {
    type: 'object',
    properties: {
      propostas: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            tipo: { type: 'string', enum: TIPOS },
            texto: { type: 'string', description: 'A tarefa ou a decisão, em uma linha, começando por verbo no infinitivo quando for tarefa.' },
            motivo: { type: 'string', description: 'O trecho exato da conversa que deu origem, copiado.' },
            mensagem_id: { type: ['string', 'null'], description: 'O id da mensagem de onde saiu.' },
            item_id: { type: ['string', 'null'], description: 'Para concluir, prazo ou distribuir: o id da tarefa que já existe.' },
            resp_id: { type: ['string', 'null'], description: 'O id da pessoa responsável, quando a conversa deixa claro.' },
            prazo: { type: ['string', 'null'], description: 'Data no formato AAAA-MM-DD, só quando a conversa disser.' },
          },
          required: ['tipo', 'texto', 'motivo'],
        },
      },
    },
    required: ['propostas'],
  },
}

function instrucoes(ctx: Contexto) {
  const pessoas = ctx.pessoas.map((p) => `${p.nome} (id ${p.id})`).join(', ')
  const itens = (ctx.fluxo?.itens || [])
    .map((i) => `- ${i.texto} (id ${i.id}, ${i.feito ? 'feita' : 'aberta'}${i.prazo ? `, prazo ${i.prazo}` : ''})`)
    .join('\n')

  // O que a empresa ensinou entra antes das regras, porque é o que muda a
  // leitura de genérica para específica daquela casa.
  const aprendido = ctx.memoria
    ? `\nO QUE ESTA EMPRESA JÁ ENSINOU (use, e não contrarie):\n${ctx.memoria}\n`
    : ''

  return `Você lê a conversa de uma equipe e separa o que virou trabalho do que foi só conversa.

Hoje é ${ctx.hoje}.${aprendido}
Pessoas: ${pessoas}.
${ctx.fluxo ? `A conversa é do projeto "${ctx.fluxo.nome}".\nTarefas que já existem nele:\n${itens || '(nenhuma)'}` : 'A conversa não está presa a um projeto.'}

Seis tipos:
- tarefa: alguém se comprometeu, pediu a alguém, ou a equipe reconheceu que algo precisa ser feito.
- concluir: alguém disse que uma tarefa que já existe ficou pronta. Use item_id.
- prazo: a conversa mudou o prazo de uma tarefa que já existe. Use item_id e prazo.
- distribuir: uma tarefa que já existe e está SEM responsável ganhou dono na conversa
  ("eu pego a conciliação", "passa para a Ana"). Use item_id e resp_id. Não use quando a
  tarefa já tem responsável: trocar o dono de uma tarefa é decisão de gente, não sua.
- decisao: a equipe decidiu alguma coisa que precisa ficar registrada.
- trava: a frente parou esperando alguém de fora.

Regras:
- Só registre o que a conversa disser de fato. Nada de deduzir trabalho que ninguém pediu.
- Cumprimento, piada, combinação de almoço e pergunta sem resposta não são tarefa.
- Se uma tarefa igual já existe na lista acima, não crie outra.
- resp_id só quando a conversa deixar claro de quem é. Na dúvida, deixe nulo.
- Em distribuir, resp_id e item_id são obrigatórios: sem os dois, não registre.
- prazo só quando a conversa disser a data. Nunca invente um prazo.
- Escreva em português do Brasil, sem travessão.
- Nada a registrar é uma resposta boa: devolva a lista vazia.`
}

function conversa(ctx: Contexto) {
  return ctx.mensagens.map((m) => `[${m.id}] ${m.autor}: ${m.texto}`).join('\n')
}

type Cru = {
  tipo?: string; texto?: string; motivo?: string
  mensagem_id?: string | null; item_id?: string | null
  resp_id?: string | null; prazo?: string | null
}

/** O que volta do modelo é texto, não verdade: cada campo é conferido aqui. */
function conferir(cru: Cru[], ctx: Contexto): Proposta[] {
  const pessoas = new Set(ctx.pessoas.map((p) => p.id))
  const itens = new Map((ctx.fluxo?.itens || []).map((i) => [i.id, i]))
  const msgs = new Set(ctx.mensagens.map((m) => m.id))
  const saida: Proposta[] = []

  for (const c of cru) {
    const tipo = TIPOS.find((t) => t === c.tipo)
    const texto = String(c.texto || '').trim()
    if (!tipo || !texto) continue

    const item = c.item_id && itens.get(c.item_id)
    if ((tipo === 'concluir' || tipo === 'prazo' || tipo === 'distribuir') && !item) continue

    const prazo = /^\d{4}-\d{2}-\d{2}$/.test(String(c.prazo)) ? String(c.prazo) : null
    if (tipo === 'prazo' && !prazo) continue

    const resp = c.resp_id && pessoas.has(c.resp_id) ? c.resp_id : null
    // Distribuir sem nome não é distribuir. E se a tarefa já tem dono, trocar o
    // dono é decisão de gente: o modelo não passa por cima disso.
    if (tipo === 'distribuir' && (!resp || (item && item.resp_id))) continue

    saida.push({
      tipo,
      texto: texto.slice(0, 220),
      motivo: String(c.motivo || '').trim().slice(0, 400),
      mensagem_id: c.mensagem_id && msgs.has(c.mensagem_id) ? c.mensagem_id : null,
      dados: {
        fluxo_id: ctx.fluxo?.id ?? null,
        etapa_id: item ? item.etapa_id : ctx.fluxo?.etapa_id ?? null,
        item_id: item ? item.id : null,
        resp_id: resp,
        prazo,
      },
    })
  }
  return podar(saida)
}

type Medida = {
  modelo: string
  entrada: number
  saida: number
  cacheLeitura: number
  cacheEscrita: number
}

async function porModelo(
  ctx: Contexto, chave: string, modelo: string, medida: { valor: Medida | null },
): Promise<Proposta[] | null> {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': chave,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: modelo,
      max_tokens: 2000,
      system: instrucoes(ctx),
      tools: [FERRAMENTA],
      tool_choice: { type: 'tool', name: 'registrar' },
      messages: [{ role: 'user', content: conversa(ctx) }],
    }),
  })
  if (!r.ok) return null

  const corpo = await r.json() as {
    content?: { type: string; name?: string; input?: { propostas?: Cru[] } }[]
    usage?: {
      input_tokens?: number; output_tokens?: number
      cache_read_input_tokens?: number; cache_creation_input_tokens?: number
    }
  }

  // O que a própria API diz ter cobrado. Estimar tokens por conta seria chutar a
  // conta do cliente; aqui a medida vem de quem cobra.
  medida.valor = {
    modelo,
    entrada: corpo.usage?.input_tokens ?? 0,
    saida: corpo.usage?.output_tokens ?? 0,
    cacheLeitura: corpo.usage?.cache_read_input_tokens ?? 0,
    cacheEscrita: corpo.usage?.cache_creation_input_tokens ?? 0,
  }

  const uso = corpo.content?.find((b) => b.type === 'tool_use' && b.name === 'registrar')
  if (!uso?.input?.propostas) return null
  return conferir(uso.input.propostas, ctx)
}

export async function POST(req: Request) {
  let ctx: Contexto
  try {
    ctx = await req.json() as Contexto
  } catch {
    return NextResponse.json({ erro: 'Corpo inválido.' }, { status: 400 })
  }
  if (!Array.isArray(ctx?.mensagens) || !ctx.mensagens.length) {
    return NextResponse.json({ propostas: [], motor: 'regras' })
  }

  // A conversa inteira não cabe nem é necessária: o que ficou combinado está
  // nas últimas trocas, não no que se falou há três semanas.
  ctx.mensagens = ctx.mensagens.slice(-40)
  ctx.pessoas = (ctx.pessoas || []).slice(0, 60)

  const chave = process.env.ANTHROPIC_API_KEY

  /**
   * O teto é conferido AQUI, e não na tela.
   *
   * Teto conferido no navegador não é teto: bastaria abrir as ferramentas do
   * navegador e chamar a rota direto. Aqui quem responde se pode gastar é o
   * banco, com a identidade de quem pediu, e não há como passar por cima.
   *
   * Sem Supabase (modo demonstração) não há chave nem cobrança, então não há
   * nada a conferir: cai nas regras embutidas e o app segue igual.
   */
  if (chave) {
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
      // Sem sessão ou sem banco: não dá para medir, então não se gasta. Preferir
      // as regras a gastar sem saber de quem é a conta.
      podeGastar = false
    }

    if (podeGastar && sb) {
      const medida: { valor: Medida | null } = { valor: null }
      try {
        const propostas = await porModelo(ctx, chave, modelo, medida)

        // Grava o gasto mesmo quando a resposta não serviu: o token foi cobrado
        // de qualquer jeito, e medidor que só conta acerto mede errado.
        if (medida.valor) {
          const m = medida.valor
          await sb.rpc('registrar_consumo', {
            p_onde: 'leitor',
            p_modelo: m.modelo,
            p_entrada: m.entrada,
            p_saida: m.saida,
            p_cache_leitura: m.cacheLeitura,
            p_cache_escrita: m.cacheEscrita,
            p_custo_micro: custoMicro(m.modelo, {
              entrada: m.entrada, saida: m.saida,
              cacheLeitura: m.cacheLeitura, cacheEscrita: m.cacheEscrita,
            }),
            p_canal: ctx.canal_id ?? null,
          })
        }

        if (propostas) return NextResponse.json({ propostas, motor: 'ia', modelo })
      } catch {
        // Modelo fora do ar não pode deixar o app sem ler a conversa.
      }
    } else {
      return NextResponse.json({
        propostas: porRegras(ctx),
        motor: 'regras',
        // A tela precisa poder dizer por que a leitura saiu mais simples hoje.
        porque: 'teto',
      })
    }
  }

  return NextResponse.json({ propostas: porRegras(ctx), motor: 'regras' })
}
