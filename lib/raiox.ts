/**
 * O raio-X: o que o processo cobra e não entrega.
 *
 * A descoberta (`lib/descobrir.ts`) mostra o processo que a casa já tem. Este
 * arquivo olha o processo que ela já desenhou e diz onde ele dói. São perguntas
 * diferentes: uma é "o que vocês fazem", a outra é "o que isto está custando".
 *
 * ## Três regras que decidem o formato
 *
 * **O custo é em DIAS, nunca em porcentagem.** "Foram 21 dias esperando esta
 * aprovação no trimestre" é uma frase que o dono lê e resolve. "34% de
 * retrabalho" não é: ele não sabe de quanto, sobre o quê, nem o que fazer com
 * isso. Achado sem custo em dias não sai daqui.
 *
 * **No máximo três por vez.** Relatório com quinze problemas é ignorado
 * inteiro, e o décimo quinto nunca foi lido por ninguém. Três cabem numa
 * mensagem, e a próxima leva o que ficou.
 *
 * **Nada sai sem amostra.** É a regra 1.6 do plano, e aqui ela é a diferença
 * entre ajudar e inventar: dizer "este checkpoint nunca reprova" depois de duas
 * passagens é afirmar sobre o acaso, e a primeira vez que o app fizer isso a
 * pessoa para de acreditar em tudo que ele disser depois. Abaixo do mínimo,
 * fica calado.
 *
 * ## O que ele NÃO faz
 *
 * **Não ranqueia gente.** Nenhum achado nomeia pessoa, e não é delicadeza: um
 * relatório que aponta pessoas muda o que as pessoas registram, e aí o dado
 * apodrece na origem. Quando o gargalo é alguém com checkpoints demais, o
 * achado é sobre a DISTRIBUIÇÃO, e o conserto é tirar checkpoint de cima dela.
 */

/** Uma passagem por um checkpoint, do começo dele até a decisão. */
export type Passagem = {
  /**
   * O nome do checkpoint, e não o id.
   *
   * O raio-X fala de um checkpoint que se repete em muitas tracks ("a
   * Conferência do fechamento"), e o id é de uma track só. É o nome que junta
   * as passagens, do mesmo jeito que a descoberta agrupa pela forma.
   */
  etapa: string
  fluxo_id: string
  /** Quando o checkpoint anterior liberou este. */
  comecou_em: string
  /** Quando a última tarefa dele ficou pronta. Nulo quando não havia tarefa. */
  pronto_em: string | null
  decidido_em: string
  tipo: 'aprovou' | 'ressalva' | 'devolveu'
}

/** Um prazo que foi empurrado. */
export type Empurrao = {
  etapa: string
  /** Quantos dias para a frente. */
  dias: number
  quando: string
}

/** Uma entrega que chegou ao cliente, e o que ele achou dela. */
export type Entrega = {
  fluxo_id: string
  nome: string
  /** 1 a 5. Nulo quando ninguém respondeu. */
  nota: number | null
  /** Quantos dias a track inteira levou. */
  dias: number
}

export type Achado = {
  /** O que sobe para o acervo entre clientes. Não carrega nada da empresa. */
  chave: 'carimbo' | 'devolve-sempre' | 'espera-nao-trabalho' | 'gargalo' | 'prazo-irreal'
    | 'entrega-ruim'
  /** O checkpoint de que ele fala. */
  alvo: string
  /** O custo, em dias. É por ele que os achados são ordenados. */
  dias: number
  /** Quantas passagens sustentam a afirmação. */
  amostra: number
  /** A frase, com o número dentro. */
  texto: string
  /** O que o botão do lado faz. */
  conserto: string
}

/**
 * Quantas passagens antes de afirmar qualquer coisa.
 *
 * Quatro, e não três: com três, duas coincidências viram maioria. É o mesmo
 * cuidado do `MINIMO` da descoberta, com um degrau a mais, porque lá o
 * resultado é uma proposta e aqui é uma afirmação sobre o que já aconteceu.
 */
const MINIMO = 4

/**
 * O desempate, quando o mesmo checkpoint dispara duas regras pelo mesmo custo.
 *
 * Um checkpoint que nunca reprova E cuja espera domina o tempo é as duas
 * coisas, e as duas custam os mesmos dias. Ganha o `carimbo`, porque o conserto
 * dele resolve os dois: tirando o checkpoint, some a espera junto. Avisar mais
 * cedo quem decide é consertar a espera de uma conferência que não confere
 * nada, ou seja, acelerar o que nem devia existir.
 *
 * Sem esta tabela o desempate sairia da ordem em que as regras foram escritas,
 * que é o pior critério possível: correto por acaso, e errado no dia em que
 * alguém mover um bloco de lugar.
 */
const PESO: Record<Achado['chave'], number> = {
  'entrega-ruim': 6,
  carimbo: 5,
  'devolve-sempre': 4,
  'prazo-irreal': 3,
  'espera-nao-trabalho': 2,
  gargalo: 1,
}

/** Meio dia. Abaixo disso não é espera, é o relógio passando. */
const RUIDO = 0.5

const dias = (de: string, ate: string) =>
  Math.max(0, (Date.parse(ate) - Date.parse(de)) / 86400000)

/** A mediana aguenta o caso extremo melhor que a média. */
function mediana(ns: number[]): number {
  if (!ns.length) return 0
  const s = [...ns].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

const arredonda = (n: number) => Math.round(n * 10) / 10

/** "1 dia", "2,5 dias". Escrever "1 dias" é o app parecendo máquina. */
const emDias = (n: number) => {
  const x = arredonda(n)
  return `${String(x).replace('.', ',')} ${x === 1 ? 'dia' : 'dias'}`
}

/** Agrupa as passagens pelo nome do checkpoint. */
function porEtapa(ps: Passagem[]): Map<string, Passagem[]> {
  const m = new Map<string, Passagem[]>()
  for (const p of ps) {
    const l = m.get(p.etapa)
    if (l) l.push(p)
    else m.set(p.etapa, [p])
  }
  return m
}

/**
 * O raio-X.
 *
 * `quantos` é quantos achados devolver, e três é o padrão por design, não por
 * economia.
 */
export function raioX(
  passagens: Passagem[], empurroes: Empurrao[] = [], entregas: Entrega[] = [], quantos = 3,
): Achado[] {
  const achados: Achado[] = []
  const grupos = porEtapa(passagens)

  // Quanto cada track levou ao todo, e por quantos checkpoints distintos ela
  // passou. O segundo número é o que separa gargalo de tautologia.
  const daTrack = new Map<string, { total: number; etapas: Set<string> }>()
  for (const p of passagens) {
    const x = daTrack.get(p.fluxo_id) || { total: 0, etapas: new Set<string>() }
    x.total += dias(p.comecou_em, p.decidido_em)
    x.etapas.add(p.etapa)
    daTrack.set(p.fluxo_id, x)
  }

  for (const [etapa, ps] of grupos) {
    if (ps.length < MINIMO) continue

    const esperas = ps
      .filter((p) => p.pronto_em)
      .map((p) => dias(p.pronto_em as string, p.decidido_em))
    const trabalhos = ps
      .filter((p) => p.pronto_em)
      .map((p) => dias(p.comecou_em, p.pronto_em as string))
    const totais = ps.map((p) => dias(p.comecou_em, p.decidido_em))

    const esperaTotal = esperas.reduce((a, b) => a + b, 0)
    const esperaMedia = mediana(esperas)
    const trabalhoMedio = mediana(trabalhos)

    // 1. O CHECKPOINT QUE NUNCA REPROVA. Não é controle, é carimbo: custa dias
    //    de espera e não filtra nada. O custo é a espera somada, porque é
    //    exatamente isso que sumiria se ele deixasse de existir.
    const reprovou = ps.filter((p) => p.tipo !== 'aprovou').length
    if (!reprovou && esperaTotal > RUIDO) {
      achados.push({
        chave: 'carimbo', alvo: etapa, dias: arredonda(esperaTotal), amostra: ps.length,
        texto: `"${etapa}" foi aprovado nas ${ps.length} vezes, sem uma devolução sequer. `
          + `A espera por essa aprovação somou ${emDias(esperaTotal)}.`,
        conserto: 'Tirar este checkpoint da trilha',
      })
    }

    // 2. O QUE SEMPRE DEVOLVE. Metade ou mais voltando quer dizer que o
    //    critério está mal escrito, ou que a tarefa está na etapa errada. O
    //    custo é o tempo que a devolução acrescentou.
    const devolveu = ps.filter((p) => p.tipo === 'devolveu')
    if (devolveu.length >= ps.length / 2) {
      const custo = devolveu.map((p) => dias(p.comecou_em, p.decidido_em))
        .reduce((a, b) => a + b, 0)
      achados.push({
        chave: 'devolve-sempre', alvo: etapa, dias: arredonda(custo), amostra: ps.length,
        texto: `"${etapa}" foi devolvido em ${devolveu.length} das ${ps.length} vezes, `
          + `e essas voltas custaram ${emDias(custo)}. `
          + 'Ou o critério não está claro, ou a tarefa está no checkpoint errado.',
        conserto: 'Reescrever o critério de saída',
      })
    }

    // 3. ESPERA, E NÃO TRABALHO. O conserto é o oposto do que parece: não
    //    adianta acelerar quem faz, porque quem faz já terminou.
    if (esperas.length >= MINIMO && trabalhoMedio > 0
        && esperaMedia >= trabalhoMedio * 2 && esperaMedia > RUIDO) {
      achados.push({
        chave: 'espera-nao-trabalho', alvo: etapa, dias: arredonda(esperaTotal),
        amostra: esperas.length,
        texto: `Em "${etapa}" o trabalho leva ${emDias(trabalhoMedio)} e a espera `
          + `pela decisão leva ${emDias(esperaMedia)}. O problema não é quem faz: `
          + `já estava pronto. Ao todo foram ${emDias(esperaTotal)} parados.`,
        conserto: 'Avisar quem decide assim que ficar pronto',
      })
    }

    /**
     * 4. O GARGALO: uma etapa que come metade do tempo da track inteira.
     *
     * Só faz sentido quando a track tem mais de um checkpoint. Com um só, ele
     * come 100% do tempo por definição, e o achado seria "a única etapa desta
     * track é a que demora", que não diz nada e ainda é o mais caro de todos,
     * então roubaria a vaga dos achados de verdade.
     */
    const comMais = new Set(
      [...daTrack.entries()].filter(([, q]) => q.etapas.size > 1).map(([f]) => f),
    )
    const meus = ps.filter((p) => comMais.has(p.fluxo_id))
    if (meus.length >= MINIMO) {
      const inteiro = mediana([...comMais].map((f) => daTrack.get(f)!.total))
      const meu = mediana(meus.map((p) => dias(p.comecou_em, p.decidido_em)))
      if (inteiro > 0 && meu >= inteiro * 0.5 && meu > RUIDO) {
        achados.push({
          chave: 'gargalo', alvo: etapa, dias: arredonda(meu * meus.length), amostra: meus.length,
          texto: `"${etapa}" leva ${emDias(meu)} dos ${emDias(inteiro)} que a track `
            + `inteira leva. Nas ${meus.length} vezes, foram ${emDias(meu * meus.length)} aqui.`,
          conserto: 'Quebrar este checkpoint em dois',
        })
      }
    }
  }

  // 5. O PRAZO QUE NUNCA FOI REAL. Empurrado de novo e de novo quer dizer que o
  //    número estava errado desde o começo. Conserte o número, não cobre a
  //    pessoa: essa é a diferença entre um raio-X e um dedo-duro.
  const porNome = new Map<string, Empurrao[]>()
  for (const e of empurroes) {
    const l = porNome.get(e.etapa)
    if (l) l.push(e)
    else porNome.set(e.etapa, [e])
  }
  for (const [etapa, es] of porNome) {
    if (es.length < MINIMO) continue
    const soma = es.reduce((a, b) => a + b.dias, 0)
    achados.push({
      chave: 'prazo-irreal', alvo: etapa, dias: arredonda(soma), amostra: es.length,
      texto: `O prazo de "${etapa}" foi empurrado ${es.length} vezes, somando `
        + `${emDias(soma)}. O número nunca foi realista.`,
      conserto: `Mudar o prazo para ${Math.round(mediana(es.map((x) => x.dias)))} dias a mais`,
    })
  }

  /**
   * 6. O QUE CHEGOU RUIM NO CLIENTE.
   *
   * É o único sinal que não vem de dentro: quem responde é quem recebeu o
   * trabalho, pelo link, sem conta no app. E é o mais importante, porque todos
   * os outros falam de VELOCIDADE e este fala de QUALIDADE, que não se conserta
   * apertando prazo. Por isso ele tem o maior peso no desempate.
   *
   * O custo em dias é o tempo gasto nas entregas que decepcionaram. Não é
   * retórica: é exatamente o trabalho que foi feito e não serviu.
   */
  const ruins = entregas.filter((e) => e.nota !== null && e.nota <= 2)
  const respondidas = entregas.filter((e) => e.nota !== null)
  if (ruins.length >= MINIMO) {
    const custo = ruins.reduce((a, b) => a + b.dias, 0)
    achados.push({
      chave: 'entrega-ruim', alvo: 'entrega', dias: arredonda(custo), amostra: respondidas.length,
      texto: `${ruins.length} de ${respondidas.length} entregas voltaram com nota baixa de quem `
        + `recebeu, e elas somaram ${emDias(custo)} de trabalho. Isto é qualidade, e `
        + 'qualidade não se conserta apertando prazo.',
      conserto: 'Ler o que eles escreveram antes de mexer no processo',
    })
  }

  /**
   * Um achado por checkpoint, e o mais caro dele.
   *
   * O mesmo lugar costuma disparar três regras de uma vez (é carimbo, é espera
   * e é gargalo), e aí as três vagas falam do mesmo lugar de três jeitos. Quem
   * lê precisa de três lugares, não de três frases.
   */
  const melhorDe = new Map<string, Achado>()
  for (const a of achados.sort((x, y) => (y.dias - x.dias) || (PESO[y.chave] - PESO[x.chave]))) {
    if (!melhorDe.has(a.alvo)) melhorDe.set(a.alvo, a)
  }

  // O mais caro primeiro: é ele que paga o trabalho de ler.
  return [...melhorDe.values()].sort((a, b) => b.dias - a.dias).slice(0, quantos)
}

/**
 * O que sobe para o acervo entre clientes.
 *
 * Só a chave e o tamanho do achado. Nenhum nome de checkpoint, nenhum id,
 * nenhuma empresa. Mesma fronteira de `paraOAcervo` em `lib/perguntas.ts`, e
 * ela existe aqui pelo mesmo motivo: para ser um lugar do código que dá para
 * apontar, e não uma promessa espalhada.
 */
export function paraOAcervo(a: Achado): { chave: string; dias: number; amostra: number } {
  return { chave: a.chave, dias: a.dias, amostra: a.amostra }
}
