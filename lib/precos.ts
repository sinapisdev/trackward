/**
 * O que cada modelo custa, e quanto custou uma chamada.
 *
 * Os preços ficam aqui, num lugar só, e a linha de consumo guarda o NOME do
 * modelo junto do custo já calculado. É essa separação que permite mudar a
 * tabela sem reescrever o passado: a chamada de ontem continua valendo o que
 * valia ontem, e a fatura de um mês fechado não muda porque um preço mudou.
 *
 * Tudo em milionésimos de dólar, em inteiro. Dinheiro em ponto flutuante erra no
 * centavo quando se soma muita linha, e conta de cliente não pode errar.
 *
 * Fonte: platform.claude.com/docs/en/about-claude/pricing, conferido em
 * 22/09/2026. Quando mudar, muda aqui.
 */

/** Dólares por milhão de tokens. */
type Tabela = { entrada: number; saida: number; cacheLeitura: number; cacheEscrita: number }

export const PRECOS: Record<string, Tabela> = {
  'claude-opus-5': { entrada: 5, saida: 25, cacheLeitura: 0.5, cacheEscrita: 6.25 },
  'claude-sonnet-5': { entrada: 2, saida: 10, cacheLeitura: 0.2, cacheEscrita: 2.5 },
  'claude-haiku-4-5-20251001': { entrada: 1, saida: 5, cacheLeitura: 0.1, cacheEscrita: 1.25 },
}

/** O que usar quando o modelo não está na tabela: o mais caro que temos. */
const CAUTELA: Tabela = { entrada: 5, saida: 25, cacheLeitura: 0.5, cacheEscrita: 6.25 }

export const MODELOS: { id: string; nome: string; sobre: string }[] = [
  { id: 'claude-haiku-4-5-20251001', nome: 'Haiku 4.5',
    sobre: 'o mais barato, cerca de metade do preço. Dá conta da leitura da conversa no dia a dia.' },
  { id: 'claude-sonnet-5', nome: 'Sonnet 5',
    sobre: 'o padrão. Entende contexto e a frase que se espalha por três mensagens.' },
  { id: 'claude-opus-5', nome: 'Opus 5',
    sobre: 'o mais caro, umas duas vezes e meia o Sonnet. Só vale para conversa muito complicada.' },
]

export type Uso = {
  entrada: number
  saida: number
  cacheLeitura?: number
  cacheEscrita?: number
}

/**
 * Quanto custou, em milionésimos de dólar.
 *
 * Modelo desconhecido cobra pela tabela mais cara de propósito: errar para cima
 * num medidor faz alguém investigar, errar para baixo faz o prejuízo passar
 * batido por meses.
 */
export function custoMicro(modelo: string, uso: Uso): number {
  const t = PRECOS[modelo] || CAUTELA
  // Parece faltar uma divisão, e não falta: dólar por milhão de tokens, vezes
  // tokens, já dá o resultado em milionésimos de dólar. 2.800 tokens a US$ 2 o
  // milhão custam US$ 0,0056, que são 5.600 milionésimos, que é 2800 x 2.
  const micro = (tokens: number, dolarPorMilhao: number) => tokens * dolarPorMilhao
  return Math.round(
    micro(uso.entrada, t.entrada)
    + micro(uso.saida, t.saida)
    + micro(uso.cacheLeitura ?? 0, t.cacheLeitura)
    + micro(uso.cacheEscrita ?? 0, t.cacheEscrita),
  )
}

/** "US$ 2,46", "US$ 0,0086". Milionésimos são detalhe de máquina, não de gente. */
export function emDolar(micro: number): string {
  const d = micro / 1e6
  if (d === 0) return 'US$ 0'
  if (d < 0.01) return `US$ ${d.toFixed(4).replace('.', ',')}`
  return `US$ ${d.toFixed(2).replace('.', ',')}`
}

export const nomeDoModelo = (id: string) =>
  MODELOS.find((m) => m.id === id)?.nome || id || 'padrão do servidor'
