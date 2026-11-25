// Prueba al revés del guardián cobradoSoloSiQuedo (25 nov, 9u): el plan Pro dice «cobrado» (la pantalla: «ya tienes Pro. Te mandamos el recibo») solo con
// lo que de verdad quedó en la base. Pasaba: «Cambiar tarjeta» con el plan en cobro fallido devolvía cobrado: true sin mirar si el banco había aceptado la
// tarjeta nueva (din9u). Se inyecta el defecto, el guardián debe fallar con SU renglón ([cobradoSoloSiQuedo]); se restaura.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const S = 'apps/web/lib/suscripcion.ts', G = 'cobradoSoloSiQuedo';
const casos = [
  // El fallo del 25 nov: después de correr el cobro con la tarjeta nueva, «cobrado» sin leer el plan.
  ['cambiar tarjeta dice cobrado sin leer el plan', S, '      if (f?.st === "active") return { ok: true, cobrado: true };', '      return { ok: true, cobrado: true };'],
  // Lo mismo, pero leyendo el plan ANTES de correr el cobro (lo que dice no es lo que quedó).
  ['lee el plan antes de cobrar', S, '      await procesarYa(negocio);\n', '      void 0;\n'],
  // «Volver a Pro» sin mirar el resultado del cobro.
  ['volver a Pro sin mirar el cobro', S, '  if (!r.ok) return { ok: false, msg: r.msg, ...(r.hoja ? { verificar: r.hoja } : {}) };\n  return { ok: true, cobrado: true };',
    '  return { ok: true, cobrado: true };'],
  // «Reintentar cobro» del Super Admin: «Cobrado: sigue con Pro.» sin leer si quedó activo.
  ['reintentar dice cobrado sin leer el plan', S, '  if (s?.status === "active") return { ok: true };', '  return { ok: true };'],
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
