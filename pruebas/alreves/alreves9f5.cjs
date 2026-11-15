// Prueba al revés de los guardianes de 9f-5. ayudaEditadaRepoManda (la ayuda editada en el Super Admin): el despliegue compara contra sha256 en vez del
// sha del archivo, no cierra las ediciones vivas, help_edits sin su trigger, editar sin revisar el texto o sin auditar, revisar sin FASE_INTERNA, la ruta
// pública saca el texto del equipo y la acción sin permiso. depositoRetenido: «se cobra al» partido en dos líneas en una ayuda.
// Se inyecta el defecto, el guardián debe fallar con SU mensaje; se restaura. También al derecho: «al instante, se cobra al enviar» es cierto.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const M = 'packages/db/migrations/0168_ayuda_editar.sql', L = 'apps/web/lib/compa/ayuda-indice.ts', A = 'apps/web/app/admin/acciones-textos.ts';
const casos = [
  ['ayudaEditadaRepoManda', M, "if found and coalesce(v.repo_sha256, v.sha256) = h and v.status <> 'retired' then return 'igual'; end if;", "if found and v.sha256 = h and v.status <> 'retired' then return 'igual'; end if;"],
  ['ayudaEditadaRepoManda', M, "   where e.slug = s and e.status = 'viva';", "   where false;"],
  ['ayudaEditadaRepoManda', M, 'create trigger help_edits_cierre before update or delete on help_edits', 'create trigger help_edits_cierre before delete on help_edits'],
  ['ayudaEditadaRepoManda', L, '  const mal = revisarTextoAyuda(t, sc.equipo || a.audience === "equipo");', '  const mal = null as Bi | null;'],
  ['ayudaEditadaRepoManda', L, 'await auditar(c, { actor: s.id, action: "ayuda.editar"', 'await Promise.resolve({ actor: s.id, action: "ayuda.editar"'],
  ['ayudaEditadaRepoManda', L, '  if (!equipo) for (const [re, que] of FASE_INTERNA as [RegExp, string][])', '  if (!equipo) for (const [re, que] of [] as [RegExp, string][])'],
  ['ayudaEditadaRepoManda', L, "case when a.audience <> 'equipo' and not e.equipo and a.status = 'live' then e.body_new end", 'e.body_new'],
  ['ayudaEditadaRepoManda', A, '  if (!s || !s.puede("cms", "editar")) return no("Tu rol no edita la ayuda.", "Your role cannot edit help.");\n  const r = await editarSeccionAyuda', '  if (!s) return no("Tu rol no edita la ayuda.", "Your role cannot edit help.");\n  const r = await editarSeccionAyuda'],
  ['depositoRetenido', 'docs/ayuda/booking-taller-hogar.md', 'El depósito se retiene al\n    enviar', 'El depósito se cobra al\n    enviar'],
];
const derecho = [['depositoRetenido', 'docs/ayuda/pagar-con-tarjeta.md', null]];
let bien = 0, total = 0;
const correr = (G) => {
  try { execSync(`node guardianes/run.mjs --solo ${G}`, { cwd: R, stdio: 'pipe' }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${G}]`)) ?? ''; return [!!l, l]; }
};
const informe = (G, que, [falla, out], esperaFalla = true) => { total++; const ok = falla === esperaFalla; console.log(`  ${ok ? '✓' : '✗'} ${G} ${esperaFalla ? 'al revés' : 'al derecho'} (${que})${out ? ' → ' + out.trim().slice(0, 170) : ''}`); if (ok) bien++; };
for (const [G, f, a, b] of casos) {
  const ruta = path.join(R, f);
  if (!fs.existsSync(ruta)) { total++; console.log(`  ✗ ${G}: no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ ${G}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let r; try { r = correr(G); } finally { fs.writeFileSync(ruta, orig); }
  informe(G, f.split('/').pop(), r);
}
for (const [G, f] of derecho) informe(G, f.split('/').pop(), correr(G), false);
let limpio = true; try { execSync('node guardianes/run.mjs', { cwd: R, stdio: 'pipe' }); } catch (e) { limpio = false; console.log(String(e.stderr).slice(0, 600)); }
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
