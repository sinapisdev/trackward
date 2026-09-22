/**
 * Recado de voz, e a transcrição que faz a IA entender o que foi dito.
 *
 * A escolha que decide tudo aqui: **a transcrição acontece enquanto a pessoa
 * fala, e ela revisa o texto antes de enviar.**
 *
 * O caminho óbvio seria gravar, mandar para um modelo transcrever depois, e
 * confiar. Isso tem dois problemas que não são pequenos. Custa por minuto, para
 * sempre, em cima de um app que já paga por leitura de conversa. E, pior, quando
 * o modelo ouve errado, o erro entra no trabalho de alguém: "cancela a compra"
 * virando tarefa porque ele ouviu "cancela" onde a pessoa disse "confirma".
 *
 * Transcrever na hora resolve os dois. É de graça, porque quem ouve é o próprio
 * navegador. E o autor vê o texto aparecendo enquanto fala, então ele corrige
 * antes de mandar. Uma transcrição revisada por quem falou vale mais do que
 * qualquer modelo aplicado depois.
 *
 * A transcrição vai para o campo de TEXTO da mensagem. Assim a leitura da
 * conversa, a menção pelo nome e a busca funcionam no recado de voz sem uma
 * linha de mudança: para elas, é só uma mensagem escrita.
 *
 * Quando o navegador não sabe ouvir (Firefox, hoje), o áudio vai sem texto e a
 * tela diz isso. O recado continua servindo para quem escuta; o que se perde é a
 * IA entender, e é honesto avisar em vez de fingir.
 */

type Reconhecedor = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null
  onerror: ((e: unknown) => void) | null
  onend: (() => void) | null
}

type ComVoz = typeof window & {
  SpeechRecognition?: new () => Reconhecedor
  webkitSpeechRecognition?: new () => Reconhecedor
}

const classeDeVoz = () => {
  if (typeof window === 'undefined') return null
  const w = window as ComVoz
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

export const podeGravar = () =>
  typeof window !== 'undefined'
  && typeof MediaRecorder !== 'undefined'
  && !!navigator.mediaDevices?.getUserMedia

export const podeTranscrever = () => !!classeDeVoz()

/** O formato que este navegador sabe gravar. Opus onde dá, que é leve e bom. */
export function formato(): string {
  if (typeof MediaRecorder === 'undefined') return ''
  for (const t of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']) {
    if (MediaRecorder.isTypeSupported(t)) return t
  }
  return ''
}

export const extensaoDe = (mime: string) =>
  mime.includes('mp4') ? 'm4a' : mime.includes('ogg') ? 'ogg' : 'webm'

/** "0:07", "1:42". Segundo é a unidade de recado de voz. */
export function duracao(segundos: number): string {
  const s = Math.max(0, Math.round(segundos))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export type Gravacao = {
  blob: Blob
  mime: string
  segundos: number
  /** O que o navegador ouviu. Vazio quando ele não sabe ouvir. */
  texto: string
}

export type Andamento = {
  segundos: number
  /** O texto crescendo enquanto se fala, para a pessoa acompanhar. */
  parcial: string
  /** Altura da onda, 0 a 1, só para a tela mostrar que está captando. */
  nivel: number
}

/**
 * Uma gravação em curso.
 *
 * Gravar e ouvir são dois aparelhos separados do navegador, e podem falhar
 * separado: o reconhecimento cai sozinho às vezes, e quando cai a gravação
 * continua. Por isso o texto é acumulado à parte e o fim da gravação não espera
 * o fim do reconhecimento.
 */
export class Gravador {
  private rec: MediaRecorder | null = null
  private trilha: MediaStream | null = null
  private pedacos: Blob[] = []
  private voz: Reconhecedor | null = null
  private firme = ''
  private parcial = ''
  private inicio = 0
  private timer: number | null = null
  private audio: AudioContext | null = null
  private medidor: AnalyserNode | null = null
  private ondas: Uint8Array<ArrayBuffer> | null = null

  constructor(private aoAndar: (a: Andamento) => void) {}

  async comecar(): Promise<void> {
    this.trilha = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    })

    const mime = formato()
    this.rec = new MediaRecorder(this.trilha, mime ? { mimeType: mime } : undefined)
    this.pedacos = []
    this.rec.ondataavailable = (e) => { if (e.data.size) this.pedacos.push(e.data) }
    this.rec.start(250)
    this.inicio = Date.now()

    this.medir()
    this.ouvir()

    this.timer = window.setInterval(() => {
      this.aoAndar({
        segundos: (Date.now() - this.inicio) / 1000,
        parcial: [this.firme, this.parcial].filter(Boolean).join(' '),
        nivel: this.nivel(),
      })
    }, 100)
  }

  /** Só para a onda na tela: sem isso ninguém sabe se o microfone está pegando. */
  private medir() {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      this.audio = new Ctx()
      const fonte = this.audio.createMediaStreamSource(this.trilha!)
      this.medidor = this.audio.createAnalyser()
      this.medidor.fftSize = 256
      fonte.connect(this.medidor)
      this.ondas = new Uint8Array(new ArrayBuffer(this.medidor.frequencyBinCount))
    } catch { this.medidor = null }
  }

  private nivel(): number {
    if (!this.medidor || !this.ondas) return 0
    this.medidor.getByteTimeDomainData(this.ondas)
    let pico = 0
    for (const v of this.ondas) pico = Math.max(pico, Math.abs(v - 128))
    return Math.min(1, (pico / 128) * 1.6)
  }

  private ouvir() {
    const Classe = classeDeVoz()
    if (!Classe) return
    try {
      const v = new Classe()
      v.lang = 'pt-BR'
      v.continuous = true
      v.interimResults = true
      v.onresult = (e) => {
        let parcial = ''
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const trecho = e.results[i][0]?.transcript || ''
          if (e.results[i].isFinal) this.firme = `${this.firme} ${trecho}`.trim()
          else parcial += trecho
        }
        this.parcial = parcial.trim()
      }
      // Cai sozinho em silêncio longo. Enquanto a gravação anda, levanta de novo.
      v.onend = () => { if (this.rec?.state === 'recording') { try { v.start() } catch {} } }
      v.onerror = () => {}
      v.start()
      this.voz = v
    } catch { this.voz = null }
  }

  async parar(): Promise<Gravacao | null> {
    const rec = this.rec
    if (!rec) return null
    const segundos = (Date.now() - this.inicio) / 1000

    const pronto = new Promise<void>((ok) => { rec.onstop = () => ok() })
    try { rec.stop() } catch {}
    await pronto

    this.desligar()
    const mime = rec.mimeType || formato() || 'audio/webm'
    const blob = new Blob(this.pedacos, { type: mime })
    if (!blob.size) return null

    return {
      blob, mime, segundos,
      texto: [this.firme, this.parcial].filter(Boolean).join(' ').trim(),
    }
  }

  /** Desiste: solta o microfone e não devolve nada. */
  cancelar() {
    try { this.rec?.stop() } catch {}
    this.desligar()
    this.pedacos = []
  }

  private desligar() {
    if (this.timer) { clearInterval(this.timer); this.timer = null }
    try { this.voz?.stop() } catch {}
    this.voz = null
    this.trilha?.getTracks().forEach((t) => t.stop())
    this.trilha = null
    void this.audio?.close().catch(() => {})
    this.audio = null
    this.medidor = null
  }
}
