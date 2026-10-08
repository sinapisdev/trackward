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


/** Dígitos puros, como a Meta e o `wa.me` querem o destinatário. */
export const soDigitos = (bruto: string) => (bruto || '').replace(/[^0-9]/g, '')

/**
 * O telefone escrito de qualquer jeito, guardado de um jeito só.
 *
 * Quem digita escreve "42 99978-3288", porque é assim que o número está na
 * agenda dele. Exigir o +55 é exigir que a pessoa saiba o que o app precisa, e
 * é o tipo de campo que recusa em silêncio e não diz por quê. Dez ou onze
 * dígitos sem país é Brasil, que é onde o app é vendido; com país, respeita o
 * que foi escrito.
 *
 * Guardado em `+<país><número>`, que é o E.164: é o formato que a Twilio, a
 * Meta e o Supabase esperam, e é o mesmo de `avisos_contato.telefone`, para o
 * mesmo número não existir em duas formas no banco.
 *
 * Mora aqui e não em `lib/convite.ts`, onde nasceu, porque a entrada por
 * telefone precisa da MESMA régua: duas cópias seria o jeito de um dia o
 * convite aceitar um número que o cadastro recusa.
 */
export function paraE164(bruto: string): string {
  const t = (bruto || '').trim()
  const d = soDigitos(t)
  if (!d) return ''
  /* O MAIS é o sinal de que o país já veio, e jogá-lo fora antes de olhar o
     tamanho era o defeito: +1 415 555 2671 tem onze dígitos, caía na regra do
     celular brasileiro e virava +5514155552671. Quem escreveu o mais disse de
     qual país é o número, e o app não tem por que discordar. */
  if (t.startsWith('+')) return d.length >= 8 && d.length <= 15 ? `+${d}` : ''
  // Sem o mais, é Brasil: fixo com DDD são dez, celular com o nono são onze.
  if (d.length === 10 || d.length === 11) return `+55${d}`
  // Doze ou mais sem o mais ainda é país junto, escrito sem ele.
  return d.length >= 12 && d.length <= 15 ? `+${d}` : ''
}

/** Como ele aparece na tela: +55 (42) 99978-3288. */
export function foneEscrito(e164: string): string {
  const d = soDigitos(e164)
  if (!d.startsWith('55') || d.length < 12) return e164 || ''
  const ddd = d.slice(2, 4)
  const r = d.slice(4)
  const meio = r.length === 9 ? `${r.slice(0, 5)}-${r.slice(5)}` : `${r.slice(0, 4)}-${r.slice(4)}`
  return `+55 (${ddd}) ${meio}`
}
