import { separaQuando, horaEh, quandoEh } from './quando'

/**
 * A linguagem do chat: fazer sem sair da conversa.
 *
 * O princípio é a divisão de trabalho entre você e a leitura. Conversa solta
 * vira PROPOSTA: a leitura entende o que ficou combinado e devolve fichas para
 * alguém aceitar, porque ninguém combinou nada com a máquina. Comando é o
 * contrário: você escreveu a ordem, então ela acontece na hora, sem proposta e
 * sem pergunta. As duas coisas convivem no mesmo campo de texto.
 *
 * A escolha dos sinais não é gosto, é o que já existe na cabeça de quem usa
 * qualquer app de conversa, e o que já existe aqui dentro:
 *
 *   @pessoa     quem. Universal, e já funciona no app: mexer nisso quebraria a
 *               menção, que é a convenção mais firme que existe em chat.
 *   #track      onde. Já é como o app escreve o nome de um canal, e a track tem
 *               o canal dela: endereçar uma é endereçar a outra. No app o
 *               endereço vem de onde se escreve; no WhatsApp não existe "onde",
 *               e sem este sinal tudo que chega pelo telefone cai no privado.
 *   [[nota]]    liga uma nota na outra. Já é como o caderno costura o acervo.
 *   /comando    o que fazer. É o único sinal livre, e é o que Slack, Discord,
 *               Notion e Linear usam para a mesma coisa.
 *
 * Por isso `/objetivo` e não `@objetivo`: o `@` já tem dono, e dois significados
 * para o mesmo sinal é o jeito mais rápido de a pessoa parar de confiar nos dois.
 */

export type NomeComando = 'tarefa' | 'objetivo' | 'rotina' | 'nota' | 'agenda' | 'contato' | 'ajuda'

export type Comando = {
  nome: NomeComando
  /** O que a pessoa digita, sem a barra. */
  chave: string
  resumo: string
  exemplo: string
  /** Sinônimos que caem no mesmo comando. Quem escreve não decora. */
  outros?: string[]
}

export const COMANDOS: Comando[] = [
  {
    nome: 'tarefa', chave: 'tarefa',
    resumo: 'Cria uma tarefa, com dono e prazo se você disser',
    // O exemplo carrega os três sinais de propósito. Linguagem de comando não
    // morre de sintaxe difícil, morre de ninguém descobrir que ela existe, e o
    // `#` é o mais fácil de nunca ser descoberto: `@` e prazo a pessoa tenta
    // sozinha, "em qual track isto vive" não ocorre a ninguém.
    exemplo: '/tarefa Conferir o contrato @Ana #Reforma até sexta',
    outros: ['task', 't'],
  },
  {
    nome: 'objetivo', chave: 'objetivo',
    resumo: 'Abre um objetivo: tem fim, e você monta os checkpoints depois',
    exemplo: '/objetivo Reforma da sede',
    outros: ['projeto'],
  },
  {
    nome: 'rotina', chave: 'rotina',
    resumo: 'Abre uma rotina: dá voltas, e guarda o histórico de cada uma',
    exemplo: '/rotina Fechamento mensal',
    outros: ['ciclo'],
  },
  {
    nome: 'nota', chave: 'nota',
    resumo: 'Guarda no seu caderno, só para você',
    exemplo: '/nota O fornecedor cobra por lote de 50',
    outros: ['anotar'],
  },
  {
    nome: 'agenda', chave: 'agenda',
    resumo: 'Marca um compromisso',
    exemplo: '/agenda Reunião com o Renato terça às 15h',
    outros: ['compromisso', 'reuniao', 'reunião'],
  },
  {
    nome: 'contato', chave: 'contato',
    resumo: 'Passa um telefone para a conversa, com botão de ligar e de WhatsApp',
    exemplo: '/contato Nelson da esquadria 42 99988-7766',
    outros: ['telefone', 'fone'],
  },
  {
    nome: 'ajuda', chave: 'ajuda',
    resumo: 'Mostra o que dá para fazer escrevendo',
    exemplo: '/ajuda',
    outros: ['help', '?'],
  },
]

const limpo = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Os comandos que combinam com o que já foi digitado depois da barra. */
export function comandosQueCombinam(pedaco: string): Comando[] {
  const t = limpo(pedaco.trim())
  if (!t) return COMANDOS
  return COMANDOS.filter((c) =>
    limpo(c.chave).startsWith(t) || (c.outros || []).some((o) => limpo(o).startsWith(t)))
}

/**
 * O pedaço de comando que está sendo escrito, para a tela abrir o menu.
 *
 * Só conta barra no COMEÇO da mensagem. Barra no meio é endereço de internet e
 * é data: `10/03` abrindo um menu de comandos seria o app atrapalhando quem
 * está só escrevendo.
 */
export function comandoSendoEscrito(entrada: string): string | null {
  const m = /^\/([\p{L}?]*)$/u.exec(entrada)
  return m ? m[1] : null
}

/**
 * Tira o `#` do texto e devolve o endereço.
 *
 * Mora fora do `lerComando` porque o endereço não é privilégio de comando: no
 * WhatsApp a frase chega sem barra nenhuma ("preciso de cimento #Reforma") e
 * precisa ser endereçada do mesmo jeito. Duas cópias desta expressão seriam
 * duas gramáticas no mês seguinte.
 *
 * O `#` sai do texto pelo mesmo motivo que o `@` sai: senão a tarefa nasceria
 * chamada "Comprar cimento #Reforma", com o endereço dentro do próprio título.
 * Uma palavra só, casada por começo em `ondeEh`, como o `@` já faz com o
 * primeiro nome: ninguém digita "Reforma da sede" inteiro no telefone.
 */
export function separaOnde(entrada: string): { texto: string; onde: string | null } {
  const m = /#([\p{L}\p{N}][\p{L}\p{N}'-]*)/u.exec(entrada)
  if (!m) return { texto: entrada, onde: null }
  const texto = (entrada.slice(0, m.index) + entrada.slice(m.index + m[0].length))
    .replace(/\s{2,}/g, ' ').trim()
  return { texto, onde: m[1] }
}

/**
 * O telefone no meio da frase, e o nome que sobra.
 *
 * O contato que se passa numa conversa de trabalho é quase sempre de FORA (o
 * fornecedor da esquadria, o cliente, o despachante), e o que a pessoa tem na
 * mão é um nome e um número escritos de qualquer jeito: "Nelson da esquadria 42
 * 99988-7766", "(42) 99988 7766 Nelson". Por isso o número é que é procurado, e
 * o nome é o que sobra: pedir "primeiro o nome, depois o telefone" seria um
 * formulário com outra cara.
 *
 * Oito dígitos é o chão, que é o telefone fixo sem DDD; dentro disso cabe
 * também o número de outro país escrito com `+`. Menos que isso é número de
 * contrato, de nota fiscal e de casa, e casar com eles poria o endereço de
 * alguém num cartão de telefone.
 */
export function separaFone(entrada: string): { nome: string; fone: string | null } {
  // O `(` entra no casamento, senão ele fica para trás e o nome nasce "(Nelson":
  // "(42) 99988 7766" é como metade das pessoas escreve um número.
  const m = /(\+?\(?\d[\d\s().-]{7,})/.exec(entrada)
  if (!m) return { nome: entrada.trim(), fone: null }
  const digitos = m[1].replace(/[^\d+]/g, '')
  if (digitos.replace(/\D/g, '').length < 8) return { nome: entrada.trim(), fone: null }
  const nome = (entrada.slice(0, m.index) + entrada.slice(m.index + m[1].length))
    .replace(/\s{2,}/g, ' ').replace(/^[\s,;:()./-]+|[\s,;:()./-]+$/g, '').trim()
  return { nome, fone: digitos }
}

export type Lido = {
  comando: Comando
  /** O que sobrou depois de tirar quem e quando. */
  texto: string
  /** O nome da pessoa citada com @, como escrito. */
  quem: string | null
  /** O nome da track citada com #, como escrito. Onde a coisa vive. */
  onde: string | null
  /** AAAA-MM-DD. */
  quando: string | null
  /** HH:MM, só na agenda. */
  hora: string | null
}

/**
 * Lê a linha inteira. Devolve nulo quando não é comando, e aí é mensagem comum.
 */
export function lerComando(entrada: string, hoje?: string): Lido | null {
  const m = /^\/([\p{L}?]+)(?:\s+([\s\S]*))?$/u.exec(entrada.trim())
  if (!m) return null
  const chave = limpo(m[1])
  const comando = COMANDOS.find((c) => limpo(c.chave) === chave
    || (c.outros || []).some((o) => limpo(o) === chave))
  if (!comando) return null

  let resto = (m[2] || '').trim()
  let quem: string | null = null
  let onde: string | null = null
  let hora: string | null = null

  // Quem: o @ sai do texto, senão a tarefa nasceria chamada "Conferir o
  // contrato @Ana", com o nome dela dentro do próprio título.
  const arroba = /@([\p{L}][\p{L}'-]*)/u.exec(resto)
  if (arroba) {
    quem = arroba[1]
    resto = (resto.slice(0, arroba.index) + resto.slice(arroba.index + arroba[0].length)).replace(/\s{2,}/g, ' ').trim()
  }

  const semOnde = separaOnde(resto)
  onde = semOnde.onde
  resto = semOnde.texto

  // Hora: só faz sentido em compromisso, e sai antes da data para "terça às
  // 15h" não tentar virar data duas vezes.
  if (comando.nome === 'agenda') {
    const h = /\s+(?:as|às)\s+(\d{1,2}(?:[h:]\d{2})?h?)\s*$/i.exec(resto)
      || /\s+(\d{1,2}[h:]\d{2}|\d{1,2}h)\s*$/i.exec(resto)
    if (h) {
      const lida = horaEh(h[1])
      if (lida) { hora = lida; resto = resto.slice(0, h.index).trim() }
    }
  }

  const { texto, quando } = separaQuando(resto, hoje)
  return { comando, texto, quem, onde, quando, hora }
}

/** A pessoa que o @ nomeia, pelo primeiro nome ou pelo nome inteiro. */
export function quemEh<T extends { id: string; nome: string; ativo?: boolean }>(
  citado: string | null, pessoas: T[],
): T | null {
  if (!citado) return null
  const t = limpo(citado)
  const vivos = pessoas.filter((p) => p.ativo !== false)
  return vivos.find((p) => limpo(p.nome) === t)
    || vivos.find((p) => limpo(p.nome.split(' ')[0]) === t)
    || vivos.find((p) => limpo(p.nome).startsWith(t))
    || null
}

/**
 * As tracks que o `#` nomeia. Devolve TODAS as candidatas, de propósito.
 *
 * O `quemEh` pode escolher a primeira que casa porque errar a pessoa aparece
 * na hora: a tarefa nasce com o nome errado em cima e alguém reclama. Errar a
 * track não aparece nunca. A tarefa vai para a obra errada, fica visível para
 * a equipe errada, conta para o checkpoint errado, e quem mandou lê "pronto" e
 * segue a vida. É o erro que o AGENTS chama de pior possível, e por isso
 * `#Reforma` com duas Reformas abertas não escolhe: devolve as duas, e quem
 * chamou pergunta.
 *
 * Nome exato ganha de começo-de-nome, senão abrir "Reforma" ao lado de
 * "Reforma da sede" tornaria a primeira ineramável.
 */
export function ondeEh<T extends { id: string; nome: string }>(
  citado: string | null, tracks: T[],
): T[] {
  if (!citado) return []
  const t = limpo(citado)
  const exatas = tracks.filter((f) => limpo(f.nome) === t)
  if (exatas.length) return exatas
  return tracks.filter((f) => limpo(f.nome).startsWith(t))
}

/** Reaproveitado pela ajuda e pelos testes. */
export { quandoEh }
