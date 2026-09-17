'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useDados } from './Dados'
import { useModais } from './Modais'
import { Carregando } from './Shell'
import { Ic } from './Icones'
import { Agenda, FiltroPessoas, Grupos, LinhaRadar, porUrgencia } from './partes'
import { comProblema, envolve, status } from '@/lib/regras'
import type { Fluxo } from '@/lib/tipos'

type Corte = 'situacao' | 'empresa' | 'area'

/**
 * Tudo que tem começo e fim, em um lugar só: as iniciativas em andamento,
 * das que já têm área às que ainda são só um negócio novo.
 */
export function TelaProjetos() {
  const { fluxos, areas, areaDe, empresas, config, empresaAtiva, carregando } = useDados()
  const { abrir } = useModais()
  const [pessoa, setPessoa] = useState<string | null>(null)
  const [corte, setCorte] = useState<Corte>('situacao')

  if (carregando) return <Carregando />

  const todos = fluxos.filter((f) => f.tipo === 'esteira')
  const lista = todos.filter((f) => envolve(f, pessoa))
  const emCurso = lista.filter((f) => !f.concluido).length
  const problemas = comProblema(lista)

  const porArea = [...areas, { id: '', nome: 'Sem área', cor: '#8A909C', ordem: 999 }]
    .map((a) => ({ area: a, itens: lista.filter((f) => (f.area_id || '') === a.id) }))
    .filter((x) => x.itens.length)

  const separaEmpresa = config.multi && !empresaAtiva && empresas.length > 1
  const efetivo: Corte = corte === 'empresa' && !separaEmpresa ? 'situacao' : corte

  /** Blocos de um corte que não é por situação: cada grupo é ordenado por urgência. */
  const blocos: { id: string; nome: string; cor?: string; sigla?: string; itens: Fluxo[] }[] =
    efetivo === 'empresa'
      ? [
          ...empresas.map((e) => ({
            id: e.id, nome: e.nome, cor: e.cor, sigla: e.sigla,
            itens: lista.filter((f) => f.empresa_id === e.id).sort(porUrgencia),
          })),
          { id: 'sem', nome: `Sem ${config.rotulo.toLowerCase()}`, itens: lista.filter((f) => !f.empresa_id).sort(porUrgencia) },
        ].filter((b) => b.itens.length)
      : efetivo === 'area'
        ? porArea.map(({ area, itens }) => ({
            id: area.id || 'sem', nome: area.nome, cor: area.cor, itens: [...itens].sort(porUrgencia),
          }))
        : []

  return (
    <>
      <div className="hdr">
        <div>
          <div className="eyebrow">Iniciativas com início, checkpoints e fim</div>
          <h1>Projetos</h1>
          <p className="lede">
            {todos.length
              ? <>{emCurso} {emCurso === 1 ? 'em andamento' : 'em andamento'}
                  {todos.length - emCurso > 0 && <> e {todos.length - emCurso} {todos.length - emCurso === 1 ? 'concluído' : 'concluídos'}</>}
                  {!!problemas && <>, <b className="l">{problemas} com problema</b></>}.</>
              : 'Nenhum projeto ainda.'}
          </p>
        </div>
        <div className="hdr-actions">
          <FiltroPessoas pessoa={pessoa} aoTrocar={setPessoa} />
          <button className="btn pri" onClick={() => abrir({ tipo: 'fluxo', tipoFluxo: 'esteira' })}>
            <Ic.plus />Novo projeto
          </button>
        </div>
      </div>

      {!todos.length ? (
        <div className="card">
          <div className="onb">
            <h3>Nenhum projeto em andamento</h3>
            <p>
              Projetos são as iniciativas que têm começo e fim: uma implantação, uma obra, um
              negócio novo. Podem pertencer a uma área ou nascer soltos, como um negócio novo.
            </p>
            <button className="btn pri" onClick={() => abrir({ tipo: 'fluxo', tipoFluxo: 'esteira' })}>
              <Ic.plus />Novo projeto
            </button>
          </div>
        </div>
      ) : (
        <div className="grid2">
          <div>
            <div className="bh" style={{ marginBottom: 12 }}>
              <h2>Separar por</h2>
              <div className="seg" style={{ marginLeft: 'auto' }}>
                <button className={efetivo === 'situacao' ? 'on' : ''} onClick={() => setCorte('situacao')}>Situação</button>
                {separaEmpresa && (
                  <button className={efetivo === 'empresa' ? 'on' : ''} onClick={() => setCorte('empresa')}>
                    {config.rotulo}
                  </button>
                )}
                <button className={efetivo === 'area' ? 'on' : ''} onClick={() => setCorte('area')}>Área</button>
              </div>
            </div>

            {efetivo === 'situacao' ? (
              <div className="blk"><Grupos lista={lista} /></div>
            ) : blocos.map((b) => (
              <div className="blk" key={b.id}>
                <div className="bh">
                  {b.sigla
                    ? <span className="emp-tag" style={{ color: b.cor }}>{b.sigla}</span>
                    : b.cor && <span className="sdot" style={{ background: b.cor }} />}
                  <h2>{b.nome}</h2>
                  <span className="c num">{b.itens.length}</span>
                </div>
                <div className="card">{b.itens.map((f) => <LinhaRadar key={f.id} f={f} />)}</div>
              </div>
            ))}
          </div>
          <aside className="rail">
            <div className="blk">
              <div className="bh"><h2>Próximos 7 dias</h2></div>
              <div className="card"><Agenda lista={lista} /></div>
            </div>
            <div className="blk">
              <div className="bh"><h2>Por área</h2></div>
              <div className="card">
                {porArea.map(({ area, itens }) => {
                  const ruins = itens.filter((f) => ['late', 'hold'].includes(status(f))).length
                  const conteudo = (
                    <>
                      <span className="n"><span className="sdot" style={{ background: area.cor }} />{area.nome}</span>
                      <span className="hist">
                        {itens.map((f) => (
                          <i key={f.id} className={status(f) === 'ok' ? '' : status(f) === 'done' ? 'none' : status(f)}
                            title={`${f.nome}`} />
                        ))}
                      </span>
                      <span className="p">
                        {itens.length} {itens.length === 1 ? 'projeto' : 'projetos'}
                        {!!ruins && `, ${ruins} com problema`}
                      </span>
                    </>
                  )
                  return area.id
                    ? <Link className="rt" key={area.id} href={`/area/${area.id}`}>{conteudo}</Link>
                    : <div className="rt" key="sem" style={{ cursor: 'default' }}>{conteudo}</div>
                })}
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  )
}
