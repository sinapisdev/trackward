'use client'

import { useMemo, useState } from 'react'
import { useDados } from './Dados'
import { Ic } from './Icones'
import { curta, hojeIso } from '@/lib/datas'
import { escrito, temExpediente } from '@/lib/expediente'
import { montar, type Peca } from '@/lib/plano'
import type { Sugestao } from '@/lib/tipos'

/**
 * A semana montada, em vez de uma pilha de cartões.
 *
 * O Organizar devolvia vinte propostas soltas, e encaixar cada uma num dia
 * voltava a ser trabalho de quem clicou justamente para não fazer isso. Pior:
 * aceitas uma a uma, a ORDEM DO CLIQUE decidia quem ficava com os melhores
 * horários, e nenhuma delas voltava atrás quando o dia enchia. Distribuir é uma
 * decisão sobre o CONJUNTO, e um conjunto não se decide um item por vez.
 *
 * **O plano não é guardado.** Ele é calculado das propostas abertas toda vez
 * que a tela abre, por `lib/plano.ts`. Guardá-lo criaria uma terceira verdade
 * entre a proposta e a agenda, que envelheceria sozinha: bastaria marcar uma
 * reunião para o plano da tela passar a mentir sobre um dia que já não existe.
 *
 * **E a saída para o detalhe continua logo abaixo**, nos cartões de sempre. Foi
 * o que o Leo escolheu, e é o certo: o plano resolve o caso comum de um toque,
 * e quem quiser trocar a frase, a espécie ou o dia de uma linha sozinha tem o
 * caminho que já existia, com Ajustar e Dispensar.
 */
export function PlanoDaSemana({ propostas, notaId, decididas = 0 }: {
  propostas: Sugestao[]; notaId?: string; decididas?: number
}) {
  const { expediente, agenda, aceitarSugestao, ajustarOrganizacao, respondendo } = useDados()
  const [pedido, setPedido] = useState('')
  const [resposta, setResposta] = useState('')
  const [fora, setFora] = useState<string[]>([])
  const [indo, setIndo] = useState(false)

  /**
   * O que vai para o plano, e o que não vai.
   *
   * Nota e decisão não ocupam hora: elas são guardadas, não feitas. Ficam de
   * fora do calendário e aparecem embaixo, contadas, porque sumir com elas
   * seria o mesmo defeito que o botão existe para consertar.
   */
  const pecas: Peca[] = useMemo(() => propostas
    .filter((s) => (s.tipo === 'tarefa' || s.tipo === 'compromisso') && !fora.includes(s.id))
    .map((s) => ({
      chave: s.id,
      tipo: s.tipo === 'compromisso' ? 'compromisso' : 'tarefa',
      texto: s.texto,
      // Sem estimativa, 45 minutos: é o tamanho de uma coisa de escritório
      // qualquer, e chutar para mais é o lado certo de errar. Zero faria a
      // tarefa não ocupar nada e o dia aceitar infinitas.
      minutos: s.dados.minutos || (s.dados.repete?.minutos ?? 45),
      quando: s.dados.quando ?? null,
      inicio: s.dados.inicio ?? null,
      prazo: s.dados.prazo ?? null,
      repete: s.dados.repete ?? null,
    })), [propostas, fora])

  const guardar = useMemo(
    () => propostas.filter((s) => s.tipo !== 'tarefa' && s.tipo !== 'compromisso'),
    [propostas],
  )

  const plano = useMemo(
    () => montar(pecas, expediente, agenda
      .filter((c) => c.quando >= hojeIso())
      .map((c) => ({ quando: c.quando, inicio: c.inicio, fim: c.fim })), hojeIso()),
    [pecas, expediente, agenda],
  )

  const porDia = useMemo(() => {
    const m = new Map<string, typeof plano.encaixes>()
    for (const e of plano.encaixes) m.set(e.quando, [...(m.get(e.quando) || []), e])
    return [...m.entries()].sort()
  }, [plano])

  /**
   * Some quando não há nada a mostrar NEM nada a pedir.
   *
   * Com a lista vazia o painel continua, porque é justamente aí que a pessoa
   * mais precisa do campo de ajuste: "organizou e não achou nada" e "faltou
   * isto" são a mesma frase dita de dois lados.
   */
  const campoDeAjuste = (
    <>
      {/**
      * O ajuste conversando, que é o que faltava para Organizar ser prático.
      *
      * Ele devolvia uma lista e acabava ali: faltou uma coisa, e a saída era
      * reescrever a nota e organizar de novo, torcendo. Aqui ela diz o que
      * faltou, e o agente mexe. **Isto é ordem e não pensamento solto**, e é o
      * campo que diz isso: pedir confirmação do que ela acabou de mandar fazer
      * é desconfiar dela, a mesma regra da barra.
      *
      * O pedido viaja com o que JÁ foi separado e com o que JÁ foi decidido,
      * senão ele repropõe o que está na tela e o que ela já dispensou.
      */}
    {!!notaId && (
      <div className="plano-ajuste">
        {!!decididas && (
          <p className="hint">
            Outras {decididas} coisas desta nota você já decidiu em organizações
            anteriores, então elas não voltam aqui.
          </p>
        )}
        {!!resposta && <p className="plano-resp">{resposta}</p>}
        <div className="row-inline">
          <input className="inp" value={pedido} placeholder="Faltou alguma coisa? Diga o que ajustar."
            aria-label="Pedir um ajuste ao agente"
            onChange={(e) => setPedido(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void pedir() }} />
          <button className="btn" disabled={!pedido.trim() || !!respondendo}
            onClick={() => void pedir()}>
            <Ic.faisca />{respondendo ? 'Ajustando...' : 'Pedir'}
          </button>
        </div>
      </div>
    )}
    </>
  )

  if (!propostas.length && !notaId) return null

  if (!propostas.length) {
    return (
      <section className="plano">
        <div className="plano-h"><Ic.agenda /><b>Nada em aberto</b></div>
        {campoDeAjuste}
      </section>
    )
  }

  if (!temExpediente(expediente)) {
    return (
      <section className="plano">
        <div className="plano-h"><Ic.agenda /><b>A semana</b></div>
        <p className="hint" style={{ margin: 0 }}>
          Para montar a semana eu preciso saber em que horas você trabalha. Diga em
          Ajustes, ou conte ao secretário falando. Enquanto isso, as propostas estão
          aqui embaixo e dá para aceitar uma a uma.
        </p>
      </section>
    )
  }

  /**
   * Aceitar a semana inteira, em ordem de calendário.
   *
   * Uma por vez e em sequência, nunca em paralelo: cada aceite escreve a tarefa
   * e a reserva dela, e duas escritas simultâneas na mesma agenda é como dois
   * blocos nascem na mesma hora. Uma que falha não derruba as outras, pelo mesmo
   * motivo do recibo do secretário: dizer que criou o que não criou é pior que
   * as duas coisas.
   */
  const aceitarTudo = async () => {
    setIndo(true)
    // Uma proposta pode render vários dias (a cadência), e aceitar uma vez
    // basta: quem distribui os dias é o aceite, não esta lista.
    const feitas = new Set<string>()
    for (const e of plano.encaixes) {
      if (feitas.has(e.chave)) continue
      feitas.add(e.chave)
      const s = propostas.find((x) => x.id === e.chave)
      if (!s) continue
      await aceitarSugestao(s, e.tipo === 'tarefa'
        // A tarefa leva o dia como PRAZO e a duração como peso. Hora, não:
        // ela ocupa capacidade do dia, e não um horário.
        ? { prazo: e.quando, minutos: e.minutos }
        : { quando: e.quando, inicio: e.inicio })
    }
    for (const s of guardar) await aceitarSugestao(s)
    setIndo(false)
  }

  const pedir = async () => {
    if (!notaId || !pedido.trim()) return
    const r = await ajustarOrganizacao(notaId, pedido)
    setResposta(r || 'Não consegui ajustar agora.')
    setPedido('')
  }

  const horas = (m: number) => (m >= 60 ? `${(m / 60).toFixed(m % 60 ? 1 : 0)}h` : `${m}min`)

  return (
    <section className="plano" data-tut="plano-semana">
      <div className="plano-h">
        <Ic.agenda />
        <b>A semana que eu montei</b>
        <span className="hint">{escrito(expediente)}</span>
        <button className="btn pri" disabled={indo || !plano.encaixes.length}
          onClick={() => void aceitarTudo()}>
          {indo ? 'Marcando...' : 'Aceitar tudo'}
        </button>
      </div>

      {porDia.map(([dia, itens]) => (
        <div className="plano-dia" key={dia}>
          <div className="plano-dia-h">
            <b>{curta(dia)}</b>
            {/* A carga do dia é a reserva que vai para a agenda, e ela conta só
                tarefa: reunião já está lá, e somar as duas faria o dia com três
                reuniões pedir três horas de bloco por cima delas. */}
            {!!plano.carga[dia] && <i>{horas(plano.carga[dia])} de tarefa</i>}
          </div>
          {itens.map((e) => (
            <div className={`plano-l ${e.tipo}`} key={e.chave + (e.inicio || '')}>
              {/* Hora só onde ela existe de verdade. Tarefa e reserva de
                  capacidade tomam saldo do dia, em qualquer horário, e cravar
                  um horário para elas seria o app decidindo a ordem do seu dia. */}
              <span className="plano-hora">{e.inicio || '—'}</span>
              <span className="plano-tx">{e.texto}</span>
              <span className="plano-dur">{horas(e.minutos)}</span>
              {/* Tirar do plano não é dispensar a proposta: ela continua no
                  cartão embaixo. São duas decisões diferentes, e juntá-las
                  faria "não nesta semana" virar "não". */}
              <button className="iconbtn" aria-label="Tirar da semana"
                onClick={() => setFora((f) => [...f, e.chave])}><Ic.x /></button>
            </div>
          ))}
        </div>
      ))}

      {!!plano.sobras.length && (
        <div className="plano-sobra">
          <span className="nt-rot">Não coube</span>
          {plano.sobras.map((s) => (
            <p key={s.chave + s.porque}><b>{s.texto}</b> {s.porque}</p>
          ))}
        </div>
      )}

      {!!fora.length && (
        <button className="plano-voltar" onClick={() => setFora([])}>
          <Ic.seta />Trazer de volta {fora.length} que você tirou
        </button>
      )}

      {campoDeAjuste}

      {!!guardar.length && (
        <p className="hint plano-guardar">
          E {guardar.length} {guardar.length === 1 ? 'coisa' : 'coisas'} para guardar
          no caderno, sem hora marcada. Entram junto no Aceitar tudo.
        </p>
      )}
    </section>
  )
}
