export const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
export const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
export const MES_LONGO = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
export const DSEM = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
export const DSEM_LONGO = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

/** Data local de hoje, sem hora. */
export function hoje(): Date {
  const n = new Date()
  return new Date(n.getFullYear(), n.getMonth(), n.getDate())
}

export const iso = (d: Date) =>
  d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')

export const hojeIso = () => iso(hoje())

/** Converte "2026-10-02" em Date local (sem o fuso do construtor de string). */
export function data(s: string): Date {
  const [a, m, d] = s.split('-').map(Number)
  return new Date(a, m - 1, d)
}

/** Dias de hoje até a data informada. Negativo quer dizer vencido. */
export function dias(s: string): number {
  return Math.round((data(s).getTime() - hoje().getTime()) / 864e5)
}

export function soma(s: string, n: number): string {
  const x = data(s)
  x.setDate(x.getDate() + n)
  return iso(x)
}

/** "2 out" ou "2 out 27" quando cai em outro ano. */
export function curta(s: string): string {
  const x = data(s)
  const ano = x.getFullYear() !== hoje().getFullYear() ? ' ' + String(x.getFullYear()).slice(2) : ''
  return x.getDate() + ' ' + MES[x.getMonth()] + ano
}

/** Data em linguagem de gente: Hoje, Ontem, em 4 dias, há 2 dias. */
export function rel(s: string | null | undefined): string {
  if (!s) return ''
  const n = dias(s)
  if (n === 0) return 'Hoje'
  if (n === 1) return 'Amanhã'
  if (n === -1) return 'Ontem'
  if (n < 0) return `há ${-n} dias`
  if (n < 7) return `em ${n} dias`
  return curta(s)
}

/** Data de um timestamp do banco, no formato usado pelas funções acima. */
export function isoDe(ts: string): string {
  const d = new Date(ts)
  return iso(new Date(d.getFullYear(), d.getMonth(), d.getDate()))
}
