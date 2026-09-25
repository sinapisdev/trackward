'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useDados } from './Dados'
import { Carregando } from './Shell'
import { Ic } from './Icones'
import { destino, porDia, ROTULO } from '@/lib/avisos'
import { curta, hojeIso, isoDe, rel, soma } from '@/lib/datas'
import type { TipoAviso } from '@/lib/tipos'

/**
 * A caixa de avisos inteira.
 *
 * Ela existe porque o sino mostra oito, e oito é o que cabe num menu, não o que
 * a semana produz. Aqui dá para achar aquele aviso de terça que você fechou sem
 * ler, que é a única coisa que uma central de notificação precisa fazer bem.
 *
 * A caixa guarda os últimos oitenta. Mais que isso vira histórico, e histórico
 * já mora na atividade de cada track, com muito mais contexto do que uma linha.
 */
export function TelaAvisos() {
  const { avisos, naoVistos, lerAvisos, apagarAviso, carregando } = useDados()
  const [filtro, setFiltro] = useState<'tudo' | 'novos' | TipoAviso>('tudo')
  /**
   * Quem estava por ler quando a tela abriu.
   *
   * Abrir a caixa marca tudo como lido, igual ao sino: o contador conta o que
   * você ainda não viu, e depois de abrir você viu. Mas o destaque das linhas
   * não pode sumir debaixo do olho de quem está lendo, senão a tela fica sem
   * dizer o que chegou. Por isso quem pinta é esta lista, e não o `lido_em`.
   */
  const [novos, setNovos] = useState<string[] | null>(null)

  useEffect(() => {
    if (carregando || novos !== null) return
    const porLer = avisos.filter((a) => !a.lido_em).map((a) => a.id)
    setNovos(porLer)
    if (porLer.length) void lerAvisos()
  }, [carregando, novos, avisos, lerAvisos])

  if (carregando) return <Carregando />

  const novo = (id: string) => !!novos?.includes(id)
  const quantosNovos = novos?.length ?? naoVistos

  const lista = avisos.filter((a) =>
    filtro === 'tudo' ? true : filtro === 'novos' ? novo(a.id) : a.tipo === filtro)

  const conta = (k: 'tudo' | 'novos' | TipoAviso) =>
    k === 'tudo' ? avisos.length
      : k === 'novos' ? quantosNovos
        : avisos.filter((a) => a.tipo === k).length

  const abas: { id: 'tudo' | 'novos' | TipoAviso; nome: string }[] = [
    { id: 'tudo', nome: 'Tudo' },
    { id: 'novos', nome: 'Desta vez' },
    { id: 'prazo', nome: 'Prazo' },
    { id: 'aprovacao', nome: 'Aprovação' },
    { id: 'tarefa', nome: 'Tarefa' },
    { id: 'citacao', nome: 'Conversa' },
    { id: 'nota', nome: 'Nota' },
    { id: 'mensagem', nome: 'Conversa direta' },
    { id: 'feedback', nome: 'Feedback' },
  ]

  const nomeDoDia = (dia: string) =>
    dia === hojeIso() ? 'Hoje' : dia === soma(hojeIso(), -1) ? 'Ontem' : curta(dia)

  return (
    <>
      <div className="hdr">
        <div>
          <div className="eyebrow">O que aconteceu sem você olhar</div>
          <h1>Avisos</h1>
          <p className="lede">
            {avisos.length
              ? <>{quantosNovos ? <><b>{quantosNovos} desde a última vez</b> de </> : null}{avisos.length}{' '}
                  {avisos.length === 1 ? 'aviso' : 'avisos'}.</>
              : 'Nada ainda. Os avisos aparecem aqui quando algo passa a depender de você.'}
          </p>
        </div>
        <div className="hdr-actions">
          <Link className="btn" href="/ajustes#aj-avisos"><Ic.ajustes />Como quero ser avisado</Link>
        </div>
      </div>

      {!!avisos.length && (
        <div className="filtros" data-tut="avisos-lista">
          <div className="seg" role="group" aria-label="Filtrar avisos">
            {abas.filter((x) => x.id === 'tudo' || x.id === 'novos' || conta(x.id)).map((x) => (
              <button key={x.id} className={filtro === x.id ? 'on' : ''} onClick={() => setFiltro(x.id)}>
                {x.nome}<span className="num">{conta(x.id)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {lista.length ? porDia(lista).map(({ dia, itens }) => (
        <section className="sec" key={dia}>
          <div className="sec-h"><h2>{nomeDoDia(dia)}</h2></div>
          <div className="lista-fina">
            {itens.map((a) => (
              <div className={`av-linha ${novo(a.id) ? 'novo' : ''}`} key={a.id}>
                <span className={`av-pt ${a.urgente ? 'urgente' : ''}`} aria-hidden />
                <Link className="av-txt" href={destino(a)} onClick={() => void lerAvisos([a.id])}>
                  <b>{a.titulo}</b>
                  {!!a.corpo && <small>{a.corpo}</small>}
                </Link>
                <span className="av-tipo">{ROTULO[a.tipo]}</span>
                <span className="av-q">{rel(isoDe(a.criado_em))}</span>
                <span className="av-acoes">
                  {/* Marcar como lido saiu: abrir a caixa já marcou. O que
                      sobra de verdade para fazer com um aviso é tirá-lo da
                      frente. */}
                  <button className="iconbtn" title="Apagar" aria-label={`Apagar ${a.titulo}`}
                    onClick={() => void apagarAviso(a.id)}><Ic.x /></button>
                </span>
              </div>
            ))}
          </div>
        </section>
      )) : (
        <div className="card">
          <div className="onb">
            <h3>{avisos.length ? 'Nada com esse filtro' : 'Sem avisos por enquanto'}</h3>
            <p>
              O TrackWard avisa quando alguém te passa uma tarefa, quando um prazo seu vence,
              quando um checkpoint fica pronto para a sua aprovação, quando a tarefa que te
              travava sai e quando te chamam na conversa. Nada além disso: aviso que não pede
              nada de você é ruído, e ruído faz a pessoa desligar tudo.
            </p>
            <Link className="btn" href="/ajustes#aj-avisos"><Ic.ajustes />Como quero ser avisado</Link>
          </div>
        </div>
      )}
    </>
  )
}
