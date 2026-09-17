'use client'

import { useState } from 'react'
import { useDados } from './Dados'
import { useModais } from './Modais'
import { Carregando } from './Shell'
import { Ic } from './Icones'
import { FiltroPessoas, Grupos, Lateral, LinhaPendencia } from './partes'
import { DSEM_LONGO, hoje, MES_LONGO } from '@/lib/datas'
import { envolve, pendencias, status } from '@/lib/regras'
import Link from 'next/link'

export function Painel() {
  const { eu, fluxos, areas, carregando, nomeDe } = useDados()
  const { abrir } = useModais()
  const [pessoa, setPessoa] = useState<string | null>(null)

  if (carregando) return <Carregando />

  const lista = fluxos.filter((f) => envolve(f, pessoa))
  const conta = (k: string) => lista.filter((f) => status(f) === k).length
  const minhas = pendencias(fluxos, eu.id)

  const partes: string[] = []
  if (conta('late')) partes.push('late')
  if (conta('hold')) partes.push('hold')
  if (conta('soon')) partes.push('soon')

  const h = hoje()
  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'
  const primeiroNome = eu.nome.split(' ')[0]

  const frase = !fluxos.length ? (
    'Nada cadastrado ainda.'
  ) : !partes.length ? (
    'Tudo em dia.'
  ) : (
    <>
      {partes.map((k, i) => (
        <span key={k}>
          {i > 0 && (i === partes.length - 1 ? ' e ' : ', ')}
          {k === 'late' && <b className="l">{conta('late')} {conta('late') > 1 ? 'esteiras atrasadas' : 'esteira atrasada'}</b>}
          {k === 'hold' && <b className="h">{conta('hold')} {conta('hold') > 1 ? 'travadas' : 'travada'}</b>}
          {k === 'soon' && <b className="w">{conta('soon')} vencendo em até 3 dias</b>}
        </span>
      ))}
      .
    </>
  )

  const vazio = !fluxos.length

  return (
    <>
      <div className="hdr">
        <div>
          <div className="eyebrow">
            {DSEM_LONGO[h.getDay()]}, {h.getDate()} de {MES_LONGO[h.getMonth()]}
          </div>
          <h1>{saudacao}, {primeiroNome}</h1>
          <p className="lede">
            {frase}{' '}
            {!!minhas.length && (
              <>
                <b>{minhas.length}</b> {minhas.length > 1 ? 'itens aguardam' : 'item aguarda'} você.
              </>
            )}
          </p>
        </div>
        <div className="hdr-actions">
          <FiltroPessoas pessoa={pessoa} aoTrocar={setPessoa} />
          {!!areas.length && (
            <button className="btn pri" onClick={() => abrir({ tipo: 'fluxo', tipoFluxo: 'esteira' })}>
              <Ic.plus />Novo
            </button>
          )}
        </div>
      </div>

      {vazio ? (
        <div className="card">
          <div className="onb">
            <h3>{areas.length ? 'Crie o primeiro projeto ou rotina' : 'Comece criando um area'}</h3>
            <p>
              {areas.length
                ? 'Projetos têm início, checkpoints e fim. Rotinas se repetem a cada período e guardam o histórico de cada volta.'
                : 'Áreas são as frentes que já funcionam na empresa: Financeiro, Engenharia, Comercial. Cada uma tem as rotinas que se repetem.'}
            </p>
            {areas.length ? (
              <div className="row-inline">
                <button className="btn pri" onClick={() => abrir({ tipo: 'fluxo', tipoFluxo: 'esteira' })}>
                  <Ic.plus />Novo projeto
                </button>
                <button className="btn" onClick={() => abrir({ tipo: 'fluxo', tipoFluxo: 'ciclo' })}>
                  <Ic.ciclo />Nova rotina
                </button>
              </div>
            ) : eu.papel === 'admin' ? (
              <button className="btn pri" onClick={() => abrir({ tipo: 'area' })}><Ic.plus />Novo area</button>
            ) : (
              <p className="hint">Peça a um administrador para criar os areas da empresa.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="grid2">
          <div>
            {!pessoa && !!minhas.length && (
              <div className="blk">
                <div className="bh">
                  <h2>Aguardando você</h2>
                  <span className="c num">{minhas.length}</span>
                  <Link className="r" href="/minhas">Ver todas</Link>
                </div>
                <div className="card">
                  {minhas.slice(0, 4).map((p, i) => <LinhaPendencia key={i} p={p} />)}
                </div>
              </div>
            )}
            <div className="blk">
              <div className="bh">
                <h2>Radar</h2>
                <span className="c">
                  {pessoa ? `com participação de ${nomeDe(pessoa)}` : 'todos os projetos e rotinas'}
                </span>
              </div>
              <Grupos lista={lista} />
            </div>
          </div>
          <Lateral lista={lista} />
        </div>
      )}
    </>
  )
}
