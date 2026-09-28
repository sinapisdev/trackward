import { COMANDOS, lerComando, quemEh } from './comandos'
import { curta } from './datas'

/**
 * O que um comando QUER dizer, separado de quem vai executá-lo.
 *
 * A gramática (`lib/comandos.ts`) já era compartilhada: ela lê a linha e diz
 * que ali tem uma tarefa, uma pessoa e um prazo. O que não era compartilhado é
 * a decisão do que fazer com isso, e ela morava dentro do `Dados.tsx`, amarrada
 * ao React. O WhatsApp roda no servidor, sem tela e sem sessão, e precisava das
 * mesmas regras.
 *
 * Copiar aquelas regras para cá seria o erro que o AGENTS descreve: duas cópias
 * viram duas linguagens no mês seguinte, e a tarefa criada pelo telefone passa a
 * nascer diferente da criada pelo chat. Então este arquivo não executa nada. Ele
 * recebe a linha e os fatos do mundo, e devolve a **intenção**: o que criar, com
 * que campos, ou o que falta perguntar. Quem escreve no banco é quem chamou,
 * cada um com o cliente que tem.
 *
 * Sendo puro, ele é testável sem servidor, sem navegador e sem banco, que é o
 * que permite provar as regras em vez de confiar nelas.
 */

export type Mundo = {
  eu: { id: string; nome: string }
  pessoas: { id: string; nome: string; ativo?: boolean }[]
  /**
   * As tracks abertas onde esta pessoa pode pôr tarefa.
   *
   * Só importam para uma coisa: delegar. Tarefa avulsa é privada de quem criou,
   * então dar uma para outra pessoa seria cobrança que ela não enxerga, e a
   * saída é a tarefa morar numa track. Sem track nenhuma, não há como delegar.
   */
  tracks: { id: string; nome: string }[]
  /** AAAA-MM-DD, para "sexta" virar data. */
  hoje: string
}

export type Intencao =
  | { tipo: 'ajuda' }
  /** Não dá para fazer, e o motivo é uma frase que a pessoa lê e resolve. */
  | { tipo: 'recusa'; motivo: string }
  /** Tarefa que não pertence a nada, privada de quem criou. */
  | { tipo: 'avulsa'; texto: string; prazo: string | null }
  /** Tarefa dentro de uma track, que é o único jeito de ela ser de outra pessoa. */
  | { tipo: 'tarefa'; texto: string; resp: string; prazo: string | null; fluxo: string }
  /**
   * Falta a decisão que o app não pode tomar: em qual track ela vive.
   *
   * No app isto vira o formulário já preenchido. No telefone vira uma pergunta
   * com lista numerada, porque não há formulário para abrir.
   */
  | {
      tipo: 'onde-vive'
      texto: string
      resp: string
      respNome: string
      prazo: string | null
      tracks: { id: string; nome: string }[]
    }
  | { tipo: 'track'; nome: string; track: 'esteira' | 'ciclo'; dono: string }
  | { tipo: 'nota'; texto: string }
  | {
      tipo: 'compromisso'
      titulo: string
      quando: string
      hora: string | null
      convidados: string[]
    }

/** Quantas tracks cabem numa lista de escolha no telefone. */
export const ESCOLHAS = 5

/**
 * Lê a linha e decide.
 *
 * Devolve nulo quando não é comando nenhum, e aí o que chegou é mensagem comum:
 * quem chamou segue com o caminho dele.
 */
export function comandar(entrada: string, m: Mundo): Intencao | null {
  const lido = lerComando(entrada, m.hoje)
  if (!lido) return null
  if (lido.comando.nome === 'ajuda') return { tipo: 'ajuda' }

  const texto = lido.texto.trim()
  if (!texto) {
    return { tipo: 'recusa', motivo: `Faltou o quê. Exemplo: ${lido.comando.exemplo}` }
  }

  const pessoa = quemEh(lido.quem, m.pessoas.filter((p) => p.ativo !== false))
  if (lido.quem && !pessoa) {
    return { tipo: 'recusa', motivo: `Não achei ninguém chamado ${lido.quem} por aqui.` }
  }
  const outra = pessoa && pessoa.id !== m.eu.id ? pessoa : null

  if (lido.comando.nome === 'tarefa') {
    // Tarefa para outra pessoa precisa morar numa track. A regra não é de
    // interface: avulsa é privada de quem criou, então uma avulsa dada a
    // terceiro seria cobrança que o cobrado não enxerga.
    if (outra) {
      if (!m.tracks.length) {
        return {
          tipo: 'recusa',
          motivo: `Tarefa para ${outra.nome} precisa morar numa track, senão ela fica `
            + 'privada e a pessoa não a enxerga. Abra uma com /objetivo ou /rotina.',
        }
      }
      return {
        tipo: 'onde-vive',
        texto, resp: outra.id, respNome: outra.nome, prazo: lido.quando,
        tracks: m.tracks.slice(0, ESCOLHAS),
      }
    }
    return { tipo: 'avulsa', texto, prazo: lido.quando }
  }

  if (lido.comando.nome === 'objetivo' || lido.comando.nome === 'rotina') {
    return {
      tipo: 'track',
      nome: texto,
      track: lido.comando.nome === 'rotina' ? 'ciclo' : 'esteira',
      dono: outra?.id ?? m.eu.id,
    }
  }

  if (lido.comando.nome === 'nota') return { tipo: 'nota', texto }

  if (lido.comando.nome === 'agenda') {
    if (!lido.quando) {
      return { tipo: 'recusa', motivo: 'Faltou o dia. Exemplo: /agenda Reunião terça às 15h' }
    }
    return {
      tipo: 'compromisso',
      titulo: texto, quando: lido.quando, hora: lido.hora,
      convidados: outra ? [outra.id] : [],
    }
  }

  return null
}

/**
 * A frase de confirmação, depois de feito.
 *
 * Fica aqui, e não em quem executa, para que a tarefa criada pelo telefone seja
 * contada com as mesmas palavras da criada pelo chat. `onde` é o nome da track,
 * quando o que foi feito tiver uma.
 */
export function oQueFoiFeito(i: Intencao, onde?: string): string {
  if (i.tipo === 'avulsa') {
    return `Pronto: "${i.texto}"${i.prazo ? `, até ${curta(i.prazo)}` : ''}.`
  }
  if (i.tipo === 'tarefa') {
    return `Pronto: "${i.texto}"${onde ? ` em ${onde}` : ''}`
      + `${i.prazo ? `, até ${curta(i.prazo)}` : ''}.`
  }
  if (i.tipo === 'track') {
    return `Abri ${i.track === 'ciclo' ? 'a rotina' : 'o objetivo'} "${i.nome}". `
      + 'Os checkpoints você monta no app, quando sentar para isso.'
  }
  if (i.tipo === 'nota') {
    return 'Guardei no seu caderno.'
  }
  if (i.tipo === 'compromisso') {
    return `Marquei "${i.titulo}" em ${curta(i.quando)}${i.hora ? `, às ${i.hora}` : ''}.`
  }
  return ''
}

/**
 * A ajuda, montada do catálogo.
 *
 * Mostra o exemplo inteiro, e não o nome do comando: linguagem de comando não
 * morre de sintaxe difícil, morre de ninguém descobrir que ela existe, e ler
 * `/tarefa Conferir o contrato @Ana até sexta` ensina a gramática toda de uma
 * vez.
 */
export function ajuda(): string {
  return 'Dá para escrever direto por aqui:\n\n'
    + COMANDOS.filter((c) => c.nome !== 'ajuda').map((c) => c.exemplo).join('\n')
}
