'use client'

import { useEffect, type ReactNode } from 'react'
import { useDados } from './Dados'
import { Barra, Rodape } from './Barra'
import { TabBar } from './TabBar'
import { Ic } from './Icones'
import { PedeNome } from './PedeNome'
import { Instalar } from './Instalar'
import { PedirPush } from './PedirPush'
import { Medidor } from './Medidor'
import { Tutorial } from './Tutorial'
import { FaixaDoPlano } from './Plano'

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
      /* A barra flutua: o que as telas de altura fixa precisam descontar é a
         altura dela MAIS a folga até o fim da janela, senão o campo de escrever
         nasce embaixo dela. Por isso mede-se o topo da barra até a base da
         janela, e não a altura da caixa. */
      /* `display:none` devolve um retângulo de ZEROS, e não `null`. Então
         `innerHeight - r.top` virava `innerHeight - 0`, ou seja, a janela
         INTEIRA: no computador, onde a barra existe no DOM e some por CSS, a
         variável valia 900px e quem a descontava ficava com altura zero. O
         secretário foi o primeiro a cair porque é a primeira tela de altura
         fixa que desconta a barra também no computador. A pergunta certa não é
         se o elemento existe, é se ele OCUPA espaço. */
      /* O rodapé da marca, que no computador fica embaixo de tudo e é fácil
         esquecer que ocupa altura: tela de altura fixa que não o desconta faz
         a PÁGINA rolar exatamente a altura dele, e aí a barra de abas sobe e
         desce com a barra de endereço. No celular ele some, e mede zero. */
      const pe = document.querySelector('.tw-rodape') as HTMLElement | null
      const peR = pe?.getBoundingClientRect()
      raiz.style.setProperty('--alt-rodape-real',
        (peR && peR.height > 0 ? Math.round(peR.height) : 0) + 'px')

      const r = abas?.getBoundingClientRect()
      const naTela = !!r && r.height > 0
      const ocupa = naTela ? Math.max(0, Math.round(window.innerHeight - r.top)) : 0
      raiz.style.setProperty('--alt-abas-real', ocupa + 'px')

      /**
       * A altura que SOBRA quando o teclado está aberto.
       *
       * `100dvh` não encolhe com o teclado: no celular ele é desenhado POR CIMA
       * da página, e a página continua achando que tem a tela inteira. O
       * resultado é a conversa inteira empurrada para baixo do teclado, com o
       * campo de escrever fora da tela, que é justamente onde a pessoa estava
       * tentando digitar.
       *
       * Quem sabe o tamanho de verdade é `visualViewport`, e só ele: ele é a
       * parte da página que a pessoa está realmente vendo. Sem ele (navegador
       * antigo), cai em `innerHeight`, que é o comportamento de hoje.
       *
       * `offsetTop` entra na conta porque, com o teclado aberto, o navegador
       * às vezes rola a página por dentro em vez de encolher a janela: ignorar
       * isso deixa a tela alta demais pelo tanto que ele rolou.
       */
      const vv = window.visualViewport
      const janela = vv ? Math.round(vv.height + vv.offsetTop) : window.innerHeight
      raiz.style.setProperty('--alt-janela', janela + 'px')
    }
    medir()
    const ro = new ResizeObserver(medir)
    for (const s of ['.tw-topo', '.tabbar', '.tw-rodape']) {
      const el = document.querySelector(s)
      if (el) ro.observe(el)
    }
    window.addEventListener('resize', medir)
    const vv = window.visualViewport
    vv?.addEventListener('resize', medir)
    vv?.addEventListener('scroll', medir)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', medir)
      vv?.removeEventListener('resize', medir)
      vv?.removeEventListener('scroll', medir)
    }
  }, [])
}

export function Shell({ children }: { children: ReactNode }) {
  const { aviso } = useDados()
  useAlturaDasBarras()

  return (
    <div className="shell">
      <Barra />
      {/* Só aparece quando o teste está acabando ou já acabou. Ver Plano.tsx. */}
      <FaixaDoPlano />
      <main className="main">
        <div className="conteudo">{children}</div>
      </main>
      <Rodape />

      <TabBar />

      {/* Quem entrou sem nome é chamado pelo e-mail, e a equipe inteira vê isso. */}
      <PedeNome />

      {/* A régua, só com ?medir=1 no endereço. */}
      <Medidor />

      {/* No celular, o convite para deixar o app na tela. Ele espera o tutorial
          e o nome: uma coisa de cada vez, e instalar é a menos urgente das três. */}
      <Instalar />
      <PedirPush />

      {/* A primeira vez de cada pessoa, apontando para a tela de verdade. */}
      <Tutorial />

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
