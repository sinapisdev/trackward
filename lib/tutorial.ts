import type { Recursos } from './espaco'

/**
 * O tutorial da primeira vez.
 *
 * Ele existe porque o TrackWard não se explica sozinho: a tela inicial mostra
 * conversa, fila e radar ao mesmo tempo, e quem chega não sabe que a conversa
 * é o lugar onde o trabalho nasce nem que existe uma linguagem de barra. Sem
 * isso, a pessoa usa o app como um chat com lista de tarefas ao lado, que é
 * exatamente o que ela já tinha.
 *
 * Três decisões, e as três são sobre não atrapalhar:
 *
 * **Ele aponta para a tela de verdade**, e não mostra desenho de tela. O passo
 * acende um pedaço da interface e escreve ao lado dele: o que a pessoa aprende
 * é onde a coisa fica, e isso não se aprende olhando figura.
 *
 * **O alvo é um `data-tut`, nunca um seletor de classe.** Classe muda quando
 * alguém mexe no CSS, e aí o tutorial aponta para o nada sem ninguém perceber,
 * porque não quebra nada visível. O atributo existe só para isto, então quem o
 * remover está removendo o passo de propósito.
 *
 * **Passo sem alvo na tela não trava a fila.** Se o elemento não estiver lá (a
 * tela mudou, a pessoa está num tamanho diferente, os dados ainda não
 * chegaram), o passo aparece centralizado, sem o foco. Tutorial que trava na
 * primeira vez que alguém abre o app é pior do que não ter tutorial.
 */
export type Passo = {
  id: string
  titulo: string
  texto: string
  /** O `data-tut` do elemento a acender no computador. Vazio é passo centralizado. */
  alvo?: string
  /** O `data-tut` no celular, onde a tela é outra. Sem ele, usa o mesmo. */
  alvoCel?: string
  /** O texto no celular, quando a coisa mora em outro lugar lá. */
  textoCel?: string
  /** Só neste tipo de espaço. Sem isso, nos dois. */
  quando?: 'empresa' | 'pessoal'
}

const PASSOS: Passo[] = [
  {
    id: 'ola',
    titulo: 'Isto aqui é o TrackWard',
    texto: 'Ele serve para o que foi combinado virar trabalho com dono e prazo, em vez de '
      + 'virar mensagem que alguém depois lembra. São dois minutos, e dá para sair a qualquer hora.',
  },
  {
    id: 'espaco',
    titulo: 'Seus espaços',
    texto: 'O mesmo login pode viver em mais de um lugar: a empresa, outra empresa que te '
      + 'convidar, e o seu espaço pessoal, que é só seu e ninguém entra. Você troca por aqui, '
      + 'e cada espaço mostra as coisas dele.',
    alvo: 'espaco',
  },
  {
    id: 'conversa',
    titulo: 'É na conversa que o trabalho nasce',
    texto: 'Ela fica no meio da tela de propósito, entre o que você tem para fazer e o que '
      + 'está parado, porque é o caminho por onde uma coisa vira a outra. Trocar de tela para '
      + 'dizer uma frase é o que faz a combinação acontecer fora do app.',
    // No telefone não há coluna do meio: a conversa É a tela inicial, e falar
    // em "meio da tela" ensinaria um lugar que não existe ali.
    textoCel: 'No telefone ela é a sua tela inicial, como em qualquer app de mensagem, porque '
      + 'é onde o dia acontece. É de uma frase dita aqui que sai a tarefa, sem ninguém copiar '
      + 'nada para lugar nenhum.',
    alvo: 'conversa',
    alvoCel: 'tab-conversa',
    quando: 'empresa',
  },
  {
    id: 'barra',
    titulo: 'Uma linha que começa com barra é ordem',
    texto: 'Escreva /tarefa Conferir o contrato @Ana até sexta e a tarefa nasce na hora, sem '
      + 'confirmar nada. Existem /objetivo, /rotina, /nota e /agenda, e o menu abre sozinho '
      + 'quando você digita a barra.',
    alvo: 'conversa',
    alvoCel: 'tab-conversa',
    quando: 'empresa',
  },
  {
    id: 'caderno',
    titulo: 'O caderno é onde se escreve',
    texto: 'Cada nota é um assunto, e a primeira linha é o título. Dentro dela tem alguém do '
      + 'outro lado: a leitura lê o que você escreveu, lembra do que você guardou antes e '
      + 'responde ali mesmo, no meio do texto.',
    alvo: 'conversa',
    alvoCel: 'tab-notas',
    quando: 'pessoal',
  },
  {
    id: 'fila',
    titulo: 'O que está com você',
    texto: 'A fila abre por prazo: o que venceu, o que é hoje, o que é desta semana. É a '
      + 'resposta para "o que eu faço agora", e é por isso que ela é a primeira coisa da tela.',
    textoCel: 'Em Trabalho fica a sua fila, aberta por prazo: o que venceu, o que é hoje, o que '
      + 'é desta semana. É a resposta para "o que eu faço agora".',
    alvo: 'fila',
    alvoCel: 'tab-trabalho',
  },
  {
    id: 'tracks',
    titulo: 'Tudo pendura numa track',
    texto: 'São duas, e só duas: o objetivo, que tem começo, checkpoints e fim, e a rotina, '
      + 'que dá voltas e guarda o histórico de cada uma. Tarefa, prazo, documento e conversa '
      + 'moram dentro delas.',
    alvo: 'abas',
    alvoCel: 'tab-tracks',
  },
  {
    id: 'radar',
    titulo: 'O que está parado',
    texto: 'O radar mostra o que atrasou, o que trava outra pessoa e o que está esperando '
      + 'alguém decidir. Ele existe para você não descobrir isso na reunião de sexta.',
    // No telefone o radar não tem coluna: ele desceu para o fim de Meu trabalho,
    // e a agenda é que ganhou lugar próprio na barra.
    textoCel: 'A agenda mostra o que está marcado, e o radar, o que travou ou atrasou, no fim '
      + 'da tela de Trabalho. Os dois existem para você não descobrir isso na reunião de sexta.',
    alvo: 'radar',
    alvoCel: 'tab-agenda',
  },
  {
    id: 'sino',
    titulo: 'O sino avisa, e avisa pouco',
    texto: 'Chega aqui o que passou a depender de você: tarefa nova, checkpoint pronto, prazo '
      + 'vencendo, nota que alguém compartilhou. Fora do app só sai o urgente, e você escolhe '
      + 'o que é em Ajustes.',
    // No telefone o sino não está na barra de cima: ele mora na sua bolinha,
    // junto com o resto que não é do dia a dia. Apontar para um sino que não
    // está ali seria ensinar o caminho errado.
    textoCel: 'Toque na sua bolinha e o sino está lá: tarefa nova, checkpoint pronto, prazo '
      + 'vencendo, nota que alguém compartilhou. Fora do app só sai o urgente, e você escolhe '
      + 'o que é em Ajustes.',
    alvo: 'sino',
    alvoCel: 'eu',
  },
  {
    id: 'fim',
    titulo: 'O resto mora aqui',
    texto: 'Seu perfil, o tema, os ajustes e tudo que não é do dia a dia. Se quiser ver este '
      + 'tutorial de novo, ele fica em Ajustes.',
    alvo: 'eu',
  },
]

/** Os passos deste espaço. A lista é a mesma; o que muda é o que não existe lá. */
export function passosDe(pode: Recursos): Passo[] {
  const tipo = pode.canais ? 'empresa' : 'pessoal'
  return PASSOS.filter((p) => !p.quando || p.quando === tipo)
}
