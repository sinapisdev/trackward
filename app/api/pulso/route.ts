import { NextResponse } from 'next/server'
import { clienteDeServico } from '@/lib/supabase/servico'
import { MODELO, porModelo, semModelo, type Medida } from '@/lib/leitura'
import { podar, type Contexto, type Proposta } from '@/lib/leitor'
import { devePulsar, type Agenda } from '@/lib/pulso'
import { horariosDoRitmo } from '@/lib/ritmo'
import { custoMicro } from '@/lib/precos'
import { escutaAqui, oQueFaz, porPalavras } from '@/lib/agentes'
import { jaFoiRecusada, paraOModelo, quemCostuma, termosDaConversa, ultimoAprendizado } from '@/lib/memoria'
import type { Aprendizado, Lembranca } from '@/lib/memoria'
import { hojeIso } from '@/lib/datas'
import { novoId } from '@/lib/id'
import type { Agente, Canal, Fluxo, Mensagem } from '@/lib/tipos'

/**
 * O pulso: a leitura que roda sem ninguém abrir o app.
 *
 * Até aqui a conversa só era lida quando alguém apertava um botão, o que quer
 * dizer que na semana em que ninguém abriu o TrackWard, nada foi organizado.
 * Esta rota é o que muda isso, e é o primeiro passo da virada de aplicativo para
 * serviço: o trabalho fica organizado enquanto a empresa trabalha, e não quando
 * a empresa lembra do app.
 *
 * QUEM CHAMA É UM RELÓGIO, de hora em hora, e relógio não tem sessão. Por isso:
 *
 *   - o acesso é pelo cliente de serviço, que enxerga todas as empresas
 *   - o segredo vai no cabeçalho, e sem ele a rota recusa
 *   - o teto não pode ser perguntado com `minha_org()`, e sim com a organização
 *     do laço, pelas funções `pulso_pode` e `registrar_consumo_de`, que só o
 *     service_role tem permissão de executar
 *
 * E O QUE ELA NÃO FAZ, de propósito: **ela não aceita proposta nenhuma.** O
 * pulso lê, entende e deixa a proposta pronta com o trecho que deu origem. Quem
 * aceita é gente, pelo app ou (no bloco B) pelo WhatsApp. É a regra que vale no
 * produto inteiro: a IA observa, conclui, propõe e pergunta, mas não decide.
 */

/** "08:00-19:00" em minutos. Mesma leitura que `lib/pulso.ts` faz. */
function faixa(j: string): { de: number; ate: number } {
  const m = /^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/.exec((j || '').trim())
  if (!m) return { de: 8 * 60, ate: 19 * 60 }
  return { de: +m[1] * 60 + +m[2], ate: +m[3] * 60 + +m[4] }
}

export const runtime = 'nodejs'

/**
 * ====================  TETOS DO PLANO HOBBY DA VERCEL  ====================
 *
 * Os três números abaixo estão apertados de propósito, e não por desenho: o
 * plano Hobby limita função a 60 segundos e **só aceita cron uma vez por dia**.
 * Com o cron de hora em hora que este bloco pedia, o build nem chegava a
 * compilar: ele falhava na validação, e por isso nenhum deploy aparecia na
 * lista, nem como erro.
 *
 * AO ASSINAR O PRO, devolver os três de uma vez:
 *
 *   maxDuration      60  ->  300
 *   CANAIS_POR_VEZ    4  ->   12
 *   vercel.json       "0 20 * * *"  ->  "0 * * * *"
 *
 * O de hora em hora é o que o desenho quer: `devePulsar` distribui as leituras
 * do dia pela janela da empresa, e só uma batida por hora consegue acertar cada
 * horário. Uma vez por dia, a empresa lê uma vez em vez de três, sempre no
 * horário mais tarde que já passou.
 * ==========================================================================
 */
export const maxDuration = 60

/**
 * Quantos canais lê por empresa em cada batida. Segura o tempo e o gasto.
 *
 * Quatro, e não doze, porque em 60 segundos doze chamadas de modelo não cabem.
 * Estourar o tempo no meio não perde trabalho (cada canal marca
 * `lido_pela_ia_em` assim que termina), mas deixa metade da casa sem ler sem
 * ninguém saber.
 */
const CANAIS_POR_VEZ = 4
/** Quanto da conversa entra no pedido. O que ficou combinado está no fim. */
const MENSAGENS = 40
/** De quanto tempo atrás carregar conversa, para o aprendizado ter com o que comparar. */
const DIAS_DE_CONVERSA = 30

type Org = Agenda & {
  id: string
  nome: string
  ia_ativa: boolean
  ia_modo: string
}

type Linha = Record<string, unknown>


/**
 * O segredo que autoriza o relógio a chamar esta rota.
 *
 * São dois nomes para a mesma coisa, e o segundo existe por imposição da
 * hospedagem: o cron da Vercel não deixa escrever cabeçalho à mão, ele manda
 * `authorization: Bearer <CRON_SECRET>` e pronto. Aceitar os dois é o que faz
 * a mesma rota servir ao cron da Vercel, ao pg_cron do Supabase e a um relógio
 * de fora, sem ninguém ter que lembrar de qual é qual.
 */
function relogioAutorizado(req: Request): boolean {
  const veio = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!veio) return false
  const aceitos = [process.env.TRACK_AVISOS_SEGREDO, process.env.CRON_SECRET].filter(Boolean)
  return aceitos.some((s) => s === veio)
}

/**
 * O cron da Vercel chama por GET, e um relógio de fora costuma chamar por POST.
 * Os dois caem aqui: o método não diz nada sobre quem está chamando, e recusar
 * por causa dele fazia o relógio da hospedagem bater todo dia numa porta
 * fechada, em silêncio, sem ninguém nunca descobrir.
 */
export async function GET(req: Request) { return POST(req) }

export async function POST(req: Request) {
  // O segredo é conferido ANTES de qualquer outra coisa, inclusive antes de
  // olhar se o servidor tem chave de serviço. Quem bate aqui sem credencial não
  // precisa nem saber como este servidor está configurado.
  if (!relogioAutorizado(req)) {
    return NextResponse.json({ erro: 'Não autorizado.' }, { status: 401 })
  }

  const sb = clienteDeServico()
  if (!sb) {
    return NextResponse.json({
      erro: 'Falta SUPABASE_SERVICE_ROLE no servidor. Sem ela o pulso não enxerga empresa nenhuma.',
    }, { status: 503 })
  }

  const agora = new Date()
  const { data: orgs } = await sb
    .from('organizacoes')
    .select('id,nome,ia_ativa,ia_modo,leitura_por_dia,leitura_janela,fuso,pulso_em')
    .eq('ia_ativa', true)
    .gt('leitura_por_dia', 0)

  /**
   * O ritmo de cada casa, aprendido do que já aconteceu.
   *
   * A conversa dos últimos trinta dias diz em que horas a empresa fala, e a
   * leitura acontece meia hora depois de cada pico. Sem conversa suficiente,
   * `horariosDoRitmo` devolve vazio e o pulso volta a espalhar pela janela:
   * aprender de três mensagens é inventar padrão onde só há acaso.
   */
  const desde = new Date(agora.getTime() - 30 * 86400000).toISOString()
  const ritmo = new Map<string, number[]>()
  for (const o of (orgs || []) as Org[]) {
    const { data: q } = await sb.from('mensagens')
      .select('criado_em').eq('org_id', o.id).gte('criado_em', desde)
      .is('sistema', false).limit(2000)
    const quando = ((q || []) as { criado_em: string }[]).map((x) => x.criado_em)
    const { de, ate } = faixa(o.leitura_janela)
    const aprendidos = horariosDoRitmo(quando, o.fuso, o.leitura_por_dia, de, ate)
    ritmo.set(o.id, aprendidos)
    // Guardado para a tela poder explicar a escolha. Horário aprendido que não
    // se explica é indistinguível de horário aleatório.
    await sb.from('organizacoes')
      .update({ pulso_horarios: aprendidos, pulso_amostra: quando.length })
      .eq('id', o.id)
  }

  const naVez = ((orgs || []) as Org[])
    .filter((o) => devePulsar(o, agora, ritmo.get(o.id) || []).bate)
  const relatorio: { org: string; canais: number; propostas: number; motor: string }[] = []

  for (const org of naVez) {
    try {
      const r = await pulsar(sb, org, agora)
      relatorio.push({ org: org.nome, ...r })
    } catch (e) {
      // Uma empresa com problema não pode calar as outras. O erro vai para o log
      // do servidor e o laço segue.
      console.error('pulso falhou', org.id, e)
    }
    // A marca sobe mesmo quando a leitura não achou nada: o que ela marca é que
    // a varredura daquele horário aconteceu, não que ela produziu resultado.
    await sb.from('organizacoes').update({ pulso_em: agora.toISOString() }).eq('id', org.id)
  }

  return NextResponse.json({ quando: agora.toISOString(), organizacoes: relatorio })
}

// --------------------------------------------------------------- uma empresa

type Servico = NonNullable<ReturnType<typeof clienteDeServico>>

async function pulsar(sb: Servico, org: Org, agora: Date) {
  const desde = new Date(agora.getTime() - DIAS_DE_CONVERSA * 864e5).toISOString()

  const [perfis, canais, mensagens, fluxos, etapas, itens, memoria, agentes, areas, processos, sugestoes] =
    await Promise.all([
      todas(sb, 'perfis', org.id, 'id,nome,ativo,area_id'),
      todas(sb, 'canais', org.id, 'id,nome,tipo,area_id,fluxo_id,lido_pela_ia_em,arquivado'),
      conversaRecente(sb, org.id, desde),
      todas(sb, 'fluxos', org.id, 'id,nome,tipo,area_id,atual,concluido,visib'),
      todas(sb, 'etapas', org.id, 'id,fluxo_id,nome,ordem'),
      todas(sb, 'itens', org.id, 'id,etapa_id,texto,resp_id,feito,prazo,priv'),
      todas(sb, 'memoria', org.id, '*'),
      todas(sb, 'agentes', org.id, '*'),
      todas(sb, 'areas', org.id, 'id,nome'),
      todas(sb, 'processos', org.id, 'id,nome'),
      todas(sb, 'sugestoes', org.id, 'id,canal_id,tipo,texto,estado,mensagem_id,dados'),
    ])

  const nomeDe = (id: string | null) =>
    (perfis.find((p) => p.id === id)?.nome as string) || 'alguém'
  const nomeDaArea = (id: string | null) =>
    (areas.find((a) => a.id === id)?.nome as string) || 'sem área'
  const nomeDoProcesso = (id: string | null) =>
    (processos.find((p) => p.id === id)?.nome as string) || 'um processo'

  /** A etapa da vez de uma esteira, pela posição em `atual`. */
  const etapasDe = (fluxoId: string) =>
    etapas.filter((e) => e.fluxo_id === fluxoId).sort((a, b) => Number(a.ordem) - Number(b.ordem))
  const etapaAtualDe = (f: Linha) => etapasDe(f.id as string)[Number(f.atual) || 0] || null
  const itensDe = (etapaId: string) => itens.filter((i) => i.etapa_id === etapaId)

  /**
   * O que a casa tem, para a proposta ter endereço e não repetir o que existe.
   * Espelha `oQueACasaTem` da tela. Tarefa privada fica de fora: ela é de quem
   * criou, e a proposta que saísse daqui seria lida por quem não pode saber.
   */
  const publicas = fluxos.filter((f) => !f.concluido && f.visib === 'equipe')
  const casa = {
    tracks: publicas.map((f) => ({
      id: f.id as string, nome: f.nome as string, tipo: f.tipo as string,
      etapa_id: (etapaAtualDe(f)?.id as string) ?? null,
      onde: f.area_id ? nomeDaArea(f.area_id as string) : null,
    })),
    itens: publicas.flatMap((f) => {
      const et = etapaAtualDe(f)
      if (!et) return []
      return itensDe(et.id as string)
        .filter((i) => !i.feito && !i.priv)
        .map((i) => ({
          id: i.id as string, texto: i.texto as string, resp_id: (i.resp_id as string) ?? null,
          feito: false, prazo: (i.prazo as string) ?? null, etapa_id: et.id as string,
          fluxo_id: f.id as string, onde: f.nome as string,
        }))
    }),
    decisoes: sugestoes
      .filter((s) => s.tipo === 'decisao' && s.estado === 'aceita')
      .slice(0, 30)
      .map((s) => ({ texto: s.texto as string, quando: '' })),
  }

  const lembrancas = memoria as unknown as Lembranca[]
  const semSistema = mensagens.filter((m) => !m.sistema && m.texto)

  /**
   * Só entram canais com conversa nova desde a última varredura.
   *
   * É isto que impede o cliente de pagar duas vezes pela mesma mensagem, e é
   * também o que faz o pulso ser barato numa empresa quieta: sem mensagem nova,
   * não há chamada de modelo nenhuma.
   */
  const comNovidade = canais
    .filter((c) => !c.arquivado && c.tipo !== 'pessoal')
    .map((c) => {
      const doCanal = semSistema.filter((m) => m.canal_id === c.id)
      const marca = c.lido_pela_ia_em as string | null
      const novas = marca ? doCanal.filter((m) => (m.criado_em as string) > marca) : doCanal
      return { canal: c, doCanal, novas }
    })
    .filter((x) => x.novas.length)
    .sort((a, b) => b.novas.length - a.novas.length)
    .slice(0, CANAIS_POR_VEZ)

  if (!comNovidade.length) return { canais: 0, propostas: 0, motor: 'nada novo' }

  // O teto, uma vez por empresa. Ver as funções `pulso_pode` e
  // `registrar_consumo_de` no schema: só o service_role executa.
  const { data: podeData } = await sb.rpc('pulso_pode', { p_org: org.id })
  const linha = Array.isArray(podeData) ? podeData[0] : podeData
  const podeGastar = linha?.pode === true
  const modelo = (linha?.modelo as string) || MODELO
  const chave = process.env.ANTHROPIC_API_KEY

  let motor = 'regras'
  let total = 0

  for (const { canal, doCanal, novas } of comNovidade) {
    const f = canal.fluxo_id ? fluxos.find((x) => x.id === canal.fluxo_id) : null
    const et = f ? etapaAtualDe(f) : null

    const ctx: Contexto = {
      hoje: hojeIso(),
      mensagens: doCanal.slice(-MENSAGENS).map((m) => ({
        id: m.id as string, autor_id: (m.autor_id as string) ?? null,
        autor: nomeDe(m.autor_id as string), texto: m.texto as string,
      })),
      pessoas: perfis.filter((p) => p.ativo).map((p) => ({ id: p.id as string, nome: p.nome as string })),
      fluxo: f ? {
        id: f.id as string, nome: f.nome as string, etapa_id: (et?.id as string) ?? null,
        itens: etapasDe(f.id as string).flatMap((e) => itensDe(e.id as string).map((i) => ({
          id: i.id as string, texto: i.texto as string, resp_id: (i.resp_id as string) ?? null,
          feito: !!i.feito, prazo: (i.prazo as string) ?? null, etapa_id: e.id as string,
        }))),
      } : null,
      memoria: paraOModelo(lembrancas),
      casa: {
        tracks: casa.tracks.filter((t) => t.id !== f?.id),
        itens: casa.itens.filter((i) => i.fluxo_id !== f?.id),
        decisoes: casa.decisoes,
      },
      canal_id: canal.id as string,
      // Canal nunca é despejo: o que a pessoa escreve para si mesma mora nas
      // notas, e a leitura de lá é outra, com outras regras.
      despejo: false,
      agentes: (agentes as unknown as Agente[])
        .filter((a) => escutaAqui(a, canal as unknown as Canal))
        .map((a) => ({
          id: a.id, nome: a.nome, reconhecer: a.reconhecer,
          faz: oQueFaz(a, nomeDoProcesso, nomeDaArea),
        })),
    }

    let propostas: Proposta[] = []
    if (chave && podeGastar) {
      const medida: { valor: Medida | null } = { valor: null }
      try {
        const doModelo = await porModelo(ctx, chave, modelo, medida)
        // Grava o gasto mesmo quando a resposta não serviu: o token foi cobrado
        // de qualquer jeito, e medidor que só conta acerto mede errado.
        if (medida.valor) {
          const m = medida.valor
          await sb.rpc('registrar_consumo_de', {
            p_org: org.id, p_onde: 'leitor', p_modelo: m.modelo,
            p_entrada: m.entrada, p_saida: m.saida,
            p_cache_leitura: m.cacheLeitura, p_cache_escrita: m.cacheEscrita,
            p_custo_micro: custoMicro(m.modelo, {
              entrada: m.entrada, saida: m.saida,
              cacheLeitura: m.cacheLeitura, cacheEscrita: m.cacheEscrita,
            }),
            p_canal: canal.id as string,
          })
        }
        if (doModelo) { propostas = doModelo; motor = 'ia' }
      } catch {
        // Modelo fora do ar não pode deixar a varredura sem ler.
      }
    }

    if (!propostas.length) {
      propostas = semModelo(ctx)
      // Sem modelo, os agentes entram pelas palavras que a empresa escreveu. É
      // mais bruto e ainda assim útil: é a diferença entre o agente existir e
      // não existir naquele dia.
      const jaDeAgente = sugestoes.filter((s) => s.canal_id === canal.id)
      propostas = podar([...propostas, ...porPalavras(
        agentes as unknown as Agente[], canal as unknown as Canal,
        doCanal as unknown as Mensagem[], canal.lido_pela_ia_em as string | null,
        (agenteId, msgId) => jaDeAgente.some((v) =>
          v.tipo === 'agente'
          && (v.dados as { agente_id?: string } | null)?.agente_id === agenteId
          && v.mensagem_id === msgId),
      )])
    }

    total += await gravar(sb, org, canal, propostas, sugestoes, lembrancas)

    // Aprende o vocabulário desta frente. Precisa das mensagens dos OUTROS
    // canais para separar palavra da casa de português comum.
    const deFora = semSistema.filter((m) => m.canal_id !== canal.id)
    await aprender(sb, org.id, termosDaConversa(
      canal as unknown as Canal,
      novas as unknown as Mensagem[],
      deFora as unknown as Mensagem[],
      (f as unknown as Fluxo) ?? null,
      ultimoAprendizado(canal.id as string, lembrancas, canal as unknown as Canal),
    ), lembrancas)

    await sb.from('canais').update({ lido_pela_ia_em: agora.toISOString() }).eq('id', canal.id)
  }

  return { canais: comNovidade.length, propostas: total, motor }
}

// ------------------------------------------------------------------ gravação

/** Grava as propostas novas. Devolve quantas entraram. */
async function gravar(
  sb: Servico, org: Org, canal: Linha,
  propostas: Proposta[], sugestoes: Linha[], memoria: Lembranca[],
) {
  const jaVistas = sugestoes.filter((s) => s.canal_id === canal.id)
  const novas = propostas
    .filter((p) => !jaVistas.some(
      (v) => String(v.texto).trim().toLowerCase() === p.texto.trim().toLowerCase()))
    .filter((p) => !jaFoiRecusada(p, memoria))
    .map((p) => {
      // Sem responsável na proposta, a casa pode já ter ensinado quem costuma
      // pegar este assunto. É palpite, e por isso continua sendo proposta.
      if (p.dados.resp_id) return p
      const quem = quemCostuma(p.texto, memoria)
      return quem ? { ...p, dados: { ...p.dados, resp_id: quem } } : p
    })

  let n = 0
  for (const p of novas) {
    const { error } = await sb.from('sugestoes').insert({
      id: novoId(), org_id: org.id, canal_id: canal.id, nota_id: null,
      mensagem_id: p.mensagem_id, tipo: p.tipo, texto: p.texto, motivo: p.motivo,
      dados: p.dados, estado: 'aberta',
    })
    if (!error) {
      n++
      // A lista em memória cresce junto, senão dois canais lidos na mesma
      // batida proporiam a mesma coisa duas vezes.
      sugestoes.push({ canal_id: canal.id, tipo: p.tipo, texto: p.texto, estado: 'aberta' })
    }
  }
  return n
}

/** Guarda o que a casa ensinou, somando peso ao que já existia. */
async function aprender(sb: Servico, orgId: string, licoes: Aprendizado[], memoria: Lembranca[]) {
  for (const l of licoes) {
    const antiga = memoria.find((m) => m.tipo === l.tipo && m.chave === l.chave)
    if (antiga) {
      await sb.from('memoria').update({
        peso: antiga.peso + 1, valor: l.valor, visto_em: new Date().toISOString(),
      }).eq('id', antiga.id)
      antiga.peso += 1
    } else {
      const id = novoId()
      const { error } = await sb.from('memoria').insert({
        id, org_id: orgId, tipo: l.tipo, chave: l.chave, valor: l.valor,
        fluxo_id: l.fluxo_id ?? null, area_id: l.area_id ?? null,
        perfil_id: l.perfil_id ?? null, exemplo: l.exemplo, peso: 1,
        visto_em: new Date().toISOString(),
      })
      if (!error) memoria.push({ ...l, id, peso: 1 } as unknown as Lembranca)
    }
  }
}

// ------------------------------------------------------------------ consulta

/**
 * Uma tabela inteira de uma organização.
 *
 * Sem genérico e sem callback de propósito: a tipagem do supabase-js para
 * consulta montada por partes entra em recursão e o build morre num erro que não
 * ajuda ninguém. Duas funções simples valem mais que uma esperta.
 */
async function todas(sb: Servico, tabela: string, orgId: string, campos: string): Promise<Linha[]> {
  const { data } = await sb.from(tabela).select(campos).eq('org_id', orgId)
  return (data || []) as unknown as Linha[]
}

/** A conversa recente, que é a única consulta do pulso com recorte de tempo. */
async function conversaRecente(sb: Servico, orgId: string, desde: string): Promise<Linha[]> {
  const { data } = await sb
    .from('mensagens')
    .select('id,canal_id,autor_id,texto,sistema,criado_em')
    .eq('org_id', orgId)
    .gte('criado_em', desde)
    .order('criado_em')
  return (data || []) as unknown as Linha[]
}
