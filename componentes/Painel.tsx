'use client'

import { useMemo, useState } from 'react'
import { useDados } from './Dados'
import { useModais } from './Modais'
import { Carregando } from './Shell'
import { Ic } from './Icones'
import { FiltroPessoas, Grupos, Lateral, LinhaPendencia } from './partes'
import { Pastas, type Pasta } from './Pastas'
import { DSEM_LONGO, hoje, MES_LONGO } from '@/lib/datas'
import { etapaAtual, envolve, pendencias, progresso, status } from '@/lib/regras'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export function Painel() {
  const { eu, fluxos, areas, carregando, nomeDe } = useDados()
  const { abrir } = useModais()
  const router = useRouter()
  const [pessoa, setPessoa] = useState<string | null>(null)
  const [naVez, setNaVez] = useState(0)

  /**
   * Uma pasta por frente aberta. A ordem é a da urgência: o que está atrasado
   * vem primeiro, porque a primeira pasta é a que a pessoa vê sem rolar nada.
   */
  const pastas = useMemo<Pasta[]>(() => {
    const abertos = fluxos.filter((f) => !f.concluido && envolve(f, pessoa))
    const peso = { late: 0, hold: 1, soon: 2, ok: 3, done: 4 } as Record<string, number>
    return [...abertos]
      .sort((a, b) => peso[status(a)] - peso[status(b)])
      .map((f) => ({
        id: f.id,
        nome: f.nome,
        sub: [f.tipo === 'ciclo' ? f.periodo || 'Rotina' : 'Projeto', etapaAtual(f)?.nome]
          .filter(Boolean).join(' · '),
        contagem: f.etapas.flatMap((e) => e.itens).filter((i) => !i.feito).length,
        progresso: progresso(f),
        atrasado: status(f) === 'late',
        travado: status(f) === 'hold',
      }))
  }, [fluxos, pessoa])

  if (carregando) return <Carregando />

  const lista = fluxos.filter((f) => envolve(f, pessoa))
  const conta = (k: string) => lista.filter((f) => status(f) === k).length
  const minhas = pendencias(fluxos, eu.id)

  const partes: string[] = []
  if (conta('late')) partes.push('late')
  if (conta('hold')) partes.push('hold')
  if (conta('soon')) partes.push('soon')

  const h = hoje()
  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'
  const primeiroNome = eu.nome.split(' ')[0]

  const frase = !fluxos.length ? (
    'Nada cadastrado ainda.'
  ) : !partes.length ? (
    'Tudo em dia.'
  ) : (
    <>
      {partes.map((k, i) => (
        <span key={k}>
          {i > 0 && (i === partes.length - 1 ? ' e ' : ', ')}
          {k === 'late' && <b className="l">{conta('late')} {conta('late') > 1 ? 'esteiras atrasadas' : 'esteira atrasada'}</b>}
          {k === 'hold' && <b className="h">{conta('hold')} {conta('hold') > 1 ? 'travadas' : 'travada'}</b>}
          {k === 'soon' && <b className="w">{conta('soon')} vencendo em até 3 dias</b>}
        </span>
      ))}
      .
    </>
  )

  const vazio = !fluxos.length

  return (
    <>
      <div className="hdr">
        <div>
          <div className="eyebrow">
            {DSEM_LONGO[h.getDay()]}, {h.getDate()} de {MES_LONGO[h.getMonth()]}
          </div>
          <h1>{saudacao}, {primeiroNome}</h1>
          <p className="lede">
            {frase}{' '}
            {!!minhas.length && (
              <>
                <b>{minhas.length}</b> {minhas.length > 1 ? 'itens aguardam' : 'item aguarda'} você.
              </>
            )}
          </p>
        </div>
        <div className="hdr-actions">
          <FiltroPessoas pessoa={pessoa} aoTrocar={setPessoa} />
          {!!areas.length && (
            <button className="btn pri" onClick={() => abrir({ tipo: 'fluxo', tipoFluxo: 'esteira' })}>
              <Ic.plus />Novo
            </button>
          )}
        </div>
      </div>

      {vazio ? (
        <div className="card">
          <div className="onb">
            <h3>{areas.length ? 'Crie o primeiro projeto ou rotina' : 'Comece criando uma área'}</h3>
            <p>
              {areas.length
                ? 'Projetos têm início, checkpoints e fim. Rotinas se repetem a cada período e guardam o histórico de cada volta.'
                : 'Áreas são as frentes que já funcionam na empresa: Financeiro, Comercial, Operações, Pessoas. Cada uma guarda as rotinas que se repetem.'}
            </p>
            {areas.length ? (
              <div className="row-inline">
                <button className="btn pri" onClick={() => abrir({ tipo: 'fluxo', tipoFluxo: 'esteira' })}>
                  <Ic.plus />Novo projeto
                </button>
                <button className="btn" onClick={() => abrir({ tipo: 'fluxo', tipoFluxo: 'ciclo' })}>
                  <Ic.ciclo />Nova rotina
                </button>
              </div>
            ) : eu.papel === 'admin' ? (
              <button className="btn pri" onClick={() => abrir({ tipo: 'area' })}><Ic.plus />Nova área</button>
            ) : (
              <p className="hint">Peça a um administrador para criar os areas da empresa.</p>
            )}
          </div>
        </div>
      ) : (
        <>
        {pastas.length > 1 && (
          <Pastas
            rotulo="Projetos e rotinas em andamento"
            itens={pastas}
            atual={Math.min(naVez, pastas.length - 1)}
            aoTrocar={setNaVez}
            aoAbrir={(p) => router.push(`/fluxo/${p.id}`)}
          />
        )}
        <div className="grid2">
          <div>
            {!pessoa && !!minhas.length && (
              <div className="blk">
                <div className="bh">
                  <h2>Aguardando você</h2>
                  <span className="c num">{minhas.length}</span>
                  <Link className="r" href="/minhas">Ver todas</Link>
                </div>
                <div className="card">
                  {minhas.slice(0, 4).map((p, i) => <LinhaPendencia key={i} p={p} />)}
                </div>
              </div>
            )}
            <div className="blk">
              <div className="bh">
                <h2>Radar</h2>
                <span className="c">
                  {pessoa ? `com participação de ${nomeDe(pessoa)}` : 'todos os projetos e rotinas'}
                </span>
              </div>
              <Grupos lista={lista} />
            </div>
          </div>
          <Lateral lista={lista} />
        </div>
        </>
      )}
    </>
  )
}
