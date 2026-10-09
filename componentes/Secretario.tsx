'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useDados } from './Dados'
import { useComandos } from './Comandos'
import { Ic } from './Icones'
import { Av } from './atomos'
import { AnexosDaMensagem } from './Anexos'
import { MenuTarefa } from './MenuTarefa'
import { MandarContato } from './MandarContato'
import { BotaoVoz, Recado } from './Voz'
import { CartaoSugestao } from './TelaChat'
import { Carregando } from './Shell'
import { useCelular } from './partes'
import { LIGACAO } from '@/lib/notas'

/** A hora curta da fala, no mesmo formato do chat. */
const hora = (ts: string) =>
  new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

/**
 * O secretário: a conversa onde cabe tudo, e que se organiza sozinha.
 *
 * Quem trabalha sozinho não tem com quem combinar nada, e por isso o espaço
 * pessoal não tem canal. Mas a pessoa continua tendo o que todo mundo tem: a
 * ideia no meio do trânsito, o compromisso que alguém falou no corredor, o
 * documento que chegou e que ela não sabe onde guardar. Hoje isso vai para o
 * bloco de notas do telefone e morre lá, porque bloco de notas guarda e não
 * organiza.
 *
 * Aqui ela escreve como escreveria para outra pessoa, e **a leitura separa**: o
 * que é tarefa vira proposta de tarefa, o que tem dia vira proposta de
 * compromisso, o que é ideia vira nota. Nada acontece sozinho; tudo é proposta
 * esperando um toque, como no resto do app.
 *
 * **Por que é a mesma tela do chat, e não uma tela nova.** No espaço
 * empresarial a aba Conversa é onde o dia acontece, e quem troca de espaço
 * precisa encontrar a mesma tela com outro conteúdo, senão o hábito não
 * atravessa e o app não se usa. Então o secretário ocupa a posição da Conversa,
 * com o mesmo desenho: balão, clipe, microfone e os cartões de proposta.
 *
 * **Por dentro ele não é um canal**, é a conversa solta do caderno
 * (`notas.conversa`, uma por pessoa). Ser uma nota, e não uma tabela nova, é o
 * que faz o que for dito aqui entrar no acervo pela mesma porta do resto: a
 * busca acha, a leitura lembra, e o anexo pendura.
 */
export function Secretario() {
  const {
    eu, org, carregando, conversaIA, abrirConversaIA, mensagensDaNota, sugestoesDaNota,
    escreverNaNota, apagarMensagem, respondendo, lerNota, toast, abrirAudio, pode, saindo,
    passarContato,
  } = useDados()
  const [texto, setTexto] = useState('')
  const [arquivos, setArquivos] = useState<File[]>([])
  const [passandoContato, setPassandoContato] = useState(false)
  const [organizando, setOrganizando] = useState(false)
  /**
   * A faixa de propostas, em tamanho normal ou tomando a coluna.
   *
   * Ela nunca some: esconder o que espera decisão é o jeito de nunca decidir.
   * O que o toque faz é dar a COLUNA INTEIRA a elas, porque nove cartões não
   * cabem numa faixa e não é para caberem. A faixa serve para você reparar que
   * há coisa separada; decidir nove coisas é outra atividade, e ela merece a
   * tela. Fechando, a conversa volta ao que era.
   */
  const [sugsMax, setSugsMax] = useState(false)
  const rolo = useRef<HTMLDivElement>(null)
  const area = useRef<HTMLTextAreaElement>(null)
  const entrada = useRef<HTMLInputElement>(null)
  const celular = useCelular()

  const nota = conversaIA
  const cmd = useComandos({ notaId: nota?.id })

  /**
   * A conversa nasce na primeira vez que a pessoa chega aqui, e não no
   * cadastro: conta nova não deve começar com uma conversa vazia dentro.
   */
  useEffect(() => {
    if (!carregando && !conversaIA) void abrirConversaIA()
  }, [carregando, conversaIA, abrirConversaIA])

  const falas = nota ? mensagensDaNota(nota.id) : []
  const propostas = nota ? sugestoesDaNota(nota.id).filter((s) => s.estado === 'aberta') : []
  const pensando = respondendo === nota?.id

  useEffect(() => {
    const el = rolo.current
    if (el) el.scrollTop = el.scrollHeight
  // `saindo?.texto` entra na conta porque a resposta cresce linha a linha: sem
  // ele, o texto passava do fim da janela e a pessoa lia de costas.
  }, [nota?.id, falas.length, pensando, propostas.length, saindo?.texto])

  if (carregando || !nota) return <Carregando />

  const crescer = () => {
    const el = area.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }

  const mandar = async () => {
    const t = texto.trim()
    if ((!t && !arquivos.length) || pensando) return
    const indo = arquivos
    setTexto('')
    setArquivos([])
    if (area.current) area.current.style.height = 'auto'
    // Comando é ordem e acontece na hora, sem passar pela leitura. Com arquivo
    // junto, ele deixa de ser ordem e vira recado: o arquivo precisa de uma
    // fala onde morar.
    if (!indo.length && await cmd.rodar(t, setTexto)) return
    /* Os arquivos vão JUNTO, e não depois.
       Subindo depois, o modelo era chamado sobre uma mensagem que ainda não
       tinha arquivo nenhum: a pessoa mandava o contrato e perguntava "o que diz
       aqui", e a resposta falava do texto da frase. Mandar o arquivo e a
       pergunta é um gesto só para quem usa, e agora é um gesto só por dentro. */
    await escreverNaNota(nota.id, t, indo)
  }

  const organizar = async () => {
    setOrganizando(true)
    const r = await lerNota(nota.id)
    setOrganizando(false)
    if (r && !r.achou) toast('Nada para separar ainda. Escreva mais um pouco.')
  }

  return (
    <section className={`chat-conversa secr ${sugsMax ? 'sugs-max' : ''}`}>
      <header className="chat-topo">
        {/* No celular a barra de abas some aqui, como dentro de um canal: ela
            come 56px justamente na tela onde a altura é o recurso escasso. Esta
            seta é o que impede isso de prender a pessoa.
            Para onde ela volta é de onde se chegou: numa empresa o secretário é
            a primeira linha da lista de conversas, e no pessoal ele é a própria
            aba, então ali a volta é o caderno, que é a inicial de lá. */}
        <Link className="iconbtn so-celular" href={pode.canais ? '/chat' : '/'}
          aria-label="Voltar"><Ic.volta /></Link>
        <span className="mk"><Ic.faisca /></span>
        <div className="chat-titulo">
          <b>Secretário</b>
          <span>Escreva o que vier, ou peça: ele cria tarefa, marca na agenda, monta track e guarda nota.</span>
        </div>
        <button className="btn" disabled={organizando || !org.ia_ativa}
          onClick={() => void organizar()}>
          <Ic.faisca />{organizando ? 'Separando...' : 'Organizar'}
        </button>
      </header>

      <div className="chat-rolo" ref={rolo}>
        {!falas.length && (
          <div className="chat-vazio">
            <h3>Pode jogar tudo aqui</h3>
            <p>
              A ideia que você teve no trânsito, a reunião que alguém marcou por telefone, o
              documento que chegou e você ainda não sabe onde guarda. Escreva como escreveria
              para uma pessoa, sem arrumar nada. <b>Mande foto e PDF também</b>, pelo clipe: ele
              lê e responde sobre o que está lá dentro.
            </p>
            <p>
              <b>Pedindo, ele faz na hora</b>: &quot;cria uma tarefa para ligar para o contador
              amanhã&quot;, &quot;marca o dentista quinta às 15h&quot;, &quot;monta a track da
              reforma do escritório&quot;, &quot;adia aquela tarefa do contrato para sexta&quot;.
              Para montar uma track ele <b>pergunta primeiro</b>, numa rodada só: qual é o fim,
              para quando, e o que já está pronto. Respondido isso, ele monta a trilha inteira,
              com critério de saída em cada checkpoint e descrição e prazo em cada tarefa.
            </p>
            <p>
              O que você só pensou alto fica como conversa, e em <b>Organizar</b> ele separa o
              que virou tarefa, compromisso e nota para você aceitar. Concluir e apagar
              continuam sendo seus, na tela.
            </p>
          </div>
        )}

        {falas.map((m) => (
          /* O recibo do que foi feito é mensagem de SISTEMA, e não fala dele:
             o que a máquina fez não pode se passar pelo que ela disse, que é a
             mesma regra da marca de leitura dentro da nota. Por isso ele não
             tem balão, não tem avatar e é quieto. */
          m.sistema ? (
            <p key={m.id} className="secr-feito">
              <Ic.check />
              <span>{m.texto.split('\n').map((l, k) => <span key={k}>{l}</span>)}</span>
            </p>
          ) : (
          <div key={m.id} id={`msg-${m.id}`}
            className={`msg ${m.por_ia ? '' : 'minha'}`}>
            <span className="msg-av">
              {m.por_ia ? <span className="secr-av"><Ic.faisca /></span> : <Av p={eu} tam="lg" />}
            </span>
            <div className="msg-corpo">
              <div className="msg-h">
                <b>{m.por_ia ? 'Secretário' : 'Você'}</b>
                <i>{hora(m.criado_em)}</i>
              </div>
              {m.audio_caminho && (
                <Recado caminho={m.audio_caminho} segundos={m.audio_segundos}
                  aoAbrir={() => abrirAudio(m)} />
              )}
              {!!m.texto && (
                <p className="msg-bolha">
                  {m.por_ia ? <ComLigacoes texto={m.texto} /> : m.texto}
                </p>
              )}
              {m.audio_caminho && !m.texto && (
                <p className="sem-texto">Recado sem transcrição, a leitura não ouve este.</p>
              )}
              <AnexosDaMensagem mensagemId={m.id} />
            </div>
            <span className="msg-acoes">
              <button className="del" aria-label="Apagar" title="Apagar"
                onClick={() => void apagarMensagem(m)}><Ic.x /></button>
            </span>
          </div>
          )
        ))}

        {/* A resposta aparece sendo escrita, e não de uma vez no fim.
            Antes era uma frase parada ("Lendo o seu caderno...") por vinte ou
            trinta segundos, e a resposta mais longa que este app pede, que é
            uma trilha com sete checkpoints, era justamente a que mais parecia
            travada. O ponto piscando só vale até a primeira letra chegar. */}
        {pensando && (
          <div className="msg">
            <span className="msg-av"><span className="secr-av"><Ic.faisca /></span></span>
            <div className="msg-corpo">
              {saindo?.notaId === nota.id && saindo.texto
                ? (
                  <p className="msg-bolha">
                    <ComLigacoes texto={saindo.texto} />
                    <i className="secr-cursor" aria-hidden />
                  </p>
                )
                : <p className="msg-bolha cnv-pensando">Lendo o seu caderno...</p>}
            </div>
          </div>
        )}
      </div>

      {!!propostas.length && (
        <div className="chat-sugs">
          <button className="chat-sugs-h" aria-expanded={sugsMax}
            onClick={() => setSugsMax((v) => !v)}>
            <Ic.faisca />
            <b>{propostas.length} {propostas.length === 1 ? 'coisa separada' : 'coisas separadas'}</b>
            <i className="chat-sugs-dica">{sugsMax ? 'voltar à conversa' : 'ver todas'}</i>
            <span className="chat-sugs-seta"><Ic.chev /></span>
          </button>
          {/* `despejo` muda o que a ficha oferece: aqui o responsável é sempre
              você, e perguntar "de quem é" num espaço de uma pessoa só é
              perguntar o óbvio. */}
          {propostas.map((s) => <CartaoSugestao key={s.id} s={s} despejo />)}
        </div>
      )}

      <div className="chat-campo">
        {passandoContato && (
          <MandarContato aoFechar={() => setPassandoContato(false)}
            aoMandar={(c) => passarContato({ notaId: nota.id }, c)} />
        )}
        {!!arquivos.length && (
          <div className="chat-anexando">
            <div className="chat-anexando-l">
              <Ic.clipe />
              <span>{arquivos.map((f) => f.name).join(', ')}</span>
              <button className="iconbtn" aria-label="Tirar os arquivos"
                onClick={() => setArquivos([])}><Ic.x /></button>
            </div>
          </div>
        )}
        <div className="chat-campo-linha">
          {cmd.menu(setTexto)}
          <div className="chat-entrada">
            <textarea
              ref={area}
              value={texto}
              rows={1}
              placeholder={celular ? 'O que vier na cabeça' : 'Escreva o que vier na cabeça'}
              aria-label="Falar com o secretário"
              onChange={(e) => { setTexto(e.target.value); cmd.aoDigitar(e.target.value); crescer() }}
              onKeyDown={(e) => {
                if (cmd.teclas(e, setTexto)) return
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void mandar() }
              }} />
            <input ref={entrada} type="file" multiple hidden
              onChange={(e) => { setArquivos(Array.from(e.target.files || [])); e.target.value = '' }} />
            <span className="chat-dentro">
              {/* O mesmo menu do chat: arquivo e contato. Quem aprendeu lá não
                  pode ter que aprender outra coisa aqui. */}
              <MenuTarefa titulo="anexar" rotulo="Anexar ou passar contato" acima
                icone={<Ic.clipe />} itens={[
                {
                  rotulo: 'Arquivo', icone: <Ic.clipe />,
                  aoEscolher: () => entrada.current?.click(),
                },
                {
                  rotulo: 'Contato', icone: <Ic.team />,
                  aoEscolher: () => setPassandoContato(true),
                },
              ]} />
              {/* Ditar é o jeito mais natural de despejar: quem está dirigindo
                  não digita, e é justamente aí que a ideia aparece. O navegador
                  transcreve, e o que a leitura separa depois é a transcrição. */}
              <BotaoVoz notaId={nota.id} />
            </span>
          </div>
          <button className="btn pri" aria-label="Enviar"
            disabled={(!texto.trim() && !arquivos.length) || pensando}
            onClick={() => void mandar()}><Ic.enviar /></button>
        </div>
      </div>
    </section>
  )
}

/**
 * O texto da resposta com as ligações clicáveis.
 *
 * A leitura cita nota antiga com [[título]], a mesma marca que a pessoa usa no
 * texto dela. Ser a mesma marca não é economia: é o que faz a ligação que a
 * máquina propôs e a que a pessoa escreveu valerem o mesmo.
 */
function ComLigacoes({ texto }: { texto: string }) {
  const pedacos: (string | { titulo: string })[] = []
  let fim = 0
  for (const m of texto.matchAll(LIGACAO)) {
    const i = m.index ?? 0
    if (i > fim) pedacos.push(texto.slice(fim, i))
    pedacos.push({ titulo: m[1].trim() })
    fim = i + m[0].length
  }
  if (fim < texto.length) pedacos.push(texto.slice(fim))
  return (
    <>
      {pedacos.map((p, i) => typeof p === 'string'
        ? <span key={i}>{p}</span>
        : <b key={i} className="nt-lig">{p.titulo}</b>)}
    </>
  )
}
