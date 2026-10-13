import { data, iso } from './datas'
import {
  type Expediente, type Ocupado, type Vaga,
  diaUtil, emMinutos, livresDoDia, temExpediente,
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

/**
 * Uma peça já com lugar no calendário.
 *
 * **`inicio` é NULO na tarefa, e isso é a regra inteira desta versão.** Hora é
 * de compromisso: reunião, consulta, viagem, aula. Tarefa é trabalho que você
 * faz quando couber, e cravar "escrever a proposta às 9h" é o app decidindo a
 * ordem do seu dia por você, com a certeza de errar na primeira vez que o
 * telefone tocar. O que a tarefa ocupa é CAPACIDADE: ela come minutos do dia,
 * em qualquer horário.
 */
export type Encaixe = {
  chave: string
  tipo: 'tarefa' | 'compromisso'
  texto: string
  quando: string
  /** Hora, só quando ela existe de verdade. Tarefa e reserva de capacidade não têm. */
  inicio: string | null
  fim: string | null
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
 * O que vale uma tarefa que ninguém estimou.
 *
 * **Sem isto o dia mente para baixo, e foi assim que o Organizar encheu uma
 * terça que já estava cheia:** 12 tarefas abertas naquele dia, 5 com duração e
 * 7 sem, e as 7 pesavam ZERO. O dia parecia ter sete horas livres tendo três.
 *
 * Contar 45 minutos não é inventar dado: é a mesma afirmação que `conferir` já
 * faz ao criar, e ela vale no lugar onde o estrago é maior, que é a conta do
 * dia. **Não grava nada**: a tarefa continua sem duração no banco até alguém
 * dizer qual é, e é por isso que ela não vira um número falso que ninguém mais
 * questiona.
 */
export const PADRAO_MINUTOS = 45

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
   * Duas contas, e elas são diferentes.
   *
   * `ocupado` são as HORAS tomadas: o que já estava na agenda mais o
   * compromisso marcado que o plano acabou de pôr. Serve para dois
   * compromissos não nascerem na mesma hora.
   *
   * `carga` são os MINUTOS que o dia deve a trabalho sem hora: tarefa e
   * reserva de capacidade. Eles não tomam horário nenhum, tomam saldo, e é
   * esse saldo que a agenda mostra e que o compromisso novo tem que respeitar.
   */
  const tomarHora = (v: Vaga) => {
    ocupado = [...ocupado, { quando: v.quando, inicio: v.inicio, fim: v.fim }]
  }
  const tomarSaldo = (dia: string, minutos: number) => {
    carga[dia] = (carga[dia] || 0) + minutos
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
    tomarHora({ quando: p.quando as string, inicio, fim })
  }

  /**
   * 3. As reservas de CAPACIDADE, que é no que a cadência virou.
   *
   * "2h por dia para estudar canais" não é uma reunião às 13h30: é duas horas
   * daquele dia, em qualquer horário. Antes isso virava bloco com hora, e o
   * resultado era uma agenda cheia de compromissos que não eram compromissos
   * com ninguém, e que a pessoa furava sem culpa nenhuma, porque a hora tinha
   * sido inventada pelo app.
   *
   * Ela toma SALDO e não hora, então não procura buraco: procura dia com
   * folga. "dia" sai em dias seguidos, "semana" sai espaçado.
   */
  for (const p of blocos) {
    const r = p.repete as NonNullable<Peca['repete']>
    const achados = diasComSaldo(e, ocupado, carga, proximoDia(e, hoje), r.vezes, r.minutos,
      r.cadencia)
    if (!achados.length) {
      sobras.push({ chave: p.chave, texto: p.texto, porque: 'Não sobra tempo no seu expediente.' })
      continue
    }
    for (const dia of achados) {
      encaixes.push({
        chave: p.chave, tipo: 'compromisso', texto: p.texto,
        quando: dia, inicio: null, fim: null, minutos: r.minutos, firme: false,
      })
      tomarSaldo(dia, r.minutos)
    }
    if (achados.length < r.vezes) {
      sobras.push({
        chave: p.chave, texto: p.texto,
        porque: `Coube ${achados.length} de ${r.vezes} vezes no seu expediente.`,
      })
    }
  }

  /**
   * 4. As tarefas, no saldo que sobrou, e SEM HORA.
   *
   * **A ordem entre elas é o prazo, e as sem prazo vão por último.** Quem tem
   * data tem data por um motivo que o app não conhece, e dar o dia da terça
   * para a tarefa que vence em duas semanas é exatamente o erro que o botão
   * existe para não cometer. A longa antes da curta dentro do mesmo prazo,
   * porque o dia cheio ainda aceita a de quinze minutos depois.
   */
  const porPrazo = [...tarefas].sort((a, b) => {
    const pa = a.prazo || '9999-12-31'
    const pb = b.prazo || '9999-12-31'
    if (pa !== pb) return pa < pb ? -1 : 1
    return b.minutos - a.minutos
  })

  for (const p of porPrazo) {
    let dia = proximoDia(e, hoje)
    let achou: string | null = null
    for (let i = 0; i < HORIZONTE; i++) {
      // Prazo é parede: a tarefa não nasce depois do dia em que ela vence.
      if (p.prazo && dia > p.prazo) break
      if (diaUtil(e, dia) && cabeNoDia(e, dia, ocupado, carga, p.minutos)) { achou = dia; break }
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
      quando: achou, inicio: null, fim: null, minutos: p.minutos, firme: false,
    })
    tomarSaldo(achou, p.minutos)
  }

  // Dia primeiro, e dentro do dia o que tem hora antes do que não tem: a
  // reunião das 10h é um ponto fixo, e o resto do dia se arruma em volta dela.
  encaixes.sort((a, b) => (a.quando + (a.inicio || '~') < b.quando + (b.inicio || '~') ? -1 : 1))
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
 * O SALDO do dia: quanto tempo ainda sobra para trabalho sem hora.
 *
 * É a conta que a agenda mostra e a que o compromisso novo tem que respeitar.
 * Expediente, menos as horas já marcadas, menos o que o dia já deve a tarefa e
 * a reserva de capacidade.
 */
export function saldoDoDia(
  e: Expediente | null | undefined, dia: string, ocupado: Ocupado[], jaDevido: number,
): number {
  if (!temExpediente(e)) return 0
  return Math.max(0, minutosLivres(e, dia, ocupado) - Math.max(0, jaDevido))
}

/**
 * Este dia ainda aguenta mais isto?
 *
 * Duas perguntas, e as duas precisam ser feitas. A primeira é o SALDO: o que
 * sobra do expediente depois das horas marcadas e do que o dia já deve a
 * trabalho sem hora. A segunda é a FOLGA, e é ela que impede o plano de encher
 * as oito horas de alguém com oito horas de lista: tem espaço no calendário e
 * não tem espaço na vida.
 *
 * **A conta é do dia INTEIRO, e não só do que o plano pôs.** Foi assim que ela
 * nasceu errada: olhando só a própria carga, uma terça com seis horas e meia de
 * reunião ainda parecia vazia e ganhava tarefa até somar oito e meia.
 *
 * O `Math.max` com os próprios minutos existe para a tarefa grande não ficar
 * órfã: uma de quatro horas num dia de quatro horas livres passaria do teto de
 * 80% e nunca acharia dia nenhum, e aí o plano devolveria "não cabe" justo para
 * a coisa que mais precisa de lugar.
 */
function cabeNoDia(
  e: Expediente, dia: string, ocupado: Ocupado[],
  carga: Record<string, number>, minutos: number,
): boolean {
  const devido = carga[dia] || 0
  if (saldoDoDia(e, dia, ocupado, devido) < minutos) return false
  const expediente = minutosLivres(e, dia, [])
  const comprometido = (expediente - minutosLivres(e, dia, ocupado)) + devido
  const teto = Math.round(expediente * FOLGA)
  return comprometido + minutos <= Math.max(teto, minutos)
}

/**
 * Os dias em que cabe uma reserva de capacidade que se repete.
 *
 * Procura DIA com folga, e não buraco na agenda, porque o que ela toma é saldo.
 * "semana" pula um dia útil entre uma e outra, que é o que "2 a 3 dias por
 * semana" quer dizer; "dia" sai em dias seguidos.
 */
export function diasComSaldo(
  e: Expediente, ocupado: Ocupado[], carga: Record<string, number>,
  deDia: string, quantas: number, minutos: number, cadencia: 'dia' | 'semana',
): string[] {
  const saida: string[] = []
  let dia = deDia
  let folga = false
  for (let i = 0; i < HORIZONTE && saida.length < quantas; i++) {
    if (i > 0) dia = amanha(dia)
    if (!diaUtil(e, dia)) continue
    if (folga) { folga = false; continue }
    if (!cabeNoDia(e, dia, ocupado, carga, minutos)) continue
    saida.push(dia)
    carga[dia] = (carga[dia] || 0) + minutos
    if (cadencia === 'semana') folga = true
  }
  // A carga foi somada aqui para um dia não receber duas, e quem soma de
  // verdade é `tomarSaldo`: desfaz, senão ela conta duas vezes.
  for (const d of saida) carga[d] = (carga[d] || 0) - minutos
  return saida
}

/**
 * Uma coisa que deve tempo a um dia, sem ter hora.
 *
 * Tarefa aberta com prazo, e reserva de capacidade. As duas somam no mesmo
 * saldo porque, do ponto de vista do dia, são a mesma coisa: trabalho que vai
 * acontecer ali, em algum momento.
 */
export type Devedor = { quando: string; minutos: number }

/** Quanto este dia já deve a trabalho sem hora. */
export const devidoNoDia = (devedores: Devedor[], dia: string) =>
  devedores.reduce((t, d) => (d.quando === dia ? t + d.minutos : t), 0)
