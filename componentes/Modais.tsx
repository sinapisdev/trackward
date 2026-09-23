'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useDados } from './Dados'
import { Ic } from './Icones'
import { explicaTipo, rotuloTipo } from '@/lib/rotulos'
import { AvisoPrazo } from './AvisoPrazo'
import { FAIXAS, porque } from '@/lib/sobrecarga'
import { Av } from './atomos'
import Link from 'next/link'
import { curta, dias, hojeIso } from '@/lib/datas'
import { podeMexerNoPrazo } from '@/lib/acesso'
import { faixa, minutos, ocupados } from '@/lib/agenda'
import { esqueletoEmBranco, periodoAtual, type RascunhoEtapa } from '@/lib/modelos'
import { MOLDES, servico } from '@/lib/conectores'
import type {
  Agente, Area, Canal, Compromisso, Empresa, Etapa, Fluxo, Freq, Item, Tipo, TipoCanal, Visibilidade,
} from '@/lib/tipos'

const CORES = ['#8A8A8A', '#B0B0B0', '#C9884A', '#6F6F6F', '#A0704A', '#9A9A9A', '#7A6A5E', '#B5A08C']

export type Pedido =
  | { tipo: 'area'; area?: Area }
  | { tipo: 'empresa'; empresa?: Empresa }
  | { tipo: 'fluxo'; fluxo?: Fluxo; tipoFluxo?: Tipo; areaId?: string; empresaId?: string; processoId?: string }
  | { tipo: 'item'; etapa: Etapa; item?: Item }
  /** Tarefa que não pertence a objetivo nem a rotina. Privada de quem cria. */
  | { tipo: 'avulsa' }
  | { tipo: 'travar'; fluxo: Fluxo }
  | { tipo: 'compromisso'; compromisso?: Compromisso; quando?: string; inicio?: string }
  | { tipo: 'canal'; canal?: Canal }
  | {
      tipo: 'agente'
      agente?: Agente
      /** Um exemplo escolhido na tela, para o formulário nascer preenchido. */
      inicial?: { nome: string; reconhecer: string }
    }
  | { tipo: 'espaco' }
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
          {pedido.tipo === 'avulsa' && <MAvulsa fechar={fechar} />}
          {pedido.tipo === 'travar' && <MTravar fluxo={pedido.fluxo} fechar={fechar} />}
          {pedido.tipo === 'compromisso' && <MCompromisso pedido={pedido} fechar={fechar} />}
          {pedido.tipo === 'canal' && <MCanal canal={pedido.canal} fechar={fechar} />}
          {pedido.tipo === 'agente' && <MAgente pedido={pedido} fechar={fechar} />}
          {pedido.tipo === 'espaco' && <MEspaco fechar={fechar} />}
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

/**
 * Abrir outra empresa no mesmo login. Ela nasce vazia e você é a administradora
 * dela: é o caminho de quem responde por mais de uma, como num grupo ou numa
 * holding. Não mistura nada com a empresa de agora, é outro espaço inteiro, e o
 * seletor no alto da lateral troca entre eles.
 */
function MEspaco({ fechar }: { fechar: () => void }) {
  const { abrirEspaco } = useDados()
  const [nome, setNome] = useState('')
  const [indo, setIndo] = useState(false)

  const criar = async () => {
    if (!nome.trim() || indo) return
    setIndo(true)
    await abrirEspaco(nome.trim(), 'equipe')
  }

  return (
    <div className="dlg" role="dialog" aria-modal="true" aria-labelledby="esp-t">
      <div className="dlg-h">
        <h3 id="esp-t">Abrir outra empresa</h3>
        <p>
          Ela nasce vazia, e você entra como administradora. Nada da empresa de agora
          vai junto: são espaços separados, e o seletor da lateral troca entre eles.
        </p>
      </div>
      <div className="dlg-b">
        <div className="fld">
          <label htmlFor="esp-nome">Nome da empresa</label>
          <input className="inp" id="esp-nome" value={nome} autoFocus placeholder="Ex.: Simoneto"
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void criar() }} />
          <p className="hint">Dá para trocar depois em Ajustes.</p>
        </div>
      </div>
      <Rodape fechar={fechar} rotulo={indo ? 'Abrindo…' : 'Abrir empresa'} acao={() => void criar()} />
    </div>
  )
}

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
    salvarFluxo, criarDoProcesso, salvarArea, toast } = useDados()
  const router = useRouter()
  const edicao = pedido.fluxo
  const ativos = perfis.filter((p) => p.ativo)

  const [tipo, setTipo] = useState<Tipo>(edicao?.tipo || pedido.tipoFluxo || 'esteira')
  /** Vazio é o campo fechado. Um espaço é o campo aberto e ainda em branco. */
  const [novaArea, setNovaArea] = useState('')
  const [criandoArea, setCriandoArea] = useState(false)
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
      router.push(`/tracks/${id}`)
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
    toast(edicao ? 'Alterações salvas.' : `${nome.trim()} criado. Agora monte a trilha.`)
    fechar()
    if (!edicao) router.push(`/tracks/${id}`)
  }

  const criarArea = async () => {
    const nome = novaArea.trim()
    if (!nome || criandoArea) return
    setCriandoArea(true)
    try {
      const a = await salvarArea({ nome, cor: CORES[areas.length % CORES.length] })
      if (a) { setAreaId(a.id); setNovaArea('') }
    } finally {
      setCriandoArea(false)
    }
  }

  return (
    <div className="dlg wide" role="dialog" aria-modal="true" aria-labelledby="mf">
      <div className="dlg-h">
        <h3 id="mf">{edicao ? 'Ajustes da track' : 'Criar track'}</h3>
        <p>{edicao ? 'Mudanças valem para todos que veem esta track.' : 'Defina o trabalho. Depois, desenhe a trilha.'}</p>
      </div>
      <div className="dlg-b mf">
        <div className="mf-form">
        {!edicao && (
          <div className="opt">
            <button className={`optc ${!ciclo ? 'on' : ''}`} onClick={() => trocarTipo('esteira')}>
              <span style={{ color: 'var(--ac)', marginTop: 2 }}><Ic.proj /></span>
              <span><b>Objetivo</b><small>{explicaTipo('esteira')}</small></span>
            </button>
            <button className={`optc ${ciclo ? 'on' : ''}`} onClick={() => trocarTipo('ciclo')}>
              <span style={{ color: 'var(--ac)', marginTop: 2 }}><Ic.ciclo /></span>
              <span><b>Rotina</b><small>{explicaTipo('ciclo')}</small></span>
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
            <select className="inp" id="f-area" value={novaArea ? '__nova' : (areaId || '')}
              onChange={(e) => {
                if (e.target.value === '__nova') { setNovaArea(' '); return }
                setNovaArea(''); setAreaId(e.target.value)
              }}>
              {/* Track sem área não é exceção: um negócio novo não tem frente
                  ainda, e inventar uma para ele caber é organizar antes de
                  entender. Vale para objetivo e para rotina. */}
              <option value="">Sem área</option>
              {areas.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
              <option value="__nova">+ Nova área</option>
            </select>
            {!!novaArea && (
              /* A área nasce aqui, e não numa tela à parte. Mandar a pessoa para
                 outro lugar no meio de criar uma track é perder o que ela já
                 digitou, e foi por isso que a tela de áreas sumiu do menu. */
              <div className="row-inline" style={{ marginTop: 8 }}>
                <input className="inp" autoFocus value={novaArea.trimStart()}
                  placeholder="Nome da área. Ex.: Financeiro"
                  aria-label="Nome da nova área"
                  onChange={(e) => setNovaArea(e.target.value || ' ')}
                  onKeyDown={(e) => { if (e.key === 'Enter') void criarArea() }} />
                <button className="btn" disabled={!novaArea.trim() || criandoArea}
                  onClick={() => void criarArea()}>Criar</button>
                <button className="btn ghost" onClick={() => setNovaArea('')}>Cancelar</button>
              </div>
            )}
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

        {/* A trilha que vai nascer, antes de nascer: é o que deixa conferir a
            escolha do processo sem criar a track para depois olhar. */}
        <aside className="mf-lado">
          <h4>Sua trilha inicial</h4>
          <p className="mf-de">
            {processo ? `A partir do processo ${processo.nome}` : 'Do zero, do jeito que você montar aqui.'}
          </p>
          <ol className="proc-trilho">
            {etapas.map((e, k) => (
              <li key={k}>
                <span className="n num">{k + 1}</span>
                <span>
                  <b>{e.nome || `Checkpoint ${k + 1}`}</b>
                  <small>
                    {nomeDe(e.aprovador_id)}{e.prazo ? ` · ${curta(e.prazo)}` : ''}
                  </small>
                </span>
              </li>
            ))}
          </ol>
          <p className="mf-nums">
            {etapas.length} {etapas.length === 1 ? 'checkpoint' : 'checkpoints'}
            {!!processo && <> · {processo.etapas.reduce((n, e) => n + e.itens.length, 0)} tarefas</>}
          </p>
          <p className="hint">
            {processo
              ? 'Os responsáveis serão definidos pelas áreas. Os prazos partem da data de início.'
              : 'Você poderá ajustar a trilha depois de criar.'}
          </p>
        </aside>
      </div>
      <Rodape fechar={fechar} acao={() => void salvar()}
        rotulo={edicao ? 'Salvar alterações' : 'Criar e abrir trilha'} />
    </div>
  )
}


// ------------------------------------------------------------------ avulsa

/**
 * Tarefa avulsa: a que não pertence a objetivo nem a rotina.
 *
 * Ela mora numa track privada de quem criou, com um checkpoint só. Parece um
 * rodeio, e é o contrário: assim ela herda de graça prazo, conclusão, histórico,
 * anexo e busca, em vez de virar uma segunda espécie de tarefa com metade das
 * regras. Quem usa não vê track nenhuma, vê "Avulsa".
 *
 * Privada de propósito. Tarefa que a empresa precisa acompanhar pertence a
 * alguma coisa; o que não pertence a nada é lembrete, e lembrete dos outros não
 * é assunto da casa. Para pedir algo a alguém existe a tarefa dentro da track,
 * que tem endereço e aprovação.
 */
function MAvulsa({ fechar }: { fechar: () => void }) {
  const { eu, perfis, fluxos, areaDe, minhaLista, pessoal,
    criarAvulsa, adicionarItem, toast } = useDados()
  const [texto, setTexto] = useState('')
  const [descricao, setDescricao] = useState('')
  const [prazo, setPrazo] = useState('')
  /** A primeira escolha: pertencer a quê. A segunda só existe depois dela. */
  const [onde, setOnde] = useState<'livre' | Tipo>('livre')
  const [ondeId, setOndeId] = useState('')
  const [etapaId, setEtapaId] = useState('')
  const [resp, setResp] = useState(eu.id)
  const [indo, setIndo] = useState(false)

  const ativos = perfis.filter((p) => p.ativo)
  // A lista pessoal não entra: ela É o "livre", e aparecer como opção faria a
  // mesma escolha existir duas vezes com nomes diferentes.
  const tracks = fluxos.filter((f) => !f.concluido && f.id !== minhaLista?.id && f.etapas.length)
  const doTipo = onde === 'livre' ? [] : tracks.filter((f) => f.tipo === onde)
  // Sem escolha explícita vale a primeira da lista: o campo nunca fica num
  // estado em que a pessoa escolheu "objetivo" e não há objetivo nenhum selecionado.
  const track = onde === 'livre' ? null : (doTipo.find((f) => f.id === ondeId) || doTipo[0] || null)
  const etapa = track?.etapas.find((e) => e.id === etapaId) || track?.etapas[track.atual] || null

  const salvar = async () => {
    if (!texto.trim()) { toast('Escreva o que precisa ser feito.', true); return }
    setIndo(true)
    try {
      if (track && etapa) {
        const novo = await adicionarItem(etapa, {
          texto: texto.trim(), descricao, resp_id: resp, prazo, priv: false, firme: false,
        })
        if (novo) fechar()
        return
      }
      // Livre: a lista pessoal nasce na primeira, e não no cadastro. Quem nunca
      // criou uma não precisa de uma track vazia no nome dele.
      if (await criarAvulsa(texto, prazo, descricao)) fechar()
    } finally {
      setIndo(false)
    }
  }

  return (
    <div className="dlg" role="dialog" aria-modal="true" aria-labelledby="mav">
      <div className="dlg-h">
        <h3 id="mav">Nova tarefa</h3>
        <p>Ela pode viver dentro de um objetivo, de uma rotina, ou sozinha.</p>
      </div>
      <div className="dlg-b">
        <div className="fld">
          <label htmlFor="av-t">O que precisa ser feito</label>
          <input className="inp" id="av-t" value={texto} autoFocus
            placeholder="Ex.: Conferir os documentos do fornecedor"
            onChange={(e) => setTexto(e.target.value)} />
        </div>

        <div className="fld">
          <label htmlFor="av-d">Descrição</label>
          <textarea className="inp" id="av-d" rows={3} value={descricao}
            placeholder="O que quem for fazer precisa saber e não cabe no título."
            onChange={(e) => setDescricao(e.target.value)} />
          <p className="hint">Opcional. Tarefa que se explica no título não precisa disto.</p>
        </div>

        <div className="fld">
          <span className="lbl">Onde ela vive</span>
          {/* A escolha é entre pertencer e não pertencer, e ela muda quem vê a
              tarefa: dentro de uma track ela é da equipe, livre ela é só sua.
              Por isso a frase abaixo troca junto com a escolha.

              Duas escolhas em vez de uma lista só: primeiro a que muda o
              significado, depois qual. Uma lista misturando "Livre" com trinta
              tracks obriga a ler trinta linhas para achar a única que não é
              track. */}
          <div className="seg" role="group" aria-label="Onde a tarefa vive">
            <button className={onde === 'livre' ? 'on' : ''}
              onClick={() => { setOnde('livre'); setOndeId(''); setEtapaId('') }}>Livre</button>
            <button className={onde === 'esteira' ? 'on' : ''}
              onClick={() => { setOnde('esteira'); setOndeId(''); setEtapaId('') }}>Objetivo</button>
            <button className={onde === 'ciclo' ? 'on' : ''}
              onClick={() => { setOnde('ciclo'); setOndeId(''); setEtapaId('') }}>Rotina</button>
          </div>
          <p className="hint">
            {onde === 'livre'
              ? 'Ela não pertence a nada e só você enxerga. Não conta para checkpoint nenhum.'
              : 'Ela entra na trilha, conta para a saída do checkpoint e a equipe enxerga.'}
          </p>
        </div>

        {onde !== 'livre' && (
          <div className="fld">
            <label htmlFor="av-onde">Qual {rotuloTipo(onde).toLowerCase()}</label>
            {doTipo.length ? (
              <select className="inp" id="av-onde" value={track?.id || ''}
                onChange={(e) => { setOndeId(e.target.value); setEtapaId('') }}>
                {doTipo.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome}{f.area_id ? ` · ${areaDe(f.area_id).nome}` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <p className="hint">
                Não existe {rotuloTipo(onde).toLowerCase()} em andamento ainda. Crie{' '}
                {onde === 'ciclo' ? 'uma' : 'um'} em Tracks, ou deixe a tarefa livre por enquanto.
              </p>
            )}
          </div>
        )}

        {track && (
          <div className="fgrid">
            <div className="fld">
              <label htmlFor="av-e">Checkpoint</label>
              <select className="inp" id="av-e" value={etapa?.id || ''}
                onChange={(e) => setEtapaId(e.target.value)}>
                {track.etapas.map((e, k) => (
                  <option key={e.id} value={e.id}>
                    {k + 1}. {e.nome}{k === track.atual ? ' (o da vez)' : ''}
                  </option>
                ))}
              </select>
            </div>
            {!pessoal && (
              <div className="fld">
                <label htmlFor="av-r">Responsável</label>
                <select className="inp" id="av-r" value={resp}
                  onChange={(e) => setResp(e.target.value)}>
                  {ativos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
            )}
          </div>
        )}

        <div className="fld">
          <label htmlFor="av-p">Prazo</label>
          <input className="inp" id="av-p" type="date" value={prazo}
            onChange={(e) => setPrazo(e.target.value)} />
          <p className="hint">
            Sem prazo ela fica em &quot;mais adiante&quot;, e não entra em aviso nenhum.
          </p>
        </div>
      </div>
      <Rodape fechar={fechar} acao={() => void salvar()}
        rotulo={indo ? 'Um instante...' : 'Criar tarefa'} />
    </div>
  )
}

// ------------------------------------------------------------------- item


function MItem({ etapa, item, fechar }: { etapa: Etapa; item?: Item; fechar: () => void }) {
  const { eu, perfis, fluxos, areaDe, pessoal, adicionarItem, editarItem, definirTravas, cargaDe, toast } = useDados()
  const ativos = perfis.filter((p) => p.ativo)
  const fluxo = fluxos.find((f) => f.id === etapa.fluxo_id)
  const mandaNoPrazo = !!fluxo && podeMexerNoPrazo(eu, fluxo, perfis)

  const [texto, setTexto] = useState(item?.texto || '')
  const [descricao, setDescricao] = useState(item?.descricao || '')
  const [resp, setResp] = useState(item?.resp_id || eu.id)
  const [prazo, setPrazo] = useState(
    item?.prazo || (etapa.prazo && dias(etapa.prazo) >= 0 ? etapa.prazo : ''),
  )
  const [priv, setPriv] = useState(!!item?.priv)
  const [firme, setFirme] = useState(!!item?.prazo_firme)
  const [avisando, setAvisando] = useState(false)
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

  /** Mudou a data de uma tarefa que já existe: o efeito passa pelo aviso. */
  const mexeuNoPrazo = !!item && !!prazo && prazo !== (item.prazo || '') && !item.prazo_firme

  const gravarResto = async () => {
    if (!item) return
    await editarItem(item, {
      texto: texto.trim(), descricao, resp_id: resp, prazo, priv, firme, quieto: true,
    })
    if (JSON.stringify(travas) !== JSON.stringify(item.depende_de)) await definirTravas(item, travas)
  }

  const salvar = async () => {
    // Botão que não faz nada é pior que botão desabilitado: a pessoa clica de
    // novo achando que o clique não pegou. Diz o que falta.
    if (!texto.trim()) { toast('Escreva o que precisa ser feito.', true); return }
    // O aviso vem antes de gravar qualquer coisa: quem vai mexer numa data
    // precisa ver o que ela arrasta antes de arrastar.
    if (mexeuNoPrazo) { setAvisando(true); return }
    const d = { texto: texto.trim(), descricao, resp_id: resp, prazo, priv, firme }
    if (item) {
      await editarItem(item, d)
      if (JSON.stringify(travas) !== JSON.stringify(item.depende_de)) await definirTravas(item, travas)
    } else {
      const novo = await adicionarItem(etapa, d)
      // Falhou: a janela fica aberta com o que foi digitado. Fechar em cima do
      // erro apaga o trabalho da pessoa e esconde o aviso no mesmo movimento.
      if (!novo) return
      if (travas.length) await definirTravas({ id: novo } as Item, travas)
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
        <div className="fld">
          <label htmlFor="i-d">Descrição</label>
          <textarea className="inp" id="i-d" rows={3} value={descricao}
            placeholder="O que quem for fazer precisa saber e não cabe no título."
            onChange={(e) => setDescricao(e.target.value)} />
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
          {!pessoal && resp !== item?.resp_id && (() => {
            const c = cargaDe(resp)
            if (!c || c.faixa === 'tranquilo' || c.faixa === 'sem-base') return null
            return (
              <p className={`aviso-carga ${c.faixa}`}>
                <Ic.espera />
                <span>
                  <b>{c.pessoa.nome}: {FAIXAS[c.faixa].nome.toLowerCase()}</b>
                  {' '}({c.indice} de 100). {porque(c)}.
                  {c.faixa === 'sobrecarregado'
                    ? ' Vale ver se não cabe em outra pessoa.'
                    : ' Dá, mas sem folga para imprevisto.'}
                </span>
              </p>
            )
          })()}

          <div className="fld">
            <label htmlFor="i-p">Prazo</label>
            <input className="inp" type="date" id="i-p" value={prazo} disabled={!mandaNoPrazo}
              onChange={(e) => setPrazo(e.target.value)} />
            {!mandaNoPrazo && (
              <p className="hint">Prazo é compromisso com quem espera. Só quem responde pelo processo muda.</p>
            )}
            {mandaNoPrazo && (
              <label className="marca-firme">
                <input type="checkbox" checked={firme} onChange={(e) => setFirme(e.target.checked)} />
                <span>
                  <b>Data firme</b>
                  <small>
                    Prazo legal, data de cliente, evento marcado. Quando o que vem antes atrasa,
                    esta data não anda: alguém tem que dar um jeito.
                  </small>
                </span>
              </label>
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

      {avisando && item && (
        <AvisoPrazo
          item={item}
          novo={prazo}
          fechar={() => setAvisando(false)}
          aoConfirmar={async () => { await gravarResto(); fechar() }}
        />
      )}
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
          <label htmlFor="c-fluxo">Track</label>
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

/**
 * O formulário do agente.
 *
 * Duas perguntas, e a ordem importa: primeiro o que reconhecer, depois o que
 * fazer. Quem escreve um agente está pensando na situação que o incomoda, não na
 * ação: a ação é consequência.
 */
function MAgente({ pedido, fechar }: { pedido: Extract<Pedido, { tipo: 'agente' }>; fechar: () => void }) {
  const { processos, areas, canais, conectores, salvarAgente } = useDados()
  const a = pedido.agente

  const [nome, setNome] = useState(a?.nome || pedido.inicial?.nome || '')
  const [reconhecer, setReconhecer] = useState(a?.reconhecer || pedido.inicial?.reconhecer || '')
  const [onde, setOnde] = useState<'tudo' | 'canal' | 'area'>(
    a?.canal_id ? 'canal' : a?.area_id ? 'area' : 'tudo',
  )
  const [canalId, setCanalId] = useState(a?.canal_id || '')
  const [areaOuvida, setAreaOuvida] = useState(a?.area_id || areas[0]?.id || '')
  const [faz, setFaz] = useState<Agente['faz']>(a?.faz || 'tarefa')
  const [processoId, setProcessoId] = useState(a?.processo_id || processos[0]?.id || '')
  const [tarefaTexto, setTarefaTexto] = useState(a?.tarefa_texto || '')
  const [tarefaArea, setTarefaArea] = useState(a?.tarefa_area_id || areas[0]?.id || '')
  const [url, setUrl] = useState(a?.url || '')
  const [conectorId, setConectorId] = useState(a?.conector_id || '')
  const [caminho, setCaminho] = useState(a?.caminho || '')
  const [corpo, setCorpo] = useState(a?.corpo || '')

  // Ao escolher um conector novo, o caminho e o corpo do molde já vêm prontos, se
  // a pessoa ainda não escreveu nada. Se escreveu, o que ela escreveu manda.
  const escolherConector = (id: string) => {
    setConectorId(id)
    const c = conectores.find((x) => x.id === id)
    const m = c && MOLDES.find((x) => servico(c).includes(x.id))
    if (m && !caminho) setCaminho(m.caminho)
    if (m && !corpo) setCorpo(m.corpo)
  }

  const salvar = async () => {
    await salvarAgente({
      id: a?.id,
      nome, reconhecer, ativo: a?.ativo ?? true,
      canal_id: onde === 'canal' ? canalId || null : null,
      area_id: onde === 'area' ? areaOuvida || null : null,
      faz,
      processo_id: faz === 'processo' ? processoId || null : null,
      tarefa_texto: faz === 'tarefa' ? tarefaTexto : '',
      tarefa_area_id: faz === 'tarefa' ? tarefaArea || null : null,
      url: faz === 'webhook' ? url : '',
      conector_id: faz === 'conector' ? conectorId || null : null,
      caminho: faz === 'conector' ? caminho : '',
      corpo: faz === 'conector' ? corpo : '',
    })
    fechar()
  }

  return (
    <div className="dlg wide" role="dialog" aria-modal="true" aria-labelledby="mag">
      <div className="dlg-h">
        <h3 id="mag">{a ? 'Editar agente' : 'Novo agente'}</h3>
        <p>O que reconhecer na conversa, e o que propor quando reconhecer.</p>
      </div>
      <div className="dlg-b">
        <div className="fld">
          <label htmlFor="ag-n">Nome do agente</label>
          <input className="inp" id="ag-n" value={nome} onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: Cliente reclamou" />
        </div>

        <div className="fld">
          <label htmlFor="ag-r">Dispare quando</label>
          <textarea className="inp" id="ag-r" rows={2} value={reconhecer}
            onChange={(e) => setReconhecer(e.target.value)}
            placeholder="Ex.: um cliente reclamou de atraso, de qualidade ou de cobrança" />
          <p className="hint">
            Escreva a situação, não a palavra. O modelo julga o sentido: uma frase como
            &quot;o cliente ligou irritado com a entrega&quot; entra nessa descrição mesmo
            sem a palavra reclamação aparecer.
          </p>
        </div>

        <div className="fld">
          <span className="lbl">Escuta onde</span>
          <div className="tpls">
            <button className={`tpl ${onde === 'tudo' ? 'on' : ''}`} onClick={() => setOnde('tudo')}>
              Todos os canais
            </button>
            <button className={`tpl ${onde === 'area' ? 'on' : ''}`} onClick={() => setOnde('area')}>
              Os canais de uma área
            </button>
            <button className={`tpl ${onde === 'canal' ? 'on' : ''}`} onClick={() => setOnde('canal')}>
              Um canal só
            </button>
          </div>
          {onde === 'area' && (
            <select className="inp" style={{ marginTop: 8 }} value={areaOuvida}
              onChange={(e) => setAreaOuvida(e.target.value)}>
              {areas.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
            </select>
          )}
          {onde === 'canal' && (
            <select className="inp" style={{ marginTop: 8 }} value={canalId}
              onChange={(e) => setCanalId(e.target.value)}>
              <option value="">Escolha o canal</option>
              {canais.filter((c) => c.tipo !== 'direto').map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          )}
        </div>

        <div className="fld">
          <span className="lbl">E então propõe</span>
          <div className="tpls">
            <button className={`tpl ${faz === 'tarefa' ? 'on' : ''}`} onClick={() => setFaz('tarefa')}>
              Uma tarefa numa área
            </button>
            <button className={`tpl ${faz === 'processo' ? 'on' : ''}`} onClick={() => setFaz('processo')}
              disabled={!processos.length}>
              Abrir um processo inteiro
            </button>
            <button className={`tpl ${faz === 'conector' ? 'on' : ''}`} onClick={() => setFaz('conector')}
              disabled={!conectores.length}>
              Chamar um conector
            </button>
            <button className={`tpl ${faz === 'webhook' ? 'on' : ''}`} onClick={() => setFaz('webhook')}>
              Avisar um endereço solto
            </button>
          </div>
        </div>

        {faz === 'tarefa' && (
          <>
            <div className="fld">
              <label htmlFor="ag-t">A tarefa</label>
              <input className="inp" id="ag-t" value={tarefaTexto}
                onChange={(e) => setTarefaTexto(e.target.value)}
                placeholder="Ex.: Ligar para o cliente em até 24 horas" />
            </div>
            <div className="fld">
              <label htmlFor="ag-ta">Em qual área</label>
              <select className="inp" id="ag-ta" value={tarefaArea}
                onChange={(e) => setTarefaArea(e.target.value)}>
                {areas.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
              </select>
              <p className="hint">
                Ela cai na esteira daquela área e no responsável padrão dela.
              </p>
            </div>
          </>
        )}

        {faz === 'processo' && (
          <div className="fld">
            <label htmlFor="ag-p">Qual processo</label>
            <select className="inp" id="ag-p" value={processoId}
              onChange={(e) => setProcessoId(e.target.value)}>
              {processos.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
            </select>
            <p className="hint">
              A esteira nasce <b>distribuída pelas áreas do processo</b>: a área de cada
              checkpoint vira quem aprova, e a área de cada tarefa vira quem faz. É assim que
              uma situação atravessa dois ou três setores sem ninguém encaminhar nada à mão.
            </p>
          </div>
        )}

        {faz === 'conector' && (
          <>
            <div className="fld">
              <label htmlFor="ag-c">Qual conector</label>
              <select className="inp" id="ag-c" value={conectorId}
                onChange={(e) => escolherConector(e.target.value)}>
                <option value="">Escolha o conector</option>
                {conectores.filter((c) => c.ativo).map((c) => (
                  <option key={c.id} value={c.id}>{c.nome} ({servico(c)})</option>
                ))}
              </select>
              <p className="hint">
                A chave fica guardada no conector, cifrada. Ela não passa por aqui e não
                aparece em tela nenhuma depois de salva.
              </p>
            </div>
            <div className="fld">
              <label htmlFor="ag-cm">O que chamar lá</label>
              <input className="inp" id="ag-cm" value={caminho}
                onChange={(e) => setCaminho(e.target.value)} placeholder="Ex.: emails" />
              <p className="hint">
                É o pedaço depois do endereço do serviço. Nos serviços da lista isto já vem
                preenchido.
              </p>
            </div>
            <div className="fld">
              <label htmlFor="ag-cb">O que mandar</label>
              <textarea className="inp mono" id="ag-cb" rows={4} value={corpo}
                onChange={(e) => setCorpo(e.target.value)} />
              <p className="hint">
                <code>{'{{situacao}}'}</code> vira o trecho da conversa que disparou o agente e{' '}
                <code>{'{{agente}}'}</code> vira o nome dele. <b>Isto não desfaz</b>: a chamada,
                uma vez feita, foi feita.
              </p>
            </div>
          </>
        )}

        {faz === 'webhook' && (
          <div className="fld">
            <label htmlFor="ag-u">Endereço que recebe o aviso</label>
            <input className="inp" id="ag-u" value={url} onChange={(e) => setUrl(e.target.value)}
              placeholder="https://hooks.exemplo.com/..." />
            <p className="hint">
              Precisa ser <b>https</b> e público. O aviso sai do servidor do Track, com o nome
              do agente e o trecho da conversa, e é por aqui que dá para ligar o Track no
              Zapier, no Make, no n8n ou no sistema que a sua TI já tem. <b>Isto não desfaz</b>:
              o aviso, uma vez enviado, saiu.
            </p>
          </div>
        )}
      </div>
      <Rodape fechar={fechar} rotulo={a ? 'Salvar agente' : 'Criar agente'} acao={() => void salvar()} />
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
