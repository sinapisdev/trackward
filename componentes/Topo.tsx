'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useDados } from './Dados'
import { Ic } from './Icones'
import { IconeStatus } from './atomos'
import { progresso, status } from '@/lib/regras'

/** Barra fina de contexto: onde você está, e uma busca que alcança tudo. */
export function Topo() {
  const { fluxos, areas, areaDe, empresaDe, org, processos, canais, eu, perfilDe } = useDados()
  const caminho = usePathname()
  const [termo, setTermo] = useState('')
  const [aberto, setAberto] = useState(false)
  const campo = useRef<HTMLInputElement>(null)
  const caixa = useRef<HTMLDivElement>(null)

  useEffect(() => { setTermo(''); setAberto(false) }, [caminho])

  useEffect(() => {
    const atalho = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement
      const digitando = /^(INPUT|TEXTAREA|SELECT)$/.test(alvo?.tagName || '')
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !digitando)) {
        e.preventDefault()
        campo.current?.focus()
      }
      if (e.key === 'Escape') { campo.current?.blur(); setAberto(false) }
    }
    const fora = (e: MouseEvent) => {
      if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false)
    }
    window.addEventListener('keydown', atalho)
    window.addEventListener('mousedown', fora)
    return () => { window.removeEventListener('keydown', atalho); window.removeEventListener('mousedown', fora) }
  }, [])

  const achados = useMemo(() => {
    const t = termo.trim().toLowerCase()
    if (!t) return []
    const limpa = (x: string) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    return fluxos
      .filter((f) => limpa(f.nome).includes(limpa(t)) || limpa(areaDe(f.area_id).nome).includes(limpa(t)))
      .slice(0, 8)
  }, [termo, fluxos, areaDe])

  const trilha = useMemo(() => {
    if (caminho === '/') return [{ nome: 'Painel' }]
    if (caminho === '/minhas') return [{ nome: 'Aguardando você' }]
    if (caminho === '/agenda') return [{ nome: 'Agenda' }]
    if (caminho === '/chat') return [{ nome: 'Conversa' }]
    if (caminho.startsWith('/chat/')) {
      const c = canais.find((x) => x.id === caminho.split('/')[2])
      if (!c) return [{ nome: 'Conversa', href: '/chat' }]
      const nome = c.tipo === 'direto'
        ? perfilDe(c.membros.find((m) => m !== eu.id) || null).nome
        : `#${c.nome}`
      return [{ nome: 'Conversa', href: '/chat' }, { nome }]
    }
    if (caminho === '/tracks') return [{ nome: 'Tracks' }]
    if (caminho === '/desempenho') return [{ nome: 'Desempenho' }]
    if (caminho === '/relatorios') return [{ nome: 'Relatórios' }]
    if (caminho === '/projetos') return [{ nome: 'Tracks', href: '/tracks' }, { nome: 'Projetos' }]
    if (caminho === '/areas') return [{ nome: 'Tracks', href: '/tracks' }, { nome: 'Áreas' }]
    if (caminho === '/equipe') return [{ nome: 'Equipe' }]
    if (caminho === '/ajustes') return [{ nome: 'Ajustes' }]
    if (caminho === '/processos') return [{ nome: 'Processos' }]
    if (caminho === '/agentes') return [{ nome: 'Agentes' }]
    if (caminho.startsWith('/processos/')) {
      const alvo = caminho.split('/')[2]
      const p = alvo === 'novo' ? null : processos.find((x) => x.id === alvo)
      return [{ nome: 'Processos', href: '/processos' }, { nome: p?.nome || 'Novo processo' }]
    }
    if (caminho.startsWith('/area/')) {
      const a = areas.find((x) => x.id === caminho.split('/')[2])
      return [{ nome: 'Tracks', href: '/tracks' }, { nome: a?.nome || 'Área' }]
    }
    if (caminho.startsWith('/fluxo/')) {
      const f = fluxos.find((x) => x.id === caminho.split('/')[2])
      if (!f) return [{ nome: 'Fluxo' }]
      return f.tipo === 'ciclo' && f.area_id
        ? [{ nome: areaDe(f.area_id).nome, href: `/area/${f.area_id}` }, { nome: f.nome }]
        : [{ nome: 'Tracks', href: '/tracks' }, { nome: f.nome }]
    }
    return [{ nome: 'Track' }]
  }, [caminho, areas, fluxos, areaDe, processos, canais, eu.id, perfilDe])

  return (
    <header className="topo">
      <nav className="crumb" aria-label="Você está em">
        {trilha.map((t, k) => (
          <span key={k} style={{ display: 'contents' }}>
            {k > 0 && <span className="div">/</span>}
            {t.href ? <Link href={t.href}>{t.nome}</Link> : <b>{t.nome}</b>}
          </span>
        ))}
      </nav>

      <div className="topo-dir">
        <div className="busca" ref={caixa}>
          <span className="lupa">
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <circle cx="6.2" cy="6.2" r="4" stroke="currentColor" strokeWidth="1.4" />
              <path d="m9.3 9.3 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </span>
          <input
            ref={campo}
            value={termo}
            placeholder="Buscar projeto ou rotina"
            aria-label="Buscar"
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
                        {f.tipo === 'ciclo' ? 'Rotina' : 'Projeto'}
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
        <Link className="iconbtn" href="/ajustes" title="Ajustes" aria-label="Ajustes"><Ic.ajustes /></Link>
      </div>
    </header>
  )
}
