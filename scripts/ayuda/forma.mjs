/* 7a · La forma única de un archivo de docs/ayuda/ (fase7-compa.md §3 «ayudaConForma» y §4 7a). La leen el indexador
   (scripts/ayuda/indexar.mjs) y los guardianes (ayudaConForma, ayudaSinFaseInterna, compaAyudaPorAudiencia): una sola definición.

   # Título en español · Title in English              ← una sola « · »
                                                        ← en blanco
   _Pantallas: dónde vive (rutas, códigos de pantalla, notas). Versión: 10 nov 2026. Audiencia: vecino. Tema: pedidos._
                                                        ← en blanco
   ## Qué hace … (secciones en español, `##` y `###`)
   ## English                                           ← una sola vez; nada de `##` después
   ### What it does … (secciones en inglés, `###` y `####`)

   El slug es el nombre del archivo. Audiencia: vecino · negocio (panel) · portero (To'Latino Puerta) · equipo (Super Admin). Una sección
   marcada con `<!-- solo-equipo -->` en la línea que sigue a su encabezado (y lo que cuelga de ella) solo la ve el equipo: ni el
   Centro de ayuda ni El Compa se la dan a un vecino, un negocio o un portero. */

export const AUDIENCIAS = ["vecino", "negocio", "portero", "equipo"];
/* Los temas del Centro de ayuda y la audiencia de cada uno (las etiquetas ES/EN viven en help_topics, 0116). */
export const TEMAS = {
  cuenta: "vecino", explorar: "vecino", pedidos: "vecino", citas: "vecino", eventos: "vecino", comunidad: "vecino", negocios: "vecino",
  panel: "negocio", puerta: "portero", equipo: "equipo",
};
/* Lo que el nombre del archivo obliga (plan §2 0116: admin-* = equipo, panel-* = negocio, puerta-* = portero). Nunca al revés:
   un admin-* jamás puede quedar para vecinos o negocios. */
export function audienciaPorNombre(slug) {
  if (slug.startsWith("admin-")) return "equipo";
  if (slug.startsWith("puerta-")) return "portero";
  if (slug.startsWith("panel-") || slug === "panel") return "negocio";
  return null;
}

const MESES = "ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic";
const META = new RegExp(`^_Pantallas: ([\\s\\S]+?) Versión: (\\d{1,2} (?:${MESES}) \\d{4})\\. Audiencia: ([a-z]+)\\. Tema: ([a-z]+)\\._$`);
export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const TROZO_MAX = 1800;

/* Lenguaje interno (fases, bloques, «llega con …») que un vecino nunca debe leer. Fuera de una sección solo-equipo, no va. */
export const FASE_INTERNA = [
  [/\b[Ff]ases? \d/, "«Fase N»"],
  [/\b[Pp]hases? \d/, "«Phase N»"],
  [/\b[Bb]loques? \d[a-z]?/, "«bloque N»"],
  [/\b[Bb]locks? \d[a-z]/, "«block N»"],
  [/\bllega(?:n|rá|rán)? (?:con|en) (?:la |el |los |las |su |sus )?(?:fase|bloque|\d[a-z]{1,3}\b|módulos?|próxim[ao]s? fases?)/i, "«llega con …» (una fase)"],
  [/\b(?:arrives?|comes?|coming) (?:with|in) (?:the |its |their )?(?:phase|block|\d[a-z]{1,3}\b|modules?|next phases?)/i, "«arrives with …» (a phase)"],
  [/\btodav[ií]a no (?:est[aá] construid|se construy|existe en la app|llega)/i, "«todavía no está construido»"],
  [/^#{2,4} Lo que todav[ií]a no est[aá]/i, "sección «Lo que todavía no está»"],
  [/(?<![\w\-/{.])[1-9][a-z]{1,3}(?:-\d)?(?![\w\-])/, "un código de bloque («5c», «6j», «4h-3»)"],
  [/\bllegan? con Stripe|\barrives? with Stripe/i, "«llega con Stripe» (los cobros con tarjeta ya existen)"],
];

/* Lee un archivo. Devuelve { errores: [[línea, msg]], meta, titulo, secciones } — secciones = [{ lang, nivel, heading, equipo, cuerpo, linea }]. */
export function leerAyuda(texto, archivo = "") {
  const errores = [], err = (n, m) => errores.push([n, m]);
  const slug = archivo.replace(/^.*\//, "").replace(/\.md$/, "");
  if (archivo && !SLUG.test(slug)) err(0, "el nombre del archivo es el slug: minúsculas, números y guiones");
  const L = texto.replace(/\r/g, "").split("\n");
  const t = /^# (.+)$/.exec(L[0] ?? "");
  let titulo = null;
  if (!t) err(1, "la primera línea es el título «# Español · English»");
  else {
    const p = t[1].split(" · ");
    if (p.length !== 2 || !p[0].trim() || !p[1].trim()) err(1, "el título lleva una sola « · » entre el español y el inglés");
    else titulo = { es: p[0].trim(), en: p[1].trim() };
  }
  if ((L[1] ?? "") !== "") err(2, "una línea en blanco después del título");
  let i = 2;
  const m0 = i;
  let meta = null;
  if (!/^_Pantallas: /.test(L[i] ?? "")) err(i + 1, "falta la línea «_Pantallas: … Versión: … Audiencia: … Tema: …_» después del título");
  else {
    while (i < L.length && !/_\s*$/.test(L[i])) i++;
    const crudo = L.slice(m0, i + 1).join(" ").replace(/\s+/g, " ").trim();
    const m = META.exec(crudo);
    if (!m) err(m0 + 1, "los metadatos son «_Pantallas: … Versión: 10 nov 2026. Audiencia: vecino. Tema: pedidos._»");
    else {
      meta = { pantallas: m[1].trim(), version: m[2], audiencia: m[3], tema: m[4] };
      if (!AUDIENCIAS.includes(meta.audiencia)) err(m0 + 1, `audiencia «${meta.audiencia}»: vecino, negocio, portero o equipo`);
      if (!(meta.tema in TEMAS)) err(m0 + 1, `tema «${meta.tema}»: ${Object.keys(TEMAS).join(", ")}`);
      else if (TEMAS[meta.tema] !== meta.audiencia) err(m0 + 1, `el tema «${meta.tema}» es de la audiencia ${TEMAS[meta.tema]}, no de ${meta.audiencia}`);
      const debe = audienciaPorNombre(slug);
      if (debe && meta.audiencia !== debe) err(m0 + 1, `un archivo ${slug.split("-")[0]}-* es de la audiencia «${debe}»`);
    }
    i++;
  }
  // El cuerpo: secciones.
  const secciones = [];
  let lang = "es", enVisto = false, cur = null, eqNivel = null, primera = true;
  for (let n = i; n < L.length; n++) {
    const l = L[n], h = /^(#{1,6}) (.+)$/.exec(l);
    if (h) {
      const nivel = h[1].length, txt = h[2].trim();
      if (nivel === 1) { err(n + 1, "un solo «# » (el título)"); continue; }
      if (nivel === 2 && txt === "English") {
        if (enVisto) err(n + 1, "«## English» va una sola vez");
        if (!secciones.length) err(n + 1, "antes de «## English» van las secciones en español");
        enVisto = true; lang = "en"; eqNivel = null;
        cur = { lang, nivel: 2, heading: titulo?.en ?? "English", equipo: false, cuerpo: [], linea: n + 1, intro: true }; secciones.push(cur);
        continue;
      }
      if (lang === "en" && nivel === 2) err(n + 1, "después de «## English» las secciones van con «###»");
      if (lang === "es" && nivel > 3) err(n + 1, "en español, secciones «##» y «###»");
      if (lang === "en" && nivel > 4) err(n + 1, "en inglés, secciones «###» y «####»");
      if (eqNivel !== null && nivel <= eqNivel) eqNivel = null;
      const equipo = L[n + 1]?.trim() === "<!-- solo-equipo -->";
      if (equipo && eqNivel === null) eqNivel = nivel;
      cur = { lang, nivel: lang === "en" ? nivel - 1 : nivel, heading: txt, equipo: eqNivel !== null, cuerpo: [], linea: n + 1 };
      secciones.push(cur);
      if (equipo) n++;
      primera = false;
      continue;
    }
    if (l.trim() === "<!-- solo-equipo -->") { err(n + 1, "«<!-- solo-equipo -->» va justo debajo del encabezado de su sección"); continue; }
    if (!cur) { if (l.trim()) { if (primera) err(n + 1, "después de los metadatos empieza una sección «## …»"); primera = false; } continue; }
    cur.cuerpo.push(l);
  }
  if (!enVisto) err(L.length, "falta «## English» con la versión en inglés");
  for (const s of secciones) s.cuerpo = s.cuerpo.join("\n").replace(/^\n+|\s+$/g, "");
  const es = secciones.filter((s) => s.lang === "es"), en = secciones.filter((s) => s.lang === "en");
  if (es.length && !es.some((s) => s.cuerpo)) err(0, "las secciones en español están vacías");
  const enLargo = en.reduce((a, s) => a + s.cuerpo.length, 0);
  if (enVisto && enLargo < 200) err(0, `el inglés es muy corto (${enLargo} letras): «## English» lleva la ayuda en inglés`);
  const intro = en.find((s) => s.intro);
  if (intro && !intro.cuerpo) secciones.splice(secciones.indexOf(intro), 1);
  return { errores, meta, titulo, secciones, slug };
}

/* Lenguaje interno fuera de lo solo-equipo: [[línea, qué]]. Lo usan ayudaSinFaseInterna y el indexador. */
export function faseInterna(texto, archivo = "") {
  const r = leerAyuda(texto, archivo), out = [];
  const L = texto.split("\n");
  const enEquipo = new Set();
  const S = [...r.secciones].sort((a, b) => a.linea - b.linea);
  S.forEach((s, k) => { if (s.equipo) for (let n = s.linea; n < (S[k + 1]?.linea ?? L.length + 1); n++) enEquipo.add(n); });
  L.forEach((l, k) => {
    if (enEquipo.has(k + 1)) return;
    for (const [re, que] of FASE_INTERNA) if (re.test(l)) { out.push([k + 1, que]); break; }
  });
  return out;
}

/* Trozos para el índice (help_chunks): por sección, ≤ TROZO_MAX letras, cortando por párrafos o renglones de lista. */
export function trozos(secciones) {
  const out = [];
  secciones.forEach((s, sec) => {
    const piezas = [];
    for (const par of s.cuerpo.split(/\n{2,}/)) {
      if (par.length <= TROZO_MAX) { piezas.push(par); continue; }
      let acc = "";
      for (const ln of par.split(/\n(?=[-*|] |\d+\. )/)) {
        if (acc && acc.length + ln.length + 1 > TROZO_MAX) { piezas.push(acc); acc = ""; }
        if (ln.length > TROZO_MAX) { for (let k = 0; k < ln.length; k += TROZO_MAX) piezas.push(ln.slice(k, k + TROZO_MAX)); continue; }
        acc = acc ? acc + "\n" + ln : ln;
      }
      if (acc) piezas.push(acc);
    }
    let acc = "";
    const cerrar = () => { if (acc || !out.some((o) => o.sec === sec)) out.push({ sec, lang: s.lang, nivel: s.nivel, heading: s.heading, equipo: s.equipo, body: acc }); acc = ""; };
    for (const p of piezas) { if (acc && acc.length + p.length + 2 > TROZO_MAX) cerrar(); acc = acc ? acc + "\n\n" + p : p; }
    cerrar();
  });
  return out.map((o, ord) => ({ ...o, ord }));
}
