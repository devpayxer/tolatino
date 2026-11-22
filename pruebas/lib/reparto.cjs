// 22 nov · Revisión del CI (B3) · El reparto de la punta a punta en partes, por duración y con afinidad, GUARDADO como asignación.
// Hasta hoy `pruebas/correr.mjs --parte i/n` repartía por posición (la prueba k va a la parte k mod n): partes desiguales (la más larga 36 min,
// la más corta 27) y requisitos (`requiere`) en otra parte o DESPUÉS de quien los pide, que entonces los corre por dentro (≈ 650 s por pasada).
// Ahora `pruebas/reparto.json` dice a qué parte va cada prueba y en qué orden; lo escribe `scripts/ci/repartir.mjs` desde duraciones medidas.
// Reglas:
// - lo que se guarda es la ASIGNACIÓN, no solo las duraciones: regenerar sin `--rebalancear` no mueve a nadie (un LPT recalculado con otra muestra
//   movía 171–186 de 229 pruebas y las dependencias de orden ocultas «aparecían» en un commit ajeno);
// - las pruebas unidas por `requiere` (en cualquier sentido, por cadenas) van en la MISMA parte y en orden topológico: el requisito antes;
// - una prueba nueva sin asignar va a la parte de su requisito o de quien la pide si lo hay; si no, a la parte más vacía (con 60 s supuestos), al
//   final, sin mover a ninguna otra; el guardián repartoAsignado avisa hasta que se regenere;
// - correr.mjs usa la asignación solo si n coincide con la del archivo y la selección es la punta a punta entera sin barajar; si no, por posición.
const fs = require('fs'), path = require('path');

const ARCHIVO = 'pruebas/reparto.json';
const NUEVA_SEG = 60;
const ADM = /^(adm|ana|tx)\d/;

/** Las pruebas de punta a punta en el orden de `correr.mjs --grupo fase1,…,fase9,varios` (por fase; adm/ana/tx al final de su fase). */
function catalogo(R) {
  const ns = fs.readdirSync(path.join(R, 'pruebas', 'e2e')).sort().map((f) => /^(.+)\.(cjs|mjs|sh)$/.exec(f)).filter((m) => m && !m[0].startsWith('_')).map((m) => m[1]);
  const grupo = (n) => { const d = /(\d)[a-z]/.exec(n)?.[1]; return d ? `fase${d}` : 'varios'; };
  const gs = [...new Set(ns.map(grupo))].sort((a, b) => a.localeCompare(b));
  return gs.flatMap((g) => { const ts = ns.filter((n) => grupo(n) === g); return [...ts.filter((n) => !ADM.test(n)), ...ts.filter((n) => ADM.test(n))]; });
}

/** Las aristas `requiere('<requisito>', …)` escritas tal cual en pruebas/e2e: [quien pide, requisito, siempre]. Y quién llama con un nombre que
 *  no está escrito (dinámicos: compa7d elige el requisito por familia y corre lo que le falte por dentro). */
function aristas(R) {
  const dir = path.join(R, 'pruebas', 'e2e'), mapa = new Map(), dinamicos = [];
  for (const f of fs.readdirSync(dir).sort()) {
    const m = /^(.+)\.(cjs|mjs)$/.exec(f); if (!m || f.startsWith('_')) continue;
    const t = fs.readFileSync(path.join(dir, f), 'utf8').replace(/^\s*\/\/.*$/gm, '');
    for (const x of t.matchAll(/\brequiere\(\s*(['"])([A-Za-z0-9_]+)\1([^\n]*)/g)) {
      const k = `${m[1]}>${x[2]}`, siempre = /\bsiempre:\s*true\b/.test(x[3]);
      mapa.set(k, [m[1], x[2], (mapa.get(k)?.[2] ?? false) || siempre]);
    }
    if (/\brequiere\(\s*[^'"\s)]/.test(t)) dinamicos.push(m[1]);
  }
  return { aristas: [...mapa.values()].sort((a, b) => (a[0] + a[1]).localeCompare(b[0] + b[1])), dinamicos };
}

/** Componentes unidas por aristas (en cualquier sentido): cada una va entera a una parte. */
function componentes(nombres, E) {
  const par = new Map(nombres.map((n) => [n, n]));
  const raiz = (x) => { while (par.get(x) !== x) { par.set(x, par.get(par.get(x))); x = par.get(x); } return x; };
  for (const [a, b] of E) if (par.has(a) && par.has(b)) par.set(raiz(a), raiz(b));
  const c = new Map(); for (const n of nombres) { const r = raiz(n); if (!c.has(r)) c.set(r, []); c.get(r).push(n); }
  return [...c.values()];
}

/** Orden dentro de una parte: el global (pos), corregido para que cada requisito vaya ANTES de quien lo pide (Kahn con prioridad por posición). */
function ordenTopologico(lista, E, pos) {
  const en = new Set(lista), antes = new Map(lista.map((n) => [n, 0])), despues = new Map(lista.map((n) => [n, []]));
  for (const [a, b] of E) if (en.has(a) && en.has(b) && a !== b) { antes.set(a, antes.get(a) + 1); despues.get(b).push(a); }
  const p = (n) => pos.get(n) ?? Infinity, listos = lista.filter((n) => antes.get(n) === 0), out = [];
  while (listos.length) {
    listos.sort((x, y) => p(x) - p(y) || x.localeCompare(y));
    const n = listos.shift(); out.push(n);
    for (const a of despues.get(n)) { antes.set(a, antes.get(a) - 1); if (antes.get(a) === 0) listos.push(a); }
  }
  if (out.length !== lista.length) throw new Error(`requiere en círculo entre: ${lista.filter((n) => !out.includes(n)).join(' ')}`);
  return out;
}

/** La parte de menor carga (empate: la de menor número). */
const masVacia = (cargas) => cargas.indexOf(Math.min(...cargas));

/**
 * Genera la asignación. seg: duración por prueba (s). previo: el reparto guardado (se conserva salvo rebalancear o n distinto).
 * anidadosPorPosicion: las medidas vienen de corridas repartidas por POSICIÓN en k partes; a quien pide se le descuenta un requisito (no «siempre»)
 * que allí no tenía antes en su misma parte (lo corrió por dentro y con la afinidad ya no lo correrá).
 */
function generar(R, { n, seg = {}, previo = null, rebalancear = false, anidadosPorPosicion = 0 }) {
  if (!(Number.isInteger(n) && n >= 1)) throw new Error('n tiene que ser un entero ≥ 1');
  const orden = catalogo(R), pos = new Map(orden.map((x, i) => [x, i])), { aristas: E, dinamicos } = aristas(R);
  const dur = new Map(orden.map((x) => [x, Number(seg[x] ?? previo?.seg?.[x] ?? NUEVA_SEG)]));
  if (anidadosPorPosicion > 0) {
    const k = anidadosPorPosicion, medida = new Map(dur);
    for (const [a, b, siempre] of E) if (!siempre && pos.has(a) && pos.has(b) && !(pos.get(a) % k === pos.get(b) % k && pos.get(b) < pos.get(a))) dur.set(a, Math.max(5, dur.get(a) - medida.get(b)));
  }
  const comps = componentes(orden, E).map((ns) => ({ ns, d: ns.reduce((s, x) => s + dur.get(x), 0), p: Math.min(...ns.map((x) => pos.get(x))) }));
  const parte = new Map(), cargas = Array(n).fill(0);
  const conservar = previo && !rebalancear && Array.isArray(previo.partes) && previo.partes.length === n;
  if (conservar) previo.partes.forEach((ps, i) => { for (const x of ps) if (pos.has(x)) parte.set(x, i); });
  const libres = [];
  for (const c of comps) {
    const puestas = c.ns.filter((x) => parte.has(x));
    if (!puestas.length) { libres.push(c); continue; }
    // Una componente partida (una arista nueva entre dos asignadas): va entera a la parte que ya tiene más segundos de ella.
    const porParte = new Map(); for (const x of puestas) porParte.set(parte.get(x), (porParte.get(parte.get(x)) ?? 0) + dur.get(x));
    const destino = [...porParte.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0];
    for (const x of c.ns) parte.set(x, destino);
  }
  for (const [x, i] of parte) cargas[i] += dur.get(x);
  // Lo que no tiene parte: la más larga primero a la parte más vacía (LPT); con todo libre es el reparto entero.
  for (const c of libres.sort((a, b) => b.d - a.d || a.p - b.p)) { const i = masVacia(cargas); cargas[i] += c.d; for (const x of c.ns) parte.set(x, i); }
  const partes = Array.from({ length: n }, (_, i) => ordenTopologico(orden.filter((x) => parte.get(x) === i), E, pos));
  return { partes, seg: Object.fromEntries(orden.map((x) => [x, Math.round(dur.get(x))])), aristas: E, dinamicos, cargas: cargas.map((c) => Math.round(c)) };
}

function leer(R) {
  const f = path.join(R, ARCHIVO);
  if (!fs.existsSync(f)) return null;
  return JSON.parse(fs.readFileSync(f, 'utf8'));
}

/**
 * Lo que corre la parte i de n con la asignación guardada, o null si no aplica (sin archivo, otra n, o una selección que no es la punta a punta
 * entera: «solo», --saltar, --desde…). Las pruebas nuevas (sin asignar) van a la parte de quien las une por `requiere`, si no a la más vacía.
 */
function parteDe(R, reparto, sel, i, n) {
  if (!reparto || !Array.isArray(reparto.partes) || reparto.partes.length !== n || !(i >= 1 && i <= n)) return null;
  const orden = catalogo(R);
  const enSel = new Set(sel);
  if (sel.length !== orden.length || orden.some((x) => !enSel.has(x))) return null;
  const pos = new Map(orden.map((x, k) => [x, k])), { aristas: E } = aristas(R);
  const parte = new Map(); reparto.partes.forEach((ps, k) => { for (const x of ps) if (enSel.has(x) && !parte.has(x)) parte.set(x, k); });
  const seg = (x) => Number(reparto.seg?.[x] ?? NUEVA_SEG), cargas = Array(n).fill(0);
  for (const [x, k] of parte) cargas[k] += seg(x);
  const nuevas = orden.filter((x) => !parte.has(x));
  for (const c of componentes(nuevas.length ? orden : [], E)) {
    const sin = c.filter((x) => !parte.has(x)); if (!sin.length) continue;
    const con = c.find((x) => parte.has(x)), k = con !== undefined ? parte.get(con) : masVacia(cargas);
    for (const x of sin) { parte.set(x, k); cargas[k] += seg(x); }
  }
  return ordenTopologico(orden.filter((x) => parte.get(x) === i - 1), E, pos);
}

/** Lo que el guardián repartoAsignado comprueba: [{ falla: bool, msg }]. nCi: las partes de la regresión en ci.yml. */
function comprobar(R, reparto, nCi) {
  const out = [], mal = (msg) => out.push({ falla: true, msg }), aviso = (msg) => out.push({ falla: false, msg });
  if (!reparto) { mal(`falta ${ARCHIVO} (node scripts/ci/repartir.mjs --regenerar …)`); return out; }
  if (!Array.isArray(reparto.partes) || !reparto.partes.length || reparto.partes.some((p) => !Array.isArray(p) || !p.length)) { mal('«partes» tiene que ser una lista de partes, ninguna vacía'); return out; }
  if (nCi !== undefined && reparto.partes.length !== nCi) mal(`el reparto es para ${reparto.partes.length} partes y la regresión de ci.yml corre en ${nCi}: regenerar con --partes ${nCi}`);
  const orden = catalogo(R), existe = new Set(orden), visto = new Map();
  reparto.partes.forEach((ps, k) => ps.forEach((x, j) => { if (visto.has(x)) mal(`${x} está dos veces (partes ${visto.get(x)[0] + 1} y ${k + 1})`); else visto.set(x, [k, j]); }));
  for (const x of visto.keys()) if (!existe.has(x)) mal(`${x} está en el reparto y ya no existe en pruebas/e2e: regenerar (node scripts/ci/repartir.mjs --regenerar)`);
  for (const x of visto.keys()) if (!(Number(reparto.seg?.[x]) >= 0)) mal(`${x} no tiene su duración (seg)`);
  const nuevas = orden.filter((x) => !visto.has(x));
  if (nuevas.length > 5) mal(`${nuevas.length} pruebas sin asignar (más de 5): regenerar el reparto (${nuevas.slice(0, 8).join(' ')}…)`);
  else if (nuevas.length) aviso(`${nuevas.length} prueba(s) nueva(s) sin asignar (van a la parte más vacía o a la de su requisito hasta regenerar): ${nuevas.join(' ')}`);
  const { aristas: E, dinamicos } = aristas(R);
  for (const [a, b] of E) {
    const pa = visto.get(a), pb = visto.get(b);
    if (!pa || !pb) { if (pa && !pb && existe.has(b)) mal(`${a} (parte ${pa[0] + 1}) requiere ${b}, que no está asignada: regenerar`); continue; }
    if (pa[0] !== pb[0]) mal(`${a} requiere ${b} y van en partes distintas (${pa[0] + 1} y ${pb[0] + 1}): las que se requieren van juntas`);
    else if (pb[1] > pa[1]) mal(`${a} requiere ${b} y ${b} va DESPUÉS en la parte ${pa[0] + 1}: el requisito va antes (orden topológico)`);
  }
  const dg = JSON.stringify([...dinamicos].sort()), dr = JSON.stringify([...(reparto.dinamicos ?? [])].sort());
  if (dg !== dr) mal(`quién llama a requiere con un nombre no escrito cambió (${dr} → ${dg}): revisar y regenerar`);
  return out;
}

module.exports = { ARCHIVO, NUEVA_SEG, catalogo, aristas, componentes, ordenTopologico, generar, leer, parteDe, comprobar };
