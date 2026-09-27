import { noFuso } from './pulso'

/**
 * O ritmo da casa, aprendido do que já aconteceu.
 *
 * Horário fixo é honesto e é burro: a leitura das 13h30 acontece no meio do
 * almoço de uma empresa e no meio da tarde de outra, e nenhuma das duas pediu
 * isso. O dado para acertar já está no banco e ninguém usava.
 *
 * São **dois sinais, para duas perguntas diferentes**:
 *
 *   - **Quando a casa fala** (`mensagens.criado_em`) diz a melhor hora de LER.
 *     E o certo não é ler no pico: é ler LOGO DEPOIS dele. Ler no meio da
 *     conversa é pagar por uma leitura que fica velha em dez minutos, e ainda
 *     propor tarefa sobre um assunto que a equipe ainda está decidindo.
 *   - **Quando cada pessoa responde** (a distância entre a pergunta e a
 *     resposta em `perguntas_abertas`) diz a melhor hora de PERGUNTAR àquela
 *     pessoa. É diferente por pessoa, e é o que separa um app que incomoda de
 *     um que chega na hora.
 *
 * Duas regras que eu não abriria mão:
 *
 * **Tem que saber dizer por quê.** "Leio às 10h, 14h e 18h porque é quando
 * vocês mais conversam" é uma frase que a pessoa lê e concorda. Sem ela, o
 * horário aprendido é indistinguível de horário aleatório, e o primeiro dia em
 * que ele errar vira "esse negócio é doido".
 *
 * **Pouco dado, nenhum palpite.** Abaixo de um mínimo de conversa, devolve
 * vazio e quem manda é o horário distribuído de sempre. Aprender de três
 * mensagens é inventar padrão onde só há acaso.
 */

/** Quanta conversa é preciso antes de confiar no que se aprendeu. */
const MINIMO = 40
/** Quantas respostas de uma pessoa antes de confiar no horário dela. */
const MINIMO_PESSOA = 6
/**
 * Quanto tempo depois do pico ler, em minutos.
 *
 * Meia hora: perto o bastante para a conversa ainda estar fresca, longe o
 * bastante para ela ter terminado. Ler no minuto do pico é ler pela metade.
 */
const DEPOIS = 30

/** Quantas mensagens em cada hora do dia, no fuso da empresa. */
export function porHora(quando: string[], fuso: string): number[] {
  const conta = Array(24).fill(0) as number[]
  for (const q of quando) {
    const d = new Date(q)
    if (!Number.isFinite(d.getTime())) continue
    const { minutos } = noFuso(d, fuso)
    conta[Math.floor(minutos / 60) % 24]++
  }
  return conta
}

/**
 * Os melhores horários de leitura, em minutos do dia.
 *
 * Pega os picos de conversa dentro da janela, soma meia hora a cada um, e
 * separa os escolhidos por pelo menos uma hora: dois horários colados leem a
 * mesma conversa duas vezes e cobram por isso.
 *
 * Devolve vazio quando não há conversa suficiente, e aí quem decide é o
 * horário distribuído de sempre.
 */
export function horariosDoRitmo(
  quando: string[], fuso: string, quantos: number, de: number, ate: number,
): number[] {
  if (quando.length < MINIMO || quantos < 1) return []
  const conta = porHora(quando, fuso)

  const candidatos = conta
    .map((n, hora) => ({ minutos: hora * 60 + DEPOIS, n }))
    .filter((x) => x.n > 0 && x.minutos >= de && x.minutos <= ate)
    .sort((a, b) => b.n - a.n)

  const escolhidos: number[] = []
  for (const c of candidatos) {
    if (escolhidos.length >= quantos) break
    if (escolhidos.some((m) => Math.abs(m - c.minutos) < 60)) continue
    escolhidos.push(c.minutos)
  }
  // Menos picos do que leituras pedidas: não inventa horário para completar.
  return escolhidos.sort((a, b) => a - b)
}

/**
 * A hora em que esta pessoa costuma responder, em minutos do dia.
 *
 * Nulo quando ela ainda não respondeu o bastante. Serve para perguntar quando
 * ela está com o telefone na mão, em vez de às 8h de uma pessoa que só olha
 * depois do almoço.
 */
export function horaDeResponder(
  respostas: string[], fuso: string,
): number | null {
  if (respostas.length < MINIMO_PESSOA) return null
  const conta = porHora(respostas, fuso)
  let melhor = -1
  let n = 0
  conta.forEach((q, hora) => { if (q > n) { n = q; melhor = hora } })
  return melhor < 0 ? null : melhor * 60
}

/** "09:50", para a tela e para a explicação. */
export const hhmm = (minutos: number) =>
  `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`

/**
 * A frase que explica a escolha, que é metade do valor disto.
 *
 * Sem ela o horário aprendido é indistinguível de horário aleatório, e o
 * primeiro dia em que ele errar vira desconfiança no app inteiro.
 */
export function porque(aprendidos: number[], amostra: number): string {
  if (!aprendidos.length) {
    return amostra < MINIMO
      ? `Ainda espalhadas pela janela: com ${amostra} mensagens não dá para dizer `
        + 'qual é o ritmo daqui. A partir de umas 40, eu ajusto sozinho.'
      : 'Espalhadas pela janela.'
  }
  return `Às ${aprendidos.map(hhmm).join(', ')}, meia hora depois dos horários em que `
    + 'vocês mais conversam. Ler no meio da conversa é ler pela metade.'
}
