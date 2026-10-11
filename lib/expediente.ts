import { DSEM_LONGO, data, iso } from './datas'

/**
 * O expediente: as horas em que a pessoa trabalha.
 *
 * O app sabia quando a CASA fala e quando não perturbar, e não sabia a coisa
 * mais simples: de que horas a que horas aquela pessoa trabalha. Sem isso,
 * prazo de tarefa cai em sábado, o secretário marca reunião às 19h, e a conta
 * de carga divide o trabalho por um dia que não existe.
 *
 * **O cálculo mora aqui, puro.** É a mesma razão de `lib/raiox.ts` e de
 * `lib/comandar.ts`: o que decide onde o trabalho cai precisa poder ser lido e
 * ensaiado sem subir servidor. Quem grava é quem chamou.
 *
 * **Vazio quer dizer "ela não disse", e não "ela trabalha sempre".** A
 * diferença decide o comportamento: sem resposta o app não mexe em prazo
 * nenhum, e é isso que impede o primeiro dia de uso de empurrar as tarefas de
 * alguém para uma semana que ela nunca combinou.
 */

/** Uma faixa de horas, do começo ao fim, no fuso de quem trabalha. */
export type Faixa = [string, string]

/** As faixas por dia da semana. 0 é domingo, como em `Date.getDay()`. */
export type Blocos = Record<string, Faixa[]>

export type Expediente = {
  blocos: Blocos
  fuso: string
  /** O que não cabe em hora, para o modelo ler. O app não interpreta. */
  observacao: string
}

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/

/** Minutos desde a meia-noite, que é a forma em que hora se compara. */
export const emMinutos = (h: string) =>
  Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5))

/**
 * As faixas de um dia, conferidas e em ordem.
 *
 * Devolve vazio em vez de corrigir, pela mesma regra do secretário: faixa torta
 * é engano de leitura, e consertar por dentro é guardar o engano com outra
 * cara. O que se conserta é a ORDEM, porque "13:30 às 17:30 e 08:30 ao meio
 * dia" é a mesma manhã dita fora de ordem, e não um engano.
 */
export function faixasDoDia(cruas: unknown): Faixa[] {
  if (!Array.isArray(cruas)) return []
  const boas: Faixa[] = []
  for (const f of cruas) {
    if (!Array.isArray(f) || f.length !== 2) continue
    const [a, b] = [String(f[0]).trim(), String(f[1]).trim()]
    if (!HORA.test(a) || !HORA.test(b)) continue
    // Fim antes do começo não é expediente que vira a noite, é leitura torta:
    // ninguém descreve o próprio dia começando às 18h e terminando às 9h.
    if (emMinutos(b) <= emMinutos(a)) continue
    boas.push([a, b])
  }
  return boas.sort((x, y) => emMinutos(x[0]) - emMinutos(y[0])).slice(0, 4)
}

/** O expediente inteiro, conferido. Dia sem faixa boa some. */
export function valida(cru: unknown): Blocos {
  const o = (cru || {}) as Record<string, unknown>
  const saida: Blocos = {}
  for (let d = 0; d <= 6; d++) {
    const f = faixasDoDia(o[String(d)])
    if (f.length) saida[String(d)] = f
  }
  return saida
}

/**
 * Alguma coisa foi dita? Vazio é "ela não respondeu ainda".
 *
 * É um GUARDA DE TIPO (`e is Expediente`), e não só um booleano: quem pergunta
 * isto está prestes a usar o expediente, e sem o guarda cada chamador precisa
 * de um `as Expediente` logo abaixo, que é o jeito de um dia alguém escrever
 * `as` sem ter perguntado.
 */
export const temExpediente = (e: Expediente | null | undefined): e is Expediente =>
  !!e && Object.keys(e.blocos || {}).length > 0

/** Este dia tem expediente? Sábado e domingo somem por ausência, não por regra. */
export const diaUtil = (e: Expediente | null | undefined, dia: string) =>
  !!e && (e.blocos[String(data(dia).getDay())] || []).length > 0

/**
 * Esta hora cai dentro do expediente daquele dia?
 *
 * Usada para avisar, nunca para recusar. Marcar fora do expediente é direito de
 * quem marca: a reunião das 19h com o cliente existe, e um app que a recusa é
 * um app que se descobre contornando.
 */
export function dentro(e: Expediente | null | undefined, dia: string, hora: string): boolean {
  if (!e || !HORA.test(hora)) return false
  const faixas = e.blocos[String(data(dia).getDay())] || []
  const m = emMinutos(hora)
  return faixas.some(([a, b]) => m >= emMinutos(a) && m < emMinutos(b))
}

/**
 * O próximo dia útil a partir de um dia, inclusive ele mesmo.
 *
 * É o que impede o prazo de cair em sábado. Devolve o dia como veio quando
 * ninguém disse nada, porque **sem expediente o app não mexe em prazo**: adiar
 * a tarefa de alguém por uma regra que essa pessoa nunca deu é pior do que o
 * prazo cair num sábado que ela talvez trabalhe.
 *
 * O teto de 14 dias existe para a semana inteira vazia não virar laço infinito:
 * quem marcou expediente em nenhum dia recebe o dia de volta, e isso é melhor
 * que um app parado.
 */
export function proximoUtil(e: Expediente | null | undefined, dia: string): string {
  if (!temExpediente(e)) return dia
  let d = dia
  for (let i = 0; i < 14; i++) {
    if (diaUtil(e, d)) return d
    const x = data(d)
    x.setDate(x.getDate() + 1)
    d = iso(x)
  }
  return dia
}

/**
 * Quantas horas de trabalho a pessoa tem por semana.
 *
 * É a conta que falta para a carga dizer algo verdadeiro: "isto leva 50 dias"
 * é uma frase sobre dias de calendário, e dia de calendário não é dia de
 * trabalho. Quem usa isto hoje é a tela, para explicar o expediente de volta a
 * quem o escreveu.
 */
export function horasPorSemana(e: Expediente | null | undefined): number {
  if (!e) return 0
  let m = 0
  for (const faixas of Object.values(e.blocos || {})) {
    for (const [a, b] of faixas) m += emMinutos(b) - emMinutos(a)
  }
  return Math.round((m / 60) * 10) / 10
}

/**
 * O expediente escrito em português, para a tela e para o modelo.
 *
 * Dias seguidos com o mesmo horário viram uma linha, porque é assim que uma
 * pessoa diz: "de segunda a quinta das 8h30 ao meio-dia", e não quatro linhas
 * iguais. Uma lista que repete quatro vezes a mesma coisa não é lida.
 */
export function escrito(e: Expediente | null | undefined): string {
  if (!temExpediente(e)) return ''
  const chave = (d: number) =>
    (e!.blocos[String(d)] || []).map(([a, b]) => `${a} às ${b}`).join(' e ')

  const linhas: string[] = []
  let d = 0
  while (d <= 6) {
    const atual = chave(d)
    if (!atual) { d++; continue }
    let fim = d
    while (fim + 1 <= 6 && chave(fim + 1) === atual) fim++
    const nome = d === fim
      ? DSEM_LONGO[d]
      : `${DSEM_LONGO[d]} a ${DSEM_LONGO[fim]}`
    linhas.push(`${nome}, ${atual}`)
    d = fim + 1
  }
  return linhas.join('; ')
}

/**
 * O que vai para o modelo, em texto.
 *
 * Separado de `escrito` porque o que a tela mostra e o que o modelo precisa não
 * são a mesma coisa: ele também precisa saber o que NÃO fazer, e precisa da
 * observação, que é onde mora metade do que se diz sobre rotina.
 */
export function paraOModelo(e: Expediente | null | undefined): string {
  if (!temExpediente(e)) return ''
  return `O EXPEDIENTE DELA (respeite ao marcar e ao pôr prazo):
${escrito(e)}
Fuso: ${e!.fuso}.
${e!.observacao ? `Ela ainda disse: ${e!.observacao}\n` : ''}Não ponha prazo nem compromisso fora disso sem ela pedir. Pedindo, faça e diga que está fora do expediente dela.`
}

/* ------------------------------------------------------------------ vagas */

/** Um pedaço de tempo ocupado, vindo da agenda. Dia inteiro tem hora nula. */
export type Ocupado = { quando: string; inicio: string | null; fim: string | null }

/** Uma vaga achada: dia, começo e fim, já dentro do expediente. */
export type Vaga = { quando: string; inicio: string; fim: string }

const paraHora = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

/**
 * A hora depois de somar minutos. "09:00" mais 90 é "10:30".
 *
 * Mora aqui com `emMinutos` e `paraHora`, e não em quem precisa dela, porque
 * conta de hora escrita à mão em três telas é o jeito conhecido de uma delas
 * devolver "9:0" num dia qualquer. Passa das 24h e para nas 23:59: um bloco que
 * vira a noite não é bloco, é leitura torta, e devolver "25:30" seria gravar o
 * engano com outra cara.
 */
export const somaMinutos = (hora: string, minutos: number) =>
  paraHora(Math.min(emMinutos(hora) + Math.max(0, Math.round(minutos)), 23 * 60 + 59))

/**
 * Os pedaços livres de um dia: o expediente menos o que já está marcado.
 *
 * Compromisso de dia inteiro come o dia, porque é isso que ele quer dizer.
 */
export function livresDoDia(e: Expediente, dia: string, ocupado: Ocupado[]): [number, number][] {
  const doDia = ocupado.filter((o) => o.quando === dia)
  if (doDia.some((o) => !o.inicio)) return []
  const cheios = doDia
    .map((o) => [emMinutos(o.inicio!), o.fim ? emMinutos(o.fim) : emMinutos(o.inicio!) + 60] as [number, number])
    .sort((a, b) => a[0] - b[0])

  const livres: [number, number][] = []
  for (const [a, b] of e.blocos[String(data(dia).getDay())] || []) {
    let corte = emMinutos(a)
    const fim = emMinutos(b)
    for (const [ci, cf] of cheios) {
      if (cf <= corte || ci >= fim) continue
      if (ci > corte) livres.push([corte, Math.min(ci, fim)])
      corte = Math.max(corte, cf)
    }
    if (corte < fim) livres.push([corte, fim])
  }
  return livres.filter(([a, b]) => b > a)
}

/**
 * Onde cabem N blocos de X minutos, dentro do expediente e sem colidir.
 *
 * **A conta de calendário é do CÓDIGO, e o modelo só diz quanto tempo e com que
 * frequência.** É a mesma divisão de `lib/trilhar.ts` e de `lib/descobrir.ts`,
 * e aqui ela é ainda mais clara: somar horas, pular sábado e desviar da reunião
 * que já existe é aritmética, e modelo erra aritmética de calendário com uma
 * confiança que ninguém audita depois.
 *
 * `cadencia` é o que a pessoa disse entre parênteses. "2h por dia" é `dia`, e
 * sai em dias seguidos; "2 a 3 dias por semana" é `semana`, e sai espaçado, com
 * um dia de folga entre um e outro, porque é isso que a frase quer dizer.
 *
 * Sem expediente devolve vazio, e isso é de propósito: marcar a semana de
 * alguém por um horário que ela nunca deu é o oposto de organizar.
 */
export function vagas(
  e: Expediente | null | undefined,
  ocupado: Ocupado[],
  deDia: string,
  quantas: number,
  minutos: number,
  opcoes?: { cadencia?: 'dia' | 'semana'; periodo?: 'manha' | 'tarde' },
): Vaga[] {
  if (!temExpediente(e) || quantas < 1 || minutos < 15) return []
  const cadencia = opcoes?.cadencia || 'dia'
  const periodo = opcoes?.periodo
  const saida: Vaga[] = []
  let dia = deDia
  let folga = false

  // 60 dias é o horizonte: quem pede dez blocos numa semana de quatro vagas
  // recebe o que coube, e não um laço procurando para sempre.
  for (let i = 0; i < 60 && saida.length < quantas; i++) {
    const x = data(dia)
    if (i > 0) { x.setDate(x.getDate() + 1); dia = iso(x) }
    if (!diaUtil(e, dia)) continue
    if (folga) { folga = false; continue }

    const cabe = livresDoDia(e!, dia, ocupado).find(([a, b]) => {
      if (b - a < minutos) return false
      if (periodo === 'manha') return a < 12 * 60
      if (periodo === 'tarde') return a >= 12 * 60
      return true
    })
    if (!cabe) continue

    const inicio = cabe[0]
    saida.push({ quando: dia, inicio: paraHora(inicio), fim: paraHora(inicio + minutos) })
    // O que acabou de ser marcado também ocupa, senão dois blocos do mesmo dia
    // nascem um em cima do outro.
    ocupado = [...ocupado, { quando: dia, inicio: paraHora(inicio), fim: paraHora(inicio + minutos) }]
    if (cadencia === 'semana') folga = true
  }
  return saida
}
