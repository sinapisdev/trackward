'use client'

import { useEffect, useState } from 'react'
import { useDados } from '@/componentes/Dados'
import { Ic } from '@/componentes/Icones'
import { Av } from '@/componentes/atomos'
import { curta, rel } from '@/lib/datas'
import type { Item, NaCascata } from '@/lib/tipos'

/**
 * O aviso antes de mexer num prazo.
 *
 * Mudar uma data não é um ato isolado: o que depende dela pode não caber mais.
 * A tentação é fazer a cascata sozinha, e seria errado, porque tem data que
 * ninguém pode mover, prazo legal, data de cliente, evento marcado.
 *
 * Então aqui a conta é feita e mostrada antes de qualquer coisa acontecer,
 * separada em três colunas de consequência:
 *
 *   anda junto     mesma esteira, você responde por ela, muda na hora
 *   pede aceite    outra esteira, quem responde por ela decide
 *   não anda       data firme, e isso fica sendo um problema para resolver
 *
 * Quem confirma vê os três grupos antes de confirmar. É o contrário de um
 * "tem certeza?": é a informação que faz a pergunta valer.
 */

function Linha({ l }: { l: NaCascata }) {
  const { perfilDe, nomeDe } = useDados()
  return (
    <div className={`cas-l ${l.firme ? 'firme' : l.meu ? 'anda' : 'pede'}`}>
      <span className="cas-ic">
        {l.firme ? <Ic.lock /> : l.meu ? <Ic.seta /> : <Ic.espera />}
      </span>
      <span className="cas-txt">
        <b>{l.texto}</b>
        <span>{l.fluxo}{l.resp_id && ` · ${nomeDe(l.resp_id)}`}</span>
      </span>
      <span className="cas-datas">
        {l.de && <i className="de">{curta(l.de)}</i>}
        {!l.firme && <><Ic.seta /><i className="para">{curta(l.para)}</i></>}
        {l.firme && <i className="fica">fica</i>}
      </span>
      {l.resp_id && <Av p={perfilDe(l.resp_id)} tam="sm" />}
    </div>
  )
}

export function AvisoPrazo({ item, novo, fechar, aoConfirmar }: {
  item: Item
  novo: string
  fechar: () => void
  aoConfirmar?: () => void | Promise<void>
}) {
  const { preverCascata, moverPrazo } = useDados()
  const [lista, setLista] = useState<NaCascata[] | null>(null)
  const [motivo, setMotivo] = useState('')
  const [indo, setIndo] = useState(false)

  useEffect(() => {
    let vivo = true
    void preverCascata(item, novo).then((r) => { if (vivo) setLista(r) })
    return () => { vivo = false }
  }, [item, novo, preverCascata])

  const efeitos = (lista || []).filter((l) => l.nivel > 0)
  const andam = efeitos.filter((l) => !l.firme && l.meu)
  const pedem = efeitos.filter((l) => !l.firme && !l.meu)
  const presas = efeitos.filter((l) => l.firme)

  const confirmar = async () => {
    setIndo(true)
    // A cascata primeiro, sempre: se os outros campos gravassem antes, o novo
    // prazo já estaria valendo e a cascata não acharia nada para mover.
    const ok = await moverPrazo(item, novo, motivo.trim())
    if (!ok) { setIndo(false); return }
    await aoConfirmar?.()
    setIndo(false)
    fechar()
  }

  return (
    <div className="dec-fundo" onClick={fechar}>
      <div className="dec cas" role="dialog" aria-modal="true" aria-labelledby="cas-t"
        onClick={(e) => e.stopPropagation()}>

        <header className="dec-h">
          <div>
            <span className="rot">Mudar o prazo</span>
            <h3 id="cas-t">{item.texto}</h3>
            <p>
              {item.prazo ? <>de <b>{curta(item.prazo)}</b> para <b>{curta(novo)}</b></> : <>passa a vencer {rel(novo).toLowerCase()}</>}
            </p>
          </div>
          <button className="iconbtn" onClick={fechar} aria-label="Fechar"><Ic.x /></button>
        </header>

        <div className="dec-corpo">
          {lista === null ? (
            <p className="cas-vazio">Vendo o que depende desta data.</p>
          ) : !efeitos.length ? (
            <p className="cas-vazio">
              <Ic.check />
              Nada depende desta data, ou o que depende tem folga de sobra. Só esta tarefa muda.
            </p>
          ) : (
            <>
              {!!presas.length && (
                <div className="cas-grupo firme">
                  <div className="cas-h">
                    <Ic.lock />
                    <b>{presas.length === 1 ? 'Uma data não pode andar' : `${presas.length} datas não podem andar`}</b>
                    <span>
                      {presas.length === 1 ? 'Esta data é firme' : 'Estas datas são firmes'} e fica
                      {presas.length === 1 ? '' : 'm'} onde está
                      {presas.length === 1 ? '' : 'ão'}. Alguém vai ter que dar um jeito de acontecer
                      do mesmo jeito.
                    </span>
                  </div>
                  {presas.map((l) => <Linha key={l.item_id} l={l} />)}
                </div>
              )}

              {!!pedem.length && (
                <div className="cas-grupo pede">
                  <div className="cas-h">
                    <Ic.espera />
                    <b>{pedem.length === 1 ? 'Um pedido de aceite' : `${pedem.length} pedidos de aceite`}</b>
                    <span>
                      {pedem.length === 1 ? 'Esta tarefa é' : 'Estas tarefas são'} de outra esteira.
                      Quem responde por ela decide, e até decidir a data não muda.
                    </span>
                  </div>
                  {pedem.map((l) => <Linha key={l.item_id} l={l} />)}
                </div>
              )}

              {!!andam.length && (
                <div className="cas-grupo anda">
                  <div className="cas-h">
                    <Ic.seta />
                    <b>{andam.length === 1 ? 'Uma tarefa anda junto' : `${andam.length} tarefas andam junto`}</b>
                    <span>Desta mesma esteira, guardando a folga que {andam.length === 1 ? 'tinha' : 'tinham'}.</span>
                  </div>
                  {andam.map((l) => <Linha key={l.item_id} l={l} />)}
                </div>
              )}
            </>
          )}
        </div>

        <div className="dec-pe">
          {!!pedem.length && (
            <label className="dec-nota">
              <span>Por que a data mudou</span>
              <textarea rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ex.: o fornecedor atrasou a entrega do equipamento" />
            </label>
          )}
          <div className="dec-botoes">
            <button className="btn ghost" onClick={fechar}>Cancelar</button>
            <button className="btn pri" onClick={() => void confirmar()}
              disabled={indo || lista === null}>
              {indo ? 'Aplicando' : pedem.length ? 'Mudar e pedir aceite' : 'Mudar o prazo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
