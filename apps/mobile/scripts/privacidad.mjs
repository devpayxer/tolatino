#!/usr/bin/env node
/* 8i · Las tres salidas de privacidad desde UN inventario real (apps/mobile/inventario-datos.json; fase8-apps.md §3.6, §4 8i; guardián
   privacidadCoherente):
     - las etiquetas de privacidad de Apple por app (apps/mobile/tiendas/privacidad/apple-{app}.json; Apple App Privacy NO está en la API:
       el fundador las toca en App Store Connect con la pantalla lado a lado de Sistema › Apps › Declaraciones),
     - el CSV de Data safety de Google por app (apps/mobile/tiendas/privacidad/data-safety-{app}.csv, con las preguntas y respuestas de la
       plantilla de Play Console; los identificadores «PSL_…» van «(a verificar)» con la plantilla del día),
     - el PrivacyInfo.xcprivacy de cada target (lo escribe generar.mjs con xcprivacy() de aquí: los tipos de datos y las API de razón
       requerida que de verdad usa ese target),
     - la semilla repetible packages/db/seeds/inventario_datos.sql (tabla data_inventory) y salidas.json (lo mismo junto, para el servidor). La sección de datos de /privacidad importa el
       mismo inventario (apps/web/app/(app)/privacidad).
   Uso: node apps/mobile/scripts/privacidad.mjs              escribe las salidas
        node apps/mobile/scripts/privacidad.mjs --verificar  no escribe: falla si una salida no es la que sale del inventario */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const MOVIL = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPO = join(MOVIL, "../..");
export const ARCHIVO = "apps/mobile/inventario-datos.json";
export const leerInventario = (raiz = REPO) => JSON.parse(readFileSync(join(raiz, ARCHIVO), "utf8"));
const A = () => JSON.parse(readFileSync(join(MOVIL, "apps.json"), "utf8"));

/* Las columnas que el guardián considera personales por su nombre (en create table / add column de las migraciones). */
export const PATRON_PERSONAL = /^(phone|\w+_phone|phone_\w+|email|\w+_email|geom|\w+_geom|lat|lng|latitude|longitude|first_name|last_name|full_name|birth\w*|dob|address\w*|street\w*|photo\w*|\w+_photo\w*|body|message|selfie\w*|ssn|license\w*|plate)$/;
export function columnasPersonales(raiz = REPO) {
  const D = join(raiz, "packages/db/migrations"), out = new Map();
  for (const f of readdirSync(D).filter((x) => x.endsWith(".sql")).sort()) {
    const t = readFileSync(join(D, f), "utf8");
    for (const m of t.matchAll(/create table if not exists (\w+)\s*\(([\s\S]*?)\n\);/g))
      for (const l of m[2].split("\n")) { const c = l.trim().split(/\s+/)[0]; if (c && PATRON_PERSONAL.test(c)) out.set(`${m[1]}.${c}`, f); }
    for (const m of t.matchAll(/alter table (\w+) add column if not exists (\w+)/g)) if (PATRON_PERSONAL.test(m[2])) out.set(`${m[1]}.${m[2]}`, f);
  }
  return out;
}
/* Todas las columnas de las migraciones (para comprobar que lo que cita el inventario existe). */
export function columnasTodas(raiz = REPO) {
  const D = join(raiz, "packages/db/migrations"), out = new Set();
  for (const f of readdirSync(D).filter((x) => x.endsWith(".sql")).sort()) {
    const t = readFileSync(join(D, f), "utf8");
    for (const m of t.matchAll(/create table if not exists (\w+)\s*\(([\s\S]*?)\n\);/g)) for (const l of m[2].split("\n")) { const c = l.trim().split(/[\s,]+/)[0]; if (/^[a-z_][a-z0-9_]*$/.test(c ?? "")) out.add(`${m[1]}.${c}`); }
    for (const m of t.matchAll(/alter table (\w+) add column if not exists (\w+)/g)) out.add(`${m[1]}.${m[2]}`);
  }
  return out;
}

const CLAVES = ["cliente", "negocio", "delivery", "checkin"];
const huella = (s) => createHash("sha256").update(s).digest("hex");
const de = (I, app) => I.categorias.filter((c) => c.apps.includes(app));

/* Lo que se declara a Apple por app: un tipo una vez (si dos categorías comparten tipo, se unen sus propósitos). */
export function appleDe(I, app) {
  const m = new Map();
  for (const c of de(I, app)) {
    const p = [...new Set(c.propositos.map((k) => I.propositos[k].apple))];
    const ya = m.get(c.apple.tipo);
    if (ya) { ya.propositos = [...new Set([...ya.propositos, ...p])]; ya.de.push(c.key); ya.ligado ||= c.ligado; }
    else m.set(c.apple.tipo, { tipo: c.apple.tipo, categoria: c.apple.categoria, ligado: c.ligado, rastreo: false, propositos: p, de: [c.key] });
  }
  return [...m.values()].map((x) => ({ ...x, propositos: x.propositos.sort() }));
}
/* Lo mismo para Google: un tipo una vez; opcional solo si todas sus categorías lo son. */
export function googleDe(I, app) {
  const m = new Map();
  for (const c of de(I, app)) {
    const p = [...new Set(c.propositos.map((k) => I.propositos[k].google))];
    const ya = m.get(c.google.tipo);
    if (ya) { ya.propositos = [...new Set([...ya.propositos, ...p])]; ya.opcional &&= c.opcional; ya.de.push(c.key); }
    else m.set(c.google.tipo, { tipo: c.google.tipo, categoria: c.google.categoria, opcional: c.opcional, propositos: p, de: [c.key] });
  }
  return [...m.values()].map((x) => ({ ...x, propositos: x.propositos.sort() }));
}

/* Las API de razón requerida que usa cada target (iOS): UserDefaults solo en el plugin TLLocal (CA92.1: datos de la propia app). Capacitor
   trae su propio manifiesto en su paquete. */
export function apiDe(app) {
  const a = A().apps.find((x) => x.key === app);
  return a?.plugins.includes("TLLocal") ? [{ tipo: "NSPrivacyAccessedAPICategoryUserDefaults", razones: ["CA92.1"] }] : [];
}
/* El PrivacyInfo.xcprivacy de un target (lo escribe generar.mjs). Sin rastreo y sin dominios de rastreo. */
export function xcprivacy(app, I = leerInventario()) {
  const tipos = appleDe(I, app), api = apiDe(app);
  const datos = tipos.map((t) => `\t\t<dict>
\t\t\t<key>NSPrivacyCollectedDataType</key>
\t\t\t<string>${t.tipo}</string>
\t\t\t<key>NSPrivacyCollectedDataTypeLinked</key>
\t\t\t<${t.ligado ? "true" : "false"}/>
\t\t\t<key>NSPrivacyCollectedDataTypeTracking</key>
\t\t\t<false/>
\t\t\t<key>NSPrivacyCollectedDataTypePurposes</key>
\t\t\t<array>
${t.propositos.map((p) => `\t\t\t\t<string>${p}</string>`).join("\n")}
\t\t\t</array>
\t\t</dict>`).join("\n");
  const apis = api.map((x) => `\t\t<dict>
\t\t\t<key>NSPrivacyAccessedAPIType</key>
\t\t\t<string>${x.tipo}</string>
\t\t\t<key>NSPrivacyAccessedAPITypeReasons</key>
\t\t\t<array>
${x.razones.map((r) => `\t\t\t\t<string>${r}</string>`).join("\n")}
\t\t\t</array>
\t\t</dict>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<!-- Generado por apps/mobile/scripts/generar.mjs desde apps/mobile/inventario-datos.json (privacidad.mjs). No editar a mano. -->
<plist version="1.0">
<dict>
\t<key>NSPrivacyTracking</key>
\t<false/>
\t<key>NSPrivacyTrackingDomains</key>
\t<array/>
\t<key>NSPrivacyCollectedDataTypes</key>
${tipos.length ? `\t<array>\n${datos}\n\t</array>` : "\t<array/>"}
\t<key>NSPrivacyAccessedAPITypes</key>
${api.length ? `\t<array>\n${apis}\n\t</array>` : "\t<array/>"}
</dict>
</plist>
`;
}

/* El CSV de Data safety (formato de la plantilla de Play Console: pregunta, respuesta, valor, requisito, la pregunta en palabras). */
const GRUPO = { "Personal info": "PSL_DATA_TYPES_PERSONAL", "Financial info": "PSL_DATA_TYPES_FINANCIAL", Location: "PSL_DATA_TYPES_LOCATION", "Photos and videos": "PSL_DATA_TYPES_PHOTOS_AND_VIDEOS",
  Messages: "PSL_DATA_TYPES_MESSAGES", "App activity": "PSL_DATA_TYPES_APP_ACTIVITY", "App info and performance": "PSL_DATA_TYPES_APP_PERFORMANCE", "Device or other IDs": "PSL_DATA_TYPES_IDENTIFIERS" };
const csv = (xs) => xs.map((x) => (/[",\n]/.test(String(x)) ? `"${String(x).replace(/"/g, '""')}"` : String(x))).join(",");
export function dataSafety(I, app) {
  const G = googleDe(I, app), L = [csv(["Question ID (machine readable)", "Response ID (machine readable)", "Response value", "Answer requirement", "Human-friendly question label"])];
  L.push(csv(["PSL_DATA_COLLECTION_COLLECTS_PERSONAL_DATA", "", "true", "REQUIRED", "Does your app collect or share any of the required user data types?"]));
  L.push(csv(["PSL_DATA_COLLECTION_ENCRYPTED_IN_TRANSIT", "", String(I.cifradoEnTransito === true), "REQUIRED", "Is all of the user data collected by your app encrypted in transit?"]));
  L.push(csv(["PSL_DATA_COLLECTION_USER_REQUEST_DELETE", "PSL_DATA_DELETION_WITH_ACCOUNT", "true", "REQUIRED", "Do you provide a way for users to request that their data is deleted?"]));
  for (const g of [...new Set(G.map((x) => x.categoria))]) for (const t of G.filter((x) => x.categoria === g)) L.push(csv([GRUPO[g] ?? "PSL_DATA_TYPES_OTHER", t.tipo, "true", "MULTIPLE_CHOICE", `Data types · ${g}`]));
  for (const t of G) {
    const q = `PSL_DATA_USAGE_RESPONSES:${t.tipo}`;
    L.push(csv([`${q}:PSL_DATA_USAGE_COLLECTION_AND_SHARING`, "PSL_DATA_USAGE_ONLY_COLLECTED", "true", "MULTIPLE_CHOICE", `${t.tipo} · collected, not shared`]));
    L.push(csv([`${q}:PSL_DATA_USAGE_EPHEMERAL`, "", "false", "SINGLE_CHOICE", `${t.tipo} · processed ephemerally?`]));
    L.push(csv([`${q}:DATA_USAGE_USER_CONTROL`, t.opcional ? "PSL_DATA_USAGE_USER_CONTROL_OPTIONAL" : "PSL_DATA_USAGE_USER_CONTROL_REQUIRED", "true", "SINGLE_CHOICE", `${t.tipo} · required or optional`]));
    for (const p of t.propositos) L.push(csv([`${q}:DATA_USAGE_COLLECTION_PURPOSE`, p, "true", "MULTIPLE_CHOICE", `${t.tipo} · why it is collected`]));
  }
  return L.join("\n") + "\n";
}

/* La vista de las etiquetas de Apple (como las pregunta App Store Connect: datos para rastrearte, ligados a ti, no ligados). */
export function etiquetasApple(I, app) {
  const T = appleDe(I, app);
  return JSON.stringify({ $fuente: `Generado por apps/mobile/scripts/privacidad.mjs desde ${ARCHIVO}. No editar a mano.`, app, version: I.version,
    datosParaRastrearte: [], datosLigadosATi: T.filter((t) => t.ligado).map(({ tipo, categoria, propositos, de: d }) => ({ categoria, tipo, propositos, de: d })),
    datosNoLigadosATi: T.filter((t) => !t.ligado).map(({ tipo, categoria, propositos, de: d }) => ({ categoria, tipo, propositos, de: d })) }, null, 2) + "\n";
}

const sq = (s) => `'${String(s).replace(/'/g, "''")}'`;
const arr = (xs) => `array[${xs.map(sq).join(", ")}]::text[]`;
export function semilla(I, fuente) {
  const h = huella(fuente);
  const filas = I.categorias.map((c) => `  (${sq(c.key)}, ${sq(JSON.stringify(c.label))}::jsonb, ${sq(c.apple.tipo)}, ${sq(c.apple.categoria)}, ${sq(c.google.categoria)}, ${sq(c.google.tipo)}, ${arr(c.propositos)}, ${c.ligado}, false, ${c.opcional}, ${arr(c.apps)}, ${arr(c.tablas)}, ${sq(JSON.stringify(c.guarda))}::jsonb, ${sq(h)})`);
  return `-- Generado por apps/mobile/scripts/privacidad.mjs desde ${ARCHIVO} (versión ${I.version}). No editar a mano: se edita el inventario.
-- Semilla repetible (configuración real, no datos de ejemplo): el inventario de datos en data_inventory (0132). Lo que sale del inventario se
-- retira (retired_at), no se borra.
begin;
insert into data_inventory (key, label, apple_type, apple_category, google_category, google_type, purposes, linked, tracking, optional, apps, tables, retention, source_sha256) values
${filas.join(",\n")}
on conflict (key) do update set label = excluded.label, apple_type = excluded.apple_type, apple_category = excluded.apple_category, google_category = excluded.google_category,
  google_type = excluded.google_type, purposes = excluded.purposes, linked = excluded.linked, optional = excluded.optional, apps = excluded.apps, tables = excluded.tables,
  retention = excluded.retention, source_sha256 = excluded.source_sha256, retired_at = null;
update data_inventory set retired_at = now() where retired_at is null and key not in (${I.categorias.map((c) => sq(c.key)).join(", ")});
commit;
`;
}

/* Todo lo que sale del inventario (ruta relativa al repo → contenido). El xcprivacy lo escribe generar.mjs (es parte de lo nativo). */
export function salidas(raiz = REPO) {
  const fuente = readFileSync(join(raiz, ARCHIVO), "utf8"), I = JSON.parse(fuente), out = new Map();
  for (const app of CLAVES) {
    out.set(`apps/mobile/tiendas/privacidad/apple-${app}.json`, etiquetasApple(I, app));
    out.set(`apps/mobile/tiendas/privacidad/data-safety-${app}.csv`, dataSafety(I, app));
  }
  out.set("packages/db/seeds/inventario_datos.sql", semilla(I, fuente));
  // Lo mismo, junto, para el servidor (Sistema › Apps › Declaraciones y la descarga del CSV): una sola fuente, nada recalculado en la web.
  out.set("apps/mobile/tiendas/privacidad/salidas.json", JSON.stringify({ $fuente: `Generado por apps/mobile/scripts/privacidad.mjs desde ${ARCHIVO}. No editar a mano.`, version: I.version,
    apple: Object.fromEntries(CLAVES.map((a) => [a, appleDe(I, a)])), google: Object.fromEntries(CLAVES.map((a) => [a, googleDe(I, a)])),
    csv: Object.fromEntries(CLAVES.map((a) => [a, dataSafety(I, a)])) }, null, 1) + "\n");
  return out;
}

/* Los problemas del inventario en sí (vacío = bien): forma, rastreo, propósitos, apps, tablas que existen, cobertura de columnas personales. */
export function problemas(raiz = REPO) {
  const out = [], I = leerInventario(raiz), todas = columnasTodas(raiz);
  if (I.rastreo !== false) out.push("el inventario dice que hay rastreo: To'Latino no rastrea (§3.6)");
  const vistos = new Set(), citadas = new Set();
  for (const c of I.categorias ?? []) {
    if (!/^[a-z][a-z_]{2,39}$/.test(c.key ?? "") || vistos.has(c.key)) out.push(`categoría con clave mala o repetida: ${c.key}`);
    vistos.add(c.key);
    if (!c.label?.es || !c.label?.en || !c.uso?.es || !c.uso?.en || !c.guarda?.es || !c.guarda?.en) out.push(`${c.key}: falta el texto ES/EN (label, uso o guarda)`);
    if (!/^NSPrivacyCollectedDataType[A-Za-z]+$/.test(c.apple?.tipo ?? "") || !c.apple?.categoria) out.push(`${c.key}: tipo o categoría de Apple`);
    if (!/^PSL_[A-Z_]+$/.test(c.google?.tipo ?? "") || !GRUPO[c.google?.categoria]) out.push(`${c.key}: tipo o categoría de Google`);
    if (!c.propositos?.length || c.propositos.some((p) => !I.propositos[p])) out.push(`${c.key}: propósito que no existe`);
    if (typeof c.ligado !== "boolean" || typeof c.opcional !== "boolean") out.push(`${c.key}: ligado y opcional son sí o no`);
    if ("rastreo" in c && c.rastreo !== false) out.push(`${c.key}: rastreo`);
    if (!c.apps?.length || c.apps.some((a) => !CLAVES.includes(a))) out.push(`${c.key}: apps`);
    for (const t of c.tablas ?? []) { if (!todas.has(t)) out.push(`${c.key}: ${t} no existe en las migraciones`); citadas.add(t); }
  }
  for (const [k] of Object.entries(I.noPersonales ?? {})) if (!todas.has(k)) out.push(`noPersonales: ${k} no existe en las migraciones`);
  for (const [col, f] of columnasPersonales(raiz)) if (!citadas.has(col) && !(col in (I.noPersonales ?? {}))) out.push(`${col} (${f}) parece un dato personal y no está en el inventario: súmalo a una categoría o a noPersonales con su porqué`);
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const verificar = process.argv.includes("--verificar");
  const p = problemas();
  if (p.length) { for (const x of p) console.error(`✗ ${x}`); process.exit(1); }
  let mal = 0;
  for (const [r, c] of salidas()) {
    const f = join(REPO, r);
    if (verificar) { if (!existsSync(f) || readFileSync(f, "utf8") !== c) { console.error(`✗ ${r} no es lo que sale del inventario (corre: node apps/mobile/scripts/privacidad.mjs)`); mal++; } }
    else { mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, c); }
  }
  if (mal) process.exit(1);
  console.log(verificar ? "✓ las salidas de privacidad coinciden con el inventario" : "✓ salidas de privacidad generadas desde el inventario");
}
