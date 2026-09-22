import type { Aviso, AvisoContato, TipoAviso } from './tipos'

/**
 * Avisos: o que o app diz quando ninguém está olhando.
 *
 * Três decisões que valem explicar, e que valem tanto para o sino quanto para o
 * push e para o WhatsApp.
 *
 * **O aviso nasce no banco.** Este arquivo não cria aviso nenhum: ele só lê o
 * que o banco escreveu e decide como mostrar e para onde mandar. Quem cria são
 * os gatilhos da seção 14 do `supabase/schema.sql`, porque quem age quase nunca
 * é quem precisa ser avisado.
 *
 * **Urgente é uma faixa estreita, de propósito.** Tocar o celular de alguém é
 * caro: gasta a atenção da pessoa e gasta a credibilidade do app. Só é urgente o
 * que já venceu, o que trava outra pessoa e o que só aquela pessoa destrava. Se
 * tudo vira urgente, nada é, e a primeira coisa que o usuário faz é desligar.
 *
 * **Fora do app só sai o que a pessoa pediu.** O sino mostra tudo, porque ela
 * abriu o app. O push e o WhatsApp respeitam o que ela ligou, o "só urgente" e o
 * horário de não perturbe. Aviso que a pessoa não pediu não é serviço, é spam.
 */

/** Quantos minutos depois da meia-noite, para comparar horário sem data. */
const emMinutos = (hhmm: string) => {
  const [h, m] = hhmm.split(':')
  return Number(h) * 60 + Number(m || 0)
}

/** O rótulo curto do tipo, para a linha do sino. */
export const ROTULO: Record<TipoAviso, string> = {
  tarefa: 'Tarefa',
  aprovacao: 'Aprovação',
  prazo: 'Prazo',
  travou: 'Travou',
  destravou: 'Destravou',
  citacao: 'Conversa',
  pedido_prazo: 'Prazo',
}

/** Para onde o aviso leva quando alguém clica nele. */
export function destino(a: Aviso): string {
  if (a.canal_id) return `/chat/${a.canal_id}`
  if (a.tipo === 'pedido_prazo') return '/minhas'
  if (a.fluxo_id) return `/fluxo/${a.fluxo_id}`
  return '/minhas'
}

/**
 * Este aviso pode sair do app agora, para esta pessoa?
 *
 * Fica aqui, e não na rota, para a tela poder explicar a mesma regra com as
 * mesmas palavras: quando a pessoa lê "só urgente", é esta função que decide.
 */
export function podeSair(a: Aviso, c: AvisoContato | null, agora = new Date()): boolean {
  if (!c) return false
  if (!c.push && !c.whats) return false
  if (c.so_urgente && !a.urgente) return false

  // Não perturbe. A faixa pode virar a noite (22:00 às 07:00), e aí ela é o
  // lado de fora do intervalo, não o de dentro.
  if (c.calado_de && c.calado_ate) {
    const agoraMin = agora.getHours() * 60 + agora.getMinutes()
    const de = emMinutos(c.calado_de)
    const ate = emMinutos(c.calado_ate)
    const calado = de <= ate ? agoraMin >= de && agoraMin < ate : agoraMin >= de || agoraMin < ate
    // O que já venceu fura o silêncio: é a única coisa que não espera amanhã.
    if (calado && !a.urgente) return false
  }
  return true
}

/** Uma linha de texto puro, que serve ao WhatsApp e ao push do mesmo jeito. */
export function comoTexto(a: Aviso, base: string): string {
  const corpo = a.corpo ? `\n${a.corpo}` : ''
  return `*${a.titulo}*${corpo}\n${base}${destino(a)}`
}

/** O telefone em E.164, ou vazio quando não dá para usar. */
export function telefoneLimpo(bruto: string): string {
  const so = (bruto || '').replace(/[^\d+]/g, '')
  if (!so) return ''
  const num = so.startsWith('+') ? so : `+${so}`
  // Menos que isso não é telefone com país e DDD, e mandar para lá é gastar
  // mensagem para ninguém.
  return /^\+\d{10,15}$/.test(num) ? num : ''
}

/** Agrupa a caixa por dia, que é como alguém lê uma lista de avisos. */
export function porDia(avisos: Aviso[]): { dia: string; itens: Aviso[] }[] {
  const mapa = new Map<string, Aviso[]>()
  for (const a of avisos) {
    const dia = a.criado_em.slice(0, 10)
    const lista = mapa.get(dia)
    if (lista) lista.push(a)
    else mapa.set(dia, [a])
  }
  return [...mapa.entries()].map(([dia, itens]) => ({ dia, itens }))
}
