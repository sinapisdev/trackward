'use client'

import { curta, dias, hojeIso, soma } from '@/lib/datas'
import { buscarOuInventar, guardar, jogarFora } from './arquivos'
import { semente, type Base, type Linha } from './semente'

// Chaves novas de propósito: o exemplo antigo era de uma construtora, e o Track
// não é de setor nenhum. Trocar a chave faz o exemplo novo nascer limpo, sem
// misturar as duas empresas de mentira, e o que estava lá antes é ignorado.
const CHAVE_BASE = 'track.local.base'
const CHAVE_EU = 'track.local.eu'
// O login é uma coisa, o perfil em uso é outra: o mesmo login pode ter o Track
// pessoal e o da empresa. Espelha a tabela sessoes do banco.
const CHAVE_USUARIO = 'track.local.user'
const CHAVE_VERSAO = 'track.local.versao'
/** Sobe quando o exemplo ganha tabelas novas. Ver completar(). */
const VERSAO = 15
const VAZIA: Base = { organizacoes: [], empresas: [], perfis: [], areas: [], fluxos: [], etapas: [], itens: [],
  dependencias: [], processos: [], processo_etapas: [], processo_itens: [], fluxo_pessoas: [],
  convites: [],
  canais: [], canal_membros: [], mensagens: [], sugestoes: [],
  compromissos: [], convidados: [], agendas_externas: [], ocupacao_externa: [],
  historico: [], atividades: [],
  anexos: [], decisoes: [], pedidos_prazo: [], memoria: [], consumo: [], agentes: [], conectores: [], notas: [],
  avisos: [], avisos_contato: [], push_assinaturas: [] }

let base: Base | null = null
const ouvintes = new Set<() => void>()

/**
 * Quem já usava o app tem uma base guardada no navegador de uma versão anterior,
 * sem as tabelas que vieram depois. Em vez de jogar o trabalho da pessoa fora,
 * trazemos do exemplo só o que está faltando, e o que ela criou continua lá.
 */
function completar(atual: Base) {
  let versao = 0
  try { versao = Number(localStorage.getItem(CHAVE_VERSAO)) || 0 } catch {}
  if (versao >= VERSAO) return false

  const nova = semente()

  /**
   * Tabela que a pessoa não tem nenhuma linha recebe as do exemplo.
   *
   * Era uma lista escrita à mão, e a lista sempre ficava velha: a tabela nova
   * entrava no exemplo e não chegava em quem já usava, então o recurso parecia
   * quebrado justamente para quem estava acompanhando de perto. Genérico assim
   * nunca mais esquece, e não toca no que a pessoa criou, porque só preenche o
   * que está vazio.
   */
  for (const t of Object.keys(nova)) {
    if (t === 'organizacoes' || t === 'perfis') continue
    if (!atual[t]?.length) atual[t] = nova[t]
  }

  /**
   * O despejo é caso à parte: ele mora dentro de canais, que quem já usava tem
   * cheia, então a regra acima nunca o traria. Sem ele o canal pessoal só
   * existiria para conta nova.
   */
  if (atual.canais?.length && !atual.canais.some((c) => c.tipo === 'pessoal')) {
    const pessoais = new Set((nova.canais || []).filter((c) => c.tipo === 'pessoal').map((c) => c.id))
    for (const t of ['canais', 'canal_membros', 'mensagens']) {
      const dele = (nova[t] || []).filter((l) => pessoais.has(String(l.canal_id ?? l.id)))
      atual[t] = [...(atual[t] || []), ...dele]
    }
  }
  const cfg = atual.organizacoes?.[0]
  if (cfg) {
    if (cfg.ia_ativa === undefined) cfg.ia_ativa = true
    if (cfg.ia_modo === undefined) cfg.ia_modo = 'sugerir'
  }
  try { localStorage.setItem(CHAVE_VERSAO, String(VERSAO)) } catch {}
  return true
}

function ler(): Base {
  if (base) return base
  if (typeof window === 'undefined') return VAZIA
  let nasceuAgora = false
  try {
    const cru = localStorage.getItem(CHAVE_BASE)
    if (cru) base = JSON.parse(cru) as Base
    else { base = semente(); nasceuAgora = true }
  } catch {
    base = semente()
    nasceuAgora = true
  }
  for (const k of Object.keys(VAZIA)) if (!base[k]) base[k] = []
  // O carimbo em bloco vale só para a semente e para bases antigas, de antes de
  // a organização existir. Depois disso quem carimba é carimbar(), na gravação,
  // com a organização de quem escreveu. Sem esse corte, a linha de uma conta
  // nova acabaria reivindicada pela empresa de exemplo no próximo carregamento.
  if (nasceuAgora || semNenhumaOrg(base)) etiquetar(base)
  if (nasceuAgora) {
    try { localStorage.setItem(CHAVE_VERSAO, String(VERSAO)) } catch {}
  } else if (completar(base)) {
    gravar()
  }
  return base
}

/**
 * Carimba a organização de exemplo em tudo que veio da semente sem ela. Fazer
 * isso aqui, de uma vez, evita repetir org_id em trezentas linhas de exemplo.
 */
const semNenhumaOrg = (b: Base) => !Object.entries(b).some(
  ([tabela, linhas]) => tabela !== 'organizacoes' && linhas.some((l) => l.org_id != null),
)

function etiquetar(b: Base) {
  for (const [tabela, linhas] of Object.entries(b)) {
    if (tabela === 'organizacoes') continue
    for (const l of linhas) if (l.org_id == null) l.org_id = 'org1'
  }
}

/** A organização de quem está usando o app agora. Espelha minha_org() no banco. */
function minhaOrg(): string | null {
  const eu = euLocal()
  if (!eu) return null
  return (ler().perfis.find((p) => p.id === eu)?.org_id as string) ?? null
}

/**
 * O carimbo da organização, que no banco é o gatilho carimbar_org.
 *
 * Roda na gravação, e não só ao abrir o app: linha criada dentro de uma função
 * (um checkpoint novo, por exemplo) nascia sem dono, e o filtro da organização
 * a escondia até alguém recarregar a página. Escrevia certo e sumia da tela.
 *
 * perfis fica de fora de propósito, igual ao banco: o cadastro já escolheu a
 * organização certa, e carimbar aqui jogaria a conta nova para dentro de quem
 * estivesse logado no momento.
 */
function carimbar() {
  if (!base) return
  const org = minhaOrg()
  if (!org) return
  for (const [tabela, linhas] of Object.entries(base)) {
    if (tabela === 'organizacoes' || tabela === 'perfis') continue
    for (const l of linhas) if (l.org_id == null) l.org_id = org
  }
}

function gravar() {
  if (!base || typeof window === 'undefined') return
  carimbar()
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
  try {
    localStorage.setItem(CHAVE_EU, id)
    const p = ler().perfis.find((x) => x.id === id)
    if (p?.user_id) localStorage.setItem(CHAVE_USUARIO, String(p.user_id))
  } catch {}
}

/** O login, que pode ter perfil em mais de um espaço. */
export function usuarioLocal(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const u = localStorage.getItem(CHAVE_USUARIO)
    if (u) return u
    const eu = localStorage.getItem(CHAVE_EU)
    return eu ? (ler().perfis.find((p) => p.id === eu)?.user_id as string) ?? eu : null
  } catch { return null }
}

export function pessoasLocais(): Linha[] {
  return ler().perfis
}

export function reiniciarLocal() {
  base = semente()
  try { localStorage.setItem(CHAVE_VERSAO, String(VERSAO)) } catch {}
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

/**
 * Mesma regra de ve_canal no banco: canal aberto é de todos, e quando está preso
 * a um projeto vale quem enxerga o projeto. Fechado e direto são só de quem está
 * dentro, inclusive para o administrador.
 */
function podeVerCanal(c: Linha, eu: string | null): boolean {
  const b = ler()
  const dentro = b.canal_membros.some((m) => m.canal_id === c.id && m.perfil_id === eu)
  if (dentro) return true
  if (c.tipo !== 'aberto') return false
  if (!c.fluxo_id) return true
  const f = b.fluxos.find((x) => x.id === c.fluxo_id)
  return !!f && podeVerFluxo(f, eu)
}

function canaisAbertos(eu: string | null) {
  return new Set(ler().canais.filter((c) => podeVerCanal(c, eu)).map((c) => c.id))
}

function visiveis(tabela: string, todas: Linha[]): Linha[] {
  const eu = euLocal()
  // A parede entre organizações vem antes de qualquer outra regra, como no banco.
  const org = minhaOrg()
  const linhas = tabela === 'organizacoes'
    ? todas.filter((o) => o.id === org)
    : todas.filter((l) => l.org_id === org)
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
  if (tabela === 'canais') return linhas.filter((c) => podeVerCanal(c, eu))
  if (tabela === 'mensagens' || tabela === 'sugestoes' || tabela === 'canal_membros') {
    const ok = canaisAbertos(eu)
    return linhas.filter((x) => ok.has(x.canal_id))
  }
  if (tabela === 'organizacoes' || tabela === 'convites') return linhas
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

type Modo = 'select' | 'insert' | 'update' | 'delete' | 'upsert'

/** Colunas que identificam a linha quando a tabela não se guia pelo id. */
const CHAVE: Record<string, string[]> = { canal_membros: ['canal_id', 'perfil_id'] }

class Consulta<T = unknown> implements PromiseLike<Resp<T>> {
  private filtros: [string, unknown][] = []
  private dentro: [string, Set<unknown>][] = []
  private ordens: [string, boolean][] = []
  private unico: 'single' | 'maybe' | null = null
  private teto = 0

  constructor(private tabela: string, private modo: Modo, private corpo?: Linha) {}

  select(_colunas?: string) { return this }
  single() { this.unico = 'single'; return this }
  maybeSingle() { this.unico = 'maybe'; return this }
  eq(col: string, val: unknown) { this.filtros.push([col, val]); return this }
  is(col: string, val: unknown) { this.filtros.push([col, val]); return this }
  in(col: string, vals: unknown[]) { this.dentro.push([col, new Set(vals)]); return this }
  limit(n: number) { this.teto = n; return this }
  order(col: string, o?: { ascending?: boolean }) {
    this.ordens.push([col, o?.ascending !== false])
    return this
  }

  private casa(l: Linha) {
    // Procurar por nulo também encontra a coluna que nunca foi preenchida,
    // que é como o banco enxerga as duas situações.
    return (
      this.filtros.every(([c, v]) => (v === null ? l[c] == null : l[c] === v)) &&
      this.dentro.every(([c, v]) => v.has(l[c]))
    )
  }

  private executar(): Resp<T> {
    const b = ler()
    const lista = b[this.tabela] || []

    if (this.modo === 'insert') {
      const linha: Linha = { id: uid('x'), criado_em: agora(), ...this.corpo }
      // A etiqueta é do servidor, nunca do que veio na requisição.
      if (this.tabela !== 'organizacoes') linha.org_id = minhaOrg() ?? linha.org_id
      lista.push(linha)
      // Mesmo gatilho do banco: quem escreve num canal passa a ser membro dele,
      // e a marca de leitura nasce junto.
      if (this.tabela === 'mensagens' && linha.autor_id) {
        const m = b.canal_membros.find(
          (x) => x.canal_id === linha.canal_id && x.perfil_id === linha.autor_id,
        )
        if (m) m.lido_em = agora()
        else b.canal_membros.push({ canal_id: linha.canal_id, perfil_id: linha.autor_id, lido_em: agora() })
      }
      gravar()
      return { data: (this.unico ? linha : [linha]) as T, error: null }
    }
    if (this.modo === 'upsert') {
      const chaves = CHAVE[this.tabela] || ['id']
      const atual = lista.find((l) => chaves.every((c) => l[c] === this.corpo![c]))
      if (atual) Object.assign(atual, this.corpo)
      else lista.push({ criado_em: agora(), ...(chaves.includes('id') ? { id: uid('x') } : {}), ...this.corpo })
      gravar()
      return { data: null as T, error: null }
    }
    if (this.modo === 'update') {
      lista.filter((l) => this.casa(l)).forEach((l) => {
        const antes = !!l.feito
        Object.assign(l, this.corpo)
        // Mesmo gatilho do banco: a hora de ficar pronta é de quem grava, não
        // de quem pede. Ver proteger_item() na seção 6 de supabase/schema.sql.
        if (this.tabela === 'itens') {
          if (l.feito && !antes) l.feito_em = agora()
          else if (!l.feito && antes) l.feito_em = null
        }
      })
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
      if (this.tabela === 'canais') {
        const ids = new Set(fora)
        for (const t of ['canal_membros', 'mensagens', 'sugestoes']) {
          b[t] = b[t].filter((x) => !ids.has(x.canal_id))
        }
      }
      if (this.tabela === 'areas') {
        const comFluxo = b.fluxos.some((f) => fora.includes(f.area_id))
        if (comFluxo) return { data: null as T, error: { message: 'Esta área tem projetos ou rotinas dentro. Mova ou exclua antes.' } }
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
    if (this.teto) saida = saida.slice(0, this.teto)
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

/**
 * Espelha cascata() do banco. Ver a seção 7b de supabase/schema.sql.
 *
 * Só anda o que quebrou, data firme não anda nem empurra quem vem depois, e o
 * que decide entre mexer e pedir é a esteira, não o cargo.
 */
function cascataLocal(itemId: string, novo: string): Linha[] {
  const b = ler()
  const raiz = b.itens.find((i) => i.id === itemId)
  if (!raiz) return []
  const nomeDoFluxo = (id: string) => String(b.fluxos.find((f) => f.id === id)?.nome || '')

  const saida: Linha[] = [{
    item_id: raiz.id, fluxo_id: raiz.fluxo_id, fluxo: nomeDoFluxo(String(raiz.fluxo_id)),
    texto: raiz.texto, de: raiz.prazo, para: novo, firme: !!raiz.prazo_firme,
    meu: true, resp_id: raiz.resp_id, nivel: 0,
  }]

  const vistos = new Set([raiz.id as string])
  let fila = [{ id: raiz.id as string, de: raiz.prazo as string | null, para: novo, firme: !!raiz.prazo_firme }]

  for (let nivel = 1; nivel <= 20 && fila.length; nivel++) {
    const proxima: typeof fila = []
    for (const pai of fila) {
      if (pai.firme || !pai.de) continue
      const filhos = b.dependencias
        .filter((d) => d.depende_de === pai.id)
        .map((d) => b.itens.find((i) => i.id === d.item_id))
        .filter((i): i is Linha => !!i && !i.feito && !!i.prazo)
      for (const f of filhos) {
        if (vistos.has(f.id as string)) continue
        const prazo = String(f.prazo)
        if (prazo >= pai.para) continue          // a folga absorve o atraso
        const folga = Math.max(0, dias(prazo) - dias(pai.de))
        const para = soma(pai.para, folga)
        vistos.add(f.id as string)
        saida.push({
          item_id: f.id, fluxo_id: f.fluxo_id, fluxo: nomeDoFluxo(String(f.fluxo_id)),
          texto: f.texto, de: prazo, para, firme: !!f.prazo_firme,
          meu: f.fluxo_id === raiz.fluxo_id, resp_id: f.resp_id, nivel,
        })
        proxima.push({ id: f.id as string, de: prazo, para, firme: !!f.prazo_firme })
      }
    }
    fila = proxima
  }
  return saida
}

function aplicarCascataLocal(itemId: string, novo: string, motivo: string): Linha {
  const b = ler()
  const eu = euLocal()
  const raiz = b.itens.find((i) => i.id === itemId)
  if (!raiz) throw new Error('Tarefa não encontrada.')
  if (raiz.prazo_firme) {
    throw new Error('Esta data é firme. Para mudá-la, tire a marca de data firme primeiro.')
  }

  let mexi = 0, pedi = 0, presas = 0
  for (const l of cascataLocal(itemId, novo)) {
    const alvo = b.itens.find((i) => i.id === l.item_id)!
    if (l.nivel === 0) { alvo.prazo = novo; continue }
    if (l.firme) { presas++; continue }
    if (l.meu) { alvo.prazo = l.para; mexi++; continue }
    b.pedidos_prazo = b.pedidos_prazo.filter(
      (p) => !(p.item_id === l.item_id && p.estado === 'aberto'),
    )
    b.pedidos_prazo.push({
      id: uid('pz'), item_id: l.item_id, fluxo_id: l.fluxo_id, de: l.de, para: l.para,
      motivo: motivo.trim(), origem_id: itemId, pedido_por: eu, estado: 'aberto',
      decidido_por: null, decidido_em: null, criado_em: agora(),
    })
    pedi++
  }

  const tocadas = mexi + pedi + presas
  logar(String(raiz.fluxo_id), eu,
    `mudou o prazo de ${raiz.texto} para ${curta(novo)}`
    + (tocadas ? `, e ${tocadas} tarefa(s) sentiram` : ''))
  gravar()
  return { mexi, pedi, presas }
}

function decidirPrazoLocal(pedidoId: string, aceita: boolean): string {
  const b = ler()
  const eu = euLocal()
  const pd = b.pedidos_prazo.find((p) => p.id === pedidoId)
  if (!pd) throw new Error('Pedido não encontrado.')
  if (pd.estado !== 'aberto') throw new Error('Este pedido já foi decidido.')

  const item = b.itens.find((i) => i.id === pd.item_id)
  pd.decidido_por = eu
  pd.decidido_em = agora()

  if (aceita) {
    if (item && !item.prazo_firme) item.prazo = pd.para
    pd.estado = 'aceito'
    logar(String(pd.fluxo_id), eu, `aceitou mover ${item?.texto} para ${curta(String(pd.para))}`)
    gravar()
    return 'aceito'
  }

  pd.estado = 'recusado'
  // Em cadeia: o que nasceu deste pedido não faz mais sentido.
  let frente = [String(pd.item_id)]
  for (let i = 0; i < 20 && frente.length; i++) {
    const seguintes: string[] = []
    for (const p of b.pedidos_prazo) {
      if (p.estado !== 'aberto' || !frente.includes(String(p.origem_id))) continue
      p.estado = 'recusado'
      p.decidido_por = eu
      p.decidido_em = agora()
      p.motivo = `${p.motivo} (caiu junto: o pedido que veio antes foi recusado)`
      seguintes.push(String(p.item_id))
    }
    frente = seguintes
  }
  logar(String(pd.fluxo_id), eu, `recusou mover ${item?.texto}: a data fica onde está`)
  gravar()
  return 'recusado'
}

/** Espelha decidir_etapa() do banco. Ver a seção 7 de supabase/schema.sql. */
function decidirEtapa(
  fluxoId: string,
  tipo: string,
  nota: string,
  reabrir: string[],
  periodo: string | null,
  prazo: string | null,
): string {
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
  if (et.aprovador_id !== eu) throw new Error('Somente o aprovador deste checkpoint pode decidir a saída.')
  if (!['aprovou', 'ressalva', 'devolveu'].includes(tipo)) throw new Error('Decisão desconhecida.')
  if (tipo !== 'aprovou' && !nota.trim()) {
    throw new Error('Escreva o motivo: quem recebe precisa saber o que fazer.')
  }

  const anotar = (t: string) => {
    b.decisoes.push({
      id: uid('d'), fluxo_id: f.id, etapa_id: et.id, quem_id: eu,
      tipo: t, nota: nota.trim(), criado_em: agora(),
    })
  }

  // Devolver para em cima do mesmo checkpoint e reabre o que foi apontado.
  if (tipo === 'devolveu') {
    const alvo = new Set(reabrir)
    b.itens.forEach((i) => { if (i.etapa_id === et.id && alvo.has(i.id as string)) i.feito = false })
    anotar('devolveu')
    logar(f.id as string, eu, `devolveu ${et.nome}: ${nota.trim()}`)
    gravar()
    return 'devolveu'
  }

  const pendente = b.itens.some(
    (i) => i.etapa_id === et.id && !i.feito && (!i.priv || i.autor_id === eu),
  )
  if (pendente) throw new Error('Ainda existem itens pendentes neste checkpoint.')

  anotar(tipo)
  logar(f.id as string, eu, tipo === 'ressalva'
    ? `aprovou ${et.nome} com ressalva: ${nota.trim()}`
    : `aprovou a saída de ${et.nome}`)

  // A ressalva vira tarefa do checkpoint seguinte, senão ninguém cobra dela.
  const seguinte = etapas[Number(f.atual) + 1]
  if (tipo === 'ressalva' && seguinte) {
    const ordem = b.itens.filter((i) => i.etapa_id === seguinte.id).length
    b.itens.push({
      id: uid('i'), etapa_id: seguinte.id, fluxo_id: f.id,
      texto: `Ressalva: ${nota.trim()}`, resp_id: f.dono_id, prazo: prazo || null,
      feito: false, priv: false, autor_id: eu, ordem, criado_em: agora(),
    })
  }

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

const aprovarEtapa = (fluxoId: string, periodo: string | null) =>
  decidirEtapa(fluxoId, 'aprovou', '', [], periodo, null)

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


/**
 * Cadastro no modo demonstração.
 *
 * Espelha os quatro caminhos de novo_usuario() no banco, para dar para conferir
 * a primeira impressão do produto (a empresa nova nascendo vazia) sem depender
 * de Supabase nenhum. A senha não é verificada: aqui não existe segurança, e
 * dizer o contrário seria mentira. Segurança de verdade é a do banco.
 */
function cadastrarLocal(email: string, dados: Linha): { erro?: string } {
  const b = ler()
  const e = email.trim().toLowerCase()
  if (!e) return { erro: 'Informe um e-mail.' }
  if (b.perfis.some((p) => String(p.email).toLowerCase() === e)) {
    return { erro: 'Este e-mail já tem cadastro. Use "entrar".' }
  }

  const nome = String(dados.nome || '').trim() || e.split('@')[0]
  const codigo = String(dados.convite || '').trim().toUpperCase()

  let orgId: string
  let papel = 'colaborador'
  let ativo = false
  let area: string | null = null
  let gestor: string | null = null
  let veArea = false

  // Espelha novo_usuario() no banco: convite, ou empresa nova. O domínio do
  // e-mail não coloca ninguém dentro de empresa nenhuma.
  const cv = codigo
    ? b.convites.find((c) => String(c.codigo).toUpperCase() === codigo && !c.usado_em)
    : b.convites.find((c) => String(c.email).toLowerCase() === e && !c.usado_em)

  if (cv) {
    orgId = (cv.org_id as string) || 'org1'
    papel = (cv.papel as string) || 'colaborador'
    area = (cv.area_id as string) || null
    gestor = (cv.gestor_id as string) || null
    veArea = !!cv.ve_area
    ativo = true
    cv.usado_em = agora()
  } else {
    orgId = uid('org')
    b.organizacoes.push({
      id: orgId, nome: String(dados.organizacao || nome).trim(),
      tipo: 'equipe', dominio: null,
      entrada_por_dominio: false, dono_id: null,
      multi: false, rotulo: 'Empresa', rotulo_plural: 'Empresas',
      ia_ativa: true, ia_modo: 'sugerir', criado_em: agora(),
    })
    papel = 'admin'
    ativo = true
    veArea = true
  }

  const id = uid('u')
  const paleta = ['#8A8A8A','#B0B0B0','#C9884A','#6F6F6F','#A0704A','#9A9A9A','#7A6A5E','#B5A08C']
  const n = b.perfis.filter((x) => x.org_id === orgId).length
  b.perfis.push({
    id, user_id: id, org_id: orgId, nome, email: e, cor: paleta[n % 8], papel,
    area_id: area, gestor_id: gestor, ve_area: veArea,
    ativo, criado_em: agora(),
  })
  const org = b.organizacoes.find((o) => o.id === orgId)
  if (org && !org.dono_id && papel === 'admin') org.dono_id = id

  definirEuLocal(id)
  gravar()
  return {}
}

/** Espelha meus_espacos() no banco. */
function espacosLocais(): Linha[] {
  const b = ler()
  const u = usuarioLocal()
  const eu = euLocal()
  return b.perfis
    .filter((p) => p.user_id === u)
    .map((p) => {
      const o = b.organizacoes.find((x) => x.id === p.org_id)
      return {
        perfil_id: p.id, org_id: p.org_id, nome: o?.nome ?? 'Espaço',
        tipo: o?.tipo ?? 'equipe', papel: p.papel, ativo: p.ativo, atual: p.id === eu,
      }
    })
    .sort((a, x) => String(x.tipo).localeCompare(String(a.tipo)) || String(a.nome).localeCompare(String(x.nome), 'pt-BR'))
}

function trocarEspacoLocal(perfilId: string): string {
  const p = ler().perfis.find((x) => x.id === perfilId && x.user_id === usuarioLocal())
  if (!p) throw new Error('Este espaço não é seu.')
  definirEuLocal(perfilId)
  ouvintes.forEach((f) => f())
  return perfilId
}

function abrirEspacoLocal(nome: string, tipo: string): string {
  const b = ler()
  const u = usuarioLocal()
  if (!u) throw new Error('Entre na sua conta primeiro.')
  if (!nome.trim()) throw new Error('Dê um nome ao espaço.')
  const meu = b.perfis.find((x) => x.user_id === u)
  const orgId = uid('org')
  b.organizacoes.push({
    id: orgId, nome: nome.trim(), tipo, dominio: null, entrada_por_dominio: false,
    dono_id: null, multi: false, rotulo: 'Empresa', rotulo_plural: 'Empresas',
    ia_ativa: true, ia_modo: 'sugerir', criado_em: agora(),
  })
  const pid = uid('u')
  b.perfis.push({
    id: pid, user_id: u, org_id: orgId, nome: meu?.nome ?? 'Você', email: meu?.email ?? '',
    cor: meu?.cor ?? '#6E7B8B', papel: 'admin', area_id: null, gestor_id: null,
    ve_area: true, ativo: true, criado_em: agora(),
  })
  const o = b.organizacoes.find((x) => x.id === orgId)
  if (o) o.dono_id = pid
  definirEuLocal(pid)
  gravar()
  return pid
}


// ------------------------------------------------------------------ avisos

/**
 * Os avisos no modo demonstração.
 *
 * No banco eles nascem de gatilho: quem troca um responsável escreve na caixa de
 * outra pessoa, e isso só o servidor pode. Aqui não existe servidor, e repetir
 * sete gatilhos em JavaScript seria duplicar regra em dois lugares, que é o jeito
 * mais rápido de os dois discordarem.
 *
 * Então aqui eles são **derivados**: esta função olha a base e escreve o aviso
 * que estaria lá se o gatilho existisse. A chave é a mesma do banco, e a escrita
 * é ignorada quando a chave já existe, exatamente como o `on conflict do nothing`
 * de lá. O resultado é o mesmo do ponto de vista de quem usa: o sino enche, o
 * contador anda, e marcar como lido gruda.
 */
function sincronizarAvisos() {
  const b = ler()
  const eu = euLocal()
  if (!eu) return
  const hoje = hojeIso()
  const tem = new Set((b.avisos as Linha[]).map((a) => `${a.perfil_id}|${a.chave}`))

  const escrever = (a: {
    perfil: string; tipo: string; titulo: string; corpo?: string; chave: string
    urgente?: boolean; fluxo?: string | null; item?: string | null; canal?: string | null
    quando?: string
  }) => {
    if (a.perfil !== eu) return
    if (tem.has(`${a.perfil}|${a.chave}`)) return
    tem.add(`${a.perfil}|${a.chave}`)
    ;(b.avisos as Linha[]).push({
      id: `av-${a.chave}`, perfil_id: a.perfil, tipo: a.tipo, titulo: a.titulo,
      corpo: a.corpo || '', urgente: !!a.urgente, chave: a.chave,
      fluxo_id: a.fluxo || null, item_id: a.item || null, etapa_id: null, canal_id: a.canal || null,
      lido_em: null, entregue_em: null, criado_em: a.quando || agora(),
    })
  }

  const fluxoDe = (id: unknown) => b.fluxos.find((f) => f.id === id)
  const etapaDe = (id: unknown) => b.etapas.find((e) => e.id === id)

  for (const i of b.itens as Linha[]) {
    const f = fluxoDe(i.fluxo_id)
    const e = etapaDe(i.etapa_id)
    if (!f || !e || f.concluido) continue
    const naVez = e.ordem === f.atual

    // Tarefa que passaram para você.
    if (i.resp_id && i.resp_id !== f.dono_id) {
      escrever({
        perfil: i.resp_id as string, tipo: 'tarefa', titulo: 'Nova tarefa com você',
        corpo: `${i.texto} · ${f.nome}`, chave: `tarefa:${i.id}:${i.resp_id}`,
        fluxo: f.id as string, item: i.id as string, quando: (i.criado_em as string) || agora(),
      })
    }

    // Prazo vencido ou vencendo hoje, só no checkpoint da vez.
    if (naVez && !i.feito && i.resp_id && i.prazo && (i.prazo as string) <= hoje && !f.travado_motivo) {
      const venceu = (i.prazo as string) < hoje
      escrever({
        perfil: i.resp_id as string, tipo: 'prazo',
        titulo: `${venceu ? 'Venceu' : 'Vence hoje'}: ${i.texto}`,
        corpo: f.nome as string, chave: `prazo:${i.id}:${hoje}`, urgente: venceu,
        fluxo: f.id as string, item: i.id as string,
      })
    }

    // Destravou: tudo que esta tarefa esperava já saiu.
    if (!i.feito && i.resp_id) {
      const travas = (b.dependencias as Linha[]).filter((d) => d.item_id === i.id)
      if (travas.length) {
        const abertas = travas.filter((d) =>
          !(b.itens as Linha[]).find((x) => x.id === d.depende_de)?.feito)
        if (!abertas.length) {
          escrever({
            perfil: i.resp_id as string, tipo: 'destravou', titulo: 'Destravou: já dá para tocar',
            corpo: i.texto as string, chave: `destravou:${i.id}`, urgente: true,
            fluxo: f.id as string, item: i.id as string,
          })
        }
      }
    }
  }

  // Checkpoint da vez com o checklist completo: quem aprova precisa saber.
  for (const e of b.etapas as Linha[]) {
    const f = fluxoDe(e.fluxo_id)
    if (!f || f.concluido || e.ordem !== f.atual || !e.aprovador_id) continue
    const itens = (b.itens as Linha[]).filter((i) => i.etapa_id === e.id)
    if (itens.length && itens.every((i) => i.feito)) {
      escrever({
        perfil: e.aprovador_id as string, tipo: 'aprovacao', titulo: 'Checkpoint pronto para aprovar',
        corpo: `${e.nome} · ${f.nome}`, chave: `aprovacao:${e.id}`, urgente: true,
        fluxo: f.id as string,
      })
    }
  }

  // Te chamaram na conversa.
  const meu = b.perfis.find((p) => p.id === eu)
  const primeiro = String(meu?.nome || '').trim().split(/\s+/)[0]
  if (primeiro) {
    const arroba = new RegExp(`@${primeiro}($|[^\\p{L}])`, 'iu')
    for (const m of b.mensagens as Linha[]) {
      if (m.autor_id === eu || !arroba.test(String(m.texto || ''))) continue
      const canal = b.canais.find((c) => c.id === m.canal_id)
      const quem = b.perfis.find((p) => p.id === m.autor_id)
      escrever({
        perfil: eu, tipo: 'citacao',
        titulo: `${quem?.nome || 'Alguém'} te chamou em #${canal?.nome || 'conversa'}`,
        corpo: String(m.texto || '').slice(0, 180), chave: `citacao:${m.id}:${eu}`,
        canal: m.canal_id as string, quando: (m.criado_em as string) || agora(),
      })
    }
  }

  gravar()
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
      // A caixa de aviso é derivada da base. Ver sincronizarAvisos acima.
      if (tabela === 'avisos') sincronizarAvisos()
      return {
        select: (colunas?: string) => new Consulta(tabela, 'select').select(colunas),
        insert: (corpo: Linha) => new Consulta(tabela, 'insert', corpo),
        upsert: (corpo: Linha, _op?: unknown) => new Consulta(tabela, 'upsert', corpo),
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
        if (nome === 'ler_avisos') {
          const b = ler()
          const eu = euLocal()
          const ids = (args.p_ids as string[] | null) ?? null
          let n = 0
          for (const a of b.avisos as Linha[]) {
            if (a.perfil_id !== eu || a.lido_em) continue
            if (ids && !ids.includes(a.id as string)) continue
            a.lido_em = agora(); n++
          }
          gravar()
          return { data: n, error: null }
        }
        if (nome === 'gerar_avisos_de_prazo') { sincronizarAvisos(); return { data: 0, error: null } }
        if (nome === 'meus_espacos') return { data: espacosLocais(), error: null }
        if (nome === 'trocar_espaco') {
          return { data: trocarEspacoLocal(args.p_perfil as string), error: null }
        }
        if (nome === 'abrir_espaco') {
          return {
            data: abrirEspacoLocal(String(args.p_nome || ''), String(args.p_tipo || 'equipe')),
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
        if (nome === 'leituras_do_mes') return { data: 0, error: null }
        if (nome === 'gasto_do_mes') return { data: 0, error: null }
        if (nome === 'pode_chamar_modelo') return { data: false, error: null }
        if (nome === 'modelo_da_org') return { data: '', error: null }
        if (nome === 'registrar_consumo') return { data: null, error: null }
        if (nome === 'cascata') {
          return { data: cascataLocal(args.p_item as string, args.p_novo as string), error: null }
        }
        if (nome === 'aplicar_cascata') {
          return {
            data: aplicarCascataLocal(
              args.p_item as string, args.p_novo as string, String(args.p_motivo || ''),
            ),
            error: null,
          }
        }
        if (nome === 'decidir_prazo') {
          return {
            data: decidirPrazoLocal(args.p_pedido as string, !!args.p_aceita),
            error: null,
          }
        }
        if (nome === 'decidir_etapa') {
          return {
            data: decidirEtapa(
              args.p_fluxo as string,
              String(args.p_tipo || 'aprovou'),
              String(args.p_nota || ''),
              (args.p_reabrir as string[]) || [],
              (args.p_periodo as string) || null,
              (args.p_prazo as string) || null,
            ),
            error: null,
          }
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
      async signInWithPassword(dados?: { email?: string; password?: string }) {
        const e = String(dados?.email || '').trim().toLowerCase()
        const p = ler().perfis.find((x) => String(x.email).toLowerCase() === e)
        if (!p) return { data: null, error: { message: 'E-mail sem cadastro por aqui. Crie a conta ou escolha uma pessoa de exemplo.' } }
        definirEuLocal(p.id as string)
        ouvintes.forEach((f) => f())
        return { data: { user: { id: p.id } }, error: null }
      },
      async signUp(dados?: { email?: string; password?: string; options?: { data?: Linha } }) {
        const r = cadastrarLocal(String(dados?.email || ''), dados?.options?.data || {})
        // `user` vem junto porque o app olha `identities` para saber se o e-mail
        // já tem conta: no Supabase de verdade o cadastro repetido não dá erro,
        // devolve um usuário sem identidade nenhuma. Aqui o e-mail repetido é
        // erro mesmo, então a identidade vai preenchida.
        if (r.erro) {
          return { data: { session: null, user: null }, error: { message: r.erro } }
        }
        // Sessão preenchida: a tela entra direto, sem passo de confirmar e-mail.
        return {
          data: { session: { ok: true }, user: { identities: [{ id: 'local' }] } },
          error: null,
        }
      },
      async updateUser(_dados?: unknown) { return { data: null, error: { message: SO_REAL } } },
      async resetPasswordForEmail(_email?: string, _opcoes?: unknown) { return { data: null, error: { message: SO_REAL } } },
    },
    /**
     * O balde de arquivos. Mesma superfície do Storage do Supabase, para o app
     * chamar igual nos dois mundos: envia, pede o endereço para abrir, e apaga.
     */
    storage: {
      from(_balde: string) {
        return {
          async upload(caminho: string, arquivo: Blob) {
            try {
              await guardar(caminho, arquivo)
              return { data: { path: caminho }, error: null }
            } catch (e) {
              return { data: null, error: { message: (e as Error).message } }
            }
          },
          async createSignedUrl(caminho: string, _segundos?: number) {
            const b = await buscarOuInventar(caminho)
            return { data: { signedUrl: URL.createObjectURL(b) }, error: null }
          },
          async remove(caminhos: string[]) {
            for (const c of caminhos) await jogarFora(c)
            return { data: null, error: null }
          },
        }
      },
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
