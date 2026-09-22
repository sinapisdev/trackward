'use client'

import { type ReactNode } from 'react'
import { useDados } from './Dados'
import { Barra, Rodape } from './Barra'
import { TabBar } from './TabBar'
import { Ic } from './Icones'

export function Shell({ children }: { children: ReactNode }) {
  const { aviso } = useDados()

  return (
    <div className="shell">
      <Barra />
      <main className="main">
        <div className="conteudo">{children}</div>
      </main>
      <Rodape />

      <TabBar />

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
