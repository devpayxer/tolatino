// Prueba al revés del guardián fotoAprobadaAvisa (19 nov): la foto de un mensaje que el equipo aprueba avisa a la otra parte (una vez, nunca con
// bloqueo o cierre). Se inyecta el defecto, el guardián debe fallar con SU mensaje ([fotoAprobadaAvisa]); se restaura.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const A = 'apps/web/app/admin/acciones-confianza.ts', M = 'apps/web/lib/mensajes.ts', V = 'apps/web/lib/mensajes-vecinos.ts', G = 'fotoAprobadaAvisa';
const casos = [
  [G, A, 'if (r.aprobada && r.owner === "chat") await (await import("@/lib/mensajes")).avisarFotoAprobada(r.tid).catch(() => undefined);', ''],
  [G, A, 'if (r.aprobada && r.owner === "dm") await (await import("@/lib/mensajes-vecinos")).avisarFotoDmAprobada(r.tid).catch(() => undefined);', ''],
  [G, A, 'aprobada: accion === "mantener" && f.status === "review"', 'aprobada: accion === "mantener"'],
  [G, M, 'if (!x || x.bloqueado) return;', 'if (!x) return;'],
  [G, M, 'if (x.de === "user") await avisarEquipo(', 'if (x.de === "nadie") await avisarEquipo('],
  [G, V, "where m.media_id = $1::uuid and t.closed_at is null`", "where m.media_id = $1::uuid`"],
  [G, V, 'if (callado) return;', 'void callado;'],
  [G, 'pruebas/e2e/msg9t.cjs', 'recibe el aviso de la foto (una vez)', 'recibe algo'],
  [G, 'pruebas/e2e/dm9t.cjs', 'recibe el aviso de la foto (una vez)', 'recibe algo'],
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
