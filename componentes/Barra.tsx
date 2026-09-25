'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useDados } from './Dados'
import { useModais } from './Modais'
import { Ic } from './Icones'
import { useFora, useCelular } from './partes'
import { rotuloTipo } from '@/lib/rotulos'
import { Av, IconeStatus } from './atomos'
import { supabase } from '@/lib/supabase/browser'
import { pendencias, progresso, status } from '@/lib/regras'
import { isoDe, rel } from '@/lib/datas'
import { destino } from '@/lib/avisos'
import { MODO_LOCAL } from '@/lib/modo'
import { aplicarTema, temaAtual, TEMAS, type Tema } from '@/lib/tema'

/**
 * A barra de cima: marca, espaço, navegação, busca e você.
 *
 * O produto é navegado na horizontal, não numa lateral: a arte tem o conteúdo
 * ocupando a largura inteira, com a lateral reservada ao contexto da tela (o
 * radar, a conversa da track). Quem aparece no celular continua sendo a TabBar.
 */

/** Item da navegação: pílula escura quando é a tela da vez. */
function Aba({ href, rotulo, conta, quente, ativo }: {
  href: string; rotulo: string; conta?: number; quente?: boolean; ativo: boolean
}) {
  return (
    <Link className={`tw-aba ${ativo ? 'on' : ''}`} href={href}>
      {rotulo}
      {!!conta && <i className={`tw-ct num ${quente ? 'hot' : ''}`}>{conta > 99 ? '99+' : conta}</i>}
    </Link>
  )
}

/** Em qual espaço você está, e como trocar. Ao lado da marca, como na arte. */
function Espaco() {
  const { eu, org, pessoal, empresas, empresaAtiva, focarEmpresa, empresaDe, espacos, trocarEspaco } = useDados()
  const { abrir } = useModais()
  const [aberto, setAberto] = useState(false)
  const caixa = useFora(aberto, () => setAberto(false))
  const atual = empresaDe(empresaAtiva)
  const nome = pessoal ? 'Pessoal' : org.multi && atual ? atual.nome : org.nome

  /* O espaço desligado continua na lista, e dizendo que acabou. Sumir com ele
     seria a mesma tela de quem nunca esteve lá, e quem saiu de uma empresa
     ontem lê isso como perda do que escreveu. */
  const lista = espacos.length ? espacos : [{
    perfil_id: eu.id, org_id: org.id, nome: org.nome,
    tipo: org.tipo, papel: eu.papel, ativo: eu.ativo, atual: true,
  }]
  const temPessoal = lista.some((x) => x.tipo === 'pessoal')

  return (
    <div className="tw-esp" ref={caixa}>
      <button className="tw-esp-btn" onClick={() => setAberto((a) => !a)} aria-expanded={aberto}>
        <span className="nm">{nome}</span>
        <Ic.chev />
      </button>
      {aberto && (
        <div className="tw-menu">
          <div className="tw-menu-rot">Seus espaços</div>
          {lista.map((x) => (
            <button key={x.perfil_id} className={`${x.atual ? 'on' : ''} ${x.ativo ? '' : 'fora'}`}
              disabled={!x.ativo}
              title={x.ativo ? '' : 'Seu acesso a este espaço foi encerrado'}
              onClick={() => { if (!x.atual) void trocarEspaco(x.perfil_id); setAberto(false) }}>
              <span className="nm">{x.nome}</span>
              {x.tipo === 'pessoal' && x.ativo && <i className="tw-esp-et">só seu</i>}
              {!x.ativo && <i className="tw-esp-et">acesso encerrado</i>}
              {x.atual && <Ic.check />}
            </button>
          ))}
          {/* O pessoal se contrata aqui, e não no cadastro: quem entrou por uma
              empresa descobre que ele existe no único lugar em que já vem
              trocar de espaço. É o mesmo app, sem o que exige outra pessoa. */}
          {!temPessoal && (
            <button onClick={() => { setAberto(false); abrir({ tipo: 'espaco', pessoal: true }) }}>
              <Ic.eu /><span className="nm">Abrir meu espaço pessoal</span>
            </button>
          )}
          <button onClick={() => { setAberto(false); abrir({ tipo: 'espaco' }) }}>
            <Ic.plus /><span className="nm">Abrir outra empresa</span>
          </button>

          {org.multi && !!empresas.length && (
            <>
              <div className="tw-menu-sep" />
              <div className="tw-menu-rot">{org.rotulo_plural}</div>
              <button className={!empresaAtiva ? 'on' : ''}
                onClick={() => { focarEmpresa(null); setAberto(false) }}>
                <span className="nm">Todas as {org.rotulo_plural.toLowerCase()}</span>
                {!empresaAtiva && <Ic.check />}
              </button>
              {empresas.map((e) => (
                <button key={e.id} className={empresaAtiva === e.id ? 'on' : ''}
                  onClick={() => { focarEmpresa(e.id); setAberto(false) }}>
                  <span className="sdot" style={{ background: e.cor }} />
                  <span className="nm">{e.nome}</span>
                  {empresaAtiva === e.id && <Ic.check />}
                </button>
              ))}
            </>
          )}

          <div className="tw-menu-sep" />
          <Link href="/ajustes" onClick={() => setAberto(false)}>
            <Ic.ajustes /><span className="nm">Ajustes do espaço</span>
          </Link>
        </div>
      )}
    </div>
  )
}

/** Busca que alcança qualquer track, com "/" como atalho. */
function Busca() {
  const { fluxos, areaDe, empresaDe, org } = useDados()
  const caminho = usePathname()
  const [termo, setTermo] = useState('')
  const [aberto, setAberto] = useState(false)
  const campo = useRef<HTMLInputElement>(null)
  const caixa = useFora(aberto, () => setAberto(false))

  useEffect(() => { setTermo(''); setAberto(false) }, [caminho])

  useEffect(() => {
    const atalho = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement
      const digitando = /^(INPUT|TEXTAREA|SELECT)$/.test(alvo?.tagName || '')
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !digitando)) {
        e.preventDefault()
        campo.current?.focus()
      }
    }
    window.addEventListener('keydown', atalho)
    return () => window.removeEventListener('keydown', atalho)
  }, [])

  const achados = useMemo(() => {
    const t = termo.trim()
    if (!t) return []
    const limpa = (x: string) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    return fluxos
      .filter((f) => limpa(f.nome).includes(limpa(t)) || limpa(areaDe(f.area_id).nome).includes(limpa(t)))
      .slice(0, 8)
  }, [termo, fluxos, areaDe])

  return (
    <div className="tw-busca" ref={caixa}>
      <span className="lupa"><Ic.lupa /></span>
      <input
        ref={campo}
        value={termo}
        placeholder="Buscar tracks"
        aria-label="Buscar tracks"
        onChange={(e) => { setTermo(e.target.value); setAberto(true) }}
        onFocus={() => setAberto(true)}
      />
      <kbd>/</kbd>
      {aberto && termo.trim() && (
        <div className="achados">
          {achados.length ? achados.map((f) => {
            const emp = org.multi ? empresaDe(f.empresa_id) : null
            return (
              <Link key={f.id} href={`/fluxo/${f.id}`} onClick={() => setAberto(false)}>
                <IconeStatus st={status(f)} p={progresso(f)} />
                <span style={{ minWidth: 0 }}>
                  <span className="t">{f.nome}</span>
                  <span className="s">
                    {rotuloTipo(f.tipo)}
                    {f.area_id && ` · ${areaDe(f.area_id).nome}`}
                    {emp && ` · ${emp.nome}`}
                  </span>
                </span>
              </Link>
            )
          }) : <div className="vazio">Nada encontrado para &quot;{termo}&quot;.</div>}
        </div>
      )}
    </div>
  )
}

/**
 * Você: tema, equipe e saída. E, no celular, tudo o mais.
 *
 * Ali embaixo havia um botão "Mais" na barra de abas, e ele gastava um quinto
 * da largura do rodapé para guardar o que não se abre todo dia. Aqui em cima já
 * moravam tema, ajustes e sair, que são a mesma pergunta: "o que mais tem
 * aqui". Juntar os dois num botão só devolve a largura para as quatro abas que
 * a pessoa usa, e tira a lupa de perto da bolinha, que eram dois botões
 * vizinhos para duas coisas que ninguém confunde de propósito.
 */
function Eu() {
  const { eu, pessoal, pode, areas, org, empresas, empresaAtiva, focarEmpresa,
    canais, naoLidas } = useDados()
  const router = useRouter()
  const celular = useCelular()
  const caminho = usePathname()
  const [aberto, setAberto] = useState(false)
  const [tema, setTema] = useState<Tema>('escuro')
  const caixa = useFora(aberto && !celular, () => setAberto(false))

  useEffect(() => { setTema(temaAtual()) }, [])
  useEffect(() => { setAberto(false) }, [caminho])

  const sair = async () => {
    await supabase().auth.signOut()
    if (MODO_LOCAL) { location.reload(); return }
    router.push('/entrar')
    router.refresh()
  }

  const trocarTema = () => {
    const k = TEMAS.findIndex((t) => t.id === tema)
    const proximo = TEMAS[(k + 1) % TEMAS.length]
    aplicarTema(proximo.id)
    setTema(proximo.id)
  }

  const porLer = canais.reduce((n, c) => n + naoLidas(c.id), 0)

  if (celular) return (
    <div className="tw-eu">
      <button onClick={() => setAberto(true)} aria-label={`${eu.nome} e mais`} aria-expanded={aberto}>
        <Av p={eu} />
      </button>
      {/*
        A folha sai por um portal, e isso NÃO é preferência de organização.

        `.tw-topo` tem `backdrop-filter`, e elemento com backdrop-filter vira o
        bloco de contenção de todo `position:fixed` que estiver dentro dele. A
        folha nascia aqui dentro, então `inset:0` não era a janela, era a barra
        de cima: ela abria como uma tira de 60px colada no topo, com o conteúdo
        cortado, e quem tocasse na bolinha via o painel sumir em vez de abrir.

        Vale para qualquer coisa fixa que nasça dentro da barra. Ao criar outra,
        mandar para o `body` também, ou tirar o desfoque da barra, que é pior.
      */}
      {aberto && createPortal((
        <div className="folha-fundo" onClick={() => setAberto(false)}>
          <div className="folha" onClick={(e) => e.stopPropagation()}>
            <div className="puxador" />

            {/* Quem você é, e não um botão de sair disfarçado de perfil. Sair
                tem linha própria lá embaixo, junto das outras: o bloco de cima
                é identificação, e clicar em identificação para sair da conta é
                o tipo de coisa que só se descobre errando. */}
            <div className="folha-eu">
              <Av p={eu} tam="lg" />
              <span>
                <b>{eu.nome}</b>
                <small>{eu.email}</small>
              </span>
            </div>

            {pode.empresas && !!empresas.length && (
              <>
                <div className="folha-rot">{org.rotulo_plural}</div>
                <div className="folha-chips">
                  <button className={`tpl ${!empresaAtiva ? 'on' : ''}`} onClick={() => focarEmpresa(null)}>
                    Todas
                  </button>
                  {empresas.map((e) => (
                    <button key={e.id} className={`tpl ${empresaAtiva === e.id ? 'on' : ''}`}
                      onClick={() => focarEmpresa(e.id)}>{e.nome}</button>
                  ))}
                </div>
              </>
            )}

            {!!areas.length && (
              <>
                <div className="folha-rot">Áreas</div>
                {areas.map((a) => (
                  <Link className="folha-item" key={a.id} href={`/area/${a.id}`}>
                    <span className="sdot" style={{ background: a.cor }} />
                    {a.nome}
                  </Link>
                ))}
              </>
            )}

            <div className="folha-rot">Mais</div>
            {pode.canais && (
              <Link className="folha-item" href="/chat">
                <Ic.chat />Todos os canais
                {!!porLer && <span className="ct num" style={{ marginLeft: 'auto' }}>{porLer}</span>}
              </Link>
            )}
            <Link className="folha-item" href="/notas"><Ic.edit />Notas</Link>
            <Link className="folha-item" href="/avisos"><Ic.sino />Avisos</Link>
            <Link className="folha-item" href="/desempenho"><Ic.grafico />Desempenho</Link>
            <Link className="folha-item" href="/relatorios"><Ic.processo />Relatórios</Link>
            <Link className="folha-item" href="/processos"><Ic.processo />Processos</Link>
            <Link className="folha-item" href="/agentes"><Ic.faisca />Agentes</Link>
            <Link className="folha-item" href="/conectores"><Ic.raio />Conectores</Link>
            {pode.equipe && <Link className="folha-item" href="/equipe"><Ic.team />Equipe</Link>}
            <Link className="folha-item" href="/ajustes"><Ic.ajustes />Ajustes</Link>
            <button className="folha-item" onClick={trocarTema}>
              {tema === 'claro' ? <Ic.lua /> : <Ic.sol />}
              Tema: {TEMAS.find((t) => t.id === tema)?.nome}
            </button>
            <button className="folha-item" onClick={() => void sair()}>
              {MODO_LOCAL ? <Ic.team /> : <Ic.sair />}
              {MODO_LOCAL ? 'Trocar de pessoa' : 'Sair da conta'}
            </button>
          </div>
        </div>
      ), document.body)}
    </div>
  )

  return (
    <div className="tw-eu" ref={caixa}>
      <button onClick={() => setAberto((a) => !a)} aria-label={eu.nome} aria-expanded={aberto}>
        <Av p={eu} />
      </button>
      {aberto && (
        <div className="tw-menu dir">
          <div className="tw-menu-eu">
            <Av p={eu} tam="lg" />
            <span><b>{eu.nome}</b><small>{eu.email}</small></span>
          </div>
          <div className="tw-menu-sep" />
          {!pessoal && (
            <Link href="/equipe" onClick={() => setAberto(false)}>
              <Ic.team /><span className="nm">Equipe</span>
            </Link>
          )}
          <Link href="/ajustes" onClick={() => setAberto(false)}>
            <Ic.ajustes /><span className="nm">Ajustes</span>
          </Link>
          <button onClick={trocarTema}>
            {tema === 'claro' ? <Ic.lua /> : <Ic.sol />}
            <span className="nm">Tema: {TEMAS.find((t) => t.id === tema)?.nome}</span>
          </button>
          <div className="tw-menu-sep" />
          <button onClick={() => void sair()}>
            {MODO_LOCAL ? <Ic.team /> : <Ic.sair />}
            <span className="nm">{MODO_LOCAL ? 'Trocar de pessoa' : 'Sair da conta'}</span>
          </button>
        </div>
      )}
    </div>
  )
}

/** O que não cabe na fileira principal, mas continua a um clique. */
function Mais({ ativo }: { ativo: boolean }) {
  const { processos, agentes, conectores } = useDados()
  const [aberto, setAberto] = useState(false)
  const caixa = useFora(aberto, () => setAberto(false))
  const linhas: [string, string, number?][] = [
    ['/avisos', 'Avisos'],
    ['/processos', 'Processos', processos.length],
    ['/relatorios', 'Relatórios'],
    ['/desempenho', 'Desempenho'],
    ['/agentes', 'Agentes', agentes.filter((a) => a.ativo).length],
    ['/conectores', 'Conectores', conectores.filter((c) => c.ativo).length],
  ]
  return (
    <div className="tw-mais" ref={caixa}>
      <button className={`tw-aba ${ativo ? 'on' : ''}`} onClick={() => setAberto((a) => !a)} aria-expanded={aberto}>
        Mais<Ic.chev />
      </button>
      {aberto && (
        <div className="tw-menu">
          {linhas.map(([href, rotulo, conta]) => (
            <Link key={href} href={href} onClick={() => setAberto(false)}>
              <span className="nm">{rotulo}</span>
              {!!conta && <i className="tw-ct num">{conta}</i>}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}


/**
 * O sino: a caixa de avisos, a um clique de qualquer tela.
 *
 * Ele mostra a lista e nada mais. Quem decide o que vira aviso é o banco, e quem
 * leva o aviso para fora do app é `/api/avisar`: aqui dentro a pessoa já está
 * olhando, então não há o que empurrar.
 *
 * **Abrir o sino apaga o número.** Ele conta o que você ainda não viu, e depois
 * de aberto você viu: o selo que fica é o app insistindo em algo que a pessoa
 * acabou de olhar, e selo que não some ensina a ignorar selo.
 *
 * O que não some na hora é o **destaque das linhas**. Quem abriu precisa
 * distinguir o que chegou do que já estava ali, e marcar tudo como lido no
 * mesmo instante apagaria o destaque debaixo do olho de quem está lendo. Por
 * isso `novos` guarda quem estava por ler quando a caixa abriu, e é essa lista
 * que pinta, não o `lido_em` que acabou de mudar.
 */
function Sino() {
  const { avisos, naoVistos, lerAvisos, apagarAviso } = useDados()
  const [aberto, setAberto] = useState(false)
  const [novos, setNovos] = useState<string[]>([])
  const caixa = useFora(aberto, () => setAberto(false))
  const lista = avisos.slice(0, 8)

  const alternar = () => {
    if (aberto) { setAberto(false); return }
    setNovos(avisos.filter((a) => !a.lido_em).map((a) => a.id))
    if (naoVistos) void lerAvisos()
    setAberto(true)
  }

  return (
    <div className="tw-sino" ref={caixa}>
      <button className="iconbtn grd" onClick={alternar} aria-expanded={aberto}
        aria-label={naoVistos ? `Avisos, ${naoVistos} sem ler` : 'Avisos'} title="Avisos">
        <Ic.sino />
        {!!naoVistos && <i className="tw-sino-pt">{naoVistos > 9 ? '9+' : naoVistos}</i>}
      </button>

      {aberto && (
        <div className="tw-menu dir tw-avisos">
          <div className="tw-avisos-h">
            <b>Avisos</b>
          </div>

          {lista.length ? lista.map((a) => (
            <Link key={a.id} href={destino(a)} className={`av-l ${novos.includes(a.id) ? 'novo' : ''}`}
              onClick={() => { void lerAvisos([a.id]); setAberto(false) }}>
              <span className={`av-pt ${a.urgente ? 'urgente' : ''}`} aria-hidden />
              <span className="av-txt">
                <b>{a.titulo}</b>
                {!!a.corpo && <small>{a.corpo}</small>}
              </span>
              <span className="av-q">{rel(isoDe(a.criado_em))}</span>
              <button className="iconbtn av-x" aria-label={`Apagar ${a.titulo}`}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); void apagarAviso(a.id) }}>
                <Ic.x />
              </button>
            </Link>
          )) : (
            <p className="tw-avisos-vazio">
              Nada por aqui. Quando alguém te passar uma tarefa, um prazo vencer ou um
              checkpoint ficar pronto para a sua aprovação, o aviso aparece aqui.
            </p>
          )}

          <div className="tw-menu-sep" />
          <Link href="/avisos" onClick={() => setAberto(false)}>
            <span className="nm">Ver todos os avisos</span><Ic.seta />
          </Link>
        </div>
      )}
    </div>
  )
}

export function Barra() {
  const { eu, fluxos, canais, naoLidas, pode } = useDados()
  const caminho = usePathname()
  const minhas = pendencias(fluxos, eu.id).length
  const porLer = canais.reduce((n, c) => n + naoLidas(c.id), 0)
  const emMais = ['/relatorios', '/desempenho', '/agentes', '/conectores', '/processos']
    .some((r) => caminho.startsWith(r))

  return (
    <header className="tw-topo">
      <Link className="tw-marca" href="/">
        <Ic.logo />
        <b>TrackWard</b>
      </Link>
      <span className="tw-risco" aria-hidden />
      <Espaco />

      <nav className="tw-nav" aria-label="Navegação">
        {/* A ordem é a do produto, não a do histórico: conversa, notas e
            tarefas primeiro, porque é onde o dia acontece. Processos foi para
            "Mais" por ser montagem, e não operação: quem mexe em processo senta
            para fazer isso, não passa por ali entre duas reuniões. */}
        <Aba href="/" rotulo="Forward" ativo={caminho === '/'} />
        {pode.canais && (
          <Aba href="/chat" rotulo="Conversa" conta={porLer} quente ativo={caminho.startsWith('/chat')} />
        )}
        <Aba href="/notas" rotulo="Notas" ativo={caminho === '/notas'} />
        {/* Objetivos e rotinas moram na mesma tela: são o mesmo objeto, e a
            diferença entre eles é um filtro, não um endereço. */}
        <Aba href="/tracks" rotulo="Tracks"
          ativo={caminho.startsWith('/tracks') || caminho.startsWith('/fluxo/')} />
        <Aba href="/minhas" rotulo="Meu trabalho" conta={minhas} ativo={caminho === '/minhas'} />
        <Aba href="/agenda" rotulo="Agenda" ativo={caminho === '/agenda'} />
        <Mais ativo={emMais} />
      </nav>

      <div className="tw-dir">
        <Busca />
        <Sino />
        {pode.equipe && (
          <Link className="iconbtn grd" href="/equipe" title="Equipe" aria-label="Equipe"><Ic.team /></Link>
        )}
        <Link className="iconbtn grd" href="/ajustes" title="Ajustes" aria-label="Ajustes"><Ic.ajustes /></Link>
        <Eu />
      </div>
    </header>
  )
}

/** O pé da página, com a frase da marca de um lado e o espaço do outro. */
export function Rodape() {
  const { org, pessoal, empresaDe, empresaAtiva } = useDados()
  const atual = empresaDe(empresaAtiva)
  const nome = pessoal ? 'Espaço pessoal' : org.multi && atual ? atual.nome : org.nome
  return (
    <footer className="tw-rodape">
      <span><b>TrackWard</b> move work forward.</span>
      <span>{nome} · Trabalho que avança.</span>
    </footer>
  )
}
