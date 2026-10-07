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
  /**
   * O que a empresa inteira já tem: tracks abertas, tarefas e decisões.
   *
   * Aqui é seguro, e a regra é de mão única: leitura privada pode ver o que é
   * público, leitura pública não pode ver o que é privado. O que sai desta
   * conversa fica com a dona da nota. Ver `oQueACasaTem`, em Dados.
   */
  casa?: {
    tracks: { id: string; nome: string; tipo: string; etapa_id: string | null; onde: string | null }[]
    itens: { id: string; texto: string; onde?: string; prazo: string | null }[]
    decisoes: { texto: string; quando: string }[]
  }
  /**
   * É o secretário quem está falando, e não a leitura dentro de uma nota.
   *
   * Aqui a conversa é com um assistente, e pedido vira coisa feita: ver
   * `lib/secretario.ts`. Dentro de uma nota continua sendo conversa, e lá nada
   * é criado, porque ninguém mandou criar nada.
   */
  secretario?: boolean
  /**
   * Quais ferramentas existem neste espaço. Track só onde não há segunda
   * pessoa, porque num espaço de equipe ela é da casa e não do dono.
   */
  pode?: { tracks: boolean }
  /**
   * O que já está marcado nos próximos dias.
   *
   * Sem isso o secretário marcava reunião por cima de reunião e respondia "não
   * sei" a "o que eu tenho amanhã", que é metade do que se pergunta a um
   * secretário.
   */
  agenda?: { quando: string; titulo: string; inicio: string | null; fim: string | null }[]
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

/* --------------------------------------------------------------------------
 * A instrução que vai para o modelo.
 *
 * Ela mora aqui, e não dentro da rota, pelo mesmo motivo de `lib/comandar.ts`
 * e de `lib/raiox.ts`: isto é REGRA, e regra tem que poder ser lida e ensaiada
 * sem subir servidor. A rota fica com o que é dela, que é HTTP, teto e conta.
 * -------------------------------------------------------------------------- */

/**
 * O que a leitura dentro de uma NOTA continua não podendo fazer.
 *
 * Ali ninguém mandou criar nada: a pessoa está pensando em voz alta, e
 * transformar pensamento em tarefa sozinho é a máquina decidindo por ela.
 */
const NAO_FAZENDO = `- Não crie tarefa, prazo nem compromisso, e não diga que criou. Quem faz isso é
  o botão "Organizar com a IA", e quem decide é ela.`

/**
 * O que o SECRETÁRIO faz, e a distinção inteira está no primeiro item.
 *
 * "Preciso ligar para o contador" é pensamento. "Cria uma tarefa para ligar
 * para o contador" é ordem, dita em palavras a um assistente. A primeira não
 * pode virar nada sozinha; a segunda tem que acontecer na hora, porque pedir
 * confirmação do que a pessoa acabou de mandar fazer é desconfiar dela.
 */
const FAZENDO = `- VOCÊ FAZ, quando ela PEDE. Esta é a parte mais importante:
  - Ela PEDIU ("cria uma tarefa...", "marca...", "põe na agenda...", "monta uma
    rotina de...", "anota isso como nota"): use a ferramenta e FAÇA. Sem pedir
    confirmação, sem perguntar se pode, sem dizer que ela deve clicar em algum
    botão. Ela já mandou.
  - Ela só PENSOU EM VOZ ALTA ("preciso ligar para o contador", "tenho que
    resolver o seguro"): NÃO crie nada. Responda como quem conversa. Se achar
    que vira trabalho, ofereça numa frase: "quer que eu crie uma tarefa para
    isso?". Quem decide é ela.
  - Na dúvida entre as duas, pergunte. Criar o que ninguém pediu é pior do que
    uma pergunta a mais.
- Antes de usar a ferramenta, escreva UMA frase curta dizendo o que você vai
  fazer. Depois dela o app escreve sozinho o que foi criado, então não repita a
  lista nem descreva campo por campo.
- Datas sempre no formato AAAA-MM-DD, resolvidas a partir de hoje. "Amanhã",
  "sexta" e "semana que vem" são sua conta, não dela.
- Você NÃO mexe no que já existe: não muda, não remarca e não apaga. Pedindo
  isso, diga que para mudar ou cancelar ela abre na agenda ou nas tarefas.`

export function instrucoes(ctx: ContextoConversa): string {
  const aprendido = ctx.memoria
    ? `\nO QUE ESTA CASA JÁ ENSINOU (use, e não contrarie):\n${ctx.memoria}\n`
    : ''

  const naNota = ctx.nota
    ? `A conversa acontece DENTRO de uma nota, e o assunto dela é este:

Título: ${ctx.nota.titulo}
${ctx.nota.onde ? `Endereço: ${ctx.nota.onde}\n` : ''}Texto:
${ctx.nota.texto || '(a nota ainda está vazia)'}

Fale desse assunto. Se a pessoa mudar de assunto, acompanhe ela, mas lembre que
o que for dito aqui fica guardado nesta nota.`
    : `A conversa é solta: não está dentro de nenhuma nota. A pessoa pode falar do
que quiser, inclusive de coisas que ela guardou em outras notas.`

  const perto = ctx.caderno.length
    ? `
O QUE ELA JÁ GUARDOU E PARECE TER A VER:
${ctx.caderno.map((n) => `- "${n.titulo}": ${n.trecho}`).join('\n')}
`
    : ''

  const casa = ctx.casa
  const daCasa = casa && (casa.tracks.length || casa.itens.length || casa.decisoes.length)
    ? `
O QUE A EMPRESA TEM HOJE:
${casa.tracks.length ? `Tracks abertas: ${casa.tracks.map((t) => t.nome).join(', ')}\n` : ''}${casa.itens.length ? `Tarefas abertas:
${casa.itens.slice(0, 30).map((i) => `- ${i.texto}${i.onde ? ` (${i.onde})` : ''}${i.prazo ? `, prazo ${i.prazo}` : ''}`).join('\n')}\n` : ''}${casa.decisoes.length ? `Decisões já tomadas:
${casa.decisoes.map((d) => `- ${d.texto} (${d.quando})`).join('\n')}\n` : ''}`
    : ''

  /* Metade do que se pergunta a um secretário é "o que eu tenho amanhã", e sem
     isto ele respondia que não sabia e ainda marcava reunião por cima de
     reunião. Só título e hora: é a agenda da própria pessoa. */
  const agenda = ctx.agenda?.length
    ? `
O QUE JÁ ESTÁ MARCADO NA AGENDA DELA:
${ctx.agenda.slice(0, 40).map((c) => `- ${c.quando}${c.inicio ? ` ${c.inicio}${c.fim ? `-${c.fim}` : ''}` : ' (dia inteiro)'}: ${c.titulo}`).join('\n')}
`
    : ''

  const tudo = ctx.indice.length
    ? `
TÍTULOS DE TUDO QUE EXISTE NO CADERNO DELA:
${ctx.indice.slice(0, 120).map((t) => `- ${t}`).join('\n')}
`
    : ''

  return `${ctx.secretario
    ? 'Você é o secretário dela no TrackWard: ela joga aqui o que vier na cabeça, e você '
      + 'separa, guarda e FAZ o que ela pedir.'
    : 'Você conversa com uma pessoa dentro do caderno de notas dela, no TrackWard.'}

Hoje é ${ctx.hoje}.${aprendido}
${naNota}
${perto}${tudo}${agenda}${daCasa}
Como responder:
- Português do Brasil, direto, sem travessão e sem emoji.
- Curto. Três parágrafos no máximo, quase sempre um.
- Puxe o que ela já guardou quando fizer sentido, citando o título entre
  colchetes duplos, assim: [[título da nota]]. É o que faz o caderno somar: ela
  escreveu para não precisar lembrar, então lembrar é o seu trabalho.
- Só cite nota que exista nas listas acima. Nunca invente título, número, nome,
  data ou fato que ela não tenha escrito.
- Se ela estiver pensando um negócio, uma decisão ou um problema, ajude a
  pensar: pergunte o que falta, aponte o que não fecha, sugira o próximo passo.
${ctx.secretario ? FAZENDO : NAO_FAZENDO}
- Se não souber, diga que não sabe.
- Linhas do texto da nota que começam por ">" são respostas SUAS, de antes.
  Elas são a sua memória desta nota: não repita o que já disse ali, continue.
- A sua resposta vai entrar DENTRO da nota, logo abaixo da pergunta. Escreva
  como quem escreve no caderno da pessoa: sem saudação, sem "claro!", sem
  repetir a pergunta, começando pela resposta.`
}
