import { NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { clienteDeServico } from '@/lib/supabase/servico'
import { decifrar } from '@/lib/cifra'
import { casar, comoLista, soConfirma, type Pergunta } from '@/lib/casar'
import { novoId } from '@/lib/id'
import { mandarWhats } from '@/lib/whats'
import { ajuda, comandar, oQueFoiFeito, type Intencao } from '@/lib/comandar'
import { esqueletoEmBranco } from '@/lib/modelos'
import { NOME_DA_LISTA } from '@/lib/rotulos'
import { hojeIso } from '@/lib/datas'

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

/**
 * O que responder, separado de como entregar.
 *
 * A Twilio aceita a resposta no corpo da MESMA requisição, em XML. A Meta não:
 * ali o webhook devolve 200 vazio e a resposta vai numa chamada nova à API
 * dela. Como a decisão do que dizer é a mesma nos dois casos, ela devolve
 * texto, e quem entrega decide a forma. Texto vazio quer dizer "não responda
 * nada", que é diferente de não ter respondido.
 */
type Recado = { texto: string }

/**
 * Por onde o WhatsApp da empresa fala.
 *
 * `twilio` é a intermediária, e foi por onde isto nasceu. `meta` é a Cloud API
 * da própria Meta, sem ninguém no meio: sem mensalidade, com um número de teste
 * de graça, e com o preço vindo direto de quem cobra. Ver a seção 46 do schema.
 */
type Via = 'twilio' | 'meta'
const diga = (texto: string): Recado => ({ texto })

/** A resposta que a Twilio entende, montada só na hora de entregar. */
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

/**
 * A frase diz que não?
 *
 * "não", "nada", "nenhum", "tudo certo". Curta de propósito: a pergunta do dia
 * é de dez segundos, e quem não tem o que contar responde em uma palavra.
 * Qualquer coisa maior que isso é conteúdo, e conteúdo vai para a triagem.
 */
const disseQueNao = (t: string) =>
  /^\s*(n[ãa]o|nada|nenhum[ao]?|nop|negativo|tudo\s+certo|sem\s+novidade)[\s.!]*$/i.test(t)

/** A frase diz que sim? "pronto", "feito", "já fiz". */
const disseQueSim = (t: string) =>
  soConfirma(t) && !/\b(n[ãa]o|ainda|nem|negativo)\b/i.test(t)

/**
 * A mensagem que chegou, no formato que este arquivo entende.
 *
 * A Twilio manda formulário com maiúsculas; a Meta manda JSON aninhado. As
 * duas dizem a mesma coisa, então quem trata não precisa saber de qual delas
 * veio: a diferença morre na porta.
 */
type Chegou = {
  via: Via
  de: string
  para: string
  corpo: string
  sid: string | null
  citou: string | null
  /** O formulário cru da Twilio, de onde a mídia dela é baixada. */
  campos: Record<string, string>
  /** As mídias da Meta, que vêm por id e são resolvidas pela API dela. */
  midias: { id: string; tipo: string }[]
}

async function atender(
  sb: Sb, c: Chegou,
): Promise<Recado> {
  const { de, corpo, sid, citou, campos } = c

  // --- de quem é este número -------------------------------------------
  const { data: perfil } = await sb.rpc('perfil_do_telefone', { p_fone: de })
  if (!perfil) {
    // Educado e vazio de propósito: quem errou o número não descobre daqui
    // nem que empresa existe, nem quem usa o TrackWard.
    return diga('Oi! Este número é do assistente de uma equipe e não está '
      + 'ligado ao seu. Se foi engano, pode ignorar.')
  }

  const { data: euData } = await sb.from('perfis')
    .select('id,org_id,nome').eq('id', perfil as string).single()
  const eu = euData as { id: string; org_id: string; nome: string } | null
  if (!eu) return diga('')

  /**
   * Comando vem antes de tudo.
   *
   * Uma linha que começa por barra é ORDEM, e ordem não é resposta: quem
   * escreveu `/tarefa ...` não está respondendo à pergunta de ontem, está
   * mandando fazer. Deixar isso passar por `casar` primeiro faria o comando
   * virar resposta de outra coisa, que é o pior erro possível aqui.
   *
   * E não pede confirmação, pela mesma razão que no chat: quem escreveu a ordem
   * foi a pessoa, e pedir que ela confirme o que acabou de digitar é desconfiar
   * dela. Ver "A linguagem do chat".
   */
  if (corpo.startsWith('/')) {
    const resposta = await executarComando(sb, eu, corpo)
    if (resposta) return resposta
  }

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
    return diga(`Tenho mais de uma coisa em aberto com você. Qual delas?\n\n${
      opcoes.map((o) => `${o.chave}) ${o.rotulo}`).join('\n')}`)
  }

  /**
   * Áudio, foto e documento.
   *
   * Eles viram nota com anexo, que é onde o despejo já mora: o WhatsApp é
   * também o lugar de jogar coisa solta, e coisa solta sem assunto é nota.
   *
   * O arquivo é BAIXADO e guardado aqui. O endereço que a Twilio manda vence e
   * exige a credencial dela: guardá-lo seria guardar um link que amanhã não
   * abre, e é o tipo de coisa que só se descobre quando alguém precisa do
   * arquivo, meses depois.
   */
  const quantos = Number(campos.NumMedia || '0')
  if (quantos > 0) {
    const guardados = await guardarMidia(sb, eu, campos, quantos, corpo)
    if (guardados) {
      return diga(guardados === 1
        ? 'Guardei o arquivo numa nota. Se quiser, me diga do que é e eu ponho o assunto.'
        : `Guardei os ${guardados} arquivos numa nota.`)
    }
    return diga('Recebi o arquivo mas não consegui guardar. Tente de novo em um minuto.')
  }

  if (r.como === 'nada') {
    // Nada em aberto: o que chegou é coisa solta, e o app pergunta antes de
    // arquivar em vez de adivinhar. Ver B5 do plano.
    if (!corpo) return diga('')
    await perguntar(sb, eu.org_id, eu.id, {
      sobre_tipo: 'triagem', texto: corpo.slice(0, 200),
      opcoes: [
        { chave: '1', rotulo: 'Guardar como nota' },
        { chave: '2', rotulo: 'Virar tarefa minha' },
        { chave: '3', rotulo: 'Deixa pra lá' },
      ],
    })
    return diga('Anotei. O que faço com isso?\n\n1) Guardar como nota\n'
      + '2) Virar tarefa minha\n3) Deixa pra lá')
  }

  const p = r.pergunta

  // --- a escolha de uma lista -------------------------------------------
  if (r.como === 'escolha' && p.sobre_tipo === 'triagem') {
    const op = (p.opcoes || []).find((o) => o.chave === r.opcao) as
      { chave: string; rotulo: string; alvo?: string } | undefined
    await fechar(sb, p.id)

    /**
     * A track escolhida para a tarefa que ficou pendente.
     *
     * Vem antes do desempate porque as duas usam `alvo` e apontam para coisas
     * diferentes: lá é o id de outra PERGUNTA, aqui é o id de uma TRACK. Quem
     * separa é a entrada `_tarefa`, que só existe nesta.
     */
    const pendente = (p.opcoes || []).find((o) => o.chave === '_tarefa') as
      { rotulo: string; alvo?: string; quando?: string | null } | undefined
    if (pendente) {
      if (!op?.alvo) return diga('Não achei essa opção. Pode mandar o número da lista?')
      const { data: fl } = await sb.from('fluxos').select('id,nome,atual')
        .eq('id', op.alvo).maybeSingle()
      const track = fl as { id: string; nome: string; atual: number } | null
      if (!track) return diga('Essa track não está mais aberta por aqui.')
      const { data: et } = await sb.from('etapas').select('id')
        .eq('fluxo_id', track.id).eq('ordem', track.atual).maybeSingle()
      const etapa = (et as { id: string } | null)?.id
      if (!etapa) return diga('Essa track está sem checkpoint aberto.')
      const erro = await porItem(sb, eu, {
        etapa, fluxo: track.id, texto: pendente.rotulo,
        resp: pendente.alvo || eu.id, prazo: pendente.quando || null,
      })
      if (erro) return diga(erro)
      return diga(oQueFoiFeito(
        { tipo: 'tarefa', texto: pendente.rotulo, resp: pendente.alvo || eu.id,
          prazo: pendente.quando || null, fluxo: track.id },
        track.nome,
      ))
    }

    // A lista de desempate: volta a perguntar, agora sobre a escolhida.
    if (op?.alvo) {
      const alvo = abertas.find((x) => x.id === op.alvo)
      if (alvo) return await responder(sb, eu, alvo, 'sim', sid)
      return diga('Aquela pergunta já não está mais em aberto. Pode mandar de novo?')
    }

    // Veio de uma pergunta do dia: o que ela virou decide se aquela pergunta
    // continua sendo feita àquela pessoa.
    const molde = (p.opcoes || []).find((o) => o.chave === '_molde') as
      { rotulo: string } | undefined
    const contar = async (revelou: boolean) => {
      if (molde) {
        await sb.rpc('pergunta_respondida',
          { p_perfil: eu.id, p_chave: molde.rotulo, p_revelou: revelou })
      }
    }

    if (r.opcao === '1') {
      await sb.from('notas').insert({
        id: novoId(), org_id: eu.org_id, dono_id: eu.id,
        titulo: p.texto.split('\n')[0].slice(0, 80), texto: p.texto,
      })
      await contar(true)
      return diga('Guardei como nota.')
    }
    if (r.opcao === '2') {
      // Era um beco: a pessoa escolhia "virar tarefa" e o app respondia que não
      // sabia. A tarefa nasce avulsa, que é o que ela é: não pertence a track
      // nenhuma, e por isso é privada de quem criou.
      const lista = await minhaListaDe(sb, eu)
      if (!lista) return diga('Não deu para abrir a sua lista. Tente de novo em um minuto.')
      const erro = await porItem(sb, eu, {
        etapa: lista, fluxo: lista.fluxo, texto: p.texto, resp: eu.id, prazo: null,
      })
      if (erro) return diga(erro)
      await contar(true)
      return diga(oQueFoiFeito({ tipo: 'avulsa', texto: p.texto, prazo: null }))
    }
    await contar(false)
    return diga('Certo, deixei pra lá.')
  }

  return await responder(sb, eu, p, corpo, sid, r.como === 'escolha' ? r.opcao : null)
}

/** As três saídas de um checkpoint, do jeito que elas aparecem no telefone. */
const SAIDAS: { chave: string; rotulo: string; tipo: string }[] = [
  { chave: '1', rotulo: 'Aprovo', tipo: 'aprovou' },
  { chave: '2', rotulo: 'Aprovo com ressalva', tipo: 'ressalva' },
  { chave: '3', rotulo: 'Devolvo', tipo: 'devolveu' },
]

/**
 * Baixa o que veio junto e guarda como nota com anexo.
 *
 * A credencial da Twilio é a mesma do envio, e por isso ela é buscada no
 * conector da empresa: o endereço da mídia só abre com ela.
 */
async function guardarMidia(
  sb: Sb, eu: { id: string; org_id: string }, campos: Record<string, string>,
  quantos: number, legenda: string,
): Promise<number> {
  const { data: org } = await sb.from('organizacoes')
    .select('whats_conector,whats_sid').eq('id', eu.org_id).single()
  const o = org as { whats_conector: string | null; whats_sid: string | null } | null
  if (!o?.whats_conector || !o.whats_sid) return 0
  const { data: cdata } = await sb.from('conectores')
    .select('segredo_cifrado,ativo').eq('id', o.whats_conector).single()
  const c = cdata as { segredo_cifrado: string; ativo: boolean } | null
  if (!c?.ativo) return 0
  const chave = decifrar(c.segredo_cifrado)
  if (!chave) return 0
  const basico = 'Basic ' + Buffer.from(`${o.whats_sid}:${chave}`).toString('base64')

  const notaId = novoId()
  const titulo = legenda || 'Recebido pelo WhatsApp'
  await sb.from('notas').insert({
    id: notaId, org_id: eu.org_id, dono_id: eu.id, titulo, texto: titulo,
  })

  let n = 0
  for (let i = 0; i < quantos; i++) {
    const url = campos[`MediaUrl${i}`]
    const tipo = campos[`MediaContentType${i}`] || 'application/octet-stream'
    if (!url) continue
    try {
      const r = await fetch(url, {
        headers: { authorization: basico }, signal: AbortSignal.timeout(20_000),
      })
      if (!r.ok) continue
      const bytes = new Uint8Array(await r.arrayBuffer())
      const ext = (tipo.split('/')[1] || 'bin').split(';')[0]
      // O caminho começa pela organização: é o que deixa a política do Storage
      // barrar o arquivo de outra empresa.
      const caminho = `${eu.org_id}/${novoId()}.${ext}`
      const { error } = await sb.storage.from('anexos').upload(caminho, bytes, { contentType: tipo })
      if (error) continue
      await sb.from('anexos').insert({
        id: novoId(), org_id: eu.org_id, nota_id: notaId, autor_id: eu.id,
        nome: `whatsapp.${ext}`, tipo, tamanho: bytes.length, caminho,
      })
      n++
    } catch { /* o próximo arquivo ainda pode dar certo */ }
  }
  if (!n) await sb.from('notas').delete().eq('id', notaId)
  return n
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
  corpo: string, _sid: string | null, opcao: string | null = null,
): Promise<Recado> {
  /**
   * Checkpoint: só por botão, nunca por texto interpretado.
   *
   * Esta é a fronteira do bloco B. Concluir a própria tarefa é sobre o seu
   * trabalho; aprovar um checkpoint libera a track inteira e destrava o
   * trabalho dos outros. Telefone não é senha, então aqui a pessoa escolhe de
   * uma lista, e um "pode ir" mal interpretado não aprova nada.
   */
  if (p.sobre_tipo === 'etapa' && p.sobre_id) {
    const escolhido = (p.opcoes || []).find(
      (o) => (o as { chave: string }).chave === '_tipo',
    ) as { rotulo: string } | undefined

    // Segunda volta: a decisão já foi escolhida e falta o motivo, que o banco
    // exige para ressalva e devolução, porque quem recebe precisa saber o quê.
    if (escolhido) {
      if (!corpo) return diga('Preciso do motivo, em uma linha, para poder seguir.')
      await fechar(sb, p.id)
      const { error } = await sb.rpc('decidir_etapa', {
        p_fluxo: p.sobre_id, p_tipo: escolhido.rotulo, p_nota: corpo,
        p_reabrir: [], p_periodo: null, p_prazo: null, p_como: eu.id,
      })
      if (error) return diga(recado(error.message))
      return diga(escolhido.rotulo === 'ressalva'
        ? 'Aprovado com ressalva. A pendência virou tarefa no próximo checkpoint, e ele não fecha sem ela.'
        : 'Devolvido. As tarefas marcadas voltaram a ficar em aberto.')
    }

    const saida = SAIDAS.find((x) => x.chave === opcao)
    if (!saida) {
      return diga(`Para decidir, responda com o número:\n\n${
        SAIDAS.map((x) => `${x.chave}) ${x.rotulo}`).join('\n')}`)
    }
    await fechar(sb, p.id)

    if (saida.tipo === 'aprovou') {
      const { error } = await sb.rpc('decidir_etapa', {
        p_fluxo: p.sobre_id, p_tipo: 'aprovou', p_nota: '',
        p_reabrir: [], p_periodo: null, p_prazo: null, p_como: eu.id,
      })
      if (error) return diga(recado(error.message))
      return diga('Aprovado. A track seguiu para o próximo checkpoint.')
    }

    // Ressalva e devolução precisam de motivo: pergunta antes de fazer.
    await perguntar(sb, eu.org_id, eu.id, {
      sobre_tipo: 'etapa', sobre_id: p.sobre_id,
      texto: saida.tipo === 'ressalva'
        ? 'Qual é a pendência que fica?' : 'Por que está devolvendo?',
      opcoes: [{ chave: '_tipo', rotulo: saida.tipo }],
    })
    return diga(saida.tipo === 'ressalva'
      ? 'Certo. Qual é a pendência que fica? Ela vira tarefa no próximo checkpoint.'
      : 'Certo. Por que está devolvendo? Quem recebe precisa saber o que fazer.')
  }

  /** Prazo: também por botão, porque quem espera é outra pessoa. */
  if (p.sobre_tipo === 'prazo' && p.sobre_id) {
    if (opcao !== '1' && opcao !== '2') {
      return diga('Para decidir, responda com o número:\n\n1) Aceito o prazo novo\n2) Mantenho o que estava')
    }
    await fechar(sb, p.id)
    const { error } = await sb.rpc('decidir_prazo', {
      p_pedido: p.sobre_id, p_aceita: opcao === '1', p_como: eu.id,
    })
    if (error) return diga(recado(error.message))
    return diga(opcao === '1' ? 'Prazo aceito e já movido.' : 'Mantido como estava.')
  }

  /**
   * A resposta à pergunta do dia.
   *
   * Ela é sobre a BORDA, nunca sobre o conteúdo: "entrou algum trabalho novo
   * hoje?" tem resposta de dez segundos, e a resposta é um evento. Duas saídas,
   * e as duas contam para a poda:
   *
   *   "não" fecha e conta como VAZIA. Três vazias seguidas e aquela pergunta
   *   sai daquela pessoa para sempre, que é como o conjunto encolhe sozinho
   *   para o que serve naquela casa.
   *
   *   Qualquer outra coisa vira a triagem de sempre, e só conta como REVELOU
   *   quando virar nota ou tarefa de verdade. "Revelou" não é "respondeu": uma
   *   resposta que não vira nada no app não descobriu nada, e contá-la mantém
   *   viva uma pergunta que não serve.
   */
  if (p.sobre_tipo === 'diagnostico') {
    const molde = (p.opcoes || []).find((o) => o.chave === '_molde') as
      { rotulo: string } | undefined
    await fechar(sb, p.id)

    if (!corpo || disseQueNao(corpo)) {
      if (molde) {
        await sb.rpc('pergunta_respondida',
          { p_perfil: eu.id, p_chave: molde.rotulo, p_revelou: false })
      }
      return diga('Combinado. Obrigado por responder.')
    }

    await perguntar(sb, eu.org_id, eu.id, {
      sobre_tipo: 'triagem', texto: corpo.slice(0, 200),
      opcoes: [
        // O molde viaja junto: é ele que a poda e o acervo contam, e ele
        // precisa sobreviver a mais um pulo para a conta fechar.
        ...(molde ? [{ chave: '_molde', rotulo: molde.rotulo }] : []),
        { chave: '1', rotulo: 'Guardar como nota' },
        { chave: '2', rotulo: 'Virar tarefa minha' },
        { chave: '3', rotulo: 'Deixa pra lá' },
      ],
    })
    return diga('Anotei. O que faço com isso?\n\n1) Guardar como nota\n'
      + '2) Virar tarefa minha\n3) Deixa pra lá')
  }

  await fechar(sb, p.id)

  if (p.sobre_tipo === 'item' && p.sobre_id) {
    if (!disseQueSim(corpo)) {
      return diga('Entendi, deixo em aberto então. Quando terminar, é só me dizer.')
    }
    const { data } = await sb.from('itens').select('id,texto,fluxo_id,feito').eq('id', p.sobre_id).single()
    const item = data as { id: string; texto: string; fluxo_id: string; feito: boolean } | null
    if (!item) return diga('Essa tarefa não existe mais por aqui.')
    if (item.feito) return diga(`"${item.texto}" já estava concluída. Tudo certo.`)

    await sb.from('itens').update({ feito: true, feito_em: new Date().toISOString() }).eq('id', item.id)
    // Fica registrado que veio de fora do app: a linha do tempo da track não
    // pode dar a entender que alguém abriu a tela e clicou.
    await sb.from('atividades').insert({
      fluxo_id: item.fluxo_id, quem_id: eu.id,
      texto: `concluiu ${item.texto} pelo WhatsApp`,
    })
    return diga(`Pronto: "${item.texto}" marcada como concluída.`)
  }

  return diga('Anotei a sua resposta. Essa parte eu ainda não sei resolver por '
    + 'aqui, mas ela já está registrada.')
}

/**
 * A recusa do banco, dita para quem está no telefone.
 *
 * As mensagens do schema já foram escritas para gente ler, então a maioria
 * passa inteira. O que não pode passar é erro de máquina: quem está no
 * WhatsApp não tem como agir sobre "violates row-level security policy".
 */
function recado(msg: string): string {
  if (/row-level security|permission denied|violates/i.test(msg)) {
    return 'Isso não está liberado para você. Se achar que deveria, fale com quem administra.'
  }
  /**
   * Fala de máquina não vai para o telefone.
   *
   * As mensagens do schema são escritas em português para gente ler, e o que
   * vem do PostgREST e do Postgres vem em inglês e fala de função, coluna e
   * cache. Esta peneira apareceu num teste: uma função que faltava no banco
   * chegou ao telefone como "Could not find the function public.salvar_fluxo
   * in the schema cache", que é indepurável para quem está do outro lado e não
   * diz nada que a pessoa possa resolver.
   */
  if (/could not find|schema cache|does not exist|invalid input|unexpected|null value/i.test(msg)) {
    return 'Não deu para fazer isso agora. Se continuar, me avise pelo app.'
  }
  return msg.length < 200 ? msg : 'Não deu para fazer isso agora.'
}

/**
 * A linguagem de barra, pelo telefone.
 *
 * Quem decide o que o comando quer dizer é `lib/comandar.ts`, e é o mesmo
 * arquivo que o app vai passar a usar: as regras (tarefa de outra pessoa
 * precisa de track, compromisso precisa de dia, o @ sai do texto) não podem
 * existir em duas cópias, porque no mês seguinte seriam duas linguagens.
 *
 * Aqui mora só a escrita, porque ela é diferente dos dois lados: no navegador
 * é o cliente da pessoa, aqui é a chave de serviço sem sessão nenhuma. É por
 * isso que tudo que passa pelo banco vai dizendo em nome de quem age.
 */
async function executarComando(
  sb: Sb, eu: { id: string; org_id: string; nome: string }, corpo: string,
): Promise<Recado | null> {
  // As pessoas da casa, e as tracks onde dá para pôr tarefa. `gente_daqui` é a
  // lista certa: `perfis` devolve, de propósito, os perfis da pessoa em todos
  // os espaços, e delegar para o perfil errado cria tarefa que ninguém enxerga.
  const [{ data: gente }, { data: tracks }] = await Promise.all([
    sb.rpc('gente_daqui'),
    sb.from('fluxos').select('id,nome,atual,concluido,desfecho')
      .eq('org_id', eu.org_id).is('desfecho', null).eq('concluido', false)
      .order('criado_em', { ascending: false }),
  ])

  const abertas = ((tracks || []) as { id: string; nome: string; atual: number }[])
    .filter((f) => f.nome !== NOME_DA_LISTA)

  const i = comandar(corpo, {
    eu: { id: eu.id, nome: eu.nome },
    pessoas: (gente || []) as { id: string; nome: string; ativo?: boolean }[],
    tracks: abertas.map((f) => ({ id: f.id, nome: f.nome })),
    hoje: hojeIso(),
  })
  // Não é comando nenhum: segue o caminho normal da mensagem.
  if (!i) return null

  if (i.tipo === 'ajuda') return diga(ajuda())
  if (i.tipo === 'recusa') return diga(i.motivo)

  if (i.tipo === 'onde-vive') {
    /**
     * Falta a decisão que o app não pode tomar.
     *
     * No chat isto abre o formulário já preenchido. Aqui não há formulário, e
     * recusar mandando começar de novo seria pior, então vira pergunta com
     * lista. O que está pendente viaja dentro das opções, na entrada `_tarefa`,
     * do mesmo jeito que a decisão de checkpoint já faz com `_tipo`.
     */
    const opcoes = [
      { chave: '_tarefa', rotulo: i.texto, alvo: i.resp, quando: i.prazo },
      ...i.tracks.map((t, k) => ({ chave: String(k + 1), rotulo: t.nome, alvo: t.id })),
    ]
    await perguntar(sb, eu.org_id, eu.id, {
      sobre_tipo: 'triagem', texto: i.texto, opcoes,
    })
    return diga(`Tarefa para ${i.respNome}. Em qual track ela vive?\n\n${
      i.tracks.map((t, k) => `${k + 1}) ${t.nome}`).join('\n')}`)
  }

  if (i.tipo === 'avulsa') {
    const etapa = await minhaListaDe(sb, eu)
    if (!etapa) return diga('Não deu para abrir a sua lista. Tente de novo em um minuto.')
    const erro = await porItem(sb, eu, { etapa, fluxo: etapa.fluxo, texto: i.texto, resp: eu.id, prazo: i.prazo })
    return diga(erro || oQueFoiFeito(i))
  }

  if (i.tipo === 'tarefa') {
    const alvo = abertas.find((f) => f.id === i.fluxo)
    if (!alvo) return diga('Essa track não está mais aberta por aqui.')
    const { data } = await sb.from('etapas').select('id')
      .eq('fluxo_id', alvo.id).eq('ordem', alvo.atual).maybeSingle()
    const etapa = (data as { id: string } | null)?.id
    if (!etapa) return diga('Essa track está sem checkpoint aberto.')
    const erro = await porItem(sb, eu, { etapa, fluxo: alvo.id, texto: i.texto, resp: i.resp, prazo: i.prazo })
    return diga(erro || oQueFoiFeito(i, alvo.nome))
  }

  if (i.tipo === 'track') {
    const { error } = await sb.rpc('salvar_fluxo', {
      p_fluxo: {
        id: null, tipo: i.track, nome: i.nome, area_id: null, empresa_id: null,
        dono_id: i.dono, visib: 'equipe', pessoas: [],
        freq: i.track === 'ciclo' ? 'mensal' : null, periodo: null,
      },
      // Nasce com o mesmo esqueleto de três checkpoints do formulário: track
      // sem checkpoint nenhum não é track, e obrigar a desenhar a trilha antes
      // de ela existir é o que empurra a criação para fora da conversa.
      p_etapas: esqueletoEmBranco(i.track, i.track === 'ciclo' ? 'mensal' : null, i.dono),
      p_como: eu.id,
    })
    if (error) return diga(recado(error.message))
    return diga(oQueFoiFeito(i))
  }

  if (i.tipo === 'nota') {
    const { error } = await sb.from('notas').insert({
      id: novoId(), org_id: eu.org_id, dono_id: eu.id,
      titulo: i.texto.split('\n')[0].slice(0, 80), texto: i.texto,
    })
    if (error) return diga(recado(error.message))
    return diga(oQueFoiFeito(i))
  }

  if (i.tipo === 'compromisso') {
    const id = novoId()
    const { error } = await sb.from('compromissos').insert({
      id, org_id: eu.org_id, dono_id: eu.id, titulo: i.titulo,
      quando: i.quando, inicio: i.hora, fim: null,
      local: '', nota: '', bloqueia: true, visivel: true,
    })
    if (error) return diga(recado(error.message))
    if (i.convidados.length) {
      await sb.from('convidados').insert(
        i.convidados.map((q) => ({ compromisso_id: id, perfil_id: q, org_id: eu.org_id })),
      )
    }
    return diga(oQueFoiFeito(i))
  }

  return null
}

/**
 * O checkpoint da lista pessoal, abrindo a lista se ela ainda não existir.
 *
 * A lista é uma track privada com um checkpoint só, e é ali que a tarefa avulsa
 * mora. Ela pode não existir: quem nunca criou uma avulsa não tem lista, e a
 * primeira pelo WhatsApp seria justamente a que não teria onde nascer.
 */
async function minhaListaDe(
  sb: Sb, eu: { id: string; org_id: string },
): Promise<{ id: string; fluxo: string } | null> {
  const { data: achado } = await sb.from('fluxos').select('id')
    .eq('org_id', eu.org_id).eq('dono_id', eu.id).eq('nome', NOME_DA_LISTA)
    .limit(1).maybeSingle()
  let fluxo = (achado as { id: string } | null)?.id

  if (!fluxo) {
    const { data, error } = await sb.rpc('salvar_fluxo', {
      p_fluxo: {
        id: null, nome: NOME_DA_LISTA, tipo: 'esteira', area_id: null,
        empresa_id: null, dono_id: eu.id, visib: 'so_eu', pessoas: [],
        freq: null, periodo: null,
      },
      p_etapas: [{ id: null, nome: 'A fazer', criterio: '', aprovador_id: null, prazo: '' }],
      p_como: eu.id,
    })
    if (error || !data) return null
    fluxo = data as string
  }

  const { data: et } = await sb.from('etapas').select('id')
    .eq('fluxo_id', fluxo).order('ordem').limit(1).maybeSingle()
  const etapa = (et as { id: string } | null)?.id
  return etapa ? { id: etapa, fluxo } : null
}

/** Põe a tarefa no checkpoint. Devolve a queixa, ou vazio quando deu certo. */
async function porItem(
  sb: Sb, eu: { id: string; org_id: string },
  p: { etapa: { id: string } | string; fluxo: string; texto: string; resp: string; prazo: string | null },
): Promise<string> {
  const { error } = await sb.from('itens').insert({
    id: novoId(),
    etapa_id: typeof p.etapa === 'string' ? p.etapa : p.etapa.id,
    fluxo_id: p.fluxo, org_id: eu.org_id,
    texto: p.texto, descricao: '', resp_id: p.resp, prazo: p.prazo || null,
    priv: false, prazo_firme: false, autor_id: eu.id, ordem: Date.now() % 100000,
  })
  return error ? recado(error.message) : ''
}

// ==========================================================================
// A porta: quem bate, por onde, e como a resposta volta
// ==========================================================================

/**
 * A Meta verifica o endereço antes de mandar qualquer coisa.
 *
 * Ela chama por GET com `hub.challenge` e espera o número de volta, em texto
 * puro, se o `hub.verify_token` bater. Sem isso o webhook nunca é ativado, e o
 * erro que ela mostra é só "não foi possível validar a URL".
 *
 * O segredo é o mesmo do relógio, de propósito: um segredo a menos para
 * alguém guardar em lugar nenhum, e ele já é o que protege as outras portas de
 * máquina deste app.
 */
export async function GET(req: Request) {
  const u = new URL(req.url)
  const esperado = process.env.TRACK_AVISOS_SEGREDO || ''
  const veio = u.searchParams.get('hub.verify_token') || ''
  const desafio = u.searchParams.get('hub.challenge') || ''
  if (u.searchParams.get('hub.mode') === 'subscribe' && esperado && veio === esperado) {
    return new NextResponse(desafio, { status: 200, headers: { 'content-type': 'text/plain' } })
  }
  return NextResponse.json({ erro: 'Não autorizado.' }, { status: 401 })
}

/**
 * A assinatura da Meta: HMAC-SHA256 do corpo CRU com o segredo do app.
 *
 * Do corpo cru, e não do JSON reserializado: um espaço a mais na formatação
 * muda o resumo e a conferência passa a falhar sempre, sem ninguém entender
 * por quê.
 */
function assinaturaMeta(cru: string, cabecalho: string | null, segredo: string): boolean {
  if (!cabecalho || !segredo) return false
  const meu = 'sha256=' + createHmac('sha256', segredo).update(cru, 'utf8').digest('hex')
  const a = Buffer.from(meu)
  const b = Buffer.from(cabecalho)
  return a.length === b.length && timingSafeEqual(a, b)
}

/** Lê o que a Meta mandou e devolve no formato de casa. */
function daMeta(corpo: unknown): Chegou | null {
  const v = (corpo as { entry?: { changes?: { value?: MetaValor }[] }[] })
    ?.entry?.[0]?.changes?.[0]?.value
  const m = v?.messages?.[0]
  // Sem mensagem é recibo de entrega ou de leitura, que a Meta manda no mesmo
  // endereço. Não é erro, e responder a isso seria conversar sozinho.
  if (!m) return null
  const midias = [m.image, m.document, m.audio, m.video]
    .filter(Boolean)
    .map((x) => ({ id: (x as { id: string }).id, tipo: (x as { mime_type?: string }).mime_type || '' }))
  return {
    via: 'meta',
    de: '+' + m.from.replace(/^\+/, ''),
    para: v?.metadata?.display_phone_number ? '+' + v.metadata.display_phone_number.replace(/^\+/, '') : '',
    corpo: (m.text?.body || m.button?.text || m.interactive?.list_reply?.title || '').trim(),
    sid: m.id || null,
    // A Meta entrega o id da citada em `context`, e é o casamento certo, o
    // mesmo papel do `OriginalRepliedMessageSid` da Twilio.
    citou: m.context?.id || null,
    campos: {},
    midias,
  }
}

type MetaValor = {
  metadata?: { display_phone_number?: string; phone_number_id?: string }
  messages?: {
    from: string
    id?: string
    text?: { body?: string }
    button?: { text?: string }
    interactive?: { list_reply?: { title?: string } }
    context?: { id?: string }
    image?: unknown; document?: unknown; audio?: unknown; video?: unknown
  }[]
}

/**
 * A porta de entrada.
 *
 * Ela faz três coisas e nenhuma decisão de produto: descobre de quem veio,
 * confere quem está batendo, e entrega a resposta pela via certa. O que
 * responder é sempre o mesmo, decidido por `atender`, porque a pessoa do outro
 * lado não sabe nem se importa com qual empresa carrega a mensagem.
 */
export async function POST(req: Request) {
  const sb = clienteDeServico()
  if (!sb) return twiml('')

  const url = new URL(req.url)
  const cru = await req.text()
  const tipo = req.headers.get('content-type') || ''
  const ehJson = tipo.includes('application/json')

  let c: Chegou | null = null
  let autorizado = false

  if (ehJson) {
    // --- Meta ----------------------------------------------------------
    let corpo: unknown = null
    try { corpo = JSON.parse(cru) } catch { return NextResponse.json({ ok: true }) }
    const segredo = process.env.META_APP_SECRET || ''
    autorizado = assinaturaMeta(cru, req.headers.get('x-hub-signature-256'), segredo)
    if (!autorizado) {
      // Sem o segredo do app configurado, vale a mesma porta das outras rotas
      // de máquina. É degrau, não porta aberta: sem os dois, ninguém entra.
      const k = url.searchParams.get('k') || ''
      const esperado = process.env.TRACK_AVISOS_SEGREDO || ''
      autorizado = !!esperado && k === esperado
    }
    if (!autorizado) return NextResponse.json({ erro: 'Não autorizado.' }, { status: 401 })
    /**
     * O recibo de ENTREGA merece silêncio, e o de FALHA não.
     *
     * Mensagem que a Meta aceitou (200, com id) e não entregou some sem deixar
     * rastro nenhum: do lado de cá parece que foi, e do lado de lá não chegou.
     * A única notícia disso é este recibo, e jogá-lo fora era ficar cego para
     * o modo de falha mais comum do WhatsApp.
     */
    const st = (corpo as { entry?: { changes?: { value?: {
      statuses?: { status?: string; recipient_id?: string
        errors?: { code?: number; title?: string; error_data?: { details?: string } }[] }[] } }[] }[] })
      ?.entry?.[0]?.changes?.[0]?.value?.statuses
    for (const x of st || []) {
      if (x.status !== 'failed') continue
      const e = x.errors?.[0]
      console.error('whats: não entregou para', x.recipient_id,
        '| código', e?.code, '|', e?.title, '|', e?.error_data?.details)
    }

    c = daMeta(corpo)
    // Recibo de entrega ou de leitura: a Meta manda no mesmo endereço, e o
    // silêncio aqui é a resposta certa.
    if (!c) return NextResponse.json({ ok: true })
  } else {
    // --- Twilio --------------------------------------------------------
    const campos: Record<string, string> = {}
    for (const [k, v] of new URLSearchParams(cru)) campos[k] = v
    const para = campos.To || ''
    const assinatura = req.headers.get('x-twilio-signature')
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
    c = {
      via: 'twilio',
      de: campos.From || '', para, corpo: (campos.Body || '').trim(),
      sid: campos.MessageSid || campos.SmsMessageSid || null,
      citou: campos.OriginalRepliedMessageSid || campos.ReplyToMessageSid || null,
      campos, midias: [],
    }
  }

  if (!c.de) return c.via === 'meta' ? NextResponse.json({ ok: true }) : twiml('')

  const r = await atender(sb, c)

  // --- a entrega -------------------------------------------------------
  if (c.via === 'twilio') return twiml(r.texto)

  /**
   * Na Meta a resposta é uma chamada nova, e o webhook precisa devolver 200
   * DEPRESSA: ela reenvia o que demorar, e reenvio aqui é a mesma tarefa
   * nascendo duas vezes. Por isso o envio é aguardado antes do 200, mas com
   * teto de tempo curto: é melhor a resposta se perder do que a mensagem ser
   * processada de novo.
   */
  if (r.texto) {
    const { data: p } = await sb.rpc('perfil_do_telefone', { p_fone: c.de })
    if (p) {
      const { data: perfil } = await sb.from('perfis').select('org_id').eq('id', p as string).single()
      const org = (perfil as { org_id: string } | null)?.org_id
      if (org) await mandarWhats(sb, org, c.de, r.texto)
    }
  }
  return NextResponse.json({ ok: true })
}
