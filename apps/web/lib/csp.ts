/* Content-Security-Policy de la web (8a). Una sola receta para next.config.ts (producción y todo lo demás) y para middleware.ts (el sandbox).
   Lo que carga cada página sale de nuestro origen, salvo Stripe (la hoja de la tarjeta: js.stripe.com y sus marcos). Nadie nos mete en un marco
   (frame-ancestors 'none', además de X-Frame-Options), las conexiones solo van a nuestro servidor y a la API de Stripe, sin plugins ni <base> ajeno.
   Next pone sus datos en <script> en línea: 'unsafe-inline' para scripts y estilos (sin nonces, las páginas estáticas —las islas sin señal— siguen
   estáticas). En `next dev` se suma 'unsafe-eval' (lo pide el modo de desarrollo, nunca el build).
   23 nov · Las fotos NUNCA se piden a otra empresa: img-src es nuestro origen, data:, blob: y Stripe. La única excepción es el sandbox
   (TOLATINO_ENTORNO = pruebas), cuya semilla de ejemplo trae fotos de negocios de images.pexels.com; ahí, y solo ahí, el middleware añade ese host.
   Producción, el ensayo y cualquier otro valor (o ninguno) no lo llevan. Guardián sinFotosAjenasEnProduccion (y su «al revés»). */
export const IMG_SANDBOX = "https://images.pexels.com";

export function cspProduccion(dev: boolean, sandbox = false): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' https://js.stripe.com${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob:${sandbox ? ` ${IMG_SANDBOX}` : ""} https://*.stripe.com`,
    "font-src 'self' data:",
    `connect-src 'self' https://api.stripe.com${dev ? " ws: wss:" : ""}`,
    "frame-src https://js.stripe.com https://hooks.stripe.com",
    "worker-src 'self' blob:",
    "media-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}
/* ¿Este proceso es el sandbox? Solo el valor exacto «pruebas» (cerrado por defecto). Se lee EN EJECUCIÓN: la imagen es la misma en el sandbox y en producción. */
export const esSandbox = (entorno: string | undefined) => entorno === "pruebas";
