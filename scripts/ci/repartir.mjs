#!/usr/bin/env node
/* 22 nov · Revisión del CI (B3) · Escribe pruebas/reparto.json: a qué parte va cada prueba de punta a punta y en qué orden (pruebas/lib/reparto.cjs
   explica las reglas). Uso:
     node scripts/ci/repartir.mjs --regenerar --partes 8 --duraciones a.json [b.json …] [--anidados-por-posicion 4] [--rebalancear]
         a.json: un resumen.json de pruebas/correr.mjs ({ res: [{ nombre, seg, ok }] }) o un mapa { nombre: segundos }; con varios, la media de los
         que salieron en verde. Sin --rebalancear (y con la misma n) NO mueve a ninguna prueba ya asignada: actualiza duraciones, pone las nuevas
         (en la parte de su requisito o en la más vacía), quita las que ya no existen y rehace el orden. --rebalancear reparte todo de nuevo (LPT con
         afinidad): solo en un commit propio, con su confirmación (dos veces seguidas + barajada), cuando la parte más larga pase un 10 % de la media.
     node scripts/ci/repartir.mjs --comprobar      lo que mira el guardián repartoAsignado, y las cargas por parte
     node scripts/ci/repartir.mjs --casos          casos de prueba del reparto sobre catálogos de mentira (sin tocar el repo) */
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const RP = createRequire(import.meta.url)("../../pruebas/lib/reparto.cjs");
const args = process.argv.slice(2), opt = (k) => { const i = args.indexOf(k); return i < 0 ? null : args[i + 1]; }, flag = (k) => args.includes(k);
const nCi = () => { try { return Number(/\n      partes:\n[\s\S]*?\n        default: "(\d+)"/.exec(readFileSync(join(RAIZ, ".github/workflows/ci.yml"), "utf8"))?.[1]) || undefined; } catch { return undefined; } };

function duraciones(archivos) {
  const suma = new Map();
  for (const f of archivos) {
    const d = JSON.parse(readFileSync(f, "utf8"));
    const pares = Array.isArray(d?.res) ? d.res.filter((r) => r?.ok && Number.isFinite(r?.seg)).map((r) => [r.nombre, r.seg]) : Object.entries(d ?? {}).filter(([, s]) => Number.isFinite(s));
    for (const [n, s] of pares) { const x = suma.get(n) ?? [0, 0]; suma.set(n, [x[0] + s, x[1] + 1]); }
  }
  return Object.fromEntries([...suma].map(([n, [s, k]]) => [n, s / k]));
}

const resumen = (r) => {
  const media = r.cargas.reduce((s, c) => s + c, 0) / r.cargas.length;
  return `${r.partes.length} partes · segundos de pruebas por parte: ${r.cargas.join(" ")} · la más larga ${Math.max(...r.cargas)} s (${Math.round((Math.max(...r.cargas) / media - 1) * 100)} % sobre la media ${Math.round(media)} s)`;
};

if (flag("--regenerar")) {
  const n = Number(opt("--partes")), previo = RP.leer(RAIZ);
  const fuentes = []; const i = args.indexOf("--duraciones"); if (i >= 0) for (const a of args.slice(i + 1)) { if (a.startsWith("--")) break; fuentes.push(a); }
  const r = RP.generar(RAIZ, { n, seg: duraciones(fuentes), previo, rebalancear: flag("--rebalancear"), anidadosPorPosicion: Number(opt("--anidados-por-posicion") ?? 0) });
  let movidas = 0;
  if (previo?.partes?.length === n) { const antes = new Map(); previo.partes.forEach((ps, k) => ps.forEach((x) => antes.set(x, k))); r.partes.forEach((ps, k) => ps.forEach((x) => { if (antes.has(x) && antes.get(x) !== k) movidas++; })); }
  const salida = {
    nota: "Generado por scripts/ci/repartir.mjs (no se edita a mano). Lo usa pruebas/correr.mjs --parte i/n cuando n coincide; guardián repartoAsignado.",
    fuente: opt("--fuente") ?? previo?.fuente ?? "",
    dinamicos: r.dinamicos,
    partes: r.partes,
    seg: r.seg,
  };
  writeFileSync(join(RAIZ, RP.ARCHIVO), JSON.stringify(salida, null, 1) + "\n");
  console.log(`✓ ${RP.ARCHIVO}: ${resumen(r)} · pruebas que cambiaron de parte: ${movidas}${previo ? "" : " (no había reparto)"}`);
} else if (flag("--comprobar")) {
  const rep = RP.leer(RAIZ), out = RP.comprobar(RAIZ, rep, nCi());
  for (const x of out) console.log(`${x.falla ? "✗" : "~"} ${x.msg}`);
  if (rep?.partes) { const c = rep.partes.map((ps) => ps.reduce((s, x) => s + Number(rep.seg?.[x] ?? RP.NUEVA_SEG), 0)); console.log(resumen({ partes: rep.partes, cargas: c })); }
  process.exit(out.some((x) => x.falla) ? 1 : 0);
} else if (flag("--casos")) {
  // Catálogos de mentira en una carpeta temporal: pruebas/e2e/<nombre>.cjs con sus requiere.
  let bien = 0, total = 0;
  const ok = (c, que) => { total++; if (c) bien++; console.log(`  ${c ? "✓" : "✗"} ${que}`); };
  const arbol = (pruebas) => { const d = mkdtempSync(join(tmpdir(), "reparto-casos-")); mkdirSync(join(d, "pruebas", "e2e"), { recursive: true }); for (const [n, req] of Object.entries(pruebas)) writeFileSync(join(d, "pruebas", "e2e", `${n}.cjs`), req.map(([r, s]) => `const x = requiere('${r}', () => ''${s ? ", { siempre: true }" : ""});`).join("\n") + "\n"); return d; };
  const donde = (r, x) => r.partes.findIndex((p) => p.includes(x));
  const dirs = [];
  try {
    // 1. LPT: la más larga primero a la parte más vacía.
    let d = arbol({ a1x: [], b1x: [], c1x: [], d1x: [] }); dirs.push(d);
    let r = RP.generar(d, { n: 2, seg: { a1x: 10, b1x: 9, c1x: 8, d1x: 7 } });
    ok(JSON.stringify(r.cargas) === "[17,17]", `LPT equilibra 10 9 8 7 en dos partes de 17 (${r.cargas})`);
    // 2. Afinidad y orden topológico: el requisito va en la misma parte y ANTES, aunque en el orden global vaya después.
    d = arbol({ a4x: [["z4x"]], b4x: [], c4x: [], z4x: [] }); dirs.push(d);
    r = RP.generar(d, { n: 2, seg: { a4x: 50, b4x: 40, c4x: 30, z4x: 20 } });
    ok(donde(r, "a4x") === donde(r, "z4x"), "a4x y su requisito z4x van en la misma parte");
    ok(r.partes[donde(r, "a4x")].indexOf("z4x") < r.partes[donde(r, "a4x")].indexOf("a4x"), "z4x (requisito) corre antes que a4x aunque en el orden global vaya después");
    // 3. Cadenas: a ← b ← c, las tres juntas y en orden c, b, a.
    d = arbol({ a5x: [["b5x"]], b5x: [["c5x"]], c5x: [], q5x: [] }); dirs.push(d);
    r = RP.generar(d, { n: 3, seg: { a5x: 5, b5x: 5, c5x: 5, q5x: 100 } });
    const p3 = r.partes[donde(r, "a5x")];
    ok(donde(r, "b5x") === donde(r, "a5x") && donde(r, "c5x") === donde(r, "a5x") && p3.indexOf("c5x") < p3.indexOf("b5x") && p3.indexOf("b5x") < p3.indexOf("a5x"), `una cadena a←b←c queda junta y en orden (${p3.join(" ")})`);
    // 4. Estabilidad: regenerar con otras duraciones (sin --rebalancear) no mueve a nadie; con --rebalancear sí puede.
    d = arbol({ a1y: [], b1y: [], c1y: [], d1y: [], e1y: [], f1y: [] }); dirs.push(d);
    const r0 = RP.generar(d, { n: 3, seg: { a1y: 60, b1y: 50, c1y: 40, d1y: 30, e1y: 20, f1y: 10 } });
    const r1 = RP.generar(d, { n: 3, seg: { a1y: 5, b1y: 10, c1y: 15, d1y: 200, e1y: 25, f1y: 300 }, previo: r0 });
    ok(JSON.stringify(r0.partes) === JSON.stringify(r1.partes), "regenerar con otras duraciones no mueve ninguna prueba");
    const r2 = RP.generar(d, { n: 3, seg: { a1y: 5, b1y: 10, c1y: 15, d1y: 200, e1y: 25, f1y: 300 }, previo: r0, rebalancear: true });
    ok(JSON.stringify(r0.partes) !== JSON.stringify(r2.partes), "con --rebalancear sí se reparte de nuevo");
    // 5. Una prueba nueva va a la parte más vacía, al final, sin mover a las demás.
    writeFileSync(join(d, "pruebas", "e2e", "g1y.cjs"), "\n");
    const r3 = RP.generar(d, { n: 3, previo: r0 });
    const vacia = r0.cargas.indexOf(Math.min(...r0.cargas));
    ok(r0.partes.every((p, k) => p.every((x) => r3.partes[k].includes(x))) && donde(r3, "g1y") === vacia, `una prueba nueva va a la parte más vacía (${vacia + 1}) y nadie se mueve`);
    // 6. Una prueba nueva que requiere a una asignada va a la parte de su requisito, después de él.
    writeFileSync(join(d, "pruebas", "e2e", "h1y.cjs"), "requiere('a1y', () => '');\n");
    const r4 = RP.generar(d, { n: 3, previo: r0 });
    ok(donde(r4, "h1y") === donde(r0, "a1y") && r4.partes[donde(r4, "h1y")].indexOf("a1y") < r4.partes[donde(r4, "h1y")].indexOf("h1y"), "una prueba nueva que requiere a otra va a su parte y después de ella");
    // 7. Lo mismo al correr sin regenerar (correr.mjs --parte): la nueva entra, la parte de las demás no cambia; otra n o una selección parcial = null.
    const sel = RP.catalogo(d);
    const corre = [1, 2, 3].map((i) => RP.parteDe(d, r0, sel, i, 3));
    ok(corre.flat().sort().join() === sel.slice().sort().join() && corre[donde(r0, "a1y")].indexOf("a1y") < corre[donde(r0, "a1y")].indexOf("h1y"), "al correr, las partes suman todas las pruebas una vez (con las nuevas) y el requisito va antes");
    ok(RP.parteDe(d, r0, sel, 1, 4) === null && RP.parteDe(d, r0, sel.slice(1), 1, 3) === null, "con otra n o una selección parcial no se usa la asignación (por posición)");
    // 8. Comprobar: arista partida, requisito después, duplicada, desaparecida, demasiadas nuevas.
    const mal = (rep, re) => RP.comprobar(d, rep, 3).some((x) => x.falla && re.test(x.msg));
    const conA = JSON.parse(JSON.stringify({ ...r4, dinamicos: [] }));
    ok(!RP.comprobar(d, conA, 3).some((x) => x.falla), "el reparto generado pasa la comprobación");
    const partida = JSON.parse(JSON.stringify(conA)); const k = donde(partida, "h1y"); partida.partes[k] = partida.partes[k].filter((x) => x !== "h1y"); partida.partes[(k + 1) % 3].push("h1y");
    ok(mal(partida, /partes distintas/), "caza una arista partida en dos partes");
    const alReves = JSON.parse(JSON.stringify(conA)); const pk = alReves.partes[k]; pk.splice(pk.indexOf("h1y"), 1); pk.splice(pk.indexOf("a1y"), 0, "h1y");
    ok(mal(alReves, /DESPUÉS/), "caza un requisito que va después de quien lo pide");
    const doble = JSON.parse(JSON.stringify(conA)); doble.partes[(k + 1) % 3].push("a1y");
    ok(mal(doble, /dos veces/), "caza una prueba en dos partes");
    const fantasma = JSON.parse(JSON.stringify(conA)); fantasma.partes[0].push("zz9fantasma"); fantasma.seg.zz9fantasma = 1;
    ok(mal(fantasma, /ya no existe/), "caza una prueba asignada que ya no existe");
    ok(mal(conA, /no existe/) === false && RP.comprobar(d, conA, 4).some((x) => x.falla && /corre en 4/.test(x.msg)), "caza un reparto para otra n que la de ci.yml");
    for (const x of ["i1y", "j1y", "k1y", "l1y", "m1y", "n1y"]) writeFileSync(join(d, "pruebas", "e2e", `${x}.cjs`), "\n");
    ok(mal(conA, /sin asignar \(más de 5\)/), "más de 5 pruebas sin asignar es rojo");
  } finally { for (const x of dirs) rmSync(x, { recursive: true, force: true }); }
  console.log(`\n${bien}/${total} casos del reparto`);
  process.exit(bien === total ? 0 : 1);
} else {
  console.log("Uso: node scripts/ci/repartir.mjs --regenerar --partes <n> --duraciones <archivos…> | --comprobar | --casos");
  process.exit(2);
}
