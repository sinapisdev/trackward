'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useDados } from './Dados'
import { useModais } from './Modais'
import { Carregando } from './Shell'
import { Ic } from './Icones'
import { rotuloTipo } from '@/lib/rotulos'
import type { Processo } from '@/lib/tipos'

/** Quantas tarefas o processo distribui, somando todos os checkpoints. */
const totalTarefas = (p: Processo) => p.etapas.reduce((n, e) => n + e.itens.length, 0)

/**
 * Processos: o trilho que a empresa desenha uma vez e reusa.
 *
 * A lista nomeia e a lateral mostra o trilho inteiro antes de usar: os
 * checkpoints, a área que responde por cada um e o dia em que cada prazo cai,
 * contado do início. É o que deixa escolher o processo sem abrir o processo.
 */
export function TelaProcessos() {
  const { eu, processos, areas, areaDe, carregando, excluirProcesso, duplicarProcesso } = useDados()
  const { abrir } = useModais()
  const router = useRouter()
  const [aba, setAba] = useState<'todos' | 'esteira' | 'ciclo'>('todos')
  const [termo, setTermo] = useState('')
  const [area, setArea] = useState('')
  const [sel, setSel] = useState<string | null>(null)

  if (carregando) return <Carregando />

  const podeEditar = eu.papel === 'admin' || eu.papel === 'gestor'
  const limpa = (x: string) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

  const areasDe = (p: Processo) => [...new Set([
    ...p.etapas.map((e) => e.aprovador_area_id),
    ...p.etapas.flatMap((e) => e.itens.map((i) => i.area_id)),
  ].filter(Boolean) as string[])]

  const lista = processos
    .filter((p) => aba === 'todos' || p.tipo === aba)
    .filter((p) => !termo.trim() || limpa(p.nome).includes(limpa(termo)))
    .filter((p) => !area || areasDe(p).includes(area) || p.area_id === area)

  const atual = processos.find((p) => p.id === sel) || lista[0] || null
  const novo = (tipo: 'esteira' | 'ciclo') => router.push(`/processos/novo?tipo=${tipo}`)

  return (
    <>
      <div className="hdr">
        <div>
          <h1>Processos</h1>
          <p className="lede">Descreva o caminho. Reutilize na próxima execução.</p>
        </div>
        {podeEditar && (
          <div className="hdr-actions">
            <button className="btn" onClick={() => novo('esteira')}><Ic.plus />Novo processo</button>
          </div>
        )}
      </div>

      {!areas.length && (
        <div className="alert" style={{ marginBottom: 20 }}>
          <Ic.espera />
          <span>
            <b>Crie as áreas primeiro.</b> As tarefas de um processo apontam para áreas, e é a área que
            decide para quem a tarefa vai quando a track nasce.
          </span>
        </div>
      )}

      <div className="filtros" data-tut="processos-lista">
        <div className="seg" role="group" aria-label="Filtrar processos">
          <button className={aba === 'todos' ? 'on' : ''} onClick={() => setAba('todos')}>
            Todos<span className="num">{processos.length}</span>
          </button>
          <button className={aba === 'esteira' ? 'on' : ''} onClick={() => setAba('esteira')}>
            Objetivos<span className="num">{processos.filter((p) => p.tipo === 'esteira').length}</span>
          </button>
          <button className={aba === 'ciclo' ? 'on' : ''} onClick={() => setAba('ciclo')}>
            Rotinas<span className="num">{processos.filter((p) => p.tipo === 'ciclo').length}</span>
          </button>
        </div>
        <label className="campo-busca">
          <Ic.lupa />
          <input value={termo} onChange={(e) => setTermo(e.target.value)}
            placeholder="Buscar processo" aria-label="Buscar processo" />
        </label>
        <label className="sel-quem">
          <select value={area} onChange={(e) => setArea(e.target.value)} aria-label="Filtrar por área">
            <option value="">Área</option>
            {areas.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
          <Ic.chev />
        </label>
      </div>

      <div className="proc">
        <div className="proc-lista">
          <div className="pr-cab">
            <span /><span>Processo</span><span>Tipo</span><span>Área</span><span>Checkpoints</span><span />
          </div>
          {lista.map((p) => {
            const ars = areasDe(p)
            return (
              <button key={p.id} className={`pr-l ${atual?.id === p.id ? 'on' : ''}`} onClick={() => setSel(p.id)}>
                <span className="pr-ic"><Ic.processo /></span>
                <span className="pr-nm">{p.nome}</span>
                <span className="pr-c">{rotuloTipo(p.tipo)}</span>
                <span className="pr-c">{ars.length ? areaDe(ars[0]).nome : 'Sem área'}</span>
                <span className="pr-c num">{p.etapas.length}</span>
                <span className="pr-mais"><Ic.mais /></span>
              </button>
            )
          })}
          {!lista.length && <div className="tb-vazio">Nenhum processo com esses filtros.</div>}
          <p className="tb-pe"><span>{lista.length} de {processos.length} processos</span></p>
        </div>

        {atual && (
          <aside className="proc-lado">
            <h2>{atual.nome}</h2>
            <span className="selo">Molde de {rotuloTipo(atual.tipo).toLowerCase()}</span>
            <p className="proc-numeros">
              {atual.etapas.length} {atual.etapas.length === 1 ? 'checkpoint' : 'checkpoints'}
              {' · '}{totalTarefas(atual)} {totalTarefas(atual) === 1 ? 'tarefa' : 'tarefas'}
            </p>
            {atual.descricao && <p className="proc-desc">{atual.descricao}</p>}

            <h3>Prazos a partir do início</h3>
            <ol className="proc-trilho">
              {atual.etapas.map((e, k) => (
                <li key={e.id}>
                  <span className="n num">{k + 1}</span>
                  <span>
                    <b>{e.nome}</b>
                    <small>
                      {e.aprovador_area_id ? areaDe(e.aprovador_area_id).nome : 'Sem área'} · dia {e.dias}
                    </small>
                  </span>
                </li>
              ))}
            </ol>

            {atual.etapas.some((e) => e.criterio) && (
              <>
                <h3>Critério de {atual.etapas.find((e) => e.criterio)!.nome}</h3>
                <p className="proc-desc">{atual.etapas.find((e) => e.criterio)!.criterio}</p>
              </>
            )}

            <div className="proc-acoes">
              <button className="btn pri" onClick={() => abrir({
                tipo: 'fluxo', tipoFluxo: atual.tipo, processoId: atual.id,
                areaId: atual.area_id || undefined,
              })}>Usar processo<Ic.seta /></button>
              {podeEditar && (
                <Link className="btn" href={`/processos/${atual.id}`}><Ic.edit />Editar</Link>
              )}
              {podeEditar && (
                <button className="btn ghost" aria-label="Mais ações" title="Duplicar processo"
                  onClick={async () => {
                    const id = await duplicarProcesso(atual.id)
                    if (id) router.push(`/processos/${id}`)
                  }}><Ic.copiar /></button>
              )}
              {podeEditar && (
                <button className="btn ghost" aria-label="Excluir processo" title="Excluir processo"
                  onClick={() => abrir({
                    tipo: 'excluir',
                    titulo: `Excluir o processo ${atual.nome}?`,
                    texto: 'As tracks que já nasceram dele continuam como estão. Só o trilho é removido.',
                    acao: () => excluirProcesso(atual.id),
                  })}><Ic.x /></button>
              )}
            </div>
            <p className="proc-nota">Ao criar a track, as áreas definem os responsáveis.</p>
          </aside>
        )}
      </div>
    </>
  )
}
