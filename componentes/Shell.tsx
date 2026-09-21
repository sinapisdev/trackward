'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useDados } from './Dados'
import { useModais } from './Modais'
import { Topo } from './Topo'
import { TabBar } from './TabBar'
import { Ic } from './Icones'
import { Av } from './atomos'
import { supabase } from '@/lib/supabase/browser'
import { comProblema, ORD, pendencias, status } from '@/lib/regras'
import { hojeIso } from '@/lib/datas'
import { MODO_LOCAL } from '@/lib/modo'
import { aplicarTema, temaAtual, TEMAS, type Tema } from '@/lib/tema'

function NavItem({ href, icone, rotulo, conta, quente, ativo, sub }: {
  href: string; icone: ReactNode; rotulo: string; conta?: number
  quente?: boolean; ativo: boolean; sub?: boolean
}) {
  return (
    <Link className={`nv ${ativo ? 'on' : ''} ${sub ? 'sub' : ''}`} href={href} title={rotulo}>
      {icone}
      <span className="rot">{rotulo}</span>
      {!!conta && <span className={`ct num ${quente ? 'hot' : ''}`}>{conta}</span>}
    </Link>
  )
}

/** Ponto de situação do projeto na lateral: só ganha cor quando pede alguma coisa. */
function Ponto({ st }: { st: string }) {
  const cor = st === 'late' ? 'var(--late)' : st === 'soon' ? 'var(--warn)' : 'var(--line-3)'
  if (st === 'done')
    return (
      <span className="pdot">
        <svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" fill="none" stroke="var(--line-3)" strokeWidth="1.4" /></svg>
      </span>
    )
  return (
    <span className="pdot">
      <svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" fill={cor} /></svg>
    </span>
  )
}

/**
 * Onde você está: a organização em cima, e, quando ela separa por empresa, a
 * empresa em foco embaixo. É daqui que se troca de lugar.
 */
function SeletorEmpresa() {
  const { eu, org, pessoal, empresas, empresaAtiva, focarEmpresa, empresaDe, todosFluxos,
    espacos, trocarEspaco, abrirEspaco } = useDados()
  const { abrir } = useModais()
  const [aberto, setAberto] = useState(false)
  const caixa = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fora = (e: MouseEvent) => {
      if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false)
    }
    window.addEventListener('mousedown', fora)
    return () => window.removeEventListener('mousedown', fora)
  }, [])

  const atual = empresaDe(empresaAtiva)
  const conta = (id: string) => todosFluxos.filter((f) => f.empresa_id === id && !f.concluido).length
  const iniciais = (org.nome || '?').trim().split(/\s+/).slice(0, 2)
    .map((w) => w[0]).join('').toUpperCase()

  const linhaDeBaixo = pessoal
    ? 'Espaço pessoal'
    : org.multi
      ? (atual ? atual.nome : `Todas as ${org.rotulo_plural.toLowerCase()}`)
      : `${eu.papel === 'admin' ? 'Administrador' : eu.papel === 'gestor' ? 'Gestor' : 'Colaborador'}`

  return (
    <div className="emp" ref={caixa}>
      <button className="emp-btn" onClick={() => setAberto((a) => !a)} aria-expanded={aberto}>
        <span className="sigla" style={{ background: 'var(--sunken)', color: 'var(--tx-2)' }}>
          {pessoal ? <Ic.eu /> : iniciais}
        </span>
        <span className="nm">
          <b>{pessoal ? 'Pessoal' : org.nome}</b>
          <small>{linhaDeBaixo}</small>
        </span>
        <span className="chev"><Ic.chev /></span>
      </button>

      {aberto && (
        <div className="emp-menu">
          <div className="emp-rot">Seus espaços</div>
          {(espacos.length ? espacos : [{
            perfil_id: eu.id, org_id: org.id, nome: org.nome,
            tipo: org.tipo, papel: eu.papel, ativo: eu.ativo, atual: true,
          }]).map((x) => (
            <button key={x.perfil_id} className={x.atual ? 'on' : ''}
              onClick={() => { if (!x.atual) void trocarEspaco(x.perfil_id); setAberto(false) }}>
              <span className="sigla" style={{ background: 'var(--sunken)', color: 'var(--tx-2)' }}>
                {x.tipo === 'pessoal'
                  ? <Ic.eu />
                  : (x.nome || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
              </span>
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {x.nome}
              </span>
              {x.atual && <Ic.check />}
            </button>
          ))}
          {/* Abrir o Track pessoal de quem só tem o da empresa, e o contrário. */}
          {!espacos.some((x) => x.tipo === 'pessoal') && (
            <button onClick={() => { setAberto(false); void abrirEspaco('Meu Track', 'pessoal') }}>
              <span className="sigla" style={{ background: 'transparent', color: 'var(--tx-3)' }}><Ic.plus /></span>
              Abrir um espaço pessoal
            </button>
          )}

          {org.multi && !!empresas.length && (
            <>
              <div className="sep" />
              <div className="emp-rot">{org.rotulo_plural}</div>
              <button className={!empresaAtiva ? 'on' : ''} onClick={() => { focarEmpresa(null); setAberto(false) }}>
                <span className="sigla" style={{ background: 'var(--sunken)', color: 'var(--tx-3)' }}><Ic.team /></span>
                Todas as {org.rotulo_plural.toLowerCase()}
              </button>
              {empresas.map((e) => (
                <button key={e.id} className={empresaAtiva === e.id ? 'on' : ''}
                  onClick={() => { focarEmpresa(e.id); setAberto(false) }}>
                  <span className="sigla" style={{ background: `color-mix(in srgb, ${e.cor} 20%, transparent)`, color: e.cor }}>
                    {e.sigla}
                  </span>
                  <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.nome}</span>
                  <span className="ct num" style={{ color: 'var(--tx-3)', fontSize: 11 }}>{conta(e.id)}</span>
                </button>
              ))}
              {eu.papel === 'admin' && (
                <button onClick={() => { setAberto(false); abrir({ tipo: 'empresa' }) }}>
                  <span className="sigla" style={{ background: 'transparent', color: 'var(--tx-3)' }}><Ic.plus /></span>
                  Nova {org.rotulo.toLowerCase()}
                </button>
              )}
            </>
          )}

          <div className="sep" />
          <Link href="/ajustes" onClick={() => setAberto(false)}>
            <span className="sigla" style={{ background: 'transparent', color: 'var(--tx-3)' }}><Ic.ajustes /></span>
            Ajustes do espaço
          </Link>
        </div>
      )}
    </div>
  )
}

export function Shell({ children }: { children: ReactNode }) {
  const { eu, fluxos, areas, org, agenda, processos, canais, naoLidas, aviso, carregando } = useDados()
  const { abrir } = useModais()
  const caminho = usePathname()
  const router = useRouter()
  const [tema, setTema] = useState<Tema>('escuro')

  useEffect(() => { setTema(temaAtual()) }, [])

  const girarTema = () => {
    const k = TEMAS.findIndex((t) => t.id === tema)
    const proximo = TEMAS[(k + 1) % TEMAS.length]
    aplicarTema(proximo.id)
    setTema(proximo.id)
  }

  const sair = async () => {
    await supabase().auth.signOut()
    if (MODO_LOCAL) { location.reload(); return }
    router.push('/entrar')
    router.refresh()
  }

  const minhas = pendencias(fluxos, eu.id).length
  const porLer = canais.reduce((n, c) => n + naoLidas(c.id), 0)
  const hojeNaAgenda = agenda.filter(
    (c) => c.quando === hojeIso() && [c.dono_id, ...c.convidados].includes(eu.id),
  ).length
  const tracks = fluxos.filter((f) => f.tipo === 'esteira' && !f.concluido).length + areas.length

  return (
    <div className="shell">
      <nav className="side" aria-label="Navegação">
        {/* Só a marca no alto, como em app. O nome do espaço mora no seletor
            logo abaixo, que é onde se troca de lugar. */}
        <div className="ws">
          <span className="logo"><Ic.logo /></span>
          <b className="marca">Track.</b>
        </div>

        <SeletorEmpresa />

        <div className="side-rolagem">
          <NavItem href="/" icone={<Ic.painel />} rotulo="Painel" ativo={caminho === '/'}
            conta={comProblema(fluxos)} quente />
          <NavItem href="/minhas" icone={<Ic.inbox />} rotulo="Aguardando você"
            ativo={caminho === '/minhas'} conta={minhas} />
          <NavItem href="/chat" icone={<Ic.chat />} rotulo="Conversa"
            ativo={caminho.startsWith('/chat')} conta={porLer} quente />
          <NavItem href="/agenda" icone={<Ic.agenda />} rotulo="Agenda" ativo={caminho === '/agenda'}
            conta={hojeNaAgenda} />

          <NavItem href="/tracks" icone={<Ic.proj />} rotulo="Tracks"
            ativo={caminho.startsWith('/tracks')} conta={tracks} />
          <NavItem href="/desempenho" icone={<Ic.grafico />} rotulo="Desempenho"
            ativo={caminho === '/desempenho'} />
        </div>

        <div className="sh"><span>Configuração</span></div>
        <NavItem href="/processos" icone={<Ic.processo />} rotulo="Processos"
          ativo={caminho.startsWith('/processos')} conta={processos.length} />

        <div className="side-foot">
          <Link className="me" href="/equipe">
            <Av p={eu} tam="sm" />
            <span>{eu.nome}</span>
          </Link>
          <button className="iconbtn" onClick={girarTema}
            title={`Tema ${TEMAS.find((t) => t.id === tema)?.nome}, clique para trocar`} aria-label="Trocar de tema">
            {tema === 'claro' ? <Ic.sol /> : <Ic.lua />}
          </button>
          <button className="iconbtn" onClick={() => void sair()}
            title={MODO_LOCAL ? 'Trocar de pessoa' : 'Sair'} aria-label={MODO_LOCAL ? 'Trocar de pessoa' : 'Sair'}>
            {MODO_LOCAL ? <Ic.team /> : <Ic.sair />}
          </button>
        </div>
      </nav>

      <main className="main">
        <Topo />
        <div className="conteudo"><div className="wrap">{children}</div></div>
      </main>

      <TabBar />

      <div className={`toast ${aviso ? 'show' : ''}`} role="status">
        {aviso && (
          <>
            <span style={{ color: aviso.erro ? 'var(--late)' : 'var(--ac)' }}>
              {aviso.erro ? <Ic.x /> : <Ic.check />}
            </span>
            {aviso.texto}
          </>
        )}
      </div>
    </div>
  )
}

/** Esqueleto enquanto os dados chegam, para a tela não pular. */
export function Carregando() {
  return (
    <>
      <div className="hdr">
        <div style={{ width: '100%' }}>
          <div className="skel" style={{ width: 120, height: 12, marginBottom: 12 }} />
          <div className="skel" style={{ width: 280, height: 26, marginBottom: 12 }} />
          <div className="skel" style={{ width: 420, height: 14, maxWidth: '80%' }} />
        </div>
      </div>
      <div className="grid2">
        <div className="card" style={{ padding: 15, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[0, 1, 2, 3, 4, 5].map((k) => <div key={k} className="skel" style={{ height: 22 }} />)}
        </div>
        <div className="card" style={{ padding: 15, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[0, 1, 2, 3].map((k) => <div key={k} className="skel" style={{ height: 22 }} />)}
        </div>
      </div>
    </>
  )
}
