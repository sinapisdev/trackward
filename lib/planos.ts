import type { Organizacao } from './tipos'

/**
 * Os planos, e o que cada um libera.
 *
 * **Isto não é a mesma pergunta que `recursos()` responde.** Lá é "este tipo de
 * espaço tem isto?", e a resposta nunca muda: num espaço de uma pessoa não
 * existe aprovador, e não existe por preço nenhum. Aqui é "o que foi contratado
 * inclui isto?", e a resposta muda quando alguém paga. Misturar as duas num
 * objeto só faria a tela perguntar "posso delegar?" sem saber se está
 * perguntando sobre o produto ou sobre a fatura.
 *
 * **A cobrança acontece fora do app**, por contrato, e quem liga o plano é a
 * operação do TrackWard pelo banco, nunca o administrador do cliente: se o admin
 * dele pudesse escolher, ele escolheria o maior. Por isso não existe tela de
 * trocar de plano, e sim `supabase/planos.sql`.
 *
 * **O teto de leitura não quebra o produto.** Estourado, a leitura cai nas
 * regras embutidas e o app segue inteiro (ver `pode_chamar_modelo` no schema).
 * É isso que deixa o limite ser degrau de plano em vez de porta na cara, e é a
 * razão de ele ser o número que separa os planos.
 */
export type IdPlano = 'teste' | 'reduzido' | 'pessoal' | 'equipe' | 'interno'

export type Plano = {
  id: IdPlano
  nome: string
  /** Em que tipo de espaço este plano faz sentido. */
  onde: 'pessoal' | 'equipe' | 'ambos'
  /** Uma linha, para a tela dizer o que a pessoa tem. */
  resumo: string
  /**
   * Quantas pessoas ativas cabem. Nulo é sem limite.
   *
   * No espaço pessoal é sempre 1, e não por preço: o banco recusa o segundo
   * perfil lá (seção 20). O número aqui existe para o Enterprise.
   */
  assentos: number | null
  /**
   * Leituras com modelo por mês. Nulo é sem teto.
   *
   * No Enterprise este número é POR ASSENTO ATIVO, porque o custo de IA anda
   * com o tamanho da equipe: um teto fixo puniria quem cresce, que é
   * exatamente o cliente que se quer manter.
   */
  leituras: number | null
  /** Por assento, e não o total. Só no Enterprise. */
  leiturasPorAssento: boolean
  /** Criar coisa nova. É o que o modo reduzido tira. */
  cria: boolean
  /** A leitura das conversas e das notas. */
  ia: boolean
  /** Rotinas, que é o que o pessoal barato não traz. */
  rotinas: boolean
  /** Agenda externa, por link do Google ou do Outlook. */
  agendaExterna: boolean
  /** Relatórios e desempenho. */
  relatorios: boolean
  /** Processos, o molde da track. */
  processos: boolean
  /** Agentes, as regras que ficam de olho. */
  agentes: boolean
  /** Conectores para sistemas de fora. */
  conectores: boolean
}

const TUDO = {
  cria: true, ia: true, rotinas: true, agendaExterna: true,
  relatorios: true, processos: true, agentes: true, conectores: true,
}

export const PLANOS: Record<IdPlano, Plano> = {
  /**
   * Catorze dias com tudo. Sem cartão, porque ainda não há por onde passá-lo, e
   * sem nada escondido: teste que esconde metade do produto testa outra coisa.
   */
  teste: {
    id: 'teste', nome: 'Teste', onde: 'ambos',
    resumo: 'Catorze dias com o app inteiro.',
    assentos: 10, leituras: 200, leiturasPorAssento: false, ...TUDO,
  },

  /**
   * O que sobra quando o teste vence e ninguém contratou.
   *
   * **Dá para ler tudo e para terminar o que já estava em pé**, e não dá para
   * começar nada. Isso é de propósito e é a única forma decente de reduzir:
   * apagar ou trancar os dados de quem estava avaliando é sequestro, e quem
   * passa por isso não volta. Sem criar tarefa, track, nota, canal nem
   * convite, o app deixa de servir para trabalhar em duas horas, que é o
   * aperto que a decisão precisa.
   */
  reduzido: {
    id: 'reduzido', nome: 'Reduzido', onde: 'ambos',
    resumo: 'Leitura do que já existe. Para voltar a trabalhar, contrate.',
    assentos: null, leituras: 0, leiturasPorAssento: false,
    cria: false, ia: false, rotinas: false, agendaExterna: false,
    relatorios: false, processos: false, agentes: false, conectores: false,
  },

  /** Uma pessoa, o app inteiro que faz sentido sozinho. */
  pessoal: {
    id: 'pessoal', nome: 'Pessoal', onde: 'pessoal',
    resumo: 'Só seu, e continua seu se você sair da empresa.',
    assentos: 1, leituras: 150, leiturasPorAssento: false, ...TUDO,
  },

  /** Por assento ativo. O teto de leitura anda junto com o tamanho. */
  equipe: {
    id: 'equipe', nome: 'Enterprise', onde: 'equipe',
    resumo: 'Por pessoa ativa, com tudo liberado.',
    assentos: null, leituras: 120, leiturasPorAssento: true, ...TUDO,
  },

  /** A casa, e as contas de demonstração. Sem teto e sem prazo. */
  interno: {
    id: 'interno', nome: 'Interno', onde: 'ambos',
    resumo: 'Sem teto e sem prazo.',
    assentos: null, leituras: null, leiturasPorAssento: false, ...TUDO,
  },
}

type Conta = Pick<Organizacao, 'tipo' | 'plano' | 'teste_ate' | 'limite_leituras'>

/**
 * O plano em vigor nesta conta, já contando o fim do teste.
 *
 * O vencimento é resolvido aqui, e não gravado por um relógio: um serviço que
 * vira o plano à meia-noite é mais uma peça para dar errado, e enquanto ele não
 * roda o cliente usa de graça. Data comparada na hora não erra e não atrasa.
 */
export function planoDe(org: Conta): Plano {
  const id = (org.plano || 'teste') as IdPlano
  const p = PLANOS[id] ?? PLANOS.teste
  if (p.id !== 'teste') return p
  const acabou = !org.teste_ate || Date.parse(org.teste_ate) < Date.now()
  return acabou ? PLANOS.reduzido : p
}

/** Quantos dias de teste sobraram. Zero ou menos é acabado. */
export function diasDeTeste(org: Pick<Organizacao, 'teste_ate'>): number {
  if (!org.teste_ate) return 0
  return Math.ceil((Date.parse(org.teste_ate) - Date.now()) / 86400000)
}

/**
 * O teto de leituras desta conta, já multiplicado pelos assentos quando o plano
 * conta por assento. Nulo é sem teto.
 *
 * `organizacoes.limite_leituras` manda sobre o número do plano, porque é a
 * coluna que a operação ajusta para um cliente específico sem mexer em código.
 * E ela é o número POR ASSENTO quando o plano é por assento, igual ao que
 * `pode_chamar_modelo` faz no banco: se aqui fosse o total e lá o unitário, a
 * tela diria um número e a leitura pararia noutro.
 */
export function tetoDeLeituras(org: Conta, ativos: number): number | null {
  const p = planoDe(org)
  const base = org.limite_leituras ?? p.leituras
  if (base === null) return null
  return p.leiturasPorAssento ? base * Math.max(1, ativos) : base
}
