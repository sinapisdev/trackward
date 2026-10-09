import { NextResponse } from 'next/server'
import { instrucoes, regras, semChave, type ContextoConversa } from '@/lib/conversa'
import { doNomeDaFerramenta, ferramentas, valida, MAXIMO, type Acao } from '@/lib/secretario'
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

type Pedido = {
  /** O id do `tool_use`, que é por onde a volta seguinte devolve o resultado. */
  id: string
  /** A ação conferida, ou nulo quando ela não passou. */
  acao: Acao | null
  /** Por que não passou, em português, para o modelo poder corrigir. */
  porque?: string
}

type Volta = {
  texto: string | null
  acoes: Acao[]
  /** Os pedidos com id, para o laço. Vazio quando não houve ferramenta. */
  pedidos: Pedido[]
  /** O conteúdo cru do assistente, que volta inteiro na rodada seguinte. */
  blocos: unknown[]
}

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
    // Volta do laço: o modelo recebe de volta o que ele mandou e o que deu.
    content: (f.blocos && f.blocos.length ? f.blocos : f.texto) as unknown,
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

/**
 * Por que a ação não passou, dito ao MODELO e não à pessoa.
 *
 * A conferência recusava em silêncio, e o modelo seguia como se tivesse
 * funcionado: ele dizia "montei as quatro tracks" tendo montado zero. Devolver
 * o motivo pelo `tool_result` é o que deixa ele consertar e tentar de novo, que
 * é o que qualquer um faria ao receber "faltou o critério do checkpoint 2".
 */
function porqueNaoPassou(nome: string): string {
  if (nome === 'track') {
    return 'Recusado. Uma track precisa de nome e de pelo menos DOIS checkpoints, e cada '
      + 'checkpoint precisa de nome, criterio, prazo_dias e tarefas, com texto, descricao e '
      + 'prazo_dias em cada tarefa. Mande de novo com tudo preenchido.'
  }
  if (nome === 'tarefa') return 'Recusado: faltou o texto da tarefa.'
  if (nome === 'compromisso') return 'Recusado: compromisso precisa de titulo e de quando (AAAA-MM-DD).'
  if (nome === 'nota') return 'Recusado: faltou o texto da nota.'
  if (nome === 'mudaTarefa') {
    return 'Recusado: mudar_tarefa precisa de um item_id das listas acima e de ao menos um '
      + 'campo para mudar.'
  }
  return 'Recusado: a ferramenta veio incompleta.'
}

type Resposta = {
  content?: { type: string; text?: string; name?: string; input?: unknown }[]
  usage?: {
    input_tokens?: number; output_tokens?: number
    cache_read_input_tokens?: number; cache_creation_input_tokens?: number
  }
  stop_reason?: string
  parouPor?: string
}

/**
 * Lê o fluxo da API e remonta a resposta inteira enquanto ela chega.
 *
 * Dois tipos de pedaço importam. O `text_delta` é texto, e vai direto para a
 * tela: é o que faz a resposta aparecer sendo escrita. O `input_json_delta` é a
 * ferramenta, e vem em FATIAS DE JSON que não são JSON nenhum até a última:
 * juntar primeiro e só então fazer o parse é obrigatório, e é por isso que a
 * ação só existe no fim.
 *
 * A medida vem em dois lugares: a entrada e o cache no `message_start`, a saída
 * no `message_delta`. Perder qualquer um dos dois é cobrar errado.
 */
async function lerFluxo(
  r: Response, modelo: string, medida: { valor: Medida | null }, aoTexto: (t: string) => void,
): Promise<Resposta> {
  const blocos: { type: string; text?: string; name?: string; input?: unknown }[] = []
  const cruas = new Map<number, string>()
  const med = { entrada: 0, saida: 0, cacheLeitura: 0, cacheEscrita: 0 }
  /* Por que a resposta parou. `max_tokens` é a que importa: ali o JSON da
     ferramenta fica pela metade, a ação não passa na conferência, e o app
     ficaria em silêncio tendo o modelo tentado fazer a coisa. */
  let parouPor = ''

  const leitor = r.body?.getReader()
  if (!leitor) return { content: [] }
  const decodificador = new TextDecoder()
  let sobra = ''

  for (;;) {
    const { done, value } = await leitor.read()
    if (done) break
    sobra += decodificador.decode(value, { stream: true })
    const linhas = sobra.split('\n')
    // A última pode estar pela metade: ela espera o pedaço seguinte.
    sobra = linhas.pop() || ''
    for (const linha of linhas) {
      if (!linha.startsWith('data:')) continue
      const cru = linha.slice(5).trim()
      if (!cru || cru === '[DONE]') continue
      let e: Record<string, unknown>
      try { e = JSON.parse(cru) } catch { continue }

      if (e.type === 'message_start') {
        const u = (e.message as { usage?: Record<string, number> })?.usage
        med.entrada = u?.input_tokens ?? 0
        med.cacheLeitura = u?.cache_read_input_tokens ?? 0
        med.cacheEscrita = u?.cache_creation_input_tokens ?? 0
      } else if (e.type === 'content_block_start') {
        const i = e.index as number
        const b = e.content_block as { type: string; name?: string }
        blocos[i] = { type: b.type, name: b.name, text: '' }
        if (b.type === 'tool_use') cruas.set(i, '')
      } else if (e.type === 'content_block_delta') {
        const i = e.index as number
        const d = e.delta as { type: string; text?: string; partial_json?: string }
        if (d.type === 'text_delta' && d.text) {
          blocos[i] = blocos[i] || { type: 'text', text: '' }
          blocos[i].text = (blocos[i].text || '') + d.text
          aoTexto(d.text)
        } else if (d.type === 'input_json_delta') {
          cruas.set(i, (cruas.get(i) || '') + (d.partial_json || ''))
        }
      } else if (e.type === 'content_block_stop') {
        const i = e.index as number
        const cru2 = cruas.get(i)
        if (cru2 !== undefined && blocos[i]) {
          try { blocos[i].input = JSON.parse(cru2 || '{}') } catch { blocos[i].input = {} }
        }
      } else if (e.type === 'message_delta') {
        const u = e.usage as { output_tokens?: number } | undefined
        med.saida = u?.output_tokens ?? med.saida
        const d = e.delta as { stop_reason?: string } | undefined
        if (d?.stop_reason) parouPor = d.stop_reason
      }
    }
  }

  medida.valor = { modelo, ...med }
  return { content: blocos.filter(Boolean), parouPor }
}

/**
 * Fala com o modelo, e em TEMPO REAL quando alguém está ouvindo.
 *
 * `aoTexto` é o que muda tudo na sensação. Sem ele, a pessoa escreve e olha
 * "Lendo o seu caderno..." por vinte, trinta segundos, porque o app espera a
 * resposta inteira ficar pronta antes de mostrar uma letra. Uma trilha com sete
 * checkpoints é a resposta mais longa que este app pede, e é justamente a que
 * mais parece travada. Com ele, o texto aparece enquanto é escrito, que é o que
 * qualquer um já aprendeu a esperar de uma conversa com IA.
 *
 * O que NÃO dá para mostrar em tempo real é a ferramenta: o que ela cria só
 * existe depois de o JSON fechar e passar pela conferência. Então o texto
 * escorre e as ações saem no fim, de uma vez, que é a ordem certa de qualquer
 * jeito: primeiro ele diz o que vai fazer, depois faz.
 */
async function porModelo(
  ctx: ContextoConversa, chave: string, modelo: string, medida: { valor: Medida | null },
  aoTexto?: (t: string) => void,
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
      ...(aoTexto ? { stream: true } : {}),
      /* 8000 no secretário. Uma trilha de sete checkpoints com critério,
         descrição e prazo em cada linha passa fácil de 5000, e bater o teto
         deixa o JSON da ferramenta pela metade: a ação não acontece e o app
         fica em silêncio, que de fora é igual a ter sido ignorado. Agora ele
         também DIZ quando cortou, mas o melhor é não cortar. */
      max_tokens: ctx.secretario ? 8000 : 1600,
      /**
       * O prompt em DOIS blocos, e o de cima cacheado.
       *
       * As regras são as mesmas mensagem após mensagem e são a maior parte do
       * prompt; o que muda é a lista de tarefas, a agenda e o caderno. Cacheando
       * só o estável, a segunda mensagem de uma conversa relê quase nada, e o
       * tempo até a primeira letra cai junto. Cache é de PREFIXO, então as
       * regras vêm primeiro: um bloco estável depois de um volátil não cacheia
       * nada.
       */
      system: [
        { type: 'text', text: regras(ctx), cache_control: { type: 'ephemeral' } },
        { type: 'text', text: instrucoes(ctx) },
      ],
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

  const corpo = aoTexto
    ? await lerFluxo(r, modelo, medida, aoTexto)
    : await (async () => {
        const j = await r.json() as Resposta
        medida.valor = {
          modelo,
          entrada: j.usage?.input_tokens ?? 0,
          saida: j.usage?.output_tokens ?? 0,
          cacheLeitura: j.usage?.cache_read_input_tokens ?? 0,
          cacheEscrita: j.usage?.cache_creation_input_tokens ?? 0,
        }
        return j
      })()

  const texto = (corpo.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text || '')
    .join('\n')
    .trim()

  /* O que o modelo pediu para fazer, conferido aqui antes de ir para a tela.
     Quem ESCREVE no banco é o navegador, com a sessão da pessoa, como em todo
     o resto: o servidor não tem sessão, e dar-lhe a chave de serviço para isto
     seria uma terceira rota com ela.

     Cada pedido sai com o ID do `tool_use`, e é por ele que a volta seguinte
     devolve o que aconteceu. O que NÃO passou na conferência sai também, com o
     motivo: devolver "não consegui, e foi por isto" é o que deixa o modelo
     corrigir, e engolir a recusa é o que fazia ele achar que tinha funcionado. */
  const usos = ctx.secretario
    ? (corpo.content || []).filter((b) => b.type === 'tool_use')
    : []
  const pedidos: Pedido[] = usos.map((b) => {
    const nome = doNomeDaFerramenta(b.name || '')
    const acao = valida({ ...(b.input as object), faz: nome }, { equipe: !!ctx.pode?.equipe })
    return {
      id: (b as { id?: string }).id || '',
      acao,
      porque: acao ? undefined : porqueNaoPassou(nome),
    }
  }).filter((p) => p.id)
  const acoes = pedidos.map((p) => p.acao).filter((a): a is Acao => !!a).slice(0, MAXIMO)

  /**
   * Cortado no meio: diz, em vez de ficar quieto.
   *
   * Batendo o teto de saída, o JSON da ferramenta fica pela metade, a ação não
   * passa na conferência e o app não faz nada. Do lado de quem pediu isso é
   * indistinguível de "ele ignorou", que é a pior leitura possível: a pessoa
   * repete o pedido e acontece de novo.
   */
  const cortou = (corpo.parouPor || corpo.stop_reason) === 'max_tokens'
  if (cortou && !acoes.length) {
    return {
      texto: (texto ? texto + '\n\n' : '')
        + 'A resposta ficou longa demais e foi cortada antes de eu terminar. '
        + 'Peça em pedaços, ou me diga para montar só a primeira parte.',
      acoes: [], pedidos: [], blocos: [],
    }
  }

  // Fez alguma coisa e não disse nada: o recibo que o app escreve embaixo conta
  // o que foi criado, mas uma tela que responde com silêncio parece travada.
  const blocos = (corpo.content || []) as unknown[]
  if (!texto && acoes.length) return { texto: '', acoes, pedidos, blocos }
  return texto || pedidos.length ? { texto: texto || null, acoes, pedidos, blocos } : null
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

  /** Grava o gasto. Vale para os dois caminhos, e o token foi cobrado nos dois. */
  const cobrar = async () => {
    if (!medida.valor || !sb) return
    const m = medida.valor
    await sb.rpc('registrar_consumo', {
      p_onde: 'conversa', p_modelo: m.modelo, p_entrada: m.entrada, p_saida: m.saida,
      p_cache_leitura: m.cacheLeitura, p_cache_escrita: m.cacheEscrita,
      p_custo_micro: custoMicro(m.modelo, {
        entrada: m.entrada, saida: m.saida,
        cacheLeitura: m.cacheLeitura, cacheEscrita: m.cacheEscrita,
      }),
      p_canal: null,
    })
  }

  /**
   * O caminho em tempo real, que é o do secretário.
   *
   * Sai como linhas de `data:`, porque é o formato que o navegador já sabe ler
   * sem biblioteca nenhuma: `{"t":"..."}` é um pedaço de texto e `{"fim":...}` é
   * o fecho, com as ações conferidas. A tela pinta o texto conforme ele chega e
   * executa as ações no fim.
   *
   * A segunda tentativa sem os arquivos não existe aqui, e é de propósito: ela
   * depende de a primeira ter falhado INTEIRA, e aqui metade do texto já foi
   * para a tela. Falhando no meio, o fecho vem com o que deu, e o que a pessoa
   * perde é o fim da frase, não a conversa.
   */
  if (ctx.transmitir) {
    const fluxo = new ReadableStream({
      async start(fila) {
        const manda = (o: unknown) => fila.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(o)}\n\n`))
        try {
          const resposta = await porModelo(ctx, chave, modelo, medida, (t) => manda({ t }))
          await cobrar()
          manda({ fim: {
            acoes: resposta?.acoes || [],
            texto: resposta?.texto || '',
            pedidos: resposta?.pedidos || [],
            blocos: resposta?.blocos || [],
          } })
        } catch {
          // Modelo fora do ar não pode derrubar a tela: o que ela escreveu já
          // está guardado, e o fecho vazio deixa a tela sair do "pensando".
          manda({ fim: { acoes: [], texto: '', pedidos: [], blocos: [], erro: true } })
        }
        fila.close()
      },
    })
    return new Response(fluxo, {
      headers: {
        'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-cache, no-transform',
        // Sem isto, um proxy no caminho junta tudo e entrega no fim, que é
        // exatamente o que esta rota existe para não fazer.
        'x-accel-buffering': 'no',
      },
    })
  }

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
    await cobrar()
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
