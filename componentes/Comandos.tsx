'use client'

import { useState, type KeyboardEvent, type ReactNode } from 'react'
import { useDados } from './Dados'
import { useModais } from './Modais'
import { Ic } from './Icones'
import { COMANDOS, comandoSendoEscrito, comandosQueCombinam, type Comando } from '@/lib/comandos'

/**
 * A barra que faz o chat virar o lugar onde as coisas acontecem.
 *
 * O problema de uma linguagem de comandos nunca é a sintaxe, é a descoberta:
 * quem não sabe que ela existe nunca digita a primeira barra. Por isso o menu
 * abre sozinho no instante em que a pessoa digita `/`, e por isso a lista traz
 * o exemplo inteiro em vez do nome do comando: ler `/tarefa Conferir o contrato
 * @Ana até sexta` ensina a gramática toda de uma vez, sem manual.
 *
 * Este gancho serve os três campos de escrita do app (canal, conversa do
 * Forward e conversa da nota). Um só, porque três cópias virariam três
 * linguagens diferentes no mês seguinte.
 */
export function useComandos(onde: { canalId?: string | null; notaId?: string | null }) {
  const { executarComando, toast } = useDados()
  const { abrir } = useModais()
  const [pedaco, setPedaco] = useState<string | null>(null)
  const [ajuda, setAjuda] = useState(false)
  const [k, setK] = useState(0)

  const lista = ajuda ? COMANDOS : pedaco === null ? [] : comandosQueCombinam(pedaco)
  const aberto = ajuda || (pedaco !== null && !!lista.length)

  const fechar = () => { setPedaco(null); setAjuda(false); setK(0) }

  /** Chamado a cada tecla digitada, para o menu abrir e filtrar. */
  const aoDigitar = (valor: string) => {
    const p = comandoSendoEscrito(valor)
    setPedaco(p)
    if (p === null) setAjuda(false)
    setK(0)
  }

  /**
   * Roda a linha. Devolve verdadeiro quando ela era comando, e aí quem chamou
   * não deve mandar a mensagem: o que a pessoa escreveu virou coisa feita, e
   * repetir a linha crua na conversa seria ruído.
   */
  const rodar = async (texto: string): Promise<boolean> => {
    const r = await executarComando(texto, onde)
    if (!r) return false
    fechar()
    if (r.tipo === 'ajuda') { setAjuda(true); return true }
    if (r.tipo === 'erro') { toast(r.motivo, true); return true }
    if (r.tipo === 'formulario') {
      toast('Essa tarefa é de outra pessoa, então precisa de uma track. Escolha ali.')
      abrir({ tipo: 'avulsa', texto: r.texto, resp: r.resp, prazo: r.prazo })
      return true
    }
    toast(r.conta.charAt(0).toUpperCase() + r.conta.slice(1) + '.')
    return true
  }

  /**
   * As teclas do menu. Devolve verdadeiro quando consumiu a tecla, para o campo
   * não mandar a mensagem no mesmo Enter que escolheu o comando.
   */
  const teclas = (e: KeyboardEvent, escrever: (v: string) => void) => {
    if (!aberto) return false
    if (e.key === 'Escape') { e.preventDefault(); fechar(); return true }
    if (e.key === 'ArrowDown') { e.preventDefault(); setK((x) => (x + 1) % lista.length); return true }
    if (e.key === 'ArrowUp') { e.preventDefault(); setK((x) => (x - 1 + lista.length) % lista.length); return true }
    if ((e.key === 'Enter' || e.key === 'Tab') && lista[k]) {
      e.preventDefault()
      escolher(lista[k], escrever)
      return true
    }
    return false
  }

  const escolher = (c: Comando, escrever: (v: string) => void) => {
    escrever(`/${c.chave} `)
    fechar()
  }

  const menu = (escrever: (v: string) => void): ReactNode => aberto ? (
    <div className="cmds" role="listbox" aria-label="Comandos">
      <div className="cmds-h">
        <Ic.raio />
        {ajuda ? 'O que dá para fazer escrevendo' : 'Comandos'}
        <button className="iconbtn" aria-label="Fechar" onClick={fechar}><Ic.x /></button>
      </div>
      {lista.map((c, i) => (
        <button key={c.nome} className={`cmd ${i === k ? 'on' : ''}`} role="option"
          aria-selected={i === k}
          onMouseEnter={() => setK(i)}
          onClick={() => escolher(c, escrever)}>
          <b>/{c.chave}</b>
          <span>{c.resumo}</span>
          <i>{c.exemplo}</i>
        </button>
      ))}
      <p className="cmds-pe">
        <b>@nome</b> diz de quem é, <b>até sexta</b> diz o prazo. Conversa normal continua
        virando proposta da leitura, que você aceita ou não.
      </p>
    </div>
  ) : null

  return { menu, aoDigitar, teclas, rodar, aberto, fechar }
}
