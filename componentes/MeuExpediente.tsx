'use client'

import { useState } from 'react'
import { useDados } from './Dados'
import { Ic } from './Icones'
import { DSEM_LONGO } from '@/lib/datas'
import { escrito, horasPorSemana, temExpediente, valida, type Faixa } from '@/lib/expediente'

/**
 * As horas em que você trabalha.
 *
 * O app sabia quando a CASA fala e quando não perturbar, e não sabia a coisa
 * mais simples: de que horas a que horas aquela pessoa trabalha. Sem isso,
 * prazo de tarefa cai em sábado e o secretário marca reunião às 19h.
 *
 * **É do seu LOGIN, e não desta empresa.** Mesma razão da agenda: o expediente
 * é de um corpo, e o corpo não trabalha num horário na Simonetto e noutro na
 * Silvereng. A frase está na tela porque quem tem quatro espaços vai perguntar.
 *
 * **E ele se conta falando, antes de se editar aqui.** O caminho principal é
 * dizer ao secretário "trabalho das 8h30 ao meio-dia e da 13h30 às 17h30", que
 * é como uma pessoa descreve a própria rotina. Esta tela existe para VER o que
 * ficou guardado e corrigir uma linha, que é o que ninguém quer fazer
 * conversando.
 */
export function MeuExpediente() {
  const { expediente, salvarExpediente, toast } = useDados()
  const [aberto, setAberto] = useState(false)
  const [blocos, setBlocos] = useState<Record<string, Faixa[]>>(() => expediente?.blocos || {})
  const [obs, setObs] = useState(expediente?.observacao || '')
  const [indo, setIndo] = useState(false)

  const abrir = () => {
    setBlocos(expediente?.blocos || {})
    setObs(expediente?.observacao || '')
    setAberto(true)
  }

  const trocar = (d: number, qual: number, ponta: 0 | 1, v: string) => {
    setBlocos((atual) => {
      const faixas = [...(atual[String(d)] || [])]
      const f: Faixa = [...(faixas[qual] || ['', ''])] as Faixa
      f[ponta] = v
      faixas[qual] = f
      return { ...atual, [String(d)]: faixas }
    })
  }

  const ligar = (d: number, liga: boolean) => {
    setBlocos((atual) => {
      const copia = { ...atual }
      // Ligar um dia dá a ele o horário mais comum da semana, e não um vazio:
      // quem liga a sexta quase sempre quer a mesma manhã dos outros dias.
      if (liga) copia[String(d)] = [...(Object.values(atual)[0] || [['08:00', '12:00']])] as Faixa[]
      else delete copia[String(d)]
      return copia
    })
  }

  const guardar = async () => {
    setIndo(true)
    const deu = await salvarExpediente({
      blocos: valida(blocos),
      fuso: expediente?.fuso || 'America/Sao_Paulo',
      observacao: obs,
    })
    setIndo(false)
    if (deu) { toast('Expediente salvo.'); setAberto(false) }
  }

  if (!aberto) {
    return (
      <div className="fld">
        <label>Seu expediente</label>
        <p className="hint" style={{ margin: '4px 0 10px' }}>
          {temExpediente(expediente)
            ? <>{escrito(expediente)}. <b>{horasPorSemana(expediente)}h por semana.</b></>
            : 'Você ainda não disse em que horas trabalha, então o app não mexe em prazo nenhum.'}
        </p>
        {!!expediente?.observacao && (
          <p className="hint" style={{ margin: '0 0 10px' }}>E mais: {expediente.observacao}</p>
        )}
        <div className="row-inline">
          <button className="btn" onClick={abrir}>
            <Ic.agenda />{temExpediente(expediente) ? 'Mudar' : 'Dizer meu expediente'}
          </button>
        </div>
        {/* A frase existe porque quem tem quatro espaços vai perguntar, e a
            resposta não é óbvia: o expediente é do corpo, não do contrato. */}
        <p className="hint" style={{ marginTop: 10 }}>
          Vale para todos os seus espaços, como a agenda. Dá para contar ao secretário
          falando, e corrigir aqui.
        </p>
      </div>
    )
  }

  return (
    <div className="fld">
      <label>Seu expediente</label>
      <div className="exp-dias">
        {DSEM_LONGO.map((nome, d) => {
          const faixas = blocos[String(d)] || []
          return (
            <div className={`exp-dia ${faixas.length ? 'on' : ''}`} key={d}>
              <label className="chk">
                <input type="checkbox" checked={faixas.length > 0}
                  onChange={(e) => ligar(d, e.target.checked)} />
                {nome}
              </label>
              {faixas.map((f, i) => (
                <span className="exp-faixa" key={i}>
                  <input className="inp" type="time" value={f[0]}
                    onChange={(e) => trocar(d, i, 0, e.target.value)} />
                  <i>às</i>
                  <input className="inp" type="time" value={f[1]}
                    onChange={(e) => trocar(d, i, 1, e.target.value)} />
                  <button className="iconbtn" aria-label="Tirar esta faixa"
                    onClick={() => setBlocos((a) => ({
                      ...a, [String(d)]: (a[String(d)] || []).filter((_, k) => k !== i),
                    }))}><Ic.x /></button>
                </span>
              ))}
              {/* Duas faixas é o normal (manhã e tarde); a terceira existe para
                  quem tem, e o teto de quatro mora na conferência. */}
              {!!faixas.length && faixas.length < 4 && (
                <button className="exp-mais"
                  onClick={() => setBlocos((a) => ({
                    ...a, [String(d)]: [...(a[String(d)] || []), ['13:30', '17:30'] as Faixa],
                  }))}><Ic.plus />Outra faixa</button>
              )}
            </div>
          )
        })}
      </div>

      <label className="exp-l" htmlFor="exp-obs">O que mais o secretário precisa saber</label>
      <textarea className="inp" id="exp-obs" rows={2} value={obs}
        placeholder="Não marco nada na sexta à tarde. Viajo toda terça."
        onChange={(e) => setObs(e.target.value)} />
      <p className="hint">
        Isto ele lê e leva em conta; o app não interpreta. Horário mesmo vai nos campos
        acima.
      </p>

      <div className="row-inline" style={{ justifyContent: 'flex-end', marginTop: 10 }}>
        <button className="btn ghost" onClick={() => setAberto(false)}>Deixa pra lá</button>
        <button className="btn" disabled={indo} onClick={() => void guardar()}>
          {indo ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </div>
  )
}
