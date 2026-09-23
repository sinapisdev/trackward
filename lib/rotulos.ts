import type { Tipo } from './tipos'

/**
 * As palavras do produto, em um lugar só.
 *
 * O modelo tem dois tipos de track e nada mais:
 *
 *   Objetivo   tem fim. Acaba quando chega no último checkpoint.
 *   Rotina     não tem fim. Dá voltas, e cada volta vira histórico.
 *
 * As duas podem morar numa **área** ou viver soltas, porque nem todo trabalho
 * de uma empresa cabe numa frente existente: um negócio novo não tem área ainda,
 * e forçar uma seria inventar organização antes de ela existir.
 *
 * Fora das tracks existe a **tarefa avulsa**: a que não pertence a objetivo nem
 * a rotina. Ela é privada de quem criou, de propósito. Tarefa que a empresa
 * precisa acompanhar pertence a alguma coisa; o que não pertence a nada é
 * lembrete, e lembrete dos outros não é assunto da casa.
 *
 * No banco os nomes são outros, e continuam sendo: `fluxos` para a track,
 * `esteira` para o objetivo, `ciclo` para a rotina. Renomear coluna de banco por
 * causa de rótulo de tela é trocar uma dívida barata por uma cara. Este arquivo
 * é a ponte entre os dois vocabulários, e é o único lugar que precisa saber
 * disso.
 */

export const rotuloTipo = (t: Tipo) => (t === 'ciclo' ? 'Rotina' : 'Objetivo')
export const rotuloTipoPlural = (t: Tipo) => (t === 'ciclo' ? 'Rotinas' : 'Objetivos')

/** O artigo certo, para a frase não sair capenga. */
export const artigo = (t: Tipo) => (t === 'ciclo' ? 'a' : 'o')

/** O que a track é, em uma linha, para quem está escolhendo o tipo. */
export const explicaTipo = (t: Tipo) =>
  t === 'ciclo'
    ? 'Se repete a cada período e guarda o histórico de cada volta. Ex.: fechamento mensal.'
    : 'Tem começo, checkpoints e fim. Ex.: implantação, obra, negócio novo.'

export const AVULSA = 'Avulsa'
export const EXPLICA_AVULSA = 'Sem objetivo e sem rotina. Só você vê.'
