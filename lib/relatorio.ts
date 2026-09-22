import { curta, dias, hoje, iso, isoDe } from './datas'
import { entregas, gargalos, indicadores, porArea, porPessoa } from './desempenho'
import { sobrecarga } from './sobrecarga'
import { status } from './regras'
import { equipeDe } from './acesso'
import type {
  Anexo, Area, Canal, Decisao, Fluxo, Mensagem, Perfil, Sugestao,
} from './tipos'

/**
 * Relatório do período.
 *
 * Duas decisões que definem o que sai aqui.
 *
 * **Cada relatório é escrito para uma pergunta, não para um cargo.** "Relatório
 * do CEO" não quer dizer nada sozinho: o que muda é a pergunta que a pessoa tem.
 * Quem executa pergunta "o que eu entreguei e o que está comigo". Quem coordena
 * pergunta "o time está dando conta e onde travou". Quem responde pelo negócio
 * pergunta "as frentes andaram e o que foi decidido". São três relatórios porque
 * são três perguntas, e o cargo só escolhe o padrão.
 *
 * **O relatório não vê nada além do que a pessoa já vê.** Ele é montado dos
 * mesmos dados da tela, que já chegaram filtrados pelo banco. Um relatório que
 * mostrasse mais do que a tela seria um vazamento com capa de PDF: bastaria
 * pedir o relatório para ler o que não se pode ler.
 */

export type Publico = 'pessoa' | 'gestor' | 'dono'

export const PUBLICOS: { id: Publico; nome: string; pergunta: string }[] = [
  { id: 'pessoa', nome: 'Para mim', pergunta: 'o que eu entreguei e o que está comigo' },
  { id: 'gestor', nome: 'Para quem coordena', pergunta: 'o time está dando conta, e onde travou' },
  { id: 'dono', nome: 'Para quem responde pelo negócio', pergunta: 'as frentes andaram, e o que foi decidido' },
]

export type Cadencia = 'diario' | 'semanal' | 'quinzenal' | 'mensal' | 'desligado'

export const CADENCIAS: { id: Cadencia; nome: string; dias: number }[] = [
  { id: 'diario', nome: 'Todo dia', dias: 1 },
  { id: 'semanal', nome: 'Toda semana', dias: 7 },
  { id: 'quinzenal', nome: 'A cada quinze dias', dias: 15 },
  { id: 'mensal', nome: 'Todo mês', dias: 30 },
  { id: 'desligado', nome: 'Não quero', dias: 0 },
]

export type LinhaConversa = {
  canal: Canal
  nome: string
  mensagens: number
  quem: { nome: string; n: number }[]
  /** O que a conversa produziu de trabalho, já decidido. */
  virouTrabalho: { tipo: string; texto: string; porIa: boolean }[]
  decisoes: string[]
  recados: number
}

export type Relatorio = {
  publico: Publico
  de: string
  ate: string
  dias: number
  /** Uma frase que resume o período, para abrir o relatório. */
  abertura: string
  entregou: { texto: string; fluxo: string; quando: string; noPrazo: boolean | null; provas: number }[]
  comigo: { texto: string; fluxo: string; prazo: string | null; atrasada: boolean }[]
  aprovar: { fluxo: string; etapa: string; faltam: number }[]
  numeros: { rotulo: string; valor: string; sobre: string }[]
  time: { nome: string; entregues: number; abertas: number; atrasadas: number; sobrecarga: string }[]
  presos: { fluxo: string; etapa: string; dias: number; aguarda: string | null }[]
  areas: { nome: string; entregues: number; rotinas: number; atrasadas: number }[]
  conversas: LinhaConversa[]
  decisoes: { fluxo: string; etapa: string; tipo: string; nota: string; quem: string; quando: string }[]
  /** O que a leitura fez sozinha no período. Vai sempre, em todo relatório. */
  daIa: { texto: string; quando: string }[]
}

const antes = (n: number) => {
  const x = hoje()
  x.setDate(x.getDate() - n)
  return iso(x)
}

/** A pergunta de quem coordena precisa do alcance dele, não da empresa inteira. */
function meuTime(eu: Perfil, perfis: Perfil[]): Set<string> {
  const s = equipeDe(eu.id, perfis)
  s.add(eu.id)
  return s
}

export function montar(entrada: {
  publico: Publico
  janela: number
  eu: Perfil
  perfis: Perfil[]
  fluxos: Fluxo[]
  areas: Area[]
  canais: Canal[]
  mensagens: Mensagem[]
  sugestoes: Sugestao[]
  decisoes: Decisao[]
  anexosDe: (itemId: string) => Anexo[]
  nomeDe: (id: string | null) => string
}): Relatorio {
  const { publico, janela, eu, perfis, fluxos, areas, canais, mensagens, sugestoes, decisoes } = entrada
  const de = antes(janela)
  const ate = iso(hoje())
  const dentro = (ts: string) => isoDe(ts) >= de

  const feitas = entregas(fluxos, janela)
  const minhas = feitas.filter((e) => e.item.resp_id === eu.id)
  const alcance = meuTime(eu, perfis)

  // ------------------------------------------------------------- o que eu fiz
  const entregou = (publico === 'pessoa' ? minhas : feitas)
    .slice(0, publico === 'pessoa' ? 60 : 30)
    .map((e) => ({
      texto: e.item.texto,
      fluxo: e.fluxo.nome,
      quando: curta(e.quando),
      noPrazo: e.noPrazo,
      provas: entrada.anexosDe(e.item.id).length,
    }))

  const comigo: Relatorio['comigo'] = []
  const aprovar: Relatorio['aprovar'] = []
  for (const f of fluxos) {
    if (f.concluido) continue
    const et = f.etapas[f.atual]
    if (!et) continue
    for (const i of et.itens) {
      if (i.feito || !i.resp_id) continue
      const meu = publico === 'pessoa' ? i.resp_id === eu.id : alcance.has(i.resp_id)
      if (!meu) continue
      comigo.push({
        texto: i.texto, fluxo: f.nome, prazo: i.prazo,
        atrasada: !!i.prazo && dias(i.prazo) < 0,
      })
    }
    if (et.aprovador_id === eu.id && !f.travado_motivo) {
      const faltam = et.itens.filter((i) => !i.feito).length
      aprovar.push({ fluxo: f.nome, etapa: et.nome, faltam })
    }
  }
  comigo.sort((a, b) => Number(b.atrasada) - Number(a.atrasada)
    || (a.prazo || '9999').localeCompare(b.prazo || '9999'))

  // ------------------------------------------------------------- os números
  const ind = indicadores(fluxos, decisoes.filter((d) => dentro(d.criado_em)),
    entrada.anexosDe, janela)
  const numeros = ind
    .filter((i) => i.unidade !== '%' || i.base > 0)
    .map((i) => ({
      rotulo: i.rotulo,
      valor: `${i.valor}${i.unidade}`,
      sobre: i.sobre,
    }))

  // ------------------------------------------------------ o time e os gargalos
  const cargas = sobrecarga(fluxos, perfis, janela)
  const time = publico === 'pessoa' ? [] : porPessoa(fluxos, perfis, janela)
    .filter((l) => publico === 'dono' || alcance.has(l.pessoa.id))
    .map((l) => {
      const c = cargas.find((x) => x.pessoa.id === l.pessoa.id)
      return {
        nome: l.pessoa.nome,
        entregues: l.entregues,
        abertas: l.abertas,
        atrasadas: l.atrasadas,
        sobrecarga: c?.indice === null || !c ? 'pouco para medir' : `${c.indice} de 100`,
      }
    })

  const presos = publico === 'pessoa' ? [] : gargalos(fluxos, entrada.nomeDe).map((g) => ({
    fluxo: g.fluxo.nome, etapa: g.etapa, dias: g.parado, aguarda: g.aprovador,
  }))

  const porAreas: Relatorio['areas'] = publico === 'dono'
    ? porArea(fluxos, areas, janela).map((a) => ({
      nome: a.area.nome, entregues: a.entregues, rotinas: a.rotinas, atrasadas: a.atrasadas,
    }))
    : []

  // --------------------------------------------------------------- conversas
  const conversas: LinhaConversa[] = canais.map((c) => {
    const doCanal = mensagens.filter((m) => m.canal_id === c.id && dentro(m.criado_em))
    const gente = new Map<string, number>()
    for (const m of doCanal) {
      if (m.sistema || !m.autor_id) continue
      gente.set(m.autor_id, (gente.get(m.autor_id) ?? 0) + 1)
    }
    const decididas = sugestoes.filter(
      (s) => s.canal_id === c.id && s.estado === 'aceita' && !s.desfeita_em
        && s.decidido_em && dentro(s.decidido_em),
    )
    return {
      canal: c,
      nome: c.tipo === 'direto'
        ? `Conversa com ${entrada.nomeDe(c.membros.find((x) => x !== eu.id) || null)}`
        : c.nome,
      mensagens: doCanal.filter((m) => !m.sistema).length,
      quem: [...gente.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([id, n]) => ({ nome: entrada.nomeDe(id), n })),
      virouTrabalho: decididas
        .filter((s) => s.tipo !== 'decisao')
        .map((s) => ({ tipo: s.tipo, texto: s.texto, porIa: s.por_ia })),
      decisoes: decididas.filter((s) => s.tipo === 'decisao').map((s) => s.texto),
      recados: doCanal.filter((m) => m.audio_caminho).length,
    }
  }).filter((l) => l.mensagens || l.virouTrabalho.length || l.decisoes.length)
    .sort((a, b) => b.mensagens - a.mensagens)

  // ---------------------------------------------- decisões de checkpoint
  const porFluxo = new Map(fluxos.map((f) => [f.id, f]))
  const decisoesDoPeriodo = decisoes
    .filter((d) => dentro(d.criado_em) && porFluxo.has(d.fluxo_id))
    .map((d) => {
      const f = porFluxo.get(d.fluxo_id)!
      const et = f.etapas.find((e) => e.id === d.etapa_id)
      return {
        fluxo: f.nome,
        etapa: et?.nome || '',
        tipo: d.tipo === 'devolveu' ? 'Devolvido' : d.tipo === 'ressalva' ? 'Ressalva' : 'Aprovado',
        nota: d.nota,
        quem: entrada.nomeDe(d.quem_id),
        quando: curta(isoDe(d.criado_em)),
      }
    })
    .sort((a, b) => b.quando.localeCompare(a.quando))

  // ---------------------------------------------- o que a leitura fez sozinha
  const daIa = sugestoes
    .filter((s) => s.por_ia && s.estado === 'aceita' && !s.desfeita_em
      && s.decidido_em && dentro(s.decidido_em))
    .map((s) => ({ texto: s.texto, quando: curta(isoDe(s.decidido_em!)) }))

  // ------------------------------------------------------------- a abertura
  const atrasadas = comigo.filter((c) => c.atrasada).length
  const trechos: string[] = []
  if (publico === 'pessoa') {
    trechos.push(`${minhas.length} ${minhas.length === 1 ? 'entrega' : 'entregas'}`)
    trechos.push(`${comigo.length} ainda ${comigo.length === 1 ? 'aberta' : 'abertas'}`)
    if (atrasadas) trechos.push(`${atrasadas} ${atrasadas === 1 ? 'atrasada' : 'atrasadas'}`)
    if (aprovar.length) trechos.push(`${aprovar.length} ${aprovar.length === 1 ? 'checkpoint' : 'checkpoints'} esperando o seu aceite`)
  } else {
    trechos.push(`${feitas.length} ${feitas.length === 1 ? 'entrega' : 'entregas'}`)
    const emRisco = fluxos.filter((f) => ['late', 'hold'].includes(status(f))).length
    if (emRisco) trechos.push(`${emRisco} ${emRisco === 1 ? 'frente' : 'frentes'} em risco`)
    const conversado = conversas.reduce((n, c) => n + c.mensagens, 0)
    if (conversado) trechos.push(`${conversado} ${conversado === 1 ? 'mensagem' : 'mensagens'} de conversa`)
    if (decisoesDoPeriodo.length) trechos.push(`${decisoesDoPeriodo.length} ${decisoesDoPeriodo.length === 1 ? 'decisão' : 'decisões'} de checkpoint`)
  }

  return {
    publico, de, ate, dias: janela,
    abertura: trechos.join(', ') || 'nada registrado no período',
    entregou, comigo, aprovar, numeros, time, presos, areas: porAreas,
    conversas, decisoes: decisoesDoPeriodo, daIa,
  }
}

/** O relatório em texto, para copiar e colar em e-mail ou mensagem. */
export function comoTexto(r: Relatorio, org: string, quem: string): string {
  const L: string[] = []
  const bloco = (titulo: string, linhas: string[]) => {
    if (!linhas.length) return
    L.push('', titulo.toUpperCase(), ...linhas.map((x) => `  ${x}`))
  }

  L.push(`${org} · relatório de ${curta(r.de)} a ${curta(r.ate)}`)
  L.push(`${PUBLICOS.find((p) => p.id === r.publico)!.nome}, para ${quem}`)
  L.push(r.abertura)

  bloco('Números', r.numeros.map((n) => `${n.rotulo}: ${n.valor} (${n.sobre})`))
  bloco('Entregue no período', r.entregou.map((e) =>
    `${e.texto} · ${e.fluxo} · ${e.quando}${e.noPrazo === false ? ' · fora do prazo' : ''}${e.provas ? ` · ${e.provas} prova(s)` : ''}`))
  bloco('Ainda aberto', r.comigo.map((c) =>
    `${c.texto} · ${c.fluxo}${c.prazo ? ` · ${curta(c.prazo)}` : ''}${c.atrasada ? ' · ATRASADA' : ''}`))
  bloco('Esperando o seu aceite', r.aprovar.map((a) =>
    `${a.etapa} · ${a.fluxo}${a.faltam ? ` · faltam ${a.faltam} tarefa(s)` : ' · pronto para decidir'}`))
  bloco('O time', r.time.map((t) =>
    `${t.nome}: ${t.entregues} entregue(s), ${t.abertas} aberta(s), ${t.atrasadas} atrasada(s), sobrecarga ${t.sobrecarga}`))
  bloco('Onde está preso', r.presos.map((p) =>
    `${p.etapa} · ${p.fluxo} · ${p.dias} dia(s)${p.aguarda ? ` · aguarda ${p.aguarda}` : ''}`))
  bloco('Por área', r.areas.map((a) =>
    `${a.nome}: ${a.entregues} entregue(s), ${a.rotinas} rotina(s)${a.atrasadas ? `, ${a.atrasadas} atrasada(s)` : ''}`))

  if (r.conversas.length) {
    L.push('', 'CONVERSAS')
    for (const c of r.conversas) {
      L.push(`  ${c.nome}: ${c.mensagens} mensagem(ns)${c.recados ? `, ${c.recados} recado(s) de voz` : ''}`)
      if (c.quem.length) L.push(`    quem falou: ${c.quem.map((q) => `${q.nome} (${q.n})`).join(', ')}`)
      for (const t of c.virouTrabalho) L.push(`    virou trabalho: ${t.texto}${t.porIa ? ' (pela leitura)' : ''}`)
      for (const d of c.decisoes) L.push(`    decidido: ${d}`)
    }
  }

  bloco('Decisões de checkpoint', r.decisoes.map((d) =>
    `${d.tipo}: ${d.etapa} · ${d.fluxo} · ${d.quem} · ${d.quando}${d.nota ? ` · ${d.nota}` : ''}`))
  bloco('O que a leitura fez sozinha', r.daIa.map((a) => `${a.texto} · ${a.quando}`))

  return L.join('\n')
}
