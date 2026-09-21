import { dias, hoje, iso, isoDe } from './datas'
import { status } from './regras'
import type { Area, Decisao, Fluxo, Item, Perfil } from './tipos'

/**
 * Os números do Desempenho.
 *
 * Duas regras que valem para tudo aqui:
 *
 * 1. **Número que não dá para calcular não aparece.** Tarefa concluída antes de o
 *    app guardar a hora da conclusão não entra em nenhuma conta de período, e a
 *    tela diz quantas ficaram de fora. Inventar a data faria o gráfico bonito e
 *    a conclusão falsa.
 *
 * 2. **Cada um vê o que pode ver.** Os dados chegam aqui já filtrados pelas
 *    políticas do banco, então o colaborador mede a si mesmo, o gestor mede o
 *    time dele e o administrador mede a empresa, sem nenhuma regra a mais.
 */

export type Periodo = 7 | 30 | 90

export const PERIODOS: { dias: Periodo; nome: string; sobre: string }[] = [
  { dias: 7, nome: '7 dias', sobre: 'a semana' },
  { dias: 30, nome: '30 dias', sobre: 'o mês' },
  { dias: 90, nome: '90 dias', sobre: 'o trimestre' },
]

const diaDe = (ts: string) => isoDe(ts)

/** Quantos dias atrás foi este instante. Hoje é 0. */
function atras(ts: string): number {
  return -dias(diaDe(ts))
}

export type Entrega = { item: Item; fluxo: Fluxo; quando: string; noPrazo: boolean | null }

/** Tudo que ficou pronto dentro da janela, com a informação de ter saído no prazo. */
export function entregas(fluxos: Fluxo[], janela: number, ate = 0): Entrega[] {
  const saida: Entrega[] = []
  for (const f of fluxos) {
    for (const et of f.etapas) {
      for (const i of et.itens) {
        if (!i.feito || !i.feito_em) continue
        const n = atras(i.feito_em)
        if (n < ate || n >= ate + janela) continue
        saida.push({
          item: i,
          fluxo: f,
          quando: diaDe(i.feito_em),
          noPrazo: i.prazo ? diaDe(i.feito_em) <= i.prazo : null,
        })
      }
    }
  }
  return saida.sort((a, b) => b.quando.localeCompare(a.quando))
}

/** Quantas tarefas prontas não têm hora de conclusão, e por isso ficam de fora. */
export function semHora(fluxos: Fluxo[]): number {
  let n = 0
  for (const f of fluxos) for (const et of f.etapas) for (const i of et.itens) {
    if (i.feito && !i.feito_em) n++
  }
  return n
}

export type Indicador = {
  chave: string
  rotulo: string
  valor: number
  /** Em porcentagem, o valor já vem de 0 a 100. */
  unidade: '' | '%'
  /** O mesmo número no período anterior, para dizer se melhorou. */
  antes: number | null
  /** Quantos casos entraram na conta. Sem base, a porcentagem não se mostra. */
  base: number
  sobre: string
  /** Para cima é bom, ou para cima é ruim? */
  maiorEhMelhor: boolean
}

function taxa(bons: number, total: number): number {
  return total ? Math.round((bons / total) * 100) : 0
}

export function indicadores(
  fluxos: Fluxo[], decisoes: Decisao[], anexosPorItem: (id: string) => unknown[], janela: Periodo,
): Indicador[] {
  const agora = entregas(fluxos, janela)
  const antes = entregas(fluxos, janela, janela)

  const comPrazo = agora.filter((e) => e.noPrazo !== null)
  const comPrazoAntes = antes.filter((e) => e.noPrazo !== null)

  const noPeriodo = (d: Decisao) => atras(d.criado_em) < janela
  const decidiu = decisoes.filter(noPeriodo)
  const aprovou = decidiu.filter((d) => d.tipo !== 'devolveu').length
  const devolveu = decidiu.filter((d) => d.tipo === 'devolveu').length

  const decidiuAntes = decisoes.filter((d) => atras(d.criado_em) >= janela && atras(d.criado_em) < janela * 2)
  const aprovouAntes = decidiuAntes.filter((d) => d.tipo !== 'devolveu').length

  const comProva = agora.filter((e) => anexosPorItem(e.item.id).length).length
  const comProvaAntes = antes.filter((e) => anexosPorItem(e.item.id).length).length

  return [
    {
      chave: 'entregues', rotulo: 'Entregues', valor: agora.length, unidade: '',
      antes: antes.length, base: agora.length, maiorEhMelhor: true,
      sobre: 'tarefas que ficaram prontas no período',
    },
    {
      chave: 'prazo', rotulo: 'No prazo', valor: taxa(comPrazo.filter((e) => e.noPrazo).length, comPrazo.length),
      unidade: '%', base: comPrazo.length, maiorEhMelhor: true,
      antes: comPrazoAntes.length ? taxa(comPrazoAntes.filter((e) => e.noPrazo).length, comPrazoAntes.length) : null,
      sobre: 'das entregas com prazo saíram até a data combinada',
    },
    {
      chave: 'primeira', rotulo: 'Aprovado de primeira', valor: taxa(aprovou, aprovou + devolveu),
      unidade: '%', base: aprovou + devolveu, maiorEhMelhor: true,
      antes: decidiuAntes.length ? taxa(aprovouAntes, decidiuAntes.length) : null,
      sobre: 'dos checkpoints passaram sem voltar para trás',
    },
    {
      chave: 'prova', rotulo: 'Com prova', valor: taxa(comProva, agora.length),
      unidade: '%', base: agora.length, maiorEhMelhor: true,
      antes: antes.length ? taxa(comProvaAntes, antes.length) : null,
      sobre: 'das entregas têm comprovante, contrato ou foto anexada',
    },
  ]
}

/** Uma barra por dia (ou por semana, quando o período é longo). */
export type Barra = { rotulo: string; titulo: string; total: number; noPrazo: number }

export function porDia(fluxos: Fluxo[], janela: Periodo): Barra[] {
  const passo = janela <= 7 ? 1 : janela <= 30 ? 3 : 7
  const grupos = Math.ceil(janela / passo)
  const saida: Barra[] = []
  const feitas = entregas(fluxos, janela)

  for (let g = grupos - 1; g >= 0; g--) {
    const de = g * passo
    const ate = de + passo
    const dentro = feitas.filter((e) => {
      const n = atras(e.item.feito_em!)
      return n >= de && n < ate
    })
    const x = hoje()
    x.setDate(x.getDate() - de)
    const fim = iso(x)
    x.setDate(x.getDate() - (passo - 1))
    const inicio = iso(x)
    saida.push({
      rotulo: passo === 1
        ? ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'][new Date(fim + 'T12:00:00').getDay()]
        : fim.slice(8, 10) + '/' + fim.slice(5, 7),
      titulo: passo === 1 ? fim : `${inicio} a ${fim}`,
      total: dentro.length,
      noPrazo: dentro.filter((e) => e.noPrazo !== false).length,
    })
  }
  return saida
}

export type LinhaPessoa = {
  pessoa: Perfil
  abertas: number
  atrasadas: number
  entregues: number
  noPrazo: number
}

/** A carga de cada pessoa: o que está na mão dela, e o que ela entregou. */
export function porPessoa(fluxos: Fluxo[], perfis: Perfil[], janela: Periodo): LinhaPessoa[] {
  const mapa = new Map<string, LinhaPessoa>()
  const pega = (id: string) => {
    let l = mapa.get(id)
    if (!l) {
      const p = perfis.find((x) => x.id === id)
      if (!p) return null
      l = { pessoa: p, abertas: 0, atrasadas: 0, entregues: 0, noPrazo: 0 }
      mapa.set(id, l)
    }
    return l
  }

  for (const f of fluxos) {
    if (f.concluido) continue
    const et = f.etapas[f.atual]
    if (!et) continue
    for (const i of et.itens) {
      if (i.feito || !i.resp_id) continue
      const l = pega(i.resp_id)
      if (!l) continue
      l.abertas++
      if (i.prazo && dias(i.prazo) < 0) l.atrasadas++
    }
  }

  for (const e of entregas(fluxos, janela)) {
    if (!e.item.resp_id) continue
    const l = pega(e.item.resp_id)
    if (!l) continue
    l.entregues++
    if (e.noPrazo !== false) l.noPrazo++
  }

  return [...mapa.values()].sort((a, b) =>
    b.atrasadas - a.atrasadas || b.abertas - a.abertas || a.pessoa.nome.localeCompare(b.pessoa.nome, 'pt-BR'))
}

export type Gargalo = { fluxo: Fluxo; etapa: string; parado: number; aprovador: string | null; faltam: number }

/**
 * Onde a esteira está presa.
 *
 * O tempo parado conta do prazo do checkpoint, quando existe, senão da tarefa mais
 * velha que ainda não saiu. É aproximado, e é o que dá para saber com honestidade
 * sem guardar a hora em que a esteira chegou em cada checkpoint.
 */
export function gargalos(fluxos: Fluxo[], nomeDe: (id: string | null) => string): Gargalo[] {
  const saida: Gargalo[] = []
  for (const f of fluxos) {
    if (f.concluido) continue
    const et = f.etapas[f.atual]
    if (!et) continue
    const st = status(f)
    if (st !== 'late' && st !== 'hold') continue

    const abertos = et.itens.filter((i) => !i.feito)
    const prazos = [et.prazo, ...abertos.map((i) => i.prazo)].filter(Boolean) as string[]
    const maisVelho = prazos.sort()[0]
    saida.push({
      fluxo: f,
      etapa: et.nome,
      parado: maisVelho ? Math.max(0, -dias(maisVelho)) : 0,
      aprovador: et.aprovador_id ? nomeDe(et.aprovador_id) : null,
      faltam: abertos.length,
    })
  }
  return saida.sort((a, b) => b.parado - a.parado).slice(0, 6)
}

export type SaudeArea = { area: Area; rotinas: number; atrasadas: number; entregues: number }

export function porArea(fluxos: Fluxo[], areas: Area[], janela: Periodo): SaudeArea[] {
  const feitas = entregas(fluxos, janela)
  return areas
    .map((a) => {
      const rotinas = fluxos.filter((f) => f.area_id === a.id && f.tipo === 'ciclo' && !f.concluido)
      return {
        area: a,
        rotinas: rotinas.length,
        atrasadas: rotinas.filter((f) => status(f) === 'late').length,
        entregues: feitas.filter((e) => e.fluxo.area_id === a.id).length,
      }
    })
    .filter((l) => l.rotinas || l.entregues)
    .sort((a, b) => b.atrasadas - a.atrasadas || b.entregues - a.entregues)
}
