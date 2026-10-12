'use client'

import { useState } from 'react'
import { DSEM } from '@/lib/datas'
import { ATALHOS, QUANTAS, escrito, mesma, type Repeticao } from '@/lib/repetir'

/**
 * Os dois campos que decidem como a tarefa ocupa o seu tempo: quanto ela leva e
 * se ela volta.
 *
 * Eles viviam em um formulário só, e a pessoa que criava pelo botão redondo não
 * tinha nenhum dos dois: a tarefa nascia sem duração (e sem peso no orçamento do
 * dia) e sem como repetir. Em componente porque **são três formulários** (a
 * tarefa da track, a avulsa e a edição), e três cópias viram três
 * comportamentos diferentes no mês seguinte.
 */

/** Os tamanhos que as pessoas de fato dizem. Qualquer outro se digita. */
const DURACOES = [15, 30, 45, 60, 90, 120, 180, 240]

export const escritoDuracao = (m: number) =>
  m >= 60 ? `${(m / 60).toFixed(m % 60 ? 1 : 0).replace('.0', '')}h` : `${m}min`

/**
 * Quanto a tarefa leva.
 *
 * **Era um degrau de 50% e era ruim**: 45min virava 1,1h, depois 1,7h, depois
 * 2,5h, e não havia como cair em "2h". A pessoa sabe o número que ela quer; o
 * que ela não quer é digitar minutos. Então são atalhos nos tamanhos que se
 * dizem em voz alta, mais um campo para o resto.
 *
 * O palpite da leitura continua vindo preenchido, e é esse o desenho: o app
 * afirma, a pessoa corrige se quiser, e a correção ensina (ver `estimativas`).
 */
export function CampoDuracao({ minutos, aoMudar }: {
  minutos: number | null | undefined
  aoMudar: (m: number | null) => void
}) {
  const atual = minutos || null
  const [livre, setLivre] = useState(false)

  return (
    <div className="fld">
      <label>Quanto tempo leva</label>
      <div className="rep-atalhos">
        {DURACOES.map((m) => (
          <button type="button" key={m} className={atual === m ? 'on' : ''}
            onClick={() => { aoMudar(m); setLivre(false) }}>{escritoDuracao(m)}</button>
        ))}
        <button type="button" className={livre || (atual && !DURACOES.includes(atual)) ? 'on' : ''}
          onClick={() => setLivre(true)}>Outro</button>
      </div>
      {(livre || (!!atual && !DURACOES.includes(atual))) && (
        <div className="row-inline dur-livre">
          <input className="inp" type="number" min={10} max={480} step={5} value={atual || ''}
            aria-label="Duração em minutos" autoFocus={livre}
            onChange={(e) => {
              const n = Math.round(Number(e.target.value))
              aoMudar(n >= 10 && n <= 480 ? n : null)
            }} />
          <span className="hint">minutos, de 10 a 480</span>
        </div>
      )}
      <p className="hint">
        É o que dá orçamento ao seu dia: um dia de oito horas com quatro de tarefa tem
        quatro para marcar reunião. Estimativa grosseira serve.
      </p>
    </div>
  )
}

/**
 * Se a tarefa volta, e até quando.
 *
 * Repetição morre de formulário: "a cada [2] [semanas] nos dias [ ][x][ ]" é
 * correto e ninguém preenche. Atalhos, e o ajuste fino é escolher os dias da
 * semana, que é o único que vale a tela. A segunda fileira é outra pergunta
 * (até quando), e por isso ela é uma fileira e não um campo ao lado.
 */
export function CampoRepeticao({ repete, aoMudar }: {
  repete: Repeticao | null
  aoMudar: (r: Repeticao | null) => void
}) {
  return (
    <div className="fld">
      <label>Repetir</label>
      <div className="rep-atalhos">
        <button type="button" className={repete ? '' : 'on'}
          onClick={() => aoMudar(null)}>Não repete</button>
        {ATALHOS.map((a) => (
          <button type="button" key={a.nome} className={mesma(repete, a.volta) ? 'on' : ''}
            onClick={() => aoMudar({ ...a.volta, ...(repete?.vezes ? { vezes: repete.vezes } : {}) })}>
            {a.nome}
          </button>
        ))}
      </div>

      {/* Os dias da semana só com repetição semanal: antes disso são sete
          caixas perguntando sobre uma coisa que ainda não existe. */}
      {repete?.cada === 'semana' && (
        <div className="rep-dias">
          {DSEM.map((d, k) => (
            <button type="button" key={k} className={repete.dias?.includes(k) ? 'on' : ''}
              onClick={() => {
                const atuais = repete.dias || []
                const novos = atuais.includes(k)
                  ? atuais.filter((x) => x !== k)
                  : [...atuais, k].sort((a, b) => a - b)
                aoMudar({ ...repete, dias: novos.length ? novos : undefined })
              }}>{d}</button>
          ))}
        </div>
      )}

      {!!repete && (
        <div className="rep-atalhos rep-quantas">
          {QUANTAS.map((q) => (
            <button type="button" key={q} className={(repete.vezes || 0) === q ? 'on' : ''}
              onClick={() => aoMudar({ ...repete, vezes: q || undefined })}>
              {q ? `${q} vezes` : 'Sempre'}
            </button>
          ))}
        </div>
      )}

      {!!repete && (
        <p className="hint">
          {escrito(repete)}. Concluir não fecha esta tarefa: ela volta com o prazo da
          próxima vez{repete.vezes ? `, e depois da ${repete.vezes}ª ela fecha de vez` : ''}.
          Por isso ela não aparece em Desempenho.
        </p>
      )}
    </div>
  )
}
