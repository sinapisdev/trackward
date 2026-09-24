'use client'

import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/browser'
import { Ic } from './Icones'
import { primeiroNome } from '@/lib/nomes'

/**
 * Tela de quem tem perfil na empresa mas está com o acesso desligado.
 *
 * Desde que o cadastro passou a ser por convite, ninguém mais cai aqui ao criar
 * conta: quem chega por convite entra liberado, e quem chega sem convite abre a
 * própria empresa. Sobrou o caso de quem foi desativado por um administrador.
 */
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
          <div><b>TrackWard</b><span>Objetivos, rotinas e pessoas</span></div>
        </div>
        <h1>Acesso suspenso{nome ? `, ${primeiroNome(nome, email)}` : ''}</h1>
        <p>
          Sua conta ({email}) existe, mas o acesso dela está desligado no momento. Quem liga de
          volta é um administrador da sua empresa, na tela Equipe. Assim que ele fizer isso, é só
          atualizar esta página.
        </p>
        <div className="row-inline">
          <button className="btn pri" onClick={() => router.refresh()}>Já fui liberado, atualizar</button>
          <button className="btn ghost" onClick={() => void sair()}><Ic.sair />Sair</button>
        </div>
      </div>
    </div>
  )
}
