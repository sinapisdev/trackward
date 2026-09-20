'use client'

import { useMemo, useState } from 'react'
import { useDados } from './Dados'
import { useModais } from './Modais'
import { Carregando } from './Shell'
import { Ic } from './Icones'
import { FiltroPessoas, Grupos, Lateral, LinhaPendencia } from './partes'
import { Pastas, type Pasta } from './Pastas'
import { DSEM_LONGO, hoje, MES_LONGO } from '@/lib/datas'
import { etapaAtual, envolve, pendencias, progresso, status } from '@/lib/regras'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export function Painel() {
  const { eu, fluxos, areas, carregando, nomeDe } = useDados()
  const { abrir } = useModais()
  const router = useRouter()
  const [pessoa, setPessoa] = useState<string | null>(null)
  const [naVez, setNaVez] = useState(0)

  /**
   * As frentes da empresa em pastas: as áreas, que são cíclicas e não acabam, e
   * os projetos, que têm começo e fim. Na ordem da urgência, porque a primeira
   * pasta é a única que a pessoa vê sem rolar nada.
   *
   * O número grande do miolo muda conforme o que a pasta é. Num projeto é o
   * quanto ele já andou; numa área é quantas tarefas estão abertas, porque área
   * não tem linha de chegada e porcentagem ali não diria nada.
   */
  const pastas = useMemo<Pasta[]>(() => {
    const peso = { late: 0, hold: 1, soon: 2, ok: 3, done: 4 } as Record<string, number>
    const gente = (fs: typeof fluxos) =>
      new Set(fs.flatMap((f) => [
        f.dono_id, ...f.etapas.map((e) => e.aprovador_id),
        ...f.etapas.flatMap((e) => e.itens.map((i) => i.resp_id)),
      ]).filter(Boolean) as string[]).size

    const daArea = (id: string) => fluxos.filter(
      (f) => f.area_id === id && f.tipo === 'ciclo' && !f.concluido && envolve(f, pessoa),
    )

    const deAreas: (Pasta & { ord: number })[] = areas.map((a) => {
      const rotinas = daArea(a.id)
      const abertas = rotinas.flatMap((f) => f.etapas.flatMap((e) => e.itens)).filter((i) => !i.feito).length
      const tarde = rotinas.filter((f) => status(f) === 'late').length
      const presas = rotinas.filter((f) => status(f) === 'hold').length
      const medio = rotinas.length
        ? rotinas.reduce((n, f) => n + progresso(f), 0) / rotinas.length
        : 0
      const pior = rotinas.length ? Math.min(...rotinas.map((f) => peso[status(f)])) : 3
      return {
        id: `a-${a.id}`,
        href: `/area/${a.id}`,
        rotulo: 'Área',
        nome: a.nome,
        numero: String(abertas),
        numeroSub: abertas === 1 ? 'tarefa aberta' : 'tarefas abertas',
        sub: rotinas.length
          ? `${rotinas.length} ${rotinas.length === 1 ? 'rotina' : 'rotinas'}`
            + (tarde ? `, ${tarde} atrasada${tarde > 1 ? 's' : ''}` : '')
          : 'Sem rotinas ainda',
        contagem: gente(rotinas),
        progresso: medio,
        atrasado: tarde > 0,
        travado: !tarde && presas > 0,
        ord: pior,
      }
    })

    const deProjetos: (Pasta & { ord: number })[] = fluxos
      .filter((f) => f.tipo === 'esteira' && !f.concluido && envolve(f, pessoa))
      .map((f) => ({
        id: `p-${f.id}`,
        href: `/fluxo/${f.id}`,
        rotulo: 'Projeto',
        nome: f.nome,
        numero: `${Math.round(progresso(f) * 100)}%`,
        sub: etapaAtual(f)?.nome || 'Sem checkpoint',
        contagem: gente([f]),
        progresso: progresso(f),
        atrasado: status(f) === 'late',
        travado: status(f) === 'hold',
        ord: peso[status(f)],
      }))

    return [...deAreas, ...deProjetos]
      .sort((a, b) => a.ord - b.ord || a.nome.localeCompare(b.nome, 'pt-BR'))
      .map(({ ord: _ord, ...resto }) => resto)
  }, [fluxos, areas, pessoa])

  if (carregando) return <Carregando />

  const lista = fluxos.filter((f) => envolve(f, pessoa))
  const conta = (k: string) => lista.filter((f) => status(f) === k).length
  const minhas = pendencias(fluxos, eu.id)

  const partes: string[] = []
  if (conta('late')) partes.push('late')
  if (conta('hold')) partes.push('hold')
  if (conta('soon')) partes.push('soon')

  const h = hoje()
  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'
  const primeiroNome = eu.nome.split(' ')[0]

  const frase = !fluxos.length ? (
    'Nada cadastrado ainda.'
  ) : !partes.length ? (
    'Tudo em dia.'
  ) : (
    <>
      {partes.map((k, i) => (
        <span key={k}>
          {i > 0 && (i === partes.length - 1 ? ' e ' : ', ')}
          {k === 'late' && <b className="l">{conta('late')} {conta('late') > 1 ? 'esteiras atrasadas' : 'esteira atrasada'}</b>}
          {k === 'hold' && <b className="h">{conta('hold')} {conta('hold') > 1 ? 'travadas' : 'travada'}</b>}
          {k === 'soon' && <b className="w">{conta('soon')} vencendo em até 3 dias</b>}
        </span>
      ))}
      .
    </>
  )

  const vazio = !fluxos.length

  return (
    <>
      <div className="hdr">
        <div>
          <div className="eyebrow">
            {DSEM_LONGO[h.getDay()]}, {h.getDate()} de {MES_LONGO[h.getMonth()]}
          </div>
          <h1>{saudacao}, {primeiroNome}</h1>
          <p className="lede">
            {frase}{' '}
            {!!minhas.length && (
              <>
                <b>{minhas.length}</b> {minhas.length > 1 ? 'itens aguardam' : 'item aguarda'} você.
              </>
            )}
          </p>
        </div>
        <div className="hdr-actions">
          <FiltroPessoas pessoa={pessoa} aoTrocar={setPessoa} />
          {!!areas.length && (
            <button className="btn pri" onClick={() => abrir({ tipo: 'fluxo', tipoFluxo: 'esteira' })}>
              <Ic.plus />Novo
            </button>
          )}
        </div>
      </div>

      {vazio ? (
        <div className="card">
          <div className="onb">
            <h3>{areas.length ? 'Crie o primeiro projeto ou rotina' : 'Comece criando uma área'}</h3>
            <p>
              {areas.length
                ? 'Projetos têm início, checkpoints e fim. Rotinas se repetem a cada período e guardam o histórico de cada volta.'
                : 'Áreas são as frentes que já funcionam na empresa: Financeiro, Comercial, Operações, Pessoas. Cada uma guarda as rotinas que se repetem.'}
            </p>
            {areas.length ? (
              <div className="row-inline">
                <button className="btn pri" onClick={() => abrir({ tipo: 'fluxo', tipoFluxo: 'esteira' })}>
                  <Ic.plus />Novo projeto
                </button>
                <button className="btn" onClick={() => abrir({ tipo: 'fluxo', tipoFluxo: 'ciclo' })}>
                  <Ic.ciclo />Nova rotina
                </button>
              </div>
            ) : eu.papel === 'admin' ? (
              <button className="btn pri" onClick={() => abrir({ tipo: 'area' })}><Ic.plus />Nova área</button>
            ) : (
              <p className="hint">Peça a um administrador para criar os areas da empresa.</p>
            )}
          </div>
        </div>
      ) : (
        <>
        {pastas.length > 1 && (
          <Pastas
            rotulo="As frentes da empresa"
            itens={pastas}
            atual={Math.min(naVez, pastas.length - 1)}
            aoTrocar={setNaVez}
            aoAbrir={(p) => router.push(p.href)}
          />
        )}
        <div className="grid2">
          <div>
            {!pessoa && !!minhas.length && (
              <div className="blk">
                <div className="bh">
                  <h2>Aguardando você</h2>
                  <span className="c num">{minhas.length}</span>
                  <Link className="r" href="/minhas">Ver todas</Link>
                </div>
                <div className="card">
                  {minhas.slice(0, 4).map((p, i) => <LinhaPendencia key={i} p={p} />)}
                </div>
              </div>
            )}
            <div className="blk">
              <div className="bh">
                <h2>Radar</h2>
                <span className="c">
                  {pessoa ? `com participação de ${nomeDe(pessoa)}` : 'todos os projetos e rotinas'}
                </span>
              </div>
              <Grupos lista={lista} />
            </div>
          </div>
          <Lateral lista={lista} />
        </div>
        </>
      )}
    </>
  )
}
