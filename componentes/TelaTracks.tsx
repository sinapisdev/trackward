'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useDados } from './Dados'
import { useModais } from './Modais'
import { Carregando } from './Shell'
import { Ic } from './Icones'
import { Av, IconeStatus } from './atomos'
import { Pastas, type Pasta } from './Pastas'
import { TrilhaH } from './Trilha'
import { rotuloTipo } from '@/lib/rotulos'
import { rel } from '@/lib/datas'
import { nomeDoMotivo } from '@/lib/desfecho'
import { envolve, etapaAtual, LBL, progresso, proxPrazo, status } from '@/lib/regras'
import type { Fluxo, Tipo } from '@/lib/tipos'

type Corte = 'tudo' | 'esteira' | 'ciclo'

/**
 * Tracks: objetivos e rotinas no mesmo lugar.
 *
 * Eram duas telas, e ser duas telas era a afirmação errada. **Objetivo e rotina
 * são o mesmo objeto**, com uma diferença só: um tem fim e o outro dá voltas.
 * Quem procura "aquela coisa do Financeiro" não sabe de antemão em qual das
 * duas ela está, e tinha que adivinhar a tela antes de achar o trabalho.
 *
 * A **área** deixou de ser uma tela e virou um filtro, que é o que ela sempre
 * foi: uma etiqueta que agrupa. Track sem área continua existindo, e não é
 * exceção: um negócio novo não tem área ainda, e inventar uma para ele caber
 * seria organizar antes de entender.
 *
 * A lista manda, e as pastas são o outro jeito de olhar. Era o contrário, e o
 * contrário custava caro: o arquivo é bonito para passear e ruim para achar.
 */
export function TelaTracks() {
  const { fluxos, arquivadas, areas, perfis, areaDe, perfilDe, nomeDe, minhaLista, carregando } = useDados()
  const { abrir } = useModais()
  const router = useRouter()
  const params = useSearchParams()

  const [corte, setCorte] = useState<Corte>((params.get('tipo') as Corte) || 'tudo')
  const [area, setArea] = useState(params.get('area') || '')
  const [pessoa, setPessoa] = useState('')
  const [termo, setTermo] = useState('')
  const [modo, setModo] = useState<'lista' | 'pastas'>('lista')
  const [naVez, setNaVez] = useState(0)
  /**
   * O arquivo é um lugar, e não um filtro escondido no rodapé.
   *
   * Era um "Mostrar as concluídas" na última linha da tela, que é onde ninguém
   * olha, e a track concluída continuava no meio das vivas quando ligado. Agora
   * é uma face: ou você está vendo o que anda, ou o que terminou. As duas listas
   * têm a mesma tabela e os mesmos filtros, porque procurar no arquivo é a mesma
   * pergunta feita sobre outro conjunto.
   */
  const [noArquivo, setNoArquivo] = useState(false)

  const todas = useMemo(
    // A lista pessoal não é uma track: não tem checkpoint, não tem quem aprove,
    // e ninguém mais a enxerga. Ela é onde moram as tarefas avulsas.
    () => (noArquivo ? arquivadas : fluxos).filter((f) => f.id !== minhaLista?.id),
    [fluxos, arquivadas, noArquivo, minhaLista],
  )

  const lista = useMemo(() => {
    const limpa = (x: string) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    return todas
      .filter((f) => corte === 'tudo' || f.tipo === corte)
      .filter((f) => !area || (area === 'sem' ? !f.area_id : f.area_id === area))
      .filter((f) => !pessoa || envolve(f, pessoa))
      .filter((f) => !termo.trim() || limpa(f.nome).includes(limpa(termo)))
      .sort((a, b) => {
        const peso = { late: 0, hold: 1, soon: 2, ok: 3, done: 4 } as Record<string, number>
        return peso[status(a)] - peso[status(b)] || a.nome.localeCompare(b.nome, 'pt-BR')
      })
  }, [todas, corte, area, pessoa, termo])

  const pastas = useMemo<Pasta[]>(() => lista.map((f) => {
    const et = etapaAtual(f)
    const feitos = et ? et.itens.filter((x) => x.feito).length : 0
    const st = status(f)
    const pp = proxPrazo(f)
    const gente = [...new Set([
      f.dono_id, ...f.etapas.map((e) => e.aprovador_id),
      ...f.etapas.flatMap((e) => e.itens.map((i) => i.resp_id)),
    ].filter(Boolean) as string[])].map((id) => perfilDe(id))
    return {
      id: f.id, href: `/fluxo/${f.id}`, rotulo: rotuloTipo(f.tipo), nome: f.nome,
      etapa: f.concluido ? 'Concluída' : et?.nome || 'Sem checkpoint', st,
      numero: `${Math.round(progresso(f) * 100)}%`,
      numeroSub: f.tipo === 'ciclo' ? 'da volta atual' : 'de progresso',
      pe: et ? `${feitos} de ${et.itens.length} ${et.itens.length === 1 ? 'pronta' : 'prontas'}` : '',
      alerta: st === 'late' ? 'Atrasada' : st === 'hold' ? 'Travada'
        : st === 'soon' && pp ? `Prazo ${rel(pp).toLowerCase()}` : undefined,
      alertaTipo: (st === 'late' ? 'late' : st === 'hold' ? 'hold' : st === 'soon' ? 'soon' : undefined) as
        'late' | 'hold' | 'soon' | undefined,
      gente, progresso: progresso(f),
      atrasado: st === 'late', travado: st === 'hold',
    }
  }), [lista, perfilDe])

  if (carregando) return <Carregando />

  const conta = (c: Corte) => todas.filter((f) => c === 'tudo' || f.tipo === c).length

  const vazio = !todas.length
  const idx = Math.min(naVez, Math.max(0, pastas.length - 1))

  return (
    <>
      <div className="hdr">
        <div>
          <h1>Tracks</h1>
          <p className="lede">
            {vazio
              ? 'Ainda não existe nenhuma. Uma track é um objetivo, que acaba, ou uma rotina, que dá voltas.'
              : <>Objetivos e rotinas, com ou sem área.</>}
          </p>
        </div>
        <div className="hdr-actions">
          <button className="btn" onClick={() => abrir({ tipo: 'fluxo', tipoFluxo: 'esteira' })}>
            <Ic.plus />Nova track
          </button>
        </div>
      </div>

      {vazio ? (
        <div className="card">
          <div className="onb">
            <h3>Comece por uma track</h3>
            <p>
              Tudo no TrackWard pendura em uma das duas: um <b>objetivo</b>, que tem começo,
              checkpoints e fim, ou uma <b>rotina</b>, que se repete e guarda o histórico de cada
              volta. As duas podem morar numa área ou viver soltas, e a área você cria na hora, ali
              mesmo no formulário.
            </p>
            <div className="row-inline">
              <button className="btn pri" onClick={() => abrir({ tipo: 'fluxo', tipoFluxo: 'esteira' })}>
                <Ic.plus />Novo objetivo
              </button>
              <button className="btn" onClick={() => abrir({ tipo: 'fluxo', tipoFluxo: 'ciclo' })}>
                <Ic.ciclo />Nova rotina
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="filtros" data-tut="tracks-filtros">
            <div className="seg" role="group" aria-label="O que mostrar">
              {([['tudo', 'Tudo'], ['esteira', 'Objetivos'], ['ciclo', 'Rotinas']] as [Corte, string][])
                .map(([c, nome]) => (
                  <button key={c} className={corte === c ? 'on' : ''} onClick={() => { setCorte(c); setNaVez(0) }}>
                    {nome}<span className="num">{conta(c)}</span>
                  </button>
                ))}
            </div>
            <div className="seg" role="group" aria-label="Vivas ou arquivadas" data-tut="tracks-arquivadas">
              <button className={!noArquivo ? 'on' : ''}
                onClick={() => { setNoArquivo(false); setNaVez(0) }}>Em andamento</button>
              <button className={noArquivo ? 'on' : ''}
                onClick={() => { setNoArquivo(true); setNaVez(0) }}>
                Arquivadas<span className="num">{arquivadas.length}</span>
              </button>
            </div>
            <label className="campo-busca">
              <Ic.lupa />
              <input value={termo} onChange={(e) => setTermo(e.target.value)}
                placeholder="Buscar track" aria-label="Buscar track" />
            </label>
            <label className="sel-quem">
              <select value={area} onChange={(e) => { setArea(e.target.value); setNaVez(0) }}
                aria-label="Filtrar por área">
                <option value="">Todas as áreas</option>
                {areas.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
                <option value="sem">Sem área</option>
              </select>
              <Ic.chev />
            </label>
            {perfis.filter((p) => p.ativo).length > 1 && (
              <label className="sel-quem">
                <select value={pessoa} onChange={(e) => setPessoa(e.target.value)}
                  aria-label="Filtrar por pessoa">
                  <option value="">Toda a equipe</option>
                  {perfis.filter((p) => p.ativo).map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
                <Ic.chev />
              </label>
            )}
            <div className="seg" style={{ marginLeft: 'auto' }} role="group" aria-label="Como ver">
              <button className={modo === 'lista' ? 'on' : ''} onClick={() => setModo('lista')}>Lista</button>
              <button className={modo === 'pastas' ? 'on' : ''} onClick={() => setModo('pastas')}>Pastas</button>
            </div>
          </div>

          {modo === 'pastas' && !!pastas.length && (
            <div className="arquivo-curto">
              <Pastas rotulo="Tracks" itens={pastas} atual={idx} aoTrocar={setNaVez}
                aoAbrir={(p) => router.push(p.href)} />
              <div className="foco centro">
                <Link className="btn pri" href={pastas[idx].href}>Abrir track<Ic.seta /></Link>
              </div>
            </div>
          )}

          {lista.length ? (
            <div className="tk-lista">
              {lista.map((f) => {
                const st = status(f)
                const et = etapaAtual(f)
                const feitos = et ? et.itens.filter((x) => x.feito).length : 0
                const pp = proxPrazo(f)
                return (
                  <article className="tk-l" key={f.id}>
                    <span className="tk-ic" title={rotuloTipo(f.tipo)}>
                      {f.tipo === 'ciclo' ? <Ic.ciclo /> : <Ic.proj />}
                    </span>
                    <div className="tk-quem">
                      <Link className="tk-nome" href={`/fluxo/${f.id}`}>{f.nome}</Link>
                      <p className="tk-meta">
                        <span className="tk-tipo">{rotuloTipo(f.tipo)}</span>
                        <span className="sep">·</span>
                        <span>{f.area_id ? areaDe(f.area_id).nome : 'Sem área'}</span>
                        {f.tipo === 'ciclo' && f.periodo && (
                          <><span className="sep">·</span><span>Volta {f.periodo}</span></>
                        )}
                      </p>
                      <p className="tk-dono">
                        {/* No arquivo o que interessa não é o prazo nem a
                            situação: a track parou, e "Atrasado" ali é uma
                            cobrança que não cabe mais a ninguém. O que se lê é
                            como ela terminou. */}
                        {f.desfecho ? (
                          <span className="tk-arq" title={f.detalhe || ''}>
                            {f.desfecho === 'concluido' ? <Ic.check /> : <Ic.pause />}
                            {f.desfecho === 'concluido' ? 'Concluída' : nomeDoMotivo(f.motivo)}
                            {f.arquivado_em && ` · ${rel(f.arquivado_em.slice(0, 10))}`}
                          </span>
                        ) : (
                          <>
                            <span className={`tk-st ${st}`}>
                              <IconeStatus st={st} p={progresso(f)} />{LBL[st]}
                            </span>
                            {pp && <><span className="sep">·</span><span>{rel(pp)}</span></>}
                          </>
                        )}
                        <span className="sep">·</span>
                        <Av p={perfilDe(f.dono_id)} tam="sm" />{nomeDe(f.dono_id)}
                      </p>
                    </div>
                    <div className="tk-trilha">
                      {f.etapas.length ? <TrilhaH f={f} miuda /> : <span className="hint">Sem checkpoints</span>}
                      {!!et && (
                        <small>
                          {feitos} de {et.itens.length} {et.itens.length === 1 ? 'tarefa pronta' : 'tarefas prontas'}
                        </small>
                      )}
                    </div>
                    <Link className="tk-abrir" href={`/fluxo/${f.id}`} aria-label={`Abrir ${f.nome}`}>
                      <Ic.seta />
                    </Link>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="tb-vazio">Nenhuma track com esses filtros.</div>
          )}

          <div className="tb-pe">
            <span>
              {lista.length} de {todas.length} {lista.length === 1 ? 'track' : 'tracks'}
              {noArquivo && ' no arquivo'}
            </span>
          </div>
        </>
      )}
    </>
  )
}

/** O tipo vindo da rota, para quem chega por um link antigo. */
export const corteDaRota = (t: string | null): Tipo | null =>
  t === 'ciclo' || t === 'esteira' ? t : null
