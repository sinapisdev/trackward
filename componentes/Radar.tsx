'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useDados } from './Dados'
import { useModais } from './Modais'
import { Ic } from './Icones'
import { Av, IconeStatus } from './atomos'
import { curta, dias, hojeIso, rel } from '@/lib/datas'
import { faixa } from '@/lib/agenda'
import { etapaAtual, progresso, status } from '@/lib/regras'
import type { Compromisso, Fluxo, Item } from '@/lib/tipos'

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

/**
 * A agenda de relance, embaixo do radar.
 *
 * Ela responde uma pergunta só: o que me prende hoje. Não é a tela da Agenda
 * encolhida, é o recorte que muda uma decisão agora: saber que às 15h tem
 * reunião muda o que você pega às 14h.
 *
 * Compromisso fechado continua fechado aqui: quem não pode ler o título recebe
 * "Ocupado", como em todo lugar. Vazar por causa de um resumo seria o pior
 * lugar para vazar, porque ninguém desconfia de um resumo.
 */
export function AgendaCurta() {
  const { agenda, eu, nomeDe } = useDados()
  const { abrir } = useModais()

  const hj = hojeIso()
  const meus = agenda
    .filter((c) => [c.dono_id, ...c.convidados].includes(eu.id))
    .filter((c) => c.quando >= hj)
    .sort((a, b) => a.quando.localeCompare(b.quando) || (a.inicio || '').localeCompare(b.inicio || ''))

  const hoje = meus.filter((c) => c.quando === hj)
  const depois = meus.filter((c) => c.quando > hj).slice(0, 3)

  const Linha = ({ c }: { c: Compromisso }) => (
    <button className="ag-curta-l" onClick={() => c.aberto && abrir({ tipo: 'compromisso', compromisso: c })}>
      <span className="ag-curta-h num">{c.inicio ? c.inicio.slice(0, 5) : 'dia'}</span>
      <span className="ag-curta-t">
        <b>{c.aberto ? c.titulo : 'Ocupado'}</b>
        <small>
          {c.quando === hj ? faixa(c) : `${curta(c.quando)} · ${faixa(c)}`}
          {c.aberto && c.dono_id !== eu.id && ` · ${nomeDe(c.dono_id)}`}
        </small>
      </span>
    </button>
  )

  return (
    <section className="ag-curta">
      <div className="rd-bh">
        <h3>Agenda</h3>
        <Link href="/agenda">Ver tudo</Link>
      </div>

      {hoje.length || depois.length ? (
        <>
          {!!hoje.length && <div className="ag-curta-dia">Hoje</div>}
          {hoje.map((c) => <Linha key={c.id} c={c} />)}
          {!!depois.length && <div className="ag-curta-dia">Em seguida</div>}
          {depois.map((c) => <Linha key={c.id} c={c} />)}
        </>
      ) : (
        <p className="rd-vazio">Nada marcado. O dia é seu.</p>
      )}

      <button className="btn larga" onClick={() => abrir({ tipo: 'compromisso', quando: hj })}>
        <Ic.plus />Compromisso
      </button>
    </section>
  )
}
