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
 * palavras da própria pessoa, e aqui um modelo interpreta. Por isso a lista do
 * que ele pode fazer é **curta e só do dono**: tarefa avulsa (que nasce privada
 * por construção), compromisso, nota, e, no espaço pessoal, track. Nada que
 * ponha trabalho no nome de outra pessoa, nada que mude o que já existe, e
 * nada que apague.
 *
 * **Toda ação feita se conta na conversa**, com o que foi criado. Sem isso o
 * secretário vira um lugar onde coisas nascem num canto que ninguém viu
 * acontecer, que é o mesmo defeito que `contarNoCanal` existe para fechar.
 */

export type Acao =
  | { faz: 'tarefa'; texto: string; prazo?: string | null; descricao?: string }
  | { faz: 'compromisso'; titulo: string; quando: string; inicio?: string | null
      fim?: string | null; local?: string }
  | { faz: 'nota'; texto: string }
  | { faz: 'track'; nome: string; tipo: 'esteira' | 'ciclo'
      checkpoints: { nome: string; tarefas?: string[] }[] }

/** Quanto uma leitura pode fazer de uma vez, para um engano não virar faxina. */
export const MAXIMO = 8

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
 * A ação que veio do modelo, conferida antes de virar escrita.
 *
 * Devolve nulo em vez de corrigir: ação torta é engano de leitura, e consertar
 * um engano por dentro é guardar o engano com outra cara. A pessoa vê o que o
 * secretário disse que ia fazer, e o que não foi feito ela refaz numa frase.
 */
export function valida(bruta: unknown, pode: { tracks: boolean }): Acao | null {
  const a = bruta as Record<string, unknown> | null
  if (!a || typeof a !== 'object') return null

  if (a.faz === 'tarefa') {
    const t = texto(a.texto, 200)
    if (!t) return null
    return { faz: 'tarefa', texto: t, prazo: dia(a.prazo), descricao: texto(a.descricao, 2000) }
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
    // Track é a única que não é só do dono num espaço de equipe, e por isso ela
    // só existe onde não há segunda pessoa.
    if (!pode.tracks) return null
    const nome = texto(a.nome, 120)
    const tipo = a.tipo === 'ciclo' ? 'ciclo' : 'esteira'
    const crus = Array.isArray(a.checkpoints) ? a.checkpoints : []
    const checkpoints = crus
      .map((c) => {
        const e = c as Record<string, unknown>
        const n = texto(e?.nome, 120)
        if (!n) return null
        const tarefas = (Array.isArray(e.tarefas) ? e.tarefas : [])
          .map((x) => texto(x, 200)).filter(Boolean).slice(0, 10)
        return { nome: n, tarefas }
      })
      .filter((c): c is { nome: string; tarefas: string[] } => !!c)
      .slice(0, 12)
    // Um checkpoint só não é trilha: é a lista avulsa com outro nome, e o
    // produto chama isso de não ser processo.
    return nome && checkpoints.length >= 2 ? { faz: 'track', nome, tipo, checkpoints } : null
  }

  return null
}

/** As ações do modelo, peneiradas e limitadas. */
export const validaTodas = (brutas: unknown, pode: { tracks: boolean }): Acao[] =>
  (Array.isArray(brutas) ? brutas : [])
    .map((b) => valida(b, pode))
    .filter((a): a is Acao => !!a)
    .slice(0, MAXIMO)

/**
 * O que foi feito, escrito para a pessoa ler na conversa.
 *
 * Em português e no passado, porque já aconteceu: "Criei a tarefa X" é o
 * recibo, e um recibo que fala em futuro deixa a dúvida de se foi mesmo.
 */
export function contar(a: Acao): string {
  if (a.faz === 'tarefa') {
    return `Tarefa: ${a.texto}${a.prazo ? `, até ${a.prazo}` : ''}`
  }
  if (a.faz === 'compromisso') {
    const q = a.inicio ? `${a.quando} às ${a.inicio}${a.fim ? ` até ${a.fim}` : ''}` : a.quando
    return `Compromisso: ${a.titulo}, ${q}${a.local ? `, em ${a.local}` : ''}`
  }
  if (a.faz === 'nota') {
    const primeira = a.texto.split('\n')[0].trim()
    return `Nota: ${primeira.slice(0, 80)}${primeira.length > 80 ? '...' : ''}`
  }
  return `Track: ${a.nome}, com ${a.checkpoints.length} checkpoints`
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

export function ferramentas(pode: { tracks: boolean }): Ferramenta[] {
  const lista: Ferramenta[] = [
    {
      name: 'criar_tarefa',
      description: 'Cria uma tarefa na lista da pessoa. Use quando ela PEDIR para '
        + 'criar, anotar como tarefa, lembrar de fazer ou marcar algo a fazer.',
      input_schema: {
        type: 'object',
        properties: {
          texto: { type: 'string', description: 'O que fazer, numa linha.' },
          prazo: { type: 'string', description: 'Dia, no formato AAAA-MM-DD. Omita se ela não disse quando.' },
          descricao: { type: 'string', description: 'O resto, quando o título não basta. Quase sempre vazio.' },
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
  ]

  if (pode.tracks) {
    lista.push({
      name: 'criar_track',
      description: 'Monta um objetivo (tem fim) ou uma rotina (dá voltas), com a '
        + 'trilha de checkpoints. Use só quando ela PEDIR um projeto, uma rotina ou '
        + 'um processo com etapas. Para uma coisa só a fazer, use criar_tarefa.',
      input_schema: {
        type: 'object',
        properties: {
          nome: { type: 'string' },
          tipo: { type: 'string', enum: ['esteira', 'ciclo'],
            description: 'esteira para objetivo (tem fim), ciclo para rotina (dá voltas).' },
          checkpoints: {
            type: 'array',
            description: 'Pelo menos dois. Cada um é uma porta do processo, com as tarefas dentro.',
            items: {
              type: 'object',
              properties: {
                nome: { type: 'string' },
                tarefas: { type: 'array', items: { type: 'string' } },
              },
              required: ['nome'],
            },
          },
        },
        required: ['nome', 'tipo', 'checkpoints'],
      },
    })
  }
  return lista
}

/** O nome da ferramenta vira o campo `faz` que `valida` entende. */
export const doNomeDaFerramenta = (nome: string): string =>
  ({ criar_tarefa: 'tarefa', criar_compromisso: 'compromisso',
     criar_nota: 'nota', criar_track: 'track' }[nome] || '')
