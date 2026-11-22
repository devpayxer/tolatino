// Prueba al revés del guardián fotosSinEnviarSePurgan (19 nov): la foto de Mensajes subida y nunca mandada sale del almacén a las 24 h. Se inyecta
// el defecto, el guardián debe fallar con SU mensaje ([fotosSinEnviarSePurgan]); se restaura.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const P = 'apps/web/lib/mensajes-purga.ts', G = 'fotosSinEnviarSePurgan';
const casos = [
  [G, 'apps/web/lib/barrido.ts', '["fotosSinEnviar", async () => (await import("./mensajes-purga")).purgarFotosSinEnviar()],', ''],
  [G, P, "created_at < now() - interval '24 hours'", "created_at < now() - interval '2 hours'"],
  [G, 'apps/web/lib/mensajes.ts', "created_at > now() - interval '24 hours' for update", "created_at > now() - interval '48 hours' for update"],
  [G, P, "where id = $1::uuid and owner_id = 'pendiente' and purged_at is null", "where id = $1::uuid and purged_at is null"],
  [G, P, "await db().query(`update media set purged_at = now(), status = 'removed', removed_reason = 'sin_enviar', removed_at = now()", "await db().query(`delete from media where id = $1::uuid; update media set status = 'removed', removed_reason = 'sin_enviar', removed_at = now()"],
  [G, 'pruebas/e2e/msg9t.cjs', '5b · La foto que se sube y nunca se manda', '5b · otra cosa'],
];
let bien = 0, total = 0;
const correr = (g) => {
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${g}]`)) ?? ''; return [!!l, l]; }
};
const informe = (g, que, [falla, out]) => { total++; console.log(`  ${falla ? '✓' : '✗'} ${g} al revés (${que})${out ? ' → ' + out.trim().slice(0, 170) : ''}`); if (falla) bien++; };
for (const [g, f, a, b] of casos) {
  const ruta = path.join(R, f);
  if (!fs.existsSync(ruta)) { total++; console.log(`  ✗ no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let r; try { r = correr(g); } finally { fs.writeFileSync(ruta, orig); }
  informe(g, f.split('/').pop(), r);
}
let limpio = require('../lib/alreves-fin.cjs')(R, { mostrar: true });
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
