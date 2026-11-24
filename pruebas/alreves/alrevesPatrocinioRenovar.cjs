// Prueba al revés del guardián patrocinioRenovarFechas (24 nov): «Renovar otra semana / otro mes» enseña las fechas del período que se va a cobrar,
// calculadas igual que el cobro con renovarDe (el mismo patrocinio, el día en que termina, la misma cadena; en Eventos «hoy» si termina hoy), sin el
// tope de patrocinio_dias_adelante y solo lectura; las acciones pasan por entrar() y la pantalla de renovar usa esa consulta. Un caso por regla: se
// inyecta el defecto, el guardián debe fallar con SU renglón ([patrocinioRenovarFechas]); se restaura. Punta a punta: pat003 §11.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const G = 'patrocinioRenovarFechas';
const L = 'apps/web/lib/patrocinio.ts', LE = 'apps/web/lib/patrocinio-evento.ts', A = 'apps/web/app/panel/acciones-patrocinio.ts', AE = 'apps/web/app/panel/acciones-patrocinio-evento.ts';
const U = 'apps/web/app/panel/Patrocinio.tsx', UE = 'apps/web/app/panel/PatrocinioEvento.tsx';
const casos = [
  // 1 · Negocios: otro patrocinio, otro día, sin la cadena, con el tope de días adelante, o escribiendo.
  [L, "      where s.id = $1::bigint and s.business_id = $2 and s.status in ('activo', 'reservado')`, [renovarDe, negocio, n.tz])).rows[0];", "      where s.id = $1::bigint and s.status in ('activo', 'reservado', 'terminado')`, [renovarDe, negocio, n.tz])).rows[0];"],
  [L, '  const f = await fechasPeriodo(null, n.city_id, v.dia, dur, { tabla: "sponsorships", negocio, categoria: n.category_id });', '  const f = await fechasPeriodo(null, n.city_id, "hoy", dur, { tabla: "sponsorships", negocio, categoria: n.category_id });'],
  [L, '  const f = await fechasPeriodo(null, n.city_id, v.dia, dur, { tabla: "sponsorships", negocio, categoria: n.category_id });', '  const f = await fechasPeriodo(null, n.city_id, v.dia, dur, null);'],
  [L, '  const f = await fechasPeriodo(null, n.city_id, v.dia, dur, { tabla: "sponsorships", negocio, categoria: n.category_id });\n  if (!f) return null;\n  const l = await puestosLibres(', '  const f = await fechasPeriodo(null, n.city_id, v.dia, dur, { tabla: "sponsorships", negocio, categoria: n.category_id });\n  if (!f) return null;\n  if (f.dia > (await consultarPuestos(negocio, dur, "hoy"))!.max) return null;\n  const l = await puestosLibres('],
  [L, '  return { desde: f.dia, hasta: fin.hasta, a: f.a, b: f.b, libres: l.libres, puestos: P.puestos, libre: fin.libre, max: fin.max };', '  if (f.dia > fin.max) return null;\n  return { desde: f.dia, hasta: fin.hasta, a: f.a, b: f.b, libres: l.libres, puestos: P.puestos, libre: fin.libre, max: fin.max };'],
  [L, '  return { desde: f.dia, hasta: fin.hasta, a: f.a, b: f.b, libres: l.libres, puestos: P.puestos, libre: fin.libre, max: fin.max };\n}', '  await db().query(`update sponsorships set auto_renew = auto_renew where id = $1::bigint`, [renovarDe]);\n  return { desde: f.dia, hasta: fin.hasta, a: f.a, b: f.b, libres: l.libres, puestos: P.puestos, libre: fin.libre, max: fin.max };\n}'],
  // El cobro se aparta de la consulta (la consulta ya no dice lo que se cobra).
  [L, '    desde = v.dia; renovarDe = String(x.renovarDe);', '    desde = "hoy"; renovarDe = String(x.renovarDe);'],
  // 2 · Eventos: otro patrocinio, sin «hoy», otra duración en el cobro, con el tope.
  [LE, "  const v = (await db().query<{ dia: string }>(`select (s.ends_at at time zone $3)::date::text as dia from event_sponsorships s where s.id = $1::bigint and s.event_id = $2::bigint and s.status in ('activo', 'reservado')`,\n    [renovarDe, evento, e.tz])).rows[0];", "  const v = (await db().query<{ dia: string }>(`select (s.ends_at at time zone $3)::date::text as dia from event_sponsorships s where s.id = $1::bigint and s.status in ('activo', 'reservado')`,\n    [renovarDe, evento, e.tz])).rows[0];"],
  [LE, '  const desde = v.dia === e.hoy ? "hoy" : v.dia;', '  const desde = v.dia;'],
  [LE, '  const f = await periodo(null, e, dur, desde, P);\n  if (!f) return null;\n  const l = await puestosLibresEvt(', '  const f = await periodo(null, e, "week", desde, P);\n  if (!f) return null;\n  const l = await puestosLibresEvt('],
  [LE, '  const desde = v.dia === e.hoy ? "hoy" : v.dia;', '  const desde = v.dia === e.hoy ? "hoy" : v.dia;\n  if (desde !== "hoy" && desde > maxInicio(e, P, dur)) return null;'],
  [LE, '  if (desde !== "hoy" && desde === e.hoy) desde = "hoy";', ''],
  // 3 · Las acciones: sin entrar(), o con la consulta de elegir fecha.
  [A, '  const a = await entrar(id);\n  if (!a) return null;\n  return consultarRenovacion(a.negocio.id, ', '  const a = { negocio: { id } };\n  return consultarRenovacion(a.negocio.id, '],
  [AE, '  const a = await entrar(id, evento);\n  if (!a) return null;\n  return consultarRenovacionEvento(a.negocio.id, evento, ', '  const a = await entrar(id, evento);\n  if (!a) return null;\n  return consultarPuestosEvento(a.negocio.id, evento, '],
  // 4 · La pantalla: «Renovar otro mes» vuelve a pedir la consulta de elegir fecha.
  [U, 'void patPuestosRenovar(d.id, v.id, kk).then', 'void patPuestos(d.id, kk, de).then'],
  [UE, 'void pevPuestosRenovar(d.id, eventoId, v.id, kk).then', 'void pevPuestos(d.id, eventoId, kk, de).then'],
];
let bien = 0, total = 0;
const correr = () => {
  try { execSync(`node guardianes/run.mjs --solo ${G}`, { cwd: R, stdio: 'pipe' }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${G}]`)) ?? ''; return [!!l, l]; }
};
for (const [f, a, b] of casos) {
  const ruta = path.join(R, f);
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let r; try { r = correr(); } finally { fs.writeFileSync(ruta, orig); }
  total++; console.log(`  ${r[0] ? '✓' : '✗'} ${G} al revés (${f.split('/').pop()})${r[1] ? ' → ' + r[1].trim().slice(0, 170) : ''}`); if (r[0]) bien++;
}
const limpio = require('../lib/alreves-fin.cjs')(R, { mostrar: true });
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
