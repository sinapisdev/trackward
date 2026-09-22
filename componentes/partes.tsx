'use client'

import Link from 'next/link'
import { Fragment, useState } from 'react'
import { useDados } from './Dados'
import { Ic } from './Icones'
import { Av, IconeStatus, Trilha } from './atomos'
import { dias, DSEM, hoje, iso, rel } from '@/lib/datas'
import { etapaAtual, LBL, motivo, ORD, progresso, proxPrazo, status } from '@/lib/regras'
import type { Fluxo, Pendencia, Status } from '@/lib/tipos'

/** Classe de cor de um prazo: vencido, no limite ou normal. */
export function classePrazo(prazo: string | null | undefined) {
  if (!prazo) return ''
  const n = dias(prazo)
  return n < 0 ? 'late' : n <= 3 ? 'soon' : ''
}

/**
 * Linha de pendência: a tarefa nomeia, a track endereça, o prazo cobra.
 *
 * É a mesma linha do painel e da fila, e é onde o trabalho anda sem sair da
 * lista: concluir o item ou aprovar a saída ali mesmo.
 */
export function LinhaPendencia({ p }: { p: Pendencia }) {
  const { alternarItem, aprovar, nomeDe } = useDados()
  const et = etapaAtual(p.fluxo)
  const prazo = p.prazo ? rel(p.prazo) : 'Sem prazo'
  const cls = classePrazo(p.prazo)

  if (p.tipo === 'aprov') {
    const feitos = p.etapa.itens.filter((x) => x.feito).length
    return (
      <div className="ib">
        <span className="ib-ic ok"><Ic.check /></span>
        <span className="ib-nm">Aprovar saída de {p.etapa.nome}</span>
        <Link className="ib-onde" href={`/fluxo/${p.fluxo.id}`}>{p.fluxo.nome}</Link>
        <span className="ib-fim">
          <span className="due">{feitos} de {p.etapa.itens.length} prontas</span>
          <button className="btn-sm" onClick={() => void aprovar(p.fluxo)}>Aprovar</button>
        </span>
      </div>
    )
  }

  return (
    <div className="ib">
      <button className="ck" onClick={() => void alternarItem(p.item)} aria-label={`Concluir ${p.item.texto}`}>
        <Ic.check />
      </button>
      <span className="ib-nm">
        {p.item.priv && <span className="lk" title="Tarefa privada: só você vê"><Ic.lock /></span>}
        <span>{p.item.texto}</span>
      </span>
      <Link className="ib-onde" href={`/fluxo/${p.fluxo.id}`}>
        {p.fluxo.nome}{et ? ` · ${et.nome}` : ''}
      </Link>
      <span className="ib-fim">
        <span className={`due ${cls}`}
          title={p.item.resp_id ? `Responsável: ${nomeDe(p.item.resp_id)}` : ''}>{prazo}</span>
        <Link className="ib-chev" href={`/fluxo/${p.fluxo.id}`} aria-label={`Abrir ${p.fluxo.nome}`}><Ic.seta /></Link>
      </span>
    </div>
  )
}

/** Linha do radar: situação, nome, esteira em miniatura, motivo, prazo e dono. */
export function LinhaRadar({ f }: { f: Fluxo }) {
  const { areaDe, perfilDe, nomeDe, empresaDe, org, totalItens } = useDados()
  const st = status(f)
  const et = etapaAtual(f)
  const pp = proxPrazo(f)
  const feitos = et ? et.itens.filter((x) => x.feito).length : 0
  const vistas = f.etapas.reduce((n, e) => n + e.itens.length, 0)
  const ocultas = Math.max(0, totalItens(f.id) - vistas)

  return (
    <Link className="rw" href={`/fluxo/${f.id}`}>
      <IconeStatus st={st} p={progresso(f)} />
      <span style={{ minWidth: 0 }}>
        <span className="nm">
          {f.visib !== 'equipe' && (
            <span className="lk"
              title={f.visib === 'so_eu' ? 'Esteira privada: só você vê' : 'Esteira restrita a algumas pessoas'}>
              <Ic.lock />
            </span>
          )}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.nome}</span>
        </span>
        <span className="sub">
          {org.multi && empresaDe(f.empresa_id) && (
            <span className="emp-tag" style={{ color: empresaDe(f.empresa_id)!.cor }}>
              {empresaDe(f.empresa_id)!.sigla}
            </span>
          )}
          <span className="type">{f.tipo === 'ciclo' ? <><Ic.ciclo />{f.periodo}</> : <><Ic.proj />Projeto</>}</span>
          {f.area_id && <>·<span>{areaDe(f.area_id).nome}</span></>}
        </span>
      </span>
      <span className="c-trk" style={{ minWidth: 0 }}>
        <Trilha f={f} />
        <div className="trk-l">
          {f.concluido
            ? 'Concluído'
            : `${et?.nome} · ${feitos}/${et?.itens.length ?? 0}${ocultas ? ' suas' : ''}`}
        </div>
      </span>
      <span className={`why ${({ late: 'late', hold: 'hold', soon: 'soon' } as Record<string, string>)[st] || ''}`}>
        {motivo(f, nomeDe, ocultas)}
      </span>
      <span className={`due num ${st === 'late' ? 'late' : st === 'soon' ? 'soon' : ''}`} style={{ textAlign: 'right' }}>
        {pp ? rel(pp) : ''}
      </span>
      <Av p={perfilDe(f.dono_id)} />
    </Link>
  )
}

const GRUPOS: [Status, string][] = [
  ['late', 'Atrasados'],
  ['hold', 'Travados'],
  ['soon', 'Vencem em até 3 dias'],
  ['ok', 'Em dia'],
  ['done', 'Concluídos'],
]

/** Radar: tudo junto, agrupado por situação, do mais urgente para o menos. */
export function Grupos({ lista }: { lista: Fluxo[] }) {
  const [fechados, setFechados] = useState<Record<string, boolean>>({ done: true })
  const blocos = GRUPOS.map(([k, rotulo]) => ({ k, rotulo, itens: lista.filter((f) => status(f) === k) })).filter(
    (b) => b.itens.length,
  )

  if (!blocos.length)
    return <div className="card"><div className="empty">Nada por aqui com esse filtro.</div></div>

  return (
    <div className="card">
      {blocos.map(({ k, rotulo, itens }) => {
        const fechado = !!fechados[k]
        return (
          <Fragment key={k}>
            <button
              className={`gh ${fechado ? 'closed' : ''}`}
              onClick={() => setFechados((f) => ({ ...f, [k]: !f[k] }))}
            >
              <IconeStatus st={k} p={0.5} />
              <span>{rotulo}</span>
              <span className="c num">{itens.length}</span>
              <span className="chev"><Ic.chev /></span>
            </button>
            {!fechado && itens.map((f) => <LinhaRadar key={f.id} f={f} />)}
          </Fragment>
        )
      })}
    </div>
  )
}

/** Mesma base de dados, duas lentes: a empresa inteira ou uma pessoa. */
export function FiltroPessoas({
  pessoa, aoTrocar,
}: { pessoa: string | null; aoTrocar: (id: string | null) => void }) {
  const { perfis, eu } = useDados()
  const ativos = perfis.filter((p) => p.ativo)
  if (ativos.length < 2) return null
  return (
    <>
      <div className="seg" role="group" aria-label="Filtro por responsável">
        <button className={!pessoa ? 'on' : ''} onClick={() => aoTrocar(null)}>Toda a empresa</button>
        <button className={pessoa ? 'on' : ''} onClick={() => aoTrocar(pessoa || eu.id)}>Por pessoa</button>
      </div>
      {pessoa && (
        <span className="people">
          {ativos.map((p) => (
            <button
              key={p.id}
              className={`pbtn ${pessoa === p.id ? 'on' : ''}`}
              onClick={() => aoTrocar(p.id)}
              aria-label={p.nome}
            >
              <Av p={p} />
            </button>
          ))}
        </span>
      )}
    </>
  )
}

/** Próximos 7 dias, com os vencidos reunidos no topo. */
export function Agenda({ lista }: { lista: Fluxo[] }) {
  const { areaDe } = useDados()
  const itens: { fluxo: Fluxo; texto: string; prazo: string }[] = []
  for (const f of lista) {
    if (f.concluido) continue
    const et = etapaAtual(f)
    if (!et) continue
    for (const x of et.itens) if (!x.feito && x.prazo) itens.push({ fluxo: f, texto: x.texto, prazo: x.prazo })
  }
  const vencidos = itens.filter((x) => dias(x.prazo) < 0)
  const h = hoje()

  const Evento = ({ x }: { x: { fluxo: Fluxo; texto: string } }) => (
    <Link className="ev" href={`/fluxo/${x.fluxo.id}`}>
      <i className="k" style={{ background: areaDe(x.fluxo.area_id).cor }} />
      <span>{x.texto}</span>
    </Link>
  )

  const dias7 = []
  for (let k = 0; k < 7; k++) {
    const d = new Date(h)
    d.setDate(d.getDate() + k)
    const s = iso(d)
    const doDia = itens.filter((x) => x.prazo === s)
    if (d.getDay() === 0 && !doDia.length) continue
    dias7.push(
      <div key={s} className={`day ${k === 0 ? 'today' : ''}`}>
        <div className="dl"><b className="num">{d.getDate()}</b>{k === 0 ? 'hoje' : DSEM[d.getDay()]}</div>
        <div>
          {doDia.length
            ? doDia.map((x, i) => <Evento key={i} x={x} />)
            : <div className="none">Sem prazos</div>}
        </div>
      </div>,
    )
  }

  return (
    <>
      {!!vencidos.length && (
        <div className="day over">
          <div className="dl"><b className="num">{vencidos.length}</b>vencidos</div>
          <div>{vencidos.map((x, i) => <Evento key={i} x={x} />)}</div>
        </div>
      )}
      {dias7}
    </>
  )
}

/** Saúde das rotinas: as últimas voltas em barrinhas, a última é a volta em curso. */
export function SaudeRotinas({ lista }: { lista: Fluxo[] }) {
  const ciclos = lista.filter((f) => f.tipo === 'ciclo')
  if (!ciclos.length) return <div className="empty" style={{ padding: 0 }}>Sem rotinas neste filtro.</div>
  return (
    <>
      {ciclos.map((f) => {
        const st = status(f)
        const voltas = f.voltas.slice(-5)
        return (
          <Link className="rt" key={f.id} href={`/fluxo/${f.id}`}>
            <span className="n">{f.nome}</span>
            <span className="hist" aria-label="Últimas voltas">
              {voltas.map((v) => (
                <i key={v.id} className={v.situacao === 'ok' ? '' : 'late'} title={`${v.periodo}: ${LBL[v.situacao]}`} />
              ))}
              <i className={`now ${st === 'ok' ? '' : st}`} title={`${f.periodo} (atual): ${LBL[st]}`} />
            </span>
            <span className="p">{f.periodo} · {etapaAtual(f)?.nome || ''}</span>
          </Link>
        )
      })}
      <div className="legend">
        <span><i style={{ background: 'var(--line-3)' }} />em dia</span>
        <span><i style={{ background: 'var(--warn)' }} />no limite</span>
        <span><i style={{ background: 'var(--late)' }} />atrasou</span>
        <span>última = volta atual</span>
      </div>
    </>
  )
}

/** Lateral comum ao painel e à tela de area. */
export function Lateral({ lista }: { lista: Fluxo[] }) {
  return (
    <aside className="rail">
      <div className="blk">
        <div className="bh"><h2>Próximos 7 dias</h2></div>
        <div className="card"><Agenda lista={lista} /></div>
      </div>
      <div className="blk">
        <div className="bh"><h2>Saúde das rotinas</h2></div>
        <div className="card"><SaudeRotinas lista={lista} /></div>
      </div>
    </aside>
  )
}

export const porUrgencia = (a: Fluxo, b: Fluxo) => ORD[status(a)] - ORD[status(b)]
