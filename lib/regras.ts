import { dias } from './datas'
import type { Etapa, Fluxo, Pendencia, Status } from './tipos'

export const LBL: Record<Status | 'none', string> = {
  late: 'Atrasado',
  hold: 'Travado',
  soon: 'Vence em breve',
  ok: 'Em dia',
  done: 'Concluído',
  none: 'Sem registro',
}

/** Ordem de urgência usada no painel e nas listas. */
export const ORD: Record<Status, number> = { late: 0, hold: 1, soon: 2, ok: 3, done: 4 }

export const etapaAtual = (f: Fluxo): Etapa | undefined => f.etapas[f.atual]

/**
 * Situação do fluxo, sempre calculada, nunca digitada.
 * Olha só o checkpoint atual, porque é nele que o trabalho está.
 */
export function status(f: Fluxo): Status {
  if (f.concluido) return 'done'
  if (f.travado_motivo) return 'hold'
  const et = etapaAtual(f)
  if (!et) return 'ok'
  const pend = et.itens.filter((x) => !x.feito)
  if (pend.some((x) => x.prazo && dias(x.prazo) < 0) || (et.prazo && dias(et.prazo) < 0)) return 'late'
  if (pend.some((x) => x.prazo && dias(x.prazo) <= 3) || (et.prazo && dias(et.prazo) <= 3)) return 'soon'
  return 'ok'
}

/** Fração do checklist de um checkpoint que já está feita. */
export function fracao(et: Etapa | undefined): number {
  if (!et || !et.itens.length) return 0
  return et.itens.filter((x) => x.feito).length / et.itens.length
}

/** Quanto do fluxo já andou: checkpoints vencidos mais o checklist do atual. */
export function progresso(f: Fluxo): number {
  if (f.concluido) return 1
  const et = etapaAtual(f)
  if (!et || !f.etapas.length) return 0
  return (f.atual + fracao(et)) / f.etapas.length
}

/** Frase curta que explica, na lista, por que o fluxo está nessa situação. */
export function motivo(f: Fluxo, nomeDe: (id: string | null) => string, ocultas = 0): string {
  const st = status(f)
  if (st === 'done') return 'Concluído'
  if (st === 'hold') return f.travado_motivo || 'Travado'
  const et = etapaAtual(f)
  if (!et) return 'Sem checkpoints'
  const pend = et.itens.filter((x) => !x.feito)
  if (st === 'late') {
    const v = pend.filter((x) => x.prazo && dias(x.prazo) < 0)
    if (v.length) {
      const resto = v.length > 1 ? ` e mais ${v.length - 1}` : ''
      return `${v[0].texto}${resto}, vencido ${relLower(v[0].prazo!)}`
    }
    return 'Checkpoint vencido'
  }
  const prox = pend.filter((x) => x.prazo).sort((a, b) => a.prazo!.localeCompare(b.prazo!))[0] || pend[0]
  if (!prox) {
    if (et.itens.length) return `Aguardando aprovação de ${nomeDe(et.aprovador_id)}`
    if (ocultas) return ocultas === 1 ? 'Com outra pessoa' : 'Com outras pessoas'
    return 'Checkpoint sem tarefas'
  }
  return `Próximo: ${prox.texto}`
}

function relLower(s: string): string {
  const n = dias(s)
  if (n === -1) return 'ontem'
  return `há ${-n} dias`
}

/** Primeiro prazo que vai vencer no checkpoint atual. */
export function proxPrazo(f: Fluxo): string | null {
  if (f.concluido) return null
  const et = etapaAtual(f)
  if (!et) return null
  const todos = [...et.itens.filter((x) => !x.feito && x.prazo).map((x) => x.prazo!), et.prazo].filter(
    Boolean,
  ) as string[]
  return todos.sort()[0] || null
}

/** A pessoa aparece neste fluxo? Dona, aprovadora do checkpoint atual ou responsável por item pendente. */
export function envolve(f: Fluxo, perfilId: string | null): boolean {
  if (!perfilId) return true
  const et = etapaAtual(f)
  if (!et) return f.dono_id === perfilId
  return (
    f.dono_id === perfilId ||
    et.aprovador_id === perfilId ||
    et.itens.some((x) => !x.feito && x.resp_id === perfilId)
  )
}

/** Tudo que depende de uma pessoa agora: itens para executar e checkpoints para aprovar. */
export function pendencias(fluxos: Fluxo[], perfilId: string | null): Pendencia[] {
  if (!perfilId) return []
  const out: Pendencia[] = []
  for (const f of fluxos) {
    if (f.concluido || f.travado_motivo) continue
    const et = etapaAtual(f)
    if (!et) continue
    for (const item of et.itens) {
      if (!item.feito && item.resp_id === perfilId) {
        out.push({ tipo: 'item', fluxo: f, etapa: et, item, prazo: item.prazo })
      }
    }
    if (et.aprovador_id === perfilId && et.itens.every((x) => x.feito)) {
      out.push({ tipo: 'aprov', fluxo: f, etapa: et, item: null, prazo: et.prazo })
    }
  }
  return out.sort((a, b) => (a.prazo || '9999-12-31').localeCompare(b.prazo || '9999-12-31'))
}

/** Quantos fluxos precisam de atenção agora, para os contadores da lateral. */
export const comProblema = (fluxos: Fluxo[]) =>
  fluxos.filter((f) => ['late', 'hold'].includes(status(f))).length
