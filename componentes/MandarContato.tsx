'use client'

import { useEffect, useRef, useState } from 'react'
import { Ic } from './Icones'
import { escolherDaAgenda, temAgendaDoFone } from '@/lib/agendaDoFone'
import { foneEscrito, paraE164 } from '@/lib/fone'

/**
 * Mandar um contato pela conversa, pelo botão.
 *
 * Existia só como `/contato Nome Telefone`, e digitar não é compartilhar: no
 * WhatsApp isso é um toque no clipe e um toque no nome da pessoa, e é com isso
 * que quem usa compara. A linguagem de barra continua valendo, porque ela é
 * mais rápida para quem já sabe o número de cor, mas ela não pode ser o único
 * caminho.
 *
 * **O botão é igual em todo aparelho; o que ele faz muda.** Onde existe a
 * Contact Picker API, que é o Chrome no Android, ele abre a agenda do telefone
 * e volta com o nome e o número preenchidos. No iPhone aquela API não existe, e
 * não é falta de permissão, é falta de API: lá o botão abre estes dois campos.
 * Dois campos é pior que escolher da lista, e é muito melhor que decorar uma
 * sintaxe.
 *
 * E mesmo vindo da agenda, a ficha APARECE antes de mandar: o número que o
 * telefone guarda nem sempre é o que se quer passar (o fixo da empresa, o
 * contato duplicado, o antigo), e ver antes resolve isso sem perguntar nada.
 */
export function MandarContato({ aoMandar, aoFechar }: {
  aoMandar: (c: { nome: string; fone: string }) => unknown | Promise<unknown>
  aoFechar: () => void
}) {
  const [nome, setNome] = useState('')
  const [fone, setFone] = useState('')
  const [buscando, setBuscando] = useState(false)
  const campoNome = useRef<HTMLInputElement>(null)
  const caixa = useRef<HTMLDivElement>(null)
  const [daAgenda, setDaAgenda] = useState(false)

  useEffect(() => { setDaAgenda(temAgendaDoFone()) }, [])

  /**
   * Abre a agenda assim que a ficha aparece, onde ela existe.
   *
   * O gesto da pessoa foi o toque no botão, e ele vale para o seletor: a cadeia
   * daqui até lá não passa por rede nenhuma. Onde a API não existe, nada
   * acontece e os campos ficam esperando, que é o caminho de sempre.
   */
  useEffect(() => {
    if (!temAgendaDoFone()) { campoNome.current?.focus(); return }
    let vivo = true
    setBuscando(true)
    void escolherDaAgenda().then((c) => {
      if (!vivo) return
      setBuscando(false)
      if (c) { setNome(c.nome); setFone(c.fone) } else campoNome.current?.focus()
    })
    return () => { vivo = false }
  }, [])

  /** Sai por qualquer porta, como toda caixa que aparece sozinha. */
  useEffect(() => {
    const fora = (e: MouseEvent) => {
      if (!caixa.current?.contains(e.target as Node)) aoFechar()
    }
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') aoFechar() }
    document.addEventListener('mousedown', fora)
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('mousedown', fora)
      document.removeEventListener('keydown', tecla)
    }
  }, [aoFechar])

  const limpo = paraE164(fone) || fone.replace(/[^\d+]/g, '')
  const serve = !!nome.trim() && limpo.replace(/\D/g, '').length >= 8

  const mandar = async () => {
    if (!serve) return
    await aoMandar({ nome: nome.trim(), fone: limpo })
    aoFechar()
  }

  return (
    <div className="ctt-ficha" ref={caixa}>
      <div className="ctt-h">
        <Ic.team />
        <b>Passar um contato</b>
        <button className="iconbtn" aria-label="Fechar" onClick={aoFechar}><Ic.x /></button>
      </div>

      {buscando ? (
        <p className="hint">Abrindo a sua agenda...</p>
      ) : (
        <>
          <label className="ctt-l" htmlFor="ctt-nome">De quem é</label>
          <input className="inp" id="ctt-nome" ref={campoNome} value={nome}
            placeholder="Nelson da esquadria" autoComplete="off"
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void mandar() }} />

          <label className="ctt-l" htmlFor="ctt-fone">Telefone</label>
          <input className="inp" id="ctt-fone" value={fone} inputMode="tel"
            placeholder="(42) 99988-7766" autoComplete="off"
            onChange={(e) => setFone(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void mandar() }} />

          {/* O número como ele vai ficar no cartão. Ver antes é o que evita
              mandar um DDD a menos e descobrir quando alguém tenta ligar. */}
          {!!paraE164(fone) && <p className="hint">Vai como {foneEscrito(paraE164(fone))}.</p>}

          {daAgenda && (
            <button className="ctt-agenda" onClick={() => {
              setBuscando(true)
              void escolherDaAgenda().then((c) => {
                setBuscando(false)
                if (c) { setNome(c.nome); setFone(c.fone) }
              })
            }}><Ic.lupa />Escolher da agenda</button>
          )}

          <div className="row-inline">
            <button className="btn ghost" onClick={aoFechar}>Deixa pra lá</button>
            <button className="btn pri" disabled={!serve} onClick={() => void mandar()}>
              Mandar o contato
            </button>
          </div>
        </>
      )}
    </div>
  )
}
