import { data, iso } from './datas'
import {
  type Expediente, type Ocupado, type Vaga,
  diaUtil, emMinutos, livresDoDia, temExpediente, vagas,
} from './expediente'

/**
 * O plano da semana: onde cada coisa cabe, e o que não coube.
 *
 * **O dia tem ORÇAMENTO, e tarefa e compromisso gastam do mesmo bolso.** Essa é
 * a frase inteira deste arquivo. Antes eram dois mundos: o compromisso
 * procurava buraco na agenda (`vagas`) e a tarefa ganhava um prazo escolhido
 * pelo modelo, sem ninguém perguntar se aquele dia tinha hora sobrando. O
 * resultado aparecia na terça com duas reuniões e cinco tarefas de uma hora: o
 * app tinha prometido sete horas de trabalho num dia que tinha três livres, e
 * quem descobria isso era a pessoa, na terça.
 *
 * Com um orçamento só, as duas coisas que o Leo pediu caem de graça, porque são
 * a mesma vista de dois lados: dia cheio de compromisso sobra pouco para
 * tarefa, e dia cheio de tarefa sobra pouco para compromisso. Não há uma regra
 * para cada caso, e é por isso que não há como uma delas ser esquecida.
 *
 * **O cálculo mora aqui, puro**, pela mesma razão de `lib/raiox.ts` e de
 * `lib/trilhar.ts`: o que decide o dia de alguém precisa poder ser lido e
 * ensaiado sem subir servidor. O modelo diz O QUÊ e QUANTO LEVA; quem diz
 * QUANDO é este arquivo.
 */

/** Uma coisa a encaixar, antes de ter dia. */
export type Peca = {
  /** Quem é ela lá fora: o id da proposta, para a tela casar de volta. */
  chave: string
  tipo: 'tarefa' | 'compromisso'
  texto: string
  minutos: number
  /** Compromisso marcado: o dia já veio, e não se move. */
  quando?: string | null
  inicio?: string | null
  /** Tarefa com prazo dito pela pessoa. Não cai depois disso. */
  prazo?: string | null
  /** Bloco que se repete, do jeito que a leitura devolve. */
  repete?: { minutos: number; vezes: number; cadencia: 'dia' | 'semana'; periodo?: 'manha' | 'tarde' } | null
}

/** Uma peça já com lugar no calendário. */
export type Encaixe = {
  chave: string
  tipo: 'tarefa' | 'compromisso'
  texto: string
  quando: string
  inicio: string
  fim: string
  minutos: number
  /** Veio com dia e hora de fábrica: o plano não escolheu, só respeitou. */
  firme: boolean
}

/** O que não coube, e por quê. A tela mostra: plano que esconde sobra mente. */
export type Sobra = { chave: string; texto: string; porque: string }

export type Plano = {
  encaixes: Encaixe[]
  sobras: Sobra[]
  /** Quanto cada dia ficou com de trabalho, em minutos. É a reserva da agenda. */
  carga: Record<string, number>
}

/**
 * Quanto tempo livre o dia ainda tem, dentro do expediente.
 *
 * É `livresDoDia` somado. Separado porque a pergunta "cabe?" é diferente de
 * "onde?": a primeira decide o dia da tarefa, a segunda a hora dela, e misturar
 * as duas foi o que fez o encaixe antigo não enxergar o dia cheio.
 */
export function minutosLivres(e: Expediente, dia: string, ocupado: Ocupado[]): number {
  return livresDoDia(e, dia, ocupado)
    .reduce((total: number, [a, b]: [number, number]) => total + (b - a), 0)
}

/** O dia seguinte, em ISO. */
const amanha = (dia: string) => {
  const x = data(dia)
  x.setDate(x.getDate() + 1)
  return iso(x)
}

const paraHora = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

/**
 * A primeira fatia livre do dia que caiba, já com a hora.
 *
 * Devolve nulo quando não cabe, e não "o maior pedaço disponível": meia tarefa
 * marcada é pior que tarefa não marcada, porque dá a ela a aparência de
 * resolvida.
 */
function primeiraFatia(
  e: Expediente, dia: string, ocupado: Ocupado[], minutos: number,
  periodo?: 'manha' | 'tarde',
): Vaga | null {
  for (const [a, b] of livresDoDia(e, dia, ocupado)) {
    if (b - a < minutos) continue
    if (periodo === 'manha' && a >= 12 * 60) continue
    if (periodo === 'tarde' && a < 12 * 60) continue
    return { quando: dia, inicio: paraHora(a), fim: paraHora(a + minutos) }
  }
  return null
}

/**
 * O horizonte do plano.
 *
 * Trinta dias é o quanto adiante vale encaixar: além disso a semana muda antes
 * de chegar, e o plano vira promessa. O que não couber não ganha um dia
 * qualquer no fim da fila, vira SOBRA e aparece dizendo isso, porque um dia
 * inventado lá na frente é indistinguível de um dia escolhido.
 */
export const HORIZONTE = 30

/**
 * Quanto do dia o app se permite encher de tarefa.
 *
 * Não é o dia inteiro, de propósito. Ninguém trabalha oito horas seguidas no
 * que estava na lista: aparece telefone, aparece gente na porta, e a hora que o
 * plano tomou toda é a hora que faltou para o imprevisto. Oitenta por cento do
 * que está livre deixa a folga sem inventar uma regra de pausa, e erra na
 * direção certa: o dia que sobrou se resolve sozinho, o dia que estourou cobra
 * da pessoa.
 */
export const FOLGA = 0.8

/**
 * Monta o plano.
 *
 * A ordem é a regra inteira, e ela não é arbitrária:
 *
 * 1. **O que já está marcado na agenda** ocupa primeiro, e não se discute.
 * 2. **Compromisso com dia e hora** entra em seguida, firme: a pessoa disse
 *    quinta às 10h, e o app não remarca o que ela combinou com alguém.
 * 3. **Bloco que se repete** procura buraco, como já fazia.
 * 4. **Tarefa** entra por último, no que sobrou.
 *
 * A tarefa ficar por último é o que faz "dia cheio de compromisso recebe menos
 * tarefa" acontecer sem nenhuma regra dizendo isso: quando ela chega, o dia já
 * gastou o que tinha de gastar. E o contrário vale porque cada tarefa encaixada
 * passa a OCUPAR: o compromisso que vier depois já encontra o dia menor.
 */
export function montar(
  pecas: Peca[],
  e: Expediente | null | undefined,
  agendaDeHoje: Ocupado[],
  hoje: string,
): Plano {
  const encaixes: Encaixe[] = []
  const sobras: Sobra[] = []
  const carga: Record<string, number> = {}

  if (!temExpediente(e)) {
    return {
      encaixes: [],
      sobras: pecas.map((p) => ({
        chave: p.chave, texto: p.texto,
        porque: 'Você ainda não disse em que horas trabalha.',
      })),
      carga: {},
    }
  }

  // A agenda cresce enquanto o plano é montado: o que acabou de ser encaixado
  // ocupa, senão duas coisas nascem na mesma hora do mesmo dia, que é
  // exatamente o encaixe manual que o botão existe para evitar.
  let ocupado: Ocupado[] = [...agendaDeHoje]
  /**
   * `carga` conta só TAREFA, e isso não é descuido.
   *
   * Ela é o tamanho da reserva que vai para a agenda, e reunião não se
   * reserva: ela já está lá. Somar as duas faria o dia com três reuniões
   * pedir três horas de bloco de trabalho por cima delas. Quem conta o dia
   * inteiro para a conta da folga é `ocupado`, que recebe tudo.
   */
  const tomar = (v: Vaga, minutos: number, eTarefa: boolean) => {
    ocupado = [...ocupado, { quando: v.quando, inicio: v.inicio, fim: v.fim }]
    if (eTarefa) carga[v.quando] = (carga[v.quando] || 0) + minutos
  }

  const marcados = pecas.filter((p) => p.tipo === 'compromisso' && p.quando)
  const blocos = pecas.filter((p) => p.tipo === 'compromisso' && !p.quando && p.repete)
  const tarefas = pecas.filter((p) => p.tipo === 'tarefa')

  // 2. O que ela já combinou com alguém. Entra como está, mesmo fora do
  // expediente: marcar fora do expediente é direito de quem marca, e um app que
  // recusa a reunião das 19h é um app que se descobre contornando.
  for (const p of marcados) {
    const inicio = p.inicio || '09:00'
    const fim = paraHora(emMinutos(inicio) + (p.minutos || 60))
    encaixes.push({
      chave: p.chave, tipo: 'compromisso', texto: p.texto,
      quando: p.quando as string, inicio, fim, minutos: p.minutos || 60, firme: true,
    })
    tomar({ quando: p.quando as string, inicio, fim }, p.minutos || 60, false)
  }

  // 3. Os blocos de tempo reservado, com a mesma função de sempre.
  for (const p of blocos) {
    const r = p.repete as NonNullable<Peca['repete']>
    const achadas = vagas(e, ocupado, proximoDia(e, hoje), r.vezes, r.minutos,
      { cadencia: r.cadencia, periodo: r.periodo })
    if (!achadas.length) {
      sobras.push({ chave: p.chave, texto: p.texto, porque: 'Não há espaço livre no seu expediente.' })
      continue
    }
    for (const v of achadas) {
      encaixes.push({
        chave: p.chave, tipo: 'compromisso', texto: p.texto,
        quando: v.quando, inicio: v.inicio, fim: v.fim, minutos: r.minutos, firme: false,
      })
      tomar(v, r.minutos, false)
    }
    if (achadas.length < r.vezes) {
      sobras.push({
        chave: p.chave, texto: p.texto,
        porque: `Coube ${achadas.length} de ${r.vezes} vezes no seu expediente.`,
      })
    }
  }

  /**
   * 4. As tarefas, no que sobrou.
   *
   * **A ordem entre elas é o prazo, e as sem prazo vão por último.** Quem tem
   * data tem data por um motivo que o app não conhece, e dar a vaga da terça
   * para a tarefa que vence em duas semanas é exatamente o erro que o botão
   * existe para não cometer. A longa antes da curta dentro do mesmo prazo,
   * porque bloco grande só cabe em dia vazio e a tarefa de quinze minutos cabe
   * em qualquer fresta depois.
   */
  const porPrazo = [...tarefas].sort((a, b) => {
    const pa = a.prazo || '9999-12-31'
    const pb = b.prazo || '9999-12-31'
    if (pa !== pb) return pa < pb ? -1 : 1
    return b.minutos - a.minutos
  })

  for (const p of porPrazo) {
    let dia = proximoDia(e, hoje)
    let achou: Vaga | null = null
    for (let i = 0; i < HORIZONTE; i++) {
      // Prazo é parede: a tarefa não nasce depois do dia em que ela vence.
      if (p.prazo && dia > p.prazo) break
      if (diaUtil(e, dia) && cabeNoDia(e, dia, ocupado, p.minutos)) {
        achou = primeiraFatia(e, dia, ocupado, p.minutos)
        if (achou) break
      }
      dia = amanha(dia)
    }
    if (!achou) {
      sobras.push({
        chave: p.chave, texto: p.texto,
        porque: p.prazo
          ? `Não cabe no seu expediente até ${p.prazo}.`
          : 'Não cabe no seu expediente nos próximos 30 dias.',
      })
      continue
    }
    encaixes.push({
      chave: p.chave, tipo: 'tarefa', texto: p.texto,
      quando: achou.quando, inicio: achou.inicio, fim: achou.fim,
      minutos: p.minutos, firme: false,
    })
    tomar(achou, p.minutos, true)
  }

  encaixes.sort((a, b) => (a.quando + a.inicio < b.quando + b.inicio ? -1 : 1))
  return { encaixes, sobras, carga }
}

/** O primeiro dia de trabalho a partir de hoje, hoje inclusive. */
function proximoDia(e: Expediente | null | undefined, dia: string): string {
  let d = dia
  for (let i = 0; i < 14; i++) {
    if (diaUtil(e, d)) return d
    d = amanha(d)
  }
  return dia
}

/**
 * Este dia ainda aguenta mais isto?
 *
 * Duas perguntas, e as duas precisam ser feitas. A primeira é se existe fatia
 * livre contígua, que `primeiraFatia` responde. A segunda é se o dia não passou
 * da FOLGA, e é ela que impede o plano de encher as oito horas de alguém com
 * oito horas de lista: tem espaço no calendário e não tem espaço na vida.
 *
 * **A conta é do dia INTEIRO, e não só do que o plano pôs.** Foi assim que ela
 * nasceu errada: olhando só a própria carga, uma terça com seis horas e meia de
 * reunião ainda parecia vazia, e ganhava tarefa nas frestas até somar oito horas
 * e meia de compromisso. Quem já estava lá conta, e por isso a pergunta se faz
 * ao `ocupado`, que carrega a agenda de verdade mais tudo que o plano encaixou
 * até agora.
 *
 * O `Math.max` com os próprios minutos existe para a tarefa grande não ficar
 * órfã: uma de quatro horas num dia de quatro horas livres passaria do teto de
 * 80% e nunca acharia dia nenhum, e aí o plano devolveria "não cabe" justo para
 * a coisa que mais precisa de lugar.
 */
function cabeNoDia(
  e: Expediente, dia: string, ocupado: Ocupado[], minutos: number,
): boolean {
  const livre = minutosLivres(e, dia, ocupado)
  if (livre < minutos) return false
  const expediente = minutosLivres(e, dia, [])
  const comprometido = expediente - livre
  const teto = Math.round(expediente * FOLGA)
  return comprometido + minutos <= Math.max(teto, minutos)
}
