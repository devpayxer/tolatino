// Canonical public origin for SEO tags, sitemap, robots and OG URLs. Override in
// production via NEXT_PUBLIC_SITE_URL once the custom domain is live; falls back
// to the current Vercel host. No trailing slash.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://tolatino.vercel.app').replace(/\/$/, '');

// ── ¿Estamos DENTRO de la app empaquetada? (Fase 0 de tiendas, 2026-11-05) ──
//
// En el navegador el origen es el host real y hay que RESPETARLO: así una vista
// previa manda sus enlaces a la vista previa y producción a producción (es la
// razón por la que `sendCode` nunca usó una constante). Pero dentro del
// envoltorio nativo el origen es LOCAL DEL TELÉFONO:
//   · iOS (Capacitor)      → capacitor://localhost  (o ionic://localhost)
//   · Android (WebView/TWA) → http://localhost      (sin puerto)
//
// Ese origen no existe fuera del teléfono, así que toda URL que SALGA de la app
// construida con él nace rota: el enlace mágico del correo llevaría a
// «localhost», un enlace compartido por WhatsApp no abriría nada, y el
// `return_url` de Stripe dejaría al comprador en el vacío después de pagar.
//
// Se detecta por tres señales, de la más fiable a la más general:
//  1. `window.Capacitor.isNativePlatform()` — la API oficial del envoltorio,
//     inyectada antes de que corra nuestro JS.
//  2. El protocolo no es http(s) → `capacitor://`, `ionic://`, `file://`.
//  3. El host es `localhost`/`127.0.0.1` **sin puerto** → el servidor interno
//     del WebView de Android. Con puerto NO cuenta, a propósito: ese es
//     `next dev` (:3000) y el servidor de las auditorías (:4173), donde el
//     origen local sí es el correcto.
export function isNativeShell(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  try {
    if (cap?.isNativePlatform?.()) return true;
  } catch { /* un envoltorio a medias no debe tumbar la app */ }
  const { protocol, hostname, port } = window.location;
  if (protocol !== 'http:' && protocol !== 'https:') return true;
  if ((hostname === 'localhost' || hostname === '127.0.0.1') && !port) return true;
  return false;
}

/**
 * Origen público para cualquier URL que **salga** de la app: enlaces mágicos
 * del correo (`emailRedirectTo`), enlaces para compartir y el `return_url` de
 * Stripe.
 *
 * - En el navegador → el origen real (producción, o la vista previa de pruebas).
 * - Dentro del envoltorio nativo → SIEMPRE el dominio público (`SITE_URL`).
 *
 * Úsalo en vez de `window.location.origin`; el guardián del build
 * (`scripts/verify-build.mjs`) rechaza los usos nuevos de `location.origin`.
 */
export function siteUrl(path = ''): string {
  const base = typeof window === 'undefined' || isNativeShell() ? SITE_URL : window.location.origin;
  if (!path) return base;
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
}

/**
 * URL pública de la página que se está viendo (origen + ruta actual), para los
 * botones de «compartir» que enlazan a la pantalla donde está el usuario.
 */
export function currentPageUrl(): string {
  return siteUrl(typeof window !== 'undefined' ? window.location.pathname : '/');
}
