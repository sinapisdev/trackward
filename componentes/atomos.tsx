'use client'

import { fracao, status } from '@/lib/regras'
import type { Fluxo, Perfil, Status } from '@/lib/tipos'

/** Iniciais da pessoa, para o avatar. */
export function iniciais(nome: string) {
  const w = (nome || '?').trim().split(/\s+/)
  return (w.length > 1 ? w[0][0] + w[1][0] : w[0].slice(0, 2)).toUpperCase()
}

export function Av({ p, tam = '' }: { p: Perfil; tam?: 'sm' | 'lg' | '' }) {
  return (
    <span className={`av ${tam}`} style={{ '--cor': p.cor } as React.CSSProperties} title={p.nome}>
      {iniciais(p.nome)}
    </span>
  )
}

/**
 * Cor é exceção. Atrasado e a vencer têm cor porque pedem ação; travado,
 * em dia e concluído ficam em neutro, e se distinguem pela forma do ícone.
 */
const COR: Record<Status, string> = {
  late: 'var(--late)',
  soon: 'var(--warn)',
  hold: 'var(--tx-3)',
  ok: 'var(--ac)',
  done: 'var(--tx-3)',
}

/**
 * Situação em 16px: anel que se preenche com o progresso quando o fluxo anda,
 * ícone sólido quando exige atenção ou já acabou.
 */
export function IconeStatus({ st, p = 0 }: { st: Status; p?: number }) {
  const cor = COR[st]
  if (st === 'late')
    return (
      <svg width="16" height="16" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="7" fill={cor} />
        <path d="M8 4.5v4" stroke="var(--panel)" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="8" cy="11.2" r="1" fill="var(--panel)" />
      </svg>
    )
  if (st === 'hold')
    return (
      <svg width="16" height="16" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="7" fill={cor} />
        <path d="M6.3 5.3v5.4M9.7 5.3v5.4" stroke="var(--panel)" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    )
  if (st === 'done')
    return (
      <svg width="16" height="16" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="7" fill={cor} />
        <path d="m5 8.2 2 2 4-4.2" stroke="var(--panel)" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  const c = 2 * Math.PI * 3.25
  const len = (Math.max(p, 0.04) * c).toFixed(2)
  return (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <circle cx="8" cy="8" r="6.5" fill="none" stroke={cor} strokeWidth="1.5" />
      <circle cx="8" cy="8" r="3.25" fill="none" stroke={cor} strokeWidth="6.5"
        strokeDasharray={`${len} ${c}`} transform="rotate(-90 8 8)" />
    </svg>
  )
}

/** A esteira em miniatura: um segmento por checkpoint, o atual preenche com o checklist. */
export function Trilha({ f }: { f: Fluxo }) {
  const st = status(f)
  return (
    <div className={`trk ${st}`}>
      {f.etapas.map((et, k) => {
        if (f.concluido || k < f.atual) return <i key={et.id} className="d" />
        if (k === f.atual)
          return (
            <i key={et.id} className="cur">
              <b style={{ width: `${fracao(et) * 100}%` }} />
            </i>
          )
        return <i key={et.id} />
      })}
    </div>
  )
}
