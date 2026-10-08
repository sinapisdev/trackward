'use client'

import { useEffect, useRef, useState } from 'react'
import { useDados } from '@/componentes/Dados'
import { useModais } from '@/componentes/Modais'
import { Ic } from '@/componentes/Icones'
import { ehImagem, tamanhoLegivel } from '@/lib/anexos'
import type { Anexo, Item, Nota } from '@/lib/tipos'

/**
 * A prova de que a tarefa saiu.
 *
 * Fica colada na tarefa, e não numa aba separada, porque anexo que mora longe da
 * tarefa não é consultado por ninguém: vira arquivo morto. Aqui ele aparece junto
 * do que ele prova, e é isso que a tela de decisão vai mostrar ao aprovador.
 */

function Ficha({ a, podeTirar }: { a: Anexo; podeTirar: boolean }) {
  const { abrirAnexo, removerAnexo, nomeDe } = useDados()
  const { abrir } = useModais()
  const [ocupado, setOcupado] = useState(false)

  const ver = async () => {
    setOcupado(true)
    const url = await abrirAnexo(a)
    setOcupado(false)
    if (url) window.open(url, '_blank', 'noopener')
  }

  return (
    <span className={`anexo ${ocupado ? 'ocupado' : ''}`}>
      <button className="anexo-abrir" onClick={() => void ver()}
        title={`${a.nome}, ${tamanhoLegivel(a.tamanho)}, por ${nomeDe(a.autor_id)}`}>
        <span className="anexo-ic">{ehImagem(a.tipo) ? <Ic.foto /> : <Ic.clipe />}</span>
        <span className="anexo-nome">{a.nome}</span>
        <i>{tamanhoLegivel(a.tamanho)}</i>
      </button>
      {podeTirar && (
        <button className="anexo-x" aria-label={`Remover ${a.nome}`}
          onClick={() => abrir({
            tipo: 'excluir',
            titulo: `Remover ${a.nome}?`,
            texto: 'O arquivo sai de vez. Isto não volta.',
            acao: () => removerAnexo(a),
          })}><Ic.x /></button>
      )}
    </span>
  )
}

/**
 * Os anexos de uma mensagem, embaixo dela.
 *
 * Sem campo de anexar: na conversa o arquivo vai JUNTO com a frase, pelo clipe
 * do campo de escrever. Anexar depois seria mexer numa mensagem que já foi
 * lida, e mensagem que muda depois de lida é a coisa mais confusa que um chat
 * pode ter.
 *
 * O que não pode ser aberto nem aparece: a lista chega já filtrada pela
 * política, então quem está de fora não vê nem que o arquivo existe.
 */
export function AnexosDaMensagem({ mensagemId }: { mensagemId: string }) {
  const { anexosDe, eu } = useDados()
  const lista = anexosDe(mensagemId)
  if (!lista.length) return null
  return (
    <div className="msg-anexos">
      {lista.map((a) => (
        <Ficha key={a.id} a={a} podeTirar={a.autor_id === eu.id} />
      ))}
    </div>
  )
}

/**
 * O bloco de anexos. Serve à tarefa e à nota, porque o documento que importa
 * nem sempre nasce preso a uma tarefa: a proposta que chegou por e-mail, o PDF
 * que alguém mandou e que você ainda não sabe em que vai dar.
 */
export function Anexos({ item, nota, podeAnexar, pedido = 0 }: {
  item?: Item
  nota?: Nota
  podeAnexar: boolean
  /**
   * Um pedido de fora para abrir o seletor de arquivo, vindo do menu da tarefa.
   *
   * É um carimbo de hora, e não um booleano: pedir duas vezes seguidas precisa
   * abrir duas vezes, e um booleano ficaria ligado depois da primeira. Zero é
   * ninguém pediu, que é o caso de todo lugar que não passa a prop.
   */
  pedido?: number
}) {
  const { anexosDe, anexar, eu } = useDados()
  const [enviando, setEnviando] = useState(false)
  const [sobre, setSobre] = useState(false)
  const campo = useRef<HTMLInputElement>(null)

  /* O seletor de arquivo do navegador só abre a partir de um gesto da pessoa, e
     o clique no menu É esse gesto: ele sobrevive ao efeito porque a cadeia não
     passa por rede nenhuma. */
  useEffect(() => { if (pedido) campo.current?.click() }, [pedido])
  const dono = item || nota
  const lista = dono ? anexosDe(dono.id) : []

  const mandar = async (arquivos: FileList | File[] | null) => {
    if (!arquivos || !arquivos.length || !dono) return
    setEnviando(true)
    await anexar(dono, arquivos)
    setEnviando(false)
    if (campo.current) campo.current.value = ''
  }

  if (!lista.length && !podeAnexar) return null

  return (
    <div
      className={`anexos ${sobre ? 'sobre' : ''}`}
      onDragOver={podeAnexar ? (e) => { e.preventDefault(); setSobre(true) } : undefined}
      onDragLeave={podeAnexar ? () => setSobre(false) : undefined}
      onDrop={podeAnexar ? (e) => {
        e.preventDefault()
        setSobre(false)
        void mandar(e.dataTransfer.files)
      } : undefined}
    >
      {lista.map((a) => (
        <Ficha key={a.id} a={a} podeTirar={podeAnexar || a.autor_id === eu.id} />
      ))}

      {podeAnexar && (
        <>
          <input
            ref={campo}
            type="file"
            multiple
            // No celular isto abre a câmera junto da galeria, que é de onde a
            // foto do comprovante costuma sair.
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip"
            hidden
            onChange={(e) => void mandar(e.target.files)}
          />
          <button className="anexo-mais" disabled={enviando}
            onClick={() => campo.current?.click()}>
            {enviando ? <><span className="girando" />Enviando</> : <><Ic.clipe />Anexar</>}
          </button>
        </>
      )}
    </div>
  )
}
