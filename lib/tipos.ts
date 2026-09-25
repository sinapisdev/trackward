/**
 * admin: sócio ou diretor, enxerga e muda tudo.
 * gestor: desenha processos e acompanha quem está abaixo dele.
 * colaborador: executa o que é dele, sem mexer em prazo nem em critério de entrega.
 */
export type Papel = 'admin' | 'gestor' | 'colaborador'
export type Status = 'late' | 'hold' | 'soon' | 'ok' | 'done'
export type Tipo = 'esteira' | 'ciclo'
/** Quem enxerga uma esteira: a equipe toda, só quem você escolher, ou só você. */
export type Visibilidade = 'equipe' | 'escolhidas' | 'so_eu'
export type Freq = 'semanal' | 'quinzenal' | 'mensal'

export type Perfil = {
  id: string
  /** O login a que este perfil pertence. Um login pode ter um perfil por espaço. */
  user_id: string
  /** O espaço a que este perfil pertence. É a etiqueta que separa uma empresa da outra. */
  org_id: string
  nome: string
  email: string
  cor: string
  papel: Papel
  ativo: boolean
  /** Área principal, para onde as tarefas dessa frente são distribuídas. */
  area_id: string | null
  /** A quem esta pessoa responde. Quem está acima enxerga o trabalho de quem está abaixo. */
  gestor_id: string | null
  /** Enxerga tudo da própria área, não só as tarefas em que entra. */
  ve_area: boolean
  criado_em: string
}

export type Area = {
  id: string
  nome: string
  cor: string
  ordem: number
  /** Quem recebe, por padrão, as tarefas que o processo manda para esta área. */
  responsavel_id: string | null
}

/**
 * Convite: o superior define papel, área e hierarquia antes de a pessoa entrar,
 * para a conta nascer pronta em vez de esperar liberação manual.
 */
export type Convite = {
  id: string
  email: string
  nome: string
  codigo: string
  papel: Papel
  area_id: string | null
  gestor_id: string | null
  ve_area: boolean
  criado_por: string | null
  criado_em: string
  usado_em: string | null
  usado_por: string | null
}

/**
 * Processo: o trilho que a empresa desenha uma vez e reusa.
 *
 * Diferente de uma esteira, aqui as tarefas apontam para uma **área**, não para
 * uma pessoa, e os prazos são contados em dias a partir do início. Assim o mesmo
 * processo serve para qualquer obra, qualquer mês e qualquer empresa.
 */
export type Processo = {
  id: string
  nome: string
  descricao: string
  tipo: Tipo
  /** Preenchida, o processo aparece só nesta área. */
  area_id: string | null
  ordem: number
  criado_em: string
  etapas: ProcessoEtapa[]
}

export type ProcessoEtapa = {
  id: string
  processo_id: string
  ordem: number
  nome: string
  criterio: string
  /** Área que aprova a saída deste checkpoint. */
  aprovador_area_id: string | null
  /** Prazo em dias, contados do início da esteira. */
  dias: number
  itens: ProcessoItem[]
}

export type ProcessoItem = {
  id: string
  etapa_id: string
  processo_id: string
  ordem: number
  texto: string
  /** Área que executa a tarefa. */
  area_id: string | null
  dias: number
}

/** Empresa, negócio, centro de custo: o rótulo é escolhido em Ajustes. */
export type Empresa = {
  id: string
  nome: string
  sigla: string
  cor: string
  ordem: number
}

/**
 * A empresa (ou a pessoa) que usa o Track. Uma linha por cliente, e é o id dela
 * que aparece em todas as outras tabelas, como a etiqueta que diz de quem é o dado.
 */
/** Um espaço a que o meu login pertence, para o seletor no alto da lateral. */
export type Espaco = {
  perfil_id: string
  org_id: string
  nome: string
  tipo: 'pessoal' | 'equipe'
  papel: Papel
  ativo: boolean
  atual: boolean
}

export type Organizacao = {
  id: string
  nome: string
  /**
   * equipe:  o único tipo que nasce hoje. Várias pessoas, com hierarquia.
   * pessoal: uma pessoa só, sem equipe nem convite na tela. Não é mais possível
   *          criar uma assim, mas quem já tem continua abrindo normalmente: o
   *          uso pessoal volta depois, pensado de novo.
   */
  tipo: 'pessoal' | 'equipe'
  /**
   * Domínio de e-mail da empresa. Não coloca mais ninguém para dentro: quem
   * entra, entra por convite. Ficou só como identificação da casa.
   */
  dominio: string | null
  /** Sem uso. O domínio não abre porta desde que o cadastro virou por convite. */
  entrada_por_dominio: boolean
  /** Quem abriu a conta. Não pode ser desativado nem rebaixado. */
  dono_id: string | null
  /** Separa áreas e projetos por empresa, unidade ou centro de custo. */
  multi: boolean
  rotulo: string
  rotulo_plural: string
  /** A leitura das conversas está ligada. */
  ia_ativa: boolean
  /**
   * sugerir: a leitura propõe e alguém aceita com um toque.
   * aplicar: tarefa nova e tarefa concluída entram sozinhas. Prazo nunca entra
   *          sozinho, porque prazo é compromisso com quem espera.
   */
  ia_modo: 'sugerir' | 'aplicar'
  /**
   * O plano desta empresa. Os limites moram nas colunas abaixo, e não numa
   * tabela de planos, porque os planos ainda não estão definidos: assim dá para
   * começar a cobrar mexendo em números, sem mexer em código.
   */
  plano: string
  /** Leituras com modelo por mês. Nulo é sem teto. */
  limite_leituras: number | null
  /** Qual modelo esta empresa usa. Vazio é o padrão do servidor. */
  modelo_ia: string | null
  criado_em: string
  /** O conector da Twilio que assina o WhatsApp da casa. Nulo é WhatsApp desligado. */
  whats_conector: string | null
  /** O Account SID da Twilio, que entra no caminho da chamada. Não é segredo. */
  whats_sid: string
  /** O remetente aprovado pela Meta, como a Twilio espera: whatsapp:+14155238886 */
  whats_de: string
}

export type Item = {
  id: string
  etapa_id: string
  fluxo_id: string
  texto: string
  /** O resto, quando o título não basta. Vazio é o normal. */
  descricao: string
  resp_id: string | null
  prazo: string | null
  feito: boolean
  priv: boolean
  autor_id: string | null
  ordem: number
  /** Quando ficou pronta. Vazio enquanto está aberta. Carimbado pelo servidor. */
  feito_em: string | null
  /** Data que não se move: prazo legal, data de cliente, evento marcado. */
  prazo_firme: boolean
  /** Tarefas que precisam sair antes desta, mesmo em outra esteira. */
  depende_de: string[]
  /**
   * Ela nasceu de uma ressalva do checkpoint anterior.
   *
   * Muda duas coisas: o banco recusa apagá-la em aberto, e o checkpoint em que
   * ela mora não fecha enquanto ela não sair. Dívida não se apaga, se paga.
   */
  ressalva: boolean
}

/** Uma tarefa que trava outra, com o contexto de quem responde por ela. */
export type Trava = {
  item: Item
  fluxo: Fluxo
  etapa: Etapa
}

export type Etapa = {
  id: string
  fluxo_id: string
  ordem: number
  nome: string
  criterio: string
  aprovador_id: string | null
  prazo: string | null
  itens: Item[]
}

/**
 * A prova de que a tarefa foi feita: o comprovante, o contrato assinado, a foto.
 * O arquivo mora no Storage; aqui fica o endereço dele.
 */
export type Anexo = {
  id: string
  /** De quem ele é. Uma das duas, nunca as duas. */
  item_id: string | null
  fluxo_id: string | null
  nome: string
  tipo: string
  tamanho: number
  /** Endereço dentro do balde. Começa pelo id da organização. */
  caminho: string
  autor_id: string | null
  criado_em: string
  nota_id: string | null
}

/** Uma tarefa que a cascata quer mover, e o que aconteceria com ela. */
export type NaCascata = {
  item_id: string
  fluxo_id: string
  fluxo: string
  texto: string
  de: string | null
  para: string
  firme: boolean
  /** Está na mesma esteira da tarefa que mudou, então anda direto. */
  meu: boolean
  resp_id: string | null
  nivel: number
}

/** O prazo de uma tarefa de outra esteira só muda com o sim de quem responde por ela. */
export type PedidoPrazo = {
  id: string
  item_id: string
  fluxo_id: string
  de: string | null
  para: string
  motivo: string
  origem_id: string | null
  pedido_por: string | null
  estado: 'aberto' | 'aceito' | 'recusado'
  decidido_por: string | null
  decidido_em: string | null
  criado_em: string
}

/**
 * Uma nota: o que a pessoa quer guardar e achar depois.
 *
 * Nota não é tarefa. Tarefa tem dono e prazo e cobra. Nota não cobra nada, e é
 * por isso que ela precisa de um lugar próprio: ideia na lista de tarefas entope
 * a lista e a pessoa para de olhar para ela.
 *
 * As ligações vivem dentro do texto, escritas [[assim]]. Ver lib/notas.ts.
 */
export type Nota = {
  id: string
  titulo: string
  texto: string
  dono_id: string
  /** A mensagem de onde ela saiu, quando alguém guardou uma fala como nota. */
  mensagem_id: string | null
  /** A tarefa que saiu dela, quando a ideia ganhou dono e prazo. */
  item_id: string | null
  fixada: boolean
  arquivada: boolean
  criado_em: string
  mexido_em: string
  /** A frente da empresa a que a nota se refere. Etiqueta, não pasta. */
  area_id: string | null
  /** A track a que ela se refere, quando é sobre uma. */
  fluxo_id: string | null
  /**
   * A conversa solta com a leitura: a nota sem assunto, uma por pessoa.
   *
   * Ela não aparece no caderno, e o filtro é na fonte, em `Dados`. Ser uma nota
   * é o que faz o que for dito nela entrar no acervo pela mesma porta do resto.
   */
  conversa: boolean
}

/**
 * Um conector: o endereço de um serviço de fora, e a chave para falar com ele.
 *
 * dono_id nulo é conector da casa, que todo mundo pode usar e só admin mexe.
 * dono_id preenchido é conector pessoal, que só a própria pessoa vê.
 *
 * O segredo não está aqui de propósito. Ele mora cifrado no banco e abre só no
 * servidor. O que a tela recebe é a dica, os quatro últimos caracteres.
 */
export type Conector = {
  id: string
  nome: string
  base_url: string
  auth_tipo: 'bearer' | 'header' | 'query'
  auth_nome: string
  /** Os quatro últimos caracteres da chave, para reconhecer qual é. */
  dica: string
  dono_id: string | null
  ativo: boolean
  criado_por: string | null
  criado_em: string
}

/**
 * Um agente da empresa: o que reconhecer, e o que fazer quando reconhecer.
 *
 * A ação nunca é direta, sempre vira proposta. Ver lib/agentes.ts.
 */
export type Agente = {
  id: string
  nome: string
  ativo: boolean
  quando: 'conversa'
  /** O que reconhecer, em português, escrito pela empresa. */
  reconhecer: string
  /** Onde escuta. Nulo nos dois é escutar em todo canal. */
  canal_id: string | null
  area_id: string | null
  faz: 'processo' | 'tarefa' | 'webhook' | 'conector'
  processo_id: string | null
  tarefa_texto: string
  tarefa_area_id: string | null
  /** A ponte para o que não é o Track: Zapier, Make, n8n, o sistema do cliente. */
  url: string
  /** Quando faz é conector: qual conector, e o que chamar nele. */
  conector_id: string | null
  caminho: string
  corpo: string
  disparos: number
  disparado_em: string | null
  criado_por: string | null
  criado_em: string
}

export type TipoDecisao = 'aprovou' | 'ressalva' | 'devolveu'

/** O que o aprovador respondeu num checkpoint, e por quê. */
export type Decisao = {
  id: string
  fluxo_id: string
  etapa_id: string
  quem_id: string | null
  tipo: TipoDecisao
  nota: string
  criado_em: string
}

export type Volta = {
  id: string
  fluxo_id: string
  periodo: string
  situacao: 'ok' | 'late'
  criado_em: string
}

export type Atividade = {
  id: string
  fluxo_id: string
  quem_id: string | null
  texto: string
  /** Foi a leitura da conversa, e não uma pessoa. */
  por_ia: boolean
  criado_em: string
}

export type Fluxo = {
  id: string
  tipo: Tipo
  nome: string
  area_id: string | null
  empresa_id: string | null
  dono_id: string | null
  autor_id: string | null
  visib: Visibilidade
  /** Com visib 'escolhidas', quem mais enxerga além de autor, dono e responsáveis. */
  pessoas: string[]
  freq: Freq | null
  periodo: string | null
  atual: number
  concluido: boolean
  /**
   * Como ela terminou: `concluido` (último checkpoint fechado) ou `cancelado`
   * (parou por algum motivo). Nulo enquanto ela está viva. Ver `lib/desfecho.ts`.
   */
  desfecho: 'concluido' | 'cancelado' | null
  /** O motivo escolhido da lista, só quando cancelada. */
  motivo: string | null
  /** O que só aquele caso explica, em texto livre. Não entra em conta nenhuma. */
  detalhe: string | null
  arquivado_em: string | null
  travado_motivo: string | null
  travado_desde: string | null
  criado_em: string
  etapas: Etapa[]
  voltas: Volta[]
  log: Atividade[]
}

/**
 * Compromisso da agenda.
 *
 * Duas chaves independentes, como o Leo pediu:
 *  - bloqueia: ocupa o horário, então ninguém marca outra coisa com quem participa.
 *  - visivel:  os outros leem o título e os detalhes. Desligada, eles só enxergam
 *              que o horário está ocupado, sem saber do que se trata.
 */
export type Compromisso = {
  id: string
  titulo: string
  quando: string
  /** 'HH:MM', ou nulo quando é o dia inteiro. */
  inicio: string | null
  fim: string | null
  local: string
  nota: string
  dono_id: string | null
  bloqueia: boolean
  visivel: boolean
  /** Esteira a que este compromisso se refere, quando houver. */
  fluxo_id: string | null
  convidados: string[]
  criado_em: string
  /** Falso quando só chegou a ocupação, sem o conteúdo. */
  aberto: boolean
  /** Veio da agenda externa da pessoa (Google, Apple, Outlook). */
  externo?: boolean
}

/**
 * Ligação com o calendário de fora. A url é secreta e só o dono a lê, nem o
 * administrador: quem tem o link tem o conteúdo inteiro do calendário.
 */
export type AgendaExterna = {
  perfil_id: string
  url: string
  nome: string
  lido_em: string | null
}

/** Item pendente de alguém: executar um item ou aprovar a saída de um checkpoint. */
export type Pendencia =
  | { tipo: 'item'; fluxo: Fluxo; etapa: Etapa; item: Item; prazo: string | null }
  | { tipo: 'aprov'; fluxo: Fluxo; etapa: Etapa; item: null; prazo: string | null }

// --------------------------------------------------------------- conversa

/**
 * Canal de conversa.
 *  - aberto:  toda a equipe entra. Amarrado a um projeto, quem vê o projeto vê o canal.
 *  - fechado: só quem foi posto dentro. Nem o administrador lê de fora.
 *  - direto:  conversa entre duas pessoas.
 */
export type TipoCanal = 'aberto' | 'fechado' | 'direto'

export type Canal = {
  id: string
  nome: string
  descricao: string
  tipo: TipoCanal
  /** Canal da área: nasce junto com a frente e acompanha as rotinas dela. */
  area_id: string | null
  /** Canal do projeto: quem enxerga a esteira enxerga a conversa. */
  fluxo_id: string | null
  empresa_id: string | null
  criado_por: string | null
  criado_em: string
  arquivado: boolean
  membros: string[]
  /** Quando eu li este canal pela última vez, para contar o que chegou depois. */
  lido_em: string | null
}

export type Mensagem = {
  id: string
  /** De qual canal. Nulo quando a mensagem é de uma nota: uma coisa ou a outra. */
  canal_id: string | null
  /** De qual nota. Nulo quando a mensagem é de um canal. */
  nota_id: string | null
  autor_id: string | null
  texto: string
  /** Resposta a outra mensagem, para a conversa não se perder. */
  responde_a: string | null
  /** Escrita pelo próprio sistema, quando uma sugestão vira tarefa. */
  sistema: boolean
  /** Escrita pela leitura da conversa, e não por quem mandou ler. */
  por_ia: boolean
  /** Recado de voz: o endereço do arquivo no balde. */
  audio_caminho: string | null
  audio_segundos: number | null
  /** O texto veio da transcrição do áudio, então pode ter erro de audição. */
  transcrito: boolean
  criado_em: string
  editado_em: string | null
}

export type TipoProposta =
  | 'tarefa' | 'prazo' | 'concluir' | 'decisao' | 'trava' | 'distribuir' | 'agente'
  /** Do canal de despejo: guardar como nota, ou marcar na agenda. */
  | 'nota' | 'compromisso'

/** O que a leitura da conversa propõe. Nada acontece antes de alguém aceitar. */
export type Alvo = {
  fluxo_id?: string | null
  etapa_id?: string | null
  item_id?: string | null
  resp_id?: string | null
  prazo?: string | null
  /** A tarefa que nasceu daqui. Sem guardar isto não há como desfazer depois. */
  criou_id?: string | null
  /** Quem era o dono antes, para desfazer poder devolver ao que era. */
  de_resp_id?: string | null
  /** Qual agente reconheceu a situação, quando a proposta vem de um. */
  agente_id?: string | null
  /** A esteira que o agente abriu, para desfazer poder fechá-la. */
  abriu_id?: string | null
  /** A nota que nasceu do despejo, para desfazer poder apagá-la. */
  nota_id?: string | null
  /** O compromisso que nasceu do despejo, pelo mesmo motivo. */
  compromisso_id?: string | null
  /** Quando é compromisso: o dia e a hora que a leitura entendeu. */
  quando?: string | null
  inicio?: string | null
}

export type Sugestao = {
  id: string
  /** De qual canal veio, ou de qual nota. Uma coisa ou a outra, nunca as duas. */
  canal_id: string | null
  nota_id: string | null
  mensagem_id: string | null
  tipo: TipoProposta
  /** O que será feito, em uma linha. */
  texto: string
  /** O trecho da conversa que deu origem, para ninguém aceitar no escuro. */
  motivo: string
  dados: Alvo
  estado: 'aberta' | 'aceita' | 'recusada'
  criado_em: string
  decidido_por: string | null
  decidido_em: string | null
  /** A leitura aplicou sozinha. Aparece assinada por ela, e dá para desfazer. */
  por_ia: boolean
  desfeita_em: string | null
  desfeita_por: string | null
}

/* ==========================================================================
   Avisos
   ========================================================================== */

export type TipoAviso =
  | 'tarefa' | 'aprovacao' | 'prazo' | 'travou' | 'destravou' | 'citacao' | 'pedido_prazo'

/**
 * Um aviso é sempre de uma pessoa. Não existe aviso do grupo: aviso sem dono
 * ninguém responde, e a caixa de cada um só ela lê, nem o administrador.
 */
export type Aviso = {
  id: string
  perfil_id: string
  tipo: TipoAviso
  titulo: string
  corpo: string
  /** O que justifica tocar o celular de alguém. O resto espera no sino. */
  urgente: boolean
  fluxo_id: string | null
  item_id: string | null
  etapa_id: string | null
  canal_id: string | null
  /** A chave que impede o mesmo aviso duas vezes. Ver `avisar()` no schema. */
  chave: string
  lido_em: string | null
  /** Quando saiu daqui para o push e para o WhatsApp. */
  entregue_em: string | null
  criado_em: string
}

/** Por onde a pessoa quer ser avisada. Fora de `perfis`: telefone não é assunto da casa. */
export type AvisoContato = {
  perfil_id: string
  /** Formato internacional, com o mais na frente: +5511999999999. */
  telefone: string
  whats: boolean
  push: boolean
  so_urgente: boolean
  /** Não perturbe, no relógio de quem recebe. Vazio é sempre pode. */
  calado_de: string | null
  calado_ate: string | null
}

/** Um aparelho que aceitou push. Uma pessoa costuma ter dois ou três. */
export type PushAssinatura = {
  id: string
  perfil_id: string
  endpoint: string
  aparelho: string
  criado_em: string
  usado_em: string | null
}

/**
 * O que quem recebeu o trabalho disse, pelo link.
 *
 * Quem responde não tem conta no app: o `token` é a credencial dele, e por isso
 * ele vence e vale uma resposta só. Ver a seção 24 do schema e a rota
 * `/api/feedback`.
 */
export type Feedback = {
  id: string
  fluxo_id: string
  token: string
  pediu_id: string | null
  /** Para quem foi pedido, do jeito que quem pediu escreveu. Não é e-mail. */
  para: string
  vence_em: string
  respondido_em: string | null
  nota: number | null
  texto: string | null
  criado_em: string
}
