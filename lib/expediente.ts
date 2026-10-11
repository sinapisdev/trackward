import { DSEM_LONGO, data, iso } from './datas'

/**
 * O expediente: as horas em que a pessoa trabalha.
 *
 * O app sabia quando a CASA fala e quando não perturbar, e não sabia a coisa
 * mais simples: de que horas a que horas aquela pessoa trabalha. Sem isso,
 * prazo de tarefa cai em sábado, o secretário marca reunião às 19h, e a conta
 * de carga divide o trabalho por um dia que não existe.
 *
 * **O cálculo mora aqui, puro.** É a mesma razão de `lib/raiox.ts` e de
 * `lib/comandar.ts`: o que decide onde o trabalho cai precisa poder ser lido e
 * ensaiado sem subir servidor. Quem grava é quem chamou.
 *
 * **Vazio quer dizer "ela não disse", e não "ela trabalha sempre".** A
 * diferença decide o comportamento: sem resposta o app não mexe em prazo
 * nenhum, e é isso que impede o primeiro dia de uso de empurrar as tarefas de
 * alguém para uma semana que ela nunca combinou.
 */

/** Uma faixa de horas, do começo ao fim, no fuso de quem trabalha. */
export type Faixa = [string, string]

/** As faixas por dia da semana. 0 é domingo, como em `Date.getDay()`. */
export type Blocos = Record<string, Faixa[]>

export type Expediente = {
  blocos: Blocos
  fuso: string
  /** O que não cabe em hora, para o modelo ler. O app não interpreta. */
  observacao: string
}

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/

/** Minutos desde a meia-noite, que é a forma em que hora se compara. */
export const emMinutos = (h: string) =>
  Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5))

/**
 * As faixas de um dia, conferidas e em ordem.
 *
 * Devolve vazio em vez de corrigir, pela mesma regra do secretário: faixa torta
 * é engano de leitura, e consertar por dentro é guardar o engano com outra
 * cara. O que se conserta é a ORDEM, porque "13:30 às 17:30 e 08:30 ao meio
 * dia" é a mesma manhã dita fora de ordem, e não um engano.
 */
export function faixasDoDia(cruas: unknown): Faixa[] {
  if (!Array.isArray(cruas)) return []
  const boas: Faixa[] = []
  for (const f of cruas) {
    if (!Array.isArray(f) || f.length !== 2) continue
    const [a, b] = [String(f[0]).trim(), String(f[1]).trim()]
    if (!HORA.test(a) || !HORA.test(b)) continue
    // Fim antes do começo não é expediente que vira a noite, é leitura torta:
    // ninguém descreve o próprio dia começando às 18h e terminando às 9h.
    if (emMinutos(b) <= emMinutos(a)) continue
    boas.push([a, b])
  }
  return boas.sort((x, y) => emMinutos(x[0]) - emMinutos(y[0])).slice(0, 4)
}

/** O expediente inteiro, conferido. Dia sem faixa boa some. */
export function valida(cru: unknown): Blocos {
  const o = (cru || {}) as Record<string, unknown>
  const saida: Blocos = {}
  for (let d = 0; d <= 6; d++) {
    const f = faixasDoDia(o[String(d)])
    if (f.length) saida[String(d)] = f
  }
  return saida
}

/** Alguma coisa foi dita? Vazio é "ela não respondeu ainda". */
export const temExpediente = (e: Expediente | null | undefined) =>
  !!e && Object.keys(e.blocos || {}).length > 0

/** Este dia tem expediente? Sábado e domingo somem por ausência, não por regra. */
export const diaUtil = (e: Expediente | null | undefined, dia: string) =>
  !!e && (e.blocos[String(data(dia).getDay())] || []).length > 0

/**
 * Esta hora cai dentro do expediente daquele dia?
 *
 * Usada para avisar, nunca para recusar. Marcar fora do expediente é direito de
 * quem marca: a reunião das 19h com o cliente existe, e um app que a recusa é
 * um app que se descobre contornando.
 */
export function dentro(e: Expediente | null | undefined, dia: string, hora: string): boolean {
  if (!e || !HORA.test(hora)) return false
  const faixas = e.blocos[String(data(dia).getDay())] || []
  const m = emMinutos(hora)
  return faixas.some(([a, b]) => m >= emMinutos(a) && m < emMinutos(b))
}

/**
 * O próximo dia útil a partir de um dia, inclusive ele mesmo.
 *
 * É o que impede o prazo de cair em sábado. Devolve o dia como veio quando
 * ninguém disse nada, porque **sem expediente o app não mexe em prazo**: adiar
 * a tarefa de alguém por uma regra que essa pessoa nunca deu é pior do que o
 * prazo cair num sábado que ela talvez trabalhe.
 *
 * O teto de 14 dias existe para a semana inteira vazia não virar laço infinito:
 * quem marcou expediente em nenhum dia recebe o dia de volta, e isso é melhor
 * que um app parado.
 */
export function proximoUtil(e: Expediente | null | undefined, dia: string): string {
  if (!temExpediente(e)) return dia
  let d = dia
  for (let i = 0; i < 14; i++) {
    if (diaUtil(e, d)) return d
    const x = data(d)
    x.setDate(x.getDate() + 1)
    d = iso(x)
  }
  return dia
}

/**
 * Quantas horas de trabalho a pessoa tem por semana.
 *
 * É a conta que falta para a carga dizer algo verdadeiro: "isto leva 50 dias"
 * é uma frase sobre dias de calendário, e dia de calendário não é dia de
 * trabalho. Quem usa isto hoje é a tela, para explicar o expediente de volta a
 * quem o escreveu.
 */
export function horasPorSemana(e: Expediente | null | undefined): number {
  if (!e) return 0
  let m = 0
  for (const faixas of Object.values(e.blocos || {})) {
    for (const [a, b] of faixas) m += emMinutos(b) - emMinutos(a)
  }
  return Math.round((m / 60) * 10) / 10
}

/**
 * O expediente escrito em português, para a tela e para o modelo.
 *
 * Dias seguidos com o mesmo horário viram uma linha, porque é assim que uma
 * pessoa diz: "de segunda a quinta das 8h30 ao meio-dia", e não quatro linhas
 * iguais. Uma lista que repete quatro vezes a mesma coisa não é lida.
 */
export function escrito(e: Expediente | null | undefined): string {
  if (!temExpediente(e)) return ''
  const chave = (d: number) =>
    (e!.blocos[String(d)] || []).map(([a, b]) => `${a} às ${b}`).join(' e ')

  const linhas: string[] = []
  let d = 0
  while (d <= 6) {
    const atual = chave(d)
    if (!atual) { d++; continue }
    let fim = d
    while (fim + 1 <= 6 && chave(fim + 1) === atual) fim++
    const nome = d === fim
      ? DSEM_LONGO[d]
      : `${DSEM_LONGO[d]} a ${DSEM_LONGO[fim]}`
    linhas.push(`${nome}, ${atual}`)
    d = fim + 1
  }
  return linhas.join('; ')
}

/**
 * O que vai para o modelo, em texto.
 *
 * Separado de `escrito` porque o que a tela mostra e o que o modelo precisa não
 * são a mesma coisa: ele também precisa saber o que NÃO fazer, e precisa da
 * observação, que é onde mora metade do que se diz sobre rotina.
 */
export function paraOModelo(e: Expediente | null | undefined): string {
  if (!temExpediente(e)) return ''
  return `O EXPEDIENTE DELA (respeite ao marcar e ao pôr prazo):
${escrito(e)}
Fuso: ${e!.fuso}.
${e!.observacao ? `Ela ainda disse: ${e!.observacao}\n` : ''}Não ponha prazo nem compromisso fora disso sem ela pedir. Pedindo, faça e diga que está fora do expediente dela.`
}
