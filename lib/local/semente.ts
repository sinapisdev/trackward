import { hoje, iso, MESES } from '@/lib/datas'

/** Data a N dias de hoje, para o exemplo nascer sempre com prazos realistas. */
const d = (n: number) => {
  const x = hoje()
  x.setDate(x.getDate() + n)
  return iso(x)
}

const semana = (n = 0) => {
  const t = hoje()
  t.setDate(t.getDate() + n + 4 - (t.getDay() || 7))
  const y = new Date(t.getFullYear(), 0, 1)
  return 'Semana ' + Math.ceil(((t.getTime() - y.getTime()) / 864e5 + 1) / 7)
}

const mes = (n = 0) => {
  const x = hoje()
  x.setMonth(x.getMonth() + n)
  return MESES[x.getMonth()] + '/' + String(x.getFullYear()).slice(2)
}

/** Daqui a N dias úteis, para o exemplo não cair sempre num sábado. */
const du = (n: number) => {
  const x = hoje()
  let passos = 0
  while (passos < n) {
    x.setDate(x.getDate() + 1)
    if (x.getDay() !== 0 && x.getDay() !== 6) passos++
  }
  while (x.getDay() === 0 || x.getDay() === 6) x.setDate(x.getDate() + 1)
  return iso(x)
}

const quinzena = () => {
  const h = hoje()
  const jan = new Date(h.getFullYear(), 0, 1)
  return 'Quinzena ' + (Math.floor((h.getTime() - jan.getTime()) / 864e5 / 15) + 1)
}

export type Linha = Record<string, unknown>
export type Base = Record<string, Linha[]>

/**
 * Empresa de exemplo com quatro pessoas, para dar para testar o filtro por pessoa,
 * as pendências de cada um e as aprovações de quem não é você.
 */
export function semente(): Base {
  const criado = new Date().toISOString()
  const p = (
    id: string, nome: string, cor: string,
    papel = 'colaborador', area: string | null = null, gestor: string | null = null,
  ) => ({
    id, nome, email: `${id}@silvereng.com.br`, cor, papel,
    area_id: area, gestor_id: gestor, ve_area: papel !== 'colaborador',
    ativo: true, criado_em: criado,
  })

  // Leo no topo; Ana responde a ele e cuida do Financeiro; Carlos da Engenharia,
  // com a Marina abaixo. É essa árvore que decide quem enxerga o trabalho de quem.
  const perfis = [
    p('leo', 'Leo', '#6E7B8B', 'admin', null, null),
    p('ana', 'Ana', '#5F7A6A', 'gestor', 'fin', 'leo'),
    p('carlos', 'Carlos', '#C2703C', 'gestor', 'eng', 'leo'),
    p('marina', 'Marina', '#A5645C', 'colaborador', 'eng', 'carlos'),
  ]

  const config = [{
    id: '1', organizacao: 'Grupo Silvereng', multi: true,
    rotulo: 'Empresa', rotulo_plural: 'Empresas',
  }]

  const empresas = [
    { id: 'slv', nome: 'Silvereng', sigla: 'SLV', cor: '#6E7B8B', ordem: 0 },
    { id: 'smn', nome: 'Simoneto', sigla: 'SMN', cor: '#5F7A6A', ordem: 1 },
    { id: 'avl', nome: 'AVLE', sigla: 'AVL', cor: '#C2703C', ordem: 2 },
  ]

  const areas = [
    { id: 'fin', nome: 'Financeiro', cor: '#5F7A6A', ordem: 0, responsavel_id: 'ana', criado_em: criado },
    { id: 'eng', nome: 'Engenharia', cor: '#C2703C', ordem: 1, responsavel_id: 'carlos', criado_em: criado },
    { id: 'inc', nome: 'Incorporação', cor: '#6E7B8B', ordem: 2, responsavel_id: 'leo', criado_em: criado },
    { id: 'cml', nome: 'Comercial', cor: '#A5645C', ordem: 3, responsavel_id: 'marina', criado_em: criado },
  ]

  const fluxos: Linha[] = []
  const etapas: Linha[] = []
  const itens: Linha[] = []
  const historico: Linha[] = []
  const atividades: Linha[] = []

  let seq = 0
  const chaves: Record<string, string> = {}
  type DefItem = [
    texto: string, resp: string, prazo: string | null, feito: boolean,
    priv?: boolean, chave?: string,
  ]
  type DefEtapa = [nome: string, criterio: string, aprovador: string, prazo: string | null, itens?: DefItem[]]

  const fluxo = (
    id: string, tipo: string, nome: string, area: string, dono: string,
    atual: number, defs: DefEtapa[],
    extra: Partial<Linha> = {},
  ) => {
    fluxos.push({
      id, tipo, nome, area_id: area, empresa_id: (extra.empresa_id as string) || 'slv',
      dono_id: dono, autor_id: dono,
      visib: 'equipe', freq: null, periodo: null, atual, concluido: false,
      travado_motivo: null, travado_desde: null, criado_em: criado, ...extra,
    })
    defs.forEach(([eNome, criterio, aprovador, prazo, lista], k) => {
      const eid = `${id}-e${k}`
      etapas.push({ id: eid, fluxo_id: id, ordem: k, nome: eNome, criterio, aprovador_id: aprovador, prazo })
      ;(lista || []).forEach(([texto, resp, iPrazo, feito, priv, chave], j) => {
        const iid = `i${seq++}`
        if (chave) chaves[chave] = iid
        itens.push({
          id: iid, etapa_id: eid, fluxo_id: id, texto, resp_id: resp, prazo: iPrazo,
          feito, priv: !!priv, autor_id: priv ? 'leo' : dono, ordem: j, criado_em: criado,
        })
      })
    })
  }

  // ------------------------------------------------------------- Financeiro
  fluxo('f-fech', 'ciclo', 'Fechamento mensal', 'fin', 'ana', 1, [
    ['Lançamentos', 'Despesas e receitas do mês lançadas', 'ana', d(-3), [
      ['Lançar notas das obras', 'ana', d(-4), true],
      ['Lançar folha', 'ana', d(-3), true],
    ]],
    ['Conciliação', 'Saldo do sistema igual ao extrato', 'ana', d(1), [
      ['Conferir extrato da conta das obras', 'ana', d(0), false],
      ['Conciliar cartão corporativo', 'carlos', d(1), false],
    ]],
    ['Relatórios', 'DRE e fluxo de caixa emitidos', 'leo', d(6), []],
    ['Fechamento', 'Competência travada', 'leo', d(9), []],
  ], { freq: 'mensal', periodo: mes() })
  historico.push(
    { id: 'h1', fluxo_id: 'f-fech', periodo: mes(-3), situacao: 'ok', criado_em: criado },
    { id: 'h2', fluxo_id: 'f-fech', periodo: mes(-2), situacao: 'late', criado_em: criado },
    { id: 'h3', fluxo_id: 'f-fech', periodo: mes(-1), situacao: 'ok', criado_em: criado },
  )

  fluxo('f-pagar', 'ciclo', 'Contas a pagar', 'fin', 'ana', 0, [
    ['Recebimento', 'Boletos conferidos com pedidos', 'ana', d(-1), [
      ['Separar boletos da semana', 'ana', d(-1), false],
      ['Conferir com os pedidos de compra', 'carlos', d(-2), false],
    ]],
    ['Aprovação', 'Pagamentos aprovados', 'leo', d(1), [
      ['Aprovar pagamento dos blocos da Dona Kika', 'ana', d(1), false, false, 'paga-blocos'],
    ]],
    ['Pagamento', 'Pagamentos agendados e comprovados', 'ana', d(3), []],
  ], { freq: 'semanal', periodo: semana() })
  historico.push(
    { id: 'h4', fluxo_id: 'f-pagar', periodo: semana(-21), situacao: 'ok', criado_em: criado },
    { id: 'h5', fluxo_id: 'f-pagar', periodo: semana(-14), situacao: 'late', criado_em: criado },
    { id: 'h6', fluxo_id: 'f-pagar', periodo: semana(-7), situacao: 'ok', criado_em: criado },
  )

  fluxo('f-fech-smn', 'ciclo', 'Fechamento mensal', 'fin', 'carlos', 0, [
    ['Lançamentos', 'Despesas e receitas do mês lançadas', 'carlos', d(2), [
      ['Lançar notas do mês', 'carlos', d(2), false],
    ]],
    ['Conciliação', 'Saldo do sistema igual ao extrato', 'carlos', d(5), []],
    ['Relatórios', 'DRE e fluxo de caixa emitidos', 'leo', d(8), []],
    ['Fechamento', 'Competência travada', 'leo', d(10), []],
  ], { empresa_id: 'smn', freq: 'mensal', periodo: mes() })

  fluxo('f-sist', 'esteira', 'Implantação do sistema financeiro', 'fin', 'leo', 2, [
    ['Diagnóstico', 'Processos atuais mapeados', 'leo', d(-40), []],
    ['Escolha', 'Ferramenta contratada', 'leo', d(-20), []],
    ['Configuração', 'Sistema configurado e testado com dados reais', 'leo', d(16), [
      ['Plano de contas', 'ana', d(-8), true],
      ['Cadastro de fornecedores', 'ana', d(2), false, false, 'cad-forn'],
      ['Teste com o mês passado', 'carlos', d(12), false, false, 'teste-mes'],
    ]],
    ['Migração', 'Dados importados e conferidos', 'ana', d(30), []],
    ['Treinamento', 'Equipe operando sem apoio', 'leo', d(44), []],
    ['Go-live', 'Sistema antigo desligado', 'leo', d(58), []],
  ])

  // ------------------------------------------------------------- Engenharia
  fluxo('f-kika', 'esteira', 'Ed. Dona Kika, obra', 'eng', 'carlos', 2, [
    ['Fundação', 'Fundação executada e laudada', 'carlos', d(-180), []],
    ['Estrutura', 'Estrutura concluída e liberada', 'carlos', d(-60), []],
    ['Alvenaria', 'Vedações concluídas', 'carlos', d(21), [
      ['Alvenaria do 3º pavimento', 'carlos', d(5), false, false, 'alvenaria-3'],
      ['Contramarcos', 'carlos', d(14), false],
      ['Conferir medição do pedreiro', 'marina', d(3), false],
    ]],
    ['Instalações', 'Instalações testadas', 'carlos', d(80), []],
    ['Acabamento', 'Unidades prontas para vistoria', 'carlos', d(140), []],
    ['Entrega', 'Habite-se emitido e chaves entregues', 'leo', d(200), []],
  ])

  fluxo('f-medicao', 'ciclo', 'Medição de obra', 'eng', 'carlos', 0, [
    ['Campo', 'Serviços executados levantados', 'carlos', d(2), [
      ['Levantar serviços da quinzena', 'carlos', d(2), false],
    ]],
    ['Planilha', 'Medição consolidada', 'marina', d(5), []],
    ['Aprovação', 'Medição aprovada para pagamento', 'leo', d(7), []],
  ], { freq: 'quinzenal', periodo: quinzena() })

  // ----------------------------------------------------------- Incorporação
  fluxo('f-hosp', 'esteira', 'Hospital Popular', 'inc', 'leo', 3, [
    ['Terreno', 'Condições de aquisição definidas', 'leo', d(-150), []],
    ['Viabilidade', 'Estudo aprovado pelos sócios', 'leo', d(-100), []],
    ['Projetos', 'Projetos legais completos', 'marina', d(-40), []],
    ['Aprovações', 'Alvará emitido', 'leo', d(25), [
      ['Protocolo na prefeitura', 'marina', d(-5), true],
      ['Anuência do corpo de bombeiros', 'marina', d(10), false],
    ]],
    ['Lançamento', 'Vendas abertas', 'leo', d(90), []],
    ['Obra', 'Obra concluída', 'carlos', d(400), []],
    ['Entrega', 'Habite-se e chaves entregues', 'leo', d(500), []],
  ], { empresa_id: 'smn', travado_motivo: 'Aguardando retorno da Associação', travado_desde: d(-12) })

  fluxo('f-vilarita', 'esteira', 'Terreno Vila Rita', 'inc', 'leo', 1, [
    ['Terreno', 'Condições de aquisição definidas', 'leo', d(-10), []],
    ['Viabilidade', 'Estudo aprovado pelos sócios', 'leo', d(2), [
      ['Levantamento planialtimétrico', 'marina', d(-2), false],
      ['Estudo de massa', 'marina', d(2), false],
      ['Conversar com o proprietário sobre o preço', 'leo', d(1), false, true],
    ]],
    ['Projetos', 'Projetos legais completos', 'marina', d(60), []],
    ['Aprovações', 'Alvará emitido', 'leo', d(120), []],
  ], { empresa_id: 'smn' })

  fluxo('f-acacias', 'esteira', 'Permuta Rua das Acácias', 'inc', 'leo', 1, [
    ['Terreno', 'Condições de aquisição definidas', 'leo', d(-25), []],
    ['Viabilidade', 'Estudo aprovado pelos sócios', 'leo', d(4), [
      ['Levantar matrícula e certidões', 'marina', d(-6), true],
      ['Estudo de massa e VGV', 'marina', d(-1), true],
      ['Simular a permuta com o proprietário', 'ana', d(-1), true],
    ]],
    ['Projetos', 'Projetos legais completos', 'marina', d(70), []],
    ['Aprovações', 'Alvará emitido', 'leo', d(130), []],
  ], { empresa_id: 'smn' })

  // -------------------------------------------------------------- Comercial
  fluxo('f-avle', 'esteira', 'AVLE', 'cml', 'leo', 1, [
    ['Conceito', 'Proposta de valor definida', 'leo', d(-30), []],
    ['Modelo de negócio', 'Modelo validado financeira e juridicamente', 'leo', d(12), [
      ['Planilha de projeção', 'ana', d(4), false],
      ['Conversar com o contador sobre o enquadramento', 'leo', d(6), false, true],
    ]],
    ['Marca', 'Identidade aprovada', 'marina', d(45), []],
    ['Piloto', 'Primeiros clientes atendidos', 'marina', d(90), []],
    ['Lançamento', 'Operação aberta ao público', 'leo', d(120), []],
  ], { empresa_id: 'avl' })

  fluxo('f-vendas', 'ciclo', 'Relatório de vendas', 'cml', 'marina', 2, [
    ['Coleta', 'Números do CRM exportados', 'marina', d(1), [
      ['Exportar o funil da semana', 'marina', d(1), true],
    ]],
    ['Análise', 'Comparativo com a semana anterior pronto', 'marina', d(2), [
      ['Montar o comparativo', 'marina', d(2), true],
    ]],
    ['Envio', 'Relatório enviado aos sócios', 'marina', d(3), [
      ['Enviar para os sócios', 'marina', d(3), true],
    ]],
  ], { freq: 'semanal', periodo: semana() })
  historico.push(
    { id: 'h7', fluxo_id: 'f-vendas', periodo: semana(-28), situacao: 'ok', criado_em: criado },
    { id: 'h8', fluxo_id: 'f-vendas', periodo: semana(-21), situacao: 'ok', criado_em: criado },
    { id: 'h9', fluxo_id: 'f-vendas', periodo: semana(-14), situacao: 'late', criado_em: criado },
    { id: 'h10', fluxo_id: 'f-vendas', periodo: semana(-7), situacao: 'ok', criado_em: criado },
  )

  // Uma trava dentro da mesma esteira e outra atravessando áreas: a obra do Carlos
  // não anda enquanto a Ana não liberar o pagamento, que vive na esteira do Financeiro.
  const dependencias = [
    { id: 'dep1', item_id: chaves['teste-mes'], depende_de: chaves['cad-forn'] },
    { id: 'dep2', item_id: chaves['alvenaria-3'], depende_de: chaves['paga-blocos'] },
  ].filter((x) => x.item_id && x.depende_de)

  // ------------------------------------------------------- processos
  // O trilho que a empresa desenha uma vez. As tarefas apontam para a ÁREA que
  // responde por elas, então a esteira nasce distribuída. Repare na Incorporação:
  // o checkpoint de Viabilidade tem uma tarefa que cai no Financeiro, e o de
  // Lançamento cai no Comercial. É o handoff entre áreas saindo do papel.
  const processos: Linha[] = []
  const processo_etapas: Linha[] = []
  const processo_itens: Linha[] = []
  let pseq = 0

  type PItem = [texto: string, area: string | null, dias: number]
  type PEtapa = [nome: string, criterio: string, aprova: string | null, dias: number, itens?: PItem[]]

  const processo = (
    id: string, nome: string, tipo: string, area: string | null, descricao: string, defs: PEtapa[],
  ) => {
    processos.push({ id, nome, tipo, area_id: area, descricao, ordem: processos.length, criado_em: criado })
    defs.forEach(([eNome, criterio, aprova, dias, itens], k) => {
      const eid = `${id}-pe${k}`
      processo_etapas.push({
        id: eid, processo_id: id, ordem: k, nome: eNome, criterio,
        aprovador_area_id: aprova, dias,
      })
      ;(itens || []).forEach(([texto, iArea, iDias], j) => {
        processo_itens.push({
          id: `pi${pseq++}`, etapa_id: eid, processo_id: id, ordem: j,
          texto, area_id: iArea, dias: iDias,
        })
      })
    })
  }

  processo('p-incorp', 'Incorporação', 'esteira', 'inc',
    'Do terreno à entrega das chaves. Passa pelo Financeiro na viabilidade e pelo Comercial no lançamento.', [
    ['Terreno', 'Condições de aquisição definidas', 'inc', 15, [
      ['Levantar matrícula e certidões', 'inc', 7],
      ['Negociar condições com o proprietário', 'inc', 12],
    ]],
    ['Viabilidade', 'Estudo aprovado pelos sócios', 'inc', 45, [
      ['Estudo de massa e VGV', 'inc', 25],
      ['Validar números com o Financeiro', 'fin', 35],
    ]],
    ['Projetos', 'Projetos legais completos', 'eng', 120, [
      ['Contratar arquitetura', 'eng', 60],
      ['Compatibilizar projetos', 'eng', 110],
    ]],
    ['Aprovações', 'Alvará emitido', 'inc', 200, [
      ['Protocolo na prefeitura', 'inc', 150],
      ['Anuência do corpo de bombeiros', 'inc', 190],
    ]],
    ['Lançamento', 'Vendas abertas', 'cml', 240, [
      ['Tabela de vendas', 'cml', 220],
      ['Material de divulgação', 'cml', 230],
    ]],
    ['Obra', 'Obra concluída', 'eng', 600, []],
    ['Entrega', 'Habite-se e chaves entregues', 'inc', 660, [
      ['Vistoria das unidades', 'eng', 640],
      ['Entrega das chaves', 'inc', 655],
    ]],
  ])

  processo('p-obra', 'Obra', 'esteira', 'eng',
    'Da fundação à entrega. O habite-se volta para a Incorporação no fim.', [
    ['Fundação', 'Fundação executada e laudada', 'eng', 60, [
      ['Sondagem e projeto de fundação', 'eng', 20],
      ['Execução e laudo', 'eng', 55],
    ]],
    ['Estrutura', 'Estrutura concluída e liberada', 'eng', 180, [
      ['Concretagem dos pavimentos', 'eng', 170],
    ]],
    ['Alvenaria', 'Vedações concluídas', 'eng', 240, [
      ['Alvenaria dos pavimentos', 'eng', 230],
      ['Contramarcos', 'eng', 238],
    ]],
    ['Instalações', 'Instalações testadas', 'eng', 300, [
      ['Hidráulica e elétrica', 'eng', 290],
      ['Testes de pressão', 'eng', 298],
    ]],
    ['Acabamento', 'Unidades prontas para vistoria', 'eng', 380, []],
    ['Entrega', 'Habite-se emitido e chaves entregues', 'inc', 420, [
      ['Solicitar habite-se', 'inc', 405],
    ]],
  ])

  processo('p-implant', 'Implantação de sistema', 'esteira', null,
    'Trocar um sistema sem parar a operação.', [
    ['Diagnóstico', 'Processos atuais mapeados', null, 14, [
      ['Mapear o processo atual', null, 10],
    ]],
    ['Escolha', 'Ferramenta contratada', null, 28, [
      ['Comparar opções', null, 22],
    ]],
    ['Configuração', 'Configurado e testado com dados reais', null, 56, [
      ['Plano de contas', 'fin', 40],
      ['Cadastros básicos', 'fin', 50],
    ]],
    ['Migração', 'Dados importados e conferidos', null, 70, [
      ['Importar e conferir', 'fin', 66],
    ]],
    ['Treinamento', 'Equipe operando sem apoio', null, 84, []],
    ['Go-live', 'Sistema antigo desligado', null, 98, []],
  ])

  processo('p-negocio', 'Novo negócio', 'esteira', null,
    'Tirar um negócio do conceito ao primeiro cliente.', [
    ['Conceito', 'Proposta de valor definida', null, 30, [
      ['Escrever a proposta de valor', null, 20],
    ]],
    ['Modelo de negócio', 'Modelo validado financeira e juridicamente', null, 60, [
      ['Projeção financeira', 'fin', 45],
      ['Enquadramento jurídico e tributário', 'fin', 55],
    ]],
    ['Marca', 'Identidade aprovada', 'cml', 90, [
      ['Identidade visual', 'cml', 85],
    ]],
    ['Piloto', 'Primeiros clientes atendidos', 'cml', 150, []],
    ['Lançamento', 'Operação aberta ao público', 'cml', 180, []],
  ])

  processo('p-fech', 'Fechamento mensal', 'ciclo', 'fin',
    'A volta que fecha a competência todo mês.', [
    ['Lançamentos', 'Despesas e receitas do mês lançadas', 'fin', 8, [
      ['Lançar despesas', 'fin', 5],
      ['Lançar receitas', 'fin', 6],
    ]],
    ['Conciliação', 'Saldo do sistema igual ao extrato', 'fin', 12, [
      ['Conferir extratos', 'fin', 11],
    ]],
    ['Relatórios', 'DRE e fluxo de caixa emitidos', 'fin', 18, [
      ['Emitir DRE', 'fin', 16],
    ]],
    ['Fechamento', 'Competência travada', 'fin', 20, []],
  ])

  processo('p-pagar', 'Contas a pagar', 'ciclo', 'fin',
    'A rotina semanal de pagamentos, com aprovação antes do desembolso.', [
    ['Recebimento', 'Boletos conferidos com pedidos', 'fin', 2, [
      ['Separar boletos da semana', 'fin', 1],
      ['Conferir com os pedidos de compra', 'fin', 2],
    ]],
    ['Aprovação', 'Pagamentos aprovados', 'fin', 4, [
      ['Aprovar a lista de pagamentos', 'fin', 3],
    ]],
    ['Pagamento', 'Pagamentos agendados e comprovados', 'fin', 6, [
      ['Agendar e guardar comprovantes', 'fin', 5],
    ]],
  ])

  processo('p-medicao', 'Medição de obra', 'ciclo', 'eng',
    'A medição da quinzena, que termina liberando o pagamento no Financeiro.', [
    ['Campo', 'Serviços executados levantados', 'eng', 3, [
      ['Levantar serviços executados', 'eng', 2],
    ]],
    ['Planilha', 'Medição consolidada', 'eng', 5, [
      ['Consolidar a planilha', 'eng', 4],
    ]],
    ['Aprovação', 'Medição aprovada para pagamento', 'eng', 7, [
      ['Conferir e liberar o pagamento', 'fin', 6],
    ]],
  ])

  const compromissos = [
    { id: 'c1', titulo: 'Reunião de obra na Dona Kika', quando: du(0), inicio: '09:00', fim: '10:30',
      local: 'Canteiro', nota: 'Levantar a alvenaria do 3º pavimento', dono_id: 'carlos',
      bloqueia: true, visivel: true, fluxo_id: 'f-kika', criado_em: criado },
    { id: 'c2', titulo: 'Médico', quando: du(0), inicio: '15:00', fim: '16:30',
      local: '', nota: '', dono_id: 'leo',
      bloqueia: true, visivel: false, fluxo_id: null, criado_em: criado },
    { id: 'c3', titulo: 'Fechamento com a contabilidade', quando: du(1), inicio: '14:00', fim: '15:00',
      local: 'Escritório', nota: '', dono_id: 'ana',
      bloqueia: true, visivel: true, fluxo_id: 'f-fech', criado_em: criado },
    { id: 'c4', titulo: 'Visita do cliente ao Hospital Popular', quando: du(2), inicio: '10:00', fim: '11:00',
      local: 'Terreno', nota: 'Confirmar com a Associação antes', dono_id: 'leo',
      bloqueia: true, visivel: true, fluxo_id: 'f-hosp', criado_em: criado },
    { id: 'c5', titulo: 'Feriado municipal', quando: du(5), inicio: null, fim: null,
      local: '', nota: '', dono_id: 'leo',
      bloqueia: false, visivel: true, fluxo_id: null, criado_em: criado },
    { id: 'c6', titulo: 'Conselho do Grupo', quando: du(3), inicio: '08:30', fim: '11:00',
      local: 'Sala de reunião', nota: 'Pauta: viabilidade da Vila Rita', dono_id: 'leo',
      bloqueia: true, visivel: true, fluxo_id: 'f-vilarita', criado_em: criado },
  ]

  // O Carlos usa a agenda do Google dele. Chegam só os intervalos, e a equipe
  // enxerga "Ocupado" sem saber do que se trata.
  const agendas_externas = [
    { perfil_id: 'carlos', url: 'https://exemplo.invalido/agenda-secreta.ics',
      nome: 'Agenda do Carlos', lido_em: criado },
  ]

  const ocupacao_externa = [
    { id: 'x1', perfil_id: 'carlos', quando: du(1), inicio: '08:00', fim: '09:30' },
    { id: 'x2', perfil_id: 'carlos', quando: du(1), inicio: '16:00', fim: '17:00' },
    { id: 'x3', perfil_id: 'carlos', quando: du(2), inicio: '07:30', fim: '08:30' },
  ]

  const convidados = [
    { id: 'v1', compromisso_id: 'c1', perfil_id: 'marina' },
    { id: 'v2', compromisso_id: 'c1', perfil_id: 'leo' },
    { id: 'v3', compromisso_id: 'c3', perfil_id: 'leo' },
    { id: 'v4', compromisso_id: 'c6', perfil_id: 'ana' },
    { id: 'v5', compromisso_id: 'c6', perfil_id: 'carlos' },
  ]

  atividades.push(
    { id: 'a1', fluxo_id: 'f-sist', quem_id: 'ana', texto: 'concluiu Plano de contas', criado_em: new Date(Date.now() - 864e5 * 8).toISOString() },
    { id: 'a2', fluxo_id: 'f-sist', quem_id: 'leo', texto: 'aprovou a saída de Escolha', criado_em: new Date(Date.now() - 864e5 * 20).toISOString() },
    { id: 'a3', fluxo_id: 'f-hosp', quem_id: 'leo', texto: 'travou: Aguardando retorno da Associação', criado_em: new Date(Date.now() - 864e5 * 12).toISOString() },
    { id: 'a4', fluxo_id: 'f-kika', quem_id: 'carlos', texto: 'aprovou a saída de Estrutura', criado_em: new Date(Date.now() - 864e5 * 60).toISOString() },
  )

  return { config, empresas, perfis, areas, fluxos, etapas, itens, dependencias,
    processos, processo_etapas, processo_itens,
    compromissos, convidados, agendas_externas, ocupacao_externa, fluxo_pessoas: [], convites: [],
    historico, atividades }
}
