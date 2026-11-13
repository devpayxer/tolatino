// Prueba al revés de los guardianes de 5a: se inyecta el defecto, el guardián debe fallar; se restaura.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const casos = [
  ['comunidadSinTelefonos', 'apps/web/lib/comunidad-filtro.ts', 'if (TEL.test(t)) return', 'if (false) return'],
  ['comunidadSinTelefonos', 'apps/web/lib/comunidad.ts', '  const f = revisarPublicacion(p, diasEncuesta(await valor("com_encuesta_dias_max")));\n  if (f) return { ok: false, msg: f.msg, campo: f.campo };\n', ''],
  ['comunidadSinTelefonos', 'packages/db/migrations/0097_comunidad_base.sql', "alter table com_comments add constraint com_comments_datos check (com_sin_datos(body));", ''],
  ['comunidadSinTelefonos', 'apps/web/app/admin/acciones-comunidad.ts', '"use server";', '"use server";\n// insert into com_posts (body) values (\'x\')\nconst q = "insert into com_posts (body) values ($1)";'],
  ['ubicacionDeBarrio', 'apps/web/lib/comunidad.ts', '  p.id::text as id, p.kind,', '  p.id::text as id, st_astext(p.geom) as punto, p.kind,'],
  ['ubicacionDeBarrio', 'packages/db/migrations/0097_comunidad_base.sql', "raise exception 'la ubicación de una publicación la pone la base (centro del barrio)';", 'null;'],
  ['bloqueoMutuo', 'apps/web/lib/comunidad.ts', 'where p.id = $2::bigint and p.publish_at <= now() and ${sinBloqueos("p.author_user_id", "$1")}', 'where p.id = $2::bigint and p.publish_at <= now()'],
  ['bloqueoMutuo', 'apps/web/lib/comunidad.ts', " or (ub.kind = 'block' and ub.user_id = ${autor} and ub.target_user_id = ${viewer})", ''],
  ['feedConCursor', 'apps/web/lib/comunidad.ts', 'order by ${orden} limit ${POR_PAGINA + 1})) order by', 'order by ${orden} limit ${POR_PAGINA + 1} offset 20)) order by'],
  ['feedConCursor', 'packages/db/migrations/0097_comunidad_base.sql', "on com_posts (city_id, hot desc, id desc) where status = 'visible'", "on com_posts (city_id, hot desc)"],
  ['comunidadSoloConCuenta', 'apps/web/app/(app)/comunidad/sesion.ts', 'if (!u?.first_name) redirect(`/entrar?volver=${encodeURIComponent(volver)}`);', 'if (!u?.first_name) throw new Error("x");'],
  ['comunidadSoloConCuenta', 'apps/web/app/(app)/comunidad/p/[id]/page.tsx', '  const s = await conCuenta(`/comunidad/p/${encodeURIComponent(id)}`);\n  const orden', '  const h0 = await hilo(id, "x", null);\n  const s = await conCuenta(`/comunidad/p/${encodeURIComponent(id)}`);\n  const orden'],
  ['comunidadSoloConCuenta', 'apps/web/app/(app)/comunidad/acciones.ts', 'export async function comGuardar(id: string) { const q = await quien(); return q.e ?? guardar(q.u.id, texto(id, 20)); }', 'export async function comGuardar(id: string) { return guardar("x", texto(id, 20)); }'],
  ['comunidadSoloConCuenta', 'apps/web/lib/comunidad.ts', "`select p.kind, ${ISO(\"p.publish_at\")} as at from com_posts p", "`select p.kind, p.body, ${ISO(\"p.publish_at\")} as at from com_posts p"],
  ['noTePromuevas', 'apps/web/lib/comunidad.ts', '      if (await esSuNegocio(c, userId, b.id)) return no(', '      if (false && await esSuNegocio(c, userId, b.id)) return no('],
  ['noTePromuevas', 'apps/web/lib/comunidad.ts', " and m.status = 'active'))`,\n    [userId, negocio]", "))`,\n    [userId, negocio]"],
  ['emergencia911', 'apps/web/lib/comunidad-filtro.ts', 'Una emergencia no se pregunta aquí: llama al 911.", en', 'Una emergencia no se pregunta aquí.", en'],
  ['emergencia911', 'apps/web/app/(app)/comunidad/Tarjeta.tsx', '{es ? LINEA911.es : LINEA911.en}', '{null}'],
  ['emergencia911', 'apps/web/app/(app)/comunidad/nuevo/Nuevo.tsx', '{es ? EMERGENCIA911.es : EMERGENCIA911.en}', '{null}'],
];
let bien = 0;
for (const [g, f, a, b] of casos) {
  const ruta = `${R}/${f}`, orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { console.log(`  ✗ ${g}: no encontré el texto a cambiar en ${f}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, b));
  let falla = false;
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); } catch { falla = true; }
  fs.writeFileSync(ruta, orig);
  console.log(`  ${falla ? '✓' : '✗'} ${g} al revés (${f.split('/').pop()})`); if (falla) bien++;
}
let limpio = true; try { execSync('node guardianes/run.mjs', { cwd: R, stdio: 'pipe' }); } catch { limpio = false; }
console.log(`${bien}/${casos.length} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === casos.length && limpio ? 0 : 1);
