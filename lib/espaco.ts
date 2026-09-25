import type { Organizacao } from './tipos'

/**
 * O que cada espaço sabe fazer.
 *
 * São dois: o **empresarial**, que é o app inteiro, e o **pessoal**, que é o
 * mesmo app sem o que exige uma segunda pessoa. A lógica não muda entre eles,
 * de propósito: quem cria o hábito na empresa e depois abre o espaço pessoal
 * não pode ter que reaprender o produto, senão não usa.
 *
 * Esta lista existe num arquivo só porque a alternativa é `org.tipo ===
 * 'pessoal'` espalhado por quarenta telas, e aí a regra passa a viver na
 * memória de quem escreveu a última. No dia em que alguém criar tela nova,
 * ninguém lembra, e aparece um campo de responsável num app de uma pessoa só.
 *
 * Aqui é a tela. O banco tem as recusas dele, que são o que garante a regra de
 * verdade: espaço pessoal não recebe convite nem segundo perfil.
 */
export type Recursos = {
  /** Canal, mensagem, menção, não lidas. Falar com alguém. */
  canais: boolean
  /** Convite, papel, gestor, a tela de Equipe. */
  equipe: boolean
  /** Responsável que não é você, e a carga de cada um. */
  delegar: boolean
  /** Aprovador de checkpoint e o aceite de saída. */
  aprovacao: boolean
  /** Quem enxerga a track: equipe, escolhidas, só eu. */
  visibilidade: boolean
  /** Empresas dentro da organização. */
  empresas: boolean
}

/**
 * Sozinho não há a quem pedir aceite, de quem esconder, nem para quem delegar.
 * O que sobra é o app inteiro: track, trilha, tarefa, prazo, processo, nota,
 * agenda, relatório, agente, conector e aviso continuam iguais.
 *
 * A trava entre tarefas fica de fora desta lista e continua valendo: "não dá
 * para pintar antes de rebocar" é seu com você mesmo, e vale sozinho. O que
 * some com a delegação é o aviso de quem está segurando, que ali é sempre você.
 */
export function recursos(org: Pick<Organizacao, 'tipo' | 'multi'>): Recursos {
  const sozinho = org.tipo === 'pessoal'
  return {
    canais: !sozinho,
    equipe: !sozinho,
    delegar: !sozinho,
    aprovacao: !sozinho,
    visibilidade: !sozinho,
    empresas: !sozinho && !!org.multi,
  }
}
