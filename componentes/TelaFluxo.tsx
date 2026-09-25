'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { useDados } from './Dados'
import { useModais } from './Modais'
import { Carregando } from './Shell'
import { Ic } from './Icones'
import { Av, IconeStatus } from './atomos'
import { classePrazo } from './partes'
import { Anexos } from './Anexos'
import { Decisao } from './Decisao'
import { Trilha, TrilhaH } from './Trilha'
import { useCelular } from './partes'
import { QuemFaz } from './QuemFaz'
import { ConversaTrack, AtividadeTrack } from './ConversaTrack'
import { curta, rel } from '@/lib/datas'
import { LBL, progresso, status } from '@/lib/regras'
import { mandaNoProcesso, podeConcluir, podeMexerNoItem } from '@/lib/acesso'

/**
 * A track aberta.
 *
 * Em cima, a trilha deitada, que diz onde ela está antes de qualquer outra
 * coisa. Embaixo, o checkpoint da vez com as tarefas dele; ao lado, a conversa
 * e a atividade. Com muitos checkpoints a trilha deitada não cabe, e aí quem
 * aparece é a de coluna: a pergunta que ela responde é "onde estamos", e
 * responder isso não pode depender de arrastar.
 */
export function TelaFluxo({ id }: { id: string }) {
  const { eu, perfis, fluxos, carregando, areaDe, perfilDe, nomeDe, totalItens,
    alternarItem, excluirItem, excluirFluxo, destravar, decisoesDe, pode } = useDados()
  const { abrir } = useModais()
  const router = useRouter()
  const [sel, setSel] = useState<number | null>(null)
  const [decidindo, setDecidindo] = useState(false)
  const [aba, setAba] = useState<'trilha' | 'conversa' | 'atividade'>('trilha')
  // Antes de qualquer saída antecipada: gancho dentro de ramo condicional muda
  // a ordem entre uma pintura e outra, e o React derruba a tela inteira.
  const celular = useCelular()

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
          <div className="eyebrow">Track</div>
          <h1>Não encontrada</h1>
          <p className="lede">Ela pode ter sido excluída, ou ser uma track privada de outra pessoa.</p>
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
        <div>
          <h1>{f.nome}</h1>
          <p className="lede">Esta track está sem checkpoints. Use Ajustes para montá-los.</p>
        </div>
      </div>
    )

  const naAtual = idx === f.atual && !f.concluido
  const passado = f.concluido || idx < f.atual
  const feitos = etapa.itens.filter((x) => x.feito).length
  const faltam = etapa.itens.length - feitos
  const completo = faltam === 0
  // Sozinho não há aceite: o checkpoint fecha quando as tarefas dele acabam, e
  // quem fecha é você. Aprovar a própria saída é assinar autorização para si
  // mesmo, e o app pedia isso a cada checkpoint.
  const podeAprovar = !pode.aprovacao || etapa.aprovador_id === eu.id
  const travado = !!f.travado_motivo
  const mandaAqui = mandaNoProcesso(eu, f, perfis)
  const ocultos = Math.max(0, totalItens(f.id) - f.etapas.reduce((n, et) => n + et.itens.length, 0))
  const pct = Math.round(progresso(f) * 100)
  /** Deitada só cabe até cinco. Passando disso, a trilha volta para a coluna. */
  /**
   * A trilha é deitada, e ponto. O que varia é se o nome cabe nela.
   *
   * A regra antiga mandava para a coluna acima de cinco checkpoints, e ela
   * valia quando "deitada" queria dizer com o nome de cada um embaixo: aí sete
   * não cabem e a trilha rolaria de lado, que é o defeito que a trilha existe
   * para evitar.
   *
   * Com `soMarcas` o nome sai da trilha e vai para o cabeçalho do checkpoint,
   * logo abaixo: sete bolinhas cabem com folga até em 393px. A coluna só volta
   * quando nem as bolinhas cabem, e aí ela é mesmo a única saída.
   */
  const cabemOsNomes = f.etapas.length <= (celular ? 4 : 8)
  const cabemAsMarcas = f.etapas.length <= (celular ? 20 : 40)
  const deitada = cabemOsNomes || cabemAsMarcas

  let nota
  if (passado) nota = 'Checkpoint aprovado.'
  else if (!naAtual) nota = 'Libera quando a track chegar aqui. Já dá para adicionar tarefas.'
  else if (travado) nota = 'Destrave a track para seguir.'
  else if (completo && ocultos) nota = `Suas tarefas saíram. Ainda há ${ocultos === 1 ? 'uma tarefa' : `${ocultos} tarefas`} com outras pessoas.`
  else if (completo) {
    nota = pode.aprovacao
      ? `Tudo pronto, aguardando ${nomeDe(etapa.aprovador_id)}.`
      : 'Tudo pronto. Dá para fechar este checkpoint.'
  }
  else nota = `Conclua ${faltam === 1 ? 'a tarefa restante' : `as ${faltam} tarefas restantes`} para ${pode.aprovacao ? 'aprovar' : 'fechar'}.`

  return (
    <>
      <nav className="crumb" aria-label="Você está em">
        <Link href={'/tracks'}>
          Tracks
        </Link>
        {f.tipo === 'ciclo' && f.area_id && <><span className="div">/</span><Link href={`/area/${s.id}`}>{s.nome}</Link></>}
        <span className="div">/</span><b>{f.nome}</b>
      </nav>

      <div className="hdr track-hdr">
        <div>
          <h1>{f.nome}</h1>
          <div className="meta-row">
            {pode.delegar && (
              <span><Av p={perfilDe(f.dono_id)} tam="sm" />Responsável: {nomeDe(f.dono_id)}</span>
            )}
            <span className="sep">·</span>
            <span className={`track-st ${st}`}><IconeStatus st={st} p={progresso(f)} />{LBL[st]}</span>
            {f.visib !== 'equipe' && (
              <span className="track-priv"><Ic.lock />
                {f.visib === 'so_eu' ? 'Só você vê' : `${f.pessoas.length + 1} com acesso`}
              </span>
            )}
          </div>
        </div>
        <div className="hdr-actions">
          <div className="track-pct">
            <b className="num">{pct}%</b> de progresso
            <span className="pbar"><i style={{ width: `${pct}%` }} /></span>
          </div>
          {mandaAqui && (
            <button className="btn" onClick={() => abrir({ tipo: 'fluxo', fluxo: f })}><Ic.ajustes />Ajustes</button>
          )}
          {mandaAqui && !f.concluido && (travado
            ? <button className="btn" onClick={() => void destravar(f)}><Ic.pause />Destravar</button>
            : <button className="btn" onClick={() => abrir({ tipo: 'travar', fluxo: f })}><Ic.lock />Travar</button>)}
          {mandaAqui && (
            <button className="btn ghost" aria-label="Excluir track" title="Excluir track" onClick={() => abrir({
              tipo: 'excluir',
              titulo: `Excluir ${f.nome}?`,
              texto: 'A track, seus checkpoints, tarefas e histórico serão removidos para todos. Não dá para desfazer.',
              acao: async () => { await excluirFluxo(f.id); router.push('/tracks') },
            })}><Ic.mais /></button>
          )}
        </div>
      </div>

      <div className="abas track-abas" role="tablist">
        {(pode.canais
          ? (['trilha', 'conversa', 'atividade'] as const)
          : (['trilha', 'atividade'] as const)
        ).map((k) => (
          <button key={k} role="tab" aria-selected={aba === k} className={aba === k ? 'on' : ''}
            onClick={() => setAba(k)}>
            {k === 'trilha' ? 'Track' : k === 'conversa' ? 'Conversa' : 'Atividade'}
          </button>
        ))}
      </div>

      {travado && (
        <div className="alert">
          <Ic.pause />
          <span>
            <b>Travado {f.travado_desde ? rel(f.travado_desde).toLowerCase() : ''}.</b> {f.travado_motivo}
          </span>
        </div>
      )}

      <div className="track">
        <div className="track-corpo">
          {aba === 'conversa' ? (
            <ConversaTrack f={f} />
          ) : aba === 'atividade' ? (
            <>
              <h2 className="track-rot">Atividade da track</h2>
              <AtividadeTrack f={f} quantas={30} />
            </>
          ) : (
            <>
              {/* Sem rótulo: a aba escolhida já diz o que é isto, e repetir o
                  nome dela como título gasta a linha mais cara da tela, que é a
                  primeira. */}
              {deitada
                ? <TrilhaH f={f} sel={idx} aoEscolher={setSel} numerada={cabemOsNomes}
                    soMarcas={!cabemOsNomes} decisoes={decisoesDe(f.id)} />
                : <Trilha f={f} sel={idx} aoEscolher={setSel} decisoes={decisoesDe(f.id)} />}

              {f.tipo === 'ciclo' && (
                <p className="loopnote">
                  <Ic.ciclo />
                  Ao aprovar {f.etapas[f.etapas.length - 1].nome}, a rotina reinicia em {f.etapas[0].nome} no próximo período.
                </p>
              )}

              <div className="cp">
                <div className="cp-h">
                  <div>
                    <div className="eyebrow">Checkpoint {idx + 1} de {f.etapas.length}</div>
                    <h2>{etapa.nome}</h2>
                  </div>
                  {pode.aprovacao && (
                    <div className="cp-aprov">
                      Aprovação: {nomeDe(etapa.aprovador_id)}
                      <Av p={perfilDe(etapa.aprovador_id)} tam="sm" />
                    </div>
                  )}
                </div>

                <div className="cp-crit">
                  <span className="rot">Só passa quando</span>
                  <span>
                    {etapa.criterio || 'Critério não definido. Use Ajustes para descrever.'}
                    {etapa.prazo && <i> · até {curta(etapa.prazo)}</i>}
                  </span>
                </div>

                <div className="cp-tarefas">
                  <h3>Tarefas <span className="c">{feitos} de {etapa.itens.length} prontas</span></h3>
                  {!passado && (
                    <button className="btn" onClick={() => abrir({ tipo: 'item', etapa })}><Ic.plus />Tarefa</button>
                  )}
                </div>

                <div className="tf-cab">
                  <span /><span>Tarefa</span><span>Responsável</span><span>Prazo</span><span />
                </div>

                {etapa.itens.map((x) => {
                  const abertas = x.depende_de.map((i) => porId.get(i)).filter((t) => t && !t.item.feito)
                  const bloqueada = abertas.length > 0
                  const meu = podeMexerNoItem(eu, f, x, perfis)
                  const posso = naAtual && !travado && !bloqueada && podeConcluir(eu, f, x, perfis)
                  /* O lima é da primeira tarefa liberada: é ela que faz o
                     trabalho andar. As outras esperam a vez. */
                  const primeiraLivre = etapa.itens.find(
                    (y) => !y.feito && !y.depende_de.some((i) => { const t = porId.get(i); return t && !t.item.feito }),
                  )
                  return (
                    <div className="tf-bloco" key={x.id}>
                      <div className={`tf ${x.feito ? 'f' : ''}`}>
                        <button className={`ck ${x.feito ? 'on' : ''}`} disabled={!posso}
                          onClick={() => void alternarItem(x)}
                          title={bloqueada ? 'Espera outra tarefa sair antes' : ''}
                          aria-label={`${x.feito ? 'Reabrir' : 'Concluir'} ${x.texto}`}>
                          <Ic.check />
                        </button>
                        <span className="tf-tt">
                          <span>
                            {x.priv && (
                              <span className="lk" title="Tarefa privada: só você vê"><Ic.lock /></span>
                            )}
                            {x.texto}
                          </span>
                          {!!x.descricao && <small className="tf-desc">{x.descricao}</small>}
                          {bloqueada && (
                            <small className="tf-bloq">
                              <Ic.trava />
                              Espera {abertas[0]!.item.texto}
                              {abertas.length > 1 && ` e mais ${abertas.length - 1}`}
                              {abertas[0]!.item.resp_id && `, com ${nomeDe(abertas[0]!.item.resp_id)}`}
                            </small>
                          )}
                        </span>
                        <span className="tf-quem">
                          <Av p={perfilDe(x.resp_id)} tam="sm" />
                          {x.resp_id === eu.id ? 'Você' : nomeDe(x.resp_id)}
                        </span>
                        <span className={`due ${x.feito ? '' : classePrazo(x.prazo)}`}>
                          {x.feito ? 'Concluída' : x.prazo ? rel(x.prazo) : 'Sem prazo'}
                        </span>
                        <span className="tf-acao">
                          {posso && !x.feito && x.id === primeiraLivre?.id && (
                            <button className="btn pri" onClick={() => void alternarItem(x)}>Concluir tarefa</button>
                          )}
                          {meu && (
                            <button className="iconbtn" title="Editar tarefa" aria-label={`Editar ${x.texto}`}
                              onClick={() => abrir({ tipo: 'item', etapa, item: x })}><Ic.mais /></button>
                          )}
                          {meu && (
                            <button className="iconbtn" title="Remover" aria-label={`Remover ${x.texto}`}
                              onClick={() => void excluirItem(x)}><Ic.x /></button>
                          )}
                        </span>
                      </div>
                      <Anexos item={x} podeAnexar={!passado && !travado && podeConcluir(eu, f, x, perfis)} />
                    </div>
                  )
                })}

                {!etapa.itens.length && <p className="tb-vazio">Nenhuma tarefa neste checkpoint ainda.</p>}

                {!!ocultos && (
                  <div className="oculto">
                    <Ic.oculto />
                    {ocultos === 1
                      ? 'Mais 1 tarefa nesta track é de outra pessoa e não aparece para você.'
                      : `Mais ${ocultos} tarefas nesta track são de outras pessoas e não aparecem para você.`}
                  </div>
                )}

                <div className="cp-f">
                  {naAtual && (
                    <button className={`btn ${completo && podeAprovar && !travado ? 'pri' : ''}`}
                      onClick={() => setDecidindo(true)}
                      disabled={travado || !podeAprovar}
                      title={podeAprovar ? '' : `Somente ${nomeDe(etapa.aprovador_id)} decide este checkpoint`}>
                      {!completo && <Ic.lock />}{pode.aprovacao ? 'Aprovar saída' : 'Fechar checkpoint'}
                    </button>
                  )}
                  <span className="cp-nota">{nota}</span>
                </div>
              </div>

              {/* O palpite de quem faz vem DEPOIS do checkpoint: ele é sugestão,
                  e sugestão não passa na frente do trabalho. Antes ele empurrava
                  as tarefas para fora da primeira tela no celular. */}
              <QuemFaz f={f} />
            </>
          )}
        </div>

        <aside className="rail">
          {aba === 'trilha' ? (
            <>
              {pode.canais ? (
                <>
                  <ConversaTrack f={f} />
                  {/* A atividade fechada por padrão: ela é o histórico, e histórico
                      se consulta, não se acompanha. Aberta, ela comia a altura que
                      a conversa precisa para caber mais de quatro mensagens. */}
                  <details className="track-atv">
                    <summary><Ic.chev />Atividade<i className="num">{f.log.length}</i></summary>
                    <AtividadeTrack f={f} />
                  </details>
                </>
              ) : (
                /* Sem canal a coluna é só a atividade, e ela deixa de ser botão:
                   o que sobra na coluna é ela, e retrair o único conteúdo para
                   mostrar espaço vazio não esconde nada de ninguém. */
                <>
                  <h2 className="track-rot">Atividade</h2>
                  <AtividadeTrack f={f} quantas={30} />
                </>
              )}
            </>
          ) : (
            <>
              <h2 className="track-rot">Nesta {f.tipo === 'ciclo' ? 'volta' : 'track'}</h2>
              <dl className="kv">
                <dt>Checkpoint</dt>
                <dd>{f.concluido ? 'Concluído' : f.etapas[f.atual]?.nome}</dd>
                {pode.delegar && (
                  <>
                    <dt>Responsável</dt>
                    <dd><Av p={perfilDe(f.dono_id)} tam="sm" />{nomeDe(f.dono_id)}</dd>
                  </>
                )}
                <dt>Checkpoints</dt>
                <dd className="num">{f.etapas.length}</dd>
                <dt>Progresso</dt>
                <dd className="num">{pct}%</dd>
              </dl>
              {f.tipo === 'ciclo' && !!f.voltas.length && (
                <>
                  <div className="rail-sep" />
                  <h2 className="track-rot">Voltas anteriores</h2>
                  <div className="tb">
                    {[...f.voltas].reverse().map((v) => (
                      <div className="volta" key={v.id}>
                        <span>{v.periodo}</span>
                        <span className={`track-st ${v.situacao}`}>
                          <IconeStatus st={v.situacao} p={1} />{LBL[v.situacao]}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </aside>
      </div>

      {decidindo && naAtual && (
        <Decisao f={f} etapa={etapa} fechar={() => { setDecidindo(false); setSel(null) }} />
      )}
    </>
  )
}
