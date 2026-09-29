/**
 * A caixa de e-mail como segunda entrada, lida pelo ENVELOPE.
 *
 * O plano previa um endereço para onde encaminhar. A forma melhor é a
 * contrária: a pessoa conecta a caixa dela, e o app repara no que já acontece
 * ali. Ninguém encaminha nada, porque ninguém precisa.
 *
 * ## Envelope, e não conteúdo
 *
 * O app **não lê o corpo de e-mail nenhum**, e isso é arquitetura, não promessa:
 * o leitor pede ao servidor só o envelope e a estrutura (remetente,
 * destinatário, assunto, data, nome dos anexos), que é um pedido diferente de
 * pedir a mensagem. O corpo não chega nem a passar pela rede.
 *
 * Dois motivos, e os dois decidem sozinhos:
 *
 * **Não precisa.** O app já sabe o que está esperando: a tarefa "Relatório de
 * setembro", de quem, com prazo. Para saber que chegou, basta reparar que saiu
 * um e-mail daquela pessoa, com anexo, cujo assunto casa. Ler o texto não
 * acrescenta nada a isso.
 *
 * **E custaria caro nos dois sentidos.** Uma pessoa recebe umas cem mensagens
 * por dia; vinte pessoas dão sessenta mil por mês, e lê-las com modelo é da
 * ordem de mil dólares mensais por empresa. Pior que o dinheiro: caixa de
 * trabalho tem demissão, salário, atestado e advogado, e o que entra na leitura
 * volta pela porta do motivo, porque a proposta aparece com o trecho que a
 * originou. É a regra de mão única do AGENTS.
 *
 * ## A caixa de SAÍDA é a metade que ninguém usa
 *
 * "Terminei o relatório e mandei" não precisa virar um clique: está nos
 * enviados. É o mesmo princípio do WhatsApp, que é ler o trabalho onde ele
 * acontece, aplicado ao lugar onde metade do trabalho de escritório acontece.
 */

export type Envelope = {
  /**
   * O `Message-ID`, que é único e igual nos dois lados.
   *
   * É ele que faz o mesmo e-mail, visto na saída de quem mandou e na entrada de
   * quem recebeu, contar uma vez só. Sem isso, empresa com a equipe inteira
   * conectada casaria tudo em dobro.
   */
  id: string
  de: string
  para: string[]
  assunto: string
  quando: string
  anexos: { nome: string; tamanho: number }[]
  /** Do ponto de vista de quem conectou a caixa. */
  direcao: 'entrada' | 'saida'
  /** De quem é a caixa onde isto foi visto. */
  perfil: string
}

/** Uma tarefa em aberto, e quem responde por ela. */
export type Espera = {
  item_id: string
  texto: string
  /** O perfil de quem responde. */
  quem: string | null
  /** O e-mail dessa pessoa, quando se sabe. */
  email: string | null
  prazo: string | null
}

export type Casamento = {
  item_id: string
  envelope: string
  /** O anexo que sustenta a entrega, quando há um. */
  anexo: string | null
  /**
   * O que fazer com isso.
   *
   * `concluir` quando a prova vem da PRÓPRIA caixa de saída de quem responde
   * pela tarefa: marcar como feita o que a pessoa acabou de mandar não é
   * decidir por ela, é registrar o que ela fez. `propor` em todo o resto,
   * porque aí a conclusão é sobre o trabalho de outra pessoa.
   */
  faz: 'concluir' | 'propor'
  /** A frase que explica, e que vai junto da proposta. */
  porque: string
  forca: number
}

/** Abaixo disto não casa: assunto parecido por acaso é o que mais existe. */
const MINIMO = 0.45
/** E o segundo candidato precisa ficar para trás, senão é empate com cara de conta. */
const FOLGA = 0.15

const limpo = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/**
 * As palavras que valem.
 *
 * Fora as curtas e as de encher linguiça: "o relatório de setembro" e "segue o
 * relatório em anexo, conforme combinado" casariam por "de", "em" e "o".
 */
const VAZIAS = new Set([
  'para', 'com', 'que', 'dos', 'das', 'uma', 'uns', 'pelo', 'pela', 'seu', 'sua',
  'esse', 'essa', 'este', 'esta', 'aqui', 'segue', 'anexo', 'anexos', 'favor',
  'conforme', 'combinado', 'obrigado', 'obrigada', 'bom', 'dia', 'boa', 'tarde',
  'noite', 'res', 'enc', 'fwd', 'encaminhada', 'mensagem',
])

export function palavras(t: string): Set<string> {
  return new Set(
    limpo(t).split(/[^a-z0-9]+/)
      .filter((w) => w.length > 3 && !VAZIAS.has(w)),
  )
}

/** O quanto o assunto e os anexos falam da tarefa. 1 é tudo, 0 é nada. */
export function parece(assunto: string, anexos: string[], tarefa: string): number {
  const a = palavras([assunto, ...anexos].join(' '))
  const b = palavras(tarefa)
  if (!a.size || !b.size) return 0
  let juntos = 0
  for (const w of b) if (a.has(w)) juntos++
  // Sobre as palavras da TAREFA, e não sobre a união: um assunto longo não pode
  // diluir o casamento de uma tarefa curta.
  return juntos / b.size
}

/** O e-mail aparece no envelope, de qualquer lado? */
const tocou = (e: Envelope, email: string | null) =>
  !!email && (limpo(e.de) === limpo(email) || e.para.some((p) => limpo(p) === limpo(email)))

/**
 * O que estes envelopes resolvem das tarefas em aberto.
 *
 * Um envelope resolve no máximo uma tarefa, e uma tarefa é resolvida no máximo
 * uma vez: dois casamentos para o mesmo e-mail é o app contando a mesma entrega
 * duas vezes, que é pior do que não contar nenhuma.
 */
export function casarCaixa(envelopes: Envelope[], esperas: Espera[]): Casamento[] {
  const saida: Casamento[] = []
  const usados = new Set<string>()
  const resolvidas = new Set<string>()

  // O mesmo e-mail visto na saída de um e na entrada de outro é um só.
  const unicos = new Map<string, Envelope>()
  for (const e of envelopes) {
    // A saída vence a entrada: ela prova quem MANDOU, que é a informação forte.
    const atual = unicos.get(e.id)
    if (!atual || (atual.direcao === 'entrada' && e.direcao === 'saida')) unicos.set(e.id, e)
  }

  // Do mais forte para o mais fraco, para o melhor casamento não perder a vez
  // para um pior que apareceu antes na lista.
  const pares: { e: Envelope; t: Espera; forca: number }[] = []
  for (const e of unicos.values()) {
    for (const t of esperas) {
      // Quem responde pela tarefa precisa estar no envelope. Sem isso, "relatório"
      // no assunto casaria com a tarefa de relatório de qualquer pessoa da casa.
      if (!tocou(e, t.email)) continue
      const forca = parece(e.assunto, e.anexos.map((a) => a.nome), t.texto)
      if (forca >= MINIMO) pares.push({ e, t, forca })
    }
  }
  pares.sort((a, b) => b.forca - a.forca)

  for (let i = 0; i < pares.length; i++) {
    const { e, t, forca } = pares[i]
    if (usados.has(e.id) || resolvidas.has(t.item_id)) continue

    // Empate técnico entre duas tarefas para o mesmo e-mail: não escolhe.
    const rival = pares.find((p, k) => k !== i && p.e.id === e.id && p.t.item_id !== t.item_id)
    if (rival && forca - rival.forca < FOLGA) continue

    usados.add(e.id)
    resolvidas.add(t.item_id)

    const anexo = e.anexos[0]?.nome ?? null
    /**
     * A prova de que a PRÓPRIA pessoa mandou: a caixa é dela e o envelope saiu.
     * Aí concluir é registrar o que ela fez, e não decidir pelo trabalho de
     * outra. Em qualquer outro caso vira proposta.
     */
    const dela = e.direcao === 'saida' && e.perfil === t.quem
    saida.push({
      item_id: t.item_id, envelope: e.id, anexo,
      faz: dela ? 'concluir' : 'propor',
      porque: dela
        ? `Você mandou "${e.assunto}"${anexo ? ` com ${anexo}` : ''} em ${e.quando.slice(0, 10)}.`
        : `Chegou "${e.assunto}"${anexo ? ` com ${anexo}` : ''} de ${e.de}.`,
      forca: Math.round(forca * 100) / 100,
    })
  }

  return saida
}
