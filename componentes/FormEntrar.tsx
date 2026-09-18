'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/browser'
import { Ic } from './Icones'

type Modo = 'entrar' | 'criar' | 'esqueci'

function Formulario() {
  const router = useRouter()
  const params = useSearchParams()
  const [modo, setModo] = useState<Modo>('entrar')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [convite, setConvite] = useState('')
  const [erro, setErro] = useState('')
  const [ok, setOk] = useState('')
  const [indo, setIndo] = useState(false)

  const traduzir = (m: string) => {
    if (/Invalid login credentials/i.test(m)) return 'E-mail ou senha não conferem.'
    if (/Email not confirmed/i.test(m)) return 'Confirme o e-mail pelo link que enviamos antes de entrar.'
    if (/User already registered/i.test(m)) return 'Este e-mail já tem cadastro. Use "entrar".'
    if (/at least 6 characters|Password should be/i.test(m)) return 'A senha precisa de pelo menos 6 caracteres.'
    if (/rate limit|too many/i.test(m)) return 'Muitas tentativas seguidas. Espere um minuto e tente de novo.'
    return m
  }

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro(''); setOk(''); setIndo(true)
    const sb = supabase()
    try {
      if (modo === 'esqueci') {
        const { error } = await sb.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${location.origin}/auth/confirmar?proximo=/nova-senha`,
        })
        if (error) throw error
        setOk('Link enviado. Confira seu e-mail para escolher uma senha nova.')
        return
      }
      if (modo === 'criar') {
        if (!nome.trim()) { setErro('Diga seu nome para a equipe reconhecer você.'); return }
        const { data, error } = await sb.auth.signUp({
          email: email.trim(),
          password: senha,
          options: { data: { nome: nome.trim(), convite: convite.trim().toUpperCase() } },
        })
        if (error) throw error
        if (!data.session) {
          setOk('Cadastro criado. Confirme o e-mail pelo link que enviamos e depois entre por aqui.')
          setModo('entrar')
          return
        }
      } else {
        const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password: senha })
        if (error) throw error
      }
      const destino = params.get('de') || '/'
      router.push(destino)
      router.refresh()
    } catch (e) {
      setErro(traduzir((e as { message?: string }).message || 'Não foi possível continuar.'))
    } finally {
      setIndo(false)
    }
  }

  return (
    <div className="auth">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="logo"><Ic.logo /></span>
          <div><b>Track</b><span>Projetos, rotinas e pessoas</span></div>
        </div>

        <h1>
          {modo === 'entrar' ? 'Entrar' : modo === 'criar' ? 'Criar conta' : 'Recuperar senha'}
        </h1>
        <p className="sub">
          {modo === 'entrar' && 'O andamento das áreas e dos projetos da empresa, num lugar só.'}
          {modo === 'criar' && 'Com o código do convite, você entra direto. Sem ele, um administrador precisa liberar.'}
          {modo === 'esqueci' && 'Digite o e-mail da sua conta e enviamos um link para escolher uma senha nova.'}
        </p>

        {erro && <div className="erro"><Ic.x />{erro}</div>}
        {ok && <div className="ok-box"><Ic.check />{ok}</div>}

        <form onSubmit={enviar}>
          {modo === 'criar' && (
            <>
              <div className="fld">
                <label htmlFor="a-nome">Seu nome</label>
                <input className="inp" id="a-nome" value={nome} autoFocus placeholder="Ex.: Leo"
                  onChange={(e) => setNome(e.target.value)} />
              </div>
              <div className="fld">
                <label htmlFor="a-convite">Código do convite</label>
                <input className="inp" id="a-convite" value={convite} placeholder="Ex.: ENG7K2"
                  autoCapitalize="characters" spellCheck={false}
                  onChange={(e) => setConvite(e.target.value.toUpperCase())} />
                <p className="hint">
                  Quem administra o app te passou este código. Ele define o seu acesso e libera sua
                  entrada na hora. Sem código, sua conta fica aguardando liberação.
                </p>
              </div>
            </>
          )}
          <div className="fld">
            <label htmlFor="a-email">E-mail</label>
            <input className="inp" id="a-email" type="email" required value={email} autoComplete="email"
              autoFocus={modo !== 'criar'} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {modo !== 'esqueci' && (
            <div className="fld">
              <label htmlFor="a-senha">Senha</label>
              <input className="inp" id="a-senha" type="password" required value={senha} minLength={6}
                autoComplete={modo === 'criar' ? 'new-password' : 'current-password'}
                onChange={(e) => setSenha(e.target.value)} />
            </div>
          )}
          <button className="btn pri" type="submit" disabled={indo}>
            {indo ? 'Um instante…' : modo === 'entrar' ? 'Entrar' : modo === 'criar' ? 'Criar conta' : 'Enviar link'}
          </button>
        </form>

        <div className="alt">
          {modo === 'entrar' && (
            <>
              <button onClick={() => { setModo('criar'); setErro(''); setOk('') }}>Criar conta</button>
              {' · '}
              <button onClick={() => { setModo('esqueci'); setErro(''); setOk('') }}>Esqueci minha senha</button>
            </>
          )}
          {modo !== 'entrar' && (
            <button onClick={() => { setModo('entrar'); setErro(''); setOk('') }}>Voltar para entrar</button>
          )}
        </div>
      </div>
    </div>
  )
}

export function FormEntrar() {
  return (
    <Suspense fallback={<div className="auth"><div className="auth-card">Carregando…</div></div>}>
      <Formulario />
    </Suspense>
  )
}
