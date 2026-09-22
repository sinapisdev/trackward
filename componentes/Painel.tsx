'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useDados } from './Dados'
import { useModais } from './Modais'
import { Carregando } from './Shell'
import { Ic } from './Icones'
import { Av } from './atomos'
import { LinhaPendencia } from './partes'
import { Pastas, type Pasta } from './Pastas'
import { Radar, TabelaTracks } from './Radar'
import { TrilhaH } from './Trilha'
import { DSEM_LONGO, hoje, isoDe, MES_LONGO, rel } from '@/lib/datas'
import { etapaAtual, envolve, pendencias, progresso, proxPrazo, status } from '@/lib/regras'
import type { Fluxo, Status } from '@/lib/tipos'

/** Quem é a pasta em foco, para a trilha e o botão de abrir embaixo dela. */
type Foco = { pasta: Pasta; fluxo: Fluxo | null }

export function Painel() {
  const { eu, fluxos, areas, perfis, carregando, perfilDe, nomeDe } = useDados()
  const { abrir } = useModais()
  const router = useRouter()
  const [pessoa, setPessoa] = useState<string | null>(null)
  const [naVez, setNaVez] = useState(0)
  const [modo, setModo] = useState<'pastas' | 'lista'>('pastas')

  /**
   * As frentes da empresa em pastas: as áreas, que são cíclicas e não acabam, e
   * os projetos, que têm começo e fim. Na ordem da urgência, porque a primeira
   * pasta é a única que a pessoa vê sem mexer em nada.
   */
  const pastas = useMemo<(Pasta & { fluxo: Fluxo | null })[]>(() => {
    const peso = { late: 0, hold: 1, soon: 2, ok: 3, done: 4 } as Record<string, number>
    /** Quem está dentro daquelas tracks, sem repetir ninguém. */
    const pessoas = (fs: Fluxo[]) =>
      [...new Set(fs.flatMap((f) => [
        f.dono_id, ...f.etapas.map((e) => e.aprovador_id),
        ...f.etapas.flatMap((e) => e.itens.map((i) => i.resp_id)),
      ]).filter(Boolean) as string[])].map((id) => perfilDe(id))

    const daArea = (id: string) => fluxos.filter(
      (f) => f.area_id === id && f.tipo === 'ciclo' && !f.concluido && envolve(f, pessoa),
    )

    const deAreas = areas.map((a) => {
      const rotinas = daArea(a.id)
      const abertas = rotinas.flatMap((f) => f.etapas.flatMap((e) => e.itens)).filter((i) => !i.feito).length
      const tarde = rotinas.filter((f) => status(f) === 'late').length
      const presas = rotinas.filter((f) => status(f) === 'hold').length
      const medio = rotinas.length ? rotinas.reduce((n, f) => n + progresso(f), 0) / rotinas.length : 0
      const pior = rotinas.length ? Math.min(...rotinas.map((f) => peso[status(f)])) : 3
      const st = (['late', 'hold', 'soon', 'ok', 'done'] as Status[])[pior]
      return {
        id: `a-${a.id}`, href: `/area/${a.id}`, rotulo: 'Área', nome: a.nome,
        etapa: rotinas.length
          ? `${rotinas.length} ${rotinas.length === 1 ? 'rotina' : 'rotinas'}`
          : 'Sem rotinas ainda',
        st,
        numero: String(abertas),
        numeroSub: abertas === 1 ? 'tarefa aberta' : 'tarefas abertas',
        pe: `${rotinas.length} ${rotinas.length === 1 ? 'rotina' : 'rotinas'} em andamento`,
        alerta: tarde ? `${tarde} atrasada${tarde > 1 ? 's' : ''}` : presas ? 'Travada' : undefined,
        alertaTipo: (tarde ? 'late' : presas ? 'hold' : undefined) as 'late' | 'hold' | undefined,
        gente: pessoas(rotinas), progresso: medio,
        atrasado: tarde > 0, travado: !tarde && presas > 0,
        fluxo: null as Fluxo | null, ord: pior,
      }
    })

    const deProjetos = fluxos
      .filter((f) => f.tipo === 'esteira' && !f.concluido && envolve(f, pessoa))
      .map((f) => {
        const et = etapaAtual(f)
        const feitos = et ? et.itens.filter((x) => x.feito).length : 0
        const st = status(f)
        const pp = proxPrazo(f)
        return {
          id: `p-${f.id}`, href: `/fluxo/${f.id}`, rotulo: 'Projeto', nome: f.nome,
          etapa: et?.nome || 'Sem checkpoint',
          st,
          numero: `${Math.round(progresso(f) * 100)}%`,
          numeroSub: 'de progresso',
          pe: et ? `${feitos} de ${et.itens.length} ${et.itens.length === 1 ? 'tarefa pronta' : 'tarefas prontas'}` : '',
          alerta: st === 'late' ? 'Atrasado' : st === 'hold' ? 'Travado'
            : st === 'soon' && pp ? `Prazo ${rel(pp).toLowerCase()}` : undefined,
          alertaTipo: (st === 'late' ? 'late' : st === 'hold' ? 'hold' : st === 'soon' ? 'soon' : undefined) as
            'late' | 'hold' | 'soon' | undefined,
          gente: pessoas([f]), progresso: progresso(f),
          atrasado: st === 'late', travado: st === 'hold',
          fluxo: f as Fluxo | null, ord: peso[st],
        }
      })

    return [...deAreas, ...deProjetos]
      .sort((a, b) => a.ord - b.ord || a.nome.localeCompare(b.nome, 'pt-BR'))
      .map(({ ord: _ord, ...resto }) => resto)
  }, [fluxos, areas, pessoa, perfilDe])

  /** A atividade mais recente da empresa: uma linha só, a última que aconteceu. */
  const ultima = useMemo(() => {
    const tudo = fluxos.flatMap((f) => f.log.map((a) => ({ a, f })))
    tudo.sort((x, y) => y.a.criado_em.localeCompare(x.a.criado_em))
    return tudo[0] || null
  }, [fluxos])

  if (carregando) return <Carregando />

  const lista = fluxos.filter((f) => envolve(f, pessoa))
  const minhas = pendencias(fluxos, eu.id)
  const emMovimento = lista.filter((f) => !f.concluido)

  const h = hoje()
  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'
  const primeiroNome = eu.nome.split(' ')[0]

  const conta = (k: string) => lista.filter((f) => status(f) === k).length
  const partes: string[] = []
  if (conta('late')) partes.push('late')
  if (conta('hold')) partes.push('hold')
  const vazio = !fluxos.length && !areas.length

  const idx = Math.min(naVez, Math.max(0, pastas.length - 1))
  const foco: Foco | null = pastas.length ? { pasta: pastas[idx], fluxo: pastas[idx].fluxo } : null
  const ativos = perfis.filter((p) => p.ativo)

  return (
    <div className="duas uma-tela">
      <div className="corpo">
        <div className="hdr">
          <div>
            <div className="eyebrow">
              {DSEM_LONGO[h.getDay()]}, {h.getDate()} de {MES_LONGO[h.getMonth()]}
            </div>
            <h1>{saudacao}, {primeiroNome}.</h1>
            <p className="lede">
              {!fluxos.length ? 'Nada cadastrado ainda.' : !partes.length ? 'Tudo em dia.' : (
                <>
                  {partes.map((k, i) => (
                    <span key={k}>
                      {i > 0 && ' · '}
                      {k === 'late' && <b className="l">{conta('late')} {conta('late') > 1 ? 'atrasadas' : 'atrasada'}</b>}
                      {k === 'hold' && <b className="h">{conta('hold')} {conta('hold') > 1 ? 'travadas' : 'travada'}</b>}
                    </span>
                  ))}
                </>
              )}
              {!!minhas.length && (
                <> · {minhas.length} {minhas.length > 1 ? 'itens aguardam' : 'item aguarda'} você</>
              )}
            </p>
          </div>
          <div className="hdr-actions">
            <button className="btn" onClick={() => abrir({ tipo: 'fluxo', tipoFluxo: 'esteira' })}>
              <Ic.plus />Criar
            </button>
          </div>
        </div>

        {vazio ? (
          <div className="card">
            <div className="onb">
              <h3>Comece criando uma área</h3>
              <p>
                Áreas são as frentes que já funcionam na empresa: Financeiro, Comercial, Operações,
                Pessoas. Cada uma guarda as rotinas que se repetem.
              </p>
              {eu.papel === 'admin'
                ? <button className="btn pri" onClick={() => abrir({ tipo: 'area' })}><Ic.plus />Nova área</button>
                : <p className="hint">Peça a um administrador para criar as áreas da empresa.</p>}
            </div>
          </div>
        ) : (
          <>
            <section className="sec mov">
              <div className="sec-h">
                <h2>Em movimento</h2>
                <div className="sec-ctl">
                  <div className="seg" role="group" aria-label="Como ver">
                    <button className={modo === 'pastas' ? 'on' : ''} onClick={() => setModo('pastas')}>Pastas</button>
                    <button className={modo === 'lista' ? 'on' : ''} onClick={() => setModo('lista')}>Lista</button>
                  </div>
                  {ativos.length > 1 && (
                    <label className="sel-quem">
                      <Ic.team />
                      <select value={pessoa || ''} onChange={(e) => setPessoa(e.target.value || null)}
                        aria-label="Filtrar por pessoa">
                        <option value="">Toda a equipe</option>
                        {ativos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                      </select>
                      <Ic.chev />
                    </label>
                  )}
                  {modo === 'pastas' && pastas.length > 1 && (
                    <div className="pager">
                      <button className="iconbtn" onClick={() => setNaVez(Math.max(0, idx - 1))}
                        disabled={idx === 0} aria-label="Anterior"><Ic.volta /></button>
                      <span className="num">{idx + 1} de {pastas.length}</span>
                      <button className="iconbtn" onClick={() => setNaVez(Math.min(pastas.length - 1, idx + 1))}
                        disabled={idx >= pastas.length - 1} aria-label="Próxima"><Ic.seta /></button>
                    </div>
                  )}
                </div>
              </div>

              {modo === 'lista' ? (
                /* A visão geral não rola, então a lista mostra só o que cabe.
                   O total e o "ver todas" ficam embaixo, para ninguém achar
                   que são essas as únicas tracks em movimento. */
                <div className="mov-tabela">
                  <TabelaTracks lista={emMovimento.slice(0, 6)} vazio="Nada em movimento com esse filtro." />
                  {!!emMovimento.length && (
                    <p className="tb-pe">
                      <span>{emMovimento.length} {emMovimento.length === 1 ? 'track' : 'tracks'} em movimento</span>
                      <Link href="/tracks">Ver todas<Ic.seta /></Link>
                    </p>
                  )}
                </div>
              ) : pastas.length ? (
                <>
                  <Pastas
                    rotulo="As frentes da empresa"
                    itens={pastas}
                    atual={idx}
                    aoTrocar={setNaVez}
                    aoAbrir={(p) => router.push(p.href)}
                  />
                  {foco && (
                    <div className="foco">
                      {foco.fluxo && foco.fluxo.etapas.length
                        ? <TrilhaH f={foco.fluxo} />
                        : <p className="foco-sub">{foco.pasta.etapa}</p>}
                      <Link className="btn pri" href={foco.pasta.href}>
                        {foco.fluxo ? 'Abrir track' : 'Abrir área'}<Ic.seta />
                      </Link>
                    </div>
                  )}
                </>
              ) : (
                <div className="tb-vazio">Nada em movimento com esse filtro.</div>
              )}
            </section>

            <section className="sec fila-curta">
              <div className="sec-h">
                <h2>Aguardando você <span className="sec-ct num">{minhas.length}</span></h2>
                <Link className="sec-ver" href="/minhas">Ver tudo <Ic.seta /></Link>
              </div>
              {minhas.length
                ? <div className="lista-fina">{minhas.slice(0, 3).map((p, i) => <LinhaPendencia key={i} p={p} />)}</div>
                : <div className="tb-vazio">Nada aguardando você agora.</div>}
            </section>

            {ultima && (
              <div className="atv-recente">
                <span className="rot">Atividade recente</span>
                <Av p={perfilDe(ultima.a.quem_id)} tam="sm" />
                <span className="txt">
                  <b>{ultima.a.por_ia ? 'A leitura da conversa' : nomeDe(ultima.a.quem_id)}</b> {ultima.a.texto}
                </span>
                <span className="quando">{rel(isoDe(ultima.a.criado_em))}</span>
              </div>
            )}
          </>
        )}
      </div>

      <aside className="rail">
        <Radar lista={lista} />
      </aside>
    </div>
  )
}
