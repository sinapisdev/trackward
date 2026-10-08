'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
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
import { mandaNoProcesso } from '@/lib/acesso'
import { BotaoVoz, Recado } from './Voz'
import { AnexosDaMensagem } from './Anexos'

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
  trilha: 'Virar track',
  checkpoint: 'Ajuste na trilha',
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
  const { canais, fluxos, mensagens, naoLidas, meChamaram, sugestoesDe, todosFluxos, eu, perfilDe,
    nomeDe } = useDados()
  const { abrir } = useModais()
  const celular = useCelular()
  const caminho = usePathname()

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
    const temTrack = (c: Canal) => !!c.fluxo_id && fluxos.some((f) => f.id === c.fluxo_id)
    if (celular) return [{ rotulo: '', itens: ordenar(canais) }].filter((g) => g.itens.length)
    return [
      /* A track escondida de um canal não o torna um objetivo. Ver o mesmo
         cuidado em Canais.tsx: `fluxos` já não traz as implícitas, então ter
         track de verdade é estar nela. */
      { rotulo: 'Canais', itens: ordenar(canais.filter((c) => comum(c) && !temTrack(c))) },
      { rotulo: 'Objetivos', itens: ordenar(canais.filter((c) => comum(c) && temTrack(c))) },
      { rotulo: 'Conversas', itens: ordenar(canais.filter((c) => c.tipo === 'direto')) },
    ].filter((g) => g.itens.length)
  }, [canais, fluxos, ultima, celular])

  const nomeDoCanal = (c: Canal) => {
    if (c.tipo !== 'direto') return c.nome
    const outro = c.membros.find((m) => m !== eu.id)
    return outro ? perfilDe(outro).nome : c.nome
  }

  return (
    <aside className="chat-lista" data-tut="chat-lista">
      <div className="chat-lista-topo">
        <b>Conversa</b>
        <button className="iconbtn" title="Novo canal" aria-label="Novo canal"
          onClick={() => abrir({ tipo: 'canal' })}><Ic.plus /></button>
      </div>

      <div className="chat-rolagem">
        {/* O secretário é a primeira linha, e em TODO espaço.
            Ele nasceu no pessoal, onde não há canal, e ficou preso lá por um
            motivo que não era motivo: quem trabalha em equipe também tem a
            ideia no trânsito e o compromisso dito no corredor. Pior, uma
            empresa recém-aberta abre a Conversa sem nenhum canal, ou seja, sem
            ninguém com quem falar, e a primeira tela do app é um vazio com um
            botão de criar canal. Com ele aqui, sempre tem com quem começar.
            Ele continua sendo a conversa solta do caderno DAQUELE espaço, e por
            isso é privado: o que você pede a ele não é assunto da casa. */}
        <Link href="/secretario"
          className={`chat-item secr-linha ${caminho === '/secretario' ? 'on' : ''}`}>
          <span className="mk"><Ic.faisca /></span>
          <span className="nm">Secretário</span>
          {celular && (
            <span className="chat-previa">Peça: ele cria tarefa, marca e monta track</span>
          )}
        </Link>

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
            Nenhum canal ainda. Crie o primeiro no botão acima, ou fale com o secretário
            aqui em cima.
          </div>
        )}

        {/* A linha de Notas saiu daqui. Ela existia para lembrar que o que se
            escreve para si mesmo não é canal, e isso continua verdade, mas quem
            abre esta lista já tem "Notas" a um toque, no seletor em cima no
            celular e na fileira de abas no computador. Dizer a mesma coisa três
            vezes na mesma tela não deixa ninguém mais informado. */}
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
export function CartaoSugestao({ s, despejo = false }: { s: Sugestao; despejo?: boolean }) {
  const { todosFluxos, perfis, eu, aceitarSugestao, recusarSugestao, nomeDe,
    minhaLista, abrirMinhaLista } = useDados()
  const [fluxoId, setFluxoId] = useState(s.dados.fluxo_id || (despejo ? minhaLista?.id || '' : ''))
  const [respId, setRespId] = useState(s.dados.resp_id || (despejo ? eu.id : ''))
  const [prazo, setPrazo] = useState(s.dados.prazo || '')
  const [ocupado, setOcupado] = useState(false)
  const [texto, setTexto] = useState(s.texto)
  const [ajustando, setAjustando] = useState(false)
  const [vira, setVira] = useState<'' | 'tarefa' | 'nota' | 'decisao'>('')
  const [mexeuNoTexto, setMexeu] = useState(false)
  /** O desenho da trilha, quando a proposta é de virar track. */
  const desenho = s.dados.trilha
  const [nomeTrack, setNomeTrack] = useState(desenho?.nome || '')
  const [tipoTrack, setTipoTrack] = useState<'esteira' | 'ciclo'>(desenho?.tipo || 'esteira')
  const [nomesPassos, setNomesPassos] = useState<string[]>(desenho?.passos.map((x) => x.nome) || [])

  /**
   * O ajuste tem dois andares, e o segundo é o que faltava.
   *
   * O primeiro é o TEXTO, que resolve "quase isso": "Conferir os documentos"
   * vira "Conferir a ART do engenheiro" em duas palavras, e quem, quando e onde
   * já estavam certos.
   *
   * O segundo é a ESPÉCIE, que resolve "não é isso". A leitura entendeu "Helo
   * termine o relatório até 25/10" como mudança de prazo de uma tarefa parecida
   * que já existia, e era tarefa nova. Nenhum campo conserta isso, porque o que
   * está errado não é o conteúdo. Sem esta porta, a única saída era dispensar e
   * digitar tudo de novo, e aí a leitura não serviu para nada justamente na vez
   * em que ela entendeu a frase quase toda.
   *
   * Para onde dá para ir: tarefa, nota e decisão, que nascem de texto e mais
   * nada. Virar `prazo`, `concluir` ou `trava` exigiria apontar QUAL tarefa, e
   * isso é escolha de outra tela, não de uma ficha no meio da conversa.
   */
  const VIRAR: { id: 'tarefa' | 'nota' | 'decisao'; rotulo: string }[] = [
    { id: 'tarefa', rotulo: 'Tarefa nova' },
    { id: 'decisao', rotulo: 'Decisão' },
    { id: 'nota', rotulo: 'Nota' },
  ]
  const tipoVivo = vira || s.tipo
  const ehTrilha = s.tipo === 'trilha'
  const ehAjuste = s.tipo === 'checkpoint'
  const ajuste = s.dados.ajuste

  /**
   * Quem desenha a trilha é quem responde pelo processo.
   *
   * A mesma régua de prazo e de critério de saída, e pelo mesmo motivo: a
   * trilha é o contrato de como o trabalho anda, não a opinião de quem passou
   * por ali. O banco recusa também (`virar_track`), e esta checagem existe para
   * a pessoa não descobrir isso só depois de clicar.
   */
  const trackDaTrilha = ehTrilha || ehAjuste
    ? todosFluxos.find((f) => f.id === s.dados.fluxo_id) : null
  const podeDesenhar = !(ehTrilha || ehAjuste)
    || (!!trackDaTrilha && mandaNoProcesso(eu, trackDaTrilha, perfis))

  const editavel = tipoVivo === 'tarefa' && !despejo
  const abertos = todosFluxos.filter((f) => !f.concluido)

  // A linha de resumo e o trecho de origem, no despejo, são a mesma frase: a
  // pessoa escreveu uma coisa só. Repetir os dois é ruído.
  const mostraMotivo = !!s.motivo && s.motivo.trim() !== s.texto.trim()
    && !s.motivo.trim().startsWith(s.texto.replace(/\.\.\.$/, '').trim())

  const aceitar = async () => {
    setOcupado(true)
    // Só viaja o texto que FOI mexido: mandar o original de volta faria toda
    // proposta parecer corrigida na atividade, e aí "corrigida" deixaria de
    // querer dizer alguma coisa.
    const corrigido: { texto?: string; vira?: 'tarefa' | 'nota' | 'decisao' } = {}
    if (texto.trim() && texto.trim() !== s.texto.trim()) corrigido.texto = texto.trim()
    if (vira) corrigido.vira = vira

    if (ehAjuste) {
      // Em 'partir' o texto do cartão É o nome do checkpoint novo, então o
      // ajuste de texto já é o ajuste do nome. Em 'tirar' não há o que digitar.
      await aceitarSugestao(s, corrigido.texto ? { texto: corrigido.texto } : undefined)
    } else if (ehTrilha) {
      await aceitarSugestao(s, {
        trilha: {
          nome: nomeTrack.trim() || desenho?.nome || '',
          tipo: tipoTrack,
          passos: (desenho?.passos || []).map((x, i) => ({
            ...x, nome: (nomesPassos[i] || x.nome).trim() || x.nome,
          })),
        },
      })
    } else if (s.tipo === 'tarefa' && despejo) {
      // A lista pessoal nasce aqui, na primeira tarefa que precisa dela, e não
      // no cadastro: conta nova não deve começar com uma esteira vazia dentro.
      const destino = fluxoId || await abrirMinhaLista()
      await aceitarSugestao(s, { ...corrigido, fluxo_id: destino, resp_id: eu.id, prazo: prazo || null })
    } else {
      await aceitarSugestao(s, editavel
        ? { ...corrigido, fluxo_id: fluxoId || null, resp_id: respId || null, prazo: prazo || null }
        : (corrigido.texto || corrigido.vira ? corrigido : undefined))
    }
    setOcupado(false)
  }

  return (
    <div className="sug">
      <div className="sug-h">
        <span className={`sug-tag ${tipoVivo}`}>{ROTULO[tipoVivo]}</span>
        {ajustando
          ? (
            <textarea className="sug-txt sug-edit" value={texto} autoFocus rows={2}
              aria-label="O que vai ser criado"
              onChange={(e) => { setTexto(e.target.value); setMexeu(true) }} />
          )
          : <span className="sug-txt">{texto}</span>}
      </div>

      {ajustando && !ehTrilha && !ehAjuste && (
        <div className="sug-vira">
          <span className="lbl">Isto é</span>
          <div className="seg">
          {VIRAR.map((v) => (
            <button
              key={v.id}
              className={tipoVivo === v.id ? 'on' : ''}
              onClick={() => {
                setVira(v.id === s.tipo ? '' : v.id)
                /**
                 * Trocando a espécie, o texto que estava ali deixa de servir:
                 * "Prazo alterado para 25/10/2026" não é nome de tarefa. A
                 * frase original está no motivo, e é dela que a pessoa parte.
                 * Só troco o que ela não mexeu: reescrever por cima do que
                 * alguém acabou de digitar é o pior que um campo pode fazer.
                 */
                if (!mexeuNoTexto && s.motivo) {
                  setTexto(s.motivo.replace(/^[^:]{1,24}:\s*/, '').trim())
                }
              }}>
              {v.rotulo}
            </button>
          ))}
          {s.tipo !== 'tarefa' && s.tipo !== 'decisao' && s.tipo !== 'nota' && (
            <button className={!vira ? 'on' : ''} onClick={() => setVira('')}>
              {ROTULO[s.tipo]}
            </button>
          )}
          </div>
        </div>
      )}

      {mostraMotivo && <div className="sug-pq">{s.motivo}</div>}

      {/*
        * A ordem do cartão é o argumento, e não arrumação de tela: primeiro o
        * que já aconteceu com número (que vem no motivo, logo acima), e só
        * então o rascunho. Começar pelo desenho é pedir opinião sobre algo sem
        * dizer de onde ele saiu, e a resposta honesta a isso é "não sei".
        */}
      {/* O ajuste de uma trilha que já existe. Um por track, o mais caro: o
          mesmo defeito costuma disparar as duas regras, e duas propostas sobre
          a mesma trilha é o jeito mais rápido de dispensar as duas sem ler. */}
      {ehAjuste && !!ajuste && (
        <div className="sug-trilha">
          <p className="sug-tr-cab">
            <b>{trackDaTrilha?.nome || 'Esta track'}</b>
            <span>{ajuste.acao === 'tirar' ? 'tirar um checkpoint' : 'partir em dois'}</span>
          </p>
          <ol className="sug-tr-passos">
            {(trackDaTrilha?.etapas || []).map((e, i) => {
              const alvo = e.id === ajuste.etapa_id
              return (
                <li key={e.id} className={alvo ? 'sug-tr-alvo' : ''}>
                  <span className="sug-tr-n">{i + 1}</span>
                  <b style={alvo && ajuste.acao === 'tirar'
                    ? { textDecoration: 'line-through', opacity: .6 } : undefined}>{e.nome}</b>
                  <small>{e.itens.length} tarefa{e.itens.length === 1 ? '' : 's'}</small>
                </li>
              )
            })}
            {ajuste.acao === 'partir' && (
              <li className="sug-tr-alvo">
                <span className="sug-tr-n">+</span>
                {ajustando ? (
                  <input className="inp" value={texto} autoFocus
                    aria-label="Nome do checkpoint novo"
                    onChange={(e) => { setTexto(e.target.value); setMexeu(true) }} />
                ) : <b>{texto || ajuste.nome}</b>}
                <small>{(ajuste.itens || []).length} tarefas</small>
              </li>
            )}
          </ol>
          {!podeDesenhar && (
            <p className="hint">
              Mexer na trilha é de quem responde pelo processo. Fale com quem administra.
            </p>
          )}
        </div>
      )}

      {ehTrilha && !!desenho && (
        <div className="sug-trilha">
          {ajustando ? (
            <>
              <label className="sug-tr-nome">
                <span>Nome da track</span>
                <input className="inp" value={nomeTrack} aria-label="Nome da track"
                  onChange={(e) => setNomeTrack(e.target.value)} />
              </label>
              <div className="seg sug-tr-tipo">
                <button className={tipoTrack === 'esteira' ? 'on' : ''}
                  onClick={() => setTipoTrack('esteira')}>Objetivo</button>
                <button className={tipoTrack === 'ciclo' ? 'on' : ''}
                  onClick={() => setTipoTrack('ciclo')}>Rotina</button>
              </div>
            </>
          ) : (
            <p className="sug-tr-cab">
              <b>{nomeTrack || desenho.nome}</b>
              <span>{tipoTrack === 'ciclo' ? 'rotina' : 'objetivo'}</span>
            </p>
          )}
          <ol className="sug-tr-passos">
            {desenho.passos.map((passo, i) => (
              <li key={i}>
                <span className="sug-tr-n">{i + 1}</span>
                {ajustando ? (
                  <input className="inp" value={nomesPassos[i] ?? passo.nome}
                    aria-label={`Nome do checkpoint ${i + 1}`}
                    onChange={(e) => setNomesPassos((v) => {
                      const novo = [...(v.length ? v : desenho.passos.map((x) => x.nome))]
                      novo[i] = e.target.value
                      return novo
                    })} />
                ) : (
                  <b>{nomesPassos[i] || passo.nome}</b>
                )}
                <small>{passo.itens.length} tarefa{passo.itens.length === 1 ? '' : 's'}</small>
              </li>
            ))}
          </ol>
          {!podeDesenhar && (
            <p className="hint">
              Desenhar a trilha é de quem responde pelo processo. Fale com quem administra.
            </p>
          )}
        </div>
      )}

      {editavel && (
        <div className="sug-campos">
          <label>
            <span>Onde</span>
            <select value={fluxoId} onChange={(e) => setFluxoId(e.target.value)}>
              <option value="">{s.canal_id ? 'Fica neste canal' : 'Escolha o projeto'}</option>
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
        {!ajustando && (
          <button className="btn ghost" onClick={() => setAjustando(true)}>Ajustar</button>
        )}
        {/* Sem track escolhida o aceite continua possível quando a proposta veio
            de um canal: ali o próprio canal vira o lugar (seção 59). Exigir que
            a pessoa escolha um projeto que ela não tem era o muro que a impedia
            de usar o app sem inventar track antes de saber a forma do trabalho. */}
        <button className="btn pri"
          disabled={ocupado || !podeDesenhar || (editavel && !fluxoId && !s.canal_id)}
          onClick={() => void aceitar()}>
          <Ic.check />
          {/* O rótulo segue o tipo VIVO, não o que a leitura propôs: trocando a
              espécie e lendo "Registrar" num cartão que virou tarefa, a pessoa
              não sabe mais o que o botão faz. */}
          {tipoVivo === 'concluir' ? 'Marcar feita'
            : tipoVivo === 'decisao' ? 'Registrar'
              : tipoVivo === 'nota' ? 'Guardar'
                : tipoVivo === 'compromisso' ? 'Marcar'
                  : ehTrilha ? 'Montar a trilha'
                    : ehAjuste ? (ajuste?.acao === 'tirar' ? 'Tirar da trilha' : 'Partir em dois')
                      : 'Aceitar'}
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
  const { enviar, anexar, perfis, eu, nomeDe, canais } = useDados()
  const celular = useCelular()
  const [texto, setTexto] = useState('')
  /** Os arquivos escolhidos, ainda não mandados. */
  const [arquivos, setArquivos] = useState<File[]>([])
  /**
   * Quem pode abrir o que vai junto. Vazio é o caso normal: quem vê o canal vê
   * o arquivo. Com gente dentro, quem está de fora não vê que ele existe.
   */
  const [quemVe, setQuemVe] = useState<string[]>([])
  const [escolhendoQuem, setEscolhendoQuem] = useState(false)
  const entrada = useRef<HTMLInputElement>(null)
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
    // Com arquivo escolhido, a frase deixa de ser obrigatória: mandar um
    // documento sem dizer nada é o que se faz o tempo todo, e exigir legenda
    // seria inventar burocracia para o caso mais comum.
    if (!v && !arquivos.length) return
    const anexando = arquivos
    const lista = quemVe
    setTexto('')
    setArquivos([])
    setQuemVe([])
    setEscolhendoQuem(false)
    setMencao(null)
    if (area.current) area.current.style.height = 'auto'
    // A linha que começa por barra é ordem, não recado: ela vira a coisa feita
    // e não aparece como mensagem. O que aparece é o rastro do que aconteceu.
    if (!anexando.length && await cmd.rodar(v)) { fecharResposta(); return }
    const id = await enviar(canalId, v || anexando.map((f) => f.name).join(', '),
      respondendo?.id ?? null)
    // O anexo vai depois da mensagem porque ele pertence a ela. Sem o id, não
    // há onde pendurar, e mandar o arquivo sem dono o deixaria invisível.
    if (id && anexando.length) {
      await anexar({ id, canal_id: canalId } as unknown as Mensagem, anexando, lista)
    }
    fecharResposta()
  }

  /** Quem pode entrar na lista: a equipe daquele canal, sem mim. */
  const doCanal = canais.find((c) => c.id === canalId)
  const podemVer = perfis.filter((p) => p.ativo && p.id !== eu.id
    && (doCanal?.tipo === 'aberto' || (doCanal?.membros || []).includes(p.id)))

  return (
    <div className="chat-campo" data-tut="chat-campo">
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
      {!!arquivos.length && (
        <div className="chat-anexando">
          <div className="chat-anexando-l">
            <Ic.clipe />
            <span>{arquivos.map((f) => f.name).join(', ')}</span>
            <button className="iconbtn" aria-label="Tirar os arquivos"
              onClick={() => { setArquivos([]); setQuemVe([]); setEscolhendoQuem(false) }}><Ic.x /></button>
          </div>
          {/* A escolha de quem abre vive aqui, colada no arquivo, e não numa
              tela de depois: quem manda já sabe para quem é no instante em que
              escolhe o arquivo, e perguntar depois é perguntar tarde. */}
          <button className="chat-quemve" onClick={() => setEscolhendoQuem((v) => !v)}>
            {quemVe.length
              ? `Só ${quemVe.map((id) => nomeDe(id).split(' ')[0]).join(', ')} e você abrem`
              : 'Todos deste canal abrem'}
          </button>
          {escolhendoQuem && (
            <div className="chat-quemve-lista">
              <p className="hint">
                Escolhendo alguém, quem ficar de fora não vê nem que o arquivo existe.
              </p>
              {podemVer.map((p) => (
                <label key={p.id} className="chk">
                  <input type="checkbox" checked={quemVe.includes(p.id)}
                    onChange={(e) => setQuemVe((v) =>
                      e.target.checked ? [...v, p.id] : v.filter((x) => x !== p.id))} />
                  <Av p={p} tam="sm" />{p.nome}
                </label>
              ))}
              {!!quemVe.length && (
                <button className="btn ghost sm" onClick={() => setQuemVe([])}>
                  Deixar aberto para o canal
                </button>
              )}
            </div>
          )}
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
      {/* O clipe e o microfone moram DENTRO do campo, como em app de mensagem.
          Quatro controles lado a lado não cabem em 360px: a frase de ajuda
          quebrava em duas linhas e a segunda era cortada pela altura do campo.
          Mexer nas palavras seria remendo; o que não cabia era o arranjo. */}
      <div className="chat-entrada">
      <textarea
        ref={area}
        value={texto}
        rows={1}
        /**
         * No telefone a frase inteira não cabe ao lado do clipe e do microfone,
         * nem apertando os dois. O que fica é a BARRA, que é o sinal: quem a
         * digita vê o menu abrir com os exemplos, e é o menu que ensina a
         * linguagem, não esta frase. Ver "A linguagem do chat" no AGENTS.
         */
        placeholder={celular ? 'Escreva, ou /' : 'Escreva, ou / para os comandos'}
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
      <input ref={entrada} type="file" multiple hidden
        onChange={(e) => {
          setArquivos(Array.from(e.target.files || []))
          // Zera para a mesma escolha poder ser feita duas vezes seguidas.
          e.target.value = ''
        }} />
      <span className="chat-dentro">
        <button className="iconbtn" aria-label="Anexar arquivo" title="Anexar arquivo"
          onClick={() => entrada.current?.click()}><Ic.clipe /></button>
        <BotaoVoz canalId={canalId} respondeA={respondendo?.id ?? null} aoEnviar={fecharResposta} />
      </span>
      </div>
      <button className="btn pri" onClick={() => void mandar()}
        disabled={!texto.trim() && !arquivos.length} aria-label="Enviar">
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
    desfazerSugestao, abrirAudio, abrirNotaDoCanal, aceitarSugestao, toast,
  } = useDados()
  const { abrir } = useModais()
  const router = useRouter()
  const params = useSearchParams()
  const [lendo, setLendo] = useState(false)
  const [verFechadas, setVerFechadas] = useState(false)
  const celular = useCelular()
  const aceitouDaUrl = useRef<string | null>(null)

  /**
   * Aceitar vindo da notificação.
   *
   * O botão "Aceitar" do aviso abre `/chat/<canal>?aceitar=<proposta>`. Ele
   * abre o app em vez de aceitar por conta própria de propósito: a regra do que
   * acontece ao aceitar mora num lugar só, e uma segunda cópia dela num
   * endpoint seria a garantia de que um dia as duas discordam.
   *
   * `aceitouDaUrl` é um ref, e não estado: o efeito não pode rodar duas vezes
   * para a mesma proposta, e um estado novo dispararia uma segunda passada
   * antes de a lista recarregar.
   */
  const pedida = params.get('aceitar')
  useEffect(() => {
    if (!pedida || aceitouDaUrl.current === pedida) return
    const s = sugestoesDe(canal.id).find((x) => x.id === pedida)
    // Some o parâmetro de qualquer jeito: recarregar a página não pode tentar
    // aceitar de novo o que já foi aceito ou dispensado por outra pessoa.
    router.replace(`/chat/${canal.id}`)
    if (!s) return
    aceitouDaUrl.current = pedida
    if (s.estado !== 'aberta') { toast('Esta proposta já foi decidida.'); return }
    void aceitarSugestao(s)
  }, [pedida, canal.id, sugestoesDe, aceitarSugestao, router, toast])
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

  /**
   * Abrir a nota de um cartão.
   *
   * O acesso nasce aqui, no clique de quem lê, e não no gesto de quem mandou:
   * quem pôs a nota no canal escolheu a plateia, e quem está na plateia decide
   * se quer acompanhar. O banco confere o canal antes de deixar.
   */
  const abrirNota = async (notaId: string) => {
    if (await abrirNotaDoCanal(notaId)) router.push(`/notas?nota=${notaId}`)
  }

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
  const linhas: { m: Mensagem; junto: boolean; dia: string | null; comEle?: Mensagem[] }[] = []
  let anterior: Mensagem | null = null
  for (const m of msgs) {
    const dia = isoDe(m.criado_em)
    const diaAntes = anterior ? isoDe(anterior.criado_em) : null
    /**
     * Linhas de sistema seguidas viram UMA.
     *
     * O canal precisa registrar o que aconteceu com o trabalho, senão o
     * combinado some num canto que o outro não abre. Mas uma frase por evento
     * transforma a conversa em mural de recibo: quatro linhas de máquina para
     * uma de gente é a conversa deixando de ser conversa.
     *
     * Juntas, elas ocupam uma linha e abrem no toque. O registro continua
     * inteiro e some de vista, que é a troca certa: ninguém abre o app para ler
     * recibo, e quem procurar acha.
     */
    if (m.sistema && anterior?.sistema && dia === diaAntes) {
      const ultima = linhas[linhas.length - 1]
      ultima.comEle = [...(ultima.comEle || []), m]
      anterior = m
      continue
    }
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
        <div className="chat-acoes" data-tut="chat-ler">
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

        {linhas.map(({ m, junto, dia, comEle }) => {
          const citada = m.responde_a ? porId.get(m.responde_a) ?? null : undefined
          return (
          <div key={m.id}>
            {dia && <div className="chat-dia"><span>{diaDe(dia)}</span></div>}
            {m.sistema ? (
              comEle?.length ? (
                <details className="chat-sis-grupo">
                  <summary>
                    <Ic.faisca />
                    <span>{comEle.length + 1} coisas aconteceram aqui</span>
                    <i>{hora(m.criado_em)}</i>
                  </summary>
                  {[m, ...comEle].map((x) => (
                    <div key={x.id} className={`chat-sis ${x.por_ia ? 'ia' : ''}`}>
                      <span>
                        {x.por_ia ? <b>A leitura da conversa</b> : nomeDe(x.autor_id)} {x.texto}
                      </span>
                      <i>{hora(x.criado_em)}</i>
                    </div>
                  ))}
                </details>
              ) : (
                <div className={`chat-sis ${m.por_ia ? 'ia' : ''}`}>
                  <Ic.faisca />
                  <span>
                    {m.por_ia ? <b>A leitura da conversa</b> : nomeDe(m.autor_id)} {m.texto}
                  </span>
                  <i>{hora(m.criado_em)}</i>
                </div>
              )
            ) : (
              <div id={`msg-${m.id}`}
                className={`msg ${junto ? 'junto' : ''} ${chama(m.texto, eu.nome) ? 'chamou' : ''}`
                  + `${m.autor_id === eu.id ? ' minha' : ''}`}>
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
                  <AnexosDaMensagem mensagemId={m.id} />
                  {/* Nota posta no canal: um cartão, e não texto solto. O
                      que está aqui é o título e o começo; o resto está na
                      nota, e abrir é o que dá acesso a ela. Ver a seção 25 do
                      schema e `notaParaCanal`, em Dados. */}
                  {m.nota_ref ? (
                    <button className="msg-nota" onClick={() => void abrirNota(m.nota_ref!)}>
                      <Ic.edit />
                      <span>
                        <b>{m.texto.split('\n')[0]}</b>
                        <i>{m.texto.split('\n').slice(1).join(' ') || 'Sem texto'}</i>
                      </span>
                      <em>Abrir a nota</em>
                    </button>
                  ) : !!m.texto && (
                    /* O balão veste só a FALA. Anexo, recado de voz e cartão de
                       nota ficam fora: eles já têm corpo próprio, e um dentro
                       do outro vira caixa dentro de caixa. */
                    <p className={`msg-bolha ${m.transcrito ? 'transcrito' : ''}`}>
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

      {/*
        * Com nada em aberto, a faixa some NO CELULAR.
        *
        * "Nada em aberto · Ver 5 já decididas" é chrome puro: ela não diz nada
        * que a pessoa precise agora e come 48px de altura na tela onde a altura
        * é o recurso escasso. No computador ela fica, porque lá o espaço não
        * disputa com nada, e o histórico do que foi decidido continua a um
        * clique.
        */}
      {(!!abertas.length || (!!fechadas.length && !celular)) && (
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
    // Sozinho o lugar de escrever é o secretário, que ocupa esta mesma
    // posição na navegação. Mandar para a inicial seria mandar para o caderno,
    // que é lista, quando a pessoa veio para falar.
    if (!carregando && !pode.canais) router.replace('/secretario')
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
            <p>
              E o <b>Secretário</b>, no alto da lista, é com quem você fala sozinho: peça e
              ele cria a tarefa, marca na agenda e monta a track.
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
