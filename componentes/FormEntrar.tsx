'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/browser'
import { Ic } from './Icones'

type Modo = 'entrar' | 'escolher' | 'criar' | 'esqueci'
/** Os três jeitos de a conta nascer. Ver novo_usuario() em supabase/schema.sql. */
type Jeito = 'pessoal' | 'equipe' | 'convite'

const ESCOLHAS: { id: Jeito; titulo: string; texto: string }[] = [
  { id: 'equipe', titulo: 'Para a minha equipe',
    texto: 'Você abre o espaço da empresa e convida as pessoas por e-mail.' },
  { id: 'pessoal', titulo: 'Só para mim',
    texto: 'Suas áreas, seus projetos e suas rotinas. Dá para convidar alguém depois, sem recomeçar.' },
  { id: 'convite', titulo: 'Tenho um convite',
    texto: 'Alguém já abriu o espaço da empresa e te mandou um código.' },
]

function Formulario() {
  const router = useRouter()
  const params = useSearchParams()
  const [modo, setModo] = useState<Modo>('entrar')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [convite, setConvite] = useState('')
  const [jeito, setJeito] = useState<Jeito>('equipe')
  const [empresa, setEmpresa] = useState('')
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
        if (!nome.trim()) { setErro('Diga seu nome, é assim que as pessoas vão te reconhecer.'); return }
        if (jeito === 'equipe' && !empresa.trim()) { setErro('Diga o nome da empresa.'); return }
        if (jeito === 'convite' && !convite.trim()) { setErro('Cole o código que te mandaram.'); return }
        const { data, error } = await sb.auth.signUp({
          email: email.trim(),
          password: senha,
          options: {
            data: {
              nome: nome.trim(),
              // Um campo por jeito. O banco decide o resto, e o papel nunca vem daqui.
              ...(jeito === 'convite' ? { convite: convite.trim().toUpperCase() } : {}),
              ...(jeito === 'equipe' ? { organizacao: empresa.trim() } : {}),
              ...(jeito === 'pessoal' ? { organizacao: nome.trim(), tipo: 'pessoal' } : {}),
            },
          },
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
          {modo === 'entrar' ? 'Entrar'
            : modo === 'escolher' ? 'Criar conta'
              : modo === 'criar' ? ESCOLHAS.find((x) => x.id === jeito)!.titulo
                : 'Recuperar senha'}
        </h1>
        <p className="sub">
          {modo === 'entrar' && 'Cada projeto e cada rotina com checkpoints: o que precisa ser feito, quem responde e até quando.'}
          {modo === 'escolher' && 'O Track serve para uma pessoa e para uma empresa inteira. Comece por onde fizer sentido hoje.'}
          {modo === 'criar' && ESCOLHAS.find((x) => x.id === jeito)!.texto}
          {modo === 'esqueci' && 'Digite o e-mail da sua conta e enviamos um link para escolher uma senha nova.'}
        </p>

        {erro && <div className="erro"><Ic.x />{erro}</div>}
        {ok && <div className="ok-box"><Ic.check />{ok}</div>}

        {modo === 'escolher' && (
          <div className="escolhas">
            {ESCOLHAS.map((x) => (
              <button key={x.id} type="button" className="escolha"
                onClick={() => { setJeito(x.id); setModo('criar'); setErro(''); setOk('') }}>
                <b>{x.titulo}</b>
                <span>{x.texto}</span>
              </button>
            ))}
          </div>
        )}

        {modo !== 'escolher' && (
        <form onSubmit={enviar}>
          {modo === 'criar' && (
            <>
              <div className="fld">
                <label htmlFor="a-nome">Seu nome</label>
                <input className="inp" id="a-nome" value={nome} autoFocus placeholder="Ex.: Leo"
                  onChange={(e) => setNome(e.target.value)} />
              </div>
              {jeito === 'equipe' && (
                <div className="fld">
                  <label htmlFor="a-empresa">Nome da empresa</label>
                  <input className="inp" id="a-empresa" value={empresa} placeholder="Ex.: Grupo Meridiano"
                    onChange={(e) => setEmpresa(e.target.value)} />
                  <p className="hint">
                    É o nome que aparece no alto do app para todo mundo da sua equipe.
                    Dá para trocar depois em Ajustes.
                  </p>
                </div>
              )}
              {jeito === 'convite' && (
                <div className="fld">
                  <label htmlFor="a-convite">Código do convite</label>
                  <input className="inp" id="a-convite" value={convite} placeholder="Ex.: ENG7K2"
                    autoCapitalize="characters" spellCheck={false}
                    onChange={(e) => setConvite(e.target.value.toUpperCase())} />
                  <p className="hint">
                    Quem te convidou mandou este código. Ele já define a sua área, a quem você
                    responde e libera a sua entrada na hora.
                  </p>
                </div>
              )}
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
        )}

        <div className="alt">
          {modo === 'entrar' && (
            <>
              <button onClick={() => { setModo('escolher'); setErro(''); setOk('') }}>Criar conta</button>
              {' · '}
              <button onClick={() => { setModo('esqueci'); setErro(''); setOk('') }}>Esqueci minha senha</button>
            </>
          )}
          {modo === 'criar' && (
            <>
              <button onClick={() => { setModo('escolher'); setErro(''); setOk('') }}>Trocar o jeito de entrar</button>
              {' · '}
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
