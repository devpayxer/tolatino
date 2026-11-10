/* To'Latino · service worker de Mis boletos (fase6-eventos.md §3 «El QR»: «El QR del cliente se guarda en su teléfono para mostrarlo sin
   señal»; Mi cuenta L561 «Si no hay señal, el código funciona igual»). Alcance /cuenta/boletos.
   Lo ÚNICO que guarda: la cáscara /cuenta/boletos/sin-conexion (estática, sin cuenta ni datos), sus archivos de /_next/static y las fuentes.
   NUNCA guarda /api/ ni el HTML de Mis boletos o de un boleto (tienen datos de la cuenta): van siempre a la red. Sin señal, abrir un boleto
   lleva a la cáscara, que muestra el QR guardado CIFRADO en este teléfono con la llave de la sesión de esta cuenta (cookie tl_bk; ver
   lib/boletos-sin-conexion.ts): al salir de la cuenta la llave se borra y otra cuenta en el mismo teléfono no ve nada. */
"use strict";
var CACHE = "tl-boletos-v1";
var CASCARA = "/cuenta/boletos/sin-conexion";
var FIJOS = ["/assets/logo-tolatino.svg"];
var ESTATICO = /^\/(_next\/static\/|fuentes\/)/;

function preparar() {
  return fetch(CASCARA, { cache: "no-store", credentials: "same-origin" }).then(function (r) {
    if (!r.ok || r.redirected) return null;
    return r.clone().text().then(function (html) {
      var urls = FIJOS.slice(), re = /(?:src|href)="(\/(?:_next\/static|fuentes)\/[^"]+)"/g, m;
      while ((m = re.exec(html))) urls.push(m[1].replace(/&amp;/g, "&"));
      return caches.open(CACHE).then(function (c) {
        return Promise.all(urls.map(function (u) {
          return fetch(u, { cache: "no-cache", credentials: "same-origin" }).then(function (x) { if (x.ok) return c.put(u, x); }).catch(function () { return undefined; });
        })).then(function () { return c.put(CASCARA, r); }).then(function () {
          return c.keys().then(function (ks) {
            return Promise.all(ks.map(function (k) { var p = new URL(k.url).pathname; if (/^\/_next\/static\//.test(p) && urls.indexOf(p) < 0 && html.indexOf(p) < 0) return c.delete(k); }));
          });
        });
      });
    });
  }).catch(function () { return null; });
}

self.addEventListener("install", function (e) { e.waitUntil(preparar()); self.skipWaiting(); });
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return /^tl-boletos-/.test(k) && k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("message", function (e) {
  var d = e.data || {};
  if (d.t === "preparar") e.waitUntil(preparar());
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.indexOf("/api/") === 0) return; // nunca: datos con cuenta
  if (req.mode === "navigate") {
    if (url.pathname !== "/cuenta/boletos" && url.pathname.indexOf("/cuenta/boletos/") !== 0) return;
    e.respondWith(fetch(req).catch(function () {
      if (url.pathname === CASCARA) return caches.match(CASCARA).then(function (r) { return r || Response.error(); });
      var m = /^\/cuenta\/boletos\/(TL-[A-Z0-9]{3}-[0-9]{4})$/i.exec(url.pathname);
      return Response.redirect(CASCARA + (m ? "?c=" + encodeURIComponent(m[1].toUpperCase()) : ""), 302);
    }));
    return;
  }
  if (ESTATICO.test(url.pathname) || FIJOS.indexOf(url.pathname) >= 0) {
    e.respondWith(caches.open(CACHE).then(function (c) {
      return c.match(req).then(function (hit) {
        if (hit) return hit;
        return fetch(req).then(function (r) { if (r.ok && r.type === "basic") c.put(req, r.clone()); return r; });
      });
    }));
  }
});
