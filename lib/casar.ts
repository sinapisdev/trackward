import { parecido } from './leitor'

/**
 * A qual pergunta esta resposta está respondendo.
 *
 * É o miolo do WhatsApp de ida e volta, e é a peça que, errando, faz o app
 * concluir a tarefa errada em nome de alguém. Um "pronto" solto não diz nada
 * sozinho: ele só significa alguma coisa junto do que foi perguntado antes.
 *
 * **A regra que manda em tudo: na dúvida, pergunte.** Nunca escolher a mais
 * provável. Errar aqui não é mostrar a tela errada, é marcar como pronto o que
 * não está, aprovar o que não devia, ou prorrogar um prazo que alguém está
 * esperando. Uma pergunta a mais custa um toque; um casamento errado custa a
 * confiança no app inteiro, e ela não volta.
 *
 * São quatro mecanismos, **nesta ordem**, e o primeiro que resolver resolve:
 *
 *   1. **A resposta é uma resposta.** O provedor entrega o id da mensagem
 *      citada. Casamento certo, sem adivinhação nenhuma.
 *   2. **Só existe uma pergunta em aberto** para aquela pessoa. Aí "pronto"
 *      resolve sozinho, porque não há segunda leitura possível.
 *   3. **A frase nomeia.** Usa o mesmo motor que casa frase com tarefa no resto
 *      do app, e só aceita quando um candidato ganha do segundo com folga.
 *   4. **A escolha por número**, quando a pergunta anterior ofereceu lista.
 *
 * Nenhum resolveu: devolve as candidatas para o app perguntar qual é.
 */

/** O que o app perguntou e ainda não teve resposta. Espelha `perguntas_abertas`. */
export type Pergunta = {
  id: string
  perfil_id: string
  /** Sobre o que era a pergunta, para saber o que fazer com a resposta. */
  sobre_tipo: 'item' | 'etapa' | 'prazo' | 'nota' | 'diagnostico' | 'triagem'
  sobre_id: string | null
  /** O texto que saiu, do jeito que saiu. É contra ele que a frase é comparada. */
  texto: string
  /** O id da mensagem no provedor, que é o que permite o casamento exato. */
  msg_externa_id: string | null
  /** Quando a pergunta foi com lista: [{ chave: '1', rotulo: 'Conciliação' }]. */
  opcoes: { chave: string; rotulo: string }[] | null
  criado_em: string
}

export type Resposta = {
  texto: string
  /** O id da mensagem citada, quando o provedor mandar. */
  citou?: string | null
}

export type Casamento =
  | { como: 'citacao' | 'unica' | 'nomeou' | 'escolha'; pergunta: Pergunta; opcao?: string }
  | { como: 'pergunte'; candidatas: Pergunta[] }
  | { como: 'nada' }

/**
 * Quanto um candidato precisa ganhar do segundo para valer sem perguntar.
 *
 * Sem essa folga, duas perguntas parecidas ("o relatório do mês" e "o relatório
 * da obra") seriam decididas por um empate técnico, que é adivinhação com cara
 * de conta. Com ela, o app pergunta, que é o comportamento certo.
 */
const FOLGA = 0.15
/** Abaixo disto a frase não fala daquilo, fala de outra coisa. */
const MINIMO = 0.34

/** Palavras que respondem sem nomear nada. Elas não ajudam a escolher. */
const SOLTAS = new Set([
  'ok', 'okay', 'sim', 'nao', 'não', 'pronto', 'feito', 'fiz', 'certo', 'isso',
  'beleza', 'blz', 'confirmo', 'confirmado', 'pode', 'claro', 'aham', 'uhum',
  'obrigado', 'obrigada', 'valeu', 'ja', 'já', 'terminei', 'acabei', 'sem',
])

/** A frase só diz "pronto", sem dizer de quê? */
export function soConfirma(texto: string): boolean {
  const p = texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/).filter(Boolean)
  if (!p.length || p.length > 4) return false
  return p.every((w) => SOLTAS.has(w) || SOLTAS.has(w.normalize('NFC')))
}

/** A resposta é a escolha de um item da lista: "2", "opção 2", "b". */
function escolheu(texto: string, opcoes: Pergunta['opcoes']): string | null {
  if (!opcoes?.length) return null
  const limpo = texto.trim().toLowerCase()
  // O número ou a letra sozinhos, que é como as pessoas respondem lista.
  const so = limpo.match(/^(?:op[çc][ãa]o\s*)?([0-9]{1,2}|[a-z])\b[.)]?$/)
  if (so) {
    const achou = opcoes.find((o) => o.chave.toLowerCase() === so[1])
    if (achou) return achou.chave
  }
  // O rótulo inteiro, quando a pessoa prefere escrever a palavra.
  const porNome = opcoes.filter((o) => parecido(limpo, o.rotulo) >= 0.8)
  return porNome.length === 1 ? porNome[0].chave : null
}

/** Ainda vale? Pergunta respondida ou vencida não entra em casamento nenhum. */
export function emAberto(p: Pergunta & { respondido_em?: string | null; expirou_em?: string | null },
  agora = new Date()): boolean {
  if (p.respondido_em) return false
  if (p.expirou_em && Date.parse(p.expirou_em) <= agora.getTime()) return false
  return true
}

/**
 * O casamento.
 *
 * `abertas` já deve vir filtrada pela pessoa e pelo que ainda vale: quem chama
 * sabe de qual telefone veio a mensagem, e esta função não conhece telefone.
 */
export function casar(resposta: Resposta, abertas: Pergunta[]): Casamento {
  if (!abertas.length) return { como: 'nada' }

  // 1. A resposta é uma resposta. Não há o que interpretar.
  if (resposta.citou) {
    const citada = abertas.find((p) => p.msg_externa_id && p.msg_externa_id === resposta.citou)
    if (citada) return { como: 'citacao', pergunta: citada }
  }

  // 2. Uma só em aberto: não existe segunda leitura possível.
  if (abertas.length === 1) {
    const unica = abertas[0]
    const op = escolheu(resposta.texto, unica.opcoes)
    if (op) return { como: 'escolha', pergunta: unica, opcao: op }
    return { como: 'unica', pergunta: unica }
  }

  // 4 antes de 3 quando a resposta é um número: "2" não nomeia nada, e comparar
  // palavra de um dígito com o texto da pergunta só produziria ruído. Vale
  // apenas quando UMA lista aceita aquela chave; duas listas com "1" é empate.
  const porOpcao = abertas
    .map((p) => ({ p, op: escolheu(resposta.texto, p.opcoes) }))
    .filter((x) => x.op)
  if (porOpcao.length === 1) {
    return { como: 'escolha', pergunta: porOpcao[0].p, opcao: porOpcao[0].op! }
  }

  // 3. A frase nomeia, e ganha do segundo com folga.
  if (!soConfirma(resposta.texto)) {
    const notas = abertas
      .map((p) => ({ p, nota: parecido(resposta.texto, p.texto) }))
      .sort((a, b) => b.nota - a.nota)
    const [melhor, segundo] = notas
    if (melhor.nota >= MINIMO && (!segundo || melhor.nota - segundo.nota >= FOLGA)) {
      return { como: 'nomeou', pergunta: melhor.p }
    }
  }

  // Nada resolveu. Perguntar é a resposta certa, e a mais recente primeiro:
  // conversa de WhatsApp é sobre o que se falou agora.
  return {
    como: 'pergunte',
    candidatas: [...abertas].sort((a, b) => b.criado_em.localeCompare(a.criado_em)).slice(0, 5),
  }
}

/** A lista que o app manda quando precisa perguntar qual é. */
export function comoLista(candidatas: Pergunta[]): { chave: string; rotulo: string }[] {
  return candidatas.map((p, i) => ({
    chave: String(i + 1),
    // Curto de propósito: no WhatsApp a lista aparece como botão, e rótulo
    // comprido é cortado pelo próprio provedor, não por nós.
    rotulo: p.texto.length > 72 ? `${p.texto.slice(0, 69)}...` : p.texto,
  }))
}
