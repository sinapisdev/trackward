import { NextResponse } from 'next/server'
import { doDespejo, porRegras, podar, type Contexto, type Proposta } from '@/lib/leitor'
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
const TIPOS: TipoProposta[] = [
  'tarefa', 'prazo', 'concluir', 'decisao', 'trava', 'distribuir', 'agente', 'nota', 'compromisso',
]

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
            item_id: { type: ['string', 'null'], description: 'Para concluir, prazo ou distribuir: o id da tarefa que já existe, venha ela deste projeto ou da lista da casa.' },
            fluxo_id: { type: ['string', 'null'], description: 'Para tarefa nova: o id da track onde ela deve nascer, quando a conversa deixar claro que é de outra frente. Só ids da lista de tracks da casa.' },
            resp_id: { type: ['string', 'null'], description: 'O id da pessoa responsável, quando a conversa deixa claro.' },
            prazo: { type: ['string', 'null'], description: 'Data no formato AAAA-MM-DD, só quando a conversa disser.' },
            agente_id: { type: ['string', 'null'], description: 'Só para tipo agente: o id do agente que reconheceu a situação.' },
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

  /**
   * Os agentes que esta empresa escreveu.
   *
   * Aqui está a parte que só o modelo faz: julgar se a conversa fala daquela
   * situação. "O João não vem mais" é um desligamento, "o cliente cancelou" é um
   * cancelamento, e nenhuma palavra-chave pega isso. Reconhecer situação é
   * entender contexto, e é por isso que o agente vale mais com chave de modelo.
   */
  /**
   * O caderno da pessoa. Entra só quando há coisa parecida guardada, e entra
   * como contexto, nunca como ordem: a leitura pode citar a nota antiga e
   * propor juntar as duas, mas não decide nada sozinha.
   */
  const comCaderno = ctx.caderno?.length
    ? `
O QUE ESTA PESSOA JÁ GUARDOU NO CADERNO E PARECE TER A VER:
${ctx.caderno.map((n) => `- "${n.titulo}": ${n.trecho}`).join('\n')}

Se o que está sendo lido agora conversar com alguma dessas, diga isso no motivo
da proposta, citando o título entre colchetes duplos, assim: [[título da nota]].
Não invente ligação: só aponte quando a relação for evidente no texto.
`
    : ''

  /**
   * A casa inteira, e não só este canal.
   *
   * É o que faz a leitura parar de propor pela terceira vez a mesma tarefa que
   * já existe em outra frente, e o que deixa ela mandar a tarefa nova para a
   * track certa em vez de deixá-la sem endereço. Entra só o que a empresa
   * inteira já podia ler: a proposta aparece para todo mundo do canal.
   */
  const casa = ctx.casa
  const comCasa = casa && (casa.tracks.length || casa.itens.length || casa.decisoes.length)
    ? `
O QUE A CASA JÁ TEM, FORA DESTE CANAL:

${casa.tracks.length ? `Tracks abertas (use o id em fluxo_id quando a conversa disser de qual frente é):
${casa.tracks.map((t) => `- ${t.nome} (id ${t.id}${t.onde ? `, ${t.onde}` : ''})`).join('\n')}
` : ''}${casa.itens.length ? `Tarefas que JÁ EXISTEM:
${casa.itens.map((i) => `- ${i.texto} (id ${i.id}, em ${i.onde}${i.prazo ? `, prazo ${i.prazo}` : ''})`).join('\n')}
` : ''}${casa.decisoes.length ? `Decisões que a equipe já tomou:
${casa.decisoes.map((d) => `- ${d.texto} (${d.quando})`).join('\n')}
` : ''}
Use esta lista para NÃO REPETIR: tarefa que já está aí não vira tarefa nova, e
coisa já decidida não vira decisão de novo. Quando a conversa disser que uma
dessas tarefas ficou pronta ou mudou de prazo, use o id dela, mesmo sendo de
outra frente.
`
    : ''

  const comAgentes = ctx.agentes?.length
    ? `
AGENTES QUE ESTA EMPRESA ESCREVEU:
${ctx.agentes.map((a) => `- id ${a.id}, "${a.nome}": dispare quando ${a.reconhecer}.`).join('\n')}

Quando a conversa indicar uma dessas situações, registre uma proposta de tipo
agente com o agente_id correspondente, e ponha no motivo o trecho exato que fez
você reconhecer. Julgue a SITUAÇÃO, não a palavra: "o João não vem mais" é um
desligamento mesmo sem a palavra desligamento aparecer. Em dúvida, não dispare:
um agente que dispara errado cria trabalho errado em área que não é sua.
`
    : ''

  /**
   * O despejo é outro bicho, e tratar ele como conversa de equipe dá resultado
   * ruim nos dois sentidos.
   *
   * Numa conversa de equipe a leitura tem que ser CONSERVADORA: são várias
   * pessoas, e criar tarefa que ninguém pediu gera trabalho para gente de
   * verdade. No despejo é uma pessoa falando sozinha, de propósito, para o app
   * ouvir. Aqui não registrar é o erro: o pensamento se perde, que é exatamente o
   * que a pessoa estava tentando evitar ao escrever.
   *
   * E tem um tipo a mais, que só existe aqui: nota. O que não é tarefa nem
   * compromisso não é lixo, é ideia, e ideia tem onde ficar.
   */
  if (ctx.despejo) {
    return `Você lê o caderno de bolso de UMA pessoa e separa o que ela jogou lá dentro.

Hoje é ${ctx.hoje}.${aprendido}${comCaderno}${comCasa}
Ela está falando sozinha, para o app ouvir. Não é conversa de equipe: não tem ninguém
para quem delegar, e tudo que está escrito ela escreveu de propósito, para não perder.

Três tipos:
- tarefa: algo que ela precisa fazer. Uma ação, com verbo.
- compromisso: algo que acontece num dia e possivelmente numa hora. Use quando e, se a
  pessoa disser, inicio. Reunião, consulta, viagem, entrega marcada, prova, aniversário.
- nota: todo o resto que valha guardar. Ideia, insight, número que ela ouviu, nome de
  alguém, link, trecho de raciocínio, dúvida para pensar depois. Em texto, ponha o
  pensamento dela quase como ela escreveu, sem resumir até virar nada.

Regras:
- Aqui NÃO REGISTRAR É O ERRO. Se ela escreveu, ela quis guardar. Em dúvida entre nota e
  ignorar, registre nota.
- Em dúvida entre tarefa e nota, veja se tem ação: "ligar para o contador" é tarefa,
  "o contador falou que dá para lançar isso na PJ" é nota.
- Uma mensagem pode render mais de uma coisa: separe. "Reunião quinta 10h e preciso levar
  o contrato" é um compromisso e uma tarefa.
- quando só quando a pessoa disser o dia, mesmo que de jeito solto ("quinta", "amanhã"):
  traduza para data, contando de hoje. Nunca invente dia.
- Desabafo e xingamento não são nada. Deixe passar.
- Escreva em português do Brasil, sem travessão.`
  }

  return `Você lê a conversa de uma equipe e separa o que virou trabalho do que foi só conversa.

Hoje é ${ctx.hoje}.${aprendido}${comCasa}${comAgentes}
Pessoas: ${pessoas}.
${ctx.fluxo ? `A conversa é do projeto "${ctx.fluxo.nome}".\nTarefas que já existem nele:\n${itens || '(nenhuma)'}` : 'A conversa não está presa a um projeto.'}

Sete tipos:
- tarefa: alguém se comprometeu, pediu a alguém, ou a equipe reconheceu que algo precisa ser feito.
- concluir: alguém disse que uma tarefa que já existe ficou pronta. Use item_id.
- prazo: a conversa mudou o prazo de uma tarefa que já existe. Use item_id e prazo.
- distribuir: uma tarefa que já existe e está SEM responsável ganhou dono na conversa
  ("eu pego a conciliação", "passa para a Ana"). Use item_id e resp_id. Não use quando a
  tarefa já tem responsável: trocar o dono de uma tarefa é decisão de gente, não sua.
- decisao: a equipe decidiu alguma coisa que precisa ficar registrada.
- trava: a frente parou esperando alguém de fora.
- agente: a conversa indicou uma das situações que a empresa descreveu nos agentes
  abaixo. Use agente_id.

Regras:
- Só registre o que a conversa disser de fato. Nada de deduzir trabalho que ninguém pediu.
- fluxo_id só quando a conversa deixar claro de qual frente é. Na dúvida, deixe nulo: a
  tarefa nasce no projeto deste canal, ou sem projeto, e alguém escolhe depois.
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
  mensagem_id?: string | null; item_id?: string | null; fluxo_id?: string | null
  resp_id?: string | null; prazo?: string | null
  agente_id?: string | null
  quando?: string | null; inicio?: string | null
}

/** O que volta do modelo é texto, não verdade: cada campo é conferido aqui. */
function conferir(cru: Cru[], ctx: Contexto): Proposta[] {
  const pessoas = new Set(ctx.pessoas.map((p) => p.id))
  // As tarefas deste canal e as da casa, na mesma peneira: é o que permite
  // "o plano de contas já está migrado" fechar a tarefa que mora em outra track.
  const itens = new Map(
    [...(ctx.fluxo?.itens || []), ...(ctx.casa?.itens || [])].map((i) => [i.id, i]),
  )
  const tracks = new Map((ctx.casa?.tracks || []).map((t) => [t.id, t]))
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

    // Agente sem id de agente conhecido não existe: o modelo não inventa agente.
    const agentes = new Set((ctx.agentes || []).map((a) => a.id))
    if (tipo === 'agente' && !(c.agente_id && agentes.has(c.agente_id))) continue
    // Distribuir sem nome não é distribuir. E se a tarefa já tem dono, trocar o
    // dono é decisão de gente: o modelo não passa por cima disso.
    if (tipo === 'distribuir' && (!resp || (item && item.resp_id))) continue

    // Nota e compromisso só existem no despejo: num canal de equipe seria
    // guardar nota no caderno de outra pessoa.
    if ((tipo === 'nota' || tipo === 'compromisso') && !ctx.despejo) continue
    const quando = /^\d{4}-\d{2}-\d{2}$/.test(String(c.quando)) ? String(c.quando) : null
    if (tipo === 'compromisso' && !quando) continue
    const inicio = /^([01]\d|2[0-3]):[0-5]\d$/.test(String(c.inicio)) ? String(c.inicio) : null

    // Track escolhida pelo modelo: vale só se existir na lista que foi mandada.
    // Sem esta conferência ele poderia inventar um id, e a proposta apontaria
    // para o nada, ou pior, para uma track que quem lê não enxerga.
    const daCasa = c.fluxo_id ? tracks.get(c.fluxo_id) ?? null : null

    saida.push({
      tipo,
      texto: texto.slice(0, 220),
      motivo: String(c.motivo || '').trim().slice(0, 400),
      mensagem_id: c.mensagem_id && msgs.has(c.mensagem_id) ? c.mensagem_id : null,
      dados: {
        // A tarefa achada manda no endereço, porque ela já tem um. Depois vem
        // a track que o modelo escolheu, e por último a do próprio canal.
        fluxo_id: item ? (item.fluxo_id ?? ctx.fluxo?.id ?? null) : (daCasa?.id ?? ctx.fluxo?.id ?? null),
        etapa_id: item ? item.etapa_id : (daCasa?.etapa_id ?? ctx.fluxo?.etapa_id ?? null),
        item_id: item ? item.id : null,
        resp_id: resp,
        prazo,
        agente_id: tipo === 'agente' ? c.agente_id : null,
        quando: tipo === 'compromisso' ? quando : null,
        inicio: tipo === 'compromisso' ? inicio : null,
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
        propostas: semModelo(ctx),
        motor: 'regras',
        // A tela precisa poder dizer por que a leitura saiu mais simples hoje.
        porque: 'teto',
      })
    }
  }

  return NextResponse.json({ propostas: semModelo(ctx), motor: 'regras' })
}

/**
 * A leitura sem modelo.
 *
 * Duas regras diferentes, porque são dois problemas diferentes: conversa de
 * equipe pede desconfiança, despejo pede generosidade. Ver doDespejo.
 */
const semModelo = (ctx: Contexto) => (ctx.despejo ? doDespejo(ctx) : porRegras(ctx))
