import { COMANDOS, lerComando, ondeEh, quemEh } from './comandos'
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
   * Servem para duas coisas. Delegar é a antiga: tarefa avulsa é privada de
   * quem criou, então dar uma para outra pessoa seria cobrança que ela não
   * enxerga, e a saída é a tarefa morar numa track.
   *
   * A segunda é o endereço escrito (`#Reforma`), e ela é a que faz o WhatsApp
   * valer alguma coisa. Sem endereço, tudo que entrava pelo telefone caía no
   * privado, e um app de equipe onde nada que chega é visto pela equipe é um
   * bloco de notas caro.
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
  | { tipo: 'nota'; texto: string; fluxo: string | null }
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
 * As opções fixas da triagem, depois das tracks.
 *
 * Elas vêm DEPOIS de propósito. A lista responde "onde isso vive", e a resposta
 * que faz o app valer alguma coisa é uma track: é lá que a equipe enxerga, que
 * a tarefa conta para o checkpoint e que o comprador descobre que falta cimento.
 * Com o privado em primeiro, como estava, a opção fácil era também a que não
 * chega a ninguém.
 */
export const FIXAS = [
  { rotulo: 'Tarefa só minha', faz: 'minha' },
  { rotulo: 'No meu caderno', faz: 'nota' },
  { rotulo: 'Deixa pra lá', faz: 'nada' },
]

export type Opcao = { chave: string; rotulo: string; alvo?: string; faz?: string }

/**
 * Monta a lista numerada da triagem.
 *
 * A numeração é calculada, e não escrita: com as tracks na frente, "2" é uma
 * track hoje e o caderno amanhã, dependendo de quantas a pessoa tem. Por isso
 * o que a resposta significa viaja na opção (`faz`), e não no número. Número
 * que quer dizer coisas diferentes é o caminho curto para alguém guardar no
 * caderno o que queria mandar para a obra.
 *
 * `extras` é o que precisa atravessar sem aparecer, hoje só o `_molde`.
 */
export function montarTriagem(
  candidatas: { id: string; nome: string }[], extras: Opcao[] = [],
): { opcoes: Opcao[]; lista: string } {
  const visiveis: Opcao[] = [
    ...candidatas.slice(0, ESCOLHAS).map((t) => ({ rotulo: t.nome, alvo: t.id, faz: 'track' })),
    ...FIXAS,
  ].map((o, k) => ({ ...o, chave: String(k + 1) }))
  return {
    opcoes: [...extras, ...visiveis],
    lista: visiveis.map((o) => `${o.chave}) ${o.rotulo}`).join('\n'),
  }
}

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

  const achadas = ondeEh(lido.onde, m.tracks)
  if (lido.onde && !achadas.length) {
    return { tipo: 'recusa', motivo: `Não achei track chamada "${lido.onde}" por aqui.` }
  }

  if (lido.comando.nome === 'tarefa') {
    const resp = outra?.id ?? m.eu.id
    const respNome = outra?.nome ?? m.eu.nome

    // O endereço escrito ganha de tudo, e não pergunta: quem escreveu `#Reforma`
    // já respondeu onde. Duas tracks casando é o único caso que volta a
    // perguntar, porque aí o `#` não decidiu nada (ver `ondeEh`).
    if (achadas.length === 1) {
      return { tipo: 'tarefa', texto, resp, prazo: lido.quando, fluxo: achadas[0].id }
    }
    if (achadas.length > 1) {
      return {
        tipo: 'onde-vive',
        texto, resp, respNome, prazo: lido.quando, tracks: achadas.slice(0, ESCOLHAS),
      }
    }

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
        texto, resp, respNome, prazo: lido.quando,
        tracks: m.tracks.slice(0, ESCOLHAS),
      }
    }

    /**
     * Sem endereço e para mim mesmo: avulsa, sem perguntar.
     *
     * Aqui a barra decide, e é ela que separa este caso do texto solto. Comando
     * é ordem: quem digitou `/tarefa Ligar para o banco` escolheu, e perguntar
     * "em qual track?" a cada lembrete pessoal é desconfiar de quem acabou de
     * dizer o que queria. Texto solto é o contrário, ninguém combinou nada com
     * a máquina, e lá a pergunta é obrigatória.
     */
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

  // A nota herda o endereço como a tarefa herda, e continua privada: etiquetar
  // é dizer de que assunto ela é, não abrir para ninguém. Quem mostra uma nota
  // é o dono, num segundo gesto.
  if (lido.comando.nome === 'nota') {
    return { tipo: 'nota', texto, fluxo: achadas.length === 1 ? achadas[0].id : null }
  }

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
