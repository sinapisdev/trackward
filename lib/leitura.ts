import 'server-only'
import { doDespejo, porRegras, podar, TETO_DESPEJO, type Contexto, type Proposta } from './leitor'
import type { TipoProposta } from './tipos'

/**
 * O miolo da leitura: falar com o modelo e conferir o que ele devolveu.
 *
 * Isto morava dentro de `app/api/leitor/route.ts`, e saiu de lá quando a leitura
 * passou a ter **dois chamadores com perguntas diferentes sobre o teto**:
 *
 *   /api/leitor  quem pede é gente logada, e quem responde se pode gastar é o
 *                banco, com a identidade da sessão
 *   /api/pulso   quem pede é um relógio, que não tem sessão nenhuma, e a
 *                organização vem do laço, não do login
 *
 * A política de teto fica com cada chamador de propósito, porque a pergunta é
 * mesmo diferente. O que é igual, e mora aqui, é a conversa com o modelo.
 *
 * `server-only` no topo: a chave do modelo nunca pode ir junto para o navegador,
 * e o build quebra se alguém importar isto de um componente de tela.
 */

export const MODELO = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5'
const TIPOS: TipoProposta[] = [
  'tarefa', 'prazo', 'concluir', 'decisao', 'trava', 'distribuir', 'agente', 'nota', 'compromisso',
]

const FERRAMENTA = {
  name: 'registrar',
  description: 'Registra o que a conversa produziu de trabalho concreto.',
  input_schema: {
    type: 'object',
    properties: {
      propostas: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            tipo: { type: 'string', enum: TIPOS },
            texto: { type: 'string', description: 'A tarefa ou a decisão, em uma linha, começando por verbo no infinitivo quando for tarefa.' },
            motivo: { type: 'string', description: 'O trecho exato da conversa que deu origem, copiado.' },
            mensagem_id: { type: ['string', 'null'], description: 'O id da mensagem de onde saiu.' },
            item_id: { type: ['string', 'null'], description: 'Para concluir, prazo ou distribuir: o id da tarefa que já existe, venha ela deste projeto ou da lista da casa.' },
            fluxo_id: { type: ['string', 'null'], description: 'Para tarefa nova: o id da track onde ela deve nascer, quando a conversa deixar claro que é de outra frente. Só ids da lista de tracks da casa.' },
            resp_id: { type: ['string', 'null'], description: 'O id da pessoa responsável, quando a conversa deixa claro.' },
            prazo: { type: ['string', 'null'], description: 'Data no formato AAAA-MM-DD, só quando a conversa disser.' },
            /* Quanto a coisa LEVA. Sem isto o dia não tem orçamento: o app não
               sabe se cinco tarefas cabem numa terça que já tem duas reuniões,
               e acaba empilhando trabalho onde não há hora. É estimativa, e
               estimativa grosseira serve; o que não serve é não ter nenhuma. */
            tipo_incerto: { type: ['boolean', 'null'], description: 'Marque TRUE quando você não conseguir decidir entre tarefa e compromisso porque o texto não diz se há alguém ou um lugar envolvido. Na dúvida, marque: perguntar custa um toque, e marcar hora numa coisa que não tem hora estraga a agenda dela.' },
            minutos: { type: ['number', 'null'], description: 'Só para TAREFA: quanto tempo ela leva, em minutos, na sua melhor estimativa. Um telefonema são 15, responder um e-mail 15, conferir um documento 45, escrever uma proposta 120. Entre 10 e 480.' },
            agente_id: { type: ['string', 'null'], description: 'Só para tipo agente: o id do agente que reconheceu a situação.' },
            /* `quando` e `inicio` não estavam aqui, e o tipo compromisso existe
               desde sempre: sem o campo no esquema o modelo não tinha por onde
               devolver o dia, e a conferência descartava a proposta inteira.
               Campo que falta no esquema é funcionalidade que não existe, e
               some sem erro nenhum. */
            somar_em: { type: ['string', 'null'], description: 'Só para NOTA: o id de uma nota que JÁ EXISTE e onde isto deve ser somado, em vez de criar outra. Use quando o assunto for o mesmo. Só ids da lista do caderno.' },
            quando: { type: ['string', 'null'], description: 'Só para compromisso MARCADO: o dia, AAAA-MM-DD.' },
            inicio: { type: ['string', 'null'], description: 'Só para compromisso de HORA MARCADA: a hora, HH:MM. Nunca em tarefa.' },
            repete: {
              type: ['object', 'null'],
              description: 'Só para compromisso de TEMPO SEPARADO, quando ela disser uma '
                + 'cadência ("2h por dia", "2 a 3 dias por semana"). Não é hora marcada: '
                + 'não mande quando nem inicio, porque quem escolhe os dias é o app, pelo '
                + 'que sobra de cada um.',
              properties: {
                minutos: { type: 'number', description: 'Duração de cada bloco, em minutos.' },
                vezes: { type: 'number', description: 'Quantos blocos. Uma semana de trabalho é 5.' },
                cadencia: { type: 'string', enum: ['dia', 'semana'],
                  description: '"dia" sai em dias seguidos; "semana" sai espaçado.' },
                periodo: { type: 'string', enum: ['manha', 'tarde'],
                  description: 'Quando ela pedir o turno. Omita se tanto faz.' },
              },
              required: ['minutos', 'vezes', 'cadencia'],
            },
          },
          required: ['tipo', 'texto', 'motivo'],
        },
      },
    },
    required: ['propostas'],
  },
}

function instrucoes(ctx: Contexto) {
  const pessoas = ctx.pessoas.map((p) => `${p.nome} (id ${p.id})`).join(', ')
  const itens = (ctx.fluxo?.itens || [])
    .map((i) => `- ${i.texto} (id ${i.id}, ${i.feito ? 'feita' : 'aberta'}${i.prazo ? `, prazo ${i.prazo}` : ''})`)
    .join('\n')

  // O que a empresa ensinou entra antes das regras, porque é o que muda a
  // leitura de genérica para específica daquela casa.
  const aprendido = ctx.memoria
    ? `\nO QUE ESTA EMPRESA JÁ ENSINOU (use, e não contrarie):\n${ctx.memoria}\n`
    : ''

  /**
   * Os agentes que esta empresa escreveu.
   *
   * Aqui está a parte que só o modelo faz: julgar se a conversa fala daquela
   * situação. "O João não vem mais" é um desligamento, "o cliente cancelou" é um
   * cancelamento, e nenhuma palavra-chave pega isso. Reconhecer situação é
   * entender contexto, e é por isso que o agente vale mais com chave de modelo.
   */
  /**
   * O caderno da pessoa. Entra só quando há coisa parecida guardada, e entra
   * como contexto, nunca como ordem: a leitura pode citar a nota antiga e
   * propor juntar as duas, mas não decide nada sozinha.
   */
  const comCaderno = ctx.caderno?.length
    ? `
O QUE ESTA PESSOA JÁ GUARDOU NO CADERNO E PARECE TER A VER:
${ctx.caderno.map((n) => `- "${n.titulo}"${n.id ? ` (id ${n.id})` : ''}: ${n.trecho}`).join('\n')}

O CADERNO EXISTE PARA SOMAR, E SOMAR É ESCREVER ONDE O ASSUNTO JÁ MORA. Se o que
está sendo lido pertence a uma dessas, mande a nota com somar_em = o id dela, em vez
de criar outra. É o que impede dez notas chamadas "ideias" e nenhuma achável depois.
Uma nota que a pessoa abriu PARA JUNTAR COISA (ideias, decisões, aprendizados,
contatos, dúvidas) é o lugar natural do que for daquele tipo.
Criar nota nova é para assunto que ainda não tem casa.
Citando uma nota no motivo, use o título entre colchetes duplos: [[título da nota]].
Não invente ligação: só aponte quando a relação for evidente no texto.
`
    : ''

  /**
   * A casa inteira, e não só este canal.
   *
   * É o que faz a leitura parar de propor pela terceira vez a mesma tarefa que
   * já existe em outra frente, e o que deixa ela mandar a tarefa nova para a
   * track certa em vez de deixá-la sem endereço. Entra só o que a empresa
   * inteira já podia ler: a proposta aparece para todo mundo do canal.
   */
  const casa = ctx.casa
  const comCasa = casa && (casa.tracks.length || casa.itens.length || casa.decisoes.length)
    ? `
O QUE A CASA JÁ TEM, FORA DESTE CANAL:

${casa.tracks.length ? `Tracks abertas (use o id em fluxo_id quando a conversa disser de qual frente é):
${casa.tracks.map((t) => `- ${t.nome} (id ${t.id}${t.onde ? `, ${t.onde}` : ''})`).join('\n')}
` : ''}${casa.itens.length ? `Tarefas que JÁ EXISTEM:
${casa.itens.map((i) => `- ${i.texto} (id ${i.id}, em ${i.onde}${i.prazo ? `, prazo ${i.prazo}` : ''})`).join('\n')}
` : ''}${casa.decisoes.length ? `Decisões que a equipe já tomou:
${casa.decisoes.map((d) => `- ${d.texto} (${d.quando})`).join('\n')}
` : ''}
Use esta lista para NÃO REPETIR: tarefa que já está aí não vira tarefa nova, e
coisa já decidida não vira decisão de novo. Quando a conversa disser que uma
dessas tarefas ficou pronta ou mudou de prazo, use o id dela, mesmo sendo de
outra frente.
`
    : ''

  const comAgentes = ctx.agentes?.length
    ? `
AGENTES QUE ESTA EMPRESA ESCREVEU:
${ctx.agentes.map((a) => `- id ${a.id}, "${a.nome}": dispare quando ${a.reconhecer}.`).join('\n')}

Quando a conversa indicar uma dessas situações, registre uma proposta de tipo
agente com o agente_id correspondente, e ponha no motivo o trecho exato que fez
você reconhecer. Julgue a SITUAÇÃO, não a palavra: "o João não vem mais" é um
desligamento mesmo sem a palavra desligamento aparecer. Em dúvida, não dispare:
um agente que dispara errado cria trabalho errado em área que não é sua.
`
    : ''

  /**
   * O despejo é outro bicho, e tratar ele como conversa de equipe dá resultado
   * ruim nos dois sentidos.
   *
   * Numa conversa de equipe a leitura tem que ser CONSERVADORA: são várias
   * pessoas, e criar tarefa que ninguém pediu gera trabalho para gente de
   * verdade. No despejo é uma pessoa falando sozinha, de propósito, para o app
   * ouvir. Aqui não registrar é o erro: o pensamento se perde, que é exatamente o
   * que a pessoa estava tentando evitar ao escrever.
   *
   * E tem um tipo a mais, que só existe aqui: nota. O que não é tarefa nem
   * compromisso não é lixo, é ideia, e ideia tem onde ficar.
   */
  if (ctx.despejo) {
    const comExpediente = ctx.expediente ? `\n${ctx.expediente}\n` : `
ELA AINDA NÃO DISSE O EXPEDIENTE DELA. Então não reserve bloco nenhum (nada de repete) e
não invente horário: ponha prazo de tarefa nos próximos dias e diga, numa nota, que vale
contar o expediente em Ajustes para você poder organizar a semana.
`
    const comAgenda = ctx.agenda?.length
      ? `\nO QUE JÁ ESTÁ MARCADO NA AGENDA DELA (não marque em cima):\n${ctx.agenda
          .map((c) => `- ${c.quando}${c.inicio ? ` ${c.inicio}${c.fim ? `-${c.fim}` : ''}` : ' (dia inteiro)'}: ${c.titulo}`)
          .join('\n')}\n`
      : ''

    /**
     * O que ela já corrigiu, para você não errar igual.
     *
     * Entra como exemplo e não como regra: duas horas numa tarefa parecida não
     * quer dizer duas horas nesta, quer dizer que o seu chute anterior foi
     * curto naquele tipo de coisa.
     */
    const comEstimativas = ctx.estimativas?.length
      ? `\nO QUE ELA JÁ CORRIGIU NAS SUAS ESTIMATIVAS (use para calibrar, não copie):\n${ctx.estimativas
          .map((e) => `- "${e.texto}": você disse ${e.estimado} min, ela disse ${e.corrigido} min.`)
          .join('\n')}\n`
      : ''

    return `Você lê o caderno de bolso de UMA pessoa e separa o que ela jogou lá dentro.

Hoje é ${ctx.hoje}.${aprendido}${comExpediente}${comAgenda}${comEstimativas}${comCaderno}${comCasa}
Ela está falando sozinha, para o app ouvir. Não é conversa de equipe: não tem ninguém
para quem delegar, e tudo que está escrito ela escreveu de propósito, para não perder.

A SEPARAÇÃO QUE MAIS IMPORTA É ESTA, E ERRAR NELA ESTRAGA A AGENDA DELA:

  COMPROMISSO é hora combinada com alguém ou com um lugar.
  TAREFA é trabalho que ela faz quando couber.

O teste, e use ele sempre que ficar em dúvida: **se ela fizer isso duas horas antes ou
depois, alguém fica esperando?** Reunião, consulta, entrega no cartório, viagem, aula,
prova: sim, alguém espera, é compromisso. Estudar canais de venda, escrever a proposta,
revisar o contrato, fazer os vídeos: não, ninguém espera, é TAREFA, mesmo que leve o dia
inteiro e mesmo que ela diga quanto tempo leva.

O erro comum é esse último: "estudar canais e vendas, 2h por dia" NÃO é compromisso das
13h30 às 15h30. É tarefa, e o que ela disse foi a duração. Hora só quando ela disser a
hora, e só quando houver com quem ou onde.

E QUANDO VOCÊ NÃO CONSEGUIR DECIDIR, DIGA QUE NÃO CONSEGUIU: mande tipo_incerto = true.
"Fazer os vídeos" é tarefa para quem edita sozinho e compromisso para quem grava com três
pessoas, e o texto não diz qual é. Obrigado a escolher, você vai chutar, e chutar hora
numa coisa que não tem hora estraga a agenda dela. Perguntar custa um toque.
Marque a dúvida quando o texto não disser nem a hora, nem com quem, nem onde, e a coisa
puder razoavelmente ser as duas.

Três tipos:
- tarefa: algo que ela precisa fazer. Uma ação, com verbo. NUNCA ponha hora numa tarefa:
  quem decide a ordem do dia dela é ela, e o app só guarda o dia e quanto leva.
- compromisso: São DOIS casos, e eles são bem diferentes:
  (a) HORA MARCADA: algo combinado com alguém ou num lugar, num dia e numa hora
      (reunião, consulta, viagem, prova). Use quando e inicio. Só aqui existe hora.
  (b) TEMPO SEPARADO para trabalhar numa coisa, quando ela disser uma cadência. Use
      repete e NÃO use quando nem inicio: isso não é hora marcada, é quanto do dia ela
      quer dar àquilo. Quem escolhe os dias é o app, olhando o que sobra de cada um.
- nota: todo o resto que valha guardar. Ideia, insight, DECISÃO que ela tomou, número que
  ela ouviu, nome de alguém, link, trecho de raciocínio, dúvida para pensar depois. Em
  texto, ponha o pensamento dela quase como ela escreveu, sem resumir até virar nada.
  Aqui não existe o tipo decisao: no caderno de uma pessoa, decisão é nota, e vai para a
  nota de decisões dela quando ela tem uma.

ELA CLICOU EM ORGANIZAR, E ORGANIZAR É DISTRIBUIR. Devolver uma pilha de tarefas sem dia
é devolver o trabalho para ela, que é o oposto do que o botão existe para fazer. Leia o
que ela escreveu ENTRE PARÊNTESES e nas palavras de urgência: é ali que está a instrução
de quando e de quanto.

- "(2h por dia)", "(30 min a 1h por dia)" é compromisso com repete:
  {minutos: 120, vezes: 5, cadencia: "dia"}. Cinco é uma semana de trabalho.
  Faixa ("30 min a 1h") pegue o meio ou o menor: começar modesto é melhor que furar.
- "(2 a 3 dias por semana)", "(meio período)" é repete com cadencia "semana":
  {minutos: 210, vezes: 3, cadencia: "semana"}. Meio período é 3 a 4 horas.
- "(o quanto antes)", "(finalizar tudo quanto antes)" não é cadência, é PRIORIDADE: vire
  tarefa com prazo nos próximos dias úteis, e se a coisa for grande, reserve também um
  bloco com repete.
- "(lembrete de ideia)", "(pensar depois)" é NOTA, nunca tarefa. Ela disse o que é.
- TODA TAREFA LEVA MINUTOS, e você estima SEMPRE, mesmo sem pista nenhuma: 15 para um
  telefonema, 45 para conferir um documento, 120 para escrever uma proposta. Não é
  precisão, é ordem de grandeza, e sem ela o app não sabe se cinco tarefas cabem numa
  terça que já tem duas reuniões. Chute para mais quando não souber: a conta de um dia
  que estourou dói mais que a de um dia que sobrou. Ela corrige com um toque, e a
  correção volta para você da próxima vez.
- Tarefa sem cadência e sem data ganha prazo mesmo assim, mas NÃO empilhe tudo para hoje
  nem invente a distribuição: quem encaixa na semana, contando as horas livres de cada dia
  e desviando do que já está marcado, é o app. Ponha o prazo que a coisa de fato tem, e
  deixe sem prazo o que não tem nenhum.
- Não marque nada fora do expediente dela nem em dia que ela não trabalha.

Regras:
- VARRA O TEXTO INTEIRO, do começo ao fim, parágrafo por parágrafo. Não pare na metade e
  não escolha "as mais importantes": nada aqui é importante demais ou de menos, tudo que
  ela escreveu ela escreveu para não perder. Uma página de caderno rende facilmente quinze
  ou vinte coisas, e devolver seis é deixar quatorze para trás sem ela saber.
- Antes de terminar, leia o texto de novo e pergunte o que ficou sem virar nada. Tarefa
  solta no meio de um parágrafo, decisão escrita como constatação ("ficou decidido que",
  "vamos de"), ideia jogada entre parênteses: essas são as que mais escapam.
- Aqui NÃO REGISTRAR É O ERRO. Se ela escreveu, ela quis guardar. Em dúvida entre nota e
  ignorar, registre nota.
- Em dúvida entre tarefa e nota, veja se tem ação: "ligar para o contador" é tarefa,
  "o contador falou que dá para lançar isso na PJ" é nota.
- Uma mensagem pode render mais de uma coisa: separe. "Reunião quinta 10h e preciso levar
  o contrato" é um compromisso e uma tarefa.
- Dizendo o dia, mesmo solto ("quinta", "amanhã"), traduza para data contando de hoje.
- Desabafo e xingamento não são nada. Deixe passar.
- Escreva em português do Brasil, sem travessão.`
  }

  return `Você lê a conversa de uma equipe e separa o que virou trabalho do que foi só conversa.

Hoje é ${ctx.hoje}.${aprendido}${comCasa}${comAgentes}
Pessoas: ${pessoas}.
${ctx.fluxo ? `A conversa é do projeto "${ctx.fluxo.nome}".\nTarefas que já existem nele:\n${itens || '(nenhuma)'}` : 'A conversa não está presa a um projeto.'}

Sete tipos:
- tarefa: alguém se comprometeu, pediu a alguém, ou a equipe reconheceu que algo precisa ser feito.
- concluir: alguém disse que uma tarefa que já existe ficou pronta. Use item_id.
- prazo: a conversa mudou o prazo de uma tarefa que já existe. Use item_id e prazo.
- distribuir: uma tarefa que já existe e está SEM responsável ganhou dono na conversa
  ("eu pego a conciliação", "passa para a Ana"). Use item_id e resp_id. Não use quando a
  tarefa já tem responsável: trocar o dono de uma tarefa é decisão de gente, não sua.
- decisao: a equipe decidiu alguma coisa que precisa ficar registrada.
- trava: a frente parou esperando alguém de fora.
- agente: a conversa indicou uma das situações que a empresa descreveu nos agentes
  abaixo. Use agente_id.

Regras:
- Só registre o que a conversa disser de fato. Nada de deduzir trabalho que ninguém pediu.
- fluxo_id só quando a conversa deixar claro de qual frente é. Na dúvida, deixe nulo: a
  tarefa nasce no projeto deste canal, ou sem projeto, e alguém escolhe depois.
- Cumprimento, piada, combinação de almoço e pergunta sem resposta não são tarefa.
- Se uma tarefa igual já existe na lista acima, não crie outra.
- resp_id só quando a conversa deixar claro de quem é. Na dúvida, deixe nulo.
- Em distribuir, resp_id e item_id são obrigatórios: sem os dois, não registre.
- prazo só quando a conversa disser a data. Nunca invente um prazo.
- Escreva em português do Brasil, sem travessão.
- Nada a registrar é uma resposta boa: devolva a lista vazia.`
}

function conversa(ctx: Contexto) {
  return ctx.mensagens.map((m) => `[${m.id}] ${m.autor}: ${m.texto}`).join('\n')
}

type Cru = {
  tipo?: string; texto?: string; motivo?: string
  mensagem_id?: string | null; item_id?: string | null; fluxo_id?: string | null
  resp_id?: string | null; prazo?: string | null; minutos?: number | null
  tipo_incerto?: boolean | null
  agente_id?: string | null
  quando?: string | null; inicio?: string | null; somar_em?: string | null
  repete?: { minutos?: number; vezes?: number; cadencia?: string; periodo?: string } | null
}

/** O que volta do modelo é texto, não verdade: cada campo é conferido aqui. */
function conferir(cru: Cru[], ctx: Contexto): Proposta[] {
  const pessoas = new Set(ctx.pessoas.map((p) => p.id))
  // As tarefas deste canal e as da casa, na mesma peneira: é o que permite
  // "o plano de contas já está migrado" fechar a tarefa que mora em outra track.
  const itens = new Map(
    [...(ctx.fluxo?.itens || []), ...(ctx.casa?.itens || [])].map((i) => [i.id, i]),
  )
  const tracks = new Map((ctx.casa?.tracks || []).map((t) => [t.id, t]))
  const msgs = new Set(ctx.mensagens.map((m) => m.id))
  const saida: Proposta[] = []

  for (const c of cru) {
    let tipo = TIPOS.find((t) => t === c.tipo)
    const texto = String(c.texto || '').trim()
    if (!tipo || !texto) continue

    /**
     * No despejo, DECISÃO é nota, e isto não é tradução: é conserto.
     *
     * Aceitar uma decisão escreve na ATIVIDADE de uma track, e no caderno de
     * uma pessoa não há track: o aceite dizia "registrou a decisão" e não
     * gravava em lugar nenhum achável. Ou seja, a coisa que ela mais quer
     * reencontrar depois era a que mais sumia.
     *
     * Virando nota, ela entra no caderno, vai para a nota de decisões quando
     * existe uma, e a busca acha. O texto dela é o que ela escreveu, que é o
     * que importava.
     */
    if (ctx.despejo && tipo === 'decisao') tipo = 'nota'

    const item = c.item_id && itens.get(c.item_id)
    if ((tipo === 'concluir' || tipo === 'prazo' || tipo === 'distribuir') && !item) continue

    const prazo = /^\d{4}-\d{2}-\d{2}$/.test(String(c.prazo)) ? String(c.prazo) : null
    if (tipo === 'prazo' && !prazo) continue

    const resp = c.resp_id && pessoas.has(c.resp_id) ? c.resp_id : null

    /**
     * Quanto a tarefa leva.
     *
     * É o que transforma uma lista num plano: sem duração, cinco tarefas numa
     * terça com duas reuniões cabem tanto quanto numa quarta vazia, o que é
     * falso, e o app empilha trabalho onde não há hora. Dez minutos é o menor
     * que vale medir e oito horas é o dia inteiro; fora disso o modelo chutou e
     * o palpite da casa vale mais que o dele.
     */
    /**
     * Toda tarefa sai daqui COM duração, e quando o modelo não deu, o app
     * chuta 45 minutos.
     *
     * Sem duração o dia não tem orçamento, e tarefa sem orçamento é tarefa que
     * o plano trata como se não custasse nada: ela entra em qualquer dia, por
     * cima de qualquer coisa. Quarenta e cinco é o tamanho de uma coisa de
     * escritório qualquer, e errar para mais é o lado certo de errar, porque o
     * dia que sobrou se resolve sozinho e o que estourou cobra da pessoa.
     *
     * `chutado` viaja junto para a tela saber o que oferecer: a estimativa que
     * veio do modelo merece o botão de corrigir, e a que veio daqui merece mais
     * ainda, porque o app não leu nada para dizer 45.
     */
    const doModelo = Number(c.minutos) >= 10 && Number(c.minutos) <= 480
      ? Math.round(Number(c.minutos))
      : null
    const minutos = tipo === 'tarefa' ? (doModelo ?? 45) : null
    const chutado = tipo === 'tarefa' && !doModelo

    /**
     * A dúvida entre tarefa e compromisso, declarada em vez de engolida.
     *
     * "Fazer vídeos" é tarefa para quem edita sozinho e compromisso para quem
     * grava com três pessoas, e o texto não diz qual é: nenhum modelo acerta
     * isso, e o que ele faz quando é obrigado a escolher é chutar. Na dúvida
     * ele marca, e quem responde é a pessoa, com dois botões.
     */
    const incerto = (tipo === 'tarefa' || tipo === 'compromisso') && c.tipo_incerto === true

    // Agente sem id de agente conhecido não existe: o modelo não inventa agente.
    const agentes = new Set((ctx.agentes || []).map((a) => a.id))
    if (tipo === 'agente' && !(c.agente_id && agentes.has(c.agente_id))) continue
    // Distribuir sem nome não é distribuir. E se a tarefa já tem dono, trocar o
    // dono é decisão de gente: o modelo não passa por cima disso.
    if (tipo === 'distribuir' && (!resp || (item && item.resp_id))) continue

    // Nota e compromisso só existem no despejo: num canal de equipe seria
    // guardar nota no caderno de outra pessoa.
    if ((tipo === 'nota' || tipo === 'compromisso') && !ctx.despejo) continue
    const quando = /^\d{4}-\d{2}-\d{2}$/.test(String(c.quando)) ? String(c.quando) : null
    /**
     * O bloco que se repete, conferido.
     *
     * Ele vale NO LUGAR do dia: o modelo diz quanto e quantas vezes, e quem
     * acha os dias e as horas é `vagas()`, no aceite. Tetos generosos e
     * honestos: quinze minutos é o menor bloco que vale reservar, oito horas é
     * o dia inteiro, e vinte vezes é um mês de trabalho.
     */
    /**
     * Somar numa nota que já existe, em vez de criar outra.
     *
     * O id tem que estar na lista que FOI MANDADA: id inventado escreveria no
     * nada, ou pior, na nota errada. Mesma régua de `fluxo_id` e de `item_id`.
     */
    const doCaderno = new Set((ctx.caderno || []).map((n) => n.id).filter(Boolean))
    const somarEm = tipo === 'nota' && c.somar_em && doCaderno.has(c.somar_em)
      ? c.somar_em
      : null

    const r = c.repete || null
    const repete = r && Number(r.minutos) >= 15 && Number(r.minutos) <= 480
      && Number(r.vezes) >= 1 && Number(r.vezes) <= 20
      && (r.cadencia === 'dia' || r.cadencia === 'semana')
      ? {
          minutos: Math.round(Number(r.minutos)),
          vezes: Math.round(Number(r.vezes)),
          cadencia: r.cadencia as 'dia' | 'semana',
          ...(r.periodo === 'manha' || r.periodo === 'tarde'
            ? { periodo: r.periodo as 'manha' | 'tarde' } : {}),
        }
      : null
    // Compromisso é ou um dia marcado, ou um bloco que se repete. Sem nenhum
    // dos dois ele não é compromisso nenhum, e virar tarefa seria decidir pelo
    // modelo o que ele não decidiu.
    if (tipo === 'compromisso' && !quando && !repete) continue
    const inicio = /^([01]\d|2[0-3]):[0-5]\d$/.test(String(c.inicio)) ? String(c.inicio) : null

    // Track escolhida pelo modelo: vale só se existir na lista que foi mandada.
    // Sem esta conferência ele poderia inventar um id, e a proposta apontaria
    // para o nada, ou pior, para uma track que quem lê não enxerga.
    const daCasa = c.fluxo_id ? tracks.get(c.fluxo_id) ?? null : null

    saida.push({
      tipo,
      texto: texto.slice(0, 220),
      motivo: String(c.motivo || '').trim().slice(0, 400),
      mensagem_id: c.mensagem_id && msgs.has(c.mensagem_id) ? c.mensagem_id : null,
      dados: {
        // A tarefa achada manda no endereço, porque ela já tem um. Depois vem
        // a track que o modelo escolheu, e por último a do próprio canal.
        fluxo_id: item ? (item.fluxo_id ?? ctx.fluxo?.id ?? null) : (daCasa?.id ?? ctx.fluxo?.id ?? null),
        etapa_id: item ? item.etapa_id : (daCasa?.etapa_id ?? ctx.fluxo?.etapa_id ?? null),
        item_id: item ? item.id : null,
        resp_id: resp,
        prazo,
        ...(minutos ? { minutos } : {}),
        ...(chutado ? { minutos_chutado: true } : {}),
        ...(incerto ? { tipo_incerto: true } : {}),
        agente_id: tipo === 'agente' ? c.agente_id : null,
        quando: tipo === 'compromisso' ? quando : null,
        ...(somarEm ? { somar_em: somarEm } : {}),
        ...(tipo === 'compromisso' && repete ? { repete } : {}),
        inicio: tipo === 'compromisso' ? inicio : null,
      },
    })
  }
  /**
   * No caderno o teto é outro, e a peneira de semelhança sai.
   *
   * Ver `podar`: oito é o número de uma conversa de equipe, onde o risco é
   * criar trabalho que ninguém pediu. Aqui o risco é o inverso, e o corte em
   * oito era o que fazia o Organizar de uma página inteira devolver meia
   * dúzia de coisas e deixar o resto para trás, sem dizer que deixou.
   */
  return podar(saida, ctx.despejo ? { teto: TETO_DESPEJO, porTexto: false } : undefined)
}

export type Medida = {
  modelo: string
  entrada: number
  saida: number
  cacheLeitura: number
  cacheEscrita: number
}

export async function porModelo(
  ctx: Contexto, chave: string, modelo: string, medida: { valor: Medida | null },
): Promise<Proposta[] | null> {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': chave,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: modelo,
      /**
       * O teto de saída, e ele era a SEGUNDA porta por onde o Organizar perdia
       * coisa.
       *
       * Cada proposta carrega o texto mais o `motivo`, que é o trecho copiado
       * do que a pessoa escreveu. Vinte propostas de uma página de caderno não
       * cabem em 2000 tokens: o JSON da ferramenta fica pela metade, e um JSON
       * pela metade não vira proposta nenhuma. É o mesmo defeito do secretário
       * (ver AGENTS), e de fora ele é igualzinho a "a leitura não achou nada".
       * Na conversa de equipe 2000 continua de sobra, porque lá a resposta boa
       * costuma ser curta.
       */
      max_tokens: ctx.despejo ? 8000 : 2000,
      system: instrucoes(ctx),
      tools: [FERRAMENTA],
      tool_choice: { type: 'tool', name: 'registrar' },
      messages: [{ role: 'user', content: conversa(ctx) }],
    }),
  })
  if (!r.ok) return null

  const corpo = await r.json() as {
    content?: { type: string; name?: string; input?: { propostas?: Cru[] } }[]
    usage?: {
      input_tokens?: number; output_tokens?: number
      cache_read_input_tokens?: number; cache_creation_input_tokens?: number
    }
  }

  // O que a própria API diz ter cobrado. Estimar tokens por conta seria chutar a
  // conta do cliente; aqui a medida vem de quem cobra.
  medida.valor = {
    modelo,
    entrada: corpo.usage?.input_tokens ?? 0,
    saida: corpo.usage?.output_tokens ?? 0,
    cacheLeitura: corpo.usage?.cache_read_input_tokens ?? 0,
    cacheEscrita: corpo.usage?.cache_creation_input_tokens ?? 0,
  }

  const uso = corpo.content?.find((b) => b.type === 'tool_use' && b.name === 'registrar')
  if (!uso?.input?.propostas) return null
  return conferir(uso.input.propostas, ctx)
}


/**
 * A leitura sem modelo.
 *
 * Duas regras diferentes, porque são dois problemas diferentes: conversa de
 * equipe pede desconfiança, despejo pede generosidade. Ver doDespejo.
 */
export const semModelo = (ctx: Contexto) => (ctx.despejo ? doDespejo(ctx) : porRegras(ctx))
