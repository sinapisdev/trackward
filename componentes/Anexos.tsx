'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useDados } from '@/componentes/Dados'
import { useModais } from '@/componentes/Modais'
import { Ic } from '@/componentes/Icones'
import { Av } from '@/componentes/atomos'
import { ehImagem, tamanhoLegivel } from '@/lib/anexos'
import { veFluxo } from '@/lib/acesso'
import type { Anexo, Item, Nota, Perfil } from '@/lib/tipos'

/**
 * A prova de que a tarefa saiu.
 *
 * Fica colada na tarefa, e não numa aba separada, porque anexo que mora longe da
 * tarefa não é consultado por ninguém: vira arquivo morto. Aqui ele aparece junto
 * do que ele prova, e é isso que a tela de decisão vai mostrar ao aprovador.
 */

function Ficha({ a, podeTirar, candidatos = [] }: {
  a: Anexo
  podeTirar: boolean
  /** Quem poderia abrir, para trocar a lista depois. Vazio esconde o controle. */
  candidatos?: Perfil[]
}) {
  const { abrirAnexo, removerAnexo, nomeDe, eu, quemAbreAnexo, definirQuemAbre } = useDados()
  const { abrir } = useModais()
  const [ocupado, setOcupado] = useState(false)
  const [mexendo, setMexendo] = useState(false)
  const [escolha, setEscolha] = useState<string[]>([])

  const fechadoPara = quemAbreAnexo(a.id)
  /* Trocar quem abre é de quem mandou, como o banco diz: as políticas de
     `anexo_pessoas` conferem `anexos.autor_id`. */
  const meu = a.autor_id === eu.id

  const ver = async () => {
    setOcupado(true)
    const url = await abrirAnexo(a)
    setOcupado(false)
    if (url) window.open(url, '_blank', 'noopener')
  }

  return (
    <span className={`anexo ${ocupado ? 'ocupado' : ''} ${mexendo ? 'mexendo' : ''}`}>
      <button className="anexo-abrir" onClick={() => void ver()}
        title={`${a.nome}, ${tamanhoLegivel(a.tamanho)}, por ${nomeDe(a.autor_id)}`}>
        <span className="anexo-ic">{ehImagem(a.tipo) ? <Ic.foto /> : <Ic.clipe />}</span>
        <span className="anexo-nome">{a.nome}</span>
        <i>{tamanhoLegivel(a.tamanho)}</i>
      </button>
      {/* O cadeado diz que ele é fechado, e para quem. Ele aparece para todo
          mundo que enxerga o anexo, porque quem está na lista precisa saber que
          aquilo não é de todos antes de comentar em voz alta. */}
      {!!fechadoPara.length && (
        <span className="anexo-fech"
          title={`Só ${fechadoPara.map((id) => nomeDe(id)).join(', ')} e quem mandou abrem`}>
          <Ic.lock />
        </span>
      )}
      {meu && !!candidatos.length && (
        <button className="anexo-quem" aria-label={`Quem abre ${a.nome}`} title="Quem abre"
          onClick={() => { setEscolha(fechadoPara); setMexendo((v) => !v) }}><Ic.team /></button>
      )}
      {podeTirar && (
        <button className="anexo-x" aria-label={`Remover ${a.nome}`}
          onClick={() => abrir({
            tipo: 'excluir',
            titulo: `Remover ${a.nome}?`,
            texto: 'O arquivo sai de vez. Isto não volta.',
            acao: () => removerAnexo(a),
          })}><Ic.x /></button>
      )}

      {mexendo && (
        <div className="anexo-quem-lista">
          <p className="hint">
            Quem ficar de fora não vê nem que o arquivo existe. <b>Fechar agora vale daqui
            para a frente</b>: não desfaz quem já abriu.
          </p>
          {candidatos.map((p) => (
            <label key={p.id} className="chk">
              <input type="checkbox" checked={escolha.includes(p.id)}
                onChange={(e) => setEscolha((v) =>
                  e.target.checked ? [...v, p.id] : v.filter((x) => x !== p.id))} />
              <Av p={p} tam="sm" />{p.nome}
            </label>
          ))}
          <div className="row-inline">
            {!!escolha.length && (
              <button className="btn ghost sm" onClick={() => setEscolha([])}>Abrir para todos</button>
            )}
            <button className="btn sm"
              onClick={async () => {
                const deu = await definirQuemAbre(a.id, escolha)
                if (deu) setMexendo(false)
              }}>Salvar</button>
          </div>
        </div>
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
  const { anexosDe, anexar, eu, perfis, todosFluxos } = useDados()
  const [enviando, setEnviando] = useState(false)
  const [sobre, setSobre] = useState(false)
  /**
   * Os arquivos escolhidos que ainda não subiram.
   *
   * Eles existem por causa da escolha de quem abre: ela tem que ser feita ANTES
   * do envio, como no chat, porque quem manda já sabe para quem é no instante
   * em que escolhe o arquivo. Perguntar depois é perguntar tarde, e pior:
   * durante o intervalo o arquivo estaria aberto para quem não devia.
   */
  const [pendentes, setPendentes] = useState<File[]>([])
  const [quemVe, setQuemVe] = useState<string[]>([])
  const [escolhendo, setEscolhendo] = useState(false)
  const campo = useRef<HTMLInputElement>(null)

  /* O seletor de arquivo do navegador só abre a partir de um gesto da pessoa, e
     o clique no menu É esse gesto: ele sobrevive ao efeito porque a cadeia não
     passa por rede nenhuma. */
  useEffect(() => { if (pedido) campo.current?.click() }, [pedido])
  const dono = item || nota
  const lista = dono ? anexosDe(dono.id) : []

  /**
   * Quem poderia abrir este anexo se ninguém escolhesse nada.
   *
   * É quem enxerga a TRACK da tarefa, e quem responde isso é `veFluxo`, a mesma
   * função da tela e o espelho de `ve_fluxo` no banco. Uma lista montada à mão
   * aqui seria uma segunda regra de visibilidade, que é a pior coisa que este
   * app poderia ganhar: no dia em que uma mudar, a tela oferece a quem o banco
   * recusa, e ninguém percebe.
   *
   * Só para TAREFA. A nota é do dono e de mais ninguém, então não há a quem
   * escolher, e o anexo dela segue a nota.
   */
  const candidatos = useMemo(() => {
    if (!item) return []
    const f = todosFluxos.find((x) => x.id === item.fluxo_id)
    if (!f) return []
    const todosItens = todosFluxos.flatMap((x) => x.etapas.flatMap((e) => e.itens))
    return perfis.filter((p) => p.ativo && p.id !== eu.id && veFluxo(p, perfis, f, todosItens))
  }, [item, todosFluxos, perfis, eu.id])

  /* Sem segunda pessoa não há escolha a fazer, e perguntar seria o app
     inventando plateia: o arquivo sobe no mesmo clique, como sempre subiu. */
  const temEscolha = candidatos.length > 0

  const subir = async (arquivos: FileList | File[] | null, lista: string[] = []) => {
    if (!arquivos || !arquivos.length || !dono) return
    setEnviando(true)
    await anexar(dono, arquivos, lista)
    setEnviando(false)
    setPendentes([])
    setQuemVe([])
    setEscolhendo(false)
    if (campo.current) campo.current.value = ''
  }

  const mandar = async (arquivos: FileList | File[] | null) => {
    if (!arquivos || !arquivos.length) return
    if (temEscolha) {
      // Segura para a pessoa dizer quem abre. O envio sai no botão.
      setPendentes(Array.from(arquivos))
      if (campo.current) campo.current.value = ''
      return
    }
    await subir(arquivos)
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
        <Ficha key={a.id} a={a} podeTirar={podeAnexar || a.autor_id === eu.id}
          candidatos={candidatos} />
      ))}

      {/* A escolha de quem abre, colada no arquivo e antes do envio.
          É a mesma do chat, e precisa ser a mesma: o contrato do fornecedor não
          é assunto dos cinco que veem a track, e antes disto a única saída era
          não anexar. Quem fica de fora NÃO VÊ QUE O ARQUIVO EXISTE, que é a
          decisão de 06/10/2026: anexo trancado à vista anuncia que existe um
          documento sobre aquele assunto para quem não pode abri-lo, e a
          pergunta cai em quem mandou. */}
      {!!pendentes.length && (
        <div className="anx-pend">
          <div className="anx-pend-l">
            <Ic.clipe />
            <span>{pendentes.map((f) => f.name).join(', ')}</span>
            <button className="iconbtn" aria-label="Desistir"
              onClick={() => { setPendentes([]); setQuemVe([]); setEscolhendo(false) }}><Ic.x /></button>
          </div>
          <button className="anx-quemve" onClick={() => setEscolhendo((v) => !v)}>
            {quemVe.length
              ? `Só ${quemVe.map((id) => (perfis.find((p) => p.id === id)?.nome || '').split(' ')[0]).join(', ')} e você abrem`
              : 'Todos que veem esta tarefa abrem'}
          </button>
          {escolhendo && (
            <div className="anx-quemve-lista">
              <p className="hint">
                Escolhendo alguém, quem ficar de fora não vê nem que o arquivo existe.
              </p>
              {candidatos.map((p) => (
                <label key={p.id} className="chk">
                  <input type="checkbox" checked={quemVe.includes(p.id)}
                    onChange={(e) => setQuemVe((v) =>
                      e.target.checked ? [...v, p.id] : v.filter((x) => x !== p.id))} />
                  <Av p={p} tam="sm" />{p.nome}
                </label>
              ))}
              {!!quemVe.length && (
                <button className="btn ghost sm" onClick={() => setQuemVe([])}>
                  Deixar aberto para quem vê a tarefa
                </button>
              )}
            </div>
          )}
          <button className="btn pri sm" disabled={enviando}
            onClick={() => void subir(pendentes, quemVe)}>
            {enviando ? <><span className="girando" />Enviando</> : <><Ic.clipe />Anexar</>}
          </button>
        </div>
      )}

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
