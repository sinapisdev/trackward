'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/browser'
import { Ic } from '@/componentes/Icones'

export default function NovaSenha() {
  const router = useRouter()
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [indo, setIndo] = useState(false)

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro(''); setIndo(true)
    const { error } = await supabase().auth.updateUser({ password: senha })
    setIndo(false)
    if (error) { setErro(error.message); return }
    router.push('/')
    router.refresh()
  }

  return (
    <div className="auth">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="logo"><Ic.logo /></span>
          <div><b>Track</b><span>Projetos, rotinas e pessoas</span></div>
        </div>
        <h1>Escolher senha nova</h1>
        <p className="sub">Use pelo menos 6 caracteres.</p>
        {erro && <div className="erro"><Ic.x />{erro}</div>}
        <form onSubmit={salvar}>
          <div className="fld">
            <label htmlFor="n-senha">Senha nova</label>
            <input className="inp" id="n-senha" type="password" required minLength={6} value={senha}
              autoFocus autoComplete="new-password" onChange={(e) => setSenha(e.target.value)} />
          </div>
          <button className="btn pri" type="submit" disabled={indo}>{indo ? 'Salvando…' : 'Salvar senha'}</button>
        </form>
      </div>
    </div>
  )
}
