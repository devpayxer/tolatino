/* To'Latino Puerta · service worker propio (fase6-eventos.md §4 6h: «/puerta instalable: la app abre sin señal»). Alcance /puerta.
   Lo ÚNICO que guarda: la cáscara /puerta/sin-conexion (una página estática, sin cuenta ni datos), sus archivos de /_next/static (con huella:
   no cambian), las fuentes y el lector de QR (jsQR en un Worker). NUNCA guarda /api/ ni el HTML de una puerta (/puerta, /puerta/s/…): esas
   respuestas tienen datos de la cuenta y van siempre a la red. Sin señal, abrir una puerta lleva a la cáscara, que lee el paquete cifrado
   del teléfono (IndexedDB; ver app/(puerta)/puerta/sin-conexion/local.ts). Salir de la cuenta borra el paquete; esto no tiene nada que borrar. */
"use strict";
var CACHE = "tl-puerta-v1";
var CASCARA = "/puerta/sin-conexion";
var FIJOS = ["/puerta/lector.js", "/puerta/jsqr-1.4.0.js", "/puerta/manifest.webmanifest", "/assets/logo-tolatino.svg"];
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
          // Lo de /_next/static que la cáscara de ahora ya no usa sale (otra versión de la app).
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
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return /^tl-puerta-/.test(k) && k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
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
    if (url.pathname !== "/puerta" && url.pathname.indexOf("/puerta/") !== 0) return;
    e.respondWith(fetch(req).catch(function () {
      if (url.pathname === CASCARA) return caches.match(CASCARA).then(function (r) { return r || Response.error(); });
      var m = /^\/puerta\/s\/(\d{1,18})/.exec(url.pathname);
      return Response.redirect(CASCARA + (m ? "?s=" + m[1] : ""), 302);
    }));
    return;
  }
  if (ESTATICO.test(url.pathname) || FIJOS.indexOf(url.pathname) >= 0) {
    e.respondWith(caches.open(CACHE).then(function (c) {
      return c.match(req, { ignoreSearch: FIJOS.indexOf(url.pathname) >= 0 }).then(function (hit) {
        if (hit) return hit;
        return fetch(req).then(function (r) { if (r.ok && r.type === "basic") c.put(req, r.clone()); return r; });
      });
    }));
  }
});
