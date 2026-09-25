/**
 * Como uma track termina.
 *
 * São dois fins: **concluída**, que é o último checkpoint fechado, e
 * **cancelada**, que é tudo o mais. Os dois arquivam, e arquivar não apaga:
 * a track sai da lista principal e continua inteira em Arquivadas, com trilha,
 * tarefas, conversa e anexos.
 *
 * O motivo do cancelamento é **escolhido**, e não digitado. Motivo digitado
 * vira trinta frases diferentes para a mesma coisa ("cliente desistiu",
 * "cliente não fechou", "não fechou com o cliente"), e trinta frases não viram
 * número nenhum. O texto livre continua existindo em `detalhe`, para o que só
 * aquele caso explica, e ele não entra na conta.
 */

export type Motivo = {
  id: string
  nome: string
  /** O que ele quer dizer, para ninguém escolher pelo nome mais curto. */
  sobre: string
}

export const MOTIVOS: Motivo[] = [
  { id: 'cliente', nome: 'O cliente não seguiu',
    sobre: 'Não fechou, desistiu ou sumiu. A decisão foi de fora.' },
  { id: 'prioridade', nome: 'Deixou de ser prioridade',
    sobre: 'A casa escolheu outra coisa. Pode voltar depois.' },
  { id: 'virou-outra', nome: 'Virou outra track',
    sobre: 'O trabalho continua, com outro recorte ou outro nome.' },
  { id: 'inviavel', nome: 'Não era viável',
    sobre: 'Prazo, custo, gente ou fornecedor inviabilizaram.' },
  { id: 'engano', nome: 'Criada por engano',
    sobre: 'Duplicada, de teste, ou nunca deveria ter nascido.' },
  { id: 'outro', nome: 'Outro motivo',
    sobre: 'Nenhum dos de cima. Escreva embaixo o que foi.' },
]

export const nomeDoMotivo = (id: string | null | undefined) =>
  MOTIVOS.find((m) => m.id === id)?.nome || (id ? 'Outro motivo' : '')

/** Ela saiu da lista principal? Concluída ou cancelada, dá no mesmo aqui. */
export const arquivada = (f: { desfecho?: string | null; concluido?: boolean }) =>
  !!f.desfecho || !!f.concluido
