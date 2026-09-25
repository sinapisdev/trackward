'use client'

import { useMemo, useState } from 'react'
import { useDados } from '@/componentes/Dados'
import { Carregando } from '@/componentes/Shell'
import { Ic } from '@/componentes/Icones'
import { CADENCIAS, PUBLICOS, comoTexto, montar, type Cadencia, type Publico } from '@/lib/relatorio'
import { curta } from '@/lib/datas'
import { nomeDoMotivo } from '@/lib/desfecho'

/**
 * Relatórios.
 *
 * Três decisões que valem explicar.
 *
 * **Cada relatório responde uma pergunta, não um cargo.** "Relatório do CEO" não
 * quer dizer nada sozinho. Quem executa pergunta "o que eu entreguei e o que
 * está comigo". Quem coordena pergunta "o time está dando conta". Quem responde
 * pelo negócio pergunta "as frentes andaram e o que foi decidido". O cargo só
 * escolhe o padrão; qualquer um pode pedir qualquer um dos três.
 *
 * **O relatório não vê nada além do que a pessoa já vê.** Ele nasce dos mesmos
 * dados da tela, que já vieram filtrados pelo banco. Um relatório que mostrasse
 * mais seria um vazamento com capa de PDF.
 *
 * **O relatório de conversa conta o que a conversa PRODUZIU.** Copiar mensagem
 * por mensagem para um relatório seria transformar bate-papo em vigilância. O que
 * vai aqui é o volume, quem participou, o que virou trabalho e o que foi
 * decidido. Quem quer ler a conversa abre a conversa.
 */

const PERIODOS = [
  { dias: 1, nome: 'Ontem e hoje' },
  { dias: 7, nome: '7 dias' },
  { dias: 15, nome: '15 dias' },
  { dias: 30, nome: '30 dias' },
]

function Secao({ titulo, sobre, vazio, children }: {
  titulo: string
  sobre?: string
  vazio?: boolean
  children: React.ReactNode
}) {
  if (vazio) return null
  return (
    <section className="rel-sec">
      <div className="rel-h">
        <h2>{titulo}</h2>
        {!!sobre && <span>{sobre}</span>}
      </div>
      {children}
    </section>
  )
}

export function TelaRelatorios() {
  const {
    eu, perfis, fluxos, arquivadas, areas, canais, mensagens, sugestoes, org,
    decisoesDe, anexosDe, nomeDe, carregando, salvarPerfil, toast,
    pessoal,
  } = useDados()

  // Sozinho, as três perguntas do relatório viram uma: não existe "como está a
  // minha equipe" nem "como está a empresa" quando a equipe e a empresa são você.
  const padrao: Publico = pessoal
    ? 'pessoa'
    : eu.papel === 'admin' ? 'dono' : eu.papel === 'gestor' ? 'gestor' : 'pessoa'
  const [publico, setPublico] = useState<Publico>(padrao)
  const [janela, setJanela] = useState(7)
  const [cadencia, setCadencia] = useState<Cadencia>('semanal')
  const [copiado, setCopiado] = useState(false)
  const [texto, setTexto] = useState<string | null>(null)

  /**
   * O fim das tracks, contado.
   *
   * Isto é o que o arquivo devolve em troca de nada ser apagado: antes, excluir
   * levava embora justamente a informação mais útil sobre um projeto, que é por
   * que ele parou. Agora a pergunta "o que está nos fazendo perder trabalho"
   * tem resposta, e ela não depende de ninguém lembrar.
   */
  const arquivo = useMemo(() => {
    const concluidas = arquivadas.filter((f) => f.desfecho === 'concluido').length
    const canceladas = arquivadas.filter((f) => f.desfecho === 'cancelado')
    const mapa = new Map<string, { id: string; nome: string; n: number; tracks: string[] }>()
    for (const f of canceladas) {
      const id = f.motivo || 'outro'
      const g = mapa.get(id) || { id, nome: nomeDoMotivo(id), n: 0, tracks: [] }
      g.n += 1
      if (g.tracks.length < 4) g.tracks.push(f.nome)
      mapa.set(id, g)
    }
    return {
      total: arquivadas.length,
      concluidas,
      canceladas: canceladas.length,
      porMotivo: [...mapa.values()].sort((a, b) => b.n - a.n),
    }
  }, [arquivadas])

  const r = useMemo(() => {
    const decisoes = fluxos.flatMap((f) => decisoesDe(f.id))
    return montar({
      publico, janela, eu, perfis, fluxos, areas, canais, mensagens, sugestoes,
      decisoes, anexosDe, nomeDe,
    })
  }, [publico, janela, eu, perfis, fluxos, areas, canais, mensagens, sugestoes, decisoesDe, anexosDe, nomeDe])

  if (carregando) return <Carregando />

  /**
   * Copiar pode falhar: navegador sem permissão, aba sem foco, http sem https.
   * Falhar em silêncio é pior do que não ter o botão, então o texto aparece
   * numa caixa selecionável de qualquer jeito. Aí sempre dá para copiar à mão.
   */
  const copiar = async () => {
    const t = comoTexto(r, org.nome, eu.nome)
    setTexto(t)
    try {
      await navigator.clipboard.writeText(t)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2200)
    } catch {
      toast('Seu navegador não deixou copiar. O texto está aqui embaixo para pegar à mão.', true)
    }
  }

  return (
    <>
      <div className="hdr nao-imprime">
        <div>
          <h1>Relatórios</h1>
          <p className="lede">O período contado, para ler e para mandar.</p>
        </div>
        <div className="hdr-actions">
          <button className="btn" onClick={() => void copiar()}>
            <Ic.copiar />{copiado ? 'Copiado' : 'Copiar como texto'}
          </button>
          <button className="btn" onClick={() => window.print()}>
            <Ic.processo />Imprimir ou salvar em PDF
          </button>
        </div>
      </div>

      <div className="rel-escolhas nao-imprime" data-tut="rel-periodo">
        {!pessoal && (
        <div className="fld">
          <span className="lbl">Qual pergunta este relatório responde</span>
          <div className="tpls">
            {PUBLICOS.map((p) => (
              <button key={p.id} className={`tpl ${publico === p.id ? 'on' : ''}`}
                onClick={() => setPublico(p.id)} title={p.pergunta}>{p.nome}</button>
            ))}
          </div>
          <p className="hint">{PUBLICOS.find((p) => p.id === publico)!.pergunta}</p>
        </div>
        )}
        <div className="fld">
          <span className="lbl">Período</span>
          <div className="tpls">
            {PERIODOS.map((p) => (
              <button key={p.dias} className={`tpl ${janela === p.dias ? 'on' : ''}`}
                onClick={() => setJanela(p.dias)}>{p.nome}</button>
            ))}
          </div>
        </div>
      </div>

      {texto !== null && (
        <div className="rel-texto nao-imprime">
          <div className="rel-texto-h">
            <b>{copiado ? 'Copiado. Também está aqui, se precisar.' : 'O relatório em texto, para copiar'}</b>
            <button className="iconbtn" onClick={() => setTexto(null)} aria-label="Fechar"><Ic.x /></button>
          </div>
          <textarea readOnly value={texto} rows={12}
            onFocus={(e) => e.currentTarget.select()} aria-label="Relatório em texto" />
        </div>
      )}

      <article className="rel">
        <header className="rel-topo">
          <div>
            <span className="rot">{org.nome}</span>
            <h2>{PUBLICOS.find((p) => p.id === publico)!.nome}, para {eu.nome}</h2>
            <p>{curta(r.de)} a {curta(r.ate)} · {r.abertura}</p>
          </div>
        </header>

        <Secao titulo="Números" vazio={!r.numeros.length}>
          <div className="rel-nums">
            {r.numeros.map((n) => (
              <div key={n.rotulo}>
                <b>{n.valor}</b>
                <span>{n.rotulo}</span>
                <small>{n.sobre}</small>
              </div>
            ))}
          </div>
        </Secao>

        {/* O fim das tracks, que é a conta que só existe porque nada é apagado:
            quem cancela escolhe o motivo de uma lista, e lista vira número. Com
            motivo digitado seriam trinta frases para a mesma coisa. */}
        <Secao titulo="Como as tracks terminaram" vazio={!arquivo.total}
          sobre={`${arquivo.total} arquivada${arquivo.total === 1 ? '' : 's'}`}>
          <div className="rel-nums">
            <div>
              <b>{arquivo.concluidas}</b>
              <span>Concluídas</span>
              <small>chegaram ao último checkpoint</small>
            </div>
            <div>
              <b>{arquivo.total ? Math.round((arquivo.concluidas / arquivo.total) * 100) : 0}%</b>
              <span>Taxa de conclusão</span>
              <small>do que terminou, quanto terminou entregue</small>
            </div>
            <div>
              <b>{arquivo.canceladas}</b>
              <span>Canceladas</span>
              <small>pararam antes do fim</small>
            </div>
          </div>
          {arquivo.porMotivo.map((m) => (
            <div className="rel-l" key={m.id}>
              <span className="rel-mk"><Ic.pause /></span>
              <span className="rel-txt">
                <b>{m.nome}</b>
                <small>{m.tracks.join(', ')}</small>
              </span>
              <span className="rel-lado">
                {m.n} {m.n === 1 ? 'track' : 'tracks'}
                {' · '}{Math.round((m.n / Math.max(1, arquivo.canceladas)) * 100)}%
              </span>
            </div>
          ))}
        </Secao>

        <Secao titulo="Entregue no período" vazio={!r.entregou.length}>
          {r.entregou.map((e, k) => (
            <div className="rel-l" key={k}>
              <span className={`rel-mk ${e.noPrazo === false ? 'late' : 'ok'}`}><Ic.check /></span>
              <span className="rel-txt"><b>{e.texto}</b><small>{e.fluxo}</small></span>
              <span className="rel-lado">
                {e.quando}
                {e.noPrazo === false && <i className="late"> fora do prazo</i>}
                {!!e.provas && <i> · {e.provas} prova{e.provas === 1 ? '' : 's'}</i>}
              </span>
            </div>
          ))}
        </Secao>

        <Secao titulo="Esperando o seu aceite" vazio={!r.aprovar.length}
          sobre="checkpoints em que você é quem decide">
          {r.aprovar.map((a, k) => (
            <div className="rel-l" key={k}>
              <span className="rel-mk"><Ic.flag /></span>
              <span className="rel-txt"><b>{a.etapa}</b><small>{a.fluxo}</small></span>
              <span className="rel-lado">
                {a.faltam ? `faltam ${a.faltam}` : 'pronto para decidir'}
              </span>
            </div>
          ))}
        </Secao>

        <Secao titulo="Ainda aberto" vazio={!r.comigo.length}>
          {r.comigo.map((c, k) => (
            <div className="rel-l" key={k}>
              <span className={`rel-mk ${c.atrasada ? 'late' : ''}`}><span className="oco" /></span>
              <span className="rel-txt"><b>{c.texto}</b><small>{c.fluxo}</small></span>
              <span className={`rel-lado ${c.atrasada ? 'late' : ''}`}>
                {c.prazo ? curta(c.prazo) : 'sem prazo'}{c.atrasada && ' · atrasada'}
              </span>
            </div>
          ))}
        </Secao>

        <Secao titulo="O time" vazio={!r.time.length}>
          <table className="rel-tab">
            <thead>
              <tr><th>Pessoa</th><th>Entregou</th><th>Aberto</th><th>Atrasado</th><th>Sobrecarga</th></tr>
            </thead>
            <tbody>
              {r.time.map((t) => (
                <tr key={t.nome}>
                  <td>{t.nome}</td>
                  <td>{t.entregues}</td>
                  <td>{t.abertas}</td>
                  <td className={t.atrasadas ? 'late' : ''}>{t.atrasadas || '·'}</td>
                  <td>{t.sobrecarga}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Secao>

        <Secao titulo="Onde está preso" vazio={!r.presos.length}>
          {r.presos.map((p, k) => (
            <div className="rel-l" key={k}>
              <span className="rel-mk late"><Ic.pause /></span>
              <span className="rel-txt"><b>{p.etapa}</b><small>{p.fluxo}</small></span>
              <span className="rel-lado late">
                {p.dias ? `${p.dias} dia${p.dias === 1 ? '' : 's'}` : 'travado'}
                {p.aguarda && ` · aguarda ${p.aguarda}`}
              </span>
            </div>
          ))}
        </Secao>

        <Secao titulo="Por área" vazio={!r.areas.length}>
          {r.areas.map((a) => (
            <div className="rel-l" key={a.nome}>
              <span className="rel-txt"><b>{a.nome}</b></span>
              <span className="rel-lado">
                {a.entregues} entregue{a.entregues === 1 ? '' : 's'} · {a.rotinas} rotina{a.rotinas === 1 ? '' : 's'}
                {!!a.atrasadas && <i className="late"> · {a.atrasadas} atrasada{a.atrasadas === 1 ? '' : 's'}</i>}
              </span>
            </div>
          ))}
        </Secao>

        <Secao titulo="Conversas" vazio={!r.conversas.length}
          sobre="o que cada canal produziu. Para ler as mensagens, abra a conversa">
          {r.conversas.map((c) => (
            <div className="rel-conv" key={c.canal.id}>
              <div className="rel-conv-h">
                <b>{c.nome}</b>
                <span>
                  {c.mensagens} mensage{c.mensagens === 1 ? 'm' : 'ns'}
                  {!!c.recados && ` · ${c.recados} recado${c.recados === 1 ? '' : 's'} de voz`}
                </span>
              </div>
              {!!c.quem.length && (
                <p className="rel-quem">
                  {c.quem.map((q) => `${q.nome} (${q.n})`).join(', ')}
                </p>
              )}
              {c.virouTrabalho.map((t, k) => (
                <p className="rel-saiu" key={k}>
                  <Ic.seta />
                  {t.texto}
                  {t.porIa && <i className="pela-ia">pela leitura</i>}
                </p>
              ))}
              {c.decisoes.map((d, k) => (
                <p className="rel-decidido" key={k}><Ic.check />{d}</p>
              ))}
            </div>
          ))}
        </Secao>

        <Secao titulo="Decisões de checkpoint" vazio={!r.decisoes.length}>
          {r.decisoes.map((d, k) => (
            <div className="rel-l" key={k}>
              <span className={`rel-selo ${d.tipo === 'Devolvido' ? 'late' : d.tipo === 'Ressalva' ? 'warn' : 'ok'}`}>
                {d.tipo}
              </span>
              <span className="rel-txt">
                <b>{d.etapa}</b>
                <small>{d.fluxo} · {d.quem}{d.nota ? ` · ${d.nota}` : ''}</small>
              </span>
              <span className="rel-lado">{d.quando}</span>
            </div>
          ))}
        </Secao>

        <Secao titulo="O que a leitura fez sozinha" vazio={!r.daIa.length}
          sobre="vai em todo relatório, para ninguém descobrir depois">
          {r.daIa.map((a, k) => (
            <div className="rel-l" key={k}>
              <span className="rel-mk ia"><Ic.faisca /></span>
              <span className="rel-txt"><b>{a.texto}</b></span>
              <span className="rel-lado">{a.quando}</span>
            </div>
          ))}
        </Secao>

        {!r.numeros.length && !r.entregou.length && !r.conversas.length && (
          <p className="rel-vazio">Nada registrado neste período.</p>
        )}
      </article>

      <div className="blk nao-imprime">
        <div className="bh">
          <h2>Receber sozinho</h2>
          <span className="c">vale só para você</span>
        </div>
        <div className="card" style={{ padding: 15 }}>
          <div className="fld">
            <span className="lbl">Quero este relatório</span>
            <div className="tpls">
              {CADENCIAS.map((c) => (
                <button key={c.id} className={`tpl ${cadencia === c.id ? 'on' : ''}`}
                  onClick={() => { setCadencia(c.id); void salvarPerfil(eu.id, {}) }}>{c.nome}</button>
              ))}
            </div>
          </div>
          <p className="hint">
            <b>O envio automático ainda não funciona.</b> Ele precisa de uma tarefa rodando no
            servidor todo dia, e isso só existe depois de publicar o app. A escolha fica
            guardada aqui para valer no dia em que o envio ligar. Até lá, o relatório se
            gera nesta tela, e os botões de copiar e de PDF já servem para mandar.
          </p>
        </div>
      </div>
    </>
  )
}
