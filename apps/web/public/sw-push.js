/* To'Latino · service worker de los avisos (fase8-apps.md §3.3 «Web → Web Push»). Alcance «/». Hace SOLO dos cosas: mostrar el aviso que
   llega cifrado por el servicio de push del navegador (el navegador lo descifra con las llaves de esta suscripción) y, al tocarlo, abrir
   /app/aviso/{id} en To'Latino (el servidor, con la sesión, marca abierto y lleva a su pantalla). No guarda nada (sin caché, sin «fetch»):
   las pantallas sin señal tienen sus propios service workers (/puerta, /cuenta/boletos). Guardián swPushSoloAbre. */
"use strict";
var RUTA = /^\/app\/aviso\/\d{1,18}(\?v=push)?$/;

self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (e) { e.waitUntil(self.clients.claim()); });

self.addEventListener("push", function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = {}; }
  var titulo = typeof d.t === "string" && d.t ? d.t.slice(0, 120) : "To'Latino";
  var cuerpo = typeof d.b === "string" ? d.b.slice(0, 480) : "";
  var u = typeof d.u === "string" && RUTA.test(d.u) ? d.u : "/avisos";
  e.waitUntil(self.registration.showNotification(titulo, {
    body: cuerpo, tag: typeof d.tag === "string" ? d.tag.slice(0, 64) : undefined, renotify: true,
    icon: "/assets/logo-tolatino.svg", lang: "es-US", data: { u: u },
  }));
});

/* 9l · Si el navegador cambia la suscripción por su cuenta (vence o la rota), se vuelve a suscribir con la MISMA llave del servidor y le avisa a
   /api/push/renovar (nuestro origen, con la sesión de la cookie; el servidor ata la nueva a esa sesión y suelta la vieja). Sin sesión, no pasa nada: se
   registra otra vez al abrir To'Latino. No guarda nada. */
self.addEventListener("pushsubscriptionchange", function (e) {
  e.waitUntil((function () {
    var vieja = e.oldSubscription, nueva = e.newSubscription;
    var llave = vieja && vieja.options ? vieja.options.applicationServerKey : null;
    var sub = nueva ? Promise.resolve(nueva) : llave ? self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: llave }) : Promise.resolve(null);
    return sub.then(function (s) {
      if (!s) return;
      var j = s.toJSON ? s.toJSON() : {};
      if (!j.endpoint || !j.keys || !j.keys.p256dh || !j.keys.auth) return;
      return fetch(new URL("/api/push/renovar", self.location.origin).href, { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" },
        body: JSON.stringify({ viejo: vieja ? vieja.endpoint : null, endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth }) });
    }).catch(function () { return undefined; });
  })());
});

self.addEventListener("notificationclick", function (e) {
  e.notification.close();
  var u = e.notification.data && typeof e.notification.data.u === "string" && RUTA.test(e.notification.data.u) ? e.notification.data.u : "/avisos";
  var destino = new URL(u, self.location.origin).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (cs) {
    for (var i = 0; i < cs.length; i++) {
      var c = cs[i];
      if (new URL(c.url).origin !== self.location.origin) continue;
      var foco = c.focus ? c.focus().catch(function () { return c; }) : Promise.resolve(c);
      return foco.then(function (w) { return (w || c).navigate(destino); }).catch(function () { return self.clients.openWindow(destino); });
    }
    return self.clients.openWindow(destino);
  }));
});
