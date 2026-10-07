/**
 * O convite: o que a empresa digita, e o que a pessoa recebe.
 *
 * Puro de propósito, como `lib/comandar.ts`: recebe o que foi digitado, devolve
 * o que isso quer dizer, e não escreve em lugar nenhum. Quem grava é quem
 * chamou, porque a escrita é diferente dos dois lados (navegador com a sessão,
 * servidor com a chave), e porque assim as regras daqui se testam sem banco.
 *
 * **O convite carrega uma coisa: quem entra e como.** Área, gestor e "vê a área
 * inteira" saíram dele e ficaram na tabela de Equipe, onde já eram editáveis com
 * um clique. Pedi-los na porta é decidir a organização de alguém antes de essa
 * pessoa existir, que é o mesmo erro de montar a trilha inteira num formulário
 * só: ninguém conhece a hierarquia de alguém no dia em que o convida.
 */

/** Dígitos puros, como a Meta quer o destinatário. */
const digitos = (bruto: string) => (bruto || '').replace(/[^0-9]/g, '')

/**
 * O telefone escrito de qualquer jeito, guardado de um jeito só.
 *
 * Quem convida digita "42 99978-3288", porque é assim que o número está na
 * agenda dele. Exigir o +55 é exigir que a pessoa saiba o que o app precisa, e
 * é o tipo de campo que recusa em silêncio e não diz por quê. Dez ou onze
 * dígitos sem país é Brasil, que é onde o app é vendido; com país, respeita o
 * que foi escrito.
 *
 * Guardado em `+<país><número>`, igual a `avisos_contato.telefone`, para o
 * mesmo número não existir em duas formas no banco.
 */
export function foneDoConvite(bruto: string): string {
  const d = digitos(bruto)
  if (!d) return ''
  // Fixo com DDD são dez; celular com o nono dígito, onze.
  if (d.length === 10 || d.length === 11) return `+55${d}`
  // Já veio com país. Menos que doze não é país mais DDD mais número.
  return d.length >= 12 && d.length <= 15 ? `+${d}` : ''
}

/** Parece um endereço de e-mail? A conferência de verdade é do provedor. */
export const pareceEndereco = (bruto: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((bruto || '').trim())

/**
 * `AlvoDoConvite` e não `Alvo`: `Alvo` já é o da proposta, e tipo curto
 * repetido quebra uma tela pela outra, do mesmo jeito que `.trk` e `.ag-linha`
 * fizeram no CSS. O compilador acusou na hora; o CSS não acusa.
 */
export type AlvoDoConvite =
  | { como: 'fone'; fone: string; email: null }
  | { como: 'email'; email: string; fone: null }

/**
 * O que a pessoa digitou no campo único, e o que isso é.
 *
 * Um campo e não dois, e isto é a metade do ganho: dois campos obrigam a
 * escolher a porta antes de ter o dado na mão, e quem convida tem UMA das duas
 * coisas, nunca as duas. Telefone ou e-mail se distinguem pela forma, então
 * perguntar qual é seria perguntar o que já está escrito.
 */
export function alvoDoConvite(bruto: string): AlvoDoConvite | null {
  const t = (bruto || '').trim()
  if (!t) return null
  if (pareceEndereco(t)) return { como: 'email', email: t.toLowerCase(), fone: null }
  const f = foneDoConvite(t)
  return f ? { como: 'fone', fone: f, email: null } : null
}

/** Como o alvo aparece na lista de convites abertos. */
export const alvoEscrito = (c: { email?: string | null; fone?: string | null }) =>
  (c.fone || '').trim() || (c.email || '').trim() || 'sem endereço'

/**
 * O endereço do convite.
 *
 * O código continua sendo a única porta, e continua valendo sete dias. O que o
 * link resolve é a DIGITAÇÃO: ninguém transcreve ENG7K2 do WhatsApp para o
 * navegador sem errar, e quem erra conclui que o convite não serve. Com o
 * código dentro do endereço, o cadastro abre com ele preenchido, e a pessoa só
 * diz o nome dela.
 *
 * `/convite/<codigo>` e não `/entrar?c=<codigo>` porque o endereço atende os
 * dois casos, e um deles não é o cadastro: quem JÁ tem conta no TrackWard não
 * pode ser mandado para a tela de entrar, que recusa quem está logado.
 */
export const linkDoConvite = (origem: string, codigo: string) =>
  `${(origem || '').replace(/\/+$/, '')}/convite/${encodeURIComponent((codigo || '').toUpperCase())}`

/**
 * O recado que vai junto do link.
 *
 * Escrito para ser lido no WhatsApp, onde a pessoa está: curto, com o nome de
 * quem convida, porque o convite de um desconhecido chamando para um app que
 * ela não conhece é indistinguível de golpe, e o que separa os dois é o nome de
 * alguém que ela conhece.
 */
export function textoDoConvite(d: { empresa: string; quem: string; link: string }): string {
  return `${d.quem} te chamou para o ${d.empresa} no TrackWard.\n\n${d.link}\n\n`
    + 'É onde a equipe combina o trabalho e acompanha o que foi combinado. '
    + 'Abrindo o link você entra direto, sem código nenhum para digitar.'
}

/**
 * O endereço que abre a conversa daquela pessoa com o recado já escrito.
 *
 * É isto que faz o convite caber em dois toques sem o app precisar mandar
 * mensagem nenhuma: quem convida toca, o WhatsApp abre na conversa certa, e ele
 * confere e aperta enviar. Mandar pelo servidor exigiria a chave do conector,
 * que é uma terceira rota com chave de serviço, e exigiria a verificação do
 * negócio na Meta, que é justamente o que ainda não saiu. Isto funciona hoje.
 *
 * O `wa.me` quer os dígitos sem o mais: com ele, o WhatsApp abre a busca em vez
 * da conversa, e quem convida acha que o número está errado.
 */
export const waDoConvite = (fone: string, texto: string) =>
  `https://wa.me/${digitos(fone)}?text=${encodeURIComponent(texto)}`
