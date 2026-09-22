/**
 * O push no navegador e no celular.
 *
 * O que o app faz aqui é pequeno de propósito: pedir a permissão, assinar o
 * aparelho e guardar a assinatura. Quem manda o aviso é o servidor, em
 * `/api/avisar`, porque mandar exige a chave privada do par VAPID, e chave
 * privada não mora no navegador.
 *
 * O que vale saber antes de mexer:
 *
 * - **O iPhone só aceita push com o app instalado na tela inicial.** Não é uma
 *   limitação do TrackWard, é do iOS. A tela de ajustes diz isso com todas as
 *   letras, em vez de o botão simplesmente não funcionar.
 * - **A permissão negada não volta pelo app.** Depois que a pessoa recusa, só
 *   ela mesma reabre, nas configurações do navegador. Insistir com um segundo
 *   pedido não faz nada, então nem tentamos.
 */

export const TEM_PUSH = typeof window !== 'undefined'
  && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

/** No iOS, push só existe quando o app foi instalado na tela inicial. */
export const PRECISA_INSTALAR = typeof window !== 'undefined'
  && /iPad|iPhone|iPod/.test(navigator.userAgent)
  && !(window.matchMedia?.('(display-mode: standalone)').matches
    || (navigator as { standalone?: boolean }).standalone)

export type EstadoPush = 'sem-suporte' | 'precisa-instalar' | 'desligado' | 'negado' | 'ligado'

/** A chave pública do par VAPID, que o servidor publica para o navegador. */
const CHAVE = process.env.NEXT_PUBLIC_VAPID_CHAVE || ''

/** O navegador quer a chave em bytes, não no texto base64 da url. */
function emBytes(base64: string): Uint8Array {
  const certo = (base64 + '='.repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, '+').replace(/_/g, '/')
  const cru = atob(certo)
  return Uint8Array.from([...cru].map((c) => c.charCodeAt(0)))
}

/** O que o servidor precisa guardar para alcançar este aparelho. */
export type Assinatura = { endpoint: string; p256dh: string; auth: string; aparelho: string }

const emTexto = (buf: ArrayBuffer | null) =>
  buf ? btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : ''

/** Um nome curto do aparelho, para a pessoa reconhecer qual desligar. */
function nomeDoAparelho(): string {
  const ua = navigator.userAgent
  const sistema = /iPhone|iPad/.test(ua) ? 'iPhone' : /Android/.test(ua) ? 'Android'
    : /Macintosh/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : 'Este aparelho'
  const nav = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome'
    : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'navegador'
  return `${sistema}, ${nav}`
}

export async function estadoDoPush(): Promise<EstadoPush> {
  if (!TEM_PUSH || !CHAVE) return PRECISA_INSTALAR ? 'precisa-instalar' : 'sem-suporte'
  if (Notification.permission === 'denied') return 'negado'
  const reg = await navigator.serviceWorker.getRegistration('/sw.js')
  const assin = await reg?.pushManager.getSubscription()
  return assin ? 'ligado' : 'desligado'
}

/**
 * Liga o push neste aparelho. Devolve o que guardar, ou nulo quando a pessoa
 * recusou. Quem grava no banco é quem chamou, com a sessão dela.
 */
export async function ligarPush(): Promise<Assinatura | null> {
  if (!TEM_PUSH || !CHAVE) return null
  const permissao = await Notification.requestPermission()
  if (permissao !== 'granted') return null

  const reg = await navigator.serviceWorker.register('/sw.js')
  await navigator.serviceWorker.ready
  const assin = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: emBytes(CHAVE) as BufferSource,
  })
  const j = assin.toJSON()
  return {
    endpoint: assin.endpoint,
    p256dh: j.keys?.p256dh || emTexto(assin.getKey('p256dh')),
    auth: j.keys?.auth || emTexto(assin.getKey('auth')),
    aparelho: nomeDoAparelho(),
  }
}

/** Desliga neste aparelho. Devolve o endereço que saiu, para apagar no banco. */
export async function desligarPush(): Promise<string | null> {
  if (!TEM_PUSH) return null
  const reg = await navigator.serviceWorker.getRegistration('/sw.js')
  const assin = await reg?.pushManager.getSubscription()
  if (!assin) return null
  const endpoint = assin.endpoint
  await assin.unsubscribe()
  return endpoint
}
