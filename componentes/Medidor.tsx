'use client'

import { useEffect, useState } from 'react'

/**
 * A régua, aberta por `?medir=1`.
 *
 * Ela existe porque o painel do navegador é uma barreira: é preciso saber o
 * atalho do sistema, achar a aba certa entre dez, e entender uma tabela feita
 * para quem programa. Pedir isso a quem só quer saber por que o app está lento
 * é empurrar o problema de volta.
 *
 * Não mede nada por conta própria: lê o que o navegador já anotou
 * (`performance`), que é a mesma fonte da aba Network. A diferença é que aqui
 * sai em português e em cinco linhas.
 *
 * Fica fora do caminho quando ninguém pede: sem `?medir=1` ela devolve nulo e
 * não custa um render.
 */
export function Medidor() {
  const [ligado, setLigado] = useState(false)
  const [texto, setTexto] = useState('')

  useEffect(() => {
    try { if (new URLSearchParams(location.search).get('medir') !== '1') return } catch { return }
    setLigado(true)
    // Dois segundos depois de a rede acalmar: antes disso as consultas do
    // carregamento ainda estão voando e a conta sai pela metade.
    const t = setTimeout(() => setTexto(medir()), 2500)
    return () => clearTimeout(t)
  }, [])

  if (!ligado) return null

  return (
    <div style={{
      position: 'fixed', inset: 'auto 10px 10px 10px', zIndex: 999,
      background: '#0d0f10', color: '#e8eae8', border: '1px solid #2a2f30',
      borderRadius: 12, padding: '12px 14px', font: '12px/1.5 ui-monospace,monospace',
      maxHeight: '55vh', overflow: 'auto', whiteSpace: 'pre-wrap', boxShadow: '0 10px 40px rgba(0,0,0,.6)',
    }}>
      {texto || 'medindo, aguarde...'}
      <button
        onClick={() => setTexto(medir())}
        style={{
          display: 'block', marginTop: 10, padding: '6px 12px', borderRadius: 8,
          border: '1px solid #3a4042', background: '#1a1e1f', color: '#e8eae8', font: 'inherit',
        }}>medir de novo</button>
    </div>
  )
}

function medir(): string {
  const n = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
  const r = performance.getEntriesByType('resource') as PerformanceResourceTiming[]

  const ms = (x: number) => `${Math.round(x)}ms`
  const l: string[] = []

  if (n) {
    l.push('A PAGINA')
    l.push(`  servidor respondeu em   ${ms(n.responseStart - n.requestStart)}`)
    l.push(`  html baixado em         ${ms(n.responseEnd - n.responseStart)}`)
    l.push(`  pronta para interagir   ${ms(n.domInteractive)}`)
    l.push(`  tudo carregado          ${ms(n.loadEventEnd || n.domComplete)}`)
  }

  const grupos = new Map<string, { n: number; soma: number; pior: number }>()
  let bytes = 0
  for (const x of r) {
    let host = 'outro'
    try { host = new URL(x.name).host } catch { /* nome estranho, agrupa em outro */ }
    const g = grupos.get(host) || { n: 0, soma: 0, pior: 0 }
    g.n++; g.soma += x.duration; g.pior = Math.max(g.pior, x.duration)
    grupos.set(host, g)
    bytes += x.transferSize || 0
  }

  l.push('')
  l.push('POR DESTINO')
  for (const [host, g] of [...grupos].sort((a, b) => b[1].soma - a[1].soma)) {
    l.push(`  ${host.slice(0, 30).padEnd(31)} ${String(g.n).padStart(3)} pedidos  pior ${ms(g.pior)}`)
  }
  l.push(`  baixado ao todo: ${Math.round(bytes / 1024)} kB`)

  l.push('')
  l.push('OS 6 MAIS DEMORADOS')
  for (const x of [...r].sort((a, b) => b.duration - a.duration).slice(0, 6)) {
    let onde = x.name
    // Só o caminho: a consulta inteira traz nome de coluna e filtro, que é
    // ruído aqui e pode carregar dado de quem está usando.
    try { const u = new URL(x.name); onde = u.host.split('.')[0] + u.pathname } catch { /* deixa como veio */ }
    l.push(`  ${ms(x.duration).padStart(7)}  ${onde.slice(0, 42)}`)
  }

  return l.join('\n')
}
