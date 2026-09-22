'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useDados } from './Dados'
import { useModais } from './Modais'
import { Carregando } from './Shell'
import { Ic } from './Icones'
import { Pastas, type Pasta } from './Pastas'
import { TabelaTracks } from './Radar'
import { comProblema, envolve, etapaAtual, progresso, proxPrazo, status } from '@/lib/regras'
import { rel } from '@/lib/datas'
import type { Fluxo } from '@/lib/tipos'

/**
 * Tudo que tem começo e fim, em um lugar só: as iniciativas em andamento,
 * das que já têm área às que ainda são só um negócio novo.
 */
export function TelaProjetos() {
  const { fluxos, areas, perfis, perfilDe, carregando } = useDados()
  const { abrir } = useModais()
  const router = useRouter()
  const [termo, setTermo] = useState('')
  const [sit, setSit] = useState('')
  const [pessoa, setPessoa] = useState('')
  const [area, setArea] = useState('')
  const [modo, setModo] = useState<'pastas' | 'lista'>('pastas')
  const [aba, setAba] = useState<'curso' | 'fim'>('curso')
  const [naVez, setNaVez] = useState(0)
  const [tudo, setTudo] = useState(false)

  const todos = useMemo(() => fluxos.filter((f) => f.tipo === 'esteira'), [fluxos])

  const filtrados = useMemo(() => {
    const limpa = (x: string) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    return todos.filter((f) =>
      (!termo.trim() || limpa(f.nome).includes(limpa(termo)))
      && (!sit || status(f) === sit)
      && (!pessoa || envolve(f, pessoa))
      && (!area || (f.area_id || '') === area))
  }, [todos, termo, sit, pessoa, area])

  const emCurso = filtrados.filter((f) => !f.concluido)
  const concluidos = filtrados.filter((f) => f.concluido)

  /** As pastas do arquivo são os projetos em andamento, do mais urgente ao menos. */
  const pastas = useMemo<Pasta[]>(() => {
    const peso = { late: 0, hold: 1, soon: 2, ok: 3, done: 4 } as Record<string, number>
    return [...emCurso]
      .sort((a, b) => peso[status(a)] - peso[status(b)] || a.nome.localeCompare(b.nome, 'pt-BR'))
      .map((f) => {
        const et = etapaAtual(f)
        const feitos = et ? et.itens.filter((x) => x.feito).length : 0
        const st = status(f)
        const pp = proxPrazo(f)
        const gente = [...new Set([
          f.dono_id, ...f.etapas.map((e) => e.aprovador_id),
          ...f.etapas.flatMap((e) => e.itens.map((i) => i.resp_id)),
        ].filter(Boolean) as string[])].map((id) => perfilDe(id))
        return {
          id: f.id, href: `/fluxo/${f.id}`, rotulo: 'Projeto', nome: f.nome,
          etapa: et?.nome || 'Sem checkpoint', st,
          numero: `${Math.round(progresso(f) * 100)}%`, numeroSub: 'de progresso',
          pe: et ? `${et.nome} · ${feitos} de ${et.itens.length} ${et.itens.length === 1 ? 'pronta' : 'prontas'}` : '',
          alerta: st === 'late' ? 'Atrasado' : st === 'hold' ? 'Travado'
            : st === 'soon' && pp ? `Prazo ${rel(pp).toLowerCase()}` : undefined,
          alertaTipo: (st === 'late' ? 'late' : st === 'hold' ? 'hold' : st === 'soon' ? 'soon' : undefined) as
            'late' | 'hold' | 'soon' | undefined,
          gente, progresso: progresso(f),
          atrasado: st === 'late', travado: st === 'hold',
        }
      })
  }, [emCurso, perfilDe])

  if (carregando) return <Carregando />

  const problemas = comProblema(todos.filter((f) => !f.concluido))
  const naAba: Fluxo[] = aba === 'curso' ? emCurso : concluidos
  const mostra = tudo ? naAba : naAba.slice(0, 5)
  const idx = Math.min(naVez, Math.max(0, pastas.length - 1))

  return (
    <>
      <div className="hdr">
        <div>
          <h1>Projetos</h1>
          <p className="lede">
            {todos.length
              ? <>{todos.length} {todos.length === 1 ? 'projeto' : 'projetos'}
                  {!!problemas && <> · <b className="l">{problemas} {problemas === 1 ? 'precisa' : 'precisam'} de atenção</b></>}</>
              : 'Nenhum projeto ainda.'}
          </p>
        </div>
        <div className="hdr-actions">
          <button className="btn" onClick={() => abrir({ tipo: 'fluxo', tipoFluxo: 'esteira' })}>
            <Ic.plus />Novo projeto
          </button>
        </div>
      </div>

      {!todos.length ? (
        <div className="card">
          <div className="onb">
            <h3>Nenhum projeto em andamento</h3>
            <p>
              Projetos são as iniciativas que têm começo e fim: uma implantação, uma obra, um
              negócio novo. Podem pertencer a uma área ou nascer soltos.
            </p>
            <button className="btn pri" onClick={() => abrir({ tipo: 'fluxo', tipoFluxo: 'esteira' })}>
              <Ic.plus />Novo projeto
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="filtros">
            <label className="campo-busca">
              <Ic.lupa />
              <input value={termo} onChange={(e) => setTermo(e.target.value)}
                placeholder="Buscar projeto" aria-label="Buscar projeto" />
            </label>
            <label className="sel-quem">
              <select value={sit} onChange={(e) => setSit(e.target.value)} aria-label="Filtrar por situação">
                <option value="">Situação</option>
                <option value="late">Atrasado</option>
                <option value="hold">Travado</option>
                <option value="soon">Vence em breve</option>
                <option value="ok">Em dia</option>
                <option value="done">Concluído</option>
              </select>
              <Ic.chev />
            </label>
            <label className="sel-quem">
              <select value={pessoa} onChange={(e) => setPessoa(e.target.value)} aria-label="Filtrar por responsável">
                <option value="">Responsável</option>
                {perfis.filter((p) => p.ativo).map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
              <Ic.chev />
            </label>
            <label className="sel-quem">
              <select value={area} onChange={(e) => setArea(e.target.value)} aria-label="Filtrar por área">
                <option value="">Área</option>
                {areas.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
                <option value="">Sem área</option>
              </select>
              <Ic.chev />
            </label>
            <div className="seg" style={{ marginLeft: 'auto' }} role="group" aria-label="Como ver">
              <button className={modo === 'pastas' ? 'on' : ''} onClick={() => setModo('pastas')}>Pastas</button>
              <button className={modo === 'lista' ? 'on' : ''} onClick={() => setModo('lista')}>Lista</button>
            </div>
          </div>

          {modo === 'pastas' && !!pastas.length && (
            <>
              <Pastas
                rotulo="Projetos em andamento"
                itens={pastas}
                atual={idx}
                aoTrocar={setNaVez}
                aoAbrir={(p) => router.push(p.href)}
              />
              <div className="foco centro">
                <Link className="btn pri" href={pastas[idx].href}>Abrir projeto<Ic.seta /></Link>
              </div>
            </>
          )}

          <section className="sec" style={{ marginTop: 34 }}>
            <div className="sec-h">
              <h2>Todos os projetos</h2>
              <div className="abas" role="tablist">
                <button role="tab" aria-selected={aba === 'curso'} className={aba === 'curso' ? 'on' : ''}
                  onClick={() => { setAba('curso'); setTudo(false) }}>
                  Em andamento <span className="num">{emCurso.length}</span>
                </button>
                <button role="tab" aria-selected={aba === 'fim'} className={aba === 'fim' ? 'on' : ''}
                  onClick={() => { setAba('fim'); setTudo(false) }}>
                  Concluídos <span className="num">{concluidos.length}</span>
                </button>
              </div>
            </div>

            <TabelaTracks lista={mostra} vazio="Nenhum projeto com esses filtros." />

            {naAba.length > 5 && (
              <div className="tb-pe">
                <span>{mostra.length} de {naAba.length} {aba === 'curso' ? 'em andamento' : 'concluídos'}</span>
                <button onClick={() => setTudo((v) => !v)}>
                  {tudo ? 'Ver menos' : 'Ver mais'}<Ic.seta />
                </button>
              </div>
            )}
          </section>
        </>
      )}
    </>
  )
}
