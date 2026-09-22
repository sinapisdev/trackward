'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Ic } from './Icones'

export type Pasta = {
  id: string
  /** Para onde o clique leva. */
  href: string
  /** Área ou Projeto: a pasta diz o que ela é antes de dizer quem é. */
  rotulo: string
  nome: string
  /**
   * O número grande do miolo, já com a unidade. Num projeto é o quanto andou;
   * numa área é quantas tarefas estão abertas, porque área não tem linha de
   * chegada e porcentagem ali não quer dizer nada.
   */
  numero: string
  /** O que aquele número é, quando não for óbvio. */
  numeroSub?: string
  /** Linha de baixo do miolo: a etapa da vez, ou o resumo da área. */
  sub: string
  /** Quantas pessoas estão dentro. É o número no pé da pasta. */
  contagem: number
  /** 0 a 1. Enche a barra do miolo e a lombada. */
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
   * O mesmo valor de pos, guardado num ref.
   *
   * Existe por um motivo específico: a mola e o encaixe da roda precisam LER
   * onde a fila está agora, e o lugar errado de fazer isso é dentro da função
   * que atualiza o estado. Essa função tem que ser pura, porque o React pode
   * chamá-la duas vezes para conferir, e avisar o Painel lá de dentro é avisar
   * no meio do desenho de outro componente. Era exatamente essa a reclamação.
   *
   * Com o ref, ler a posição atual não custa nada e não depende de render.
   */
  const posRef = useRef(atual)

  /** O único lugar que mexe na posição, para o ref nunca ficar para trás. */
  const irPara = useCallback((v: number) => {
    posRef.current = v
    setPos(v)
  }, [])

  const total = itens.length
  const limitar = useCallback((i: number) => Math.max(0, Math.min(total - 1, i)), [total])

  /** Puxa a fila até o índice escolhido, com mola. Parado, não gasta quadro. */
  const assentar = useCallback((destino: number) => {
    if (quadro.current) cancelAnimationFrame(quadro.current)
    const passo = () => {
      const falta = destino - posRef.current
      if (Math.abs(falta) < 0.004) {
        quadro.current = null
        irPara(destino)
        return
      }
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

  // Roda e trackpad movem a fila em fração de pasta, sem esperar completar o
  // passo, e ela só encaixa quando a pessoa para. No trackpad isso é a
  // diferença entre deslizar e clicar onze vezes.
  useEffect(() => {
    const el = palco.current
    if (!el) return
    let parar: ReturnType<typeof setTimeout> | null = null
    const naRoda = (e: WheelEvent) => {
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
      if (!d) return
      e.preventDefault()
      if (quadro.current) { cancelAnimationFrame(quadro.current); quadro.current = null }
      irPara(limitar(posRef.current + d / 90))
      if (parar) clearTimeout(parar)
      // Parou de rolar: encaixa na pasta mais perto e conta para o Painel. Aqui
      // fora do updater, que é o lugar certo de um efeito colateral.
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
    irPara(limitar(inicio.current.pos + (inicio.current.x - x) / 86))
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

  // A geometria de cada pasta, em função da distância para a da vez. À direita
  // elas se comprimem, como folhas de um arquivo visto de viés; à esquerda
  // empilham atrás, para a fila continuar existindo mesmo depois de passar.
  const pose = useMemo(() => (d: number) => {
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
      x: 202 + (d - 1) * 88,
      z: -26 - d * 25,
      ry: -20,
      o: Math.max(0.1, 1 - d * 0.072),
      s: 1 - Math.min(0.22, d * 0.018),
    }
  }, [])

  /**
   * Entre duas posições inteiras o valor é interpolado, e é por isso que a fila
   * desliza em vez de saltar. As poses continuam exatamente as mesmas: o que
   * mudou foi só o caminho entre elas.
   */
  const misturar = (a: number, b: number, t: number) => a + (b - a) * t
  const lugar = (d: number) => {
    const a = Math.floor(d)
    const t = d - a
    const pa = pose(a)
    const pb = pose(a + 1)
    return {
      x: misturar(pa.x, pb.x, t), z: misturar(pa.z, pb.z, t), ry: pa.ry,
      o: misturar(pa.o, pb.o, t), s: misturar(pa.s, pb.s, t),
    }
  }

  if (!total) return null

  // Enquanto a fila corre, o ponto de fuga acompanha: é o que dá a sensação de
  // que o arquivo girou, e não de que os cartões trocaram de lugar.
  const inclina = Math.max(-1, Math.min(1, (pos - naVez) * 2))

  return (
    <section className="arquivo" aria-roledescription="carrossel" aria-label={rotulo}>
      <div
        className={`arquivo-palco ${arrastando ? 'puxando' : ''}`}
        ref={palco}
        tabIndex={0}
        role="listbox"
        aria-label={rotulo}
        aria-activedescendant={`pasta-${ativa?.id}`}
        style={{ perspectiveOrigin: `${30 + inclina * 5}% 50%` }}
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
        <div className="arquivo-fila" style={{ transform: `rotateY(${inclina * -2.4}deg)` }}>
          {itens.map((p, i) => {
            const d = i - pos
            const g = lugar(d)
            const viva = i === naVez
            const dist = Math.round(d)
            // Passando de quatro, a pasta vira só volume: texto ali seria ruído.
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
                  transform: `translate3d(calc(-50% + ${g.x.toFixed(1)}px), -50%, ${g.z.toFixed(1)}px) rotateY(${g.ry}deg) scale(${g.s.toFixed(3)})`,
                }}
                onClick={() => (viva ? aoAbrir(p) : (aoTrocar(i), assentar(i)))}
              >
                <span className="pasta-luz" aria-hidden="true" />
                {/* O miolo branco é o painel da pasta: é aqui que mora o que
                    antes vivia numa ficha flutuante ao lado. */}
                <span className="pasta-doc">
                  <span className="doc-topo">
                    <span className="doc-pct num">{p.numero}</span>
                    {(p.atrasado || p.travado) && (
                      <span className={`doc-selo ${p.atrasado ? 'tarde' : 'presa'}`}>
                        {p.atrasado ? 'Atrasado' : 'Travado'}
                      </span>
                    )}
                  </span>
                  {p.numeroSub && <span className="doc-unid">{p.numeroSub}</span>}
                  <span className="doc-sub">{p.sub}</span>
                  <span className="doc-barra"><b style={{ width: `${Math.max(3, p.progresso * 100)}%` }} /></span>
                </span>
                <span className="pasta-pe">
                  <span className="pasta-n"><Ic.team />{p.contagem}</span>
                  <span className="pasta-rot">{p.rotulo}</span>
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

      <div className="arquivo-pe">
        <button className="iconbtn" onClick={() => andar(-1)} disabled={naVez === 0} aria-label="Anterior">
          <Ic.volta />
        </button>
        <span className="arquivo-conta num">{naVez + 1} / {total}</span>
        <button className="iconbtn" onClick={() => andar(1)} disabled={naVez === total - 1} aria-label="Próxima">
          <Ic.seta />
        </button>
        <span className="arquivo-dica">role de lado, arraste ou use as setas</span>
      </div>
    </section>
  )
}
