'use client'

import { dias, hojeIso, soma } from '@/lib/datas'
import { semente, type Base, type Linha } from './semente'

const CHAVE_BASE = 'esteira.local.base'
const CHAVE_EU = 'esteira.local.eu'
const VAZIA: Base = { config: [], empresas: [], perfis: [], areas: [], fluxos: [], etapas: [], itens: [],
  dependencias: [], processos: [], processo_etapas: [], processo_itens: [], fluxo_pessoas: [],
  convites: [],
  compromissos: [], convidados: [], agendas_externas: [], ocupacao_externa: [],
  historico: [], atividades: [] }

let base: Base | null = null
const ouvintes = new Set<() => void>()

function ler(): Base {
  if (base) return base
  if (typeof window === 'undefined') return VAZIA
  try {
    const cru = localStorage.getItem(CHAVE_BASE)
    base = cru ? (JSON.parse(cru) as Base) : semente()
  } catch {
    base = semente()
  }
  for (const k of Object.keys(VAZIA)) if (!base[k]) base[k] = []
  return base
}

function gravar() {
  if (!base || typeof window === 'undefined') return
  try { localStorage.setItem(CHAVE_BASE, JSON.stringify(base)) } catch {}
  ouvintes.forEach((f) => f())
}

if (typeof window !== 'undefined') {
  // Duas abas abertas continuam enxergando a mesma coisa.
  window.addEventListener('storage', (e) => {
    if (e.key !== CHAVE_BASE) return
    base = null
    ler()
    ouvintes.forEach((f) => f())
  })
}

export function euLocal(): string | null {
  if (typeof window === 'undefined') return null
  try { return localStorage.getItem(CHAVE_EU) } catch { return null }
}

export function definirEuLocal(id: string) {
  try { localStorage.setItem(CHAVE_EU, id) } catch {}
}

export function pessoasLocais(): Linha[] {
  return ler().perfis
}

export function reiniciarLocal() {
  base = semente()
  gravar()
}

const uid = (p: string) => p + Math.random().toString(36).slice(2, 9)
const agora = () => new Date().toISOString()

function logar(fluxo_id: string, quem_id: string | null, texto: string) {
  const b = ler()
  b.atividades.unshift({ id: uid('a'), fluxo_id, quem_id, texto, criado_em: agora() })
  const doFluxo = b.atividades.filter((x) => x.fluxo_id === fluxo_id)
  if (doFluxo.length > 40) {
    const manter = new Set(doFluxo.slice(0, 40).map((x) => x.id))
    b.atividades = b.atividades.filter((x) => x.fluxo_id !== fluxo_id || manter.has(x.id as string))
  }
}

/**
 * Mesmas regras das políticas do banco.
 * Participar da esteira sempre dá acesso; além disso vale a visibilidade escolhida.
 */
function podeVerFluxo(f: Linha, eu: string | null): boolean {
  const b = ler()
  if (f.autor_id === eu) return true
  if (f.visib === 'so_eu') return false
  if (f.dono_id === eu) return true
  const minhas = b.etapas.filter((e) => e.fluxo_id === f.id)
  if (minhas.some((e) => e.aprovador_id === eu)) return true
  if (b.itens.some((i) => i.fluxo_id === f.id && i.resp_id === eu)) return true
  if (f.visib === 'escolhidas') {
    return b.fluxo_pessoas.some((x) => x.fluxo_id === f.id && x.perfil_id === eu)
  }
  return true
}

function visiveis(tabela: string, linhas: Linha[]): Linha[] {
  const eu = euLocal()
  if (tabela === 'fluxos') return linhas.filter((f) => podeVerFluxo(f, eu))
  if (tabela === 'fluxo_pessoas') {
    const b = ler()
    const ok = new Set(b.fluxos.filter((f) => podeVerFluxo(f, eu)).map((f) => f.id))
    return linhas.filter((x) => ok.has(x.fluxo_id))
  }
  if (tabela === 'itens') {
    const b = ler()
    const ok = new Set(b.fluxos.filter((f) => podeVerFluxo(f, eu)).map((f) => f.id))
    return linhas.filter((i) => ok.has(i.fluxo_id) && (!i.priv || i.autor_id === eu))
  }
  if (tabela === 'compromissos') {
    const b = ler()
    return linhas.filter((c) =>
      c.visivel || c.dono_id === eu ||
      b.convidados.some((v) => v.compromisso_id === c.id && v.perfil_id === eu))
  }
  if (tabela === 'convidados') {
    const b = ler()
    const ok = new Set(
      b.compromissos
        .filter((c) => c.visivel || c.dono_id === eu)
        .map((c) => c.id),
    )
    return linhas.filter((v) => ok.has(v.compromisso_id) || v.perfil_id === eu)
  }
  if (tabela === 'convites') return linhas
  if (tabela === 'processos' || tabela === 'processo_etapas' || tabela === 'processo_itens') return linhas
  if (tabela === 'agendas_externas') return linhas.filter((a) => a.perfil_id === eu)
  if (tabela === 'ocupacao_externa') return linhas
  if (tabela === 'dependencias') return linhas
  if (tabela === 'etapas' || tabela === 'historico' || tabela === 'atividades') {
    const b = ler()
    const ok = new Set(b.fluxos.filter((f) => podeVerFluxo(f, eu)).map((f) => f.id))
    return linhas.filter((x) => ok.has(x.fluxo_id))
  }
  return linhas
}

export type Resp<T> = { data: T; error: { message: string } | null }

type Modo = 'select' | 'insert' | 'update' | 'delete'

class Consulta<T = unknown> implements PromiseLike<Resp<T>> {
  private filtros: [string, unknown][] = []
  private ordens: [string, boolean][] = []
  private unico: 'single' | 'maybe' | null = null

  constructor(private tabela: string, private modo: Modo, private corpo?: Linha) {}

  select(_colunas?: string) { return this }
  single() { this.unico = 'single'; return this }
  maybeSingle() { this.unico = 'maybe'; return this }
  eq(col: string, val: unknown) { this.filtros.push([col, val]); return this }
  is(col: string, val: unknown) { this.filtros.push([col, val]); return this }
  order(col: string, o?: { ascending?: boolean }) {
    this.ordens.push([col, o?.ascending !== false])
    return this
  }

  private casa(l: Linha) {
    // Procurar por nulo também encontra a coluna que nunca foi preenchida,
    // que é como o banco enxerga as duas situações.
    return this.filtros.every(([c, v]) => (v === null ? l[c] == null : l[c] === v))
  }

  private executar(): Resp<T> {
    const b = ler()
    const lista = b[this.tabela] || []

    if (this.modo === 'insert') {
      const linha: Linha = { id: uid('x'), criado_em: agora(), ...this.corpo }
      lista.push(linha)
      gravar()
      return { data: (this.unico ? linha : [linha]) as T, error: null }
    }
    if (this.modo === 'update') {
      lista.filter((l) => this.casa(l)).forEach((l) => Object.assign(l, this.corpo))
      gravar()
      return { data: null as T, error: null }
    }
    if (this.modo === 'delete') {
      const fora = lista.filter((l) => this.casa(l)).map((l) => l.id)
      b[this.tabela] = lista.filter((l) => !fora.includes(l.id))
      if (this.tabela === 'fluxos') {
        const ids = new Set(fora)
        for (const t of ['etapas', 'itens', 'historico', 'atividades']) {
          b[t] = b[t].filter((x) => !ids.has(x.fluxo_id))
        }
      }
      if (this.tabela === 'itens') {
        const ids = new Set(fora)
        b.dependencias = b.dependencias.filter((x) => !ids.has(x.item_id) && !ids.has(x.depende_de))
      }
      if (this.tabela === 'compromissos') {
        const ids = new Set(fora)
        b.convidados = b.convidados.filter((x) => !ids.has(x.compromisso_id))
      }
      if (this.tabela === 'fluxos') {
        const ids = new Set(fora)
        b.fluxo_pessoas = b.fluxo_pessoas.filter((x) => !ids.has(x.fluxo_id))
      }
      if (this.tabela === 'processos') {
        const ids = new Set(fora)
        b.processo_etapas = b.processo_etapas.filter((x) => !ids.has(x.processo_id))
        b.processo_itens = b.processo_itens.filter((x) => !ids.has(x.processo_id))
      }
      if (this.tabela === 'processo_etapas') {
        const ids = new Set(fora)
        b.processo_itens = b.processo_itens.filter((x) => !ids.has(x.etapa_id))
      }
      if (this.tabela === 'areas') {
        const comFluxo = b.fluxos.some((f) => fora.includes(f.area_id))
        if (comFluxo) return { data: null as T, error: { message: 'Este area tem projetos ou rotinas dentro. Mova ou exclua antes.' } }
      }
      gravar()
      return { data: null as T, error: null }
    }

    let saida = visiveis(this.tabela, lista).filter((l) => this.casa(l))
    for (const [col, asc] of this.ordens) {
      saida = [...saida].sort((a, x) => {
        const va = a[col], vx = x[col]
        if (va === vx) return 0
        if (va === null || va === undefined) return 1
        if (vx === null || vx === undefined) return -1
        const r = typeof va === 'number' && typeof vx === 'number'
          ? va - vx
          : String(va).localeCompare(String(vx), 'pt-BR')
        return asc ? r : -r
      })
    }
    if (this.unico) return { data: (saida[0] ?? null) as T, error: null }
    return { data: saida as T, error: null }
  }

  then<R1 = Resp<T>, R2 = never>(
    ok?: ((v: Resp<T>) => R1 | PromiseLike<R1>) | null,
    falha?: ((e: unknown) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    return Promise.resolve().then(() => this.executar()).then(ok, falha)
  }
}

// ----------------------------------------------------------------- funções

function salvarFluxo(pFluxo: Linha, pEtapas: Linha[]): string {
  const b = ler()
  const eu = euLocal()
  if (!pEtapas.length) throw new Error('O fluxo precisa de pelo menos um checkpoint.')

  let id = (pFluxo.id as string) || ''
  if (!id) {
    id = uid('f')
    b.fluxos.push({
      id, tipo: pFluxo.tipo, nome: String(pFluxo.nome || '').trim(),
      area_id: pFluxo.area_id, dono_id: pFluxo.dono_id, autor_id: eu,
      empresa_id: pFluxo.empresa_id || null,
      visib: pFluxo.visib || 'equipe', freq: pFluxo.freq || null, periodo: pFluxo.periodo || null,
      atual: 0, concluido: false, travado_motivo: null, travado_desde: null, criado_em: agora(),
    })
    logar(id, eu, pFluxo.tipo === 'ciclo' ? 'criou a rotina' : 'criou o projeto')
  } else {
    const f = b.fluxos.find((x) => x.id === id)
    if (!f) throw new Error('Fluxo não encontrado.')
    Object.assign(f, {
      nome: String(pFluxo.nome || '').trim(),
      area_id: pFluxo.area_id,
      empresa_id: pFluxo.empresa_id || null,
      dono_id: pFluxo.dono_id,
      freq: pFluxo.freq || null,
      periodo: pFluxo.periodo || null,
      visib: f.autor_id === eu ? (pFluxo.visib || 'equipe') : f.visib,
    })
    logar(id, eu, 'editou a esteira')
  }

  const mantidas: string[] = []
  pEtapas.forEach((e, k) => {
    const dados = {
      ordem: k, nome: String(e.nome || '').trim(), criterio: e.criterio || '',
      aprovador_id: e.aprovador_id || null, prazo: e.prazo || null,
    }
    if (!e.id) {
      const eid = uid('e')
      b.etapas.push({ id: eid, fluxo_id: id, ...dados })
      mantidas.push(eid)
    } else {
      const et = b.etapas.find((x) => x.id === e.id && x.fluxo_id === id)
      if (et) { Object.assign(et, dados); mantidas.push(et.id as string) }
    }
  })
  const removidas = new Set(
    b.etapas.filter((x) => x.fluxo_id === id && !mantidas.includes(x.id as string)).map((x) => x.id),
  )
  const itensFora = new Set(b.itens.filter((x) => removidas.has(x.etapa_id)).map((x) => x.id))
  b.etapas = b.etapas.filter((x) => !removidas.has(x.id))
  b.itens = b.itens.filter((x) => !removidas.has(x.etapa_id))
  b.dependencias = b.dependencias.filter((x) => !itensFora.has(x.item_id) && !itensFora.has(x.depende_de))

  const f = b.fluxos.find((x) => x.id === id)!
  f.atual = Math.min(Number(f.atual), mantidas.length - 1)
  gravar()
  return id
}

function aprovarEtapa(fluxoId: string, periodo: string | null): string {
  const b = ler()
  const eu = euLocal()
  const f = b.fluxos.find((x) => x.id === fluxoId)
  if (!f) throw new Error('Fluxo não encontrado.')
  if (!podeVerFluxo(f, eu)) throw new Error('Sem acesso a esta esteira.')
  if (f.concluido) throw new Error('Este projeto já está concluído.')
  if (f.travado_motivo) throw new Error('O fluxo está travado. Destrave para seguir.')

  const etapas = b.etapas.filter((x) => x.fluxo_id === f.id).sort((a, x) => Number(a.ordem) - Number(x.ordem))
  const et = etapas[Number(f.atual)]
  if (!et) throw new Error('Checkpoint não encontrado.')
  if (et.aprovador_id !== eu) throw new Error('Somente o aprovador deste checkpoint pode aprovar a saída.')

  const pendente = b.itens.some(
    (i) => i.etapa_id === et.id && !i.feito && (!i.priv || i.autor_id === eu),
  )
  if (pendente) throw new Error('Ainda existem itens pendentes neste checkpoint.')

  logar(f.id as string, eu, `aprovou a saída de ${et.nome}`)

  if (Number(f.atual) < etapas.length - 1) {
    f.atual = Number(f.atual) + 1
    gravar()
    return 'avancou'
  }

  if (f.tipo === 'ciclo') {
    const passo = ({ semanal: 7, quinzenal: 15, mensal: 30 } as Record<string, number>)[String(f.freq)] || 30
    const doFluxo = b.itens.filter((i) => i.fluxo_id === f.id)
    const atrasou =
      etapas.some((e) => e.prazo && dias(String(e.prazo)) < 0) ||
      doFluxo.some((i) => i.prazo && dias(String(i.prazo)) < 0)

    b.historico.push({
      id: uid('h'), fluxo_id: f.id, periodo: f.periodo || '',
      situacao: atrasou ? 'late' : 'ok', criado_em: agora(),
    })
    const voltas = b.historico.filter((h) => h.fluxo_id === f.id)
    if (voltas.length > 12) {
      const manter = new Set(voltas.slice(-12).map((h) => h.id))
      b.historico = b.historico.filter((h) => h.fluxo_id !== f.id || manter.has(h.id as string))
    }

    etapas.forEach((e) => { if (e.prazo) e.prazo = soma(String(e.prazo), passo) })
    doFluxo.forEach((i) => { i.feito = false; if (i.prazo) i.prazo = soma(String(i.prazo), passo) })
    f.atual = 0
    if (periodo) f.periodo = periodo
    gravar()
    return 'volta'
  }

  f.concluido = true
  gravar()
  return 'concluido'
}

/** Grava o processo inteiro, casando pelo id o que já existia. */
function salvarProcesso(pProc: Linha, pEtapas: Linha[]): string {
  const b = ler()
  if (!pEtapas.length) throw new Error('O processo precisa de pelo menos um checkpoint.')

  let id = (pProc.id as string) || ''
  const dados = {
    nome: String(pProc.nome || '').trim(),
    descricao: pProc.descricao || '',
    tipo: pProc.tipo,
    area_id: pProc.area_id || null,
  }
  if (!id) {
    id = uid('pr')
    b.processos.push({ id, ...dados, ordem: b.processos.length, criado_em: agora() })
  } else {
    const atual = b.processos.find((x) => x.id === id)
    if (!atual) throw new Error('Processo não encontrado.')
    Object.assign(atual, dados)
  }

  const eids: string[] = []
  const iids: string[] = []
  pEtapas.forEach((e, k) => {
    const dadosEtapa = {
      ordem: k, nome: String(e.nome || '').trim(), criterio: e.criterio || '',
      aprovador_area_id: e.aprovador_area_id || null, dias: Number(e.dias) || 0,
    }
    let eid = (e.id as string) || ''
    if (!eid) {
      eid = uid('pe')
      b.processo_etapas.push({ id: eid, processo_id: id, ...dadosEtapa })
    } else {
      const atual = b.processo_etapas.find((x) => x.id === eid)
      if (atual) Object.assign(atual, dadosEtapa)
    }
    eids.push(eid)

    ;((e.itens as Linha[]) || []).forEach((i, j) => {
      const dadosItem = {
        etapa_id: eid, ordem: j, texto: String(i.texto || '').trim(),
        area_id: i.area_id || null, dias: Number(i.dias) || 0,
      }
      let iid = (i.id as string) || ''
      if (!iid) {
        iid = uid('pi')
        b.processo_itens.push({ id: iid, processo_id: id, ...dadosItem })
      } else {
        const atual = b.processo_itens.find((x) => x.id === iid)
        if (atual) Object.assign(atual, dadosItem)
      }
      iids.push(iid)
    })
  })

  b.processo_itens = b.processo_itens.filter((x) => x.processo_id !== id || iids.includes(x.id as string))
  b.processo_etapas = b.processo_etapas.filter((x) => x.processo_id !== id || eids.includes(x.id as string))
  gravar()
  return id
}

/**
 * Cria a esteira a partir de um processo, já distribuída: cada checkpoint com o
 * aprovador da área que responde por ele, cada tarefa com a pessoa daquela área,
 * e os prazos em dias convertidos em datas a partir do início.
 * Espelha a função criar_do_processo do banco.
 */
function criarDoProcesso(
  processoId: string, pFluxo: Linha, pessoas: Record<string, string>, inicio: string,
): string {
  const b = ler()
  const eu = euLocal()
  const pr = b.processos.find((x) => x.id === processoId)
  if (!pr) throw new Error('Processo não encontrado.')

  const etapasDo = b.processo_etapas
    .filter((x) => x.processo_id === processoId)
    .sort((a, x) => Number(a.ordem) - Number(x.ordem))
  if (!etapasDo.length) throw new Error('Este processo ainda não tem checkpoints.')

  const id = uid('f')
  b.fluxos.push({
    id, tipo: pr.tipo, nome: String(pFluxo.nome || '').trim(),
    area_id: pFluxo.area_id || null, empresa_id: pFluxo.empresa_id || null,
    dono_id: pFluxo.dono_id || eu, autor_id: eu, visib: pFluxo.visib || 'equipe',
    freq: pFluxo.freq || null, periodo: pFluxo.periodo || null,
    atual: 0, concluido: false, travado_motivo: null, travado_desde: null, criado_em: agora(),
  })
  logar(id, eu, `criou a partir do processo ${pr.nome}`)

  for (const et of etapasDo) {
    const eid = uid('e')
    const aprova = (et.aprovador_area_id && pessoas[String(et.aprovador_area_id)]) || eu
    b.etapas.push({
      id: eid, fluxo_id: id, ordem: et.ordem, nome: et.nome,
      criterio: et.criterio || '', aprovador_id: aprova,
      prazo: soma(inicio, Number(et.dias) || 0),
    })
    const itensDa = b.processo_itens
      .filter((x) => x.etapa_id === et.id)
      .sort((a, x) => Number(a.ordem) - Number(x.ordem))
    for (const it of itensDa) {
      b.itens.push({
        id: uid('i'), etapa_id: eid, fluxo_id: id, texto: it.texto,
        resp_id: (it.area_id && pessoas[String(it.area_id)]) || null,
        prazo: soma(inicio, Number(it.dias) || 0),
        feito: false, priv: false, autor_id: eu, ordem: it.ordem, criado_em: agora(),
      })
    }
  }
  gravar()
  return id
}

// ------------------------------------------------------------------ cliente

const SO_REAL = 'Isto funciona quando o app estiver ligado ao Supabase. No modo demonstração, escolha quem você é na tela inicial.'

let instancia: ReturnType<typeof montarCliente> | null = null

/** Um cliente só por aba, para não registrar o mesmo ouvinte várias vezes. */
export function clienteLocal() {
  if (!instancia) instancia = montarCliente()
  return instancia
}

function montarCliente() {
  return {
    from(tabela: string) {
      return {
        select: (colunas?: string) => new Consulta(tabela, 'select').select(colunas),
        insert: (corpo: Linha) => new Consulta(tabela, 'insert', corpo),
        update: (corpo: Linha) => new Consulta(tabela, 'update', corpo),
        delete: () => new Consulta(tabela, 'delete'),
      }
    },
    async rpc(nome: string, args: Record<string, unknown> = {}) {
      try {
        if (nome === 'salvar_fluxo') {
          return { data: salvarFluxo(args.p_fluxo as Linha, args.p_etapas as Linha[]), error: null }
        }
        if (nome === 'salvar_processo') {
          return {
            data: salvarProcesso(args.p_processo as Linha, args.p_etapas as Linha[]),
            error: null,
          }
        }
        if (nome === 'criar_do_processo') {
          return {
            data: criarDoProcesso(
              args.p_processo as string,
              args.p_fluxo as Linha,
              (args.p_pessoas as Record<string, string>) || {},
              (args.p_inicio as string) || hojeIso(),
            ),
            error: null,
          }
        }
        if (nome === 'ocupacao') {
          const b = ler()
          const saida: Linha[] = []
          for (const c of b.compromissos) {
            if (!c.bloqueia) continue
            const pessoas = new Set<string>()
            if (c.dono_id) pessoas.add(c.dono_id as string)
            for (const v of b.convidados) {
              if (v.compromisso_id === c.id) pessoas.add(v.perfil_id as string)
            }
            for (const perfil_id of pessoas) {
              saida.push({ id: c.id, perfil_id, quando: c.quando, inicio: c.inicio, fim: c.fim })
            }
          }
          return { data: saida, error: null }
        }
        if (nome === 'aprovar_etapa') {
          return { data: aprovarEtapa(args.p_fluxo as string, (args.p_periodo as string) || null), error: null }
        }
        return { data: null, error: { message: `Função ${nome} não existe no modo demonstração.` } }
      } catch (e) {
        return { data: null, error: { message: (e as Error).message } }
      }
    },
    auth: {
      async getUser() {
        const id = euLocal()
        return { data: { user: id ? { id } : null }, error: null }
      },
      async signOut() {
        try { localStorage.removeItem(CHAVE_EU) } catch {}
        return { error: null }
      },
      async signInWithPassword(_dados?: unknown) { return { data: null, error: { message: SO_REAL } } },
      async signUp(_dados?: unknown) { return { data: { session: null }, error: { message: SO_REAL } } },
      async updateUser(_dados?: unknown) { return { data: null, error: { message: SO_REAL } } },
      async resetPasswordForEmail(_email?: string, _opcoes?: unknown) { return { data: null, error: { message: SO_REAL } } },
    },
    channel(_nome?: string) {
      const canal = {
        on(_evento: string, _filtro: unknown, cb: () => void) {
          canal._cb = cb
          return canal
        },
        subscribe() {
          if (canal._cb) ouvintes.add(canal._cb)
          return canal
        },
        _cb: null as null | (() => void),
      }
      return canal
    },
    removeChannel(c: unknown) {
      const cb = (c as { _cb?: () => void })?._cb
      if (cb) ouvintes.delete(cb)
    },
  }
}
