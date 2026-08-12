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

// ── Manejador `fetch`: sin esto, Android NUNCA ofrece instalar ──────────────
// DE DÓNDE SALE: el fundador probó «Instalar» y no pasaba nada (2026-08-06).
// Al mirarlo salieron dos causas, y esta es la de fondo: Chrome solo dispara
// `beforeinstallprompt` si hay un service worker CON manejador `fetch` — y este
// archivo no tenía ninguno, así que en Android el instalador no podía aparecer
// jamás. (Chrome ignora los manejadores vacíos puestos solo para cumplir el
// requisito, así que tiene que hacer algo de verdad.)
//
// Hace lo mínimo HONESTO: red primero, siempre. Solo cuando la red falla —sin
// datos, en el metro— devuelve una página de respaldo. Nunca sirve contenido
// guardado estando en línea, así que no puede enseñar una versión vieja de la
// app, que es el modo clásico de romperla con una caché.
//
// La página va AQUÍ DENTRO, como texto, y no en un archivo aparte. El primer
// intento la guardaba de `/sin-conexion.html` con `cache.add()` y fallaba en
// silencio: el servidor redirige esa ruta con un 301 y `cache.add()` rechaza
// las respuestas redirigidas. Sin archivo no hay ruta, y sin ruta no hay
// redirección que lo rompa. (Lo destapó la propia prueba, porque el `catch`
// que puse lo estaba tapando.)
const RESPALDO = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sin conexi\u00f3n \u00b7 To'Latino</title><style>
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:28px;
background:#FAFAFA;font-family:'Plus Jakarta Sans',system-ui,sans-serif;color:#1E1B2E}
.c{max-width:340px;text-align:center}
.i{width:64px;height:64px;margin:0 auto 18px;border-radius:18px;background:#7B61FF;color:#fff;
display:flex;align-items:center;justify-content:center;font-weight:800;font-size:24px}
h1{font-size:19px;font-weight:800;margin:0 0 8px}
p{font-size:14px;font-weight:500;line-height:1.55;color:#4A4660;margin:0 0 20px}
button{width:100%;padding:13px;border:0;border-radius:14px;background:#7B61FF;color:#fff;
font:800 14px 'Plus Jakarta Sans',system-ui,sans-serif;cursor:pointer}
</style></head><body><div class="c"><div class="i">To&rsquo;</div>
<h1>Sin conexi\u00f3n</h1>
<p>No hay internet en este momento. Revisa tu conexi\u00f3n y vuelve a intentarlo.</p>
<button onclick="location.reload()">Reintentar</button></div></body></html>`;

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Solo las NAVEGACIONES. El resto (guiones, estilos, imágenes, la base de
  // datos) pasa de largo sin tocarse: interceptarlo no aportaría nada y sí
  // podría romper algo.
  if (req.mode !== 'navigate') return;
  event.respondWith(
    fetch(req).catch(() => new Response(RESPALDO, {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    })),
  );
});
