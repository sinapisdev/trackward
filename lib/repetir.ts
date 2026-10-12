import { DSEM_LONGO } from './datas'

/**
 * A tarefa que volta.
 *
 * "Toda segunda eu mando o relatório" não tinha onde morar: virava sete tarefas
 * digitadas à mão, ou uma rotina inteira com checkpoint e aprovação, que é
 * maquinário demais para uma coisa de dez minutos. A ROTINA continua sendo a
 * resposta para o processo que dá voltas; isto é a resposta para o LEMBRETE que
 * dá voltas.
 *
 * **Aqui não se calcula data nenhuma.** A aritmética mora em `proxima_volta()`,
 * no banco (seção 79), e este arquivo só sabe dizer a frase. Duas aritméticas de
 * calendário é a garantia de que um dia a tela promete uma data e o banco grava
 * outra, e quem descobre isso é a pessoa, na segunda-feira.
 */

/** 0 é domingo, como `Date.getDay()` e como `extract(dow)` no Postgres. */
/**
 * A regra da repetição.
 *
 * Chama-se `Repeticao` e não `Volta` porque `Volta` já existe e quer dizer
 * outra coisa: a volta de uma ROTINA, com período e arquivo. Duas coisas com o
 * mesmo nome no mesmo repositório é o jeito mais silencioso de alguém usar uma
 * achando que é a outra.
 */
export type Repeticao = {
  cada: 'dia' | 'semana' | 'mes'
  n: number
  /** Só em `semana`: em quais dias ela cai. Vazio quer dizer "a cada N semanas". */
  dias?: number[]
  /**
   * Quantas voltas ela AINDA tem. Ausente quer dizer para sempre.
   *
   * "Todo dia durante uma semana" é o caso comum de verdade, e sem fim a tarefa
   * cobra para sempre: no mês seguinte ela ainda está lá, e aí a pessoa a apaga,
   * perdendo junto a repetição que funcionava. Quem desconta é o banco, a cada
   * conclusão; chegando à última, ela fecha de vez.
   */
  vezes?: number
}

/**
 * Os botões, e eles são a interface inteira.
 *
 * Repetição morre de formulário: "a cada [2] [semanas] nos dias [ ][x][ ]" é
 * correto e ninguém preenche. Seis atalhos cobrem o que as pessoas de fato
 * pedem, e o resto se diz escolhendo os dias da semana, que é o único ajuste
 * fino que vale a tela.
 */
export const ATALHOS: { nome: string; volta: Repeticao }[] = [
  { nome: 'Todo dia', volta: { cada: 'dia', n: 1 } },
  { nome: 'Dia sim, dia não', volta: { cada: 'dia', n: 2 } },
  { nome: 'Toda semana', volta: { cada: 'semana', n: 1 } },
  { nome: 'Dias úteis', volta: { cada: 'semana', n: 1, dias: [1, 2, 3, 4, 5] } },
  { nome: 'A cada 15 dias', volta: { cada: 'dia', n: 15 } },
  { nome: 'Todo mês', volta: { cada: 'mes', n: 1 } },
]

/**
 * Quantas vezes, em atalho.
 *
 * Em VEZES e não em dias, porque é o que a regra conta: "7 vezes" numa diária é
 * uma semana e numa semanal é quase dois meses, e traduzir isso para dias na
 * tela daria dois números para a mesma coisa. Sempre é o padrão e vem primeiro.
 */
export const QUANTAS = [0, 5, 7, 10, 15, 30]

/** O que veio do banco, conferido. Torto vira nulo: ver `valida` do expediente. */
export function valida(cru: unknown): Repeticao | null {
  const o = (cru || {}) as Record<string, unknown>
  const cada = o.cada
  if (cada !== 'dia' && cada !== 'semana' && cada !== 'mes') return null
  const n = Math.round(Number(o.n))
  if (!(n >= 1 && n <= 30)) return null
  const dias = Array.isArray(o.dias)
    ? [...new Set(o.dias.map((d) => Math.round(Number(d))).filter((d) => d >= 0 && d <= 6))].sort()
    : []
  const vezes = Math.round(Number(o.vezes))
  return {
    cada, n,
    ...(cada === 'semana' && dias.length ? { dias } : {}),
    ...(vezes >= 1 && vezes <= 365 ? { vezes } : {}),
  }
}

/**
 * A frase, em português de gente.
 *
 * "A cada 1 semana nos dias [1]" é verdade e não se lê. Quem vê isto na linha da
 * tarefa precisa entender sem traduzir nada, porque é a única coisa que diz que
 * ela volta.
 */
export function escrito(v: Repeticao | null | undefined): string {
  if (!v) return ''
  const fim = v.vezes ? `, ${v.vezes} ${v.vezes === 1 ? 'vez' : 'vezes'}` : ''
  return base(v) + fim
}

/** A cadência sozinha, sem o quantas. */
function base(v: Repeticao): string {
  if (v.cada === 'semana' && v.dias?.length) {
    if (v.dias.length === 5 && [1, 2, 3, 4, 5].every((d) => v.dias!.includes(d))) return 'Dias úteis'
    if (v.dias.length === 7) return 'Todo dia'
    const nomes = v.dias.map((d) => DSEM_LONGO[d])
    return nomes.length === 1
      ? `Toda ${nomes[0]}`
      : `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`
  }
  if (v.cada === 'dia') {
    if (v.n === 1) return 'Todo dia'
    if (v.n === 2) return 'Dia sim, dia não'
    return `A cada ${v.n} dias`
  }
  if (v.cada === 'semana') return v.n === 1 ? 'Toda semana' : `A cada ${v.n} semanas`
  return v.n === 1 ? 'Todo mês' : `A cada ${v.n} meses`
}

/**
 * Duas regras têm a mesma CADÊNCIA? `vezes` fica de fora de propósito: ele é
 * o outro botão, e comparar os dois juntos apagaria o atalho da cadência assim
 * que alguém escolhesse um fim.
 */
export const mesma = (a: Repeticao | null | undefined, b: Repeticao) =>
  !!a && a.cada === b.cada && a.n === b.n
  && (a.dias || []).join(',') === (b.dias || []).join(',')
