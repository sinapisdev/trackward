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
   * O que ELA vê, e não o que a casa publica.
   *
   * `casa` existe para a leitura de um canal, e por isso só traz o que a
   * empresa inteira já podia ler: o que sai de lá aparece para todo mundo com
   * o trecho que o originou. Aqui é o contrário, e é o lado seguro da regra de
   * mão única: a conversa do secretário é da pessoa e fica com ela, então pode
   * entrar a track `escolhidas` em que ela está e a tarefa privada dela.
   *
   * Sem isto, "cria uma tarefa na Reforma" não achava a Reforma quando a
   * Reforma não era da equipe inteira, e "adia aquela tarefa" não tinha id
   * nenhum para mexer. É o que separa um assistente de um formulário falado.
   */
  meu?: {
    tracks: { id: string; nome: string; etapa_id: string | null; checkpoint: string | null }[]
    itens: { id: string; texto: string; onde: string; prazo: string | null }[]
  }
  /**
   * O que ela mandou junto e o modelo consegue LER.
   *
   * Imagem e PDF, e mais nada: planilha e documento do Word o modelo não abre,
   * e mandá-los seria pagar por uma leitura que não acontece. Eles continuam
   * guardados e achaveis como sempre, e o que falta é a conversão, não a
   * vontade.
   *
   * Vai a URL assinada, e não o arquivo: o balde é privado, a assinatura vence
   * em minutos, e passar o conteúdo por aqui dobraria o tamanho do pedido sem
   * mudar quem lê o arquivo no fim.
   */
  arquivos?: { nome: string; tipo: string; url: string }[]
  /**
   * A resposta sai em TEMPO REAL, e não de uma vez no fim.
   *
   * Vale para o secretário, que é onde a pessoa está olhando a tela esperando.
   * Dentro de uma nota a resposta entra no documento, e documento que cresce
   * sozinho enquanto alguém lê é pior que esperar.
   */
  transmitir?: boolean
  /**
   * É o secretário quem está falando, e não a leitura dentro de uma nota.
   *
   * Aqui a conversa é com um assistente, e pedido vira coisa feita: ver
   * `lib/secretario.ts`. Dentro de uma nota continua sendo conversa, e lá nada
   * é criado, porque ninguém mandou criar nada.
   */
  secretario?: boolean
  /**
   * Se este espaço tem uma segunda pessoa.
   *
   * Era `tracks`, e queria dizer "pode montar track", que só valia no pessoal.
   * Agora montar track vale em todo lugar, e o que a bandeira responde é outra
   * coisa: se existe "quem vê". Num espaço de uma pessoa a pergunta não se faz,
   * e perguntá-la seria o app inventando plateia onde não há ninguém.
   */
  pode?: { equipe: boolean }
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
- Você MUDA tarefa que já existe (texto, prazo, descrição), com mudar_tarefa.
  "Adia aquilo para sexta", "muda o nome daquela tarefa", "tira o prazo": é
  ordem, e você faz. O item_id sai das listas acima; não achando qual é, ou
  achando duas parecidas, PERGUNTE qual. Chutar aqui muda o trabalho errado, e
  quem vai descobrir é a pessoa que dependia dele.
- Você NÃO conclui tarefa e NÃO apaga nada, nem tarefa, nem track, nem
  compromisso. Marcar como feito o que não foi é a única mentira que este app
  não pode contar, e apagar não tem volta. Pedindo isso, diga onde ela faz: o
  visto da tarefa, e o menu dela para remover.
- Compromisso você também não remarca nem cancela: isso é na agenda.

MONTAR TRACK (objetivo ou rotina). Leia isto inteiro antes de usar criar_track.

É o que você faz de mais útil e onde meia resposta é pior do que nada: uma
trilha de títulos vazios ("Planejamento", "Execução", "Entrega") não ajuda
ninguém, e ainda dá trabalho de apagar.

- VOCÊ PERGUNTA ANTES. Não monte na primeira mensagem. Ninguém descreve uma obra
  inteira numa frase, e o que falta é sempre a mesma coisa: o fim, o prazo e o
  que já andou. Monte só depois de ter isso.
- UMA RODADA DE PERGUNTAS, não um interrogatório. Mande de três a cinco
  perguntas numeradas, numa mensagem só, e diga que ela pode responder em texto
  corrido. Seis mensagens de ida e volta para montar uma track é pior que o
  formulário que você existe para substituir.
- O QUE PERGUNTAR, nesta ordem de importância:
  1. Qual é o FIM: o que precisa estar pronto para esta track ter acabado. Numa
     rotina, o que fecha cada volta e de quanto em quanto tempo ela gira.
  2. O PRAZO final, ou para quando ela precisa estar pronta.
  3. O que JÁ ESTÁ PRONTO ou já foi combinado, para não nascer trabalho que já
     foi feito.
  4. As ETAPAS que ela já enxerga, se enxergar alguma, com as palavras dela.
  5. Num espaço com equipe, QUEM participa, e se é da empresa ou só dela.
  Não pergunte o que já está escrito acima nem o que ela acabou de dizer.
- DEPOIS DE RESPONDIDO, MONTE INTEIRO, numa tacada, e com TUDO preenchido:
  - três a sete CHECKPOINTS, em ordem. Cada um é uma PORTA: o nome diz o que
    passou a ser verdade ("Projeto aprovado"), não um assunto ("Projeto").
  - o CRITÉRIO de cada checkpoint é a frase que responde "como eu sei que dá
    para passar daqui?". Concreta e conferível, nunca "estar tudo certo".
  - o PRAZO de cada checkpoint, em dias a partir de hoje, acumulado e espalhado
    dentro do prazo final que ela deu.
  - as TAREFAS dentro de cada um, no imperativo e com objeto ("Levantar as
    medidas do terreno", nunca "Medidas"). Duas a quatro por checkpoint.
  - a DESCRIÇÃO de cada tarefa, que é o que quem for fazer precisa saber e não
    cabe no título: contra o que conferir, onde buscar, qual o critério. Uma ou
    duas frases. Esta é a parte que mais falta e a que mais vale.
  - o PRAZO de cada tarefa, em dias a partir de hoje, dentro do prazo do
    checkpoint dela.
- O QUE VOCÊ NÃO SABE, VOCÊ SUPÕE E DIZ QUE SUPÔS. Faltando um detalhe pequeno,
  escolha o mais provável, monte, e termine a resposta dizendo em uma linha o
  que você assumiu e que é só falar para mudar. Voltar a perguntar por causa de
  um prazo de tarefa é cobrar de quem já respondeu cinco perguntas.
- CASO ÓBVIO É EXCEÇÃO: ela mandou a trilha pronta, com etapas e prazos, ou
  pediu uma rotina simples e repetitiva que se descreve numa linha ("rotina de
  fechamento mensal: conferir notas, conciliar, enviar ao contador"). Aí monte
  direto, com o mesmo detalhe, e diga o que supôs.`

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

  /* Só o secretário recebe isto: dentro de uma nota a leitura não cria nem
     muda nada, então id de tarefa ali é contexto que não serve para nada e
     ainda ocupa a janela. */
  const meu = ctx.secretario && ctx.meu && (ctx.meu.tracks.length || ctx.meu.itens.length)
    ? `
AS TRACKS QUE ELA ENXERGA (use o id em criar_tarefa):
${ctx.meu.tracks.slice(0, 40).map((t) => `- ${t.nome} | fluxo_id=${t.id}${t.etapa_id ? ` | checkpoint atual "${t.checkpoint}" etapa_id=${t.etapa_id}` : ''}`).join('\n') || '(nenhuma)'}

AS TAREFAS ABERTAS DELA (use o id em mudar_tarefa):
${ctx.meu.itens.slice(0, 60).map((i) => `- ${i.texto} | ${i.onde}${i.prazo ? ` | prazo ${i.prazo}` : ' | sem prazo'} | item_id=${i.id}`).join('\n') || '(nenhuma)'}
`
    : ''

  const tudo = ctx.indice.length
    ? `
TÍTULOS DE TUDO QUE EXISTE NO CADERNO DELA:
${ctx.indice.slice(0, 120).map((t) => `- ${t}`).join('\n')}
`
    : ''

  return `Hoje é ${ctx.hoje}.${aprendido}
${naNota}
${perto}${tudo}${agenda}${meu}${daCasa}`
}

/**
 * As REGRAS, separadas do que muda a cada mensagem.
 *
 * A divisão não é organização: é o que permite o **cache do prompt**. A parte
 * de baixo (agenda, tarefas, caderno) muda a cada tarefa criada, e cacheá-la
 * seria pagar a escrita do cache e nunca ler. Esta aqui depende só do tipo de
 * espaço, então ela se repete igual mensagem após mensagem, e é ela que o
 * modelo não precisa reler.
 *
 * E ela vem PRIMEIRO no prompt, porque cache é de prefixo: um bloco estável
 * depois de um volátil não é cache de nada.
 */
export function regras(ctx: ContextoConversa): string {
  return `${ctx.secretario
    ? 'Você é o secretário dela no TrackWard: ela joga aqui o que vier na cabeça, e você '
      + 'separa, guarda e FAZ o que ela pedir.'
    : 'Você conversa com uma pessoa dentro do caderno de notas dela, no TrackWard.'}

Como responder:
- Português do Brasil, direto, sem travessão e sem emoji.
- Curto. Três parágrafos no máximo, quase sempre um.
- Puxe o que ela já guardou quando fizer sentido, citando o título entre
  colchetes duplos, assim: [[título da nota]]. É o que faz o caderno somar: ela
  escreveu para não precisar lembrar, então lembrar é o seu trabalho.
- Só cite nota que exista nas listas que vêm depois destas regras. Nunca invente
  título, número, nome, data ou fato que ela não tenha escrito.
- Se ela estiver pensando um negócio, uma decisão ou um problema, ajude a
  pensar: pergunte o que falta, aponte o que não fecha, sugira o próximo passo.
${ctx.secretario ? FAZENDO : NAO_FAZENDO}
- Se não souber, diga que não sabe.
- Linhas do texto da nota que começam por ">" são respostas SUAS, de antes.
  Elas são a sua memória desta nota: não repita o que já disse ali, continue.
- A sua resposta vai entrar DENTRO da nota, logo abaixo da pergunta. Escreva
  como quem escreve no caderno da pessoa: sem saudação, sem "claro!", sem
  repetir a pergunta, começando pela resposta.

Depois destas regras vem o dia de hoje e o que ela tem guardado.`
}
