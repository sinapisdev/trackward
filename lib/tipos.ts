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

/** Preferências da organização inteira, não de uma pessoa. */
export type Config = {
  id: string
  organizacao: string
  multi: boolean
  rotulo: string
  rotulo_plural: string
}

export type Item = {
  id: string
  etapa_id: string
  fluxo_id: string
  texto: string
  resp_id: string | null
  prazo: string | null
  feito: boolean
  priv: boolean
  autor_id: string | null
  ordem: number
  /** Tarefas que precisam sair antes desta, mesmo em outra esteira. */
  depende_de: string[]
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
