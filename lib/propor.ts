import { rotuloDoPasso, type Candidato, type Execucao } from './descobrir'

/**
 * Da grama pisada para o processo desenhado: as perguntas que fecham a conta.
 *
 * A descoberta mostra **o quê**: das 11 vezes, em 4 ninguém conferiu o estoque.
 * Ela não sabe **por quê**, nem **o que deve valer daqui para frente**, e essas
 * duas coisas ninguém infere de dado nenhum, porque elas são decisão.
 *
 * Então a pergunta carrega o número e preenche o buraco que o número não
 * responde:
 *
 *   "Das 11 vezes, em 4 ninguém conferiu o estoque antes de prometer prazo.
 *    Nessas 4, levou o dobro do tempo. Conferir estoque devia ser obrigatório?"
 *
 * Isso não é formulário e não é só estatística. É sim ou não, de cinco
 * segundos, e a resposta **muda o processo**. E é impossível de falsificar: só
 * quem observou aquela empresa poderia perguntar aquilo, e é daí que vem a
 * sensação de "isto foi feito para mim".
 *
 * ## O que NUNCA se pergunta
 *
 * "Como é o seu processo?" e "como você gostaria que fosse?". A primeira ninguém
 * sabe responder; a segunda todo mundo responde com o processo que gostaria de
 * ter, que não é o que acontece. As duas entram bonitas no sistema e não batem
 * com nada.
 *
 * ## Afirmar é melhor que perguntar, quando há maioria
 *
 * A pergunta cobra uma ação de quem já está ocupado. A afirmação entrega uma:
 *
 *   pergunta:  "Isto costuma levar 6 dias. Uso como padrão?"
 *   afirmação: "Isto costuma levar 6 dias, então montei assim. Se quiser
 *               outro prazo, é só me dizer."
 *
 * A segunda é o app trabalhando; a primeira é o app pedindo que trabalhem por
 * ele. E ela não fere a regra de a IA não decidir sozinha, porque **o desenho
 * inteiro ainda é uma proposta esperando aceite**: escolher o padrão DENTRO de
 * um rascunho é rascunhar, não é decidir.
 *
 * A linha entre uma e outra:
 *
 *   **maioria clara, e dentro do rascunho**  ->  afirma, com o número à vista
 *   **empate, buraco, ou fora do rascunho**  ->  pergunta
 *
 * Seis do Leo, três da Ana e duas sem ninguém não é maioria: chutar ali é
 * inventar dono para o processo, que é o erro mais caro da lista. Nove do Leo
 * em onze é maioria, e perguntar seria fingir dúvida que não existe.
 *
 * ## Uma de cada vez
 *
 * As perguntas saem ordenadas pelo que mais muda o desenho, e quem chama manda
 * **uma**. Cinco juntas viram formulário, e formulário é abandonado. As
 * afirmações vão todas de uma vez, porque elas não pedem nada: são a lista do
 * que já foi montado.
 */

export type MudaOQue =
  /** Vira tarefa obrigatória do processo. */
  | 'passo-obrigatorio'
  /** Vira checkpoint: alguém confere antes de seguir. */
  | 'vira-checkpoint'
  /** Define quem responde por aquela passagem. */
  | 'define-aprovador'
  /** São duas coisas parecidas, e não uma: separa o candidato em dois. */
  | 'separa-em-dois'
  /** O prazo típico daquele trecho. */
  | 'define-prazo'

export type PerguntaDoProcesso = {
  /** O que sobe para o acervo. Não carrega nada da empresa. */
  chave: string
  /** O texto, com o número dentro. */
  texto: string
  opcoes: { chave: string; rotulo: string }[]
  muda: MudaOQue
  /** Sobre qual passo, quando for o caso. */
  alvo?: string
  /**
   * O que está por trás de cada opção, na mesma ordem delas.
   *
   * A opção continua sendo um número porque é assim que ela cabe numa mensagem
   * de WhatsApp, e o número sozinho não diz a quem se refere. Sem esta lista,
   * quem aplica a resposta tinha que refazer a ordenação que montou as opções, e
   * duas ordenações que precisam concordar é uma que vai discordar: a resposta
   * "1" apontaria para outra pessoa.
   */
  ids?: string[]
  /** O quanto responder isto melhora o desenho. Ordena a fila. */
  peso: number
}

/**
 * O que o app já montou sozinho, com o número que o justifica.
 *
 * Cada uma carrega o `mudar`: a frase curta que diz como desfazer. Afirmação
 * sem porta de saída é imposição, e imposição num rascunho que a pessoa ainda
 * vai aceitar é o jeito mais rápido de ela recusar o rascunho inteiro.
 */
export type Afirmacao = {
  chave: string
  /** "Isto costuma levar 6 dias, então montei com esse prazo." */
  texto: string
  /** "Se preferir outro, é só me dizer." */
  mudar: string
  muda: MudaOQue
  alvo?: string
}

/** Acima disto é maioria, e maioria o app resolve sozinho. */
const MAIORIA = 0.7

/** A mediana, que aguenta o caso extremo melhor que a média. */
function mediana(ns: number[]): number {
  if (!ns.length) return 0
  const s = [...ns].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2)
}

/**
 * O passo faltando custou tempo?
 *
 * Compara quanto durou quando o passo aconteceu e quanto durou quando não
 * aconteceu. É a frase que transforma um número morno numa pergunta que o dono
 * responde na hora: não é "em 4 de 11 faltou", é "nas 4 em que faltou, levou o
 * dobro".
 */
export function custoDeFaltar(execucoes: Execucao[], passo: string): {
  com: number; sem: number; quantasSem: number; piorou: boolean
} {
  const com = execucoes.filter((e) => e.passos.has(passo)).map((e) => e.duracao)
  const sem = execucoes.filter((e) => !e.passos.has(passo)).map((e) => e.duracao)
  const a = mediana(com)
  const b = mediana(sem)
  // Metade a mais já é diferença que alguém sente. Abaixo disso é ruído, e
  // afirmar ruído uma vez derruba a credibilidade de tudo que vier depois.
  return { com: a, sem: b, quantasSem: sem.length, piorou: !!a && b >= a * 1.5 }
}

const SIM_NAO = [
  { chave: '1', rotulo: 'Sim, devia ser sempre' },
  { chave: '2', rotulo: 'Não, depende do caso' },
]

/**
 * As perguntas que faltam para este candidato virar processo.
 *
 * `quemAprovou` é quem decidiu cada execução, quando houve decisão: é daí que
 * sai a pergunta sobre aprovador, que é a que mais muda o desenho, porque
 * processo sem dono é o que a empresa já tinha antes do app.
 */
export function perguntasDoProcesso(
  c: Candidato,
  quemAprovou: { execucao: string; quem: string | null; nome: string }[] = [],
  /**
   * Espaço de uma pessoa só. Muda as palavras, não a conta: "em 4 ninguém fez"
   * é a frase certa numa empresa e é esquisita num app de uma pessoa, onde
   * ninguém é você. Quem some por inteiro ali (o aprovador) já é filtrado por
   * `recursos()`, na tela, que é onde a regra do espaço mora.
   */
  sozinho = false,
): { afirma: Afirmacao[]; pergunta: PerguntaDoProcesso[] } {
  const saida: PerguntaDoProcesso[] = []
  const afirma: Afirmacao[] = []

  // 1. O PASSO QUE ÀS VEZES ACONTECE. O mais valioso de todos, porque a
  //    resposta vira tarefa obrigatória ou checkpoint, que é desenho de verdade.
  const conta = new Map<string, number>()
  for (const e of c.execucoes) for (const p of e.passos) conta.set(p, (conta.get(p) || 0) + 1)

  for (const [passo, n] of conta) {
    // Aconteceu em todas: não há o que perguntar, entra no desenho e o app diz
    // que entrou. Fingir dúvida onde não há é fazer a pessoa confirmar o óbvio.
    if (n >= c.vezes) {
      afirma.push({
        chave: 'passo-sempre',
        texto: `"${rotuloDoPasso(passo)}" aconteceu nas ${c.vezes} vezes, então entrou como passo fixo.`,
        mudar: 'Se não for sempre, me diga.',
        muda: 'passo-obrigatorio',
        alvo: passo,
      })
      continue
    }
    if (n < c.vezes * 0.3) continue
    const custo = custoDeFaltar(c.execucoes, passo)
    const quem = sozinho ? 'você não fez' : 'ninguém fez'
    const numero = `Das ${c.vezes} vezes, em ${c.vezes - n} ${quem} "${rotuloDoPasso(passo)}".`
    const doeu = custo.piorou
      ? ` Nessas ${custo.quantasSem}, levou ${custo.sem} dias contra ${custo.com} das outras.`
      : ''
    saida.push({
      chave: 'passo-as-vezes',
      texto: `${numero}${doeu} Isso devia ser obrigatório?`,
      opcoes: SIM_NAO,
      muda: custo.piorou ? 'vira-checkpoint' : 'passo-obrigatorio',
      alvo: passo,
      // O que custou tempo vale mais que o que só variou.
      peso: custo.piorou ? 90 : 60,
    })
  }

  // 2. QUEM APROVA. Processo sem dono é o que a empresa já tinha antes do app.
  //
  //    Quando NINGUÉM decidiu nenhuma das vezes, não há pergunta: ela sairia
  //    com a lista vazia ("aprovado por , e 11 sem ninguém") e, pior, sem
  //    opção nenhuma para responder, o que no WhatsApp é uma mensagem que pede
  //    um número que não existe. Um processo que nunca teve quem aprovasse não
  //    é um buraco a preencher no rascunho: é a passagem ficar de quem abrir a
  //    track, que é o que o desenho já faz sozinho.
  if (quemAprovou.length >= 3) {
    const porPessoa = new Map<string, { id: string; nome: string; n: number }>()
    let ninguem = 0
    for (const d of quemAprovou) {
      if (!d.quem) { ninguem++; continue }
      const atual = porPessoa.get(d.quem)
      if (atual) atual.n++
      else porPessoa.set(d.quem, { id: d.quem, nome: d.nome, n: 1 })
    }
    const lista = [...porPessoa.values()].sort((a, b) => b.n - a.n)
    const dono = lista[0]
    // Maioria clara e ninguém ficou de fora: o app resolve e diz por quê.
    if (dono && !ninguem && dono.n / quemAprovou.length >= MAIORIA) {
      afirma.push({
        chave: 'quem-aprova',
        texto: `${dono.nome} aprovou ${dono.n} das ${quemAprovou.length} vezes, `
          + 'então pus como quem responde por esta passagem.',
        mudar: 'Se for outra pessoa, me diga quem.',
        muda: 'define-aprovador',
      })
    } else if (lista.length && (lista.length > 1 || ninguem > 0)) {
      const trecho = lista.map((p) => `${p.nome} ${p.n}`).join(', ')
        + (ninguem ? `, e ${ninguem} sem ninguém` : '')
      saida.push({
        chave: 'quem-aprova',
        texto: `Isto foi aprovado por ${trecho}. Quem devia responder por esta passagem?`,
        opcoes: [
          ...lista.slice(0, 3).map((p, i) => ({ chave: String(i + 1), rotulo: p.nome })),
          { chave: '9', rotulo: 'Qualquer um da área' },
        ],
        ids: lista.slice(0, 3).map((p) => p.id),
        muda: 'define-aprovador',
        // Sobe quando houve vez sem ninguém: aí não é variação, é buraco.
        peso: ninguem > 0 ? 95 : 70,
      })
    }
  }

  // 3. SÃO DUAS COISAS? Confiança baixa costuma ser dois processos parecidos
  //    dentro do mesmo balde, e separar é melhor que desenhar um que não serve
  //    a nenhum dos dois.
  if (c.confianca < 0.6 && c.vezes >= 4) {
    saida.push({
      chave: 'sao-dois',
      texto: `Agrupei ${c.vezes} trabalhos parecidos, mas eles seguiram caminhos bem `
        + 'diferentes entre si. São a mesma coisa, ou são duas?',
      opcoes: [
        { chave: '1', rotulo: 'É a mesma coisa' },
        { chave: '2', rotulo: 'São duas coisas diferentes' },
      ],
      muda: 'separa-em-dois',
      peso: 80,
    })
  }

  // 4. O PRAZO TÍPICO. Só quando há alguma estabilidade: perguntar prazo de uma
  //    coisa que levou de 4 a 30 dias é pedir um chute.
  if (c.duracoes.length >= 3) {
    const meio = mediana(c.duracoes)
    const espalhado = c.duracoes[c.duracoes.length - 1] >= c.duracoes[0] * 3
    if (!espalhado && meio > 0) {
      // Prazo é a afirmação mais fácil: ele está dentro do rascunho, é
      // reversível com um toque, e o número que o justifica é o da própria casa.
      afirma.push({
        chave: 'prazo-tipico',
        texto: `Isto costuma levar ${meio} dias do começo ao fim, então montei com esse prazo.`,
        mudar: 'Se preferir outro, é só me dizer.',
        muda: 'define-prazo',
      })
    }
  }

  return { afirma, pergunta: saida.sort((a, b) => b.peso - a.peso) }
}

/**
 * O primeiro processo entregue: três checkpoints, uma tarefa em cada.
 *
 * **O checkpoint é a porta, e a tarefa mora dentro dele.** Um processo com um
 * checkpoint só não tem trilha, não tem "onde está" e não tem passagem: é a
 * lista avulsa, que é exatamente o que o produto chama de NÃO ser processo. Os
 * checkpoints são o processo; as tarefas são o recheio.
 *
 * Por isso começar pequeno é **poucas tarefas por porta**, nunca poucas portas.
 * Três checkpoints com uma tarefa cada é um processo de verdade que cabe na
 * cabeça. Três tarefas dentro de um checkpoint é uma lista de afazeres com nome
 * bonito, e a empresa que nunca teve processo continua sem ter.
 *
 * O limite existe pelo outro lado também: doze etapas de cara viram burocracia
 * que ninguém pediu, e o processo inteiro é descartado junto em duas semanas.
 * Cada checkpoint a mais entra depois, e com motivo: "três vezes alguém refez
 * porque isso não foi conferido. Quer virar checkpoint?"
 */
export const PRIMEIRO_MAXIMO = { checkpoints: 3, tarefasPorCheckpoint: 1 }

export type Desenho = {
  nome: string
  tipo: 'esteira' | 'ciclo'
  /** As portas, em ordem. Cada uma com no máximo uma tarefa no começo. */
  checkpoints: {
    nome: string
    tarefa: string | null
    /** Prazo em dias contados do início, como `processo_etapas.dias` guarda. */
    dias: number
    /**
     * A área que responde pela passagem, nunca a pessoa.
     *
     * A pergunta é sobre gente ("quem aprovou 6 das 11 vezes"), porque é assim
     * que a casa pensa, e o processo guarda a área daquela pessoa, porque é
     * assim que ele serve à obra seguinte, com outro time. Quem faz a ponte é
     * quem chama, que conhece os perfis.
     */
    area: string | null
  }[]
}

/**
 * O rascunho que vai para a mesa.
 *
 * Os três checkpoints saem de onde o trabalho realmente passa: como ele
 * **começa** (o gatilho), o passo do meio que mais importa, e como ele
 * **termina** (o desfecho). Começo, meio e fim é o menor processo que ainda é
 * um processo.
 */
export function primeiroDesenho(c: Candidato): Desenho {
  const meio = c.passos.slice(0, PRIMEIRO_MAXIMO.checkpoints - 2)
  const nomes = [c.gatilho, ...meio, c.desfecho].slice(0, PRIMEIRO_MAXIMO.checkpoints)
  // O prazo total é o que a casa já leva, e ele se reparte pelas portas em
  // partes iguais. Chute nenhum: quando não há duração observada, fica zero, e
  // zero na tela é "sem prazo", que é honesto. Prazo inventado é pior que
  // nenhum, porque a primeira track nasce atrasada e ninguém sabe por quê.
  const total = mediana(c.duracoes)

  return {
    nome: c.nome || 'Processo sem nome',
    // A cadência decide o tipo, e ela saiu do intervalo entre as execuções.
    tipo: c.cadencia === 'rotina' ? 'ciclo' : 'esteira',
    checkpoints: nomes.map((nome, i) => ({
      nome: rotuloDoPasso(nome),
      // Uma tarefa por porta, e só nas do meio: a primeira é o gatilho, que já
      // aconteceu quando a track nasce, e a última é a conferência final.
      tarefa: i > 0 && i < nomes.length - 1
        ? (c.passos[i - 1] ? rotuloDoPasso(c.passos[i - 1]) : null) : null,
      dias: total ? Math.round((total * (i + 1)) / nomes.length) : 0,
      // Área nenhuma sai da descoberta: ela sai da resposta sobre quem aprova,
      // e enquanto não houver resposta a passagem é de quem for abrir a track.
      area: null,
    })),
  }
}

/**
 * A pergunta identificada dentro daquele candidato.
 *
 * São DUAS chaves, e a diferença importa. Esta carrega o alvo
 * (`passo-as-vezes:conferir:estoque`) e serve para guardar a resposta: sem o
 * alvo, responder sobre um passo apagaria a resposta sobre o outro. A do molde
 * (`p.chave`, sem alvo) é a que sobe para o acervo entre clientes, porque é ela
 * que generaliza: "a pergunta sobre passo que às vezes acontece costuma ser
 * respondida" é forma, e "conferir estoque" é da casa.
 */
/**
 * Reexportado porque o nome do passo é parte da conversa, e quem monta a
 * conversa importa deste arquivo. A definição mora em `descobrir.ts`, que é
 * quem conhece os tipos de evento.
 */
export { rotuloDoPasso }

export const idDaPergunta = (p: PerguntaDoProcesso) =>
  p.alvo ? `${p.chave}:${p.alvo}` : p.chave

/**
 * A linha guardada volta a ser candidato.
 *
 * O banco guarda o achado; a conversa é recalculada aqui, toda vez, a partir
 * dele. Guardar as perguntas prontas seria mais rápido e ficaria velho: no dia
 * em que a regra de perguntar mudar, os candidatos antigos continuariam
 * perguntando do jeito antigo, e ninguém iria olhar.
 *
 * `passos` de cada execução pode faltar nas linhas gravadas antes desta versão.
 * Nesse caso o miolo por execução fica vazio, as perguntas de passo não saem, e
 * o candidato ainda serve: na varredura seguinte ele volta completo.
 */
export function candidatoDe(d: {
  nome_sugerido: string; gatilho: string; desfecho: string; passos: string[]
  areas: string[]; vezes: number; confianca: number; duracoes: number[]
  cadencia: Candidato['cadencia']
  execucoes: { id: string | null; nome: string; dias: number; passos?: string[]; quem?: string | null }[]
}): Candidato {
  return {
    execucoes: d.execucoes.map((e) => ({
      fluxo_id: e.id || '',
      nome: e.nome,
      gatilho: d.gatilho,
      desfecho: d.desfecho,
      passos: new Set(e.passos || []),
      areas: new Set<string>(),
      inicio: '',
      fim: '',
      duracao: e.dias,
    })),
    gatilho: d.gatilho,
    desfecho: d.desfecho,
    passos: d.passos,
    areas: d.areas,
    vezes: d.vezes,
    confianca: d.confianca,
    cadencia: d.cadencia,
    duracoes: d.duracoes,
    nome: d.nome_sugerido,
  }
}

/** Quem decidiu cada execução, no formato que `perguntasDoProcesso` pede. */
export function quemAprovouDe(
  execucoes: { id: string | null; quem?: string | null }[],
  nomeDe: (perfil: string) => string,
): { execucao: string; quem: string | null; nome: string }[] {
  return execucoes.map((e) => ({
    execucao: e.id || '',
    quem: e.quem || null,
    nome: e.quem ? nomeDe(e.quem) : '',
  }))
}

/**
 * O que as respostas mudam no rascunho.
 *
 * As respostas entram aqui e não no desenho original de propósito: o desenho
 * original é o que o app propôs sozinho, e dá para mostrar os dois lado a lado
 * quando alguém perguntar "por que mudou". Misturar os dois faria a proposta do
 * app ficar indistinguível do que a pessoa pediu.
 *
 * **O passo confirmado pode passar de três checkpoints**, e isso não fere o
 * limite: o limite é sobre o que o app propõe sem ninguém pedir. Checkpoint que
 * a pessoa confirmou porque "das 11 vezes, nas 4 em que faltou levou o dobro"
 * é exatamente o caso que o comentário de `PRIMEIRO_MAXIMO` prevê.
 */
export function comAsRespostas(
  base: Desenho,
  perguntas: PerguntaDoProcesso[],
  respostas: Record<string, string>,
  areaDeQuem: (perfil: string) => string | null,
): Desenho {
  const cps = base.checkpoints.map((c) => ({ ...c }))

  for (const p of perguntas) {
    const r = respostas[idDaPergunta(p)]
    if (!r) continue

    if (p.muda === 'vira-checkpoint' && r === '1' && p.alvo) {
      const nome = rotuloDoPasso(p.alvo)
      if (!cps.some((c) => c.nome === nome)) {
        // Entra antes da última porta: o que precisa ser conferido é conferido
        // antes de entregar, nunca depois.
        const antes = Math.max(1, cps.length - 1)
        const dias = Math.round(((cps[antes - 1]?.dias || 0) + (cps[antes]?.dias || 0)) / 2)
        cps.splice(antes, 0, { nome, tarefa: nome, dias, area: null })
      }
    }

    if (p.muda === 'passo-obrigatorio' && r === '1' && p.alvo) {
      const texto = rotuloDoPasso(p.alvo)
      // Vira tarefa na primeira porta do meio que ainda não tem uma. Sem vaga,
      // ela entra na última do meio: tarefa confirmada não pode simplesmente
      // não aparecer, ou a resposta não mudou nada e a pessoa percebe.
      const meio = cps.slice(1, -1)
      const vaga = meio.find((c) => !c.tarefa) || meio[meio.length - 1]
      if (vaga && vaga.tarefa !== texto) vaga.tarefa = vaga.tarefa ? vaga.tarefa : texto
    }

    if (p.muda === 'define-aprovador') {
      // '9' é "qualquer um da área", que é justamente não fixar ninguém.
      if (r !== '9') {
        const perfil = p.ids?.[Number(r) - 1]
        const area = perfil ? areaDeQuem(perfil) : null
        // A passagem em jogo é a última: é ela que fecha o trabalho, e é dela
        // que a casa estava falando quando aprovou 6 das 11 vezes.
        if (area && cps.length) cps[cps.length - 1].area = area
      }
    }
  }

  return { ...base, checkpoints: cps }
}

/**
 * As etapas no formato que `salvar_processo` espera.
 *
 * Existe para que a tela não monte esse jsonb na mão: o dia em que
 * `processo_etapas` ganhar uma coluna, o lugar de mexer é um.
 */
export function paraSalvar(d: Desenho, area: string | null) {
  return {
    processo: { nome: d.nome, tipo: d.tipo, area_id: area || '', descricao: '' },
    etapas: d.checkpoints.map((c) => ({
      nome: c.nome,
      criterio: '',
      aprovador_area_id: c.area || '',
      dias: c.dias,
      itens: c.tarefa ? [{ texto: c.tarefa, area_id: c.area || '', dias: c.dias }] : [],
    })),
  }
}

/**
 * A resposta que não caberia no processo, e por que.
 *
 * "Quem devia responder por esta passagem?" é uma pergunta sobre gente, porque é
 * assim que a casa pensa. O processo guarda ÁREA, porque é assim que ele serve à
 * obra seguinte com outro time. Quando a pessoa escolhida não está em área
 * nenhuma, as duas coisas não se encontram, e o rascunho não muda.
 *
 * Isto devolve quem ficou de fora, para a tela poder dizer. Engolir em silêncio
 * é o pior dos caminhos: a pessoa responde, olha o rascunho, não vê diferença
 * nenhuma, e conclui, com razão, que responder ali não serve para nada.
 */
export function respostaSemLugar(
  perguntas: PerguntaDoProcesso[],
  respostas: Record<string, string>,
  areaDeQuem: (perfil: string) => string | null,
): string[] {
  const fora: string[] = []
  for (const p of perguntas) {
    if (p.muda !== 'define-aprovador') continue
    const r = respostas[idDaPergunta(p)]
    if (!r || r === '9') continue
    const perfil = p.ids?.[Number(r) - 1]
    if (perfil && !areaDeQuem(perfil)) fora.push(perfil)
  }
  return fora
}
