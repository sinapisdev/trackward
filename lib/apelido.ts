/**
 * O @ da pessoa: um nome que ela escolhe e que não se repete em lugar nenhum.
 *
 * Ele existe por um motivo prático antes de qualquer tese: **para alguém ser
 * chamado, ele precisa de um endereço**. Hoje o convite vai para um telefone ou
 * um e-mail, e os dois são de outra pessoa: o telefone é da operadora, o e-mail
 * é do Google. O @ é do TrackWard, e é o que torna possível um dia escrever
 * para alguém sem saber o e-mail dele.
 *
 * **Ele é do LOGIN, não do perfil.** A mesma pessoa tem um perfil por espaço, e
 * quatro empresas não lhe dão quatro nomes: o @ é dela, e atravessa junto com a
 * agenda e com o dia.
 *
 * **E ele se pede no cadastro, não depois.** Nome bom acaba: quem chegar em
 * seis meses não vai achar o que quer, e quem se cadastrou antes de o campo
 * existir fica sem nenhum e precisa ser perguntado de novo, que é a conversa
 * que `PedeNome` já existe para ter e que ninguém quer ter duas vezes.
 */

/** Entre três e vinte: menos não distingue, mais ninguém digita. */
export const MIN = 3
export const MAX = 20

/**
 * Os nomes que o app não pode deixar alguém tomar.
 *
 * Duas famílias, e as duas doem de jeitos diferentes. A primeira são os
 * ENDEREÇOS do app: um `@entrar` ou um `@api` tornaria impossível um dia abrir
 * `trackward.app/@fulano` sem escolher entre a pessoa e a rota. A segunda é o
 * que se faz passar pela casa: `@suporte` e `@trackward` escrevendo para um
 * cliente é golpe com o nome certo no remetente.
 */
export const RESERVADOS = new Set([
  // os endereços que já existem, e os que nascerão
  'api', 'auth', 'entrar', 'sair', 'convite', 'feedback', 'avisos', 'agenda',
  'chat', 'notas', 'tracks', 'track', 'fluxo', 'minhas', 'tarefas', 'equipe',
  'ajustes', 'processos', 'relatorios', 'desempenho', 'agentes', 'conectores',
  'secretario', 'design-system', 'nova-senha', 'projetos', 'areas', 'area',
  'app', 'www', 'admin', 'root', 'static', 'public', 'assets', 'novo', 'me',
  // e o que se faria passar pela casa
  'trackward', 'suporte', 'ajuda', 'contato', 'seguranca', 'oficial',
  'cobranca', 'financeiro', 'noreply', 'sistema', 'bot', 'ia',
])

export type Recusa =
  | 'curto' | 'longo' | 'formato' | 'ponta' | 'repetido' | 'reservado'

/** A frase que a tela mostra, em português e dizendo o que fazer. */
export const PORQUE: Record<Recusa, string> = {
  curto: `Precisa de pelo menos ${MIN} letras.`,
  longo: `No máximo ${MAX} caracteres.`,
  formato: 'Só letras, números, ponto e traço baixo.',
  ponta: 'Não pode começar nem terminar com ponto ou traço baixo.',
  repetido: 'Dois pontos ou dois traços seguidos, não.',
  reservado: 'Esse está reservado pelo app. Escolha outro.',
}

/**
 * O @ do jeito que ele é guardado: minúsculo, sem acento e sem o arroba.
 *
 * Sem acento de propósito, e isto não é preguiça com o português: o @ é um
 * endereço, e endereço com acento é o que alguém digita errado no telefone de
 * outra pessoa. "joao" e "joão" seriam duas pessoas diferentes para o banco e a
 * mesma para quem lê, que é a pior combinação possível num identificador.
 */
export function normaliza(bruto: string): string {
  return (bruto || '')
    .trim()
    .replace(/^@+/, '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

/** Nulo quando serve. Com motivo, quando não. */
export function confere(bruto: string): Recusa | null {
  const a = normaliza(bruto)
  if (a.length < MIN) return 'curto'
  if (a.length > MAX) return 'longo'
  if (!/^[a-z0-9._]+$/.test(a)) return 'formato'
  if (/^[._]|[._]$/.test(a)) return 'ponta'
  if (/[._]{2}/.test(a)) return 'repetido'
  if (RESERVADOS.has(a)) return 'reservado'
  return null
}

export const serve = (bruto: string) => confere(bruto) === null

/**
 * Um palpite a partir do nome, para o campo não nascer vazio.
 *
 * Campo vazio num cadastro é um campo que a pessoa pula ou abandona, e este não
 * dá para pular: o @ não se escolhe depois sem uma segunda conversa. O palpite
 * é editável, e serve para a pessoa ver a FORMA antes de inventar a dela.
 *
 * Ele não garante que está livre, e não deve garantir: perguntar isso é ida ao
 * banco, e a tela faz essa pergunta enquanto a pessoa digita.
 */
export function palpite(nome: string): string {
  const limpo = normaliza(nome).replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '')
  if (!limpo) return ''
  const curto = limpo.slice(0, MAX).replace(/[._]+$/, '')
  // Reservado ou curto demais ganha um número, em vez de voltar vazio: o
  // palpite existe para a pessoa ter de onde partir.
  if (curto.length < MIN || RESERVADOS.has(curto)) {
    return `${curto}${Math.floor(Math.random() * 90) + 10}`.slice(0, MAX)
  }
  return curto
}

/** Como ele aparece na tela, sempre com o arroba na frente. */
export const escrito = (a: string | null | undefined) => (a ? `@${a}` : '')
