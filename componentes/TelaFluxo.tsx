'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useDados } from './Dados'
import { useModais } from './Modais'
import { Carregando } from './Shell'
import { Ic } from './Icones'
import { Av, IconeStatus } from './atomos'
import { classePrazo } from './partes'
import { Anexos } from './Anexos'
import { Decisao } from './Decisao'
import { Trilha } from './Trilha'
import { curta, isoDe, rel } from '@/lib/datas'
import { LBL, progresso, proxPrazo, status } from '@/lib/regras'
import { mandaNoProcesso, podeConcluir, podeMexerNoItem } from '@/lib/acesso'
import { useMemo } from 'react'

export function TelaFluxo({ id }: { id: string }) {
  const { eu, perfis, fluxos, carregando, areaDe, perfilDe, nomeDe, totalItens,
    alternarItem, excluirItem, excluirFluxo, destravar, decisoesDe } = useDados()
  const { abrir } = useModais()
  const router = useRouter()
  const [sel, setSel] = useState<number | null>(null)
  const [decidindo, setDecidindo] = useState(false)

  /** Índice de todas as tarefas que enxergo, para resolver quem trava quem. */
  const porId = useMemo(() => {
    const m = new Map<string, { item: typeof fluxos[0]['etapas'][0]['itens'][0]; fluxo: typeof fluxos[0] }>()
    for (const f of fluxos) for (const e of f.etapas) for (const i of e.itens) m.set(i.id, { item: i, fluxo: f })
    return m
  }, [fluxos])

  if (carregando) return <Carregando />

  const f = fluxos.find((x) => x.id === id)
  if (!f)
    return (
      <div className="hdr">
        <div>
          <div className="eyebrow">Esteira</div>
          <h1>Não encontrado</h1>
          <p className="lede">Ela pode ter sido excluída, ou ser uma esteira privada de outra pessoa.</p>
        </div>
      </div>
    )

  const st = status(f)
  const s = areaDe(f.area_id)
  const idx = Math.max(0, Math.min(sel ?? f.atual, f.etapas.length - 1))
  const etapa = f.etapas[idx]
  if (!etapa)
    return (
      <div className="hdr">
        <div><h1>{f.nome}</h1><p className="lede">Esta esteira está sem checkpoints. Use Editar esteira para montá-los.</p></div>
      </div>
    )

  const naAtual = idx === f.atual && !f.concluido
  const passado = f.concluido || idx < f.atual
  const feitos = etapa.itens.filter((x) => x.feito).length
  const completo = feitos === etapa.itens.length
  const ultimo = idx === f.etapas.length - 1
  const podeAprovar = etapa.aprovador_id === eu.id
  const travado = !!f.travado_motivo
  const mandaAqui = mandaNoProcesso(eu, f, perfis)
  const ocultos = Math.max(0, totalItens(f.id) - f.etapas.reduce((n, et) => n + et.itens.length, 0))

  const rotuloAcao = 'Decidir a saída'

  let nota
  if (passado) nota = <><span style={{ color: 'var(--ok)' }}><Ic.check /></span>Aprovado</>
  else if (!naAtual) nota = <><Ic.espera />Libera quando a esteira chegar aqui. Já dá para adicionar tarefas.</>
  else if (travado) nota = <><Ic.pause />Destrave para seguir</>
  else if (completo && ocultos) nota = <><Ic.check />Suas tarefas saíram. Ainda há {ocultos === 1 ? 'uma tarefa' : `${ocultos} tarefas`} com outras pessoas.</>
  else if (completo) nota = <><Ic.flag />{etapa.itens.length ? 'Checklist completo, ' : ''}aguardando {nomeDe(etapa.aprovador_id)}</>
  else if (ocultos) nota = <>Faltam {etapa.itens.length - feitos} {etapa.itens.length - feitos > 1 ? 'tarefas suas' : 'tarefa sua'}</>
  else nota = <>Faltam {etapa.itens.length - feitos} {etapa.itens.length - feitos > 1 ? 'tarefas' : 'tarefa'} para liberar a aprovação</>

  const pct = Math.round(progresso(f) * 100)
  const pp = proxPrazo(f)
  const ultimoPrazo = [...f.etapas].reverse().find((e) => e.prazo)

  return (
    <>
      <div className="hdr" style={{ marginBottom: 18 }}>
        <div>
          <div className="eyebrow">
            <Link href={`/area/${s.id}`}>{s.nome}</Link> / {f.tipo === 'ciclo' ? 'Rotinas' : 'Projetos'}
          </div>
          <h1>{f.nome}</h1>
          <div className="meta-row">
            <span className={`badge ${st}`}><IconeStatus st={st} p={progresso(f)} />{LBL[st]}</span>
            <span className="type">
              {f.tipo === 'ciclo' ? <><Ic.ciclo />Rotina {f.freq} · {f.periodo}</> : <><Ic.proj />Projeto</>}
            </span>
            <span><Av p={perfilDe(f.dono_id)} tam="sm" />{nomeDe(f.dono_id)}</span>
            <span className="badge priv">
              {f.visib === 'so_eu'
                ? <><Ic.lock />Privado: só você vê</>
                : f.visib === 'escolhidas'
                  ? <><Ic.lock />{f.pessoas.length + 1} {f.pessoas.length ? 'pessoas' : 'pessoa'} com acesso</>
                  : <><Ic.team />Visível para a equipe</>}
            </span>
          </div>
        </div>
        <div className="hdr-actions">
          {mandaAqui && (
            <button className="btn" onClick={() => abrir({ tipo: 'fluxo', fluxo: f })}><Ic.edit />Editar esteira</button>
          )}
          {mandaAqui && !f.concluido && (travado
            ? <button className="btn" onClick={() => void destravar(f)}><Ic.pause />Destravar</button>
            : <button className="btn" onClick={() => abrir({ tipo: 'travar', fluxo: f })}><Ic.pause />Travar</button>)}
          {mandaAqui && <button className="btn ghost" aria-label="Excluir" onClick={() => abrir({
            tipo: 'excluir',
            titulo: `Excluir ${f.nome}?`,
            texto: 'A esteira, seus checkpoints, itens e histórico serão removidos para todos. Não dá para desfazer.',
            acao: async () => { await excluirFluxo(f.id); router.push(f.tipo === 'ciclo' && f.area_id ? `/area/${f.area_id}` : '/tracks') },
          })}>
            <Ic.x />
          </button>}
        </div>
      </div>

      {travado && (
        <div className="alert">
          <Ic.pause />
          <span>
            <b>Travado {f.travado_desde ? rel(f.travado_desde).toLowerCase() : ''}.</b> {f.travado_motivo}
          </span>
        </div>
      )}

      <Trilha f={f} sel={idx} aoEscolher={setSel} decisoes={decisoesDe(f.id)} />

      {f.tipo === 'ciclo' && (
        <div className="loopnote">
          <Ic.ciclo />
          Ao aprovar {f.etapas[f.etapas.length - 1].nome}, a rotina reinicia em {f.etapas[0].nome} no próximo período.
        </div>
      )}

      <div className="grid2">
        <div>
          <div className="card">
            <div className="cp-h">
              <div>
                <div className="k">Checkpoint {idx + 1} de {f.etapas.length}</div>
                <h3>{etapa.nome}</h3>
              </div>
              <div className="ring num">
                <IconeStatus st={passado ? 'done' : 'ok'} p={etapa.itens.length ? feitos / etapa.itens.length : 0} />
                {feitos} de {etapa.itens.length} {etapa.itens.length === 1 ? 'item' : 'itens'}
              </div>
            </div>

            <div className="exit">
              <Ic.flag />
              <div>
                <span>
                  Critério de saída · aprovação de {nomeDe(etapa.aprovador_id)}
                  {etapa.prazo ? ` · até ${curta(etapa.prazo)}` : ''}
                </span>
                {etapa.criterio || (
                  <span style={{ display: 'inline', fontSize: 13 }}>
                    Não definido. Use &quot;Editar esteira&quot; para descrever.
                  </span>
                )}
              </div>
            </div>

            {etapa.itens.map((x) => {
              const abertas = x.depende_de
                .map((id) => porId.get(id))
                .filter((t) => t && !t.item.feito)
              const bloqueada = abertas.length > 0
              const meu = podeMexerNoItem(eu, f, x, perfis)
              return (
                <div className="it-bloco" key={x.id}>
                <div className={`it ${x.feito ? 'f' : ''}`}>
                  <button className={`ck ${x.feito ? 'on' : ''}`}
                    disabled={!naAtual || travado || bloqueada || !podeConcluir(eu, f, x, perfis)}
                    onClick={() => void alternarItem(x)}
                    title={bloqueada ? 'Espera outra tarefa sair antes' : ''}
                    aria-label={`${x.feito ? 'Reabrir' : 'Concluir'} ${x.texto}`}>
                    <Ic.check />
                  </button>
                  <span className="tt">
                    {x.priv && (
                      <span className="lk" title="Tarefa privada: só você vê"><Ic.lock /></span>
                    )}
                    <span>{x.texto}</span>
                    {bloqueada && (
                      <span className="bloq" title={abertas.map((t) => t!.item.texto).join(', ')}>
                        <Ic.trava />
                        espera {abertas[0]!.item.texto}
                        {abertas.length > 1 && ` e mais ${abertas.length - 1}`}
                        {abertas[0]!.item.resp_id && `, com ${nomeDe(abertas[0]!.item.resp_id)}`}
                      </span>
                    )}
                  </span>
                  <span className={`due num ${x.feito ? '' : classePrazo(x.prazo)}`}>
                    {x.feito ? 'Feito' : x.prazo ? rel(x.prazo) : 'Sem prazo'}
                  </span>
                  <Av p={perfilDe(x.resp_id)} tam="sm" />
                  <span className="acoes">
                    {meu && (
                      <>
                        <button className="iconbtn del" title="Editar tarefa" aria-label={`Editar ${x.texto}`}
                          onClick={() => abrir({ tipo: 'item', etapa, item: x })}><Ic.edit /></button>
                        <button className="iconbtn del" title="Remover" aria-label={`Remover ${x.texto}`}
                          onClick={() => void excluirItem(x)}><Ic.x /></button>
                      </>
                    )}
                  </span>
                </div>
                <Anexos item={x} podeAnexar={!passado && !travado && podeConcluir(eu, f, x, perfis)} />
                </div>
              )
            })}

            {!!ocultos && (
              <div className="oculto">
                <Ic.oculto />
                {ocultos === 1
                  ? 'Mais 1 tarefa nesta esteira é de outra pessoa e não aparece para você.'
                  : `Mais ${ocultos} tarefas nesta esteira são de outras pessoas e não aparecem para você.`}
              </div>
            )}

            {!passado && (
              <button className="additem" onClick={() => abrir({ tipo: 'item', etapa })}>
                <Ic.plus />Adicionar tarefa
              </button>
            )}

            <div className="cp-f">
              <span className="note">{nota}</span>
              {naAtual && (
                <button className="btn pri" onClick={() => setDecidindo(true)}
                  disabled={travado || !podeAprovar}
                  title={podeAprovar ? '' : `Somente ${nomeDe(etapa.aprovador_id)} decide este checkpoint`}>
                  {rotuloAcao}
                </button>
              )}
            </div>
          </div>
        </div>

        <aside className="rail">
          <div className="blk">
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span className="big num">{pct}%</span>
                <span className="due">{f.tipo === 'ciclo' ? 'da volta atual' : 'do projeto'}</span>
              </div>
              <div className="pbar"><b style={{ width: `${pct}%` }} /></div>
              <dl className="kv" style={{ marginTop: 14 }}>
                <dt>Etapa atual</dt>
                <dd>{f.concluido ? 'Concluído' : f.etapas[f.atual]?.nome}</dd>
                <dt>Próximo prazo</dt>
                <dd className="num">{pp ? rel(pp) : 'Sem prazo'}</dd>
                <dt>Término previsto</dt>
                <dd className="num">{ultimoPrazo ? curta(ultimoPrazo.prazo!) : 'Sem prazo'}</dd>
                <dt>Dono</dt>
                <dd><Av p={perfilDe(f.dono_id)} tam="sm" />{nomeDe(f.dono_id)}</dd>
              </dl>
            </div>
          </div>

          {f.tipo === 'ciclo' && !!f.voltas.length && (
            <div className="blk">
              <div className="bh"><h2>Voltas anteriores</h2></div>
              <div className="card">
                {[...f.voltas].reverse().map((v) => (
                  <div className="kv" style={{ padding: '4px 0' }} key={v.id}>
                    <dt>{v.periodo}</dt>
                    <dd><span className={`badge ${v.situacao}`}>{LBL[v.situacao]}</span></dd>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="blk">
            <div className="bh"><h2>Atividade</h2></div>
            <div className="card">
              {f.log.length ? f.log.slice(0, 8).map((a) => (
                <div className="act" key={a.id}>
                  <Av p={perfilDe(a.quem_id)} tam="sm" />
                  <span>
                    <b>{nomeDe(a.quem_id)}</b> {a.texto}
                    <small>{rel(isoDe(a.criado_em))}</small>
                  </span>
                </div>
              )) : <div className="empty" style={{ padding: 0 }}>Sem atividade ainda.</div>}
            </div>
          </div>
        </aside>
      </div>

      {decidindo && naAtual && (
        <Decisao f={f} etapa={etapa} fechar={() => { setDecidindo(false); setSel(null) }} />
      )}
    </>
  )
}
