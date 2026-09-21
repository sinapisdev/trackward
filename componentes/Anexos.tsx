'use client'

import { useRef, useState } from 'react'
import { useDados } from '@/componentes/Dados'
import { useModais } from '@/componentes/Modais'
import { Ic } from '@/componentes/Icones'
import { ehImagem, tamanhoLegivel } from '@/lib/anexos'
import type { Anexo, Item } from '@/lib/tipos'

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

export function Anexos({ item, podeAnexar }: { item: Item; podeAnexar: boolean }) {
  const { anexosDe, anexar, eu } = useDados()
  const [enviando, setEnviando] = useState(false)
  const [sobre, setSobre] = useState(false)
  const campo = useRef<HTMLInputElement>(null)
  const lista = anexosDe(item.id)

  const mandar = async (arquivos: FileList | File[] | null) => {
    if (!arquivos || !arquivos.length) return
    setEnviando(true)
    await anexar(item, arquivos)
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
