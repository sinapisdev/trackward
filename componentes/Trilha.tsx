'use client'

import { useEffect, useRef } from 'react'
import { Ic } from '@/componentes/Icones'
import { fracao } from '@/lib/regras'
import { curta, rel } from '@/lib/datas'
import type { Decisao, Fluxo } from '@/lib/tipos'

/**
 * A trilha da track: o objeto de assinatura do produto.
 *
 * É **vertical**, como manda o AGENTS.md e como o design system desenha o
 * CheckpointTrail na orientação de coluna. Era horizontal e rolava de lado, e
 * com sete checkpoints isso obrigava a arrastar para descobrir onde a esteira
 * estava, que é justamente a pergunta que ela existe para responder.
 *
 * O desenho segue o sistema: checkpoint aprovado é disco cheio com o visto, o
 * corrente é anel do acento com um halo fraco, o que ainda não chegou é contorno
 * apagado, e o fio que liga acende até onde a esteira andou.
 *
 * Uma coisa o sistema não tem e o produto precisa: **o anel do corrente enche
 * conforme o checklist anda**. Dá para ver o progresso de dentro do checkpoint
 * sem abrir o checkpoint, e é o que o contrato do projeto pede.
 *
 * Tudo é CSS e um anel em SVG. Sem biblioteca e sem canvas: as estações são
 * botões de verdade, então o teclado anda por elas e o leitor de tela lê cada
 * uma pelo nome e pela situação.
 */

const ANEL = 2 * Math.PI * 9

type Estacao = {
  chave: string
  nome: string
  estado: 'feita' | 'vez' | 'futura'
  detalhe: string
  cheio: number
  voltou: boolean
}

export function Trilha({ f, sel, aoEscolher, decisoes }: {
  f: Fluxo
  /** Qual checkpoint está aberto ao lado. */
  sel: number
  aoEscolher: (k: number) => void
  decisoes: Decisao[]
}) {
  const fora = useRef<HTMLDivElement>(null)
  const travado = !!f.travado_motivo

  const devolvidos = new Set(
    decisoes.filter((d) => d.tipo === 'devolveu').map((d) => d.etapa_id),
  )

  const estacoes: Estacao[] = f.etapas.map((et, k) => {
    const feita = f.concluido || k < f.atual
    const vez = k === f.atual && !f.concluido
    const feitos = et.itens.filter((x) => x.feito).length
    return {
      chave: et.id,
      nome: et.nome,
      estado: feita ? 'feita' : vez ? 'vez' : 'futura',
      cheio: vez ? fracao(et) : 0,
      voltou: devolvidos.has(et.id),
      detalhe: feita
        ? 'Aprovado'
        : vez
          ? `${feitos} de ${et.itens.length}${et.prazo ? `, ${rel(et.prazo).toLowerCase()}` : ''}`
          : et.prazo ? curta(et.prazo) : 'sem prazo',
    }
  })

  // Trilha comprida não cabe na tela. Quem abre a track quer ver onde ela está,
  // então a estação da vez entra já à vista.
  useEffect(() => {
    const cx = fora.current
    const alvo = cx?.querySelector('.est.vez, .est.sel')
    if (!cx || !alvo) return
    const r = (alvo as HTMLElement).getBoundingClientRect()
    const c = cx.getBoundingClientRect()
    if (r.top >= c.top && r.bottom <= c.bottom) return
    cx.scrollTo({ top: cx.scrollTop + r.top - c.top - (c.height - r.height) / 2, behavior: 'smooth' })
  }, [f.id, f.atual])

  return (
    <div className={`trilha ${travado ? 'travado' : ''} ${f.concluido ? 'fim' : ''}`}>
      <div className="trilha-rolo" ref={fora}>
        <ol className="estacoes">
          {estacoes.map((e, k) => (
            <li key={e.chave} className={`est ${e.estado} ${sel === k ? 'sel' : ''} ${e.voltou ? 'voltou' : ''}`}>
              <button
                onClick={() => aoEscolher(k)}
                aria-current={sel === k ? 'step' : undefined}
                aria-label={`${e.nome}, ${e.estado === 'feita' ? 'aprovado' : e.estado === 'vez' ? 'em curso' : 'ainda não chegou'}${e.voltou ? ', já voltou atrás uma vez' : ''}`}
              >
                <span className="est-col">
                  <span className="est-marca">
                    {e.estado === 'feita' ? (
                      <span className="est-ok"><Ic.check /></span>
                    ) : e.estado === 'vez' ? (
                      <svg viewBox="0 0 24 24" className="est-anel" aria-hidden>
                        <circle cx="12" cy="12" r="9" className="trilha-vazio" />
                        <circle cx="12" cy="12" r="9" className="trilha-cheio"
                          strokeDasharray={`${(e.cheio * ANEL).toFixed(2)} ${ANEL}`}
                          transform="rotate(-90 12 12)" />
                      </svg>
                    ) : (
                      <span className="est-oca">{k + 1}</span>
                    )}
                    {e.voltou && <span className="est-voltou" title="Este checkpoint já voltou atrás" />}
                  </span>
                  <span className="est-fio" aria-hidden />
                </span>
                <span className="est-txt">
                  {e.estado === 'vez' && <small className="est-agora">Agora</small>}
                  <b>{e.nome}</b>
                  <small>{e.detalhe}</small>
                </span>
              </button>
            </li>
          ))}
          <li className="est chegada" aria-hidden>
            <span className="est-col">
              <span className="est-marca">
                <span className={`est-bandeira ${f.concluido ? 'on' : ''}`}><Ic.flag /></span>
              </span>
            </span>
            <span className="est-txt">
              <b>{f.tipo === 'ciclo' ? 'Volta' : 'Fim'}</b>
              <small>{f.concluido ? 'entregue' : f.tipo === 'ciclo' ? 'e recomeça' : ''}</small>
            </span>
          </li>
        </ol>
      </div>
    </div>
  )
}

/**
 * A mesma trilha deitada, que é como a arte do produto desenha a track aberta,
 * a rotina na lista e a pasta em foco no painel.
 *
 * Deitada ela só serve enquanto os checkpoints cabem na largura. Passando disso
 * ela rolaria de lado, e rolar para descobrir onde a esteira está é justamente o
 * que a trilha existe para evitar.
 *
 * O modo `soMarcas` é a saída para quando são muitos: só os marcadores, sem
 * nome nenhum. Sete bolinhas cabem com folga em 393px, o anel diz onde a track
 * está de um olhar, e o nome do checkpoint escolhido aparece logo abaixo, no
 * cabeçalho do checkpoint, onde ele já estava. Nada rola de lado, e nada se
 * perde: o nome só deixa de aparecer duas vezes.
 */
export function TrilhaH({ f, sel, aoEscolher, numerada = false, miuda = false, soMarcas = false,
  decisoes = [] }: {
  f: Fluxo
  sel?: number
  aoEscolher?: (k: number) => void
  /** "1. Preparação" em vez de "Preparação". A track aberta numera; a lista não. */
  numerada?: boolean
  /** Versão de lista: marcas menores e sem a linha de detalhe. */
  miuda?: boolean
  /**
   * Só os marcadores, sem nome. Para quando são muitos e a largura é pouca: o
   * nome de quem está aberto fica no cabeçalho do checkpoint, embaixo.
   */
  soMarcas?: boolean
  decisoes?: Decisao[]
}) {
  const devolvidos = new Set(decisoes.filter((d) => d.tipo === 'devolveu').map((d) => d.etapa_id))

  return (
    <div className={`trilhah ${miuda ? 'miuda' : ''} ${soMarcas ? 'so-marcas' : ''} ${f.concluido ? 'fim' : ''}`}>
      <ol>
        {f.etapas.map((et, k) => {
          const feita = f.concluido || k < f.atual
          const vez = k === f.atual && !f.concluido
          const feitos = et.itens.filter((x) => x.feito).length
          const detalhe = feita
            ? 'Aprovado'
            : vez
              ? `${feitos} de ${et.itens.length} ${et.itens.length === 1 ? 'tarefa' : 'tarefas'}`
              : k === f.etapas.length - 1 ? 'Final' : k === f.atual + 1 ? 'Próximo' : et.prazo ? curta(et.prazo) : ''
          const estado = feita ? 'feita' : vez ? 'vez' : 'futura'
          const Marca = (
            <span className="th-marca">
              {feita ? <span className="th-ok"><Ic.check /></span>
                : vez ? (
                  <svg viewBox="0 0 28 28" className="th-anel" aria-hidden>
                    <circle cx="14" cy="14" r="12" className="trilha-vazio" />
                    <circle cx="14" cy="14" r="12" className="trilha-cheio"
                      strokeDasharray={`${(fracao(et) * 2 * Math.PI * 12).toFixed(2)} ${(2 * Math.PI * 12).toFixed(2)}`}
                      transform="rotate(-90 14 14)" />
                  </svg>
                ) : <span className="th-oca">{k + 1}</span>}
              {devolvidos.has(et.id) && <span className="th-voltou" title="Este checkpoint já voltou atrás" />}
            </span>
          )
          const dentro = (
            <>
              {vez && !soMarcas && <small className="th-agora">Agora</small>}
              {Marca}
              {!soMarcas && <b>{numerada ? `${k + 1}. ` : ''}{et.nome}</b>}
              {!miuda && !soMarcas && <small className="th-det">{detalhe}</small>}
            </>
          )
          return (
            <li key={et.id} className={`th-est ${estado} ${sel === k ? 'sel' : ''}`}>
              {aoEscolher ? (
                <button onClick={() => aoEscolher(k)} aria-current={vez ? 'step' : undefined}
                  aria-label={`${et.nome}, ${feita ? 'aprovado' : vez ? 'em curso' : 'ainda não chegou'}`}>
                  {dentro}
                </button>
              ) : <span>{dentro}</span>}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
