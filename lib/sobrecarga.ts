import { dias } from './datas'
import { entregas } from './desempenho'
import type { Fluxo, Perfil } from './tipos'

/**
 * O índice de sobrecarga de cada pessoa.
 *
 * Um número de 0 a 100 sobre uma pessoa é perigoso: usado errado, vira rótulo.
 * Então três decisões guiam tudo aqui.
 *
 * **1. Sobrecarga é demanda contra capacidade demonstrada, não tamanho de fila.**
 * Quem tem vinte tarefas e entrega vinte por semana não está sobrecarregado. Quem
 * tem cinco e entrega uma por mês está. Por isso a conta usa a vazão real da
 * pessoa, tirada de quando as tarefas dela ficaram prontas.
 *
 * **2. As partes aparecem, não só o número.** A tela mostra "5 de 12 atrasadas,
 * fila de 24 dias para 9 dias de prazo". Assim o número é discutível: dá para
 * olhar e dizer "essa está errada, aquela tarefa nem é minha". Um 78 sozinho não
 * se discute, só se obedece.
 *
 * **3. Sem base, não há número.** Menos de duas tarefas abertas e menos de duas
 * entregues no período, e a resposta é "pouco para medir". A mesma regra do
 * Desempenho: número que não dá para calcular não aparece.
 *
 * **A forma da conta importou mais que os pesos.** A primeira versão somava as
 * três partes com peso, e tinha um defeito que só apareceu no teste: sem nada
 * atrasado, o índice não passava de 55. Uma pessoa com fila de 150 dias e cinco
 * dias de prazo nunca seria sinalizada, o que mata a única utilidade real do
 * número, que é avisar ANTES de o atraso acontecer.
 *
 * Então a conta virou outra: sobrecarga é o MAIOR entre dois motivos que bastam
 * sozinhos, e não a média deles.
 *
 *   atraso   promessa já quebrada, o que se vê
 *   aperto   a fila não cabe no tempo que tem, o que se prevê
 *
 * Carregar mais que os colegas não sobrecarrega ninguém sozinho, porque pode ser
 * só o trabalho sendo diferente. Entra como agravante, com peso pequeno.
 *
 * **O aperto não satura.** A primeira versão cortava em "o dobro do prazo" e
 * pronto: no exemplo real, os quatro deram 91 e 96, e um índice que dá a mesma
 * coisa para todo mundo não distingue ninguém. Agora a curva cresce devagar e
 * nunca chega a 1, então a ordem entre as pessoas continua legível mesmo quando
 * o time inteiro está apertado.
 *
 * **E a razão aparece crua.** "A fila é 8 vezes o prazo" diz mais que "índice
 * 91", porque é a frase que um gestor usa para decidir. O índice serve para
 * ordenar; a razão serve para entender.
 */

export const PESOS = { motivo: 0.85, excesso: 0.15 }

export type Faixa = 'tranquilo' | 'apertado' | 'sobrecarregado' | 'sem-base'

/**
 * Os nomes das faixas são substantivos, não adjetivos, e isso é de propósito.
 *
 * O app não sabe o gênero de ninguém, e deduzir pelo nome erraria com gente de
 * verdade. "Marina está sobrecarregado" é o tipo de erro que some no teste e
 * aparece na frente do cliente. Substantivo não concorda com nada: "Marina está
 * em sobrecarga" serve para qualquer pessoa.
 */
export const FAIXAS: Record<Faixa, { nome: string; sobre: string }> = {
  tranquilo: { nome: 'Com folga', sobre: 'a fila cabe no tempo que tem' },
  apertado: { nome: 'No limite', sobre: 'dá, mas sem folga para imprevisto' },
  sobrecarregado: { nome: 'Em sobrecarga', sobre: 'a fila não cabe no tempo que tem' },
  'sem-base': { nome: 'Pouco para medir', sobre: 'falta histórico para dizer algo' },
}

export type Carga = {
  pessoa: Perfil
  /** 0 a 100, ou nulo quando não há base para dizer. */
  indice: number | null
  faixa: Faixa
  abertas: number
  atrasadas: number
  entregues: number
  /** Tarefas por dia, tirada do que ela entregou na janela. */
  vazao: number
  /** Quantos dias, no ritmo dela, para vazar a fila de hoje. */
  diasDeFila: number
  /** Quantos dias ela tem até o prazo mais distante do que está aberto. */
  horizonte: number
  /** diasDeFila / horizonte. Acima de 1, a fila não cabe no prazo. */
  razao: number
  /** Usou o ritmo médio do time porque ela não entregou nada na janela. */
  semRitmoProprio: boolean
  /** As partes do índice, para a tela poder mostrar de onde ele vem. */
  partes: { atraso: number; aperto: number; fila: number }
}

const mediana = (ns: number[]) => {
  if (!ns.length) return 0
  const x = [...ns].sort((a, b) => a - b)
  const m = Math.floor(x.length / 2)
  return x.length % 2 ? x[m] : (x[m - 1] + x[m]) / 2
}

/**
 * Cresce sem nunca chegar a 1. Em 1 vez o prazo dá 0,33; em 2 vezes, 0,50; em
 * 10 vezes, 0,83. Assim quem está dez vezes pior que o prazo não empata com quem
 * está duas vezes pior, que é o que um corte fixo fazia.
 */
const suave = (razao: number) => 1 - 1 / (1 + Math.max(0, razao) / 2)

/**
 * A faixa sai da RAZÃO, não do índice, porque a razão quer dizer algo:
 * abaixo de 1 a fila cabe no prazo, até 2 cabe apertado, acima de 2 não cabe.
 * O atraso já materializado puxa a faixa para cima sozinho.
 */
const faixaDe = (razao: number, atraso: number): Faixa => {
  if (razao > 2 || atraso >= 0.5) return 'sobrecarregado'
  if (razao > 1 || atraso > 0) return 'apertado'
  return 'tranquilo'
}

export function sobrecarga(fluxos: Fluxo[], perfis: Perfil[], janela: number): Carga[] {
  const feitas = entregas(fluxos, janela)

  const bruto = perfis.filter((p) => p.ativo).map((pessoa) => {
    const abertas: { prazo: string | null }[] = []
    for (const f of fluxos) {
      if (f.concluido || f.travado_motivo) continue
      const et = f.etapas[f.atual]
      if (!et) continue
      for (const i of et.itens) {
        if (i.feito || i.resp_id !== pessoa.id) continue
        abertas.push({ prazo: i.prazo })
      }
    }
    const atrasadas = abertas.filter((i) => i.prazo && dias(i.prazo) < 0).length
    const entregues = feitas.filter((e) => e.item.resp_id === pessoa.id).length

    // O prazo mais distante do que está aberto e ainda não venceu. É o tempo que
    // ela tem para vazar a fila. Sem prazo nenhum, duas semanas como referência.
    const futuros = abertas.map((i) => (i.prazo ? dias(i.prazo) : null))
      .filter((d): d is number => d !== null && d >= 0)
    const horizonte = Math.max(1, futuros.length ? Math.max(...futuros) : 14)

    return { pessoa, abertas: abertas.length, atrasadas, entregues, horizonte }
  })

  // O ritmo do time serve de referência para quem não entregou nada na janela.
  const ritmos = bruto.filter((b) => b.entregues > 0).map((b) => b.entregues / janela)
  const ritmoTime = mediana(ritmos)
  const filaTipica = Math.max(1, mediana(bruto.filter((b) => b.abertas > 0).map((b) => b.abertas)))

  return bruto.map((b) => {
    const vazaoPropria = b.entregues / janela
    const semRitmoProprio = vazaoPropria === 0
    const vazao = semRitmoProprio ? ritmoTime : vazaoPropria
    const diasDeFila = vazao > 0 ? b.abertas / vazao : Infinity

    const base: Carga = {
      ...b,
      indice: null,
      faixa: 'sem-base',
      vazao: vazaoPropria,
      diasDeFila,
      razao: 0,
      semRitmoProprio,
      partes: { atraso: 0, aperto: 0, fila: 0 },
    }

    // Pouco para medir: sem fila e sem entrega, qualquer número seria invenção.
    if (b.abertas < 2 && b.entregues < 2) return base
    // Ninguém no time entregou nada, então não há ritmo de onde partir.
    if (!Number.isFinite(diasDeFila)) return base

    const atraso = Math.min(1, b.atrasadas / Math.max(1, b.abertas))
    const razao = diasDeFila / b.horizonte
    const aperto = suave(razao)
    // Carregar o dobro da fila típica do time é o teto desta parte.
    const fila = Math.min(1, b.abertas / filaTipica / 2)

    // O maior dos dois motivos, não a média: cada um basta sozinho.
    const motivo = Math.max(atraso, aperto)
    const indice = Math.round(
      100 * Math.min(1, PESOS.motivo * motivo + PESOS.excesso * fila),
    )

    return {
      ...base, indice, razao,
      faixa: faixaDe(razao, atraso),
      partes: { atraso, aperto, fila },
    }
  }).sort((a, b) => (b.indice ?? -1) - (a.indice ?? -1))
}

/**
 * O time inteiro com fila maior que o prazo.
 *
 * Quando isso acontece, o problema não é sobrecarga de uma pessoa: é mais
 * trabalho do que o time vaza. Dizer isso é mais útil do que pintar todo mundo
 * de vermelho e deixar o gestor procurar culpado.
 */
export function timeInteiroApertado(cargas: Carga[]): boolean {
  const medidos = cargas.filter((c) => c.indice !== null)
  return medidos.length >= 3 && medidos.every((c) => c.razao > 1)
}

/** Uma frase curta explicando de onde o índice veio. É o que a tela mostra. */
export function porque(c: Carga): string {
  if (c.indice === null) {
    return c.abertas || c.entregues
      ? 'pouca coisa na fila e pouco entregue no período'
      : 'nada na fila e nada entregue no período'
  }
  const partes: string[] = []
  if (c.atrasadas) partes.push(`${c.atrasadas} de ${c.abertas} atrasada${c.atrasadas === 1 ? '' : 's'}`)
  else partes.push(`${c.abertas} na fila, nenhuma atrasada`)

  if (Number.isFinite(c.diasDeFila)) {
    const d = Math.round(c.diasDeFila)
    const x = c.razao >= 1.6 ? `, ${Math.round(c.razao)} vezes o prazo` : ''
    partes.push(`neste ritmo são ${d} ${d === 1 ? 'dia' : 'dias'} de fila para ${c.horizonte} de prazo${x}`)
  }
  if (c.semRitmoProprio) partes.push('sem entrega no período, usei o ritmo do time')
  return partes.join(', ')
}
