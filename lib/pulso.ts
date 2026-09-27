/**
 * O pulso: quando a leitura automática deve bater.
 *
 * O relógio de fora chama uma vez por hora. Quem decide se **esta** organização
 * é atendida agora é este arquivo, e ele é de propósito uma função pura: dá para
 * testar cem horários sem banco, sem rede e sem esperar o dia passar.
 *
 * O desenho em uma frase: a janela do dia é dividida em tantas fatias quantas
 * forem as leituras contratadas, e cada fatia tem um horário no meio dela. O
 * pulso bate quando um desses horários já passou e a última leitura é anterior a
 * ele.
 *
 * POR QUE HORÁRIO FIXO E NÃO "DE TANTAS EM TANTAS HORAS": porque o relógio bate
 * de hora em hora e o intervalo quase nunca é um número redondo de horas. Com
 * intervalo, três leituras por dia viram duas ou quatro conforme o arredondamento
 * e conforme o minuto em que o relógio de fora resolve bater. Com horário fixo,
 * três é três.
 *
 * E o fuso importa: 8h da manhã em Manaus não é 8h em São Paulo, e ninguém quer
 * receber proposta às três da manhã porque o servidor mora em outro continente.
 */

export type Agenda = {
  /** Quantas leituras por dia. 0 desliga e o app volta a só ler no botão. */
  leitura_por_dia: number
  /** A faixa de horário, no fuso da empresa. Formato "HH:MM-HH:MM". */
  leitura_janela: string
  fuso: string
  /** Quando a última leitura rodou. Nulo é nunca. */
  pulso_em: string | null
}

export const JANELA_PADRAO = '08:00-19:00'

/** Minutos desde a meia-noite, a partir de "HH:MM". Nulo quando não é hora. */
function minutosDe(hhmm: string): number | null {
  const m = hhmm.trim().match(/^([01]?\d|2[0-3]):([0-5]\d)$/)
  if (!m) return null
  return Number(m[1]) * 60 + Number(m[2])
}

/**
 * A janela, em minutos do dia. Janela inválida ou invertida cai no padrão, em
 * vez de desligar a leitura: configuração errada não pode calar o produto.
 */
export function janela(texto: string): { de: number; ate: number } {
  const [a, b] = String(texto || '').split('-')
  const de = minutosDe(a || '')
  const ate = minutosDe(b || '')
  if (de === null || ate === null || ate <= de) {
    const [pa, pb] = JANELA_PADRAO.split('-')
    return { de: minutosDe(pa)!, ate: minutosDe(pb)! }
  }
  return { de, ate }
}

/**
 * Os horários do dia em que o pulso bate, em minutos.
 *
 * Cada fatia tem o seu horário no meio, e não na borda. Na borda, a primeira
 * leitura sairia às 8h em ponto, quando quase ninguém ainda falou nada naquele
 * dia, e a última às 19h, quando já não adianta avisar.
 */
export function horarios(a: Agenda): number[] {
  const n = Math.max(0, Math.min(24, Math.floor(a.leitura_por_dia || 0)))
  if (!n) return []
  const { de, ate } = janela(a.leitura_janela)
  const passo = (ate - de) / n
  return Array.from({ length: n }, (_, k) => Math.round(de + passo / 2 + k * passo))
}

/**
 * O dia e a hora de um instante, no fuso pedido.
 *
 * Fuso inválido cai em UTC, e data inválida cai num dia que não existe. Esse
 * segundo caso parece paranoia e não é: `pulso_em` vem do banco, e uma data
 * torta ali não pode derrubar a varredura de todas as empresas. Devolvendo um
 * dia impossível, a comparação lá embaixo entende como "nunca leu" e lê, que é
 * o lado seguro de errar.
 */
const NUNCA = { dia: '0000-00-00', minutos: 0 }

export function noFuso(quando: Date, fuso: string): { dia: string; minutos: number } {
  if (!(quando instanceof Date) || !Number.isFinite(quando.getTime())) return NUNCA

  const tentar = (tz: string) => {
    const partes = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(quando)
    const p = (t: string) => partes.find((x) => x.type === t)?.value || '00'
    // 24 aparece em algumas bibliotecas de fuso para a meia-noite, e vira 0.
    const hora = Number(p('hour')) % 24
    return { dia: `${p('year')}-${p('month')}-${p('day')}`, minutos: hora * 60 + Number(p('minute')) }
  }

  try { return tentar(fuso || 'UTC') } catch { /* fuso que o servidor não conhece */ }
  try { return tentar('UTC') } catch { return NUNCA }
}

export type Decisao =
  | { bate: false; porque: 'desligado' | 'fora da janela' | 'cedo demais' }
  | { bate: true; horario: number }

/**
 * Esta organização deve ser lida agora?
 *
 * Devolve também o porquê do não, porque "o pulso não rodou" sem motivo é a
 * classe de problema que se investiga por três dias.
 */
export function devePulsar(
  a: Agenda, agora: Date = new Date(),
  /**
   * Os horários aprendidos do ritmo da casa, quando houver conversa suficiente
   * para eles significarem alguma coisa. Vazio cai no espalhamento de sempre:
   * inventar padrão com pouco dado é pior do que um horário honesto e fixo.
   */
  aprendidos: number[] = [],
): Decisao {
  const alvos = aprendidos.length ? aprendidos : horarios(a)
  if (!alvos.length) return { bate: false, porque: 'desligado' }

  const hoje = noFuso(agora, a.fuso)
  const { de, ate } = janela(a.leitura_janela)
  if (hoje.minutos < de || hoje.minutos > ate) return { bate: false, porque: 'fora da janela' }

  // O último horário que já passou hoje. Se nenhum passou, ainda é cedo.
  const passados = alvos.filter((h) => h <= hoje.minutos)
  if (!passados.length) return { bate: false, porque: 'cedo demais' }
  const alvo = passados[passados.length - 1]

  if (!a.pulso_em) return { bate: true, horario: alvo }

  const ultimo = noFuso(new Date(a.pulso_em), a.fuso)
  // Comparar por dia e minuto do fuso da empresa evita aritmética de fuso, que é
  // onde esse tipo de conta costuma errar no horário de verão.
  const jaLeuNesteHorario = ultimo.dia === hoje.dia && ultimo.minutos >= alvo
  if (jaLeuNesteHorario) return { bate: false, porque: 'cedo demais' }
  return { bate: true, horario: alvo }
}

/** "às 09:50" e "às 13:30", para a tela dizer quando vai ler. */
export const comoHora = (minutos: number) =>
  `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`

/** A frase da tela de ajustes: "3 vezes por dia, às 09:50, 13:30 e 17:10". */
export function comoTexto(a: Agenda): string {
  const h = horarios(a)
  if (!h.length) return 'Desligada. A conversa só é lida quando alguém pedir.'
  const horas = h.map(comoHora)
  const lista = horas.length === 1
    ? horas[0]
    : `${horas.slice(0, -1).join(', ')} e ${horas[horas.length - 1]}`
  return `${h.length} ${h.length === 1 ? 'vez' : 'vezes'} por dia, às ${lista}.`
}
