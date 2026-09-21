/**
 * Quem foi chamado na conversa.
 *
 * O campo de mensagem escreve "@Primeiro " quando alguém escolhe uma pessoa na lista,
 * e o que fica guardado é texto puro. Este arquivo é quem lê esse texto de volta: diz
 * quais arrobas apontam para gente de verdade e se a mensagem chama uma pessoa.
 *
 * Duas pessoas com o mesmo primeiro nome são chamadas juntas. É o preço de guardar a
 * menção como texto, e o preço certo: a mensagem continua legível em qualquer lugar
 * que mostre texto cru, do e-mail ao dia em que ela sair daqui.
 */

const ARROBA = /@(\p{L}+)/gu

/** Sem acento e sem caixa, para "@Joao" achar "João". */
const simples = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** O primeiro nome, que é o que o campo escreve depois do arroba. */
export const primeiroNome = (nome: string) => simples(nome.trim().split(/\s+/)[0] ?? '')

/** Arroba grudado em letra ou número é e-mail, não chamada de gente. */
const soltoAntes = (texto: string, i: number) =>
  i === 0 || !/[\p{L}\p{N}_@.]/u.test(texto[i - 1])

export type Pedaco = { texto: string; chamada: boolean }

/** Quebra a mensagem em pedaços, marcando só os arrobas que batem com um nome da casa. */
export function pedacos(texto: string, nomes: string[]): Pedaco[] {
  const casa = new Set(nomes.map(primeiroNome))
  const saida: Pedaco[] = []
  let ate = 0
  for (const m of texto.matchAll(ARROBA)) {
    const i = m.index ?? 0
    if (!soltoAntes(texto, i) || !casa.has(simples(m[1]))) continue
    if (i > ate) saida.push({ texto: texto.slice(ate, i), chamada: false })
    saida.push({ texto: m[0], chamada: true })
    ate = i + m[0].length
  }
  if (ate < texto.length) saida.push({ texto: texto.slice(ate), chamada: false })
  return saida
}

/** Esta mensagem chama esta pessoa pelo nome? */
export function chama(texto: string, nome: string): boolean {
  const alvo = primeiroNome(nome)
  if (!alvo) return false
  for (const m of texto.matchAll(ARROBA)) {
    if (soltoAntes(texto, m.index ?? 0) && simples(m[1]) === alvo) return true
  }
  return false
}
