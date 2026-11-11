import type { NextConfig } from "next";
import path from "node:path";

/* 8a · Content-Security-Policy propia (fase8-apps.md §3.1 «Seguridad del WebView»; antes no había): lo que carga cada página sale de nuestro
   origen, salvo Stripe (la hoja de la tarjeta: js.stripe.com y sus marcos) y las fotos de ejemplo del sandbox (Pexels). Nadie nos mete en
   un marco (frame-ancestors 'none', además de X-Frame-Options), las conexiones solo van a nuestro servidor y a la API de Stripe, sin
   plugins ni <base> ajeno. Next pone sus datos en <script> en línea: 'unsafe-inline' para scripts y estilos (sin nonces, las páginas
   estáticas —las islas sin señal— siguen estáticas). En `next dev` se suma 'unsafe-eval' (lo pide el modo de desarrollo, nunca el build). */
const DEV = process.env.NODE_ENV !== "production";
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://js.stripe.com${DEV ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://images.pexels.com https://*.stripe.com",
  "font-src 'self' data:",
  `connect-src 'self' https://api.stripe.com${DEV ? " ws: wss:" : ""}`,
  "frame-src https://js.stripe.com https://hooks.stripe.com",
  "worker-src 'self' blob:",
  "media-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../../"),
  transpilePackages: ["@tolatino/ui"],
  poweredByHeader: false,
  // 8f · Mapas de fuente del navegador para simbolizar los errores EN EL SERVIDOR (lib/errores/simbolizar.ts). Nunca se sirven: el paso que
  // sigue al build (scripts/mapas-privados.mjs) los saca de .next/static; nginx además niega *.map (guardián mapasPrivados).
  productionBrowserSourceMaps: true,
  reactStrictMode: true,
  // 7d · Las piezas del sistema de diseño piden su logo con ruta relativa («assets/logo-tolatino.svg», p. ej. el avatar de El Compa): en una
  // ruta honda (/cita/C-1/ayuda) eso sería /cita/C-1/assets/…; se sirve el mismo archivo de /assets. Solo lee public/assets.
  rewrites: async () => [{ source: "/:ruta+/assets/:archivo", destination: "/assets/:archivo" }],
  headers: async () => [
    // 6h · Los service workers propios: siempre la última versión, y el de la Puerta con alcance /puerta (el archivo vive en /puerta/).
    { source: "/puerta/sw.js", headers: [{ key: "Service-Worker-Allowed", value: "/puerta" }, { key: "Cache-Control", value: "no-cache" }] },
    { source: "/sw-boletos.js", headers: [{ key: "Cache-Control", value: "no-cache" }] },
    // 8c · El service worker de los avisos (alcance «/»): siempre el último.
    { source: "/sw-push.js", headers: [{ key: "Cache-Control", value: "no-cache" }] },
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(self), geolocation=(self), microphone=()" },
        { key: "Content-Security-Policy", value: CSP },
      ],
    },
  ],
};

export default nextConfig;
