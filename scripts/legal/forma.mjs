/* 9e · La forma única de un archivo de docs/legal/ (fase9-apertura.md §3.6 y §4 9e). La leen el indexador (scripts/legal/indexar.mjs) y los
   guardianes (legalUnaFuente, legalRevisado, idioma): una sola definición. EL REPO ES LA FUENTE, como la ayuda: ninguna página legal se escribe
   en un .tsx.

   docs/legal/{jurisdicción}/{clave}.{es,en}.md      jurisdicción: us (general) · us-pa (la adenda de Pennsylvania) · us-nj …
                                                     clave: una de CLAVES (la ruta pública es /{clave})
   # Título                                           ← la primera línea
                                                      ← en blanco
   _Clave: terminos. Jurisdicción: us. Idioma: es. Fecha del texto: 14 nov 2026. Estado del texto: BORRADOR — pendiente de revisión legal._
                                                      ← en blanco
   El resumen de la página (uno o varios renglones, sin «#»).
                                                      ← en blanco
   ## Lo que cambió   (en inglés: ## What changed)    ← siempre la primera sección: de 1 a 3 puntos «- …» (≤ 160 letras). Es lo que dice la
                                                        hoja «Aceptar los términos nuevos»; no sale en la página.
   ## … las secciones (## y ###), Markdown simple: párrafos, listas, tablas, **negrita** y enlaces solo internos ([texto](/ruta)).

   «Estado del texto» es «BORRADOR — pendiente de revisión legal» (lo redacta Claude) o «Revisado por {despacho} el {fecha}» (9s, el abogado).
   Los dos idiomas de una página van juntos (la misma versión): mismas secciones, en el mismo orden y con los mismos niveles. */

export const CLAVES = ["terminos", "privacidad", "cookies", "reglas", "verificamos", "votos", "seguridad", "ia", "dmca", "vivienda-justa", "accesibilidad"];
export const JURISDICCION = /^us(-[a-z]{2})?$/;
export const BORRADOR = "BORRADOR — pendiente de revisión legal";
export const REVISADO = /^Revisado por (.{3,120}) el (\d{1,2} (?:ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic) \d{4})$/;
const MESES = "ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic";
const META = new RegExp(`^_Clave: ([a-z-]+)\\. Jurisdicción: (us(?:-[a-z]{2})?)\\. Idioma: (es|en)\\. Fecha del texto: (\\d{1,2} (?:${MESES}) \\d{4})\\. Estado del texto: (.+?)\\._$`);
const CAMBIO = { es: "Lo que cambió", en: "What changed" };

/* Lee un archivo. Devuelve { errores: [[línea, msg]], meta, titulo, lead, resumen: string[], cuerpo, secciones: [{ nivel, heading }] }. */
export function leerLegal(texto, ruta = "") {
  const errores = [], err = (n, m) => errores.push([n, m]);
  const m0 = /(?:^|\/)docs\/legal\/([^/]+)\/([a-z-]+)\.(es|en)\.md$/.exec(ruta);
  if (ruta && !m0) err(0, "el archivo va en docs/legal/{jurisdicción}/{clave}.{es,en}.md");
  const [jur, clave, lang] = m0 ? [m0[1], m0[2], m0[3]] : [null, null, null];
  if (jur && !JURISDICCION.test(jur)) err(0, `jurisdicción «${jur}»: us, us-pa, us-nj…`);
  if (clave && !CLAVES.includes(clave)) err(0, `clave «${clave}»: ${CLAVES.join(", ")}`);
  const L = texto.replace(/\r/g, "").split("\n");
  const t = /^# (.+)$/.exec(L[0] ?? "");
  if (!t || / · /.test(t[1])) err(1, "la primera línea es el título «# …» (un solo idioma por archivo)");
  if ((L[1] ?? "") !== "") err(2, "una línea en blanco después del título");
  const mm = META.exec(L[2] ?? "");
  let meta = null;
  if (!mm) err(3, "los metadatos son «_Clave: … Jurisdicción: … Idioma: … Fecha del texto: 14 nov 2026. Estado del texto: …_»");
  else {
    meta = { clave: mm[1], jurisdiccion: mm[2], idioma: mm[3], fecha: mm[4], estado: mm[5] };
    if (clave && meta.clave !== clave) err(3, `la clave dice «${meta.clave}» y el archivo es ${clave}`);
    if (jur && meta.jurisdiccion !== jur) err(3, `la jurisdicción dice «${meta.jurisdiccion}» y la carpeta es ${jur}`);
    if (lang && meta.idioma !== lang) err(3, `el idioma dice «${meta.idioma}» y el archivo es .${lang}.md`);
    if (meta.estado !== BORRADOR && !REVISADO.test(meta.estado)) err(3, `«Estado del texto» es «${BORRADOR}» o «Revisado por {despacho} el {fecha}»`);
  }
  if ((L[3] ?? "") !== "") err(4, "una línea en blanco después de los metadatos");
  let i = 4;
  const lead = [];
  while (i < L.length && L[i].trim() && !/^#/.test(L[i])) lead.push(L[i++].trim());
  if (!lead.length) err(5, "después de los metadatos va el resumen de la página (un párrafo)");
  // Las secciones.
  const secciones = [], resumen = [];
  let cuerpoDesde = -1, enCambio = false, primera = true;
  for (let n = i; n < L.length; n++) {
    const l = L[n], h = /^(#{1,6}) (.+)$/.exec(l);
    if (/<[a-zA-Z!/]/.test(l)) err(n + 1, "sin HTML: Markdown simple");
    for (const x of l.matchAll(/\]\(([^)]*)\)/g)) if (!/^\/[a-z0-9\-/]*$/.test(x[1])) err(n + 1, `solo enlaces internos ([texto](/ruta)): «${x[1]}»`);
    if (h) {
      const nivel = h[1].length, txt = h[2].trim();
      if (nivel === 1) { err(n + 1, "un solo «# » (el título)"); continue; }
      if (nivel > 3) err(n + 1, "secciones «##» y «###»");
      if (primera) {
        primera = false;
        if (nivel !== 2 || (lang && txt !== CAMBIO[lang])) err(n + 1, `la primera sección es «## ${lang ? CAMBIO[lang] : "Lo que cambió"}»`);
        enCambio = true;
        continue;
      }
      if (enCambio) { enCambio = false; cuerpoDesde = n; }
      secciones.push({ nivel, heading: txt, linea: n + 1 });
      continue;
    }
    if (enCambio && l.trim()) {
      const p = /^- (.+)$/.exec(l);
      if (!p) err(n + 1, "«Lo que cambió» lleva solo puntos «- …»");
      else if (p[1].length > 160) err(n + 1, "cada punto de «Lo que cambió» ≤ 160 letras");
      else resumen.push(p[1].trim());
    }
  }
  if (!resumen.length || resumen.length > 3) err(0, `«Lo que cambió» lleva de 1 a 3 puntos (tiene ${resumen.length})`);
  if (!secciones.length) err(0, "después de «Lo que cambió» va al menos una sección «## …»");
  const cuerpo = cuerpoDesde >= 0 ? L.slice(cuerpoDesde).join("\n").replace(/\s+$/, "") + "\n" : "";
  return { errores, meta, clave, jur, lang, titulo: t ? t[1].trim() : null, lead: lead.join(" "), resumen, cuerpo, secciones };
}

/* Las dos mitades de una página: mismas secciones (en número, orden y nivel) en español y en inglés. */
export function parejaLegal(es, en) {
  const errores = [];
  if (es.secciones.length !== en.secciones.length) errores.push(`el español tiene ${es.secciones.length} secciones y el inglés ${en.secciones.length}`);
  else es.secciones.forEach((s, k) => { if (s.nivel !== en.secciones[k].nivel) errores.push(`la sección ${k + 1} («${s.heading}» / «${en.secciones[k].heading}») no tiene el mismo nivel`); });
  if (es.resumen.length !== en.resumen.length) errores.push("«Lo que cambió» no tiene los mismos puntos en los dos idiomas");
  if (es.meta && en.meta && (es.meta.fecha !== en.meta.fecha || es.meta.estado !== en.meta.estado)) errores.push("la fecha y el estado del texto son los mismos en los dos idiomas");
  return errores;
}
