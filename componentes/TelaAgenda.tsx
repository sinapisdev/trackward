'use client'

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import { useDados } from './Dados'
import { useModais } from './Modais'
import { Carregando } from './Shell'
import { Ic } from './Icones'
import { Av } from './atomos'
import { curta, data, DSEM, DSEM_LONGO, hoje, hojeIso, iso, MES_LONGO } from '@/lib/datas'
import { envolvidos, faixa, gradeDoMes, minutos, porHora, semanaDe } from '@/lib/agenda'
import { etapaAtual } from '@/lib/regras'
import type { Compromisso } from '@/lib/tipos'

type Modo = 'semana' | 'mes'
type Lente = 'minha' | 'equipe'
type Recorte = 'uteis' | 'todos'

const ALTURA = 58
const PRIMEIRA = 8
const ULTIMA = 19

/** 8h vira "08:00": a agenda escreve hora cheia, como qualquer calendário. */
const hhmm = (h: number) => `${String(h).padStart(2, '0')}:00`

export function TelaAgenda() {
  const { eu, perfis, agenda, fluxos, carregando, nomeDe, perfilDe } = useDados()
  const { abrir } = useModais()
  const [modo, setModo] = useState<Modo>('semana')
  const [lente, setLente] = useState<Lente>('minha')
  const [ancora, setAncora] = useState<string>(hojeIso())
  const [recorte, setRecorte] = useState<Recorte>('uteis')
  const [sel, setSel] = useState<string | null>(null)
  /** No celular a semana inteira não cabe, então mostramos um dia por vez. */
  const [estreito, setEstreito] = useState(false)

  useEffect(() => {
    const mq = matchMedia('(max-width: 840px)')
    const ver = () => setEstreito(mq.matches)
    ver()
    mq.addEventListener('change', ver)
    return () => mq.removeEventListener('change', ver)
  }, [])

  /** Prazos de tarefas entram na agenda como compromissos de dia inteiro. */
  const prazos = useMemo(() => {
    const saida: { dia: string; texto: string; fluxoId: string; resp: string | null }[] = []
    for (const f of fluxos) {
      if (f.concluido) continue
      const et = etapaAtual(f)
      if (!et) continue
      for (const i of et.itens) {
        if (i.feito || !i.prazo) continue
        if (lente === 'minha' && i.resp_id !== eu.id) continue
        saida.push({ dia: i.prazo, texto: i.texto, fluxoId: f.id, resp: i.resp_id })
      }
    }
    return saida
  }, [fluxos, lente, eu.id])

  if (carregando) return <Carregando />

  const meu = (c: Compromisso) => envolvidos(c).includes(eu.id)
  const visiveis = agenda.filter((c) => (lente === 'minha' ? meu(c) : true))

  const base = data(ancora)
  const semana = semanaDe(base)
  const util = (d: string) => { const k = data(d).getDay(); return k !== 0 && k !== 6 }
  const dias = estreito && modo === 'semana'
    ? [ancora]
    : recorte === 'uteis' ? semana.filter(util) : semana
  const hj = hojeIso()

  const andar = (n: number) => {
    const x = data(ancora)
    if (modo !== 'semana') x.setMonth(x.getMonth() + n)
    else x.setDate(x.getDate() + n * (estreito ? 1 : 7))
    setAncora(iso(x))
  }

  const titulo = modo !== 'semana'
    ? `${MES_LONGO[base.getMonth()]} de ${base.getFullYear()}`
    : estreito
      ? `${DSEM_LONGO[base.getDay()]}, ${base.getDate()} de ${MES_LONGO[base.getMonth()]}`
      : (() => {
          const visto = recorte === 'uteis' ? semana.filter(util) : semana
          const a = data(visto[0]), b = data(visto[visto.length - 1])
          return a.getMonth() === b.getMonth()
            ? `${a.getDate()} a ${b.getDate()} de ${MES_LONGO[a.getMonth()]} de ${a.getFullYear()}`
            : `${curta(visto[0])} a ${curta(visto[visto.length - 1])}`
        })()

  const doDia = (dia: string) => visiveis.filter((c) => c.quando === dia).sort(porHora)
  const escolhido = sel ? visiveis.find((c) => c.id === sel && c.aberto) || null : null
  const novoEm = (dia: string, hora?: string) =>
    abrir({ tipo: 'compromisso', quando: dia, inicio: hora })

  const Bloco = ({ c }: { c: Compromisso }) => {
    const ini = minutos(c.inicio) ?? PRIMEIRA * 60
    const fim = minutos(c.fim) ?? ini + 60
    const top = ((ini - PRIMEIRA * 60) / 60) * ALTURA
    const alt = Math.max(22, ((fim - ini) / 60) * ALTURA - 2)
    const pessoas = envolvidos(c).filter((p) => p !== eu.id)
    return (
      <button className={`ev-bloco ${c.aberto ? '' : 'fechado'} ${c.bloqueia ? '' : 'livre'} ${sel === c.id ? 'sel' : ''}`}
        style={{ top, height: alt }}
        title={c.aberto
          ? `${c.titulo}, ${faixa(c)}${c.local ? `, ${c.local}` : ''}`
          : `${nomeDe(c.dono_id)} está ocupado${c.externo ? ', pela agenda externa' : ''}`}
        onClick={() => c.aberto && setSel(c.id)}>
        <b>{c.aberto ? c.titulo : 'Ocupado'}</b>
        <small>
          {faixa(c)}
          {lente === 'equipe' && c.dono_id !== eu.id && `, ${nomeDe(c.dono_id)}`}
          {c.externo && ', agenda externa'}
          {c.aberto && !!pessoas.length && lente === 'minha' && `, com ${pessoas.map((p) => nomeDe(p)).join(', ')}`}
        </small>
      </button>
    )
  }

  return (
    <>
      <div className="hdr">
        <div>
          <h1>Agenda</h1>
          <p className="lede">Compromissos e prazos no mesmo lugar.</p>
        </div>
        <div className="hdr-actions">
          <button className="btn" onClick={() => novoEm(hj)}><Ic.plus />Compromisso</button>
        </div>
      </div>

      <div className="ag-ctl">
        <button className="iconbtn grd" aria-label="Anterior" onClick={() => andar(-1)}><Ic.volta /></button>
        <button className="iconbtn grd" aria-label="Próximo" onClick={() => andar(1)}><Ic.seta /></button>
        <button className="btn" onClick={() => setAncora(hj)}>Hoje</button>
        <span className="ag-titulo">{titulo}</span>
        <div className="seg" style={{ marginLeft: 'auto' }}>
          <button className={modo === 'semana' ? 'on' : ''} onClick={() => setModo('semana')}>Semana</button>
          <button className={modo === 'mes' ? 'on' : ''} onClick={() => setModo('mes')}>Mês</button>
        </div>
        <label className="sel-quem">
          <select value={recorte} onChange={(e) => setRecorte(e.target.value as Recorte)}
            aria-label="Quais dias mostrar">
            <option value="uteis">Dias úteis</option>
            <option value="todos">Semana inteira</option>
          </select>
          <Ic.chev />
        </label>
        <label className="sel-quem">
          <select value={lente} onChange={(e) => setLente(e.target.value as Lente)} aria-label="De quem">
            <option value="minha">Minha agenda</option>
            <option value="equipe">Da equipe</option>
          </select>
          <Ic.chev />
        </label>
      </div>

      {estreito && modo === 'semana' && (
        <div className="faixa-dias">
          {semana.map((d) => {
            const x = data(d)
            const carga = visiveis.filter((c) => c.quando === d).length + prazos.filter((p) => p.dia === d).length
            return (
              <button key={d} className={`dia-chip ${d === ancora ? 'on' : ''} ${d === hj ? 'hoje' : ''}`}
                onClick={() => setAncora(d)}>
                <span className="ds">{DSEM[x.getDay()]}</span>
                <span className="dn num">{x.getDate()}</span>
                <span className="pt">{carga ? <i /> : null}</span>
              </button>
            )
          })}
        </div>
      )}

      <div className="ag">
      <div className="ag-grade">
      {modo === 'semana' ? (
        <div className={`ag-semana ${estreito ? 'um-dia' : ''}`}
          style={{ '--colunas': dias.length } as CSSProperties}>
          <div className="ag-cab">
            <div />
            {dias.map((d) => {
              const x = data(d)
              return (
                <div key={d} className={d === hj ? 'hoje' : ''}>
                  <span className="ds">{DSEM[x.getDay()]}</span>
                  <span className="dn num">{x.getDate()}</span>
                  {d === hj && <i className="ag-pt" aria-label="hoje" />}
                </div>
              )
            })}
          </div>

          <div className="ag-dia-inteiro">
            <div className="rot">Prazos</div>
            {dias.map((d) => (
              <div key={d}>
                {doDia(d).filter((c) => !c.inicio).map((c) => (
                  <button className="ev-chip" key={c.id} onClick={() => c.aberto && abrir({ tipo: 'compromisso', compromisso: c })}>
                    <i className="k" style={{ background: c.bloqueia ? 'var(--ac)' : 'var(--line-3)' }} />
                    <span>{c.aberto ? c.titulo : 'Ocupado'}</span>
                  </button>
                ))}
                {prazos.filter((p) => p.dia === d).map((p, k) => (
                  <Link className="ev-chip" key={k} href={`/fluxo/${p.fluxoId}`} title={`Prazo: ${p.texto}`}>
                    <i className="k" style={{ background: 'var(--warn)' }} />
                    <span>{p.texto}</span>
                  </Link>
                ))}
              </div>
            ))}
          </div>

          <div className="ag-corpo">
            <div className="ag-horas">
              {Array.from({ length: ULTIMA - PRIMEIRA }, (_, k) => (
                <div className="ag-hora" key={k} style={{ height: ALTURA }}>{hhmm(PRIMEIRA + k)}</div>
              ))}
            </div>
            {dias.map((d) => {
              const x = data(d)
              const fds = x.getDay() === 0 || x.getDay() === 6
              const agoraMin = hoje().getTime() === x.getTime()
                ? new Date().getHours() * 60 + new Date().getMinutes()
                : null
              return (
                <div className={`ag-col ${fds ? 'fds' : ''}`} key={d}
                  style={{ height: (ULTIMA - PRIMEIRA) * ALTURA }}
                  onDoubleClick={() => novoEm(d, '09:00')}>
                  {Array.from({ length: ULTIMA - PRIMEIRA }, (_, k) => (
                    <div className="ag-linha" key={k} style={{ top: k * ALTURA }} />
                  ))}
                  {agoraMin !== null && agoraMin > PRIMEIRA * 60 && agoraMin < ULTIMA * 60 && (
                    <div className="ag-agora" style={{ top: ((agoraMin - PRIMEIRA * 60) / 60) * ALTURA }} />
                  )}
                  {doDia(d).filter((c) => c.inicio).map((c) => <Bloco key={c.id} c={c} />)}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="ag-mes">
          {DSEM_LONGO.slice(1).concat(DSEM_LONGO[0]).map((n) => (
            <div className="ds" key={n}>{n.slice(0, 3)}</div>
          ))}
          {gradeDoMes(base.getFullYear(), base.getMonth()).map((d) => {
            const x = data(d)
            const fora = x.getMonth() !== base.getMonth()
            const eventos = doDia(d)
            const doDiaPrazos = prazos.filter((p) => p.dia === d)
            const total = eventos.length + doDiaPrazos.length
            return (
              <div className={`ag-cel ${fora ? 'fora' : ''} ${d === hj ? 'hoje' : ''}`} key={d}
                onDoubleClick={() => novoEm(d, '09:00')}>
                <div className="dn">{x.getDate()}</div>
                {eventos.slice(0, 2).map((c) => (
                  <button className="ev-chip" key={c.id} onClick={() => c.aberto && abrir({ tipo: 'compromisso', compromisso: c })}>
                    <i className="k" style={{ background: c.bloqueia ? 'var(--ac)' : 'var(--line-3)' }} />
                    <span>{c.inicio ? `${minutos(c.inicio)! / 60 | 0}h ` : ''}{c.aberto ? c.titulo : 'Ocupado'}</span>
                  </button>
                ))}
                {doDiaPrazos.slice(0, Math.max(0, 2 - eventos.length)).map((p, k) => (
                  <Link className="ev-chip" key={k} href={`/fluxo/${p.fluxoId}`}>
                    <i className="k" style={{ background: 'var(--warn)' }} />
                    <span>{p.texto}</span>
                  </Link>
                ))}
                {total > 2 && <div className="mais">mais {total - 2}</div>}
              </div>
            )
          })}
        </div>
      )}

      <div className="legend" style={{ marginTop: 14 }}>
        <span><i style={{ background: 'var(--ac)' }} />compromisso que ocupa</span>
        <span><i style={{ background: 'var(--line-3)' }} />não ocupa a agenda</span>
        <span><i style={{ background: 'var(--warn)' }} />prazo de tarefa</span>
        <span>hachurado = ocupado, sem detalhe</span>
        <span>toque duas vezes num dia para marcar algo</span>
      </div>

      {lente === 'equipe' && (
        <p className="hint" style={{ marginTop: 10, maxWidth: '68ch' }}>
          Compromissos marcados como fechados aparecem apenas como &quot;Ocupado&quot;, sem título,
          local ou observação. Você sabe que a pessoa não está livre, e nada além disso.
        </p>
      )}
      </div>

      {escolhido && (
        <aside className="ag-lado">
          <div className="ag-lado-topo">
            <button className="iconbtn grd" onClick={() => setSel(null)} aria-label="Fechar"><Ic.x /></button>
          </div>
          <h2>{escolhido.titulo}</h2>
          <p className="ag-lado-quando">
            {escolhido.quando === hj ? 'Hoje' : curta(escolhido.quando)} · {faixa(escolhido)}
          </p>

          <dl className="ag-lado-kv">
            {escolhido.fluxo_id && (
              <div>
                <dt><Ic.proj /></dt>
                <dd><Link href={`/fluxo/${escolhido.fluxo_id}`}>
                  {fluxos.find((f) => f.id === escolhido.fluxo_id)?.nome || 'Track'}
                </Link></dd>
              </div>
            )}
            <div>
              <dt><Ic.eu /></dt>
              <dd>{escolhido.dono_id === eu.id ? 'Você' : nomeDe(escolhido.dono_id)}</dd>
            </div>
            {!!escolhido.local && (
              <div><dt><Ic.dot /></dt><dd>{escolhido.local}</dd></div>
            )}
            {!!escolhido.convidados.length && (
              <div>
                <dt><Ic.team /></dt>
                <dd className="ag-lado-gente">
                  {escolhido.convidados.map((c) => <Av key={c} p={perfilDe(c)} tam="sm" />)}
                </dd>
              </div>
            )}
          </dl>

          <div className="ag-lado-chaves">
            <span><span className={`chave ${escolhido.bloqueia ? 'on' : ''}`} aria-hidden /><b>Ocupa minha agenda</b></span>
            <span><span className={`chave ${escolhido.visivel ? 'on' : ''}`} aria-hidden /><b>Outros veem o título</b></span>
          </div>
          {!escolhido.visivel && (
            <p className="ag-lado-nota"><Ic.lock />Para outras pessoas, aparece apenas <i>Ocupado</i>.</p>
          )}

          {!!escolhido.nota && <p className="ag-lado-obs">{escolhido.nota}</p>}

          {escolhido.dono_id === eu.id && !escolhido.externo && (
            <button className="btn larga" onClick={() => abrir({ tipo: 'compromisso', compromisso: escolhido })}>
              <Ic.edit />Editar compromisso
            </button>
          )}
          {escolhido.fluxo_id && (
            <Link className="gaveta-abrir" href={`/fluxo/${escolhido.fluxo_id}`}>Abrir track <Ic.seta /></Link>
          )}
        </aside>
      )}
      </div>
    </>
  )
}
