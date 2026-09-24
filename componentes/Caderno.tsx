'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDados } from './Dados'
import { Ic } from './Icones'
import { ConversaNota } from './ConversaNota'
import { Documento } from './Documento'
import { DetalhesNota } from './DetalhesNota'
import { buscar, porTitulo, resumo } from '@/lib/notas'
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
    conversaIA, abrirConversaIA, sugestoesDaNota, mensagensDaNota, salvarNota,
    lerNota, aceitarSugestao, recusarSugestao, org } = useDados()

  const [termo, setTermo] = useState('')
  const [abertaId, setAbertaId] = useState<string | null>(null)
  const [lendo, setLendo] = useState(false)

  const vivas = useMemo(
    () => notas.filter((n) => !n.arquivada)
      .sort((a, b) => Number(b.fixada) - Number(a.fixada) || b.mexido_em.localeCompare(a.mexido_em)),
    [notas],
  )

  /**
   * O que mais conta na busca, além do título e do corpo: o endereço e o que
   * foi dito na conversa de dentro. Quem procura não lembra se escreveu no
   * corpo da nota ou perguntou depois para a leitura.
   */
  const ondeMais = useCallback((n: Nota) => [
    n.area_id ? areaDe(n.area_id).nome : '',
    n.fluxo_id ? fluxos.find((f) => f.id === n.fluxo_id)?.nome || '' : '',
    ...mensagensDaNota(n.id).map((m) => m.texto),
  ].join(' '), [areaDe, fluxos, mensagensDaNota])

  const achadas = useMemo(
    () => (termo.trim() ? buscar(vivas, termo, ondeMais) : []),
    [vivas, termo, ondeMais],
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

  const propostas = aberta
    ? sugestoesDaNota(aberta.id).filter((s) => s.estado === 'aberta')
    : []

  /** Nota em branco, aberta na hora para escrever. */
  const nova = async () => {
    const id = await salvarNota({ titulo: 'Nota nova', texto: '' })
    if (id) { setAbertaId(id); setTermo('') }
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
    /** A linha de uma nota, igual em qualquer um dos dois modos da lista. */
    const linha = (n: Nota) => {
      const onde = n.area_id
        ? areaDe(n.area_id).nome
        : n.fluxo_id ? fluxos.find((f) => f.id === n.fluxo_id)?.nome || null : null
      return (
        <button className="nt-l" key={n.id} onClick={() => setAbertaId(n.id)}>
          <span className="nt-l-mk">{n.fixada ? <Ic.flag /> : <Ic.edit />}</span>
          <b className="nt-l-nm">{n.titulo}</b>
          <span className="nt-l-previa">{resumo(n) || 'Sem texto'}</span>
          <span className="nt-l-quando">{rel(isoDe(n.mexido_em))}</span>
          {!!onde && <i className="nt-l-tag">{onde}</i>}
        </button>
      )
    }

    return (
      <div className="dp">
        <div className="ct-topo">
          <h2>Notas</h2>
          <Link className="iconbtn" href="/notas" title="Abrir o caderno inteiro"
            aria-label="Abrir o caderno inteiro"><Ic.caber /></Link>
        </div>

        {/* Procurar e criar na mesma linha, no alto. Procurar vem antes de
            tudo, e procura em tudo: título, corpo, endereço e o que foi dito na
            conversa de dentro. Quem procura não lembra onde escreveu, lembra da
            palavra. E criar fica do lado, porque são as duas únicas coisas que
            se faz numa lista: achar uma, ou começar outra. */}
        <div className="nt-topo">
          <div className="nt-busca">
            <Ic.lupa />
            <input className="inp" value={termo} onChange={(e) => setTermo(e.target.value)}
              placeholder={`Buscar em ${vivas.length} nota${vivas.length === 1 ? '' : 's'}`}
              aria-label="Buscar nas notas" />
            {!!termo && (
              <button className="iconbtn" aria-label="Limpar busca"
                onClick={() => setTermo('')}><Ic.x /></button>
            )}
          </div>
          <button className="nt-nova" title="Nota nova" aria-label="Nota nova"
            onClick={() => void nova()}><Ic.plus /></button>
        </div>

        {org.ia_ativa && !termo && (
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
          {/* Com busca, uma lista só: agrupar resultado por assunto esconde o
              que a pessoa está procurando atrás de um cabeçalho. */}
          {termo ? (
            achadas.length
              ? achadas.map(linha)
              : <p className="ct-vazio">Nada com isso. A busca não usa acento nem caixa.</p>
          ) : grupos.length ? grupos.map((g) => (
            <div className="dp-grupo" key={g.rotulo}>
              <div className="dp-grupo-h">{g.rotulo} <span className="num">{g.itens.length}</span></div>
              {g.itens.map(linha)}
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
      <div className="ct-topo dp-topo">
        <button className="iconbtn" aria-label="Voltar para as notas"
          onClick={() => setAbertaId(null)}><Ic.volta /></button>
        {aberta.conversa && <h2>Conversa</h2>}
        <span className="dp-topo-fim">
          {/* O atalho para o caderno inteiro só no computador: no celular
              /notas é esta mesma tela noutra moldura, e um botão que leva ao
              lugar onde a pessoa já está só gasta espaço e confunde. */}
          <Link className="iconbtn so-computador" href="/notas" title="Abrir o caderno inteiro"
            aria-label="Abrir o caderno inteiro"><Ic.caber /></Link>
          {/* Área, track, arquivos, fixar e apagar: o cadastro da nota, atrás
              de um botão só. Ver componentes/DetalhesNota.tsx. */}
          {!aberta.conversa && <DetalhesNota nota={aberta} aoApagar={() => setAbertaId(null)} />}
        </span>
      </div>

      {/* Um texto só, ocupando o espaço todo: a resposta da leitura entra aqui
          dentro, e não numa conversa ao lado. Ver componentes/Documento.tsx.
          Organizar entra na barra do Documento, e não numa segunda barra: as
          duas ações da nota moram juntas, grudadas no rodapé da folha. */}
      {!aberta.conversa && (
        <Documento nota={aberta} ir={ir} acoes={org.ia_ativa ? (
          <button className="btn" disabled={lendo} onClick={async () => {
            setLendo(true)
            await lerNota(aberta.id)
            setLendo(false)
          }}>
            <Ic.faisca />{lendo ? 'Organizando...' : 'Organizar'}
          </button>
        ) : null} />
      )}

      {/* A conversa solta continua sendo conversa: ela não tem documento
          embaixo, então a forma natural dela é a sequência de falas. */}
      {aberta.conversa && <ConversaNota nota={aberta} ir={ir} />}

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

    </div>
  )
}
