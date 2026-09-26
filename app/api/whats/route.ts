import { NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { clienteDeServico } from '@/lib/supabase/servico'
import { decifrar } from '@/lib/cifra'
import { casar, comoLista, soConfirma, type Pergunta } from '@/lib/casar'
import { novoId } from '@/lib/id'

/**
 * A porta de entrada do WhatsApp.
 *
 * Lá fora não existe tela: a pessoa responde "pronto", e pronto não quer dizer
 * nada sozinho. Quem decide a qual pergunta a resposta pertence é
 * `lib/casar.ts`, e a regra que manda em tudo é **na dúvida, perguntar**. Errar
 * aqui não é mostrar a tela errada, é marcar como pronto o que não está, em
 * nome de outra pessoa.
 *
 * QUEM CHAMA É UM ESTRANHO, então a rota é estreita:
 *
 *   - **Telefone não é senha.** Ele só diz de quem é o número. O que muda o
 *     trabalho de outra pessoa continua exigindo confirmação explícita.
 *   - **Número desconhecido recebe uma frase educada e nada mais.** Quem errou
 *     o número não pode descobrir quem é cliente do TrackWard.
 *   - A resposta sai em TwiML, que é a resposta do próprio pedido. Não custa
 *     mensagem nova e não precisa de credencial para responder.
 *
 * É a terceira rota a usar a chave de serviço, e a lista continua curta:
 * `/api/avisar`, `/api/feedback` e esta. O motivo é sempre o mesmo, quem chama
 * não tem sessão, e aqui quem chama é gente de fora.
 */

export const runtime = 'nodejs'
export const maxDuration = 30

/** A resposta que a Twilio entende. Texto vazio quer dizer "não responda nada". */
function twiml(texto: string) {
  const corpo = texto
    ? `<Message>${texto.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]!))}</Message>`
    : ''
  return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response>${corpo}</Response>`, {
    status: 200, headers: { 'content-type': 'text/xml; charset=utf-8' },
  })
}

/**
 * A assinatura da Twilio: HMAC-SHA1 da url mais os campos do formulário em
 * ordem alfabética, na base64. É o mecanismo dela, e é o bom, porque prova que
 * a mensagem veio de quem tem o token da conta.
 *
 * No **sandbox** não dá para usar: o número que recebe é o de testes da Twilio,
 * não o da empresa, então não há conector de onde tirar o token. Por isso a
 * rota aceita também um segredo na url, e exige um dos dois. Segredo em url
 * aparece em registro de acesso, então ele é a segunda opção, não a primeira.
 */
function assinaturaConfere(url: string, campos: Record<string, string>, assinatura: string, token: string) {
  const base = url + Object.keys(campos).sort().map((k) => k + campos[k]).join('')
  const meu = createHmac('sha1', token).update(Buffer.from(base, 'utf-8')).digest('base64')
  const a = Buffer.from(meu)
  const b = Buffer.from(assinatura)
  return a.length === b.length && timingSafeEqual(a, b)
}

type Sb = NonNullable<ReturnType<typeof clienteDeServico>>

/** O token da conta Twilio desta empresa, quando o número de destino for dela. */
async function tokenDaEmpresa(sb: Sb, para: string): Promise<string | null> {
  const numero = para.replace(/^whatsapp:/, '')
  const { data: orgs } = await sb.from('organizacoes')
    .select('whats_conector,whats_de').not('whats_conector', 'is', null)
  const org = (orgs || []).find((o) => {
    const de = String((o as { whats_de?: string }).whats_de || '').replace(/^whatsapp:/, '')
    return de && de.replace(/\D/g, '') === numero.replace(/\D/g, '')
  }) as { whats_conector: string } | undefined
  if (!org) return null
  const { data } = await sb.from('conectores')
    .select('segredo_cifrado,ativo').eq('id', org.whats_conector).single()
  const c = data as { segredo_cifrado: string; ativo: boolean } | null
  if (!c?.ativo) return null
  return decifrar(c.segredo_cifrado)
}

/** Guarda uma pergunta nova, para a próxima resposta ter com o que casar. */
async function perguntar(sb: Sb, org: string, perfil: string, p: {
  sobre_tipo: Pergunta['sobre_tipo']; sobre_id?: string | null; texto: string
  opcoes?: { chave: string; rotulo: string }[] | null
}) {
  await sb.from('perguntas_abertas').insert({
    id: novoId(), org_id: org, perfil_id: perfil,
    sobre_tipo: p.sobre_tipo, sobre_id: p.sobre_id ?? null,
    texto: p.texto, opcoes: p.opcoes ?? null,
  })
}

const fechar = (sb: Sb, id: string) =>
  sb.from('perguntas_abertas').update({ respondido_em: new Date().toISOString() }).eq('id', id)

/** A frase diz que sim? "pronto", "feito", "já fiz". */
const disseQueSim = (t: string) =>
  soConfirma(t) && !/\b(n[ãa]o|ainda|nem|negativo)\b/i.test(t)

export async function POST(req: Request) {
  const sb = clienteDeServico()
  if (!sb) return twiml('')

  const url = new URL(req.url)
  const texto = await req.text()
  const campos: Record<string, string> = {}
  for (const [k, v] of new URLSearchParams(texto)) campos[k] = v

  const de = campos.From || ''
  const para = campos.To || ''
  const corpo = (campos.Body || '').trim()
  const sid = campos.MessageSid || campos.SmsMessageSid || null
  // A Twilio manda o sid da mensagem citada quando a pessoa responde por cima
  // de uma anterior. É o casamento certo, e é o primeiro que `casar` tenta.
  const citou = campos.OriginalRepliedMessageSid || campos.ReplyToMessageSid || null

  // --- quem está batendo -----------------------------------------------
  const assinatura = req.headers.get('x-twilio-signature')
  let autorizado = false
  if (assinatura) {
    const token = await tokenDaEmpresa(sb, para)
    if (token) {
      const semSegredo = new URL(url)
      semSegredo.searchParams.delete('k')
      autorizado = assinaturaConfere(semSegredo.toString(), campos, assinatura, token)
        || assinaturaConfere(url.toString(), campos, assinatura, token)
    }
  }
  if (!autorizado) {
    const k = url.searchParams.get('k') || ''
    const esperado = process.env.TRACK_AVISOS_SEGREDO || ''
    autorizado = !!esperado && k === esperado
  }
  if (!autorizado) return NextResponse.json({ erro: 'Não autorizado.' }, { status: 401 })

  if (!de) return twiml('')

  // --- de quem é este número -------------------------------------------
  const { data: perfil } = await sb.rpc('perfil_do_telefone', { p_fone: de })
  if (!perfil) {
    // Educado e vazio de propósito: quem errou o número não descobre daqui
    // nem que empresa existe, nem quem usa o TrackWard.
    return twiml('Oi! Este número é do assistente de uma equipe e não está '
      + 'ligado ao seu. Se foi engano, pode ignorar.')
  }

  const { data: euData } = await sb.from('perfis')
    .select('id,org_id,nome').eq('id', perfil as string).single()
  const eu = euData as { id: string; org_id: string; nome: string } | null
  if (!eu) return twiml('')

  const { data: abertasData } = await sb.rpc('perguntas_de', { p_perfil: eu.id })
  const abertas = (abertasData || []) as Pergunta[]

  // --- a qual pergunta isto responde ------------------------------------
  const r = casar({ texto: corpo, citou }, abertas)

  if (r.como === 'pergunte') {
    const opcoes = comoLista(r.candidatas)
    await perguntar(sb, eu.org_id, eu.id, {
      sobre_tipo: 'triagem', texto: 'Qual delas?',
      // A chave guarda o id da pergunta original: é assim que a escolha por
      // número volta a apontar para a coisa certa.
      opcoes: opcoes.map((o, i) => ({ chave: o.chave, rotulo: o.rotulo, alvo: r.candidatas[i].id })),
    })
    return twiml(`Tenho mais de uma coisa em aberto com você. Qual delas?\n\n${
      opcoes.map((o) => `${o.chave}) ${o.rotulo}`).join('\n')}`)
  }

  if (r.como === 'nada') {
    // Nada em aberto: o que chegou é coisa solta, e o app pergunta antes de
    // arquivar em vez de adivinhar. Ver B5 do plano.
    if (!corpo) return twiml('')
    await perguntar(sb, eu.org_id, eu.id, {
      sobre_tipo: 'triagem', texto: corpo.slice(0, 200),
      opcoes: [
        { chave: '1', rotulo: 'Guardar como nota' },
        { chave: '2', rotulo: 'Virar tarefa minha' },
        { chave: '3', rotulo: 'Deixa pra lá' },
      ],
    })
    return twiml('Anotei. O que faço com isso?\n\n1) Guardar como nota\n'
      + '2) Virar tarefa minha\n3) Deixa pra lá')
  }

  const p = r.pergunta

  // --- a escolha de uma lista -------------------------------------------
  if (r.como === 'escolha' && p.sobre_tipo === 'triagem') {
    const op = (p.opcoes || []).find((o) => o.chave === r.opcao) as
      { chave: string; rotulo: string; alvo?: string } | undefined
    await fechar(sb, p.id)

    // A lista de desempate: volta a perguntar, agora sobre a escolhida.
    if (op?.alvo) {
      const alvo = abertas.find((x) => x.id === op.alvo)
      if (alvo) return await responder(sb, eu, alvo, 'sim', sid)
      return twiml('Aquela pergunta já não está mais em aberto. Pode mandar de novo?')
    }

    if (r.opcao === '1') {
      await sb.from('notas').insert({
        id: novoId(), org_id: eu.org_id, dono_id: eu.id,
        titulo: p.texto.split('\n')[0].slice(0, 80), texto: p.texto,
      })
      return twiml('Guardei como nota.')
    }
    if (r.opcao === '2') {
      return twiml('Ainda não sei criar tarefa por aqui, mas guardei a ideia. '
        + 'Isso entra no próximo pedaço.')
    }
    return twiml('Certo, deixei pra lá.')
  }

  return await responder(sb, eu, p, corpo, sid)
}

/**
 * O que fazer com a resposta, agora que se sabe a qual pergunta ela é.
 *
 * Por enquanto só a tarefa fecha por aqui. O resto (aprovar checkpoint,
 * prorrogar prazo, aceitar cascata) exige botão explícito e entra no próximo
 * pedaço: são as ações que mudam o trabalho de OUTRA pessoa, e telefone não é
 * senha. Dizer "ainda não sei fazer isso" é melhor do que fazer errado.
 */
async function responder(
  sb: Sb, eu: { id: string; org_id: string; nome: string }, p: Pergunta,
  corpo: string, _sid: string | null,
) {
  await fechar(sb, p.id)

  if (p.sobre_tipo === 'item' && p.sobre_id) {
    if (!disseQueSim(corpo)) {
      return twiml('Entendi, deixo em aberto então. Quando terminar, é só me dizer.')
    }
    const { data } = await sb.from('itens').select('id,texto,fluxo_id,feito').eq('id', p.sobre_id).single()
    const item = data as { id: string; texto: string; fluxo_id: string; feito: boolean } | null
    if (!item) return twiml('Essa tarefa não existe mais por aqui.')
    if (item.feito) return twiml(`"${item.texto}" já estava concluída. Tudo certo.`)

    await sb.from('itens').update({ feito: true, feito_em: new Date().toISOString() }).eq('id', item.id)
    // Fica registrado que veio de fora do app: a linha do tempo da track não
    // pode dar a entender que alguém abriu a tela e clicou.
    await sb.from('atividades').insert({
      fluxo_id: item.fluxo_id, quem_id: eu.id,
      texto: `concluiu ${item.texto} pelo WhatsApp`,
    })
    return twiml(`Pronto: "${item.texto}" marcada como concluída.`)
  }

  return twiml('Anotei a sua resposta. Essa parte eu ainda não sei resolver por '
    + 'aqui, mas ela já está registrada.')
}
