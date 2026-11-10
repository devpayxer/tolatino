/* To'Latino Puerta · lector de QR en un Worker (fase6-eventos.md §3: BarcodeDetector donde exista; jsQR (Apache-2.0, en el repo) donde no).
   Recibe un cuadro de la cámara en escala reducida (RGBA) y devuelve el texto del QR o null. No guarda nada ni habla con la red. */
/* global jsQR */
importScripts("/puerta/jsqr-1.4.0.js");
self.onmessage = function (ev) {
  var d = ev.data || {};
  var r = null;
  try { r = jsQR(d.px, d.w, d.h, { inversionAttempts: "attemptBoth" }); } catch (e) { r = null; }
  self.postMessage({ n: d.n, texto: r && r.data ? String(r.data) : null });
};
