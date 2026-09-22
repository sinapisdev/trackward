'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useDados } from './Dados'
import { useModais } from './Modais'
import { Carregando } from './Shell'
import { Ic } from './Icones'
import { Av, IconeStatus } from './atomos'
import { TrilhaH } from './Trilha'
import { porUrgencia } from './partes'
import { rel } from '@/lib/datas'
import { envolve, etapaAtual, LBL, progresso, proxPrazo, status } from '@/lib/regras'

/**
 * Rotinas: a operação que continua.
 *
 * As áreas ficam numa coluna à esquerda e a área escolhida ocupa o resto: é a
 * mesma tela, com ou sem endereço próprio. **Só rotina aparece aqui**: projeto
 * dessa área mora na tela Projetos, mesmo pertencendo a ela.
 */
export function TelaRotinas({ id }: { id?: string }) {
  const { eu, fluxos, areas, processos, perfis, perfilDe, nomeDe, carregando, excluirArea } = useDados()
  const { abrir } = useModais()
  const [termo, setTermo] = useState('')
  const [pessoa, setPessoa] = useState('')

  if (carregando) return <Carregando />

  const limpa = (x: string) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const naLista = areas.filter((a) => !termo.trim() || limpa(a.nome).includes(limpa(termo)))
  const a = areas.find((x) => x.id === id) || naLista[0] || areas[0] || null

  const rotinasDe = (areaId: string) => fluxos.filter((f) => f.area_id === areaId && f.tipo === 'ciclo')
  const rotinas = a
    ? rotinasDe(a.id).filter((f) => envolve(f, pessoa || null)).sort(porUrgencia)
    : []
  const tarde = rotinas.filter((f) => status(f) === 'late').length
  const daqui = a ? processos.filter((p) => p.area_id === a.id) : []
  const vazia = !!a && !fluxos.some((f) => f.area_id === a.id)

  if (!areas.length)
    return (
      <>
        <div className="hdr">
          <div>
            <h1>Rotinas</h1>
            <p className="lede">A operação que continua.</p>
          </div>
        </div>
        <div className="card">
          <div className="onb">
            <h3>Comece criando uma área</h3>
            <p>
              Áreas são as frentes que já funcionam na empresa: Financeiro, Comercial, Operações,
              Pessoas. Cada uma guarda as rotinas que se repetem a cada período.
            </p>
            {eu.papel === 'admin'
              ? <button className="btn pri" onClick={() => abrir({ tipo: 'area' })}><Ic.plus />Nova área</button>
              : <p className="hint">Peça a um administrador para criar as áreas da empresa.</p>}
          </div>
        </div>
      </>
    )

  return (
    <>
      <div className="hdr">
        <div>
          <h1>Rotinas</h1>
          <p className="lede">A operação que continua.</p>
        </div>
        {eu.papel === 'admin' && (
          <div className="hdr-actions">
            <button className="btn" onClick={() => abrir({ tipo: 'area' })}><Ic.plus />Nova área</button>
          </div>
        )}
      </div>

      <div className="rot">
        <aside className="rot-areas">
          <label className="campo-busca">
            <Ic.lupa />
            <input value={termo} onChange={(e) => setTermo(e.target.value)}
              placeholder="Buscar área" aria-label="Buscar área" />
          </label>

          <nav aria-label="Áreas">
            {naLista.map((x) => (
              <Link key={x.id} href={`/area/${x.id}`} className={`rot-area ${a?.id === x.id ? 'on' : ''}`}>
                <span className="sdot" style={{ background: x.cor }} />
                <span className="nm">{x.nome}</span>
                <span className="ct num">{rotinasDe(x.id).length}</span>
              </Link>
            ))}
            {!naLista.length && <p className="hint">Nenhuma área com esse nome.</p>}
          </nav>

          {a && eu.papel === 'admin' && (
            <div className="rot-area-acoes">
              <button onClick={() => abrir({ tipo: 'area', area: a })}><Ic.edit />Editar área</button>
              {vazia && (
                <button className="iconbtn" aria-label="Excluir área" title="Excluir área"
                  onClick={() => abrir({
                    tipo: 'excluir',
                    titulo: `Excluir ${a.nome}?`,
                    texto: 'A área será removida para todos.',
                    acao: () => excluirArea(a.id),
                  })}><Ic.mais /></button>
              )}
            </div>
          )}
        </aside>

        <div className="rot-main">
          {a && (
            <>
              <div className="rot-cab">
                <div>
                  <h2>{a.nome}</h2>
                  <p>
                    {rotinas.length} {rotinas.length === 1 ? 'rotina' : 'rotinas'}
                    {!!tarde && <> · <b className="l">{tarde} {tarde === 1 ? 'atrasada' : 'atrasadas'}</b></>}
                  </p>
                </div>
                <div className="rot-cab-acoes">
                  {perfis.filter((p) => p.ativo).length > 1 && (
                    <label className="sel-quem">
                      <select value={pessoa} onChange={(e) => setPessoa(e.target.value)}
                        aria-label="Filtrar por pessoa">
                        <option value="">Por pessoa</option>
                        {perfis.filter((p) => p.ativo).map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                      </select>
                      <Ic.chev />
                    </label>
                  )}
                  <button className="btn" onClick={() => abrir({ tipo: 'fluxo', tipoFluxo: 'ciclo', areaId: a.id })}>
                    <Ic.plus />Nova rotina
                  </button>
                </div>
              </div>

              {rotinas.length ? rotinas.map((f, k) => {
                const st = status(f)
                const et = etapaAtual(f)
                const feitos = et ? et.itens.filter((x) => x.feito).length : 0
                const pp = proxPrazo(f)
                return (
                  <article className="rot-linha" key={f.id}>
                    <span className="rot-ic"><Ic.ciclo /></span>
                    <div className="rot-quem">
                      <Link className="rot-nome" href={`/fluxo/${f.id}`}>{f.nome}</Link>
                      <p className="rot-sit">
                        <span className={`rot-st ${st}`}><IconeStatus st={st} p={progresso(f)} />{LBL[st]}</span>
                        <span className="sep">|</span>
                        <span>{f.tipo === 'ciclo' ? `Volta ${f.periodo}` : 'Projeto'}</span>
                        {pp && <><span className="sep">·</span><span>{rel(pp)}</span></>}
                      </p>
                      <p className="rot-dono"><Av p={perfilDe(f.dono_id)} tam="sm" />{nomeDe(f.dono_id)}</p>
                    </div>
                    <div className="rot-trilha">
                      <TrilhaH f={f} miuda />
                      <small>
                        {et ? `${feitos} de ${et.itens.length} ${et.itens.length === 1 ? 'tarefa pronta' : 'tarefas prontas'}` : ''}
                      </small>
                    </div>
                    {/* O lima vai para a rotina que está na frente da fila: é a
                        única ação desta tela que faz o trabalho andar. */}
                    {k === 0
                      ? <Link className="btn pri" href={`/fluxo/${f.id}`}>Abrir rotina<Ic.seta /></Link>
                      : <Link className="rot-chev" href={`/fluxo/${f.id}`} aria-label={`Abrir ${f.nome}`}><Ic.seta /></Link>}
                  </article>
                )
              }) : (
                <div className="tb-vazio">
                  Esta área ainda não tem nada que se repita.{' '}
                  <button className="link" onClick={() => abrir({ tipo: 'fluxo', tipoFluxo: 'ciclo', areaId: a.id })}>
                    Criar a primeira rotina
                  </button>
                </div>
              )}

              {!!daqui.length && (
                <section className="rot-proc">
                  <h3>Processos disponíveis para {a.nome}</h3>
                  <p>Use um processo para criar uma nova rotina nesta área.</p>
                  {daqui.map((p) => (
                    <div className="rot-proc-linha" key={p.id}>
                      <span className="rot-ic"><Ic.processo /></span>
                      <Link className="nm" href={`/processos/${p.id}`}>{p.nome}</Link>
                      <span className="ct">
                        {p.etapas.length} {p.etapas.length === 1 ? 'checkpoint' : 'checkpoints'}
                      </span>
                      <button className="btn" onClick={() => abrir({
                        tipo: 'fluxo', tipoFluxo: p.tipo, areaId: a.id, processoId: p.id,
                      })}>Usar</button>
                    </div>
                  ))}
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
