'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import { useDados } from './Dados'
import { useModais } from './Modais'
import { Carregando } from './Shell'
import { Ic } from './Icones'
import type { Processo, Tipo } from '@/lib/tipos'

type RItem = { id: string | null; texto: string; area_id: string | null; dias: number }
type REtapa = {
  id: string | null; nome: string; criterio: string
  aprovador_area_id: string | null; dias: number; itens: RItem[]
}

/**
 * Onde a empresa descreve a própria operação.
 *
 * Cada tarefa aponta para uma ÁREA, não para uma pessoa, e o prazo é contado em
 * dias a partir do início. É isso que deixa o mesmo trilho servir para qualquer
 * obra, qualquer mês e qualquer empresa, distribuindo sozinho quando nasce.
 */
export function EditorProcesso({ id }: { id: string }) {
  const { eu, processos, carregando } = useDados()
  const novo = id === 'novo'
  const original = novo ? null : processos.find((p) => p.id === id)

  if (carregando) return <Carregando />

  if (eu.papel === 'colaborador') {
    return (
      <div className="hdr">
        <div>
          <div className="eyebrow">Processos</div>
          <h1>Só quem responde pela operação desenha processos</h1>
          <p className="lede">
            Você pode criar esteiras a partir dos processos existentes, e mexer nas tarefas que são suas.
            Desenhar o trilho é decisão de gestor ou administrador.
          </p>
        </div>
      </div>
    )
  }

  if (!novo && !original) {
    return (
      <div className="hdr">
        <div>
          <div className="eyebrow">Processos</div>
          <h1>Processo não encontrado</h1>
          <p className="lede">Ele pode ter sido excluído. <Link href="/processos">Ver todos</Link>.</p>
        </div>
      </div>
    )
  }

  // A chave garante que o formulário remonta com os dados certos, em vez de
  // carregar um estado que nasceu antes de o processo chegar.
  return <Formulario key={original?.id ?? 'novo'} original={original ?? null} />
}

function Formulario({ original }: { original: Processo | null }) {
  const { eu, areas, areaDe, nomeDe, salvarProcesso } = useDados()
  const { abrir } = useModais()
  const router = useRouter()
  const params = useSearchParams()
  const novo = !original

  const [nome, setNome] = useState(original?.nome ?? '')
  const [descricao, setDescricao] = useState(original?.descricao ?? '')
  const [tipo, setTipo] = useState<Tipo>(original?.tipo ?? ((params.get('tipo') as Tipo) || 'esteira'))
  const [areaId, setAreaId] = useState(original?.area_id ?? '')
  const [etapas, setEtapas] = useState<REtapa[]>(
    original
      ? original.etapas.map((e) => ({
          id: e.id, nome: e.nome, criterio: e.criterio,
          aprovador_area_id: e.aprovador_area_id, dias: e.dias,
          itens: e.itens.map((i) => ({ id: i.id, texto: i.texto, area_id: i.area_id, dias: i.dias })),
        }))
      : [{ id: null, nome: '', criterio: '', aprovador_area_id: null, dias: 7, itens: [] }],
  )
  const [sujo, setSujo] = useState(novo)
  const [salvando, setSalvando] = useState(false)

  const mexeu = <T,>(fn: () => T) => { setSujo(true); return fn() }

  const resumo = useMemo(() => {
    const tarefas = etapas.reduce((n, e) => n + e.itens.length, 0)
    const envolvidas = [...new Set([
      ...etapas.map((e) => e.aprovador_area_id),
      ...etapas.flatMap((e) => e.itens.map((i) => i.area_id)),
    ].filter(Boolean) as string[])]
    return { tarefas, envolvidas, dias: etapas.reduce((n, e) => Math.max(n, e.dias), 0) }
  }, [etapas])

  const mexerEtapa = (k: number, campo: keyof REtapa, valor: unknown) =>
    mexeu(() => setEtapas((a) => a.map((e, i) => (i === k ? { ...e, [campo]: valor } : e))))

  const mexerItem = (k: number, j: number, campo: keyof RItem, valor: unknown) =>
    mexeu(() => setEtapas((a) => a.map((e, i) => (i !== k ? e : {
      ...e, itens: e.itens.map((it, x) => (x === j ? { ...it, [campo]: valor } : it)),
    }))))

  const moverEtapa = (k: number, d: number) =>
    mexeu(() => setEtapas((a) => { const b = [...a]; [b[k + d], b[k]] = [b[k], b[k + d]]; return b }))

  const salvar = async () => {
    if (!nome.trim()) return
    const falta = etapas.findIndex((e) => !e.nome.trim())
    if (falta >= 0) { document.getElementById(`pe-n-${falta}`)?.focus(); return }
    setSalvando(true)
    const salvo = await salvarProcesso(
      { id: original?.id || null, nome: nome.trim(), descricao: descricao.trim(), tipo, area_id: areaId || null },
      etapas.map((e) => ({
        id: e.id, nome: e.nome.trim(), criterio: e.criterio.trim(),
        aprovador_area_id: e.aprovador_area_id, dias: e.dias,
        itens: e.itens.filter((i) => i.texto.trim()).map((i) => ({
          id: i.id, texto: i.texto.trim(), area_id: i.area_id, dias: i.dias,
        })),
      })),
    )
    setSalvando(false)
    if (!salvo) return
    setSujo(false)
    if (novo) router.replace(`/processos/${salvo}`)
  }

  const SelArea = ({ valor, aoTrocar, rotulo }: {
    valor: string | null; aoTrocar: (v: string | null) => void; rotulo: string
  }) => (
    <select className="inp" value={valor || ''} aria-label={rotulo}
      onChange={(e) => aoTrocar(e.target.value || null)}>
      <option value="">Sem área definida</option>
      {areas.map((a) => (
        <option key={a.id} value={a.id}>
          {a.nome}{a.responsavel_id ? ` (${nomeDe(a.responsavel_id)})` : ''}
        </option>
      ))}
    </select>
  )

  return (
    <>
      <div className="hdr">
        <div>
          <div className="eyebrow"><Link href="/processos">Processos</Link> / {tipo === 'ciclo' ? 'Rotina' : 'Objetivo'}</div>
          <h1>{novo ? 'Novo processo' : original!.nome}</h1>
          <p className="lede">
            {resumo.tarefas
              ? <>{etapas.length} {etapas.length === 1 ? 'checkpoint' : 'checkpoints'}, {resumo.tarefas}{' '}
                  {resumo.tarefas === 1 ? 'tarefa' : 'tarefas'}
                  {!!resumo.envolvidas.length && ` e ${resumo.envolvidas.length} ${resumo.envolvidas.length === 1 ? 'área' : 'áreas'} envolvidas`}.</>
              : 'Descreva os checkpoints e as tarefas de cada um.'}
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 880 }}>
        <div className="blk">
          <div className="bh"><h2>O processo</h2></div>
          <div className="card" style={{ padding: 15 }}>
            <div className="fgrid">
              <div className="fld full">
                <label htmlFor="pr-nome">Nome</label>
                <input className="inp" id="pr-nome" value={nome} autoFocus={novo}
                  placeholder={tipo === 'ciclo' ? 'Ex.: Fechamento mensal' : 'Ex.: Incorporação'}
                  onChange={(e) => mexeu(() => setNome(e.target.value))} />
              </div>
              <div className="fld full">
                <label htmlFor="pr-desc">Para que serve</label>
                <input className="inp" id="pr-desc" value={descricao}
                  placeholder="Uma linha que ajude a equipe a escolher o processo certo"
                  onChange={(e) => mexeu(() => setDescricao(e.target.value))} />
              </div>
              <div className="fld">
                <span className="lbl">Tipo</span>
                <div className="seg" style={{ alignSelf: 'flex-start' }}>
                  <button className={tipo === 'esteira' ? 'on' : ''}
                    onClick={() => mexeu(() => setTipo('esteira'))}><Ic.proj />Objetivo</button>
                  <button className={tipo === 'ciclo' ? 'on' : ''}
                    onClick={() => mexeu(() => setTipo('ciclo'))}><Ic.ciclo />Rotina</button>
                </div>
              </div>
              <div className="fld">
                <label htmlFor="pr-area">Aparece em qual área</label>
                <select className="inp" id="pr-area" value={areaId}
                  onChange={(e) => mexeu(() => setAreaId(e.target.value))}>
                  <option value="">Todas as áreas</option>
                  {areas.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="blk">
          <div className="bh">
            <h2>Checkpoints e tarefas</h2>
            <span className="c">o prazo é contado em dias a partir do início da esteira</span>
          </div>

          {etapas.map((e, k) => (
            <div className="pe" key={k}>
              <div className="pe-cab">
                <span className="n">{k + 1}</span>
                <input className="inp" id={`pe-n-${k}`} value={e.nome} placeholder="Nome do checkpoint"
                  aria-label={`Nome do checkpoint ${k + 1}`}
                  onChange={(ev) => mexerEtapa(k, 'nome', ev.target.value)} />
                <SelArea valor={e.aprovador_area_id} rotulo="Área que aprova a saída"
                  aoTrocar={(v) => mexerEtapa(k, 'aprovador_area_id', v)} />
                <span className="dias">
                  <small>dia</small>
                  <input className="inp" type="number" min={0} value={e.dias} aria-label="Prazo em dias"
                    onChange={(ev) => mexerEtapa(k, 'dias', Number(ev.target.value) || 0)} />
                </span>
                <span className="tools">
                  <button className="iconbtn" aria-label="Subir" disabled={!k}
                    onClick={() => moverEtapa(k, -1)}><Ic.up /></button>
                  <button className="iconbtn" aria-label="Descer" disabled={k >= etapas.length - 1}
                    style={{ transform: 'rotate(180deg)' }} onClick={() => moverEtapa(k, 1)}><Ic.up /></button>
                  <button className="iconbtn" aria-label="Remover checkpoint" disabled={etapas.length < 2}
                    onClick={() => mexeu(() => setEtapas((a) => a.filter((_, i) => i !== k)))}><Ic.x /></button>
                </span>
              </div>

              <div className="pe-corpo">
                <input className="inp" value={e.criterio}
                  placeholder="Critério de saída: o que precisa ser verdade para avançar"
                  onChange={(ev) => mexerEtapa(k, 'criterio', ev.target.value)} />

                {!!e.itens.length && <span className="pe-rot">Tarefas deste checkpoint</span>}
                {e.itens.map((it, j) => (
                  <div className="pi" key={j}>
                    <span className="ponto" />
                    <input className="inp" value={it.texto} placeholder="O que precisa ser feito"
                      aria-label={`Tarefa ${j + 1}`}
                      onChange={(ev) => mexerItem(k, j, 'texto', ev.target.value)} />
                    <SelArea valor={it.area_id} rotulo="Área que executa"
                      aoTrocar={(v) => mexerItem(k, j, 'area_id', v)} />
                    <span className="dias">
                      <small>dia</small>
                      <input className="inp" type="number" min={0} value={it.dias} aria-label="Prazo em dias"
                        onChange={(ev) => mexerItem(k, j, 'dias', Number(ev.target.value) || 0)} />
                    </span>
                    <button className="iconbtn" aria-label="Remover tarefa"
                      onClick={() => mexeu(() => setEtapas((a) => a.map((x, i) =>
                        (i !== k ? x : { ...x, itens: x.itens.filter((_, y) => y !== j) }))))}><Ic.x /></button>
                  </div>
                ))}

                <button className="pe-add" onClick={() => mexeu(() => setEtapas((a) => a.map((x, i) =>
                  (i !== k ? x : {
                    ...x,
                    itens: [...x.itens, {
                      id: null, texto: '',
                      area_id: x.aprovador_area_id || areaId || null,
                      dias: Math.max(0, x.dias - 2),
                    }],
                  }))))}>
                  <Ic.plus />Adicionar tarefa
                </button>
              </div>
            </div>
          ))}

          <button className="btn" onClick={() => mexeu(() => setEtapas((a) => [...a, {
            id: null, nome: '', criterio: '',
            aprovador_area_id: a[a.length - 1]?.aprovador_area_id ?? null,
            dias: (a[a.length - 1]?.dias ?? 0) + 14,
            itens: [],
          }]))}>
            <Ic.plus />Adicionar checkpoint
          </button>
        </div>

        {!!resumo.envolvidas.length && (
          <div className="blk">
            <div className="bh"><h2>Quem vai receber</h2><span className="c">quando uma esteira nascer deste processo</span></div>
            <div className="card">
              {resumo.envolvidas.map((aid) => {
                const a = areaDe(aid)
                const tarefas = etapas.reduce((n, e) => n + e.itens.filter((i) => i.area_id === aid).length, 0)
                const aprovacoes = etapas.filter((e) => e.aprovador_area_id === aid).length
                return (
                  <div className="pl" key={aid}>
                    <span className="sdot" style={{ background: a.cor, width: 10, height: 10 }} />
                    <span style={{ minWidth: 0 }}>
                      <span className="n">{a.nome}</span>
                      <span className="e">
                        {tarefas} {tarefas === 1 ? 'tarefa' : 'tarefas'}
                        {!!aprovacoes && `, ${aprovacoes} ${aprovacoes === 1 ? 'aprovação' : 'aprovações'}`}
                      </span>
                    </span>
                    <span className="due">
                      {a.responsavel_id ? nomeDe(a.responsavel_id) : 'sem responsável padrão'}
                    </span>
                  </div>
                )
              })}
            </div>
            {resumo.envolvidas.some((aid) => !areaDe(aid).responsavel_id) && (
              <p className="hint" style={{ marginTop: 10 }}>
                Área sem responsável padrão não distribui sozinha: na hora de criar a esteira você escolhe
                a pessoa. Para definir de uma vez, edite a área na lateral.
              </p>
            )}
          </div>
        )}

        {sujo && (
          <div className="salvar-barra">
            <span className="aviso">
              {novo ? 'Processo ainda não salvo.' : 'Você mexeu no processo e ainda não salvou.'}
            </span>
            {!novo && (
              <button className="btn ghost" onClick={() => abrir({
                tipo: 'excluir',
                titulo: 'Descartar as mudanças?',
                texto: 'O processo volta a ser o que era antes de você mexer.',
                acao: () => router.refresh(),
              })}>Descartar</button>
            )}
            <button className="btn pri" disabled={!nome.trim() || salvando} onClick={() => void salvar()}>
              {salvando ? 'Salvando…' : 'Salvar processo'}
            </button>
          </div>
        )}
      </div>
    </>
  )
}
