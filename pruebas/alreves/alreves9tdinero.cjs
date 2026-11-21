// Prueba al revés de los guardianes devolucionEnDosPasos, estadoEnElWhere y candadoEnSuConexion (9t, 21 nov; LAUNCH «→ 9t» de la confirmación del
// 20 nov): (1) devolverPago llamaba a Stripe ANTES de cualquier renglón en la base; (2) Colas › Ayuda con monto podía devolver dos veces el mismo caso
// (la llave era el toque) y el caso no sumaba lo devuelto; (3) «Anular» con cobro fallido dejaba «anuló» en la auditoría con Pro pagado, y los cambios
// del plan no miraban su estado; (4) las disputas se escribían sin su estado en el `where` (un webhook quedaba pisado); y, por clase, el candado del
// plan se tomaba y se soltaba por el pool (el desbloqueo podía caer en otra conexión). Se inyecta cada defecto, el guardián debe fallar con SU
// mensaje ([nombre]); se restaura. La prueba con la base y la pasarela de mentira es pruebas/e2e/din9t.cjs.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const CB = 'apps/web/lib/cobros.ts', BA = 'apps/web/lib/barrido.ts', CL = 'apps/web/app/admin/acciones-colas.ts', SE = 'apps/web/lib/soporte-equipo.ts', AY = 'apps/web/lib/ayuda-cita.ts';
const DI = 'apps/web/lib/disputas.ts', SU = 'apps/web/lib/suscripcion.ts', BO = 'apps/web/lib/boletos-despues.ts';
const D = 'devolucionEnDosPasos', W = 'estadoEnElWhere', K = 'candadoEnSuConexion';
const casos = [
  // (1) Como estaba: la pasarela primero y la devolución nace 'done'.
  [D, CB, "  const a = await tx((c) => anotarDevolucionPago(c, x, alGuardar));\n", "  await pasarela.devolver(\"pi\", x.centavos, x.idem);\n  const a = await tx((c) => anotarDevolucionPago(c, x, alGuardar));\n"],
  [D, CB, "values ($1::bigint, $2, $3, $4, $5, 'pending', $6) returning id::text`,", "values ($1::bigint, $2, $3, $4, $5, 'done', $6) returning id::text`,"],
  // Lo pendiente sumado en la misma sentencia del candado (la que espera no ve lo que la otra anotó).
  [D, CB, "`select p.id::text, p.amount_cents as amount, p.refunded_cents as refunded, p.status from payments p where p.id = $1::bigint for update`",
    "`select p.id::text, p.amount_cents as amount, p.refunded_cents + (select coalesce(sum(amount_cents), 0) from refunds where payment_id = p.id and status = 'pending') as refunded, p.status from payments p where p.id = $1::bigint`"],
  // Sin respuesta de Stripe se da por fallida (el barrido ya no la termina y la pantalla deja repetirla con otra llave).
  [D, CB, 'const SIN_RESPUESTA = new Set(["red", "api_error", "error",', 'const SIN_RESPUESTA = new Set(['],
  // El cierre vuelve a sumar (el webhook charge.refunded pudo contarla antes).
  [D, CB, "set refunded_cents = least(p.amount_cents, greatest(p.refunded_cents, x.hecho)),", "set refunded_cents = least(p.amount_cents, p.refunded_cents + x.hecho),"],
  // El barrido pregunta con la misma llave aunque Stripe ya no la recuerde, o no corre.
  [D, CB, 'const HORAS_LLAVE = 23;', 'const HORAS_LLAVE = 72;'],
  [D, BA, '        ["devolucionesPago", () => cobros.barrerDevolucionesPago()],\n', ''],
  // Otra parte de la app devuelve por su cuenta.
  [D, BO, 'export async function barrerDevolucionesBoletos(): Promise<number> {\n', 'export async function barrerDevolucionesBoletos(): Promise<number> {\n  await pasarela.devolver("pi", 1, "x");\n'],
  // (2) Colas › Ayuda con monto: la llave vuelve a ser el toque; el caso suma lo tecleado; la pasarela antes de anotar.
  [D, CL, 'idem = `sop-q${id}`;', 'idem = `sop-${clave}`;'],
  [D, CL, "select amount_cents as amt from refunds where id = $1::bigint and (status = 'done' or manual_at is not null)", "select $2::int as amt from refunds where id = $1::bigint"],
  [D, CL, "  const a = await tx(async (c): Promise<string | { rf: string | null; estado: \"pending\" | \"done\" | \"manual\" | null }> => {\n",
    "  await cobros.ejecutarDevolucionPago(\"0\");\n  const a = await tx(async (c): Promise<string | { rf: string | null; estado: \"pending\" | \"done\" | \"manual\" | null }> => {\n"],
  // Soporte y la ayuda de la cita dan por fallida (o reabren) una devolución en camino.
  [D, SE, '    if (d.enCamino) return no(d.msg.es);\n', ''],
  [D, AY, '    if (!d.ok && d.enCamino) { await tx(async (c) => { await alGuardar?.(c); }); return { ok: false, msg: d.msg }; }\n', ''],
  // (4) Disputas: la escritura sin su estado esperado, o callada si cambió.
  [W, DI, "                              where id = $1::bigint and status = 'needs_response'`, [disputa, texto.trim().slice(0, 2000), staffId]);", "                              where id = $1::bigint`, [disputa, texto.trim().slice(0, 2000), staffId]);"],
  [W, DI, "updated_at = now() where id = $1::bigint and status in ('needs_response', 'under_review')`, [disputa]);", "updated_at = now() where id = $1::bigint`, [disputa]);"],
  [W, DI, "    return { ok: false, cambio: ahora, msg: `La disputa cambió mientras tanto (ahora: ${ESTADO_ES[ahora] ?? ahora}). Stripe recibió", "    return { ok: true } as const; void { cambio: ahora, msg: `(ahora: ${ESTADO_ES[ahora] ?? ahora}). Stripe recibió"],
  // (3) Planes: Anular sin mirar la pasarela, con aFree aparte, sin su estado en el where; un cambio del dueño sin mirar rowCount; procesar sin releer.
  [W, SU, "      if (await soltarVerificaciones(negocio)) {", "      if (false) {"],
  [W, SU, "      if (!(await c.query(`update subscriptions set status = 'canceling', updated_at = now() where business_id = $1 and status = 'active'`, [negocio])).rowCount) return CAMBIO_PLAN;",
    "      await c.query(`update subscriptions set status = 'canceling', updated_at = now() where business_id = $1`, [negocio]);"],
  [W, SU, "        await plan(c, negocio, \"free\");\n        await adminEvento(c, negocio, \"canceled_admin\", actor, { motivo });\n        await evento(negocio, \"ended\", { note: { por: \"admin\" } }, c);\n",
    "        await adminEvento(c, negocio, \"canceled_admin\", actor, { motivo });\n        await aFree(negocio, \"admin\");\n"],
  [W, SU, "  if (s.status === \"active\") return tx(async (c) => { if (!(await c.query(`update subscriptions set status = 'canceling', updated_at = now() where business_id = $1 and status = 'active'`, [negocio])).rowCount) return CAMBIO_PLAN;",
    "  if (s.status === \"active\") return tx(async (c) => { await c.query(`update subscriptions set status = 'canceling', updated_at = now() where business_id = $1`, [negocio]);"],
  [W, SU, "    const s = (await k.query<Fila>(`select * from subscriptions where business_id = $1 and ${VENCIDA}`, [x.business_id])).rows[0];", "    const s = x as unknown as Fila;"],
  // Por clase: el candado del plan por el pool.
  [K, SU, "    try { return { tomado: true, r: await fn(c) }; } finally { await c.query(`select pg_advisory_unlock(", "    try { return { tomado: true, r: await fn(c) }; } finally { await db().query(`select pg_advisory_unlock("],
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
let limpio = true; try { execSync('node guardianes/run.mjs', { cwd: R, stdio: 'pipe' }); } catch (e) { limpio = false; console.log(String(e.stderr).slice(0, 600)); }
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
