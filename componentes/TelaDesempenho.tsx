'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useDados } from '@/componentes/Dados'
import { Carregando } from '@/componentes/Shell'
import { Ic } from '@/componentes/Icones'
import { Av } from '@/componentes/atomos'
import {
  PERIODOS, gargalos, indicadores, porArea, porDia, porPessoa, semHora,
  type Indicador, type Periodo,
} from '@/lib/desempenho'
import { FAIXAS, porque, timeInteiroApertado, type Carga } from '@/lib/sobrecarga'

/**
 * Desempenho: como a empresa está entregando, e onde ela está presa.
 *
 * O Painel responde "o que precisa de mim agora". Esta tela responde outra coisa:
 * "como estamos indo". São perguntas diferentes e por isso são telas diferentes.
 *
 * Cada pessoa mede o que ela enxerga. O colaborador vê os próprios números, o
 * gestor vê os do time dele, o administrador vê os da empresa. Isso não é regra
 * escrita aqui: é consequência de os dados já chegarem filtrados pelo banco.
 */

function Seta({ i }: { i: Indicador }) {
  if (i.antes === null || i.antes === i.valor) return null
  const subiu = i.valor > i.antes
  const bom = subiu === i.maiorEhMelhor
  const dif = i.unidade === '%'
    ? `${subiu ? '+' : ''}${i.valor - i.antes} p.p.`
    : `${subiu ? '+' : ''}${i.valor - i.antes}`
  return (
    <span className={`kpi-dif ${bom ? 'bom' : 'ruim'}`} title="Comparado ao período anterior">
      <span className={subiu ? 'sobe' : 'desce'}><Ic.seta /></span>{dif}
    </span>
  )
}

function Cartao({ i }: { i: Indicador }) {
  const vazio = i.unidade === '%' && !i.base
  return (
    <div className="kpi">
      <span className="kpi-rot">{i.rotulo}</span>
      <span className="kpi-linha">
        <b className="kpi-num">
          {vazio ? '—' : i.valor}
          {!vazio && i.unidade === '%' && <i>%</i>}
        </b>
        <Seta i={i} />
      </span>
      <span className="kpi-sobre">
        {vazio
          ? i.chave === 'primeira'
            ? 'Nenhum checkpoint foi decidido no período'
            : 'Nada entregue no período'
          : i.sobre}
      </span>
    </div>
  )
}

function Grafico({ barras }: { barras: { rotulo: string; titulo: string; total: number; noPrazo: number }[] }) {
  const teto = Math.max(1, ...barras.map((b) => b.total))
  return (
    <div className="graf">
      {barras.map((b, k) => {
        const atrasadas = b.total - b.noPrazo
        return (
          <div className="graf-col" key={k} title={`${b.titulo}: ${b.total} entregue${b.total === 1 ? '' : 's'}${atrasadas ? `, ${atrasadas} fora do prazo` : ''}`}>
            <span className="graf-n">{b.total || ''}</span>
            <span className="graf-barra" style={{ height: `${(b.total / teto) * 100}%` }}>
              {!!atrasadas && (
                <span className="graf-late" style={{ height: `${(atrasadas / Math.max(b.total, 1)) * 100}%` }} />
              )}
            </span>
            <span className="graf-rot">{b.rotulo}</span>
          </div>
        )
      })}
    </div>
  )
}

function LinhaCarga({ c }: { c: Carga }) {
  return (
    <div className={`sc ${c.faixa}`}>
      <span className="sc-nm"><Av p={c.pessoa} tam="sm" />{c.pessoa.nome}</span>
      <span className="sc-barra" aria-hidden>
        <span style={{ width: `${c.indice ?? 0}%` }} />
      </span>
      <span className="sc-n">{c.indice === null ? '—' : c.indice}</span>
      <span className="sc-txt">
        <b>{FAIXAS[c.faixa].nome}</b>
        <small>{porque(c)}</small>
      </span>
    </div>
  )
}

export function TelaDesempenho() {
  const { fluxos, areas, perfis, decisoesDe, anexosDe, nomeDe, carregando, todosFluxos, cargas,
    pessoal } = useDados()
  const [janela, setJanela] = useState<Periodo>(30)

  const dados = useMemo(() => {
    const todasDecisoes = fluxos.flatMap((f) => decisoesDe(f.id))
    return {
      ind: indicadores(fluxos, todasDecisoes, anexosDe, janela),
      barras: porDia(fluxos, janela),
      pessoas: porPessoa(fluxos, perfis, janela),
      presos: gargalos(fluxos, nomeDe),
      areasVivas: porArea(fluxos, areas, janela),
      orfas: semHora(fluxos),
    }
  }, [fluxos, areas, perfis, janela, decisoesDe, anexosDe, nomeDe])

  if (carregando) return <Carregando />

  const periodo = PERIODOS.find((p) => p.dias === janela)!
  const maiorCarga = Math.max(1, ...dados.pessoas.map((p) => p.abertas + p.entregues))
  const semNada = !todosFluxos.length

  return (
    <>
      <div className="hdr">
        <div>
          <div className="eyebrow">Como estamos indo</div>
          <h1>Desempenho</h1>
        </div>
        <div className="tpls">
          {PERIODOS.map((p) => (
            <button key={p.dias} className={`tpl ${janela === p.dias ? 'on' : ''}`}
              onClick={() => setJanela(p.dias)}>{p.nome}</button>
          ))}
        </div>
      </div>

      {semNada ? (
        <div className="card empty" style={{ padding: 40 }}>
          Ainda não há nada para medir. Crie a primeira track e volte aqui quando as
          primeiras tarefas saírem.
        </div>
      ) : (
        <>
          <div className="kpis">
            {dados.ind.map((i) => <Cartao key={i.chave} i={i} />)}
          </div>

          <div className="blk">
            <div className="bh">
              <h2>Entregas {periodo.dias === 7 ? 'por dia' : periodo.dias === 30 ? 'a cada três dias' : 'por semana'}</h2>
              <span className="c">a parte escura de cada barra saiu fora do prazo</span>
            </div>
            <div className="card">
              <Grafico barras={dados.barras} />
            </div>
          </div>

          <div className="dois">
            <div className="blk">
              <div className="bh">
                <h2>Onde está preso</h2>
                {!!dados.presos.length && <span className="c">o que mais espera</span>}
              </div>
              <div className="card">
                {dados.presos.length ? dados.presos.map((g) => (
                  <Link className="preso" key={g.fluxo.id} href={`/fluxo/${g.fluxo.id}`}>
                    <span className="preso-dias">
                      {g.parado ? <><b>{g.parado}</b>d</> : <b>·</b>}
                    </span>
                    <span className="preso-txt">
                      <b>{g.etapa}</b>
                      <span>
                        {g.fluxo.nome}
                        {g.aprovador && ` · aguarda ${g.aprovador}`}
                        {!!g.faltam && ` · ${g.faltam} tarefa${g.faltam === 1 ? '' : 's'} em aberto`}
                      </span>
                    </span>
                    <Ic.seta />
                  </Link>
                )) : (
                  <div className="empty" style={{ padding: 0 }}>
                    Nada atrasado nem travado. É o melhor resultado possível aqui.
                  </div>
                )}
              </div>
            </div>

            <div className="blk">
              <div className="bh"><h2>Por área</h2></div>
              <div className="card">
                {dados.areasVivas.length ? dados.areasVivas.map((a) => (
                  <Link className="sarea" key={a.area.id} href={`/tracks/${a.area.id}`}>
                    <span className="pdot"><span className="sdot" style={{ background: a.area.cor }} /></span>
                    <span className="sarea-nm">{a.area.nome}</span>
                    <span className="sarea-n">
                      {a.entregues} entregue{a.entregues === 1 ? '' : 's'}
                    </span>
                    {a.atrasadas
                      ? <span className="selo late">{a.atrasadas} atrasada{a.atrasadas === 1 ? '' : 's'}</span>
                      : <span className="sarea-ok">em dia</span>}
                  </Link>
                )) : <div className="empty" style={{ padding: 0 }}>Nenhuma área com movimento.</div>}
              </div>
            </div>
          </div>

          <div className="blk">
            <div className="bh">
              <h2>Sobrecarga</h2>
              <span className="c">demanda contra o ritmo de cada um, nos últimos 30 dias</span>
            </div>
            <div className="card">
              <p className="sc-regua">
                Sobrecarga aqui não é tamanho de fila: é <b>a fila não caber no tempo que a
                pessoa tem</b>, no ritmo em que ela costuma entregar. Duas coisas bastam
                sozinhas para acender: prazo já perdido, ou fila que não fecha. Carregar mais
                que os colegas só agrava, porque pode ser o trabalho sendo diferente.
              </p>
              {timeInteiroApertado(cargas) && (
                <p className="sc-time">
                  <Ic.espera />
                  <span>
                    <b>Os {cargas.filter((c) => c.indice !== null).length} estão com fila maior
                    que o prazo.</b> Quando isso vale para todo mundo, não é sobrecarga de uma
                    pessoa: é mais trabalho do que o time vaza. Tirar de um para dar a outro
                    não resolve.
                  </span>
                </p>
              )}
              {cargas.map((c) => <LinhaCarga key={c.pessoa.id} c={c} />)}
            </div>
          </div>

          {/* Espaço de uma pessoa não tem "por pessoa": a tabela teria uma linha
              e repetiria o que os números do topo já disseram. */}
          {!pessoal && (
          <div className="blk">
            <div className="bh">
              <h2>Por pessoa</h2>
              <span className="c">o que está na mão de cada um, e o que saiu</span>
            </div>
            <div className="card">
              <div className="pes-h">
                <span>Pessoa</span>
                <span>Carga</span>
                <span className="num">Abertas</span>
                <span className="num">Atrasadas</span>
                <span className="num">Entregues</span>
                <span className="num">No prazo</span>
              </div>
              {dados.pessoas.length ? dados.pessoas.map((l) => (
                <div className="pes" key={l.pessoa.id}>
                  <span className="pes-nm"><Av p={l.pessoa} tam="sm" />{l.pessoa.nome}</span>
                  <span className="pes-carga">
                    <span className="pes-b feito" style={{ width: `${(l.entregues / maiorCarga) * 100}%` }} />
                    <span className="pes-b aberto" style={{ width: `${((l.abertas - l.atrasadas) / maiorCarga) * 100}%` }} />
                    <span className="pes-b late" style={{ width: `${(l.atrasadas / maiorCarga) * 100}%` }} />
                  </span>
                  <span className="num">{l.abertas}</span>
                  <span className={`num ${l.atrasadas ? 'ruim' : ''}`}>{l.atrasadas || '·'}</span>
                  <span className="num">{l.entregues}</span>
                  <span className="num">
                    {l.entregues ? `${Math.round((l.noPrazo / l.entregues) * 100)}%` : '·'}
                  </span>
                </div>
              )) : <div className="empty" style={{ padding: 0 }}>Ninguém com tarefa no período.</div>}
            </div>
          </div>
          )}

          {!!dados.orfas && (
            <p className="rodape-honesto">
              <Ic.espera />
              {dados.orfas === 1
                ? '1 tarefa foi concluída antes de o app passar a guardar a hora da conclusão, então ela não entra em nenhuma conta de período.'
                : `${dados.orfas} tarefas foram concluídas antes de o app passar a guardar a hora da conclusão, então elas não entram em nenhuma conta de período.`}
            </p>
          )}
        </>
      )}
    </>
  )
}
