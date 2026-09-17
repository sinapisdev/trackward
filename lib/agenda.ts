import { data, iso } from './datas'
import type { Compromisso, Perfil } from './tipos'

/** 'HH:MM' em minutos desde a meia-noite. Nulo vira o dia inteiro. */
export function minutos(hora: string | null): number | null {
  if (!hora) return null
  const [h, m] = hora.split(':').map(Number)
  return h * 60 + (m || 0)
}

export const horaCurta = (h: string | null) => (h ? h.slice(0, 5) : '')

/** Texto do horário como se fala: "9h", "9h30 às 10h30", "dia inteiro". */
export function faixa(c: Compromisso): string {
  if (!c.inicio) return 'dia inteiro'
  const fmt = (h: string) => {
    const [hh, mm] = h.split(':')
    return mm && mm !== '00' ? `${Number(hh)}h${mm}` : `${Number(hh)}h`
  }
  return c.fim ? `${fmt(c.inicio)} às ${fmt(c.fim)}` : fmt(c.inicio)
}

/** Todo mundo que aquele compromisso ocupa. */
export const envolvidos = (c: Compromisso) =>
  [c.dono_id, ...c.convidados].filter(Boolean) as string[]

/** Dois compromissos se cruzam no tempo? Dia inteiro cruza com tudo naquele dia. */
export function cruza(a: Compromisso, b: Compromisso): boolean {
  if (a.quando !== b.quando) return false
  const ai = minutos(a.inicio), bi = minutos(b.inicio)
  if (ai === null || bi === null) return true
  const af = minutos(a.fim) ?? ai + 60
  const bf = minutos(b.fim) ?? bi + 60
  return ai < bf && bi < af
}

/**
 * Quem, entre os convidados, já tem a agenda ocupada nesse horário.
 * Considera também os compromissos que chegaram sem conteúdo: para saber que
 * alguém está ocupado não é preciso saber com o quê.
 */
export function ocupados(
  novo: Compromisso, agenda: Compromisso[], perfis: Perfil[],
): { pessoa: Perfil; conflito: Compromisso }[] {
  if (!novo.bloqueia) return []
  const alvo = new Set(envolvidos(novo))
  const saida: { pessoa: Perfil; conflito: Compromisso }[] = []
  for (const c of agenda) {
    if (c.id === novo.id || !c.bloqueia || !cruza(novo, c)) continue
    for (const id of envolvidos(c)) {
      if (!alvo.has(id) || saida.some((x) => x.pessoa.id === id)) continue
      const pessoa = perfis.find((p) => p.id === id)
      if (pessoa) saida.push({ pessoa, conflito: c })
    }
  }
  return saida
}

/** Os sete dias da semana em que a data cai, começando na segunda. */
export function semanaDe(d: Date): string[] {
  const base = new Date(d)
  const dia = base.getDay()
  base.setDate(base.getDate() - (dia === 0 ? 6 : dia - 1))
  return Array.from({ length: 7 }, (_, k) => {
    const x = new Date(base)
    x.setDate(x.getDate() + k)
    return iso(x)
  })
}

/** Todas as células de um calendário mensal, incluindo as bordas do mês vizinho. */
export function gradeDoMes(ano: number, mes: number): string[] {
  const primeiro = new Date(ano, mes, 1)
  const dia = primeiro.getDay()
  const inicio = new Date(primeiro)
  inicio.setDate(inicio.getDate() - (dia === 0 ? 6 : dia - 1))
  const celulas: string[] = []
  for (let k = 0; k < 42; k++) {
    const x = new Date(inicio)
    x.setDate(x.getDate() + k)
    celulas.push(iso(x))
    if (k >= 34 && x.getMonth() !== mes && x > primeiro) break
  }
  return celulas
}

export const mesDe = (s: string) => data(s).getMonth()

/** Ordena por hora, com os de dia inteiro na frente. */
export const porHora = (a: Compromisso, b: Compromisso) =>
  (minutos(a.inicio) ?? -1) - (minutos(b.inicio) ?? -1)
