#!/usr/bin/env node
/* 9a · Corre las pruebas de punta a punta (pruebas/e2e) y al revés (pruebas/alreves) contra el servidor local de :3100.
   Uso:
     node pruebas/correr.mjs evt6c adm7i          una o varias, por nombre
     node pruebas/correr.mjs --grupo fase6         un grupo (fase1 … fase8, varios, alreves); --grupo fase6,fase7 varios
     node pruebas/correr.mjs --todas               todas (orden9a): primero las al revés, luego fase por fase
     node pruebas/correr.mjs --lista               los grupos y lo que tiene cada uno
   Opciones:
     --servir             antes, construye y sirve (bash pruebas/servir/servir.sh completo)
     --desde <nombre>     empieza en esa (para retomar una corrida larga)
     --saltar a,b         no corre esas
     --paralelo           las al revés (tocan archivos del repo y corren los guardianes) en un carril y las de punta a punta (la base y
                          :3100) en otro: los dos carriles no se pisan. Dentro de cada carril, SIEMPRE una a la vez. Por defecto: todo en fila.
     --dispositivo <id>   9b-2 · corre con ese dispositivo (iphone-se, iphone-15, iphone-15-pro-max, pixel, galaxy, ipad, escritorio-1024/-1280/-1440):
                          pone PRUEBAS_DISPOSITIVO y la precarga pruebas/lib/dispositivo-precarga.cjs cambia cada contexto del navegador
     --reintentar         decisión AG (20 nov) · una prueba de punta a punta que falla se repite UNA vez: si pasa, queda como INESTABLE (en
                          verde, pero listada al final y en el resumen para arreglarla); si falla otra vez, es roja. Más de 3 inestables en
                          una corrida ya no se repiten: es algo de fondo y la corrida sale roja. Las pruebas al revés no se repiten.
     --parte <i>/<n>      9b-2 · solo la parte i de n de la selección (reparto por posición, el mismo en cada corrida): un grupo grande, en n trabajos
     --tiempo <min>       tiempo máximo por prueba (25 por defecto)
     --barajar [semilla]  9b-1 · las corre en otro orden (al azar, o el de esa semilla para repetirlo): saca a la luz las que dependen del orden.
                          Las al revés siguen primero; las de punta a punta, todas mezcladas (sin fases). La semilla se imprime al empezar.
   Salida: $PRUEBAS_SALIDA/res/<nombre>.out por prueba y resumen.json; al final, la tabla con las comprobaciones (✓) de cada una.
   Una prueba pasa si termina con código 0. Nada de esto lleva secretos: los lee cada prueba de $PRUEBAS_SALIDA/secretos.env. */
import { spawn, execSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, unlinkSync, writeFileSync, createWriteStream } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
/* 22 nov · «Árbol idéntico» (A2): la huella del árbol se carga AL ARRANCAR, en este proceso. Una suite que siembra en pruebas/lib/arbol.cjs (o en
   este archivo) no cambia la comparación de la corrida en curso. Guardián alrevesArbolIdentico. */
const ARBOL = createRequire(import.meta.url)("./lib/arbol.cjs");
const SALIDA = resolve(process.env.PRUEBAS_SALIDA || join(tmpdir(), "tolatino-pruebas"));
const RES = join(SALIDA, "res");
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i < 0 ? null : args[i + 1]; };
const flag = (k) => args.includes(k);

/* El catálogo: cada archivo de pruebas/e2e y pruebas/alreves; el grupo sale del nombre (fase = el primer dígito). */
const catalogo = [];
for (const [dir, carril] of [["e2e", "e2e"], ["alreves", "alreves"]]) {
  for (const f of readdirSync(join(RAIZ, "pruebas", dir)).sort()) {
    const m = /^(.+)\.(cjs|mjs|sh)$/.exec(f);
    if (!m || f.startsWith("_")) continue;
    const nombre = m[1], fase = /(\d)[a-z]/.exec(nombre)?.[1];
    const grupo = carril === "alreves" ? "alreves" : fase ? `fase${fase}` : "varios";
    catalogo.push({ nombre, archivo: join(RAIZ, "pruebas", dir, f), tipo: m[2], carril, grupo });
  }
}
const grupos = [...new Set(catalogo.map((t) => t.grupo))].sort((a, b) => (a === "alreves" ? -1 : b === "alreves" ? 1 : a.localeCompare(b)));

if (flag("--lista") || !args.length) {
  for (const g of grupos) { const ts = catalogo.filter((t) => t.grupo === g); console.log(`${g} (${ts.length}): ${ts.map((t) => t.nombre).join(" ")}`); }
  console.log(`\n${catalogo.length} pruebas. Uso: node pruebas/correr.mjs <nombre…> | --grupo <g> | --todas`);
  process.exit(0);
}

let sel;
/* Dentro de una fase, las del Super Admin de esa fase (adm…, ana…, tx…) van al final: cierran la fase y algunas leen lo que dejaron las
   demás (adm4eg el caso de ayu4f, adm4ne las colas de noc4c), como cuando se construyeron. */
const enOrden = (ts) => [...ts.filter((t) => !/^(adm|ana|tx)\d/.test(t.nombre)), ...ts.filter((t) => /^(adm|ana|tx)\d/.test(t.nombre))];
if (flag("--todas")) sel = grupos.flatMap((g) => enOrden(catalogo.filter((t) => t.grupo === g)));
else if (opt("--grupo")) { const gs = opt("--grupo").split(","); for (const g of gs) if (!grupos.includes(g)) { console.error(`grupo desconocido: ${g} (${grupos.join(", ")})`); process.exit(2); } sel = gs.flatMap((g) => enOrden(catalogo.filter((t) => t.grupo === g))); }
else {
  const nombres = args.filter((a, i) => !a.startsWith("--") && !["--desde", "--saltar", "--tiempo", "--barajar", "--dispositivo", "--parte"].includes(args[i - 1]));
  sel = nombres.map((n) => catalogo.find((t) => t.nombre === n.replace(/\.(cjs|mjs|sh)$/, "")) ?? (console.error(`no existe: ${n}`), process.exit(2)));
}
if (flag("--barajar")) {
  const v = opt("--barajar"), semilla = v && /^\d+$/.test(v) ? Number(v) : Math.floor(Math.random() * 2 ** 31);
  let x = semilla >>> 0; const azar = () => { x = (x + 0x6d2b79f5) >>> 0; let t = x; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32; };
  const al = sel.filter((t) => t.carril === "alreves"), e2e = sel.filter((t) => t.carril === "e2e");
  for (let i = e2e.length - 1; i > 0; i--) { const j = Math.floor(azar() * (i + 1)); [e2e[i], e2e[j]] = [e2e[j], e2e[i]]; }
  sel = [...al, ...e2e];
  console.log(`--barajar · semilla ${semilla} (para repetir este orden: --barajar ${semilla})`);
}
if (opt("--desde")) { const i = sel.findIndex((t) => t.nombre === opt("--desde")); if (i < 0) { console.error(`--desde: ${opt("--desde")} no está en la selección`); process.exit(2); } sel = sel.slice(i); }
if (opt("--saltar")) { const fuera = new Set(opt("--saltar").split(",")); sel = sel.filter((t) => !fuera.has(t.nombre)); }
if (opt("--parte")) {
  const m = /^(\d+)\/(\d+)$/.exec(opt("--parte") ?? ""); if (!m || +m[1] < 1 || +m[1] > +m[2]) { console.error("--parte <i>/<n> (1 ≤ i ≤ n)"); process.exit(2); }
  sel = sel.filter((_, k) => k % +m[2] === +m[1] - 1);
}
const TIEMPO = Number(opt("--tiempo") ?? 25) * 60_000;

/* Playwright: el del repo si lo hay; si no, el global (npm root -g). */
let NODE_PATH = process.env.NODE_PATH ?? "";
try { execSync("node -e \"require.resolve('playwright')\"", { cwd: RAIZ, stdio: "ignore" }); } catch { NODE_PATH = [NODE_PATH, execSync("npm root -g", { encoding: "utf8" }).trim()].filter(Boolean).join(":"); }
const ENV = { ...process.env, NODE_PATH, PRUEBAS_SALIDA: SALIDA };
if (opt("--dispositivo")) {
  ENV.PRUEBAS_DISPOSITIVO = opt("--dispositivo");
  ENV.NODE_OPTIONS = `${process.env.NODE_OPTIONS ?? ""} --require ${join(RAIZ, "pruebas/lib/dispositivo-precarga.cjs")}`.trim();
}

mkdirSync(RES, { recursive: true });
if (flag("--servir")) execSync(`bash ${JSON.stringify(join(RAIZ, "pruebas/servir/servir.sh"))} completo`, { stdio: "inherit", env: ENV });
if (sel.some((t) => t.carril === "e2e")) {
  try { execSync("curl -fs -o /dev/null -m 10 http://127.0.0.1:3100/api/salud"); }
  catch { console.error("✗ nadie responde en :3100. Primero: bash pruebas/servir/base.sh && bash pruebas/servir/servir.sh (o --servir)"); process.exit(2); }
}

/* 9b-3 · Entre una prueba y la siguiente, las ventanas de UN MINUTO que dejó la anterior se cierran: la espera de 30 s entre códigos de un
   teléfono (otp_codes de hace menos de un minuto), los topes compartidos (rate_counters) y las búsquedas de la puerta por minuto. Cada prueba es
   otra sesión: en la «barajada» de 9b-2 una prueba que entraba como el admin justo después de otra recibía «Espera unos segundos» (admin1i).
   No toca nada más (los datos de cada prueba siguen siendo suyos). Guardián pruebasIndependientes. */
const DB = process.env.PRUEBAS_DB_CONT || "tlprueba-db-1";
function cerrarVentanas() {
  try {
    execSync(`docker exec -i ${DB} psql -U tolatino -d tolatino -qAt`, { input: "delete from otp_codes where created_at > now() - interval '1 minute';\ndelete from rate_counters;\ndelete from door_searches where at > now() - interval '1 minute';\n", stdio: ["pipe", "ignore", "ignore"], timeout: 20_000 });
  } catch { /* sin base local (solo al revés): nada que cerrar */ }
}

const correrUna = (t) => new Promise((ok) => {
  if (t.carril === "e2e") cerrarVentanas();
  const ini = Date.now(), out = join(RES, `${t.nombre}.out`), w = createWriteStream(out);
  const [cmd, cargs] = t.tipo === "sh" ? ["bash", [t.archivo]] : ["node", [t.archivo]];
  const p = spawn(cmd, cargs, { cwd: RAIZ, env: ENV, stdio: ["ignore", "pipe", "pipe"] });
  let texto = "";
  const mira = (d) => { w.write(d); texto += d; if (texto.length > 2e6) texto = texto.slice(-1e6); };
  p.stdout.on("data", mira); p.stderr.on("data", mira);
  const reloj = setTimeout(() => { mira(`\n✗ se pasó de ${TIEMPO / 60000} min: se detiene\n`); p.kill("SIGKILL"); }, TIEMPO);
  p.on("close", (codigo) => {
    clearTimeout(reloj); w.end();
    const checks = (texto.match(/^\s*✓/gm) ?? []).length, malas = (texto.match(/^\s*✗/gm) ?? []).length;
    // 9b-1 · Una prueba que termina sin ninguna comprobación (✓) no está en verde: 13 de la fase 1–2 solo imprimían lo que veían y la corrida
    // las contaba en verde con «0 ✓» (lic, menu2a…). Ahora cada una comprueba; si una vuelve a no comprobar nada, es roja.
    const sinNada = codigo === 0 && checks === 0;
    // 9b-3 · Una prueba al revés con un ✗ es roja aunque salga con 0: 25 (de 6c a 8i) no ponían el código de salida y alreves8e llevaba un caso
    // sin armar (permisosMinimos) que el CI contaba en verde. Guardián: alrevesQueFalla.
    const mudo = t.carril === "alreves" && codigo === 0 && malas > 0;
    const error = sinNada ? "terminó sin ninguna comprobación (✓): no se sabe si probó algo" : mudo ? `${malas} ✗ y salió con 0: ${(texto.split("\n").find((l) => /^\s*✗/.test(l)) ?? "").trim().slice(0, 180)}` : codigo === 0 ? "" : (texto.split("\n").reverse().find((l) => /ASSERT|Error|✗|Timeout|falla|fallo/i.test(l)) ?? texto.trim().split("\n").pop() ?? "").trim().slice(0, 220);
    const r = { nombre: t.nombre, grupo: t.grupo, ok: codigo === 0 && !sinNada && !mudo, codigo, checks, malas, seg: Math.round((Date.now() - ini) / 1000), error, salida: out };
    console.log(`${r.ok ? "✓" : "✗"} ${t.nombre.padEnd(16)} ${String(checks).padStart(4)} ✓ ${String(r.seg).padStart(5)} s${r.ok ? "" : `  · ${error}`}`);
    ok(r);
  });
});

/* 22 nov · Revisión del CI (A2) · El carril «al revés», con el árbol vigilado. Hasta hoy cada suite terminaba con una pasada COMPLETA de guardianes
   (113 por confirmación, el 85–88 % del carril) que solo veía un defecto mal restaurado si algún guardián lo miraba. Ahora:
   - al empezar el carril: HEAD~1 tiene que resolver (migracionReversible mira el commit anterior), una pasada REAL y completa de guardianes (si es
     roja, el carril se para ahí: nada se prueba sobre un árbol que ya está rojo), y la huella del árbol con una copia de referencia FUERA del árbol;
   - tras CADA suite: la misma huella, comparada contra la INICIAL. Si difiere, la suite es roja nombrando los archivos, el corredor restaura desde
     la copia (lo nuevo no se borra: se aparta a la copia y se dice dónde), recalcula y exige igualdad; si no lo logra, corta el carril;
   - al terminar: otra pasada REAL y completa de guardianes.
   Por inducción: árbol inicial en verde y huella idéntica tras cada suite ⇒ cada suite dejó un árbol que ya se probó en verde. */
const vigia = {
  ini: null, dir: null, cortado: null, empezado: false,
  async empezar(rs) {
    this.empezado = true;
    try { execSync("git rev-parse --verify -q HEAD~1", { cwd: RAIZ, stdio: "ignore" }); }
    catch { this.cortado = "sin historia: HEAD~1 no resuelve (las pasadas del carril miran el commit anterior; en el CI, checkout con fetch-depth: 0)"; rs.push(rojaDelCarril("guardianes-inicio", this.cortado)); return; }
    const r = await pasadaReal("inicio"); rs.push(r);
    if (!r.ok) { this.cortado = "la pasada real de guardianes del inicio está en rojo: nada se prueba sobre un árbol que ya está rojo"; return; }
    try {
      this.ini = ARBOL.huella(RAIZ);
      this.dir = mkdtempSync(join(tmpdir(), "tolatino-alreves-ref-"));
      ARBOL.copiar(RAIZ, this.ini, this.dir);
      console.log(`  árbol del carril: huella ${this.ini.digest.slice(0, 16)} (${this.ini.archivos.size} archivos, ${this.ini.vacias.length} carpetas vacías) · copia de referencia en ${this.dir}`);
    } catch (e) { this.cortado = `no se pudo tomar la huella del árbol: ${String(e?.message ?? e).slice(0, 200)}`; rs.push(rojaDelCarril("arbol-inicio", this.cortado)); }
  },
  /* Tras cada suite: la huella contra la inicial. */
  despues(t, r) {
    let d;
    try { d = ARBOL.diferencias(this.ini, ARBOL.huella(RAIZ)); }
    catch (e) { this.cortado = `no se pudo calcular la huella del árbol tras ${t.nombre}: ${String(e?.message ?? e).slice(0, 200)}`; return { ...r, ok: false, error: this.cortado }; }
    if (!d.length) return r;
    const lista = d.slice(0, 30).map((x) => `${x.ruta} (${x.que})`).join(" · ") + (d.length > 30 ? ` · y ${d.length - 30} más` : "");
    console.log(`  ✗ ${t.nombre} es ROJA: dejó el árbol distinto del inicial: ${lista}`);
    let nota;
    try {
      const o = ARBOL.restaurar(RAIZ, this.ini, this.dir), otra = ARBOL.diferencias(this.ini, ARBOL.huella(RAIZ));
      if (otra.length) { this.cortado = `tras ${t.nombre} el árbol no volvió a la huella inicial (${otra.slice(0, 10).map((x) => `${x.ruta} (${x.que})`).join(" · ")}): el carril se corta`; nota = this.cortado; }
      else nota = `restaurado desde la copia de referencia (${o.restaurados.length} archivo(s) devueltos${o.apartados.length ? `; ${o.apartados.length} nuevo(s) apartado(s) en ${join(this.dir, "apartados")}` : ""}${o.carpetas.length ? `; carpetas: ${o.carpetas.join(", ")}` : ""}): huella idéntica otra vez`;
    } catch (e) { this.cortado = `no se pudo restaurar el árbol tras ${t.nombre}: ${String(e?.message ?? e).slice(0, 200)}`; nota = this.cortado; }
    console.log(`    ${nota}`);
    return { ...r, ok: false, error: `dejó el árbol distinto del inicial: ${lista} · ${nota}`.slice(0, 1500) };
  },
  async terminar(rs) {
    if (!this.empezado) return;
    if (this.cortado) { console.log(`  ✗ carril «al revés» cortado: ${this.cortado}`); }
    else rs.push(await pasadaReal("final"));
    if (this.dir && !existsSync(join(this.dir, "apartados"))) try { rmSync(this.dir, { recursive: true, force: true }); } catch { /* nada */ }
  },
};
const rojaDelCarril = (nombre, error) => { console.log(`✗ ${nombre.padEnd(16)}    0 ✓     0 s  · ${error}`); return { nombre, grupo: "alreves", ok: false, codigo: null, checks: 0, malas: 1, seg: 0, error, salida: null }; };
/* Una pasada REAL y completa de guardianes (sin --solo, sin nada que la acorte), con su salida en res/guardianes-<cual>.out. */
const pasadaReal = (cual) => new Promise((ok) => {
  const ini = Date.now(), out = join(RES, `guardianes-${cual}.out`), w = createWriteStream(out);
  const env = { ...ENV }; delete env.ALREVES_CORREDOR;
  const p = spawn("node", ["guardianes/run.mjs"], { cwd: RAIZ, env, stdio: ["ignore", "pipe", "pipe"] });
  let texto = "";
  const mira = (d) => { w.write(d); texto += d; if (texto.length > 2e6) texto = texto.slice(-1e6); };
  p.stdout.on("data", mira); p.stderr.on("data", mira);
  p.on("close", (codigo) => {
    w.end();
    const r = { nombre: `guardianes-${cual}`, grupo: "alreves", ok: codigo === 0, codigo, checks: (texto.match(/^\s*✓/gm) ?? []).length, malas: (texto.match(/^\s*✗/gm) ?? []).length, seg: Math.round((Date.now() - ini) / 1000), error: codigo === 0 ? "" : (texto.split("\n").filter((l) => /^\s*\[|✗|Error/.test(l)).slice(0, 8).join(" · ") || texto.trim().split("\n").pop() || "").trim().slice(0, 600), salida: out };
    console.log(`${r.ok ? "✓" : "✗"} ${r.nombre.padEnd(16)} ${String(r.checks).padStart(4)} ✓ ${String(r.seg).padStart(5)} s  · pasada REAL y completa de guardianes (${cual} del carril «al revés»)${r.ok ? "" : `: ${r.error}`}`);
    ok(r);
  });
});

/* Un candado por carril (en la salida): dos corridas de punta a punta a la vez se pisan en la base, y dos de al revés en los archivos del repo. */
const candados = [];
for (const c of ["e2e", "alreves"]) {
  if (!sel.some((t) => t.carril === c)) continue;
  const f = join(SALIDA, `corriendo-${c}.pid`);
  if (existsSync(f)) { const pid = Number(readFileSync(f, "utf8")); let vivo = false; try { process.kill(pid, 0); vivo = true; } catch { /* ya no corre */ } if (vivo && pid !== process.pid) { console.error(`✗ ya hay una corrida de ${c} (pid ${pid}): esperar a que termine`); process.exit(2); } }
  writeFileSync(f, String(process.pid)); candados.push(f);
}
process.on("exit", () => { for (const f of candados) try { unlinkSync(f); } catch { /* nada */ } });
/* Decisión AG (20 nov) · Con --reintentar, una prueba de punta a punta que falla se repite UNA vez. Pasa → INESTABLE (verde, pero dicho: la
   primera salida queda en <nombre>.intento1.out y la lista va al final, al resumen y al resumen del trabajo en GitHub). Falla otra vez → roja.
   Con TOPE_INESTABLES ya anotadas no se repite ninguna más (algo de fondo: sale roja). Las pruebas al revés no se repiten nunca. */
const REINTENTAR = flag("--reintentar"), TOPE_INESTABLES = 3, inestables = [];
const carril = async (ts) => {
  const rs = [];
  for (const t of ts) {
    if (t.carril === "alreves" && !vigia.empezado) await vigia.empezar(rs);
    if (t.carril === "alreves" && vigia.cortado) { rs.push(rojaDelCarril(t.nombre, `no corrió: ${vigia.cortado}`)); continue; }
    let r = await correrUna(t);
    if (t.carril === "alreves") r = vigia.despues(t, r);
    if (!r.ok && REINTENTAR && t.carril === "e2e" && inestables.length < TOPE_INESTABLES) {
      const primera = join(RES, `${t.nombre}.intento1.out`);
      try { renameSync(r.salida, primera); } catch { /* sin salida */ }
      console.log(`  ↻ ${t.nombre}: se repite una vez`);
      const r2 = await correrUna(t);
      if (r2.ok) { r2.inestable = { error: r.error, salida: primera }; inestables.push(r2); console.log(`  ~ INESTABLE ${t.nombre}: falló una vez (${String(r.error).slice(0, 200)}) y pasó al repetirla`); r = r2; }
      else r = { ...r2, error: `${r2.error} · dos veces seguidas (la primera: ${String(r.error).slice(0, 140)})` };
    }
    rs.push(r);
  }
  if (ts.some((t) => t.carril === "alreves")) await vigia.terminar(rs);
  return rs;
};
const inicio = Date.now();
console.log(`${sel.length} pruebas · salida en ${RES}${flag("--paralelo") ? " · dos carriles (al revés | punta a punta)" : " · una a la vez"}\n`);
const res = flag("--paralelo")
  ? (await Promise.all([carril(sel.filter((t) => t.carril === "alreves")), carril(sel.filter((t) => t.carril === "e2e"))])).flat()
  : await carril(sel);

const bien = res.filter((r) => r.ok), mal = res.filter((r) => !r.ok);
const total = res.reduce((s, r) => s + r.checks, 0);
writeFileSync(join(RES, "resumen.json"), JSON.stringify({ fecha: new Date().toISOString(), commit: (() => { try { return execSync("git rev-parse --short HEAD", { cwd: RAIZ, encoding: "utf8" }).trim(); } catch { return null; } })(), pruebas: res.length, verdes: bien.length, rojas: mal.length, comprobaciones: total, minutos: Math.round((Date.now() - inicio) / 60000), res }, null, 2));
console.log(`\n${bien.length}/${res.length} en verde · ${total} comprobaciones (✓) · ${Math.round((Date.now() - inicio) / 60000)} min`);
if (inestables.length) {
  console.log(`INESTABLES (${inestables.length}) · fallaron una vez y pasaron al repetirlas; se arreglan igual:`);
  for (const r of inestables) console.log(`  ~ ${r.nombre} · ${r.inestable.error}\n    ${r.inestable.salida}`);
  if (process.env.CI) for (const r of inestables) { try { const t = readFileSync(r.inestable.salida, "utf8").trimEnd().split("\n").slice(-30); console.log(`\n── cola de ${r.nombre} (el intento que falló) ──\n${t.map((l) => l.slice(0, 2000)).join("\n")}`); } catch { /* sin salida */ } }
  if (process.env.GITHUB_STEP_SUMMARY) { try { appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Inestables (${inestables.length})\n${inestables.map((r) => `- \`${r.nombre}\` · ${String(r.inestable.error).replace(/[|`]/g, " ").slice(0, 300)}`).join("\n")}\n`); } catch { /* fuera de GitHub */ } }
}
// 22 nov · La lista se escribe SIEMPRE, vacía si no hubo inestables: la tubería del CI cuenta las de toda la corrida desde este archivo, y un carril en
// verde que no trae su lista no puede pasar por «cero». En el CI, si el carril corre dos veces sobre la misma salida (la confirmación), se suman.
try {
  const previas = process.env.CI && existsSync(join(RES, "inestables.json")) ? JSON.parse(readFileSync(join(RES, "inestables.json"), "utf8")) : [];
  writeFileSync(join(RES, "inestables.json"), JSON.stringify([...previas, ...inestables.map((r) => ({ nombre: r.nombre, error: r.inestable.error }))], null, 1));
} catch { /* nada */ }
if (mal.length) { console.log(`En rojo (${mal.length}):`); for (const r of mal) console.log(`  ✗ ${r.nombre} (código ${r.codigo}) · ${r.error}\n    ${r.salida}`); }
/* 9b-2 · En el CI no hay a dónde mirar después (el almacén de artefactos no siempre se puede bajar): la cola de cada roja va al registro. */
if (mal.length && process.env.CI) for (const r of mal) { try { const t = readFileSync(r.salida, "utf8").trimEnd().split("\n").slice(-50); console.log(`\n── cola de ${r.nombre} ──\n${t.map((l) => l.slice(0, 2000)).join("\n")}`); } catch { /* sin salida */ } }
process.exit(mal.length ? 1 : 0);
