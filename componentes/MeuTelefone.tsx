'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase/browser'
import { paraE164, foneEscrito } from '@/lib/fone'
import { Ic } from './Icones'

/**
 * O telefone da conta que já existe.
 *
 * Sem isto, entrar por telefone era uma segunda porta para uma SEGUNDA PESSOA:
 * o Supabase trata telefone e e-mail como logins diferentes, então quem já
 * tinha conta e entrava pelo número ganhava outra conta, com outro espaço
 * pessoal e outro @, e o trabalho de uma não aparecia na outra.
 *
 * E não é caso de borda: no lançamento, **todo mundo que já usa o app está
 * nessa situação**. Verificando o número aqui, a conta que ela já tem passa a
 * atender pelos dois, e o convite por número passa a achar a pessoa certa em
 * vez de criar outra.
 *
 * **Um código, uma vez.** Depois disso a sessão fica presa no aparelho, como no
 * WhatsApp: só pede de novo se ela sair ou limpar os dados.
 */
export function MeuTelefone() {
  /**
   * Três estados, e não dois.
   *
   * `undefined` é "ainda não perguntei", `null` é "perguntei e ela não tem", e
   * a string é o número. Com dois, "não carregou" e "não tem" eram a mesma
   * coisa, e o campo de pôr o telefone simplesmente nunca aparecia para quem
   * não tinha nenhum, que é justamente quem precisa dele.
   */
  const [atual, setAtual] = useState<string | null | undefined>(undefined)
  const [fone, setFone] = useState('')
  const [codigo, setCodigo] = useState('')
  const [esperando, setEsperando] = useState(false)
  const [reenviarEm, setReenviarEm] = useState(0)
  const [erro, setErro] = useState('')
  const [ok, setOk] = useState('')
  const [indo, setIndo] = useState(false)
  const [trocando, setTrocando] = useState(false)
  /* A leitura de quem está logado acontece uma vez, e o `ref` evita que o
     React 19 a dispare duas no modo estrito: duas leituras aqui são duas idas
     à rede para responder a mesma pergunta. */
  const leu = useRef(false)

  useEffect(() => {
    if (leu.current) return
    leu.current = true
    void supabase().auth.getUser().then(({ data }) => {
      const f = (data.user as { phone?: string } | null)?.phone || ''
      setAtual(f ? (f.startsWith('+') ? f : `+${f}`) : null)
    }).catch(() => setAtual(null))
  }, [])

  useEffect(() => {
    if (reenviarEm <= 0) return
    const t = setTimeout(() => setReenviarEm((n) => n - 1), 1000)
    return () => clearTimeout(t)
  }, [reenviarEm])

  /**
   * As recusas, separadas por pergunta.
   *
   * Mandar e conferir são coisas diferentes, e misturá-las foi um defeito de
   * verdade na tela de entrar: `Error sending confirmation OTP to provider`
   * virava "código errado" para quem nunca recebeu código nenhum.
   */
  const porqueNaoMandou = (m: string) => {
    if (/unverified|21608/i.test(m)) {
      return 'Esse número ainda não está liberado para receber o código.'
    }
    if (/Invalid.*phone|phone.*invalid|21211/i.test(m)) return 'Esse número não parece um telefone.'
    if (/already (been )?registered|already exists|duplicate/i.test(m)) {
      return 'Esse número já está em outra conta. Entre por ele, ou use outro aqui.'
    }
    if (/rate limit|too many|security purposes/i.test(m)) {
      return 'Muitas tentativas seguidas. Espere um minuto e tente de novo.'
    }
    return 'Não consegui mandar o código. Isso costuma ser configuração do app, e não o seu número.'
  }

  const mandar = async () => {
    const e164 = paraE164(fone)
    if (!e164) { setErro('Esse número não parece um telefone. Ponha o DDD.'); return }
    setIndo(true); setErro(''); setOk('')
    const { error } = await supabase().auth.updateUser({ phone: e164 })
    setIndo(false)
    if (error) {
      setErro(porqueNaoMandou(error.message))
      console.warn('[trackward] o provedor recusou o envio:', error.message)
      return
    }
    setEsperando(true)
    setReenviarEm(30)
    setOk(`Mandei um código por SMS para ${foneEscrito(e164)}.`)
  }

  const conferir = async () => {
    setIndo(true); setErro('')
    /* `phone_change` e não `sms`: aqui a conta já existe e o que se confirma é
       a TROCA do número dela. Com o tipo errado o Supabase recusa um código
       que está certo, e a frase não diz por quê. */
    const { error } = await supabase().auth.verifyOtp({
      phone: paraE164(fone), token: codigo.replace(/\D/g, ''), type: 'phone_change',
    })
    setIndo(false)
    if (error) {
      setErro(/expired/i.test(error.message)
        ? 'Esse código venceu. Peça outro.'
        : 'Código errado. Confira os seis dígitos.')
      return
    }
    setAtual(paraE164(fone))
    setEsperando(false); setTrocando(false); setCodigo(''); setFone('')
    setOk('Pronto. Agora você entra por este número também.')
  }

  // Enquanto a leitura não volta, nada: um campo que aparece preenchido meio
  // segundo depois faz a pessoa achar que digitou errado.
  if (atual === undefined) return null

  return (
    <div className="fld">
      <label htmlFor="aj-fone">Seu telefone</label>

      {!!erro && <div className="erro"><Ic.x />{erro}</div>}
      {!!ok && <div className="ok-box"><Ic.check />{ok}</div>}

      {atual && !trocando ? (
        <>
          <div className="row-inline">
            <p className="aj-fone-ok"><Ic.check />{foneEscrito(atual)}</p>
            <button className="btn" onClick={() => { setTrocando(true); setOk(''); setErro('') }}>
              Trocar
            </button>
          </div>
          <p className="hint">
            Você entra por este número ou pelo e-mail, os dois na mesma conta. O número para
            onde o app te avisa é outro, e fica em Como quero ser avisado.
          </p>
        </>
      ) : esperando ? (
        <>
          <input className="inp ent-codigo" id="aj-fone" value={codigo}
            inputMode="numeric" autoComplete="one-time-code" autoFocus maxLength={6}
            placeholder="000000"
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))} />
          <div className="row-inline" style={{ marginTop: 10 }}>
            <button className="btn pri" disabled={codigo.length < 6 || indo}
              onClick={() => void conferir()}>Confirmar</button>
            <button className="btn" disabled={reenviarEm > 0 || indo}
              onClick={() => void mandar()}>
              {reenviarEm > 0 ? `Reenviar em ${reenviarEm}s` : 'Reenviar'}
            </button>
            <button className="btn" onClick={() => {
              setEsperando(false); setCodigo(''); setErro(''); setOk('')
            }}>Cancelar</button>
          </div>
        </>
      ) : (
        <>
          <div className="row-inline">
            <input className="inp" id="aj-fone" type="tel" value={fone}
              autoComplete="tel" placeholder="42 99978-3288"
              onChange={(e) => setFone(e.target.value)} />
            <button className="btn" disabled={!paraE164(fone) || indo}
              onClick={() => void mandar()}>
              {indo ? 'Mandando...' : 'Verificar'}
            </button>
            {trocando && (
              <button className="btn" onClick={() => { setTrocando(false); setFone(''); setErro('') }}>
                Cancelar
              </button>
            )}
          </div>
          <p className="hint">
            {atual
              ? 'O número novo passa a valer no lugar do antigo, depois de confirmado.'
              : 'Verificando o número, você passa a entrar por ele também, sem senha. '
                + 'Um código, uma vez: depois a sessão fica presa no aparelho.'}
          </p>
        </>
      )}
    </div>
  )
}
