'use client'

import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDados } from '@/componentes/Dados'
import { Carregando } from '@/componentes/Shell'
import { Ic } from '@/componentes/Icones'
import { Anexos } from '@/componentes/Anexos'
import { ConversaNota } from '@/componentes/ConversaNota'
import { Documento } from '@/componentes/Documento'
import { DetalhesNota } from '@/componentes/DetalhesNota'
import { rel, isoDe } from '@/lib/datas'
import {
  buscar, entradas, ligar, ordenar, parecidas, porTitulo, resumo, saidas, solta,
} from '@/lib/notas'
import { rotuloTipo } from '@/lib/rotulos'
import type { Nota } from '@/lib/tipos'

/**
 * As notas: o caderno de bolso.
 *
 * O desenho da tela segue o que a biblioteca resolveu: não tem pasta, não tem
 * categoria, não tem nada para manter. Tem uma lista do que foi mexido por
 * último, uma busca, e dentro de cada nota as duas listas que o texto gera
 * sozinho, para onde ela aponta e quem aponta para ela.
 *
 * A peça que faz o acervo crescer é o LINK VAZIO. Escrever [[uma nota que não
 * existe]] não é erro: é a nota do futuro, e clicar nela cria já ligada. É assim
 * que alguém escreve "ver [[Fornecedor Alfa]]" no meio de uma ideia e ganha a
 * página do fornecedor sem ter decidido criar página nenhuma.
 */

function Aberta({ nota, ir, aoApagar }: {
  nota: Nota; ir: (titulo: string) => void; aoApagar: () => void
}) {
  const { notas, salvarNota, toast, eu } = useDados()

  const aponta = saidas(nota, notas)
  const citam = entradas(nota, notas)
  const talvez = parecidas(nota, notas)

  const ligarCom = async (outra: Nota) => {
    await salvarNota({
      id: nota.id, titulo: nota.titulo, texto: ligar(nota.texto, outra.titulo),
      fixada: nota.fixada, arquivada: nota.arquivada,
    })
    toast(`Ligada a ${outra.titulo}.`)
  }

  return (
    <article className="nt-aberta">
      {/* O cadastro da nota mora atrás de um botão: área, track, arquivos,
          fixar e apagar. O que fica na tela é o texto. */}
      <div className="nt-a-h">
        <p className="nt-quando">
          escrita {rel(isoDe(nota.criado_em)).toLowerCase()}
          {nota.mexido_em.slice(0, 10) !== nota.criado_em.slice(0, 10)
            && `, mexida ${rel(isoDe(nota.mexido_em)).toLowerCase()}`}
        </p>
        {/* Nota compartilhada comigo não tem cadastro: área, track, arquivos,
            fixar e apagar são de quem escreveu. */}
        {nota.dono_id === eu.id && <DetalhesNota nota={nota} aoApagar={aoApagar} />}
      </div>

      {/* Um texto só, e a leitura escreve dentro dele. A primeira linha é o
          título: não há campo separado para ele. */}
      <Documento nota={nota} ir={ir} />

      {!!aponta.length && (
        <div className="nt-bloco">
          <span className="nt-rot">Aponta para</span>
          <div className="nt-fichas">
            {aponta.map((a) => (
              <button key={a.titulo} className={`nt-ficha ${a.nota ? '' : 'vazio'}`}
                onClick={() => ir(a.titulo)}>
                {a.titulo}{a.nota ? '' : ' (criar)'}
              </button>
            ))}
          </div>
        </div>
      )}

      {!!citam.length && (
        <div className="nt-bloco">
          <span className="nt-rot">Citada em</span>
          <div className="nt-fichas">
            {citam.map((c) => (
              <button key={c.id} className="nt-ficha" onClick={() => ir(c.titulo)}>{c.titulo}</button>
            ))}
          </div>
        </div>
      )}

      {!!talvez.length && (
        <div className="nt-bloco">
          <span className="nt-rot">Parece ter a ver</span>
          <div className="nt-fichas">
            {talvez.map((t) => (
              <button key={t.id} className="nt-ficha sug" onClick={() => void ligarCom(t)}
                title={`Ligar esta nota a ${t.titulo}`}>
                {t.titulo}<Ic.plus />
              </button>
            ))}
          </div>
          <p className="hint">
            Palavras incomuns em comum, nada mais. Clique para ligar de verdade, ou ignore.
          </p>
        </div>
      )}
    </article>
  )
}

export function TelaNotas() {
  const { notas, areas, fluxos, areaDe, eu, nomeDe, comQuem, salvarNota, conversaIA,
    abrirConversaIA, mensagensDaNota, org, carregando } = useDados()
  const params = useSearchParams()
  const [termo, setTermo] = useState('')
  // `?nota=` é como o cartão do chat chega aqui: quem clicou na nota posta num
  // canal já ganhou acesso a ela, e cai direto nela em vez de na lista.
  const [abertaId, setAbertaId] = useState<string | null>(params.get('nota'))

  const vivas = useMemo(() => notas.filter((n) => !n.arquivada), [notas])

  /** A busca procura no endereço e na conversa de dentro, não só no texto. */
  const ondeMais = useCallback((n: Nota) => [
    n.area_id ? areaDe(n.area_id).nome : '',
    n.fluxo_id ? fluxos.find((f) => f.id === n.fluxo_id)?.nome || '' : '',
    ...mensagensDaNota(n.id).map((m) => m.texto),
  ].join(' '), [areaDe, fluxos, mensagensDaNota])

  const lista = useMemo(
    () => (termo ? buscar(vivas, termo, ondeMais) : ordenar(vivas)),
    [vivas, termo, ondeMais],
  )

  /**
   * Os assuntos: o endereço da nota é o que agrupa.
   *
   * Não é pasta, e a diferença importa: pasta é uma coisa a mais para manter, e
   * a nota nova sempre cabe em duas. O endereço a nota já tem, porque é o mesmo
   * da tarefa, e ele serve para o mesmo que serve lá, saber de que frente é.
   */
  const grupos = useMemo(() => {
    const mapa = new Map<string, { rotulo: string; itens: Nota[] }>()
    for (const n of lista) {
      const chave = n.area_id ? `a:${n.area_id}` : n.fluxo_id ? `f:${n.fluxo_id}` : 'sem'
      const rotulo = n.area_id
        ? areaDe(n.area_id).nome
        : n.fluxo_id ? fluxos.find((f) => f.id === n.fluxo_id)?.nome || 'Track' : 'Sem assunto'
      if (!mapa.has(chave)) mapa.set(chave, { rotulo, itens: [] })
      mapa.get(chave)!.itens.push(n)
    }
    return [...mapa.entries()]
      .sort((a, b) => Number(a[0] === 'sem') - Number(b[0] === 'sem'))
      .map(([, g]) => g)
  }, [lista, areaDe, fluxos])

  const naConversa = !!conversaIA && abertaId === conversaIA.id
  const aberta = naConversa ? null : notas.find((n) => n.id === abertaId) || lista[0] || null

  if (carregando) return <Carregando />

  /** Abrir pelo título: se a nota não existe, ela nasce agora. É o link vazio. */
  const ir = async (titulo: string) => {
    const achada = porTitulo(notas, titulo)
    if (achada) { setAbertaId(achada.id); return }
    const id = await salvarNota({ titulo, texto: '' })
    if (id) setAbertaId(id)
  }

  const nova = async () => {
    const id = await salvarNota({ titulo: 'Nota nova', texto: '' })
    if (id) setAbertaId(id)
  }

  const soltas = vivas.filter((n) => solta(n, vivas)).length

  return (
    <>
      {!vivas.length ? (
        <div className="card ag-regua">
          <p>
            <b>Nota não é tarefa.</b> Tarefa tem dono e prazo e cobra você. Nota não cobra
            nada: é a ideia, o insight, o número que alguém falou numa reunião, o nome do
            fornecedor que vale lembrar. Botar isso na lista de tarefas é o jeito mais rápido
            de entupir a lista e parar de olhar para ela.
          </p>
          <p>
            Não tem pasta e não tem categoria aqui, de propósito. Toda organização por
            categoria funciona nas primeiras trinta notas e desanda nas trezentas, porque a
            nota nova sempre cabe em duas. O que funciona é a ligação escrita no meio do
            texto: você põe <code>[[nome de outra nota]]</code> onde faz sentido, e o acervo
            se costura sozinho.
          </p>
          <p className="hint">
            Cada nota é um assunto, e dentro dela tem alguém do outro lado: a leitura lê o
            que você escreveu, lembra do que você guardou antes e responde ali mesmo. Quando
            a nota tiver virado trabalho, "Organizar" separa o que é tarefa e o que é
            compromisso, e você aceita ou não.
          </p>
        </div>
      ) : (
        <div className="nt-tela">
          <aside className="nt-lado">
            {/* Procurar e criar na mesma linha, no alto, e nada de cabeçalho de
                página em cima disso. A palavra "Notas" já está acesa na fileira
                de abas: repetir em corpo 34 custava 150px de altura, que é
                exatamente a altura que faltava para o texto. */}
            <div className="nt-topo">
              <div className="nt-busca">
                <Ic.lupa />
                <input className="inp" value={termo} onChange={(e) => setTermo(e.target.value)}
                  placeholder={`Buscar em ${vivas.length} nota${vivas.length === 1 ? '' : 's'}`}
                  aria-label="Buscar nas notas" />
                {!!termo && (
                  <button className="iconbtn" onClick={() => setTermo('')} aria-label="Limpar busca">
                    <Ic.x />
                  </button>
                )}
              </div>
              <button className="nt-nova" title="Nota nova" aria-label="Nota nova"
                onClick={() => void nova()}><Ic.plus /></button>
            </div>

            {org.ia_ativa && !termo && (
              <button className={`nt-solto ${naConversa ? 'on' : ''}`}
                onClick={async () => {
                  const id = conversaIA?.id || await abrirConversaIA()
                  if (id) setAbertaId(id)
                }}>
                <Ic.faisca />
                <span>
                  <b>Conversa</b>
                  <i>sem assunto fixo, com o caderno inteiro junto</i>
                </span>
              </button>
            )}

            <div className="nt-lista">
              {grupos.map((g) => (
                <div key={g.rotulo}>
                  <div className="nt-grupo">{g.rotulo} <span className="num">{g.itens.length}</span></div>
                  {g.itens.map((n) => {
                    // A nota de outra pessoa se anuncia na lista: no meio das
                    // suas ela some, e você leria como se tivesse escrito.
                    const de = n.dono_id && n.dono_id !== eu.id ? nomeDe(n.dono_id) : null
                    const quantos = de ? 0 : comQuem(n.id).length
                    return (
                    <button key={n.id} className={`nt-item ${aberta?.id === n.id ? 'on' : ''}`}
                      onClick={() => setAbertaId(n.id)}
                      title={de ? `Compartilhada por ${de}`
                        : quantos ? `Compartilhada com ${quantos} pessoa${quantos === 1 ? '' : 's'}` : undefined}>
                      <b>
                        {n.fixada && <Ic.flag />}
                        {n.titulo}
                      </b>
                      <i>{rel(isoDe(n.mexido_em)).toLowerCase()}</i>
                      <span>{resumo(n).slice(0, 90) || 'vazia'}</span>
                      {/* A marca fica na coluna da direita, embaixo da hora, e
                          não grudada no título: ali ela empurrava o nome da
                          nota, que é a única coisa que se lê de relance. */}
                      {!!(de || quantos) && <em className="nt-comp-mk"><Ic.team /></em>}
                    </button>
                    )
                  })}
                </div>
              ))}
              {!lista.length && (
                <p className="nt-nada">Nada com isso. A busca não usa acento nem caixa.</p>
              )}
            </div>

            {!termo && soltas > 1 && (
              <p className="nt-solta">
                {soltas} notas não apontam para nada e ninguém aponta para elas. Abrir uma e
                ligar em outra é o que faz o acervo servir depois.
              </p>
            )}
          </aside>

          {naConversa && conversaIA ? (
            <article className="nt-aberta">
              <div className="nt-a-h"><h2>Conversa</h2></div>
              <p className="nt-quando">
                sem assunto fixo. o que você guardou no caderno entra junto na pergunta,
                então dá para falar de uma nota antiga sem ir procurar ela
              </p>
              <ConversaNota nota={conversaIA} ir={ir} />
            </article>
          ) : aberta
            ? <Aberta nota={aberta} ir={ir} aoApagar={() => setAbertaId(null)} />
            : <div className="card empty" style={{ padding: 34 }}>Escolha uma nota.</div>}
        </div>
      )}
    </>
  )
}
