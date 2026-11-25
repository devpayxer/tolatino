// Prueba al revés de C-002 (Patrocinados). patrocinioDelServidor: la vitrina muestra lo que no está activo, lo de otra categoría, más que los
// puestos o ignora los filtros; el precio sale de la pantalla; comprar sin «Cobros», desde la app o sin mismo origen; otra pieza escribe el libro
// o las cifras; una etiqueta por tarjeta; la base deja pasar de los puestos. Se inyecta el defecto, el guardián debe fallar con SU mensaje; se restaura.
// 0175 (17 nov): la compra sin la hoja del banco (3-D Secure) o capturando otro monto; devolver dos veces, más de lo cobrado, sin la fila del libro
// o sin auditoría; el monto de la devolución de la pantalla o escrito a mano; la reserva cancelada sin devolver; el barrido sin reintentar; la base
// sin «una devolución por patrocinio», sin tope, sin libro solo de inserción o dejando cambiar lo decidido; la conciliación sin las devoluciones;
// las vistas del dueño y su equipo, o una consulta por patrocinio.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const L = 'apps/web/lib/patrocinio.ts', A = 'apps/web/app/panel/acciones-patrocinio.ts', PG = 'apps/web/app/(app)/c/[slug]/page.tsx',
  T = 'apps/web/app/(app)/c/[slug]/Patrocinados.tsx', M = 'packages/db/migrations/0173_patrocinios.sql', M5 = 'packages/db/migrations/0175_patrocinio_devoluciones.sql', M7 = 'packages/db/migrations/0207_patrocinio_devolucion_pregunta.sql',
  CZ = 'apps/web/lib/conciliacion.ts';
const G = 'patrocinioDelServidor';
const casos = [
  // La vitrina: lo reservado (o lo vencido) sale; otra categoría; sin tope de puestos; sin los filtros.
  [L, "from sponsorships where city_id = $1 and category_id = $2 and status = 'activo' and starts_at <= now() and ends_at > now()", "from sponsorships where city_id = $1 and category_id = $2 and status in ('activo', 'reservado')"],
  [L, "from sponsorships where city_id = $1 and category_id = $2 and status = 'activo'", "from sponsorships where city_id = $1 and status = 'activo'"],
  [L, 'limit ${cfgPuestos}', 'limit 50'],
  [L, 'const extra = condiciones({ sub, filtros }, params);', 'const extra = "";'],
  // El precio: de la pantalla (un monto en lo que manda la compra) o escrito a mano.
  [L, 'export type CompraIn = { dur: "week" | "month";', 'export type CompraIn = { centavos: number; dur: "week" | "month";'],
  [L, 'const centavos = x.dur === "week" ? P.week : P.month,', 'const centavos = x.dur === "week" ? 1500 : 4500,'],
  [L, 'const centavos = s.duration === "week" ? P.week : P.month,', 'const centavos = s.duration === "week" ? 1000 : P.month,'],
  [L, 'return { week: v.patrocinio_semana_cents, month: v.patrocinio_mes_cents,', 'return { week: 1500, month: v.patrocinio_mes_cents,'],
  // Comprar: sin la parte «Cobros», sin mismo origen, desde la app.
  [A, 'return typeof id === "string" ? accesoPanel(id, "pay") : null;', 'return typeof id === "string" ? accesoPanel(id) : null;'],
  [A, '  if (!(await mismoOrigen())) return null;\n', ''],
  [A, '  if (!(await enLaWeb())) return EN_APP;\n  const dur', '  const dur'],
  [A, '  if (on === true && !(await enLaWeb())) return EN_APP;\n', ''],
  // La página saca Patrocinados sin los filtros; una etiqueta por tarjeta.
  [PG, 'vitrinaCategoria(loc, c.id, sub ? reglas.get(sub)! : null, elegidos)', 'vitrinaCategoria(loc, c.id, null, [])'],
  [T, '<span className={`truncate font-display', '<span className="rounded bg-ink/60 px-2">PATROCINADO</span><span className={`truncate font-display'],
  // La base: sin candado o sin tope; se puede cambiar el precio pagado; el libro se edita; las cifras a mano.
  [M, "perform pg_advisory_xact_lock(hashtextextended('pat:' || new.city_id || ':' || new.category_id, 0));", '-- sin candado'],
  [M, 'or new.ends_at <> old.ends_at or new.duration <> old.duration or new.price_cents <> old.price_cents', 'or new.ends_at <> old.ends_at or new.duration <> old.duration'],
  [M, 'create trigger sponsorship_payments_no_cambia before update or delete on sponsorship_payments', 'create trigger sponsorship_payments_no_cambia before delete on sponsorship_payments'],
  [M, 'create trigger sponsorship_stats_no_editable before insert or update or delete on sponsorship_stats', 'create trigger sponsorship_stats_no_editable before delete on sponsorship_stats'],
  // 0175 · 3-D Secure al comprar: sin la hoja del banco, sin la verificación a nombre de quien paga, sin cobrar en sesión, sin capturar o con otro monto.
  [L, '  if (x.enSesion) {', '  if (false) {'],
  [L, ', usuario: { id: x.payer, negocio: x.negocio, ciudad: x.ciudad } });', ' });'],
  [L, 'meta: { business_id: negocio, category_id: n.category_id }, enSesion: true };', 'meta: { business_id: negocio, category_id: n.category_id } };'],
  [L, '      const cobrado = await capturarCobro(p, centavos);\n', '      const cobrado = centavos;\n'],
  [L, 'pasarela.capturarPlataforma(p.pi, centavos)', 'pasarela.capturarPlataforma(p.pi, 1500)'],
  // Devolver: dos veces (otra llave), más de lo cobrado, sin la fila del libro (o repitiéndola), sin auditoría.
  // 9t8 (0207) · La intención la anota la base al terminar (sponsorship_refunds): otra llave cada vez, más de lo cobrado, sin «una por patrocinio»; el cierre
  // sin la intención hecha primero (el libro dos veces) o sin auditoría.
  [M7, "'pat-dev-' || k || '-' || new.id)", "'pat-dev-' || k || '-' || new.id || '-' || clock_timestamp())"],
  [M7, 'least(new.refund_cents, p.amount_cents), ', 'new.refund_cents + 100, '],
  [M7, '  unique (kind, ref_id),\n', ''],
  [L, '    if (!u) return null;\n    // Lo que el patrocinio decidió al terminar', '    // Lo que el patrocinio decidió al terminar'],
  [L, "    await c.query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, before, after, reason) values ('system', null, $1, $2, $3, $4, null, $5::jsonb, null)`,\n      [ev ? \"patrocinio_evento.devolver\"", "    await c.query(`select ('system', null, $1, $2, $3, $4, null, $5::jsonb, null)`,\n      [ev ? \"patrocinio_evento.devolver\""],
  // El monto: de la pantalla, o escrito a mano en vez de la base; la reserva cancelada no devuelve; el barrido no reintenta.
  [L, 'motivo: string, devolver: boolean): Promise<ResPat>', 'motivo: string, devolver: number): Promise<ResPat>'],
  [L, 'from patrocinio_devolucion(${modo}, ${t}price_cents', 'from patrocinio_devolucion(${modo}, 1700'],
  [L, `"case when status = 'reservado' then 'todo' else 'nada' end", "'reserva_cancelada'", false)`, `"'nada'", "'reserva_cancelada'", false)`],
  [L, '  await devolverPendientes("negocio");\n', ''],
  // La base: devuelve todo siempre; sin «una por patrocinio»; sin tope; quita el libro solo de inserción; deja cambiar lo decidido.
  // Desde 0194 la versión que usa el código (con la zona horaria de la ciudad) vive en 0194: el defecto se inyecta ahí.
  ['packages/db/migrations/0194_patrocinio_dias_por_calendario.sql', "when 'sin_usar' then case when t <= a then total", "when 'sin_usar' then case when true then total"],
  [M5, "create unique index if not exists sponsorship_payments_una_devolucion on sponsorship_payments (kind, ref_id) where reason = 'devolucion'", "create index if not exists sponsorship_payments_una_devolucion on sponsorship_payments (kind, ref_id)"],
  [M5, "  if new.amount_cents > c.amount_cents then raise exception 'patrocinio_devolucion: nunca más que lo cobrado'; end if;\n", ''],
  [M5, '\ncommit;\n', '\ndrop trigger if exists sponsorship_payments_no_cambia on sponsorship_payments;\ncommit;\n'],
  [M5, "raise exception 'patrocinio_devolucion: lo que se devuelve se decide una vez y no cambia'", "raise notice 'cambia'"],
  // La conciliación sin las devoluciones; las vistas del equipo; una consulta por patrocinio.
  [CZ, "from sponsorship_payments s where s.reason = 'devolucion'", "from sponsorship_payments s where false"],
  [M5, "where quien is null or not exists (select 1 from business_members m where m.business_id = v.business_id and m.user_id = quien and m.status = 'active')", 'where true'],
  [L, 'await db().query(`select patrocinio_vistas($1, $2::bigint[], $3::uuid, $4::uuid)`, [kind, L, quien, dev])', 'for (const x of L) await db().query(`select patrocinio_vistas($1, $2::bigint[], $3::uuid, $4::uuid)`, [kind, [x], quien, dev])'],
];
const crear = [
  // Otra pieza que escribe el libro o las cifras por su cuenta.
  ['apps/web/lib/zz-alreves-patrocinio.ts', 'export const q = "update sponsorship_stats set views = views + 100 where ref_id = $1";\n'],
  ['apps/web/app/zz-alreves-patrocinio.ts', 'export const q = "insert into sponsorships (business_id, price_cents) values ($1, $2)";\n'],
];
let bien = 0, total = 0;
const correr = () => {
  try { execSync(`node guardianes/run.mjs --solo ${G}`, { cwd: R, stdio: 'pipe' }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${G}]`)) ?? ''; return [!!l, l]; }
};
const informe = (que, [falla, out]) => { total++; console.log(`  ${falla ? '✓' : '✗'} ${G} al revés (${que})${out ? ' → ' + out.trim().slice(0, 200) : ''}`); if (falla) bien++; };
for (const [f, a, b] of casos) {
  const ruta = path.join(R, f);
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ ${G}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  try { informe(path.basename(f), correr()); } finally { fs.writeFileSync(ruta, orig); }
}
for (const [f, contenido] of crear) {
  const ruta = path.join(R, f);
  fs.writeFileSync(ruta, contenido);
  try { informe(path.basename(f), correr()); } finally { fs.unlinkSync(ruta); }
}
let limpio = true;
if (!require('../lib/alreves-fin.cjs')(R)) limpio = false;
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
