// Prueba al revés de los guardianes liberarMira, capturaTardeAlerta y avisoNegUnIdioma (25 nov, LAUNCH «el dinero dice lo que pasó», letras e y g):
// soltar una retención que Stripe ya había cobrado no la deja «released» (pasarela.liberar mira el intento; el libro la anota cobrada y el equipo de dinero
// tiene la alerta cobrada:, que no se cierra sola); la captura tarde a la que Stripe no contestó alerta captura: como la que lanza; y el aviso al negocio no
// mezcla idiomas. Se inyecta el defecto, el guardián debe fallar con SU renglón ([nombre]); se restaura.
const ENT = require('../lib/entorno.cjs'); // rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const PA = 'apps/web/lib/pagos/pasarela.ts', CO = 'apps/web/lib/cobros.ts', VL = 'apps/web/lib/viajes.ts', EP = 'apps/web/lib/evento-privado.ts';
const casos = [
  // ── liberarMira ──
  // El fallo del 25 nov: liberar da ok ante «unexpected_state» sin mirar el intento.
  ['liberarMira', 'liberar: unexpected_state es ok', PA, '      if (!(e instanceof ErrorStripe && e.codigo === "payment_intent_unexpected_state")) return { ok: false, codigo: e instanceof ErrorStripe ? e.codigo ?? e.tipo : "error" };',
    '      return { ok: e instanceof ErrorStripe && e.codigo === "payment_intent_unexpected_state" };'],
  // cobrar vuelve a dar «cobrado» ante unexpected_state (un intento cancelado o vencido quedaría cobrado en el libro).
  ['liberarMira', 'cobrar: unexpected_state es cobrado', PA, '        const x = await stripe<{ status: string; amount_received: number }>("GET", `/v1/payment_intents/${encodeURIComponent(pi)}`).catch(() => null);\n        return x?.status === "succeeded" ? { ok: true, cobrado: x.amount_received } : { ok: false, codigo: x?.status ?? "red" };',
    '        return { ok: true };'],
  // Un intento cobrado se da por soltado.
  ['liberarMira', 'liberacionDe: cobrado = soltado', PA, 'if (x.estado === "succeeded") return { ok: false, codigo: "succeeded", cobrado:', 'if (x.estado === "succeeded") return { ok: true, codigo: "succeeded", cobrado:'],
  // El simulador vuelve a soltar sin mirar (como antes: ok aunque el sim_intents estuviera cobrado).
  ['liberarMira', 'el simulador suelta sin mirar', PA, '      if (r.rowCount) return { ok: true };\n      const s = (await db().query<{ status: string; captured_cents: number }>(`select status, captured_cents from sim_intents where id = $1`, [pi])).rows[0];\n      return liberacionDe(', '      return { ok: true };\n      const s = (await db().query<{ status: string; captured_cents: number }>(`select status, captured_cents from sim_intents where id = $1`, [pi])).rows[0];\n      return liberacionDe('],
  // liberarOperacion tira el «estaba cobrado» (sería «fallo» para siempre, o soltada).
  ['liberarMira', 'liberarOperacion sin «cobrada»', CO, '  if (!r.ok && r.cobrado !== undefined) {', '  if (false) {'],
  // soltarRetencion abre la alerta que se cierra sola (liberar:) en vez de cobrada:.
  ['liberarMira', 'la cobrada con la alerta que se cierra sola', CO, 'alertar("hold_stuck", `cobrada:${c.id}`', 'alertar("hold_stuck", `liberar:${c.id}`'],
  // El barrido de alertas cierra solas las de cobrada:.
  ['liberarMira', 'cobrada: se cierra sola', 'apps/web/lib/dinero-alertas.ts', "a.subject_id ~ '^(liberar|cobrar):[0-9]{1,18}$'", "a.subject_id ~ '^(liberar|cobrar|cobrada):[0-9]{1,18}$'"],
  // Rentas: el depósito se marca liberado sin mirar lo que contestó liberar.
  ['liberarMira', 'rentas: released sin mirar', 'apps/web/lib/rentas.ts', '    if (!(await pasarela.liberar(P.pi)).ok) return;', '    await pasarela.liberar(P.pi);'],
  // (revisión de 00ac9b7) · Lo ya capturado vuelve sin lo que Stripe capturó; el simulador reescribe lo capturado; cobrarOperacion anota lo pedido.
  ['liberarMira', 'cobrar ya capturado sin cobrado', PA, 'return x?.status === "succeeded" ? { ok: true, cobrado: x.amount_received } : { ok: false, codigo: x?.status ?? "red" };', 'return x?.status === "succeeded" ? { ok: true } : { ok: false, codigo: x?.status ?? "red" };'],
  ['liberarMira', 'el simulador reescribe lo capturado', PA, "where id = $1 and status = 'requires_capture'`, [pi, centavos, comision]", "where id = $1 and status in ('requires_capture', 'succeeded')`, [pi, centavos, comision]"],
  ['liberarMira', 'cobrarOperacion anota lo pedido', CO, '  const real = r.cobrado ?? p.amount;', '  const real = p.amount;'],
  // Lo que Stripe ya no deja cobrar: sin alerta, o reintentado sin fin por el barrido.
  ['liberarMira', 'lo que ya no se cobra, sin alerta', CO, 'if (CAPTURA_TERMINAL.has(codigo)) await alertarNoSeCobra(', 'if (false) await alertarNoSeCobra('],
  ['liberarMira', 'el barrido reintenta lo que ya no se cobra', CO, " and not (o.status in ('confirmed', 'done') and coalesce(p.failure_code, '') = any($2::text[])\n                                         and exists (select 1 from money_alerts a where a.kind = 'hold_stuck' and a.subject_id = 'cobrar:' || p.id::text))", ''],
  // (revisión de 483a3af) · El barrido deja de reintentar lo que ya no se cobra aunque su alerta no se haya anotado (retenido para siempre sin alerta).
  ['liberarMira', 'el barrido lo excluye sin su alerta', CO, "\n                                         and exists (select 1 from money_alerts a where a.kind = 'hold_stuck' and a.subject_id = 'cobrar:' || p.id::text))", ')'],
  // La captura tarde de una cancelada alerta «resuélvelo» y la retención se suelta acto seguido; la alerta que falla se traga.
  ['liberarMira', 'cobrar: también de la cancelada', CO, '    if (!o || !["confirmed", "done"].includes(o.st)) return;\n', '    if (!o) return;\n'],
  ['liberarMira', 'la alerta cobrar: se traga el error', CO, 'sort it out with the business and the person.` } });\n  } catch (e) { console.error(', 'sort it out with the business and the person.` } }).catch(() => undefined);\n  } catch (e) { console.error('],
  // cobrar: ya no se cierra sola (aunque el cobro ya no esté retenido).
  ['liberarMira', 'cobrar: no se cierra sola', 'apps/web/lib/dinero-alertas.ts', "a.subject_id ~ '^(liberar|cobrar):[0-9]{1,18}$'", "a.subject_id ~ '^liberar:[0-9]{1,18}$'"],
  // El barrido aplica la regla de la cancelación tarde y nadie se lo dice a quien pagó; o se lo dice dos veces (sin reclamo).
  ['liberarMira', 'la regla del barrido sin aviso', CO, 'if (regla && motivo === SWEEP) await avisarTardeCobrada(', 'if (false) await avisarTardeCobrada('],
  ['liberarMira', 'el aviso del barrido sin reclamo', CO, '    if (!(await reclamarAvisoCobro(opId))) return;\n', ''],
  ['liberarMira', 'viaje: el aviso de lo cobrado sin reclamo', VL, '        if ((mitad > 0 || x.d.e === "cobrada") && !(await reclamarAvisoCobro(o.id))) return;\n', ''],
  ['liberarMira', 'evento privado: el aviso de lo cobrado sin reclamo', EP, '  if (quedo && !(await reclamarAvisoCobro(opId))) return { ok: true, devuelto: 0, perdio: true, devolucion: "nada" };\n', ''],
  ['liberarMira', 'el aviso del viaje sin el del negocio', VL, '  await avisarNeg(numero, "biz_viaje_cx", { dep: { es: ` ${mitad ? seCobro.es : ya.es}`', '  await avisarNeg(numero, "biz_viaje_x", { dep: { es: ` ${mitad ? seCobro.es : ya.es}`'],
  // La «cobrada» por relectura sin la regla que aplicó el barrido.
  ['liberarMira', 'la relectura sin regla', CO, 'return { e: "cobrada", monto: Math.max(0, y.amt - y.ref), ...(regla ? { regla } : {}) };', 'return { e: "cobrada", monto: Math.max(0, y.amt - y.ref) };'],
  // barrerAlertasDinero cierra alertas por su cuenta (la prueba din9x da por hecho que solo por cerrarAlertasResueltas).
  ['liberarMira', 'barrerAlertasDinero cierra por su cuenta', 'apps/web/lib/dinero-alertas.ts', '  await cerrarAlertasResueltas();\n  B.fin();', '  await cerrarAlertaSola("hold_stuck", "captura:0", { es: "x", en: "x" });\n  await cerrarAlertasResueltas();\n  B.fin();'],
  // Lo que falta cobrar en el mercado baja con lo pedido; boletos y patrocinios anotan lo pedido aunque Stripe ya hubiera capturado otro monto.
  ['liberarMira', 'mercado resta lo pedido', 'apps/web/lib/mercado.ts', 'resto = Math.max(0, resto - (an ? an.amt : monto));', 'resto -= monto;'],
  ['liberarMira', 'boletos anota lo pedido', 'apps/web/lib/boletos.ts', '    await marcarCobrado(op, cap.cobrado);', '    await marcarCobrado(op);'],
  ['liberarMira', 'patrocinio anota lo pedido', 'apps/web/lib/patrocinio.ts', '  return r.cobrado ?? centavos;', '  return centavos;'],
  ['liberarMira', 'patrocinio-evento anota lo pedido', 'apps/web/lib/patrocinio-evento.ts', 'await anotarPago(c, { ...cobro, centavos: cobrado, ref: id,', 'await anotarPago(c, { ...cobro, ref: id,'],
  // La cobrada de una cancelación tarde sin su regla; «cobrada» sin haber tocado la fila.
  ['liberarMira', 'la cobrada tarde sin su regla', CO, 'const regla = await reglaTardeConLoCobrado(opId).catch(', 'const regla = await Promise.resolve(null).catch('],
  ['liberarMira', '«cobrada» sin tocar la fila', CO, '    if (tocada) return "cobrada";', '    return "cobrada";'],
  // ── capturaTardeAlerta ──
  // El fallo del 25 nov: la captura tarde a la que Stripe no contestó suelta sin alerta.
  ['capturaTardeAlerta', 'viaje: sin alerta ante la red', VL, '        else if (capturaSinRespuesta(cap)) await alertarCapturaTarde(numero, x.p?.id ?? null, { codigo: cap.codigo }, x.d);\n', ''],
  ['capturaTardeAlerta', 'evento privado: sin alerta ante la red', EP, '    else if (capturaSinRespuesta(cap)) await alertarCapturaTarde(numero, o2?.pid ?? o?.pid ?? null, { codigo: cap.codigo }, d);\n', ''],
  // cobrarOperacion vuelve a no decir lo que contestó la pasarela.
  ['capturaTardeAlerta', 'cobrarOperacion sin resultado', CO, '    return { ok: false, codigo };\n  }\n  // 25 nov · Ya estaba capturado', '    return null;\n  }\n  // 25 nov · Ya estaba capturado'],
  // (revisión de 00ac9b7) · Dos alertas del mismo dinero (captura: y cobrada:): la de captura: invitaría a devolver de más.
  ['capturaTardeAlerta', 'captura: también cuando ya está cobrada', CO, 'if (d?.e === "cobrada") { console.error(', 'if (false) { console.error('],
  // Un «no» claro de la tarjeta se toma por «sin respuesta» (diría «no se sabe» de lo que sí se sabe).
  ['capturaTardeAlerta', 'un rechazo como sin respuesta', CO, 'const CAPTURA_SIN_RESPUESTA = new Set(["red", ', 'const CAPTURA_SIN_RESPUESTA = new Set(["card_declined", "red", '],
  // La red ya no cuenta como sin respuesta.
  ['capturaTardeAlerta', 'la red como un «no»', CO, 'const CAPTURA_SIN_RESPUESTA = new Set(["red", ', 'const CAPTURA_SIN_RESPUESTA = new Set(['],
  // La alerta afirma que la captura no salió.
  ['capturaTardeAlerta', 'la alerta afirma lo que no se sabe', CO, '`Stripe no contestó a la captura tarde (${msg}): no se sabe si salió`', '`Stripe no contestó a la captura tarde (${msg}): la captura no salió`'],
  // El viaje no guarda lo que contestó la captura.
  ['capturaTardeAlerta', 'viaje: la captura sin guardar el resultado', VL, '{ try { cap = await cobrarOperacion(o.id); }', '{ try { await cobrarOperacion(o.id); }'],
  // ── avisoNegUnIdioma ──
  // El fallo del 25 nov: el aviso al negocio del viaje en español aunque salga en inglés.
  ['avisoNegUnIdioma', 'viaje: «N personas» en español', VL, 'personas: { es: `${n} ${n === 1 ? "persona" : "personas"}`, en: `${n} ${n === 1 ? "person" : "people"}` }', 'personas: `${n} ${n === 1 ? "persona" : "personas"}`'],
  ['avisoNegUnIdioma', 'viaje: el servicio en español', VL, 'servicio: svc?.es ? { es: svc.es, en: svc.en || svc.es } : ""', 'servicio: svc?.es ?? ""'],
  ['avisoNegUnIdioma', 'viaje: {dep} con seCobro.es', VL, '{ dep: mitad ? { es: ` ${seCobro.es}`, en: ` ${seCobro.en}` } : "" }', '{ dep: mitad ? ` ${seCobro.es}` : "" }'],
  ['avisoNegUnIdioma', 'viaje: extra sin Bi', VL, 'async function avisarNeg(numero: string, tpl: string, extra: Record<string, string | Bi> = {}) {', 'async function avisarNeg(numero: string, tpl: string, extra: Record<string, string> = {}) {'],
  // La misma clase en la noche, la fiesta, la inscripción y la visita.
  ['avisoNegUnIdioma', 'noche: el depósito en español', 'apps/web/lib/noche-reservas.ts', '{ dep: o.dep ? { es: ` Depósito ${usdN(o.dep)} retenido.`, en: ` ${usdN(o.dep)} deposit held.` } : "" }', '{ dep: o.dep ? ` Depósito ${usdN(o.dep)} retenido.` : "" }'],
  ['avisoNegUnIdioma', 'fiesta: «N invitados» en español', 'apps/web/lib/fiestas-reservas.ts', 'invitados: g ? { es: `${g} invitados`, en: `${g} guests` } : ""', 'invitados: g ? `${g} invitados` : ""'],
  ['avisoNegUnIdioma', 'inscripción: el grupo con .es', 'apps/web/lib/inscripciones.ts', 'await avisarNeg(numero, "biz_insc_alt_ok", { grupo: lb?.es ? { es: lb.es, en: lb.en || lb.es } : "" });', 'await avisarNeg(numero, "biz_insc_alt_ok", { grupo: lb?.es ?? "" });'],
  ['avisoNegUnIdioma', 'visita: {que} con .es', 'apps/web/lib/visitas-inm.ts', 'que: { es: q.es.toLowerCase(), en: q.en.toLowerCase() }', 'que: q.es.toLowerCase()'],
];
let bien = 0, total = 0;
const correr = (g) => {
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${g}]`)) ?? ''; return [!!l, l]; }
};
for (const [g, que, f, a, b] of casos) {
  const ruta = path.join(R, f); total++;
  if (!fs.existsSync(ruta)) { console.log(`  ✗ no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { console.log(`  ✗ no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let r; try { r = correr(g); } finally { fs.writeFileSync(ruta, orig); }
  console.log(`  ${r[0] ? '✓' : '✗'} ${g} al revés (${que})${r[1] ? ' → ' + r[1].trim().slice(0, 170) : ''}`); if (r[0]) bien++;
}
const limpio = require('../lib/alreves-fin.cjs')(R, { mostrar: true });
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
