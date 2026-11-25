// Prueba al revés del guardián devueltoSoloSiSalio (25 nov, 9v): un patrocinio dice «devuelto» (el panel: «Reserva cancelada. Te devolvemos $15.00 a tu
// tarjeta») solo con lo que la pasarela devolvió. Pasaba: «Cancelar reserva» del dueño devolvía lo decidido (refund_cents) aunque Stripe hubiera rechazado la
// devolución (din9v2). Se inyecta el defecto, el guardián debe fallar con SU renglón ([devueltoSoloSiSalio]); se restaura.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const G = 'devueltoSoloSiSalio';
const P = 'apps/web/lib/patrocinio.ts', E = 'apps/web/lib/patrocinio-evento.ts';
const casos = [
  // El fallo del 25 nov: lo decidido como devuelto, sin mirar la pasarela.
  ['cancelar reserva devuelve lo decidido', P, '  if (dev) return { ok: true, devuelto: dev };', '  if (dev) return { ok: true, devuelto: decidido };'],
  // El dueño del patrocinio de evento vuelve a lo de antes.
  ['el evento devuelve refund_cents', E, '  return devolverYDecir("evento", id, r.rows[0]!.refund_cents);', '  return { ok: true, devuelto: r.rows[0]!.refund_cents ?? 0 };'],
  // El Super Admin dice «Se devolvieron» con lo decidido.
  ['el admin dice devuelto con lo decidido', P, '  return { ok: true, devuelto: dev, msg: quiere', '  return { ok: true, devuelto: quiere, msg: quiere'],
  // La acción del panel deja de pasar lo que pasó con la devolución.
  ['la acción no pasa devolucion', 'apps/web/app/panel/acciones-patrocinio.ts', 'devuelto: r.devuelto, devolucion: r.devolucion, aDevolver: r.aDevolver', 'devuelto: r.devuelto'],
  // La pantalla del evento ya no dice la fallida.
  ['la pantalla calla la fallida', 'apps/web/app/panel/PatrocinioEvento.tsx', 'r?.devolucion === "fallida" ? E2(', 'false ? E2('],
];
let bien = 0, total = 0;
const correr = (g) => {
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${g}]`)) ?? ''; return [!!l, l]; }
};
const informe = (que, [falla, out]) => { total++; console.log(`  ${falla ? '✓' : '✗'} ${G} al revés (${que})${out ? ' → ' + out.trim().slice(0, 170) : ''}`); if (falla) bien++; };
for (const [que, f, a, b] of casos) {
  const ruta = path.join(R, f);
  if (!fs.existsSync(ruta)) { total++; console.log(`  ✗ no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let r; try { r = correr(G); } finally { fs.writeFileSync(ruta, orig); }
  informe(que, r);
}
let limpio = require('../lib/alreves-fin.cjs')(R, { mostrar: true });
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
