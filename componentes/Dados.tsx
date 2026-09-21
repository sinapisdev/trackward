'use client'

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
} from 'react'
import { supabase } from '@/lib/supabase/browser'
import { hojeIso } from '@/lib/datas'
import { proxPeriodo } from '@/lib/modelos'
import type { RascunhoEtapa } from '@/lib/modelos'
import { etapaAtual } from '@/lib/regras'
import type { AgendaExterna, Atividade, Canal, Compromisso, Espaco, Organizacao, Convite, Empresa, Etapa, Fluxo, Item, Mensagem, Papel, Perfil, Area, Processo, ProcessoEtapa, ProcessoItem, Sugestao, TipoCanal, Volta, Anexo, Decisao, TipoDecisao,
  } from '@/lib/tipos'
import { chama } from '@/lib/mencao'
import { nomeLimpo, preparar, LIMITE, tamanhoLegivel } from '@/lib/anexos'
import type { Contexto as ContextoLeitura, Proposta } from '@/lib/leitor'
import type { Alvo } from '@/lib/tipos'
import { iso } from '@/lib/datas'
import { itensVisiveis, podeMexerNoPrazo, veFluxo } from '@/lib/acesso'

type Aviso = { texto: string; erro: boolean; id: number }

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
  aviso: Aviso | null
  toast: (texto: string, erro?: boolean) => void
  salvarArea: (d: { id?: string; nome: string; cor: string; responsavel_id?: string | null }) => Promise<Area | null>
  excluirArea: (id: string) => Promise<void>
  salvarFluxo: (f: Record<string, unknown>, etapas: RascunhoEtapa[]) => Promise<string | null>
  excluirFluxo: (id: string) => Promise<void>
  travar: (f: Fluxo, motivo: string) => Promise<void>
  destravar: (f: Fluxo) => Promise<void>
  adicionarItem: (et: Etapa, d: { texto: string; resp_id: string | null; prazo: string; priv: boolean }) => Promise<string | null>
  editarItem: (item: Item, d: { texto: string; resp_id: string | null; prazo: string; priv: boolean }) => Promise<void>
  definirTravas: (item: Item, ids: string[]) => Promise<void>
  excluirItem: (item: Item) => Promise<void>
  alternarItem: (item: Item) => Promise<void>
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
  salvarPerfil: (id: string, d: Partial<Perfil>) => Promise<void>
  salvarEmpresa: (d: { id?: string; nome: string; sigla: string; cor: string }) => Promise<void>
  excluirEmpresa: (id: string) => Promise<void>
  salvarOrg: (d: Partial<Organizacao>) => Promise<void>
  salvarCompromisso: (d: Partial<Compromisso> & { convidados: string[] }) => Promise<void>
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
  apagarMensagem: (m: Mensagem) => Promise<void>
  marcarLido: (canalId: string) => Promise<void>
  salvarCanal: (d: {
    id?: string; nome: string; descricao: string; tipo: TipoCanal
    area_id: string | null; fluxo_id: string | null; membros: string[]
  }) => Promise<string | null>
  excluirCanal: (id: string) => Promise<void>
  /** Lê a conversa e guarda o que ela produziu, sem aplicar nada ainda. */
  lerConversa: (canalId: string) => Promise<{ achou: number; motor: string } | null>
  aceitarSugestao: (s: Sugestao, ajuste?: Alvo) => Promise<void>
  recusarSugestao: (s: Sugestao) => Promise<void>
}

const Ctx = createContext<Contexto | null>(null)

export function useDados() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useDados precisa estar dentro de <Dados>')
  return c
}

const SEM_PERFIL: Perfil = {
  id: '', user_id: '', nome: 'Sem responsável', email: '', cor: '#8A909C', papel: 'colaborador',
  area_id: null, gestor_id: null, ve_area: false, ativo: false, criado_em: '',
}
const SEM_AREA: Area = { id: '', nome: 'Sem área', cor: '#8A909C', ordem: 999, responsavel_id: null }
const ORG_PADRAO: Organizacao = {
  id: '', nome: 'Track', tipo: 'equipe', dominio: null, entrada_por_dominio: false,
  dono_id: null, multi: false, rotulo: 'Empresa', rotulo_plural: 'Empresas',
  ia_ativa: true, ia_modo: 'sugerir', criado_em: '',
}
const CHAVE_EMPRESA = 'track.empresa'

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
  const [canais, setCanais] = useState<Canal[]>([])
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([])
  const [espacos, setEspacos] = useState<Espaco[]>([])
  const [carregando, setCarregando] = useState(true)
  const [aviso, setAviso] = useState<Aviso | null>(null)
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
    const [p, s, f, e, i, h, a, em, cf, dp, cm, cv, oc, oe, ax, pr, pe, pi, fp, cvt, kn, km, ms, sg, esp, anx, dec] = await Promise.all([
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
    ])

    const listaPerfis = (p.data || []) as Perfil[]
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

  const falhou = useCallback((e: unknown, padrao: string) => {
    const msg = (e as { message?: string })?.message
    toast(msg && msg.length < 120 ? msg : padrao, true)
  }, [toast])

  const logar = useCallback(async (fluxo_id: string, texto: string) => {
    await sb.from('atividades').insert({ fluxo_id, quem_id: eu.id, texto })
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
      .insert({ ...corpo, ordem: areas.length })
      .select()
      .single()
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

  const adicionarItem: Contexto['adicionarItem'] = useCallback(async (et, d) => {
    const { data, error } = await sb.from('itens').insert({
      etapa_id: et.id,
      fluxo_id: et.fluxo_id,
      texto: d.texto,
      resp_id: d.resp_id,
      prazo: d.prazo || null,
      priv: d.priv,
      autor_id: eu.id,
      ordem: et.itens.length,
    }).select().single()
    if (error) { falhou(error, 'Não foi possível adicionar o item.'); return null }
    if (!d.priv) await logar(et.fluxo_id, `adicionou ${d.texto}`)
    toast('Item adicionado.')
    recarregar()
    return (data as Item | null)?.id ?? null
  }, [sb, eu.id, falhou, toast, recarregar, logar])

  const editarItem: Contexto['editarItem'] = useCallback(async (item, d) => {
    const { error } = await sb
      .from('itens')
      .update({ texto: d.texto, resp_id: d.resp_id, prazo: d.prazo || null, priv: d.priv })
      .eq('id', item.id)
    if (error) return falhou(error, 'Não foi possível salvar o item.')
    toast('Item salvo.')
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
  const alternarItem: Contexto['alternarItem'] = useCallback(async (item) => {
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
      if (!item.priv) await logar(item.fluxo_id, `concluiu ${item.texto}`)
      toast(`Concluído: ${item.texto}`)
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
      if (error) return falhou(error, 'Só quem organiza o compromisso pode alterá-lo.')
      await sb.from('convidados').delete().eq('compromisso_id', id)
    } else {
      const { data, error } = await sb
        .from('compromissos').insert({ ...corpo, dono_id: eu.id }).select().single()
      if (error) return falhou(error, 'Não foi possível salvar o compromisso.')
      id = (data as Compromisso).id
    }
    for (const perfil_id of d.convidados) {
      if (perfil_id === eu.id) continue
      await sb.from('convidados').insert({ compromisso_id: id, perfil_id })
    }
    toast(d.id ? 'Compromisso salvo.' : 'Compromisso marcado.')
    recarregar()
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

  const apagarMensagem: Contexto['apagarMensagem'] = useCallback(async (m) => {
    const { error } = await sb.from('mensagens').delete().eq('id', m.id)
    if (error) return falhou(error, 'Só quem escreveu pode apagar.')
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
      const { data, error } = await sb.from('canais')
        .insert({ ...corpo, criado_por: eu.id }).select().single()
      if (error) { falhou(error, 'Não foi possível criar o canal.'); return null }
      id = (data as Canal).id
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

  const aceitarSugestao: Contexto['aceitarSugestao'] = useCallback(async (sug, ajuste) => {
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
      })
      if (!id) return
      contou = `criou a tarefa "${sug.texto}" em ${fluxo.nome}`
    } else if (sug.tipo === 'concluir') {
      const achado = itemPorId(dados.item_id)
      if (!achado) return toast('A tarefa não existe mais.', true)
      if (!achado.item.feito) await alternarItem(achado.item)
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
      if (fluxo) await logar(fluxo.id, `registrou da conversa: ${sug.texto}`)
      contou = fluxo ? `registrou a decisão em ${fluxo.nome}` : 'registrou a decisão'
    }

    await sb.from('sugestoes').update({
      estado: 'aceita', decidido_por: eu.id, decidido_em: new Date().toISOString(),
    }).eq('id', sug.id)
    // A conversa fica sabendo do que saiu dela, senão o trabalho some do contexto.
    if (contou) {
      await sb.from('mensagens').insert({
        canal_id: sug.canal_id, autor_id: eu.id, texto: contou, sistema: true, responde_a: null,
      })
    }
    recarregar()
  }, [sb, eu, perfis, todosFluxos, itemPorId, adicionarItem, alternarItem, editarItem, travar, logar, toast, recarregar])

  const recusarSugestao: Contexto['recusarSugestao'] = useCallback(async (sug) => {
    await sb.from('sugestoes').update({
      estado: 'recusada', decidido_por: eu.id, decidido_em: new Date().toISOString(),
    }).eq('id', sug.id)
    recarregar()
  }, [sb, eu.id, recarregar])

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
    }

    let propostas: Proposta[] = []
    let motor = 'regras'
    try {
      const r = await fetch('/api/leitor', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corpo),
      })
      const volta = await r.json() as { propostas?: Proposta[]; motor?: string }
      propostas = volta.propostas || []
      motor = volta.motor || 'regras'
    } catch {
      toast('Não consegui ler a conversa agora.', true)
      return null
    }

    // O que já foi proposto antes não volta, nem o que alguém já recusou.
    const jaVistas = sugestoesDe(canalId)
    const novas = propostas.filter(
      (p) => !jaVistas.some((v) => v.texto.trim().toLowerCase() === p.texto.trim().toLowerCase()),
    )

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
        // espera, o outro para a frente inteira.
        if (g.tipo === 'prazo' || g.tipo === 'trava') continue
        if (g.tipo === 'tarefa' && !g.dados.fluxo_id) continue
        await aceitarSugestao(g)
      }
    }

    recarregar()
    return { achou: novas.length, motor }
  }, [sb, canais, mensagens, perfis, todosFluxos, nomeDe, sugestoesDe, org.ia_modo, aceitarSugestao, toast, recarregar])

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
    enviar, apagarMensagem, marcarLido, salvarCanal, excluirCanal,
    lerConversa, aceitarSugestao, recusarSugestao,
    espacos, trocarEspaco, abrirEspaco,
  }

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}
