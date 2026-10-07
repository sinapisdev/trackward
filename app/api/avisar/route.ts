import { NextResponse } from 'next/server'
import webpush from 'web-push'
import { clienteDeServico } from '@/lib/supabase/servico'
import { mandarWhats as whatsDaEmpresa } from '@/lib/whats'
import { decifrar } from '@/lib/cifra'
import { acaoDoAviso, comoTexto, destino, podeSair, telefoneLimpo } from '@/lib/avisos'
import type { Aviso, AvisoContato } from '@/lib/tipos'

/**
 * A entrega do aviso fora do app.
 *
 * O aviso nasce no banco (seção 14 do schema) e fica lá, com `entregue_em` vazio.
 * Esta rota é quem tira ele de lá e põe no celular de alguém, por push e por
 * WhatsApp. Ela é a única parte do sistema que usa a chave de serviço, porque
 * quem a chama é um relógio, e relógio não tem sessão.
 *
 * **Ela é idempotente e não se importa com quem chamou.** Marca `entregue_em`
 * antes de tentar mandar, de propósito: se a entrega falhar, o aviso continua no
 * sino, que é onde ele nunca se perde. O contrário, tentar de novo para sempre,
 * é como se toca o celular de alguém dez vezes com a mesma frase.
 *
 * COMO CHAMAR TODO DIA, em ordem de preferência:
 *
 *   1. Vercel Cron, se o app estiver na Vercel: `vercel.json` já tem a entrada.
 *   2. pg_cron mais pg_net no Supabase, se o projeto tiver as duas extensões.
 *   3. Qualquer relógio de fora (cron-job.org, GitHub Actions) batendo aqui.
 *
 * Em todas, o segredo vai no cabeçalho `authorization: Bearer <TRACK_AVISOS_SEGREDO>`.
 * Sem o segredo, e sem sessão de gente logada, a rota recusa: quem alcança este
 * endereço dispara mensagem no celular de terceiros, e isso não pode ficar aberto.
 */

export const runtime = 'nodejs'
export const maxDuration = 60

type Assinatura = { id: string; endpoint: string; p256dh: string; auth: string }
type Conector = { base_url: string; auth_tipo: string; auth_nome: string; segredo_cifrado: string; ativo: boolean }

/** O par VAPID, que é o que prova ao navegador que o push é deste app. */
function prepararVapid(): boolean {
  const pub = process.env.VAPID_CHAVE_PUBLICA || process.env.NEXT_PUBLIC_VAPID_CHAVE
  const priv = process.env.VAPID_CHAVE_PRIVADA
  if (!pub || !priv) return false
  webpush.setVapidDetails(process.env.VAPID_CONTATO || 'mailto:avisos@trackward.com.br', pub, priv)
  return true
}

/** O endereço público do app, para o aviso levar a pessoa ao lugar certo. */
function base(req: Request): string {
  const env = process.env.NEXT_PUBLIC_URL
  if (env) return env.replace(/\/+$/, '')
  const u = new URL(req.url)
  return `${u.protocol}//${u.host}`
}


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
  // O segredo vem antes da chave de serviço: quem bate aqui sem credencial não
  // precisa nem saber como este servidor está configurado.
  if (!relogioAutorizado(req)) {
    return NextResponse.json({ erro: 'Não autorizado.' }, { status: 401 })
  }

  const sb = clienteDeServico()
  if (!sb) {
    return NextResponse.json({
      erro: 'Falta SUPABASE_SERVICE_ROLE no servidor. Sem ela não dá para entregar aviso de ninguém.',
    }, { status: 503 })
  }

  // 1. O tempo não dispara gatilho, então o aviso de prazo é gerado aqui, uma
  //    vez por chamada. A função é idempotente pela chave do dia.
  const { data: novos } = await sb.rpc('gerar_avisos_de_prazo')

  // 2. O que ainda não saiu daqui. O teto existe para uma fila represada não
  //    virar uma rajada de trezentas mensagens no celular de alguém.
  const { data: fila } = await sb
    .from('avisos')
    .select('*')
    .is('entregue_em', null)
    .order('criado_em')
    .limit(200)

  const avisos = (fila || []) as Aviso[]
  if (!avisos.length) return NextResponse.json({ gerados: novos ?? 0, enviados: 0 })

  // 3. Marca como entregue ANTES de mandar. Ver o comentário do topo: falha de
  //    entrega deixa o aviso no sino, que é onde ele não se perde. Repetir a
  //    tentativa é que seria ruim para quem recebe.
  await sb.from('avisos').update({ entregue_em: new Date().toISOString() })
    .in('id', avisos.map((a) => a.id))

  const perfis = [...new Set(avisos.map((a) => a.perfil_id))]
  const { data: contatos } = await sb.from('avisos_contato').select('*').in('perfil_id', perfis)
  const porPerfil = new Map<string, AvisoContato>(
    ((contatos || []) as AvisoContato[]).map((c) => [c.perfil_id, c]),
  )

  const { data: assinaturas } = await sb
    .from('push_assinaturas').select('id,perfil_id,endpoint,p256dh,auth').in('perfil_id', perfis)
  const pushDe = new Map<string, Assinatura[]>()
  for (const a of (assinaturas || []) as (Assinatura & { perfil_id: string })[]) {
    const lista = pushDe.get(a.perfil_id)
    if (lista) lista.push(a)
    else pushDe.set(a.perfil_id, [a])
  }

  const temVapid = prepararVapid()
  const endereco = base(req)
  let enviados = 0
  let porWhats = 0
  const mortos: string[] = []

  for (const aviso of avisos) {
    const contato = porPerfil.get(aviso.perfil_id) || null
    if (!podeSair(aviso, contato)) continue

    // --- push ------------------------------------------------------------
    if (temVapid && contato?.push) {
      for (const assin of pushDe.get(aviso.perfil_id) || []) {
        try {
          await webpush.sendNotification(
            { endpoint: assin.endpoint, keys: { p256dh: assin.p256dh, auth: assin.auth } },
            JSON.stringify({
              titulo: aviso.titulo,
              corpo: aviso.corpo,
              chave: aviso.chave,
              urgente: aviso.urgente,
              url: `${endereco}${destino(aviso)}`,
              // O botão da notificação, onde o aparelho deixa ter um. Ver
              // `acaoDoAviso`: hoje só a proposta tem.
              acao: acaoDoAviso(aviso)
                ? { rotulo: acaoDoAviso(aviso)!.rotulo,
                    url: `${endereco}${acaoDoAviso(aviso)!.caminho}` }
                : null,
            }),
            { TTL: 60 * 60 * 12, urgency: aviso.urgente ? 'high' : 'normal' },
          )
          enviados++
        } catch (e) {
          // 404 e 410 são o navegador dizendo que aquele aparelho não existe
          // mais. Guardar assinatura morta é gastar uma chamada por aviso para
          // sempre, então ela sai.
          const st = (e as { statusCode?: number }).statusCode
          if (st === 404 || st === 410) mortos.push(assin.id)
        }
      }
    }

    // --- whatsapp --------------------------------------------------------
    /**
     * Aqui o aviso deixa de ser recado e vira PERGUNTA.
     *
     * É o que fecha o ciclo do bloco B: sem isto, nada cria pergunta sozinho, e
     * o WhatsApp só responderia a quem já sabia o que perguntar. Um aviso que
     * carrega uma decisão ("o checkpoint está pronto") é mais útil como
     * pergunta do que como recado, porque a resposta resolve a coisa em vez de
     * mandar a pessoa abrir o app.
     *
     * **Uma pergunta em aberto por pessoa por vez** (B6 do plano): com duas, um
     * "pronto" solto vira desempate, e desempate por WhatsApp é um toque a mais
     * para todo mundo. Quem já tem pergunta esperando recebe o recado normal.
     */
    if (contato?.whats) {
      const fone = telefoneLimpo(contato.telefone)
      if (fone) {
        const q = comoPergunta(aviso)
        const { count } = q
          ? await sb.from('perguntas_abertas').select('id', { count: 'exact', head: true })
            .eq('perfil_id', aviso.perfil_id).is('respondido_em', null)
            .gt('expirou_em', new Date().toISOString())
          : { count: 0 }

        const vaiPerguntar = q && !count
        const texto = vaiPerguntar ? q.texto : comoTexto(aviso, endereco)
        const sid = await mandarWhats(sb, aviso, fone, texto)
        if (sid) {
          porWhats++
          if (vaiPerguntar) {
            const { data: p } = await sb.from('perfis').select('org_id').eq('id', aviso.perfil_id).single()
            await sb.from('perguntas_abertas').insert({
              org_id: (p as { org_id: string } | null)?.org_id,
              perfil_id: aviso.perfil_id,
              sobre_tipo: q.sobre_tipo, sobre_id: q.sobre_id,
              texto: q.pergunta, opcoes: q.opcoes, msg_externa_id: sid,
            })
          }
        }
      }
    }
  }

  if (mortos.length) await sb.from('push_assinaturas').delete().in('id', mortos)

  return NextResponse.json({
    gerados: novos ?? 0,
    naFila: avisos.length,
    enviados,
    whatsapp: porWhats,
    aparelhosRemovidos: mortos.length,
  })
}

/**
 * Este aviso carrega uma decisão? Então ele vale mais como pergunta.
 *
 * Só três dos dez tipos viram pergunta, e os outros continuam recado porque não
 * há o que responder: "te chamaram numa conversa" não tem sim nem não.
 *
 * O id do pedido de prazo sai da CHAVE, e não de uma coluna: `avisos` não tem
 * `pedido_id`, e a chave já carrega o que identifica cada aviso, por desenho.
 */
function comoPergunta(a: Aviso): {
  sobre_tipo: 'item' | 'etapa' | 'prazo'
  sobre_id: string
  /** O que vai no telefone. */
  texto: string
  /** O que fica guardado, e é contra ele que a frase é comparada depois. */
  pergunta: string
  opcoes: { chave: string; rotulo: string }[] | null
} | null {
  if (a.tipo === 'aprovacao' && a.fluxo_id) {
    return {
      sobre_tipo: 'etapa', sobre_id: a.fluxo_id,
      pergunta: `${a.titulo}: ${a.corpo}`,
      texto: `${a.corpo}\n\nTudo terminou aqui. O que você decide?\n\n`
        + '1) Aprovo\n2) Aprovo com ressalva\n3) Devolvo',
      opcoes: [
        { chave: '1', rotulo: 'Aprovo' },
        { chave: '2', rotulo: 'Aprovo com ressalva' },
        { chave: '3', rotulo: 'Devolvo' },
      ],
    }
  }

  if (a.tipo === 'prazo' && a.item_id) {
    return {
      sobre_tipo: 'item', sobre_id: a.item_id,
      pergunta: a.titulo,
      // Sem lista: aqui "pronto" resolve, e oferecer número para responder
      // "sim" é pôr um passo onde a conversa já funcionava.
      texto: `${a.titulo}\n${a.corpo}\n\nJá ficou pronta? Responda "pronto" se sim.`,
      opcoes: null,
    }
  }

  /**
   * "Travou em quê?" é pergunta de verdade, e a resposta é texto livre: não dá
   * para oferecer lista de motivos que o app não conhece. Ela fecha a pergunta
   * e fica registrada; transformar a resposta em dependência é o passo
   * seguinte, e exige saber de qual tarefa ela depende.
   */
  if (a.tipo === 'parada' && a.item_id) {
    return {
      sobre_tipo: 'item', sobre_id: a.item_id,
      pergunta: a.titulo,
      texto: `${a.titulo}\n${a.corpo}\n\nSe já ficou pronta, responda "pronto".`,
      opcoes: null,
    }
  }

  if (a.tipo === 'pedido_prazo') {
    const id = (a.chave.split(':')[1] || '').trim()
    if (!id) return null
    return {
      sobre_tipo: 'prazo', sobre_id: id,
      pergunta: `${a.titulo}: ${a.corpo}`,
      texto: `${a.corpo}\n\nO que você decide?\n\n1) Aceito o prazo novo\n2) Mantenho o que estava`,
      opcoes: [
        { chave: '1', rotulo: 'Aceito o prazo novo' },
        { chave: '2', rotulo: 'Mantenho o que estava' },
      ],
    }
  }

  return null
}

/**
 * Manda pelo WhatsApp da empresa.
 *
 * O envio em si mora em `lib/whats.ts` desde que o pulso também passou a ter o
 * que dizer sozinho. Aqui fica só a ponte: o aviso sabe de quem é, e o envio
 * precisa saber de qual empresa.
 */
async function mandarWhats(
  sb: NonNullable<ReturnType<typeof clienteDeServico>>,
  aviso: Aviso, para: string, texto: string,
): Promise<string | null> {
  const { data } = await sb.from('perfis').select('org_id').eq('id', aviso.perfil_id).single()
  const org = (data as { org_id: string } | null)?.org_id
  return org ? whatsDaEmpresa(sb, org, para, texto) : null
}
