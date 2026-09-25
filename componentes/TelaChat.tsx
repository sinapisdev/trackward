'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useDados } from './Dados'
import { useComandos } from './Comandos'
import { useCelular } from './partes'
import { useModais } from './Modais'
import { Carregando } from './Shell'
import { Ic } from './Icones'
import { Av, IconeStatus } from './atomos'
import { curta, hojeIso, isoDe } from '@/lib/datas'
import type { Canal, Mensagem, Sugestao, TipoProposta } from '@/lib/tipos'
import { chama, pedacos } from '@/lib/mencao'
import { progresso, status } from '@/lib/regras'
import { BotaoVoz, Recado } from './Voz'

const ROTULO: Record<TipoProposta, string> = {
  tarefa: 'Tarefa nova',
  prazo: 'Prazo',
  concluir: 'Ficou pronto',
  decisao: 'Decisão',
  trava: 'Travou',
  distribuir: 'Quem faz',
  agente: 'Agente',
  nota: 'Guardar como nota',
  compromisso: 'Marcar na agenda',
}

const hora = (ts: string) =>
  new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

/** O dia da conversa, do jeito que se fala. */
function diaDe(iso: string) {
  const h = hojeIso()
  if (iso === h) return 'Hoje'
  const ontem = new Date(new Date(h + 'T12:00:00').getTime() - 864e5).toISOString().slice(0, 10)
  if (iso === ontem) return 'Ontem'
  return curta(iso)
}

const marca = (c: Canal) =>
  c.tipo === 'fechado' ? <Ic.lock />
    : c.tipo === 'direto' ? <Ic.team />
      : <b className="cerquilha">#</b>

// ------------------------------------------------------------------ lista

function Lista({ atual }: { atual?: string }) {
  const { canais, mensagens, naoLidas, meChamaram, sugestoesDe, todosFluxos, eu, perfilDe,
    nomeDe } = useDados()
  const { abrir } = useModais()
  const celular = useCelular()

  /** A hora da última mensagem de cada canal, numa passada só. */
  const ultima = useMemo(() => {
    const mapa = new Map<string, number>()
    for (const m of mensagens) {
      // Mensagem de nota não é de canal nenhum. Ver componentes/Caderno.tsx.
      if (!m.canal_id) continue
      const q = Date.parse(m.criado_em)
      if (q > (mapa.get(m.canal_id) ?? 0)) mapa.set(m.canal_id, q)
    }
    return mapa
  }, [mensagens])

  /** A última fala de cada canal, para a linha mostrar do que se trata. */
  const previa = useMemo(() => {
    const mapa = new Map<string, Mensagem>()
    for (const m of mensagens) {
      if (!m.canal_id) continue
      const atual = mapa.get(m.canal_id)
      if (!atual || m.criado_em > atual.criado_em) mapa.set(m.canal_id, m)
    }
    return mapa
  }, [mensagens])

  /**
   * No celular, uma lista só, do mais recente para o mais antigo.
   *
   * É a forma do WhatsApp, e não é imitação: no telefone a pergunta é "quem
   * falou comigo agora", e agrupar por tipo obriga a procurar a resposta em
   * três lugares. No computador os grupos ficam, porque ali a lista é uma
   * coluna parada ao lado do trabalho, e serve para navegar, não para alcançar.
   */
  const grupos = useMemo(() => {
    const quando = (id: string) => ultima.get(id) ?? 0
    const ordenar = (lista: Canal[]) => [...lista].sort((a, b) => quando(b.id) - quando(a.id))
    const comum = (c: Canal) => c.tipo !== 'direto'
    if (celular) return [{ rotulo: '', itens: ordenar(canais) }].filter((g) => g.itens.length)
    return [
      { rotulo: 'Canais', itens: ordenar(canais.filter((c) => comum(c) && !c.fluxo_id)) },
      { rotulo: 'Objetivos', itens: ordenar(canais.filter((c) => comum(c) && c.fluxo_id)) },
      { rotulo: 'Conversas', itens: ordenar(canais.filter((c) => c.tipo === 'direto')) },
    ].filter((g) => g.itens.length)
  }, [canais, ultima, celular])

  const nomeDoCanal = (c: Canal) => {
    if (c.tipo !== 'direto') return c.nome
    const outro = c.membros.find((m) => m !== eu.id)
    return outro ? perfilDe(outro).nome : c.nome
  }

  return (
    <aside className="chat-lista">
      <div className="chat-lista-topo">
        <b>Conversa</b>
        <button className="iconbtn" title="Novo canal" aria-label="Novo canal"
          onClick={() => abrir({ tipo: 'canal' })}><Ic.plus /></button>
      </div>

      <div className="chat-rolagem">
        {grupos.map((g) => (
          <div key={g.rotulo}>
            {!!g.rotulo && <div className="chat-grupo">{g.rotulo}</div>}
            {g.itens.map((c) => {
              const novas = naoLidas(c.id)
              const chamadas = meChamaram(c.id)
              const propostas = sugestoesDe(c.id).filter((s) => s.estado === 'aberta').length
              const f = c.fluxo_id ? todosFluxos.find((x) => x.id === c.fluxo_id) : null
              const ult = previa.get(c.id)
              return (
                <Link key={c.id} href={`/chat/${c.id}`}
                  className={`chat-item ${atual === c.id ? 'on' : ''} ${novas ? 'novo' : ''}`}>
                  <span className="mk">{marca(c)}</span>
                  <span className="nm">{nomeDoCanal(c)}</span>
                  {/* A última fala, só no celular: é ela que faz a lista dizer
                      do que se trata em vez de só dizer que existe. */}
                  {celular && (
                    <span className="chat-previa">
                      {ult
                        ? `${ult.autor_id === eu.id ? 'Você' : nomeDe(ult.autor_id)}: ${ult.texto}`
                        : 'Nada dito ainda'}
                    </span>
                  )}
                  {celular && !!ult && <span className="chat-quando">{hora(ult.criado_em)}</span>}
                  {!!propostas && <span className="pastilha" title="Propostas da leitura"><Ic.faisca /></span>}
                  {!!chamadas && <span className="chamada" title="Chamaram você aqui">@</span>}
                  {!!novas && <span className="ct num hot">{novas > 9 ? '9+' : novas}</span>}
                  {f?.concluido && <span className="due">fim</span>}
                </Link>
              )
            })}
          </div>
        ))}
        {!canais.length && (
          <div className="mode" style={{ padding: '10px 12px' }}>
            Nenhum canal ainda. Crie o primeiro no botão acima.
          </div>
        )}

        {/* O que você escreve para si mesmo não fica aqui: fica em Notas, que é
            um caderno com conversa própria, e não um canal com um membro só. */}
        <Link className="chat-despejo" href="/notas">
          <span className="mk"><Ic.edit /></span>
          <span>
            <b>Notas</b>
            <i>o que é seu, e a conversa com a leitura</i>
          </span>
        </Link>
      </div>
    </aside>
  )
}

// -------------------------------------------------------------- sugestões

/**
 * Uma proposta da leitura, esperando um sim.
 *
 * `despejo` muda duas coisas, e as duas são sobre não fazer pergunta boba:
 *
 *   sem escolher projeto  a tarefa cai na sua lista pessoal, que nasce sozinha
 *                         na primeira vez. Perguntar "em qual projeto?" para
 *                         "comprar cabo hdmi" é o tipo de atrito que faz a
 *                         pessoa desistir e voltar para o papel
 *   sem escolher quem     é sua
 */
function CartaoSugestao({ s, despejo = false }: { s: Sugestao; despejo?: boolean }) {
  const { todosFluxos, perfis, eu, aceitarSugestao, recusarSugestao, nomeDe,
    minhaLista, abrirMinhaLista } = useDados()
  const [fluxoId, setFluxoId] = useState(s.dados.fluxo_id || (despejo ? minhaLista?.id || '' : ''))
  const [respId, setRespId] = useState(s.dados.resp_id || (despejo ? eu.id : ''))
  const [prazo, setPrazo] = useState(s.dados.prazo || '')
  const [ocupado, setOcupado] = useState(false)

  const editavel = s.tipo === 'tarefa' && !despejo
  const abertos = todosFluxos.filter((f) => !f.concluido)

  // A linha de resumo e o trecho de origem, no despejo, são a mesma frase: a
  // pessoa escreveu uma coisa só. Repetir os dois é ruído.
  const mostraMotivo = !!s.motivo && s.motivo.trim() !== s.texto.trim()
    && !s.motivo.trim().startsWith(s.texto.replace(/\.\.\.$/, '').trim())

  const aceitar = async () => {
    setOcupado(true)
    if (s.tipo === 'tarefa' && despejo) {
      // A lista pessoal nasce aqui, na primeira tarefa que precisa dela, e não
      // no cadastro: conta nova não deve começar com uma esteira vazia dentro.
      const destino = fluxoId || await abrirMinhaLista()
      await aceitarSugestao(s, { fluxo_id: destino, resp_id: eu.id, prazo: prazo || null })
    } else {
      await aceitarSugestao(s, editavel
        ? { fluxo_id: fluxoId || null, resp_id: respId || null, prazo: prazo || null }
        : undefined)
    }
    setOcupado(false)
  }

  return (
    <div className="sug">
      <div className="sug-h">
        <span className={`sug-tag ${s.tipo}`}>{ROTULO[s.tipo]}</span>
        <span className="sug-txt">{s.texto}</span>
      </div>

      {mostraMotivo && <div className="sug-pq">{s.motivo}</div>}

      {editavel && (
        <div className="sug-campos">
          <label>
            <span>Onde</span>
            <select value={fluxoId} onChange={(e) => setFluxoId(e.target.value)}>
              <option value="">Escolha o projeto</option>
              {abertos.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </label>
          <label>
            <span>Quem</span>
            <select value={respId} onChange={(e) => setRespId(e.target.value)}>
              <option value="">Sem responsável</option>
              {perfis.filter((p) => p.ativo).map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </label>
          <label>
            <span>Até</span>
            <input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
          </label>
        </div>
      )}

      {s.tipo === 'tarefa' && despejo && (
        <div className="sug-campos">
          <label>
            <span>Até</span>
            <input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
          </label>
          <p className="hint">
            Vai para a {minhaLista ? 'sua lista' : 'sua lista, que nasce agora'}, no seu nome.
          </p>
        </div>
      )}

      {s.tipo === 'compromisso' && s.dados.quando && (
        <div className="sug-campos">
          <p className="hint">
            {curta(s.dados.quando)}
            {s.dados.inicio ? ` às ${s.dados.inicio}` : ', sem hora marcada'}, na sua agenda.
          </p>
        </div>
      )}

      {s.tipo === 'prazo' && s.dados.prazo && (
        <div className="sug-campos">
          <label>
            <span>Novo prazo</span>
            <input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
          </label>
        </div>
      )}

      <div className="sug-f">
        <button className="btn ghost" onClick={() => void recusarSugestao(s)}>Dispensar</button>
        <button className="btn pri" disabled={ocupado || (editavel && !fluxoId)} onClick={() => void aceitar()}>
          <Ic.check />
          {s.tipo === 'concluir' ? 'Marcar feita'
            : s.tipo === 'decisao' ? 'Registrar'
              : s.tipo === 'nota' ? 'Guardar'
                : s.tipo === 'compromisso' ? 'Marcar' : 'Aceitar'}
        </button>
      </div>

      {s.estado !== 'aberta' && (
        <div className="sug-pq">
          {s.estado === 'aceita' ? 'Aceita' : 'Dispensada'} por {nomeDe(s.decidido_por)}.
        </div>
      )}
    </div>
  )
}

// ------------------------------------------------------------- composição

function Campo({ canalId, respondendo, fecharResposta }: {
  canalId: string
  respondendo: Mensagem | null
  fecharResposta: () => void
}) {
  const { enviar, perfis, eu, nomeDe } = useDados()
  const [texto, setTexto] = useState('')
  const [mencao, setMencao] = useState<string | null>(null)
  const area = useRef<HTMLTextAreaElement>(null)
  const cmd = useComandos({ canalId })

  /** Escreve no campo e no estado. Ver `inserir`: só um dos dois não basta. */
  const escrever = (v: string) => {
    setTexto(v)
    if (area.current) {
      area.current.value = v
      area.current.selectionStart = area.current.selectionEnd = v.length
      area.current.focus()
    }
  }

  const candidatos = useMemo(() => {
    if (mencao === null) return []
    const t = mencao.toLowerCase()
    return perfis
      .filter((p) => p.ativo && p.id !== eu.id && p.nome.toLowerCase().includes(t))
      .slice(0, 5)
  }, [mencao, perfis, eu.id])

  /** Cresce com o texto, até um teto, como em app de conversa. */
  const ajustar = () => {
    const el = area.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }

  const mudar = (v: string) => {
    setTexto(v)
    const antes = v.slice(0, area.current?.selectionStart ?? v.length)
    const m = antes.match(/@([\p{L}]*)$/u)
    setMencao(m ? m[1] : null)
    cmd.aoDigitar(v)
    requestAnimationFrame(ajustar)
  }

  const inserir = (nome: string) => {
    const primeiro = nome.split(' ')[0]
    const antes = area.current?.value ?? texto
    const depois = antes.replace(/@([\p{L}]*)$/u, `@${primeiro} `)
    setTexto(depois)
    // Escrever direto no campo também: quem continua digitando enquanto o React
    // ainda não pintou a troca acabaria apagando o nome recém escolhido.
    if (area.current) {
      area.current.value = depois
      area.current.selectionStart = area.current.selectionEnd = depois.length
    }
    setMencao(null)
    area.current?.focus()
  }

  // Quem clica em responder espera o cursor já no campo, sem um segundo clique.
  useEffect(() => { if (respondendo) area.current?.focus() }, [respondendo])

  const mandar = async () => {
    const v = texto.trim()
    if (!v) return
    setTexto('')
    setMencao(null)
    if (area.current) area.current.style.height = 'auto'
    // A linha que começa por barra é ordem, não recado: ela vira a coisa feita
    // e não aparece como mensagem. O que aparece é o rastro do que aconteceu.
    if (await cmd.rodar(v)) { fecharResposta(); return }
    await enviar(canalId, v, respondendo?.id ?? null)
    fecharResposta()
  }

  return (
    <div className="chat-campo">
      {respondendo && (
        <div className="chat-resp">
          <Ic.responder />
          <span>
            Respondendo <b>{nomeDe(respondendo.autor_id)}</b>: {respondendo.texto}
          </span>
          <button className="iconbtn" aria-label="Cancelar resposta"
            onClick={fecharResposta}><Ic.x /></button>
        </div>
      )}
      <div className="chat-campo-linha">
      {cmd.menu(escrever)}
      {!!candidatos.length && (
        <div className="mencoes">
          {candidatos.map((p) => (
            <button key={p.id} onClick={() => inserir(p.nome)}>
              <Av p={p} tam="sm" />{p.nome}
            </button>
          ))}
        </div>
      )}
      <textarea
        ref={area}
        value={texto}
        rows={1}
        placeholder="Escreva, ou / para os comandos"
        aria-label="Mensagem"
        onChange={(e) => mudar(e.target.value)}
        onKeyDown={(e) => {
          // O menu de comandos come a tecla primeiro: sem isto, o mesmo Enter
          // que escolhe o comando manda a linha pela metade.
          if (cmd.teclas(e, escrever)) return
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            if (candidatos.length && mencao !== null) inserir(candidatos[0].nome)
            else void mandar()
          }
          if (e.key === 'Escape') {
            if (mencao !== null) setMencao(null)
            else if (respondendo) fecharResposta()
          }
        }}
      />
      <BotaoVoz canalId={canalId} respondeA={respondendo?.id ?? null} aoEnviar={fecharResposta} />
      <button className="btn pri" onClick={() => void mandar()} disabled={!texto.trim()} aria-label="Enviar">
        <Ic.enviar />
      </button>
      </div>
    </div>
  )
}

// -------------------------------------------------------------- conversa

function Conversa({ canal }: { canal: Canal }) {
  const {
    eu, perfis, perfilDe, nomeDe, todosFluxos, areaDe, org,
    mensagensDe, sugestoesDe, marcarLido, lerConversa, apagarMensagem, excluirCanal,
    desfazerSugestao, abrirAudio,
  } = useDados()
  const { abrir } = useModais()
  const router = useRouter()
  const [lendo, setLendo] = useState(false)
  const [verFechadas, setVerFechadas] = useState(false)
  const [respondendo, setRespondendo] = useState<Mensagem | null>(null)
  const rolo = useRef<HTMLDivElement>(null)

  const msgs = useMemo(() => mensagensDe(canal.id), [mensagensDe, canal.id])
  const porId = useMemo(() => new Map(msgs.map((m) => [m.id, m])), [msgs])
  const nomes = useMemo(() => perfis.map((p) => p.nome), [perfis])
  const sugs = useMemo(() => sugestoesDe(canal.id), [sugestoesDe, canal.id])
  const abertas = sugs.filter((s) => s.estado === 'aberta')
  const fechadas = sugs.filter((s) => s.estado !== 'aberta' && !(s.por_ia && s.estado === 'aceita'))
  /**
   * O que a leitura aplicou sozinha e ainda ninguém revisou.
   *
   * Fica em bloco próprio, em cima das propostas: a pessoa precisa ver que a
   * máquina mexeu em algo antes de ver o que ela está propondo. Sem isso, o
   * "aplicar sozinho" seria a IA trabalhando escondida.
   */
  const feitasPelaIa = sugs.filter((s) => s.por_ia && s.estado === 'aceita' && !s.desfeita_em)

  const canalId = canal.id
  useEffect(() => { void marcarLido(canalId) }, [canalId, msgs.length, marcarLido])
  useEffect(() => { setRespondendo(null) }, [canalId])

  /** Leva a tela até a mensagem citada e pisca, para não se perder no meio da conversa. */
  const irPara = (id: string) => {
    const el = rolo.current?.querySelector(`#msg-${CSS.escape(id)}`)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.classList.add('pisca')
    setTimeout(() => el.classList.remove('pisca'), 1400)
  }

  useEffect(() => {
    const el = rolo.current
    if (el) el.scrollTop = el.scrollHeight
  }, [canalId, msgs.length, abertas.length])

  const fluxo = canal.fluxo_id ? todosFluxos.find((f) => f.id === canal.fluxo_id) : null

  const ler = async () => {
    setLendo(true)
    const r = await lerConversa(canal.id)
    setLendo(false)
    if (!r) return
  }

  const nome = canal.tipo === 'direto'
    ? perfilDe(canal.membros.find((m) => m !== eu.id) || null).nome
    : canal.nome

  // Uma linha por autor, como em app de conversa: o cabeçalho só volta quando
  // muda quem fala ou passam alguns minutos.
  const linhas: { m: Mensagem; junto: boolean; dia: string | null }[] = []
  let anterior: Mensagem | null = null
  for (const m of msgs) {
    const dia = isoDe(m.criado_em)
    const diaAntes = anterior ? isoDe(anterior.criado_em) : null
    const junto = !!anterior && !m.sistema && !anterior.sistema
      && anterior.autor_id === m.autor_id && dia === diaAntes
      && Date.parse(m.criado_em) - Date.parse(anterior.criado_em) < 6 * 60000
    linhas.push({ m, junto, dia: dia === diaAntes ? null : dia })
    anterior = m
  }

  return (
    <section className="chat-conversa">
      <header className="chat-topo">
        <Link className="iconbtn so-celular" href="/chat" aria-label="Voltar"><Ic.volta /></Link>
        <span className="mk">{marca(canal)}</span>
        <div className="chat-titulo">
          <b>{nome}</b>
          <span>
            {fluxo
              ? <Link href={`/fluxo/${fluxo.id}`}>{fluxo.nome}</Link>
              : canal.area_id ? areaDe(canal.area_id).nome : canal.descricao || `${canal.membros.length || perfis.length} pessoas`}
          </span>
        </div>
        <div className="chat-acoes">
          {org.ia_ativa && (
            <button className="btn" onClick={() => void ler()} disabled={lendo}>
              <Ic.faisca />
              {lendo ? 'Lendo' : 'Ler a conversa'}
            </button>
          )}
          {canal.criado_por === eu.id && (
            <>
              <button className="iconbtn" title="Editar canal" aria-label="Editar canal"
                onClick={() => abrir({ tipo: 'canal', canal })}><Ic.edit /></button>
              <button className="iconbtn" title="Excluir canal" aria-label="Excluir canal"
                onClick={() => abrir({
                  tipo: 'excluir',
                  titulo: `Excluir ${canal.nome}?`,
                  texto: 'A conversa inteira e as propostas que saíram dela vão junto. Não dá para desfazer.',
                  acao: async () => { await excluirCanal(canal.id); router.push('/chat') },
                })}><Ic.x /></button>
            </>
          )}
        </div>
      </header>

      <div className="chat-rolo" ref={rolo}>
        {!msgs.length && (
          <div className="chat-vazio">
            <h3>
              {canal.tipo === 'direto' ? `Converse com ${nome}` : `Começo de #${canal.nome}`}
            </h3>
            <p>
              {canal.descricao || 'Escreva a primeira mensagem.'}
              {org.ia_ativa && ' Depois, a leitura da conversa transforma o que ficou combinado em tarefa.'}
            </p>
            {/* O comando só existe para quem descobre que ele existe, e a tela
                vazia é o único lugar onde sobra espaço para contar. */}
            <p className="chat-vazio-cmd">
              Escreva <code>/</code> para criar tarefa, objetivo, rotina, nota ou compromisso
              sem sair daqui.
            </p>
          </div>
        )}

        {linhas.map(({ m, junto, dia }) => {
          const citada = m.responde_a ? porId.get(m.responde_a) ?? null : undefined
          return (
          <div key={m.id}>
            {dia && <div className="chat-dia"><span>{diaDe(dia)}</span></div>}
            {m.sistema ? (
              <div className={`chat-sis ${m.por_ia ? 'ia' : ''}`}>
                <Ic.faisca />
                <span>
                  {m.por_ia ? <b>A leitura da conversa</b> : nomeDe(m.autor_id)} {m.texto}
                </span>
                <i>{hora(m.criado_em)}</i>
              </div>
            ) : (
              <div id={`msg-${m.id}`}
                className={`msg ${junto ? 'junto' : ''} ${chama(m.texto, eu.nome) ? 'chamou' : ''}`}>
                <span className="msg-av">
                  {junto ? <i className="msg-hora">{hora(m.criado_em)}</i> : <Av p={perfilDe(m.autor_id)} tam="lg" />}
                </span>
                <div className="msg-corpo">
                  {!junto && (
                    <div className="msg-h">
                      <b>{nomeDe(m.autor_id)}</b>
                      <i>{hora(m.criado_em)}</i>
                    </div>
                  )}
                  {citada !== undefined && (
                    <button className="msg-cit" disabled={!citada}
                      onClick={() => citada && irPara(citada.id)}>
                      <Ic.responder />
                      {citada
                        ? <><b>{nomeDe(citada.autor_id)}</b><span>{citada.texto}</span></>
                        : <span>mensagem apagada</span>}
                    </button>
                  )}
                  {m.audio_caminho && (
                    <Recado caminho={m.audio_caminho} segundos={m.audio_segundos}
                      aoAbrir={() => abrirAudio(m)} />
                  )}
                  {!!m.texto && (
                    <p className={m.transcrito ? 'transcrito' : ''}>
                      {pedacos(m.texto, nomes).map((d, i) => (
                        d.chamada
                          ? <b key={i} className="arroba">{d.texto}</b>
                          : <span key={i}>{d.texto}</span>
                      ))}
                      {m.transcrito && (
                        <i className="marca-transcrito" title="Texto ouvido do áudio pelo navegador, e revisado por quem gravou">
                          transcrito
                        </i>
                      )}
                    </p>
                  )}
                  {m.audio_caminho && !m.texto && (
                    <p className="sem-texto">Recado sem transcrição, a IA não lê este.</p>
                  )}
                </div>
                <span className="msg-acoes">
                  <button aria-label="Responder" title="Responder"
                    onClick={() => setRespondendo(m)}><Ic.responder /></button>
                  {m.autor_id === eu.id && (
                    <button className="del" aria-label="Apagar mensagem" title="Apagar"
                      onClick={() => void apagarMensagem(m)}><Ic.x /></button>
                  )}
                </span>
              </div>
            )}
          </div>
          )
        })}
      </div>

      {!!feitasPelaIa.length && (
        <div className="chat-ia">
          <div className="chat-ia-h">
            <Ic.faisca />
            <b>
              {feitasPelaIa.length === 1
                ? 'A leitura fez uma coisa sozinha'
                : `A leitura fez ${feitasPelaIa.length} coisas sozinhas`}
            </b>
            <span>
              Está ligado o modo de aplicar sozinho, em Ajustes. Se alguma não era isso,
              dá para desfazer aqui.
            </span>
          </div>
          {feitasPelaIa.map((s) => (
            <div className="fez" key={s.id}>
              <span className={`sug-tag ${s.tipo}`}>{ROTULO[s.tipo]}</span>
              <span className="fez-txt">
                <b>{s.texto}</b>
                {!!s.motivo && <small>{s.motivo}</small>}
              </span>
              <button className="btn ghost" onClick={() => void desfazerSugestao(s)}>
                <Ic.devolver />Desfazer
              </button>
            </div>
          ))}
        </div>
      )}

      {(!!abertas.length || !!fechadas.length) && (
        <div className="chat-sugs">
          <div className="chat-sugs-h">
            <Ic.faisca />
            <b>{abertas.length ? `${abertas.length} ${abertas.length === 1 ? 'proposta' : 'propostas'} da conversa` : 'Nada em aberto'}</b>
            {!!fechadas.length && (
              <button className="btn ghost" onClick={() => setVerFechadas((v) => !v)}>
                {verFechadas ? 'Esconder' : `Ver ${fechadas.length} já decidida${fechadas.length === 1 ? '' : 's'}`}
              </button>
            )}
          </div>
          {abertas.map((s) => <CartaoSugestao key={s.id} s={s} />)}
          {verFechadas && fechadas.map((s) => <CartaoSugestao key={s.id} s={s} />)}
        </div>
      )}

      <Campo canalId={canal.id} respondendo={respondendo}
        fecharResposta={() => setRespondendo(null)} />
    </section>
  )
}

// ------------------------------------------------------------------ tela


/**
 * O contexto do canal: de qual track ele é, em que checkpoint ela está e quem
 * participa. É o que evita ler a conversa sem saber do que se trata.
 */
function LadoDoCanal({ canal }: { canal: Canal }) {
  const { fluxos, areas, perfis, perfilDe, nomeDe } = useDados()
  const fluxo = canal.fluxo_id ? fluxos.find((f) => f.id === canal.fluxo_id) : null
  const area = canal.area_id ? areas.find((a) => a.id === canal.area_id) : null
  const gente = (canal.membros.length ? canal.membros.map((m) => perfilDe(m)) : perfis.filter((p) => p.ativo))
  if (!fluxo && !area) return null
  const et = fluxo ? fluxo.etapas[fluxo.atual] : null
  const feitos = et ? et.itens.filter((x) => x.feito).length : 0

  return (
    <aside className="chat-lado">
      <h2 className="track-rot">{fluxo ? 'Nesta track' : 'Nesta área'}</h2>
      <h3 className="chat-lado-nome">{fluxo ? fluxo.nome : area!.nome}</h3>

      {fluxo && et && (
        <>
          <div className="chat-lado-etapa">
            <IconeStatus st={status(fluxo)} p={progresso(fluxo)} />
            <span>
              <b>{et.nome}</b>
              <small>{feitos} de {et.itens.length} {et.itens.length === 1 ? 'tarefa pronta' : 'tarefas prontas'}</small>
            </span>
          </div>
          <h4>Aprovador</h4>
          <p className="chat-lado-quem"><Av p={perfilDe(et.aprovador_id)} tam="sm" />{nomeDe(et.aprovador_id)}</p>
          <Link className="chat-lado-abrir" href={`/fluxo/${fluxo.id}`}>Abrir track <Ic.seta /></Link>
        </>
      )}

      <div className="rail-sep" />
      <h4>Participantes</h4>
      <div className="chat-lado-gente">
        {gente.slice(0, 5).map((p) => <Av key={p.id} p={p} />)}
        {gente.length > 5 && <i className="mais num">+{gente.length - 5}</i>}
      </div>

      {fluxo && et?.criterio && (
        <>
          <h4>Critério de passagem</h4>
          <p className="chat-lado-crit">{et.criterio}</p>
        </>
      )}
    </aside>
  )
}

export function TelaChat({ id }: { id?: string }) {
  const { canais, carregando, pode } = useDados()
  const { abrir } = useModais()
  const router = useRouter()

  /* Espaço pessoal não tem canal, então esta tela não existe lá. Quem chega
     pelo endereço (favorito, link antigo, botão de voltar) volta para a
     inicial em vez de encontrar uma sala que nunca vai ter gente. */
  useEffect(() => {
    if (!carregando && !pode.canais) router.replace('/')
  }, [carregando, pode.canais, router])

  if (carregando) return <Carregando />
  if (!pode.canais) return <Carregando />

  const canal = id ? canais.find((c) => c.id === id) : null

  return (
    <div className="chat" data-aberto={canal ? 'sim' : 'nao'}>
      <Lista atual={canal?.id} />
      {canal ? <><Conversa canal={canal} /><LadoDoCanal canal={canal} /></> : (
        <section className="chat-conversa">
          <div className="chat-vazio">
            <h3>Escolha uma conversa</h3>
            <p>
              Canais reúnem a equipe por assunto, por área e por projeto. O que ficar
              combinado aqui dentro vira tarefa na esteira, sem ninguém precisar copiar nada.
            </p>
            <button className="btn pri" onClick={() => abrir({ tipo: 'canal' })}>
              <Ic.plus />Novo canal
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
