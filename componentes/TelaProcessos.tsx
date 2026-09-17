'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useDados } from './Dados'
import { useModais } from './Modais'
import { Carregando } from './Shell'
import { Ic } from './Icones'
import type { Processo } from '@/lib/tipos'

/** Quantas tarefas o processo distribui, somando todos os checkpoints. */
const totalTarefas = (p: Processo) => p.etapas.reduce((n, e) => n + e.itens.length, 0)

/** Quantos dias do início até o último prazo. */
const duracao = (p: Processo) => p.etapas.reduce((n, e) => Math.max(n, e.dias), 0)

export function TelaProcessos() {
  const { eu, processos, areas, areaDe, carregando, excluirProcesso, duplicarProcesso } = useDados()
  const { abrir } = useModais()
  const router = useRouter()

  if (carregando) return <Carregando />

  const podeEditar = eu.papel === 'admin' || eu.papel === 'gestor'
  const projetos = processos.filter((p) => p.tipo === 'esteira')
  const rotinas = processos.filter((p) => p.tipo === 'ciclo')

  const novo = async (tipo: 'esteira' | 'ciclo') => {
    router.push(`/processos/novo?tipo=${tipo}`)
  }

  const Cartao = ({ p }: { p: Processo }) => {
    const areasEnvolvidas = [
      ...new Set([
        ...p.etapas.map((e) => e.aprovador_area_id),
        ...p.etapas.flatMap((e) => e.itens.map((i) => i.area_id)),
      ].filter(Boolean) as string[]),
    ]
    return (
      <div className="card proc-cartao">
        <div className="proc-topo">
          <Link href={`/processos/${p.id}`} className="proc-nome">{p.nome}</Link>
          {podeEditar && (
            <span className="acoes">
              <button className="iconbtn" title="Duplicar" aria-label={`Duplicar ${p.nome}`}
                onClick={async () => {
                  const id = await duplicarProcesso(p.id)
                  if (id) router.push(`/processos/${id}`)
                }}><Ic.copiar /></button>
              <button className="iconbtn" title="Excluir" aria-label={`Excluir ${p.nome}`}
                onClick={() => abrir({
                  tipo: 'excluir',
                  titulo: `Excluir o processo ${p.nome}?`,
                  texto: 'As esteiras que já nasceram dele continuam como estão. Só o trilho é removido.',
                  acao: () => excluirProcesso(p.id),
                })}><Ic.x /></button>
            </span>
          )}
        </div>
        {p.descricao && <p className="proc-desc">{p.descricao}</p>}
        <div className="proc-numeros">
          <span><b className="num">{p.etapas.length}</b> {p.etapas.length === 1 ? 'checkpoint' : 'checkpoints'}</span>
          <span><b className="num">{totalTarefas(p)}</b> {totalTarefas(p) === 1 ? 'tarefa' : 'tarefas'}</span>
          {!!duracao(p) && <span><b className="num">{duracao(p)}</b> dias</span>}
        </div>
        {!!areasEnvolvidas.length && (
          <div className="proc-areas">
            {areasEnvolvidas.map((id) => (
              <span className="emp-tag" key={id} style={{ color: areaDe(id).cor }}>{areaDe(id).nome}</span>
            ))}
          </div>
        )}
        <Link className="btn" href={`/processos/${p.id}`} style={{ marginTop: 'auto', justifyContent: 'center' }}>
          {podeEditar ? 'Abrir e editar' : 'Ver o trilho'}
        </Link>
      </div>
    )
  }

  const Grupo = ({ titulo, sobre, lista, tipo }: {
    titulo: string; sobre: string; lista: Processo[]; tipo: 'esteira' | 'ciclo'
  }) => (
    <div className="blk">
      <div className="bh">
        {tipo === 'ciclo' ? <Ic.ciclo /> : <Ic.proj />}
        <h2>{titulo}</h2>
        <span className="c">{sobre}</span>
        {podeEditar && <button className="r" onClick={() => void novo(tipo)}>+ Novo processo</button>}
      </div>
      {lista.length ? (
        <div className="proc-grade">{lista.map((p) => <Cartao key={p.id} p={p} />)}</div>
      ) : (
        <div className="card">
          <div className="empty">
            Nenhum processo de {tipo === 'ciclo' ? 'rotina' : 'projeto'} desenhado.
            {podeEditar && (
              <button className="btn ghost" onClick={() => void novo(tipo)}><Ic.plus />Desenhar</button>
            )}
          </div>
        </div>
      )}
    </div>
  )

  return (
    <>
      <div className="hdr">
        <div>
          <div className="eyebrow">O trilho que a empresa desenha uma vez e reusa</div>
          <h1>Processos</h1>
          <p className="lede">
            Aqui você descreve como a sua operação funciona: os checkpoints, as tarefas de cada um e a
            <b> área</b> que responde por elas. Toda esteira criada a partir de um processo já nasce
            distribuída para as pessoas certas.
          </p>
        </div>
        {podeEditar && (
          <div className="hdr-actions">
            <button className="btn" onClick={() => void novo('ciclo')}><Ic.ciclo />Nova rotina</button>
            <button className="btn pri" onClick={() => void novo('esteira')}><Ic.plus />Novo processo</button>
          </div>
        )}
      </div>

      {!areas.length && (
        <div className="alert" style={{ marginBottom: 20 }}>
          <Ic.espera />
          <span>
            <b>Crie as áreas primeiro.</b> As tarefas de um processo apontam para áreas, e é a área que
            decide para quem a tarefa vai quando a esteira nasce.
          </span>
        </div>
      )}

      <Grupo titulo="Projetos" sobre="têm início, checkpoints e fim" lista={projetos} tipo="esteira" />
      <Grupo titulo="Rotinas" sobre="se repetem a cada período" lista={rotinas} tipo="ciclo" />
    </>
  )
}
