// Prueba al revés de los guardianes de 9d (tus datos: el mapa, la purga a los 30 días, el archivo solo con lo suyo, el enlace de un uso y las
// retenciones con su prueba). Se inyecta el defecto, el guardián debe fallar con SU mensaje ([nombre]); se restaura. «crear»: se crea el archivo,
// se corre y se borra.
const ENT = require('../lib/entorno.cjs'); // rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const MJ = 'packages/db/mapa-de-datos.json', SEM = 'packages/db/seeds/mapa_datos.sql', M = 'packages/db/migrations/0134_mis_datos.sql',
  P = 'apps/web/lib/datos/purgar.ts', X = 'apps/web/lib/datos/exportar.ts', MP = 'apps/web/lib/datos/mapa.ts', RT = 'apps/web/app/api/datos/archivo/[id]/route.ts',
  BA = 'apps/web/lib/barrido.ts', RE = 'apps/web/lib/datos/retener.ts', E2E = 'pruebas/e2e/datos9d.cjs';
const casos = [
  // mapaDeDatos: la semilla vieja, un valor que no está en la lista (una segunda sentencia), una columna que no existe, una tabla del inventario fuera del mapa
  ['mapaDeDatos', SEM, "('favorites', 'user_id'", "('favoritos', 'user_id'"],
  ['mapaDeDatos', MJ, '"set": { "body": "null" } } ] },\n    "job_applications"', '"set": { "body": "now(); drop table users" } } ] },\n    "job_applications"'],
  ['mapaDeDatos', MJ, '{ "col": "follower_user_id", "accion": "borrar"', '{ "col": "follower_id", "accion": "borrar"'],
  ['mapaDeDatos', MJ, '    "search_logs": { "reglas": [ { "col": "user_id", "accion": "borrar", "exporta": "busquedas", "fusion": "no" } ] },\n', ''],
  // purgaCompleta: el barrido sin la purga, la purga sin anotar cada tabla, una tabla «borrar» con un trigger que no deja borrar, la cuenta con su teléfono, una sola persona en la base
  ['purgaCompleta', BA, '        ["datosPurga", async () => (await import("./datos/purgar")).purgarVencidas()],\n', ''],
  ['purgaCompleta', P, 'insert into purge_items (run_id', 'insert into purge_otros (run_id'],
  ['purgaCompleta', MJ, '{ "col": "user_id", "accion": "guardar", "porque": "seguridad", "exporta": "bloqueaste", "fusion": "no" },', '{ "col": "user_id", "accion": "borrar", "exporta": "bloqueaste", "fusion": "no" },'],
  ['purgaCompleta', MJ, '"set": { "phone": "null", "first_name"', '"set": { "phone": "\'+15705550000\'", "first_name"'],
  ['purgaCompleta', M, '  check (approved_by <> requested_by)\n', '  check (true)\n'],
  // exportaSoloLoSuyo: las columnas de otra persona en el archivo, el teléfono del cliente en el del negocio, bajar el de otra persona, salen las huellas
  ['exportaSoloLoSuyo', X, '.filter((x) => x !== f.columna)', '.filter(() => false)'],
  ['exportaSoloLoSuyo', X, 'o.customer_note as nota_del_cliente, ${cliente} as cliente', 'o.customer_note as nota_del_cliente, u.phone as telefono, ${cliente} as cliente'],
  ['exportaSoloLoSuyo', X, 'from data_exports where id = $1::uuid and user_id = $2::uuid`, [id, userId])', 'from data_exports where id = $1::uuid and $2::uuid is not null`, [id, userId])'],
  ['exportaSoloLoSuyo', MP, '(^|_)(hash|enc|token|', '(^|_)(enc|token|'],
  // enlaceUnUsoSinGet: el GET sirve el archivo, el update sin «listo y vigente», el POST sin mismo sitio, la base deja bajarlo otra vez
  ['enlaceUnUsoSinGet', RT, '  void id;\n', '  void id; await bajarExportacion(id, "", null);\n'],
  ['enlaceUnUsoSinGet', X, " and status = 'listo' and expires_at > now()`, [id, userId, ipHash]);", '`, [id, userId, ipHash]);'],
  ['enlaceUnUsoSinGet', RT, '  if (!(await mismoOrigen())) return new NextResponse(null, { status: 403 });\n', ''],
  ['enlaceUnUsoSinGet', M, "raise exception 'el archivo se baja una sola vez'", "raise notice 'el archivo se baja una sola vez'"],
  // retencionQueCorre (ampliado): el barrido sin las retenciones, una retención que no lee su clave, una clave sin su prueba con el reloj movido
  ['retencionQueCorre', BA, '        ["retenciones", async () => (await import("./datos/retener")).barrerRetenciones()],\n', ''],
  ['retencionQueCorre', RE, "make_interval(days => cfg_int('retener_busquedas_dias'))", "interval '90 days'"],
  ['retencionQueCorre', E2E, "retener_codigos_dias (7)", "codigos (7)"],
];
const crear = [
  // mapaDeDatos: una tabla nueva con una persona sin su lugar en el mapa
  ['mapaDeDatos', 'packages/db/migrations/9999_zz9d.sql', 'begin;\ncreate table if not exists zz9d_notas (\n  id bigint generated always as identity primary key,\n  user_id uuid not null references users (id), texto text\n);\ncommit;\n'],
  // exportaSoloLoSuyo: otro archivo que toca los ZIP de las exportaciones
  ['exportaSoloLoSuyo', 'apps/web/lib/zz9d.ts', 'import "server-only";\nexport const otra = (id: string) => `privado/exportes/${id}.zip`;\n'],
  // enlaceUnUsoSinGet: otra ruta que baja el archivo
  ['enlaceUnUsoSinGet', 'apps/web/app/api/zz9d/route.ts', 'import { bajarExportacion } from "@/lib/datos/exportar";\nexport async function GET() { const r = await bajarExportacion("x", "y", null); return new Response(r.ok ? "1" : "0"); }\n'],
];
let bien = 0, total = 0;
const correr = (g) => {
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${g}]`)) ?? ''; return [!!l, l]; }
};
const informe = (g, que, [falla, out]) => { total++; console.log(`  ${falla ? '✓' : '✗'} ${g} al revés (${que})${out ? ' → ' + out.trim().slice(0, 170) : ''}`); if (falla) bien++; };
for (const [g, f, a, b] of casos) {
  const ruta = path.join(R, f);
  if (!fs.existsSync(ruta)) { total++; console.log(`  ✗ ${g}: no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ ${g}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let r; try { r = correr(g); } finally { fs.writeFileSync(ruta, orig); }
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
if (bien !== total || !limpio) process.exit(1);
