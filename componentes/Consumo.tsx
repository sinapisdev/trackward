'use client'

import { useState } from 'react'
import { useDados } from '@/componentes/Dados'
import { Ic } from '@/componentes/Icones'
import { MODELOS, PRECOS, custoMicro, emDolar, nomeDoModelo } from '@/lib/precos'
import { MODO_LOCAL } from '@/lib/modo'

/**
 * O relógio de luz da empresa, e o teto.
 *
 * Existe por um motivo comercial, não técnico: sem medidor não há como cobrar,
 * e sem teto não há como dormir. Uma empresa muito conversadora, ou um laço de
 * repetição, e a conta de quem vende o app sobe sem ninguém ver.
 *
 * O teto corta o gasto, não o produto. Batendo o limite, a leitura passa a usar
 * as regras de português embutidas no app, que não custam nada e continuam
 * achando tarefa, prazo e decisão. É por isso que ligar teto é seguro.
 *
 * Quem confere o teto é o banco, na rota que fala com o modelo. Esta tela só
 * mostra e ajusta: teto conferido no navegador não seria teto.
 */

/** Uma leitura típica, medida no app: o que a tela usa para estimar. */
const LEITURA = { entrada: 2800, saida: 300 }

export function Consumo() {
  const { org, consumo, salvarOrg, eu } = useDados()
  const admin = eu.papel === 'admin'
  const [limite, setLimite] = useState(consumo.limite === null ? '' : String(consumo.limite))

  const modelo = consumo.modelo || 'claude-sonnet-5'
  const porLeitura = custoMicro(modelo, LEITURA)
  const fracao = consumo.limite ? Math.min(1, consumo.leituras / consumo.limite) : 0
  const estourou = !!consumo.limite && consumo.leituras >= consumo.limite

  return (
    <div className="blk">
      <div className="bh">
        <h2>Consumo da IA neste mês</h2>
        <span className="c">só a leitura da conversa consome modelo pago</span>
      </div>

      <div className="card" style={{ padding: 15 }}>
        {MODO_LOCAL ? (
          <p className="hint" style={{ marginTop: 0 }}>
            <b>No modo demonstração nada é cobrado</b>, porque não existe chave de modelo
            configurada e a leitura roda pelas regras embutidas. O medidor começa a contar
            quando o app estiver ligado no banco com uma chave.
          </p>
        ) : null}

        <div className="cns">
          <div className="cns-n">
            <b>{consumo.leituras}</b>
            <span>leituras com modelo</span>
            <small>{consumo.limite ? `de ${consumo.limite} do plano` : 'sem teto'}</small>
          </div>
          <div className="cns-n">
            <b>{emDolar(consumo.gastoMicro)}</b>
            <span>gasto no mês</span>
            <small>medido pelo que a API cobrou, não estimado</small>
          </div>
          <div className="cns-n">
            <b>{emDolar(porLeitura)}</b>
            <span>por leitura</span>
            <small>no {nomeDoModelo(modelo)}, numa conversa de tamanho comum</small>
          </div>
        </div>

        {!!consumo.limite && (
          <div className={`cns-barra ${estourou ? 'cheia' : fracao > 0.75 ? 'quase' : ''}`}>
            <span style={{ width: `${fracao * 100}%` }} />
          </div>
        )}

        {estourou && (
          <p className="cns-estourou">
            <Ic.pause />
            <span>
              <b>O teto do mês foi atingido.</b> A leitura da conversa continua funcionando
              pelas regras embutidas, que não custam nada. O modelo volta no dia 1, ou quando
              alguém subir o teto aqui.
            </span>
          </p>
        )}

        <div className="cns-campos">
          <label className="fld">
            <span className="lbl">Teto de leituras por mês</span>
            <input className="inp" type="number" min={0} inputMode="numeric"
              value={limite} disabled={!admin} placeholder="sem teto"
              onChange={(e) => setLimite(e.target.value)}
              onBlur={() => {
                const n = limite.trim() === '' ? null : Math.max(0, Number(limite) || 0)
                if (n !== consumo.limite) void salvarOrg({ limite_leituras: n })
              }} />
            <p className="hint">
              Vazio é sem teto. Batendo o número, a leitura passa para as regras embutidas
              até o mês virar. Nada deixa de funcionar.
            </p>
          </label>

          <div className="fld">
            <span className="lbl">Qual modelo esta empresa usa</span>
            <div className="cns-modelos">
              <button className={`tpl ${!consumo.modelo ? 'on' : ''}`} disabled={!admin}
                onClick={() => void salvarOrg({ modelo_ia: null })}>
                Padrão do servidor
              </button>
              {MODELOS.map((m) => (
                <button key={m.id} className={`tpl ${consumo.modelo === m.id ? 'on' : ''}`}
                  disabled={!admin} onClick={() => void salvarOrg({ modelo_ia: m.id })}>
                  {m.nome}
                  <i>{emDolar(custoMicro(m.id, LEITURA))}</i>
                </button>
              ))}
            </div>
            <p className="hint">
              {MODELOS.find((m) => m.id === consumo.modelo)?.sobre
                || 'O servidor escolhe, hoje o Sonnet 5. Trocar para o Haiku corta o custo quase pela metade e continua dando conta da leitura do dia a dia.'}
            </p>
          </div>
        </div>

        <details className="cns-conta">
          <summary>De onde sai o valor por leitura</summary>
          <p>
            Um pedido de leitura carrega as instruções, o esquema da resposta, as pessoas, as
            tarefas da esteira, o que a empresa já ensinou e até 40 mensagens da conversa.
            Medido no app, dá cerca de <b>{LEITURA.entrada.toLocaleString('pt-BR')} tokens
            de entrada</b> e <b>{LEITURA.saida} de saída</b>.
          </p>
          <table className="cns-tab">
            <thead><tr><th>Modelo</th><th>Entrada</th><th>Saída</th><th>Uma leitura</th></tr></thead>
            <tbody>
              {MODELOS.map((m) => (
                <tr key={m.id} className={consumo.modelo === m.id ? 'on' : ''}>
                  <td>{m.nome}</td>
                  <td>US$ {PRECOS[m.id]?.entrada}/M</td>
                  <td>US$ {PRECOS[m.id]?.saida}/M</td>
                  <td><b>{emDolar(custoMicro(m.id, LEITURA))}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            O gasto do mês acima não é estimativa: cada chamada grava o que a própria API
            informou ter cobrado, com o nome do modelo junto. Preço que mudar amanhã não
            mexe no que já foi medido.
          </p>
        </details>
      </div>
    </div>
  )
}
