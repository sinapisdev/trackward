import { NextResponse } from 'next/server'
import { MODELO, porModelo, semModelo, type Medida } from '@/lib/leitura'
import type { Contexto } from '@/lib/leitor'
import { clienteServidor } from '@/lib/supabase/servidor'
import { custoMicro } from '@/lib/precos'

/**
 * Leitura da conversa, pedida por gente que está com o app aberto.
 *
 * Com ANTHROPIC_API_KEY no ambiente, quem lê é o modelo, que entende contexto,
 * ironia e a frase que se espalha por três mensagens. Sem chave, ou se a chamada
 * falhar, as regras de lib/leitor.ts assumem. O app nunca fica sem ler.
 *
 * A chave mora só no servidor. O navegador manda a conversa para cá e recebe
 * propostas de volta, nunca o contrário.
 *
 * A mesma leitura roda sozinha, sem ninguém abrir o app, em /api/pulso. O que as
 * duas compartilham está em lib/leitura.ts; o que muda entre elas é quem
 * responde se pode gastar, e por isso essa parte fica em cada uma.
 */

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(req: Request) {
  let ctx: Contexto
  try {
    ctx = await req.json() as Contexto
  } catch {
    return NextResponse.json({ erro: 'Corpo inválido.' }, { status: 400 })
  }
  if (!Array.isArray(ctx?.mensagens) || !ctx.mensagens.length) {
    return NextResponse.json({ propostas: [], motor: 'regras' })
  }

  // A conversa inteira não cabe nem é necessária: o que ficou combinado está
  // nas últimas trocas, não no que se falou há três semanas.
  ctx.mensagens = ctx.mensagens.slice(-40)
  ctx.pessoas = (ctx.pessoas || []).slice(0, 60)

  const chave = process.env.ANTHROPIC_API_KEY

  /**
   * O teto é conferido AQUI, e não na tela.
   *
   * Teto conferido no navegador não é teto: bastaria abrir as ferramentas do
   * navegador e chamar a rota direto. Aqui quem responde se pode gastar é o
   * banco, com a identidade de quem pediu, e não há como passar por cima.
   *
   * Sem Supabase (modo demonstração) não há chave nem cobrança, então não há
   * nada a conferir: cai nas regras embutidas e o app segue igual.
   */
  if (chave) {
    let modelo = MODELO
    let podeGastar = false
    let sb: Awaited<ReturnType<typeof clienteServidor>> | null = null

    try {
      sb = await clienteServidor()
      const [{ data: pode }, { data: daOrg }] = await Promise.all([
        sb.rpc('pode_chamar_modelo'),
        sb.rpc('modelo_da_org'),
      ])
      podeGastar = pode === true
      if (typeof daOrg === 'string' && daOrg) modelo = daOrg
    } catch {
      // Sem sessão ou sem banco: não dá para medir, então não se gasta. Preferir
      // as regras a gastar sem saber de quem é a conta.
      podeGastar = false
    }

    if (podeGastar && sb) {
      const medida: { valor: Medida | null } = { valor: null }
      try {
        const propostas = await porModelo(ctx, chave, modelo, medida)

        // Grava o gasto mesmo quando a resposta não serviu: o token foi cobrado
        // de qualquer jeito, e medidor que só conta acerto mede errado.
        if (medida.valor) {
          const m = medida.valor
          await sb.rpc('registrar_consumo', {
            p_onde: 'leitor',
            p_modelo: m.modelo,
            p_entrada: m.entrada,
            p_saida: m.saida,
            p_cache_leitura: m.cacheLeitura,
            p_cache_escrita: m.cacheEscrita,
            p_custo_micro: custoMicro(m.modelo, {
              entrada: m.entrada, saida: m.saida,
              cacheLeitura: m.cacheLeitura, cacheEscrita: m.cacheEscrita,
            }),
            p_canal: ctx.canal_id ?? null,
          })
        }

        if (propostas) return NextResponse.json({ propostas, motor: 'ia', modelo })
      } catch {
        // Modelo fora do ar não pode deixar o app sem ler a conversa.
      }
    } else {
      return NextResponse.json({
        propostas: semModelo(ctx),
        motor: 'regras',
        // A tela precisa poder dizer por que a leitura saiu mais simples hoje.
        porque: 'teto',
      })
    }
  }

  return NextResponse.json({ propostas: semModelo(ctx), motor: 'regras' })
}

/**
 * A leitura sem modelo.
 *
 * Duas regras diferentes, porque são dois problemas diferentes: conversa de
 * equipe pede desconfiança, despejo pede generosidade. Ver doDespejo.
 */