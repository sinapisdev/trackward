import { NextResponse } from 'next/server'
import { clienteServidor } from '@/lib/supabase/servidor'
import { clienteDeServico } from '@/lib/supabase/servico'
import { cifrar, decifrar, dicaDe, podeCifrar } from '@/lib/cifra'
import { buscar } from '@/lib/saida'

/**
 * Os conectores da empresa: guardar a chave, e usar a chave.
 *
 * Duas coisas acontecem aqui e em nenhum outro lugar, porque as duas envolvem o
 * segredo do cliente:
 *
 *   PUT     recebe a chave em claro, cifra, e guarda só o texto cifrado. A chave
 *           em claro nunca chega ao banco.
 *   POST    faz a chamada ao sistema de fora, decifrando o segredo aqui dentro. O
 *           segredo nunca volta para o navegador em nenhuma resposta.
 *
 * O navegador manda o ID do conector e o caminho, nunca o endereço completo nem a
 * chave. Quem resolve o endereço é o banco, com a identidade de quem pediu: se o
 * navegador escolhesse o endereço, bastaria alterar o pedido para o app falar com
 * qualquer lugar do mundo usando a chave do cliente.
 */

export const runtime = 'nodejs'
export const maxDuration = 20

type Conector = {
  id: string
  nome: string
  base_url: string
  auth_tipo: 'bearer' | 'header' | 'query'
  auth_nome: string
  ativo: boolean
}

/** Guarda a chave cifrada. O corpo em claro morre nesta função. */
export async function PUT(req: Request) {
  if (!podeCifrar()) {
    return NextResponse.json({
      erro: 'Falta a variável TRACK_SEGREDO no servidor. Sem ela não dá para guardar chave com segurança, e guardar sem segurança não é opção.',
    }, { status: 503 })
  }

  let p: { id?: string; segredo?: string }
  try { p = await req.json() } catch { return NextResponse.json({ erro: 'Corpo inválido.' }, { status: 400 }) }
  if (!p.id || !p.segredo) return NextResponse.json({ erro: 'Falta o conector ou a chave.' }, { status: 400 })

  /**
   * Duas escritas, e a ordem é a segurança.
   *
   * A PERMISSÃO continua sendo decidida pelo banco, com o cliente da sessão: a
   * política de update diz que o conector pessoal é do dono e o da casa é de
   * admin. Se a pessoa não pode, nenhuma linha muda e o erro sai daqui, antes
   * de o segredo chegar perto do banco.
   *
   * O SEGREDO vai depois, pelo cliente de serviço, porque `conector_segredos`
   * não tem política nenhuma de propósito (seção 53) e ninguém logado escreve
   * lá. Trocar a ordem seria guardar a chave de um conector que a pessoa não
   * podia mexer.
   */
  const sb = await clienteServidor()
  const { data: permitido, error } = await sb.from('conectores')
    .update({ dica: dicaDe(p.segredo) }).eq('id', p.id).select('id')

  if (error || !permitido?.length) {
    return NextResponse.json({
      erro: 'Este conector não é seu. Conector da empresa é mexido por administrador.',
    }, { status: 403 })
  }

  const servico = clienteDeServico()
  if (!servico) {
    return NextResponse.json({ erro: 'Servidor sem configuração para guardar chave.' }, { status: 503 })
  }
  const { data: dono } = await sb.from('conectores').select('org_id').eq('id', p.id).single()
  const { error: erroSegredo } = await servico.from('conector_segredos').upsert({
    conector_id: p.id,
    org_id: (dono as { org_id: string } | null)?.org_id,
    segredo_cifrado: cifrar(p.segredo),
    mexido_em: new Date().toISOString(),
  })
  if (erroSegredo) {
    return NextResponse.json({ erro: 'Não deu para guardar a chave.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, dica: dicaDe(p.segredo) })
}

/** Faz a chamada. O segredo é decifrado aqui e não sai daqui. */
export async function POST(req: Request) {
  let p: {
    id?: string
    caminho?: string
    metodo?: string
    corpo?: string
    /** Só para o teste de conexão na tela. */
    teste?: boolean
  }
  try { p = await req.json() } catch { return NextResponse.json({ erro: 'Corpo inválido.' }, { status: 400 }) }
  if (!p.id) return NextResponse.json({ erro: 'Falta o conector.' }, { status: 400 })

  /**
   * Quem decide se a pessoa alcança este conector continua sendo a política, com
   * o cliente da sessão. Só depois de ela devolver a linha é que o servidor vai
   * buscar o segredo, que mora fora do alcance de quem está logado.
   */
  const sb = await clienteServidor()
  const { data, error } = await sb
    .from('conectores')
    .select('id,nome,base_url,auth_tipo,auth_nome,ativo')
    .eq('id', p.id)
    .single()

  if (error || !data) return NextResponse.json({ erro: 'Conector não encontrado.' }, { status: 404 })
  const c = data as Conector
  if (!c.ativo) return NextResponse.json({ erro: `O conector ${c.nome} está desligado.` }, { status: 400 })

  const servico = clienteDeServico()
  const { data: guardado } = servico
    ? await servico.from('conector_segredos').select('segredo_cifrado').eq('conector_id', p.id).maybeSingle()
    : { data: null }
  const segredo = decifrar((guardado as { segredo_cifrado: string } | null)?.segredo_cifrado || '')
  if (!segredo) {
    return NextResponse.json({
      erro: 'A chave deste conector não abre. Ou ela nunca foi guardada, ou a variável TRACK_SEGREDO mudou desde que ela foi guardada.',
    }, { status: 400 })
  }

  // O caminho vem de fora, o endereço base vem do banco. Assim o pedido não pode
  // trocar o destino, só escolher o caminho dentro daquele serviço.
  const caminho = (p.caminho || '').trim()
  if (caminho.startsWith('http')) {
    return NextResponse.json({ erro: 'O caminho é relativo ao conector, não um endereço completo.' }, { status: 400 })
  }
  const alvo = `${c.base_url.replace(/\/+$/, '')}/${caminho.replace(/^\/+/, '')}`

  const cabecalhos: Record<string, string> = {
    'content-type': 'application/json',
    'user-agent': 'Track/1.0 (conector)',
  }
  let url = alvo
  if (c.auth_tipo === 'bearer') cabecalhos.authorization = `Bearer ${segredo}`
  else if (c.auth_tipo === 'header') cabecalhos[c.auth_nome || 'x-api-key'] = segredo
  else url += `${alvo.includes('?') ? '&' : '?'}${encodeURIComponent(c.auth_nome || 'key')}=${encodeURIComponent(segredo)}`

  const metodo = (p.metodo || (p.teste ? 'GET' : 'POST')).toUpperCase()

  try {
    /**
     * `comCredencial` porque aqui vai o segredo da empresa, no cabeçalho ou na
     * própria url. É a rota mais perigosa das três: ela DEVOLVE um pedaço da
     * resposta para quem chamou, então um desvio para dentro da rede traria a
     * leitura de volta pela tela.
     */
    const saida = await buscar(url, {
      comCredencial: true,
      method: metodo,
      headers: cabecalhos,
      body: metodo === 'GET' || metodo === 'HEAD' ? undefined : (p.corpo || '{}'),
      signal: AbortSignal.timeout(15_000),
    })
    if (!saida.ok) return NextResponse.json({ erro: saida.motivo }, { status: 400 })
    const r = saida.r
    // Devolvemos um pedaço da resposta para a tela poder dizer o que o serviço
    // respondeu. Cortado, porque resposta de API pode vir com meio mundo dentro.
    const texto = (await r.text()).slice(0, 600)
    return NextResponse.json({ ok: r.ok, status: r.status, resposta: texto })
  } catch {
    return NextResponse.json({ ok: false, erro: 'O serviço não respondeu em 15 segundos.' })
  }
}
