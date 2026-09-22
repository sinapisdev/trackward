import { parecido } from './leitor'
import type { Proposta } from './leitor'
import type { Agente, Canal, Mensagem } from './tipos'

/**
 * Os agentes da empresa.
 *
 * A descoberta que fez isto caber num tamanho razoável: **o agente que uma
 * empresa quer já é um processo.** "Alguém foi desligado, o RH faz o acerto, o
 * Financeiro paga" é um molde com dois checkpoints em duas áreas, e o app já
 * sabe criar uma esteira a partir de um molde distribuindo as tarefas pelas
 * áreas. O que faltava era o gatilho.
 *
 * Então um agente é duas coisas, e nada mais:
 *
 *   quando   o que reconhecer na conversa, escrito em português pela empresa
 *   faz      criar uma esteira de um processo, criar uma tarefa numa área, ou
 *            chamar uma URL
 *
 * **A ação nunca é direta: ela vira uma proposta**, a mesma que a leitura da
 * conversa já usa. Com isso o agente herda de graça tudo que foi construído para
 * a IA não fazer besteira em silêncio: o trecho que deu origem à vista, o aceite
 * de uma pessoa, a assinatura de quem fez, o desfazer, e a memória aprendendo
 * quando alguém recusa.
 *
 * Um agente disparando um processo inteiro sozinho, por causa de uma frase mal
 * lida, criaria vinte tarefas erradas em duas áreas. O aceite de uma pessoa custa
 * um toque e evita isso.
 *
 * Duas camadas de reconhecimento, como no resto do app. Com chave de modelo, quem
 * julga se a conversa fala daquilo é o modelo, que entende "o João não vem mais"
 * como desligamento. Sem chave, valem as palavras que a empresa escreveu no campo
 * reconhecer, o que é mais bruto e ainda assim útil.
 */

/** Este agente escuta neste canal? */
export function escutaAqui(a: Agente, canal: Canal): boolean {
  if (!a.ativo) return false
  if (a.canal_id) return a.canal_id === canal.id
  if (a.area_id) return a.area_id === canal.area_id
  return true
}

/** O que a empresa escreveu, em uma linha, para o modelo julgar. */
export const comoInstrucao = (a: Agente) =>
  `- agente "${a.nome}" (id ${a.id}): dispare quando ${a.reconhecer.trim()}`

/** O que este agente vai fazer, em português, para a proposta poder ser lida. */
export function oQueFaz(
  a: Agente,
  nomeDoProcesso: (id: string | null) => string,
  nomeDaArea: (id: string | null) => string,
  nomeDoConector: (id: string | null) => string = () => 'um conector',
): string {
  if (a.faz === 'processo') return `abrir ${nomeDoProcesso(a.processo_id)}`
  if (a.faz === 'tarefa') return `criar "${a.tarefa_texto}" em ${nomeDaArea(a.tarefa_area_id)}`
  if (a.faz === 'conector') {
    return `chamar ${nomeDoConector(a.conector_id)}${a.caminho ? ` em ${a.caminho}` : ''}`
  }
  return `avisar ${a.url.replace(/^https?:\/\//, '').split('/')[0]}`
}

/**
 * Sem chave de modelo: as palavras que a empresa escreveu.
 *
 * Mais bruto do que o modelo, e de propósito mais exigente: pede metade das
 * palavras do reconhecer batendo na frase, porque um agente que dispara fácil é
 * pior do que um agente que não dispara.
 */
export function porPalavras(
  agentes: Agente[],
  canal: Canal,
  mensagens: Mensagem[],
  desde: string | null,
  jaDisparado: (agenteId: string, mensagemId: string) => boolean,
): Proposta[] {
  const saida: Proposta[] = []
  const aqui = agentes.filter((a) => escutaAqui(a, canal) && a.reconhecer.trim())

  for (const m of mensagens) {
    if (m.sistema || !m.texto) continue
    if (desde && m.criado_em <= desde) continue
    for (const a of aqui) {
      if (jaDisparado(a.id, m.id)) continue
      if (parecido(m.texto, a.reconhecer) < 0.5) continue
      saida.push({
        tipo: 'agente',
        texto: a.nome,
        motivo: m.texto.slice(0, 300),
        mensagem_id: m.id,
        dados: { agente_id: a.id },
      })
    }
  }
  return saida
}
