'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useDados } from '@/componentes/Dados'
import { useModais } from '@/componentes/Modais'
import { Carregando } from '@/componentes/Shell'
import { Trilho, type Faixa, type EstadoNo, type NoTrilho } from '@/componentes/Trilho'
import { Ic } from '@/componentes/Icones'
import { Av, IconeStatus } from '@/componentes/atomos'
import { classePrazo } from '@/componentes/partes'
import { mandaNoProcesso, podeConcluir } from '@/lib/acesso'
import { LBL, ORD, etapaAtual, progresso, status } from '@/lib/regras'
import { curta, isoDe, rel } from '@/lib/datas'
import type { RascunhoEtapa } from '@/lib/modelos'
import type { Area, Etapa, Fluxo } from '@/lib/tipos'

/**
 * Tracks: tudo que a empresa acompanha, num lugar só.
 *
 * A lateral do app deixou de listar projeto por projeto e área por área. Aqui
 * dentro é que estão os dois, lado a lado, e a track escolhida abre em trilha
 * cheia, do gatilho ao fim.
 *
 * Projeto é uma corrida com linha de chegada, então tem uma faixa. Área se
 * repete, então tem uma faixa por rotina, que é o que ela de fato acompanha.
 */

const semAcento = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** O estado de um checkpoint depende de onde a esteira está agora. */
function estadoDa(f: Fluxo, i: number): EstadoNo {
  if (f.travado_motivo && i === f.atual) return 'travado'
  if (f.concluido || i < f.atual) return 'feito'
  if (i === f.atual) return 'vez'
  return 'futuro'
}

// ---------------------------------------------------------------- lateral

function Lista({ atual, aoNovo }: { atual?: string; aoNovo: (t: 'projeto' | 'area') => void }) {
  const { fluxos, areas, todosFluxos } = useDados()
  const [busca, setBusca] = useState('')

  const projetos = useMemo(
    () => fluxos.filter((f) => f.tipo === 'esteira').sort((a, b) => ORD[status(a)] - ORD[status(b)]),
    [fluxos],
  )

  const filtrar = <T extends { nome: string }>(lista: T[]) => {
    const q = semAcento(busca.trim())
    return q ? lista.filter((x) => semAcento(x.nome).includes(q)) : lista
  }

  const grupos: { rotulo: string; itens: { id: string; nome: string; sub: string; marca: React.ReactNode }[] }[] = [
    {
      rotulo: 'Projetos',
      itens: filtrar(projetos).map((f) => ({
        id: f.id,
        nome: f.nome,
        sub: f.concluido ? 'Concluído' : etapaAtual(f)?.nome || LBL[status(f)],
        marca: <IconeStatus st={status(f)} p={progresso(f)} />,
      })),
    },
    {
      rotulo: 'Áreas',
      itens: filtrar(areas).map((a: Area) => {
        const rotinas = todosFluxos.filter((f) => f.area_id === a.id && f.tipo === 'ciclo')
        const tarde = rotinas.filter((f) => status(f) === 'late').length
        return {
          id: a.id,
          nome: a.nome,
          sub: rotinas.length
            ? `${rotinas.length} ${rotinas.length === 1 ? 'rotina' : 'rotinas'}${tarde ? `, ${tarde} atrasada${tarde === 1 ? '' : 's'}` : ''}`
            : 'Sem rotina ainda',
          marca: <span className="pdot"><span className="sdot" style={{ background: a.cor }} /></span>,
        }
      }),
    },
  ].filter((g) => g.itens.length)

  return (
    <aside className="tk-lista">
      <div className="tk-lista-topo">
        <b>Tracks</b>
      </div>
      <div className="tk-busca">
        <Ic.lupa />
        <input value={busca} onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar track" aria-label="Buscar track" />
      </div>

      <div className="tk-rolagem">
        {grupos.map((g) => (
          <div key={g.rotulo}>
            <div className="tk-grupo">{g.rotulo}</div>
            {g.itens.map((i) => (
              <Link key={i.id} href={`/tracks/${i.id}`}
                className={`tk-item ${atual === i.id ? 'on' : ''}`}>
                <span className="mk">{i.marca}</span>
                <span className="txt">
                  <b>{i.nome}</b>
                  <span>{i.sub}</span>
                </span>
              </Link>
            ))}
          </div>
        ))}
        {!grupos.length && (
          <div className="mode" style={{ padding: '10px 12px' }}>
            {busca ? 'Nada com esse nome.' : 'Nenhuma track ainda.'}
          </div>
        )}
      </div>

      <div className="tk-lista-pe">
        <button className="btn" onClick={() => aoNovo('projeto')}><Ic.plus />Novo projeto</button>
        <button className="btn ghost" onClick={() => aoNovo('area')}><Ic.plus />Nova área</button>
      </div>
    </aside>
  )
}

// -------------------------------------------------------------- inspetor

function Inspetor({ f, et, fechar, gravar, abrirEmEdicao }: {
  f: Fluxo
  et: Etapa
  fechar: () => void
  gravar: (etapas: RascunhoEtapa[]) => Promise<void>
  abrirEmEdicao: boolean
}) {
  const { nomeDe, perfilDe, perfis, eu, alternarItem } = useDados()
  const { abrir } = useModais()
  const feitas = et.itens.filter((i) => i.feito).length

  // Quem executa não mexe em prazo nem em critério: quem responde pelo processo é
  // que define a régua. Sem isso, a trava do app cairia na primeira discussão.
  const mando = mandaNoProcesso(eu, f, perfis)
  const [editando, setEditando] = useState(abrirEmEdicao)
  const [nome, setNome] = useState(et.nome)
  const [criterio, setCriterio] = useState(et.criterio)
  const [aprov, setAprov] = useState(et.aprovador_id || '')
  const [prazo, setPrazo] = useState(et.prazo || '')
  const [salvando, setSalvando] = useState(false)

  const lugar = f.etapas.findIndex((e) => e.id === et.id)
  const rascunho = (): RascunhoEtapa[] => f.etapas.map((e) => ({
    id: e.id, nome: e.nome, criterio: e.criterio, aprovador_id: e.aprovador_id, prazo: e.prazo || '',
  }))

  const salvar = async () => {
    if (!nome.trim()) return
    setSalvando(true)
    const etapas = rascunho()
    etapas[lugar] = { ...etapas[lugar], nome: nome.trim(), criterio: criterio.trim(), aprovador_id: aprov || null, prazo }
    await gravar(etapas)
    setSalvando(false)
    setEditando(false)
  }

  const mover = async (d: number) => {
    const etapas = rascunho()
    const k = lugar + d
    if (k < 0 || k >= etapas.length) return
    ;[etapas[k], etapas[lugar]] = [etapas[lugar], etapas[k]]
    await gravar(etapas)
  }

  const remover = () => abrir({
    tipo: 'excluir',
    titulo: `Apagar o checkpoint ${et.nome}?`,
    texto: et.itens.length
      ? `As ${et.itens.length} tarefas dele saem junto. Isto não volta.`
      : 'Isto não volta.',
    acao: async () => { await gravar(rascunho().filter((_, i) => i !== lugar)); fechar() },
  })

  if (editando) return (
    <div className="tk-inspetor">
      <div className="tk-insp-h">
        <div>
          <span className="rot">Checkpoint</span>
          <input className="tk-in grande" value={nome} onChange={(e) => setNome(e.target.value)}
            placeholder="Nome do checkpoint" aria-label="Nome do checkpoint" autoFocus />
        </div>
      </div>

      <div className="tk-campos">
        <label>
          <span>Só passa quando</span>
          <textarea className="tk-in" rows={2} value={criterio}
            onChange={(e) => setCriterio(e.target.value)}
            placeholder="O que precisa estar pronto para seguir" />
        </label>
        <label>
          <span>Quem aprova</span>
          <select className="tk-in" value={aprov} onChange={(e) => setAprov(e.target.value)}>
            <option value="">Ninguém</option>
            {perfis.filter((x) => x.ativo).map((x) => (
              <option key={x.id} value={x.id}>{x.nome}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Prazo</span>
          <input className="tk-in" type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
        </label>
      </div>

      <div className="tk-ordem">
        <button className="btn ghost" onClick={() => void mover(-1)} disabled={lugar <= 0}>
          <Ic.volta />Antes
        </button>
        <button className="btn ghost" onClick={() => void mover(1)} disabled={lugar >= f.etapas.length - 1}>
          Depois<Ic.seta />
        </button>
        <button className="btn ghost perigo" onClick={remover} aria-label="Apagar checkpoint"><Ic.x /></button>
      </div>

      <div className="tk-insp-pe">
        <button className="btn pri" onClick={() => void salvar()} disabled={!nome.trim() || salvando}>
          {salvando ? 'Salvando' : 'Salvar'}
        </button>
        <button className="btn ghost" onClick={() => setEditando(false)}>Cancelar</button>
      </div>
    </div>
  )

  return (
    <div className="tk-inspetor">
      <div className="tk-insp-h">
        <div>
          <span className="rot">Checkpoint</span>
          <b>{et.nome}</b>
        </div>
        {mando && (
          <button className="iconbtn" onClick={() => setEditando(true)}
            aria-label="Editar checkpoint" title="Editar checkpoint"><Ic.edit /></button>
        )}
        <button className="iconbtn" onClick={fechar} aria-label="Fechar"><Ic.x /></button>
      </div>

      {!!et.criterio && (
        <p className="tk-criterio"><span>Só passa quando</span>{et.criterio}</p>
      )}

      <div className="tk-insp-meta">
        <span><Ic.check />{feitas} de {et.itens.length} pronta{et.itens.length === 1 ? '' : 's'}</span>
        {et.aprovador_id && <span><Ic.eu />Aprova {nomeDe(et.aprovador_id)}</span>}
        {et.prazo && <span className={classePrazo(et.prazo)}><Ic.agenda />{curta(et.prazo)}</span>}
      </div>

      <div className="tk-tarefas">
        {et.itens.map((i) => {
          const posso = podeConcluir(eu, f, i, perfis)
          return (
          <div key={i.id} className={`tk-tarefa ${i.feito ? 'feita' : ''}`}>
            {posso ? (
              <button className="mk" onClick={() => void alternarItem(i)}
                aria-pressed={i.feito} aria-label={i.feito ? 'Reabrir tarefa' : 'Concluir tarefa'}>
                {i.feito ? <Ic.check /> : <span className="oco" />}
              </button>
            ) : (
              <span className="mk">{i.feito ? <Ic.check /> : <span className="oco" />}</span>
            )}
            <span className="txt">{i.texto}</span>
            {i.resp_id && <Av p={perfilDe(i.resp_id)} tam="sm" />}
            {i.prazo && <i className={classePrazo(i.prazo)}>{curta(i.prazo)}</i>}
          </div>
          )
        })}
        {!et.itens.length && <div className="mode">Nenhuma tarefa neste checkpoint.</div>}
      </div>

      <div className="tk-insp-pe">
        <button className="btn" onClick={() => abrir({ tipo: 'item', etapa: et })}>
          <Ic.plus />Nova tarefa
        </button>
        <Link className="btn ghost" href={`/fluxo/${f.id}`}>Abrir a track<Ic.seta /></Link>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------- palco

function Palco({ alvo }: { alvo: { tipo: 'projeto'; f: Fluxo } | { tipo: 'area'; a: Area } }) {
  const { todosFluxos, perfilDe, nomeDe, areaDe, empresaDe, org, eu, perfis, salvarFluxo } = useDados()
  const { abrir } = useModais()
  const [noEscolhido, setNoEscolhido] = useState<string | null>(null)
  const [recemCriado, setRecemCriado] = useState(false)
  const esperando = useRef(false)

  /** Uma gravação só: o RPC recebe a esteira inteira com a fila nova de checkpoints. */
  const gravar = async (f: Fluxo, etapas: RascunhoEtapa[]) => {
    await salvarFluxo({
      id: f.id, tipo: f.tipo, nome: f.nome, area_id: f.area_id, empresa_id: f.empresa_id,
      dono_id: f.dono_id, visib: f.visib, pessoas: f.pessoas, freq: f.freq, periodo: f.periodo,
    }, etapas)
  }

  const acrescentar = async (f: Fluxo) => {
    esperando.current = true
    await gravar(f, [
      ...f.etapas.map((e) => ({
        id: e.id, nome: e.nome, criterio: e.criterio, aprovador_id: e.aprovador_id, prazo: e.prazo || '',
      })),
      { id: null, nome: 'Novo checkpoint', criterio: '', aprovador_id: eu.id, prazo: '' },
    ])
  }

  // O id do checkpoint novo só existe depois que o banco responde. Quando ele
  // chega, o painel abre nele já em edição, para ninguém ter que caçar o card.
  const fluxoAtual = alvo.tipo === 'projeto' ? alvo.f : null
  const ultimo = fluxoAtual?.etapas[fluxoAtual.etapas.length - 1]?.id
  useEffect(() => {
    if (!esperando.current || !ultimo) return
    esperando.current = false
    setNoEscolhido(ultimo)
    setRecemCriado(true)
  }, [ultimo])

  const rotinas = useMemo(
    () => alvo.tipo === 'area'
      ? todosFluxos.filter((f) => f.area_id === alvo.a.id && f.tipo === 'ciclo')
        .sort((x, y) => ORD[status(x)] - ORD[status(y)])
      : [],
    [alvo, todosFluxos],
  )

  /** Um fluxo vira uma faixa: partida, os checkpoints, chegada. */
  const daFluxo = (f: Fluxo, comNome: boolean): Faixa => {
    const nos: NoTrilho[] = [{
      id: `${f.id}:inicio`,
      tipo: 'inicio',
      nome: f.tipo === 'ciclo' ? 'Toda volta' : 'Início',
      sub: f.tipo === 'ciclo' ? (f.periodo || '') : (f.criado_em ? curta(isoDe(f.criado_em)) : ''),
      estado: 'feito',
    }]

    f.etapas.forEach((et, i) => {
      const gente = [...new Set(et.itens.map((x) => x.resp_id).filter(Boolean) as string[])]
      nos.push({
        id: et.id,
        tipo: 'etapa',
        nome: et.nome,
        sub: et.aprovador_id ? `Aprova ${nomeDe(et.aprovador_id).split(' ')[0]}` : et.criterio,
        estado: estadoDa(f, i),
        tarefas: et.itens.length,
        feitas: et.itens.filter((x) => x.feito).length,
        gente: gente.map(perfilDe),
        atrasado: !!et.prazo && classePrazo(et.prazo) === 'late' && i >= f.atual,
      })
    })

    nos.push({
      id: `${f.id}:fim`,
      tipo: 'fim',
      nome: 'Fim',
      sub: f.concluido ? 'Entregue' : '',
      estado: f.concluido ? 'feito' : 'futuro',
    })

    const emp = org.multi ? empresaDe(f.empresa_id)?.nome : null
    return {
      id: f.id,
      nome: comNome ? f.nome : undefined,
      sub: comNome ? [emp, LBL[status(f)]].filter(Boolean).join(' · ') : undefined,
      nos,
    }
  }

  const faixas = useMemo(
    () => alvo.tipo === 'projeto' ? [daFluxo(alvo.f, false)] : rotinas.map((f) => daFluxo(f, true)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [alvo, rotinas],
  )

  /** Do id do nó de volta para o checkpoint e o fluxo dele. */
  const achado = useMemo(() => {
    if (!noEscolhido) return null
    const candidatos = alvo.tipo === 'projeto' ? [alvo.f] : rotinas
    for (const f of candidatos) {
      const et = f.etapas.find((e) => e.id === noEscolhido)
      if (et) return { f, et }
    }
    return null
  }, [noEscolhido, alvo, rotinas])

  const cab = alvo.tipo === 'projeto'
    ? {
      nome: alvo.f.nome,
      sub: alvo.f.area_id ? areaDe(alvo.f.area_id).nome : 'Sem área',
      st: status(alvo.f),
      dono: alvo.f.dono_id,
      pct: Math.round(progresso(alvo.f) * 100),
      voltas: alvo.f.voltas.length,
      criado: alvo.f.criado_em,
    }
    : {
      nome: alvo.a.nome,
      sub: `${rotinas.length} ${rotinas.length === 1 ? 'rotina' : 'rotinas'}`,
      st: null,
      dono: alvo.a.responsavel_id,
      pct: null,
      voltas: null,
      criado: null,
    }

  return (
    <section className="tk-palco">
      <header className="tk-topo">
        <Link className="iconbtn so-celular" href="/tracks" aria-label="Voltar"><Ic.volta /></Link>
        <div className="tk-titulo">
          <b>{cab.nome}</b>
          <span>{cab.sub}</span>
        </div>
        <div className="tk-acoes">
          {alvo.tipo === 'projeto' ? (
            <>
              <button className="btn ghost" onClick={() => abrir({ tipo: 'fluxo', fluxo: alvo.f })}>
                <Ic.ajustes />Ajustes da track
              </button>
              <Link className="btn pri" href={`/fluxo/${alvo.f.id}`}>Abrir<Ic.seta /></Link>
            </>
          ) : (
            <>
              <button className="btn ghost"
                onClick={() => abrir({ tipo: 'fluxo', tipoFluxo: 'ciclo', areaId: alvo.a.id })}>
                <Ic.plus />Nova rotina
              </button>
              <Link className="btn pri" href={`/area/${alvo.a.id}`}>Abrir<Ic.seta /></Link>
            </>
          )}
        </div>
      </header>

      <div className="tk-selos">
        {cab.st && <span className={`selo ${cab.st}`}>{LBL[cab.st]}</span>}
        {cab.dono && (
          <span className="tk-selo"><Av p={perfilDe(cab.dono)} tam="sm" />{nomeDe(cab.dono)}</span>
        )}
        {cab.pct !== null && <span className="tk-selo"><Ic.check />{cab.pct}% da trilha</span>}
        {!!cab.voltas && <span className="tk-selo"><Ic.ciclo />{cab.voltas} voltas</span>}
        {cab.criado && <span className="tk-selo"><Ic.agenda />Criada {rel(isoDe(cab.criado))}</span>}
      </div>

      <div className="tk-quadro">
        <Trilho
          faixas={faixas}
          escolhido={noEscolhido}
          aoEscolher={(id) => {
            setRecemCriado(false)
            setNoEscolhido((v) => (v === id ? null : id))
          }}
          acao={alvo.tipo === 'projeto' && mandaNoProcesso(eu, alvo.f, perfis)
            ? { rotulo: 'Checkpoint', aoClicar: () => void acrescentar(alvo.f) }
            : undefined}
        />
        {achado && (
          <Inspetor
            key={achado.et.id}
            f={achado.f}
            et={achado.et}
            fechar={() => { setNoEscolhido(null); setRecemCriado(false) }}
            gravar={(etapas) => gravar(achado.f, etapas)}
            abrirEmEdicao={recemCriado}
          />
        )}
      </div>
    </section>
  )
}

// ------------------------------------------------------------------ tela

export function TelaTracks({ id }: { id?: string }) {
  const { fluxos, areas, carregando } = useDados()
  const { abrir } = useModais()
  const router = useRouter()

  const novo = (t: 'projeto' | 'area') =>
    abrir(t === 'projeto' ? { tipo: 'fluxo', tipoFluxo: 'esteira' } : { tipo: 'area' })

  const f = id ? fluxos.find((x) => x.id === id) : undefined
  const a = !f && id ? areas.find((x) => x.id === id) : undefined
  const alvo = f ? { tipo: 'projeto' as const, f } : a ? { tipo: 'area' as const, a } : null

  // Link velho, track apagada ou track de outra empresa: volta para a lista.
  // Só depois que os dados chegam, senão o carregamento derrubaria todo mundo.
  const perdido = !!id && !alvo && !carregando
  useEffect(() => { if (perdido) router.replace('/tracks') }, [perdido, router])

  if (carregando) return <Carregando />

  return (
    <div className="tk" data-aberto={alvo ? 'sim' : 'nao'}>
      <Lista atual={id} aoNovo={novo} />
      {alvo ? <Palco alvo={alvo} /> : (
        <section className="tk-palco">
          <div className="tk-vazio">
            <h3>Escolha uma track</h3>
            <p>
              Cada track é uma trilha do começo ao fim: o gatilho, os checkpoints com as
              tarefas de cada um e a chegada. Projeto tem uma trilha só, área tem uma por
              rotina, porque área não acaba, ela dá voltas.
            </p>
            <button className="btn pri" onClick={() => novo('projeto')}>
              <Ic.plus />Novo projeto
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
