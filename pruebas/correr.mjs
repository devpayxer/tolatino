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
     --parte <i>/<n>      9b-2 · solo la parte i de n de la selección, la misma en cada corrida: un grupo grande, en n trabajos. La punta a punta
                          entera, por la asignación de pruebas/reparto.json (con su n); cualquier otra selección de punta a punta (una dirigida)
                          o el carril al revés, por tiempo (LPT con las duraciones medidas, 24 nov); al barajar o mezclando carriles, por posición
     --sin-alreves        24 nov · deja fuera de la selección las pruebas al revés (en el CI las corre su carril, «punta a punta · al revés»,
                          entero): «punta a punta · todas las fases» de una dirigida corre solo las de punta a punta de «solo»
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
/* 22 nov · Revisión del CI (A3) · El diario de restauración POR ÁRBOL (en la carpeta de git de esta copia, fuera del árbol): candado de la corrida
   al revés de este árbol y lo que cada suite escribe, anotado antes de escribirlo. Guardián alrevesSeguroSembrado. */
const DIARIO = createRequire(import.meta.url)("./lib/diario.cjs");
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

/* 22 nov · --cerrar-diario: después de mirar los archivos que el diario de una corrida muerta no quiso tocar, se cierra (se guarda aparte, no se borra). */
if (flag("--cerrar-diario")) {
  const d = DIARIO.carpetaDe(RAIZ), c = join(d, "cerrados", new Date().toISOString().replace(/[:.]/g, "-"));
  mkdirSync(c, { recursive: true });
  for (const f of ["corrida.json", "diario.jsonl", "originales", "apartados"]) if (existsSync(join(d, f))) renameSync(join(d, f), join(c, f));
  console.log(`diario del árbol cerrado (guardado en ${c})`); process.exit(0);
}
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
/* 24 nov · Una dirigida corría sus pruebas al revés DOS veces: en el carril «al revés» (entero) y otra vez aquí, en las partes de «todas las
   fases» (45422260550: 43 de sus 283). Con --sin-alreves (ci.yml, «regresion» y «anchos») quedan solo las de punta a punta. Guardián dirigidaEnPartes. */
if (flag("--sin-alreves")) {
  const fuera = sel.filter((t) => t.carril === "alreves");
  sel = sel.filter((t) => t.carril !== "alreves");
  if (fuera.length) console.log(`--sin-alreves · ${fuera.length} prueba(s) al revés fuera de esta selección (las corre su carril, «punta a punta · al revés», entero): ${fuera.map((t) => t.nombre).join(" ")}`);
}
if (opt("--parte")) {
  const m = /^(\d+)\/(\d+)$/.exec(opt("--parte") ?? ""); if (!m || +m[1] < 1 || +m[1] > +m[2]) { console.error("--parte <i>/<n> (1 ≤ i ≤ n)"); process.exit(2); }
  /* 22 nov · Revisión del CI (B3) · Con la punta a punta entera, sin barajar y con la n de pruebas/reparto.json, la parte sale de la ASIGNACIÓN
     guardada (por duración, con cada requisito en la misma parte y antes de quien lo pide; pruebas/lib/reparto.cjs). Guardián repartoAsignado.
     24 nov · Cualquier otra selección de punta a punta (una dirigida, «solo»; --saltar, --desde) va por TIEMPO (LPT con las duraciones de
     pruebas/reparto.json, los requisitos juntos y antes): por posición, la dirigida de 283 pruebas tuvo partes de 26 a 40 min. El carril al revés,
     por tiempo con pruebas/reparto-alreves.json (guardián dirigidaEnPartes). Por posición quedan: --barajar (el detector de dependencias de orden),
     la punta a punta entera con otra n y una selección que mezcla carriles (solo a mano). */
  const RP = createRequire(import.meta.url)("./lib/reparto.cjs"), i = +m[1], n = +m[2], nombres = sel.map((t) => t.nombre);
  const carril = sel.length && sel.every((t) => t.carril === sel[0].carril) ? sel[0].carril : null;
  let parte = null, como = "";
  if (!flag("--barajar") && carril === "e2e" && RP.esEntera(RAIZ, nombres)) { parte = RP.parteDe(RAIZ, RP.leer(RAIZ), nombres, i, n); como = `por la asignación de ${RP.ARCHIVO}`; }
  else if (!flag("--barajar") && carril === "e2e") { parte = RP.parteSubconjunto(RAIZ, RP.leer(RAIZ), nombres, i, n); como = `por tiempo (LPT con las duraciones de ${RP.ARCHIVO})`; }
  else if (!flag("--barajar") && carril === "alreves") { parte = RP.parteAlReves(RAIZ, nombres, i, n); como = `por tiempo (LPT con las duraciones de ${RP.ARCHIVO_ALREVES})`; }
  if (parte) { sel = parte.map((x) => catalogo.find((t) => t.nombre === x)); console.log(`--parte ${i}/${n} · ${como} (${sel.length} pruebas)`); }
  else sel = sel.filter((_, k) => k % n === i - 1);
}
const TIEMPO = Number(opt("--tiempo") ?? 25) * 60_000;
/* 22 nov · Revisión del CI (B2) · --comprobar: solo resuelve la selección (un nombre que no existe ya salió con 2 arriba) y sale, sin correr nada,
   sin servidor y sin candado. Lo usa «cambios» en el CI para parar una dirigida con un nombre mal escrito antes de arrancar los carriles. */
if (flag("--comprobar")) { console.log(`✓ --comprobar: ${sel.length} prueba(s) existen: ${sel.map((t) => t.nombre).join(" ")}`); process.exit(sel.length ? 0 : 2); }

/* Playwright: el del repo si lo hay; si no, el global (npm root -g). */
let NODE_PATH = process.env.NODE_PATH ?? "";
try { execSync("node -e \"require.resolve('playwright')\"", { cwd: RAIZ, stdio: "ignore" }); } catch { NODE_PATH = [NODE_PATH, execSync("npm root -g", { encoding: "utf8" }).trim()].filter(Boolean).join(":"); }
const ENV = { ...process.env, NODE_PATH, PRUEBAS_SALIDA: SALIDA };
if (opt("--dispositivo")) {
  ENV.PRUEBAS_DISPOSITIVO = opt("--dispositivo");
  ENV.NODE_OPTIONS = `${process.env.NODE_OPTIONS ?? ""} --require ${join(RAIZ, "pruebas/lib/dispositivo-precarga.cjs")}`.trim();
}

/* 22 nov · La dirección del servidor sale de UNA variable, PRUEBAS_URL (por defecto, el servidor en :3100; con solo PRUEBAS_PUERTO se deriva; las dos y distintas:
   error aquí, antes de levantar o preguntar nada). La cuenta es la de pruebas/lib/puertos.cjs, la misma que hacen servir.sh y cada prueba (ENT.B). */
let SERVIDOR = null;
if (flag("--servir") || sel.some((t) => t.carril === "e2e")) {
  try { SERVIDOR = createRequire(import.meta.url)("./lib/puertos.cjs").resolver(process.env); }
  catch (e) { console.error(`✗ ${e.message}`); process.exit(2); }
}
mkdirSync(RES, { recursive: true });
if (flag("--servir")) execSync(`bash ${JSON.stringify(join(RAIZ, "pruebas/servir/servir.sh"))} completo`, { stdio: "inherit", env: ENV });
if (sel.some((t) => t.carril === "e2e")) {
  const BASE = SERVIDOR.url.replace("localhost", "127.0.0.1"); // la misma dirección que leen las pruebas (ENT.B, pruebas/lib/entorno.cjs), por IPv4 como siempre
  try { execSync(`curl -fs -o /dev/null -m 10 ${JSON.stringify(BASE + "/api/salud")}`); }
  catch { console.error(`✗ nadie responde en ${BASE}. Primero: bash pruebas/servir/base.sh && bash pruebas/servir/servir.sh (o --servir)`); process.exit(2); }
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

/* 22 nov · Revisión del CI (A1) · Cada suite al revés, con el árbol ya vigilado, recibe ALREVES_CORREDOR=<pid>:<huella inicial> SOLO en su proceso:
   su pasada final (pruebas/lib/alreves-fin.cjs) no se repite, comprueba la huella y lo dice. Guardián alrevesPasadaFinal. */
const envDe = (t) => (t.carril === "alreves" && vigia.ini ? { ...ENV, ALREVES_CORREDOR: `${process.pid}:${vigia.ini.digest}`, ALREVES_DIARIO: vigia.diario, ALREVES_RAIZ: RAIZ, NODE_OPTIONS: `${ENV.NODE_OPTIONS ?? ""} --require ${JSON.stringify(join(RAIZ, "pruebas/lib/alreves-corredor.cjs"))}`.trim() } : ENV);
/* 22 nov · Revisión del CI (A3) · Cada prueba corre en su propio grupo de procesos (detached): al pararla se para con lo que lanzó (su
   «node guardianes/run.mjs --solo» no queda huérfano), con SIGTERM primero y SIGKILL después. */
const matarGrupo = (p, sen) => { try { process.kill(-p.pid, sen); } catch { try { p.kill(sen); } catch { /* ya no está */ } } };
let enCurso = null, parando = false;
const correrUna = (t) => new Promise((ok) => {
  if (t.carril === "e2e") cerrarVentanas();
  const ini = Date.now(), out = join(RES, `${t.nombre}.out`), w = createWriteStream(out);
  const [cmd, cargs] = t.tipo === "sh" ? ["bash", [t.archivo]] : ["node", [t.archivo]];
  const p = spawn(cmd, cargs, { cwd: RAIZ, env: envDe(t), stdio: ["ignore", "pipe", "pipe"], detached: true });
  enCurso = p; if (t.carril === "alreves") vigia.anotarSuite(p.pid);
  let texto = "";
  const mira = (d) => { w.write(d); texto += d; if (texto.length > 2e6) texto = texto.slice(-1e6); };
  p.stdout.on("data", mira); p.stderr.on("data", mira);
  const reloj = setTimeout(() => { mira(`\n✗ se pasó de ${TIEMPO / 60000} min: se detiene\n`); matarGrupo(p, "SIGKILL"); }, TIEMPO);
  p.on("close", (codigo) => {
    clearTimeout(reloj); w.end(); enCurso = null;
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
  ini: null, dir: null, cortado: null, empezado: false, diario: null,
  /* El candado del árbol y el diario de una corrida anterior que murió (SIGKILL, la máquina): se recupera SIN restaurar a ciegas. */
  abrir() {
    this.diario = DIARIO.carpetaDe(RAIZ);
    mkdirSync(this.diario, { recursive: true });
    const cj = join(this.diario, "corrida.json");
    if (existsSync(cj)) {
      let c = {}; try { c = JSON.parse(readFileSync(cj, "utf8")); } catch { /* a medias: de una corrida muerta */ }
      if (c.pid && c.pid !== process.pid && DIARIO.vivo(c.pid)) { console.error(`✗ ya hay una corrida al revés viva en este árbol (pid ${c.pid}, desde ${c.inicio}): esperar a que termine (sembraría sobre lo sembrado)`); process.exit(2); }
      if (c.suite && DIARIO.vivo(c.suite)) { try { process.kill(-c.suite, "SIGKILL"); } catch { /* ya no está */ } console.log(`  la suite huérfana de la corrida anterior (grupo ${c.suite}) se detuvo`); }
      if (c.ref && existsSync(c.ref) && !existsSync(join(c.ref, "apartados"))) try { rmSync(c.ref, { recursive: true, force: true }); } catch { /* nada */ }
      const o = DIARIO.recuperar(RAIZ, this.diario);
      console.log(`  diario de una corrida anterior que no terminó (pid ${c.pid ?? "?"}, ${c.inicio ?? "?"}): ${o.devueltos.length} archivo(s) devueltos al original, ${o.apartados.length} apartado(s) en ${join(this.diario, "apartados")}, ${o.carpetas.length} carpeta(s)${o.devueltos.length ? ` · ${o.devueltos.join(", ")}` : ""}`);
      if (o.conflictos.length) {
        console.error(`✗ el diario de la corrida anterior tiene archivos que no toco (no tienen ni el original ni el defecto anotado):\n${o.conflictos.map((x) => `  ${x}`).join("\n")}\nMíralos; cuando estén como deben: node pruebas/correr.mjs --cerrar-diario`);
        process.exit(2);
      }
      DIARIO.vaciar(this.diario);
    }
    writeFileSync(cj, JSON.stringify({ pid: process.pid, inicio: new Date().toISOString() }));
  },
  anotarSuite(pid) { if (this.diario) try { writeFileSync(join(this.diario, "corrida.json"), JSON.stringify({ pid: process.pid, inicio: new Date(inicio).toISOString(), suite: pid, ref: this.dir })); } catch { /* nada */ } },
  cerrar() { if (this.diario) { DIARIO.vaciar(this.diario); try { unlinkSync(join(this.diario, "corrida.json")); } catch { /* nada */ } } },
  /* SIGINT/SIGTERM: el árbol vuelve a la copia de referencia antes de salir; si vuelve, el diario se cierra; si no, queda para el próximo arranque. */
  alParar() {
    if (!this.ini) { if (!DIARIO.leer(this.diario ?? "/nada").length) this.cerrar(); return; }
    try {
      const d = ARBOL.diferencias(this.ini, ARBOL.huella(RAIZ));
      if (d.length) { const o = ARBOL.restaurar(RAIZ, this.ini, this.dir); console.log(`  restaurado desde la copia de referencia: ${o.restaurados.length} devuelto(s), ${o.apartados.length} apartado(s)${o.apartados.length ? ` en ${join(this.dir, "apartados")}` : ""}`); }
      const otra = ARBOL.diferencias(this.ini, ARBOL.huella(RAIZ));
      if (otra.length) console.log(`  ✗ el árbol NO volvió a la huella inicial (${otra.slice(0, 10).map((x) => x.ruta).join(", ")}): el diario queda abierto y el próximo arranque lo recupera`);
      else { console.log("  árbol idéntico al del inicio del carril"); this.cerrar(); }
    } catch (e) { console.log(`  ✗ no se pudo restaurar al parar: ${String(e?.message ?? e).slice(0, 200)} (el diario queda abierto)`); }
  },
  async empezar(rs) {
    this.empezado = true;
    this.abrir();
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
    if (!d.length) { DIARIO.vaciar(this.diario); return r; }
    const lista = d.slice(0, 30).map((x) => `${x.ruta} (${x.que})`).join(" · ") + (d.length > 30 ? ` · y ${d.length - 30} más` : "");
    console.log(`  ✗ ${t.nombre} es ROJA: dejó el árbol distinto del inicial: ${lista}`);
    let nota;
    try {
      const o = ARBOL.restaurar(RAIZ, this.ini, this.dir), otra = ARBOL.diferencias(this.ini, ARBOL.huella(RAIZ));
      if (otra.length) { this.cortado = `tras ${t.nombre} el árbol no volvió a la huella inicial (${otra.slice(0, 10).map((x) => `${x.ruta} (${x.que})`).join(" · ")}): el carril se corta`; nota = this.cortado; }
      else { DIARIO.vaciar(this.diario); nota = `restaurado desde la copia de referencia (${o.restaurados.length} archivo(s) devueltos${o.apartados.length ? `; ${o.apartados.length} nuevo(s) apartado(s) en ${join(this.dir, "apartados")}` : ""}${o.carpetas.length ? `; carpetas: ${o.carpetas.join(", ")}` : ""}): huella idéntica otra vez`; }
    } catch (e) { this.cortado = `no se pudo restaurar el árbol tras ${t.nombre}: ${String(e?.message ?? e).slice(0, 200)}`; nota = this.cortado; }
    console.log(`    ${nota}`);
    return { ...r, ok: false, error: `dejó el árbol distinto del inicial: ${lista} · ${nota}`.slice(0, 1500) };
  },
  async terminar(rs) {
    if (!this.empezado) return;
    if (this.cortado) { console.log(`  ✗ carril «al revés» cortado: ${this.cortado}`); }
    else { rs.push(await pasadaReal("final")); this.cerrar(); }
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
/* 24 nov (decisión AU, «repaso corto tras una roja») · La línea RESULTADOS: el resultado de la corrida legible por máquina, UNA línea y la ÚLTIMA
   de la corrida (después de las colas de las rojas); si se detiene por una señal, también, con completa:false, justo antes de devolver el árbol
   (alrevesSeguro vigila que alParar vaya pegado a la salida). scripts/ci/subir.mjs la lee del registro de cada trabajo de pruebas de una
   dirigida roja para el repaso (--repaso) y para la evidencia encadenada de --subir. La cuenta (qué es verde, rojo, inestable y cuándo es
   completa) vive en pruebas/lib/resultados.cjs con sus casos ejecutables; aquí solo se anota cada prueba que corrió HASTA su resultado y se
   imprime. Mientras se está parando (señal) nada más se anota y la línea dice completa:false. Guardián subidaConHerramienta; al revés:
   alrevesSubir. */
const RESULTADOS = createRequire(import.meta.url)("./lib/resultados.cjs");
const hechas = new Map();
function lineaResultados({ delCarril = [], detenida = false } = {}) {
  console.log(RESULTADOS.linea({ pedidas: sel.map((t) => t.nombre), hechas, inestables: inestables.map((r) => r.nombre), delCarril, detenida: detenida || parando }));
}
const carril = async (ts) => {
  const rs = [];
  for (const t of ts) {
    if (t.carril === "alreves" && !vigia.empezado) await vigia.empezar(rs);
    if (t.carril === "alreves" && vigia.cortado) { rs.push(rojaDelCarril(t.nombre, `no corrió: ${vigia.cortado}`)); continue; }
    if (parando) await new Promise(() => {}); // se está parando: el manejador de la señal termina
    let r = await correrUna(t);
    if (parando) await new Promise(() => {});
    if (t.carril === "alreves") r = vigia.despues(t, r);
    if (!r.ok && REINTENTAR && t.carril === "e2e" && inestables.length < TOPE_INESTABLES) {
      const primera = join(RES, `${t.nombre}.intento1.out`);
      try { renameSync(r.salida, primera); } catch { /* sin salida */ }
      console.log(`  ↻ ${t.nombre}: se repite una vez`);
      const r2 = await correrUna(t);
      if (parando) await new Promise(() => {});
      if (r2.ok) { r2.inestable = { error: r.error, salida: primera }; inestables.push(r2); console.log(`  ~ INESTABLE ${t.nombre}: falló una vez (${String(r.error).slice(0, 200)}) y pasó al repetirla`); r = r2; }
      else r = { ...r2, error: `${r2.error} · dos veces seguidas (la primera: ${String(r.error).slice(0, 140)})` };
    }
    RESULTADOS.anotar(hechas, t.nombre, r.ok);
    rs.push(r);
  }
  if (ts.some((t) => t.carril === "alreves")) await vigia.terminar(rs);
  return rs;
};
/* 22 nov · Revisión del CI (A3) · SIGINT/SIGTERM: se para la prueba en curso con su grupo (SIGTERM, 5 s, SIGKILL), el árbol vuelve a la
   copia de referencia y se cierra el diario; si no se logra, queda abierto y el próximo arranque lo recupera. */
for (const [sen, cod] of [["SIGINT", 130], ["SIGTERM", 143]]) process.on(sen, async () => {
  if (parando) return; parando = true;
  console.log(`\n✗ ${sen}: se detiene la corrida; antes, el árbol vuelve a como estaba`);
  const p = enCurso;
  if (p) { matarGrupo(p, "SIGTERM"); await Promise.race([new Promise((ok) => p.once("close", ok)), new Promise((ok) => setTimeout(ok, 5000))]); if (enCurso) matarGrupo(p, "SIGKILL"); await new Promise((ok) => setTimeout(ok, 300)); }
  lineaResultados({ detenida: true });
  vigia.alParar();
  process.exit(cod);
});
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
// La última línea de la corrida (decisión AU): después de las colas, para que ninguna línea de una prueba quede detrás de ella.
{ const pedidas = new Set(sel.map((t) => t.nombre)); lineaResultados({ delCarril: [...new Set(mal.filter((r) => !pedidas.has(r.nombre)).map((r) => r.nombre))] }); }
process.exit(mal.length ? 1 : 0);
