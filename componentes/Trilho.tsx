'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Ic } from '@/componentes/Icones'
import { Av } from '@/componentes/atomos'
import type { Perfil } from '@/lib/tipos'

/**
 * A trilha de uma track, desenhada de ponta a ponta.
 *
 * O desenho é o mesmo de um quadro de fluxo: um nó de partida, os checkpoints em
 * fila e um nó de chegada, ligados por setas. Uma área tem uma faixa por rotina,
 * porque área não é uma corrida só: são várias que se repetem.
 *
 * É tudo HTML com CSS, sem canvas e sem biblioteca. Assim o teclado anda pelos nós,
 * o leitor de tela lê cada um e a página continua imprimível.
 */

export type EstadoNo = 'feito' | 'vez' | 'futuro' | 'travado'

export type NoTrilho = {
  id: string
  tipo: 'inicio' | 'etapa' | 'fim'
  nome: string
  sub: string
  estado: EstadoNo
  tarefas?: number
  feitas?: number
  gente?: Perfil[]
  atrasado?: boolean
}

export type Faixa = {
  id: string
  /** Só aparece quando há mais de uma faixa, que é o caso das áreas. */
  nome?: string
  sub?: string
  nos: NoTrilho[]
}

const ESCALAS = [0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.25, 1.4]

const icone = (n: NoTrilho) => {
  if (n.tipo === 'inicio') return <Ic.raio />
  if (n.tipo === 'fim') return <Ic.flag />
  return <Ic.processo />
}

function No({ no, escolhido, aoEscolher }: {
  no: NoTrilho
  escolhido: boolean
  aoEscolher?: (id: string) => void
}) {
  const clicavel = !!aoEscolher && no.tipo === 'etapa'
  const marca = no.estado === 'feito'
    ? <span className="no-selo ok" aria-label="Aprovado"><Ic.check /></span>
    : no.estado === 'travado'
      ? <span className="no-selo trava" aria-label="Travado"><Ic.trava /></span>
      : <span className="no-selo vazio" aria-hidden />

  return (
    <div
      className={`no ${no.tipo} ${no.estado} ${escolhido ? 'escolhido' : ''} ${no.atrasado ? 'atrasado' : ''}`}
      role={clicavel ? 'button' : undefined}
      tabIndex={clicavel ? 0 : undefined}
      onClick={clicavel ? () => aoEscolher(no.id) : undefined}
      onKeyDown={clicavel ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); aoEscolher(no.id) }
      } : undefined}
    >
      {marca}
      <span className="no-ic">{icone(no)}</span>
      <b className="no-nome">{no.nome}</b>
      {!!no.sub && <span className="no-sub">{no.sub}</span>}
      {no.tipo === 'etapa' && no.tarefas !== undefined && (
        <span className="no-pe">
          <span className="no-conta">{no.feitas ?? 0}/{no.tarefas}</span>
          {!!no.gente?.length && (
            <span className="no-gente">
              {no.gente.slice(0, 3).map((p) => <Av key={p.id} p={p} tam="sm" />)}
              {no.gente.length > 3 && <i>+{no.gente.length - 3}</i>}
            </span>
          )}
        </span>
      )}
    </div>
  )
}

export function Trilho({ faixas, escolhido, aoEscolher, acao }: {
  faixas: Faixa[]
  escolhido?: string | null
  aoEscolher?: (id: string) => void
  /** Botão solto no fim da fila, para acrescentar um checkpoint. */
  acao?: { rotulo: string; aoClicar: () => void }
}) {
  const [nivel, setNivel] = useState(5)
  const palco = useRef<HTMLDivElement>(null)
  const fora = useRef<HTMLDivElement>(null)
  const escala = ESCALAS[nivel]

  const arrastando = useRef<{ x: number; y: number; ex: number; ey: number } | null>(null)

  /** Acha a maior escala em que a trilha inteira cabe na tela. */
  const caber = useCallback(() => {
    const pal = palco.current
    const cx = fora.current
    if (!pal || !cx) return
    const largura = pal.scrollWidth / escala
    const alvo = (cx.clientWidth - 56) / Math.max(largura, 1)
    let i = 0
    for (let k = 0; k < ESCALAS.length; k++) if (ESCALAS[k] <= alvo) i = k
    setNivel(i)
    cx.scrollTo({ left: 0, behavior: 'smooth' })
  }, [escala])

  /**
   * A track abre no tamanho de leitura e já posicionada no checkpoint da vez,
   * que é a pergunta que se faz ao abrir: onde isto está agora? Encolher tudo
   * para caber deixaria a trilha ilegível justo na hora de olhar.
   */
  const chave = useMemo(() => faixas.map((f) => f.id).join('|'), [faixas])
  useEffect(() => {
    const t = setTimeout(() => {
      const cx = fora.current
      const alvo = cx?.querySelector('.no.vez, .no.travado')
      if (!cx || !alvo) return
      const r = (alvo as HTMLElement).getBoundingClientRect()
      const c = cx.getBoundingClientRect()
      cx.scrollTo({ left: cx.scrollLeft + r.left - c.left - (c.width - r.width) / 2 })
    }, 80)
    return () => clearTimeout(t)
  }, [chave])

  const mudarNivel = (d: number) =>
    setNivel((n) => Math.max(0, Math.min(ESCALAS.length - 1, n + d)))

  return (
    <div className="trilho">
      <div
        className="trilho-fora"
        ref={fora}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest('.no, button')) return
          const el = fora.current
          if (!el) return
          arrastando.current = { x: e.clientX, y: e.clientY, ex: el.scrollLeft, ey: el.scrollTop }
          el.setPointerCapture(e.pointerId)
          el.classList.add('pegando')
        }}
        onPointerMove={(e) => {
          const a = arrastando.current
          const el = fora.current
          if (!a || !el) return
          el.scrollLeft = a.ex - (e.clientX - a.x)
          el.scrollTop = a.ey - (e.clientY - a.y)
        }}
        onPointerUp={() => {
          arrastando.current = null
          fora.current?.classList.remove('pegando')
        }}
      >
        <div className="trilho-palco" ref={palco} style={{ transform: `scale(${escala})` }}>
          {faixas.map((f) => (
            <div className="faixa" key={f.id}>
              {f.nome && (
                <div className="faixa-h">
                  <b>{f.nome}</b>
                  {!!f.sub && <span>{f.sub}</span>}
                </div>
              )}
              <div className="faixa-fila">
                {f.nos.map((n, i) => (
                  <div className="cel" key={n.id}>
                    {i > 0 && <span className="liga" aria-hidden />}
                    {n.tipo === 'fim' && acao && faixas.length === 1 && (
                      <>
                        <button className="no somar" onClick={acao.aoClicar}>
                          <span className="no-ic"><Ic.plus /></span>
                          <b className="no-nome">{acao.rotulo}</b>
                        </button>
                        <span className="liga tracejada" aria-hidden />
                      </>
                    )}
                    <No no={n} escolhido={escolhido === n.id} aoEscolher={aoEscolher} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="trilho-zoom">
        <button className="iconbtn" onClick={() => mudarNivel(-1)} disabled={nivel === 0}
          aria-label="Afastar"><Ic.menos /></button>
        <span className="num">{Math.round(escala * 100)}%</span>
        <button className="iconbtn" onClick={() => mudarNivel(1)} disabled={nivel === ESCALAS.length - 1}
          aria-label="Aproximar"><Ic.plus /></button>
        <span className="risco" />
        <button className="iconbtn" onClick={caber} aria-label="Caber na tela" title="Caber na tela">
          <Ic.caber />
        </button>
      </div>
    </div>
  )
}
