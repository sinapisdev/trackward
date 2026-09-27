/**
 * A pergunta do dia: como o app aprende a empresa sem pedir para ela se explicar.
 *
 * O jeito errado é o formulário: "como é o seu processo de compras?". Ninguém
 * sabe responder isso, e quem tenta descreve o processo que **gostaria** de
 * ter, não o que tem. A resposta vem bonita, entra no sistema, e não bate com
 * nada do que acontece de verdade.
 *
 * O jeito certo é perguntar sobre a **borda**, nunca sobre o conteúdo:
 *
 *   errado: "como funciona o seu fechamento mensal?"
 *   certo:  "o relatório do contador chegou?"
 *
 * A segunda tem resposta de dez segundos, e a resposta é um **evento**. Cem
 * eventos desenham o processo sem ninguém ter descrito nada.
 *
 * ## Três regras que impedem isto de virar chatice
 *
 * **A pergunta é ganha, não sorteada.** Cada uma existe porque revela um evento
 * que o app não consegue inferir sozinho. Se ele já sabe, não pergunta.
 *
 * **A pergunta se poda.** A que voltar vazia três semanas seguidas sai daquela
 * empresa para sempre. A que sempre revela alguma coisa ganha prioridade. Em um
 * mês o conjunto convergiu para aquela casa sem ninguém configurar nada.
 *
 * **A pergunta diminui.** Na primeira semana, até três por dia; na quarta, uma,
 * e só quando o app não inferiu. Se virar obrigação, a resposta morre, e aí não
 * se perde só a pergunta: perde-se a disposição de responder qualquer coisa.
 *
 * ## O que sobe para o acervo entre clientes
 *
 * Só a FORMA (princípio 1.5): qual pergunta costuma ser respondida, qual
 * costuma revelar alguma coisa, quantas etapas um primeiro processo aguenta.
 * Nunca o conteúdo: nome, texto, valor, conversa, empresa. O acervo mora em
 * tabela própria, sem chave estrangeira para dado de cliente nenhum, porque a
 * separação precisa ser de estrutura e não de intenção.
 */

export type Papel = 'admin' | 'gestor' | 'colaborador'

export type Molde = {
  /** A chave é o que sobe para o acervo. Ela não carrega nada de ninguém. */
  chave: string
  /** Para quem faz sentido perguntar. Vazio é todo mundo. */
  papeis?: Papel[]
  /** O texto, com {nome} trocado na hora. */
  texto: string
  /**
   * O que a resposta revela. É isto que justifica a pergunta existir: sem um
   * evento do outro lado, ela é conversa fiada com cara de produto.
   */
  revela: string
  /** Quando faz sentido: todo dia, ou só num dia da semana (0 é domingo). */
  dia?: number
  /**
   * Esta pergunta é sobre coisa que ENTRA na casa. São as mais valiosas: o app
   * consegue inferir quase tudo que acontece dentro dele, e quase nada do que
   * chegou de fora sem ninguém registrar.
   */
  entrada?: boolean
}

/**
 * O catálogo.
 *
 * Curto de propósito. Cada molde aqui é uma pergunta que eu conseguiria
 * defender na frente do dono da empresa: ela tem resposta curta, a resposta é
 * um fato, e o app não tinha como saber sozinho.
 */
export const MOLDES: Molde[] = [
  {
    chave: 'entrou-hoje',
    texto: 'Bom dia, {nome}. Entrou algum trabalho novo hoje que ainda não está aqui?',
    revela: 'trabalho que começou fora do app',
    entrada: true,
  },
  {
    chave: 'esperando-voce',
    texto: '{nome}, tem alguma coisa esperando só a sua decisão agora?',
    revela: 'decisão parada sem estar registrada',
    papeis: ['admin', 'gestor'],
  },
  {
    chave: 'travou-semana',
    texto: 'Alguma coisa travou esta semana e ficou esperando outra pessoa?',
    revela: 'dependência entre áreas que ninguém registrou',
    dia: 5,
  },
  {
    chave: 'combinado-fora',
    texto: 'Foi combinado algo importante por fora do app hoje, numa ligação ou numa reunião?',
    revela: 'combinado que existe só na cabeça de duas pessoas',
    entrada: true,
  },
  {
    chave: 'refez',
    texto: 'Teve algo que precisou ser refeito esta semana? O que faltou da primeira vez?',
    revela: 'o checkpoint que está faltando no processo',
    dia: 5,
  },
  {
    chave: 'quem-faz',
    texto: 'Quando aparece um trabalho novo desses, quem costuma pegar?',
    revela: 'o dono de fato do processo, que quase nunca é o do organograma',
    papeis: ['admin', 'gestor'],
  },
]

/** O que a casa já sabe sobre uma pergunta, naquela pessoa. */
export type Historico = {
  chave: string
  perfil_id: string
  mandadas: number
  respondidas: number
  /** Quantas voltaram sem revelar nada. Três seguidas e ela sai. */
  vazias_seguidas: number
  /** Quantas vezes a resposta virou alguma coisa: tarefa, nota, dependência. */
  revelou: number
  ultima_em: string | null
}

/** Três semanas voltando vazia e a pergunta sai daquela pessoa. */
const PACIENCIA = 3

/**
 * Quantas perguntas por dia, conforme a casa vai sendo entendida.
 *
 * Cai rápido de propósito. A primeira semana é a que mais precisa e a que mais
 * tolera; da quarta em diante, uma por dia já é mais do que a maioria aguenta
 * sem começar a ignorar.
 */
export function quantasHoje(diasDeCasa: number): number {
  if (diasDeCasa <= 7) return 3
  if (diasDeCasa <= 14) return 2
  if (diasDeCasa <= 28) return 1
  // Depois do primeiro mês, só quando houver o que perguntar de verdade.
  return 1
}

type Escolha = { molde: Molde; texto: string; porque: string }

/**
 * As perguntas de hoje para uma pessoa.
 *
 * `jaSabe` é o que o app já conseguiu inferir sozinho: pergunta sobre coisa que
 * ele já sabe é a mais cara de todas, porque ensina a pessoa que responder não
 * muda nada.
 */
export function perguntasDeHoje(
  pessoa: { id: string; nome: string; papel: Papel },
  historico: Historico[],
  diasDeCasa: number,
  hoje: Date,
  jaSabe: string[] = [],
): Escolha[] {
  const daPessoa = new Map(historico.filter((h) => h.perfil_id === pessoa.id).map((h) => [h.chave, h]))
  const diaDaSemana = hoje.getDay()

  const vivos = MOLDES.filter((m) => {
    if (m.papeis && !m.papeis.includes(pessoa.papel)) return false
    if (m.dia !== undefined && m.dia !== diaDaSemana) return false
    if (jaSabe.includes(m.chave)) return false
    const h = daPessoa.get(m.chave)
    // Podada: voltou vazia vezes demais nesta casa.
    if (h && h.vazias_seguidas >= PACIENCIA) return false
    // Já foi hoje.
    if (h?.ultima_em && h.ultima_em.slice(0, 10) === hoje.toISOString().slice(0, 10)) return false
    return true
  })

  /**
   * A ordem: primeiro a semanal no dia dela, depois a que mais revelou nesta
   * casa, e as de entrada na frente em caso de empate.
   *
   * **A semanal vem na frente porque ela só tem uma chance na semana.** Sem
   * isso, ela perdia a vaga para as diárias toda sexta e nunca era feita: a
   * pergunta existia no catálogo e não acontecia na vida.
   *
   * A que nunca foi feita entra com meia nota, e não zero, porque pergunta não
   * testada não tem nota: deixá-la no fim da fila para sempre é nunca descobrir
   * se ela servia.
   */
  const nota = (m: Molde) => {
    const h = daPessoa.get(m.chave)
    if (!h || !h.mandadas) return 0.5
    return h.revelou / h.mandadas
  }

  return vivos
    .sort((a, b) =>
      (Number(b.dia !== undefined) - Number(a.dia !== undefined))
      || (nota(b) - nota(a))
      || (Number(!!b.entrada) - Number(!!a.entrada)))
    .slice(0, quantasHoje(diasDeCasa))
    .map((m) => ({
      molde: m,
      texto: m.texto.replace('{nome}', pessoa.nome.split(/\s+/)[0]),
      porque: m.revela,
    }))
}

/**
 * O que sobe para o acervo entre clientes.
 *
 * Só números e a chave do molde. Nenhum id, nenhum nome, nenhum texto. Esta
 * função existe para que a fronteira do princípio 1.5 seja um lugar no código
 * que dá para apontar, e não uma promessa espalhada.
 */
export function paraOAcervo(h: Historico): { chave: string; mandadas: number; respondidas: number; revelou: number } {
  return { chave: h.chave, mandadas: h.mandadas, respondidas: h.respondidas, revelou: h.revelou }
}
