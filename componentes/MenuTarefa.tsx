'use client'

import { useEffect, useRef, useState } from 'react'
import { Ic } from './Icones'

/**
 * O menu da tarefa, atrás de uma seta.
 *
 * Eram dois ícones soltos na ponta da linha, lápis e X, e o arranjo tinha dois
 * defeitos. O primeiro é que **apagar ficava a um toque de editar**, do lado,
 * do mesmo tamanho e com o mesmo peso visual: a ação que não tem volta não pode
 * ter a mesma cara da que tem. O segundo é que ele não cabia mais: anexar e
 * escrever uma nota sobre a tarefa são duas coisas novas, e a linha viraria
 * quatro ícones que ninguém sabe o que fazem.
 *
 * Atrás de uma seta, as ações ganham NOME, que é o que um ícone de lápis nunca
 * teve. E a seta continua aparecendo só no passar do mouse, como estava: a
 * linha existe para mostrar o trabalho, não os botões.
 *
 * **Apagar fica no fim e separado**, e é a única com cor. Não é enfeite: a
 * distância e o fio são o que impedem o toque errado numa lista onde as outras
 * três são inofensivas.
 */
export type ItemDeMenu = {
  rotulo: string
  icone: React.ReactNode
  /** Só a que não tem volta. Ela desce para o fim, ganha fio e ganha cor. */
  perigo?: boolean
  aoEscolher: () => void
}

export function MenuTarefa({ titulo, itens }: { titulo: string; itens: ItemDeMenu[] }) {
  const [aberto, setAberto] = useState(false)
  const caixa = useRef<HTMLDivElement>(null)

  /**
   * Sai por qualquer porta: Esc, clique fora e escolher.
   *
   * É a mesma regra do tutorial, e pelo mesmo motivo: a primeira coisa que
   * alguém faz com uma caixa que apareceu é tentar fechá-la, e uma que só fecha
   * pelo próprio botão é uma que prende.
   */
  useEffect(() => {
    if (!aberto) return
    const fora = (e: MouseEvent) => {
      if (!caixa.current?.contains(e.target as Node)) setAberto(false)
    }
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setAberto(false) }
    document.addEventListener('mousedown', fora)
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('mousedown', fora)
      document.removeEventListener('keydown', tecla)
    }
  }, [aberto])

  if (!itens.length) return null

  const normais = itens.filter((i) => !i.perigo)
  const perigosas = itens.filter((i) => i.perigo)

  return (
    <div className={`mnu ${aberto ? 'on' : ''}`} ref={caixa}>
      {/* `stopPropagation` porque a linha inteira costuma ser clicável: na fila,
          clicar nela abre a gaveta, e abrir a gaveta ao pedir o menu seria o
          app fazendo duas coisas para um gesto só. */}
      <button className="iconbtn mnu-seta" aria-haspopup="menu" aria-expanded={aberto}
        aria-label={`Opções de ${titulo}`} title="Opções"
        onClick={(e) => { e.stopPropagation(); setAberto((v) => !v) }}><Ic.chev /></button>

      {aberto && (
        <div className="mnu-caixa" role="menu">
          {[...normais, ...perigosas].map((i, k) => (
            <button key={i.rotulo} role="menuitem"
              className={`mnu-op ${i.perigo ? 'perigo' : ''} ${i.perigo && k > 0 ? 'corte' : ''}`}
              onClick={(e) => { e.stopPropagation(); setAberto(false); i.aoEscolher() }}>
              {i.icone}{i.rotulo}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
