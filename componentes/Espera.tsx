'use client'

import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/browser'
import { Ic } from './Icones'

/** Tela de quem criou a conta e ainda não foi liberado por um administrador. */
export function Espera({ nome, email }: { nome?: string; email: string }) {
  const router = useRouter()
  const sair = async () => {
    await supabase().auth.signOut()
    router.push('/entrar')
    router.refresh()
  }
  return (
    <div className="espera">
      <div className="card">
        <div className="auth-logo">
          <span className="logo"><Ic.logo /></span>
          <div><b>Esteira</b><span>Silvereng</span></div>
        </div>
        <h1>Cadastro recebido{nome ? `, ${nome.split(' ')[0]}` : ''}</h1>
        <p>
          Sua conta ({email}) já existe, mas ainda precisa ser liberada por um administrador da Silvereng.
          Assim que isso acontecer, é só atualizar esta página para entrar.
        </p>
        <div className="row-inline">
          <button className="btn pri" onClick={() => router.refresh()}>Já fui liberado, atualizar</button>
          <button className="btn ghost" onClick={() => void sair()}><Ic.sair />Sair</button>
        </div>
      </div>
    </div>
  )
}
