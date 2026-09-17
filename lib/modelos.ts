import { hoje, hojeIso, MESES, soma } from './datas'
import type { Freq, Tipo } from './tipos'

/**
 * Cálculo de período das rotinas e o esqueleto de uma esteira criada do zero.
 *
 * Os trilhos prontos não vivem mais aqui: eles são **processos**, desenhados pela
 * própria empresa na tela Processos e guardados no banco. Ver `componentes/EditorProcesso`.
 */

/** Quantos dias uma rotina anda a cada volta. */
export const PASSO: Record<Freq, number> = { semanal: 7, quinzenal: 15, mensal: 30 }

export type RascunhoEtapa = {
  id: string | null
  nome: string
  criterio: string
  aprovador_id: string | null
  prazo: string
}

/** Rótulo do período em que a rotina está agora: Set/26, Quinzena 18, Semana 38. */
export function periodoAtual(freq: Freq): string {
  const h = hoje()
  if (freq === 'mensal') return MESES[h.getMonth()] + '/' + String(h.getFullYear()).slice(2)
  if (freq === 'quinzenal') {
    const jan = new Date(h.getFullYear(), 0, 1)
    return 'Quinzena ' + (Math.floor((h.getTime() - jan.getTime()) / 864e5 / 15) + 1)
  }
  const t = new Date(h)
  t.setDate(t.getDate() + 4 - (t.getDay() || 7))
  const y = new Date(t.getFullYear(), 0, 1)
  return 'Semana ' + Math.ceil(((t.getTime() - y.getTime()) / 864e5 + 1) / 7)
}

/** Período seguinte: Set/26 vira Out/26, Semana 38 vira Semana 39. */
export function proxPeriodo(periodo: string | null, freq: Freq | null): string {
  const f = freq || 'mensal'
  if (f === 'mensal') {
    const m = /^([A-Za-zç]{3})\/(\d{2,4})$/.exec(periodo || '')
    if (m) {
      let k = MESES.indexOf(m[1]) + 1
      let y = Number(m[2])
      if (k > 11) { k = 0; y++ }
      if (k >= 0) return MESES[k] + '/' + String(y).slice(-2)
    }
  }
  if (/\d+$/.test(periodo || '')) return periodo!.replace(/\d+$/, (n) => String(Number(n) + 1))
  return periodoAtual(f)
}

/** Três checkpoints vazios, para quem prefere montar a esteira na mão. */
export function esqueletoEmBranco(tipo: Tipo, freq: Freq | null, aprovador: string | null): RascunhoEtapa[] {
  const nomes = tipo === 'ciclo'
    ? ['Preparação', 'Execução', 'Conferência']
    : ['Início', 'Execução', 'Entrega']
  const passo = tipo === 'ciclo' ? Math.max(1, Math.floor(PASSO[freq || 'mensal'] / 3)) : 14
  return nomes.map((nome, k) => ({
    id: null,
    nome,
    criterio: '',
    aprovador_id: aprovador,
    prazo: soma(hojeIso(), passo * (k + 1)),
  }))
}
