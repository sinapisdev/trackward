/* Mock content for the TrackWard app kit — the same fictional organisation used in the
   product art: Grupo Meridiano, an ERP rollout, a monthly financial close. */
function AppData() {
  const people = {
    leo: { name: "Leonardo Esteves", short: "Leonardo" },
    ana: { name: "Ana Nunes", short: "Ana" },
    mari: { name: "Mariana Costa", short: "Mariana" },
    bruno: { name: "Bruno Ribeiro", short: "Bruno" },
  };
  return {
    org: "Grupo Meridiano",
    user: people.leo,
    people,
    routes: ["Visão geral", { label: "Meu trabalho", count: 5 }, "Projetos", "Rotinas", "Processos", "Conversa", "Agenda"],
    trail: [
      { label: "Preparação", meta: "Aprovado" },
      { label: "Cadastro", meta: "1 de 3 tarefas" },
      { label: "Validação", meta: "Próximo" },
      { label: "Entrega", meta: "Final" },
    ],
    movement: [
      { kind: "Rotina", name: "Contabilidade", meta: "8 tarefas" },
      { kind: "Área", name: "Financeiro", meta: "3 rotinas", late: "1 atrasada" },
      { kind: "Projeto", name: "Implantação do ERP", checkpoint: "Cadastro", progress: 33, tasks: "1 de 3 tarefas prontas", team: ["Leonardo E", "Ana N", "Mariana C"] },
      { kind: "Projeto", name: "Nova unidade", checkpoint: "Viabilidade", due: "Prazo amanhã" },
      { kind: "Processo", name: "Expansão", meta: "4 tarefas" },
    ],
    radar: {
      late: [
        { title: "Enviar documentos fiscais", area: "Financeiro", when: "há 2 dias" },
        { title: "Revisar proposta comercial", area: "Comercial", when: "há 1 dia" },
      ],
      blocked: [{ title: "Aguardar retorno jurídico", area: "Nova unidade · Mariana", when: "Travado" }],
      soon: [
        { title: "Conferir documentos", area: "Implantação do ERP", when: "Hoje" },
        { title: "Validar contrato", area: "Fornecedor Alpha", when: "Amanhã" },
        { title: "Preparar apresentação", area: "Expansão comercial", when: "em 3 dias" },
      ],
    },
    queue: [
      { group: "Vencida (1)", tone: "danger", items: [{ title: "Revisar contrato", context: "Financeiro / Fornecedores", action: "Executar", due: "há 2 dias", dueTone: "danger" }] },
      { group: "Hoje (2)", items: [
        { title: "Conferir documentos", context: "Implantação do ERP / Cadastro", action: "Executar", due: "Hoje", open: true },
        { title: "Aprovar fornecedores", context: "Nova unidade / Fornecedores", action: "Aprovar", due: "5 de 5 prontas", check: true },
      ] },
      { group: "A seguir (1)", items: [{ title: "Enviar briefing", context: "Nova unidade / Planejamento", action: "Executar", due: "Amanhã" }] },
      { group: "Aguardando (1)", items: [{ title: "Validar base", context: "Implantação do ERP / Cadastro", note: "Aguardando Mariana concluir a revisão.", action: "Dependência", due: "Mariana", blocked: true }] },
    ],
    projects: [
      { name: "Proposta comercial", cp: "Revisão", who: "Ana Nunes", short: "Ana", status: "late", progress: 45 },
      { name: "Nova unidade", cp: "Viabilidade", who: "Mariana Costa", short: "Mariana", status: "blocked", progress: 20 },
      { name: "Implantação do ERP", cp: "Cadastro", who: "Leonardo Esteves", short: "Leonardo", status: "soon", progress: 33 },
      { name: "Contratação de analista", cp: "Entrevistas", who: "Ana Nunes", short: "Ana", status: "onTrack", progress: 65 },
      { name: "Expansão comercial", cp: "Planejamento", who: "Mariana Costa", short: "Mariana", status: "onTrack", progress: 15 },
    ],
    tasks: [
      { title: "Conferir documentos", description: "Confira os documentos recebidos antes da validação.", assignee: "Leonardo Esteves", assigneeLabel: "Você", due: "Hoje", done: false },
      { title: "Revisar cadastros", assignee: "Ana Nunes", assigneeLabel: "Ana", due: "Amanhã", done: false },
      { title: "Importar clientes", assignee: "Mariana Costa", assigneeLabel: "Mariana", due: "Concluída", done: true },
    ],
    areas: [
      { label: "Financeiro", icon: "bar-chart-3", count: 3 },
      { label: "Operações", icon: "settings", count: 4 },
      { label: "Comercial", icon: "users", count: 2 },
      { label: "Pessoas", icon: "users-round", count: 2 },
    ],
    routines: [
      { name: "Contas a pagar", status: "late", statusLabel: "Atrasada", meta: "Volta atual · há 2 dias", who: "Mariana Costa", short: "Mariana", steps: ["Conferência", "Pagamento", "Fechamento"], current: 1, tasks: "1 de 4 tarefas prontas" },
      { name: "Fechamento mensal", status: "soon", statusLabel: "Vence hoje", meta: "Setembro · Leonardo", who: "Leonardo Esteves", short: "Leonardo", steps: ["Coleta", "Conciliação", "Aprovação"], current: 1, tasks: "2 de 4 tarefas prontas" },
      { name: "Relatório semanal", status: "onTrack", statusLabel: "Em dia", meta: "Prazo em 5 dias · Ana", who: "Ana Nunes", short: "Ana", steps: ["Coleta", "Revisão", "Envio"], current: 0, tasks: "0 de 2 tarefas prontas" },
    ],
    processes: [
      { name: "Implantação do ERP", type: "Projeto", area: "Operações", checkpoints: 4 },
      { name: "Abertura de unidade", type: "Projeto", area: "Operações", checkpoints: 5 },
      { name: "Contratação", type: "Projeto", area: "Pessoas", checkpoints: 4 },
      { name: "Fechamento mensal", type: "Rotina", area: "Financeiro", checkpoints: 3 },
      { name: "Contas a pagar", type: "Rotina", area: "Financeiro", checkpoints: 3 },
      { name: "Relatório semanal", type: "Rotina", area: "Comercial", checkpoints: 3 },
    ],
    processTrail: [
      { label: "Preparação", meta: "Operações · dia 2" },
      { label: "Cadastro", meta: "Operações · dia 5" },
      { label: "Validação", meta: "Financeiro · dia 10" },
      { label: "Entrega", meta: "Operações · dia 15" },
    ],
    messages: [
      { author: "Ana", time: "09:10", text: "Preciso de mais dois dias para revisar os cadastros." },
      { author: "Leonardo", time: "09:12", mention: "Mariana", text: "prepare a lista de documentos que faltam para amanhã." },
      { author: "Mariana", time: "09:14", quote: { author: "Leonardo", text: "prepare a lista de documentos" }, text: "Vou organizar a lista ainda hoje." },
      { author: "Leonardo", time: "09:16", text: "Decidimos validar os dados antes da migração." },
    ],
    proposals: [
      { kind: "Tarefa", title: "Preparar lista de documentos", meta: "Mariana · Amanhã" },
      { kind: "Prazo", title: "Revisar cadastros", meta: "Amanhã → em 3 dias" },
      { kind: "Decisão", title: "Validar antes de migrar", meta: "Registrar na atividade" },
    ],
    activity: [
      { who: "Mariana", action: "concluiu", target: "Importar clientes", time: "há 12 min" },
      { who: "Leonardo", action: "aprovou", target: "Preparação", time: "ontem" },
    ],
    team: [
      { name: "Leonardo Esteves", short: "Leonardo", role: "Admin · Proprietário", area: "Todas", manager: "Não se aplica", owner: true, seesArea: true },
      { name: "Ana Nunes", short: "Ana", role: "Gestor", area: "Operações", manager: "Leonardo", seesArea: true },
      { name: "Mariana Costa", short: "Mariana", role: "Colaborador", area: "Financeiro", manager: "Leonardo", seesArea: false },
    ],
    agenda: {
      days: [
        { label: "Seg", date: 21 }, { label: "Ter", date: 22, today: true },
        { label: "Qua", date: 23 }, { label: "Qui", date: 24 }, { label: "Sex", date: 25 },
      ],
      deadlines: [{ day: 1, title: "Conferir documentos" }, { day: 2, title: "Revisar cadastros" }],
      events: [
        { id: "impl", day: 1, start: 10.5, end: 11.5, title: "Reunião de implantação", time: "10:30 – 11:30" },
        { day: 0, start: 11, end: 12, title: "Ocupado", time: "11:00 – 12:00", kind: "busy" },
        { day: 3, start: 9, end: 10, title: "Alinhamento de equipe", time: "09:00 – 10:00" },
        { day: 2, start: 14, end: 15, title: "Revisão financeira", time: "14:00 – 15:00" },
        { day: 4, start: 13, end: 14, title: "Ocupado", time: "13:00 – 14:00", kind: "busy" },
      ],
    },
  };
}
