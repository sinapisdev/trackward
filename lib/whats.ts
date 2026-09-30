import { chaveDoConector } from './conector'
import { formasDoFone } from './fone'

/**
 * Mandar mensagem pelo WhatsApp da empresa, pela Twilio.
 *
 * Morava dentro de `/api/avisar`, que era o único lugar que falava para fora.
 * Saiu de lá quando o pulso passou a ter o que dizer sozinho (a pergunta do
 * dia): duas cópias disto seriam duas formas de montar a mesma chamada, e a que
 * ninguém olha é a que quebra quando o conector mudar.
 *
 * NÃO passa pela rota `/api/conector` de propósito: aquela manda JSON, e a
 * Twilio só aceita formulário. Fosse por lá, toda mensagem voltaria 400 e
 * ninguém entenderia por quê.
 *
 * Devolve o sid da mensagem, que é o que permite casar a resposta sem
 * interpretar nada: a Twilio entrega o id da citada em quem responde.
 */

type Conector = {
  base_url: string
  auth_tipo: string
  auth_nome: string | null
  ativo: boolean
}

/**
 * O mínimo do cliente de serviço que isto usa.
 *
 * Solto de propósito. Escrever a forma exata do construtor de consulta do
 * supabase-js aqui fez o compilador desistir ("type instantiation is
 * excessively deep"): aquele tipo é gerado e recursivo, e copiá-lo à mão é
 * copiar uma coisa que muda com a biblioteca. O que importa é que este arquivo
 * não conheça o resto do app.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
type Cliente = {
  from: (t: string) => any
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function mandarWhats(
  sb: Cliente, org_id: string, para: string, texto: string,
): Promise<string | null> {
  if (!org_id || !para || !texto) return null

  const { data: o } = await sb.from('organizacoes')
    .select('whats_conector,whats_sid,whats_de,whats_via').eq('id', org_id).single()
  const org = o as { whats_conector: string | null; whats_sid: string | null
    whats_de: string | null; whats_via: string | null } | null
  if (!org?.whats_conector || !org.whats_sid || !org.whats_de) return null

  const { data } = await sb.from('conectores')
    .select('base_url,auth_tipo,auth_nome,ativo')
    .eq('id', org.whats_conector).single()
  const c = data as Conector | null
  if (!c || !c.ativo) return null

  const chave = await chaveDoConector(sb, org.whats_conector)
  if (!chave) return null

  const base = c.base_url.replace(/\/+$/, '')

  /**
   * A Meta fala JSON e a Twilio fala formulário, e a diferença acaba aqui.
   *
   * Na Meta o número de destino vai SEM o mais e sem o prefixo `whatsapp:`,
   * que é o tipo de detalhe que custa uma tarde: com o mais ela aceita a
   * chamada, devolve 200, e a mensagem não chega a ninguém.
   */
  if ((org.whats_via || 'twilio') === 'meta') {
    /**
     * Tenta as formas do número, e não só a guardada.
     *
     * O app guarda +55 42 99978-3288 e o WhatsApp conhece essa linha como
     * 554299783288, sem o nono dígito. Mandando para a forma guardada, a Meta
     * recusa, e a recusa fala do DESTINATÁRIO ("not in allowed list"), então
     * quem depura vai mexer no cadastro da Meta em vez de olhar o número. Não
     * há como saber de fora qual forma aquela linha usa: linha nova tem o nove,
     * linha velha não, e as duas existem na mesma casa.
     *
     * Na prática é uma chamada a mais só quando a primeira falha, e nenhuma
     * quando o número não é brasileiro.
     */
    let ultima = ''
    for (const forma of formasDoFone(para)) {
      try {
        const r = await fetch(`${base}/${encodeURIComponent(org.whats_sid)}/messages`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${chave}`,
            'user-agent': 'TrackWard/1.0',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: forma,
            type: 'text',
            text: { preview_url: false, body: texto },
          }),
          signal: AbortSignal.timeout(15_000),
        })
        if (r.ok) {
          const j = await r.json().catch(() => null) as { messages?: { id?: string }[] } | null
          return j?.messages?.[0]?.id || 'enviada'
        }
        // A recusa precisa aparecer em algum lugar. `if (!r.ok) return null`
        // fazia o envio falhar sem deixar rastro nenhum, e do lado de cá
        // parecia que tinha ido: é o modo de falha mais caro que existe aqui,
        // porque ninguém vai procurar o que não deu erro.
        const e = await r.json().catch(() => null) as { error?: { code?: number; message?: string } } | null
        ultima = `${e?.error?.code} ${e?.error?.message}`
        console.error('whats: a Meta recusou para', forma, '|', ultima)
      } catch (erro) {
        console.error('whats: não alcancei a Meta para', forma, '|', String(erro))
      }
    }
    return null
  }

  const corpo = new URLSearchParams({
    To: `whatsapp:${para}`,
    From: org.whats_de.startsWith('whatsapp:') ? org.whats_de : `whatsapp:${org.whats_de}`,
    Body: texto,
  })

  const cabecalhos: Record<string, string> = {
    'content-type': 'application/x-www-form-urlencoded',
    'user-agent': 'TrackWard/1.0',
  }
  if (c.auth_tipo === 'bearer') cabecalhos.authorization = `Bearer ${chave}`
  else cabecalhos[c.auth_nome || 'authorization'] = chave

  try {
    const r = await fetch(
      `${base}/Accounts/${encodeURIComponent(org.whats_sid)}/Messages.json`,
      { method: 'POST', headers: cabecalhos, body: corpo, signal: AbortSignal.timeout(15_000) },
    )
    if (!r.ok) return null
    const j = await r.json().catch(() => null) as { sid?: string } | null
    return j?.sid || 'enviada'
  } catch {
    return null
  }
}
