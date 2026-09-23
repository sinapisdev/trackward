'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useDados } from './Dados'
import { useModais } from './Modais'
import { Ic } from './Icones'
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

/** Fecha o menu ao clicar fora ou apertar Esc. */
function useFora(aberto: boolean, fechar: () => void) {
  const caixa = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!aberto) return
    const fora = (e: MouseEvent) => {
      if (caixa.current && !caixa.current.contains(e.target as Node)) fechar()
    }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') fechar() }
    window.addEventListener('mousedown', fora)
    window.addEventListener('keydown', esc)
    return () => { window.removeEventListener('mousedown', fora); window.removeEventListener('keydown', esc) }
  }, [aberto, fechar])
  return caixa
}

/** Em qual espaço você está, e como trocar. Ao lado da marca, como na arte. */
function Espaco() {
  const { eu, org, pessoal, empresas, empresaAtiva, focarEmpresa, empresaDe, espacos, trocarEspaco } = useDados()
  const { abrir } = useModais()
  const [aberto, setAberto] = useState(false)
  const caixa = useFora(aberto, () => setAberto(false))
  const atual = empresaDe(empresaAtiva)
  const nome = pessoal ? 'Pessoal' : org.multi && atual ? atual.nome : org.nome

  return (
    <div className="tw-esp" ref={caixa}>
      <button className="tw-esp-btn" onClick={() => setAberto((a) => !a)} aria-expanded={aberto}>
        <span className="nm">{nome}</span>
        <Ic.chev />
      </button>
      {aberto && (
        <div className="tw-menu">
          <div className="tw-menu-rot">Seus espaços</div>
          {(espacos.length ? espacos : [{
            perfil_id: eu.id, org_id: org.id, nome: org.nome,
            tipo: org.tipo, papel: eu.papel, ativo: eu.ativo, atual: true,
          }]).map((x) => (
            <button key={x.perfil_id} className={x.atual ? 'on' : ''}
              onClick={() => { if (!x.atual) void trocarEspaco(x.perfil_id); setAberto(false) }}>
              <span className="nm">{x.nome}</span>
              {x.atual && <Ic.check />}
            </button>
          ))}
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

/** Você: tema, equipe e saída. */
function Eu() {
  const { eu, pessoal } = useDados()
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [tema, setTema] = useState<Tema>('escuro')
  const caixa = useFora(aberto, () => setAberto(false))

  useEffect(() => { setTema(temaAtual()) }, [])

  const sair = async () => {
    await supabase().auth.signOut()
    if (MODO_LOCAL) { location.reload(); return }
    router.push('/entrar')
    router.refresh()
  }

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
          <button onClick={() => {
            const k = TEMAS.findIndex((t) => t.id === tema)
            const proximo = TEMAS[(k + 1) % TEMAS.length]
            aplicarTema(proximo.id)
            setTema(proximo.id)
          }}>
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
  const { processos, agentes, conectores, notas } = useDados()
  const [aberto, setAberto] = useState(false)
  const caixa = useFora(aberto, () => setAberto(false))
  const linhas: [string, string, number?][] = [
    ['/avisos', 'Avisos'],
    ['/relatorios', 'Relatórios'],
    ['/desempenho', 'Desempenho'],
    ['/notas', 'Notas', notas.filter((n) => !n.arquivada).length],
    ['/agentes', 'Agentes', agentes.filter((a) => a.ativo).length],
    ['/conectores', 'Conectores', conectores.filter((c) => c.ativo).length],
    ['/processos', 'Processos', processos.length],
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
 * Abrir o sino **não** marca tudo como lido. Ler é um ato: quem passa o olho e
 * fecha continua com a marca, porque o contador existe para lembrar do que ainda
 * não foi resolvido, não do que ainda não foi visto.
 */
function Sino() {
  const { avisos, naoVistos, lerAvisos, apagarAviso } = useDados()
  const [aberto, setAberto] = useState(false)
  const caixa = useFora(aberto, () => setAberto(false))
  const lista = avisos.slice(0, 8)

  return (
    <div className="tw-sino" ref={caixa}>
      <button className="iconbtn grd" onClick={() => setAberto((a) => !a)} aria-expanded={aberto}
        aria-label={naoVistos ? `Avisos, ${naoVistos} sem ler` : 'Avisos'} title="Avisos">
        <Ic.sino />
        {!!naoVistos && <i className="tw-sino-pt">{naoVistos > 9 ? '9+' : naoVistos}</i>}
      </button>

      {aberto && (
        <div className="tw-menu dir tw-avisos">
          <div className="tw-avisos-h">
            <b>Avisos</b>
            {!!naoVistos && (
              <button onClick={() => void lerAvisos()}>Marcar tudo como lido</button>
            )}
          </div>

          {lista.length ? lista.map((a) => (
            <Link key={a.id} href={destino(a)} className={`av-l ${a.lido_em ? '' : 'novo'}`}
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
  const { eu, fluxos, canais, naoLidas, pessoal } = useDados()
  const caminho = usePathname()
  const minhas = pendencias(fluxos, eu.id).length
  const porLer = canais.reduce((n, c) => n + naoLidas(c.id), 0)
  const emMais = ['/relatorios', '/desempenho', '/notas', '/agentes', '/conectores']
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
        <Aba href="/" rotulo="Visão geral" ativo={caminho === '/'} />
        <Aba href="/minhas" rotulo="Meu trabalho" conta={minhas} ativo={caminho === '/minhas'} />
        {/* Objetivos e rotinas moram na mesma tela: são o mesmo objeto, e a
            diferença entre eles é um filtro, não um endereço. */}
        <Aba href="/tracks" rotulo="Tracks"
          ativo={caminho.startsWith('/tracks') || caminho.startsWith('/fluxo/')} />
        <Aba href="/processos" rotulo="Processos" ativo={caminho.startsWith('/processos')} />
        <Aba href="/chat" rotulo="Conversa" conta={porLer} quente ativo={caminho.startsWith('/chat')} />
        <Aba href="/agenda" rotulo="Agenda" ativo={caminho === '/agenda'} />
        <Mais ativo={emMais} />
      </nav>

      <div className="tw-dir">
        <Busca />
        <Sino />
        {!pessoal && (
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
