/**
 * O que o secretário PODE fazer, e por que ele faz em vez de propor.
 *
 * A regra do app é velha e continua valendo: conversa solta vira proposta,
 * comando vira coisa feita, e a diferença é quem pediu. "Preciso ligar para o
 * contador" é pensamento, e a máquina não pode decidir que aquilo é uma tarefa;
 * "cria uma tarefa para ligar para o contador amanhã" é ORDEM, dita em palavras
 * a um assistente, e pedir confirmação do que a pessoa acabou de mandar fazer é
 * desconfiar dela, exatamente como seria na barra.
 *
 * O que muda em relação à barra é só o risco de leitura: `/tarefa` são as
 * palavras da própria pessoa, e aqui um modelo interpreta.
 *
 * **A lista deixou de ser só do pessoal, e deixou de ser só de criar.** Ele
 * montava track só onde não havia segunda pessoa, e o argumento era que ali ela
 * é da casa. O argumento estava errado pelo lado prático: montar track é
 * justamente o que mais se quer pedir falando, é o que mais dá trabalho na
 * tela, e uma empresa que abre a Conversa sem nenhum canal não tem com quem
 * começar. A track continua sendo da casa, e é por isso que o **recibo diz quem
 * vai vê-la**: o que protege não é esconder a ferramenta, é dizer o que foi
 * feito.
 *
 * **E ele mexe no que já existe**, porque "muda o prazo daquela tarefa para
 * sexta" é a frase mais comum que existe e mandar abrir outra tela para isso é
 * o app pedindo que trabalhem por ele. O limite continua onde ele importa:
 *
 *   - nada APAGA. Desfazer um engano de criação é apagar uma linha; desfazer um
 *     engano de apagar não existe. Remover é tela, com dois toques.
 *   - nada CONCLUI. Marcar como feito o que não foi é a única mentira que este
 *     app não pode contar, e ela não se descobre olhando.
 *   - nada muda o que não é dela de direito: quem recusa é o BANCO, com as
 *     mesmas regras da tela (`manda_no_processo`, RLS), e não uma lista aqui que
 *     um dia discorda daquelas.
 *
 * **Toda ação feita se conta na conversa**, com o que foi criado. Sem isso o
 * secretário vira um lugar onde coisas nascem num canto que ninguém viu
 * acontecer, que é o mesmo defeito que `contarNoCanal` existe para fechar.
 */

/**
 * Uma tarefa ditada dentro de uma trilha.
 *
 * O prazo aqui é em **dias a partir de hoje**, e não em data, pelo mesmo motivo
 * de `processo_itens`: ninguém dita sete datas absolutas sem errar uma, e o
 * modelo erra mais ainda, porque ele tem que fazer a conta de calendário sete
 * vezes. "Daqui a 10 dias" ele acerta sempre. Fora da trilha continua sendo
 * data, porque lá a pessoa diz "sexta" e sexta é um dia, não um intervalo.
 */
export type TarefaDita = { texto: string; descricao?: string; prazoDias?: number | null }

export type Acao =
  | { faz: 'tarefa'; texto: string; prazo?: string | null; descricao?: string
      fluxoId?: string | null; etapaId?: string | null }
  | { faz: 'compromisso'; titulo: string; quando: string; inicio?: string | null
      fim?: string | null; local?: string }
  | { faz: 'nota'; texto: string }
  | { faz: 'track'; nome: string; tipo: 'esteira' | 'ciclo'; soMinha: boolean
      checkpoints: { nome: string; criterio: string; prazoDias: number | null
        tarefas: TarefaDita[] }[] }
  | { faz: 'mudaTarefa'; itemId: string; texto?: string; prazo?: string | null
      descricao?: string }

/**
 * O que ele pode OLHAR, que é diferente do que ele pode fazer.
 *
 * Até aqui ele só escrevia: recebia um resumo pronto do que a casa tem e tinha
 * que se virar com ele. Isso basta para "cria uma tarefa" e não basta para nada
 * que exija pensar: "o que falta na Reforma", "aquilo que a gente conversou
 * sobre a esquadria", "quais tracks estão paradas". Um assistente que não pode
 * procurar nada é um formulário com conversa em volta.
 *
 * Olhar é barato e é seguro: a resposta sai do que JÁ está na tela da pessoa,
 * ou seja, do que o banco já deixou ela ver. Nenhuma destas vai ao servidor, e
 * nenhuma pode devolver o que ela não poderia abrir sozinha.
 */
export type Pergunta =
  | { ve: 'track'; id: string }
  | { ve: 'nota'; titulo: string }
  | { ve: 'busca'; termo: string }

/** Quanto uma leitura pode fazer de uma vez, para um engano não virar faxina. */
export const MAXIMO = 8

/** Checkpoints por track, e tarefas por checkpoint, num pedido só. */
export const MAX_CHECKPOINTS = 12
export const MAX_TAREFAS = 12

const texto = (v: unknown, teto: number) =>
  typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, teto) : ''

/** Uma data só vale se for do formato do banco e de um ano plausível. */
const dia = (v: unknown): string | null => {
  const s = typeof v === 'string' ? v.trim() : ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const n = Number(s.slice(0, 4))
  return n >= 2020 && n <= 2100 ? s : null
}

/** 'HH:MM', e nada mais: o banco guarda assim e a agenda lê assim. */
const hora = (v: unknown): string | null => {
  const s = typeof v === 'string' ? v.trim() : ''
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(s) ? s : null
}

/**
 * Dias a partir de hoje, inteiros e dentro de um horizonte que é trabalho.
 *
 * Cinco anos é o teto, e zero é hoje. Negativo é leitura torta: ninguém monta
 * uma trilha com um passo que venceu antes de ela existir.
 */
const dias = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return null
  const i = Math.round(n)
  return i >= 0 && i <= 1825 ? i : null
}

/** Um uuid, e só: o id de uma coisa que já existe não se inventa. */
const id = (v: unknown): string | null => {
  const s = typeof v === 'string' ? v.trim() : ''
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s) ? s : null
}

/** Uma tarefa ditada, dentro ou fora de trilha. Sem texto não é tarefa. */
function tarefaDita(bruta: unknown): TarefaDita | null {
  // O modelo às vezes manda a lista como texto puro, porque é o que ele faria
  // numa frase. Aceitar isso é barato e evita perder a trilha inteira por causa
  // da forma: o que ele quis dizer é o mesmo.
  if (typeof bruta === 'string') {
    const t = texto(bruta, 200)
    return t ? { texto: t } : null
  }
  const o = bruta as Record<string, unknown> | null
  if (!o || typeof o !== 'object') return null
  const t = texto(o.texto, 200)
  if (!t) return null
  return { texto: t, descricao: texto(o.descricao, 2000), prazoDias: dias(o.prazo_dias) }
}

/**
 * A ação que veio do modelo, conferida antes de virar escrita.
 *
 * Devolve nulo em vez de corrigir: ação torta é engano de leitura, e consertar
 * um engano por dentro é guardar o engano com outra cara. A pessoa vê o que o
 * secretário disse que ia fazer, e o que não foi feito ela refaz numa frase.
 */
export function valida(bruta: unknown, pode: { equipe: boolean }): Acao | null {
  const a = bruta as Record<string, unknown> | null
  if (!a || typeof a !== 'object') return null

  if (a.faz === 'tarefa') {
    const t = texto(a.texto, 200)
    if (!t) return null
    return {
      faz: 'tarefa', texto: t, prazo: dia(a.prazo), descricao: texto(a.descricao, 2000),
      /* Sem track ela é avulsa, que nasce privada de quem criou. Com track ela
         entra na trilha e a equipe enxerga, e essa é a única escolha que muda
         tudo numa tarefa: por isso o id vem do modelo e o recibo diz onde ela
         foi parar. */
      fluxoId: id(a.fluxo_id), etapaId: id(a.etapa_id),
    }
  }

  if (a.faz === 'compromisso') {
    const titulo = texto(a.titulo, 200)
    const quando = dia(a.quando)
    // Sem dia não é compromisso, é lembrete, e lembrete é tarefa. Deixar passar
    // com o dia de hoje marcaria para hoje o que alguém disse "semana que vem".
    if (!titulo || !quando) return null
    const inicio = hora(a.inicio)
    // Fim sem início não quer dizer nada, e fim antes do início é leitura torta.
    const fim = inicio ? hora(a.fim) : null
    return {
      faz: 'compromisso', titulo, quando, inicio,
      fim: inicio && fim && fim > inicio ? fim : null,
      local: texto(a.local, 200),
    }
  }

  if (a.faz === 'nota') {
    const t = typeof a.texto === 'string' ? a.texto.trim().slice(0, 20000) : ''
    return t ? { faz: 'nota', texto: t } : null
  }

  if (a.faz === 'track') {
    const nome = texto(a.nome, 120)
    const tipo = a.tipo === 'ciclo' ? 'ciclo' : 'esteira'
    const crus = Array.isArray(a.checkpoints) ? a.checkpoints : []
    const checkpoints = crus
      .map((c) => {
        const e = c as Record<string, unknown>
        const n = texto(e?.nome, 120)
        if (!n) return null
        const tarefas = (Array.isArray(e.tarefas) ? e.tarefas : [])
          .map(tarefaDita)
          .filter((t): t is TarefaDita => !!t)
          .slice(0, MAX_TAREFAS)
        return { nome: n, criterio: texto(e.criterio, 600), prazoDias: dias(e.prazo_dias), tarefas }
      })
      .filter((c): c is NonNullable<typeof c> => !!c)
      .slice(0, MAX_CHECKPOINTS)
    // Um checkpoint só não é trilha: é a lista avulsa com outro nome, e o
    // produto chama isso de não ser processo.
    if (!nome || checkpoints.length < 2) return null
    /* Num espaço de uma pessoa não existe "quem vê", então a pergunta não se
       faz: ela é sempre só dela. Num de equipe o padrão é a equipe, porque
       track que ninguém vê não conta para ninguém, e o recibo diz qual foi. */
    const soMinha = !pode.equipe || a.so_minha === true
    return { faz: 'track', nome, tipo, soMinha, checkpoints }
  }

  if (a.faz === 'mudaTarefa') {
    const itemId = id(a.item_id)
    if (!itemId) return null
    const t = texto(a.texto, 200)
    /* `prazo` tem TRÊS estados aqui, e confundi-los é o defeito. Ausente é "não
       mexe"; uma data é a nova; e a palavra "nenhum" é tirar o prazo, que é um
       pedido legítimo ("tira o prazo disso, não tem data"). Sem o terceiro, a
       única forma de tirar um prazo seria pela tela. */
    const limpar = typeof a.prazo === 'string' && /^(nenhum|sem prazo|null)$/i.test(a.prazo.trim())
    const prazo = limpar ? null : dia(a.prazo)
    const descricao = texto(a.descricao, 2000)
    // Uma mudança que não muda nada é leitura torta, e aplicá-la escreveria na
    // atividade da track que alguém mexeu no que ninguém mexeu.
    if (!t && !descricao && !limpar && !prazo) return null
    return {
      faz: 'mudaTarefa', itemId,
      ...(t ? { texto: t } : {}),
      ...(limpar || prazo ? { prazo } : {}),
      ...(descricao ? { descricao } : {}),
    }
  }

  return null
}

/** A pergunta que veio do modelo, conferida. Nula quando não dá para responder. */
export function validaPergunta(bruta: unknown): Pergunta | null {
  const a = bruta as Record<string, unknown> | null
  if (!a || typeof a !== 'object') return null
  if (a.ve === 'track') { const i = id(a.fluxo_id); return i ? { ve: 'track', id: i } : null }
  if (a.ve === 'nota') { const t = texto(a.titulo, 200); return t ? { ve: 'nota', titulo: t } : null }
  if (a.ve === 'busca') { const t = texto(a.termo, 120); return t ? { ve: 'busca', termo: t } : null }
  return null
}

/** As ações do modelo, peneiradas e limitadas. */
export const validaTodas = (brutas: unknown, pode: { equipe: boolean }): Acao[] =>
  (Array.isArray(brutas) ? brutas : [])
    .map((b) => valida(b, pode))
    .filter((a): a is Acao => !!a)
    .slice(0, MAXIMO)

/**
 * O que foi feito, escrito para a pessoa ler na conversa.
 *
 * Em português e no passado, porque já aconteceu: "Criei a tarefa X" é o
 * recibo, e um recibo que fala em futuro deixa a dúvida de se foi mesmo.
 *
 * `onde` entra de fora porque o nome da track mora no estado da tela, e esta
 * função é pura de propósito: ela precisa poder ser ensaiada sem app.
 */
export function contar(a: Acao, onde?: string): string {
  if (a.faz === 'tarefa') {
    const lugar = onde ? ` em ${onde}` : a.fluxoId ? ' na track' : ''
    return `Tarefa: ${a.texto}${lugar}${a.prazo ? `, até ${a.prazo}` : ''}`
  }
  if (a.faz === 'compromisso') {
    const q = a.inicio ? `${a.quando} às ${a.inicio}${a.fim ? ` até ${a.fim}` : ''}` : a.quando
    return `Compromisso: ${a.titulo}, ${q}${a.local ? `, em ${a.local}` : ''}`
  }
  if (a.faz === 'nota') {
    const primeira = a.texto.split('\n')[0].trim()
    return `Nota: ${primeira.slice(0, 80)}${primeira.length > 80 ? '...' : ''}`
  }
  if (a.faz === 'mudaTarefa') {
    const mudou = [
      a.texto ? `texto para "${a.texto}"` : '',
      a.prazo === null ? 'sem prazo' : a.prazo ? `prazo para ${a.prazo}` : '',
      a.descricao ? 'descrição' : '',
    ].filter(Boolean).join(', ')
    return `Tarefa${onde ? ` "${onde}"` : ''} alterada: ${mudou}`
  }
  const tarefas = a.checkpoints.reduce((n, c) => n + c.tarefas.length, 0)
  /* Quem vê entra no recibo, e é a parte que mais importa num espaço de equipe:
     a track é da casa, e a pessoa precisa saber disso na hora, não no dia em
     que alguém comentar nela. */
  const quem = a.soMinha ? 'só você vê' : 'a equipe vê'
  return `Track: ${a.nome}, ${a.checkpoints.length} checkpoints e ${tarefas} `
    + `${tarefas === 1 ? 'tarefa' : 'tarefas'} (${quem})`
}

/**
 * As ferramentas, no formato que a API espera.
 *
 * Ferramenta e não JSON no meio do texto: o modelo erra menos preenchendo um
 * esquema do que imitando um formato dentro de uma frase, e um JSON quebrado
 * aqui vira trabalho criado errado em vez de nada criado.
 */
type Ferramenta = {
  name: string
  description: string
  /** O esquema é JSON Schema, e cada ferramenta tem o seu: aqui ele é dado. */
  input_schema: Record<string, unknown>
}

export function ferramentas(pode: { equipe: boolean }): Ferramenta[] {
  return [
    {
      name: 'criar_tarefa',
      description: 'Cria uma tarefa. Use quando ela PEDIR para criar, anotar como '
        + 'tarefa, lembrar de fazer ou marcar algo a fazer. Sem fluxo_id a tarefa é '
        + 'avulsa e só ela vê; com fluxo_id ela entra naquela track e conta para o '
        + 'checkpoint. Só use fluxo_id de uma track que esteja na lista acima.',
      input_schema: {
        type: 'object',
        properties: {
          texto: { type: 'string', description: 'O que fazer, numa linha.' },
          prazo: { type: 'string', description: 'Dia, no formato AAAA-MM-DD. Omita se ela não disse quando.' },
          descricao: { type: 'string', description: 'O resto, quando o título não basta.' },
          fluxo_id: { type: 'string', description: 'A track onde ela vive. Omita para avulsa.' },
          etapa_id: { type: 'string', description: 'O checkpoint. Omita para o checkpoint atual da track.' },
        },
        required: ['texto'],
      },
    },
    {
      name: 'criar_compromisso',
      description: 'Põe um compromisso na agenda dela. Use quando ela PEDIR para '
        + 'marcar, agendar ou pôr na agenda algo que tem dia.',
      input_schema: {
        type: 'object',
        properties: {
          titulo: { type: 'string' },
          quando: { type: 'string', description: 'O dia, AAAA-MM-DD. Obrigatório.' },
          inicio: { type: 'string', description: 'Hora de início, HH:MM. Omita se for o dia inteiro.' },
          fim: { type: 'string', description: 'Hora de fim, HH:MM.' },
          local: { type: 'string' },
        },
        required: ['titulo', 'quando'],
      },
    },
    {
      name: 'criar_nota',
      description: 'Guarda uma nota no caderno dela. Use quando ela PEDIR para '
        + 'guardar, anotar ou salvar uma ideia como nota. A primeira linha é o título.',
      input_schema: {
        type: 'object',
        properties: { texto: { type: 'string' } },
        required: ['texto'],
      },
    },
    {
      name: 'criar_track',
      description: 'Monta um objetivo (tem fim) ou uma rotina (dá voltas) com a trilha '
        + 'INTEIRA. Use quando ela PEDIR um projeto, uma obra, uma rotina ou um processo '
        + 'com etapas; para uma coisa só a fazer, use criar_tarefa. '
        + 'NÃO CHAME ISTO NA PRIMEIRA MENSAGEM: pergunte antes o fim, o prazo e o que já '
        + 'está pronto, como diz a instrução. Chamando, preencha TODOS os campos, '
        + 'inclusive o critério de cada checkpoint, a descrição de cada tarefa e os prazos '
        + 'em dias: uma trilha de títulos vazios não ajuda ninguém e dá trabalho de apagar.',
      input_schema: {
        type: 'object',
        properties: {
          nome: { type: 'string' },
          tipo: { type: 'string', enum: ['esteira', 'ciclo'],
            description: 'esteira para objetivo (tem fim), ciclo para rotina (dá voltas).' },
          ...(pode.equipe
            ? { so_minha: { type: 'boolean',
                description: 'true só quando ela disser que é dela, privada ou pessoal. '
                  + 'O padrão é falso: a track é da empresa e a equipe vê.' } }
            : {}),
          checkpoints: {
            type: 'array',
            description: 'Pelo menos dois, em ordem. Cada um é uma porta do processo.',
            items: {
              type: 'object',
              properties: {
                nome: { type: 'string',
                  description: 'O que PASSOU A SER VERDADE, curto. "Projeto aprovado", e não '
                    + '"Projeto". Ele é uma porta, não um assunto.' },
                criterio: { type: 'string',
                  description: 'A frase que responde "como eu sei que dá para passar daqui?". '
                    + 'Concreta e conferível, nunca "estar tudo certo".' },
                prazo_dias: { type: 'number',
                  description: 'Em quantos dias a partir de HOJE este checkpoint fecha. '
                    + 'Acumulado, não por etapa: o terceiro é maior que o segundo.' },
                tarefas: {
                  type: 'array',
                  description: 'Duas a quatro. O trabalho concreto que abre esta porta.',
                  items: {
                    type: 'object',
                    properties: {
                      texto: { type: 'string',
                        description: 'No imperativo e com objeto: "Levantar as medidas do '
                          + 'terreno", nunca "Medidas".' },
                      descricao: { type: 'string',
                        description: 'O que quem for fazer precisa saber e não cabe no título: '
                          + 'contra o que conferir, onde buscar, qual o critério. Uma ou duas '
                          + 'frases. É a parte que mais falta e a que mais vale.' },
                      prazo_dias: { type: 'number',
                        description: 'Dias a partir de hoje, dentro do prazo do checkpoint.' },
                    },
                    /* `descricao` e `prazo_dias` entram em `required` de propósito.
                       A instrução pedia os dois e o modelo os pulava, porque o esquema
                       dizia que eram opcionais: entre o que o texto pede e o que o
                       formato exige, o formato ganha. É a diferença entre a track que
                       saiu meia boca e a que saiu inteira. */
                    required: ['texto', 'descricao', 'prazo_dias'],
                  },
                },
              },
              required: ['nome', 'criterio', 'prazo_dias', 'tarefas'],
            },
          },
        },
        required: ['nome', 'tipo', 'checkpoints'],
      },
    },
    {
      name: 'ver_track',
      description: 'Abre uma track e devolve a trilha inteira dela: cada checkpoint com '
        + 'critério e prazo, e cada tarefa com responsável, prazo e se já saiu. Use SEMPRE '
        + 'antes de opinar sobre uma track, antes de acrescentar tarefa nela e antes de '
        + 'dizer em que pé ela está. A lista que você recebeu acima tem só os nomes.',
      input_schema: {
        type: 'object',
        properties: { fluxo_id: { type: 'string', description: 'O id, das listas acima.' } },
        required: ['fluxo_id'],
      },
    },
    {
      name: 'ver_nota',
      description: 'Abre uma nota do caderno dela pelo título e devolve o texto inteiro. '
        + 'Use quando a conversa tocar num assunto que ela já escreveu: o índice acima só '
        + 'tem os títulos, e responder pelo título é chutar o conteúdo.',
      input_schema: {
        type: 'object',
        properties: { titulo: { type: 'string', description: 'O título, do índice acima.' } },
        required: ['titulo'],
      },
    },
    {
      name: 'buscar',
      description: 'Procura uma palavra no que ela tem: notas, tarefas e tracks. Use quando '
        + 'ela falar de algo que você não achou nas listas acima, antes de dizer que não '
        + 'sabe. Uma ou duas palavras, sem acento nem caixa.',
      input_schema: {
        type: 'object',
        properties: { termo: { type: 'string' } },
        required: ['termo'],
      },
    },
    {
      name: 'mudar_tarefa',
      description: 'Muda uma tarefa que JÁ EXISTE: o texto, o prazo ou a descrição. '
        + 'Use quando ela disser para adiar, antecipar, renomear ou detalhar algo que já '
        + 'está na lista. O item_id tem que ser de uma tarefa das listas acima; sem achar '
        + 'qual é, pergunte em vez de chutar. Para tirar o prazo, mande prazo="nenhum". '
        + 'Você NÃO conclui e NÃO apaga tarefa: isso ela faz na tela.',
      input_schema: {
        type: 'object',
        properties: {
          item_id: { type: 'string', description: 'O id da tarefa, das listas acima.' },
          texto: { type: 'string', description: 'O novo texto. Omita para não mexer.' },
          prazo: { type: 'string', description: 'AAAA-MM-DD, ou "nenhum" para tirar o prazo.' },
          descricao: { type: 'string', description: 'A nova descrição.' },
        },
        required: ['item_id'],
      },
    },
  ]
}

/** O nome da ferramenta vira o campo `faz` que `valida` entende. */
export const doNomeDaFerramenta = (nome: string): string =>
  ({ criar_tarefa: 'tarefa', criar_compromisso: 'compromisso', criar_nota: 'nota',
     criar_track: 'track', mudar_tarefa: 'mudaTarefa' }[nome] || '')

/** O nome da ferramenta de LEITURA vira o campo `ve` que `validaPergunta` entende. */
export const doNomeDaPergunta = (nome: string): string =>
  ({ ver_track: 'track', ver_nota: 'nota', buscar: 'busca' }[nome] || '')
