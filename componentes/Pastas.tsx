'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Ic } from './Icones'
import { Av, IconeStatus } from './atomos'
import type { Perfil, Status } from '@/lib/tipos'

export type Pasta = {
  id: string
  /** Para onde o clique leva. */
  href: string
  /** Área, Rotina, Projeto ou Processo: a pasta diz o que ela é antes de dizer quem é. */
  rotulo: string
  nome: string
  /** A linha logo abaixo do nome: o checkpoint da vez, ou o resumo da área. */
  etapa: string
  /** Situação, que dá a forma do sinal ao lado da etapa. */
  st: Status
  /**
   * O número grande, que só a pasta em foco mostra. Num projeto é o quanto
   * andou; numa área é quantas tarefas estão abertas, porque área não tem linha
   * de chegada e porcentagem ali não diria nada.
   */
  numero: string
  numeroSub?: string
  /** O pé da pasta em foco: o quanto do checkpoint já saiu. */
  pe?: string
  /** Quem está dentro. Vira a pilha de avatares no pé. */
  gente: Perfil[]
  /** Uma palavra em cor quando a pasta pede ação, para quem está atrás também ver. */
  alerta?: string
  alertaTipo?: 'late' | 'soon' | 'hold'
  /** 0 a 1. Enche a barra do pé. */
  progresso: number
  atrasado?: boolean
  travado?: boolean
}

/**
 * O arquivo de pastas.
 *
 * As pastas ficam em fila, de frente, e você corre por elas com a roda do
 * mouse, arrastando ou com as setas. A da vez vem para a frente e mostra o
 * número grande e o pé; as outras continuam legíveis dos lados, menores.
 *
 * A geometria é toda CSS: nada de biblioteca, nada de canvas, então o teclado,
 * o leitor de tela e o celular continuam funcionando.
 */
export function Pastas({ itens, atual, aoTrocar, aoAbrir, rotulo }: {
  itens: Pasta[]
  atual: number
  aoTrocar: (i: number) => void
  aoAbrir: (p: Pasta) => void
  rotulo: string
}) {
  const palco = useRef<HTMLDivElement>(null)
  const quadro = useRef<number | null>(null)
  const [arrastando, setArrastando] = useState(false)
  const inicio = useRef<{ x: number; pos: number } | null>(null)
  /**
   * Onde a fila está agora, com casas decimais. É isso que deixa a pasta parar
   * no meio do caminho enquanto o dedo arrasta, em vez de pular de uma para a
   * outra. O índice inteiro, que o resto do app usa, é o arredondamento disto.
   */
  const [pos, setPos] = useState(atual)
  /**
   * O mesmo valor de pos, num ref: a mola e o encaixe da roda precisam ler onde
   * a fila está agora, e o lugar errado de fazer isso é dentro da função que
   * atualiza o estado, que tem que ser pura.
   */
  const posRef = useRef(atual)

  const irPara = useCallback((v: number) => { posRef.current = v; setPos(v) }, [])

  const total = itens.length
  const limitar = useCallback((i: number) => Math.max(0, Math.min(total - 1, i)), [total])

  /** Puxa a fila até o índice escolhido, com mola. Parada, não gasta quadro. */
  const assentar = useCallback((destino: number) => {
    if (quadro.current) cancelAnimationFrame(quadro.current)
    const passo = () => {
      const falta = destino - posRef.current
      if (Math.abs(falta) < 0.004) { quadro.current = null; irPara(destino); return }
      irPara(posRef.current + falta * 0.24)
      quadro.current = requestAnimationFrame(passo)
    }
    quadro.current = requestAnimationFrame(passo)
  }, [irPara])

  const andar = useCallback((n: number) => {
    const destino = limitar(Math.round(posRef.current) + n)
    aoTrocar(destino)
    assentar(destino)
  }, [limitar, aoTrocar, assentar])

  useEffect(() => () => { if (quadro.current) cancelAnimationFrame(quadro.current) }, [])

  /** O pai manda: trocar a pasta pelo teclado ou pelo pager move a fila. */
  useEffect(() => {
    if (Math.round(posRef.current) !== atual) assentar(limitar(atual))
  }, [atual, assentar, limitar])

  // Roda e trackpad movem a fila em fração de pasta, e ela só encaixa quando a
  // pessoa para. No trackpad isso é a diferença entre deslizar e clicar onze vezes.
  useEffect(() => {
    const el = palco.current
    if (!el) return
    let parar: ReturnType<typeof setTimeout> | null = null
    const naRoda = (e: WheelEvent) => {
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
      if (!d) return
      e.preventDefault()
      if (quadro.current) { cancelAnimationFrame(quadro.current); quadro.current = null }
      irPara(limitar(posRef.current + d / 160))
      if (parar) clearTimeout(parar)
      parar = setTimeout(() => {
        const destino = limitar(Math.round(posRef.current))
        aoTrocar(destino)
        assentar(destino)
      }, 110)
    }
    el.addEventListener('wheel', naRoda, { passive: false })
    return () => { el.removeEventListener('wheel', naRoda); if (parar) clearTimeout(parar) }
  }, [limitar, aoTrocar, assentar, irPara])

  const pegar = (x: number) => {
    if (quadro.current) { cancelAnimationFrame(quadro.current); quadro.current = null }
    inicio.current = { x, pos: posRef.current }
    setArrastando(true)
  }
  const mover = (x: number) => {
    if (!inicio.current) return
    irPara(limitar(inicio.current.pos + (inicio.current.x - x) / 306))
  }
  const soltar = () => {
    if (inicio.current) {
      const destino = limitar(Math.round(posRef.current))
      aoTrocar(destino)
      assentar(destino)
    }
    inicio.current = null
    setArrastando(false)
  }

  const naVez = limitar(Math.round(pos))
  const ativa = itens[naVez]

  /**
   * Onde cada pasta cai, em função da distância para a da vez. A função é
   * contínua de propósito: é o que faz a fila deslizar enquanto o dedo arrasta,
   * em vez de saltar de posição em posição.
   */
  const lugar = (d: number) => {
    const a = Math.abs(d)
    const sinal = d < 0 ? -1 : 1
    return {
      x: sinal * (a <= 1 ? a * 306 : 306 + (a - 1) * 180),
      s: 1 - Math.min(0.5, a * 0.26),
      o: Math.max(0.1, 1 - a * 0.26),
    }
  }

  if (!total) return null

  return (
    <section className="arquivo" aria-roledescription="carrossel" aria-label={rotulo}>
      <div
        className={`arquivo-palco ${arrastando ? 'puxando' : ''}`}
        ref={palco}
        tabIndex={0}
        role="listbox"
        aria-label={rotulo}
        aria-activedescendant={`pasta-${ativa?.id}`}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); andar(1) }
          if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); andar(-1) }
          if (e.key === 'Home') { e.preventDefault(); aoTrocar(0); assentar(0) }
          if (e.key === 'End') { e.preventDefault(); aoTrocar(total - 1); assentar(total - 1) }
          if ((e.key === 'Enter' || e.key === ' ') && ativa) { e.preventDefault(); aoAbrir(ativa) }
        }}
        onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); pegar(e.clientX) }}
        onPointerMove={(e) => { if (inicio.current) mover(e.clientX) }}
        onPointerUp={soltar}
        onPointerCancel={soltar}
      >
        <div className="arquivo-fila">
          {itens.map((p, i) => {
            const d = i - pos
            const g = lugar(d)
            const viva = i === naVez
            // Passando de três, a pasta vira só volume: texto ali seria ruído.
            const longe = Math.abs(d) > 3.4
            return (
              <article
                key={p.id}
                id={`pasta-${p.id}`}
                role="option"
                aria-selected={viva}
                className={`pasta ${viva ? 'viva' : ''} ${longe ? 'longe' : ''} ${p.atrasado ? 'tarde' : ''} ${p.travado ? 'presa' : ''}`}
                style={{
                  zIndex: 100 - Math.round(Math.abs(d) * 10),
                  opacity: g.o,
                  transform: `translate3d(calc(-50% + ${g.x.toFixed(1)}px), -50%, 0) scale(${g.s.toFixed(3)})`,
                }}
                onClick={() => (viva ? aoAbrir(p) : (aoTrocar(i), assentar(i)))}
              >
                <span className="pasta-pilha" aria-hidden><i /><i /></span>
                <span className="pasta-aba" aria-hidden />
                <span className="pasta-face">
                  <span className="pasta-rot">{p.rotulo}</span>
                  <b className="pasta-nome">{p.nome}</b>
                  <span className="pasta-etapa">
                    <IconeStatus st={p.st} p={p.progresso} />
                    <span>{p.etapa}</span>
                  </span>

                  {viva ? (
                    <>
                      <span className="pasta-num">
                        <b className="num">{p.numero}</b>
                        {p.numeroSub && <small>{p.numeroSub}</small>}
                      </span>
                      <span className="pasta-fim">
                        <span className="pasta-pe">{p.pe || p.alerta || ''}</span>
                        <span className="pasta-gente">
                          {p.gente.slice(0, 3).map((q) => <Av key={q.id} p={q} tam="sm" />)}
                          {p.gente.length > 3 && <i className="mais num">+{p.gente.length - 3}</i>}
                        </span>
                      </span>
                    </>
                  ) : p.alerta ? (
                    <span className={`pasta-alerta ${p.alertaTipo || ''}`}>{p.alerta}</span>
                  ) : null}
                </span>
              </article>
            )
          })}
        </div>
      </div>

    </section>
  )
}
