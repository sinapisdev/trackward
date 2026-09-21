'use client'

import { useEffect, useRef } from 'react'
import { Ic } from '@/componentes/Icones'
import { fracao } from '@/lib/regras'
import { curta, rel } from '@/lib/datas'
import type { Decisao, Fluxo } from '@/lib/tipos'

/**
 * O trilho da esteira, dentro da track.
 *
 * O quadro em Tracks mostra a trilha inteira de longe, para responder "onde isto
 * está". Aqui a pergunta é outra: você já está dentro, trabalhando, e precisa
 * saber a que distância está da chegada sem perder de vista o checkpoint aberto.
 *
 * Por isso é um trilho e não uma lista de cartões: uma linha contínua, com a
 * parte andada acesa, as estações em cima dela, e a da vez maior que as outras.
 * O anel da estação corrente enche conforme o checklist anda, então dá para ver
 * o progresso de dentro do checkpoint sem abrir o checkpoint.
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
  /** Qual checkpoint está aberto embaixo. */
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
          ? `${feitos}/${et.itens.length}${et.prazo ? `, ${rel(et.prazo).toLowerCase()}` : ''}`
          : et.prazo ? curta(et.prazo) : 'sem prazo',
    }
  })

  /**
   * Quanto do trilho já andou, contando o checklist do checkpoint da vez.
   *
   * Os vãos vão de uma estação à seguinte, e a chegada é uma estação: com quatro
   * checkpoints são cinco estações e quatro vãos. Contar os vãos sem a chegada
   * fazia a luz passar do ponto, e passar do ponto num trilho é dizer que a
   * esteira andou mais do que andou.
   */
  const vaos = Math.max(1, f.etapas.length)
  const andado = f.concluido
    ? 1
    : Math.min(1, (f.atual + (estacoes[f.atual]?.cheio ?? 0)) / vaos)

  // Trilho comprido não cabe na tela. Quem abre a track quer ver onde ela está,
  // então a estação da vez entra já centralizada.
  useEffect(() => {
    const cx = fora.current
    const alvo = cx?.querySelector('.est.vez, .est.sel')
    if (!cx || !alvo) return
    const r = (alvo as HTMLElement).getBoundingClientRect()
    const c = cx.getBoundingClientRect()
    if (r.left >= c.left && r.right <= c.right) return
    cx.scrollTo({ left: cx.scrollLeft + r.left - c.left - (c.width - r.width) / 2, behavior: 'smooth' })
  }, [f.id, f.atual])

  return (
    <div className={`trilho-linha ${travado ? 'travado' : ''} ${f.concluido ? 'fim' : ''}`}>
      <div className="trilho-rolo" ref={fora}>
        <ol
          className="estacoes"
          style={{
            ['--andado' as string]: andado,
            // Quantas estações, para o trilho começar e terminar no meio das pontas.
            ['--n' as string]: f.etapas.length + 1,
          }}
        >
          {estacoes.map((e, k) => (
            <li key={e.chave} className={`est ${e.estado} ${sel === k ? 'sel' : ''} ${e.voltou ? 'voltou' : ''}`}>
              <button
                onClick={() => aoEscolher(k)}
                aria-current={sel === k ? 'step' : undefined}
                aria-label={`${e.nome}, ${e.estado === 'feita' ? 'aprovado' : e.estado === 'vez' ? 'em curso' : 'ainda não chegou'}${e.voltou ? ', já voltou atrás uma vez' : ''}`}
              >
                <span className="est-marca">
                  {e.estado === 'feita' ? (
                    <span className="est-ok"><Ic.check /></span>
                  ) : e.estado === 'vez' ? (
                    <svg viewBox="0 0 24 24" className="est-anel" aria-hidden>
                      <circle cx="12" cy="12" r="9" className="trilho-vazio" />
                      <circle cx="12" cy="12" r="9" className="trilho-cheio"
                        strokeDasharray={`${(e.cheio * ANEL).toFixed(2)} ${ANEL}`}
                        transform="rotate(-90 12 12)" />
                      <circle cx="12" cy="12" r="3.4" className="trilho-miolo" />
                    </svg>
                  ) : (
                    <span className="est-oca" />
                  )}
                  {e.voltou && <span className="est-voltou" title="Este checkpoint já voltou atrás" />}
                </span>
                <span className="est-txt">
                  <b>{e.nome}</b>
                  <small>{e.detalhe}</small>
                </span>
              </button>
            </li>
          ))}
          <li className="est chegada" aria-hidden>
            <span className="est-marca">
              <span className={`est-bandeira ${f.concluido ? 'on' : ''}`}><Ic.flag /></span>
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
