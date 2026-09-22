/*
 * O trabalhador de segundo plano do TrackWard.
 *
 * Ele existe por um motivo só: receber o aviso quando o app está fechado. Sem
 * ele, o navegador não tem onde entregar o push, e o app volta a ficar em
 * silêncio, que é o problema que os avisos existem para resolver.
 *
 * De propósito ele não guarda nada e não intercepta requisição nenhuma. Um
 * service worker que faz cache passa a decidir que versão do app a pessoa vê, e
 * aí um dia alguém está olhando uma tela de duas semanas atrás sem saber. Aqui
 * ele só escuta push e cuida do clique.
 */

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('push', (e) => {
  let d = {}
  try { d = e.data ? e.data.json() : {} } catch { d = { titulo: 'TrackWard' } }

  e.waitUntil(self.registration.showNotification(d.titulo || 'TrackWard', {
    body: d.corpo || '',
    icon: '/icone-192.png',
    badge: '/icone-badge.png',
    // Um aviso por assunto: o segundo sobre a mesma tarefa substitui o primeiro,
    // em vez de empilhar cinco linhas iguais na tela de bloqueio.
    tag: d.chave || undefined,
    renotify: !!d.urgente,
    requireInteraction: !!d.urgente,
    data: { url: d.url || '/' },
  }))
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const url = (e.notification.data && e.notification.data.url) || '/'
  e.waitUntil((async () => {
    const abertas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    // Já existe uma janela do app: leva ela para o lugar, em vez de abrir outra.
    for (const c of abertas) {
      if (new URL(c.url).origin === self.location.origin) {
        await c.focus()
        if ('navigate' in c) { try { await c.navigate(url) } catch { /* algumas versões recusam */ } }
        return
      }
    }
    await self.clients.openWindow(url)
  })())
})
