/* Batería de El Compa · La ayuda que se le da al motor. Lee docs/ayuda/ con el MISMO lector que el indexador (scripts/ayuda/forma.mjs: forma,
   audiencia, trozos de ≤ 1 800 letras) y arma los trozos de cada caso.
   La búsqueda real es Postgres (full-text con los sinónimos del Catálogo: lib/compa/ayuda-indice.ts trozosCompa) y no corre aquí (la batería no
   levanta base). Para medir al MODELO y no a la búsqueda, el caso que espera una ficha recibe el mejor trozo de esa ficha (como cuando la búsqueda
   la encuentra) junto con trozos parecidos de otras fichas de la misma audiencia (los distractores que la búsqueda real también trae); el caso que
   no tiene ficha recibe solo lo que pasa un umbral estricto de parecido (casi nada), como en producción. La aproximación es léxica, determinista y
   la misma para los tres motores. */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { leerAyuda, trozos } from "../../ayuda/forma.mjs";

/* Qué audiencias de la ayuda lee cada uso (lib/compa/conversacion.ts: vecino ve «vecino»; el panel «vecino» y «negocio»; la respuesta automática
   «vecino»; el copiloto las cuatro). */
export const AUDIENCIAS_DEL_USO = { neighbor: ["vecino"], owner: ["vecino", "negocio"], auto_reply: ["vecino"], copilot: ["vecino", "negocio", "portero", "equipo"] };

const sinAcentos = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const PARADAS = new Set(("para como cual cuando donde esta este esto esos esas unos unas tengo tiene tienen puedo puedes puede mucho mismo sobre entre desde hasta tambien pero porque "
  + "that this with from have what when where which there their about your yours into than then they them will would could should does doing been being were very more some").split(" "));
export const palabras = (t) => sinAcentos(String(t ?? "")).replace(/[^a-z0-9ñ]+/g, " ").split(" ").filter((w) => w.length > 3 && !PARADAS.has(w));
const raiz = (w) => w.slice(0, 5);

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

/* ¿Puede un uso leer ese trozo? Un trozo solo-equipo solo lo lee el copiloto (que lee todo). */
const ve = (a, c, aud) => aud.includes(a.audiencia) && (!c.equipo || aud.includes("equipo"));

/* Cuánto se parece un trozo a la pregunta (palabras de la pregunta cuyo comienzo aparece en el trozo; el título y el encabezado pesan el doble). */
export function parecido(pregunta, trozo, titulo) {
  const q = [...new Set(palabras(pregunta).map(raiz))];
  if (!q.length) return 0;
  const cuerpo = new Set(palabras(trozo.body).map(raiz)), cabeza = new Set(palabras(`${titulo} ${trozo.heading}`).map(raiz));
  let n = 0;
  for (const w of q) n += cuerpo.has(w) ? 1 : 0, n += cabeza.has(w) ? 1 : 0;
  return n;
}

function mejoresDe(idx, pregunta, lang, aud, { excluir = new Set(), solo = null } = {}) {
  const out = [];
  for (const a of idx.values()) {
    if (excluir.has(a.slug) || (solo && !solo.has(a.slug))) continue;
    for (const c of a.trozos) if (c.lang === lang && ve(a, c, aud)) { const p = parecido(pregunta, c, a.titulo[lang]); if (p > 0) out.push({ a, c, p }); }
  }
  return out.sort((x, y) => y.p - x.p || x.a.slug.localeCompare(y.a.slug) || x.c.body.length - y.c.body.length);
}

/* Los trozos de un caso. modo: «esperada» (la ficha esperada + parecidas), «buscar» (solo lo que pasa un umbral estricto), «ninguna». */
export function trozosDelCaso(idx, { pregunta, lang, uso, fuentes, modo, max = 4, prohibidos = new Set() }) {
  const aud = AUDIENCIAS_DEL_USO[uso] ?? ["vecino"];
  if (modo === "ninguna") return [];
  const elegidos = [], vistos = new Set();
  const poner = (x) => { if (elegidos.length < max && !vistos.has(x.a.slug + "|" + x.c.heading + "|" + x.c.body.length) && !prohibidos.has(x.a.slug)) { vistos.add(x.a.slug + "|" + x.c.heading + "|" + x.c.body.length); elegidos.push(x); } };
  if (modo === "esperada") {
    for (const slug of fuentes) {
      const a = idx.get(slug);
      if (!a || !aud.includes(a.audiencia)) continue;
      const m = mejoresDe(idx, pregunta, lang, aud, { solo: new Set([slug]) })[0] ?? (a.trozos.filter((c) => c.lang === lang && ve(a, c, aud)).map((c) => ({ a, c, p: 0 }))[0]);
      if (m) poner(m);
    }
  }
  const umbral = modo === "esperada" ? 2 : 3;
  for (const m of mejoresDe(idx, pregunta, lang, aud, { excluir: new Set(modo === "esperada" ? fuentes : []) })) { if (m.p < umbral) break; poner(m); }
  // Orden: por parecido (como el rango de la búsqueda real), así la ficha esperada no va siempre primera.
  return elegidos.sort((x, y) => parecido(pregunta, y.c, y.a.titulo[lang]) - parecido(pregunta, x.c, x.a.titulo[lang]) || x.a.slug.localeCompare(y.a.slug))
    .map((x) => ({ fuente: x.a.slug, titulo: x.a.titulo[lang], seccion: x.c.heading, texto: x.c.body }));
}
