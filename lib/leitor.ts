import type { Alvo, TipoProposta } from './tipos'

/**
 * Leitura da conversa.
 *
 * O que a empresa combina no chat vira trabalho: tarefa nova, prazo que mudou,
 * coisa que ficou pronta, decisão que precisa ficar registrada, frente que travou.
 *
 * Duas camadas, na mesma saída:
 *  - por regras, aqui neste arquivo, que roda sempre e sem depender de nada;
 *  - por modelo, em /api/leitor, quando existe uma chave configurada.
 *
 * O que sai daqui é sempre PROPOSTA. Nada encosta no trabalho de ninguém antes
 * de alguém aceitar, e prazo continua sendo decisão de quem manda no processo,
 * como no resto do app.
 */

export type MensagemLida = {
  id: string
  autor_id: string | null
  autor: string
  texto: string
}

export type ItemLido = {
  id: string
  texto: string
  resp_id: string | null
  feito: boolean
  prazo: string | null
  etapa_id: string
}

export type Contexto = {
  hoje: string
  mensagens: MensagemLida[]
  pessoas: { id: string; nome: string }[]
  /** A esteira a que o canal está preso, quando há uma. */
  fluxo: { id: string; nome: string; etapa_id: string | null; itens: ItemLido[] } | null
  /**
   * O que o app já aprendeu sobre esta empresa, em texto pronto para o modelo.
   * As regras daqui não usam: elas não sabem ler vocabulário, e forçar isso
   * daria falso positivo. Quem aproveita é o modelo, em /api/leitor.
   */
  memoria?: string
  /** De qual canal veio, para o medidor saber onde o gasto aconteceu. */
  canal_id?: string | null
  /**
   * Os agentes que escutam este canal.
   *
   * As regras deste arquivo não usam: reconhecer situação é julgamento, e as
   * regras só sabem contar palavra. Quem usa é o modelo, em /api/leitor.
   */
  agentes?: { id: string; nome: string; reconhecer: string; faz: string }[]
  /**
   * Este canal é o despejo de uma pessoa, não conversa de equipe.
   *
   * Muda tudo na leitura, e por um motivo que vale escrever: numa conversa de
   * equipe, errar para mais cria trabalho para outra gente, então a leitura é
   * conservadora. No despejo, errar para menos perde o pensamento que a pessoa
   * escreveu justamente para não perder. As regras deste arquivo não mudam de
   * comportamento, elas são conservadoras sempre: quem muda é o modelo.
   */
  despejo?: boolean
  /**
   * O que já está guardado no caderno e tem a ver com o que está sendo lido.
   *
   * É isto que faz o despejo somar em vez de só acumular. A pessoa escreve
   * sobre uma ideia hoje e sobre outra daqui a um mês; sem isto, a leitura
   * trata as duas como se nunca tivessem se encontrado, e quem tinha que
   * lembrar da primeira era a pessoa, que foi justamente quem escreveu para
   * não precisar lembrar.
   *
   * As regras deste arquivo não usam: ligar assunto com assunto é julgamento.
   * Quem usa é o modelo, em /api/leitor.
   */
  caderno?: { titulo: string; trecho: string }[]
}

export type Proposta = {
  tipo: TipoProposta
  texto: string
  motivo: string
  mensagem_id: string | null
  dados: Alvo
}

// ------------------------------------------------------------------ texto

const limpo = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Palavras que não ajudam a reconhecer do que a frase fala. */
const VAZIAS = new Set([
  'para','pela','pelo','com','sem','dos','das','uma','uns','umas','que','por','mais','muito',
  'esse','essa','isso','este','esta','isto','aquele','aquela','nosso','nossa','seu','sua',
  'ate','sobre','entre','como','quando','onde','sera','esta','estao','todo','toda','todos','todas',
  'vamos','vou','preciso','precisamos','fazer','feito','ficar','fica','ainda','tambem','agora',
])

const palavras = (s: string) =>
  limpo(s).replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length >= 4 && !VAZIAS.has(w))

function comuns(a: string, b: string) {
  const x = new Set(palavras(a))
  const y = new Set(palavras(b))
  let juntos = 0
  for (const w of x) if (y.has(w)) juntos++
  return { juntos, x: x.size, y: y.size }
}

/**
 * Quanto a frase FALA DE alguma coisa: "o orçamento já está pronto" fala do item
 * "Orçamento da fundação" mesmo tendo o dobro das palavras. Por isso o menor lado.
 */
export function parecido(a: string, b: string) {
  const { juntos, x, y } = comuns(a, b)
  if (!x || !y) return 0
  return juntos / Math.min(x, y)
}

/**
 * Se as duas frases são A MESMA coisa. Aqui o maior lado, senão "revisar as
 * cláusulas do contrato da empreiteira" seria tratado como repetição de
 * "Contrato da empreiteira", e a tarefa nova se perderia.
 */
export function mesmaCoisa(a: string, b: string) {
  const { juntos, x, y } = comuns(a, b)
  if (!x || !y) return 0
  return juntos / Math.max(x, y)
}

/** Uma frase por vez: é nela que mora o compromisso, não no parágrafo. */
function frases(texto: string) {
  return texto
    .split(/(?<=[.!?;])\s+|\n+/)
    .map((f) => f.trim())
    .filter((f) => f.length > 6)
}

// ------------------------------------------------------------------ datas

const DIA_MS = 864e5
const iso = (d: Date) => d.toISOString().slice(0, 10)
const somar = (base: string, n: number) => iso(new Date(new Date(base + 'T12:00:00').getTime() + n * DIA_MS))

const SEMANA: Record<string, number> = {
  domingo: 0, segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6,
}
const MES: Record<string, number> = {
  janeiro: 1, fevereiro: 2, marco: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
}

/**
 * A data que a frase quer dizer, do jeito que as pessoas escrevem.
 * Sem data reconhecida, devolve nulo: prazo chutado é pior que prazo em branco.
 */
export function quando(frase: string, hoje: string): string | null {
  const t = limpo(frase)
  const base = new Date(hoje + 'T12:00:00')

  if (/\bdepois de amanha\b/.test(t)) return somar(hoje, 2)
  if (/\bamanha\b/.test(t)) return somar(hoje, 1)
  if (/\bhoje\b/.test(t)) return hoje

  const emDias = t.match(/\b(?:em|daqui a|dentro de)\s+(\d{1,2})\s+dias?\b/)
  if (emDias) return somar(hoje, Number(emDias[1]))

  const emSemanas = t.match(/\b(?:em|daqui a|dentro de)\s+(\d{1,2})\s+semanas?\b/)
  if (emSemanas) return somar(hoje, Number(emSemanas[1]) * 7)

  // 20/03, 20/3/26, 20-03
  const barra = t.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/)
  if (barra) {
    const [, d, m, y] = barra
    const ano = y ? (y.length === 2 ? 2000 + Number(y) : Number(y)) : base.getFullYear()
    const data = new Date(ano, Number(m) - 1, Number(d), 12)
    if (!y && data.getTime() < base.getTime() - DIA_MS) data.setFullYear(ano + 1)
    return iso(data)
  }

  // 20 de março, dia 20 de março
  const porExtenso = t.match(/\b(?:dia\s+)?(\d{1,2})\s+de\s+([a-z]+)/)
  if (porExtenso && MES[porExtenso[2]]) {
    const data = new Date(base.getFullYear(), MES[porExtenso[2]] - 1, Number(porExtenso[1]), 12)
    if (data.getTime() < base.getTime() - DIA_MS) data.setFullYear(base.getFullYear() + 1)
    return iso(data)
  }

  // dia 20, sem mês: o próximo dia 20 que vier
  const soDia = t.match(/\bdia\s+(\d{1,2})\b/)
  if (soDia) {
    const n = Number(soDia[1])
    if (n >= 1 && n <= 31) {
      const data = new Date(base.getFullYear(), base.getMonth(), n, 12)
      if (data.getTime() < base.getTime()) data.setMonth(base.getMonth() + 1)
      return iso(data)
    }
  }

  if (/\bfim (?:do|deste) mes\b|\bfinal (?:do|deste) mes\b/.test(t)) {
    return iso(new Date(base.getFullYear(), base.getMonth() + 1, 0, 12))
  }

  // O dia da semana manda, e "que vem" vem depois: numa sexta, "segunda que vem"
  // é a segunda seguinte, porque ela já cai na outra semana. Mas "sábado que vem"
  // pula o sábado de amanhã, que ainda é desta.
  const semana = t.match(/\b(domingo|segunda|terca|quarta|quinta|sexta|sabado)(?:-feira)?\b/)
  if (semana) {
    const alvo = SEMANA[semana[1]]
    let passos = (alvo - base.getDay() + 7) % 7 || 7
    const ateDomingo = (7 - base.getDay()) % 7
    if (/que vem|proxim/.test(t) && passos <= ateDomingo) passos += 7
    return somar(hoje, passos)
  }

  if (/\bsemana que vem\b|\bproxima semana\b/.test(t)) return somar(hoje, 7)

  return null
}

// --------------------------------------------------------------- gatilhos

/** Quem se compromete: a tarefa nasce no colo de quem falou. */
const COMPROMISSO = /\b(vou|ficou? de|ficamos de|fico responsavel|deixa comigo|pode deixar|eu faco|eu cuido|me encarrego|assumo)\b/
/** O que falta: a tarefa nasce sem dono, e quem aceitar escolhe. */
const FALTA = /\b(precisamos|preciso|precisa|temos que|tenho que|tem que|falta|faltam|e preciso|alguem precisa|nao pode faltar)\b/
/** Pedido a alguém: a tarefa nasce no colo de quem foi chamado. */
const PEDIDO = /\b(consegue|poderia|pode ver|pode cuidar|pode pegar|da para|te peco|por favor|fica de|manda|me manda|me envia)\b/
/** Em português o pedido quase sempre vem de pergunta: "você consegue ... ?" */
const PERGUNTA_PEDIDO = /\b(consegue|poderia|pode|da para|daria)\b/

/**
 * Alguém dizendo quem vai fazer uma tarefa que JÁ EXISTE e está sem dono.
 *
 * Diferente de COMPROMISSO, que gera tarefa nova: aqui a tarefa está na esteira
 * esperando um nome, e a conversa deu o nome. "Eu pego a conciliação" não é
 * trabalho novo, é a conciliação ganhando dono.
 */
const ASSUME = /\b(eu pego|pego essa|pego esta|pego isso|deixa comigo|fico com|eu fico com|assumo|eu assumo|pode deixar comigo|me passa|passa para mim|eu cuido dessa|eu cuido disso)\b/
const PASSA_PARA = /\b(passa para|passe para|manda para|fica com|deixa com|delega para|e do|e da|sera do|sera da|responsavel e)\b/

const PRONTO = /\b(ja (?:fiz|feito|foi|enviei|mandei|paguei|assinei|assinamos|ficou|esta)|conclui|concluimos|concluido|concluida|terminei|terminamos|finalizei|finalizamos|entreguei|entregamos|esta pronto|ta pronto|ficou pronto|resolvido|resolvi|fechei|assinado|aprovado e enviado)\b/

/**
 * "já" mais um verbo no passado, para o que a lista acima não alcança.
 *
 * A lista fechada nunca vai dar conta: cada empresa tem os verbos dela, e
 * "já homologamos", "já conciliamos", "já protocolei" são tão conclusão quanto
 * "já fiz". O que barra o falso positivo é a lista de exclusão: "já vamos",
 * "já precisamos", "já podemos" falam de futuro, não de coisa pronta.
 */
const JA_PASSADO = /\bja (?!vamos|iremos|podemos|precisamos|devemos|queremos|temos|tinhamos|estamos|ficamos de)([a-z]{4,}(?:amos|emos|imos|ei|iu|ou))\b/
const MUDOU_PRAZO = /\b(adiar|adiamos|adiado|adiada|empurra|empurramos|passou para|passa para|passamos para|mudou para|muda para|remarca|remarcado|remarcamos|prorroga|prorrogamos|vai para|fica para|ficar para|ficou para|estende|estendemos)\b/
const DECISAO = /\b(ficou definido|ficou decidido|ficou acertado|decidimos|decidido que|fechado que|fechamos com|aprovamos|optamos por|definimos|vamos com|escolhemos|acordado)\b/
const TRAVA = /\b(travad|bloquead|parad[oa]s? (?:esperando|aguardando)|nao consigo avancar|nao da para avancar|impedid|sem retorno|de maos atadas|na mao (?:deles|dela|dele))\b/

/**
 * Uma tarefa começa com um verbo. Em português o verbo do compromisso vem logo
 * depois do gatilho e quase sempre no infinitivo: "preciso REVISAR", "vou
 * PREPARAR", "falta LEVANTAR". Reconhecer a terminação vale mais que manter uma
 * lista de verbos, que nunca acaba e sempre deixa a palavra do dia de fora.
 */
const CONJUGADO = /\b(faco|fazemos|envio|enviamos|mando|mandamos|levanto|coto|orco|reviso|verifico|confiro|confirmo|ligo|agendo|marco|compro|pago|assino|fecho|preparo|monto|escrevo|atualizo|corrijo|entrego|apresento|visito|meco|protocolo|publico|simulo|respondo|resolvo|defino|analiso|estudo|valido|calculo|desenho|peco|cobro|alinho)\b/

/** Palavra terminada em -ar, -er ou -ir que não é verbo. */
const FALSO_VERBO = new Set([
  'lugar','poder','prazer','dever','celular','militar','familiar','particular','popular',
  'escolar','circular','regular','singular','vulgar','altar','colar','pilar','andar','hangar',
  'sabor','valor','calor','maior','menor','melhor','pior','mulher','qualquer','talher',
])

/** Verbo no infinitivo entre as primeiras palavras do que sobrou da frase. */
function comecaComVerbo(texto: string) {
  const inicio = limpo(texto).replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean).slice(0, 3)
  return inicio.some((w) => w.length >= 4 && /(ar|er|ir)$/.test(w) && !FALSO_VERBO.has(w))
}

// --------------------------------------------------------------- extração

/** Tira o gatilho da frente e devolve a tarefa como ela deve aparecer na lista. */
function comoTarefa(frase: string) {
  let t = frase.trim().replace(/^[\s\-•*]+/, '')
  t = t.replace(
    /^.*?\b(?:vou|vamos|preciso|precisamos|precisa|tenho que|temos que|tem que|falta|faltam|e preciso|alguem precisa|fico de|ficamos de|fica de|deixa comigo|pode deixar|eu faco|eu cuido|me encarrego|assumo|consegue|poderia|por favor)\b\s*/i,
    '',
  )
  t = t.replace(/^(que|de|a|o|pra|para)\s+/i, '')
  t = t.replace(/\s*[?.!;,]+\s*$/, '')
  // O prazo mora na coluna de prazo, não no texto da tarefa.
  t = t.replace(
    /\s*\b(at[eé]|para|no|na|em|d[eé])\s+(hoje|amanh[aã]|depois de amanh[aã]|segunda|ter[cç]a|quarta|quinta|sexta|s[aá]bado|domingo|dia\s+\d{1,2}|\d{1,2}\s+de\s+\p{L}+|\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?)\b.*$/iu,
    '',
  )
  t = t.trim().replace(/\s*[,;]$/, '')
  if (!t) return ''
  return t[0].toUpperCase() + t.slice(1)
}

/** A pessoa que a frase chama, por @ ou pelo primeiro nome. */
function chamado(frase: string, pessoas: Contexto['pessoas']): string | null {
  const arroba = frase.match(/@([\p{L}]+)/u)
  if (arroba) {
    const alvo = limpo(arroba[1])
    const p = pessoas.find((x) => limpo(x.nome).split(' ')[0] === alvo || limpo(x.nome) === alvo)
    if (p) return p.id
  }
  for (const p of pessoas) {
    const primeiro = limpo(p.nome).split(' ')[0]
    if (primeiro.length < 3) continue
    if (new RegExp(`\\b${primeiro}\\b`).test(limpo(frase))) return p.id
  }
  return null
}

/** O item aberto que a frase está comentando, quando dá para ter certeza. */
function itemDaFrase(frase: string, itens: ItemLido[], sofeitos = false) {
  let melhor: { item: ItemLido; nota: number } | null = null
  for (const i of itens) {
    if (sofeitos ? !i.feito : i.feito) continue
    const nota = parecido(frase, i.texto)
    if (nota >= 0.5 && (!melhor || nota > melhor.nota)) melhor = { item: i, nota }
  }
  return melhor?.item ?? null
}

const nomeDe = (id: string | null, pessoas: Contexto['pessoas']) =>
  pessoas.find((p) => p.id === id)?.nome || 'alguém'

/**
 * A leitura por regras. Vale sozinha, e vale como rede quando o modelo não
 * responde: o app nunca fica sem ler a conversa.
 */
export function porRegras(ctx: Contexto): Proposta[] {
  const saida: Proposta[] = []
  const itens = ctx.fluxo?.itens || []
  const abertos = itens.filter((i) => !i.feito)

  for (const m of ctx.mensagens) {
    if (!m.texto || m.texto.startsWith('/')) continue

    for (const frase of frases(m.texto)) {
      const t = limpo(frase)
      // Pergunta não vira tarefa, salvo quando é um pedido com nome e verbo:
      // "@Marina, você consegue levantar os índices até terça?" é trabalho.
      const pergunta = /\?\s*$/.test(frase) && !PERGUNTA_PEDIDO.test(t)
      const data = quando(frase, ctx.hoje)

      // 1. Ficou pronto. Vem antes de tudo, senão "já fiz o orçamento" viraria
      //    uma tarefa nova de fazer o orçamento.
      if ((PRONTO.test(t) || JA_PASSADO.test(t)) && !pergunta) {
        const alvo = itemDaFrase(frase, abertos)
        if (alvo) {
          saida.push({
            tipo: 'concluir',
            texto: `Marcar como feito: ${alvo.texto}`,
            motivo: frase,
            mensagem_id: m.id,
            dados: { fluxo_id: ctx.fluxo?.id ?? null, item_id: alvo.id, etapa_id: alvo.etapa_id },
          })
          continue
        }
      }

      // 1b. Quem vai fazer. A tarefa já existe e está sem dono, e a conversa deu
      //     o nome. Não é tarefa nova: é a tarefa ganhando responsável.
      if (!pergunta && (ASSUME.test(t) || PASSA_PARA.test(t))) {
        const semDono = abertos.filter((i) => !i.resp_id)
        const alvo = itemDaFrase(frase, semDono)
        if (alvo) {
          // "eu pego" é quem falou. "passa para a Ana" é a Ana.
          const outro = chamado(frase, ctx.pessoas.filter((x) => x.id !== m.autor_id))
          const quem = ASSUME.test(t) && !outro ? m.autor_id : outro
          const nome = ctx.pessoas.find((x) => x.id === quem)?.nome
          if (quem && nome) {
            saida.push({
              tipo: 'distribuir',
              texto: `${alvo.texto} fica com ${nome}`,
              motivo: `${m.autor}: ${frase}`,
              mensagem_id: m.id,
              dados: {
                fluxo_id: ctx.fluxo?.id ?? null, item_id: alvo.id,
                etapa_id: alvo.etapa_id, resp_id: quem,
              },
            })
            continue
          }
        }
      }

      // 2. Prazo que mudou. Continua sendo só proposta, sempre.
      if (MUDOU_PRAZO.test(t) && data && !pergunta) {
        const alvo = itemDaFrase(frase, abertos)
        if (alvo) {
          saida.push({
            tipo: 'prazo',
            texto: `Mover o prazo de "${alvo.texto}" para ${data.split('-').reverse().join('/')}`,
            motivo: frase,
            mensagem_id: m.id,
            dados: { fluxo_id: ctx.fluxo?.id ?? null, item_id: alvo.id, prazo: data, etapa_id: alvo.etapa_id },
          })
          continue
        }
      }

      // 3. Travou.
      if (TRAVA.test(t) && ctx.fluxo && !pergunta) {
        saida.push({
          tipo: 'trava',
          texto: `Travar ${ctx.fluxo.nome}: ${comoTarefa(frase) || frase}`,
          motivo: frase,
          mensagem_id: m.id,
          dados: { fluxo_id: ctx.fluxo.id },
        })
        continue
      }

      // 4. Decisão, para ficar no registro da esteira em vez de morrer no chat.
      if (DECISAO.test(t) && !pergunta) {
        saida.push({
          tipo: 'decisao',
          texto: frase.replace(/\s*[.;]$/, ''),
          motivo: `${m.autor}: ${frase}`,
          mensagem_id: m.id,
          dados: { fluxo_id: ctx.fluxo?.id ?? null },
        })
        continue
      }

      // 5. Tarefa nova. Precisa de um gatilho de compromisso, falta ou pedido,
      //    E de um verbo de ação, senão qualquer frase com "vamos" vira item.
      if (pergunta) continue
      const compromisso = COMPROMISSO.test(t)
      const falta = FALTA.test(t)
      const pedido = PEDIDO.test(t)
      const ehPergunta = /\?\s*$/.test(frase)
      if (!compromisso && !falta && !pedido) continue
      // Uma pergunta só passa quando chama alguém pelo nome.
      if (ehPergunta && !chamado(frase, ctx.pessoas)) continue

      const texto = comoTarefa(frase)
      if (!texto || palavras(texto).length < 2) continue
      if (!comecaComVerbo(texto) && !CONJUGADO.test(t)) continue

      // Já existe algo igual na esteira. Em vez de duplicar o trabalho de alguém,
      // olhamos se a conversa estava, na verdade, remarcando o prazo dele:
      // "consegue fechar o estudo de massa até terça?" não é tarefa nova.
      const igual = abertos.find((i) => mesmaCoisa(texto, i.texto) >= 0.6)
      if (igual) {
        if (data && data !== igual.prazo) {
          saida.push({
            tipo: 'prazo',
            texto: `Mover o prazo de "${igual.texto}" para ${data.split('-').reverse().join('/')}`,
            motivo: `${m.autor}: ${frase}`,
            mensagem_id: m.id,
            dados: { fluxo_id: ctx.fluxo?.id ?? null, item_id: igual.id, prazo: data, etapa_id: igual.etapa_id },
          })
        }
        continue
      }

      const deOutro = chamado(frase, ctx.pessoas.filter((p) => p.id !== m.autor_id))
      const resp = pedido || (!compromisso && deOutro) ? deOutro : compromisso ? m.autor_id : deOutro

      saida.push({
        tipo: 'tarefa',
        texto,
        motivo: `${m.autor}: ${frase}`,
        mensagem_id: m.id,
        dados: {
          fluxo_id: ctx.fluxo?.id ?? null,
          etapa_id: ctx.fluxo?.etapa_id ?? null,
          resp_id: resp ?? null,
          prazo: data,
        },
      })
    }
  }

  return podar(saida)
}

// -------------------------------------------------------------- despejo

/**
 * O despejo sem chave de modelo.
 *
 * Aqui as regras podem ser generosas, e é a única parte do app onde podem. Numa
 * conversa de equipe, propor errado cria trabalho para outra gente, então as
 * regras deste arquivo são desconfiadas de propósito. No despejo é uma pessoa
 * falando sozinha: TUDO que ela escreveu, ela escreveu para guardar. Oferecer
 * nota demais custa um toque para descartar; oferecer de menos perde o
 * pensamento, que é o que ela estava tentando evitar.
 *
 * Três destinos, na ordem em que são testados:
 *
 *   compromisso  tem dia, e fala de coisa que acontece num dia (hora, reunião,
 *                consulta, viagem, entrega)
 *   tarefa       começa com verbo no infinitivo, do jeito que se escreve recado
 *                para si mesmo: "ligar pro contador", "comprar cabo"
 *   nota         todo o resto
 *
 * O modelo faz isso muito melhor, porque entende o sentido. Isto é o que existe
 * sem ele, e existir sem ele importa: o caderno tem que funcionar no dia em que
 * a chave não está configurada ou o teto do mês acabou.
 */

/** Coisa que acontece num dia e numa hora, não coisa que se faz. */
const NA_AGENDA = /\b(reuniao|reuniao|call|consulta|dentista|medico|viagem|voo|almoco|jantar|entrevista|prova|aula|treinamento|visita|audiencia|apresentacao|aniversario|casamento|show|evento|conselho|assembleia)\b/

/** "preciso ligar", "tenho que mandar", "lembrar de pagar": vira tarefa. */
const OBRIGACAO = /\b(preciso|tenho que|tenho de|nao esquecer|lembrar de|lembrete|devo|fazer)\b/

/**
 * Como a pessoa avisa, sem perceber, que está guardando um pensamento e não se
 * comprometendo com nada.
 *
 * Vale mais que o verbo que vem depois, e essa ordem importa: "ideia: cobrar taxa
 * de implantação" tem o verbo cobrar no começo e não é tarefa nenhuma, é uma
 * ideia. Quem escreve "ideia:" está parando o pensamento no papel, não se
 * mandando fazer.
 *
 * "lembrar que" é nota e "lembrar de" é tarefa, e a diferença é de uma letra:
 * lembrar QUE a tarifa é 0,8% é informação, lembrar DE pagar a tarifa é trabalho.
 */
const MARCA_DE_NOTA = /^(ideia|ideias|insight|nota|obs|observacao|pensar|pensando|anotar que|lembrar que|reparei|descobri|percebi|aprendi|vale lembrar|duvida)\b/

/** A hora, quando a pessoa disse. "15h", "15h30", "9:30", "as 8". */
function horaDe(frase: string): string | null {
  const t = limpo(frase)
  const m = t.match(/\b(\d{1,2})\s*(?:h|:)\s*(\d{2})?\b/) || t.match(/\bas\s+(\d{1,2})\b/)
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2] || 0)
  if (h > 23 || min > 59) return null
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

export function doDespejo(ctx: Contexto): Proposta[] {
  const saida: Proposta[] = []

  for (const m of ctx.mensagens) {
    const texto = (m.texto || '').trim()
    if (!texto || texto.startsWith('/')) continue

    const dia = quando(texto, ctx.hoje)
    const hora = horaDe(texto)
    const daAgenda = NA_AGENDA.test(limpo(texto))

    // Uma linha só, curta, para a pessoa reconhecer a proposta de relance. O que
    // vai ser guardado é o texto inteiro, no aceite.
    const uma = texto.replace(/\s+/g, ' ')
    const curtinho = uma.length > 90 ? `${uma.slice(0, 88).trimEnd()}...` : uma

    if (dia && (daAgenda || hora)) {
      saida.push({
        tipo: 'compromisso', texto: curtinho, motivo: texto, mensagem_id: m.id,
        dados: { quando: dia, inicio: hora },
      })
      continue
    }

    if (!MARCA_DE_NOTA.test(limpo(texto)) && (comecaComVerbo(texto) || OBRIGACAO.test(limpo(texto)))) {
      saida.push({
        tipo: 'tarefa', texto: curtinho, motivo: texto, mensagem_id: m.id,
        dados: { fluxo_id: ctx.fluxo?.id ?? null, etapa_id: ctx.fluxo?.etapa_id ?? null, prazo: dia },
      })
      continue
    }

    saida.push({ tipo: 'nota', texto: curtinho, motivo: texto, mensagem_id: m.id, dados: {} })
  }

  // Sem podar por semelhança: no caderno, duas anotações parecidas em dias
  // diferentes são duas anotações, e apagar uma delas é perder informação.
  return saida.slice(0, 12)
}

/** Duas propostas dizendo a mesma coisa viram uma. A última é a que vale. */
export function podar(lista: Proposta[]) {
  const saida: Proposta[] = []
  for (const p of [...lista].reverse()) {
    const repetida = saida.some(
      (q) => q.tipo === p.tipo &&
        (q.dados.item_id ? q.dados.item_id === p.dados.item_id : mesmaCoisa(q.texto, p.texto) >= 0.6),
    )
    if (!repetida) saida.push(p)
  }
  return saida.reverse().slice(0, 8)
}

export const resumo = (p: Proposta, pessoas: Contexto['pessoas']) =>
  p.tipo === 'tarefa' && p.dados.resp_id ? `${p.texto} · ${nomeDe(p.dados.resp_id, pessoas)}` : p.texto
