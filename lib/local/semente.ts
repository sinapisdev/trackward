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

/**
 * Quando a tarefa de exemplo ficou pronta.
 *
 * Com prazo, sai um pouco antes ou um pouco depois dele, sorteado de um jeito
 * estável: a mesma tarefa dá sempre a mesma data, senão os números do Desempenho
 * dançariam a cada abertura da tela. Sem prazo, sai espalhada pelas últimas
 * semanas, para o gráfico não nascer em uma barra só.
 */
const saiuEm = (chave: string, prazo: string | null): string => {
  let n = 0
  for (let i = 0; i < chave.length; i++) n = (n * 31 + chave.charCodeAt(i)) >>> 0
  const x = hoje()
  if (prazo) {
    // Três em cada quatro saem no prazo. É bom, e não perfeito, que é o que se vê.
    const desvio = n % 4 === 0 ? 1 + (n % 3) : -(1 + (n % 4))
    const base = new Date(prazo + 'T12:00:00')
    base.setDate(base.getDate() + desvio)
    if (base > x) return new Date(x.getTime() - (n % 48) * 36e5).toISOString()
    return base.toISOString()
  }
  x.setDate(x.getDate() - (n % 40))
  x.setHours(9 + (n % 9), n % 60, 0, 0)
  return x.toISOString()
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
/**
 * Empresa de exemplo, de propósito **sem setor**.
 *
 * Financeiro, Comercial, Operações e Pessoas existem em qualquer negócio, de
 * escritório de advocacia a transportadora. Quem abre o Track pela primeira vez
 * precisa se reconhecer na tela em três segundos, e um exemplo cheio de jargão de
 * um ramo só diz, sem querer, "este produto não é para você".
 *
 * Quatro pessoas, para dar para testar o filtro por pessoa, as pendências de cada
 * um, as aprovações que não são suas e os itens privados.
 */
export function semente(): Base {
  const criado = new Date().toISOString()
  const p = (
    id: string, nome: string, cor: string,
    papel = 'colaborador', area: string | null = null, gestor: string | null = null,
  ) => ({
    id, user_id: id, nome, email: `${id}@meridiano.com.br`, cor, papel,
    area_id: area, gestor_id: gestor, ve_area: papel !== 'colaborador',
    ativo: true, criado_em: criado, org_id: 'org1',
  })

  // Leo no topo; Ana responde a ele e cuida do Financeiro; Carlos das Operações,
  // com a Marina abaixo. É essa árvore que decide quem enxerga o trabalho de quem.
  const perfis = [
    p('leo', 'Leo', '#8A8A8A', 'admin', null, null),
    p('ana', 'Ana', '#B0B0B0', 'gestor', 'fin', 'leo'),
    p('carlos', 'Carlos', '#C9884A', 'gestor', 'ope', 'leo'),
    p('marina', 'Marina', '#7A6A5E', 'colaborador', 'cml', 'carlos'),
  ]

  const organizacoes = [{
    id: 'org1', nome: 'Grupo Meridiano', tipo: 'equipe',
    dominio: 'meridiano.com.br', entrada_por_dominio: false, dono_id: 'leo',
    multi: true, rotulo: 'Empresa', rotulo_plural: 'Empresas',
    ia_ativa: true, ia_modo: 'sugerir', criado_em: criado,
    plano: 'padrao', limite_leituras: null, modelo_ia: null,
  }]

  const empresas = [
    { id: 'mer', nome: 'Meridiano', sigla: 'MER', cor: '#8A8A8A', ordem: 0 },
    { id: 'nor', nome: 'Meridiano Norte', sigla: 'NOR', cor: '#B0B0B0', ordem: 1 },
    { id: 'dig', nome: 'Meridiano Digital', sigla: 'DIG', cor: '#C9884A', ordem: 2 },
  ]

  const areas = [
    { id: 'fin', nome: 'Financeiro', cor: '#B0B0B0', ordem: 0, responsavel_id: 'ana', criado_em: criado },
    { id: 'ope', nome: 'Operações', cor: '#C9884A', ordem: 1, responsavel_id: 'carlos', criado_em: criado },
    { id: 'cml', nome: 'Comercial', cor: '#7A6A5E', ordem: 2, responsavel_id: 'marina', criado_em: criado },
    { id: 'pes', nome: 'Pessoas', cor: '#8A8A8A', ordem: 3, responsavel_id: 'leo', criado_em: criado },
  ]

  const fluxos: Linha[] = []
  const etapas: Linha[] = []
  const itens: Linha[] = []
  const historico: Linha[] = []
  const decisoes: Linha[] = []
  const anexos: Linha[] = []
  let decidiu = 0
  const atividades: Linha[] = []

  let seq = 0
  const chaves: Record<string, string> = {}
  type DefItem = [
    // resp nulo é tarefa sem dono, que é o caso que a distribuição resolve.
    texto: string, resp: string | null, prazo: string | null, feito: boolean,
    priv?: boolean, chave?: string,
  ]
  type DefEtapa = [nome: string, criterio: string, aprovador: string, prazo: string | null, itens?: DefItem[]]

  const fluxo = (
    id: string, tipo: string, nome: string, area: string, dono: string,
    atual: number, defs: DefEtapa[],
    extra: Partial<Linha> = {},
  ) => {
    fluxos.push({
      id, tipo, nome, area_id: area, empresa_id: (extra.empresa_id as string) || 'mer',
      dono_id: dono, autor_id: dono,
      visib: 'equipe', freq: null, periodo: null, atual, concluido: false,
      travado_motivo: null, travado_desde: null, criado_em: criado, ...extra,
    })
    defs.forEach(([eNome, criterio, aprovador, prazo, lista], k) => {
      const eid = `${id}-e${k}`
      etapas.push({ id: eid, fluxo_id: id, ordem: k, nome: eNome, criterio, aprovador_id: aprovador, prazo })

      // Checkpoint já passado deixou uma decisão para trás. Um em cada cinco
      // voltou antes de passar, que é mais ou menos o que se vê numa empresa
      // que funciona: quase tudo passa, e de vez em quando alguém segura.
      if (k < atual && prazo) {
        const quando = (n: number) => new Date(prazo + 'T15:00:00Z').getTime() - n * 864e5
        if (decidiu % 5 === 4) {
          decisoes.push({
            id: `dec${decidiu}v`, fluxo_id: id, etapa_id: eid, quem_id: aprovador,
            tipo: 'devolveu', nota: 'Faltava anexar o comprovante da última etapa',
            criado_em: new Date(quando(3)).toISOString(),
          })
        }
        decisoes.push({
          id: `dec${decidiu}`, fluxo_id: id, etapa_id: eid, quem_id: aprovador,
          tipo: decidiu % 7 === 3 ? 'ressalva' : 'aprovou',
          nota: decidiu % 7 === 3 ? 'Segue, mas a via assinada ainda precisa chegar' : '',
          criado_em: new Date(quando(0)).toISOString(),
        })
        decidiu++
      }
      ;(lista || []).forEach(([texto, resp, iPrazo, feito, priv, chave], j) => {
        const iid = `i${seq++}`
        if (chave) chaves[chave] = iid
        const saiu = feito ? saiuEm(iid + texto, iPrazo) : null
        itens.push({
          id: iid, etapa_id: eid, fluxo_id: id, texto, resp_id: resp, prazo: iPrazo,
          feito, feito_em: saiu, prazo_firme: chave === 'encarregado',
          priv: !!priv, autor_id: priv ? 'leo' : dono, ordem: j, criado_em: criado,
        })
        if (saiu && seq % 3 !== 0) {
          const arquivo = `${texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-').slice(0, 40)}.svg`
          anexos.push({
            id: `anx${iid}`, item_id: iid, fluxo_id: id, nome: arquivo,
            tipo: 'image/svg+xml', tamanho: 640 + (seq % 9) * 137,
            caminho: `org1/${id}/${iid}/${arquivo}`,
            autor_id: resp, criado_em: saiu,
          })
        }
      })
    })
  }

  // ------------------------------------------------------------- Financeiro
  fluxo('f-fech', 'ciclo', 'Fechamento mensal', 'fin', 'ana', 1, [
    ['Lançamentos', 'Receitas e despesas do mês lançadas', 'ana', d(-3), [
      ['Lançar notas de serviço', 'ana', d(-4), true],
      ['Lançar folha', 'ana', d(-3), true],
    ]],
    ['Conciliação', 'Saldo do sistema igual ao extrato', 'ana', d(1), [
      ['Conferir extrato da conta principal', 'ana', d(0), false],
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
    ['Recebimento', 'Boletos conferidos com os pedidos', 'ana', d(-1), [
      ['Separar boletos da semana', 'ana', d(-1), false],
      ['Conferir com os pedidos de compra', 'carlos', d(-2), false],
    ]],
    ['Aprovação', 'Pagamentos aprovados', 'leo', d(1), [
      ['Aprovar pagamento do fornecedor de TI', 'ana', d(1), false, false, 'paga-ti'],
    ]],
    ['Pagamento', 'Pagamentos agendados e comprovados', 'ana', d(3), []],
  ], { freq: 'semanal', periodo: semana() })
  historico.push(
    { id: 'h4', fluxo_id: 'f-pagar', periodo: semana(-21), situacao: 'ok', criado_em: criado },
    { id: 'h5', fluxo_id: 'f-pagar', periodo: semana(-14), situacao: 'late', criado_em: criado },
    { id: 'h6', fluxo_id: 'f-pagar', periodo: semana(-7), situacao: 'ok', criado_em: criado },
  )

  fluxo('f-fech-nor', 'ciclo', 'Fechamento mensal', 'fin', 'carlos', 0, [
    ['Lançamentos', 'Receitas e despesas do mês lançadas', 'carlos', d(2), [
      ['Lançar notas do mês', 'carlos', d(2), false],
    ]],
    ['Conciliação', 'Saldo do sistema igual ao extrato', 'carlos', d(5), []],
    ['Relatórios', 'DRE e fluxo de caixa emitidos', 'leo', d(8), []],
    ['Fechamento', 'Competência travada', 'leo', d(10), []],
  ], { empresa_id: 'nor', freq: 'mensal', periodo: mes() })

  fluxo('f-erp', 'esteira', 'Implantação do ERP', 'fin', 'ana', 2, [
    ['Diagnóstico', 'Processos atuais mapeados', 'leo', d(-40), [
      ['Mapear o fluxo de contas a pagar', 'ana', d(-46), true],
      ['Levantar o volume de notas por mês', 'marina', d(-43), true],
      ['Listar o que o sistema atual não resolve', 'ana', d(-41), true],
    ]],
    ['Escolha', 'Ferramenta contratada', 'leo', d(-20), [
      ['Receber proposta dos três fornecedores', 'ana', d(-28), true],
      ['Montar o comparativo de custo e prazo', 'marina', d(-24), true],
      ['Assinar o contrato', 'leo', d(-20), true],
    ]],
    ['Migração', 'Dados migrados e conferidos', 'ana', d(4), [
      ['Migrar o plano de contas', 'ana', d(-2), false, false, 'plano-contas'],
      ['Homologar a integração bancária', 'carlos', d(3), false, false, 'integra-banco'],
      ['Treinar o time financeiro', 'marina', d(4), false],
      ['Conciliar os extratos do mês de virada', null, d(4), false],
    ]],
    ['Virada', 'Sistema antigo desligado', 'leo', d(20), []],
  ])

  fluxo('f-forn', 'esteira', 'Renegociação com fornecedores', 'fin', 'ana', 1, [
    ['Levantamento', 'Contratos e valores na mão', 'ana', d(-6), [
      ['Reunir os contratos vigentes', 'ana', d(-9), true],
      ['Somar o gasto dos últimos doze meses', 'marina', d(-6), true],
    ]],
    ['Negociação', 'Propostas recebidas e comparadas', 'ana', d(2), [
      ['Pedir proposta aos três maiores', 'ana', d(-1), true],
      ['Montar o comparativo', 'marina', d(2), false],
      ['Conversar com o fornecedor de TI sobre o reajuste', 'leo', d(1), false, true],
    ]],
    ['Assinatura', 'Novos contratos assinados', 'leo', d(25), []],
  ])

  // -------------------------------------------------------------- Operações
  fluxo('f-indic', 'ciclo', 'Indicadores da operação', 'ope', 'carlos', 1, [
    ['Coleta', 'Números do período reunidos', 'carlos', d(-2), [
      ['Puxar os números dos sistemas', 'marina', d(-2), true],
    ]],
    ['Análise', 'Comparativo com o período anterior pronto', 'carlos', d(1), [
      ['Comparar com a quinzena anterior', 'marina', d(1), false],
      ['Escrever as três conclusões', 'carlos', d(1), false],
    ]],
    ['Divulgação', 'Painel enviado à liderança', 'leo', d(2), []],
  ], { freq: 'quinzenal', periodo: quinzena() })

  fluxo('f-norte', 'esteira', 'Abertura da unidade Norte', 'ope', 'carlos', 1, [
    ['Viabilidade', 'Ponto e custos aprovados', 'leo', d(-30), [
      ['Visitar os três pontos finalistas', 'carlos', d(-38), true],
      ['Montar a projeção de custo do primeiro ano', 'ana', d(-33), true],
      ['Apresentar à diretoria', 'carlos', d(-30), true],
    ]],
    ['Preparação', 'Espaço pronto para operar', 'carlos', d(-2), [
      ['Fechar contrato do imóvel', 'carlos', d(-10), true],
      ['Contratar internet e telefonia', 'marina', d(-3), false],
      ['Instalar o ponto eletrônico', 'carlos', d(-2), false],
    ]],
    ['Equipe', 'Time contratado e treinado', 'leo', d(20), []],
    ['Abertura', 'Unidade operando', 'leo', d(35), []],
  ], {
    empresa_id: 'nor',
    travado_motivo: 'Aguardando a liberação do alvará de funcionamento',
    travado_desde: d(-12),
  })

  fluxo('f-lgpd', 'esteira', 'Adequação à LGPD', 'ope', 'carlos', 1, [
    ['Mapeamento', 'Dados pessoais mapeados', 'carlos', d(-15), [
      ['Listar onde cada base de dados vive', 'carlos', d(-21), true],
      ['Identificar o que é dado pessoal sensível', 'ana', d(-17), true],
      ['Registrar quem tem acesso a cada base', 'marina', d(-15), true],
    ]],
    ['Ajustes', 'Sistemas e contratos ajustados', 'carlos', d(5), [
      ['Revisar os contratos com fornecedores', 'ana', d(3), false, false, 'revisa-contratos'],
      ['Definir prazo de guarda de cada base', 'carlos', d(5), false],
      ['Nomear o encarregado', 'leo', d(2), false, false, 'encarregado'],
    ]],
    ['Treinamento', 'Time treinado', 'leo', d(30), []],
  ])

  // -------------------------------------------------------------- Comercial
  fluxo('f-vendas', 'ciclo', 'Relatório de vendas', 'cml', 'marina', 1, [
    ['Coleta', 'Números da semana reunidos', 'marina', d(-1), [
      ['Puxar o fechamento do CRM', 'marina', d(-1), true],
    ]],
    ['Análise', 'Comparativo com a semana anterior pronto', 'marina', d(0), [
      ['Comparar com a semana anterior', 'marina', d(0), false],
    ]],
    ['Envio', 'Relatório enviado à liderança', 'leo', d(1), []],
  ], { freq: 'semanal', periodo: semana() })
  historico.push(
    { id: 'h7', fluxo_id: 'f-vendas', periodo: semana(-28), situacao: 'ok', criado_em: criado },
    { id: 'h8', fluxo_id: 'f-vendas', periodo: semana(-21), situacao: 'ok', criado_em: criado },
    { id: 'h9', fluxo_id: 'f-vendas', periodo: semana(-14), situacao: 'late', criado_em: criado },
    { id: 'h10', fluxo_id: 'f-vendas', periodo: semana(-7), situacao: 'ok', criado_em: criado },
  )

  fluxo('f-site', 'esteira', 'Novo site e catálogo', 'cml', 'marina', 1, [
    ['Conteúdo', 'Textos e fotos prontos', 'marina', d(-4), [
      ['Escrever os textos das páginas principais', 'marina', d(-11), true],
      ['Fotografar os produtos do catálogo', 'marina', d(-6), true],
      ['Revisar com o comercial', 'leo', d(-4), true],
    ]],
    ['Construção', 'Site navegável em ambiente de teste', 'marina', d(3), [
      ['Revisar os textos de cada página', 'marina', d(1), false],
      ['Subir o catálogo completo', 'marina', d(3), false, false, 'sobe-catalogo'],
      ['Testar o formulário de contato', 'carlos', d(3), false],
      ['Revisar o texto da página de contato', null, d(4), false],
    ]],
    ['Publicação', 'Site no ar com domínio próprio', 'leo', d(12), []],
  ], { empresa_id: 'dig' })

  // ----------------------------------------------------------------- Pessoas
  fluxo('f-gerente', 'esteira', 'Contratação do gerente comercial', 'pes', 'leo', 1, [
    ['Descrição da vaga', 'Perfil e faixa salarial definidos', 'leo', d(-18), [
      ['Definir as responsabilidades do cargo', 'leo', d(-25), true],
      ['Pesquisar a faixa salarial do mercado', 'marina', d(-20), true],
    ]],
    ['Triagem', 'Finalistas escolhidos', 'leo', d(1), [
      ['Publicar a vaga nos canais', 'marina', d(-8), true],
      ['Entrevistar os cinco primeiros', 'leo', d(0), false],
      ['Conversar com o candidato interno sobre a expectativa', 'leo', d(1), false, true],
    ]],
    ['Proposta', 'Proposta aceita', 'leo', d(14), []],
    ['Integração', 'Pessoa integrada ao time', 'ana', d(40), []],
  ])

  // Travas dentro da mesma esteira e travas atravessando áreas. As de fora
  // existem para o exemplo mostrar o que acontece quando um prazo anda: o
  // catálogo do site espera o pagamento do fornecedor de TI, que vive no
  // Financeiro; a revisão de contratos da LGPD espera o mesmo pagamento; e o
  // encarregado da LGPD vem depois da revisão, mas a data dele é firme, porque
  // quem marcou foi a lei. É o caso em que a cascata bate na parede.
  const dependencias = [
    { id: 'dep1', item_id: chaves['integra-banco'], depende_de: chaves['plano-contas'] },
    { id: 'dep2', item_id: chaves['sobe-catalogo'], depende_de: chaves['paga-ti'] },
    { id: 'dep3', item_id: chaves['revisa-contratos'], depende_de: chaves['paga-ti'] },
    { id: 'dep4', item_id: chaves['encarregado'], depende_de: chaves['revisa-contratos'] },
  ].filter((x) => x.item_id && x.depende_de)

  // ------------------------------------------------------- processos
  // O trilho que a empresa desenha uma vez. As tarefas apontam para a ÁREA que
  // responde por elas, então a esteira nasce distribuída. Repare na Contratação:
  // a triagem é de Pessoas, a proposta passa pelo Financeiro e a integração volta
  // para a área de destino. É o handoff entre áreas saindo do papel.
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

  processo('p-contrat', 'Contratação', 'esteira', 'pes',
    'Da abertura da vaga à integração. Passa pelo Financeiro na proposta.', [
    ['Vaga', 'Perfil e faixa salarial definidos', 'pes', 3, [
      ['Escrever a descrição da vaga', 'pes', 2],
      ['Validar a faixa salarial', 'fin', 3],
    ]],
    ['Divulgação', 'Vaga publicada', 'pes', 6, [
      ['Publicar nos canais', 'pes', 5],
    ]],
    ['Triagem', 'Finalistas escolhidos', 'pes', 20, [
      ['Triar currículos', 'pes', 12],
      ['Entrevistar finalistas', 'pes', 19],
    ]],
    ['Proposta', 'Proposta aceita', 'pes', 27, [
      ['Montar a proposta', 'fin', 24],
      ['Apresentar ao candidato', 'pes', 26],
    ]],
    ['Integração', 'Pessoa integrada ao time', 'pes', 45, [
      ['Preparar acessos e equipamento', 'ope', 30],
      ['Plano dos primeiros 30 dias', 'pes', 35],
    ]],
  ])

  processo('p-fech', 'Fechamento mensal', 'ciclo', 'fin',
    'O mês que se repete. Serve para qualquer empresa do grupo.', [
    ['Lançamentos', 'Receitas e despesas do mês lançadas', 'fin', 3, [
      ['Lançar notas de serviço', 'fin', 2],
      ['Lançar folha', 'fin', 3],
    ]],
    ['Conciliação', 'Saldo do sistema igual ao extrato', 'fin', 6, [
      ['Conferir extratos', 'fin', 5],
      ['Conciliar cartões', 'fin', 6],
    ]],
    ['Relatórios', 'DRE e fluxo de caixa emitidos', 'fin', 9, [
      ['Emitir DRE', 'fin', 8],
    ]],
    ['Fechamento', 'Competência travada', 'fin', 11, []],
  ])

  processo('p-unidade', 'Abertura de unidade', 'esteira', 'ope',
    'De ponto novo a unidade operando. Passa por Financeiro, Pessoas e Comercial.', [
    ['Viabilidade', 'Ponto e custos aprovados', 'ope', 20, [
      ['Levantar custos de instalação', 'fin', 12],
      ['Visitar e comparar os pontos', 'ope', 18],
    ]],
    ['Contrato', 'Imóvel contratado', 'fin', 35, [
      ['Revisar o contrato de locação', 'fin', 30],
    ]],
    ['Preparação', 'Espaço pronto para operar', 'ope', 70, [
      ['Contratar internet e telefonia', 'ope', 55],
      ['Instalar sistemas e equipamentos', 'ope', 65],
    ]],
    ['Equipe', 'Time contratado e treinado', 'pes', 90, [
      ['Contratar o time', 'pes', 80],
      ['Treinar no processo da casa', 'ope', 88],
    ]],
    ['Abertura', 'Unidade operando', 'ope', 100, [
      ['Divulgar a abertura', 'cml', 95],
    ]],
  ])

  processo('p-lanc', 'Lançamento de produto', 'esteira', 'cml',
    'Da ideia validada ao produto na rua.', [
    ['Definição', 'Escopo e preço definidos', 'cml', 10, [
      ['Pesquisar o que o mercado cobra', 'cml', 6],
      ['Fechar a estrutura de preço', 'fin', 9],
    ]],
    ['Preparação', 'Material e operação prontos', 'cml', 30, [
      ['Produzir o material de divulgação', 'cml', 22],
      ['Preparar a operação para atender', 'ope', 28],
    ]],
    ['Lançamento', 'Produto disponível', 'cml', 40, [
      ['Treinar o time de vendas', 'cml', 36],
    ]],
    ['Acompanhamento', 'Primeiro mês avaliado', 'cml', 70, []],
  ])

  processo('p-forn', 'Homologação de fornecedor', 'esteira', 'fin',
    'Entrada de fornecedor novo, com o crivo do Financeiro e das Operações.', [
    ['Cadastro', 'Documentação recebida', 'fin', 3, [
      ['Pedir documentos e certidões', 'fin', 2],
    ]],
    ['Análise', 'Fornecedor aprovado', 'fin', 10, [
      ['Conferir certidões e idoneidade', 'fin', 6],
      ['Avaliar capacidade de atender', 'ope', 9],
    ]],
    ['Contrato', 'Contrato assinado', 'fin', 18, [
      ['Negociar prazo e condições', 'fin', 14],
    ]],
  ])

  processo('p-cliente', 'Entrada de cliente novo', 'esteira', 'cml',
    'Do contrato assinado ao cliente rodando sozinho.', [
    ['Contrato', 'Contrato assinado', 'cml', 2, [
      ['Enviar proposta e contrato', 'cml', 1],
    ]],
    ['Cadastro', 'Cliente cadastrado nos sistemas', 'fin', 5, [
      ['Cadastrar no financeiro', 'fin', 4],
      ['Abrir os acessos', 'ope', 5],
    ]],
    ['Implantação', 'Cliente operando', 'ope', 25, [
      ['Reunião de início', 'cml', 8],
      ['Treinar o time do cliente', 'ope', 20],
    ]],
    ['Acompanhamento', 'Primeiros 60 dias avaliados', 'cml', 60, []],
  ])

  processo('p-projeto', 'Projeto interno', 'esteira', null,
    'Trilho genérico, para quando o projeto não se encaixa em nenhum outro.', [
    ['Definição', 'Objetivo e entrega combinados', null, 5, [
      ['Escrever o que precisa estar pronto no fim', null, 3],
    ]],
    ['Planejamento', 'Tarefas e prazos distribuídos', null, 12, [
      ['Quebrar em tarefas', null, 8],
      ['Definir responsáveis e prazos', null, 11],
    ]],
    ['Execução', 'Entrega feita', null, 45, []],
    ['Encerramento', 'Aprendizados registrados', null, 55, [
      ['Escrever o que funcionou e o que não', null, 52],
    ]],
  ])

  // --------------------------------------------------------------- agenda
  const compromissos = [
    { id: 'c1', titulo: 'Reunião de liderança', quando: du(1), inicio: '09:00', fim: '10:30',
      local: 'Sala 2', nota: 'Pauta: fechamento e unidade Norte', dono_id: 'carlos',
      bloqueia: true, visivel: true, fluxo_id: 'f-indic', criado_em: criado },
    { id: 'c2', titulo: 'Consulta', quando: du(1), inicio: '14:00', fim: '15:00',
      local: '', nota: '', dono_id: 'ana',
      bloqueia: true, visivel: false, fluxo_id: null, criado_em: criado },
    { id: 'c3', titulo: 'Treinamento do ERP', quando: du(2), inicio: '10:00', fim: '12:00',
      local: 'Sala 1', nota: '', dono_id: 'marina',
      bloqueia: true, visivel: true, fluxo_id: 'f-erp', criado_em: criado },
    { id: 'c4', titulo: 'Fechamento do mês', quando: du(4), inicio: null, fim: null,
      local: '', nota: 'Dia inteiro dedicado', dono_id: 'ana',
      bloqueia: false, visivel: true, fluxo_id: 'f-fech', criado_em: criado },
    { id: 'c5', titulo: 'Almoço com o candidato', quando: du(2), inicio: '12:30', fim: '14:00',
      local: '', nota: '', dono_id: 'leo',
      bloqueia: false, visivel: true, fluxo_id: null, criado_em: criado },
    { id: 'c6', titulo: 'Conselho do grupo', quando: du(3), inicio: '08:30', fim: '11:00',
      local: 'Sala de reunião', nota: 'Pauta: abertura da unidade Norte', dono_id: 'leo',
      bloqueia: true, visivel: true, fluxo_id: 'f-norte', criado_em: criado },
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
    { id: 'v3', compromisso_id: 'c3', perfil_id: 'ana' },
    { id: 'v4', compromisso_id: 'c6', perfil_id: 'ana' },
    { id: 'v5', compromisso_id: 'c6', perfil_id: 'carlos' },
  ]

  // ------------------------------------------------------------------ conversa
  // Minutos atrás, para a conversa parecer viva ao abrir.
  const min = (n: number) => new Date(Date.now() - n * 60000).toISOString()

  const canais: Linha[] = [
    { id: 'k-geral', nome: 'geral', descricao: 'Tudo que é de todo mundo', tipo: 'aberto',
      area_id: null, fluxo_id: null, empresa_id: null, criado_por: 'leo', criado_em: criado, arquivado: false },
    { id: 'k-fin', nome: 'financeiro', descricao: 'Rotinas e fechamento', tipo: 'aberto',
      area_id: 'fin', fluxo_id: null, empresa_id: null, criado_por: 'ana', criado_em: criado, arquivado: false },
    { id: 'k-ope', nome: 'operacoes', descricao: 'O dia a dia da operação', tipo: 'aberto',
      area_id: 'ope', fluxo_id: null, empresa_id: null, criado_por: 'carlos', criado_em: criado, arquivado: false },
    { id: 'k-erp', nome: 'implantacao-erp', descricao: 'Migração e virada do sistema', tipo: 'aberto',
      area_id: 'fin', fluxo_id: 'f-erp', empresa_id: 'mer', criado_por: 'ana', criado_em: criado, arquivado: false },
    // Canal fechado: só quem está na lista de membros abre, inclusive o administrador.
    { id: 'k-dir', nome: 'diretoria', descricao: 'Assuntos de sócio', tipo: 'fechado',
      area_id: null, fluxo_id: null, empresa_id: null, criado_por: 'leo', criado_em: criado, arquivado: false },
    { id: 'k-leo-carlos', nome: 'Carlos', descricao: '', tipo: 'direto',
      area_id: null, fluxo_id: null, empresa_id: null, criado_por: 'leo', criado_em: criado, arquivado: false },
  ]

  const canal_membros: Linha[] = [
    { canal_id: 'k-dir', perfil_id: 'leo', lido_em: min(200) },
    { canal_id: 'k-dir', perfil_id: 'ana', lido_em: min(200) },
    { canal_id: 'k-leo-carlos', perfil_id: 'leo', lido_em: min(90) },
    { canal_id: 'k-leo-carlos', perfil_id: 'carlos', lido_em: min(60) },
    { canal_id: 'k-erp', perfil_id: 'leo', lido_em: min(300) },
    { canal_id: 'k-geral', perfil_id: 'leo', lido_em: min(15) },
  ]

  let nm = 0
  const msg = (canal: string, autor: string, texto: string, minutos: number): Linha => ({
    id: `msg${nm++}`, canal_id: canal, autor_id: autor, texto,
    responde_a: null, sistema: false, criado_em: min(minutos), editado_em: null,
  })

  const mensagens: Linha[] = [
    msg('k-geral', 'leo', 'Bom dia. Lembrando que o conselho ficou para quinta, 8h30.', 320),
    msg('k-geral', 'ana', 'Anotado. Levo o fluxo de caixa consolidado das três empresas.', 300),
    msg('k-geral', 'marina', 'Bom dia a todos!', 290),

    msg('k-fin', 'ana', 'O extrato da conta principal já bateu, faltam só as conciliações do cartão.', 180),
    msg('k-fin', 'carlos', 'Vou conciliar o cartão corporativo até segunda, pedi a segunda via de duas notas.', 170),
    msg('k-fin', 'ana', 'Ficou definido então que a partir deste mês o cartão entra no fechamento junto com as notas de serviço.', 160),

    msg('k-ope', 'carlos', 'Estamos travados esperando o alvará de funcionamento da unidade Norte, sem retorno há duas semanas.', 240),
    msg('k-ope', 'marina', 'Quer que eu ligue na prefeitura amanhã de manhã?', 235),
    msg('k-ope', 'carlos', 'Quero sim, obrigado.', 230),

    // É esta conversa que a leitura transforma em trabalho, no botão do topo.
    msg('k-erp', 'carlos', 'O plano de contas já está migrado, subi a planilha final ontem.', 140),
    msg('k-erp', 'ana', 'Vi aqui. Precisamos revisar as permissões de acesso antes de abrir para o time todo.', 120),
    msg('k-erp', 'leo', 'Concordo. @Marina, você consegue montar o roteiro de treinamento até quinta?', 95),
    msg('k-erp', 'marina', 'Consigo, deixa comigo.', 92),
    msg('k-erp', 'carlos', 'A homologação da integração bancária vai ter que ficar para dia 10, o banco não liberou o ambiente de testes.', 70),
    msg('k-erp', 'leo', 'Ficou decidido que a virada é no primeiro dia útil do mês, não no meio.', 40),

    msg('k-dir', 'leo', 'A unidade Norte pode consumir mais caixa que o previsto. Vale conversarmos antes do conselho.', 200),
    msg('k-dir', 'ana', 'Concordo. Preparo um cenário de caixa até quarta.', 190),

    msg('k-leo-carlos', 'carlos', 'Leo, o comparativo da quinzena fecha sexta. Consigo te mandar na quinta à noite.', 70),
    msg('k-leo-carlos', 'leo', 'Perfeito, obrigado.', 60),
  ]

  // Duas propostas já abertas, para a leitura da conversa aparecer de cara.
  const sugestoes: Linha[] = [
    { id: 'sg1', canal_id: 'k-ope', mensagem_id: 'msg7', tipo: 'tarefa',
      texto: 'Ligar na prefeitura sobre o alvará da unidade Norte',
      motivo: 'Marina: Quer que eu ligue na prefeitura amanhã de manhã?',
      dados: { fluxo_id: 'f-norte', resp_id: 'marina', prazo: d(1) },
      estado: 'aberta', criado_em: min(228), decidido_por: null, decidido_em: null },
    { id: 'sg2', canal_id: 'k-fin', mensagem_id: 'msg5', tipo: 'decisao',
      texto: 'A partir deste mês o cartão corporativo entra no fechamento junto com as notas de serviço',
      motivo: 'Ana: Ficou definido então que a partir deste mês o cartão entra no fechamento junto com as notas de serviço.',
      dados: { fluxo_id: 'f-fech' },
      estado: 'aberta', criado_em: min(158), decidido_por: null, decidido_em: null },
  ]

  atividades.push(
    { id: 'a1', fluxo_id: 'f-erp', quem_id: 'ana', texto: 'concluiu Escolha da ferramenta', criado_em: new Date(Date.now() - 864e5 * 8).toISOString() },
    { id: 'a2', fluxo_id: 'f-erp', quem_id: 'leo', texto: 'aprovou a saída de Escolha', criado_em: new Date(Date.now() - 864e5 * 20).toISOString() },
    { id: 'a3', fluxo_id: 'f-norte', quem_id: 'carlos', texto: 'travou: Aguardando a liberação do alvará de funcionamento', criado_em: new Date(Date.now() - 864e5 * 12).toISOString() },
    { id: 'a4', fluxo_id: 'f-gerente', quem_id: 'marina', texto: 'concluiu Publicar a vaga nos canais', criado_em: new Date(Date.now() - 864e5 * 8).toISOString() },
  )

  return { organizacoes, empresas, perfis, areas, fluxos, etapas, itens, dependencias,
    processos, processo_etapas, processo_itens,
    canais, canal_membros, mensagens, sugestoes,
    compromissos, convidados, agendas_externas, ocupacao_externa, fluxo_pessoas: [], convites: [],
    historico, atividades, anexos, decisoes, pedidos_prazo: [], memoria: [], consumo: [], agentes: [] }
}
