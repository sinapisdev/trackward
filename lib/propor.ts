import type { Candidato, Execucao } from './descobrir'

/**
 * Da grama pisada para o processo desenhado: as perguntas que fecham a conta.
 *
 * A descoberta mostra **o quê**: das 11 vezes, em 4 ninguém conferiu o estoque.
 * Ela não sabe **por quê**, nem **o que deve valer daqui para frente** — e essas
 * duas coisas ninguém infere de dado nenhum, porque elas são decisão.
 *
 * Então a pergunta carrega o número e preenche o buraco que o número não
 * responde:
 *
 *   "Das 11 vezes, em 4 ninguém conferiu o estoque antes de prometer prazo.
 *    Nessas 4, levou o dobro do tempo. Conferir estoque devia ser obrigatório?"
 *
 * Isso não é formulário e não é só estatística. É sim ou não, de cinco
 * segundos, e a resposta **muda o processo**. E é impossível de falsificar: só
 * quem observou aquela empresa poderia perguntar aquilo, e é daí que vem a
 * sensação de "isto foi feito para mim".
 *
 * ## O que NUNCA se pergunta
 *
 * "Como é o seu processo?" e "como você gostaria que fosse?". A primeira ninguém
 * sabe responder; a segunda todo mundo responde com o processo que gostaria de
 * ter, que não é o que acontece. As duas entram bonitas no sistema e não batem
 * com nada.
 *
 * ## Uma de cada vez
 *
 * A lista sai ordenada pelo que mais muda o desenho, e quem chama manda **uma**.
 * Cinco perguntas juntas viram formulário, e formulário é abandonado; uma
 * pergunta por vez, cada uma com o seu número, é conversa.
 */

export type MudaOQue =
  /** Vira tarefa obrigatória do processo. */
  | 'passo-obrigatorio'
  /** Vira checkpoint: alguém confere antes de seguir. */
  | 'vira-checkpoint'
  /** Define quem responde por aquela passagem. */
  | 'define-aprovador'
  /** São duas coisas parecidas, e não uma: separa o candidato em dois. */
  | 'separa-em-dois'
  /** O prazo típico daquele trecho. */
  | 'define-prazo'

export type PerguntaDoProcesso = {
  /** O que sobe para o acervo. Não carrega nada da empresa. */
  chave: string
  /** O texto, com o número dentro. */
  texto: string
  opcoes: { chave: string; rotulo: string }[]
  muda: MudaOQue
  /** Sobre qual passo, quando for o caso. */
  alvo?: string
  /** O quanto responder isto melhora o desenho. Ordena a fila. */
  peso: number
}

/** A mediana, que aguenta o caso extremo melhor que a média. */
function mediana(ns: number[]): number {
  if (!ns.length) return 0
  const s = [...ns].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2)
}

/**
 * O passo faltando custou tempo?
 *
 * Compara quanto durou quando o passo aconteceu e quanto durou quando não
 * aconteceu. É a frase que transforma um número morno numa pergunta que o dono
 * responde na hora: não é "em 4 de 11 faltou", é "nas 4 em que faltou, levou o
 * dobro".
 */
export function custoDeFaltar(execucoes: Execucao[], passo: string): {
  com: number; sem: number; quantasSem: number; piorou: boolean
} {
  const com = execucoes.filter((e) => e.passos.has(passo)).map((e) => e.duracao)
  const sem = execucoes.filter((e) => !e.passos.has(passo)).map((e) => e.duracao)
  const a = mediana(com)
  const b = mediana(sem)
  // Metade a mais já é diferença que alguém sente. Abaixo disso é ruído, e
  // afirmar ruído uma vez derruba a credibilidade de tudo que vier depois.
  return { com: a, sem: b, quantasSem: sem.length, piorou: !!a && b >= a * 1.5 }
}

const SIM_NAO = [
  { chave: '1', rotulo: 'Sim, devia ser sempre' },
  { chave: '2', rotulo: 'Não, depende do caso' },
]

/**
 * As perguntas que faltam para este candidato virar processo.
 *
 * `quemAprovou` é quem decidiu cada execução, quando houve decisão: é daí que
 * sai a pergunta sobre aprovador, que é a que mais muda o desenho, porque
 * processo sem dono é o que a empresa já tinha antes do app.
 */
export function perguntasDoProcesso(
  c: Candidato,
  quemAprovou: { execucao: string; quem: string | null; nome: string }[] = [],
): PerguntaDoProcesso[] {
  const saida: PerguntaDoProcesso[] = []

  // 1. O PASSO QUE ÀS VEZES ACONTECE. O mais valioso de todos, porque a
  //    resposta vira tarefa obrigatória ou checkpoint, que é desenho de verdade.
  const conta = new Map<string, number>()
  for (const e of c.execucoes) for (const p of e.passos) conta.set(p, (conta.get(p) || 0) + 1)

  for (const [passo, n] of conta) {
    if (n >= c.vezes || n < c.vezes * 0.3) continue
    const custo = custoDeFaltar(c.execucoes, passo)
    const numero = `Das ${c.vezes} vezes, em ${c.vezes - n} ninguém fez "${passo}".`
    const doeu = custo.piorou
      ? ` Nessas ${custo.quantasSem}, levou ${custo.sem} dias contra ${custo.com} das outras.`
      : ''
    saida.push({
      chave: 'passo-as-vezes',
      texto: `${numero}${doeu} Isso devia ser obrigatório?`,
      opcoes: SIM_NAO,
      muda: custo.piorou ? 'vira-checkpoint' : 'passo-obrigatorio',
      alvo: passo,
      // O que custou tempo vale mais que o que só variou.
      peso: custo.piorou ? 90 : 60,
    })
  }

  // 2. QUEM APROVA. Processo sem dono é o que a empresa já tinha antes do app.
  if (quemAprovou.length >= 3) {
    const porPessoa = new Map<string, { nome: string; n: number }>()
    let ninguem = 0
    for (const d of quemAprovou) {
      if (!d.quem) { ninguem++; continue }
      const atual = porPessoa.get(d.quem)
      if (atual) atual.n++
      else porPessoa.set(d.quem, { nome: d.nome, n: 1 })
    }
    if (porPessoa.size > 1 || ninguem > 0) {
      const lista = [...porPessoa.values()].sort((a, b) => b.n - a.n)
      const trecho = lista.map((p) => `${p.nome} ${p.n}`).join(', ')
        + (ninguem ? `, e ${ninguem} sem ninguém` : '')
      saida.push({
        chave: 'quem-aprova',
        texto: `Isto foi aprovado por ${trecho}. Quem devia responder por esta passagem?`,
        opcoes: [
          ...lista.slice(0, 3).map((p, i) => ({ chave: String(i + 1), rotulo: p.nome })),
          { chave: '9', rotulo: 'Qualquer um da área' },
        ],
        muda: 'define-aprovador',
        // Sobe quando houve vez sem ninguém: aí não é variação, é buraco.
        peso: ninguem > 0 ? 95 : 70,
      })
    }
  }

  // 3. SÃO DUAS COISAS? Confiança baixa costuma ser dois processos parecidos
  //    dentro do mesmo balde, e separar é melhor que desenhar um que não serve
  //    a nenhum dos dois.
  if (c.confianca < 0.6 && c.vezes >= 4) {
    saida.push({
      chave: 'sao-dois',
      texto: `Agrupei ${c.vezes} trabalhos parecidos, mas eles seguiram caminhos bem `
        + 'diferentes entre si. São a mesma coisa, ou são duas?',
      opcoes: [
        { chave: '1', rotulo: 'É a mesma coisa' },
        { chave: '2', rotulo: 'São duas coisas diferentes' },
      ],
      muda: 'separa-em-dois',
      peso: 80,
    })
  }

  // 4. O PRAZO TÍPICO. Só quando há alguma estabilidade: perguntar prazo de uma
  //    coisa que levou de 4 a 30 dias é pedir um chute.
  if (c.duracoes.length >= 3) {
    const meio = mediana(c.duracoes)
    const espalhado = c.duracoes[c.duracoes.length - 1] >= c.duracoes[0] * 3
    if (!espalhado && meio > 0) {
      saida.push({
        chave: 'prazo-tipico',
        texto: `Isto costuma levar ${meio} dias do começo ao fim. `
          + 'Uso esse prazo como padrão quando criar os próximos?',
        opcoes: [
          { chave: '1', rotulo: `Sim, ${meio} dias` },
          { chave: '2', rotulo: 'Não, eu defino caso a caso' },
        ],
        muda: 'define-prazo',
        peso: 40,
      })
    }
  }

  return saida.sort((a, b) => b.peso - a.peso)
}

/**
 * O primeiro processo entregue: três coisas e no máximo um checkpoint.
 *
 * Não é preguiça, é o que a empresa absorve. Quem nunca teve processo recebe um
 * de doze etapas, acha bonito, e abandona em duas semanas: as etapas viram
 * cobrança de burocracia que ninguém pediu, e o processo inteiro é descartado
 * junto. Cada etapa a mais entra depois, e com motivo: "três vezes alguém
 * refez porque isso não foi conferido. Quer virar checkpoint?"
 */
export const PRIMEIRO_MAXIMO = { passos: 3, checkpoints: 1 }

export function primeiroDesenho(c: Candidato): {
  nome: string; tipo: 'esteira' | 'ciclo'; passos: string[]; checkpoint: string | null
} {
  return {
    nome: c.nome || 'Processo sem nome',
    // A cadência decide o tipo, e ela saiu do intervalo entre as execuções.
    tipo: c.cadencia === 'rotina' ? 'ciclo' : 'esteira',
    passos: c.passos.slice(0, PRIMEIRO_MAXIMO.passos),
    // O checkpoint é o desfecho: o único lugar onde alguém confere antes de
    // dar a coisa por encerrada.
    checkpoint: c.passos.length ? c.desfecho : null,
  }
}
