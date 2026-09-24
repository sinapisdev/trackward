import type { Nota } from './tipos'

/**
 * As notas: o caderno de bolso de cada pessoa.
 *
 * O problema que isto resolve: hoje o que não é tarefa não tem lugar. A ideia que
 * veio no banho, o número que alguém falou na reunião, o nome de um fornecedor
 * que vale lembrar. Tudo isso termina em recado de WhatsApp para si mesmo, e
 * recado de WhatsApp para si mesmo não se acha de novo.
 *
 * O desenho é o do Obsidian, e por um motivo: **pasta não sobrevive ao uso.**
 * Toda organização por categoria funciona nas primeiras trinta notas e desanda
 * nas trezentas, porque a nota nova sempre cabe em duas pastas e o dono decide
 * errado. O que sobrevive é a ligação escrita no meio do texto: você escreve
 * [[nome da outra nota]] onde faz sentido, e o acervo se costura sozinho.
 *
 * Duas consequências de graça, e são elas que fazem valer:
 *
 *   quem me cita   abrir uma nota mostra todas as outras que apontam para ela,
 *                  sem ninguém ter mantido índice nenhum
 *   link vazio     [[uma nota que não existe]] é um convite, não um erro. Clicar
 *                  cria a nota já ligada, que é como um acervo cresce de verdade
 */

/** O jeito de escrever ligação: [[titulo da outra nota]]. */
export const LIGACAO = /\[\[([^\[\]]+)\]\]/g

/** Dois títulos são o mesmo se só diferem em caixa, acento ou espaço sobrando. */
export const mesmaChave = (t: string) =>
  t.normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase().replace(/\s+/g, ' ')

/** Os títulos citados dentro de um texto, na ordem, sem repetir. */
export function citadas(texto: string): string[] {
  const vistas = new Set<string>()
  const saida: string[] = []
  for (const m of texto.matchAll(LIGACAO)) {
    const t = m[1].trim()
    if (!t) continue
    const k = mesmaChave(t)
    if (vistas.has(k)) continue
    vistas.add(k)
    saida.push(t)
  }
  return saida
}

/** A nota com este título, se existir. */
export const porTitulo = (notas: Nota[], titulo: string) =>
  notas.find((n) => mesmaChave(n.titulo) === mesmaChave(titulo)) || null

/**
 * Para onde esta nota aponta.
 *
 * Devolve o título sempre, e a nota só quando ela existe. O título sem nota é o
 * link vazio, que a tela mostra de outro jeito e vira convite para criar.
 */
export function saidas(nota: Nota, notas: Nota[]): { titulo: string; nota: Nota | null }[] {
  return citadas(nota.texto)
    .filter((t) => mesmaChave(t) !== mesmaChave(nota.titulo))
    .map((titulo) => ({ titulo, nota: porTitulo(notas, titulo) }))
}

/** Quem aponta para esta nota. É o índice que ninguém precisou manter. */
export function entradas(nota: Nota, notas: Nota[]): Nota[] {
  const k = mesmaChave(nota.titulo)
  return notas.filter((n) => n.id !== nota.id && citadas(n.texto).some((t) => mesmaChave(t) === k))
}

/** Uma nota que ninguém cita e que não cita ninguém. O acervo não a alcança. */
export const solta = (nota: Nota, notas: Nota[]) =>
  !citadas(nota.texto).length && !entradas(nota, notas).length

/** A ordem da lista: fixada primeiro, depois o que foi mexido mais recentemente. */
export const ordenar = (notas: Nota[]) =>
  [...notas].sort((a, b) =>
    a.fixada === b.fixada ? b.mexido_em.localeCompare(a.mexido_em) : a.fixada ? -1 : 1)

/**
 * Busca.
 *
 * Título pesa mais que corpo, porque quem digita "fornecedor" quase sempre quer a
 * nota chamada fornecedor, não as oito que mencionam a palavra. Sem acento e sem
 * caixa, porque ninguém lembra como escreveu.
 */
/**
 * @param mais texto de fora da nota que também conta na busca: o nome da área e
 *   da track, e o que foi dito na conversa dentro dela. Sem isto, procurar
 *   "betoneira" não acha a nota onde você perguntou sobre betoneira para a
 *   leitura, que é exatamente onde a resposta está. Quem procura não lembra se
 *   escreveu no corpo ou perguntou depois.
 */
export function buscar(notas: Nota[], termo: string, mais?: (n: Nota) => string): Nota[] {
  const q = mesmaChave(termo)
  if (!q) return ordenar(notas)
  const palavras = q.split(' ').filter(Boolean)
  const pontos = (n: Nota) => {
    const t = mesmaChave(n.titulo)
    const c = mesmaChave(n.texto)
    const e = mais ? mesmaChave(mais(n)) : ''
    let p = 0
    for (const w of palavras) {
      if (t === w) p += 100
      else if (t.includes(w)) p += 10
      if (c.includes(w)) p += 1
      if (e.includes(w)) p += 1
    }
    // Só entra quem bateu em TODAS as palavras, em algum lugar.
    return palavras.every((w) => t.includes(w) || c.includes(w) || e.includes(w)) ? p : 0
  }
  return notas
    .map((n) => ({ n, p: pontos(n) }))
    .filter((x) => x.p > 0)
    .sort((a, b) => b.p - a.p || b.n.mexido_em.localeCompare(a.n.mexido_em))
    .map((x) => x.n)
}

/**
 * O que a nota parece ter a ver, sem ninguém ter ligado nada.
 *
 * Isto é o que o Leo pediu com "a pessoa joga as ideias lá e o app vai
 * trabalhando isso": a nota nova chega e o app aponta as antigas que falam do
 * mesmo. A conta é bruta de propósito, palavras incomuns em comum, porque bruta
 * e entendível vale mais aqui do que fina e misteriosa: a pessoa precisa olhar a
 * sugestão e concordar em dois segundos.
 */
const COMUNS = new Set([
  'para','com','uma','que','the','dos','das','por','como','isso','mais','sobre','fazer',
  'quando','onde','ser','ter','está','esta','pode','muito','tem','sem','nao','não','aqui',
  'ele','ela','eles','elas','meu','minha','seu','sua','nos','nas','num','numa','pelo','pela',
])

export function palavrasDe(texto: string): Set<string> {
  return new Set(
    mesmaChave(texto)
      .replace(LIGACAO, ' ')
      .split(/[^\p{L}\p{N}]+/u)
      .filter((w) => w.length >= 4 && !COMUNS.has(w)),
  )
}

/**
 * As notas que falam do mesmo que um texto qualquer.
 *
 * É `parecidas` sem nota de origem, e existe para a conversa solta com a
 * leitura: ali não há nota para comparar, há o que a pessoa acabou de dizer, e
 * é ele que precisa encontrar o que ela guardou antes.
 */
export function parecidasCom(texto: string, notas: Nota[], quantas = 4, fora: string[] = []): Nota[] {
  const minhas = palavrasDe(texto)
  if (minhas.size < 2) return []
  const ignorar = new Set(fora)
  return notas
    .filter((n) => !n.arquivada && !ignorar.has(n.id))
    .map((n) => {
      const dela = palavrasDe(`${n.titulo} ${n.texto}`)
      let iguais = 0
      for (const w of minhas) if (dela.has(w)) iguais++
      return { n, iguais }
    })
    .filter((x) => x.iguais >= 2)
    .sort((a, b) => b.iguais - a.iguais)
    .slice(0, quantas)
    .map((x) => x.n)
}

export function parecidas(nota: Nota, notas: Nota[], quantas = 3): Nota[] {
  const minhas = palavrasDe(`${nota.titulo} ${nota.texto}`)
  if (minhas.size < 2) return []
  const jaLigadas = new Set([
    ...citadas(nota.texto).map(mesmaChave),
    ...entradas(nota, notas).map((n) => mesmaChave(n.titulo)),
  ])
  return notas
    .filter((n) => n.id !== nota.id && !n.arquivada && !jaLigadas.has(mesmaChave(n.titulo)))
    .map((n) => {
      const dela = palavrasDe(`${n.titulo} ${n.texto}`)
      let iguais = 0
      for (const w of minhas) if (dela.has(w)) iguais++
      return { n, iguais }
    })
    .filter((x) => x.iguais >= 2)
    .sort((a, b) => b.iguais - a.iguais)
    .slice(0, quantas)
    .map((x) => x.n)
}

/**
 * Um título a partir do que a pessoa despejou.
 *
 * A primeira linha, ou a primeira frase, cortada onde dá. Quem escreve no despejo
 * não escreve título: escreve o pensamento e segue.
 */
export function tituloDe(texto: string, limite = 60): string {
  const primeira = texto.trim().split('\n')[0].trim()
  // A primeira frase, quando ela já diz algo por si. Um "Ok." no começo não é
  // título de nada, e nesse caso vale mais a linha inteira.
  const frase = primeira.split(/(?<=[.!?])\s/)[0].trim()
  const cru = (frase.length >= 12 ? frase : primeira).replace(/\s+/g, ' ')
  if (cru.length <= limite) return cru || 'Sem título'
  const corte = cru.slice(0, limite)
  const espaco = corte.lastIndexOf(' ')
  return `${(espaco > 24 ? corte.slice(0, espaco) : corte).trim()}...`
}

/** Escreve a ligação no fim do texto, sem duplicar o que já está ligado. */
export function ligar(texto: string, titulo: string): string {
  if (citadas(texto).some((t) => mesmaChave(t) === mesmaChave(titulo))) return texto
  const fim = texto.trimEnd()
  return `${fim}${fim ? '\n\n' : ''}[[${titulo}]]`
}
