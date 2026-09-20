'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useDados } from './Dados'
import { Ic } from './Icones'
import { Av } from './atomos'
import Link from 'next/link'
import { dias, hojeIso } from '@/lib/datas'
import { podeMexerNoPrazo } from '@/lib/acesso'
import { faixa, minutos, ocupados } from '@/lib/agenda'
import { esqueletoEmBranco, periodoAtual, type RascunhoEtapa } from '@/lib/modelos'
import type { Canal, Compromisso, Empresa, Etapa, Fluxo, Freq, Item, Area, Tipo, TipoCanal, Visibilidade } from '@/lib/tipos'

const CORES = ['#5E8C7B', '#6E82A0', '#8A7F9B', '#A0796E', '#7E9068', '#6D8FA0', '#9A7E8C', '#7C8B6E']

export type Pedido =
  | { tipo: 'area'; area?: Area }
  | { tipo: 'empresa'; empresa?: Empresa }
  | { tipo: 'fluxo'; fluxo?: Fluxo; tipoFluxo?: Tipo; areaId?: string; empresaId?: string; processoId?: string }
  | { tipo: 'item'; etapa: Etapa; item?: Item }
  | { tipo: 'travar'; fluxo: Fluxo }
  | { tipo: 'compromisso'; compromisso?: Compromisso; quando?: string; inicio?: string }
  | { tipo: 'canal'; canal?: Canal }
  | { tipo: 'excluir'; titulo: string; texto: string; acao: () => void | Promise<void> }

const Ctx = createContext<{ abrir: (p: Pedido) => void; fechar: () => void } | null>(null)

export function useModais() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useModais precisa estar dentro de <Modais>')
  return c
}

export function Modais({ children }: { children: ReactNode }) {
  const [pedido, setPedido] = useState<Pedido | null>(null)
  const abrir = useCallback((p: Pedido) => setPedido(p), [])
  const fechar = useCallback(() => setPedido(null), [])

  useEffect(() => {
    if (!pedido) return
    const t = (e: KeyboardEvent) => { if (e.key === 'Escape') fechar() }
    window.addEventListener('keydown', t)
    return () => window.removeEventListener('keydown', t)
  }, [pedido, fechar])

  return (
    <Ctx.Provider value={{ abrir, fechar }}>
      {children}
      {pedido && (
        <div className="ov" onMouseDown={(e) => { if (e.target === e.currentTarget) fechar() }}>
          {pedido.tipo === 'area' && <MArea area={pedido.area} fechar={fechar} />}
          {pedido.tipo === 'empresa' && <MEmpresa empresa={pedido.empresa} fechar={fechar} />}
          {pedido.tipo === 'fluxo' && <MFluxo pedido={pedido} fechar={fechar} />}
          {pedido.tipo === 'item' && <MItem etapa={pedido.etapa} item={pedido.item} fechar={fechar} />}
          {pedido.tipo === 'travar' && <MTravar fluxo={pedido.fluxo} fechar={fechar} />}
          {pedido.tipo === 'compromisso' && <MCompromisso pedido={pedido} fechar={fechar} />}
          {pedido.tipo === 'canal' && <MCanal canal={pedido.canal} fechar={fechar} />}
          {pedido.tipo === 'excluir' && <MExcluir pedido={pedido} fechar={fechar} />}
        </div>
      )}
    </Ctx.Provider>
  )
}

function Rodape({ fechar, rotulo, acao, perigo }: {
  fechar: () => void; rotulo: string; acao: () => void; perigo?: boolean
}) {
  return (
    <div className="dlg-f">
      <button className="btn" onClick={fechar}>Cancelar</button>
      <button className="btn pri" onClick={acao} style={perigo ? { background: 'var(--late)', color: '#fff' } : undefined}>
        {rotulo}
      </button>
    </div>
  )
}

// ------------------------------------------------------------------ area

function MArea({ area, fechar }: { area?: Area; fechar: () => void }) {
  const { perfis, salvarArea } = useDados()
  const router = useRouter()
  const [nome, setNome] = useState(area?.nome || '')
  const [cor, setCor] = useState(area?.cor || CORES[0])
  const [responsavel, setResponsavel] = useState(area?.responsavel_id || '')

  const salvar = async () => {
    if (!nome.trim()) return
    const s = await salvarArea({
      id: area?.id, nome: nome.trim(), cor, responsavel_id: responsavel || null,
    })
    fechar()
    if (s && !area) router.push(`/area/${s.id}`)
  }

  return (
    <div className="dlg" role="dialog" aria-modal="true" aria-labelledby="ms">
      <div className="dlg-h">
        <h3 id="ms">{area ? 'Editar área' : 'Nova área'}</h3>
        <p>Áreas são as frentes que já funcionam e têm rotinas próprias.</p>
      </div>
      <div className="dlg-b">
        <div className="fld">
          <label htmlFor="s-nome">Nome</label>
          <input className="inp" id="s-nome" value={nome} autoFocus placeholder="Ex.: Jurídico"
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void salvar() }} />
        </div>
        <div className="fld">
          <label htmlFor="a-resp">Responsável padrão</label>
          <select className="inp" id="a-resp" value={responsavel}
            onChange={(e) => setResponsavel(e.target.value)}>
            <option value="">Ninguém definido</option>
            {perfis.filter((p) => p.ativo).map((p) => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
          <p className="hint">
            Quem recebe, por padrão, as tarefas que um processo manda para esta área. Sempre dá para
            trocar na hora de criar a esteira.
          </p>
        </div>
        <div className="fld">
          <span className="lbl">Cor</span>
          <div className="sw">
            {CORES.map((c) => (
              <button key={c} style={{ background: c }} className={cor === c ? 'on' : ''}
                onClick={() => setCor(c)} aria-label={`Cor ${c}`} />
            ))}
          </div>
        </div>
      </div>
      <Rodape fechar={fechar} rotulo={area ? 'Salvar' : 'Criar área'} acao={() => void salvar()} />
    </div>
  )
}

// ---------------------------------------------------------------- empresa

function MEmpresa({ empresa, fechar }: { empresa?: Empresa; fechar: () => void }) {
  const { salvarEmpresa, org } = useDados()
  const [nome, setNome] = useState(empresa?.nome || '')
  const [sigla, setSigla] = useState(empresa?.sigla || '')
  const [cor, setCor] = useState(empresa?.cor || CORES[0])

  const auto = (n: string) => n.trim().replace(/[^\p{L}]/gu, '').slice(0, 3).toUpperCase()

  const salvar = async () => {
    if (!nome.trim()) return
    await salvarEmpresa({ id: empresa?.id, nome: nome.trim(), sigla: (sigla || auto(nome)).slice(0, 3), cor })
    fechar()
  }

  return (
    <div className="dlg" role="dialog" aria-modal="true" aria-labelledby="mе">
      <div className="dlg-h">
        <h3 id="mе">{empresa ? `Editar ${org.rotulo.toLowerCase()}` : `Nova ${org.rotulo.toLowerCase()}`}</h3>
        <p>Cada rotina e cada projeto pode pertencer a uma, e o seletor da lateral foca o app nela.</p>
      </div>
      <div className="dlg-b">
        <div className="fgrid">
          <div className="fld full">
            <label htmlFor="e-nome">Nome</label>
            <input className="inp" id="e-nome" value={nome} autoFocus placeholder="Ex.: Simoneto"
              onChange={(e) => setNome(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void salvar() }} />
          </div>
          <div className="fld">
            <label htmlFor="e-sigla">Sigla</label>
            <input className="inp" id="e-sigla" value={sigla} maxLength={3} placeholder={auto(nome) || 'SMN'}
              onChange={(e) => setSigla(e.target.value.toUpperCase())} />
            <p className="hint">Três letras, para caber no seletor.</p>
          </div>
          <div className="fld">
            <span className="lbl">Cor</span>
            <div className="sw">
              {CORES.map((c) => (
                <button key={c} style={{ background: c }} className={cor === c ? 'on' : ''}
                  onClick={() => setCor(c)} aria-label={`Cor ${c}`} />
              ))}
            </div>
          </div>
        </div>
      </div>
      <Rodape fechar={fechar} rotulo={empresa ? 'Salvar' : 'Criar'} acao={() => void salvar()} />
    </div>
  )
}

// ------------------------------------------------------------------ fluxo

function MFluxo({ pedido, fechar }: { pedido: Extract<Pedido, { tipo: 'fluxo' }>; fechar: () => void }) {
  const { eu, perfis, areas, areaDe, nomeDe, empresas, org, pessoal, empresaAtiva, processos,
    salvarFluxo, criarDoProcesso, toast } = useDados()
  const router = useRouter()
  const edicao = pedido.fluxo
  const ativos = perfis.filter((p) => p.ativo)

  const [tipo, setTipo] = useState<Tipo>(edicao?.tipo || pedido.tipoFluxo || 'esteira')
  const [nome, setNome] = useState(edicao?.nome || '')
  const [areaId, setAreaId] = useState<string>(edicao?.area_id || pedido.areaId || areas[0]?.id || '')
  const [donoId, setDonoId] = useState(edicao?.dono_id || eu.id)
  const [visib, setVisib] = useState<Visibilidade>(edicao?.visib ?? 'equipe')
  const [comQuem, setComQuem] = useState<string[]>(edicao?.pessoas ?? [])
  const [freq, setFreq] = useState<Freq>(edicao?.freq || 'mensal')
  const [periodo, setPeriodo] = useState(edicao?.periodo || periodoAtual(edicao?.freq || 'mensal'))
  const [empresaId, setEmpresaId] = useState<string>(
    edicao?.empresa_id || pedido.empresaId || empresaAtiva || empresas[0]?.id || '',
  )
  /** Vazio quer dizer do zero; preenchido, a esteira nasce de um processo. */
  const [processoId, setProcessoId] = useState(pedido.processoId || '')
  const [inicio, setInicio] = useState(hojeIso())
  const [pessoas, setPessoas] = useState<Record<string, string>>({})
  const [etapas, setEtapas] = useState<RascunhoEtapa[]>(
    edicao
      ? edicao.etapas.map((e) => ({
          id: e.id, nome: e.nome, criterio: e.criterio, aprovador_id: e.aprovador_id, prazo: e.prazo || '',
        }))
      : esqueletoEmBranco(pedido.tipoFluxo || 'esteira', 'mensal', eu.id),
  )
  const ciclo = tipo === 'ciclo'
  const souAutor = !edicao || edicao.autor_id === eu.id
  /** Todos do tipo, com os da área em foco na frente. Filtrar esconderia o certo. */
  const disponiveis = processos
    .filter((p) => p.tipo === tipo)
    .sort((a, b) => Number(b.area_id === areaId) - Number(a.area_id === areaId))
  const processo = processos.find((p) => p.id === processoId)

  /** Áreas que o processo escolhido usa, com quem vai receber cada uma. */
  const envolvidas = useMemo(() => {
    if (!processo) return []
    const ids = [...new Set([
      ...processo.etapas.map((e) => e.aprovador_area_id),
      ...processo.etapas.flatMap((e) => e.itens.map((i) => i.area_id)),
    ].filter(Boolean) as string[])]
    return ids.map((aid) => {
      const a = areaDe(aid)
      return {
        area: a,
        tarefas: processo.etapas.reduce((n, e) => n + e.itens.filter((i) => i.area_id === aid).length, 0),
        aprovacoes: processo.etapas.filter((e) => e.aprovador_area_id === aid).length,
        escolhida: pessoas[aid] ?? a.responsavel_id ?? '',
      }
    })
  }, [processo, areaDe, pessoas])

  const escolherProcesso = (id: string) => {
    setProcessoId(id)
    const p = processos.find((x) => x.id === id)
    if (!p) return
    // O processo sabe a que área pertence, então ele ajusta a área da esteira.
    if (p.area_id) setAreaId(p.area_id)
    if (!nome && p.tipo === 'ciclo') setNome(p.nome)
    setPessoas({})
  }

  const trocarTipo = (t: Tipo) => {
    setTipo(t)
    setProcessoId('')
    setEtapas(esqueletoEmBranco(t, freq, eu.id))
    if (t === 'ciclo') setPeriodo(periodoAtual(freq))
  }
  const trocarFreq = (f: Freq) => {
    setFreq(f)
    setPeriodo(periodoAtual(f))
    if (!edicao && !processoId) setEtapas(esqueletoEmBranco('ciclo', f, eu.id))
  }
  const mexer = (k: number, campo: keyof RascunhoEtapa, valor: string) =>
    setEtapas((a) => a.map((e, i) => (i === k ? { ...e, [campo]: valor } : e)))
  const mover = (k: number, d: number) =>
    setEtapas((a) => { const b = [...a]; [b[k + d], b[k]] = [b[k], b[k + d]]; return b })

  const salvar = async () => {
    if (!nome.trim()) { toast('Dê um nome à esteira.', true); document.getElementById('f-nome')?.focus(); return }

    if (!edicao && processo) {
      const mapa: Record<string, string> = {}
      for (const { area, escolhida } of envolvidas) if (escolhida) mapa[area.id] = escolhida
      const id = await criarDoProcesso(
        processo.id,
        {
          nome: nome.trim(), area_id: areaId || null, empresa_id: empresaId || null,
          dono_id: donoId, visib, pessoas: visib === 'escolhidas' ? comQuem : [],
          freq: ciclo ? freq : null, periodo: ciclo ? periodo : null,
        },
        mapa,
        inicio,
      )
      if (!id) return
      toast(`${nome.trim()} criado a partir de ${processo.nome}.`)
      fechar()
      router.push(`/fluxo/${id}`)
      return
    }

    const falta = etapas.findIndex((e) => !e.nome.trim())
    if (falta >= 0) { toast('Todo checkpoint precisa de nome.', true); document.getElementById('cp-n-' + falta)?.focus(); return }
    const id = await salvarFluxo(
      {
        id: edicao?.id || null,
        tipo, nome: nome.trim(), area_id: areaId || null, empresa_id: empresaId || null,
        dono_id: donoId, visib, pessoas: visib === 'escolhidas' ? comQuem : [],
        freq: ciclo ? freq : null, periodo: ciclo ? periodo : null,
      },
      etapas,
    )
    if (!id) return
    toast(edicao ? 'Alterações salvas.' : `${nome.trim()} criado. Agora adicione os itens de cada checkpoint.`)
    fechar()
    if (!edicao) router.push(`/fluxo/${id}`)
  }

  return (
    <div className="dlg wide" role="dialog" aria-modal="true" aria-labelledby="mf">
      <div className="dlg-h">
        <h3 id="mf">{edicao ? 'Editar esteira' : ciclo ? 'Nova rotina' : 'Novo projeto'}</h3>
        <p>{edicao ? 'Mudanças valem para todos que veem esta esteira.' : 'Os itens de cada checkpoint são adicionados depois, direto na esteira.'}</p>
      </div>
      <div className="dlg-b">
        {!edicao && (
          <div className="opt">
            <button className={`optc ${!ciclo ? 'on' : ''}`} onClick={() => trocarTipo('esteira')}>
              <span style={{ color: 'var(--ac)', marginTop: 2 }}><Ic.proj /></span>
              <span><b>Projeto</b><small>Início, checkpoints e fim. Ex.: implantação, obra, novo negócio.</small></span>
            </button>
            <button className={`optc ${ciclo ? 'on' : ''}`} onClick={() => trocarTipo('ciclo')}>
              <span style={{ color: 'var(--ac)', marginTop: 2 }}><Ic.ciclo /></span>
              <span><b>Rotina</b><small>Se repete a cada período e guarda o histórico. Ex.: fechamento mensal.</small></span>
            </button>
          </div>
        )}

        <div className="fgrid">
          <div className="fld full">
            <label htmlFor="f-nome">Nome</label>
            <input className="inp" id="f-nome" value={nome} autoFocus onChange={(e) => setNome(e.target.value)}
              placeholder={ciclo ? 'Ex.: Fechamento mensal' : 'Ex.: Implantação do sistema financeiro'} />
          </div>
          <div className="fld">
            <label htmlFor="f-area">Área</label>
            <select className="inp" id="f-area" value={areaId || ''} onChange={(e) => setAreaId(e.target.value)}>
              {!ciclo && <option value="">Sem área (negócio novo)</option>}
              {areas.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </div>
          {org.multi && (
            <div className="fld">
              <label htmlFor="f-emp">{org.rotulo}</label>
              <select className="inp" id="f-emp" value={empresaId} onChange={(e) => setEmpresaId(e.target.value)}>
                <option value="">Sem {org.rotulo.toLowerCase()}</option>
                {empresas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
            </div>
          )}
          <div className="fld">
            <label htmlFor="f-dono">Dono</label>
            <select className="inp" id="f-dono" value={donoId || ''} onChange={(e) => setDonoId(e.target.value)}>
              {ativos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
          {ciclo && (
            <>
              <div className="fld">
                <label htmlFor="f-freq">Frequência</label>
                <select className="inp" id="f-freq" value={freq} onChange={(e) => trocarFreq(e.target.value as Freq)}>
                  {(['semanal', 'quinzenal', 'mensal'] as Freq[]).map((x) => <option key={x} value={x}>{x}</option>)}
                </select>
              </div>
              <div className="fld">
                <label htmlFor="f-per">Período atual</label>
                <input className="inp" id="f-per" value={periodo} onChange={(e) => setPeriodo(e.target.value)} />
              </div>
            </>
          )}
          {!pessoal && (
          <div className="fld full">
            <span className="lbl">Quem vê</span>
            {souAutor ? (
              <>
                <div className="seg" style={{ alignSelf: 'flex-start' }}>
                  <button className={visib === 'equipe' ? 'on' : ''} onClick={() => setVisib('equipe')}>
                    <Ic.team />Toda a equipe
                  </button>
                  <button className={visib === 'escolhidas' ? 'on' : ''} onClick={() => setVisib('escolhidas')}>
                    <Ic.team />Só quem eu escolher
                  </button>
                  <button className={visib === 'so_eu' ? 'on' : ''} onClick={() => setVisib('so_eu')}>
                    <Ic.lock />Só eu
                  </button>
                </div>

                {visib === 'escolhidas' && (
                  <div className="plist" style={{ marginTop: 9 }}>
                    {ativos.filter((x) => x.id !== eu.id).map((x) => (
                      <button key={x.id} className={`pch ${comQuem.includes(x.id) ? 'on' : ''}`}
                        onClick={() => setComQuem((a) =>
                          a.includes(x.id) ? a.filter((y) => y !== x.id) : [...a, x.id])}>
                        <Av p={x} />{x.nome}
                      </button>
                    ))}
                  </div>
                )}

                <p className="hint">
                  {visib === 'so_eu' &&
                    'Só você vê esta esteira, inclusive no painel e nas pendências. O banco recusa o acesso de qualquer outra pessoa.'}
                  {visib === 'escolhidas' &&
                    'Além de quem você escolher, entram você, o dono e quem tiver tarefa ou aprovação aqui. Ninguém mais vê, nem administrador.'}
                  {visib === 'equipe' &&
                    'Aparece para a equipe, respeitando a regra de quem vê o quê. Tarefas individuais ainda podem ser privadas.'}
                </p>
              </>
            ) : (
              <p className="hint" style={{ marginTop: 2 }}>
                {edicao?.visib === 'escolhidas'
                  ? 'Restrita a algumas pessoas. Só quem criou a esteira muda isso.'
                  : 'Visível para a equipe. Só quem criou a esteira pode restringir.'}
              </p>
            )}
          </div>
          )}
          {!edicao && (
            <div className="fld full">
              <span className="lbl">Começar de um processo</span>
              <div className="tpls">
                <button className={`tpl ${!processoId ? 'on' : ''}`} onClick={() => escolherProcesso('')}>
                  Do zero
                </button>
                {disponiveis.map((p) => (
                  <button key={p.id} className={`tpl ${processoId === p.id ? 'on' : ''}`}
                    onClick={() => escolherProcesso(p.id)} title={p.descricao}>
                    {p.nome}
                  </button>
                ))}
              </div>
              <p className="hint">
                {processo
                  ? processo.descricao || 'A esteira nasce com os checkpoints e as tarefas já distribuídos.'
                  : disponiveis.length
                    ? 'Escolher um processo faz a esteira nascer pronta, com as tarefas já nas pessoas certas.'
                    : 'Nenhum processo desenhado para este tipo ainda.'}
                {' '}
                <Link href="/processos" onClick={fechar} style={{ color: 'var(--warn-forte)' }}>
                  Desenhar processos
                </Link>
              </p>
            </div>
          )}
        </div>

        {!edicao && processo ? (
          <>
            <div className="fgrid">
              <div className="fld">
                <label htmlFor="f-ini">Começa em</label>
                <input className="inp" type="date" id="f-ini" value={inicio}
                  onChange={(e) => setInicio(e.target.value)} />
                <p className="hint">Os prazos do processo são contados a partir desta data.</p>
              </div>
              <div className="fld">
                <span className="lbl">O que vem pronto</span>
                <div className="proc-numeros" style={{ paddingTop: 7 }}>
                  <span><b className="num">{processo.etapas.length}</b> checkpoints</span>
                  <span>
                    <b className="num">{processo.etapas.reduce((n, e) => n + e.itens.length, 0)}</b> tarefas
                  </span>
                </div>
              </div>
            </div>

            <div className="fld">
              <span className="lbl">Quem recebe cada área</span>
              <div className="cpl">
                {envolvidas.map(({ area, tarefas, aprovacoes, escolhida }) => (
                  <div className="pi" key={area.id}
                    style={{ padding: '9px 11px', borderTop: '1px solid var(--line)' }}>
                    <span className="sdot" style={{ background: area.cor }} />
                    <span style={{ minWidth: 0 }}>
                      <b style={{ fontWeight: 500, fontSize: 13 }}>{area.nome}</b>
                      <small style={{ display: 'block', fontSize: 11, color: 'var(--tx-3)' }}>
                        {tarefas} {tarefas === 1 ? 'tarefa' : 'tarefas'}
                        {!!aprovacoes && `, ${aprovacoes} ${aprovacoes === 1 ? 'aprovação' : 'aprovações'}`}
                      </small>
                    </span>
                    <select className="inp" value={escolhida} aria-label={`Quem recebe ${area.nome}`}
                      onChange={(e) => setPessoas((m) => ({ ...m, [area.id]: e.target.value }))}>
                      <option value="">Escolher depois</option>
                      {ativos.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
                    </select>
                    <span />
                    <span />
                  </div>
                ))}
              </div>
              <p className="hint">
                Já vem preenchido com o responsável padrão de cada área. Trocar aqui vale só para esta
                esteira.
              </p>
            </div>
          </>
        ) : (
        <div className="fld">
          <span className="lbl">Checkpoints</span>
          <div className="cpl">
            {etapas.map((e, k) => (
              <div className="cpr" key={k}>
                <span className="n num">{k + 1}</span>
                <input className="inp" id={`cp-n-${k}`} value={e.nome} placeholder="Nome do checkpoint"
                  aria-label={`Nome do checkpoint ${k + 1}`} onChange={(ev) => mexer(k, 'nome', ev.target.value)} />
                <select className="inp" value={e.aprovador_id || ''} aria-label="Aprovador"
                  onChange={(ev) => mexer(k, 'aprovador_id', ev.target.value)}>
                  {ativos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
                <input className="inp" type="date" value={e.prazo} aria-label="Prazo"
                  onChange={(ev) => mexer(k, 'prazo', ev.target.value)} />
                <span className="tools">
                  <button className="iconbtn" aria-label="Subir" disabled={!k} onClick={() => mover(k, -1)}><Ic.up /></button>
                  <button className="iconbtn" aria-label="Descer" disabled={k >= etapas.length - 1}
                    style={{ transform: 'rotate(180deg)' }} onClick={() => mover(k, 1)}><Ic.up /></button>
                  <button className="iconbtn" aria-label="Remover" disabled={etapas.length < 2}
                    onClick={() => setEtapas((a) => a.filter((_, i) => i !== k))}><Ic.x /></button>
                </span>
                <input className="inp crit" value={e.criterio}
                  placeholder="Critério de saída (o que precisa ser verdade para avançar)"
                  onChange={(ev) => mexer(k, 'criterio', ev.target.value)} />
              </div>
            ))}
            <button className="cpl-add" onClick={() =>
              setEtapas((a) => [...a, { id: null, nome: '', criterio: '', aprovador_id: eu.id, prazo: '' }])
            }>
              <Ic.plus />Adicionar checkpoint
            </button>
          </div>
        </div>
        )}
      </div>
      <Rodape fechar={fechar} acao={() => void salvar()}
        rotulo={edicao ? 'Salvar alterações' : ciclo ? 'Criar rotina' : 'Criar projeto'} />
    </div>
  )
}

// ------------------------------------------------------------------- item

function MItem({ etapa, item, fechar }: { etapa: Etapa; item?: Item; fechar: () => void }) {
  const { eu, perfis, fluxos, areaDe, pessoal, adicionarItem, editarItem, definirTravas } = useDados()
  const ativos = perfis.filter((p) => p.ativo)
  const fluxo = fluxos.find((f) => f.id === etapa.fluxo_id)
  const mandaNoPrazo = !!fluxo && podeMexerNoPrazo(eu, fluxo, perfis)

  const [texto, setTexto] = useState(item?.texto || '')
  const [resp, setResp] = useState(item?.resp_id || eu.id)
  const [prazo, setPrazo] = useState(
    item?.prazo || (etapa.prazo && dias(etapa.prazo) >= 0 ? etapa.prazo : ''),
  )
  const [priv, setPriv] = useState(!!item?.priv)
  const [travas, setTravas] = useState<string[]>(item?.depende_de || [])
  const [busca, setBusca] = useState('')

  /** Qualquer tarefa que eu enxergue pode travar esta, inclusive de outra esteira. */
  const candidatos = useMemo(() => {
    const limpa = (x: string) => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    const t = limpa(busca.trim())
    const todos = fluxos.flatMap((f) =>
      f.etapas.flatMap((e) => e.itens.map((i) => ({ item: i, fluxo: f, etapa: e }))),
    )
    return todos
      .filter((x) => x.item.id !== item?.id && !travas.includes(x.item.id) && !x.item.feito)
      .filter((x) => !t || limpa(x.item.texto).includes(t) || limpa(x.fluxo.nome).includes(t))
      .slice(0, 6)
  }, [fluxos, busca, travas, item?.id])

  const escolhidas = useMemo(() => {
    const todos = new Map(
      fluxos.flatMap((f) => f.etapas.flatMap((e) => e.itens.map((i) => [i.id, { item: i, fluxo: f }] as const))),
    )
    return travas.map((id) => todos.get(id)).filter(Boolean) as { item: Item; fluxo: Fluxo }[]
  }, [travas, fluxos])

  const salvar = async () => {
    if (!texto.trim()) return
    const d = { texto: texto.trim(), resp_id: resp, prazo, priv }
    if (item) {
      await editarItem(item, d)
      if (JSON.stringify(travas) !== JSON.stringify(item.depende_de)) await definirTravas(item, travas)
    } else {
      const novo = await adicionarItem(etapa, d)
      if (novo && travas.length) await definirTravas({ id: novo } as Item, travas)
    }
    fechar()
  }

  return (
    <div className="dlg" role="dialog" aria-modal="true" aria-labelledby="mi">
      <div className="dlg-h">
        <h3 id="mi">{item ? 'Editar tarefa' : 'Nova tarefa'}</h3>
        <p>Em {etapa.nome}{fluxo ? `, ${fluxo.nome}` : ''}</p>
      </div>
      <div className="dlg-b">
        <div className="fld">
          <label htmlFor="i-t">O que precisa ser feito</label>
          <input className="inp" id="i-t" value={texto} autoFocus
            placeholder="Ex.: Conferir extrato da conta das obras"
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void salvar() }} />
        </div>
        <div className="fgrid">
          {/* Numa conta de uma pessoa só, a resposta é sempre você. */}
          {!pessoal && (
            <div className="fld">
              <label htmlFor="i-r">Responsável</label>
              <select className="inp" id="i-r" value={resp || ''} onChange={(e) => setResp(e.target.value)}>
                {ativos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}{p.area_id ? ` (${areaDe(p.area_id).nome})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="fld">
            <label htmlFor="i-p">Prazo</label>
            <input className="inp" type="date" id="i-p" value={prazo} disabled={!mandaNoPrazo}
              onChange={(e) => setPrazo(e.target.value)} />
            {!mandaNoPrazo && (
              <p className="hint">Prazo é compromisso com quem espera. Só quem responde pelo processo muda.</p>
            )}
          </div>
        </div>

        <div className="fld">
          <span className="lbl">Depende de</span>
          {!!escolhidas.length && (
            <div className="travas">
              {escolhidas.map(({ item: t, fluxo: f }) => (
                <span className="trava" key={t.id}>
                  <Ic.trava />
                  <span className="tx">{t.texto}</span>
                  <small>{f.nome}</small>
                  <button className="iconbtn" aria-label={`Tirar ${t.texto}`}
                    onClick={() => setTravas((a) => a.filter((x) => x !== t.id))}><Ic.x /></button>
                </span>
              ))}
            </div>
          )}
          <input className="inp" value={busca} placeholder="Buscar a tarefa que precisa sair antes"
            onChange={(e) => setBusca(e.target.value)} />
          {!!busca.trim() && (
            <div className="cpl" style={{ marginTop: 2 }}>
              {candidatos.length ? candidatos.map(({ item: c, fluxo: f, etapa: e }) => (
                <button className="cand" key={c.id} onClick={() => { setTravas((a) => [...a, c.id]); setBusca('') }}>
                  <span className="tx">{c.texto}</span>
                  <small>{f.nome} · {e.nome}</small>
                </button>
              )) : <div className="empty" style={{ padding: '10px 12px' }}>Nada encontrado.</div>}
            </div>
          )}
          <p className="hint">
            Enquanto essas tarefas não saírem, esta aparece travada, e quem responde por elas fica visível
            para você. Pode ser tarefa de outra esteira e de outra área.
          </p>
        </div>

        <label className="chk">
          <input type="checkbox" checked={priv} onChange={(e) => setPriv(e.target.checked)} />
          <Ic.lock />Privado: só eu vejo esta tarefa
        </label>
      </div>
      <Rodape fechar={fechar} rotulo={item ? 'Salvar tarefa' : 'Adicionar tarefa'} acao={() => void salvar()} />
    </div>
  )
}

// ----------------------------------------------------------------- travar

function MTravar({ fluxo, fechar }: { fluxo: Fluxo; fechar: () => void }) {
  const { travar } = useDados()
  const [motivo, setMotivo] = useState('')
  const salvar = async () => {
    if (!motivo.trim()) return
    await travar(fluxo, motivo.trim())
    fechar()
  }
  return (
    <div className="dlg" role="dialog" aria-modal="true" aria-labelledby="mt">
      <div className="dlg-h">
        <h3 id="mt">Travar {fluxo.nome}</h3>
        <p>Travado sinaliza que depende de algo externo. Aparece em destaque no painel.</p>
      </div>
      <div className="dlg-b">
        <div className="fld">
          <label htmlFor="t-m">Motivo</label>
          <input className="inp" id="t-m" value={motivo} autoFocus
            placeholder="Ex.: aguardando aprovação da prefeitura"
            onChange={(e) => setMotivo(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void salvar() }} />
        </div>
      </div>
      <Rodape fechar={fechar} rotulo="Travar" acao={() => void salvar()} />
    </div>
  )
}

// ------------------------------------------------------------ compromisso

function MCompromisso({ pedido, fechar }: {
  pedido: Extract<Pedido, { tipo: 'compromisso' }>; fechar: () => void
}) {
  const { eu, perfis, fluxos, agenda, nomeDe, salvarCompromisso, excluirCompromisso } = useDados()
  const c = pedido.compromisso
  const souDono = !c || c.dono_id === eu.id || eu.papel === 'admin'
  const ativos = perfis.filter((p) => p.ativo && p.id !== eu.id)

  const [titulo, setTitulo] = useState(c?.titulo || '')
  const [quando, setQuando] = useState(c?.quando || pedido.quando || hojeIso())
  const [diaInteiro, setDiaInteiro] = useState(c ? !c.inicio : false)
  const [inicio, setInicio] = useState(c?.inicio?.slice(0, 5) || pedido.inicio || '09:00')
  const [fim, setFim] = useState(c?.fim?.slice(0, 5) || '10:00')
  const [local, setLocal] = useState(c?.local || '')
  const [nota, setNota] = useState(c?.nota || '')
  const [bloqueia, setBloqueia] = useState(c ? c.bloqueia : true)
  const [visivel, setVisivel] = useState(c ? c.visivel : true)
  const [fluxoId, setFluxoId] = useState(c?.fluxo_id || '')
  const [convidados, setConvidados] = useState<string[]>(
    (c?.convidados || []).filter((x) => x !== eu.id),
  )

  /** Mexer no começo arrasta o fim junto, mantendo a duração. */
  const mudarInicio = (v: string) => {
    const antes = minutos(inicio) ?? 0
    const depois = minutos(v)
    if (depois === null) return
    const dur = Math.max(15, (minutos(fim) ?? antes + 60) - antes)
    setInicio(v)
    const novoFim = depois + dur
    const h = Math.min(23, Math.floor(novoFim / 60))
    const m = novoFim % 60
    setFim(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
  }

  /** O fim nunca fica antes do começo. */
  const mudarFim = (v: string) => {
    const i = minutos(inicio) ?? 0
    const f = minutos(v)
    if (f !== null && f <= i) {
      const alvo = i + 30
      const h = Math.min(23, Math.floor(alvo / 60))
      setFim(`${String(h).padStart(2, '0')}:${String(alvo % 60).padStart(2, '0')}`)
      return
    }
    setFim(v)
  }

  const rascunho: Compromisso = {
    id: c?.id || 'novo', titulo, quando,
    inicio: diaInteiro ? null : inicio, fim: diaInteiro ? null : fim,
    local, nota, dono_id: eu.id, bloqueia, visivel, fluxo_id: fluxoId || null,
    convidados, criado_em: '', aberto: true,
  }
  const conflitos = useMemo(
    () => ocupados(rascunho, agenda, perfis),
    [titulo, quando, diaInteiro, inicio, fim, bloqueia, convidados, agenda, perfis],
  )

  const salvar = async () => {
    if (!titulo.trim()) return
    await salvarCompromisso({
      id: c?.id, titulo: titulo.trim(), quando,
      inicio: diaInteiro ? null : inicio, fim: diaInteiro ? null : fim,
      local: local.trim(), nota: nota.trim(), bloqueia, visivel,
      fluxo_id: fluxoId || null, convidados,
    })
    fechar()
  }

  if (c && !souDono) {
    const pessoas = [c.dono_id, ...c.convidados].filter(Boolean) as string[]
    return (
      <div className="dlg" role="dialog" aria-modal="true" aria-labelledby="mc">
        <div className="dlg-h">
          <h3 id="mc">{c.titulo}</h3>
          <p>{faixa(c)}{c.local ? `, ${c.local}` : ''}</p>
        </div>
        <div className="dlg-b">
          <dl className="kv">
            <dt>Organiza</dt><dd>{nomeDe(c.dono_id)}</dd>
            {!!pessoas.length && (<><dt>Participam</dt><dd>{pessoas.map((p) => nomeDe(p)).join(', ')}</dd></>)}
            <dt>Ocupa a agenda</dt><dd>{c.bloqueia ? 'Sim' : 'Não'}</dd>
          </dl>
          {c.nota && <p className="hint">{c.nota}</p>}
        </div>
        <div className="dlg-f"><button className="btn" onClick={fechar}>Fechar</button></div>
      </div>
    )
  }

  return (
    <div className="dlg" role="dialog" aria-modal="true" aria-labelledby="mc">
      <div className="dlg-h">
        <h3 id="mc">{c ? 'Editar compromisso' : 'Novo compromisso'}</h3>
        <p>Prazos de tarefas já entram na agenda sozinhos. Aqui ficam reuniões, visitas e o que ocupa o seu tempo.</p>
      </div>
      <div className="dlg-b">
        <div className="fld">
          <label htmlFor="c-t">O que é</label>
          <input className="inp" id="c-t" value={titulo} autoFocus placeholder="Ex.: Reunião de obra na Dona Kika"
            onChange={(e) => setTitulo(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void salvar() }} />
        </div>

        <div className="fgrid">
          <div className="fld">
            <label htmlFor="c-d">Dia</label>
            <input className="inp" type="date" id="c-d" value={quando} onChange={(e) => setQuando(e.target.value)} />
          </div>
          <div className="fld">
            <span className="lbl">Horário</span>
            {diaInteiro ? (
              <div className="due" style={{ paddingTop: 7 }}>O dia inteiro</div>
            ) : (
              <div className="row-inline">
                <input className="inp" type="time" value={inicio} aria-label="Começa"
                  onChange={(e) => mudarInicio(e.target.value)} />
                <input className="inp" type="time" value={fim} aria-label="Termina"
                  onChange={(e) => mudarFim(e.target.value)} />
              </div>
            )}
          </div>
          <div className="fld full">
            <label className="chk">
              <input type="checkbox" checked={diaInteiro} onChange={(e) => setDiaInteiro(e.target.checked)} />
              O dia inteiro
            </label>
          </div>
          <div className="fld">
            <label htmlFor="c-l">Onde</label>
            <input className="inp" id="c-l" value={local} placeholder="Ex.: Canteiro"
              onChange={(e) => setLocal(e.target.value)} />
          </div>
          <div className="fld">
            <label htmlFor="c-f">Sobre qual esteira</label>
            <select className="inp" id="c-f" value={fluxoId} onChange={(e) => setFluxoId(e.target.value)}>
              <option value="">Nenhuma em especial</option>
              {fluxos.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </div>
        </div>

        <div className="fld">
          <span className="lbl">Quem participa</span>
          <div className="plist">
            {ativos.map((p) => (
              <button key={p.id} className={`pch ${convidados.includes(p.id) ? 'on' : ''}`}
                onClick={() => setConvidados((a) =>
                  a.includes(p.id) ? a.filter((x) => x !== p.id) : [...a, p.id])}>
                <Av p={p} />{p.nome}
              </button>
            ))}
          </div>
        </div>

        {!!conflitos.length && (
          <div className="erro">
            <Ic.x />
            <span>
              {conflitos.map(({ pessoa, conflito }) => (
                <span key={pessoa.id} style={{ display: 'block' }}>
                  <b>{pessoa.id === eu.id ? 'Você' : pessoa.nome}</b> já tem compromisso nesse horário
                  {conflito.aberto ? `: ${conflito.titulo}, ${faixa(conflito)}` : `, das ${faixa(conflito)}`}.
                </span>
              ))}
            </span>
          </div>
        )}

        <div className="fgrid">
          <div className="fld">
            <span className="lbl">Ocupa a agenda</span>
            <div className="seg" style={{ alignSelf: 'flex-start' }}>
              <button className={bloqueia ? 'on' : ''} onClick={() => setBloqueia(true)}>Sim</button>
              <button className={!bloqueia ? 'on' : ''} onClick={() => setBloqueia(false)}>Não</button>
            </div>
            <p className="hint">
              {bloqueia
                ? 'Ninguém consegue marcar outra coisa com quem participa nesse horário.'
                : 'Fica na agenda como informação, sem impedir outros compromissos. Útil para feriado e aviso.'}
            </p>
          </div>
          <div className="fld">
            <span className="lbl">Os outros veem o que é</span>
            <div className="seg" style={{ alignSelf: 'flex-start' }}>
              <button className={visivel ? 'on' : ''} onClick={() => setVisivel(true)}><Ic.team />Sim</button>
              <button className={!visivel ? 'on' : ''} onClick={() => setVisivel(false)}><Ic.lock />Não</button>
            </div>
            <p className="hint">
              {visivel
                ? 'Título, local e observação ficam visíveis para a equipe.'
                : 'A equipe vê apenas que você está ocupado nesse horário. Título, local e observação não saem daqui.'}
            </p>
          </div>
        </div>

        <div className="fld">
          <label htmlFor="c-n">Observação</label>
          <input className="inp" id="c-n" value={nota} placeholder="Opcional"
            onChange={(e) => setNota(e.target.value)} />
        </div>
      </div>

      <div className="dlg-f">
        {c && (
          <button className="btn danger" style={{ marginRight: 'auto' }}
            onClick={() => { void excluirCompromisso(c.id); fechar() }}>Excluir</button>
        )}
        <button className="btn" onClick={fechar}>Cancelar</button>
        <button className="btn pri" onClick={() => void salvar()}>{c ? 'Salvar' : 'Marcar'}</button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- excluir


// ------------------------------------------------------------------ canal

/**
 * Um canal nasce de três escolhas: como se chama, quem entra e a que projeto
 * ele se refere. A terceira é a que faz a conversa virar trabalho, porque é ela
 * que diz em qual esteira a leitura vai pôr o que ficou combinado.
 */
function MCanal({ canal, fechar }: { canal?: Canal; fechar: () => void }) {
  const { perfis, areas, todosFluxos, eu, salvarCanal } = useDados()
  const router = useRouter()
  const [nome, setNome] = useState(canal?.nome || '')
  const [descricao, setDescricao] = useState(canal?.descricao || '')
  const [tipo, setTipo] = useState<TipoCanal>(canal?.tipo || 'aberto')
  const [areaId, setAreaId] = useState(canal?.area_id || '')
  const [fluxoId, setFluxoId] = useState(canal?.fluxo_id || '')
  const [membros, setMembros] = useState<string[]>(canal?.membros.filter((m) => m !== eu.id) || [])

  const marcar = (id: string) =>
    setMembros((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]))

  const salvar = async () => {
    if (!nome.trim()) return
    const id = await salvarCanal({
      id: canal?.id,
      nome: nome.trim().replace(/^#/, ''),
      descricao, tipo,
      area_id: areaId || null,
      fluxo_id: fluxoId || null,
      membros: tipo === 'aberto' ? [] : membros,
    })
    fechar()
    if (id && !canal) router.push(`/chat/${id}`)
  }

  const abertos = todosFluxos.filter((f) => !f.concluido)

  return (
    <div className="dlg" role="dialog" aria-modal="true" aria-labelledby="mc">
      <div className="dlg-h">
        <h3 id="mc">{canal ? 'Editar canal' : 'Novo canal'}</h3>
        <p>Um assunto, uma área ou um projeto. A conversa fica junto do trabalho.</p>
      </div>
      <div className="dlg-b">
        <div className="fld">
          <label htmlFor="c-nome">Nome</label>
          <input className="inp" id="c-nome" value={nome} autoFocus placeholder="Ex.: obra-jardim-europa"
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void salvar() }} />
        </div>

        <div className="fld">
          <label htmlFor="c-desc">Do que se trata</label>
          <input className="inp" id="c-desc" value={descricao} placeholder="Uma linha, para quem chegar depois"
            onChange={(e) => setDescricao(e.target.value)} />
        </div>

        <div className="fld">
          <span className="lbl">Quem entra</span>
          <div className="seg">
            <button className={tipo === 'aberto' ? 'on' : ''} onClick={() => setTipo('aberto')}>
              Toda a equipe
            </button>
            <button className={tipo === 'fechado' ? 'on' : ''} onClick={() => setTipo('fechado')}>
              Só quem eu escolher
            </button>
          </div>
          <p className="hint">
            {tipo === 'aberto'
              ? 'Qualquer pessoa da equipe abre e lê. Preso a um projeto, vale quem enxerga o projeto.'
              : 'Fechado de verdade: quem está fora não lê nem o nome das mensagens, nem o administrador.'}
          </p>
        </div>

        {tipo === 'fechado' && (
          <div className="fld">
            <span className="lbl">Pessoas</span>
            <div className="plist">
              {perfis.filter((p) => p.ativo && p.id !== eu.id).map((p) => (
                <button key={p.id} className={`pch ${membros.includes(p.id) ? 'on' : ''}`}
                  onClick={() => marcar(p.id)}>
                  <Av p={p} tam="sm" />{p.nome}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="fld">
          <label htmlFor="c-fluxo">Projeto ou rotina</label>
          <select className="inp" id="c-fluxo" value={fluxoId} onChange={(e) => setFluxoId(e.target.value)}>
            <option value="">Nenhum, é um canal de assunto</option>
            {abertos.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </select>
          <p className="hint">
            Amarrado a uma esteira, o que a conversa combinar entra nela: tarefa nova vai
            para o checkpoint da vez, e a leitura já sabe quais tarefas existem.
          </p>
        </div>

        <div className="fld">
          <label htmlFor="c-area">Área</label>
          <select className="inp" id="c-area" value={areaId} onChange={(e) => setAreaId(e.target.value)}>
            <option value="">Nenhuma</option>
            {areas.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
        </div>
      </div>
      <Rodape fechar={fechar} rotulo={canal ? 'Salvar' : 'Criar canal'} acao={() => void salvar()} />
    </div>
  )
}

function MExcluir({ pedido, fechar }: { pedido: Extract<Pedido, { tipo: 'excluir' }>; fechar: () => void }) {
  return (
    <div className="dlg" role="dialog" aria-modal="true" aria-labelledby="me">
      <div className="dlg-h">
        <h3 id="me">{pedido.titulo}</h3>
        <p>{pedido.texto}</p>
      </div>
      <Rodape fechar={fechar} rotulo="Excluir" perigo acao={() => { void pedido.acao(); fechar() }} />
    </div>
  )
}
