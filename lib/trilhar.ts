import type { Fluxo, Item } from './tipos'
import { PRIMEIRO_MAXIMO } from './propor'

/**
 * Quando um canal já tem forma, e o que propor.
 *
 * O canal sem track trabalha numa track escondida (`fluxos.implicita`, seção 59
 * do schema): ela existe para a primeira tarefa combinada ali ter onde morar, e
 * tem um checkpoint só, chamado "Em andamento". Até aqui tudo bem. O problema é
 * que ela fica escondida PARA SEMPRE: o canal acumula quarenta tarefas numa
 * lista invisível e nunca ganha trilha, que é o mesmo que o produto ser um chat
 * com lista de tarefas ao lado.
 *
 * Este arquivo responde duas perguntas, e as duas são de regra, não de modelo:
 *
 *   1. aquele canal já mostrou forma? (`temForma`)
 *   2. quais tarefas caem em qual checkpoint? (`rascunhoDaTrilha`)
 *
 * **O modelo só entra para dar NOME.** É a mesma divisão de `lib/descobrir.ts`
 * e de `lib/raiox.ts`: a regra mora em TypeScript, onde se lê e se muda com
 * rede, e o modelo faz o que só ele faz bem, que é achar a palavra que a casa
 * usaria. Pedir ao modelo para decidir SE propor seria trocar um limiar que se
 * discute por um palpite que ninguém consegue auditar depois.
 */

/**
 * Os limiares, e o motivo de cada um.
 *
 * São conservadores de propósito. A regra 1.6 do plano ("não afirme sem
 * amostra") existe justamente para isto: propor um processo a partir de três
 * tarefas é afirmar sobre o acaso, e a primeira vez que o app fizer isso a
 * pessoa para de acreditar no resto, inclusive no que ele acerta.
 */
export const MATURIDADE = {
  /**
   * O rascunho tem três checkpoints, e checkpoint com UMA tarefa não é porta, é
   * item. Duas por porta é o mínimo que mostra que ali acontece alguma coisa.
   */
  tarefas: PRIMEIRO_MAXIMO.checkpoints * 2,
  /**
   * Sem nada concluído não existe sequência, só lista de desejos. E é a ORDEM
   * em que as coisas ficaram prontas que desenha a trilha: sem ela, agrupar
   * seria inventar etapa.
   */
  concluidas: 3,
  /**
   * Uma tarde movimentada não é processo. Duas semanas atravessam dois ciclos
   * semanais, que é o menor período em que dá para ver repetição.
   */
  dias: 14,
}

/** O que já aconteceu ali, em número. É isto que faz a pessoa reconhecer a casa dela. */
export type Prova = {
  tarefas: number
  concluidas: number
  /** Dias entre a primeira tarefa e a última mexida. */
  dias: number
  /** Quantas pessoas diferentes executaram alguma coisa ali. */
  pessoas: number
}

export type PassoCru = {
  /** As tarefas que caíram neste checkpoint, na ordem em que aconteceram. */
  tarefas: Item[]
}

export type Rascunho = {
  fluxo_id: string
  /** O nome do canal. O nome da track pode ser outro, e quem dá é o modelo. */
  canal: string
  prova: Prova
  passos: PassoCru[]
  /**
   * Objetivo ou rotina, pelo que o trabalho mostrou.
   *
   * O palpite é fraco de propósito e vira pergunta na tela: repetir o MESMO
   * texto de tarefa em períodos diferentes é o único sinal honesto de rotina
   * que existe aqui, e ele erra com facilidade. Na dúvida, objetivo, porque
   * objetivo que deveria ser rotina ainda termina; rotina que deveria ser
   * objetivo dá voltas para sempre sem ninguém reparar.
   */
  parece: 'esteira' | 'ciclo'
}

const dia = 864e5

/** Quantos dias entre duas datas ISO, sempre positivo. */
function diasEntre(a: string, b: string) {
  const d = Math.abs(new Date(b).getTime() - new Date(a).getTime())
  return Math.floor(d / dia)
}

/** Todas as tarefas da track, de todos os checkpoints dela. */
export function tarefasDe(f: Fluxo): Item[] {
  return f.etapas.flatMap((e) => e.itens)
}

/**
 * A ordem em que as coisas de fato aconteceram.
 *
 * Concluídas primeiro, pela hora em que ficaram prontas, e as abertas no fim,
 * pela ordem em que foram escritas. É isso que transforma uma lista num
 * caminho: a trilha de um processo é a sequência que a casa cumpriu, não a
 * sequência em que alguém digitou.
 */
export function naOrdemDoQueAconteceu(itens: Item[]): Item[] {
  const feitas = itens.filter((i) => i.feito && i.feito_em)
    .sort((a, b) => (a.feito_em || '').localeCompare(b.feito_em || ''))
  const resto = itens.filter((i) => !(i.feito && i.feito_em))
    .sort((a, b) => a.ordem - b.ordem)
  return [...feitas, ...resto]
}

export function provaDe(f: Fluxo, agora = new Date().toISOString()): Prova {
  const itens = tarefasDe(f)
  const datas = [f.criado_em, ...itens.map((i) => i.feito_em).filter(Boolean) as string[]]
  const primeira = datas.sort()[0] || agora
  return {
    tarefas: itens.length,
    concluidas: itens.filter((i) => i.feito).length,
    dias: diasEntre(primeira, agora),
    pessoas: new Set(itens.map((i) => i.resp_id).filter(Boolean)).size,
  }
}

/**
 * Aquele canal já mostrou forma?
 *
 * Só vale para track escondida: a que já é track de verdade não precisa de
 * proposta para nascer, ela precisa de melhoria, que é outra conversa.
 */
export function temForma(f: Fluxo, agora = new Date().toISOString()): boolean {
  if (!f.implicita || f.concluido || f.desfecho) return false
  const p = provaDe(f, agora)
  return p.tarefas >= MATURIDADE.tarefas
    && p.concluidas >= MATURIDADE.concluidas
    && p.dias >= MATURIDADE.dias
}

/**
 * Objetivo ou rotina?
 *
 * Rotina é o que dá voltas, e a única marca disso que sobrevive aqui é o mesmo
 * trabalho sendo refeito: dois textos de tarefa iguais, concluídos em momentos
 * diferentes. Um texto repetido pode ser descuido; dois pares já é hábito.
 */
export function pareceRotina(itens: Item[]): boolean {
  const limpo = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
  const vezes = new Map<string, number>()
  for (const i of itens) vezes.set(limpo(i.texto), (vezes.get(limpo(i.texto)) || 0) + 1)
  return [...vezes.values()].filter((n) => n > 1).length >= 2
}

/**
 * Reparte as tarefas em três checkpoints, na ordem do que aconteceu.
 *
 * Reparte igual, e não por semelhança de texto: agrupar por palavra parecida
 * juntaria "conferir o orçamento" com "conferir as férias", que é o erro que a
 * seção da descoberta descreve e evita de propósito. A sequência é o único
 * sinal que não depende de o app entender o assunto, e entender o assunto é
 * exatamente o que ele não sabe fazer.
 *
 * Checkpoint vazio não sai: é melhor entregar dois de verdade do que três com
 * um inventado para fechar a conta.
 */
export function repartir(itens: Item[], quantos = PRIMEIRO_MAXIMO.checkpoints): PassoCru[] {
  const ordem = naOrdemDoQueAconteceu(itens)
  if (!ordem.length) return []
  const n = Math.min(quantos, ordem.length)
  const porPasso = Math.ceil(ordem.length / n)
  const passos: PassoCru[] = []
  for (let i = 0; i < ordem.length; i += porPasso) {
    passos.push({ tarefas: ordem.slice(i, i + porPasso) })
  }
  return passos.filter((p) => p.tarefas.length)
}

/** O rascunho inteiro, pronto para o modelo dar nome. Nulo quando ainda não há forma. */
export function rascunhoDaTrilha(
  f: Fluxo, canal: string, agora = new Date().toISOString(),
): Rascunho | null {
  if (!temForma(f, agora)) return null
  const itens = tarefasDe(f)
  return {
    fluxo_id: f.id,
    canal,
    prova: provaDe(f, agora),
    passos: repartir(itens),
    parece: pareceRotina(itens) ? 'ciclo' : 'esteira',
  }
}

/**
 * Os nomes, quando não há modelo para dar.
 *
 * Não é o bom caminho, é o caminho honesto quando o teto de leitura estourou ou
 * a chave não está ligada: melhor um nome sem graça tirado da primeira tarefa
 * do que "Etapa 1", que é nome de formulário, ou do que não propor nada.
 *
 * O nome fica curto porque ele vai num cartão estreito, e cortar no meio de uma
 * palavra é pior do que cortar cedo.
 */
export function nomesSemModelo(r: Rascunho): { nome: string; passos: string[] } {
  const curto = (t: string) => {
    const limpo = t.trim().replace(/\s+/g, ' ')
    if (limpo.length <= 28) return limpo
    const corte = limpo.slice(0, 28)
    return corte.slice(0, corte.lastIndexOf(' ') > 12 ? corte.lastIndexOf(' ') : 28)
  }
  return {
    nome: r.canal,
    passos: r.passos.map((p) => curto(p.tarefas[0]?.texto || 'Em andamento')),
  }
}

/**
 * A frase do cartão: o que aconteceu, com número, antes de qualquer desenho.
 *
 * A ordem é o argumento, e não arrumação de tela. Começar pelo rascunho é pedir
 * opinião sobre um desenho sem dizer de onde ele saiu, e a resposta honesta a
 * isso é "não sei". O número primeiro é o que faz a pessoa reconhecer a casa
 * dela e, só então, olhar o que foi montado.
 */
export function oQueAconteceu(r: Rascunho): string {
  const { tarefas, concluidas, dias, pessoas } = r.prova
  const gente = pessoas > 1 ? `, entre ${pessoas} pessoas` : ''
  return `Em #${r.canal} nasceram ${tarefas} tarefas nos últimos ${dias} dias${gente}, `
    + `e ${concluidas} já foram concluídas.`
}

/**
 * Os nomes, pelo modelo.
 *
 * É a única parte disto que não é regra, e é por isso que ela é dele: achar a
 * palavra que a CASA usaria para um conjunto de tarefas é exatamente o que
 * regra nenhuma faz bem, e exatamente o que ele faz. Tudo o mais (se propor,
 * quais tarefas em qual passo, objetivo ou rotina) já veio decidido daqui.
 *
 * O cuidado da seção dos processos descobertos vale igual: o checkpoint não
 * pode se chamar "tarefa:feita" nem "Etapa 1". Um processo nomeado assim parece
 * log de sistema, e a empresa lê e conclui, com razão, que aquilo não foi feito
 * para ela.
 *
 * Falhando, devolve nulo e quem chamou usa `nomesSemModelo`: um nome sem graça
 * é melhor do que não propor nada.
 */
export async function nomearTrilha(
  r: Rascunho, chave: string, modelo: string,
): Promise<{ nome: string; passos: string[] } | null> {
  const passos = r.passos.map((p, i) =>
    `${i + 1}. ${p.tarefas.map((t) => `- ${t.texto}`).join('\n')}`).join('\n')
  const corpo = {
    model: modelo,
    max_tokens: 400,
    system: 'Você nomeia etapas de processo de uma empresa brasileira, em português do '
      + 'Brasil. Use as palavras que a própria empresa usa nas tarefas. Cada nome tem de '
      + 'uma a três palavras, começa por substantivo ou verbo no infinitivo, e descreve a '
      + 'FASE, não a tarefa. Nunca use "Etapa 1", "Fase", "Início", "Meio", "Fim", nem '
      + 'nomes genéricos como "Execução" quando houver palavra melhor na lista.',
    tools: [{
      name: 'nomear',
      description: 'Devolve o nome da track e o nome de cada checkpoint.',
      input_schema: {
        type: 'object',
        properties: {
          nome: { type: 'string', description: 'Nome da track, até 4 palavras.' },
          passos: { type: 'array', items: { type: 'string' } },
        },
        required: ['nome', 'passos'],
      },
    }],
    tool_choice: { type: 'tool', name: 'nomear' },
    messages: [{
      role: 'user',
      content: `O canal se chama "${r.canal}". As tarefas que nasceram nele, agrupadas na `
        + `ordem em que foram concluídas:\n\n${passos}\n\n`
        + `Dê um nome para a track e um nome para cada um dos ${r.passos.length} grupos.`,
    }],
  }
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': chave,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(corpo),
    })
    if (!res.ok) return null
    const json = await res.json() as {
      content?: { type: string; name?: string; input?: { nome?: string; passos?: string[] } }[]
    }
    const uso = json.content?.find((b) => b.type === 'tool_use' && b.name === 'nomear')
    const nome = uso?.input?.nome?.trim()
    const lista = uso?.input?.passos?.map((x) => String(x).trim()).filter(Boolean)
    // Nomes a menos deixariam checkpoint sem nome, e o banco o chamaria de
    // "Checkpoint 2". Melhor cair inteiro no caminho sem modelo.
    if (!nome || !lista || lista.length < r.passos.length) return null
    return { nome, passos: lista.slice(0, r.passos.length) }
  } catch {
    return null
  }
}
