'use client'

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
} from 'react'
import { supabase } from '@/lib/supabase/browser'
import { hojeIso } from '@/lib/datas'
import { proxPeriodo } from '@/lib/modelos'
import type { RascunhoEtapa } from '@/lib/modelos'
import { etapaAtual } from '@/lib/regras'
import type { AgendaExterna, Atividade, Compromisso, Config, Convite, Empresa, Etapa, Fluxo, Item, Papel, Perfil, Area, Processo, ProcessoEtapa, ProcessoItem, Volta } from '@/lib/tipos'
import { iso } from '@/lib/datas'
import { itensVisiveis, veFluxo } from '@/lib/acesso'

type Aviso = { texto: string; erro: boolean; id: number }

type Contexto = {
  eu: Perfil
  perfis: Perfil[]
  areas: Area[]
  empresas: Empresa[]
  config: Config
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
  salvarPerfil: (id: string, d: Partial<Perfil>) => Promise<void>
  salvarEmpresa: (d: { id?: string; nome: string; sigla: string; cor: string }) => Promise<void>
  excluirEmpresa: (id: string) => Promise<void>
  salvarConfig: (d: Partial<Config>) => Promise<void>
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
}

const Ctx = createContext<Contexto | null>(null)

export function useDados() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useDados precisa estar dentro de <Dados>')
  return c
}

const SEM_PERFIL: Perfil = {
  id: '', nome: 'Sem responsável', email: '', cor: '#8A909C', papel: 'colaborador',
  area_id: null, gestor_id: null, ve_area: false, ativo: false, criado_em: '',
}
const SEM_AREA: Area = { id: '', nome: 'Sem área', cor: '#8A909C', ordem: 999, responsavel_id: null }
const CONFIG_PADRAO: Config = {
  id: '1', organizacao: 'Esteira', multi: false, rotulo: 'Empresa', rotulo_plural: 'Empresas',
}
const CHAVE_EMPRESA = 'esteira.empresa'

export function Dados({ perfil, children }: { perfil: Perfil; children: ReactNode }) {
  const sb = supabase()
  const [eu, setEu] = useState<Perfil>(perfil)
  const [perfis, setPerfis] = useState<Perfil[]>([perfil])
  const [areas, setAreas] = useState<Area[]>([])
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [config, setConfig] = useState<Config>(CONFIG_PADRAO)
  const [todosFluxos, setFluxos] = useState<Fluxo[]>([])
  const [empresaAtiva, setEmpresaAtiva] = useState<string | null>(null)
  /** Quantas tarefas cada esteira tem ao todo, para avisar o que ficou de fora. */
  const [totais, setTotais] = useState<Map<string, number>>(new Map())
  const [agenda, setAgenda] = useState<Compromisso[]>([])
  const [minhaAgendaExterna, setMinhaExterna] = useState<AgendaExterna | null>(null)
  const [processos, setProcessos] = useState<Processo[]>([])
  const [convites, setConvites] = useState<Convite[]>([])
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
    const [p, s, f, e, i, h, a, em, cf, dp, cm, cv, oc, oe, ax, pr, pe, pi, fp, cvt] = await Promise.all([
      sb.from('perfis').select('*').order('nome'),
      sb.from('areas').select('*').order('ordem'),
      sb.from('fluxos').select('*').order('criado_em'),
      sb.from('etapas').select('*').order('ordem'),
      sb.from('itens').select('*').order('ordem').order('criado_em'),
      sb.from('historico').select('*').order('criado_em'),
      sb.from('atividades').select('*').order('criado_em', { ascending: false }),
      sb.from('empresas').select('*').order('ordem'),
      sb.from('config').select('*'),
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
    ])

    const listaPerfis = (p.data || []) as Perfil[]
    setPerfis(listaPerfis)
    const meu = listaPerfis.find((x) => x.id === perfil.id)
    if (meu) setEu(meu)
    setAreas((s.data || []) as Area[])
    setEmpresas((em.data || []) as Empresa[])
    const cfg = ((cf.data || []) as Config[])[0]
    setConfig(cfg ? { ...CONFIG_PADRAO, ...cfg } : CONFIG_PADRAO)

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
    () => (!config.multi || !empresaAtiva ? todosFluxos : todosFluxos.filter((f) => f.empresa_id === empresaAtiva)),
    [todosFluxos, empresaAtiva, config.multi],
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
      if (error) { falhou(error, 'Não foi possível salvar o area.'); return null }
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
    if (error) return falhou(error, 'Não foi possível excluir o area.')
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

  const salvarConfig: Contexto['salvarConfig'] = useCallback(async (d) => {
    const { error } = await sb.from('config').update(d).eq('id', '1')
    if (error) return falhou(error, 'Não foi possível salvar.')
    setConfig((c) => ({ ...c, ...d }))
    toast('Salvo.')
    recarregar()
  }, [sb, falhou, toast, recarregar])

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

  const valor: Contexto = {
    eu, perfis, areas, empresas, config, fluxos, todosFluxos, totalItens, agenda, minhaAgendaExterna, processos, convites,
    empresaAtiva, focarEmpresa, empresaDe, carregando,
    perfilDe, nomeDe, areaDe, aviso, toast,
    salvarArea, excluirArea, salvarFluxo, excluirFluxo,
    travar, destravar, adicionarItem, editarItem, definirTravas, excluirItem, alternarItem, aprovar,
    salvarPerfil, salvarEmpresa, excluirEmpresa, salvarConfig,
    salvarCompromisso, excluirCompromisso, ligarAgendaExterna, desligarAgendaExterna,
    salvarProcesso, excluirProcesso, duplicarProcesso, criarDoProcesso,
    criarConvite, excluirConvite,
  }

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}
