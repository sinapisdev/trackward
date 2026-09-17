'use client'

import { useMemo, useState } from 'react'
import { useDados } from './Dados'
import { Carregando } from './Shell'
import { Ic } from './Icones'
import { LinhaPendencia } from './partes'
import { dias } from '@/lib/datas'
import { pendencias } from '@/lib/regras'
import type { Pendencia } from '@/lib/tipos'

type Filtro = 'tudo' | 'vencidas' | 'aprovar' | 'travadas'

/**
 * A fila de quem está usando o app: tudo que depende dele, separado pelo tipo
 * de atenção que pede. É a tela de trabalho do dia a dia no celular.
 */
export function Minhas() {
  const { eu, fluxos, carregando, nomeDe } = useDados()
  const [filtro, setFiltro] = useState<Filtro>('tudo')

  const tudo = useMemo(() => pendencias(fluxos, eu.id), [fluxos, eu.id])

  /** Índice de tarefas para saber o que está travado por quem. */
  const porId = useMemo(() => {
    const m = new Map<string, { texto: string; feito: boolean; resp: string | null }>()
    for (const f of fluxos) {
      for (const e of f.etapas) {
        for (const i of e.itens) m.set(i.id, { texto: i.texto, feito: i.feito, resp: i.resp_id })
      }
    }
    return m
  }, [fluxos])

  const travasDe = (p: Pendencia) =>
    p.tipo === 'item'
      ? p.item.depende_de.map((id) => porId.get(id)).filter((t) => t && !t.feito)
      : []

  if (carregando) return <Carregando />

  const vencidas = tudo.filter((p) => p.prazo && dias(p.prazo) < 0)
  const aprovar = tudo.filter((p) => p.tipo === 'aprov')
  const travadas = tudo.filter((p) => travasDe(p).length > 0)

  const abas: { id: Filtro; nome: string; itens: Pendencia[] }[] = [
    { id: 'tudo', nome: 'Tudo', itens: tudo },
    { id: 'vencidas', nome: 'Vencidas', itens: vencidas },
    { id: 'aprovar', nome: 'Aprovar', itens: aprovar },
    { id: 'travadas', nome: 'Travadas', itens: travadas },
  ]
  const atual = abas.find((a) => a.id === filtro) || abas[0]

  /** No filtro Tudo vale separar por urgência; nos outros a lista já é o corte. */
  const blocos = filtro === 'tudo'
    ? [
        { titulo: 'Vencidas', itens: vencidas },
        { titulo: 'Esta semana', itens: tudo.filter((p) => p.prazo && dias(p.prazo) >= 0 && dias(p.prazo) < 7) },
        { titulo: 'Mais adiante', itens: tudo.filter((p) => !p.prazo || dias(p.prazo) >= 7) },
      ].filter((b) => b.itens.length)
    : [{ titulo: atual.nome, itens: atual.itens }]

  return (
    <>
      <div className="hdr">
        <div>
          <div className="eyebrow">Tudo que depende de você, nas áreas e nos projetos</div>
          <h1>Aguardando você</h1>
          <p className="lede">
            {tudo.length ? (
              <>
                <b>{tudo.length}</b> {tudo.length > 1 ? 'itens' : 'item'} entre execução e aprovações
                {!!vencidas.length && <>, <b className="l">{vencidas.length} {vencidas.length > 1 ? 'vencidos' : 'vencido'}</b></>}.
              </>
            ) : (
              'Nada pendente com você.'
            )}
          </p>
        </div>
      </div>

      {!!tudo.length && (
        <div className="tpls" style={{ marginBottom: 16 }}>
          {abas.map((a) => (
            <button key={a.id} className={`tpl ${filtro === a.id ? 'on' : ''}`}
              disabled={!a.itens.length && a.id !== 'tudo'}
              onClick={() => setFiltro(a.id)}>
              {a.nome}
              {!!a.itens.length && <span className="num" style={{ marginLeft: 6, opacity: .65 }}>{a.itens.length}</span>}
            </button>
          ))}
        </div>
      )}

      <div style={{ maxWidth: 780 }}>
        {blocos.map((b) => (
          <div className="blk" key={b.titulo}>
            <div className="bh"><h2>{b.titulo}</h2><span className="c num">{b.itens.length}</span></div>
            <div className="card">
              {b.itens.map((p, i) => {
                const travas = travasDe(p)
                return (
                  <div key={i}>
                    <LinhaPendencia p={p} />
                    {!!travas.length && (
                      <div className="oculto" style={{ borderTop: 0, paddingTop: 0, paddingLeft: 48 }}>
                        <Ic.trava />
                        espera {travas[0]!.texto}
                        {travas[0]!.resp && `, com ${nomeDe(travas[0]!.resp)}`}
                        {travas.length > 1 && ` e mais ${travas.length - 1}`}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {!atual.itens.length && (
          <div className="card">
            <div className="empty">
              <Ic.check />
              {filtro === 'tudo' ? 'Nada pendente com você.' : `Nada em ${atual.nome.toLowerCase()}.`}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
