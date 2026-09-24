/**
 * O nome que aparece na tela.
 *
 * Um perfil pode nascer sem nome, por convite antigo ou por cadastro feito
 * antes de o app perguntar, e aí o banco guarda o e-mail no lugar. Mostrar
 * "Boa tarde, johannsilva2017@gmail.com" é a cara de sistema, não de produto,
 * e é o tipo de coisa que quem recebe um convite vê no primeiro minuto.
 *
 * Aqui não se conserta o dado, só a exibição: quem conserta o dado é a pessoa,
 * em `componentes/PedeNome.tsx`, porque o nome dela é dela.
 */

/** O que está guardado é um e-mail, e não um nome. */
export const pareceEmail = (nome: string) => /\S+@\S+\.\S+/.test(nome.trim())

/**
 * Um palpite de nome a partir do e-mail, para o campo já vir preenchido.
 *
 * Separa por ponto, traço e sublinhado, tira os números do fim e põe maiúscula
 * em cada palavra: `joao.pedro_2017` vira `Joao Pedro`. É palpite, e por isso
 * vai num campo que a pessoa corrige antes de salvar.
 */
export function sugerirNome(email: string): string {
  const antes = email.split('@')[0] || ''
  const partes = antes
    .split(/[._\-+]+/)
    .map((p) => p.replace(/\d+$/, '').trim())
    .filter((p) => p.length > 1)
  if (!partes.length) return ''
  return partes
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Como chamar a pessoa numa saudação: só o primeiro nome, nunca o e-mail.
 *
 * "Boa tarde, Leo" é cumprimento. "Boa tarde, leo.silverios22@gmail.com" é
 * relatório de sistema, e ninguém cumprimenta ninguém assim.
 */
export function primeiroNome(nome: string, email?: string): string {
  const limpo = (nome || '').trim()
  const so = (t: string) => t.split(' ')[0]
  if (!limpo) return so(sugerirNome(email || '')) || 'você'
  if (pareceEmail(limpo)) return so(sugerirNome(limpo)) || limpo.split('@')[0]
  return so(limpo)
}
