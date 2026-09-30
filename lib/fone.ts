/**
 * As formas pelas quais o mesmo telefone brasileiro aparece.
 *
 * Espelho de `formas_do_fone` (seção 47 do schema), e mexeu num, mexa no outro.
 * Lá ela serve para RECONHECER quem escreveu; aqui serve para ACERTAR para onde
 * mandar, e a segunda faltava.
 *
 * O WhatsApp entrega número brasileiro antigo SEM o nono dígito: quem cadastrou
 * +55 42 99978-3288 é conhecido lá como 554299783288. A entrada já sabia disso
 * e a saída não: o app guardava a forma com o nove, mandava para ela, e a Meta
 * recusava com "Recipient phone number not in allowed list". A mensagem fala do
 * destinatário, então parece problema de cadastro na Meta, e a pessoa vai
 * mexer na lista de permissão em vez de olhar o número.
 *
 * Fora do Brasil devolve uma forma só: inventar variação de número de outro
 * país é o caminho para mandar mensagem para um desconhecido.
 */
export function formasDoFone(bruto: string): string[] {
  const d = (bruto || '').replace(/[^0-9]/g, '')
  if (!d) return []
  if (!d.startsWith('55')) return [d]

  const area = d.slice(2, 4)
  const resto = d.slice(4)
  // Com nove dígitos e começando por 9, a outra forma é sem ele.
  if (resto.length === 9 && resto.startsWith('9')) return [d, `55${area}${resto.slice(1)}`]
  // Com oito, a outra forma é com o nove na frente.
  if (resto.length === 8) return [d, `55${area}9${resto}`]
  return [d]
}
