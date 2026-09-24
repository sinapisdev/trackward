'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useDados } from './Dados'
import { useComandos } from './Comandos'
import { Ic } from './Icones'
import { Av } from './atomos'
import { isoDe, rel } from '@/lib/datas'
import type { Canal, Fluxo } from '@/lib/tipos'

/** Só a hora, que é o que a conversa da lateral precisa mostrar. */
function hora(ts: string) {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/**
 * A conversa da track, ao lado do checkpoint.
 *
 * É o canal do projeto reduzido ao essencial: as últimas falas, a leitura por
 * IA e o campo de escrever. A conversa inteira continua em Conversa, e quem
 * enxerga a track enxerga este canal, que é a regra do produto.
 */
export function ConversaTrack({ f }: { f: Fluxo }) {
  const { canais } = useDados()
  const canal = canais.find((c) => c.fluxo_id === f.id)
    || (f.area_id ? canais.find((c) => c.area_id === f.area_id) : undefined)

  if (!canal)
    return (
      <div className="ct">
        <div className="ct-topo"><h2>Conversa da track</h2></div>
        <p className="ct-vazio">Esta track ainda não tem canal. Crie um em Conversa.</p>
      </div>
    )
  return <Conversa canal={canal} titulo="Conversa da track" quantas={4} />
}

/**
 * O painel de conversa, em qualquer lugar que não seja a tela de Conversa.
 *
 * É o mesmo canal, com o mesmo envio e a mesma leitura: o que muda é o tamanho.
 * Ele existe porque a conversa é onde o trabalho nasce, e obrigar a trocar de
 * tela para dizer uma frase é o que faz a combinação acontecer fora do app e
 * nunca virar tarefa.
 */
export function Conversa({ canal, titulo, quantas = 6, aoTrocar }: {
  canal: Canal
  titulo?: string
  quantas?: number
  /** Quando existe, o cabeçalho vira um seletor de canal. */
  aoTrocar?: (id: string) => void
}) {
  const { canais, mensagensDe, perfilDe, nomeDe, enviar, lerConversa, org, sugestoesDe,
    naoLidas, marcarLido } = useDados()
  const [texto, setTexto] = useState('')
  const [lendo, setLendo] = useState(false)
  const fim = useRef<HTMLDivElement>(null)
  const cmd = useComandos({ canalId: canal.id })

  const msgs = mensagensDe(canal.id)
  const abertas = sugestoesDe(canal.id).filter((s) => s.estado === 'aberta')

  /**
   * Desce até a última fala, mas só DENTRO da lista.
   *
   * `scrollIntoView` rola o primeiro antepassado que rola, e quando a lista não
   * rola sozinha esse antepassado é a página: abrir uma track jogava a pessoa
   * 1500px para baixo, no meio da conversa, antes de ela ver o checkpoint.
   */
  useEffect(() => {
    const lista = fim.current?.parentElement
    if (lista && lista.scrollHeight > lista.clientHeight + 4) lista.scrollTop = lista.scrollHeight
  }, [msgs.length, canal.id])

  const mandar = async () => {
    const t = texto.trim()
    if (!t) return
    setTexto('')
    // Linha com barra é comando: vira coisa feita, não vira mensagem.
    if (await cmd.rodar(t)) return
    await enviar(canal.id, t)
    // Quem acabou de escrever leu: deixar o contador aceso ali seria mentira.
    if (naoLidas(canal.id)) void marcarLido(canal.id)
  }

  const abertos = canais.filter((c) => !c.arquivado)

  return (
    <div className="ct">
      <div className="ct-topo">
        <h2>{titulo || 'Conversa'}</h2>
        <Link className="iconbtn" href={`/chat/${canal.id}`} title="Abrir a conversa inteira"
          aria-label="Abrir a conversa inteira"><Ic.mais /></Link>
      </div>

      {aoTrocar ? (
        <label className="ct-troca">
          <select value={canal.id} onChange={(e) => aoTrocar(e.target.value)} aria-label="Qual canal">
            {abertos.map((c) => {
              const n = naoLidas(c.id)
              return (
                <option key={c.id} value={c.id}>
                  {c.tipo === 'direto' ? c.nome : `#${c.nome}`}{n ? ` (${n})` : ''}
                </option>
              )
            })}
          </select>
          <Ic.chev />
        </label>
      ) : (
        <div className="ct-canal"># {canal.nome}</div>
      )}

      <div className="ct-msgs">
        {msgs.slice(-quantas).map((m) => (
          <div className="ct-msg" key={m.id}>
            {m.por_ia
              ? <span className="ct-ia"><Ic.faisca /></span>
              : <Av p={perfilDe(m.autor_id)} tam="sm" />}
            <div>
              <span className="ct-h">
                <b>{m.por_ia ? 'Leitura da conversa' : nomeDe(m.autor_id)}</b>
                <i>{hora(m.criado_em)}</i>
              </span>
              <p>{m.texto}</p>
            </div>
          </div>
        ))}
        {!msgs.length && <p className="ct-vazio">Nada dito ainda por aqui.</p>}
        <div ref={fim} />
      </div>

      {org.ia_ativa && (
        <>
          <button className="btn larga" disabled={lendo}
            onClick={async () => { setLendo(true); await lerConversa(canal.id); setLendo(false) }}>
            <Ic.faisca />{lendo ? 'Lendo a conversa...' : 'Ler conversa'}
          </button>
          <p className="ct-nota">
            {abertas.length
              ? <Link href={`/chat/${canal.id}`}>{abertas.length} {abertas.length === 1 ? 'proposta aguarda' : 'propostas aguardam'} revisão</Link>
              : 'A IA sugere. Você decide.'}
          </p>
        </>
      )}

      <div className="ct-campo">
        {cmd.menu(setTexto)}
        <input
          value={texto}
          onChange={(e) => { setTexto(e.target.value); cmd.aoDigitar(e.target.value) }}
          onKeyDown={(e) => {
            if (cmd.teclas(e, setTexto)) return
            if (e.key === 'Enter') void mandar()
          }}
          placeholder="Escreva, ou / para os comandos"
          aria-label="Escrever no canal"
        />
        <button className="iconbtn" onClick={() => void mandar()} disabled={!texto.trim()}
          aria-label="Enviar"><Ic.enviar /></button>
      </div>
    </div>
  )
}

/** A atividade da track: quem fez o quê, do mais recente para o mais antigo. */
export function AtividadeTrack({ f, quantas = 6 }: { f: Fluxo; quantas?: number }) {
  const { perfilDe, nomeDe } = useDados()
  if (!f.log.length) return <p className="ct-vazio">Sem atividade ainda.</p>
  return (
    <div className="atv">
      {f.log.slice(0, quantas).map((a) => (
        <div className="atv-l" key={a.id}>
          {a.por_ia
            ? <span className="ct-ia"><Ic.faisca /></span>
            : <Av p={perfilDe(a.quem_id)} tam="sm" />}
          <span className="atv-t">
            <b>{a.por_ia ? 'A leitura da conversa' : nomeDe(a.quem_id)}</b> {a.texto}
          </span>
          <span className="atv-q">{rel(isoDe(a.criado_em))}</span>
        </div>
      ))}
    </div>
  )
}
