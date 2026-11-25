// Prueba al revés del guardián devueltoSoloSiSalio (25 nov, 9v): un patrocinio dice «devuelto» (el panel: «Reserva cancelada. Te devolvemos $15.00 a tu
// tarjeta») solo con lo que la pasarela devolvió. Pasaba: «Cancelar reserva» del dueño devolvía lo decidido (refund_cents) aunque Stripe hubiera rechazado la
// devolución (din9v2). Ampliado (25 nov, segunda tanda): boletos y eventos (cancelar, «Devolver» del panel, «Devolución total», el evento cancelado,
// la orden) y las cuatro pantallas de reservas. Se inyecta el defecto, el guardián debe fallar con SU renglón ([devueltoSoloSiSalio]); se restaura.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const G = 'devueltoSoloSiSalio';
const P = 'apps/web/lib/patrocinio.ts', E = 'apps/web/lib/patrocinio-evento.ts', BD = 'apps/web/lib/boletos-despues.ts', EC = 'apps/web/lib/evt-cambios.ts';
const casos = [
  // El fallo del 25 nov: lo decidido como devuelto, sin mirar la pasarela.
  ['cancelar reserva devuelve lo decidido', P, '  if (dev) return { ok: true, devuelto: dev };', '  if (dev) return { ok: true, devuelto: decidido };'],
  // El dueño del patrocinio de evento vuelve a lo de antes.
  ['el evento devuelve refund_cents', E, '  return devolverYDecir("evento", id, r.rows[0]!.refund_cents);', '  return { ok: true, devuelto: r.rows[0]!.refund_cents ?? 0 };'],
  // El Super Admin dice «Se devolvieron» con lo decidido.
  ['el admin dice devuelto con lo decidido', P, '  return { ok: true, devuelto: dev, msg: quiere', '  return { ok: true, devuelto: quiere, msg: quiere'],
  // La acción del panel deja de pasar lo que pasó con la devolución.
  ['la acción no pasa devolucion', 'apps/web/app/panel/acciones-patrocinio.ts', 'devuelto: r.devuelto, devolucion: r.devolucion, aDevolver: r.aDevolver', 'devuelto: r.devuelto'],
  // La pantalla del evento ya no dice la fallida.
  ['la pantalla calla la fallida', 'apps/web/app/panel/PatrocinioEvento.tsx', 'r?.devolucion === "fallida" ? E2(', 'false ? E2('],
  // 25 nov (segunda tanda) · Boletos y eventos.
  // Cancelar mis boletos vuelve a tirar lo que hizo la pasarela.
  ['cancelar boletos tira el resultado', BD, '  const devolucion = await mandarDevolucion(hecho.rf);\n  const { avisar, avisarNegocio }', '  await ejecutarDevolucion(hecho.rf); const devolucion = "hecha" as const;\n  const { avisar, avisarNegocio }'],
  // «Hecha» sin mirar: mandarDevolucion da por hecha cualquier devolución.
  ['mandarDevolucion da todo por hecho', BD, 'return (await ejecutarDevolucion(rf)) ? "hecha" : estadoDevolucion(rf);', 'await ejecutarDevolucion(rf); return "hecha";'],
  // El aviso «Devolución total» vuelve a decir lo decidido (sin {dinero}).
  ['devolución total sin {dinero}', EC, 'monto: dinero(hecho.total), dinero: dineroDevolucion(devolucion, hecho.total) }', 'monto: dinero(hecho.total) }'],
  // El panel responde sin decir qué pasó.
  ['devolver del panel sin devolucion', BD, '  return { ok: true, monto: hecho.total, devolucion };\n}\n\n/* ── Cortesías', '  return { ok: true, monto: hecho.total };\n}\n\n/* ── Cortesías'],
  // El evento cancelado vuelve a prometer «te devolvemos todo» a todos.
  ['evento cancelado promete a todos', EC, 'const dinero: Bi = num && d ? dineroCancelacion(d)', 'const dinero: Bi = num ? { es: "Te devolvemos todo lo que pagaste, cargos incluidos, en 3–5 días hábiles. No tienes que hacer nada.", en: "" }'],
  // El aviso del evento cancelado deja de mirar la disputa.
  ['dinero del evento sin disputa', EC, 'coalesce(bool_or(${DISPUTA}), false) as disputa', 'false as disputa'],
  // La orden cuenta la fallida como devuelta.
  ['la orden cuenta la fallida', 'apps/web/app/(app)/eventos/orden/[num]/Orden.tsx', 'const vivas = o.devoluciones.filter((d) => d.estado !== "failed")', 'const vivas = o.devoluciones'],
  // La orden de un evento cancelado vuelve a mostrar la política «Si el evento se cancela, te devolvemos todo».
  ['la orden cancelada promete por la política', 'apps/web/app/(app)/eventos/orden/[num]/Orden.tsx', 'const plazos = cancelada || ev.pasado || cambio?.cancelada ? null', 'const plazos = cancelada || ev.pasado ? null'],
  // La hoja de cancelar vuelve a «Te devolvemos» fijo.
  ['la hoja dice te devolvemos fijo', 'apps/web/app/(app)/eventos/Despues.tsx', 'if (r?.ok) { onDone(r.devolucion === "hecha" ? E2(', 'if (r?.ok) { onDone(E2(`Listo. Te devolvemos ${dinero(r.monto)} a tu tarjeta en 3–5 días hábiles.`, "") || E2('],
  // La plantilla del aviso vuelve a «te devolvemos {monto}».
  ['la plantilla sin {dinero}', 'packages/db/migrations/0219_avisos_devolucion_lo_que_paso.sql', '{evento}: cancelaste {cuantos}. {dinero} El cargo de servicio no se devuelve.","en":"{evento}: you cancelled {cuantos}. {dinero}', '{evento}: cancelaste {cuantos}. Te devolvemos {monto}.","en":"{evento}: you cancelled {cuantos}. We refund {monto}.'],
  // Viaje: «Te devolvemos todo» por defecto otra vez.
  ['viaje te devolvemos todo por defecto', 'apps/web/app/(app)/viaje/[num]/ViajeEstado.tsx', '${devT || (cobrado ? ', '${devT || E2("Te devolvemos todo.", "You get everything back.") || (cobrado ? '],
  // Fiesta: la vista deja de leer lo que no está hecho.
  ['fiesta sin devolucionesDe', 'apps/web/lib/fiestas-reservas.ts', '    devolucion: await devolucionesDe(o.id),\n', '    devolucion: { camino: 0, fallida: 0 },\n'],
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
