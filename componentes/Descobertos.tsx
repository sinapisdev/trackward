'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase/browser'
import { useDados } from './Dados'
import { useModais } from './Modais'
import { Ic } from './Icones'
import {
  candidatoDe, comAsRespostas, idDaPergunta, paraSalvar, perguntasDoProcesso,
  primeiroDesenho, quemAprovouDe, respostaSemLugar,
  type Desenho, type PerguntaDoProcesso,
} from '@/lib/propor'
import type { ProcessoDescoberto } from '@/lib/tipos'

/**
 * A grama pisada, na tela.
 *
 * O pulso descobre que a casa já repete um caminho e guarda o candidato (seção
 * 39 do schema). Esta é a conversa que transforma aquilo num processo, e ela
 * tem uma forma deliberada, de cima para baixo:
 *
 *   1. **o que já aconteceu**, com o número: 11 vezes, 6 dias, 4 sem conferir
 *   2. **o que eu já montei**, afirmado, cada linha com como desfazer
 *   3. **uma pergunta**, a que mais muda o desenho
 *   4. **o rascunho**, visível antes de aceitar
 *
 * A ordem é o argumento. Começar pelo rascunho seria pedir opinião sobre um
 * desenho sem dizer de onde ele saiu, e aí a resposta honesta é "não sei". O
 * número primeiro é o que faz a pessoa reconhecer a casa dela e concluir que o
 * app olhou para ela, e não para um modelo de construtora genérica.
 *
 * **Uma pergunta por vez, e a resposta grava na hora.** Cinco juntas viram
 * formulário, e formulário é abandonado. Gravar na hora é o que permite
 * responder uma hoje e a seguinte na semana que vem sem recomeçar.
 *
 * O que esta tela NÃO faz: aceitar sozinha. O botão é de gente, e recusar
 * também, porque a recusa é o que impede o pulso de propor a mesma coisa toda
 * semana. A IA observa, conclui, propõe e pergunta.
 */

/** Quantas frases da inconstância cabem antes de virar relatório. */
const FRASES = 3

/**
 * O nome sai do vocabulário da casa, em minúsculas, e vira título aqui.
 *
 * `capitalize` do CSS erra: ele põe maiúscula em toda palavra, e "pedido do
 * cliente" vira "Pedido Do Cliente", que não é como ninguém escreve. A primeira
 * letra é suficiente, e o resto é como a casa fala.
 */
const comoTitulo = (x: string) => (x ? x[0].toUpperCase() + x.slice(1) : x)

export function Descobertos() {
  const { eu, perfis, areaDe, nomeDe, pode, pessoal, toast } = useDados()
  const { abrir } = useModais()
  const sb = supabase()

  const [linhas, setLinhas] = useState<ProcessoDescoberto[]>([])
  const [ocupado, setOcupado] = useState('')

  // Quem não responde pela operação não vê isto: o banco recusa as três
  // funções, e botão que sempre falha é pior que botão que não existe.
  const podeDesenhar = eu.papel === 'admin' || eu.papel === 'gestor'

  const buscar = useCallback(async () => {
    const { data } = await sb.from('processos_descobertos').select('*')
      .in('estado', ['pronto', 'proposto'])
      .order('vezes', { ascending: false })
    setLinhas((data || []) as ProcessoDescoberto[])
  }, [sb])

  useEffect(() => { if (podeDesenhar) void buscar() }, [podeDesenhar, buscar])

  const responder = async (d: ProcessoDescoberto, p: PerguntaDoProcesso, escolha: string) => {
    setOcupado(d.id)
    const { error } = await sb.rpc('responder_descoberta',
      { p_id: d.id, p_chave: idDaPergunta(p), p_escolha: escolha })
    setOcupado('')
    if (error) return toast(error.message, true)
    // De propósito, o acervo entre clientes NÃO aprende daqui. Lá a conta é
    // "de quantas mandadas, quantas voltaram", e pergunta que apareceu numa
    // tela não foi mandada a ninguém: contá-la como mandada estragaria a taxa
    // que decide quais perguntas são podadas.
    await buscar()
  }

  const recusar = (d: ProcessoDescoberto, nome: string) => abrir({
    tipo: 'excluir',
    titulo: 'Isto não é um processo?',
    texto: `Guardo a recusa e não proponho "${nome}" de novo. `
      + 'As tracks e o histórico ficam como estão: nada é apagado.',
    rotulo: 'Não é processo',
    acao: async () => {
      const { error } = await sb.rpc('recusar_descoberta', { p_id: d.id })
      if (error) return toast(error.message, true)
      await buscar()
    },
  })

  const adotar = async (d: ProcessoDescoberto, desenho: Desenho) => {
    setOcupado(d.id)
    const { processo, etapas } = paraSalvar(desenho, d.area_id)
    const { error } = await sb.rpc('adotar_descoberta',
      { p_id: d.id, p_desenho: { ...processo, etapas } })
    setOcupado('')
    if (error) return toast(error.message, true)
    toast(`"${desenho.nome}" virou processo. Dá para ajustar a trilha como qualquer outro.`)
    await buscar()
  }

  if (!podeDesenhar || !linhas.length) return null

  return (
    <section className="dsc" aria-labelledby="dsc-t">
      <div className="dsc-cab">
        <h2 id="dsc-t">
          <Ic.faisca />
          {pessoal ? 'O que você já faz sem ter escrito' : 'O que vocês já fazem sem ter escrito'}
        </h2>
        <p>
          {linhas.length === 1
            ? 'Um caminho se repetiu o bastante para virar processo.'
            : `${linhas.length} caminhos se repetiram o bastante para virar processo.`}
          {' '}Os números são os desta casa.
        </p>
      </div>
      {linhas.map((d) => (
        <Candidato key={d.id} d={d} ocupado={ocupado === d.id}
          perfis={perfis} areaDe={areaDe} nomeDe={nomeDe}
          aprovacao={pode.aprovacao} sozinho={pessoal}
          responder={responder} recusar={recusar} adotar={adotar} />
      ))}
    </section>
  )
}

const CADENCIA: Record<string, string> = {
  rotina: 'Dá voltas',
  sazonal: 'Volta de tempo em tempo',
  pontual: 'Acontece quando aparece',
}

function Candidato({
  d, ocupado, perfis, areaDe, nomeDe, aprovacao, sozinho, responder, recusar, adotar,
}: {
  d: ProcessoDescoberto
  ocupado: boolean
  perfis: { id: string; area_id: string | null }[]
  areaDe: (id: string | null) => { nome: string }
  nomeDe: (id: string | null) => string
  aprovacao: boolean
  sozinho: boolean
  responder: (d: ProcessoDescoberto, p: PerguntaDoProcesso, escolha: string) => void
  recusar: (d: ProcessoDescoberto, nome: string) => void
  adotar: (d: ProcessoDescoberto, desenho: Desenho) => void
}) {
  const conversa = useMemo(() => {
    const c = candidatoDe(d)
    const { afirma, pergunta } = perguntasDoProcesso(
      c, quemAprovouDe(d.execucoes, nomeDe), sozinho)
    // Num espaço pessoal não existe segunda pessoa, então não existe quem
    // aprova: perguntar isso ali é o app esquecendo onde está.
    const cabe = <T extends { chave: string }>(x: T) => aprovacao || x.chave !== 'quem-aprova'
    const todas = pergunta.filter(cabe)
    const base = primeiroDesenho(c)
    const area = (q: string) => perfis.find((x) => x.id === q)?.area_id || null
    const fila = todas.filter((p) => !d.respostas[idDaPergunta(p)])
    // O mapa e a pergunta não podem dizer a mesma coisa uma embaixo da outra.
    // Quando o passo já virou pergunta, a frase sai: a pergunta é a melhor das
    // duas, porque ela carrega o que faltar custou em dias.
    const mapa = d.inconstancia
      .map((f) => (typeof f === 'string' ? { texto: f } : f))
      .filter((f) => !f.alvo || !fila.some((p) => p.alvo === f.alvo))
    return {
      mapa,
      afirma: afirma.filter(cabe),
      // A fila é o que ainda não foi respondido, na ordem do que mais muda o
      // desenho. A respondida sai da fila e reaparece no rascunho, mudada.
      fila,
      respondidas: todas.length - fila.length,
      desenho: comAsRespostas(base, todas, d.respostas, area),
      // Quem foi escolhido para responder pela passagem e não está em área
      // nenhuma. A tela diz, porque senão a resposta não muda nada visível.
      semLugar: respostaSemLugar(todas, d.respostas, area),
    }
  }, [d, perfis, nomeDe, aprovacao, sozinho])

  const nome = comoTitulo(d.nome_sugerido) || 'Processo sem nome'
  const agora = conversa.fila[0]

  return (
    <article className="dsc-c">
      <header className="dsc-h">
        <div className="dsc-nm">
          <b>{nome}</b>
          <span className="dsc-p">{CADENCIA[d.cadencia]}</span>
          {d.area_id && <span className="dsc-p">{areaDe(d.area_id).nome}</span>}
        </div>
        <span className="dsc-vz">
          <b>{d.vezes}</b> vezes nos últimos seis meses
        </span>
      </header>

      {!!conversa.mapa.length && (
        <ul className="dsc-map">
          {conversa.mapa.slice(0, FRASES).map((f, i) => (
            <li key={i}><Ic.grafico />{f.texto}</li>
          ))}
        </ul>
      )}

      {!!conversa.afirma.length && (
        <div className="dsc-af">
          <i>O que eu montei com isso</i>
          <ul>
            {conversa.afirma.map((a, i) => (
              <li key={i}><Ic.check n={11} /><span>{a.texto} <em>{a.mudar}</em></span></li>
            ))}
          </ul>
        </div>
      )}

      {agora ? (
        <div className="dsc-q">
          <p>{agora.texto}</p>
          <div className="dsc-op">
            {agora.opcoes.map((o) => (
              <button key={o.chave} className="btn sm" disabled={ocupado}
                onClick={() => responder(d, agora, o.chave)}>{o.rotulo}</button>
            ))}
          </div>
          {conversa.fila.length > 1 && (
            <span className="dsc-resta">
              Depois desta faltam {conversa.fila.length - 1}. Uma por vez, e a resposta fica gravada.
            </span>
          )}
        </div>
      ) : (
        <p className="dsc-q dsc-pronto">
          <Ic.check n={12} />
          {conversa.respondidas
            ? 'Respondido. O rascunho abaixo já está com as suas respostas.'
            : 'Não tenho mais nada a perguntar sobre isto.'}
        </p>
      )}

      <div className="dsc-des">
        <i>O rascunho</i>
        <ol>
          {conversa.desenho.checkpoints.map((c, i) => (
            <li key={i}>
              <span className="dsc-n">{i + 1}</span>
              <span className="dsc-cp">
                <b>{c.nome}</b>
                <em>
                  {c.tarefa ? c.tarefa : 'sem tarefa'}
                  {c.dias ? ` · dia ${c.dias}` : ''}
                  {c.area ? ` · ${areaDe(c.area).nome} responde` : ''}
                </em>
              </span>
            </li>
          ))}
        </ol>
        {conversa.semLugar.map((q) => (
          <p key={q} className="dsc-nota">
            <Ic.espera />
            {nomeDe(q)} não está em nenhuma área, e o processo guarda a área, não a
            pessoa: é isso que faz o mesmo trilho servir à obra seguinte, com outro
            time. Ponha {nomeDe(q)} numa área em Equipe e esta passagem passa a ser dela.
          </p>
        ))}
      </div>

      <footer className="dsc-f">
        <button className="btn quiet sm" disabled={ocupado}
          onClick={() => recusar(d, nome)}>Não é um processo</button>
        {/* Sem o acento, e não por modéstia: nesta tela o lima já é do "Usar
            processo", que é a ação que faz uma track nascer. Adotar uma
            descoberta é criar um processo, que aqui do lado já é botão neutro
            ("Novo processo"), e dois lima na mesma tela é defeito. */}
        <button className="btn sm" disabled={ocupado}
          onClick={() => adotar(d, conversa.desenho)}>
          Criar este processo
        </button>
      </footer>
    </article>
  )
}
