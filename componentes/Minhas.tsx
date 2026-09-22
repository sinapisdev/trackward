'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { PedidosDePrazo } from './PedidosDePrazo'
import { useDados } from './Dados'
import { useModais } from './Modais'
import { Carregando } from './Shell'
import { Ic } from './Icones'
import { Av } from './atomos'
import { TrilhaH } from './Trilha'
import { classePrazo } from './partes'
import { dias, isoDe, rel } from '@/lib/datas'
import { etapaAtual, pendencias } from '@/lib/regras'
import type { Pendencia } from '@/lib/tipos'

type Filtro = 'tudo' | 'executar' | 'aprovar' | 'aguardando'

/** A chave de uma pendência, para saber qual está aberta na gaveta. */
const chave = (p: Pendencia) => (p.tipo === 'aprov' ? `a-${p.etapa.id}` : `i-${p.item.id}`)

/**
 * A fila de quem está usando o app: tudo que depende dele, em uma coluna, e o
 * próximo passo aberto ao lado. Um de cada vez, que é como o trabalho anda.
 */
export function Minhas() {
  const { eu, fluxos, carregando, nomeDe, perfilDe, alternarItem, aprovar: aprovarSaida } = useDados()
  const { abrir } = useModais()
  const [filtro, setFiltro] = useState<Filtro>('tudo')
  const [termo, setTermo] = useState('')
  const [aberta, setAberta] = useState<string | null>(null)

  const tudo = useMemo(() => pendencias(fluxos, eu.id), [fluxos, eu.id])

  /** Índice de tarefas, para saber o que está travado por quem. */
  const porId = useMemo(() => {
    const m = new Map<string, { texto: string; feito: boolean; resp: string | null }>()
    for (const f of fluxos) for (const e of f.etapas) for (const i of e.itens) {
      m.set(i.id, { texto: i.texto, feito: i.feito, resp: i.resp_id })
    }
    return m
  }, [fluxos])

  const travasDe = (p: Pendencia) =>
    p.tipo === 'item'
      ? p.item.depende_de.map((id) => porId.get(id)).filter((t) => t && !t.feito)
      : []

  const ultima = useMemo(() => {
    const t = fluxos.flatMap((f) => f.log)
    t.sort((x, y) => y.criado_em.localeCompare(x.criado_em))
    return t[0] || null
  }, [fluxos])

  if (carregando) return <Carregando />

  const limpa = (x: string) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const texto = (p: Pendencia) => (p.tipo === 'aprov' ? `Aprovar saída de ${p.etapa.nome}` : p.item.texto)
  const busca = tudo.filter((p) => !termo.trim() || limpa(texto(p)).includes(limpa(termo)))

  const aprovacoes = busca.filter((p) => p.tipo === 'aprov')
  const travadas = busca.filter((p) => travasDe(p).length > 0)
  const executar = busca.filter((p) => p.tipo === 'item' && !travasDe(p).length)

  const abas: { id: Filtro; nome: string; itens: Pendencia[] }[] = [
    { id: 'tudo', nome: 'Tudo', itens: busca },
    { id: 'executar', nome: 'Executar', itens: executar },
    { id: 'aprovar', nome: 'Aprovar', itens: aprovacoes },
    { id: 'aguardando', nome: 'Aguardando', itens: travadas },
  ]
  const atual = abas.find((a) => a.id === filtro) || abas[0]

  const blocos = filtro === 'tudo'
    ? [
        { titulo: 'Vencida', itens: busca.filter((p) => p.prazo && dias(p.prazo) < 0 && !travasDe(p).length) },
        { titulo: 'Hoje', itens: busca.filter((p) => p.prazo && dias(p.prazo) === 0 && !travasDe(p).length) },
        { titulo: 'A seguir', itens: busca.filter((p) => (!p.prazo || dias(p.prazo) > 0) && !travasDe(p).length) },
        { titulo: 'Aguardando', itens: travadas },
      ].filter((b) => b.itens.length)
    : [{ titulo: atual.nome, itens: atual.itens }]

  const naFila = blocos.flatMap((b) => b.itens)
  const sel = naFila.find((p) => chave(p) === aberta) || naFila[0] || null

  const Etiqueta = ({ p }: { p: Pendencia }) =>
    p.tipo === 'aprov' ? <span className="fila-tag">Aprovar</span>
      : travasDe(p).length ? <span className="fila-tag">Dependência</span>
        : <span className="fila-tag">Executar</span>

  return (
    <>
      <PedidosDePrazo />

      <div className="hdr">
        <div>
          <div className="eyebrow">Sua fila</div>
          <h1>Meu trabalho</h1>
          <p className="lede">
            {tudo.length
              ? <>{tudo.length} {tudo.length > 1 ? 'pendências' : 'pendência'}. Um próximo passo de cada vez.</>
              : 'Nada pendente com você.'}
          </p>
        </div>
        <div className="hdr-actions">
          <button className="btn" onClick={() => abrir({ tipo: 'fluxo', tipoFluxo: 'esteira' })}>
            <Ic.plus />Tarefa
          </button>
        </div>
      </div>

      <div className="fila">
        <div className="fila-lista">
          <div className="filtros">
            <div className="seg" role="group" aria-label="Filtrar a fila">
              {abas.map((a) => (
                <button key={a.id} className={filtro === a.id ? 'on' : ''}
                  disabled={!a.itens.length && a.id !== 'tudo'}
                  onClick={() => { setFiltro(a.id); setAberta(null) }}>
                  {a.nome}<span className="num">{a.itens.length}</span>
                </button>
              ))}
            </div>
            <label className="campo-busca">
              <Ic.lupa />
              <input value={termo} onChange={(e) => setTermo(e.target.value)}
                placeholder="Buscar na minha fila" aria-label="Buscar na minha fila" />
            </label>
          </div>

          <p className="fila-ord"><Ic.chev />Ordenado por urgência</p>

          <div className="tf-cab fila-cab"><span>Pendência</span><span>Prazo</span></div>

          {blocos.map((b) => (
            <section key={b.titulo}>
              <h2 className={`fila-gh ${b.titulo === 'Vencida' ? 'late' : ''}`}>
                {b.titulo} <span className="num">({b.itens.length})</span>
              </h2>
              {b.itens.map((p) => {
                const travas = travasDe(p)
                const k = chave(p)
                const feitos = p.tipo === 'aprov' ? p.etapa.itens.filter((x) => x.feito).length : 0
                return (
                  <button key={k} className={`fila-l ${sel && chave(sel) === k ? 'on' : ''}`}
                    onClick={() => setAberta(k)}>
                    <span className={`ck ${p.tipo === 'aprov' ? 'on' : ''}`} aria-hidden>
                      {travas.length ? <Ic.lock /> : <Ic.check />}
                    </span>
                    <span className="fila-txt">
                      <b>{texto(p)}</b>
                      <small>
                        {p.fluxo.nome}{p.tipo === 'aprov' ? '' : ` / ${etapaAtual(p.fluxo)?.nome || ''}`}
                      </small>
                      {!!travas.length && (
                        <small className="fila-trava">
                          Aguardando {travas[0]!.resp ? nomeDe(travas[0]!.resp) : 'outra tarefa'} concluir a revisão.
                        </small>
                      )}
                    </span>
                    <Etiqueta p={p} />
                    <Av p={perfilDe(p.tipo === 'aprov' ? p.etapa.aprovador_id : p.item.resp_id)} tam="sm" />
                    <span className={`due ${classePrazo(p.prazo)}`}>
                      {p.tipo === 'aprov'
                        ? `${feitos} de ${p.etapa.itens.length} prontas`
                        : travas.length ? (travas[0]!.resp ? nomeDe(travas[0]!.resp) : 'Travada')
                          : p.prazo ? rel(p.prazo) : 'Sem prazo'}
                    </span>
                    <span className="fila-chev"><Ic.seta /></span>
                  </button>
                )
              })}
            </section>
          ))}

          {!naFila.length && (
            <div className="tb-vazio">
              {filtro === 'tudo' ? 'Nada pendente com você.' : `Nada em ${atual.nome.toLowerCase()}.`}
            </div>
          )}

          {ultima && (
            <p className="fila-atv">
              <Ic.espera />
              Última atividade: <b>{ultima.por_ia ? 'A leitura da conversa' : nomeDe(ultima.quem_id)}</b>{' '}
              {ultima.texto} · {rel(isoDe(ultima.criado_em))}
            </p>
          )}
        </div>

        {sel && <Gaveta p={sel} travas={travasDe(sel).length} nomeDe={nomeDe} perfilDe={perfilDe}
          aoConcluir={() => { if (sel.tipo === 'item') void alternarItem(sel.item) }}
          aoAprovar={() => void aprovarSaida(sel.fluxo)} />}
      </div>
    </>
  )
}

/** A gaveta: a pendência escolhida, com tudo que ela precisa para sair daqui. */
function Gaveta({ p, travas, nomeDe, perfilDe, aoConcluir, aoAprovar }: {
  p: Pendencia
  travas: number
  nomeDe: (id: string | null) => string
  perfilDe: (id: string | null) => import('@/lib/tipos').Perfil
  aoConcluir: () => void
  aoAprovar: () => void
}) {
  const et = etapaAtual(p.fluxo)
  const titulo = p.tipo === 'aprov' ? `Aprovar saída de ${p.etapa.nome}` : p.item.texto
  const resp = p.tipo === 'aprov' ? p.etapa.aprovador_id : p.item.resp_id
  const feito = p.tipo === 'item' && p.item.feito

  return (
    <aside className="gaveta">
      <div className="gaveta-topo">
        <span className="gaveta-onde">{p.fluxo.nome} / {et?.nome}</span>
      </div>
      <h2>{titulo}</h2>
      <span className={`selo ${travas ? 'travado' : feito ? 'feito' : ''}`}>
        {travas ? <><Ic.lock />Aguardando dependência</> : feito ? <><Ic.check />Concluída</> : <><Ic.dot />A fazer</>}
      </span>

      <dl className="gaveta-kv">
        <div>
          <dt>Responsável</dt>
          <dd><Av p={perfilDe(resp)} tam="sm" />{nomeDe(resp)}</dd>
        </div>
        <div>
          <dt>Prazo</dt>
          <dd><Ic.agenda />{p.prazo ? rel(p.prazo) : 'Sem prazo'}</dd>
        </div>
      </dl>

      <h3>Onde esta tarefa está</h3>
      <TrilhaH f={p.fluxo} miuda />
      <p className="gaveta-nota">
        Checkpoint {p.fluxo.atual + 1} de {p.fluxo.etapas.length}
        {et && ` · ${et.itens.filter((x) => x.feito).length} de ${et.itens.length} tarefas prontas`}
      </p>

      <h3>Critério de passagem</h3>
      <p className="gaveta-crit">{et?.criterio || 'Critério não definido nesta etapa.'}</p>
      <p className="gaveta-nota">Aprovação do checkpoint: {nomeDe(et?.aprovador_id ?? null)}</p>

      {p.tipo === 'aprov' ? (
        <button className="btn pri larga" onClick={aoAprovar}><Ic.check />Aprovar saída</button>
      ) : travas ? (
        <button className="btn larga" disabled><Ic.lock />Concluir tarefa</button>
      ) : (
        <button className="btn pri larga" onClick={aoConcluir}>
          <Ic.check />{feito ? 'Reabrir tarefa' : 'Marcar como feita'}
        </button>
      )}
      <Link className="gaveta-abrir" href={`/fluxo/${p.fluxo.id}`}>Abrir track <Ic.seta /></Link>
    </aside>
  )
}
