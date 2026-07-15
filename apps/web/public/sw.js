/* To'Latino service worker — Web Push receiver.
   Shows order updates (confirmado / preparando / en camino / entregado /
   cancelado) as OS notifications even when the app is closed, and focuses the
   right screen on tap. Payload from supabase/functions/send-push:
   { title, body, url, tag }. */

self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (_e) { d = {}; }
  const title = d.title || "To'Latino";
  const options = {
    body: d.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: d.tag || 'tolatino',
    renotify: true,
    data: { url: d.url || '/cuenta' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/cuenta';
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      if ('focus' in c) {
        try { if ('navigate' in c) await c.navigate(target); } catch (_e) { /* cross-scope */ }
        return c.focus();
      }
    }
    if (self.clients.openWindow) return self.clients.openWindow(target);
  })());
});

// Activate immediately so a freshly-registered SW can receive pushes right away.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
