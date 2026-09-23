/**
 * A conversa com a leitura dentro do caderno.
 *
 * É outra coisa da leitura da conversa (`lib/leitor.ts`), e vale separar por
 * quê. Lá a saída é PROPOSTA: a máquina lê o que a equipe combinou e devolve
 * fichas para alguém aceitar ou recusar, sem nunca escrever na tela como quem
 * fala. Aqui a saída é RESPOSTA, em texto corrido, porque a pessoa perguntou.
 *
 * As duas convivem na mesma nota de propósito: você conversa sobre a ideia, e
 * quando quiser manda organizar. Nada do que for dito aqui vira tarefa sozinho.
 */

export type Fala = {
  /** Quem falou: a pessoa ou a leitura. */
  de: 'pessoa' | 'ia'
  texto: string
}

export type ContextoConversa = {
  hoje: string
  falas: Fala[]
  /**
   * A nota em que a conversa acontece, quando acontece dentro de uma.
   *
   * Nula é a conversa solta, que é a nota sem assunto: ali a pessoa fala do que
   * quiser, e o caderno inteiro é o que a leitura tem para se apoiar.
   */
  nota: { titulo: string; texto: string; onde: string | null } | null
  /**
   * O que já está guardado e parece ter a ver. É isto que faz a segunda ideia
   * encontrar a primeira sem ninguém precisar lembrar dela.
   */
  caderno: { titulo: string; trecho: string }[]
  /** Os títulos de tudo que existe no caderno, para ela saber o que há. */
  indice: string[]
  /** O que esta casa já ensinou ao app, em texto pronto para o modelo. */
  memoria?: string
}

/**
 * A resposta quando não há chave de modelo.
 *
 * Ela não finge conversar. Inventar uma resposta de regras aqui seria pior que
 * não responder: a pessoa perguntaria de novo achando que foi mal entendida.
 * O que dá para fazer sem modelo é apontar o que o caderno já tem sobre aquilo,
 * e é isso que ela faz.
 */
export function semChave(ctx: ContextoConversa): string {
  const achou = ctx.caderno.slice(0, 3)
  if (!achou.length) {
    return 'Sem chave de modelo configurada, eu não consigo conversar. '
      + 'O que eu faço sem ela é guardar o que você escrever e, quando você mandar '
      + 'organizar, separar o que virou tarefa, compromisso e nota.'
  }
  return 'Sem chave de modelo configurada, eu não consigo conversar. '
    + 'Mas o seu caderno já tem coisa que parece ter a ver com isto: '
    + achou.map((n) => `[[${n.titulo}]]`).join(', ') + '.'
}
