'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/browser'
import { falaDeMaquina } from '@/lib/erros'
import { Ic } from './Icones'
import { primeiroNome } from '@/lib/nomes'

/**
 * Tela de quem tem perfil na empresa mas está com o acesso desligado.
 *
 * Desde que o cadastro passou a ser por convite, ninguém mais cai aqui ao criar
 * conta: quem chega por convite entra liberado, e quem chega sem convite abre a
 * própria empresa. Sobrou o caso de quem foi desativado por um administrador.
 *
 * **E ela era um beco sem saída.** Em 08/10/2026 alguém foi convidado para uma
 * segunda empresa tendo um perfil desligado numa primeira, abriu o app e leu
 * que estava suspenso: as duas saídas eram esperar um administrador de uma
 * empresa que não é a que o chamou, ou sair. O convite ficou aberto.
 *
 * Metade disso é do banco e já foi (ver `meu_perfil`, seção 73: o perfil em uso
 * passa a preferir um que esteja de pé, então quem tem espaço pessoal nem chega
 * aqui). A outra metade é esta: **quem tem um código na mão usa o código aqui**,
 * porque um convite aceito é exatamente o que destrava esta tela, e mandar a
 * pessoa para `/convite/<codigo>` sem ela saber que esse endereço existe é a
 * mesma coisa que não ter saída nenhuma.
 */
export function Espera({ nome, email }: { nome?: string; email: string }) {
  const router = useRouter()
  const [codigo, setCodigo] = useState('')
  const [indo, setIndo] = useState(false)
  const [erro, setErro] = useState('')

  const sair = async () => {
    await supabase().auth.signOut()
    router.push('/entrar')
    router.refresh()
  }

  const aceitar = async () => {
    const c = codigo.trim().toUpperCase()
    if (!c) return
    setIndo(true); setErro('')
    const { error } = await supabase().rpc('entrar_com_convite', { p_codigo: c })
    setIndo(false)
    if (error) {
      // As recusas de `entrar_com_convite` são português escrito para gente
      // ler ("Você já faz parte deste espaço."), e passam inteiras.
      const m = error.message || ''
      setErro(falaDeMaquina(m) ? 'Não foi possível usar este convite agora.' : m)
      return
    }
    // A função já trocou a sessão para o perfil novo, então a casa que abre é a
    // de quem convidou. O refresh é o que faz o layout reler o perfil.
    router.push('/')
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

        <div className="espera-cvt">
          <label htmlFor="esp-cvt">Recebeu um convite de outra empresa?</label>
          <p className="hint">
            O código tem seis letras e vem na mensagem de quem te chamou. Aceitando, você entra
            lá com este mesmo login, e o que está desligado continua desligado.
          </p>
          {!!erro && <div className="erro"><Ic.x />{erro}</div>}
          <div className="row-inline">
            <input className="inp" id="esp-cvt" value={codigo} maxLength={6}
              placeholder="ABC123" autoCapitalize="characters" autoCorrect="off"
              onChange={(e) => { setCodigo(e.target.value.toUpperCase()); setErro('') }}
              onKeyDown={(e) => { if (e.key === 'Enter') void aceitar() }} />
            <button className="btn" disabled={codigo.trim().length < 6 || indo}
              onClick={() => void aceitar()}>{indo ? 'Entrando...' : 'Entrar com o convite'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
