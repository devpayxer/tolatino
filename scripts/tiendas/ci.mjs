#!/usr/bin/env node
/* 8h · El lado del CI de la tubería de las tiendas (.github/workflows/tiendas.yml; fase8-apps.md §3.5). Sin dependencias.
   - Ninguna llave vive en GitHub: el job pide a GitHub un token OIDC (audience tolatino-tiendas) y lo cambia en el servidor por SOLO las llaves de
     su job. Un token NUEVO por pedido (el servidor gasta cada jti una vez). El token se enmascara y nunca se imprime.
   - Solo por HTTPS: si la dirección no es https:// o el servidor no contesta con un certificado válido, NO se manda ningún token (sondeo → listo=no)
     y el job sigue sin llaves: compila y firma con una llave desechable «NO PARA DISTRIBUIR» (la hace el job y la borra), y no sube nada.
   - Las llaves se escriben en un directorio temporal del runner (modo 600) que el job borra al final con if: always().
   Uso:
     node scripts/tiendas/ci.mjs plan                         (APPS, PLAT, PEDIDO, RUN, INTENTO) → apps, ios, android, build, pedido, version
     node scripts/tiendas/ci.mjs sondeo                       → listo=si|no
     node scripts/tiendas/ci.mjs llaves --job ios|android --app A --dir D
     node scripts/tiendas/ci.mjs build --app A --plataforma P --canal C --build N --estado compilando|subido|fallo [--motivo M] [--pedido N]
     node scripts/tiendas/ci.mjs archivo --app A --canal C --build N --tipo apk|aab|simbolos --ruta R
     node scripts/tiendas/ci.mjs capturas --dir D       (8i: cada captura de D/manifiesto.json, con su app, tienda, idioma y orden)
   TIENDAS_URL: el servidor (por defecto el de pruebas de apps/mobile/apps.json). */
import { createHash } from "node:crypto";
import { appendFileSync, chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "../..");
const A = JSON.parse(readFileSync(join(RAIZ, "apps/mobile/apps.json"), "utf8"));
const BASE = (process.env.TIENDAS_URL || A.servidor.pruebas).replace(/\/$/, "");
const arg = (k) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] ?? "" : ""; };
const salida = (k, v) => { if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`); console.log(`  ${k}=${v}`); };
const falla = (m) => { console.error(`✗ ${m}`); process.exit(1); };

async function token() {
  const u = process.env.ACTIONS_ID_TOKEN_REQUEST_URL, t = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
  if (!u || !t) falla("este job no tiene permiso id-token: write (no hay token OIDC)");
  const r = await fetch(`${u}&audience=tolatino-tiendas`, { headers: { authorization: `bearer ${t}` }, signal: AbortSignal.timeout(15000) });
  const j = await r.json().catch(() => null);
  if (!r.ok || typeof j?.value !== "string") falla(`GitHub no dio el token OIDC (${r.status})`);
  console.log(`::add-mask::${j.value}`);
  return j.value;
}
/* Un pedido a la tubería, SIEMPRE por https y con un token nuevo. */
async function pedir(ruta, init) {
  if (!BASE.startsWith("https://")) falla(`la tubería solo habla por HTTPS y la dirección es ${BASE}`);
  const r = await fetch(BASE + ruta, { ...init, redirect: "error", signal: AbortSignal.timeout(init.timeout ?? 60000), headers: { ...(init.headers ?? {}), authorization: `Bearer ${await token()}` } });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, j };
}

const cmd = process.argv[2];
if (cmd === "plan") {
  const apps = process.env.APPS || "todas", plat = process.env.PLAT || "ambas", pedido = process.env.PEDIDO || "";
  const L = A.apps.filter((a) => apps === "todas" || a.key === apps);
  if (!L.length) falla(`app desconocida: ${apps}`);
  if (!["ambas", "ios", "android"].includes(plat)) falla(`plataforma desconocida: ${plat}`);
  if (pedido && !/^\d{1,18}$/.test(pedido)) falla("el pedido es un número");
  const run = Number(process.env.RUN || 0), intento = Number(process.env.INTENTO || 1);
  if (!Number.isInteger(run) || run < 1 || intento < 1 || intento > 99) falla("RUN e INTENTO");
  // El build: creciente con cada corrida de este flujo y cada reintento (el servidor y la base lo vuelven a exigir).
  salida("apps", JSON.stringify(L.map((a) => ({ key: a.key, sabor: a.sabor, target: a.target, android: a.android }))));
  salida("ios", String(plat !== "android"));
  salida("android", String(plat !== "ios"));
  salida("build", String(run * 100 + intento));
  salida("pedido", pedido);
  salida("version", A.version);
} else if (cmd === "sondeo") {
  // ¿Se puede mandar un token? Solo si la dirección es https y el servidor contesta con un certificado válido (fetch lo exige).
  let listo = false, por = "";
  if (!BASE.startsWith("https://")) por = `la dirección del servidor no es https (${BASE})`;
  else if (!process.env.ACTIONS_ID_TOKEN_REQUEST_URL) por = "este job no tiene permiso id-token: write";
  else {
    try { const r = await fetch(`${BASE}/`, { method: "HEAD", redirect: "manual", signal: AbortSignal.timeout(10000) }); listo = r.status > 0; }
    catch (e) { por = `${BASE} no contesta por HTTPS (${String(e?.cause?.code ?? e?.cause?.message ?? e?.message ?? e).slice(0, 80)})`; }
  }
  if (!listo) console.log(`::notice title=Tubería de las tiendas sin llaves::${por}. El servidor de pruebas todavía no tiene HTTPS con el dominio (Paquete 8-0): esta corrida compila y firma con una llave desechable (NO PARA DISTRIBUIR) y no sube nada. Ningún token OIDC salió del runner.`);
  else console.log(`✓ ${BASE} contesta por HTTPS: la tubería pide las llaves por OIDC`);
  salida("listo", listo ? "si" : "no");
} else if (cmd === "llaves") {
  const job = arg("job"), app = arg("app"), dir = arg("dir");
  if (!["ios", "android"].includes(job) || !A.apps.some((a) => a.key === app) || !dir) falla("--job ios|android --app A --dir D");
  const { status, j } = await pedir("/api/tiendas/oidc", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ job, app }) });
  if (status !== 200 || !j.ok) falla(`la tubería no entregó las llaves (${status} ${j.motivo ?? j.msg ?? ""})`);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const poner = (nombre, b64) => { const p = join(dir, nombre); writeFileSync(p, Buffer.from(b64, "base64"), { mode: 0o600 }); chmodSync(p, 0o600); return p; };
  for (const l of j.llaves) {
    if (l.tipo === "asc_api_key") { poner(`AuthKey_${l.meta.id_llave}.p8`, l.archivo); salida("asc_id", l.meta.id_llave); salida("asc_emisor", l.meta.emisor); }
    else if (l.tipo === "ios_dist_cert") { console.log(`::add-mask::${l.clave}`); poner("distribucion.p12", l.archivo); poner("distribucion.clave", Buffer.from(String(l.clave ?? "")).toString("base64")); }
    else if (l.tipo === "android_upload_keystore") {
      // La contraseña del almacén (derivada en el servidor) va a un archivo 600 del mismo directorio temporal, nunca a la salida del job.
      console.log(`::add-mask::${l.clave}`);
      poner("subida.p12", l.archivo); poner("subida.clave", Buffer.from(String(l.clave ?? "")).toString("base64")); salida("alias", l.meta.alias || "subida");
    }
    console.log(`  ✓ ${l.tipo} · huella ${String(l.huella).slice(0, 12)}…`);
  }
  if (j.equipo) salida("equipo", j.equipo);
  if (j.faltan.length) console.log(`::notice title=Faltan llaves en el llavero::${j.faltan.join(", ")} (Paquete 8-2)`);
  salida("hay", j.faltan.length ? "no" : "si");
} else if (cmd === "build") {
  const cuerpo = { app: arg("app"), plataforma: arg("plataforma"), canal: arg("canal"), version: A.version, build: Number(arg("build")), estado: arg("estado"), ...(arg("motivo") ? { motivo: arg("motivo") } : {}), ...(arg("pedido") ? { pedido: arg("pedido") } : {}) };
  const { status, j } = await pedir("/api/tiendas/build", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(cuerpo) });
  if (status >= 300 || !j.ok) falla(`la tubería no registró el build (${status} ${j.msg ?? j.motivo ?? ""})`);
  console.log(`✓ ${cuerpo.app} · ${cuerpo.canal} · ${A.version} (${cuerpo.build}) → ${j.estado}`);
} else if (cmd === "archivo") {
  const b = readFileSync(arg("ruta")), sha = createHash("sha256").update(b).digest("hex");
  const q = new URLSearchParams({ tipo: arg("tipo"), app: arg("app"), canal: arg("canal"), build: arg("build") });
  const { status, j } = await pedir(`/api/tiendas/archivo?${q}`, { method: "PUT", headers: { "content-type": "application/octet-stream", "x-tl-sha256": sha }, body: b, timeout: 600000 });
  if (status !== 200 || !j.ok) falla(`la tubería no guardó el archivo (${status} ${j.msg ?? j.motivo ?? ""})`);
  console.log(`✓ ${arg("tipo")} · ${(b.length / 1048576).toFixed(1)} MB · sha256 ${sha.slice(0, 12)}…${j.play ? ` · Play: ${j.play}` : ""}`);
} else if (cmd === "capturas") {
  // 8i · Las capturas de las fichas (scripts/tiendas/capturas.mjs): cada una con su propio token, al almacén privado (store_screenshots).
  const dir = arg("dir"), M = JSON.parse(readFileSync(join(dir, "manifiesto.json"), "utf8"));
  if (M.fallos?.length) falla(`las capturas tienen fallos: ${M.fallos.slice(0, 3).join(" · ")}`);
  for (const c of M.capturas) {
    const b = readFileSync(join(dir, c.archivo)), sha = createHash("sha256").update(b).digest("hex");
    const q = new URLSearchParams({ tipo: "captura", app: c.app, tienda: c.tienda, idioma: c.locale, orden: String(c.orden) });
    const { status, j } = await pedir(`/api/tiendas/archivo?${q}`, { method: "PUT", headers: { "content-type": "application/octet-stream", "x-tl-sha256": sha }, body: b, timeout: 120000 });
    if (status !== 200 || !j.ok) falla(`la tubería no guardó la captura ${c.archivo} (${status} ${j.msg ?? j.motivo ?? ""})`);
  }
  console.log(`✓ ${M.capturas.length} capturas guardadas`);
} else falla("plan | sondeo | llaves | build | archivo | capturas");
