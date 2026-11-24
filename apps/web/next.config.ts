import type { NextConfig } from "next";
import path from "node:path";
import { cspProduccion } from "./lib/csp";

/* 8a · Content-Security-Policy propia: la receta vive en lib/csp.ts (23 nov: sin fotos de otras empresas; el sandbox suma las de su semilla en middleware.ts). */
const CSP = cspProduccion(process.env.NODE_ENV !== "production");

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../../"),
  // 9i · El paso «Comprobar» del asistente de apertura lee las líneas pendientes de la LAUNCH-CHECKLIST que viaja con el build (lib/ciudades/launch.ts).
  outputFileTracingIncludes: { "/admin/ciudades": ["../../docs/LAUNCH-CHECKLIST.md"] },
  transpilePackages: ["@tolatino/ui"],
  // 24 nov (decisión AR) · Solo la imagen (infra/pruebas/Dockerfile pone TOLATINO_TIPOS_YA_REVISADOS=1) se construye sin volver a revisar los tipos:
  // ya se revisaron antes de llegar (tipos en cada subida y en el CI de cada push) y repetirlos costaba 30–60 s en cada despliegue. Cualquier otro build
  // (el del CI, el local) los revisa. Guardián tiposAntesDeLaImagen.
  typescript: { ignoreBuildErrors: process.env.TOLATINO_TIPOS_YA_REVISADOS === "1" },
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
    // 23 nov · Las fotos de las páginas de categoría (public/paginas): el nombre lleva la huella del contenido, así que nunca cambian bajo la misma dirección.
    { source: "/paginas/:archivo", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
    { source: "/sw-boletos.js", headers: [{ key: "Cache-Control", value: "no-cache" }] },
    // 8c · El service worker de los avisos (alcance «/»): siempre el último.
    { source: "/sw-push.js", headers: [{ key: "Cache-Control", value: "no-cache" }] },
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(self), geolocation=(self), microphone=(), publickey-credentials-create=(self), publickey-credentials-get=(self)" },
        { key: "Content-Security-Policy", value: CSP },
        // C-006 · El navegador manda su ancho de ventana desde la segunda petición (Chrome/Edge/Android): el primer pintado elige teléfono o computadora
        // con el ancho de verdad aunque todavía no haya cookie tl_ancho (lib/ancho.ts). Solo una medida de pantalla.
        { key: "Accept-CH", value: "Sec-CH-Viewport-Width, Viewport-Width" },
      ],
    },
  ],
};

export default nextConfig;
