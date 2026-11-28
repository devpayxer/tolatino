/* Batería de El Compa · La ayuda. Lee docs/ayuda/ con el MISMO lector que el indexador (scripts/ayuda/forma.mjs: forma, audiencia, trozos de ≤ 1 800
   letras) para saber qué fichas existen y de qué audiencia son (la validación de los casos y la revisión «cita una ficha real de su audiencia»).
   La BÚSQUEDA ya no se aproxima aquí: la hace Postgres por el camino real (lib/compa/ayuda-indice.ts trozosCompa, llamada por conversacion.ts desde
   camino.mjs), con sus sinónimos y su umbral, así que lo que el motor lee es lo que leería en el servidor. */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { leerAyuda, trozos } from "../../ayuda/forma.mjs";

/* Qué audiencias de la ayuda lee cada uso (lib/compa/conversacion.ts: vecino ve «vecino»; el panel «vecino» y «negocio»; la respuesta automática
   «vecino»; el copiloto las cuatro). */
export const AUDIENCIAS_DEL_USO = { neighbor: ["vecino"], owner: ["vecino", "negocio"], auto_reply: ["vecino"], copilot: ["vecino", "negocio", "portero", "equipo"] };

/* El índice: slug → { slug, audiencia, tema, titulo, trozos: [{ lang, heading, body, equipo }] }. */
export function cargarIndice(RAIZ) {
  const D = join(RAIZ, "docs", "ayuda"), idx = new Map();
  for (const f of readdirSync(D).filter((x) => x.endsWith(".md")).sort()) {
    const slug = f.replace(/\.md$/, ""), r = leerAyuda(readFileSync(join(D, f), "utf8"), f);
    if (r.errores.length || !r.meta || !r.titulo) continue;   // la forma la vigila el guardián ayudaConForma
    idx.set(slug, { slug, audiencia: r.meta.audiencia, tema: r.meta.tema, titulo: r.titulo, trozos: trozos(r.secciones).map((c) => ({ lang: c.lang, heading: c.heading, body: c.body, equipo: !!c.equipo })) });
  }
  return idx;
}
