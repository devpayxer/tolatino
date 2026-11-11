#!/usr/bin/env node
/* 8i · Las capturas de las fichas de las tiendas (fase8-apps.md §4 8i; apps/mobile/tiendas/capturas.json). Con la semilla del sandbox, en ES y EN,
   de 5 a 8 por app, en el tamaño de cada tienda (Apple: iPhone 6.9" 1320×2868 con WebKit y el rótulo TLApp/{app}/ios; Google: teléfono 1080×2400
   con Chromium y TLApp/{app}/android). Cada app entra con su cuenta de la semilla por el código del MODO PRUEBAS (solo existe fuera de
   producción). Revisa en cada pantalla que ningún título ni botón quede cortado (texto más ancho que su caja) y que no haya una hoja encima.
   Escribe <salida>/<tienda>/<app>/<locale>/<orden>-<nombre>.png y <salida>/manifiesto.json (lo que el CI sube por la tubería).
   Uso: NODE_PATH=… node scripts/tiendas/capturas.mjs --base http://127.0.0.1:3100 --salida capturas-tiendas [--tiendas apple,google]
        [--apps cliente,negocio] [--idiomas es,en] [--solo-chromium]   (Playwright con chromium y webkit instalados) */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "../..");
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const BASE = arg("base", "http://127.0.0.1:3100").replace(/\/$/, ""), OUT = arg("salida", "capturas-tiendas");
const TIENDAS = arg("tiendas", "apple,google").split(","), IDIOMAS = arg("idiomas", "es,en").split(",");
const A = JSON.parse(readFileSync(join(REPO, "apps/mobile/apps.json"), "utf8")), C = JSON.parse(readFileSync(join(REPO, "apps/mobile/tiendas/capturas.json"), "utf8"));
const APPS = arg("apps", A.apps.map((a) => a.key).join(",")).split(",");
const LOCALE = { apple: { es: "es-MX", en: "en-US" }, google: { es: "es-US", en: "en-US" } };
// Apple 6.9": 440×956 pt ×3 = 1320×2868. Google: 360×800 dp ×3 = 1080×2400.
const PANTALLA = { apple: { width: 440, height: 956, escala: 3, motor: "webkit", ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148", plat: "ios" },
  google: { width: 360, height: 800, escala: 3, motor: "chromium", ua: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36", plat: "android" } };
// --solo-chromium: para correrlo donde no hay WebKit (la máquina local); el CI usa WebKit para Apple.
if (process.argv.includes("--solo-chromium")) PANTALLA.apple.motor = "chromium";
const pw = createRequire(import.meta.url)("playwright");
const fallos = [], hechas = [];

/* Entra con el código del modo pruebas (la misma página: la cookie de la sesión queda en el contexto). */
async function entrar(page, tel) {
  await page.goto(`${BASE}/ayuda`, { waitUntil: "domcontentloaded" });
  const r = await page.evaluate(async (telefono) => {
    const h = { "content-type": "application/json" };
    const a = await (await fetch("/api/cuenta/codigo", { method: "POST", headers: h, body: JSON.stringify({ telefono }) })).json();
    if (!a.codigoPrueba) return { ok: false, paso: "codigo", a };
    const b = await (await fetch("/api/cuenta/verificar", { method: "POST", headers: h, body: JSON.stringify({ telefono, codigo: a.codigoPrueba }) })).json();
    return { ok: !!b.ok, paso: "verificar", b };
  }, tel);
  if (!r.ok) throw new Error(`no entró ${tel}: ${JSON.stringify(r).slice(0, 160)}`);
}
/* Lo que se ve cortado: títulos, botones y filas cuyo texto es más ancho que su caja (con «…» o escondido). */
const CORTADOS = `(() => { const out = []; for (const e of document.querySelectorAll('h1,h2,h3,button,[role=button],[role=tab],a')) {
  const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || !e.offsetParent) continue;
  const r = e.getBoundingClientRect(); if (r.width < 4 || r.height < 4 || r.top < 0 || r.bottom > innerHeight - 110) continue;
  if (e.scrollWidth > e.clientWidth + 2 && (s.textOverflow === 'ellipsis' || s.overflow === 'hidden' || s.overflowX === 'hidden')) out.push((e.innerText || '').trim().slice(0, 60)); }
  return out.filter(Boolean); })()`;
/* Quita la hoja previa de permisos si sale (la captura muestra la app, no la hoja). */
async function sinHoja(page) {
  for (const t of ["Ahora no", "Not now"]) { const b = page.getByRole("button", { name: t, exact: true }); if (await b.count().catch(() => 0)) await b.first().click().catch(() => {}); }
}
/* Puerta: abre la primera puerta del día que se pueda abrir y devuelve la ruta de su sesión (o null). */
async function abrirPuerta(page, es) {
  await page.goto(`${BASE}/puerta`, { waitUntil: "networkidle" });
  const fila = page.getByText(es ? "ABRIR" : "OPEN", { exact: true }).first();
  if (!(await fila.count())) return null;
  await fila.click();
  await page.getByRole("button", { name: es ? "Abrir la puerta" : "Open the door" }).click();
  await page.waitForURL(/\/puerta\/s\/\d+/, { timeout: 15000 }).catch(() => {});
  return /\/puerta\/s\/\d+/.test(page.url()) ? new URL(page.url()).pathname : null;
}

// Una entrada por app (el código tiene su espera y su tope por hora): la sesión se reusa en cada tienda e idioma.
const sesiones = {};
let puertaAbierta = null; // la sesión de puerta que se abrió una vez (la misma cuenta en cada tienda e idioma)
const navegadores = {};
for (const tienda of TIENDAS) {
  const P = PANTALLA[tienda];
  navegadores[P.motor] ??= await pw[P.motor].launch();
  for (const app of APPS) for (const idioma of IDIOMAS) {
    const locale = LOCALE[tienda][idioma], es = idioma === "es";
    const ctx = await navegadores[P.motor].newContext({ viewport: { width: P.width, height: P.height }, deviceScaleFactor: P.escala, isMobile: P.motor === "chromium", hasTouch: true,
      userAgent: `${P.ua} TLApp/${app}/${P.plat}/${A.version} (1)`, locale: es ? "es-US" : "en-US", timezoneId: "America/New_York" });
    await ctx.addCookies([{ name: "tl_lang", value: idioma, url: BASE }]);
    const page = await ctx.newPage();
    let n = 0, puerta = null;
    try {
      // La entrada se hace en Chromium: WebKit no guarda una cookie «Secure» por http (el servidor del CI no tiene https), y luego la sesión
      // se pone en cada contexto sin «Secure» (solo en esta máquina, contra este servidor).
      if (!sesiones[app]) {
        navegadores.chromium ??= await pw.chromium.launch();
        const c0 = await navegadores.chromium.newContext(), p0 = await c0.newPage();
        await entrar(p0, C.cuentas[app]);
        sesiones[app] = (await c0.cookies()).filter((k) => k.name !== "tl_lang").map((k) => ({ ...k, secure: false }));
        await c0.close();
      }
      await ctx.addCookies(sesiones[app]);
      for (const t of C.tomas[app]) {
        let ruta = t.ruta;
        if (ruta.startsWith("@puerta")) { puerta ??= puertaAbierta ??= await abrirPuerta(page, es); if (!puerta) { fallos.push(`${tienda} ${app} ${locale}: ninguna puerta se puede abrir ahora (${t.nombre})`); continue; } ruta = puerta + ruta.slice(7); }
        await page.goto(`${BASE}${ruta}`, { waitUntil: "networkidle" });
        await sinHoja(page);
        await page.waitForTimeout(600);
        const url = new URL(page.url());
        if (url.pathname.startsWith("/entrar") || url.pathname.startsWith("/app/")) { fallos.push(`${tienda} ${app} ${locale} ${t.nombre}: terminó en ${url.pathname}`); continue; }
        const cortados = await page.evaluate(CORTADOS);
        if (cortados.length) fallos.push(`${tienda} ${app} ${locale} ${t.nombre}: texto cortado: ${cortados.slice(0, 3).join(" | ")}`);
        n++;
        const dir = join(OUT, tienda, app, locale), f = join(dir, `${n}-${t.nombre}.png`);
        mkdirSync(dir, { recursive: true });
        await page.screenshot({ path: f });
        hechas.push({ tienda, app, locale, orden: n, nombre: t.nombre, ruta, archivo: f.replace(`${OUT}/`, ""), ancho: P.width * P.escala, alto: P.height * P.escala, cortados: cortados.length });
      }
    } catch (e) { fallos.push(`${tienda} ${app} ${locale}: ${String(e?.message ?? e).slice(0, 200)}`); }
    if (n < 5) fallos.push(`${tienda} ${app} ${locale}: ${n} capturas (hacen falta de 5 a 8)`);
    await ctx.close();
  }
}
for (const b of Object.values(navegadores)) await b.close();
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "manifiesto.json"), JSON.stringify({ base: BASE, version: A.version, capturas: hechas, fallos }, null, 2) + "\n");
console.log(`${hechas.length} capturas en ${OUT} (${TIENDAS.join(", ")} · ${APPS.join(", ")} · ${IDIOMAS.join(", ")})`);
for (const f of fallos) console.error(`✗ ${f}`);
process.exit(fallos.length ? 1 : 0);
