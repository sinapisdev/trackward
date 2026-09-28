/**
 * O processo descoberto: mostrar a grama pisada.
 *
 * Empresa sem processo **já tem processo**. Ele só não é constante, não é
 * explícito e não tem dono. Este arquivo não inventa nenhum: ele olha o que já
 * aconteceu e mostra por onde as pessoas já andam.
 *
 * ## Por que não procura sequência
 *
 * O jeito óbvio seria procurar a mesma sequência de passos se repetindo. Ele
 * não funciona em empresa desorganizada, que é justamente quem mais precisa
 * disto: lá a ordem muda toda vez, alguém pula etapa, alguém faz duas de uma
 * vez. Procurando sequência, a resposta é sempre "não achei nada".
 *
 * Então ela procura **invariantes**, que sobrevivem ao caos:
 *
 *   - o mesmo **gatilho** que começa
 *   - o mesmo **desfecho** que termina
 *   - o mesmo **conjunto** de eventos no meio, MESMO FORA DE ORDEM
 *   - as mesmas **áreas** envolvidas
 *
 * ## Por que ela não sabe o que é "financeiro"
 *
 * E não precisa saber. Classificar setor exigiria uma lista minha do que é um
 * processo financeiro, jurídico ou operacional; ela estaria errada para metade
 * das empresas, e a primeira construtora com um jeito próprio de fazer medição
 * cairia na gaveta errada.
 *
 * O setor entra por outro caminho, que não exige definir nada: **a área de quem
 * fez**. Se a maioria dos eventos de um trabalho é de gente do Financeiro, ele é
 * financeiro. E o NOME sai das palavras que a própria empresa usa, não de um
 * vocabulário meu. Os que atravessam área não são confusão: são os mais
 * valiosos, porque mostram onde trava entre setores.
 */

/** Um evento já achatado, do jeito que a view `eventos` devolve. */
export type Evento = {
  quando: string
  /** 'tarefa:feita', 'decisao:aprovou', 'anexo', 'prazo:pedido'... */
  tipo: string
  detalhe: string | null
  fluxo_id: string | null
  quem_id: string | null
  area_id: string | null
}

/** Uma execução: tudo que aconteceu dentro de uma track, do começo ao fim. */
export type Execucao = {
  fluxo_id: string
  nome: string
  /** O primeiro evento, que é como aquilo começou. */
  gatilho: string
  /** Como terminou: 'concluido', 'cancelado' ou 'aberto'. */
  desfecho: string
  /** Os tipos de evento que aconteceram no meio, sem ordem e sem repetição. */
  passos: Set<string>
  /** As áreas de quem participou. */
  areas: Set<string>
  inicio: string
  fim: string
  /** Quantos dias do começo ao fim. */
  duracao: number
}

export type Candidato = {
  /** As execuções que este candidato agrupa. */
  execucoes: Execucao[]
  gatilho: string
  desfecho: string
  /** Os passos que aparecem na MAIORIA das execuções. O resto é ruído. */
  passos: string[]
  areas: string[]
  /** Quantas vezes isto já aconteceu. */
  vezes: number
  /** 0 a 1: o quanto as execuções se parecem entre si. */
  confianca: number
  cadencia: 'rotina' | 'sazonal' | 'pontual'
  /** As durações observadas, que é o mapa da inconstância. */
  duracoes: number[]
  nome: string
}

/** Quanto dois conjuntos se parecem: 1 é igual, 0 é nada em comum. */
export function parecenca(a: Set<string>, b: Set<string>): number {
  if (!a.size && !b.size) return 1
  let juntos = 0
  for (const x of a) if (b.has(x)) juntos++
  return juntos / (a.size + b.size - juntos)
}

/**
 * Duas execuções são do mesmo processo?
 *
 * Gatilho e desfecho têm que bater, e o miolo tem que se parecer. Os três
 * juntos, e não um deles: só o miolo agruparia "aprovar orçamento" com
 * "aprovar férias", porque os dois são feitos de tarefa, aprovação e anexo.
 */
const PARECIDO = 0.5

export function mesmoProcesso(a: Execucao, b: Execucao): boolean {
  if (a.gatilho !== b.gatilho) return false
  if (a.desfecho !== b.desfecho) return false
  if (parecenca(a.passos, b.passos) < PARECIDO) return false
  // Áreas: basta uma em comum. Exigir todas mataria justamente o processo que
  // atravessa setor, que é o mais valioso de descobrir.
  if (a.areas.size && b.areas.size && !parecenca(a.areas, b.areas)) return false
  return true
}

/** Monta as execuções a partir dos eventos, uma por track. */
export function execucoesDe(
  eventos: Evento[],
  tracks: { id: string; nome: string; concluido: boolean; desfecho: string | null }[],
): Execucao[] {
  const porTrack = new Map<string, Evento[]>()
  for (const e of eventos) {
    if (!e.fluxo_id) continue
    const lista = porTrack.get(e.fluxo_id)
    if (lista) lista.push(e)
    else porTrack.set(e.fluxo_id, [e])
  }

  const saida: Execucao[] = []
  for (const t of tracks) {
    const es = (porTrack.get(t.id) || []).sort((a, b) => a.quando.localeCompare(b.quando))
    // Menos de três eventos não é execução, é rascunho.
    if (es.length < 3) continue
    const inicio = es[0].quando
    const fim = es[es.length - 1].quando
    saida.push({
      fluxo_id: t.id,
      nome: t.nome,
      gatilho: es[0].tipo,
      desfecho: t.desfecho || (t.concluido ? 'concluido' : 'aberto'),
      // O primeiro e o último ficam de fora do miolo: eles já são o gatilho e
      // o desfecho, e contá-los duas vezes inflaria a parecença de graça.
      passos: new Set(es.slice(1, -1).map((e) => e.tipo)),
      areas: new Set(es.map((e) => e.area_id).filter(Boolean) as string[]),
      inicio,
      fim,
      duracao: Math.max(0, Math.round((Date.parse(fim) - Date.parse(inicio)) / 86400000)),
    })
  }
  return saida
}

/**
 * A cadência sai do intervalo entre execuções, e ela decide o tipo da track.
 *
 * Regular e curto é **rotina** (vira `ciclo`). Regular e longo, ou preso a um
 * mês do ano, é **sazonal**. Sem regularidade é **pontual** (vira `esteira`).
 */
export function cadencia(inicios: string[]): Candidato['cadencia'] {
  if (inicios.length < 3) return 'pontual'
  const dias = [...inicios].sort()
    .map((x) => Date.parse(x))
    .slice(1)
    .map((x, i) => (x - Date.parse([...inicios].sort()[i])) / 86400000)
  const media = dias.reduce((a, b) => a + b, 0) / dias.length
  if (!media) return 'pontual'
  // Desvio relativo: o quanto os intervalos variam em relação à média. Acima de
  // meio, não há regularidade nenhuma e chamar de rotina seria mentira.
  const desvio = Math.sqrt(dias.reduce((a, d) => a + (d - media) ** 2, 0) / dias.length) / media
  if (desvio > 0.5) return 'pontual'
  return media <= 45 ? 'rotina' : 'sazonal'
}

/**
 * O nome sai das palavras que a empresa já usa.
 *
 * As que aparecem no nome da maioria das execuções. Se nada se repete, o nome
 * fica vazio e quem batiza é gente: inventar nome bonito para um processo que
 * a casa chama de outra coisa é começar errado.
 */
export function nomeComum(nomes: string[]): string {
  const conta = new Map<string, number>()
  for (const n of nomes) {
    const vistas = new Set(
      n.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
        .split(/[^a-z0-9]+/).filter((w) => w.length > 3),
    )
    for (const w of vistas) conta.set(w, (conta.get(w) || 0) + 1)
  }
  const corte = Math.ceil(nomes.length / 2)
  const boas = [...conta.entries()].filter(([, n]) => n >= corte)
    .sort((a, b) => b[1] - a[1]).slice(0, 3).map(([w]) => w)
  return boas.join(' ')
}

/**
 * O nome do evento em português de gente.
 *
 * Os tipos da view `eventos` são de máquina: "tarefa:feita", "decisao:aprovou".
 * Pôr isso como nome de checkpoint entrega um processo que parece log de
 * sistema, e a empresa lê aquilo e conclui, com razão, que não foi feito para
 * ela. O nome definitivo é de quem usa; este é o que se apresenta enquanto
 * ninguém rebatizou.
 */
export function rotuloDoPasso(tipo: string): string {
  const fixos: Record<string, string> = {
    atividade: 'Começo',
    concluido: 'Entrega',
    cancelado: 'Encerramento',
    aberto: 'Em andamento',
    'tarefa:nasceu': 'Preparação',
    'tarefa:feita': 'Execução',
    anexo: 'Documentação',
    'prazo:pedido': 'Replanejamento',
    'decisao:aprovou': 'Aprovação',
    'decisao:ressalva': 'Aprovação com ressalva',
    'decisao:devolveu': 'Devolução',
  }
  if (fixos[tipo]) return fixos[tipo]
  // O que não está na lista vira o que estiver depois dos dois pontos, com a
  // primeira letra maiúscula: "conferir:estoque" fica "Estoque".
  const parte = tipo.includes(':') ? tipo.split(':')[1] : tipo
  return parte.charAt(0).toUpperCase() + parte.slice(1).replace(/[-_]/g, ' ')
}

/** Quantas vezes é preciso ver antes de chamar de processo. */
const MINIMO = 3

/**
 * Agrupa as execuções em candidatos a processo.
 *
 * Guloso de propósito: cada execução entra no primeiro grupo com que se
 * parece. Agrupamento perfeito aqui não vale o custo, porque o resultado nunca
 * vira processo sozinho: ele vira uma PROPOSTA que alguém aceita ou recusa.
 */
export function descobrir(execucoes: Execucao[]): Candidato[] {
  const grupos: Execucao[][] = []
  for (const e of execucoes) {
    const achou = grupos.find((g) => mesmoProcesso(g[0], e))
    if (achou) achou.push(e)
    else grupos.push([e])
  }

  return grupos
    .filter((g) => g.length >= MINIMO)
    .map((g) => {
      const corte = Math.ceil(g.length / 2)
      const conta = new Map<string, number>()
      for (const e of g) for (const p of e.passos) conta.set(p, (conta.get(p) || 0) + 1)
      const passos = [...conta.entries()].filter(([, n]) => n >= corte)
        .sort((a, b) => b[1] - a[1]).map(([p]) => p)

      const areas = [...new Set(g.flatMap((e) => [...e.areas]))]
      // A confiança é o quanto as execuções se parecem entre si, na média
      // contra a primeira. Baixa não quer dizer errado: quer dizer que a casa
      // faz de jeitos diferentes, e isso é o mapa da inconstância.
      const confianca = g.length < 2 ? 0
        : g.slice(1).reduce((a, e) => a + parecenca(g[0].passos, e.passos), 0) / (g.length - 1)

      return {
        execucoes: g,
        gatilho: g[0].gatilho,
        desfecho: g[0].desfecho,
        passos,
        areas,
        vezes: g.length,
        confianca: Math.round(confianca * 100) / 100,
        cadencia: cadencia(g.map((e) => e.inicio)),
        duracoes: g.map((e) => e.duracao).sort((a, b) => a - b),
        nome: nomeComum(g.map((e) => e.nome)),
      }
    })
    .sort((a, b) => b.vezes - a.vezes)
}

/**
 * O mapa da inconstância, que na empresa sem processo vale mais que o processo.
 *
 * Frases, e não números soltos: "entre o pedido e a entrega passaram 6, 9, 22 e
 * 31 dias" é uma coisa que o dono lê e reage. Um desvio padrão de 11,4 não é.
 */
export type Frase = {
  texto: string
  /**
   * Sobre qual passo ela fala, quando fala de um.
   *
   * Existe para que a tela não mostre o mapa e a pergunta dizendo a mesma coisa
   * uma embaixo da outra: quando o passo virou pergunta, a frase sai, porque a
   * pergunta é sempre a melhor das duas (ela carrega o que faltar custou).
   */
  alvo?: string
}

export function inconstancia(c: Candidato): Frase[] {
  const fora: Frase[] = []

  if (c.duracoes.length >= 3) {
    const min = c.duracoes[0]
    const max = c.duracoes[c.duracoes.length - 1]
    if (max >= min * 3 && max - min >= 5) {
      fora.push({
        texto: `Do começo ao fim passaram ${c.duracoes.join(', ')} dias. `
          + 'A mesma coisa levou tempos muito diferentes.',
      })
    }
  }

  // Passo que acontece em algumas execuções e em outras não: é aí que mora o
  // "das 11 vezes, em 4 ninguém conferiu".
  const conta = new Map<string, number>()
  for (const e of c.execucoes) for (const p of e.passos) conta.set(p, (conta.get(p) || 0) + 1)
  for (const [passo, n] of conta) {
    if (n < c.vezes && n >= c.vezes * 0.4) {
      fora.push({
        texto: `"${rotuloDoPasso(passo)}" aconteceu em ${n} das ${c.vezes} vezes. `
          + 'Nas outras, não. Devia ser sempre?',
        alvo: passo,
      })
    }
  }

  if (c.confianca < 0.6 && c.vezes >= 3) {
    fora.push({
      texto: `As ${c.vezes} vezes seguiram caminhos bem diferentes entre si. `
        + 'Talvez sejam duas coisas parecidas, e não uma só.',
    })
  }

  return fora
}
