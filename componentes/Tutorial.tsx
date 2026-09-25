'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePathname } from 'next/navigation'
import { useDados } from './Dados'
import { Ic } from './Icones'
import { tourDe } from '@/lib/tutorial'

/** Onde o passo cabe na tela, medido de verdade. */
type Foco = { top: number; left: number; width: number; height: number } | null

const FOLGA = 8

/**
 * O tutorial de cada tela, na primeira vez que a pessoa chega nela.
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
/**
 * Os tours fechados nesta sessão.
 *
 * Fora do componente de propósito, porque ele desmonta e monta a cada troca de
 * tela. Serve de rede para quando a gravação no perfil não pega (o banco atrás
 * do código, a rede caiu): sem isto o tutorial reabriria a cada visita, e um
 * tutorial que volta depois de fechado é pior do que não ter tutorial.
 */
const fechadosAqui = new Set<string>()

/**
 * Esquecer o que foi fechado nesta sessão.
 *
 * Quem pede "ver tudo de novo" em Ajustes precisa disto: sem ele a lista no
 * perfil esvazia e os tours continuam sem abrir, porque a rede de segurança
 * acima ainda lembra deles.
 */
export function esquecerTutoriais() {
  fechadosAqui.clear()
}

export function Tutorial() {
  const { eu, pode, salvarPerfil, carregando } = useDados()
  const caminho = usePathname()
  /**
   * O tour desta tela, se ela tiver um.
   *
   * Ele é escolhido pelo endereço e não pelo componente que está montado: a
   * tela decide o que mostrar, o tutorial decide o que explicar, e nenhuma das
   * duas precisa saber da outra.
   */
  const tour = useMemo(() => tourDe(caminho, pode), [caminho, pode])
  const passos = useMemo(() => tour?.passos ?? [], [tour])

  const [ligado, setLigado] = useState(false)
  const [n, setN] = useState(0)
  const [foco, setFoco] = useState<Foco>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const cartao = useRef<HTMLDivElement>(null)

  /**
   * Abrir na primeira vez que a pessoa chega nesta tela.
   *
   * O que ela já viu é uma lista de ids em `perfis.tutoriais`, e não um sim ou
   * não: são catorze telas, e a pergunta é sempre "esta aqui, ela já viu?".
   *
   * O atraso existe porque a tela ainda está nascendo quando a rota muda, e o
   * primeiro passo mede o alvo: sem ele, o foco nasce em cima de um esqueleto
   * de carregamento e fica do tamanho errado.
   */
  // As dependências são texto, e não os objetos: `tutoriais` é um array novo a
  // cada leitura dos dados, e comparar o array faria este efeito rodar de novo
  // a cada recarga, fechando o tutorial na cara de quem está lendo.
  const vistos = (eu.tutoriais ?? []).join(',')
  const tourId = tour?.id ?? ''
  useEffect(() => {
    setLigado(false)
    if (carregando || !eu.id || !tourId) return
    if (vistos.split(',').includes(tourId) || fechadosAqui.has(tourId)) return
    const t = setTimeout(() => { setN(0); setLigado(true) }, 420)
    return () => clearTimeout(t)
  }, [carregando, eu.id, vistos, tourId])

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
      // Alvo fora da janela é trazido para o meio dela, e só aqui a rolagem é
      // de propósito: um tutorial que aponta para algo que a pessoa não está
      // vendo não está apontando para nada. O resto do app não rola sozinho.
      if (r.bottom < 0 || r.top > window.innerHeight) {
        el.scrollIntoView({ block: 'center' })
        const d = el.getBoundingClientRect()
        setFoco({ top: d.top, left: d.left, width: d.width, height: d.height })
        return
      }
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

    // O preso() no fim de cada saída é rede: um alvo mais alto que a janela, ou
    // que começou fora dela, dava conta boa e posição fora da tela mesmo assim,
    // e aí o cartão existia sem ninguém poder clicar nele.
    const dentro = (p: { top: number; left: number }) => setPos({
      top: preso(p.top, FOLGA, vh - c.height - FOLGA),
      left: preso(p.left, FOLGA, vw - c.width - FOLGA),
    })

    if (vh - (foco.top + foco.height) - gap >= c.height + FOLGA) {
      dentro({ top: foco.top + foco.height + gap, left: meioX })
    } else if (foco.top - gap >= c.height + FOLGA) {
      dentro({ top: foco.top - c.height - gap, left: meioX })
    } else if (vw - (foco.left + foco.width) - gap >= c.width + FOLGA) {
      dentro({ top: meioY, left: foco.left + foco.width + gap })
    } else if (foco.left - gap >= c.width + FOLGA) {
      dentro({ top: meioY, left: foco.left - c.width - gap })
    } else {
      setPos(null)
    }
  }, [passo, foco, celular, n])

  /**
   * Sair, por qualquer porta, e gravar que esta tela já foi vista.
   *
   * Pular, Esc, clique fora e Fechar fazem a mesma coisa. Tutorial que só
   * termina de um jeito é armadilha, e a primeira coisa que alguém faz num app
   * novo é tentar sair da caixa que apareceu na frente.
   */
  const fechar = useCallback(() => {
    setLigado(false)
    if (!eu.id || !tour) return
    fechadosAqui.add(tour.id)
    const jaVistos = eu.tutoriais ?? []
    if (jaVistos.includes(tour.id)) return
    void salvarPerfil(eu.id, { tutoriais: [...jaVistos, tour.id] }, true)
  }, [eu.id, eu.tutoriais, tour, salvarPerfil])

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
          {passos.map((x, k) => <i key={x.titulo} className={k === n ? "on" : ""} />)}
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
