import "server-only";
import { tapar } from "../compa/tapar";

/* 8f · El tapado de los errores y cierres (fase8-apps.md §4 8f; guardianes erroresTapados y erroresSinPersonas). TODO texto que llega a
   /api/errores (mensaje, stack, ruta) pasa por aquí ANTES de guardarse o de calcular su huella. Lo que hace, en orden:
   1. Direcciones: de las nuestras solo queda la ruta de un archivo de /_next/static (para simbolizar), sin dominio, sin «?» ni «#»; cualquier
      otra dirección (la página con sus números, un enlace de un uso, otro sitio) queda «[url]».
   2. Correos → «[correo]» y teléfonos → «[tel]» (los teléfonos SÍ se tapan aquí, a diferencia de Soporte: un error nunca necesita uno).
   3. tapar() de 7c: tarjetas (Luhn), SSN / ITIN, códigos, contraseñas, número A y cuentas bancarias.
   4. Números de operación y de caso, UUID y fichas largas → «#», «TK-#», «:id», «:token». Los números de línea y columna del stack quedan.
   5. Texto entre comillas que no parece código («'Marisol'», «"mi dirección"») → «'…'»: un error nunca guarda el valor de un campo.
   La base lo vuelve a revisar (0127: sin correos, teléfonos, «?» ni tarjetas). Solo en el servidor. */
const URL_RE = /\b(?:https?|capacitor|file|blob|webkit-masked-url|chrome-extension|moz-extension|safari-web-extension):\/\/[^\s)'"<>\]]*/gi;
const ESTATICO = /^\/_next\/static\/[A-Za-z0-9_\-./()[\]@~%]+\.js$/;

/* Una dirección: si es un archivo nuestro de /_next/static, solo su ruta (con :línea:columna); lo demás, «[url]». */
function direccion(u: string): string {
  const m = /^(.*?)((?::\d{1,7}){1,2})?$/.exec(u)!;
  const base = m[1] ?? "", pos = m[2] ?? "";
  try {
    const x = new URL(base.replace(/^webkit-masked-url:\/\/hidden\/?/i, "http://x/"));
    const p = decodeURIComponent(x.pathname).replace(/\/{2,}/g, "/");
    if (ESTATICO.test(p) && !p.includes("..")) return p + pos;
  } catch { /* no es una dirección */ }
  return `[url]${pos}`;
}

export function sinDirecciones(t: string): string {
  return t.replace(URL_RE, (u) => direccion(u));
}

// Solo desde el comienzo de una palabra y con topes: sin eso, 16 KB de letras sin «@» costaban ~300 ms (cuadrático).
const CORREO = /(?<![A-Za-z0-9._%+-])[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]{1,253}\.[A-Za-z]{2,24}/g;
// Un teléfono suelto (10 u 11 dígitos con o sin separadores), nunca dentro de un nombre de archivo o un número de línea.
const TEL = /(?<![\w/.:#-])(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}(?![\w])/g;
const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
const FICHA = /(?<![\w/.-])(?=[A-Za-z0-9_-]*\d)[A-Za-z0-9_-]{20,}(?![\w])/g;
const NUMERO = /(?<![\w./:#-])\d{4,}(?![\w])/g;
const COMILLAS = /(['"`])([^'"`\n]{0,200})\1/g;
const CODIGO = /^[a-z_$][\w$.-]{0,40}$/;

export function taparError(texto: string, max: number): string {
  let t = String(texto ?? "").replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, " ");
  t = sinDirecciones(t);
  t = t.replace(CORREO, "[correo]").replace(TEL, "[tel]");
  t = tapar(t).texto;
  t = t.replace(/\bTK-\d+/g, "TK-#").replace(UUID, ":id").replace(/#\d+/g, "#").replace(FICHA, ":token").replace(NUMERO, "#");
  t = t.replace(COMILLAS, (m, q: string, x: string) => (CODIGO.test(x) || !x ? m : `${q}…${q}`));
  // Última red: un «?clave=valor» que haya sobrevivido (la base tampoco lo deja pasar).
  t = t.replace(/[?&][A-Za-z_]+=[^\s&]*/g, "");
  return t.slice(0, max);
}

/* La familia de una ruta: sin dominio, sin «?» ni «#», cada tramo con un número (o largo, o un UUID) → «:n». Sin dígitos (la base lo exige). */
export function familiaRuta(ruta: unknown): string | null {
  if (typeof ruta !== "string" || !ruta.startsWith("/")) return null;
  const r = ruta.split(/[?#]/)[0]!.slice(0, 300).split("/").map((s, i) => (i === 0 ? s : /\d/.test(s) || s.length > 24 || /[^A-Za-z_.()[\]-]/.test(s) ? ":n" : s)).join("/");
  return r.slice(0, 80) || "/";
}

/* Para la huella y el título: además, todo número suelto que quede → «#» (no el de una palabra como «8f») y los espacios juntos. Así mil errores iguales con otro número son uno. */
export function normalizar(t: string): string {
  return t.replace(/\b\d+\b/g, "#").replace(/\s+/g, " ").trim();
}
