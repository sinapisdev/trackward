import type { Recursos } from './espaco'

/**
 * Os tutoriais, um por tela.
 *
 * O app não se explica sozinho: a inicial mostra conversa, fila e radar ao
 * mesmo tempo, e quem chega não sabe que a conversa é o lugar onde o trabalho
 * nasce nem que existe uma linguagem de barra. Em Tracks é pior, porque ali
 * mora a ideia inteira do produto, e nada na tela diz o que é um checkpoint.
 *
 * **É um tour curto por tela, e ele abre quando a pessoa CHEGA naquela tela**,
 * não tudo no primeiro acesso. Quarenta passos de enfiada no primeiro dia é um
 * folheto, e ninguém lê folheto: a pessoa clica em pular e nunca mais vê. Três
 * passos no dia em que ela abriu Tracks pela primeira vez, ela lê.
 *
 * Quatro decisões que valem explicar:
 *
 * **Ele aponta para a tela de verdade**, e não mostra desenho de tela. O que a
 * pessoa aprende é ONDE a coisa fica, e isso não se aprende olhando figura.
 *
 * **O alvo é um `data-tut`, nunca um seletor de classe.** Classe muda quando
 * alguém mexe no CSS, e aí o tutorial aponta para o nada sem ninguém perceber,
 * porque não quebra nada visível. O atributo existe só para isto.
 *
 * **Passo sem alvo na tela não trava a fila.** Se o elemento não estiver lá (a
 * tela mudou, a pessoa está num tamanho diferente, os dados ainda não
 * chegaram), o passo aparece centralizado, sem o foco. Tutorial que trava é
 * pior do que tutorial nenhum.
 *
 * **O roteiro é um só para os dois workspaces.** O passo diz em qual deles
 * existe (`quando`) e pode trocar o texto no celular (`textoCel`), onde a
 * conversa é a tela inicial em vez da coluna do meio. Escrever dois roteiros
 * seria a mesma armadilha do fork do espaço pessoal.
 */
export type Passo = {
  titulo: string
  texto: string
  /** O `data-tut` do elemento a acender no computador. Vazio é passo centralizado. */
  alvo?: string
  /** O `data-tut` no celular, onde a tela é outra. Sem ele, usa o mesmo. */
  alvoCel?: string
  /** O texto no celular, quando a coisa mora em outro lugar lá. */
  textoCel?: string
  /** Só neste tipo de espaço. Sem isso, nos dois. */
  quando?: 'empresa' | 'pessoal'
}

export type Tour = {
  /** O que fica gravado em `perfis.tutoriais` quando a pessoa termina. */
  id: string
  /** O nome da tela, para a lista de Ajustes. */
  nome: string
  /**
   * Em que endereço ele abre. O casamento é por começo do caminho, menos a
   * raiz, que é exata: `/` bate com tudo se for por prefixo.
   */
  rota: string
  /** Só neste tipo de espaço. */
  quando?: 'empresa' | 'pessoal'
  passos: Passo[]
}

const TOURS: Tour[] = [
  {
    id: 'inicio',
    nome: 'A tela inicial',
    rota: '/',
    passos: [
      {
        titulo: 'Isto aqui é o TrackWard',
        texto: 'Ele serve para o que foi combinado virar trabalho com dono e prazo, em vez de '
          + 'virar mensagem que alguém depois lembra. São dois minutos, e dá para sair a qualquer hora.',
      },
      {
        titulo: 'Seus espaços',
        texto: 'O mesmo login pode viver em mais de um lugar: a empresa, outra empresa que te '
          + 'convidar, e o seu espaço pessoal, que é só seu e ninguém entra. Você troca por aqui, '
          + 'e cada espaço mostra as coisas dele.',
        alvo: 'espaco',
      },
      {
        titulo: 'É na conversa que o trabalho nasce',
        texto: 'Ela fica no meio da tela de propósito, entre o que você tem para fazer e o que '
          + 'está parado, porque é o caminho por onde uma coisa vira a outra. Trocar de tela para '
          + 'dizer uma frase é o que faz a combinação acontecer fora do app.',
        textoCel: 'No telefone ela é a sua tela inicial, como em qualquer app de mensagem, porque '
          + 'é onde o dia acontece. É de uma frase dita aqui que sai a tarefa, sem ninguém copiar '
          + 'nada para lugar nenhum.',
        alvo: 'conversa',
        alvoCel: 'tab-conversa',
        quando: 'empresa',
      },
      {
        titulo: 'Uma linha que começa com barra é ordem',
        texto: 'Escreva /tarefa Conferir o contrato @Ana até sexta e a tarefa nasce na hora, sem '
          + 'confirmar nada. Existem /objetivo, /rotina, /nota e /agenda, e o menu abre sozinho '
          + 'quando você digita a barra.',
        alvo: 'conversa',
        alvoCel: 'tab-conversa',
        quando: 'empresa',
      },
      {
        titulo: 'O caderno é onde se escreve',
        texto: 'Cada nota é um assunto, e a primeira linha é o título. Dentro dela tem alguém do '
          + 'outro lado: a leitura lê o que você escreveu, lembra do que você guardou antes e '
          + 'responde ali mesmo, no meio do texto.',
        alvo: 'conversa',
        alvoCel: 'tab-notas',
        quando: 'pessoal',
      },
      {
        titulo: 'O que está com você',
        texto: 'A fila abre por prazo: o que venceu, o que é hoje, o que é desta semana. É a '
          + 'resposta para "o que eu faço agora", e é por isso que ela é a primeira coisa da tela.',
        textoCel: 'Em Trabalho fica a sua fila, aberta por prazo: o que venceu, o que é hoje, o que '
          + 'é desta semana. É a resposta para "o que eu faço agora".',
        alvo: 'fila',
        alvoCel: 'tab-trabalho',
      },
      {
        titulo: 'Tudo pendura numa track',
        texto: 'São duas, e só duas: o objetivo, que tem começo, checkpoints e fim, e a rotina, '
          + 'que dá voltas e guarda o histórico de cada uma. Tarefa, prazo, documento e conversa '
          + 'moram dentro delas.',
        alvo: 'abas',
        alvoCel: 'tab-tracks',
      },
      {
        titulo: 'O que está parado',
        texto: 'O radar mostra o que atrasou, o que trava outra pessoa e o que está esperando '
          + 'alguém decidir. Ele existe para você não descobrir isso na reunião de sexta.',
        textoCel: 'A agenda mostra o que está marcado, e o radar, o que travou ou atrasou, no fim '
          + 'da tela de Trabalho. Os dois existem para você não descobrir isso na reunião de sexta.',
        alvo: 'radar',
        alvoCel: 'tab-agenda',
      },
      {
        titulo: 'O sino avisa, e avisa pouco',
        texto: 'Chega aqui o que passou a depender de você: tarefa nova, checkpoint pronto, prazo '
          + 'vencendo, nota que alguém compartilhou. Fora do app só sai o urgente, e você escolhe '
          + 'o que é em Ajustes.',
        textoCel: 'Toque na sua bolinha e o sino está lá: tarefa nova, checkpoint pronto, prazo '
          + 'vencendo, nota que alguém compartilhou. Fora do app só sai o urgente, e você escolhe '
          + 'o que é em Ajustes.',
        alvo: 'sino',
        alvoCel: 'eu',
      },
      {
        titulo: 'O resto mora aqui',
        texto: 'Seu perfil, o tema, os ajustes e tudo que não é do dia a dia. Cada tela tem uma '
          + 'volta guiada como esta, e ela abre na primeira vez que você chega lá.',
        alvo: 'eu',
      },
    ],
  },

  {
    id: 'chat',
    nome: 'A conversa',
    rota: '/chat',
    quando: 'empresa',
    passos: [
      {
        titulo: 'Canal, conversa direta e a track',
        texto: 'Canal aberto qualquer pessoa da casa lê; o fechado é só de quem foi posto dentro; '
          + 'e toda track tem o canal dela, onde se fala daquele trabalho. Só canal entra nesta '
          + 'lista: nota não é canal.',
        alvo: 'chat-lista',
      },
      {
        titulo: 'Escreva, ou barra para os comandos',
        texto: 'A linha que começa com barra acontece na hora, sem confirmar: /tarefa, /objetivo, '
          + '/rotina, /nota e /agenda. Tudo que nasce assim deixa rastro no canal, para a coisa '
          + 'não aparecer num canto que ninguém viu acontecer.',
        alvo: 'chat-campo',
      },
      {
        titulo: 'A leitura propõe, você decide',
        texto: 'Conversa solta vira PROPOSTA, com o trecho que a originou, e nada acontece sem '
          + 'alguém aceitar. Ela também lembra do que a casa já tem, então não propõe de novo a '
          + 'tarefa que já existe.',
        alvo: 'chat-ler',
      },
    ],
  },

  {
    id: 'notas',
    nome: 'As notas',
    rota: '/notas',
    passos: [
      {
        titulo: 'Uma nota é um assunto',
        texto: 'Não tem campo de título: a primeira linha é o título. Ninguém escreve uma nota '
          + 'começando pelo nome dela, escreve a primeira linha.',
        alvo: 'notas-lista',
      },
      {
        titulo: 'Tem alguém do outro lado',
        texto: 'Perguntar responde dentro do texto, logo abaixo da linha onde você perguntou, e a '
          + 'resposta fica marcada como dela. Organizar separa o que virou tarefa e o que virou '
          + 'compromisso, e você aceita ou não.',
        alvo: 'notas-acoes',
      },
      {
        titulo: 'Não tem pasta, de propósito',
        texto: 'Pasta funciona nas primeiras trinta notas e desanda nas trezentas, porque a nota '
          + 'nova sempre cabe em duas. O que costura é a ligação escrita no meio do texto, '
          + '[[nome de outra nota]], e o acervo se junta sozinho.',
      },
      {
        titulo: 'O cadastro fica atrás deste botão',
        texto: 'Área, track, arquivos, fixar, apagar e compartilhar. Eles não são o trabalho: '
          + 'soltos embaixo do texto, empurravam para baixo a única coisa que importa, que é o '
          + 'que você escreveu.',
        alvo: 'notas-detalhes',
      },
    ],
  },

  {
    id: 'tracks',
    nome: 'As tracks',
    rota: '/tracks',
    passos: [
      {
        titulo: 'Objetivo tem fim, rotina dá voltas',
        texto: 'São os dois únicos tipos, e a diferença não é de tamanho: o objetivo termina '
          + '(uma obra, uma contratação), e a rotina se repete guardando o histórico de cada volta '
          + '(o fechamento do mês). O filtro aqui em cima escolhe entre os dois.',
        alvo: 'tracks-filtros',
      },
      {
        titulo: 'A área é etiqueta, não é lugar',
        texto: 'Ela agrupa, e nasce dentro do formulário de criar track. Nem todo trabalho cabe '
          + 'numa frente existente: um negócio novo não tem área ainda, e forçar uma seria '
          + 'inventar organização antes de ela existir.',
        alvo: 'tracks-filtros',
      },
      {
        titulo: 'Nada é apagado, é arquivado',
        texto: 'Toda track termina dizendo como: concluída, ou cancelada com um motivo escolhido '
          + 'de uma lista. Ela sai daqui e continua inteira em Arquivadas, com trilha, tarefas, '
          + 'conversa e anexos, e o motivo vira número em Relatórios.',
        alvo: 'tracks-arquivadas',
      },
    ],
  },

  {
    id: 'track',
    nome: 'Uma track aberta',
    rota: '/fluxo/',
    passos: [
      {
        titulo: 'A trilha diz onde a track está',
        texto: 'Cheia é checkpoint aprovado, o anel aceso é o de agora, e ele enche conforme as '
          + 'tarefas andam. O contorno apagado ainda não chegou, e a bandeira no fim só existe '
          + 'em objetivo: rotina não tem chegada.',
        alvo: 'track-trilha',
      },
      {
        titulo: 'O checkpoint é uma porta, não uma fase',
        texto: 'Ele tem um critério de saída escrito, e só passa quando as tarefas dele acabam. É '
          + 'o que impede a track de andar sem nada ter ficado pronto.',
        alvo: 'track-checkpoint',
      },
      {
        titulo: 'Aprovar com ressalva é assumir dívida',
        texto: 'A pendência vira tarefa marcada no checkpoint seguinte, e essa tarefa não se '
          + 'apaga: o banco recusa. O próximo checkpoint não fecha enquanto ela estiver aberta, '
          + 'e a mensagem diz qual é.',
        alvo: 'track-decisao',
      },
      {
        titulo: 'A conversa da track fica ao lado',
        texto: 'É a conversa daquele trabalho, e é de lá que sai tarefa por comando de barra, já '
          + 'nascendo dentro desta track. A atividade fica embaixo, retraída: quem abre a track '
          + 'quer falar e ver o checkpoint, não ler histórico.',
        alvo: 'track-conversa',
        quando: 'empresa',
      },
    ],
  },

  {
    id: 'minhas',
    nome: 'Meu trabalho',
    rota: '/minhas',
    passos: [
      {
        titulo: 'Tudo que é seu, numa lista só',
        texto: 'Tarefa de track, tarefa avulsa e checkpoint esperando você. A avulsa é privada de '
          + 'quem criou, de propósito: o que não pertence a nada é lembrete, e lembrete dos outros '
          + 'não é assunto da casa.',
        alvo: 'minhas-lista',
      },
      {
        titulo: 'Travado não é atrasado',
        texto: 'Uma tarefa pode depender de outra, inclusive de outra track. Enquanto a trava não '
          + 'sai, ela não conclui, e a tela diz quem está segurando. Isso evita a cobrança que '
          + 'chega em quem não podia fazer nada.',
        alvo: 'minhas-lista',
      },
      {
        titulo: 'A gaveta abre o detalhe',
        texto: 'Tocar numa linha abre o que ela tem dentro: descrição, anexos, quem depende dela, '
          + 'e o botão de fechar o checkpoint quando é o caso.',
        alvo: 'minhas-gaveta',
      },
    ],
  },

  {
    id: 'agenda',
    nome: 'A agenda',
    rota: '/agenda',
    passos: [
      {
        titulo: 'O que está marcado, e o que ocupa',
        texto: 'Compromisso tem duas chaves separadas: se ele bloqueia o seu horário, e se os '
          + 'outros podem ler o que é. Quem não pode ler vê só "Ocupado", nunca o título, o local '
          + 'ou a observação.',
        alvo: 'agenda-grade',
      },
      {
        titulo: 'Sua agenda de fora entra aqui',
        texto: 'Em Ajustes você cola o endereço do seu Google ou Outlook e ele passa a ocupar '
          + 'horário aqui. Só o intervalo atravessa: título, local e descrição são descartados na '
          + 'leitura, e o endereço é segredo seu.',
        alvo: 'agenda-ctl',
      },
    ],
  },

  {
    id: 'processos',
    nome: 'Os processos',
    rota: '/processos',
    passos: [
      {
        titulo: 'O processo é o molde da track',
        texto: 'Você desenha uma vez os checkpoints e as tarefas de um trabalho que se repete, e '
          + 'daí para frente cada obra, cada cliente e cada contratação nascem prontos.',
        alvo: 'processos-lista',
      },
      {
        titulo: 'Aponta para área, nunca para pessoa',
        texto: 'E o prazo é em dias a partir do início, não em data. É isso que deixa o mesmo '
          + 'molde servir a qualquer cliente: na hora de criar, a área vira a pessoa responsável '
          + 'e os dias viram datas.',
        alvo: 'processos-lista',
      },
    ],
  },

  {
    id: 'relatorios',
    nome: 'Os relatórios',
    rota: '/relatorios',
    passos: [
      {
        titulo: 'O que aconteceu no período',
        texto: 'Entregas, atrasos, o que cada área carregou e o que travou. Escolha o período aqui '
          + 'em cima; o resto da tela responde a ele.',
        alvo: 'rel-periodo',
      },
      {
        titulo: 'Como as tracks terminaram',
        texto: 'Concluídas, taxa de conclusão e o ranking de motivos de cancelamento. É isto que '
          + 'o arquivo devolve em troca de nada ser apagado, e é por isso que o motivo é escolhido '
          + 'de uma lista em vez de digitado.',
      },
    ],
  },

  {
    id: 'desempenho',
    nome: 'O desempenho',
    rota: '/desempenho',
    passos: [
      {
        titulo: 'Isto não é ranking de pessoa',
        texto: 'São prazos cumpridos, carga por área e onde o trabalho costuma parar. Serve para '
          + 'achar o gargalo do processo, que quase nunca é falta de esforço de alguém.',
      },
      {
        titulo: 'Compare períodos, não pessoas',
        texto: 'Um mês sozinho não diz nada: o que diz é a mesma medida no mês anterior. Se um '
          + 'número piorou na equipe inteira ao mesmo tempo, o problema é o processo.',
      },
    ],
  },

  {
    id: 'equipe',
    nome: 'A equipe',
    rota: '/equipe',
    quando: 'empresa',
    passos: [
      {
        titulo: 'Entrar aqui é só por convite',
        texto: 'O domínio do e-mail não coloca ninguém para dentro: quem se cadastra sem convite '
          + 'abre a empresa dele, não cai na sua. O convite é um código de seis letras, e ele já '
          + 'traz papel, área e a quem a pessoa responde.',
        alvo: 'equipe-convidar',
      },
      {
        titulo: 'O papel nunca é escolhido por quem entra',
        texto: 'Colaborador vê o que é dele e o que trava o que é dele. Gestor vê também tudo de '
          + 'quem está abaixo, em qualquer profundidade. Administrador vê tudo. Quem muda isso é '
          + 'um administrador, aqui.',
        alvo: 'equipe-lista',
      },
    ],
  },

  {
    id: 'agentes',
    nome: 'Os agentes',
    rota: '/agentes',
    passos: [
      {
        titulo: 'Um agente é uma regra que fica de olho',
        texto: 'Ele escuta um canal ou uma área e faz uma coisa quando aparece o que você '
          + 'descreveu: avisar alguém, abrir tarefa, marcar prazo. Você escreve em português o '
          + 'que ele deve observar.',
        alvo: 'agentes-lista',
      },
      {
        titulo: 'Ele propõe do mesmo jeito que a leitura',
        texto: 'O que o agente faz sozinho aparece marcado como feito por ele, em bloco próprio, '
          + 'para ninguém descobrir depois que a máquina mexeu em algo.',
      },
    ],
  },

  {
    id: 'conectores',
    nome: 'Os conectores',
    rota: '/conectores',
    passos: [
      {
        titulo: 'Trazer de fora o que já existe fora',
        texto: 'Um conector guarda o endereço e a chave de um sistema seu, e a partir daí o app '
          + 'pode consultar dado de lá sem ninguém copiar e colar.',
        alvo: 'conectores-lista',
      },
      {
        titulo: 'A chave é de quem cadastrou',
        texto: 'Ela fica guardada fora do alcance da tela e não volta para o navegador de '
          + 'ninguém. Quem cadastrou pode trocar; os outros usam sem ver.',
      },
    ],
  },

  {
    id: 'avisos',
    nome: 'Os avisos',
    rota: '/avisos',
    passos: [
      {
        titulo: 'A caixa é sua, e de mais ninguém',
        texto: 'Nem o administrador lê a sua. Aqui dentro aparece texto de tarefa privada e de '
          + 'canal fechado, e o aviso não pode virar a porta dos fundos das regras de quem vê o quê.',
        alvo: 'avisos-lista',
      },
      {
        titulo: 'Abrir a caixa já marca como lido',
        texto: 'O número conta o que você ainda não viu, e depois de abrir você viu. O destaque '
          + 'das linhas fica até você sair, para dar tempo de distinguir o que chegou.',
      },
      {
        titulo: 'Fora do app só sai o urgente',
        texto: 'Urgente é faixa estreita de propósito: o que já venceu, o que trava outra pessoa e '
          + 'o que só você destrava. Em Ajustes você diz por onde quer receber e em que horário '
          + 'não quer ser incomodado.',
      },
    ],
  },
]

/** Os tours deste espaço, já sem o que não existe nele. */
export function toursDe(pode: Recursos): Tour[] {
  const tipo = pode.canais ? 'empresa' : 'pessoal'
  return TOURS
    .filter((t) => !t.quando || t.quando === tipo)
    .map((t) => ({ ...t, passos: t.passos.filter((p) => !p.quando || p.quando === tipo) }))
    .filter((t) => t.passos.length)
}

/**
 * Qual tour pertence a este endereço.
 *
 * A raiz casa exata, e o resto por começo do caminho: por prefixo, `/` bateria
 * com todas as telas do app e o tour da inicial abriria em cima de qualquer
 * uma. Entre dois que casam vence o caminho mais longo, que é o mais
 * específico: `/fluxo/abc` é a track aberta, não a lista.
 */
export function tourDe(caminho: string, pode: Recursos): Tour | null {
  const candidatos = toursDe(pode).filter((t) => (
    t.rota === '/' ? caminho === '/' : caminho.startsWith(t.rota)
  ))
  return candidatos.sort((a, b) => b.rota.length - a.rota.length)[0] || null
}
