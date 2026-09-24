'use client'

import { useEffect, type ReactNode } from 'react'
import { useDados } from './Dados'
import { Barra, Rodape } from './Barra'
import { TabBar } from './TabBar'
import { Ic } from './Icones'
import { PedeNome } from './PedeNome'

/**
 * Quanto as barras do app ocupam, medido de verdade.
 *
 * A altura delas está no CSS como número fixo, e no celular isso é mentira: a
 * barra de cima quebra em duas linhas e a de baixo cresce com a faixa do
 * aparelho sem botão. Tela que calcula a própria altura com o número errado
 * passa do fim da janela, e o que fica escondido embaixo é sempre a última
 * coisa da tela, que na conversa é justamente o campo de escrever.
 *
 * Medir e publicar como variável resolve para todo mundo de uma vez, e se
 * corrige sozinho quando a barra muda de tamanho.
 */
function useAlturaDasBarras() {
  useEffect(() => {
    const raiz = document.documentElement
    const medir = () => {
      const topo = document.querySelector('.tw-topo') as HTMLElement | null
      const abas = document.querySelector('.tabbar') as HTMLElement | null
      raiz.style.setProperty('--alt-topo-real', (topo?.offsetHeight || 0) + 'px')
      // Zero quando a barra de abas não está na tela: no computador ela não
      // existe, e descontar altura de barra que não existe encolhe a tela à toa.
      raiz.style.setProperty('--alt-abas-real', (abas?.offsetHeight || 0) + 'px')
    }
    medir()
    const ro = new ResizeObserver(medir)
    for (const s of ['.tw-topo', '.tabbar']) {
      const el = document.querySelector(s)
      if (el) ro.observe(el)
    }
    window.addEventListener('resize', medir)
    return () => { ro.disconnect(); window.removeEventListener('resize', medir) }
  }, [])
}

export function Shell({ children }: { children: ReactNode }) {
  const { aviso } = useDados()
  useAlturaDasBarras()

  return (
    <div className="shell">
      <Barra />
      <main className="main">
        <div className="conteudo">{children}</div>
      </main>
      <Rodape />

      <TabBar />

      {/* Quem entrou sem nome é chamado pelo e-mail, e a equipe inteira vê isso. */}
      <PedeNome />

      <div className={`toast ${aviso ? 'show' : ''}`} role="status">
        {aviso && (
          <>
            <span style={{ color: aviso.erro ? 'var(--late)' : 'var(--ac)' }}>
              {aviso.erro ? <Ic.x /> : <Ic.check />}
            </span>
            {aviso.texto}
          </>
        )}
      </div>
    </div>
  )
}

/** Esqueleto enquanto os dados chegam, para a tela não pular. */
export function Carregando() {
  return (
    <>
      <div className="hdr">
        <div style={{ width: '100%' }}>
          <div className="skel" style={{ width: 120, height: 12, marginBottom: 12 }} />
          <div className="skel" style={{ width: 280, height: 26, marginBottom: 12 }} />
          <div className="skel" style={{ width: 420, height: 14, maxWidth: '80%' }} />
        </div>
      </div>
      <div className="grid2">
        <div className="card" style={{ padding: 15, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[0, 1, 2, 3, 4, 5].map((k) => <div key={k} className="skel" style={{ height: 22 }} />)}
        </div>
        <div className="card" style={{ padding: 15, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[0, 1, 2, 3].map((k) => <div key={k} className="skel" style={{ height: 22 }} />)}
        </div>
      </div>
    </>
  )
}
