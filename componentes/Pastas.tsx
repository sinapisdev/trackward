'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Ic } from './Icones'

export type Pasta = {
  id: string
  nome: string
  /** Linha de baixo do cartão que flutua: período, área, o que fizer sentido. */
  sub: string
  /** Quantas tarefas abertas. É o número que aparece no pé da pasta. */
  contagem: number
  /** 0 a 1. Vira a porcentagem grande do cartão e a barra da lombada. */
  progresso: number
  /** Atrasado pinta a lombada de vermelho, mesmo sem estar selecionada. */
  atrasado?: boolean
  travado?: boolean
}

/**
 * O arquivo em perspectiva.
 *
 * As pastas ficam de pé, em fila, vistas de lado, e você corre por elas com a
 * roda do mouse, arrastando ou com as setas. A pasta da vez vem para a frente e
 * acende em laranja; as outras continuam legíveis atrás, em vidro.
 *
 * É a peça da referência do ClauseOS, com o verde trocado por laranja. A
 * geometria é toda CSS 3D: nada de biblioteca, nada de canvas, então o teclado,
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
  const acumulado = useRef(0)
  const [arrastando, setArrastando] = useState(false)
  const inicio = useRef<{ x: number; i: number } | null>(null)

  const total = itens.length
  const limitar = useCallback((i: number) => Math.max(0, Math.min(total - 1, i)), [total])

  const andar = useCallback((n: number) => aoTrocar(limitar(atual + n)), [atual, aoTrocar, limitar])

  // Roda do mouse e gesto de duas dedos: os dois eixos servem, porque no
  // trackpad a pessoa desliza de lado e no mouse ela gira para baixo.
  useEffect(() => {
    const el = palco.current
    if (!el) return
    const naRoda = (e: WheelEvent) => {
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
      if (!d) return
      e.preventDefault()
      acumulado.current += d
      const passo = 54
      while (Math.abs(acumulado.current) >= passo) {
        andar(acumulado.current > 0 ? 1 : -1)
        acumulado.current -= Math.sign(acumulado.current) * passo
      }
    }
    el.addEventListener('wheel', naRoda, { passive: false })
    return () => el.removeEventListener('wheel', naRoda)
  }, [andar])

  const pegar = (x: number) => { inicio.current = { x, i: atual }; setArrastando(true) }
  const mover = (x: number) => {
    if (!inicio.current) return
    const passos = Math.round((inicio.current.x - x) / 46)
    const alvo = limitar(inicio.current.i + passos)
    if (alvo !== atual) aoTrocar(alvo)
  }
  const soltar = () => { inicio.current = null; setArrastando(false) }

  const ativa = itens[atual]
  const pct = Math.round((ativa?.progresso ?? 0) * 100)

  // A geometria de cada pasta, em função da distância para a da vez. À direita
  // elas se comprimem, como folhas de um arquivo visto de viés; à esquerda
  // empilham atrás, para a fila continuar existindo mesmo depois de passar.
  const lugar = useMemo(() => (d: number) => {
    if (d === 0) return { x: 0, z: 60, ry: -20, o: 1, s: 1.04 }
    if (d < 0) {
      const k = Math.min(-d, 4)
      return { x: -40 - k * 16, z: 20 - k * 28, ry: -20, o: Math.max(0.14, 0.46 - k * 0.1), s: 0.96 - k * 0.02 }
    }
    // Espaçamento que abre no começo e fecha no fim, como folhas de um arquivo
    // visto de viés: as primeiras precisam ser legíveis, as últimas só sugeridas.
    // Passo fixo no plano. A compressão de verdade vem da profundidade com a
    // perspectiva, que é o que faz o arquivo parecer fundo em vez de achatado.
    return {
      x: 176 + (d - 1) * 76,
      z: -26 - d * 25,
      ry: -20,
      o: Math.max(0.1, 1 - d * 0.072),
      s: 1 - Math.min(0.22, d * 0.018),
    }
  }, [])

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
          if (e.key === 'Home') { e.preventDefault(); aoTrocar(0) }
          if (e.key === 'End') { e.preventDefault(); aoTrocar(total - 1) }
          if ((e.key === 'Enter' || e.key === ' ') && ativa) { e.preventDefault(); aoAbrir(ativa) }
        }}
        onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); pegar(e.clientX) }}
        onPointerMove={(e) => { if (inicio.current) mover(e.clientX) }}
        onPointerUp={soltar}
        onPointerCancel={soltar}
      >
        <div className="arquivo-fila">
          {itens.map((p, i) => {
            const d = i - atual
            const g = lugar(d)
            const viva = d === 0
            // Passando de quatro, a pasta vira só volume: texto ali seria ruído.
            const longe = d > 4 || d < -1
            return (
              <article
                key={p.id}
                id={`pasta-${p.id}`}
                role="option"
                aria-selected={viva}
                className={`pasta ${viva ? 'viva' : ''} ${longe ? 'longe' : ''} ${p.atrasado ? 'tarde' : ''} ${p.travado ? 'presa' : ''}`}
                style={{
                  zIndex: 100 - Math.abs(d),
                  opacity: g.o,
                  transform: `translate3d(calc(-50% + ${g.x}px), -50%, ${g.z}px) rotateY(${g.ry}deg) scale(${g.s})`,
                }}
                onClick={() => (viva ? aoAbrir(p) : aoTrocar(i))}
              >
                <span className="pasta-luz" aria-hidden="true" />
                <span className="pasta-doc" aria-hidden="true">
                  {[0, 1, 2, 3, 4, 5].map((k) => <i key={k} style={{ width: `${88 - (k % 3) * 22}%` }} />)}
                </span>
                <span className="pasta-pe">
                  <span className="pasta-n"><Ic.team />{p.contagem}</span>
                </span>
                <span className="pasta-nome" aria-hidden={longe}>{p.nome}</span>
                <span className="pasta-lomba" aria-hidden="true">
                  <b style={{ height: `${Math.max(4, p.progresso * 100)}%` }} />
                </span>
              </article>
            )
          })}
        </div>

      </div>

      {ativa && (
        <div className="ficha" aria-live="polite">
          <div className="ficha-h">
            <span>
              <b>{ativa.nome}</b>
              <small>{ativa.sub}</small>
            </span>
            <button className="ficha-ir" aria-label={`Abrir ${ativa.nome}`}
              onClick={(e) => { e.stopPropagation(); aoAbrir(ativa) }}>
              <Ic.seta />
            </button>
          </div>
          <div className="ficha-num">
            <span className="pct">{pct}<i>%</i></span>
            <span className={`ficha-selo ${ativa.atrasado ? 'tarde' : ativa.travado ? 'presa' : ''}`}>
            {ativa.atrasado ? 'Atrasado' : ativa.travado ? 'Travado' : `${ativa.contagem} em aberto`}
            </span>
          </div>
        </div>
      )}

      <div className="arquivo-pe">
        <button className="iconbtn" onClick={() => andar(-1)} disabled={atual === 0} aria-label="Anterior">
          <Ic.volta />
        </button>
        <span className="arquivo-conta num">{atual + 1} / {total}</span>
        <button className="iconbtn" onClick={() => andar(1)} disabled={atual === total - 1} aria-label="Próxima">
          <Ic.seta />
        </button>
        <span className="arquivo-dica">role de lado, arraste ou use as setas</span>
      </div>
    </section>
  )
}
