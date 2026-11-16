import { headers } from "next/headers";

/* Anchos (16 nov) · Una sola regla para la marca «Secure» de TODAS las cookies: la conexión real de la persona (x-forwarded-proto, que pone
   nginx detrás de Cloudflare), igual que la sesión. Antes la ciudad del Super Admin la decidía NODE_ENV: en un servidor de producción servido por
   http (CI, una prueba local) Safari tiraba la cookie y el selector de ciudad no filtraba; y el idioma, la ciudad que miras, el dispositivo y el
   código de invitación no llevaban la marca nunca, también con https. Guardián cookieSegura. */
export const esHttps = (h: { get(n: string): string | null }): boolean => (h.get("x-forwarded-proto") || "").includes("https");
export async function cookieSegura(): Promise<boolean> {
  return esHttps(await headers());
}
