'use client'

import { useEffect, useRef, useState } from 'react'
import { useDados } from './Dados'
import { Ic } from './Icones'
import { documento, emPedacos, linhaDoCursor, LIGACAO, porTitulo, tituloDe } from '@/lib/notas'
import type { Nota } from '@/lib/tipos'

/**
 * O corpo de uma nota: um texto só, e a leitura escreve dentro dele.
 *
 * Havia duas caixas de digitar na mesma tela, o texto da nota e um chat ao
 * lado, e isso obrigava a pessoa a escolher onde escrever antes de ter o que
 * dizer. A escolha não devia existir: nota e conversa não são assuntos
 * diferentes, são formas diferentes da mesma coisa.
 *
 * Agora é um documento. Você escreve a pergunta como uma linha qualquer e toca
 * em Perguntar; a resposta entra logo depois dela, marcada como da leitura, e a
 * partir dali é texto seu: dá para editar, mover e apagar como o resto. A
 * conversa passada vira a memória da nota sem precisar de tabela nenhuma, e a
 * busca acha o que foi respondido sem ninguém fazer nada.
 *
 * Duas coisas que o formato ganha de graça e valem dizer: a resposta fica ONDE
 * a pergunta estava, junto do raciocínio que a gerou, e o documento continua
 * sendo reorganizável, que é o que separa uma nota de um histórico.
 */
export function Documento({ nota, ir, acoes }: {
  nota: Nota
  /** Abrir outra nota pelo título, quando o texto citar uma. */
  ir: (titulo: string) => void
  /** Outros botões da barra de baixo, como Organizar. */
  acoes?: React.ReactNode
}) {
  const { notas, salvarNota, perguntarNaNota, respondendo, org, eu } = useDados()
  /**
   * Nota compartilhada comigo é só leitura.
   *
   * Duas pessoas editando o mesmo texto sem tempo real é o caminho mais curto
   * para alguém perder o que escreveu, e o banco recusa o update do mesmo
   * jeito: sem isto, a tela deixaria digitar e engoliria em silêncio.
   */
  const meu = !nota.dono_id || nota.dono_id === eu.id
  const [editando, setEditando] = useState(false)
  const [texto, setTexto] = useState(() => documento(nota))
  const [cursor, setCursor] = useState<number | null>(null)
  const area = useRef<HTMLTextAreaElement>(null)
  const pensando = respondendo === nota.id

  // Trocar de nota com a outra aberta descartaria o que foi digitado, então o
  // texto local só volta a seguir a nota quando a nota muda.
  useEffect(() => {
    setTexto(documento(nota))
    setEditando(false)
  }, [nota.id, nota.texto]) // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Salva o documento. O título é sempre a primeira linha: não existe mais um
   * campo separado para ele, porque ninguém escreve uma nota começando pelo
   * nome dela. Escreve a primeira linha, e ela vira o nome.
   */
  const guardar = async (novo = texto) => {
    if (novo === nota.texto && tituloDe(novo) === nota.titulo) return
    await salvarNota({
      id: nota.id, titulo: tituloDe(novo), texto: novo,
      fixada: nota.fixada, arquivada: nota.arquivada,
      area_id: nota.area_id, fluxo_id: nota.fluxo_id,
    })
  }

  const editar = (onde?: number) => {
    if (!meu) return
    setEditando(true)
    requestAnimationFrame(() => {
      const el = area.current
      if (!el) return
      el.focus()
      const pos = onde ?? el.value.length
      el.selectionStart = el.selectionEnd = pos
      setCursor(pos)
    })
  }

  const perguntar = async () => {
    if (pensando) return
    const { linha, corte } = linhaDoCursor(texto, editando ? cursor : null)
    // O texto vai daqui, e não do estado lá de dentro: entre salvar e o estado
    // voltar passa uma recarga, e a resposta entraria por cima da pergunta.
    const deu = await perguntarNaNota(nota.id, texto, linha, corte)
    if (deu) setEditando(false)
  }

  /** Tira do texto o bloco que a leitura escreveu. É texto seu: some de vez. */
  const apagarBloco = async (k: number) => {
    const novo = emPedacos(texto)
      .filter((_, i) => i !== k)
      .map((p) => (p.daLeitura ? p.texto.split('\n').map((l) => '> ' + l).join('\n') : p.texto))
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
    setTexto(novo)
    await guardar(novo)
  }

  return (
    <div className="doc">
      {editando ? (
        <textarea
          ref={area}
          className="inp doc-campo"
          value={texto}
          aria-label="Texto da nota"
          onChange={(e) => { setTexto(e.target.value); setCursor(e.target.selectionStart) }}
          onSelect={(e) => setCursor((e.target as HTMLTextAreaElement).selectionStart)}
          onBlur={() => { void guardar(); setEditando(false) }}
        />
      ) : (
        <div className={`doc-lido ${meu ? '' : 'so-leitura'}`} onClick={() => editar()}>
          {texto.trim()
            ? emPedacos(texto).map((p, k) => (p.daLeitura ? (
              <div className="doc-leitura" key={k}>
                <span className="doc-leitura-h">
                  <Ic.faisca />Leitura
                  <button className="iconbtn" aria-label="Apagar o que a leitura escreveu"
                    onClick={(e) => { e.stopPropagation(); void apagarBloco(k) }}><Ic.x /></button>
                </span>
                <p className="doc-p"><ComLigacoes texto={p.texto} ir={ir} notas={notas} /></p>
              </div>
            ) : (
              /* A primeira linha é o título, e aparece como título. É a mesma
                 linha do texto, não outro campo: ver `documento` em lib/notas. */
              <div className="doc-bloco" key={k}>
                {k === 0 && (
                  <h2 className="doc-titulo">{p.texto.split('\n')[0] || 'Sem título'}</h2>
                )}
                {(k === 0 ? p.texto.split('\n').slice(1).join('\n') : p.texto).trim() && (
                  <p className="doc-p">
                    <ComLigacoes
                      texto={k === 0 ? p.texto.split('\n').slice(1).join('\n').replace(/^\n+/, '') : p.texto}
                      ir={ir} notas={notas} />
                  </p>
                )}
              </div>
            )))
            : <p className="doc-vazio">{meu ? 'Toque para escrever.' : 'Nota vazia.'}</p>}
          {pensando && (
            <div className="doc-leitura doc-pensando">
              <span className="doc-leitura-h"><Ic.faisca />Leitura</span>
              <p className="doc-p">Lendo o seu caderno...</p>
            </div>
          )}
        </div>
      )}

      {/* A barra gruda no rodapé da folha: o texto passa por baixo dela em vez
          de empurrar os botões para fora da tela. Numa nota longa, perguntar
          exigia rolar até o fim, que é o contrário do que a barra existe para
          resolver. */}
      {!meu && (
        <p className="doc-emprestada">
          <Ic.team />
          Compartilhada com você. Dá para ler e abrir os anexos, e quem escreve é quem
          criou a nota.
        </p>
      )}

      <div className="doc-acoes" data-tut="notas-acoes">
        {/* onMouseDown segura o foco: sem ele o clique tira o cursor do campo,
            o campo vira texto lido, o botão sai do lugar e o clique se perde. */}
        {meu && org.ia_ativa && (
          <button className="btn" disabled={pensando}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => void perguntar()}>
            <Ic.faisca />{pensando ? 'Perguntando...' : 'Perguntar'}
          </button>
        )}
        {meu && acoes}
        <span className="hint">
          {org.ia_ativa
            ? 'Responde sobre a linha onde você está.'
            : 'A leitura com IA está desligada em Ajustes.'}
        </span>
      </div>
    </div>
  )
}

/** O texto com as ligações [[assim]] clicáveis, e o link vazio de outra cor. */
function ComLigacoes({ texto, ir, notas }: {
  texto: string; ir: (t: string) => void; notas: Nota[]
}) {
  const pedacos: (string | { titulo: string; existe: boolean })[] = []
  let fim = 0
  for (const m of texto.matchAll(LIGACAO)) {
    const i = m.index ?? 0
    if (i > fim) pedacos.push(texto.slice(fim, i))
    const titulo = m[1].trim()
    pedacos.push({ titulo, existe: !!porTitulo(notas, titulo) })
    fim = i + m[0].length
  }
  if (fim < texto.length) pedacos.push(texto.slice(fim))

  return (
    <>
      {pedacos.map((p, i) => typeof p === 'string'
        ? <span key={i}>{p}</span>
        : (
          <button key={i} className={`nt-lig ${p.existe ? '' : 'vazio'}`}
            onClick={(e) => { e.stopPropagation(); ir(p.titulo) }}
            title={p.existe ? `Abrir ${p.titulo}` : `Criar a nota ${p.titulo}`}>
            {p.titulo}
          </button>
        ))}
    </>
  )
}
