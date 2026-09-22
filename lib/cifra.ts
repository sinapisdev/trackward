import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

/**
 * A cifra dos segredos de conector.
 *
 * Roda SÓ NO SERVIDOR. A chave que abre a cifra mora em TRACK_SEGREDO, uma
 * variável de ambiente, e nunca sai de lá.
 *
 * Por que cifrar, já que o banco tem RLS: porque a tabela de conectores precisa
 * ser lida pelo app inteiro para a tela funcionar, e a chave de API de uma
 * empresa não pode ficar legível para os funcionários dela. Uma chave de SMS na
 * mão de qualquer um é conta no cartão do cliente; uma de e-mail é mensagem
 * saindo em nome dele.
 *
 * Com a cifra, quem lê a linha (pelo app, ou dumpando o banco) leva texto
 * embaralhado. Só a rota do servidor abre, e ela nunca devolve o segredo: ela
 * faz a chamada e devolve o resultado.
 *
 * AES-256-GCM: cifra e assina ao mesmo tempo, então texto trocado por alguém com
 * acesso ao banco não abre, em vez de abrir virando outra coisa.
 */

const ALGO = 'aes-256-gcm'

function chave(): Buffer | null {
  const bruta = process.env.TRACK_SEGREDO
  if (!bruta || bruta.length < 16) return null
  // Qualquer frase vira 32 bytes. Assim a variável pode ser uma senha longa em
  // vez de um blob em base64, que é mais fácil de guardar sem errar.
  return createHash('sha256').update(bruta).digest()
}

export const podeCifrar = () => !!chave()

/** Devolve "iv.tag.texto", tudo em base64url. Nulo quando não há chave. */
export function cifrar(claro: string): string | null {
  const k = chave()
  if (!k) return null
  const iv = randomBytes(12)
  const c = createCipheriv(ALGO, k, iv)
  const corpo = Buffer.concat([c.update(claro, 'utf8'), c.final()])
  return [iv, c.getAuthTag(), corpo].map((b) => b.toString('base64url')).join('.')
}

/** Nulo quando não há chave, quando o formato não bate, ou quando foi alterado. */
export function decifrar(guardado: string): string | null {
  const k = chave()
  if (!k || !guardado) return null
  const partes = guardado.split('.')
  if (partes.length !== 3) return null
  try {
    const [iv, tag, corpo] = partes.map((p) => Buffer.from(p, 'base64url'))
    const d = createDecipheriv(ALGO, k, iv)
    d.setAuthTag(tag)
    return Buffer.concat([d.update(corpo), d.final()]).toString('utf8')
  } catch {
    return null
  }
}

/** Os últimos caracteres, para a tela mostrar qual chave é sem poder usá-la. */
export const dicaDe = (segredo: string) =>
  segredo.length <= 4 ? '••••' : `••••${segredo.slice(-4)}`
