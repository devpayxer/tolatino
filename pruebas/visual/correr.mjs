#!/usr/bin/env node
/* 9b-2 · Las pantallas clave (pruebas/visual/pantallas.json) en UN dispositivo: captura contra la aprobada, axe (WCAG AA) y, a pedido, velocidad.
   Uso (con el servidor de :3100 y su base, como las pruebas de punta a punta):
     node pruebas/visual/correr.mjs --dispositivo iphone-15            compara con pruebas/visual/{pantalla}/{dispositivo}.png y corre axe
     node pruebas/visual/correr.mjs --dispositivo iphone-15 --aprobar  escribe las capturas como las aprobadas (entran por commit; se anotan en docs/REVISION.md)
     node pruebas/visual/correr.mjs --dispositivo pixel --velocidad    Web Vitals de laboratorio contra pruebas/velocidad/presupuesto.json
     --medir  (con --velocidad) imprime las cifras sin fallar: para fijar el presupuesto
     --solo inicio,ficha  solo esas pantallas
   Falla (código 1) si: una captura nueva no está aprobada · una captura difiere más de la tolerancia (comparar.cjs) · axe encuentra una violación
   seria o crítica que no esté en axe-conocidas.json (cada una con su destino) · una pantalla pasa de su presupuesto de velocidad.
   Salida en $PRUEBAS_SALIDA/visual/<dispositivo>/ (lo capturado, la diferencia y resultado.json): el CI la sube como artefacto.
   Sin secretos: la sesión entra con el código de modo pruebas (el servidor lo devuelve solo en TOLATINO_SMS_MODO=pruebas). */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const req = createRequire(import.meta.url);
const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ENT = req("../lib/entorno.cjs"), DISPS = req("../lib/dispositivos.cjs"), { compara } = req("./comparar.cjs");
const args = process.argv.slice(2), opt = (k) => { const i = args.indexOf(k); return i < 0 ? null : args[i + 1]; }, flag = (k) => args.includes(k);
const id = opt("--dispositivo"), disp = DISPS.de(id);
if (!disp) { console.error(`--dispositivo <${DISPS.IDS.join("|")}>`); process.exit(2); }
const pw = req("playwright"), { AxeBuilder } = req("@axe-core/playwright");
const BASE = ENT.B, SALIDA = join(ENT.S, "visual", id);
mkdirSync(SALIDA, { recursive: true });
const cfg = JSON.parse(readFileSync(join(RAIZ, "pruebas/visual/pantallas.json"), "utf8"));
const solo = opt("--solo")?.split(",");
const pantallas = cfg.pantallas.filter((p) => !solo || solo.includes(p.id));
const conocidas = JSON.parse(readFileSync(join(RAIZ, "pruebas/visual/axe-conocidas.json"), "utf8")).conocidas;
const presupuesto = JSON.parse(readFileSync(join(RAIZ, "pruebas/velocidad/presupuesto.json"), "utf8"));
const perfil = disp.tipo === "escritorio" ? "escritorio" : "telefono";

const sql = (q) => execFileSync("docker", ["exec", ENT.DB, "psql", "-U", "tolatino", "-d", "tolatino", "-At", "-c", q]).toString().trim();
/* Una pantalla se ve igual cada vez: sin animaciones ni cursor, y lo de fuera (fotos de Pexels, teselas) no entra (se corta: no es nuestro y cambia). */
const CSS = "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important;scroll-behavior:auto!important}";
const local = (u) => /^(http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/|data:|blob:)/.test(u);
const contexto = async (b) => {
  const base = { ...disp.desc, deviceScaleFactor: 1, locale: "es-US", timezoneId: "America/New_York", reducedMotion: "reduce" };
  const c = await b.newContext(base);
  await c.route("**/*", (r) => (local(r.request().url()) ? r.continue() : r.abort()));
  return c;
};
const entrar = async (c, tel) => {
  const p = await c.newPage();
  await p.goto(BASE + "/entrar");
  sql("delete from otp_codes");
  const j = (u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) })).json(), [u, b]);
  const a = await j("/api/cuenta/codigo", { telefono: tel });
  if (!a.codigoPrueba) throw new Error(`sin código de prueba para ${tel}: ${JSON.stringify(a)}`);
  await j("/api/cuenta/verificar", { telefono: tel, codigo: a.codigoPrueba });
  await p.close();
};
const abrir = async (c, ruta) => {
  const p = await c.newPage();
  await p.goto(BASE + ruta, { waitUntil: "load", timeout: 45000 });
  await p.addStyleTag({ content: CSS });
  await p.evaluate(() => document.fonts?.ready);
  await p.waitForTimeout(1500);
  return p;
};
const VITALS = () => {
  window.__v = { lcp: 0, cls: 0, tbt: 0 };
  const ver = (tipo, f) => { try { new PerformanceObserver((l) => l.getEntries().forEach(f)).observe({ type: tipo, buffered: true }); } catch { /* el motor no lo da */ } };
  ver("largest-contentful-paint", (e) => { window.__v.lcp = e.startTime; });
  ver("layout-shift", (e) => { if (!e.hadRecentInput) window.__v.cls += e.value; });
  ver("longtask", (e) => { window.__v.tbt += Math.max(0, e.duration - 50); });
};
const mediana = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

const fallos = [], resumen = [];
const falla = (m) => { fallos.push(m); console.log(`  ✗ ${m}`); };
const bien = (m) => console.log(`  ✓ ${m}`);
const sesiones = new Map();
const navegador = await pw[disp.motor].launch();
console.log(`${disp.nombre} (${id}, ${disp.motor}) · ${pantallas.length} pantallas${flag("--velocidad") ? " · velocidad" : flag("--aprobar") ? " · APROBAR capturas nuevas" : ""}`);
try {
  for (const pa of pantallas) {
    console.log(`\n${pa.id} (${pa.ruta})`);
    const llave = pa.cuenta ?? "anonimo";
    if (!sesiones.has(llave)) { const c = await contexto(navegador); if (pa.cuenta) await entrar(c, pa.cuenta); sesiones.set(llave, c); }
    const c = sesiones.get(llave);
    if (flag("--velocidad")) {
      const lim = presupuesto.pantallas?.[pa.id]?.[perfil];
      if (disp.motor !== "chromium") { falla(`${pa.id}: la velocidad solo se mide en Chromium (LCP y TBT)`); continue; }
      const m = { lcp: [], cls: [], tbt: [] };
      for (let i = 0; i < 3; i++) {
        const cx = await contexto(navegador);
        if (pa.cuenta) await entrar(cx, pa.cuenta);
        const p = await cx.newPage(); await p.addInitScript(VITALS);
        await p.goto(BASE + pa.ruta, { waitUntil: "load", timeout: 45000 }); await p.waitForTimeout(3000);
        const v = await p.evaluate(() => window.__v); m.lcp.push(v.lcp); m.cls.push(v.cls); m.tbt.push(v.tbt);
        await cx.close();
      }
      const r = { lcp: Math.round(mediana(m.lcp)), cls: +mediana(m.cls).toFixed(3), tbt: Math.round(mediana(m.tbt)) };
      resumen.push({ pantalla: pa.id, ...r });
      console.log(`  LCP ${r.lcp} ms · CLS ${r.cls} · TBT ${r.tbt} ms  (mediana de 3, ${perfil})${lim ? ` · presupuesto ${lim.lcp} ms · ${lim.cls} · ${lim.tbt} ms` : ""}`);
      if (flag("--medir")) continue;
      if (!lim) { falla(`${pa.id}: no tiene presupuesto de velocidad (${perfil}) en pruebas/velocidad/presupuesto.json`); continue; }
      if (r.lcp > lim.lcp) falla(`${pa.id}: LCP ${r.lcp} ms pasa del presupuesto (${lim.lcp} ms)`); else bien(`LCP dentro del presupuesto`);
      if (r.cls > lim.cls) falla(`${pa.id}: CLS ${r.cls} pasa del presupuesto (${lim.cls})`); else bien(`CLS dentro del presupuesto`);
      if (r.tbt > lim.tbt) falla(`${pa.id}: TBT ${r.tbt} ms pasa del presupuesto (${lim.tbt} ms)`); else bien(`TBT dentro del presupuesto`);
      continue;
    }
    const p = await abrir(c, pa.ruta);
    if (pa.cuenta && /\/entrar/.test(p.url())) { falla(`${pa.id}: la sesión no entró (terminó en /entrar)`); await p.close(); continue; }
    // ── Captura
    const aprobada = join(RAIZ, "pruebas/visual", pa.id, `${id}.png`);
    const buf = await p.screenshot({ type: "png", animations: "disabled", caret: "hide" });
    writeFileSync(join(SALIDA, `${pa.id}.png`), buf);
    if (flag("--aprobar")) { mkdirSync(dirname(aprobada), { recursive: true }); writeFileSync(aprobada, buf); bien(`captura aprobada escrita (${(buf.length / 1024).toFixed(0)} KB)`); }
    else if (!existsSync(aprobada)) falla(`${pa.id}/${id}: captura nueva sin aprobar (pruebas/visual/${pa.id}/${id}.png no existe: se aprueba en docs/REVISION.md y entra por commit)`);
    else {
      const r = compara(buf, readFileSync(aprobada));
      if (r.diff) writeFileSync(join(SALIDA, `${pa.id}.diff.png`), r.diff);
      if (r.ok) bien(`igual a la aprobada (${(r.ratio * 100).toFixed(3)} % distinto)`); else falla(`${pa.id}/${id}: ${r.razon}`);
    }
    // ── axe (WCAG 2.x A y AA): lo serio o crítico frena; lo que ya se sabía lleva su destino en axe-conocidas.json
    const axe = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    const graves = axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    const nuevas = graves.filter((v) => !conocidas.some((k) => k.regla === v.id && (k.pantallas === "*" || k.pantallas.includes(pa.id))));
    resumen.push({ pantalla: pa.id, axe: graves.map((v) => ({ regla: v.id, impacto: v.impact, nodos: v.nodes.length, conocida: !nuevas.includes(v) })) });
    if (!nuevas.length) bien(`axe: ${graves.length ? `${graves.length} conocidas (con destino), ninguna nueva` : "sin violaciones serias ni críticas"}`);
    for (const v of nuevas) falla(`${pa.id}: axe ${v.id} (${v.impact}, ${v.nodes.length} nodos) · ${v.help} · ${v.nodes.slice(0, 2).map((n) => n.target.join(" ")).join(" | ")}`);
    await p.close();
  }
} catch (e) { falla(`la corrida se cayó: ${String(e.stack ?? e).split("\n").slice(0, 4).join(" · ")}`); }
await navegador.close();
writeFileSync(join(SALIDA, "resultado.json"), JSON.stringify({ dispositivo: id, fecha: new Date().toISOString(), fallos, resumen }, null, 2));
console.log(`\n${fallos.length ? `✗ ${fallos.length} fallo(s)` : "✓ todo en orden"} · ${join(SALIDA)}`);
process.exit(fallos.length ? 1 : 0);
