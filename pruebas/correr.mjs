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
     --parte <i>/<n>      9b-2 · solo la parte i de n de la selección (reparto por posición, el mismo en cada corrida): un grupo grande, en n trabajos
     --tiempo <min>       tiempo máximo por prueba (25 por defecto)
     --barajar [semilla]  9b-1 · las corre en otro orden (al azar, o el de esa semilla para repetirlo): saca a la luz las que dependen del orden.
                          Las al revés siguen primero; las de punta a punta, todas mezcladas (sin fases). La semilla se imprime al empezar.
   Salida: $PRUEBAS_SALIDA/res/<nombre>.out por prueba y resumen.json; al final, la tabla con las comprobaciones (✓) de cada una.
   Una prueba pasa si termina con código 0. Nada de esto lleva secretos: los lee cada prueba de $PRUEBAS_SALIDA/secretos.env. */
import { spawn, execSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync, createWriteStream } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
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

const correrUna = (t) => new Promise((ok) => {
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
    const error = sinNada ? "terminó sin ninguna comprobación (✓): no se sabe si probó algo" : codigo === 0 ? "" : (texto.split("\n").reverse().find((l) => /ASSERT|Error|✗|Timeout|falla|fallo/i.test(l)) ?? texto.trim().split("\n").pop() ?? "").trim().slice(0, 220);
    const r = { nombre: t.nombre, grupo: t.grupo, ok: codigo === 0 && !sinNada, codigo, checks, malas, seg: Math.round((Date.now() - ini) / 1000), error, salida: out };
    console.log(`${r.ok ? "✓" : "✗"} ${t.nombre.padEnd(16)} ${String(checks).padStart(4)} ✓ ${String(r.seg).padStart(5)} s${r.ok ? "" : `  · ${error}`}`);
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
const carril = async (ts) => { const rs = []; for (const t of ts) rs.push(await correrUna(t)); return rs; };
const inicio = Date.now();
console.log(`${sel.length} pruebas · salida en ${RES}${flag("--paralelo") ? " · dos carriles (al revés | punta a punta)" : " · una a la vez"}\n`);
const res = flag("--paralelo")
  ? (await Promise.all([carril(sel.filter((t) => t.carril === "alreves")), carril(sel.filter((t) => t.carril === "e2e"))])).flat()
  : await carril(sel);

const bien = res.filter((r) => r.ok), mal = res.filter((r) => !r.ok);
const total = res.reduce((s, r) => s + r.checks, 0);
writeFileSync(join(RES, "resumen.json"), JSON.stringify({ fecha: new Date().toISOString(), commit: (() => { try { return execSync("git rev-parse --short HEAD", { cwd: RAIZ, encoding: "utf8" }).trim(); } catch { return null; } })(), pruebas: res.length, verdes: bien.length, rojas: mal.length, comprobaciones: total, minutos: Math.round((Date.now() - inicio) / 60000), res }, null, 2));
console.log(`\n${bien.length}/${res.length} en verde · ${total} comprobaciones (✓) · ${Math.round((Date.now() - inicio) / 60000)} min`);
if (mal.length) { console.log(`En rojo (${mal.length}):`); for (const r of mal) console.log(`  ✗ ${r.nombre} (código ${r.codigo}) · ${r.error}\n    ${r.salida}`); }
/* 9b-2 · En el CI no hay a dónde mirar después (el almacén de artefactos no siempre se puede bajar): la cola de cada roja va al registro. */
if (mal.length && process.env.CI) for (const r of mal) { try { const t = readFileSync(r.salida, "utf8").trimEnd().split("\n").slice(-30); console.log(`\n── cola de ${r.nombre} ──\n${t.map((l) => l.slice(0, 400)).join("\n")}`); } catch { /* sin salida */ } }
process.exit(mal.length ? 1 : 0);
