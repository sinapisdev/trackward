'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useDados } from './Dados'
import { useModais } from './Modais'
import { Carregando } from './Shell'
import { Ic } from './Icones'
import { Agenda, FiltroPessoas, LinhaRadar, SaudeRotinas, porUrgencia } from './partes'
import { comProblema, envolve } from '@/lib/regras'
import type { Empresa, Fluxo } from '@/lib/tipos'

/**
 * Uma frente que já funciona, e só o que se repete dentro dela.
 * Projetos moram na tela Projetos, mesmo quando pertencem a esta área.
 */
export function TelaArea({ id }: { id: string }) {
  const { eu, fluxos, areas, empresas, org, empresaAtiva, processos, carregando, excluirArea } = useDados()
  const { abrir } = useModais()
  const [pessoa, setPessoa] = useState<string | null>(null)

  if (carregando) return <Carregando />

  const a = areas.find((x) => x.id === id)
  if (!a) {
    return (
      <div className="hdr">
        <div>
          <div className="eyebrow">Área</div>
          <h1>Área não encontrada</h1>
          <p className="lede">Ela pode ter sido excluída por outra pessoa.</p>
        </div>
      </div>
    )
  }

  const rotinas = fluxos
    .filter((f) => f.area_id === a.id && f.tipo === 'ciclo')
    .filter((f) => envolve(f, pessoa))
    .sort(porUrgencia)
  const problemas = comProblema(rotinas)
  const vazia = !fluxos.some((f) => f.area_id === a.id)

  /** Com vários negócios em foco, cada um ganha o próprio bloco de rotinas. */
  const separar = org.multi && !empresaAtiva && empresas.length > 1
  const blocos: { empresa: Empresa | null; itens: Fluxo[] }[] = separar
    ? [
        ...empresas.map((e) => ({ empresa: e, itens: rotinas.filter((f) => f.empresa_id === e.id) })),
        { empresa: null, itens: rotinas.filter((f) => !f.empresa_id) },
      ].filter((b) => b.itens.length)
    : [{ empresa: null, itens: rotinas }]

  const novaRotina = (empresaId?: string) =>
    abrir({ tipo: 'fluxo', tipoFluxo: 'ciclo', areaId: a.id, empresaId })

  /** Trilhos desenhados para esta área, prontos para dar origem a esteiras. */
  const daqui = processos.filter((p) => p.area_id === a.id)

  return (
    <>
      <div className="hdr">
        <div>
          <div className="eyebrow"><span className="sdot" style={{ background: a.cor }} />Área</div>
          <h1>{a.nome}</h1>
          <p className="lede">
            {rotinas.length
              ? <>{rotinas.length} {rotinas.length === 1 ? 'rotina em ciclo' : 'rotinas em ciclo'}
                  {separar && blocos.length > 1 && ` em ${blocos.length} ${org.rotulo_plural.toLowerCase()}`}
                  {!!problemas && <>, <b className="l">{problemas} com problema</b></>}.</>
              : 'Nenhuma rotina configurada ainda.'}
          </p>
        </div>
        <div className="hdr-actions">
          <FiltroPessoas pessoa={pessoa} aoTrocar={setPessoa} />
          {vazia && eu.papel === 'admin' && (
            <button className="btn ghost" onClick={() => abrir({
              tipo: 'excluir',
              titulo: `Excluir ${a.nome}?`,
              texto: 'A área será removida para todos.',
              acao: () => excluirArea(a.id),
            })}>Excluir área</button>
          )}
          {eu.papel === 'admin' && (
            <button className="btn" onClick={() => abrir({ tipo: 'area', area: a })}><Ic.edit />Editar</button>
          )}
          <button className="btn pri" onClick={() => novaRotina()}><Ic.plus />Nova rotina</button>
        </div>
      </div>

      <div className="grid2">
        <div>
          {rotinas.length ? blocos.map((b) => (
            <div className="blk" key={b.empresa?.id || 'sem'}>
              <div className="bh">
                {b.empresa ? (
                  <>
                    <span className="emp-tag" style={{ color: b.empresa.cor }}>{b.empresa.sigla}</span>
                    <h2>{b.empresa.nome}</h2>
                  </>
                ) : separar ? (
                  <h2>Sem {org.rotulo.toLowerCase()}</h2>
                ) : (
                  <>
                    <Ic.ciclo />
                    <h2>Rotinas</h2>
                    <span className="c">se repetem a cada período</span>
                  </>
                )}
                <span className="c num">{b.itens.length}</span>
                {b.empresa && (
                  <button className="r" onClick={() => novaRotina(b.empresa!.id)}>+ Nova rotina</button>
                )}
              </div>
              <div className="card">{b.itens.map((f) => <LinhaRadar key={f.id} f={f} />)}</div>
            </div>
          )) : (
            <div className="blk">
              <div className="bh">
                <Ic.ciclo /><h2>Rotinas</h2><span className="c">se repetem a cada período</span>
              </div>
              <div className="card">
                <div className="empty">
                  Esta área ainda não tem nada que se repita.
                  <button className="btn ghost" onClick={() => novaRotina()}><Ic.plus />Nova rotina</button>
                </div>
              </div>
            </div>
          )}
        </div>

        <aside className="rail">
          {!!daqui.length && (
            <div className="blk">
              <div className="bh">
                <Ic.processo />
                <h2>Processos desta área</h2>
                <Link className="r" href="/processos">Ver todos</Link>
              </div>
              <div className="card">
                {daqui.map((p) => {
                  const tarefas = p.etapas.reduce((n, e) => n + e.itens.length, 0)
                  return (
                    <div className="pl" key={p.id} style={{ gridTemplateColumns: 'minmax(0,1fr) auto' }}>
                      <span style={{ minWidth: 0 }}>
                        <Link className="n" href={`/processos/${p.id}`}>{p.nome}</Link>
                        <span className="e">
                          {p.etapas.length} {p.etapas.length === 1 ? 'checkpoint' : 'checkpoints'}
                          {!!tarefas && `, ${tarefas} ${tarefas === 1 ? 'tarefa' : 'tarefas'}`}
                          {p.tipo === 'ciclo' ? ', rotina' : ', projeto'}
                        </span>
                      </span>
                      <button className="btn" onClick={() => abrir({
                        tipo: 'fluxo', tipoFluxo: p.tipo, areaId: a.id, processoId: p.id,
                      })}>Usar</button>
                    </div>
                  )
                })}
              </div>
              <p className="hint" style={{ marginTop: 9 }}>
                Usar um processo faz a esteira nascer com os checkpoints e as tarefas já distribuídos.
              </p>
            </div>
          )}

          <div className="blk">
            <div className="bh"><h2>Próximos 7 dias</h2></div>
            <div className="card"><Agenda lista={rotinas} /></div>
          </div>
          <div className="blk">
            <div className="bh"><h2>Saúde das rotinas</h2></div>
            <div className="card"><SaudeRotinas lista={rotinas} /></div>
          </div>
        </aside>
      </div>
    </>
  )
}
