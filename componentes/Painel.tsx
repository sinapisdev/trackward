'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useDados } from './Dados'
import { useModais } from './Modais'
import { Carregando } from './Shell'
import { Ic } from './Icones'
import { Av } from './atomos'
import { AgendaCurta, Radar } from './Radar'
import { Conversa } from './ConversaTrack'
import { ListaCanais } from './Canais'
import { Caderno } from './Caderno'
import { classePrazo, useCelular } from './partes'
import { AVULSA } from '@/lib/rotulos'
import { dias, DSEM_LONGO, hoje, isoDe, MES_LONGO, rel } from '@/lib/datas'
import { etapaAtual } from '@/lib/regras'
import type { Fluxo, Item } from '@/lib/tipos'

type Lente = 'equipe' | 'minhas'
type Face = 'conversa' | 'notas'

/** Uma tarefa com o endereço dela, que é o que a linha precisa mostrar. */
type Linha = { item: Item; fluxo: Fluxo; onde: string; avulsa: boolean }

/**
 * A tela principal: o que precisa ser feito, e nada além disso.
 *
 * Ela já foi o arquivo de pastas, e pasta é boa para passear e ruim para
 * trabalhar. Quem abre o app de manhã não pergunta "como vão as frentes",
 * pergunta "o que eu faço agora" e "o que está parado com alguém". As duas
 * respostas estão aqui: a fila de tarefas à esquerda e o radar à direita.
 *
 * As tracks continuam existindo, em Tracks, que é onde se navega por elas. Aqui
 * a track é só o endereço da tarefa.
 *
 * A tarefa avulsa aparece junto das outras, com o rótulo dela. Ela é privada de
 * quem criou, então no corte da equipe ela nem entra: mostrar "uma tarefa que
 * você não pode ler" é pior que não mostrar nada.
 */
export function Painel() {
  const { eu, fluxos, areas, perfis, canais, naoLidas, carregando, areaDe, perfilDe, nomeDe,
    minhaLista, alternarItem } = useDados()
  const { abrir } = useModais()
  const [lente, setLente] = useState<Lente>('minhas')
  const [pessoa, setPessoa] = useState('')
  const [canalAberto, setCanalAberto] = useState<string | null>(null)
  const [face, setFace] = useState<Face>('conversa')
  const celular = useCelular()

  /** Toda tarefa aberta que eu enxergo, com o endereço dela. */
  const tarefas = useMemo<Linha[]>(() => {
    const saida: Linha[] = []
    for (const f of fluxos) {
      if (f.concluido) continue
      const avulsa = f.id === minhaLista?.id
      const etapas = avulsa ? f.etapas : [etapaAtual(f)].filter(Boolean)
      for (const et of etapas as NonNullable<ReturnType<typeof etapaAtual>>[]) {
        for (const i of et.itens) {
          if (i.feito) continue
          saida.push({
            item: i,
            fluxo: f,
            onde: avulsa ? AVULSA : `${f.nome} · ${et.nome}`,
            avulsa,
          })
        }
      }
    }
    return saida
  }, [fluxos, minhaLista])

  /** Prende o canal escolhido assim que ele aparece na tela. Ver o comentário
   *  em `canal`, mais abaixo: sem isto, ler uma mensagem troca o canal. */
  const primeiro = useMemo(() => {
    const abertos = canais.filter((c) => !c.arquivado)
    return [...abertos].sort((a, b) => naoLidas(b.id) - naoLidas(a.id))[0]?.id ?? null
  }, [canais, naoLidas])

  useEffect(() => {
    setCanalAberto((atual) => atual ?? primeiro)
  }, [primeiro])

  const ultima = useMemo(() => {
    const t = fluxos.flatMap((f) => f.log)
    t.sort((x, y) => y.criado_em.localeCompare(x.criado_em))
    return t[0] || null
  }, [fluxos])

  if (carregando) return <Carregando />

  const minhas = tarefas.filter((t) => t.item.resp_id === eu.id)
  const naLente = (lente === 'minhas' ? minhas : tarefas.filter((t) => !t.avulsa))
    .filter((t) => !pessoa || t.item.resp_id === pessoa)

  const blocos = [
    { titulo: 'Vencidas', itens: naLente.filter((t) => t.item.prazo && dias(t.item.prazo) < 0), late: true },
    { titulo: 'Hoje', itens: naLente.filter((t) => t.item.prazo && dias(t.item.prazo) === 0) },
    { titulo: 'Esta semana', itens: naLente.filter((t) => t.item.prazo && dias(t.item.prazo) > 0 && dias(t.item.prazo) <= 7) },
    { titulo: 'Mais adiante', itens: naLente.filter((t) => !t.item.prazo || dias(t.item.prazo) > 7) },
  ].filter((b) => b.itens.length)

  const h = hoje()
  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'
  const ativos = perfis.filter((p) => p.ativo)
  const semNada = !fluxos.length && !areas.length

  /**
   * Qual conversa abre sozinha: a que tem gente falando. Sem nada por ler, a
   * primeira da lista. Abrir sempre a primeira faria a coluna mostrar um canal
   * parado enquanto o assunto do dia acontece em outro.
   *
   * A escolha só vale até alguém olhar. Depois disso ela fica presa, porque
   * "por ler" muda no instante em que você lê: sem prender, responder uma
   * mensagem jogava você para outro canal no meio da frase.
   */
  const abertos = canais.filter((c) => !c.arquivado)
  // O número na aba existe para a pessoa poder ficar nas notas sem medo de
  // perder conversa: sem ele, trocar de face é apostar que ninguém falou.
  const porLer = abertos.reduce((soma, c) => soma + naoLidas(c.id), 0)
  const canal = abertos.find((c) => c.id === canalAberto)
    || [...abertos].sort((a, b) => naoLidas(b.id) - naoLidas(a.id))[0]
    || null

  return (
    <div className="forward">
      <div className="corpo">
        <div className="hdr">
          <div>
            <div className="eyebrow">
              {DSEM_LONGO[h.getDay()]}, {h.getDate()} de {MES_LONGO[h.getMonth()]}
            </div>
            <h1>{saudacao}, {eu.nome.split(' ')[0]}.</h1>
            <p className="lede">
              {minhas.length
                ? <>{minhas.length} {minhas.length === 1 ? 'tarefa com você' : 'tarefas com você'}
                    {tarefas.length - minhas.length > 0
                      && <> · {tarefas.length - minhas.length} com o resto da equipe</>}</>
                : 'Nada com você agora.'}
            </p>
          </div>
          <div className="hdr-actions">
            <button className="btn" onClick={() => abrir({ tipo: 'avulsa' })}>
              <Ic.plus />Tarefa
            </button>
          </div>
        </div>

        {semNada ? (
          <div className="card">
            <div className="onb">
              <h3>Comece por uma track</h3>
              <p>
                Tudo pendura em uma das duas: um <b>objetivo</b>, que tem começo, checkpoints e fim,
                ou uma <b>rotina</b>, que se repete e guarda o histórico de cada volta. As duas podem
                morar numa área ou viver soltas, e a área você cria ali mesmo no formulário.
              </p>
              <div className="row-inline">
                <button className="btn pri" onClick={() => abrir({ tipo: 'fluxo', tipoFluxo: 'esteira' })}>
                  <Ic.plus />Novo objetivo
                </button>
                <button className="btn" onClick={() => abrir({ tipo: 'fluxo', tipoFluxo: 'ciclo' })}>
                  <Ic.ciclo />Nova rotina
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="filtros">
              <div className="seg" role="group" aria-label="De quem">
                <button className={lente === 'minhas' ? 'on' : ''}
                  onClick={() => { setLente('minhas'); setPessoa('') }}>
                  Minhas<span className="num">{minhas.length}</span>
                </button>
                <button className={lente === 'equipe' ? 'on' : ''} onClick={() => setLente('equipe')}>
                  Toda a equipe<span className="num">{tarefas.filter((t) => !t.avulsa).length}</span>
                </button>
              </div>
              {lente === 'equipe' && ativos.length > 1 && (
                <label className="sel-quem">
                  <Ic.team />
                  <select value={pessoa} onChange={(e) => setPessoa(e.target.value)}
                    aria-label="Filtrar por pessoa">
                    <option value="">Todo mundo</option>
                    {ativos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                  <Ic.chev />
                </label>
              )}
              <Link className="sec-ver" href="/tracks">Ver as tracks <Ic.seta /></Link>
            </div>

            {blocos.length ? blocos.map((b) => (
              <section className="sec" key={b.titulo}>
                <div className="sec-h">
                  <h2 className={b.late ? 'atrasado' : ''}>
                    {b.titulo} <span className="sec-ct num">{b.itens.length}</span>
                  </h2>
                </div>
                <div className="lista-fina">
                  {b.itens.map((t) => (
                    <div className="ib" key={t.item.id}>
                      <button className="ck" aria-label={`Concluir ${t.item.texto}`}
                        onClick={() => void alternarItem(t.item)}><Ic.check /></button>
                      <span className="ib-nm">
                        {t.item.priv && !t.avulsa && (
                          <span className="lk" title="Tarefa privada"><Ic.lock /></span>
                        )}
                        <span>{t.item.texto}</span>
                      </span>
                      {t.avulsa
                        ? <span className="ib-onde"><i className="tag-avulsa">{AVULSA}</i></span>
                        : <Link className="ib-onde" href={`/fluxo/${t.fluxo.id}`}>
                            {t.onde}
                            {t.fluxo.area_id && ` · ${areaDe(t.fluxo.area_id).nome}`}
                          </Link>}
                      <span className="ib-fim">
                        {lente === 'equipe' && t.item.resp_id !== eu.id && (
                          <span className="ib-quem">
                            <Av p={perfilDe(t.item.resp_id)} tam="sm" />{nomeDe(t.item.resp_id)}
                          </span>
                        )}
                        <span className={`due ${classePrazo(t.item.prazo)}`}>
                          {t.item.prazo ? rel(t.item.prazo) : 'Sem prazo'}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )) : (
              <div className="tb-vazio">
                {lente === 'minhas'
                  ? 'Nada com você agora. Olhe o radar ao lado para ver o que está parado com a equipe.'
                  : 'Nenhuma tarefa aberta com esse filtro.'}
              </div>
            )}

            {ultima && (
              <div className="atv-recente">
                <span className="rot">Atividade recente</span>
                <Av p={perfilDe(ultima.quem_id)} tam="sm" />
                <span className="txt">
                  <b>{ultima.por_ia ? 'A leitura da conversa' : nomeDe(ultima.quem_id)}</b> {ultima.texto}
                </span>
                <span className="quando">{rel(isoDe(ultima.criado_em))}</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* A conversa é o coração: é onde se combina, e é de lá que sai a tarefa.
          Ela fica no meio, entre o que precisa ser feito e o que está parado,
          porque é o lugar por onde uma coisa vira a outra.

          As notas dividem esta coluna com ela, e não a de canais, porque são
          outra coisa: canal é falar com alguém, nota é pensar. Ficam lado a
          lado por serem as duas superfícies onde se escreve, e é para cá que a
          pessoa volta o dia inteiro.

          No celular esta coluna inteira sai, e não é para "caber": três colunas
          empilhadas viram três telas de rolagem, e a conversa ficava na segunda,
          onde ninguém chega. Lá ela é uma aba da TabBar, a um toque de distância,
          e o que fica aqui é um atalho que diz quanto tem por ler. */}
      {!celular && (
        <section className="forward-conversa">
          <div className="seg fwd-face" role="group" aria-label="O que mostrar aqui">
            <button className={face === 'conversa' ? 'on' : ''} onClick={() => setFace('conversa')}>
              Conversa
              {!!porLer && <span className="num">{porLer > 9 ? '9+' : porLer}</span>}
            </button>
            <button className={face === 'notas' ? 'on' : ''} onClick={() => setFace('notas')}>
              Notas
            </button>
          </div>

          {face === 'notas' ? <Caderno /> : canal ? (
            <>
              <ListaCanais atual={canal.id} aoEscolher={setCanalAberto} />
              <Conversa canal={canal} titulo="Conversa" quantas={8} />
            </>
          ) : (
            <div className="ct">
              <div className="ct-topo"><h2>Conversa</h2></div>
              <p className="ct-vazio">
                Nenhum canal ainda. A conversa é onde o trabalho começa: alguém combina uma
                coisa, e ela vira tarefa sem ninguém copiar nada.
              </p>
              <button className="btn larga" onClick={() => abrir({ tipo: 'canal' })}>
                <Ic.plus />Criar o primeiro canal
              </button>
            </div>
          )}
        </section>
      )}

      <aside className="rail">
        {celular && (
          <div className="fwd-atalhos">
            <Link className="fwd-at" href="/chat">
              <Ic.chat />
              <b>Conversa</b>
              {!!porLer && <i className="num">{porLer > 9 ? '9+' : porLer}</i>}
            </Link>
            <Link className="fwd-at" href="/notas">
              <Ic.faisca />
              <b>Notas</b>
            </Link>
          </div>
        )}
        <Radar lista={fluxos.filter((f) => f.id !== minhaLista?.id)} compacto={celular} />
        <div className="rail-sep" />
        <AgendaCurta />
      </aside>
    </div>
  )
}
