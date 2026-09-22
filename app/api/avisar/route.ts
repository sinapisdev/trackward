import { NextResponse } from 'next/server'
import webpush from 'web-push'
import { clienteDeServico } from '@/lib/supabase/servico'
import { decifrar } from '@/lib/cifra'
import { comoTexto, destino, podeSair, telefoneLimpo } from '@/lib/avisos'
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

export async function POST(req: Request) {
  const sb = clienteDeServico()
  if (!sb) {
    return NextResponse.json({
      erro: 'Falta SUPABASE_SERVICE_ROLE no servidor. Sem ela não dá para entregar aviso de ninguém.',
    }, { status: 503 })
  }

  const segredo = process.env.TRACK_AVISOS_SEGREDO
  const veio = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!segredo || veio !== segredo) {
    return NextResponse.json({ erro: 'Não autorizado.' }, { status: 401 })
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
    if (contato?.whats) {
      const fone = telefoneLimpo(contato.telefone)
      if (fone && await mandarWhats(sb, aviso, fone, endereco)) porWhats++
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
 * Manda pelo WhatsApp da empresa, pela Twilio.
 *
 * Não passa pela rota `/api/conector` de propósito: aquela rota manda JSON, e a
 * Twilio só aceita formulário. Fosse por lá, toda mensagem voltaria com erro 400
 * e ninguém entenderia por quê.
 */
async function mandarWhats(
  sb: NonNullable<ReturnType<typeof clienteDeServico>>,
  aviso: Aviso, para: string, endereco: string,
): Promise<boolean> {
  const { data: org } = await sb.from('organizacoes')
    .select('whats_conector,whats_sid,whats_de')
    .eq('id', (await sb.from('perfis').select('org_id').eq('id', aviso.perfil_id).single()).data?.org_id || '')
    .single()

  if (!org?.whats_conector || !org.whats_sid || !org.whats_de) return false

  const { data } = await sb.from('conectores')
    .select('base_url,auth_tipo,auth_nome,segredo_cifrado,ativo')
    .eq('id', org.whats_conector).single()
  const c = data as Conector | null
  if (!c || !c.ativo) return false

  const chave = decifrar(c.segredo_cifrado)
  if (!chave) return false

  const corpo = new URLSearchParams({
    To: `whatsapp:${para}`,
    From: org.whats_de.startsWith('whatsapp:') ? org.whats_de : `whatsapp:${org.whats_de}`,
    Body: comoTexto(aviso, endereco),
  })

  const cabecalhos: Record<string, string> = {
    'content-type': 'application/x-www-form-urlencoded',
    'user-agent': 'TrackWard/1.0 (avisos)',
  }
  if (c.auth_tipo === 'bearer') cabecalhos.authorization = `Bearer ${chave}`
  else cabecalhos[c.auth_nome || 'authorization'] = chave

  try {
    const r = await fetch(
      `${c.base_url.replace(/\/+$/, '')}/Accounts/${encodeURIComponent(org.whats_sid)}/Messages.json`,
      { method: 'POST', headers: cabecalhos, body: corpo, signal: AbortSignal.timeout(15_000) },
    )
    return r.ok
  } catch {
    return false
  }
}
