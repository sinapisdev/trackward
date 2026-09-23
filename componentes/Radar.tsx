'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useDados } from './Dados'
import { Ic } from './Icones'
import { Av, IconeStatus } from './atomos'
import { dias, rel } from '@/lib/datas'
import { etapaAtual, progresso, status } from '@/lib/regras'
import type { Fluxo, Item } from '@/lib/tipos'

/**
 * O radar da operação: o que está fora do lugar, em tarefa, não em track.
 *
 * A pergunta que ele responde não é "como vão os projetos", é "o que precisa de
 * mim ou de alguém hoje". Por isso a linha é a tarefa, e a track aparece só
 * como endereço dela.
 */

type Achado = { item?: Item; fluxo: Fluxo; texto: string; onde: string; quando: string; href: string }

function Bloco({ titulo, itens, k, verTudo }: {
  titulo: string; itens: Achado[]; k: 'late' | 'hold' | 'soon'; verTudo: string
}) {
  if (!itens.length) return null
  return (
    <section className="rd-bloco">
      <div className="rd-bh">
        <h3>{titulo} <span className="num">({itens.length})</span></h3>
        <Link href={verTudo}>Ver todas</Link>
      </div>
      {itens.map((a, i) => (
        <Link className="rd-linha" key={i} href={a.href}>
          <span className="rd-ic"><IconeStatus st={k} p={0.6} /></span>
          <span className="rd-txt">
            <b>{a.texto}</b>
            <small>{a.onde}</small>
          </span>
          <span className={`rd-quando ${k === 'late' ? 'late' : k === 'soon' ? 'soon' : ''}`}>{a.quando}</span>
          <span className="rd-chev"><Ic.seta /></span>
        </Link>
      ))}
    </section>
  )
}

export function Radar({ lista }: { lista: Fluxo[] }) {
  const { areaDe, nomeDe } = useDados()

  const { atrasadas, travadas, embreve } = useMemo(() => {
    const atrasadas: Achado[] = []
    const embreve: Achado[] = []
    const travadas: Achado[] = []

    for (const f of lista) {
      if (f.concluido) continue
      const onde = f.area_id ? areaDe(f.area_id).nome : f.nome
      if (status(f) === 'hold') {
        travadas.push({
          fluxo: f, texto: f.travado_motivo || `${f.nome} travada`,
          onde: `${f.nome}${f.dono_id ? ` · ${nomeDe(f.dono_id)}` : ''}`,
          quando: 'Travado', href: `/fluxo/${f.id}`,
        })
      }
      const et = etapaAtual(f)
      if (!et) continue
      for (const x of et.itens) {
        if (x.feito || !x.prazo) continue
        const n = dias(x.prazo)
        const a: Achado = {
          item: x, fluxo: f, texto: x.texto, onde, quando: rel(x.prazo), href: `/fluxo/${f.id}`,
        }
        if (n < 0) atrasadas.push(a)
        else if (n <= 3) embreve.push(a)
      }
    }
    const porPrazo = (a: Achado, b: Achado) => (a.item?.prazo || '').localeCompare(b.item?.prazo || '')
    return {
      atrasadas: atrasadas.sort(porPrazo),
      travadas,
      embreve: embreve.sort(porPrazo),
    }
  }, [lista, areaDe, nomeDe])

  return (
    <div className="radar">
      <div className="rd-topo">
        <h2>Radar da operação</h2>
        <Link className="iconbtn" href="/tracks" title="Ver todas as tracks" aria-label="Ver todas as tracks">
          <Ic.mais />
        </Link>
      </div>

      <div className="rd-contas">
        <Link href="/tracks?f=late">
          <span className="rd-n"><IconeStatus st="late" /><b className="num">{atrasadas.length}</b></span>
          <small>Atrasadas</small>
        </Link>
        <Link href="/tracks?f=hold">
          <span className="rd-n"><Ic.trava /><b className="num">{travadas.length}</b></span>
          <small>{travadas.length === 1 ? 'Travada' : 'Travadas'}</small>
        </Link>
        <Link href="/tracks?f=soon">
          <span className="rd-n"><span className="am"><Ic.espera /></span><b className="num">{embreve.length}</b></span>
          <small>Vencem em breve</small>
        </Link>
      </div>

      <Bloco titulo="Atrasadas" itens={atrasadas.slice(0, 3)} k="late" verTudo="/minhas" />
      <Bloco titulo={travadas.length === 1 ? 'Travada' : 'Travadas'} itens={travadas.slice(0, 2)} k="hold" verTudo="/tracks" />
      <Bloco titulo="Vencem em breve" itens={embreve.slice(0, 3)} k="soon" verTudo="/minhas" />

      {!atrasadas.length && !travadas.length && !embreve.length && (
        <p className="rd-vazio">Nada fora do lugar. A operação está em dia.</p>
      )}

      <Link className="rd-tudo" href="/tracks">Ver todas as tracks <Ic.seta /></Link>
    </div>
  )
}

/**
 * A tabela de tracks do sistema: a linha nomeia, as colunas explicam, e a
 * situação vem sempre com palavra ao lado do sinal.
 */
export function TabelaTracks({ lista, vazio = 'Nada por aqui.' }: { lista: Fluxo[]; vazio?: string }) {
  const { perfilDe, nomeDe } = useDados()
  if (!lista.length) return <div className="tb-vazio">{vazio}</div>
  return (
    <div className="tb">
      <div className="tb-cab">
        <span>Track</span>
        <span>Checkpoint atual</span>
        <span>Responsável</span>
        <span>Situação</span>
        <span>Progresso</span>
        <span />
      </div>
      {lista.map((f) => {
        const st = status(f)
        const pct = Math.round(progresso(f) * 100)
        return (
          <Link className="tb-linha" key={f.id} href={`/fluxo/${f.id}`}>
            <span className="tb-nm">{f.nome}</span>
            <span className="tb-sub">{f.concluido ? 'Concluído' : etapaAtual(f)?.nome || 'Sem checkpoint'}</span>
            <span className="tb-quem"><Av p={perfilDe(f.dono_id)} tam="sm" />{nomeDe(f.dono_id)}</span>
            <span className={`tb-sit ${st}`}><IconeStatus st={st} p={progresso(f)} />{
              st === 'late' ? 'Atrasado' : st === 'hold' ? 'Travado' : st === 'soon' ? 'Vence em breve'
                : st === 'done' ? 'Concluído' : 'Em dia'
            }</span>
            <span className="tb-pct">
              <b className="num">{pct}%</b>
              <span className="tb-barra"><i style={{ width: `${pct}%` }} /></span>
            </span>
            <span className="tb-chev"><Ic.mais /></span>
          </Link>
        )
      })}
    </div>
  )
}
