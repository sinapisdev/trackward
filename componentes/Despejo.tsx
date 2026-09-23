'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useDados } from './Dados'
import { Ic } from './Icones'
import { Anexos } from './Anexos'
import { tituloDe } from '@/lib/notas'
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
 * O despejo: o caderno onde se joga tudo, e que a máquina lê depois.
 *
 * Ele **não é um canal de conversa**, e essa é a diferença que muda o uso.
 * Conversa pede interlocutor: escrever num chat vazio soa estranho, e quem se
 * sente estranho não escreve. O caderno não pede nada de ninguém. Você joga a
 * ideia, o número da reunião, o nome do fornecedor, a tarefa que não pode
 * esquecer, do jeito que sai.
 *
 * O que a máquina faz com isso vem **depois e a pedido**, nunca sozinha: você
 * manda ler, e ela devolve propostas. É a mesma leitura da conversa, e é de
 * propósito: a nota e o canal aprendem a mesma coisa e propõem do mesmo jeito.
 * Nada vira tarefa sem alguém aceitar.
 *
 * A organização é a das notas: o que costura o acervo é a ligação escrita no
 * meio do texto, `[[outra nota]]`, porque pasta não sobrevive às trezentas
 * notas. Área e track são etiquetas por cima disso, para o eixo do trabalho.
 */
export function Despejo() {
  const { notas, areas, fluxos, areaDe, minhaLista, meuDespejo, sugestoesDe,
    salvarNota, excluirNota, lerNota, aceitarSugestao, recusarSugestao, org } = useDados()

  const [rascunho, setRascunho] = useState('')
  const [abertaId, setAbertaId] = useState<string | null>(null)
  const [titulo, setTitulo] = useState('')
  const [texto, setTexto] = useState('')
  const [lendo, setLendo] = useState(false)
  const campo = useRef<HTMLTextAreaElement>(null)

  const minhas = useMemo(
    () => notas.filter((n) => !n.arquivada)
      .sort((a, b) => Number(b.fixada) - Number(a.fixada) || b.mexido_em.localeCompare(a.mexido_em)),
    [notas],
  )
  const aberta = minhas.find((n) => n.id === abertaId) || null

  useEffect(() => {
    if (!aberta) return
    setTitulo(aberta.titulo)
    setTexto(aberta.texto)
  }, [aberta?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const propostas = meuDespejo
    ? sugestoesDe(meuDespejo.id).filter((s) => s.estado === 'aberta')
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
    if (!aberta) return
    await salvarNota({
      id: aberta.id, titulo: titulo || tituloDe(texto), texto,
      fixada: aberta.fixada, arquivada: aberta.arquivada,
      area_id: aberta.area_id, fluxo_id: aberta.fluxo_id, ...extra,
    })
  }

  return (
    <div className="dp">
      <div className="ct-topo">
        <h2>Meu despejo</h2>
        <Link className="iconbtn" href="/notas" title="Abrir o caderno inteiro"
          aria-label="Abrir o caderno inteiro"><Ic.mais /></Link>
      </div>
      <p className="dp-sobre">
        Joga aqui o que não pode esquecer. Ideia, número, nome, tarefa. Depois você manda
        ler, e a máquina propõe o que fazer com isso.
      </p>

      {/* O campo de jogar vem antes da lista: quem abre o despejo quase sempre
          vem escrever, não procurar. */}
      <div className="dp-jogar">
        <textarea ref={campo} className="inp" rows={3} value={rascunho}
          placeholder="Escreva do jeito que sai..."
          aria-label="Escrever no despejo"
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

      {!!propostas.length && (
        <section className="dp-props">
          <div className="rd-bh">
            <h3>Da sua nota <span className="num">({propostas.length})</span></h3>
          </div>
          {propostas.map((s) => (
            <div className="dp-prop" key={s.id}>
              <span className="dp-prop-t">
                <i>{ROTULO[s.tipo]}</i>
                <b>{s.texto}</b>
                {!!s.motivo && <small>{s.motivo}</small>}
              </span>
              <span className="dp-prop-a">
                <button className="btn-sm" onClick={() => void aceitarSugestao(s)}>Aceitar</button>
                <button className="iconbtn" aria-label="Dispensar"
                  onClick={() => void recusarSugestao(s)}><Ic.x /></button>
              </span>
            </div>
          ))}
        </section>
      )}

      {aberta ? (
        <section className="dp-aberta">
          <div className="dp-a-h">
            <input className="inp dp-tit" value={titulo} aria-label="Título da nota"
              onChange={(e) => setTitulo(e.target.value)} onBlur={() => void salvarAberta()} />
            <button className="iconbtn" aria-label="Fechar" onClick={() => setAbertaId(null)}>
              <Ic.x />
            </button>
          </div>
          <textarea className="inp dp-txt" rows={8} value={texto} aria-label="Texto da nota"
            onChange={(e) => setTexto(e.target.value)} onBlur={() => void salvarAberta()} />
          <p className="hint">
            Escreva <code>[[nome de outra nota]]</code> para ligar uma na outra. Ligação que
            aponta para nota que não existe é convite, não erro.
          </p>

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

          <div className="dp-a-acoes">
            {org.ia_ativa && (
              <button className="btn" disabled={lendo} onClick={async () => {
                setLendo(true)
                await salvarAberta()
                await lerNota(aberta.id)
                setLendo(false)
              }}>
                <Ic.faisca />{lendo ? 'Lendo...' : 'Organizar com a IA'}
              </button>
            )}
            <Link className="btn ghost" href="/notas">Abrir no caderno</Link>
            <button className="btn ghost" aria-label="Apagar nota"
              onClick={async () => { await excluirNota(aberta.id); setAbertaId(null) }}>
              <Ic.x />
            </button>
          </div>
        </section>
      ) : (
        <section className="dp-lista">
          {minhas.length ? minhas.slice(0, 8).map((n) => (
            <button className="dp-l" key={n.id} onClick={() => setAbertaId(n.id)}>
              <span className="dp-l-t">
                <b>{n.titulo}</b>
                <small>{n.texto.replace(/\s+/g, ' ').slice(0, 90) || 'Sem texto'}</small>
              </span>
              <span className="dp-l-m">
                {n.area_id && <i className="dp-tag">{areaDe(n.area_id).nome}</i>}
                <span className="due">{rel(isoDe(n.mexido_em))}</span>
              </span>
            </button>
          )) : (
            <p className="ct-vazio">
              Nada guardado ainda. O que você escrever aqui fica seu, e só seu.
            </p>
          )}
        </section>
      )}
    </div>
  )
}
