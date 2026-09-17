'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { Dados } from './Dados'
import { Modais } from './Modais'
import { Shell } from './Shell'
import { Ic } from './Icones'
import { Av } from './atomos'
import { definirEuLocal, euLocal, pessoasLocais } from '@/lib/local/cliente'
import type { Perfil } from '@/lib/tipos'

/**
 * No modo demonstração não existe login: você escolhe quem é, entre as pessoas
 * de exemplo, e pode trocar quando quiser para ver o app pelos olhos de cada um.
 */
export function LocalGate({ children }: { children: ReactNode }) {
  const [pronto, setPronto] = useState(false)
  const [pessoas, setPessoas] = useState<Perfil[]>([])
  const [perfil, setPerfil] = useState<Perfil | null>(null)

  useEffect(() => {
    const lista = pessoasLocais() as unknown as Perfil[]
    const id = euLocal()
    setPessoas(lista)
    setPerfil(lista.find((p) => p.id === id) || null)
    setPronto(true)
  }, [])

  if (!pronto) return null

  if (!perfil) {
    return (
      <div className="auth">
        <div className="auth-card">
          <div className="auth-logo">
            <span className="logo"><Ic.logo /></span>
            <div><b>Esteira</b><span>Silvereng</span></div>
          </div>
          <h1>Quem é você?</h1>
          <p className="sub">
            Esta é uma empresa de exemplo, para você experimentar o app antes de ligá-lo no
            banco. Escolha uma pessoa: as pendências, as aprovações e os itens privados mudam
            conforme quem está olhando.
          </p>
          <div className="plist">
            {pessoas.map((p) => (
              <button key={p.id} className="pch" onClick={() => { definirEuLocal(p.id); setPerfil(p) }}>
                <Av p={p} />
                {p.nome}
                {p.papel === 'admin' && <small style={{ color: 'var(--tx-3)', fontWeight: 400 }}>admin</small>}
              </button>
            ))}
          </div>
          <p className="hint" style={{ marginTop: 16 }}>
            Nada sai deste navegador. Para começar de novo com os dados originais, use
            Equipe, Modo demonstração.
          </p>
        </div>
      </div>
    )
  }

  return (
    <Dados perfil={perfil}>
      <Modais>
        <Shell>{children}</Shell>
      </Modais>
    </Dados>
  )
}
