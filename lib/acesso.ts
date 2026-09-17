import type { Etapa, Fluxo, Item, Perfil } from './tipos'

/**
 * Quem vê o quê.
 *
 * A regra que o Leo pediu: cada pessoa vê o que é dela e o que trava o que é dela.
 * Quem tem gente abaixo vê também o trabalho dessa gente, para poder cobrar.
 * Tudo aqui é espelhado nas políticas do banco (supabase/schema.sql), então a tela
 * nunca é a única a decidir.
 */

/** Ids de todas as pessoas abaixo de alguém, em qualquer profundidade. */
export function equipeDe(perfilId: string, perfis: Perfil[]): Set<string> {
  const filhos = new Map<string, string[]>()
  for (const p of perfis) {
    if (!p.gestor_id) continue
    const lista = filhos.get(p.gestor_id)
    if (lista) lista.push(p.id)
    else filhos.set(p.gestor_id, [p.id])
  }
  const saida = new Set<string>()
  const fila = [perfilId]
  while (fila.length) {
    const atual = fila.pop()!
    for (const f of filhos.get(atual) || []) {
      if (saida.has(f)) continue
      saida.add(f)
      fila.push(f)
    }
  }
  return saida
}

/** A pessoa e todo mundo abaixo dela. */
export function alcance(eu: Perfil, perfis: Perfil[]): Set<string> {
  const s = equipeDe(eu.id, perfis)
  s.add(eu.id)
  return s
}

/** Esta pessoa toca diretamente neste item? */
const meuItem = (item: Item, ids: Set<string>) => !!item.resp_id && ids.has(item.resp_id)

/**
 * Itens que a pessoa enxerga dentro de uma esteira.
 * Os dela, os de quem está abaixo dela, e os que travam qualquer um desses.
 */
export function itensVisiveis(
  eu: Perfil, perfis: Perfil[], fluxo: Fluxo, todosItens: Item[],
): Item[] {
  const daEsteira = fluxo.etapas.flatMap((e) => e.itens)
  if (veTudo(eu)) return daEsteira

  const ids = alcance(eu, perfis)
  const meus = todosItens.filter((i) => meuItem(i, ids))
  const travas = new Set(meus.flatMap((i) => i.depende_de))

  return daEsteira.filter(
    (i) => meuItem(i, ids) || travas.has(i.id) || (i.autor_id ? ids.has(i.autor_id) && i.priv : false),
  )
}

export const veTudo = (eu: Perfil) => eu.papel === 'admin'

/**
 * Esta esteira aparece para a pessoa?
 * Aparece quando ela (ou alguém da equipe dela) é dona, aprova algum checkpoint,
 * responde por alguma tarefa, ou depende de alguma tarefa daqui.
 */
export function veFluxo(eu: Perfil, perfis: Perfil[], f: Fluxo, todosItens: Item[]): boolean {
  if (f.visib === 'so_eu') return f.autor_id === eu.id

  const ids = alcance(eu, perfis)

  // Participar da esteira sempre dá acesso, em qualquer visibilidade: não faria
  // sentido ter tarefa numa esteira que você não pode abrir.
  if (f.autor_id && ids.has(f.autor_id)) return true
  if (f.dono_id && ids.has(f.dono_id)) return true
  if (f.etapas.some((e) => e.aprovador_id && ids.has(e.aprovador_id))) return true
  if (f.etapas.some((e) => e.itens.some((i) => meuItem(i, ids)))) return true

  if (f.visib === 'escolhidas') return f.pessoas.some((x) => ids.has(x))

  if (veTudo(eu)) return true
  if (eu.ve_area && eu.area_id && f.area_id === eu.area_id) return true

  // Alguma tarefa minha depende de uma tarefa daqui.
  const daEsteira = new Set(f.etapas.flatMap((e) => e.itens.map((i) => i.id)))
  return todosItens.some((i) => meuItem(i, ids) && i.depende_de.some((d) => daEsteira.has(d)))
}

// --------------------------------------------------------------- permissões

/** Manda no processo: desenha checkpoints, critério de saída e prazos. */
export function mandaNoProcesso(eu: Perfil, f: Fluxo, perfis: Perfil[]): boolean {
  if (eu.papel === 'admin') return true
  if (f.autor_id === eu.id || f.dono_id === eu.id) return true
  if (eu.papel !== 'gestor') return false
  const equipe = equipeDe(eu.id, perfis)
  return !!(f.dono_id && equipe.has(f.dono_id))
}

/** Pode mexer numa tarefa (texto, responsável, remover). */
export function podeMexerNoItem(eu: Perfil, f: Fluxo, item: Item, perfis: Perfil[]): boolean {
  if (mandaNoProcesso(eu, f, perfis)) return true
  if (item.autor_id === eu.id) return true
  const ids = alcance(eu, perfis)
  return !!item.resp_id && ids.has(item.resp_id)
}

/** Prazo é compromisso com quem espera, então não é o executor que muda. */
export const podeMexerNoPrazo = (eu: Perfil, f: Fluxo, perfis: Perfil[]) =>
  mandaNoProcesso(eu, f, perfis)

/** Marcar como feito: quem executa, quem manda no processo, ou o gestor dele. */
export function podeConcluir(eu: Perfil, f: Fluxo, item: Item, perfis: Perfil[]): boolean {
  if (mandaNoProcesso(eu, f, perfis)) return true
  const ids = alcance(eu, perfis)
  return !!item.resp_id && ids.has(item.resp_id)
}

/** Tarefas que ainda travam esta. */
export function travasAbertas(item: Item, porId: Map<string, Item>): Item[] {
  return item.depende_de.map((id) => porId.get(id)).filter((x): x is Item => !!x && !x.feito)
}
