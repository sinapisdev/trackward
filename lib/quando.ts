import { hojeIso, soma } from './datas'

/**
 * "Sexta" vira data.
 *
 * Quem escreve no chat não escreve 2026-10-03, escreve "sexta", "amanhã", "dia
 * 10". Sem isto, todo comando com prazo viraria um formulário, e um comando que
 * abre formulário não é comando.
 *
 * O que ele NÃO faz é adivinhar. Palavra que não bate com nada volta nula, e
 * quem chamou trata como texto comum: prazo inventado é pior que prazo em
 * branco, porque ninguém confere o que o app decidiu sozinho.
 */

const limpo = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

/** Domingo é 0, como no Date. */
const DIAS = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado']
const MES = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

/**
 * A data que este texto quer dizer, ou nulo.
 *
 * @param texto o pedaço solto, já sem o "até"
 * @param hoje  de quando contar, para o teste não depender do relógio
 */
export function quandoEh(texto: string, hoje = hojeIso()): string | null {
  const t = limpo(texto).replace(/^(ate|até|para|pra|em|no|na|no dia|dia)\s+/, '')
  if (!t) return null

  if (t === 'hoje') return hoje
  if (t === 'amanha') return soma(hoje, 1)
  if (t === 'depois de amanha') return soma(hoje, 2)
  if (t === 'hoje a noite' || t === 'hoje de noite') return hoje

  // "em 3 dias", "em duas semanas". O "em" é opcional porque o prefixo já foi
  // tirado acima: sem isso, "em 3 dias" chegava aqui como "3 dias" e não batia.
  const emN = /^(?:em\s+)?(\d+|um|uma|dois|duas|tres|quatro|cinco)\s+(dia|dias|semana|semanas|mes|meses)$/.exec(t)
  if (emN) {
    const numeros: Record<string, number> = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5 }
    const n = Number(emN[1]) || numeros[emN[1]] || 0
    if (!n) return null
    const passo = emN[2].startsWith('semana') ? 7 : emN[2].startsWith('mes') ? 30 : 1
    return soma(hoje, n * passo)
  }

  // "sexta", "sexta-feira", "proxima sexta". Sempre para a frente: quem diz
  // "sexta" numa sexta quer a próxima, não hoje.
  const dia = t.replace(/-?feira$/, '').replace(/^(proxima|proximo|essa|esta)\s+/, '').trim()
  const k = DIAS.indexOf(dia)
  if (k >= 0) {
    const atual = new Date(hoje + 'T12:00:00').getDay()
    const falta = (k - atual + 7) % 7
    return soma(hoje, falta === 0 ? 7 : falta)
  }

  // "10/03", "10/03/2027", "10-03"
  const barra = /^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?$/.exec(t)
  if (barra) {
    const d = Number(barra[1])
    const m = Number(barra[2])
    if (d < 1 || d > 31 || m < 1 || m > 12) return null
    const anoBase = Number(hoje.slice(0, 4))
    let ano = barra[3] ? Number(barra[3].length === 2 ? '20' + barra[3] : barra[3]) : anoBase
    const montado = `${ano}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    // Sem ano, uma data que já passou é do ano que vem: ninguém marca prazo
    // para trás, e "10/01" dito em dezembro é janeiro.
    if (!barra[3] && montado < hoje) ano += 1
    return `${ano}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  // "10 de março", "3 de abril de 2027"
  const porExtenso = /^(\d{1,2})\s+de\s+([a-z]+)(?:\s+de\s+(\d{4}))?$/.exec(t)
  if (porExtenso) {
    const d = Number(porExtenso[1])
    const m = MES.findIndex((x) => x.startsWith(porExtenso[2].slice(0, 3)))
    if (m < 0 || d < 1 || d > 31) return null
    const anoBase = Number(hoje.slice(0, 4))
    let ano = porExtenso[3] ? Number(porExtenso[3]) : anoBase
    const montado = `${ano}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    if (!porExtenso[3] && montado < hoje) ano += 1
    return `${ano}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  return null
}

/** A hora que este texto quer dizer: "15h", "15:30", "9h30". */
export function horaEh(texto: string): string | null {
  const t = limpo(texto).replace(/^(as|às|as\s)\s*/, '')
  const m = /^(\d{1,2})(?:[h:](\d{2})?)?(?:min)?$/.exec(t)
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2] || 0)
  if (h > 23 || min > 59) return null
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

/**
 * Tira o prazo de dentro da frase e devolve os dois pedaços.
 *
 * Procura só no FIM, e só depois de "até", "para" ou "dia". Varrer a frase
 * inteira atrás de data faria "Ligar para a Ana" virar tarefa sem a Ana e com
 * prazo nenhum, porque "para" apareceria como marcador.
 */
export function separaQuando(texto: string, hoje = hojeIso()): { texto: string; quando: string | null } {
  const marcadores = /\s+(ate|até|pra|para|no dia|dia)\s+([^,;]+)$/i
  const m = marcadores.exec(texto)
  if (m) {
    const q = quandoEh(m[2], hoje)
    if (q) return { texto: texto.slice(0, m.index).trim(), quando: q }
  }
  // Sem marcador, aceita só a palavra solta no fim: "Conferir o extrato amanhã".
  // O "de" entra no recorte para "Reunião de terça" virar "Reunião", e não
  // "Reunião de", que é o tipo de sobra que ninguém repara ao escrever e todo
  // mundo repara na lista depois.
  const solta = /\s+(?:de\s+|na\s+|no\s+)?(hoje|amanha|amanhã|depois de amanha|depois de amanhã|segunda|terca|terça|quarta|quinta|sexta|sabado|sábado|domingo)(?:-feira)?$/i
  const s = solta.exec(texto)
  if (s) {
    const q = quandoEh(s[1], hoje)
    if (q) return { texto: texto.slice(0, s.index).trim(), quando: q }
  }
  return { texto: texto.trim(), quando: null }
}
