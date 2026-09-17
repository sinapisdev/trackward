import ICAL from 'ical.js'

export type BlocoExterno = { inicio: string; fim: string; diaInteiro: boolean }

const MAX_BLOCOS = 1500
const MAX_VOLTAS = 400

/**
 * Extrai de um calendário iCal apenas os intervalos ocupados.
 *
 * Título, local, convidados e descrição são ignorados de propósito: nada disso
 * entra no retorno, então nada disso pode ser guardado nem exibido depois.
 * Compromisso cancelado, ou marcado como livre (TRANSP:TRANSPARENT, que é o caso
 * dos calendários de feriado), não ocupa a agenda de ninguém e fica fora.
 */
export function blocosOcupados(texto: string, de: Date, ate: Date): BlocoExterno[] {
  const comp = new ICAL.Component(ICAL.parse(texto))
  const blocos: BlocoExterno[] = []

  for (const cru of comp.getAllSubcomponents('vevent')) {
    if (blocos.length >= MAX_BLOCOS) break
    const ev = new ICAL.Event(cru)

    const transp = cru.getFirstPropertyValue('transp')
    if (typeof transp === 'string' && transp.toUpperCase() === 'TRANSPARENT') continue
    const situacao = cru.getFirstPropertyValue('status')
    if (typeof situacao === 'string' && situacao.toUpperCase() === 'CANCELLED') continue

    const duracao = ev.endDate.toJSDate().getTime() - ev.startDate.toJSDate().getTime()

    if (!ev.isRecurring()) {
      const i = ev.startDate.toJSDate()
      if (i >= de && i <= ate) {
        blocos.push({
          inicio: i.toISOString(),
          fim: ev.endDate.toJSDate().toISOString(),
          diaInteiro: ev.startDate.isDate,
        })
      }
      continue
    }

    const it = ev.iterator()
    let proxima
    let voltas = 0
    while ((proxima = it.next()) && voltas < MAX_VOLTAS) {
      voltas++
      const i = proxima.toJSDate()
      if (i > ate) break
      if (i < de) continue
      blocos.push({
        inicio: i.toISOString(),
        fim: new Date(i.getTime() + duracao).toISOString(),
        diaInteiro: ev.startDate.isDate,
      })
      if (blocos.length >= MAX_BLOCOS) break
    }
  }
  return blocos
}

/** Nome que o calendário se dá, quando informa. */
export function nomeDoCalendario(texto: string): string | null {
  try {
    const comp = new ICAL.Component(ICAL.parse(texto))
    const n = comp.getFirstPropertyValue('x-wr-calname')
    return typeof n === 'string' ? n : null
  } catch {
    return null
  }
}
