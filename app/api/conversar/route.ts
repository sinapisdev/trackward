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
/* 60 e não 30: ler um PDF e montar uma trilha inteira com critério, descrição e
   prazo em cada linha é a resposta mais cara que este app pede, e cortá-la no
   meio devolve nada depois de a pessoa ter respondido cinco perguntas. */
export const maxDuration = 60

const MODELO = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5'

type Medida = {
  modelo: string; entrada: number; saida: number
  cacheLeitura: number; cacheEscrita: number
}

type Volta = { texto: string | null; acoes: Acao[] }

/**
 * As falas, com os arquivos pendurados na ÚLTIMA delas.
 *
 * O modelo lê imagem e PDF por bloco de conteúdo, e não por texto, então a fala
 * deixa de ser uma string e vira uma lista quando há arquivo junto. Eles vão na
 * última porque é dela que eles são: anexar na primeira faria o modelo responder
 * sobre o documento quando a pessoa já mudou de assunto três mensagens atrás.
 *
 * O formato é `source.type: 'url'`, com a URL assinada do balde. O arquivo não
 * passa por aqui, e a assinatura vence em minutos: é o mesmo endereço que a
 * própria pessoa abriria no clique, com o mesmo prazo.
 */
function comArquivos(ctx: ContextoConversa) {
  const falas = ctx.falas.map((f) => ({
    role: (f.de === 'ia' ? 'assistant' : 'user') as 'assistant' | 'user',
    content: f.texto as unknown,
  }))
  const arquivos = ctx.arquivos || []
  if (!arquivos.length || !falas.length) return falas

  const ultima = falas[falas.length - 1]
  // Arquivo pertence a quem mandou. Numa resposta da leitura ele não cabe, e o
  // caso não existe hoje: quem anexa é sempre a pessoa.
  if (ultima.role !== 'user') return falas

  const blocos: unknown[] = arquivos.map((a) => (
    a.tipo === 'application/pdf'
      ? { type: 'document', source: { type: 'url', url: a.url } }
      : { type: 'image', source: { type: 'url', url: a.url } }
  ))
  const texto = String(ultima.content || '').trim()
  ultima.content = [...blocos, { type: 'text', text: texto || 'Leia o que mandei.' }]
  return falas
}

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
      max_tokens: ctx.secretario ? 5000 : 1600,
      system: instrucoes(ctx),
      // As ferramentas só existem para o secretário. Dentro de uma nota a
      // conversa não cria nada, e oferecer a ferramenta ali seria convidar o
      // modelo a usá-la contra a regra escrita na instrução.
      ...(ctx.secretario ? { tools: ferramentas(pode) } : {}),
      messages: comArquivos(ctx),
    }),
  })
  if (!r.ok) {
    /* O corpo do erro vale a leitura: é por ele que se distingue "o modelo
       recusou o arquivo" de "a chave venceu", e a segunda não se resolve
       tentando de novo sem o arquivo. */
    console.warn('[trackward] a conversa falhou:', r.status, (await r.text()).slice(0, 400))
    return null
  }

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
    let resposta = await porModelo(ctx, chave, modelo, medida)
    /**
     * Falhou com arquivo junto: tenta de novo sem ele.
     *
     * O bloco de imagem e de documento é a parte mais nova deste pedido e a que
     * mais tem como ser recusada: formato que o modelo não abre, arquivo grande
     * demais, assinatura vencida no caminho. Sem esta segunda tentativa, um PDF
     * que ele não aceita derruba a CONVERSA inteira, e a pessoa lê "não consegui
     * responder agora" sem nunca saber que o problema era o anexo.
     *
     * Uma vez só, e sem os arquivos: insistir com eles repetiria a recusa, e o
     * que a pessoa perde aqui é a leitura do arquivo, não a resposta.
     */
    if (!resposta && ctx.arquivos?.length) {
      resposta = await porModelo({ ...ctx, arquivos: [] }, chave, modelo, medida)
      if (resposta) {
        resposta.texto = (resposta.texto ? resposta.texto + '\n\n' : '')
          + 'Não consegui abrir o que você mandou. Imagem e PDF eu leio; '
          + 'planilha e documento do Word ainda não.'
      }
    }
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
