'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useDados } from './Dados'
import { useModais } from './Modais'
import { Ic } from './Icones'
import { Av } from './atomos'
import { supabase } from '@/lib/supabase/browser'
import { comProblema, pendencias } from '@/lib/regras'
import { hojeIso } from '@/lib/datas'
import { MODO_LOCAL } from '@/lib/modo'
import { aplicarTema, temaAtual, TEMAS, type Tema } from '@/lib/tema'

/**
 * Navegação de celular: barra de abas no rodapé, como em app.
 * Aparece só em tela estreita; no desktop quem manda é a lateral.
 */
export function TabBar() {
  const { eu, fluxos, areas, agenda, org, empresas, empresaAtiva, focarEmpresa, canais, naoLidas, pessoal } = useDados()
  const { abrir } = useModais()
  const caminho = usePathname()
  const [mais, setMais] = useState(false)
  const [tema, setTema] = useState<Tema>('claro')

  useEffect(() => { setTema(temaAtual()) }, [])
  useEffect(() => { setMais(false) }, [caminho])

  const minhas = pendencias(fluxos, eu.id).length
  const problemas = comProblema(fluxos)
  const hoje = agenda.filter(
    (c) => c.quando === hojeIso() && [c.dono_id, ...c.convidados].includes(eu.id),
  ).length
  const porLer = canais.reduce((n, c) => n + naoLidas(c.id), 0)

  const sair = async () => {
    await supabase().auth.signOut()
    if (MODO_LOCAL) { location.reload(); return }
    location.assign('/entrar')
  }

  const Aba = ({ href, icone, rotulo, conta, quente }: {
    href: string; icone: React.ReactNode; rotulo: string; conta?: number; quente?: boolean
  }) => (
    <Link className={`aba ${caminho === href || (href !== '/' && caminho.startsWith(href)) ? 'on' : ''}`} href={href}>
      <span className="ic">
        {icone}
        {!!conta && <i className={`selo ${quente ? 'hot' : ''}`}>{conta > 9 ? '9+' : conta}</i>}
      </span>
      <span>{rotulo}</span>
    </Link>
  )

  return (
    <>
      <nav className="tabbar" aria-label="Navegação">
        <Aba href="/" icone={<Ic.painel />} rotulo="Painel" conta={problemas} quente />
        <Aba href="/minhas" icone={<Ic.inbox />} rotulo="Você" conta={minhas} />
        <Aba href="/chat" icone={<Ic.chat />} rotulo="Conversa" conta={porLer} quente />
        <Aba href="/tracks" icone={<Ic.proj />} rotulo="Tracks" />
        <button className={`aba ${mais ? 'on' : ''}`} onClick={() => setMais((v) => !v)}>
          <span className="ic"><Ic.mais /></span>
          <span>Mais</span>
        </button>
      </nav>

      {mais && (
        <div className="folha-fundo" onClick={() => setMais(false)}>
          <div className="folha" onClick={(e) => e.stopPropagation()}>
            <div className="puxador" />

            <button className="folha-eu" onClick={() => void sair()}>
              <Av p={eu} tam="lg" />
              <span>
                <b>{eu.nome}</b>
                <small>{MODO_LOCAL ? 'Trocar de pessoa' : 'Sair'}</small>
              </span>
              {MODO_LOCAL ? <Ic.team /> : <Ic.sair />}
            </button>

            {org.multi && !!empresas.length && (
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

            <div className="folha-rot">Áreas</div>
            {areas.map((a) => (
              <Link className="folha-item" key={a.id} href={`/area/${a.id}`}>
                <span className="sdot" style={{ background: a.cor }} />
                {a.nome}
              </Link>
            ))}
            {!areas.length && <div className="folha-item" style={{ color: 'var(--tx-3)' }}>Nenhuma área ainda</div>}

            <div className="folha-rot">Mais</div>
            <Link className="folha-item" href="/agenda">
              <Ic.agenda />Agenda
              {!!hoje && <span className="ct num" style={{ marginLeft: 'auto' }}>{hoje} hoje</span>}
            </Link>
            <Link className="folha-item" href="/avisos"><Ic.sino />Avisos</Link>
            <Link className="folha-item" href="/desempenho"><Ic.grafico />Desempenho</Link>
            <Link className="folha-item" href="/relatorios"><Ic.processo />Relatórios</Link>
            <Link className="folha-item" href="/processos"><Ic.processo />Processos</Link>
            <Link className="folha-item" href="/agentes"><Ic.faisca />Agentes</Link>
            {!pessoal && <Link className="folha-item" href="/equipe"><Ic.team />Equipe</Link>}
            <Link className="folha-item" href="/ajustes"><Ic.ajustes />Ajustes</Link>
            <button className="folha-item" onClick={() => {
              const k = TEMAS.findIndex((t) => t.id === tema)
              const proximo = TEMAS[(k + 1) % TEMAS.length]
              aplicarTema(proximo.id)
              setTema(proximo.id)
            }}>
              {tema === 'claro' ? <Ic.lua /> : <Ic.sol />}
              Tema: {TEMAS.find((t) => t.id === tema)?.nome}
            </button>
          </div>
        </div>
      )}

      {/* Ação principal flutuante, como em app de celular. Dentro de uma conversa
          ela sai, senão ficaria em cima do campo de escrever. */}
      {!mais && !caminho.startsWith('/chat/') && (
        <button className="fab" aria-label="Criar"
          onClick={() => abrir(
            caminho === '/chat' ? { tipo: 'canal' }
              : caminho === '/agenda' ? { tipo: 'compromisso', quando: hojeIso() }
                : { tipo: 'fluxo', tipoFluxo: 'esteira' })}>
          <Ic.plus />
        </button>
      )}
    </>
  )
}
