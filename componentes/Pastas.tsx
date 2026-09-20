'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Ic } from './Icones'

export type Pasta = {
  id: string
  nome: string
  /** Linha de baixo: período, etapa, o que situar sem abrir. */
  sub: string
  contagem: number
  /** 0 a 1. Vira a porcentagem grande do miolo e a barra do pé. */
  progresso: number
  atrasado?: boolean
  travado?: boolean
}

/**
 *  lado:   as pastas de viés, em leque, como um arquivo visto de lado.
 *  frente: as pastas de frente, como cartas numa esteira.
 *
 * Nos dois, a informação mora no miolo branco da pasta. Não existe ficha ao
 * lado: cada pasta se explica sozinha.
 */
export type Modo = 'lado' | 'frente'

const CHAVE_MODO = 'track.pastas.modo'
const misturar = (a: number, b: number, t: number) => a + (b - a) * t

export function Pastas({ itens, atual, aoTrocar, aoAbrir, rotulo }: {
  itens: Pasta[]
  atual: number
  aoTrocar: (i: number) => void
  aoAbrir: (p: Pasta) => void
  rotulo: string
}) {
  const palco = useRef<HTMLDivElement>(null)
  const inicio = useRef<{ x: number; pos: number } | null>(null)
  const quadro = useRef<number | null>(null)
  const [arrastando, setArrastando] = useState(false)
  const [modo, setModo] = useState<Modo>('lado')
  /**
   * Onde a fila está agora, com casas decimais. É isso que deixa a pasta parar
   * no meio do caminho enquanto o dedo arrasta, em vez de pular de uma para a
   * outra. O índice inteiro, que o resto do app usa, é o arredondamento disto.
   */
  const [pos, setPos] = useState(atual)

  const total = itens.length
  const limitar = useCallback((n: number) => Math.max(0, Math.min(total - 1, n)), [total])

  useEffect(() => {
    try {
      const m = localStorage.getItem(CHAVE_MODO)
      if (m === 'frente' || m === 'lado') setModo(m)
    } catch {}
  }, [])

  const trocarModo = (m: Modo) => {
    setModo(m)
    try { localStorage.setItem(CHAVE_MODO, m) } catch {}
  }

  /** Puxa a fila até o índice escolhido, com mola. Parado, não gasta quadro. */
  const assentar = useCallback((destino: number) => {
    if (quadro.current) cancelAnimationFrame(quadro.current)
    const passo = () => {
      setPos((p) => {
        const falta = destino - p
        if (Math.abs(falta) < 0.004) { quadro.current = null; return destino }
        quadro.current = requestAnimationFrame(passo)
        return p + falta * 0.24
      })
    }
    quadro.current = requestAnimationFrame(passo)
  }, [])

  const andar = useCallback((n: number) => {
    const destino = limitar(Math.round(pos) + n)
    aoTrocar(destino)
    assentar(destino)
  }, [pos, limitar, aoTrocar, assentar])

  useEffect(() => () => { if (quadro.current) cancelAnimationFrame(quadro.current) }, [])

  // Roda e trackpad movem a fila em fração de pasta, sem esperar completar o
  // passo. No trackpad isso é a diferença entre deslizar e clicar onze vezes.
  useEffect(() => {
    const el = palco.current
    if (!el) return
    let parar: ReturnType<typeof setTimeout> | null = null
    const naRoda = (e: WheelEvent) => {
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
      if (!d) return
      e.preventDefault()
      if (quadro.current) { cancelAnimationFrame(quadro.current); quadro.current = null }
      setPos((p) => limitar(p + d / 90))
      if (parar) clearTimeout(parar)
      parar = setTimeout(() => {
        setPos((p) => {
          const destino = limitar(Math.round(p))
          aoTrocar(destino)
          assentar(destino)
          return p
        })
      }, 110)
    }
    el.addEventListener('wheel', naRoda, { passive: false })
    return () => { el.removeEventListener('wheel', naRoda); if (parar) clearTimeout(parar) }
  }, [limitar, aoTrocar, assentar])

  const pegar = (x: number) => {
    if (quadro.current) { cancelAnimationFrame(quadro.current); quadro.current = null }
    inicio.current = { x, pos }
    setArrastando(true)
  }
  const mover = (x: number) => {
    if (!inicio.current) return
    setPos(limitar(inicio.current.pos + (inicio.current.x - x) / 86))
  }
  const soltar = () => {
    if (inicio.current) {
      const destino = limitar(Math.round(pos))
      aoTrocar(destino)
      assentar(destino)
    }
    inicio.current = null
    setArrastando(false)
  }

  const naVez = limitar(Math.round(pos))
  const pct = (p: Pasta) => Math.round(p.progresso * 100)

  /**
   * O lugar de uma pasta a N pastas de distância, com N inteiro. Entre dois
   * inteiros o valor é interpolado, e é por isso que a fila desliza em vez de
   * saltar. A geometria é a mesma que já estava aprovada.
   */
  const pose = useMemo(() => (n: number) => {
    if (modo === 'frente') {
      if (n === 0) return { x: 0, z: 70, ry: -7, o: 1, s: 1.04 }
      if (n < 0) {
        const k = Math.min(-n, 4)
        return { x: -66 - k * 30, z: 10 - k * 30, ry: -7, o: Math.max(0.1, 0.5 - k * 0.1), s: 0.95 - k * 0.02 }
      }
      return { x: 32 + n * 180, z: -24 - n * 20, ry: -7,
        o: Math.max(0.12, 1 - n * 0.1), s: 1 - Math.min(0.18, n * 0.02) }
    }
    if (n === 0) return { x: 0, z: 60, ry: -20, o: 1, s: 1.04 }
    if (n < 0) {
      const k = Math.min(-n, 4)
      return { x: -40 - k * 16, z: 20 - k * 28, ry: -20, o: Math.max(0.14, 0.5 - k * 0.1), s: 0.96 - k * 0.02 }
    }
    return { x: 100 + n * 76, z: -26 - n * 25, ry: -20,
      o: Math.max(0.1, 1 - n * 0.072), s: 1 - Math.min(0.22, n * 0.018) }
  }, [modo])

  const lugar = useCallback((d: number) => {
    const a = Math.floor(d)
    const t = d - a
    const pa = pose(a)
    const pb = pose(a + 1)
    return {
      x: misturar(pa.x, pb.x, t), z: misturar(pa.z, pb.z, t), ry: misturar(pa.ry, pb.ry, t),
      o: misturar(pa.o, pb.o, t), s: misturar(pa.s, pb.s, t),
    }
  }, [pose])

  if (!total) return null

  // Enquanto a fila corre, o ponto de fuga acompanha: é o que dá a sensação de
  // que o arquivo girou, e não de que os cartões trocaram de lugar.
  const inclina = Math.max(-1, Math.min(1, (pos - naVez) * 2))

  return (
    <section className="arquivo" data-modo={modo} aria-roledescription="carrossel" aria-label={rotulo}>
      <div
        className={`arquivo-palco ${arrastando ? 'puxando' : ''}`}
        ref={palco}
        tabIndex={0}
        role="listbox"
        aria-label={rotulo}
        aria-activedescendant={`pasta-${itens[naVez]?.id}`}
        style={{ perspectiveOrigin: `${(modo === 'frente' ? 34 : 30) + inclina * 5}% 50%` }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); andar(1) }
          if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); andar(-1) }
          if (e.key === 'Home') { e.preventDefault(); aoTrocar(0); assentar(0) }
          if (e.key === 'End') { e.preventDefault(); aoTrocar(total - 1); assentar(total - 1) }
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); aoAbrir(itens[naVez]) }
        }}
        onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); pegar(e.clientX) }}
        onPointerMove={(e) => { if (inicio.current) mover(e.clientX) }}
        onPointerUp={soltar}
        onPointerCancel={soltar}
      >
        <div className="arquivo-fila" style={{ transform: `rotateY(${inclina * -2.4}deg)` }}>
          {itens.map((p, i) => {
            const d = i - pos
            const g = lugar(d)
            const viva = i === naVez
            const dist = Math.round(d)
            // Passando de quatro a pasta vira só volume: texto ali seria ruído.
            const longe = dist > 4 || dist < -1
            return (
              <article
                key={p.id}
                id={`pasta-${p.id}`}
                role="option"
                aria-selected={viva}
                className={`pasta ${viva ? 'viva' : ''} ${longe ? 'longe' : ''} ${p.atrasado ? 'tarde' : ''} ${p.travado ? 'presa' : ''}`}
                style={{
                  zIndex: 100 - Math.abs(dist),
                  opacity: g.o,
                  transform: `translate3d(calc(-50% + ${g.x.toFixed(1)}px), -50%, ${g.z.toFixed(1)}px) rotateY(${g.ry.toFixed(2)}deg) scale(${g.s.toFixed(3)})`,
                }}
                onClick={() => (viva ? aoAbrir(p) : (aoTrocar(i), assentar(i)))}
              >
                <span className="pasta-luz" aria-hidden="true" />
                {/* O miolo branco é onde a informação mora. */}
                <span className="pasta-doc">
                  <span className="doc-topo">
                    <span className="doc-pct num">{pct(p)}<i>%</i></span>
                    {(p.atrasado || p.travado) && (
                      <span className={`doc-selo ${p.atrasado ? 'tarde' : 'presa'}`}>
                        {p.atrasado ? 'Atrasado' : 'Travado'}
                      </span>
                    )}
                  </span>
                  <span className="doc-sub">{p.sub}</span>
                  <span className="doc-barra"><b style={{ width: `${Math.max(3, p.progresso * 100)}%` }} /></span>
                </span>
                <span className="pasta-info">
                  <span className="pasta-n"><Ic.team />{p.contagem}</span>
                  <span className="pasta-nome">{p.nome}</span>
                </span>
                <span className="pasta-lomba" aria-hidden="true">
                  <b style={{ height: `${Math.max(4, p.progresso * 100)}%` }} />
                </span>
              </article>
            )
          })}
        </div>
      </div>

      <div className="arquivo-pe">
        <button className="iconbtn" onClick={() => andar(-1)} disabled={naVez === 0} aria-label="Anterior">
          <Ic.volta />
        </button>
        <span className="arquivo-conta num">{naVez + 1} / {total}</span>
        <button className="iconbtn" onClick={() => andar(1)} disabled={naVez === total - 1} aria-label="Próxima">
          <Ic.seta />
        </button>

        <div className="seg arquivo-modo" role="group" aria-label="Formato do arquivo">
          <button className={modo === 'lado' ? 'on' : ''} onClick={() => trocarModo('lado')}>De lado</button>
          <button className={modo === 'frente' ? 'on' : ''} onClick={() => trocarModo('frente')}>De frente</button>
        </div>

        <span className="arquivo-dica">role de lado, arraste ou use as setas</span>
      </div>
    </section>
  )
}
