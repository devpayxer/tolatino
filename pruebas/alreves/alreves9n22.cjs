// Prueba al revés del guardián de 9n-22 (LAUNCH-CHECKLIST «Auditoría en la misma transacción que el cambio»). auditoriaEnLaTransaccion: una
// acción del panel vuelve a escribir audit_entries por db() (el ayudante, una constante del SQL), cambia por db() fuera de la transacción de su
// auditoría, un ayudante de lib se llama con null, o una función de lib cambia y audita en dos sentencias sueltas. Se inyecta el defecto, el
// guardián debe fallar con SU mensaje; se restaura. «crear»: se crea el archivo, se corre y se borra (y una vista auditada sin cambio, al derecho,
// NO debe fallar).
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const G = 'auditoriaEnLaTransaccion';
const PU = 'apps/web/app/panel/acciones-puerta.ts', EQ = 'apps/web/app/panel/acciones-equipo.ts', AU = 'apps/web/app/panel/acciones-autos.ts',
  AC = 'apps/web/app/panel/acciones.ts', RP = 'apps/web/lib/resena-pedir.ts', PA = 'apps/web/lib/patrocinio.ts', RB = 'apps/web/lib/repartidor-barrido.ts';
const casos = [
  // El ayudante de la puerta vuelve a la conexión suelta (lo que cazó evt6g el 17 nov).
  [PU, 'async function auditar(c: PoolClient, a: Acceso, action: string, after: unknown, before: unknown = null) {\n  await c.query(',
    'async function auditar(c: PoolClient, a: Acceso, action: string, after: unknown, before: unknown = null) {\n  await db().query('],
  // El cambio del equipo sale de la transacción y queda por db(), con su auditoría en otra.
  [EQ, "    await c.query(`update business_members set status = 'removed', removed_reason = 'canceled'",
    "    await db().query(`update business_members set status = 'removed', removed_reason = 'canceled'"],
  // La constante del SQL de la auditoría (Autos) por la conexión suelta.
  [AU, '    await c.query(auditoria, [a.yo.id, "autos.carro.estado"', '    await db().query(auditoria, [a.yo.id, "autos.carro.estado"'],
  // «Cerrar por hoy»: la auditoría vuelve a ir después, por db().
  [AC, '    await auditar(c, a, cerrar ? "panel.cerrar_hoy" : "panel.abrir_hoy", null, null);\n  });',
    '  });\n  await db().query(`insert into audit_entries (actor_kind, actor_id, action, target_kind) values (\'user\', $1, \'panel.cerrar_hoy\', \'business\')`, [a.yo.id]);'],
  // Pedir reseña (lib): la solicitud y su auditoría en dos sentencias sueltas otra vez.
  [RP, "    const ins = await c.query(`insert into review_requests", "    const ins = await db().query(`insert into review_requests"],
  // Un ayudante «c o null» llamado con null (patrocinio: renovación sola).
  [PA, '    if (r.rowCount) await auditarNegocio(c, quien, negocio, r.rows[0]!.city_id,', '    if (r.rowCount) await auditarNegocio(null, quien, negocio, r.rows[0]!.city_id,'],
  // El barrido de las colas: soltar por db() y auditar por db().
  [RB, "    const r = await c.query<{ id: string; quien: string; city: string | null; queue: string }>(", "    const r = await db().query<{ id: string; quien: string; city: string | null; queue: string }>("],
];
const crear = [
  // Una acción nueva del panel con el error de siempre.
  ['apps/web/app/panel/acciones-zz9n22.ts', '"use server";\nimport { db } from "@/lib/db";\nexport async function zz(n: string) {\n  await db().query(`update businesses set updated_at = now() where id = $1`, [n]);\n  await db().query(`insert into audit_entries (actor_kind, action, target_kind, target_id) values (\'user\', \'zz\', \'business\', $1)`, [n]);\n}\n', true],
  // Una función nueva de lib que cambia y audita suelto.
  ['apps/web/lib/zz9n22.ts', 'import { db } from "./db";\nexport async function zz(n: string) {\n  await db().query(`update businesses set updated_at = now() where id = $1`, [n]);\n  await db().query(`insert into audit_entries (actor_kind, action, target_kind, target_id) values (\'system\', \'zz\', \'business\', $1)`, [n]);\n}\n', true],
  // Al derecho: una vista auditada sin cambio (como «ver la dirección») no es esta clase.
  ['apps/web/lib/zz9n22b.ts', 'import { db } from "./db";\nexport async function zzVer(n: string, u: string) {\n  const r = (await db().query(`select about from businesses where id = $1`, [n])).rows[0];\n  await db().query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id) values (\'user\', $2, \'zz.ver\', \'business\', $1)`, [n, u]);\n  return r;\n}\n', false],
];
let bien = 0, total = 0;
const correr = () => {
  try { execSync(`node guardianes/run.mjs --solo ${G}`, { cwd: R, stdio: 'pipe' }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${G}]`)) ?? ''; return [!!l, l]; }
};
const informe = (que, [falla, out], esperaFalla = true) => { total++; const ok = falla === esperaFalla; console.log(`  ${ok ? '✓' : '✗'} ${G} ${esperaFalla ? 'al revés' : 'al derecho'} (${que})${out ? ' → ' + out.trim().slice(0, 170) : ''}`); if (ok) bien++; };
for (const [f, a, b] of casos) {
  const ruta = path.join(R, f);
  if (!fs.existsSync(ruta)) { total++; console.log(`  ✗ ${G}: no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ ${G}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let r; try { r = correr(); } finally { fs.writeFileSync(ruta, orig); }
  informe(f.split('/').pop(), r);
}
for (const [f, c, esperaFalla] of crear) { const ruta = path.join(R, f); fs.writeFileSync(ruta, c); let r; try { r = correr(); } finally { fs.unlinkSync(ruta); } informe(`crear ${f.split('/').pop()}`, r, esperaFalla); }
let limpio = true; try { execSync('node guardianes/run.mjs', { cwd: R, stdio: 'pipe' }); } catch (e) { limpio = false; console.log(String(e.stderr).slice(0, 600)); }
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
