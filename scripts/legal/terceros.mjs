#!/usr/bin/env node
/* Guardián tercerosDeclarados · la lista cerrada de las empresas que reciben datos (docs/legal/terceros.json) contra el código y contra lo que
   el producto dice. Clase: «un texto dice que un dato no sale y el código lo manda» (20 nov: Privacidad e Inteligencia artificial decían que la
   revisión de fotos no salía a otra empresa; desde la decisión AJ la segunda opinión manda una versión reducida a Anthropic).
   Cuatro comprobaciones (todo sale del repo, sin red ni base):
   1. La lista tiene la forma (cada empresa: id, nombre, hosts, señales, qué recibe en ES y EN, qué palabras de Privacidad la nombran).
   2. Cada «señal» de la lista (su host, su variable de entorno) existe en el código: si una señal ya no encuentra nada, el guardián estaría ciego.
   3. Todo host que el código del producto usa (apps/web, las apps, los servicios, producción, las semillas) está en la lista (por sus hosts) o en
      «sinDatos» con su motivo. Un cliente nuevo de otra empresa sin declarar rompe aquí.
   4. Privacidad (y, donde la lista dice «ia», Inteligencia artificial) dicen en español y en inglés lo que la lista dice que sale a cada empresa
      (las palabras de «privacidad» e «ia»); y ninguna página legal, ficha de ayuda ni cadena del producto dice que un dato «no sale» o «no va a otra
      empresa» (un «tema» de la lista) sin decir a la vez lo que sale («salvo»). Y nadie promete retención cero de Anthropic mientras la lista diga
      «pendiente».
   Lo usa el guardián de guardianes/run.mjs (sin dependencias: solo node). Al revés: pruebas/alreves/alrevesTercerosLegales.cjs. */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const LISTA = "docs/legal/terceros.json";
// Donde el producto habla con otras empresas (código que corre, no herramientas de desarrollo ni pruebas).
const CLIENTES = ["apps/web/app", "apps/web/lib", "apps/web/next.config.ts", "apps/mobile/scripts", "apps/mobile/plugins", "apps/mobile/android", "apps/mobile/ios", "services", "infra/produccion", "packages/db/seeds"];
const EXT_CLIENTE = /\.(tsx?|mjs|cjs|js|sh|ya?ml|conf|sql|swift|kt|java|xml|plist|gradle)$/;
// «public» dentro de las cáscaras nativas es la copia generada de la web (fuera del repo: apps/mobile/*/.gitignore); su fuente ya se revisa en apps/web.
const SALTAR = /(^|\/)(node_modules|\.next|build|Pods|\.gradle|\.git|Targets\/[^/]+\/public|assets\/public)(\/|$)/;
// Lo que el producto le dice a la gente: la letra legal, la ayuda (la lee El Compa) y las cadenas de la interfaz.
const TEXTOS_MD = ["docs/legal", "docs/ayuda"];
const TEXTOS_JSON = ["apps/web/lib/cms-cadenas.json", "apps/web/lib/cms-cadenas-e2.json"];
// «Esto no sale / no va a otra empresa», en español y en inglés.
const NEGACION = new RegExp([
  "\\bno\\s+sal(?:e|en)\\b", "\\bnunca\\s+sal(?:e|en)\\b", "\\bno\\s+se\\s+(?:manda|mandan|comparte|comparten|env[ií]a|env[ií]an|sube|suben)\\b", "\\bnunca\\s+se\\s+(?:manda|mandan|env[ií]a|env[ií]an)\\b",
  "\\bno\\s+(?:va|van)\\s+a\\s+(?:ning[uú]n|otra|otro|terceros)\\b", "\\bsin\\s+terceros\\b", "\\bning[uú]n\\s+(?:tercero|otro\\s+servicio)\\b", "\\bno\\s+de\\s+terceros\\b",
  "\\bno\\s+manda\\b", "\\bnunca\\s+manda\\b", "\\bnever\\s+(?:leaves?|goes?|go|sent|sends?)\\b", "\\b(?:does|do)\\s+not\\s+(?:leave|go\\s+to|send)\\b", "\\b(?:is|are)\\s+not\\s+sent\\b",
  "\\bno\\s+third[- ]part(?:y|ies)\\b", "\\bnot\\s+(?:a\\s+)?third[- ]part(?:y|ies)\\b", "\\bwithout\\s+third[- ]part(?:y|ies)\\b", "\\bany\\s+other\\s+(?:company|service)\\b",
  "\\bnever\\s+(?:to|reach(?:es)?)\\s+(?:a\\s+|any\\s+)?(?:third|other)\\b",
].join("|"), "i");
// «… a otra empresa / a terceros / fuera de nuestros servidores»: sin esto, «no sale en tu página» (una foto que no se ve) sería una afirmación de privacidad.
const FUERA = new RegExp([
  "otras?\\s+empresas?", "\\bterceros?\\b", "third[- ]part(?:y|ies)", "another\\s+compan(?:y|ies)", "other\\s+compan(?:y|ies)", "any\\s+other\\s+(?:company|service)", "otro\\s+servicio", "ning[uú]n\\s+otro",
  "servidores\\s+(?:propios|de\\s+To'Latino|nuestros)", "nuestros\\s+servidores", "(?:our|own|To'Latino's)\\s+(?:own\\s+)?servers", "de\\s+casa", "(?:sale|salen)\\s+de\\s+To'Latino", "leaves?\\s+To'Latino",
].join("|"), "i");
const RETENCION_CERO = /retenci[oó]n\s+cero|zero[- ]?(?:data[- ]?)?retention|\bZDR\b/i;
const CON_PENDIENTE = /\[(?:pendiente|pending)|se\s+pedir[aá]|ser[aá]\s+pedid|will\s+be\s+requested|se\s+pide\b|si\s+no\s+la\s+dan|if\s+not\s+granted|whether\s+zero|si\s+se\s+contrata/i;

const re = (s, flags = "i") => new RegExp(s, flags);
const leer = (r, f) => readFileSync(join(r, f), "utf8");
const lineas = (t) => t.replace(/\r/g, "").split("\n");

function caminar(raiz, rel, ext, out = []) {
  const ruta = join(raiz, rel);
  if (!existsSync(ruta) || SALTAR.test(rel)) return out;
  const s = statSync(ruta);
  if (s.isDirectory()) { for (const f of readdirSync(ruta).sort()) caminar(raiz, `${rel}/${f}`, ext, out); }
  else if (ext.test(rel)) out.push(rel);
  return out;
}
const esComentario = (l) => /^\s*(\/\/|\*|\/\*|#|--|<!--)/.test(l);
const hostDe = (h, lista) => lista.some((x) => h === x || h.endsWith(`.${x}`));

/* Los trozos de un texto que dicen UNA cosa: un punto de lista (con su continuación), una fila de tabla o un párrafo. Devuelve [{ linea, texto }]. */
export function trozos(t) {
  const out = []; let cur = null;
  const cerrar = () => { if (cur) out.push(cur); cur = null; };
  lineas(t).forEach((l, i) => {
    if (!l.trim()) return cerrar();
    if (/^\s*#/.test(l)) { cerrar(); return; }
    if (/^\s*(?:[-*]|\d+\.)\s/.test(l) || /^\s*\|/.test(l)) { cerrar(); cur = { linea: i + 1, texto: l.trim() }; if (/^\s*\|/.test(l)) cerrar(); return; }
    if (cur) cur.texto += " " + l.trim(); else cur = { linea: i + 1, texto: l.trim() };
  });
  cerrar();
  return out;
}

/* Revisa el repo. Devuelve [{ f, linea, msg }]. `raiz` es la raíz del repo (las pruebas al revés la cambian). */
export function revisarTerceros(raiz = RAIZ) {
  const err = [], falla = (f, linea, msg) => err.push({ f, linea, msg });
  if (!existsSync(join(raiz, LISTA))) return [{ f: LISTA, linea: 0, msg: "falta la lista cerrada de las empresas que reciben datos" }];
  let L;
  try { L = JSON.parse(leer(raiz, LISTA)); } catch (e) { return [{ f: LISTA, linea: 0, msg: `no es JSON: ${String(e.message).slice(0, 120)}` }]; }
  const T = Array.isArray(L.terceros) ? L.terceros : [], SD = Array.isArray(L.sinDatos) ? L.sinDatos : [];

  // 1 · La forma.
  const ids = new Set();
  const lista = (x) => Array.isArray(x) && x.length > 0 && x.every((s) => typeof s === "string" && s.trim());
  if (T.length < 8) falla(LISTA, 0, `la lista trae ${T.length} empresas y el producto habla con al menos 8 (Anthropic, Stripe, Telnyx, Meta, Amazon, Apple y Google, Pexels, Cloudflare): se leyó mal o se quitaron`);
  for (const t of T) {
    const n = `«${t?.id ?? "?"}»`;
    if (!t || typeof t.id !== "string" || typeof t.nombre !== "string") { falla(LISTA, 0, `una empresa sin id o sin nombre`); continue; }
    if (ids.has(t.id)) falla(LISTA, 0, `${n} repetida`); ids.add(t.id);
    if (!Array.isArray(t.hosts) || !t.hosts.every((h) => typeof h === "string" && /^[a-z0-9.-]+\.[a-z]{2,}$/.test(h))) falla(LISTA, 0, `${n}: «hosts» es una lista de dominios (puede ir vacía)`);
    if (!lista(t.senales)) falla(LISTA, 0, `${n}: «senales» (expresiones que la delatan en el código) no puede ir vacía`);
    for (const l of ["es", "en"]) {
      if (!lista(t.recibe?.[l])) falla(LISTA, 0, `${n}: «recibe» en ${l === "es" ? "español" : "inglés"} dice qué recibe (no vacío)`);
      if (!lista(t.privacidad?.[l])) falla(LISTA, 0, `${n}: «privacidad» en ${l} lista las palabras con que Privacidad la nombra (no vacío)`);
    }
    for (const x of t.temas ?? []) { try { re(x.patron); re(x.salvo); } catch { falla(LISTA, 0, `${n}: un «tema» con una expresión que no es válida`); } }
  }
  for (const s of SD) if (!lista(s?.hosts) || typeof s.motivo !== "string" || s.motivo.length < 10) falla(LISTA, 0, "cada entrada de «sinDatos» lleva sus hosts y su motivo");
  if (err.length) return err;

  // 2 y 3 · El código.
  const archivos = [...new Set(CLIENTES.flatMap((c) => caminar(raiz, c, EXT_CLIENTE)))];
  const declarados = T.flatMap((t) => t.hosts), ajenos = SD.flatMap((s) => s.hosts), todos = [...declarados, ...ajenos];
  const vistas = new Map(T.map((t) => [t.id, 0]));
  for (const f of archivos) {
    const txt = leer(raiz, f), ls = lineas(txt);
    ls.forEach((l, i) => {
      for (const t of T) if (t.senales.some((s) => re(s, "").test(l))) vistas.set(t.id, vistas.get(t.id) + 1);
      if (esComentario(l)) return;
      for (const m of l.matchAll(/https?:\/\/([a-z0-9][a-z0-9.-]*\.[a-z]{2,})/gi)) {
        const h = m[1].toLowerCase();
        if (!hostDe(h, todos)) falla(f, i + 1, `el código habla con «${h}» y esa empresa no está en ${LISTA} (ni en «sinDatos»): declara qué recibe, nómbrala en Privacidad y en docs/legal/para-el-abogado.md`);
      }
    });
  }
  for (const t of T) if (!vistas.get(t.id)) falla(LISTA, 0, `${t.id}: ninguna de sus señales (${t.senales.join(", ")}) aparece en el código: la lista o el guardián perdieron a esta empresa`);

  // 4 · Lo que dicen las páginas.
  const P = (l) => `docs/legal/us/privacidad.${l}.md`, I = (l) => `docs/legal/us/ia.${l}.md`;
  for (const l of ["es", "en"]) {
    for (const [pag, clave] of [[P(l), "privacidad"], [I(l), "ia"]]) {
      if (!existsSync(join(raiz, pag))) { falla(pag, 0, "falta la página"); continue; }
      // «Lo que cambió» no cuenta: lo que la página dice de verdad está en su cuerpo.
      const txt = leer(raiz, pag).replace(/\n## (?:Lo que cambió|What changed)\n[\s\S]*?(?=\n## )/, "\n").replace(/\s+/g, " ");
      for (const t of T) for (const p of t[clave]?.[l] ?? []) if (!re(p).test(txt)) falla(pag, 0, `${t.nombre}: la página no dice «${p}» (la lista dice que ${t.id} recibe: ${t.recibe[l][0].slice(0, 70)}…)`);
    }
  }
  // Ninguna página dice que «no sale» lo que la lista dice que sale.
  const textos = [];
  for (const d of TEXTOS_MD) for (const f of caminar(raiz, d, /\.md$/)) { if (/^docs\/legal\/para-el-/.test(f)) continue; textos.push([f, trozos(leer(raiz, f))]); }
  for (const f of TEXTOS_JSON) if (existsSync(join(raiz, f))) textos.push([f, lineas(leer(raiz, f)).map((x, i) => ({ linea: i + 1, texto: x })).filter((x) => x.texto.trim())]);
  for (const f of caminar(raiz, "apps/web/app", /\.tsx?$/).concat(caminar(raiz, "apps/web/lib", /\.tsx?$/))) textos.push([f, lineas(leer(raiz, f)).map((x, i) => ({ linea: i + 1, texto: x })).filter((x) => !esComentario(x.texto))]);
  for (const [f, ts] of textos) for (const { linea, texto } of ts) {
    if (NEGACION.test(texto) && FUERA.test(texto)) for (const t of T) for (const x of t.temas ?? []) if (re(x.patron).test(texto) && !re(x.salvo).test(texto))
      falla(f, linea, `dice que no sale lo que sale: «${texto.slice(0, 110)}…» (${t.nombre} recibe ${x.datos}; ${LISTA}). Di qué sale, cuándo y a quién, o nombra la excepción`);
    if (RETENCION_CERO.test(texto) && /^docs\/(legal\/us|ayuda)\//.test(f) && T.some((t) => t.id === "anthropic" && t.retencion !== "contratada") && !CON_PENDIENTE.test(texto))
      falla(f, linea, `habla de retención cero sin marcarla «[pendiente]»: ${LISTA} dice que la de Anthropic todavía no está contratada`);
  }
  return err;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const e = revisarTerceros();
  if (e.length) { console.error(`✗ terceros (${e.length}):\n` + e.map((x) => `  ${x.f}${x.linea ? ":" + x.linea : ""} — ${x.msg}`).join("\n")); process.exit(1); }
  console.log("✓ terceros: la lista, el código y los textos coinciden");
}
