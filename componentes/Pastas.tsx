'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Ic } from './Icones'

export type Pasta = {
  id: string
  nome: string
  /** Linha de baixo: período, etapa, o que situar sem abrir. */
  sub: string
  /** Quantas tarefas abertas. É o número no pé da pasta. */
  contagem: number
  /** 0 a 1. Vira a porcentagem e a altura da lombada. */
  progresso: number
  atrasado?: boolean
  travado?: boolean
}

/**
 * Como as pastas ficam de pé no arquivo.
 *
 *  diagonal: de viés, como um arquivo visto de lado. Cabe muita pasta na tela e
 *            o detalhe da que está na vez aparece numa ficha flutuante.
 *  frente:   de frente, como cartas numa esteira. Cabe menos, e em troca **toda**
 *            pasta mostra o que tem dentro, não só a escolhida.
 */
export type Modo = 'diagonal' | 'frente'

const CHAVE_MODO = 'track.pastas.modo'

export function Pastas({ itens, atual, aoTrocar, aoAbrir, rotulo }: {
  itens: Pasta[]
  atual: number
  aoTrocar: (i: number) => void
  aoAbrir: (p: Pasta) => void
  rotulo: string
}) {
  const palco = useRef<HTMLDivElement>(null)
  const acumulado = useRef(0)
  const inicio = useRef<{ x: number; i: number } | null>(null)
  const [arrastando, setArrastando] = useState(false)
  const [modo, setModo] = useState<Modo>('diagonal')
  /** Para que lado a fila está indo agora. Zerado, ninguém se mexe. */
  const [indo, setIndo] = useState(0)
  const parar = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    try {
      const m = localStorage.getItem(CHAVE_MODO)
      if (m === 'frente' || m === 'diagonal') setModo(m)
    } catch {}
  }, [])

  const trocarModo = (m: Modo) => {
    setModo(m)
    try { localStorage.setItem(CHAVE_MODO, m) } catch {}
  }

  const total = itens.length
  const limitar = useCallback((i: number) => Math.max(0, Math.min(total - 1, i)), [total])
  /**
   * Além de mudar a pasta, marca a direção por um instante. É isso que inclina
   * o ponto de fuga enquanto a fila corre, e é o que faz a rolagem ter peso em
   * vez de parecer um slide trocando de imagem.
   */
  const andar = useCallback((n: number) => {
    const alvo = limitar(atual + n)
    if (alvo === atual) return
    aoTrocar(alvo)
    setIndo(Math.sign(n))
    if (parar.current) clearTimeout(parar.current)
    parar.current = setTimeout(() => setIndo(0), 220)
  }, [atual, aoTrocar, limitar])

  useEffect(() => () => { if (parar.current) clearTimeout(parar.current) }, [])

  // Roda e trackpad: os dois eixos servem, porque no trackpad a pessoa desliza
  // de lado e no mouse ela gira para baixo.
  useEffect(() => {
    const el = palco.current
    if (!el) return
    const naRoda = (e: WheelEvent) => {
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
      if (!d) return
      e.preventDefault()
      acumulado.current += d
      const passo = 26
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
    const alvo = limitar(inicio.current.i + Math.round((inicio.current.x - x) / 30))
    if (alvo !== atual) andar(alvo - atual)
  }
  const soltar = () => { inicio.current = null; setArrastando(false) }

  const ativa = itens[atual]
  const pct = (p: Pasta) => Math.round(p.progresso * 100)

  /**
   * O lugar de cada pasta, em função da distância para a da vez.
   * Na diagonal elas se comprimem para caber muita; de frente elas precisam de
   * largura, porque cada uma carrega o próprio texto.
   */
  const lugar = useMemo(() => (d: number) => {
    if (modo === 'frente') {
      if (d === 0) return { x: 0, z: 70, ry: -7, o: 1, s: 1.04 }
      if (d < 0) {
        const k = Math.min(-d, 4)
        return { x: -66 - k * 30, z: 10 - k * 30, ry: -7, o: Math.max(0.1, 0.4 - k * 0.1), s: 0.95 - k * 0.02 }
      }
      return { x: 212 + (d - 1) * 180, z: -24 - d * 20, ry: -7,
        o: Math.max(0.12, 1 - d * 0.1), s: 1 - Math.min(0.18, d * 0.02) }
    }

    // De lado é de lado: as pastas ficam quase de perfil, como um arquivo de
    // gaveta visto pela lateral. A da vez gira de volta para mostrar a cara.
    if (d === 0) return { x: 0, z: 124, ry: -42, o: 1, s: 1.06 }
    if (d < 0) {
      const k = Math.min(-d, 5)
      return { x: -60 - k * 28, z: 80 - k * 44, ry: -60, o: Math.max(0.18, 0.6 - k * 0.1), s: 0.98 - k * 0.012 }
    }
    // O arco: quanto mais longe, mais de perfil e mais para trás, até virar fio.
    // O passo precisa deixar uma faixa visível em cada pasta, senão o nome de
    // uma cai por cima do da outra e nenhum se lê.
    return {
      x: 104 + d * 56,
      z: -16 - d * 15,
      ry: -60 - Math.min(18, d * 2),
      o: Math.max(0.08, 1 - d * 0.055),
      s: 1 - Math.min(0.16, d * 0.013),
    }
  }, [modo])

  if (!total) return null

  return (
    <section className="arquivo" data-modo={modo} aria-roledescription="carrossel" aria-label={rotulo}>
      <div
        className={`arquivo-palco ${arrastando ? 'puxando' : ''} ${indo ? 'correndo' : ''}`}
        style={{ perspectiveOrigin: `${(modo === 'frente' ? 34 : 26) + indo * 5}% 50%` }}
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
        <div className="arquivo-fila" style={{ transform: `rotateY(${indo * -2.2}deg)` }}>
          {itens.map((p, i) => {
            const d = i - atual
            const g = lugar(d)
            const viva = d === 0
            // Passando de quatro na diagonal a pasta vira só volume: nome ali
            // seria ruído empilhado. De frente cabe menos pasta, e todas falam.
            const longe = modo === 'diagonal' ? (d > 3 || d < -1) : (d > 3 || d < -1)
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
                {/* O miolo branco. De frente ele carrega a informação, que é
                    onde ela cabe; de lado ele volta a ser só papel, porque a
                    ficha ao lado é quem conta a história. */}
                <span className="pasta-doc" aria-hidden={modo === 'diagonal'}>
                  {modo === 'frente' ? (
                    <span className="doc-dentro">
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
                  ) : (
                    [0, 1, 2, 3, 4, 5].map((k) => <i key={k} style={{ width: `${88 - (k % 3) * 22}%` }} />)
                  )}
                </span>
                <span className="pasta-info">
                  <span className="pasta-pe">
                    <span className="pasta-n"><Ic.team />{p.contagem}</span>
                  </span>
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

      {/* A ficha só existe na diagonal: de frente, cada pasta já se explica. */}
      {modo === 'diagonal' && ativa && (
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
            <span className="pct">{pct(ativa)}<i>%</i></span>
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

        <div className="seg arquivo-modo" role="group" aria-label="Formato do arquivo">
          <button className={modo === 'diagonal' ? 'on' : ''} onClick={() => trocarModo('diagonal')}>
            De lado
          </button>
          <button className={modo === 'frente' ? 'on' : ''} onClick={() => trocarModo('frente')}>
            De frente
          </button>
        </div>

        <span className="arquivo-dica">role de lado, arraste ou use as setas</span>
      </div>
    </section>
  )
}
