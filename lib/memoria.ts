import { mesmaCoisa } from './leitor'
import type { Canal, Fluxo, Mensagem, Sugestao } from './tipos'

/**
 * O que o Track aprende sobre uma empresa.
 *
 * Primeiro o que isto NÃO é: não é treinar modelo. Ninguém treina um modelo por
 * cliente, e prometer isso seria mentira. Aprender aqui é o app acumular o que a
 * casa ensinou e entregar isso ao modelo em cada leitura, o que na prática
 * funciona melhor: vale desde a primeira correção, não depois de mil exemplos.
 *
 * Três coisas, em ordem de valor:
 *
 * **1. Recusa.** A leitura propôs, alguém recusou. É o único sinal inequívoco
 * que existe aqui: a empresa disse "isto não". Sem guardar, a leitura repete o
 * mesmo erro toda semana, e é assim que as pessoas desistem de IA.
 *
 * **2. Pessoa.** Quem a casa põe em cada assunto. Vem de quem aceitou o quê e de
 * quem foi corrigido para quem: propor a Ana e alguém trocar para o Carlos
 * ensina mais do que dez mensagens.
 *
 * **3. Termo.** A palavra da casa e a frente a que ela se refere. "a virada" é a
 * Abertura da unidade Norte, e ninguém escreve o nome completo numa conversa.
 *
 * Duas regras que valem para tudo:
 *
 * **Peso é confirmação, não palpite.** Uma coincidência tem peso 1. Só a partir
 * de MINIMO o app age com base naquilo. Assim uma frase solta não vira regra.
 *
 * **Tudo é visível e apagável.** Se a máquina aprendeu errado, alguém precisa
 * poder ver e desfazer, com o trecho que ensinou à vista. Memória que não se
 * audita é exatamente o que faz uma empresa desconfiar de IA.
 */

export type TipoMemoria = 'termo' | 'pessoa' | 'recusa'

export type Lembranca = {
  id: string
  tipo: TipoMemoria
  chave: string
  valor: string
  fluxo_id: string | null
  area_id: string | null
  perfil_id: string | null
  peso: number
  exemplo: string
  visto_em: string
  criado_em: string
}

/** Abaixo disto é coincidência, e coincidência não muda decisão de ninguém. */
export const MINIMO = 3

const limpo = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const VAZIAS = new Set([
  'para','pela','pelo','com','sem','dos','das','uma','uns','umas','que','por','mais','muito',
  'esse','essa','isso','este','esta','isto','aquele','aquela','nosso','nossa','seu','sua',
  'ate','sobre','entre','como','quando','onde','sera','estao','todo','toda','todos','todas',
  'vamos','vou','preciso','precisamos','fazer','feito','ficar','fica','ainda','tambem','agora',
  'gente','pessoal','favor','obrigado','bom','boa','dia','tarde','noite','hoje','amanha',
  'semana','mes','ano','coisa','jeito','tudo','nada','aqui','ali','entao','porque','sendo',
])

const palavras = (s: string) =>
  limpo(s).replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length >= 4 && !VAZIAS.has(w))

/** O que uma proposta recusada ensina, reduzido ao essencial da frase. */
export const padraoDaRecusa = (s: Sugestao) =>
  `${s.tipo}:${palavras(s.texto).slice(0, 4).sort().join(' ')}`

export type Aprendizado = {
  tipo: TipoMemoria
  chave: string
  valor: string
  fluxo_id?: string | null
  area_id?: string | null
  perfil_id?: string | null
  exemplo: string
}

/**
 * Os termos da casa que aparecem numa conversa presa a uma frente.
 *
 * A ideia é simples: palavra que só aparece no canal de um projeto é palavra
 * daquele projeto. "Conciliação" no canal do Financeiro é vocabulário do
 * Financeiro; "reunião" aparece em todos e não ensina nada.
 *
 * Por isso a conta precisa dos OUTROS canais também: sem eles, toda palavra
 * pareceria específica.
 */
export function termosDaConversa(
  canal: Canal,
  minhas: Mensagem[],
  outras: Mensagem[],
  fluxo: Fluxo | null,
  /**
   * Só o que foi dito DEPOIS disto conta.
   *
   * Sem esse corte, reler a mesma conversa somaria peso com a mesma evidência, e
   * bastaria clicar três vezes em "ler a conversa" para uma palavra solta virar
   * regra da casa. Cada rodada de conversa nova é uma confirmação; a mesma
   * conversa relida é zero.
   */
  desde: string | null,
): Aprendizado[] {
  if (!canal.fluxo_id && !canal.area_id) return []

  const fora = new Set(outras.flatMap((m) => palavras(m.texto)))
  const conta = new Map<string, { n: number; exemplo: string }>()

  for (const m of minhas) {
    if (m.sistema) continue
    if (desde && m.criado_em <= desde) continue
    for (const w of new Set(palavras(m.texto))) {
      if (fora.has(w)) continue           // aparece em outro canal: não é da casa daqui
      const atual = conta.get(w)
      if (atual) atual.n++
      else conta.set(w, { n: 1, exemplo: m.texto.slice(0, 160) })
    }
  }

  const onde = fluxo ? fluxo.nome : ''
  // Uma aparição basta para entrar, porque quem filtra é o peso: palavra de
  // verdade volta na conversa seguinte e ganha peso, palavra solta fica em 1 e
  // nunca conta. Palavra mais longa primeiro no empate: "homologação" diz mais
  // sobre o assunto da casa do que "ponto".
  return [...conta.entries()]
    .sort((a, b) => b[1].n - a[1].n || b[0].length - a[0].length)
    .slice(0, 8)
    .map(([w, v]) => ({
      tipo: 'termo' as const,
      chave: w,
      valor: onde || canal.nome,
      fluxo_id: canal.fluxo_id,
      area_id: canal.area_id,
      exemplo: v.exemplo,
    }))
}

/**
 * O que uma decisão sobre uma proposta ensina.
 *
 * Recusar ensina o padrão a não repetir. Aceitar trocando o responsável ensina
 * quem a casa põe naquele assunto, e é o sinal mais forte que existe aqui,
 * porque é uma correção explícita de uma pessoa sobre a máquina.
 */
export function daDecisao(
  s: Sugestao,
  aceita: boolean,
  respFinal: string | null,
  nomeDe: (id: string | null) => string,
): Aprendizado[] {
  if (!aceita) {
    return [{
      tipo: 'recusa',
      chave: padraoDaRecusa(s),
      valor: s.texto.slice(0, 160),
      exemplo: s.motivo.slice(0, 200),
    }]
  }

  const saida: Aprendizado[] = []
  const assunto = palavras(s.texto).slice(0, 3).sort().join(' ')
  if (respFinal && assunto) {
    const trocado = s.dados.resp_id && s.dados.resp_id !== respFinal
    saida.push({
      tipo: 'pessoa',
      chave: assunto,
      valor: nomeDe(respFinal),
      perfil_id: respFinal,
      exemplo: trocado
        ? `Propus ${nomeDe(s.dados.resp_id ?? null)} e foi corrigido para ${nomeDe(respFinal)}: ${s.texto}`
        : `Aceito com ${nomeDe(respFinal)}: ${s.texto}`,
    })
  }
  return saida
}

/** Quando esta frente aprendeu palavra pela última vez. Nulo se nunca. */
export function ultimoAprendizado(canalId: string, memoria: Lembranca[], canal: Canal): string | null {
  const daFrente = memoria.filter(
    (m) => m.tipo === 'termo'
      && ((canal.fluxo_id && m.fluxo_id === canal.fluxo_id)
        || (!canal.fluxo_id && canal.area_id && m.area_id === canal.area_id)),
  )
  if (!daFrente.length) return null
  return daFrente.reduce((a, m) => (m.visto_em > a ? m.visto_em : a), daFrente[0].visto_em)
}

/** Esta proposta já foi recusada antes, com peso suficiente para valer? */
export function jaFoiRecusada(s: { tipo: string; texto: string }, memoria: Lembranca[]): boolean {
  const chave = padraoDaRecusa(s as Sugestao)
  return memoria.some((m) => m.tipo === 'recusa' && m.peso >= MINIMO && m.chave === chave)
}

/** Quem a casa costuma pôr neste assunto, quando já ensinou isso. */
export function quemCostuma(texto: string, memoria: Lembranca[]): string | null {
  const alvo = memoria
    .filter((m) => m.tipo === 'pessoa' && m.peso >= MINIMO && m.perfil_id)
    .map((m) => ({ m, nota: mesmaCoisa(texto, m.chave.replace(/ /g, ' ')) }))
    .filter((x) => x.nota >= 0.5)
    .sort((a, b) => b.nota - a.nota || b.m.peso - a.m.peso)[0]
  return alvo?.m.perfil_id ?? null
}

/**
 * O bloco que vai no pedido ao modelo.
 *
 * Só o que já se confirmou, e em texto curto: contexto longo custa dinheiro em
 * toda leitura, e enfiar tudo que a empresa já disse ali seria pagar caro por
 * piorar a atenção do modelo.
 */
export function paraOModelo(memoria: Lembranca[]): string {
  const firmes = memoria.filter((m) => m.peso >= MINIMO)
  if (!firmes.length) return ''

  const termos = firmes.filter((m) => m.tipo === 'termo').slice(0, 25)
  const pessoas = firmes.filter((m) => m.tipo === 'pessoa').slice(0, 15)
  const recusas = firmes.filter((m) => m.tipo === 'recusa').slice(0, 10)

  const partes: string[] = []
  if (termos.length) {
    partes.push('Palavras desta empresa, e a que frente cada uma se refere:\n'
      + termos.map((m) => `- "${m.chave}" fala de ${m.valor}`).join('\n'))
  }
  if (pessoas.length) {
    partes.push('Quem esta empresa costuma pôr em cada assunto:\n'
      + pessoas.map((m) => `- ${m.chave}: ${m.valor}`).join('\n'))
  }
  if (recusas.length) {
    partes.push('Propostas que esta empresa já recusou, e que você não deve repetir:\n'
      + recusas.map((m) => `- ${m.valor}`).join('\n'))
  }
  return partes.join('\n\n')
}
