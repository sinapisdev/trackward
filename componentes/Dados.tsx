'use client'

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
} from 'react'
import { supabase } from '@/lib/supabase/browser'
import { curta, hojeIso, isoDe } from '@/lib/datas'
import { proxPeriodo } from '@/lib/modelos'
import type { RascunhoEtapa } from '@/lib/modelos'
import { etapaAtual } from '@/lib/regras'
import type { AgendaExterna, Atividade, Canal, Compromisso, Espaco, Organizacao, Convite, Empresa, Etapa, Fluxo, Item, Mensagem, Papel, Perfil, Area, Processo, ProcessoEtapa, ProcessoItem, Sugestao, TipoCanal, Volta, Anexo, Decisao, TipoDecisao, NaCascata, PedidoPrazo, Agente, Conector, Nota,
  Aviso, AvisoContato, PushAssinatura,
  } from '@/lib/tipos'
import { chama } from '@/lib/mencao'
import { MODO_LOCAL } from '@/lib/modo'
import { nomeLimpo, preparar, LIMITE, tamanhoLegivel } from '@/lib/anexos'
import { extensaoDe } from '@/lib/voz'
import { distribuir, type Palpite } from '@/lib/distribuir'
import { sobrecarga, type Carga } from '@/lib/sobrecarga'
import { escutaAqui, oQueFaz, porPalavras } from '@/lib/agentes'
import { preencher } from '@/lib/conectores'
import { tituloDe } from '@/lib/notas'
import { novoId } from '@/lib/id'
import {
  daDecisao, jaFoiRecusada, paraOModelo, quemCostuma, termosDaConversa, ultimoAprendizado,
  type Aprendizado, type Lembranca,
} from '@/lib/memoria'
import type { Contexto as ContextoLeitura, Proposta } from '@/lib/leitor'
import type { Alvo } from '@/lib/tipos'
import { iso } from '@/lib/datas'
import { itensVisiveis, podeMexerNoPrazo, veFluxo } from '@/lib/acesso'

/**
 * A faixa que aparece no rodapé por três segundos.
 *
 * Chama-se Torrada, e não Aviso, porque aviso no TrackWard é outra coisa: é o
 * que o banco escreve na caixa de alguém e sobrevive ao fechar o app. Esta aqui
 * some sozinha e ninguém volta para ler.
 */
type Torrada = { texto: string; erro: boolean; id: number }

/** O que o formulário de tarefa manda para o banco. */
type DadosItem = {
  texto: string
  /** O resto, quando o título não basta. Vazio é o normal. */
  descricao?: string
  resp_id: string | null
  prazo: string
  priv: boolean
  firme?: boolean
  /** Sem aviso na tela: quem chamou já vai dizer algo mais importante. */
  quieto?: boolean
}

type Contexto = {
  eu: Perfil
  perfis: Perfil[]
  areas: Area[]
  empresas: Empresa[]
  org: Organizacao
  /**
   * Conta de uma pessoa só. Equipe, convite, responsável, aprovador e
   * visibilidade somem da tela: com um usuário, a resposta de todos eles é
   * sempre "você", e campo cuja resposta é sempre a mesma só atrapalha.
   */
  pessoal: boolean
  /** Os espaços a que o meu login pertence, para o seletor no alto da lateral. */
  espacos: Espaco[]
  trocarEspaco: (perfilId: string) => Promise<void>
  abrirEspaco: (nome: string, tipo: 'pessoal' | 'equipe') => Promise<void>
  /** Fluxos da empresa em foco. Sem empresa escolhida, são todos. */
  fluxos: Fluxo[]
  /** Todos, ignorando o filtro de empresa. Serve para contar no seletor. */
  todosFluxos: Fluxo[]
  /** Total de tarefas de uma esteira, inclusive as que você não enxerga. */
  totalItens: (fluxoId: string) => number
  /** Agenda de todos. Os compromissos fechados chegam sem conteúdo, só como ocupação. */
  agenda: Compromisso[]
  /** A ligação com o calendário de fora, quando você tem uma. */
  minhaAgendaExterna: AgendaExterna | null
  /** Os trilhos que a empresa desenhou, prontos para dar origem a esteiras. */
  processos: Processo[]
  /** Convites em aberto, visíveis para quem pode convidar. */
  convites: Convite[]
  empresaAtiva: string | null
  focarEmpresa: (id: string | null) => void
  empresaDe: (id: string | null) => Empresa | null
  carregando: boolean
  perfilDe: (id: string | null) => Perfil
  nomeDe: (id: string | null) => string
  areaDe: (id: string | null) => Area
  aviso: Torrada | null
  toast: (texto: string, erro?: boolean) => void
  salvarArea: (d: { id?: string; nome: string; cor: string; responsavel_id?: string | null }) => Promise<Area | null>
  excluirArea: (id: string) => Promise<void>
  salvarFluxo: (f: Record<string, unknown>, etapas: RascunhoEtapa[]) => Promise<string | null>
  excluirFluxo: (id: string) => Promise<void>
  travar: (f: Fluxo, motivo: string) => Promise<void>
  destravar: (f: Fluxo) => Promise<void>
  adicionarItem: (et: Etapa, d: DadosItem, porIa?: boolean) => Promise<string | null>
  editarItem: (item: Item, d: DadosItem) => Promise<void>
  definirTravas: (item: Item, ids: string[]) => Promise<void>
  excluirItem: (item: Item) => Promise<void>
  alternarItem: (item: Item, porIa?: boolean) => Promise<void>
  aprovar: (f: Fluxo) => Promise<void>
  /** Os anexos de uma tarefa, que são a prova de que ela saiu. */
  anexosDe: (itemId: string) => Anexo[]
  anexar: (item: Item, arquivos: FileList | File[]) => Promise<void>
  removerAnexo: (a: Anexo) => Promise<void>
  /** URL temporária para abrir o arquivo. Vale poucos minutos, de propósito. */
  abrirAnexo: (a: Anexo) => Promise<string | null>
  /** O que já foi decidido em cada checkpoint desta esteira. */
  decisoesDe: (fluxoId: string) => Decisao[]
  decidir: (f: Fluxo, d: {
    tipo: TipoDecisao; nota?: string; reabrir?: string[]; prazo?: string | null
  }) => Promise<boolean>
  /** O que andaria se este prazo passasse a ser outro. Só leitura, para o aviso. */
  preverCascata: (item: Item, novo: string) => Promise<NaCascata[]>
  /** Aplica o que é da mesma esteira e pede o resto. */
  moverPrazo: (item: Item, novo: string, motivo: string) => Promise<boolean>
  /** Os agentes da empresa: o que reconhecer na conversa, e o que fazer. */
  agentes: Agente[]
  salvarAgente: (a: Partial<Agente>) => Promise<void>
  excluirAgente: (id: string) => Promise<void>

  /**
   * Os conectores: os serviços de fora que esta pessoa pode usar.
   *
   * Vem sem o segredo, sempre. Guardar a chave é `guardarChave`, que manda o
   * texto para o servidor cifrar, e a partir daí nem eu nem ninguém lê de volta.
   */
  /**
   * As suas notas. De mais ninguém: o banco não devolve a nota de outra pessoa
   * nem para quem é dono da empresa.
   */
  notas: Nota[]

  /**
   * A sua caixa de avisos. De mais ninguém: a política do banco recusa o aviso
   * de qualquer outra pessoa, inclusive para o administrador, porque ali dentro
   * aparece texto de tarefa privada e de canal fechado.
   */
  avisos: Aviso[]
  naoVistos: number
  lerAvisos: (ids?: string[]) => Promise<void>
  apagarAviso: (id: string) => Promise<void>
  /** Por onde você quer ser avisado. Nulo enquanto a linha não existe. */
  contato: AvisoContato | null
  salvarContato: (d: Partial<AvisoContato>) => Promise<void>
  /** Os aparelhos seus que aceitaram push. */
  aparelhos: PushAssinatura[]
  ligarPushAqui: () => Promise<boolean>
  desligarPushAqui: () => Promise<void>
  esquecerAparelho: (id: string) => Promise<void>
  salvarNota: (n: Partial<Nota>) => Promise<string | null>
  excluirNota: (id: string) => Promise<void>
  /** O canal de despejo desta pessoa, criado na primeira vez que ela pede. */
  meuDespejo: Canal | null
  abrirDespejo: () => Promise<string | null>
  /**
   * A esteira onde cai a tarefa que não é de projeto nenhum.
   *
   * Sem isto, a tarefa que sai do despejo pede projeto antes de existir, e pedir
   * projeto para "comprar cabo hdmi" é o tipo de pergunta que faz a pessoa
   * desistir e voltar para o papel.
   */
  minhaLista: Fluxo | null
  abrirMinhaLista: () => Promise<string | null>
  /**
   * Cria uma tarefa avulsa: a que não pertence a objetivo nem a rotina.
   * Devolve o id, ou nulo quando não deu.
   */
  criarAvulsa: (texto: string, prazo?: string, descricao?: string) => Promise<string | null>

  conectores: Conector[]
  salvarConector: (c: Partial<Conector>) => Promise<string | null>
  guardarChave: (id: string, segredo: string) => Promise<boolean>
  excluirConector: (id: string) => Promise<void>
  testarConector: (id: string, caminho: string) => Promise<string>
  /** Quanto a IA consumiu neste mês, e qual é o teto. */
  consumo: { leituras: number; gastoMicro: number; limite: number | null; modelo: string }
  /** O que o Track já aprendeu sobre esta empresa. Visível e apagável. */
  memoria: Lembranca[]
  esquecer: (id: string) => Promise<void>
  /** Pedidos de prazo em aberto que esperam decisão de alguém. */
  pedidosPrazo: PedidoPrazo[]
  decidirPrazo: (p: PedidoPrazo, aceita: boolean) => Promise<void>
  salvarPerfil: (id: string, d: Partial<Perfil>) => Promise<void>
  salvarEmpresa: (d: { id?: string; nome: string; sigla: string; cor: string }) => Promise<void>
  excluirEmpresa: (id: string) => Promise<void>
  salvarOrg: (d: Partial<Organizacao>) => Promise<void>
  /** Devolve o id, para quem criou de dentro de uma proposta poder desfazer. */
  salvarCompromisso: (d: Partial<Compromisso> & { convidados: string[] }) => Promise<string | null>
  excluirCompromisso: (id: string) => Promise<void>
  ligarAgendaExterna: (url: string) => Promise<{ blocos: number } | null>
  desligarAgendaExterna: () => Promise<void>
  salvarProcesso: (p: Record<string, unknown>, etapas: Record<string, unknown>[]) => Promise<string | null>
  excluirProcesso: (id: string) => Promise<void>
  duplicarProcesso: (id: string) => Promise<string | null>
  criarConvite: (d: {
    email: string; nome: string; papel: Papel
    area_id: string | null; gestor_id: string | null; ve_area: boolean
  }) => Promise<Convite | null>
  excluirConvite: (id: string) => Promise<void>
  criarDoProcesso: (
    processoId: string, dados: Record<string, unknown>, pessoas: Record<string, string>, inicio: string,
  ) => Promise<string | null>

  // ------------------------------------------------------------- conversa
  /** Os canais que você enxerga, com o mais movimentado no topo. */
  canais: Canal[]
  mensagens: Mensagem[]
  sugestoes: Sugestao[]
  mensagensDe: (canalId: string) => Mensagem[]
  sugestoesDe: (canalId: string) => Sugestao[]
  /** Quantas mensagens chegaram depois da última vez que você abriu o canal. */
  naoLidas: (canalId: string) => number
  /** Quantas mensagens novas deste canal chamam você pelo nome. */
  meChamaram: (canalId: string) => number
  enviar: (canalId: string, texto: string, respondeA?: string | null) => Promise<void>
  /** Manda um recado de voz. O texto é a transcrição, e vai no corpo da mensagem. */
  enviarAudio: (canalId: string, g: {
    blob: Blob; mime: string; segundos: number; texto: string
  }, respondeA?: string | null) => Promise<boolean>
  /** URL temporária para tocar o áudio de uma mensagem. */
  abrirAudio: (m: Mensagem) => Promise<string | null>
  apagarMensagem: (m: Mensagem) => Promise<void>
  marcarLido: (canalId: string) => Promise<void>
  salvarCanal: (d: {
    id?: string; nome: string; descricao: string; tipo: TipoCanal
    area_id: string | null; fluxo_id: string | null; membros: string[]
  }) => Promise<string | null>
  excluirCanal: (id: string) => Promise<void>
  /** Lê a conversa e guarda o que ela produziu, sem aplicar nada ainda. */
  lerConversa: (canalId: string) => Promise<{ achou: number; motor: string } | null>
  aceitarSugestao: (s: Sugestao, ajuste?: Alvo, porIa?: boolean) => Promise<void>
  /** Volta atrás no que a leitura fez sozinha. */
  desfazerSugestao: (s: Sugestao) => Promise<void>
  /** Quem a leitura sugere para cada tarefa sem dono. */
  palpites: Palpite[]
  /** O índice de sobrecarga de cada pessoa, na janela de 30 dias. */
  cargas: Carga[]
  cargaDe: (perfilId: string | null) => Carga | null
  /** Põe o dono sugerido na tarefa. porIa quando foi a leitura que aplicou. */
  distribuirTarefa: (p: Palpite, porIa?: boolean) => Promise<void>
  recusarSugestao: (s: Sugestao) => Promise<void>
}

const Ctx = createContext<Contexto | null>(null)

export function useDados() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useDados precisa estar dentro de <Dados>')
  return c
}

const SEM_PERFIL: Perfil = {
  id: '', user_id: '', org_id: '', nome: 'Sem responsável', email: '', cor: '#8A909C', papel: 'colaborador',
  area_id: null, gestor_id: null, ve_area: false, ativo: false, criado_em: '',
}
const SEM_AREA: Area = { id: '', nome: 'Sem área', cor: '#8A909C', ordem: 999, responsavel_id: null }
const ORG_PADRAO: Organizacao = {
  id: '', nome: 'Track', tipo: 'equipe', dominio: null, entrada_por_dominio: false,
  dono_id: null, multi: false, rotulo: 'Empresa', rotulo_plural: 'Empresas',
  ia_ativa: true, ia_modo: 'sugerir', criado_em: '',
  plano: 'padrao', limite_leituras: null, modelo_ia: null,
  whats_conector: null, whats_sid: '', whats_de: '',
}
const CHAVE_EMPRESA = 'track.empresa'

/**
 * O nome da lista pessoal.
 *
 * Fixo, e reconhecido pelo nome mais o dono, porque o alternativo seria uma
 * coluna nova em fluxos só para marcar "esta é a lista de alguém". Uma coluna a
 * mais para guardar o que o nome já diz é peso que não se paga.
 */
const NOME_DA_LISTA = 'Minha lista'

export function Dados({ perfil, children }: { perfil: Perfil; children: ReactNode }) {
  const sb = supabase()
  const [eu, setEu] = useState<Perfil>(perfil)
  const [perfis, setPerfis] = useState<Perfil[]>([perfil])
  const [areas, setAreas] = useState<Area[]>([])
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [org, setOrg] = useState<Organizacao>(ORG_PADRAO)
  const [todosFluxos, setFluxos] = useState<Fluxo[]>([])
  const [empresaAtiva, setEmpresaAtiva] = useState<string | null>(null)
  /** Quantas tarefas cada esteira tem ao todo, para avisar o que ficou de fora. */
  const [totais, setTotais] = useState<Map<string, number>>(new Map())
  const [agenda, setAgenda] = useState<Compromisso[]>([])
  const [minhaAgendaExterna, setMinhaExterna] = useState<AgendaExterna | null>(null)
  const [processos, setProcessos] = useState<Processo[]>([])
  const [convites, setConvites] = useState<Convite[]>([])
  const [anexos, setAnexos] = useState<Anexo[]>([])
  const [decisoes, setDecisoes] = useState<Decisao[]>([])
  const [pedidosPrazo, setPedidosPrazo] = useState<PedidoPrazo[]>([])
  const [memoria, setMemoria] = useState<Lembranca[]>([])
  const [agentes, setAgentes] = useState<Agente[]>([])
  const [conectores, setConectores] = useState<Conector[]>([])
  const [notas, setNotas] = useState<Nota[]>([])
  const [avisos, setAvisos] = useState<Aviso[]>([])
  const [contato, setContato] = useState<AvisoContato | null>(null)
  const [aparelhos, setAparelhos] = useState<PushAssinatura[]>([])
  const [consumo, setConsumo] = useState<Contexto['consumo']>(
    { leituras: 0, gastoMicro: 0, limite: null, modelo: '' },
  )
  const [canais, setCanais] = useState<Canal[]>([])
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([])
  const [espacos, setEspacos] = useState<Espaco[]>([])
  const [carregando, setCarregando] = useState(true)
  const [aviso, setAviso] = useState<Torrada | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const toast = useCallback((texto: string, erro = false) => {
    setAviso({ texto, erro, id: Date.now() })
  }, [])

  useEffect(() => {
    try { setEmpresaAtiva(localStorage.getItem(CHAVE_EMPRESA)) } catch {}
  }, [])

  /** A empresa em foco vale para o app inteiro e sobrevive ao recarregar. */
  const focarEmpresa = useCallback((id: string | null) => {
    setEmpresaAtiva(id)
    try {
      if (id) localStorage.setItem(CHAVE_EMPRESA, id)
      else localStorage.removeItem(CHAVE_EMPRESA)
    } catch {}
  }, [])

  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(null), 3200)
    return () => clearTimeout(t)
  }, [aviso])

  /** Recolhe tudo que a pessoa pode ver e monta a árvore de fluxos. */
  const carregar = useCallback(async () => {
    const [p, s, f, e, i, h, a, em, cf, dp, cm, cv, oc, oe, ax, pr, pe, pi, fp, cvt, kn, km, ms, sg, esp, anx, dec, pz, mem, cns, ags, cnc, nts, avs, ctt, psh] = await Promise.all([
      sb.from('perfis').select('*').order('nome'),
      sb.from('areas').select('*').order('ordem'),
      sb.from('fluxos').select('*').order('criado_em'),
      sb.from('etapas').select('*').order('ordem'),
      sb.from('itens').select('*').order('ordem').order('criado_em'),
      sb.from('historico').select('*').order('criado_em'),
      sb.from('atividades').select('*').order('criado_em', { ascending: false }),
      sb.from('empresas').select('*').order('ordem'),
      sb.from('organizacoes').select('*'),
      sb.from('dependencias').select('*'),
      sb.from('compromissos').select('*').order('quando'),
      sb.from('convidados').select('*'),
      sb.rpc('ocupacao'),
      sb.from('ocupacao_externa').select('*'),
      sb.from('agendas_externas').select('*'),
      sb.from('processos').select('*').order('ordem'),
      sb.from('processo_etapas').select('*').order('ordem'),
      sb.from('processo_itens').select('*').order('ordem'),
      sb.from('fluxo_pessoas').select('*'),
      sb.from('convites').select('*').is('usado_em', null).order('criado_em', { ascending: false }),
      sb.from('canais').select('*').order('nome'),
      sb.from('canal_membros').select('*'),
      sb.from('mensagens').select('*').order('criado_em'),
      sb.from('sugestoes').select('*').order('criado_em', { ascending: false }),
      sb.rpc('meus_espacos'),
      sb.from('anexos').select('*').order('criado_em'),
      sb.from('decisoes').select('*').order('criado_em', { ascending: false }),
      sb.from('pedidos_prazo').select('*').order('criado_em', { ascending: false }),
      sb.from('memoria').select('*').order('peso', { ascending: false }),
      sb.from('consumo').select('onde,custo_micro,criado_em'),
      sb.from('agentes').select('*').order('criado_em'),
      sb.from('conectores').select('id,nome,base_url,auth_tipo,auth_nome,dica,dono_id,ativo,criado_por,criado_em').order('criado_em'),
      sb.from('notas').select('*').order('mexido_em', { ascending: false }),
      // A caixa é curta de propósito: aviso de duas semanas atrás não é aviso,
      // é histórico, e histórico já mora na atividade de cada track.
      sb.from('avisos').select('*').order('criado_em', { ascending: false }).limit(80),
      sb.from('avisos_contato').select('*').maybeSingle(),
      sb.from('push_assinaturas').select('id,perfil_id,endpoint,aparelho,criado_em,usado_em')
        .order('criado_em'),
    ])

    /**
     * `perfis_sel` devolve, de propósito, os SEUS perfis em todos os espaços,
     * porque é isso que alimenta o seletor de empresa. Só que aqui dentro
     * "pessoas" quer dizer as pessoas deste espaço: uma lista de responsáveis
     * misturando gente de outra empresa cria tarefa que o dono nunca enxerga,
     * já que todas as outras políticas filtram por organização. Os seus outros
     * espaços continuam vindo por `meus_espacos()`, que é a pergunta certa.
     */
    const listaPerfis = ((p.data || []) as Perfil[]).filter((x) => x.org_id === perfil.org_id)
    setPerfis(listaPerfis)
    const meu = listaPerfis.find((x) => x.id === perfil.id)
    if (meu) setEu(meu)
    setAreas((s.data || []) as Area[])
    setEmpresas((em.data || []) as Empresa[])
    const cfg = ((cf.data || []) as Organizacao[])[0]
    setOrg(cfg ? { ...ORG_PADRAO, ...cfg } : ORG_PADRAO)

    const travas = new Map<string, string[]>()
    for (const d of (dp.data || []) as { item_id: string; depende_de: string }[]) {
      const lista = travas.get(d.item_id)
      if (lista) lista.push(d.depende_de)
      else travas.set(d.item_id, [d.depende_de])
    }

    const porEtapa = new Map<string, Item[]>()
    for (const cru of (i.data || []) as Item[]) {
      const item: Item = { ...cru, depende_de: travas.get(cru.id) || [] }
      const lista = porEtapa.get(item.etapa_id)
      if (lista) lista.push(item)
      else porEtapa.set(item.etapa_id, [item])
    }
    const listaItens = [...porEtapa.values()].flat()
    const porFluxo = new Map<string, Etapa[]>()
    for (const et of (e.data || []) as Omit<Etapa, 'itens'>[]) {
      const cheia: Etapa = { ...et, itens: porEtapa.get(et.id) || [] }
      const lista = porFluxo.get(et.fluxo_id)
      if (lista) lista.push(cheia)
      else porFluxo.set(et.fluxo_id, [cheia])
    }
    const voltas = new Map<string, Volta[]>()
    for (const v of (h.data || []) as Volta[]) {
      const lista = voltas.get(v.fluxo_id)
      if (lista) lista.push(v)
      else voltas.set(v.fluxo_id, [v])
    }
    const logs = new Map<string, Atividade[]>()
    for (const l of (a.data || []) as Atividade[]) {
      const lista = logs.get(l.fluxo_id)
      if (lista) lista.push(l)
      else logs.set(l.fluxo_id, [l])
    }

    const convidadosDo = new Map<string, string[]>()
    for (const x of (fp.data || []) as { fluxo_id: string; perfil_id: string }[]) {
      const lista = convidadosDo.get(x.fluxo_id)
      if (lista) lista.push(x.perfil_id)
      else convidadosDo.set(x.fluxo_id, [x.perfil_id])
    }

    const montados = ((f.data || []) as Omit<Fluxo, 'etapas' | 'voltas' | 'log' | 'pessoas'>[]).map((fl) => ({
      ...fl,
      pessoas: convidadosDo.get(fl.id) || [],
      etapas: porFluxo.get(fl.id) || [],
      voltas: voltas.get(fl.id) || [],
      log: logs.get(fl.id) || [],
    }))

    // O banco já recusa o que a pessoa não pode ler. Aqui aplicamos a mesma regra
    // na tela, para o modo demonstração se comportar igual ao Supabase.
    const meuPerfil = meu || perfil
    const visiveis = montados
      .filter((fl) => veFluxo(meuPerfil, listaPerfis, fl, listaItens))
      .map((fl) => {
        const permitidos = new Set(itensVisiveis(meuPerfil, listaPerfis, fl, listaItens).map((x) => x.id))
        return { ...fl, etapas: fl.etapas.map((et) => ({ ...et, itens: et.itens.filter((x) => permitidos.has(x.id)) })) }
      })
    setFluxos(visiveis)

    // Agenda: o que eu posso ler vem completo; o resto chega só como ocupação,
    // para eu saber que a pessoa não está livre sem saber do que se trata.
    const porComp = new Map<string, string[]>()
    for (const v of (cv.data || []) as { compromisso_id: string; perfil_id: string }[]) {
      const lista = porComp.get(v.compromisso_id)
      if (lista) lista.push(v.perfil_id)
      else porComp.set(v.compromisso_id, [v.perfil_id])
    }
    const abertos = ((cm.data || []) as Compromisso[]).map((c) => ({
      ...c,
      convidados: porComp.get(c.id) || [],
      aberto: true,
    }))
    const conhecidos = new Set(abertos.map((c) => c.id))
    const fechados = new Map<string, Compromisso>()
    for (const o of (oc.data || []) as { id: string; perfil_id: string; quando: string; inicio: string | null; fim: string | null }[]) {
      if (conhecidos.has(o.id)) continue
      const atual = fechados.get(o.id)
      if (atual) { atual.convidados.push(o.perfil_id); continue }
      fechados.set(o.id, {
        id: o.id, titulo: 'Ocupado', quando: o.quando, inicio: o.inicio, fim: o.fim,
        local: '', nota: '', dono_id: o.perfil_id, bloqueia: true, visivel: false,
        fluxo_id: null, convidados: [], criado_em: '', aberto: false,
      })
    }
    // O que veio do calendário de fora entra como ocupação pura: sabemos que a
    // pessoa não está livre, e nada mais que isso.
    const externos: Compromisso[] = ((oe.data || []) as {
      id: string; perfil_id: string; quando: string; inicio: string | null; fim: string | null
    }[]).map((o) => ({
      id: 'x' + o.id, titulo: 'Ocupado', quando: o.quando,
      inicio: o.inicio ? o.inicio.slice(0, 5) : null, fim: o.fim ? o.fim.slice(0, 5) : null,
      local: '', nota: '', dono_id: o.perfil_id, bloqueia: true, visivel: false,
      fluxo_id: null, convidados: [], criado_em: '', aberto: false, externo: true,
    }))

    setAgenda([...abertos, ...fechados.values(), ...externos])
    setMinhaExterna(((ax.data || []) as AgendaExterna[])[0] || null)

    const itensPorEtapa = new Map<string, ProcessoItem[]>()
    for (const x of (pi.data || []) as ProcessoItem[]) {
      const lista = itensPorEtapa.get(x.etapa_id)
      if (lista) lista.push(x)
      else itensPorEtapa.set(x.etapa_id, [x])
    }
    const etapasPorProcesso = new Map<string, ProcessoEtapa[]>()
    for (const x of (pe.data || []) as Omit<ProcessoEtapa, 'itens'>[]) {
      const cheia: ProcessoEtapa = { ...x, itens: itensPorEtapa.get(x.id) || [] }
      const lista = etapasPorProcesso.get(x.processo_id)
      if (lista) lista.push(cheia)
      else etapasPorProcesso.set(x.processo_id, [cheia])
    }
    setProcessos(
      ((pr.data || []) as Omit<Processo, 'etapas'>[]).map((x) => ({
        ...x,
        etapas: etapasPorProcesso.get(x.id) || [],
      })),
    )
    setConvites((cvt.data || []) as Convite[])
    setAnexos((anx.data || []) as Anexo[])
    setDecisoes((dec.data || []) as Decisao[])
    setPedidosPrazo((pz.data || []) as PedidoPrazo[])
    setMemoria((mem.data || []) as Lembranca[])
    setAgentes((ags.data || []) as Agente[])
    // O segredo cifrado nem é pedido acima: a tela não tem o que fazer com ele.
    setConectores((cnc.data || []) as Conector[])
    setNotas((nts.data || []) as Nota[])
    setAvisos((avs.data || []) as Aviso[])
    setContato((ctt.data as AvisoContato | null) ?? null)
    setAparelhos((psh.data || []) as PushAssinatura[])

    // O gasto do mês, contado aqui porque as linhas já chegaram filtradas pela
    // organização. Mês corrente pelo relógio de quem olha, que é o que a pessoa
    // espera ver quando abre "este mês".
    const inicioDoMes = new Date()
    inicioDoMes.setDate(1)
    inicioDoMes.setHours(0, 0, 0, 0)
    const linhas = ((cns.data || []) as { onde: string; custo_micro: number; criado_em: string }[])
      .filter((l) => new Date(l.criado_em) >= inicioDoMes)
    setConsumo({
      leituras: linhas.filter((l) => l.onde === 'leitor').length,
      gastoMicro: linhas.reduce((n, l) => n + Number(l.custo_micro || 0), 0),
      limite: cfg?.limite_leituras ?? null,
      modelo: cfg?.modelo_ia || '',
    })
    setEspacos((esp.data || []) as Espaco[])

    // Canal: a lista de membros vem junto, e com ela a minha marca de leitura.
    const membrosDo = new Map<string, string[]>()
    const meuLido = new Map<string, string | null>()
    for (const x of (km.data || []) as { canal_id: string; perfil_id: string; lido_em: string | null }[]) {
      const lista = membrosDo.get(x.canal_id)
      if (lista) lista.push(x.perfil_id)
      else membrosDo.set(x.canal_id, [x.perfil_id])
      if (x.perfil_id === perfil.id) meuLido.set(x.canal_id, x.lido_em)
    }
    setCanais(((kn.data || []) as Omit<Canal, 'membros' | 'lido_em'>[]).map((k) => ({
      ...k,
      membros: membrosDo.get(k.id) || [],
      lido_em: meuLido.get(k.id) ?? null,
    })))
    setMensagens((ms.data || []) as Mensagem[])
    setSugestoes(((sg.data || []) as Sugestao[]).map((x) => ({
      ...x,
      dados: (typeof x.dados === 'string' ? JSON.parse(x.dados) : x.dados) || {},
    })))
    setTotais(new Map(montados.map((fl) => [fl.id, fl.etapas.reduce((n, et) => n + et.itens.length, 0)])))
    setCarregando(false)
  }, [sb, perfil.id])

  /** Junta várias mudanças seguidas numa recarga só. */
  const recarregar = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => { void carregar() }, 220)
  }, [carregar])

  useEffect(() => {
    void carregar()
    const canal = sb
      .channel('esteira')
      .on('postgres_changes', { event: '*', schema: 'public' }, recarregar)
      .subscribe()
    return () => { void sb.removeChannel(canal) }
  }, [sb, carregar, recarregar])

  /** O filtro de empresa é global: escolhida uma, o app inteiro fala só dela. */
  const fluxos = useMemo(
    () => (!org.multi || !empresaAtiva ? todosFluxos : todosFluxos.filter((f) => f.empresa_id === empresaAtiva)),
    [todosFluxos, empresaAtiva, org.multi],
  )
  const totalItens = useCallback((id: string) => totais.get(id) ?? 0, [totais])
  const indiceEmpresas = useMemo(() => new Map(empresas.map((e) => [e.id, e])), [empresas])
  const empresaDe = useCallback((id: string | null) => (id && indiceEmpresas.get(id)) || null, [indiceEmpresas])
  const indicePerfis = useMemo(() => new Map(perfis.map((p) => [p.id, p])), [perfis])
  const indiceAreas = useMemo(() => new Map(areas.map((s) => [s.id, s])), [areas])
  const perfilDe = useCallback((id: string | null) => (id && indicePerfis.get(id)) || SEM_PERFIL, [indicePerfis])
  const nomeDe = useCallback((id: string | null) => perfilDe(id).nome, [perfilDe])
  const areaDe = useCallback((id: string | null) => (id && indiceAreas.get(id)) || SEM_AREA, [indiceAreas])

  /**
   * O erro que vai para a tela.
   *
   * A mensagem crua do Postgres serve para quem escreveu a política, não para
   * quem está tentando trabalhar: "new row violates row-level security policy
   * for table canais" não diz qual das condições caiu nem o que fazer. Quando
   * ela aparece, trocamos por uma frase que diz o que de fato aconteceu e por
   * onde sair. O resto passa direto, porque a maioria já é legível.
   */
  const falhou = useCallback((e: unknown, padrao: string) => {
    const msg = (e as { message?: string })?.message || ''
    if (/row-level security|violates row-level/i.test(msg)) {
      // O nome da tabela é a única pista de ONDE parou, e a primeira versão
      // desta tradução o jogava fora junto com o jargão. Sem ele, duas falhas
      // diferentes viram a mesma frase e não há como distinguir uma da outra.
      const tabela = msg.match(/table\s+"?([a-z_]+)"?/i)?.[1]
      toast(`O banco recusou a escrita em ${tabela || 'uma tabela'}. `
        + 'Rode o supabase/atualizar.sql no SQL Editor; se continuar, o supabase/porque.sql '
        + 'diz qual condição caiu.', true)
      return
    }
    if (/JWT|not authenticated|invalid token/i.test(msg)) {
      toast('Sua sessão expirou. Entre de novo para continuar.', true)
      return
    }
    toast(msg && msg.length < 120 ? msg : padrao, true)
  }, [toast])

  /**
   * A linha do tempo da esteira.
   *
   * porIa existe porque o que a leitura faz sozinha não pode aparecer no nome de
   * quem por acaso mandou ler. Sem essa distinção, ninguém mais olha a esteira e
   * sabe o que foi decidido por gente e o que a máquina fez.
   */
  const logar = useCallback(async (fluxo_id: string, texto: string, porIa = false) => {
    await sb.from('atividades').insert({ fluxo_id, quem_id: porIa ? null : eu.id, texto, por_ia: porIa })
  }, [sb, eu.id])

  // ---------------------------------------------------------------- ações

  const salvarArea: Contexto['salvarArea'] = useCallback(async (d) => {
    const corpo = { nome: d.nome, cor: d.cor, responsavel_id: d.responsavel_id ?? null }
    if (d.id) {
      const { error } = await sb.from('areas').update(corpo).eq('id', d.id)
      if (error) { falhou(error, 'Não foi possível salvar a área.'); return null }
      toast('Área salva.')
      recarregar()
      return { ...areaDe(d.id), ...corpo }
    }
    const { data, error } = await sb
      .from('areas')
      .insert({ ...corpo, id: novoId(), ordem: areas.length })
      .select()
      .maybeSingle()
    if (error) { falhou(error, 'Só quem é administrador pode criar areas.'); return null }
    toast(`Area ${d.nome} pronto.`)
    recarregar()
    return data as Area
  }, [sb, areas.length, falhou, toast, recarregar, areaDe])

  const excluirArea: Contexto['excluirArea'] = useCallback(async (id) => {
    const { error } = await sb.from('areas').delete().eq('id', id)
    if (error) return falhou(error, 'Não foi possível excluir a área.')
    toast('Area excluído.')
    recarregar()
  }, [sb, falhou, toast, recarregar])

  /** Regrava quem foi convidado a ver uma esteira de visibilidade escolhida. */
  const gravarConvidados = useCallback(async (fluxoId: string, ids: string[]) => {
    await sb.from('fluxo_pessoas').delete().eq('fluxo_id', fluxoId)
    for (const perfil_id of ids) {
      await sb.from('fluxo_pessoas').insert({ fluxo_id: fluxoId, perfil_id })
    }
  }, [sb])

  const salvarFluxo: Contexto['salvarFluxo'] = useCallback(async (f, etapas) => {
    const { data, error } = await sb.rpc('salvar_fluxo', {
      p_fluxo: f,
      p_etapas: etapas.map((e) => ({
        id: e.id,
        nome: e.nome,
        criterio: e.criterio,
        aprovador_id: e.aprovador_id,
        prazo: e.prazo || null,
      })),
    })
    if (error) { falhou(error, 'Não foi possível salvar a esteira.'); return null }
    if (Array.isArray(f.pessoas)) await gravarConvidados(data as string, f.pessoas as string[])
    recarregar()
    return data as string
  }, [sb, falhou, recarregar, gravarConvidados])

  const excluirFluxo: Contexto['excluirFluxo'] = useCallback(async (id) => {
    const { error } = await sb.from('fluxos').delete().eq('id', id)
    if (error) return falhou(error, 'Só o autor, o dono ou um administrador pode excluir.')
    toast('Excluído.')
    recarregar()
  }, [sb, falhou, toast, recarregar])

  const travar: Contexto['travar'] = useCallback(async (f, motivo) => {
    const { error } = await sb
      .from('fluxos')
      .update({ travado_motivo: motivo, travado_desde: hojeIso() })
      .eq('id', f.id)
    if (error) return falhou(error, 'Não foi possível travar.')
    await logar(f.id, `travou: ${motivo}`)
    toast('Marcado como travado.')
    recarregar()
  }, [sb, falhou, toast, recarregar, logar])

  const destravar: Contexto['destravar'] = useCallback(async (f) => {
    const { error } = await sb
      .from('fluxos')
      .update({ travado_motivo: null, travado_desde: null })
      .eq('id', f.id)
    if (error) return falhou(error, 'Não foi possível destravar.')
    await logar(f.id, 'destravou')
    toast('Destravado.')
    recarregar()
  }, [sb, falhou, toast, recarregar, logar])

  const adicionarItem: Contexto['adicionarItem'] = useCallback(async (et, d, porIa = false) => {
    // O id vem daqui, e não do RETURNING. Ver lib/id.ts: pedir a linha de volta
    // faz o Postgres rodar a política de leitura, e quando ela recusa a linha
    // recém-criada a mensagem é igual à de escrita recusada.
    const id = novoId()
    const { error } = await sb.from('itens').insert({
      id,
      etapa_id: et.id,
      fluxo_id: et.fluxo_id,
      texto: d.texto,
      descricao: d.descricao || '',
      resp_id: d.resp_id,
      prazo: d.prazo || null,
      priv: d.priv,
      prazo_firme: !!d.firme,
      autor_id: eu.id,
      ordem: et.itens.length,
    })
    if (error) { falhou(error, 'Não foi possível adicionar o item.'); return null }
    if (!d.priv) await logar(et.fluxo_id, `adicionou ${d.texto}`, porIa)
    if (!porIa) toast('Item adicionado.')
    recarregar()
    return id
  }, [sb, eu.id, falhou, toast, recarregar, logar])

  const editarItem: Contexto['editarItem'] = useCallback(async (item, d) => {
    const { error } = await sb
      .from('itens')
      .update({
        texto: d.texto, descricao: d.descricao ?? '', resp_id: d.resp_id, prazo: d.prazo || null,
        priv: d.priv, prazo_firme: !!d.firme,
      })
      .eq('id', item.id)
    if (error) return falhou(error, 'Não foi possível salvar o item.')
    if (!d.quieto) toast('Item salvo.')
    recarregar()
  }, [sb, falhou, toast, recarregar])

  /** Regrava as travas de uma tarefa: apaga as antigas e põe as novas. */
  const definirTravas: Contexto['definirTravas'] = useCallback(async (item, ids) => {
    await sb.from('dependencias').delete().eq('item_id', item.id)
    for (const d of ids) {
      const { error } = await sb.from('dependencias').insert({ item_id: item.id, depende_de: d })
      if (error) { falhou(error, 'Não foi possível salvar as dependências.'); break }
    }
    recarregar()
  }, [sb, falhou, recarregar])

  const excluirItem: Contexto['excluirItem'] = useCallback(async (item) => {
    const { error } = await sb.from('itens').delete().eq('id', item.id)
    if (error) return falhou(error, 'Não foi possível remover o item.')
    if (!item.priv) await logar(item.fluxo_id, `removeu ${item.texto}`)
    toast('Item removido.')
    recarregar()
  }, [sb, falhou, toast, recarregar, logar])

  /** Marca na hora e confirma depois, para o clique não parecer lento. */
  const alternarItem: Contexto['alternarItem'] = useCallback(async (item, porIa = false) => {
    const feito = !item.feito
    setFluxos((atual) =>
      atual.map((f) =>
        f.id !== item.fluxo_id ? f : {
          ...f,
          etapas: f.etapas.map((et) =>
            et.id !== item.etapa_id ? et : {
              ...et,
              itens: et.itens.map((x) => (x.id === item.id ? { ...x, feito } : x)),
            },
          ),
        },
      ),
    )
    const { error } = await sb.from('itens').update({ feito }).eq('id', item.id)
    if (error) { falhou(error, 'Não foi possível salvar.'); recarregar(); return }
    if (feito) {
      if (!item.priv) await logar(item.fluxo_id, `concluiu ${item.texto}`, porIa)
      if (!porIa) toast(`Concluído: ${item.texto}`)
    }
    recarregar()
  }, [sb, falhou, toast, recarregar, logar])

  // ------------------------------------------------------------- anexos

  const porItem = useMemo(() => {
    const m = new Map<string, Anexo[]>()
    for (const a of anexos) {
      const lista = m.get(a.item_id)
      if (lista) lista.push(a)
      else m.set(a.item_id, [a])
    }
    return m
  }, [anexos])

  const anexosDe = useCallback((itemId: string) => porItem.get(itemId) || [], [porItem])

  const anexar: Contexto['anexar'] = useCallback(async (item, arquivos) => {
    const lista = Array.from(arquivos)
    if (!lista.length) return
    if (!org.id) return falhou(null, 'Organização ainda carregando. Tente de novo.')

    let subiram = 0
    for (const cru of lista) {
      const arquivo = await preparar(cru)
      if (arquivo.size > LIMITE) {
        toast(`${cru.name} tem ${tamanhoLegivel(arquivo.size)}. O limite é ${tamanhoLegivel(LIMITE)}.`, true)
        continue
      }
      // O caminho começa pelo id da organização: é o que a política do Storage
      // confere no envio, antes de olhar qualquer outra coisa.
      const caminho = `${org.id}/${item.fluxo_id}/${item.id}/${Date.now()}-${nomeLimpo(arquivo.name)}`
      const { error: erroArquivo } = await sb.storage.from('anexos').upload(caminho, arquivo)
      if (erroArquivo) { falhou(erroArquivo, `Não foi possível enviar ${cru.name}.`); continue }

      const { error } = await sb.from('anexos').insert({
        item_id: item.id, fluxo_id: item.fluxo_id, nome: arquivo.name,
        tipo: arquivo.type, tamanho: arquivo.size, caminho, autor_id: eu.id,
      })
      if (error) {
        // A linha não entrou, então o arquivo sozinho não serve para nada.
        await sb.storage.from('anexos').remove([caminho])
        falhou(error, `Não foi possível anexar ${cru.name}.`)
        continue
      }
      subiram++
    }
    if (subiram) toast(subiram === 1 ? 'Anexo guardado.' : `${subiram} anexos guardados.`)
    recarregar()
  }, [sb, eu.id, org.id, falhou, toast, recarregar])

  const removerAnexo: Contexto['removerAnexo'] = useCallback(async (a) => {
    const { error } = await sb.from('anexos').delete().eq('id', a.id)
    if (error) return falhou(error, 'Só quem anexou, ou quem responde pela esteira, pode remover.')
    await sb.storage.from('anexos').remove([a.caminho])
    recarregar()
  }, [sb, falhou, recarregar])

  const abrirAnexo: Contexto['abrirAnexo'] = useCallback(async (a) => {
    const { data, error } = await sb.storage.from('anexos').createSignedUrl(a.caminho, 300)
    if (error || !data?.signedUrl) { falhou(error, 'Não foi possível abrir o arquivo.'); return null }
    return data.signedUrl
  }, [sb, falhou])

  // ----------------------------------------------------------- decisões

  const decisoesDe = useCallback(
    (fluxoId: string) => decisoes.filter((d) => d.fluxo_id === fluxoId),
    [decisoes],
  )

  // ------------------------------------------------------------- agentes

  const salvarAgente: Contexto['salvarAgente'] = useCallback(async (a) => {
    const corpo = {
      nome: String(a.nome || '').trim(),
      ativo: a.ativo ?? true,
      quando: 'conversa',
      reconhecer: String(a.reconhecer || '').trim(),
      canal_id: a.canal_id ?? null,
      area_id: a.area_id ?? null,
      faz: a.faz || 'tarefa',
      processo_id: a.processo_id ?? null,
      tarefa_texto: String(a.tarefa_texto || '').trim(),
      tarefa_area_id: a.tarefa_area_id ?? null,
      url: String(a.url || '').trim(),
      conector_id: a.conector_id ?? null,
      caminho: String(a.caminho || '').trim(),
      corpo: String(a.corpo || '').trim(),
    }
    if (!corpo.nome || !corpo.reconhecer) {
      return toast('Um agente precisa de nome e do que reconhecer.', true)
    }
    const { error } = a.id
      ? await sb.from('agentes').update(corpo).eq('id', a.id)
      : await sb.from('agentes').insert({ ...corpo, criado_por: eu.id, disparos: 0 })
    if (error) return falhou(error, 'Só admin e gestor mexem em agente.')
    toast(a.id ? 'Agente salvo.' : `Agente ${corpo.nome} criado. Ele já escuta a conversa.`)
    recarregar()
  }, [sb, eu.id, falhou, toast, recarregar])

  const excluirAgente: Contexto['excluirAgente'] = useCallback(async (id) => {
    const { error } = await sb.from('agentes').delete().eq('id', id)
    if (error) return falhou(error, 'Só admin e gestor mexem em agente.')
    toast('Agente removido.')
    recarregar()
  }, [sb, falhou, toast, recarregar])

  // ------------------------------------------------------------- avisos

  /**
   * Marca como lido. Sem ids, marca a caixa inteira.
   *
   * Passa por função no banco em vez de update direto porque `lido_em` é a única
   * coisa que a pessoa muda num aviso, e deixar a tabela aberta para update
   * qualquer abriria a porta para reescrever o texto do próprio aviso.
   */
  const lerAvisos: Contexto['lerAvisos'] = useCallback(async (ids) => {
    const agora = new Date().toISOString()
    // Otimista: quem clicou no sino não pode ver o contador piscar de volta.
    setAvisos((a) => a.map((x) =>
      (!ids || ids.includes(x.id)) && !x.lido_em ? { ...x, lido_em: agora } : x))
    const { error } = await sb.rpc('ler_avisos', { p_ids: ids ?? null })
    if (error) falhou(error, 'Não deu para marcar os avisos como lidos.')
  }, [sb, falhou])

  const apagarAviso: Contexto['apagarAviso'] = useCallback(async (id) => {
    setAvisos((a) => a.filter((x) => x.id !== id))
    const { error } = await sb.from('avisos').delete().eq('id', id)
    if (error) { falhou(error, 'Não deu para apagar o aviso.'); recarregar() }
  }, [sb, falhou, recarregar])

  const salvarContato: Contexto['salvarContato'] = useCallback(async (d) => {
    const corpo = {
      perfil_id: eu.id,
      telefone: d.telefone ?? contato?.telefone ?? '',
      whats: d.whats ?? contato?.whats ?? false,
      push: d.push ?? contato?.push ?? true,
      so_urgente: d.so_urgente ?? contato?.so_urgente ?? false,
      calado_de: d.calado_de ?? contato?.calado_de ?? null,
      calado_ate: d.calado_ate ?? contato?.calado_ate ?? null,
      mexido_em: new Date().toISOString(),
    }
    setContato(corpo as AvisoContato)
    const { error } = await sb.from('avisos_contato').upsert(corpo, { onConflict: 'perfil_id' })
    if (error) { falhou(error, 'Não deu para salvar como você quer ser avisado.'); recarregar() }
  }, [sb, eu.id, contato, falhou, recarregar])

  /** Liga o push neste aparelho. Devolve se deu certo, para a tela explicar. */
  const ligarPushAqui: Contexto['ligarPushAqui'] = useCallback(async () => {
    const { ligarPush } = await import('@/lib/push')
    const assin = await ligarPush()
    if (!assin) return false
    const { error } = await sb.from('push_assinaturas').upsert({
      perfil_id: eu.id,
      endpoint: assin.endpoint, p256dh: assin.p256dh, auth: assin.auth,
      aparelho: assin.aparelho,
    }, { onConflict: 'endpoint' })
    if (error) { falhou(error, 'Não deu para guardar este aparelho.'); return false }
    await salvarContato({ push: true })
    recarregar()
    return true
  }, [sb, eu.id, falhou, recarregar, salvarContato])

  const desligarPushAqui: Contexto['desligarPushAqui'] = useCallback(async () => {
    const { desligarPush } = await import('@/lib/push')
    const endpoint = await desligarPush()
    if (endpoint) await sb.from('push_assinaturas').delete().eq('endpoint', endpoint)
    recarregar()
  }, [sb, recarregar])

  const esquecerAparelho: Contexto['esquecerAparelho'] = useCallback(async (id) => {
    const { error } = await sb.from('push_assinaturas').delete().eq('id', id)
    if (error) return falhou(error, 'Não deu para esquecer este aparelho.')
    recarregar()
  }, [sb, falhou, recarregar])

  // ------------------------------------------------------------- notas

  /**
   * Cria ou salva uma nota. Devolve o id, porque quem acabou de criar uma nota
   * quase sempre quer abri-la em seguida.
   *
   * mexido_em é escrito aqui, e não por gatilho, porque ele serve para ordenar a
   * lista pelo que a pessoa tocou por último, que é a ordem que faz uma pilha de
   * notas parecer com uma mesa de trabalho.
   */
  const salvarNota: Contexto['salvarNota'] = useCallback(async (n) => {
    const titulo = String(n.titulo || '').trim()
    const texto = String(n.texto || '')
    if (!titulo && !texto.trim()) { toast('Uma nota vazia não tem o que guardar.', true); return null }
    const corpo = {
      titulo: titulo || tituloDe(texto),
      texto,
      fixada: n.fixada ?? false,
      arquivada: n.arquivada ?? false,
      mexido_em: new Date().toISOString(),
    }
    if (n.id) {
      const { error } = await sb.from('notas').update(corpo).eq('id', n.id)
      if (error) { falhou(error, 'Não deu para salvar a nota.'); return null }
      recarregar()
      return n.id
    }
    const id = novoId()
    const { error } = await sb.from('notas').insert({
      ...corpo, id, dono_id: eu.id,
      mensagem_id: n.mensagem_id ?? null, item_id: n.item_id ?? null,
    })
    if (error) { falhou(error, 'Não deu para guardar a nota.'); return null }
    recarregar()
    return id
  }, [sb, eu.id, falhou, toast, recarregar])

  const excluirNota: Contexto['excluirNota'] = useCallback(async (id) => {
    const { error } = await sb.from('notas').delete().eq('id', id)
    if (error) return falhou(error, 'Não deu para apagar a nota.')
    recarregar()
  }, [sb, falhou, recarregar])

  /**
   * O canal de despejo: o caderno de bolso em forma de conversa.
   *
   * É um canal como qualquer outro, do tipo pessoal, com um membro só. Ser um
   * canal de verdade é o que faz ele herdar tudo de graça: áudio com transcrição,
   * anexo, busca, leitura da conversa, tempo real. Um campo de texto novo em
   * algum canto da tela não teria nada disso.
   */
  const meuDespejo = useMemo(
    () => canais.find((c) => c.tipo === 'pessoal' && c.criado_por === eu.id) || null,
    [canais, eu.id],
  )

  const abrirDespejo: Contexto['abrirDespejo'] = useCallback(async () => {
    if (meuDespejo) return meuDespejo.id
    const { data, error } = await sb.from('canais').insert({
      nome: 'Meu despejo',
      descricao: 'Só você entra aqui. Jogue tudo dentro e a leitura separa depois.',
      tipo: 'pessoal', criado_por: eu.id,
    }).select('id').single()
    const id = (data as { id: string } | null)?.id
    if (error || !id) { falhou(error, 'Não deu para abrir o despejo.'); return null }
    // Sem a linha de membro ninguém entra, nem quem criou: é a mesma regra do
    // canal fechado, e é ela que mantém o caderno sendo caderno.
    await sb.from('canal_membros').insert({ canal_id: id, perfil_id: eu.id })
    recarregar()
    return id
  }, [sb, eu.id, meuDespejo, falhou, recarregar])

  /**
   * A lista pessoal: uma esteira de uma etapa só, visível apenas para o dono.
   *
   * Parece contradição ter uma esteira sem checkpoint num app de checkpoint, e
   * não é: o checkpoint existe para alguém aprovar a saída de uma etapa, e não
   * tem ninguém para aprovar a sua lista de recados. Uma etapa só, sem
   * aprovador, é a forma honesta disso dentro do modelo que já existe.
   */
  const minhaLista = useMemo(
    () => todosFluxos.find((f) => f.nome === NOME_DA_LISTA && f.dono_id === eu.id) || null,
    [todosFluxos, eu.id],
  )

  const abrirMinhaLista: Contexto['abrirMinhaLista'] = useCallback(async () => {
    if (minhaLista) return minhaLista.id
    return salvarFluxo({
      nome: NOME_DA_LISTA, tipo: 'esteira', area_id: null, empresa_id: empresaAtiva,
      dono_id: eu.id, autor_id: eu.id, visib: 'so_eu', freq: null, periodo: null,
      pessoas: [],
    }, [{ id: null, nome: 'A fazer', criterio: '', aprovador_id: null, prazo: '' }])
  }, [minhaLista, salvarFluxo, eu.id, empresaAtiva])

  /**
   * A tarefa avulsa, do começo ao fim.
   *
   * Ela mora na lista pessoal, que é uma track privada com um checkpoint só.
   * Isto vive aqui e não no modal por um motivo prático: a lista pode não
   * existir ainda, e entre criá-la e ter ela em memória passa uma recarga. O
   * modal não tem como esperar por isso sem virar uma máquina de estados; aqui
   * dentro, basta perguntar o checkpoint ao banco na hora.
   */
  const criarAvulsa: Contexto['criarAvulsa'] = useCallback(async (texto, prazo, descricao) => {
    const t = texto.trim()
    if (!t) return null
    const id = minhaLista?.id || await abrirMinhaLista()
    if (!id) { toast('Não deu para abrir a sua lista.', true); return null }

    // O checkpoint vem do banco, e não do estado: acabada de nascer, a lista
    // ainda não chegou aqui.
    let etapaId = minhaLista?.etapas[0]?.id
    if (!etapaId) {
      const { data } = await sb.from('etapas').select('id')
        .eq('fluxo_id', id).order('ordem').limit(1).maybeSingle()
      etapaId = (data as { id: string } | null)?.id
    }
    if (!etapaId) { toast('A sua lista veio sem checkpoint. Tente de novo.', true); return null }

    const item = novoId()
    const { error } = await sb.from('itens').insert({
      id: item, etapa_id: etapaId, fluxo_id: id, texto: t, descricao: descricao?.trim() || '',
      resp_id: eu.id, prazo: prazo || null, priv: false, prazo_firme: false,
      autor_id: eu.id, ordem: Date.now() % 100000,
    })
    if (error) { falhou(error, 'Não deu para criar a tarefa.'); return null }
    toast('Tarefa avulsa criada.')
    recarregar()
    return item
  }, [sb, eu.id, minhaLista, abrirMinhaLista, falhou, toast, recarregar])

  // ------------------------------------------------------------- conectores

  /**
   * Cria ou edita um conector. Devolve o id, porque quem acabou de criar
   * precisa dele em seguida para guardar a chave.
   *
   * O dono é decidido aqui e vai explícito: sem dono é conector da casa, e a
   * política do banco só deixa admin criar assim. Com dono sou eu mesmo, e aí
   * qualquer pessoa da empresa pode, porque a conta ligada é dela.
   */
  const salvarConector: Contexto['salvarConector'] = useCallback(async (c) => {
    const corpo = {
      nome: String(c.nome || '').trim(),
      base_url: String(c.base_url || '').trim().replace(/\/+$/, ''),
      auth_tipo: c.auth_tipo || 'bearer',
      auth_nome: String(c.auth_nome || '').trim(),
      ativo: c.ativo ?? true,
      dono_id: c.dono_id ?? null,
    }
    if (!corpo.nome) { toast('O conector precisa de um nome.', true); return null }
    if (!corpo.base_url.startsWith('https://')) {
      toast('O endereço precisa começar com https://, senão a chave viaja aberta.', true)
      return null
    }
    if (c.id) {
      const { error } = await sb.from('conectores').update(corpo).eq('id', c.id)
      if (error) { falhou(error, 'Conector da empresa é mexido por administrador.'); return null }
      toast('Conector salvo.')
      recarregar()
      return c.id
    }
    const { data, error } = await sb.from('conectores')
      .insert({ ...corpo, criado_por: eu.id, dica: '' }).select('id').single()
    if (error) { falhou(error, 'Conector da empresa é criado por administrador.'); return null }
    recarregar()
    return (data as { id: string } | null)?.id || null
  }, [sb, eu.id, falhou, toast, recarregar])

  /**
   * Manda a chave para o servidor cifrar.
   *
   * O texto passa por aqui uma vez e só. No modo demonstração não existe
   * servidor para cifrar, então a chave não é guardada de jeito nenhum: fica só
   * a dica, e a tela diz isso em voz alta.
   */
  const guardarChave: Contexto['guardarChave'] = useCallback(async (id, segredo) => {
    const limpo = segredo.trim()
    if (!limpo) { toast('Cole a chave antes de salvar.', true); return false }
    if (MODO_LOCAL) {
      const dica = limpo.length <= 4 ? '••••' : `••••${limpo.slice(-4)}`
      await sb.from('conectores').update({ dica }).eq('id', id)
      toast('Modo demonstração: a chave não foi guardada, só a dica dela.')
      recarregar()
      return true
    }
    try {
      const r = await fetch('/api/conector', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, segredo: limpo }),
      })
      const j = await r.json()
      if (!r.ok) { toast(j.erro || 'Não deu para guardar a chave.', true); return false }
      toast('Chave guardada, cifrada. Ela não aparece mais em tela nenhuma.')
      recarregar()
      return true
    } catch {
      toast('Não deu para falar com o servidor.', true)
      return false
    }
  }, [sb, toast, recarregar])

  const excluirConector: Contexto['excluirConector'] = useCallback(async (id) => {
    const { error } = await sb.from('conectores').delete().eq('id', id)
    if (error) return falhou(error, 'Conector da empresa é removido por administrador.')
    toast('Conector removido. Os agentes que usavam ele param de chamar.')
    recarregar()
  }, [sb, falhou, toast, recarregar])

  /** Bate na porta do serviço com a chave guardada, para ver se ela funciona. */
  const testarConector: Contexto['testarConector'] = useCallback(async (id, caminho) => {
    if (MODO_LOCAL) return 'No modo demonstração a chamada não sai daqui.'
    try {
      const r = await fetch('/api/conector', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, caminho, teste: true }),
      })
      const j = await r.json()
      if (j.erro) return j.erro
      if (j.ok) return `Respondeu ${j.status}. A chave funciona.`
      if (j.status === 401 || j.status === 403) return `Respondeu ${j.status}: o serviço recusou a chave.`
      if (j.status === 404) return `Respondeu 404: a chave passou, mas esse caminho não existe lá.`
      return `Respondeu ${j.status}. ${String(j.resposta || '').slice(0, 160)}`
    } catch {
      return 'Não deu para falar com o servidor.'
    }
  }, [])

  // ------------------------------------------------------------- memória

  /**
   * Guarda o que a casa ensinou, somando peso ao que já existia.
   *
   * Peso é confirmação: a mesma lição chegando de novo vale mais, e é isso que
   * separa hábito de coincidência. O upsert é por (tipo, chave), então a memória
   * não cresce sem limite conforme a empresa conversa.
   */
  const guardar = useCallback(async (licoes: Aprendizado[]) => {
    if (!licoes.length) return
    for (const l of licoes) {
      const antiga = memoria.find((m) => m.tipo === l.tipo && m.chave === l.chave)
      if (antiga) {
        await sb.from('memoria').update({
          peso: antiga.peso + 1, valor: l.valor, visto_em: new Date().toISOString(),
        }).eq('id', antiga.id)
      } else {
        await sb.from('memoria').insert({
          tipo: l.tipo, chave: l.chave, valor: l.valor,
          fluxo_id: l.fluxo_id ?? null, area_id: l.area_id ?? null,
          perfil_id: l.perfil_id ?? null, exemplo: l.exemplo, peso: 1,
          visto_em: new Date().toISOString(),
        })
      }
    }
  }, [sb, memoria])

  const esquecer: Contexto['esquecer'] = useCallback(async (id) => {
    const { error } = await sb.from('memoria').delete().eq('id', id)
    if (error) return falhou(error, 'Não foi possível esquecer isto.')
    toast('Esquecido. A leitura não vai mais usar isso.')
    recarregar()
  }, [sb, falhou, toast, recarregar])

  // -------------------------------------------------------- prazo em cascata

  const preverCascata: Contexto['preverCascata'] = useCallback(async (item, novo) => {
    const { data, error } = await sb.rpc('cascata', { p_item: item.id, p_novo: novo })
    if (error) { falhou(error, 'Não foi possível calcular o efeito.'); return [] }
    return (data || []) as NaCascata[]
  }, [sb, falhou])

  const moverPrazo: Contexto['moverPrazo'] = useCallback(async (item, novo, motivo) => {
    const { data, error } = await sb.rpc('aplicar_cascata', {
      p_item: item.id, p_novo: novo, p_motivo: motivo,
    })
    if (error) { falhou(error, 'Não foi possível mudar o prazo.'); return false }
    const r = (data || {}) as { mexi?: number; pedi?: number; presas?: number }
    const partes = ['Prazo alterado.']
    if (r.mexi) partes.push(`${r.mexi} ${r.mexi === 1 ? 'tarefa andou' : 'tarefas andaram'} junto.`)
    if (r.pedi) partes.push(`${r.pedi} ${r.pedi === 1 ? 'pedido' : 'pedidos'} ${r.pedi === 1 ? 'espera' : 'esperam'} aceite.`)
    if (r.presas) partes.push(`${r.presas} com data firme não ${r.presas === 1 ? 'andou' : 'andaram'}.`)
    toast(partes.join(' '))
    recarregar()
    return true
  }, [sb, falhou, toast, recarregar])

  const decidirPrazo: Contexto['decidirPrazo'] = useCallback(async (p, aceita) => {
    const { error } = await sb.rpc('decidir_prazo', { p_pedido: p.id, p_aceita: aceita })
    if (error) return falhou(error, 'Não foi possível decidir o pedido.')
    toast(aceita ? 'Prazo remarcado.' : 'Pedido recusado. A data fica onde está.')
    recarregar()
  }, [sb, falhou, toast, recarregar])

  const decidir: Contexto['decidir'] = useCallback(async (f, d) => {
    const et = etapaAtual(f)
    const proxima = f.etapas[f.atual + 1]
    const { data, error } = await sb.rpc('decidir_etapa', {
      p_fluxo: f.id,
      p_tipo: d.tipo,
      p_nota: d.nota || '',
      p_reabrir: d.reabrir || [],
      p_periodo: f.tipo === 'ciclo' ? proxPeriodo(f.periodo, f.freq) : null,
      p_prazo: d.prazo || null,
    })
    if (error) { falhou(error, 'Não foi possível registrar a decisão.'); return false }
    if (data === 'devolveu') toast(`${et?.nome} devolvido. Quem responde já foi avisado na esteira.`)
    else if (data === 'avancou') {
      toast(d.tipo === 'ressalva'
        ? `${et?.nome} aprovado com ressalva. A pendência virou tarefa em ${proxima?.nome}.`
        : `${et?.nome} aprovado. Avançou para ${proxima?.nome}.`)
    } else if (data === 'volta') toast(`${f.periodo} fechada. ${proxPeriodo(f.periodo, f.freq)} iniciada.`)
    else toast('Projeto concluído.')
    recarregar()
    return true
  }, [sb, falhou, toast, recarregar])

  const aprovar: Contexto['aprovar'] = useCallback(async (f) => {
    const et = etapaAtual(f)
    const proxima = f.etapas[f.atual + 1]
    const { data, error } = await sb.rpc('aprovar_etapa', {
      p_fluxo: f.id,
      p_periodo: f.tipo === 'ciclo' ? proxPeriodo(f.periodo, f.freq) : null,
    })
    if (error) return falhou(error, 'Não foi possível aprovar.')
    if (data === 'avancou') toast(`${et?.nome} aprovado. Avançou para ${proxima?.nome}.`)
    else if (data === 'volta') toast(`${f.periodo} fechada. ${proxPeriodo(f.periodo, f.freq)} iniciada.`)
    else toast('Projeto concluído.')
    recarregar()
  }, [sb, falhou, toast, recarregar])

  const salvarEmpresa: Contexto['salvarEmpresa'] = useCallback(async (d) => {
    const corpo = { nome: d.nome, sigla: d.sigla.toUpperCase(), cor: d.cor }
    const { error } = d.id
      ? await sb.from('empresas').update(corpo).eq('id', d.id)
      : await sb.from('empresas').insert({ ...corpo, ordem: empresas.length })
    if (error) return falhou(error, 'Não foi possível salvar.')
    toast('Salvo.')
    recarregar()
  }, [sb, empresas.length, falhou, toast, recarregar])

  const excluirEmpresa: Contexto['excluirEmpresa'] = useCallback(async (id) => {
    const { error } = await sb.from('empresas').delete().eq('id', id)
    if (error) return falhou(error, 'Não foi possível excluir.')
    if (empresaAtiva === id) focarEmpresa(null)
    toast('Excluído.')
    recarregar()
  }, [sb, empresaAtiva, focarEmpresa, falhou, toast, recarregar])

  /** Trocar de espaço recarrega o app inteiro: é outro lugar, com outros dados. */
  const trocarEspaco: Contexto['trocarEspaco'] = useCallback(async (perfilId) => {
    const { error } = await sb.rpc('trocar_espaco', { p_perfil: perfilId })
    if (error) return falhou(error, 'Não foi possível trocar de espaço.')
    location.reload()
  }, [sb, falhou])

  const abrirEspaco: Contexto['abrirEspaco'] = useCallback(async (nome, tipo) => {
    const { error } = await sb.rpc('abrir_espaco', { p_nome: nome, p_tipo: tipo })
    if (error) return falhou(error, 'Não foi possível abrir o espaço.')
    location.reload()
  }, [sb, falhou])

  const salvarOrg: Contexto['salvarOrg'] = useCallback(async (d) => {
    const { error } = await sb.from('organizacoes').update(d).eq('id', org.id)
    if (error) return falhou(error, 'Não foi possível salvar.')
    setOrg((c) => ({ ...c, ...d }))
    toast('Salvo.')
    recarregar()
  }, [sb, org.id, falhou, toast, recarregar])

  const salvarCompromisso: Contexto['salvarCompromisso'] = useCallback(async (d) => {
    const corpo = {
      titulo: d.titulo, quando: d.quando, inicio: d.inicio || null, fim: d.fim || null,
      local: d.local || '', nota: d.nota || '', bloqueia: !!d.bloqueia, visivel: !!d.visivel,
      fluxo_id: d.fluxo_id || null,
    }
    let id = d.id
    if (id) {
      const { error } = await sb.from('compromissos').update(corpo).eq('id', id)
      if (error) { falhou(error, 'Só quem organiza o compromisso pode alterá-lo.'); return null }
      await sb.from('convidados').delete().eq('compromisso_id', id)
    } else {
      const { data, error } = await sb
        .from('compromissos').insert({ ...corpo, id: novoId(), dono_id: eu.id })
        .select().maybeSingle()
      if (error) { falhou(error, 'Não foi possível salvar o compromisso.'); return null }
      id = (data as Compromisso).id
    }
    for (const perfil_id of d.convidados) {
      if (perfil_id === eu.id) continue
      await sb.from('convidados').insert({ compromisso_id: id, perfil_id })
    }
    toast(d.id ? 'Compromisso salvo.' : 'Compromisso marcado.')
    recarregar()
    return id || null
  }, [sb, eu.id, falhou, toast, recarregar])

  const excluirCompromisso: Contexto['excluirCompromisso'] = useCallback(async (id) => {
    const { error } = await sb.from('compromissos').delete().eq('id', id)
    if (error) return falhou(error, 'Só quem organiza o compromisso pode excluí-lo.')
    toast('Compromisso removido.')
    recarregar()
  }, [sb, falhou, toast, recarregar])

  /**
   * Lê o calendário de fora pela nossa rota, que devolve apenas intervalos, e
   * regrava a ocupação. A url fica guardada só na linha do próprio dono.
   */
  const ligarAgendaExterna: Contexto['ligarAgendaExterna'] = useCallback(async (url) => {
    const r = await fetch('/api/agenda-externa', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url }),
    })
    const corpo = await r.json().catch(() => ({}))
    if (!r.ok) { toast(corpo.erro || 'Não foi possível ler essa agenda.', true); return null }

    const linhas: { perfil_id: string; quando: string; inicio: string | null; fim: string | null }[] = []
    const hh = (x: Date) =>
      `${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`

    for (const b of corpo.blocos as { inicio: string; fim: string; diaInteiro: boolean }[]) {
      const i = new Date(b.inicio), f = new Date(b.fim)
      if (b.diaInteiro) {
        const d = new Date(i.getFullYear(), i.getMonth(), i.getDate())
        const ate = new Date(f.getFullYear(), f.getMonth(), f.getDate())
        let voltas = 0
        do {
          linhas.push({ perfil_id: eu.id, quando: iso(d), inicio: null, fim: null })
          d.setDate(d.getDate() + 1)
        } while (d < ate && ++voltas < 60)
        continue
      }
      const mesmoDia = iso(i) === iso(f)
      linhas.push({
        perfil_id: eu.id, quando: iso(i), inicio: hh(i), fim: mesmoDia ? hh(f) : '23:59',
      })
    }

    await sb.from('ocupacao_externa').delete().eq('perfil_id', eu.id)
    for (const l of linhas) await sb.from('ocupacao_externa').insert(l)
    await sb.from('agendas_externas').delete().eq('perfil_id', eu.id)
    await sb.from('agendas_externas').insert({
      perfil_id: eu.id, url, nome: corpo.nome || 'Agenda externa', lido_em: corpo.lido_em,
    })
    toast(linhas.length ? `${linhas.length} horários ocupados importados.` : 'Nada ocupado na janela lida.')
    recarregar()
    return { blocos: linhas.length }
  }, [sb, eu.id, toast, recarregar])

  const desligarAgendaExterna: Contexto['desligarAgendaExterna'] = useCallback(async () => {
    await sb.from('ocupacao_externa').delete().eq('perfil_id', eu.id)
    await sb.from('agendas_externas').delete().eq('perfil_id', eu.id)
    toast('Agenda externa desligada.')
    recarregar()
  }, [sb, eu.id, toast, recarregar])

  /** Código curto, sem caracteres que a pessoa confunde ao digitar. */
  const novoCodigo = () => {
    const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let c = ''
    for (let k = 0; k < 6; k++) c += letras[Math.floor(Math.random() * letras.length)]
    return c
  }

  const criarConvite: Contexto['criarConvite'] = useCallback(async (d) => {
    const { data, error } = await sb.from('convites').insert({
      email: d.email.trim().toLowerCase(),
      nome: d.nome.trim(),
      codigo: novoCodigo(),
      papel: d.papel,
      area_id: d.area_id,
      gestor_id: d.gestor_id,
      ve_area: d.ve_area,
      criado_por: eu.id,
    }).select().single()
    if (error) {
      falhou(error, 'Não foi possível criar o convite. Talvez já exista um aberto para este e-mail.')
      return null
    }
    toast('Convite criado.')
    recarregar()
    return data as Convite
  }, [sb, eu.id, falhou, toast, recarregar])

  const excluirConvite: Contexto['excluirConvite'] = useCallback(async (id) => {
    const { error } = await sb.from('convites').delete().eq('id', id)
    if (error) return falhou(error, 'Não foi possível cancelar o convite.')
    toast('Convite cancelado.')
    recarregar()
  }, [sb, falhou, toast, recarregar])

  const salvarProcesso: Contexto['salvarProcesso'] = useCallback(async (proc, etapas) => {
    const { data, error } = await sb.rpc('salvar_processo', { p_processo: proc, p_etapas: etapas })
    if (error) { falhou(error, 'Não foi possível salvar o processo.'); return null }
    toast('Processo salvo.')
    recarregar()
    return data as string
  }, [sb, falhou, toast, recarregar])

  const excluirProcesso: Contexto['excluirProcesso'] = useCallback(async (id) => {
    const { error } = await sb.from('processos').delete().eq('id', id)
    if (error) return falhou(error, 'Não foi possível excluir o processo.')
    toast('Processo excluído.')
    recarregar()
  }, [sb, falhou, toast, recarregar])

  /** Copiar é o caminho natural para variar um processo sem perder o original. */
  const duplicarProcesso: Contexto['duplicarProcesso'] = useCallback(async (id) => {
    const p = processos.find((x) => x.id === id)
    if (!p) return null
    const novo = await salvarProcesso(
      { id: null, nome: `${p.nome} (cópia)`, descricao: p.descricao, tipo: p.tipo, area_id: p.area_id },
      p.etapas.map((e) => ({
        id: null, nome: e.nome, criterio: e.criterio,
        aprovador_area_id: e.aprovador_area_id, dias: e.dias,
        itens: e.itens.map((i) => ({ id: null, texto: i.texto, area_id: i.area_id, dias: i.dias })),
      })),
    )
    return novo
  }, [processos, salvarProcesso])

  const criarDoProcesso: Contexto['criarDoProcesso'] = useCallback(
    async (processoId, dados, pessoas, inicio) => {
      const { data, error } = await sb.rpc('criar_do_processo', {
        p_processo: processoId, p_fluxo: dados, p_pessoas: pessoas, p_inicio: inicio,
      })
      if (error) { falhou(error, 'Não foi possível criar a partir do processo.'); return null }
      if (Array.isArray(dados.pessoas)) await gravarConvidados(data as string, dados.pessoas as string[])
      recarregar()
      return data as string
    },
    [sb, falhou, recarregar, gravarConvidados],
  )

  const salvarPerfil: Contexto['salvarPerfil'] = useCallback(async (id, d) => {
    const { error } = await sb.from('perfis').update(d).eq('id', id)
    if (error) return falhou(error, 'Não foi possível salvar.')
    toast('Salvo.')
    recarregar()
  }, [sb, falhou, toast, recarregar])

  // -------------------------------------------------------------- conversa

  const mensagensDe = useCallback(
    (canalId: string) => mensagens.filter((m) => m.canal_id === canalId),
    [mensagens],
  )
  const sugestoesDe = useCallback(
    (canalId: string) => sugestoes.filter((s) => s.canal_id === canalId),
    [sugestoes],
  )

  /**
   * O que chegou em cada canal depois da última vez que abri, sem contar o que eu
   * mesmo escrevi. Numa passada só: a lateral, as abas e a lista de canais pedem
   * esta conta o tempo todo, e varrer as mensagens uma vez por canal não escala.
   */
  const porLer = useMemo(() => {
    const marca = new Map(canais.map((c) => [c.id, c.lido_em ? Date.parse(c.lido_em) : 0]))
    const conta = new Map<string, number>()
    const chamou = new Map<string, number>()
    for (const m of mensagens) {
      if (m.autor_id === eu.id) continue
      const limite = marca.get(m.canal_id)
      if (limite === undefined) continue
      if (Date.parse(m.criado_em) <= limite) continue
      conta.set(m.canal_id, (conta.get(m.canal_id) ?? 0) + 1)
      if (chama(m.texto, eu.nome)) chamou.set(m.canal_id, (chamou.get(m.canal_id) ?? 0) + 1)
    }
    return { conta, chamou }
  }, [canais, mensagens, eu.id, eu.nome])

  const naoLidas = useCallback((canalId: string) => porLer.conta.get(canalId) ?? 0, [porLer])
  const meChamaram = useCallback((canalId: string) => porLer.chamou.get(canalId) ?? 0, [porLer])

  const marcarLido: Contexto['marcarLido'] = useCallback(async (canalId) => {
    await sb.from('canal_membros')
      .upsert({ canal_id: canalId, perfil_id: eu.id, lido_em: new Date().toISOString() },
        { onConflict: 'canal_id,perfil_id' })
    setCanais((atual) => atual.map(
      (c) => (c.id === canalId ? { ...c, lido_em: new Date().toISOString() } : c),
    ))
  }, [sb, eu.id])

  const enviar: Contexto['enviar'] = useCallback(async (canalId, texto, respondeA = null) => {
    const limpo = texto.trim()
    if (!limpo) return
    const { error } = await sb.from('mensagens').insert({
      canal_id: canalId, autor_id: eu.id, texto: limpo, responde_a: respondeA, sistema: false,
    })
    if (error) return falhou(error, 'Não foi possível enviar.')
    recarregar()
  }, [sb, eu.id, falhou, recarregar])

  const enviarAudio: Contexto['enviarAudio'] = useCallback(async (canalId, g, respondeA = null) => {
    if (!org.id) { falhou(null, 'Organização ainda carregando. Tente de novo.'); return false }
    if (g.blob.size > LIMITE) {
      falhou(null, `O recado tem ${tamanhoLegivel(g.blob.size)}. O limite é ${tamanhoLegivel(LIMITE)}.`)
      return false
    }
    // Mesmo balde e mesma convenção de caminho dos anexos: começa pelo id da
    // organização, que é o que a política do Storage confere no envio.
    const caminho = `${org.id}/voz/${canalId}/${Date.now()}-${eu.id}.${extensaoDe(g.mime)}`
    const { error: erroArquivo } = await sb.storage.from('anexos').upload(caminho, g.blob)
    if (erroArquivo) { falhou(erroArquivo, 'Não foi possível enviar o recado.'); return false }

    const { error } = await sb.from('mensagens').insert({
      canal_id: canalId, autor_id: eu.id, texto: g.texto.trim(), responde_a: respondeA,
      sistema: false, audio_caminho: caminho,
      audio_segundos: Math.round(g.segundos), transcrito: !!g.texto.trim(),
    })
    if (error) {
      // Sem a mensagem, o arquivo sozinho é lixo.
      await sb.storage.from('anexos').remove([caminho])
      falhou(error, 'Não foi possível enviar o recado.')
      return false
    }
    recarregar()
    return true
  }, [sb, eu.id, org.id, falhou, recarregar])

  const abrirAudio: Contexto['abrirAudio'] = useCallback(async (m) => {
    if (!m.audio_caminho) return null
    const { data, error } = await sb.storage.from('anexos').createSignedUrl(m.audio_caminho, 600)
    if (error || !data?.signedUrl) { falhou(error, 'Não foi possível tocar o recado.'); return null }
    return data.signedUrl
  }, [sb, falhou])

  const apagarMensagem: Contexto['apagarMensagem'] = useCallback(async (m) => {
    const { error } = await sb.from('mensagens').delete().eq('id', m.id)
    if (error) return falhou(error, 'Só quem escreveu pode apagar.')
    // O áudio vai junto: mensagem apagada com arquivo de pé é lixo que ocupa.
    if (m.audio_caminho) await sb.storage.from('anexos').remove([m.audio_caminho])
    recarregar()
  }, [sb, falhou, recarregar])

  const salvarCanal: Contexto['salvarCanal'] = useCallback(async (d) => {
    const corpo = {
      nome: d.nome.trim(), descricao: d.descricao.trim(), tipo: d.tipo,
      area_id: d.area_id, fluxo_id: d.fluxo_id,
      empresa_id: org.multi ? empresaAtiva : null,
    }
    let id = d.id
    if (id) {
      const { error } = await sb.from('canais').update(corpo).eq('id', id)
      if (error) { falhou(error, 'Não foi possível salvar o canal.'); return null }
    } else {
      id = novoId()
      const { error } = await sb.from('canais')
        .insert({ ...corpo, id, criado_por: eu.id })
      if (error) { falhou(error, 'Não foi possível criar o canal.'); return null }
    }
    // Quem cria entra junto, senão criaria um canal fechado que nem ele abre.
    const querem = new Set([...d.membros, eu.id])
    const agora = new Date().toISOString()
    for (const perfil_id of querem) {
      await sb.from('canal_membros').upsert(
        { canal_id: id, perfil_id, lido_em: perfil_id === eu.id ? agora : null },
        { onConflict: 'canal_id,perfil_id' },
      )
    }
    if (d.id) {
      const antes = canais.find((c) => c.id === d.id)?.membros || []
      for (const fora of antes.filter((x) => !querem.has(x))) {
        await sb.from('canal_membros').delete().eq('canal_id', id).eq('perfil_id', fora)
      }
    }
    toast(d.id ? 'Canal salvo.' : 'Canal criado.')
    recarregar()
    return id ?? null
  }, [sb, eu.id, canais, org.multi, empresaAtiva, falhou, toast, recarregar])

  const excluirCanal: Contexto['excluirCanal'] = useCallback(async (id) => {
    const { error } = await sb.from('canais').delete().eq('id', id)
    if (error) return falhou(error, 'Só quem criou o canal pode excluí-lo.')
    toast('Canal excluído.')
    recarregar()
  }, [sb, falhou, toast, recarregar])

  /** Todas as tarefas que enxergo, para casar uma sugestão com o item dela. */
  const itemPorId = useCallback((id?: string | null) => {
    if (!id) return null
    for (const f of todosFluxos) {
      for (const et of f.etapas) {
        const achado = et.itens.find((i) => i.id === id)
        if (achado) return { fluxo: f, etapa: et, item: achado }
      }
    }
    return null
  }, [todosFluxos])

  const aceitarSugestao: Contexto['aceitarSugestao'] = useCallback(async (sug, ajuste, porIa = false) => {
    const dados: Alvo = { ...sug.dados, ...ajuste }
    const fluxo = todosFluxos.find((x) => x.id === dados.fluxo_id) || null
    let contou = ''

    if (sug.tipo === 'tarefa') {
      if (!fluxo) return toast('Escolha para qual projeto esta tarefa vai.', true)
      const et = fluxo.etapas.find((e) => e.id === dados.etapa_id)
        || fluxo.etapas[fluxo.atual] || fluxo.etapas[0]
      if (!et) return toast('Este projeto ainda não tem checkpoint.', true)
      const id = await adicionarItem(et, {
        texto: sug.texto, resp_id: dados.resp_id ?? null, prazo: dados.prazo || '', priv: false,
      }, porIa)
      if (!id) return
      // Guardamos o que nasceu daqui, senão não há como desfazer depois.
      dados.criou_id = id
      contou = `criou a tarefa "${sug.texto}" em ${fluxo.nome}`
    } else if (sug.tipo === 'concluir') {
      const achado = itemPorId(dados.item_id)
      if (!achado) return toast('A tarefa não existe mais.', true)
      if (!achado.item.feito) await alternarItem(achado.item, porIa)
      contou = `marcou "${achado.item.texto}" como feita`
    } else if (sug.tipo === 'prazo') {
      const achado = itemPorId(dados.item_id)
      if (!achado) return toast('A tarefa não existe mais.', true)
      if (!podeMexerNoPrazo(eu, achado.fluxo, perfis)) {
        return toast('Prazo é decisão de quem manda no processo.', true)
      }
      await editarItem(achado.item, {
        texto: achado.item.texto, resp_id: achado.item.resp_id,
        prazo: dados.prazo || '', priv: achado.item.priv,
      })
      contou = `mudou o prazo de "${achado.item.texto}"`
    } else if (sug.tipo === 'trava') {
      if (!fluxo) return toast('Esta proposta não aponta para um projeto.', true)
      await travar(fluxo, sug.texto.replace(/^Travar [^:]+:\s*/, ''))
      contou = `travou ${fluxo.nome}`
    } else if (sug.tipo === 'decisao') {
      if (fluxo) await logar(fluxo.id, `registrou da conversa: ${sug.texto}`, porIa)
      contou = fluxo ? `registrou a decisão em ${fluxo.nome}` : 'registrou a decisão'
    } else if (sug.tipo === 'agente') {
      const a = agentes.find((x) => x.id === dados.agente_id)
      if (!a) return toast('Este agente não existe mais.', true)
      if (!a.ativo) return toast(`O agente ${a.nome} está desligado.`, true)

      if (a.faz === 'processo') {
        if (!a.processo_id) return toast('Este agente não aponta para um processo.', true)
        const pr = processos.find((x) => x.id === a.processo_id)
        if (!pr) return toast('O processo deste agente não existe mais.', true)
        /**
         * A distribuição pelas áreas.
         *
         * criar_do_processo recebe um mapa de área para pessoa, e NÃO cai no
         * responsável da área por conta própria. Sem montar esse mapa, a esteira
         * nasce com tudo sem dono e tudo aprovado por quem aceitou, o que é o
         * contrário do que um agente serve para fazer: atravessar setores sem
         * ninguém encaminhar nada à mão.
         */
        const quemPorArea: Record<string, string> = {}
        for (const et of pr.etapas) {
          for (const id of [et.aprovador_area_id, ...et.itens.map((i) => i.area_id)]) {
            if (!id || quemPorArea[id]) continue
            const dono = areaDe(id).responsavel_id
            if (dono) quemPorArea[id] = dono
          }
        }

        const novo = await criarDoProcesso(pr.id, {
          nome: pr.nome, area_id: pr.area_id, empresa_id: empresaAtiva,
          dono_id: eu.id, visib: 'equipe', pessoas: [], freq: null, periodo: null,
        }, quemPorArea, hojeIso())
        if (!novo) return
        dados.abriu_id = novo
        contou = `abriu ${pr.nome} pelo agente ${a.nome}`
      } else if (a.faz === 'tarefa') {
        const alvo = todosFluxos.find(
          (f) => !f.concluido && f.area_id === a.tarefa_area_id && f.tipo === 'ciclo',
        ) || todosFluxos.find((f) => !f.concluido && f.area_id === a.tarefa_area_id)
        const et = alvo?.etapas[alvo.atual] || alvo?.etapas[0]
        if (!alvo || !et) {
          return toast(`${areaDe(a.tarefa_area_id).nome} ainda não tem esteira para receber a tarefa.`, true)
        }
        const id = await adicionarItem(et, {
          texto: a.tarefa_texto, resp_id: areaDe(a.tarefa_area_id).responsavel_id,
          prazo: '', priv: false,
        }, porIa)
        if (!id) return
        dados.criou_id = id
        contou = `criou "${a.tarefa_texto}" em ${alvo.nome} pelo agente ${a.nome}`
      } else if (a.faz === 'conector') {
        /**
         * Chamar um serviço de fora pelo conector da casa ou da pessoa.
         *
         * O navegador manda o id do agente, o caminho e o corpo já preenchidos, e
         * mais nada: a chave e o endereço do serviço moram no banco e são
         * resolvidos no servidor. Assim nem quem inspeciona a rede daqui vê a
         * chave, e nem um pedido alterado consegue mandar a chave do cliente para
         * outro lugar.
         */
        if (!a.conector_id) return toast(`O agente ${a.nome} não diz qual conector chamar.`, true)
        const cn = conectores.find((x) => x.id === a.conector_id)
        if (!cn) return toast('O conector desse agente não existe mais.', true)
        if (!cn.ativo) return toast(`O conector ${cn.nome} está desligado.`, true)
        if (MODO_LOCAL) {
          toast(`Modo demonstração: a chamada para ${cn.nome} não sai daqui.`)
        } else {
          try {
            const r = await fetch('/api/conector', {
              method: 'POST', headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                id: cn.id,
                caminho: a.caminho,
                corpo: preencher(a.corpo || '{}', sug.motivo || '', a.nome),
              }),
            })
            const volta = await r.json() as { ok?: boolean; status?: number; erro?: string }
            if (volta.erro) toast(volta.erro, true)
            else if (!volta.ok) toast(`${cn.nome} respondeu ${volta.status}.`, true)
          } catch {
            toast(`Não consegui chamar ${cn.nome}.`, true)
          }
        }
        contou = `chamou ${cn.nome} pelo agente ${a.nome}`
      } else {
        // O endereço vem do banco, na rota: o navegador só manda o id do agente.
        try {
          const r = await fetch('/api/webhook', {
            method: 'POST', headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ agente_id: a.id, contexto: { motivo: sug.motivo } }),
          })
          const volta = await r.json() as { ok?: boolean; erro?: string }
          if (!volta.ok) toast(volta.erro || 'O endereço não respondeu.', true)
        } catch {
          toast('Não consegui chamar o endereço do agente.', true)
        }
        contou = `avisou o endereço do agente ${a.nome}`
      }

      await sb.from('agentes').update({
        // (a.disparos ?? 0) porque linha vinda de banco antigo, ou do modo
        // demonstração, pode chegar sem o campo, e undefined + 1 é NaN.
        disparos: (a.disparos ?? 0) + 1, disparado_em: new Date().toISOString(),
      }).eq('id', a.id)
    } else if (sug.tipo === 'nota') {
      /**
       * Guardar como nota.
       *
       * O texto da nota é o TRECHO que a pessoa escreveu (motivo), não o resumo
       * que a leitura fez (texto). O resumo serve para ela reconhecer a proposta
       * numa linha; o que ela quer guardar é o pensamento dela, com as palavras
       * dela. Guardar o resumo seria jogar fora justamente a parte que valia.
       */
      const corpo = sug.motivo?.trim() || sug.texto
      /**
       * O título vem do resumo quando existe um resumo de verdade.
       *
       * Com modelo, texto é uma frase curta escrita para ser lida, e é o melhor
       * título possível. Sem modelo, texto é o começo do despejo cortado com
       * três pontos, e três pontos no título de uma nota fica feio e não ajuda a
       * achar nada: aí é melhor recortar do texto inteiro.
       */
      const resumo = sug.texto?.trim() || ''
      const titulo = resumo && !resumo.endsWith('...') ? resumo : tituloDe(corpo)
      const id = await salvarNota({ titulo, texto: corpo, mensagem_id: sug.mensagem_id })
      if (!id) return
      dados.nota_id = id
      contou = `guardou a nota "${titulo}"`
    } else if (sug.tipo === 'compromisso') {
      if (!dados.quando) return toast('A proposta não diz o dia.', true)
      const id = await salvarCompromisso({
        titulo: sug.texto, quando: dados.quando, inicio: dados.inicio || null,
        nota: sug.motivo || '', bloqueia: true, visivel: true, convidados: [],
      })
      if (!id) return
      dados.compromisso_id = id
      contou = `marcou "${sug.texto}" para ${curta(dados.quando)}`
    } else if (sug.tipo === 'distribuir') {
      const achado = itemPorId(dados.item_id)
      if (!achado) return toast('A tarefa não existe mais.', true)
      if (achado.item.resp_id) return toast('Esta tarefa já tem dono.', true)
      if (!dados.resp_id) return toast('A proposta não diz quem.', true)
      // Guardamos que estava vazia, para desfazer poder deixar vazia de novo.
      dados.de_resp_id = null
      await editarItem(achado.item, {
        texto: achado.item.texto, resp_id: dados.resp_id, prazo: achado.item.prazo || '',
        priv: achado.item.priv, firme: achado.item.prazo_firme, quieto: true,
      })
      await logar(achado.fluxo.id, `passou ${achado.item.texto} para ${nomeDe(dados.resp_id)}`, porIa)
      contou = `passou "${achado.item.texto}" para ${nomeDe(dados.resp_id)}`
    }

    // A casa acabou de ensinar algo: quem ela põe neste assunto. Vale mais quando
    // houve correção, e é justamente o caso que a máquina precisa aprender.
    await guardar(daDecisao(sug, true, dados.resp_id ?? null, nomeDe))

    await sb.from('sugestoes').update({
      estado: 'aceita',
      decidido_por: porIa ? null : eu.id,
      decidido_em: new Date().toISOString(),
      por_ia: porIa,
      dados,
    }).eq('id', sug.id)

    // A conversa fica sabendo do que saiu dela, senão o trabalho some do contexto.
    // Quando foi a leitura, a mensagem sai assinada por ela: é o aviso de que a
    // máquina mexeu em algo, e é o que permite saber depois quem fez o quê.
    if (contou) {
      await sb.from('mensagens').insert({
        canal_id: sug.canal_id, autor_id: porIa ? null : eu.id,
        texto: contou, sistema: true, por_ia: porIa, responde_a: null,
      })
    }
    recarregar()
  }, [sb, eu, perfis, todosFluxos, itemPorId, adicionarItem, alternarItem, editarItem, travar,
      logar, nomeDe, guardar, agentes, conectores, processos, areaDe, criarDoProcesso, empresaAtiva, toast, recarregar])

  /**
   * Volta atrás no que a leitura fez sozinha.
   *
   * Autonomia sem desfazer não é autonomia, é risco. Cada tipo sabe voltar ao
   * que era: a tarefa criada sai, a concluída reabre, o dono posto sai de novo.
   * Decisão registrada não desfaz, porque apagar linha do tempo é pior.
   */
  const desfazerSugestao: Contexto['desfazerSugestao'] = useCallback(async (sug) => {
    const d = sug.dados || {}

    if (sug.tipo === 'tarefa' && d.criou_id) {
      const achado = itemPorId(d.criou_id)
      if (achado) await excluirItem(achado.item)
    } else if (sug.tipo === 'concluir') {
      const achado = itemPorId(d.item_id)
      if (achado?.item.feito) await alternarItem(achado.item)
    } else if (sug.tipo === 'agente') {
      // A esteira que o agente abriu sai inteira, com checkpoints e tarefas. É a
      // única forma de desfazer de verdade: metade de um processo aberto é pior
      // do que o processo inteiro ou nenhum.
      if (d.abriu_id) await excluirFluxo(d.abriu_id)
      else if (d.criou_id) {
        const achado = itemPorId(d.criou_id)
        if (achado) await excluirItem(achado.item)
      }
      // Webhook e conector não desfazem: a chamada já saiu, e fingir que dá para
      // voltar seria pior do que dizer que não dá.
    } else if (sug.tipo === 'nota') {
      if (d.nota_id) await excluirNota(d.nota_id)
    } else if (sug.tipo === 'compromisso') {
      if (d.compromisso_id) await excluirCompromisso(d.compromisso_id)
    } else if (sug.tipo === 'distribuir') {
      const achado = itemPorId(d.item_id)
      if (achado) {
        await editarItem(achado.item, {
          texto: achado.item.texto, resp_id: d.de_resp_id ?? null,
          prazo: achado.item.prazo || '', priv: achado.item.priv,
          firme: achado.item.prazo_firme, quieto: true,
        })
      }
    }

    await sb.from('sugestoes').update({
      estado: 'recusada', desfeita_em: new Date().toISOString(), desfeita_por: eu.id,
    }).eq('id', sug.id)
    await sb.from('mensagens').insert({
      canal_id: sug.canal_id, autor_id: eu.id, sistema: true, responde_a: null,
      texto: `desfez o que a leitura tinha feito: ${sug.texto}`,
    })
    toast('Desfeito.')
    recarregar()
  }, [sb, eu.id, itemPorId, excluirItem, excluirFluxo, alternarItem, editarItem, toast, recarregar])

  // ------------------------------------------------- distribuir tarefas

  /**
   * A sobrecarga vive aqui, e não em cada tela, porque ela é usada em três
   * lugares que não se conhecem: o Desempenho, o formulário de tarefa e a
   * distribuição. Se cada um calculasse do seu jeito, os três dariam números
   * diferentes para a mesma pessoa, e aí nenhum valeria nada.
   */
  const cargas = useMemo(() => sobrecarga(fluxos, perfis, 30), [fluxos, perfis])

  const palpites = useMemo(
    () => distribuir(fluxos, processos, areas, perfis, cargas),
    [fluxos, processos, areas, perfis, cargas],
  )
  const porPessoaCarga = useMemo(
    () => new Map(cargas.map((c) => [c.pessoa.id, c])),
    [cargas],
  )
  const cargaDe = useCallback(
    (id: string | null) => (id && porPessoaCarga.get(id)) || null,
    [porPessoaCarga],
  )

  const distribuirTarefa: Contexto['distribuirTarefa'] = useCallback(async (p, porIa = false) => {
    await editarItem(p.item, {
      texto: p.item.texto, resp_id: p.resp_id, prazo: p.item.prazo || '',
      priv: p.item.priv, firme: p.item.prazo_firme, quieto: true,
    })
    await logar(p.fluxo.id, `passou ${p.item.texto} para ${p.nome}`, porIa)
    if (!porIa) toast(`${p.item.texto} agora é de ${p.nome}.`)
    recarregar()
  }, [editarItem, logar, toast, recarregar])

  const recusarSugestao: Contexto['recusarSugestao'] = useCallback(async (sug) => {
    await sb.from('sugestoes').update({
      estado: 'recusada', decidido_por: eu.id, decidido_em: new Date().toISOString(),
    }).eq('id', sug.id)
    // O sinal mais claro que existe: a empresa disse "isto não". Sem guardar, a
    // leitura repete o mesmo erro toda semana, e é assim que se desiste de IA.
    await guardar(daDecisao(sug, false, null, nomeDe))
    recarregar()
  }, [sb, eu.id, guardar, nomeDe, recarregar])

  /**
   * Manda a conversa para a leitura e guarda o que ela produziu.
   * Nada aqui encosta no trabalho de ninguém: o que volta são propostas, e é
   * alguém quem aceita. Com o modo "aplicar" ligado em Ajustes, tarefa nova e
   * tarefa concluída entram sozinhas; prazo e trava continuam pedindo licença.
   */
  const lerConversa: Contexto['lerConversa'] = useCallback(async (canalId) => {
    const canal = canais.find((c) => c.id === canalId)
    if (!canal) return null
    const doCanal = mensagens.filter((m) => m.canal_id === canalId && !m.sistema)
    if (!doCanal.length) { toast('Ainda não há conversa para ler.'); return null }

    const f = canal.fluxo_id ? todosFluxos.find((x) => x.id === canal.fluxo_id) : null
    const corpo: ContextoLeitura = {
      hoje: hojeIso(),
      mensagens: doCanal.slice(-40).map((m) => ({
        id: m.id, autor_id: m.autor_id, autor: nomeDe(m.autor_id), texto: m.texto,
      })),
      pessoas: perfis.filter((p) => p.ativo).map((p) => ({ id: p.id, nome: p.nome })),
      fluxo: f ? {
        id: f.id, nome: f.nome, etapa_id: f.etapas[f.atual]?.id ?? null,
        itens: f.etapas.flatMap((e) => e.itens.map((i) => ({
          id: i.id, texto: i.texto, resp_id: i.resp_id, feito: i.feito, prazo: i.prazo, etapa_id: e.id,
        }))),
      } : null,
      // O que a casa já ensinou vai junto no pedido: é assim que a leitura
      // melhora sem ninguém treinar nada.
      memoria: paraOModelo(memoria),
      canal_id: canalId,
      // Canal pessoal é despejo: uma pessoa falando sozinha para o app ouvir.
      // Muda o que a leitura procura, e o quanto ela se arrisca.
      despejo: canal.tipo === 'pessoal',
      // Os agentes que escutam este canal. É o modelo que julga se a conversa
      // fala daquela situação: palavra-chave não entende "o João não vem mais".
      agentes: agentes
        .filter((a) => escutaAqui(a, canal))
        .map((a) => ({
          id: a.id,
          nome: a.nome,
          reconhecer: a.reconhecer,
          faz: oQueFaz(a, (id) => processos.find((p) => p.id === id)?.nome || 'um processo',
            (id) => areaDe(id).nome),
        })),
    }

    let propostas: Proposta[] = []
    let motor = 'regras'
    try {
      const r = await fetch('/api/leitor', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corpo),
      })
      const volta = await r.json() as { propostas?: Proposta[]; motor?: string; porque?: string }
      propostas = volta.propostas || []
      motor = volta.motor || 'regras'
      if (volta.porque === 'teto') {
        toast('O teto de leituras com IA do mês foi atingido. A leitura usou as regras embutidas.')
      }
    } catch {
      toast('Não consegui ler a conversa agora.', true)
      return null
    }

    // Aprende as palavras desta frente. Precisa das mensagens dos OUTROS canais
    // para saber o que é vocabulário da casa e o que é português comum.
    // Sem chave de modelo, a rota devolve só o que as regras acharam. Os agentes
    // entram aqui, pelas palavras que a empresa escreveu, que é mais bruto e
    // ainda assim útil: é a diferença entre o agente existir e não existir.
    // No despejo o agente não entra: agente reconhece situação de empresa para
    // agir, e o caderno de bolso de uma pessoa não é lugar de disparar processo.
    if (motor === 'regras' && canal.tipo !== 'pessoal') {
      const jaVistasAgente = sugestoesDe(canalId)
      propostas = [...propostas, ...porPalavras(
        agentes, canal, doCanal, null,
        (agenteId, msgId) => jaVistasAgente.some(
          (v) => v.tipo === 'agente' && v.dados.agente_id === agenteId && v.mensagem_id === msgId,
        ),
      )]
    }

    const deFora = mensagens.filter((m) => m.canal_id !== canalId && !m.sistema)
    await guardar(termosDaConversa(
      canal, doCanal, deFora, f ?? null,
      ultimoAprendizado(canalId, memoria, canal),
    ))

    // Não volta o que já foi proposto, nem o padrão que a empresa já recusou
    // mais de uma vez. Este segundo corte é a memória em ação.
    const jaVistas = sugestoesDe(canalId)
    const novas = propostas
      .filter((p) => !jaVistas.some((v) => v.texto.trim().toLowerCase() === p.texto.trim().toLowerCase()))
      .filter((p) => !jaFoiRecusada(p, memoria))
      .map((p) => {
        // Sem responsável na proposta, a casa pode já ter ensinado quem costuma
        // pegar este assunto. É palpite, e por isso continua sendo proposta.
        if (p.dados.resp_id) return p
        const quem = quemCostuma(p.texto, memoria)
        return quem ? { ...p, dados: { ...p.dados, resp_id: quem } } : p
      })

    const gravadas: Sugestao[] = []
    for (const p of novas) {
      const { data } = await sb.from('sugestoes').insert({
        canal_id: canalId, mensagem_id: p.mensagem_id, tipo: p.tipo,
        texto: p.texto, motivo: p.motivo, dados: p.dados, estado: 'aberta',
      }).select().single()
      if (data) gravadas.push({ ...(data as Sugestao), dados: p.dados })
    }

    if (org.ia_modo === 'aplicar') {
      for (const g of gravadas) {
        // Prazo e trava nunca entram sozinhos: um mexe em compromisso com quem
        // espera, o outro para a frente inteira. Distribuir entra, porque só
        // preenche tarefa sem dono, e tirar dono de alguém não é caso dela.
        if (g.tipo === 'prazo' || g.tipo === 'trava') continue
        if (g.tipo === 'tarefa' && !g.dados.fluxo_id) continue
        // porIa: o que sai daqui fica assinado pela leitura, na linha do tempo e
        // na conversa. É o que permite saber depois o que foi gente e o que foi
        // máquina, e é o que dá para desfazer.
        await aceitarSugestao(g, undefined, true)
      }
    }

    recarregar()
    return { achou: novas.length, motor }
  }, [sb, canais, mensagens, perfis, todosFluxos, nomeDe, sugestoesDe, org.ia_modo,
      memoria, guardar, agentes, processos, areaDe, aceitarSugestao, toast, recarregar])

  const valor: Contexto = {
    eu, perfis, areas, empresas, org, pessoal: org.tipo === 'pessoal', fluxos, todosFluxos, totalItens, agenda, minhaAgendaExterna, processos, convites,
    empresaAtiva, focarEmpresa, empresaDe, carregando,
    perfilDe, nomeDe, areaDe, aviso, toast,
    salvarArea, excluirArea, salvarFluxo, excluirFluxo,
    travar, destravar, adicionarItem, editarItem, definirTravas, excluirItem, alternarItem, aprovar,
    salvarPerfil, salvarEmpresa, excluirEmpresa, salvarOrg,
    salvarCompromisso, excluirCompromisso, ligarAgendaExterna, desligarAgendaExterna,
    salvarProcesso, excluirProcesso, duplicarProcesso, criarDoProcesso,
    criarConvite, excluirConvite,
    canais, mensagens, sugestoes, mensagensDe, sugestoesDe, naoLidas, meChamaram,
    anexosDe, anexar, removerAnexo, abrirAnexo, decisoesDe, decidir,
    desfazerSugestao, palpites, distribuirTarefa, cargas, cargaDe,
    memoria, esquecer, consumo, agentes, salvarAgente, excluirAgente,
    conectores, salvarConector, guardarChave, excluirConector, testarConector,
    notas, salvarNota, excluirNota, meuDespejo, abrirDespejo, minhaLista, abrirMinhaLista, criarAvulsa,
    avisos, naoVistos: avisos.filter((a) => !a.lido_em).length,
    lerAvisos, apagarAviso, contato, salvarContato,
    aparelhos: aparelhos.filter((a) => a.perfil_id === eu.id),
    ligarPushAqui, desligarPushAqui, esquecerAparelho,
    preverCascata, moverPrazo, pedidosPrazo, decidirPrazo,
    enviar, enviarAudio, abrirAudio, apagarMensagem, marcarLido, salvarCanal, excluirCanal,
    lerConversa, aceitarSugestao, recusarSugestao,
    espacos, trocarEspaco, abrirEspaco,
  }

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}
