import dns from 'node:dns/promises'

/**
 * A única porta de saída do app para a internet.
 *
 * Três rotas chamam endereço de fora: a agenda externa (o link iCal do cliente),
 * o conector (a API que a empresa ligou) e o webhook do agente. As três tinham
 * o mesmo buraco, escrito de três jeitos diferentes, e é por isso que a porta
 * passa a ser uma só.
 *
 * O buraco: conferir o endereço e depois chamar `fetch` com o `redirect` no
 * padrão, que é **seguir**. A conferência vale para o primeiro salto e para
 * mais nenhum. Quem quisesse alcançar a rede de dentro apontava o conector para
 * um endereço público que responde `302` para `http://169.254.169.254` ou para
 * `http://127.0.0.1:porta`, e o servidor ia, porque ninguém olhou o destino do
 * desvio. No conector isso é pior do que nas outras duas: ele **devolve um
 * pedaço da resposta** para quem chamou, então a leitura de dentro volta pela
 * tela.
 *
 * Duas rotas conferiam só o TEXTO do endereço (`host === 'localhost'`), o que
 * qualquer nome que resolva para 10.x atravessa sem esforço. Aqui a conferência
 * é sempre a mesma: protocolo, nome impossível, e o IP DE VERDADE, resolvido.
 *
 * E o desvio que troca de máquina não leva credencial junto. O conector manda o
 * segredo da empresa no cabeçalho ou na url; seguir um desvio para outro lugar
 * com ele é entregar a chave para quem escreveu o desvio.
 *
 * O que fica de fora, e é honesto dizer: entre a conferência do IP e a conexão
 * existe uma fresta em que o DNS pode mudar de resposta (rebinding). Fechá-la
 * exige conferir no momento de abrir o socket, e não na hora de decidir. Com os
 * desvios conferidos, o caminho fácil deixou de existir; o difícil continua lá,
 * e está escrito aqui para não ser esquecido.
 */

/** Quantos desvios se aceita antes de desistir. Três é mais do que qualquer API séria usa. */
const DESVIOS = 3

/** Endereço que não é da internet, e que um app não deve alcançar de dentro. */
export function interno(ip: string): boolean {
  if (/^(127\.|10\.|0\.|169\.254\.)/.test(ip)) return true
  if (/^192\.168\./.test(ip)) return true
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return true
  if (ip === '::1' || ip === '::') return true
  const b = ip.toLowerCase()
  // IPv6 local, e o IPv4 embrulhado em IPv6, que é o disfarce mais comum.
  if (b.startsWith('fc') || b.startsWith('fd') || b.startsWith('fe80')) return true
  if (b.startsWith('::ffff:')) return interno(b.slice(7))
  return false
}

export type Saida = { ok: true; url: URL } | { ok: false; motivo: string }

/**
 * Confere um endereço antes de ir nele.
 *
 * `soHttps` para quem manda credencial junto: o conector e o webhook. A agenda
 * aceita http porque calendário publicado em intranet velha existe, e o que
 * volta de lá são intervalos de tempo, não segredo.
 */
export async function conferir(bruta: string, soHttps = true): Promise<Saida> {
  let u: URL
  try { u = new URL(bruta.trim().replace(/^webcal:/i, 'https:')) } catch {
    return { ok: false, motivo: 'Endereço inválido.' }
  }
  if (soHttps ? u.protocol !== 'https:' : u.protocol !== 'https:' && u.protocol !== 'http:') {
    return { ok: false, motivo: 'O endereço precisa ser https.' }
  }
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (/^(localhost|.*\.localhost|.*\.local|.*\.internal)$/.test(host)) {
    return { ok: false, motivo: 'Esse endereço não é público.' }
  }
  // Nome que já é um IP não passa pelo DNS, e o `lookup` o devolveria como está.
  if (interno(host)) return { ok: false, motivo: 'Esse endereço não é público.' }
  try {
    const achados = await dns.lookup(host, { all: true })
    if (!achados.length) return { ok: false, motivo: 'Esse endereço não existe.' }
    if (achados.some((e) => interno(e.address))) {
      return { ok: false, motivo: 'Esse endereço não é público.' }
    }
  } catch {
    return { ok: false, motivo: 'Esse endereço não existe.' }
  }
  return { ok: true, url: u }
}

export type Salto =
  | { tipo: 'pronto' }
  | { tipo: 'recusa'; motivo: string }
  | { tipo: 'segue'; url: string; metodo: string | undefined; comCorpo: boolean }

/**
 * O que fazer diante de uma resposta: parar, recusar, ou ir para onde ela manda.
 *
 * Mora fora do `buscar` para poder ser provada sem rede. É a decisão mais
 * perigosa do arquivo, e a que estava errada nas três rotas: seguir sem olhar.
 */
export function proximoSalto(
  status: number, destino: string | null, atual: URL,
  p: { comCredencial: boolean; metodo?: string },
): Salto {
  if (status < 300 || status > 399 || !destino) return { tipo: 'pronto' }
  let proximo: URL
  try { proximo = new URL(destino, atual) } catch {
    return { tipo: 'recusa', motivo: 'Esse serviço desviou para um endereço inválido.' }
  }
  /**
   * Desvio que troca de máquina não leva credencial.
   *
   * O `fetch` já tira o `authorization` sozinho ao mudar de origem, mas não tira
   * cabeçalho de nome próprio (`x-api-key`) nem o que está na url, e são esses
   * dois que o conector usa na maior parte dos serviços.
   */
  if (p.comCredencial && proximo.host !== atual.host) {
    return { tipo: 'recusa', motivo: 'Esse serviço desviou a chamada para outro endereço.' }
  }
  // 303, e 301/302 em POST, viram GET sem corpo, como manda o protocolo.
  const vira = status === 303
    || ((status === 301 || status === 302) && !!p.metodo && p.metodo !== 'GET')
  return {
    tipo: 'segue',
    url: proximo.toString(),
    metodo: vira ? 'GET' : p.metodo,
    comCorpo: !vira,
  }
}

/**
 * Busca de fora, conferindo CADA salto.
 *
 * `redirect: 'manual'` é o ponto inteiro: o `fetch` para no desvio e devolve o
 * 3xx, e quem decide se vai é esta função, depois de conferir o destino com a
 * mesma régua do primeiro endereço.
 */
export async function buscar(
  bruta: string,
  init: RequestInit & { soHttps?: boolean; comCredencial?: boolean } = {},
): Promise<{ ok: true; r: Response; url: URL } | { ok: false; motivo: string }> {
  const { soHttps = true, comCredencial = false, ...resto } = init
  let atual = bruta
  let corpo = resto.body
  let metodo = resto.method

  for (let salto = 0; salto <= DESVIOS; salto++) {
    const c = await conferir(atual, soHttps)
    if (!c.ok) return c

    const r = await fetch(c.url, { ...resto, method: metodo, body: corpo, redirect: 'manual' })
    const passo = proximoSalto(r.status, r.headers.get('location'), c.url, { comCredencial, metodo })
    if (passo.tipo === 'pronto') return { ok: true, r, url: c.url }
    if (passo.tipo === 'recusa') return { ok: false, motivo: passo.motivo }
    metodo = passo.metodo
    if (!passo.comCorpo) corpo = undefined
    atual = passo.url
  }
  return { ok: false, motivo: 'Esse endereço desvia demais.' }
}
