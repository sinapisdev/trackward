'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePathname, useRouter } from 'next/navigation'
import { useDados } from './Dados'
import { Ic } from './Icones'
import { passosDe } from '@/lib/tutorial'

/** Onde o passo cabe na tela, medido de verdade. */
type Foco = { top: number; left: number; width: number; height: number } | null

const FOLGA = 8

/**
 * O tutorial da primeira vez.
 *
 * Ele acende um pedaço da interface de verdade e escreve ao lado: o que a
 * pessoa precisa aprender é ONDE a coisa fica, e isso não se aprende olhando
 * figura de tela dentro de um modal. O roteiro mora em `lib/tutorial.ts`, e os
 * alvos são atributos `data-tut`, nunca classes de CSS: classe muda quando
 * alguém mexe no estilo, e o tutorial passaria a apontar para o nada sem
 * quebrar nada visível.
 *
 * **Ele sai por qualquer porta.** Pular, a tecla Esc, clicar fora e terminar
 * fazem a mesma coisa, e todas gravam que já foi visto. Tutorial que só termina
 * de um jeito é armadilha, e a primeira coisa que alguém faz num app novo é
 * tentar sair da caixa que apareceu na frente.
 *
 * **Passo sem alvo na tela não trava a fila.** Se o elemento não estiver lá, o
 * passo aparece centralizado e sem o foco, e a pessoa segue. Travar aqui é
 * travar o app inteiro na primeira vez que ele abre.
 */
export function Tutorial() {
  const { eu, pode, salvarPerfil, carregando } = useDados()
  const passos = useMemo(() => passosDe(pode), [pode])
  const router = useRouter()
  const caminho = usePathname()

  const [ligado, setLigado] = useState(false)
  const [n, setN] = useState(0)
  const [foco, setFoco] = useState<Foco>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const cartao = useRef<HTMLDivElement>(null)

  // A primeira vez é a que conta. Quem já viu só volta aqui pedindo, por
  // Ajustes, e aí `tutorial_em` é limpo e este efeito liga de novo.
  useEffect(() => {
    if (carregando || !eu.id) return
    if (eu.tutorial_em) return
    // O roteiro é o da tela inicial, que é onde as três colunas existem. Quem
    // pediu para rever em Ajustes está noutra tela, e ali metade dos passos
    // apontaria para o nada: o tutorial leva a pessoa para casa primeiro.
    if (caminho !== '/') router.push('/')
    setLigado(true)
    setN(0)
  }, [carregando, eu.id, eu.tutorial_em, caminho, router])

  const passo = ligado ? passos[n] : null
  const celular = typeof window !== 'undefined' && window.innerWidth <= 840
  const alvo = passo ? (celular ? passo.alvoCel || passo.alvo : passo.alvo) : null
  const texto = passo ? (celular && passo.textoCel) || passo.texto : ''

  /** Mede o alvo, e volta a medir quando a janela mexe. */
  useEffect(() => {
    if (!passo) return
    const medir = () => {
      const el = alvo ? document.querySelector<HTMLElement>(`[data-tut="${alvo}"]`) : null
      if (!el) { setFoco(null); return }
      const r = el.getBoundingClientRect()
      if (!r.width || !r.height) { setFoco(null); return }
      setFoco({ top: r.top, left: r.left, width: r.width, height: r.height })
    }
    medir()
    // Duas medições: a primeira pega a tela como ela está, e a segunda pega
    // depois que a barra terminou de assentar. Sem a segunda, o foco nasce
    // deslocado no celular, onde a barra de cima cresce depois de pintar.
    const t = setTimeout(medir, 120)
    window.addEventListener('resize', medir)
    window.addEventListener('scroll', medir, true)
    return () => {
      clearTimeout(t)
      window.removeEventListener('resize', medir)
      window.removeEventListener('scroll', medir, true)
    }
  }, [passo, alvo])

  /**
   * De que lado do alvo o cartão cabe, com a altura dele medida, e não chutada.
   *
   * A ordem é embaixo, em cima, à direita, à esquerda, e o meio da tela quando
   * nada disso serve. Os dois últimos existem porque metade dos alvos aqui é
   * uma COLUNA INTEIRA (a conversa, a fila, o radar): ela ocupa a janela de
   * cima a baixo, não sobra nada acima nem abaixo, e o cartão nascia metade
   * fora da tela. Chutar a altura dava no mesmo, porque o texto de cada passo
   * tem um tamanho.
   */
  useLayoutEffect(() => {
    if (!passo) return
    if (!foco || celular) { setPos(null); return }
    const c = cartao.current?.getBoundingClientRect()
    if (!c) { setPos(null); return }
    const vw = window.innerWidth
    const vh = window.innerHeight
    const gap = FOLGA * 1.5
    const preso = (v: number, min: number, max: number) => Math.min(Math.max(v, min), Math.max(min, max))
    const meioX = preso(foco.left + foco.width / 2 - c.width / 2, FOLGA, vw - c.width - FOLGA)
    const meioY = preso(foco.top + foco.height / 2 - c.height / 2, FOLGA, vh - c.height - FOLGA)

    if (vh - (foco.top + foco.height) - gap >= c.height + FOLGA) {
      setPos({ top: foco.top + foco.height + gap, left: meioX })
    } else if (foco.top - gap >= c.height + FOLGA) {
      setPos({ top: foco.top - c.height - gap, left: meioX })
    } else if (vw - (foco.left + foco.width) - gap >= c.width + FOLGA) {
      setPos({ top: meioY, left: foco.left + foco.width + gap })
    } else if (foco.left - gap >= c.width + FOLGA) {
      setPos({ top: meioY, left: foco.left - c.width - gap })
    } else {
      setPos(null)
    }
  }, [passo, foco, celular, n])

  const fechar = useCallback(() => {
    setLigado(false)
    if (eu.id && !eu.tutorial_em) {
      void salvarPerfil(eu.id, { tutorial_em: new Date().toISOString() }, true)
    }
  }, [eu.id, eu.tutorial_em, salvarPerfil])

  const seguir = () => { if (n + 1 >= passos.length) fechar(); else setN(n + 1) }
  const voltar = () => setN((k) => Math.max(0, k - 1))

  useEffect(() => {
    if (!ligado) return
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fechar()
      if (e.key === 'ArrowRight') seguir()
      if (e.key === 'ArrowLeft') voltar()
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  })

  if (!ligado || !passo || typeof document === 'undefined') return null

  const ultimo = n + 1 >= passos.length

  return createPortal((
    <div className={`tut ${foco ? 'com-foco' : ''}`} role="dialog" aria-modal="true"
      aria-label="Tutorial">
      {/* O escuro é quem fecha ao clicar fora, e o furo é o que deixa a pessoa
          ver a interface de verdade por baixo. */}
      <div className="tut-fundo" onClick={fechar} />
      {foco && (
        <div className="tut-foco" style={{
          top: foco.top - FOLGA, left: foco.left - FOLGA,
          width: foco.width + FOLGA * 2, height: foco.height + FOLGA * 2,
        }} />
      )}

      <div ref={cartao} className={`tut-cartao ${foco && pos ? '' : 'centro'}`}
        style={pos ? { top: pos.top, left: pos.left } : undefined}>
        <div className="tut-h">
          <span className="tut-passo">{n + 1} de {passos.length}</span>
          <button className="iconbtn" onClick={fechar} aria-label="Sair do tutorial"><Ic.x /></button>
        </div>
        <b>{passo.titulo}</b>
        <p>{texto}</p>
        <div className="tut-pontos" aria-hidden>
          {passos.map((x, k) => <i key={x.id} className={k === n ? 'on' : ''} />)}
        </div>
        <div className="tut-acoes">
          <button className="tut-pular" onClick={fechar}>
            {ultimo ? 'Fechar' : 'Pular'}
          </button>
          <span className="tut-nav">
            {n > 0 && <button className="btn" onClick={voltar}>Voltar</button>}
            <button className="btn pri" onClick={seguir}>
              {ultimo ? 'Começar' : 'Próximo'}<Ic.seta />
            </button>
          </span>
        </div>
      </div>
    </div>
  ), document.body)
}
