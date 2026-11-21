// Prueba al revés del guardián pasoQueSuma (21 nov): un paso del panel (− valor +) que guarda en el servidor en cada toque no calcula desde el valor
// pintado. Se inyecta el defecto, el guardián debe fallar con SU mensaje ([nombre]); se restaura. «crear»: se crea el archivo, se corre y se borra.
const ENT = require('../lib/entorno.cjs'); // rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const BL = 'packages/ui/src/panel/Bloques.tsx', PA = 'apps/web/app/panel/Panel.tsx', IX = 'packages/ui/src/index.ts',
  FI = 'apps/web/app/panel/Fiestas.tsx', NI = 'apps/web/app/panel/Ninos.tsx', DE = 'apps/web/app/panel/Deporte.tsx', RE = 'apps/web/app/panel/Retail.tsx';
const casos = [
  // un paso de Fiestas vuelve a guardar con onM/onP directos, calculados desde h.perDay (el valor pintado)
  ['pasoQueSuma', FI,
    `    pasoSrv({ t: E2("Eventos el mismo día", "Events the same day"), s: E2("Cuántas fiestas puedes atender en un día. Al llenarse, la fecha sale ocupada.", "How many parties you can serve in a day. When full, the date shows as booked."),
      n: h.perDay, fmt: String, sig: (n, d) => d < 0 ? Math.max(1, n - 1) : Math.min(20, n + 1), save: (n) => save({ perDay: n }) }),`,
    `    { type: "step", t: E2("Eventos el mismo día", "Events the same day"), s: E2("Cuántas fiestas puedes atender en un día. Al llenarse, la fecha sale ocupada.", "How many parties you can serve in a day. When full, the date shows as booked."),
      v: String(h.perDay), onM: () => save({ perDay: Math.max(1, h.perDay - 1) }), onP: () => save({ perDay: Math.min(20, h.perDay + 1) }) },`],
  // … lo mismo en Deporte (la mensualidad, la que dep4c toca)
  ['pasoQueSuma', DE,
    `  if (h.mes) out.push(pasoSrv({ t: E2("Mensualidad", "Monthly fee"), s: E2("Lo que se cobra cada mes, sin cargos escondidos.", "What is charged each month, no hidden fees."),
    n: h.mes.cents, fmt: usdD, sig: (n, d) => d < 0 ? Math.max(500, n - 100) : Math.min(30000, n + 100), save: (n) => save({ mes: n }) }));`,
    `  if (h.mes) out.push({ type: "step", t: E2("Mensualidad", "Monthly fee"), s: E2("Lo que se cobra cada mes, sin cargos escondidos.", "What is charged each month, no hidden fees."), v: usdD(h.mes.cents),
    onM: () => save({ mes: Math.max(500, h.mes!.cents - 100) }), onP: () => save({ mes: Math.min(30000, h.mes!.cents + 100) }) });`],
  // la excepción de las tallas pierde su motivo (GUARDIAN-OK): el paso con c.run directo vuelve a contar como defecto
  ['pasoQueSuma', RE,
    '    // GUARDIAN-OK pasoQueSuma: cada toque es UN movimiento de ±1 que el servidor suma de forma atómica (tallaExistencia: stock_left + delta), no un valor: N toques suman N.\n', ''],
  // el paso con srv calcula desde el valor de la pantalla, no desde el último pedido
  ['pasoQueSuma', BL, 'base = x.want ?? sv.current.n, nx = sv.current.sig(base, d, pedidoDe(cola()));', 'base = sv.current.n, nx = sv.current.sig(base, d, pedidoDe(cola()));'],
  // … deja de mandar lo último pedido cuando termina el guardado de antes
  ['pasoQueSuma', BL, 'if (y.want !== null && y.want !== (y.known ?? m.sv.current.n)) { manda(); return; }', ''],
  // … o ya no vuelve al valor del servidor cuando este dice que no
  ['pasoQueSuma', BL, 'if (ok === false) { for (const m of [...g.m.values()]) m.suelta(); return; }', ''],
  // c.run deja de decir si se guardó (el paso no sabe cuándo mandar el siguiente toque)
  ['pasoQueSuma', PA, '      } finally { fin(bien); }', '      } finally { /* sin avisar */ }'],
  // La pareja (21 nov): Desde y Hasta de Ninos guardan el par `edad` entero; sin compartir grupo se pisan con dos toques rápidos
  ['pasoQueSuma', NI, 'grupo: { id: `ninos-edad:${c.d.id}`, campo: "hasta" }, ', ''],
  ['pasoQueSuma', NI, 'grupo: { id: `ninos-edad:${c.d.id}`, campo: "desde" }, ', ''],
  // … o la cola deja de ser del grupo (cada paso manda por su cuenta y los dos guardados se cruzan)
  ['pasoQueSuma', BL, 'cur.save(v, desde, pedido)', 'cur.save(v, desde, {})'],
  // … o el save de un paso vuelve a mandar el registro entero con el valor viejo del otro campo y sin grupo (un save con ...)
  ['pasoQueSuma', FI, 'save: (n) => save({ perDay: n }) }),', 'save: (n) => save({ ...h, perDay: n }) }),'],
  // pasoSrv deja de salir de @tolatino/ui
  ['pasoQueSuma', IX, 'export { PanelBloque, PanelBloques, pasoSrv, type PasoSrv,', 'export { PanelBloque, PanelBloques, type PasoSrv,'],
];
const crear = [
  // un archivo nuevo del panel con un paso que guarda directo (la clase, en una pantalla que todavía no existe)
  ['pasoQueSuma', 'apps/web/app/panel/PasoDeMentira.tsx',
    `"use client";
import type { PanelBloqueT as Bloque } from "@tolatino/ui";
import type { Ctx } from "./Panel";
import { guardarCosa } from "./acciones-cosa";
export function pasoDeMentira(c: Ctx, h: { n: number }): Bloque {
  const save = (p: { n: number }) => c.run(() => guardarCosa(c.d.id, p));
  return { type: "step", t: "Cosas", v: String(h.n), onM: () => save({ n: h.n - 1 }), onP: () => save({ n: h.n + 1 }) };
}
`],
  // la clase en una pantalla que todavía no existe: dos pasos con el mismo registro (la misma clave) sin grupo
  ['pasoQueSuma', 'apps/web/app/panel/ParejaDeMentira.tsx',
    `"use client";
import { pasoSrv, type PanelBloqueT as Bloque } from "@tolatino/ui";
import type { Ctx } from "./Panel";
import { guardarCosa } from "./acciones-cosa";
export function parejaDeMentira(c: Ctx, h: { r: [number, number] }): Bloque[] {
  const save = (p: { rango: [number, number] }) => c.run(() => guardarCosa(c.d.id, p));
  return [
    pasoSrv({ t: "Desde", n: h.r[0], fmt: String, sig: (n, d) => n + d, save: (n) => save({ rango: [n, h.r[1]] }) }),
    pasoSrv({ t: "Hasta", n: h.r[1], fmt: String, sig: (n, d) => n + d, save: (n) => save({ rango: [h.r[0], n] }) })];
}
`],
];
let bien = 0, total = 0;
const correr = (g, env = {}) => {
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe', env: { ...process.env, ...env } }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${g}]`)) ?? ''; return [!!l, l]; }
};
const informe = (g, que, [falla, out]) => { total++; console.log(`  ${falla ? '✓' : '✗'} ${g} al revés (${que})${out ? ' → ' + out.trim().slice(0, 170) : ''}`); if (falla) bien++; };
for (const [g, f, a, b, env] of casos) {
  const ruta = path.join(R, f);
  if (!fs.existsSync(ruta)) { total++; console.log(`  ✗ ${g}: no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ ${g}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let r; try { r = correr(g, env); } finally { fs.writeFileSync(ruta, orig); }
  informe(g, f.split('/').pop(), r);
}
for (const [g, f, c] of crear) {
  const ruta = path.join(R, f), dir = path.dirname(ruta), nuevo = !fs.existsSync(dir);
  fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(ruta, c);
  let r; try { r = correr(g); } finally { fs.unlinkSync(ruta); if (nuevo) try { fs.rmdirSync(dir); } catch { /* no vacía */ } }
  informe(g, `crear ${f.split('/').pop()}`, r);
}
let limpio = true; try { execSync('node guardianes/run.mjs', { cwd: R, stdio: 'pipe' }); } catch (e) { limpio = false; console.log(String(e.stderr).slice(0, 600)); }
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
