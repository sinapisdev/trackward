'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useDados } from './Dados'
import { Ic } from './Icones'
import { Anexos } from './Anexos'
import { ConversaNota } from './ConversaNota'
import { tituloDe, porTitulo } from '@/lib/notas'
import { rotuloTipo } from '@/lib/rotulos'
import { isoDe, rel } from '@/lib/datas'
import type { Nota, TipoProposta } from '@/lib/tipos'

const ROTULO: Record<TipoProposta, string> = {
  tarefa: 'Vira tarefa',
  prazo: 'Prazo',
  concluir: 'Ficou pronto',
  decisao: 'Decisão',
  trava: 'Travou',
  distribuir: 'Quem faz',
  agente: 'Agente',
  nota: 'Guardar como nota',
  compromisso: 'Marcar na agenda',
}

/**
 * As notas, do jeito que elas servem no dia: uma nota é um assunto.
 *
 * Isto já foi "Meu despejo", e já morou na lista de canais. O nome e o lugar
 * eram os dois errados pela mesma razão: canal é onde se fala com alguém, e um
 * caderno listado entre os canais pede que você comece a escrever como quem
 * manda mensagem. Ninguém manda mensagem para si mesmo sobre uma ideia de
 * negócio. Escreve.
 *
 * O desenho agora é o de um bloco de notas com alguém do outro lado. Cada nota
 * guarda um assunto e tem conversa própria com a leitura sobre aquilo. Fora
 * delas existe uma conversa solta, que é a nota sem assunto: dá para falar de
 * qualquer coisa, e o caderno inteiro entra junto na pergunta.
 *
 * A organização é por endereço, área ou track, e não por pasta que alguém
 * precise manter. O que costura o acervo continua sendo a ligação escrita no
 * meio do texto, [[outra nota]], porque pasta não sobrevive às trezentas notas.
 */
export function Caderno() {
  const { notas, areas, fluxos, areaDe, eu, minhaLista, abrirMinhaLista,
    conversaIA, abrirConversaIA, sugestoesDaNota, salvarNota, excluirNota, lerNota,
    aceitarSugestao, recusarSugestao, org } = useDados()

  const [rascunho, setRascunho] = useState('')
  const [abertaId, setAbertaId] = useState<string | null>(null)
  const [titulo, setTitulo] = useState('')
  const [texto, setTexto] = useState('')
  const [lendo, setLendo] = useState(false)
  const campo = useRef<HTMLTextAreaElement>(null)

  const vivas = useMemo(
    () => notas.filter((n) => !n.arquivada)
      .sort((a, b) => Number(b.fixada) - Number(a.fixada) || b.mexido_em.localeCompare(a.mexido_em)),
    [notas],
  )

  /**
   * Os assuntos.
   *
   * O endereço da nota é o que agrupa: a área quando ela tem uma, senão a track,
   * senão nada. Note que é o mesmo endereço da tarefa, e isso é o ponto: a ideia
   * sobre a obra fica perto da obra sem virar tarefa da obra.
   */
  const grupos = useMemo(() => {
    const mapa = new Map<string, { rotulo: string; itens: Nota[] }>()
    for (const n of vivas) {
      const chave = n.area_id ? `a:${n.area_id}` : n.fluxo_id ? `f:${n.fluxo_id}` : 'sem'
      const rotulo = n.area_id
        ? areaDe(n.area_id).nome
        : n.fluxo_id
          ? fluxos.find((f) => f.id === n.fluxo_id)?.nome || 'Track'
          : 'Sem assunto'
      if (!mapa.has(chave)) mapa.set(chave, { rotulo, itens: [] })
      mapa.get(chave)!.itens.push(n)
    }
    // O que não tem endereço vai para o fim: é a caixa de entrada, não o índice.
    return [...mapa.entries()]
      .sort((a, b) => Number(a[0] === 'sem') - Number(b[0] === 'sem'))
      .map(([, g]) => g)
  }, [vivas, areaDe, fluxos])

  const aberta = abertaId && conversaIA?.id === abertaId
    ? conversaIA
    : vivas.find((n) => n.id === abertaId) || null

  useEffect(() => {
    if (!aberta || aberta.conversa) return
    setTitulo(aberta.titulo)
    setTexto(aberta.texto)
  }, [aberta?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const propostas = aberta
    ? sugestoesDaNota(aberta.id).filter((s) => s.estado === 'aberta')
    : []

  const guardar = async () => {
    const t = rascunho.trim()
    if (!t) return
    setRascunho('')
    const id = await salvarNota({ titulo: tituloDe(t), texto: t })
    if (id) setAbertaId(id)
    campo.current?.focus()
  }

  const salvarAberta = async (extra?: Partial<Nota>) => {
    if (!aberta || aberta.conversa) return
    await salvarNota({
      id: aberta.id, titulo: titulo || tituloDe(texto), texto,
      fixada: aberta.fixada, arquivada: aberta.arquivada,
      area_id: aberta.area_id, fluxo_id: aberta.fluxo_id, ...extra,
    })
  }

  /**
   * Aceitar uma proposta que saiu daqui.
   *
   * Tarefa que nasce de nota não tem track escolhida, e sem destino ela não
   * nasce em lugar nenhum. O destino é a sua lista, que é onde mora o que não
   * é de projeto nenhum, e ela nasce agora se ainda não existir: conta nova não
   * precisa começar com uma esteira vazia dentro.
   */
  const aceitar = async (s: Parameters<typeof aceitarSugestao>[0]) => {
    if (s.tipo === 'tarefa' && !s.dados.fluxo_id) {
      const destino = minhaLista?.id || await abrirMinhaLista()
      await aceitarSugestao(s, { fluxo_id: destino, resp_id: s.dados.resp_id || eu.id })
      return
    }
    await aceitarSugestao(s)
  }

  /** Abrir pelo título, quando a leitura citar uma nota que ela achou. */
  const ir = (nome: string) => {
    const achada = porTitulo(notas, nome)
    if (achada) setAbertaId(achada.id)
  }

  const falarSolto = async () => {
    const id = conversaIA?.id || await abrirConversaIA()
    if (id) setAbertaId(id)
  }

  // ------------------------------------------------------------ a lista

  if (!aberta) {
    return (
      <div className="dp">
        <div className="ct-topo">
          <h2>Notas</h2>
          <Link className="iconbtn" href="/notas" title="Abrir o caderno inteiro"
            aria-label="Abrir o caderno inteiro"><Ic.mais /></Link>
        </div>

        {/* Escrever vem antes de procurar: quem abre as notas quase sempre vem
            guardar alguma coisa, não achar. */}
        <div className="dp-jogar">
          <textarea ref={campo} className="inp" rows={2} value={rascunho}
            placeholder="Escreva do jeito que sai..."
            aria-label="Escrever uma nota"
            onChange={(e) => setRascunho(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void guardar() }
            }} />
          <div className="dp-jogar-pe">
            <span className="hint">A primeira linha vira o título.</span>
            <button className="btn pri" disabled={!rascunho.trim()} onClick={() => void guardar()}>
              Guardar
            </button>
          </div>
        </div>

        {org.ia_ativa && (
          <button className="dp-conversa" onClick={() => void falarSolto()}>
            <Ic.faisca />
            <span>
              <b>Conversa com a leitura</b>
              <small>Sem assunto fixo. Ela lembra do que você já guardou.</small>
            </span>
            <Ic.seta />
          </button>
        )}

        <div className="dp-lista">
          {grupos.length ? grupos.map((g) => (
            <div className="dp-grupo" key={g.rotulo}>
              <div className="dp-grupo-h">{g.rotulo} <span className="num">{g.itens.length}</span></div>
              {g.itens.slice(0, 6).map((n) => (
                <button className="dp-l" key={n.id} onClick={() => setAbertaId(n.id)}>
                  <span className="dp-l-t">
                    <b>{n.fixada && <Ic.flag />}{n.titulo}</b>
                    <small>{n.texto.replace(/\s+/g, ' ').slice(0, 90) || 'Sem texto'}</small>
                  </span>
                  <span className="due">{rel(isoDe(n.mexido_em))}</span>
                </button>
              ))}
            </div>
          )) : (
            <p className="ct-vazio">
              Nada guardado ainda. Uma nota é um assunto: a ideia, o fornecedor, o problema
              que você quer pensar. O que você escrever aqui fica seu, e só seu.
            </p>
          )}
        </div>
      </div>
    )
  }

  // ------------------------------------------------------------ uma nota

  return (
    <div className="dp dp-dentro">
      <div className="ct-topo">
        <button className="iconbtn" aria-label="Voltar para as notas"
          onClick={() => setAbertaId(null)}><Ic.volta /></button>
        {aberta.conversa ? (
          <h2>Conversa</h2>
        ) : (
          <input className="inp dp-tit" value={titulo} aria-label="Título da nota"
            onChange={(e) => setTitulo(e.target.value)} onBlur={() => void salvarAberta()} />
        )}
        <Link className="iconbtn" href="/notas" title="Abrir o caderno inteiro"
          aria-label="Abrir o caderno inteiro"><Ic.mais /></Link>
      </div>

      {!aberta.conversa && (
        <>
          <textarea className="inp dp-txt" rows={5} value={texto} aria-label="Texto da nota"
            onChange={(e) => setTexto(e.target.value)} onBlur={() => void salvarAberta()} />

          <div className="dp-onde">
            <label className="sel-quem">
              <select value={aberta.area_id || ''} aria-label="Área desta nota"
                onChange={(e) => void salvarAberta({ area_id: e.target.value || null })}>
                <option value="">Sem área</option>
                {areas.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
              </select>
              <Ic.chev />
            </label>
            <label className="sel-quem">
              <select value={aberta.fluxo_id || ''} aria-label="Track desta nota"
                onChange={(e) => void salvarAberta({ fluxo_id: e.target.value || null })}>
                <option value="">Sem track</option>
                {fluxos.filter((f) => !f.concluido && f.id !== minhaLista?.id).map((f) => (
                  <option key={f.id} value={f.id}>{rotuloTipo(f.tipo)}: {f.nome}</option>
                ))}
              </select>
              <Ic.chev />
            </label>
          </div>

          <div className="dp-anexos">
            <span className="lbl">Arquivos</span>
            <Anexos nota={aberta} podeAnexar />
          </div>
        </>
      )}

      <ConversaNota nota={aberta} ir={ir} />

      {!!propostas.length && (
        <section className="dp-props">
          <div className="rd-bh">
            <h3>Daqui saiu <span className="num">({propostas.length})</span></h3>
          </div>
          {propostas.map((s) => (
            <div className="dp-prop" key={s.id}>
              <span className="dp-prop-t">
                <i>{ROTULO[s.tipo]}</i>
                <b>{s.texto}</b>
                {!!s.motivo && <small>{s.motivo}</small>}
              </span>
              <span className="dp-prop-a">
                <button className="btn-sm" onClick={() => void aceitar(s)}>Aceitar</button>
                <button className="iconbtn" aria-label="Dispensar"
                  onClick={() => void recusarSugestao(s)}><Ic.x /></button>
              </span>
            </div>
          ))}
        </section>
      )}

      <div className="dp-a-acoes">
        {org.ia_ativa && (
          <button className="btn" disabled={lendo} onClick={async () => {
            setLendo(true)
            await salvarAberta()
            await lerNota(aberta.id)
            setLendo(false)
          }}>
            <Ic.faisca />{lendo ? 'Organizando...' : 'Organizar'}
          </button>
        )}
        {!aberta.conversa && (
          <button className="btn ghost" aria-label="Apagar nota"
            onClick={async () => { await excluirNota(aberta.id); setAbertaId(null) }}>
            <Ic.x />Apagar
          </button>
        )}
      </div>
    </div>
  )
}
