'use client';

// RegistrarSW — deja el service worker registrado desde que se abre la app.
//
// DE DÓNDE SALE: el fundador dio a «Instalar» y no pasaba nada (2026-08-06).
// Una de las dos causas era esta: el service worker SOLO se registraba cuando
// alguien aceptaba las notificaciones (`lib/push.ts`), así que para un visitante
// normal no existía. Y sin service worker registrado Chrome no considera la app
// instalable — nunca dispara `beforeinstallprompt`, o sea que en Android el
// instalador no podía salir jamás.
//
// Va en el layout RAÍZ a propósito, no en el del cliente: la portada (`/`) está
// fuera de aquel, y es la primera página que ve todo el mundo.
//
// No pisa a `lib/push.ts`: aquel hace `getRegistration('/sw.js')` antes de
// registrar, así que encuentra este y lo reutiliza.

import { useEffect } from 'react';

export function RegistrarSW() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    // Tras la carga, para no competir con el primer pintado.
    const registrar = () => { void navigator.serviceWorker.register('/sw.js').catch(() => { /* modo privado, http, etc. */ }); };
    if (document.readyState === 'complete') registrar();
    else window.addEventListener('load', registrar, { once: true });
    return () => window.removeEventListener('load', registrar);
  }, []);
  return null;
}
