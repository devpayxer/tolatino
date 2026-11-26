// Prueba al revés de los guardianes liberarMira, capturaTardeAlerta, avisoNegUnIdioma (también el aviso a quien lo recibe: avisarCliente), dineroUnDecimal y dineroConUsd
// (25 nov, LAUNCH «el dinero dice lo que pasó», letras e y g, y «promete antes de actuar» d/e):
// soltar una retención que Stripe ya había cobrado no la deja «released» (pasarela.liberar mira el intento; el libro la anota cobrada y el equipo de dinero
// tiene la alerta cobrada:, que no se cierra sola); la captura tarde a la que Stripe no contestó alerta captura: como la que lanza; y el aviso al negocio no
// mezcla idiomas. (revisión de 621f214) El aviso del barrido que no quedó se reintenta (solo lo que falta) y la alerta dice si llegó; la segunda «cobrada»
// dice la mitad y la devolución de la llave; lo capturado distinto de lo pedido alerta; la cancelación tarde cobrada sin su regla la repara el barrido.
// (revisión de efe56b9) El aviso que ya quedó no se repite (ni por el SMS que falla, ni a los dueños que ya lo tienen, ni por la parte que tira); el
// resultado solo con el reclamo propio; reintentos espaciados y, agotados, su alerta aviso:; la mitad es lo que queda cobrado; la ventana es la de la
// cancelación, con su índice, y lo que sale de ella alerta. (revisión de 51a794d) «completar» al tope con su alerta cobrada: ya abierta abre completar:;
// la devolución ya devuelta a mano no dice «no salió». (revisión de 5255ce2) «hecha» acotada a lo de esta cancelación; mirar la llave vcx- antes de
// devolver a mano; una sola pasada del barrido; el tope que no vuelve atrás alerta.
// Se inyecta el defecto, el guardián debe fallar con SU renglón ([nombre]); se restaura.
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
  ['liberarMira', 'la regla del barrido sin aviso', CO, 'const av = regla && como !== "soltar" ? await avisarTardeCobrada(opId, ', 'const av = regla && false ? await avisarTardeCobrada(opId, '],
  ['liberarMira', 'el aviso del barrido sin reclamo', CO, '  if (!falta) return null;\n  let hecho', '  let hecho'],
  ['liberarMira', 'viaje: el aviso de lo cobrado sin reclamo', VL, '        if ((mitad > 0 || x.d.e === "cobrada") && !(await reclamarAvisoCobro(o.id))) return;\n', ''],
  ['liberarMira', 'evento privado: el aviso de lo cobrado sin reclamo', EP, '  if (quedo && !(await reclamarAvisoCobro(opId))) return { ok: true, devuelto: 0, perdio: true, devolucion: "nada" };\n', ''],
  ['liberarMira', 'el aviso del viaje sin el del negocio', VL, 'avisarNeg(numero, "biz_viaje_cx", { dep: { es: ` ${mitad ? seCobro.es : ya.es}`', 'avisarNeg(numero, "biz_viaje_x", { dep: { es: ` ${mitad ? seCobro.es : ya.es}`'],
  // La «cobrada» por relectura sin la regla que aplicó el barrido.
  ['liberarMira', 'la relectura sin regla', CO, 'return { e: "cobrada", monto: Math.max(0, y.amt - y.ref), ...(regla ? { regla } : {}) };', 'return { e: "cobrada", monto: Math.max(0, y.amt - y.ref) };'],
  // barrerAlertasDinero cierra alertas por su cuenta (la prueba din9x da por hecho que solo por cerrarAlertasResueltas).
  ['liberarMira', 'barrerAlertasDinero cierra por su cuenta', 'apps/web/lib/dinero-alertas.ts', '  await cerrarAlertasResueltas();\n  B.fin();', '  await cerrarAlertaSola("hold_stuck", "captura:0", { es: "x", en: "x" });\n  await cerrarAlertasResueltas();\n  B.fin();'],
  // Lo que falta cobrar en el mercado baja con lo pedido; boletos y patrocinios anotan lo pedido aunque Stripe ya hubiera capturado otro monto.
  ['liberarMira', 'mercado resta lo pedido', 'apps/web/lib/mercado.ts', 'resto = Math.max(0, resto - (an ? an.amt : monto));', 'resto -= monto;'],
  ['liberarMira', 'boletos anota lo pedido', 'apps/web/lib/boletos.ts', '    await marcarCobrado(op, cap.cobrado, h.total);', '    await marcarCobrado(op, undefined, h.total);'],
  ['liberarMira', 'patrocinio anota lo pedido', 'apps/web/lib/patrocinio.ts', '  return r.cobrado ?? centavos;', '  return centavos;'],
  ['liberarMira', 'patrocinio-evento anota lo pedido', 'apps/web/lib/patrocinio-evento.ts', 'await anotarPago(c, { ...cobro, centavos: cobrado, ref: id,', 'await anotarPago(c, { ...cobro, ref: id,'],
  // La cobrada de una cancelación tarde sin su regla; «cobrada» sin haber tocado la fila.
  ['liberarMira', 'la cobrada tarde sin su regla', CO, 'const regla = await (pedida ? reglaTardeLeida(opId) : reglaTardeConLoCobrado(opId)).catch(', 'const regla = await Promise.resolve(null).catch('],
  ['liberarMira', '«cobrada» sin tocar la fila', CO, '    if (tocada) return "cobrada";', '    return "cobrada";'],
  // (revisión de 621f214) · M4: el aviso que manda el barrido se pierde si el envío falla (avisar no dice si quedó, el reclamo no se devuelve, nadie lo
  // reintenta); el reintento repite el que ya llegó; la cancelación lo manda y el barrido lo repite; la alerta no dice si le llegó.
  ['liberarMira', 'avisar dice que quedó aunque falle', 'apps/web/lib/avisos.ts', 'el aviso a ${userId} no quedó: ${String((e as Error)?.message ?? e).slice(0, 200)}`);\n    return false;', 'el aviso a ${userId} no quedó: ${String((e as Error)?.message ?? e).slice(0, 200)}`);\n    return true;'],
  ['liberarMira', 'el reclamo no se devuelve', CO, "jsonb_build_object('avisoCobro', false, 'avisoCobroFalta'", "jsonb_build_object('avisoCobro', true, 'avisoCobroFalta'"],
  ['liberarMira', 'el reintento manda también lo que ya llegó', VL, '  const cli = !partes.cli || (await avisoParte(', '  const cli = (await avisoParte('],
  ['liberarMira', 'evento privado: el reintento manda también lo que ya llegó', EP, '  const okNeg = !partes.neg || (await avisoParte(', '  const okNeg = (await avisoParte('],
  ['liberarMira', 'la cancelación repite lo que el barrido ya mandó', CO, " and not (details ? 'avisoCobroAt')`, [opId])).rowCount;", "`, [opId])).rowCount;"],
  ['liberarMira', 'la alerta cobrada: no dice si llegó el aviso', CO, '. Revisa en Stripe que cuadre; no devuelvas nada más.${avT.es}`', '. Revisa en Stripe que cuadre; no devuelvas nada más.`'],
  ['liberarMira', 'el barrido no reintenta el aviso', CO, 'if (regla) await avisarTardeCobrada(x.op, x.num, x.kind, x.amt, regla, true);', 'if (regla) void x;'],
  // M6: la segunda «cobrada» (la cancelación y el barrido): sin nada más que devolver dice «nada» de la devolución de la llave. (revisión de efe56b9) La mitad
  // es lo que de verdad queda cobrado (min(floor(tot/2), amt − ref)); contar la de la llave como no hecha decía «la mitad» aunque se devolviera de más.
  ['liberarMira', 'la mitad sin contar lo devuelto con la llave', CO, 'const mitad = Math.min(Math.floor(o.tot / 2), Math.max(0, o.amt - o.ref));', 'const mitad = Math.min(Math.floor(o.tot / 2), Math.max(0, o.amt - (o.ref - o.vcx)));'],
  ['liberarMira', 'la relectura sin contar lo devuelto con la llave', CO, 'const queda = Math.min(Math.floor(o.tot / 2), Math.max(0, o.amt - o.ref));', 'const queda = Math.min(Math.floor(o.tot / 2), Math.max(0, o.amt - (o.ref - o.vcx)));'],
  ['liberarMira', 'sin nada que devolver dice «nada» aunque la de la llave exista', CO, 'if (falta <= 0) return x.seQueda ? (await devDeLaLlave(o.pid, x.idem)) ?? { e: "nada", monto: 0 } :', 'if (falta <= 0) return x.seQueda ? { e: "nada", monto: 0 } :'],
  // M5: lo capturado distinto de lo pedido sin alerta (cobros, mercado, boletos, patrocinios) o con alerta también del mismo monto.
  ['liberarMira', 'cobrarOperacion: otro monto sin alerta', CO, '  if (tocada) await (await import("./dinero-alertas")).alertarOtroMontoPago(p.id, p.amount, r.cobrado);\n', ''],
  ['liberarMira', 'mercado: otro monto sin alerta', 'apps/web/lib/mercado.ts', '    if (u.rowCount) await (await import("./dinero-alertas")).alertarOtroMontoPago(p.id, monto, r.cobrado);\n', ''],
  ['liberarMira', 'boletos: otro monto sin alerta', 'apps/web/lib/boletos.ts', '  if (pid) await (await import("./dinero-alertas")).alertarOtroMontoPago(pid, pedido, cobrado);\n', ''],
  ['liberarMira', 'patrocinio: otro monto sin alerta', 'apps/web/lib/patrocinio.ts', '      otroMonto = { id, cobrado };\n', ''],
  ['liberarMira', 'patrocinio del evento: otro monto sin alerta', 'apps/web/lib/patrocinio-evento.ts', 'alertarOtroMonto("event_sponsorships", om.id, centavos, om.cobrado,', 'alertarOtroMonto("sponsorships", om.id, centavos, om.cobrado,'],
  ['liberarMira', 'la alerta de otro monto también del mismo', 'apps/web/lib/dinero-alertas.ts', 'if (cobrado == null || cobrado === pedido) return;', 'if (cobrado == null) return;'],
  // Fuera del diff de 621f214: la cancelación tarde cobrada sin su regla (el proceso murió) nadie la encuentra, o se toca mientras sigue en curso.
  ['liberarMira', 'la cobrada sin regla no se repara', CO, 'await cobradaConSuRegla(x.op, REPARA, x.aplicada ? "completar" : "reparar");', 'void REPARA;'],
  ['liberarMira', 'el reparo no espera a la cancelación en curso', CO, " and o.cancelled_at < now() - interval '5 minutes'", ''],
  ['liberarMira', 'el reparo no mira el evento privado', CO, "else coalesce(o.details->>'perdio', '') = 'false' end", 'else false end'],
  ['barridoCompleto', 'el reparo fuera del barrido central', 'apps/web/lib/barrido.ts', '        ["cobradasTarde", () => cobros.barrerCobradasTarde()],\n', ''],
  // (revisión de efe56b9) · H1: el aviso que ya quedó en la campana se da por no quedado si después falla el SMS o el push (el reintento lo repetía hasta 5
  // veces); el reintento de «neg» repite a los dueños que ya lo tienen; si una parte tira, se pierde la otra.
  ['liberarMira', 'avisar: el SMS que falla dice que no quedó', 'apps/web/lib/avisos.ts', '    try {\n      if (st === "pendiente" || st === "pruebas") await salirSms("notifications", id,', '    {\n      if (st === "pendiente" || st === "pruebas") await salirSms("notifications", id,'],
  ['liberarMira', 'avisar: el push que falla dice que no quedó', 'apps/web/lib/avisos.ts', '    try {\n      if (pst === "pendiente") await encolar([id]);\n    } catch (e) {', '    if (pst === "pendiente") await encolar([id]);\n    try {} catch (e) {'],
  ['liberarMira', 'avisarNegocio no le pasa la llave a avisar', 'apps/web/lib/avisos.ts', 'for (const u of L) if ((await avisar(u.id, tpl, v, o)) === false) todos = false;', 'for (const u of L) if ((await avisar(u.id, tpl, v, { href: o.href, ref: o.ref })) === false) todos = false;'],
  // (revisión de ae940a7) · unaVez en avisar: la marca aparte de la fila, o sin saltar a quien ya la tiene; el SMS sin anotar queda «fallo»; avisar se
  // traga el «no quedó» sin registro; avisoParte que deja tirar; el aviso a quien pagó sin su llave; la regla sin su marca; la que quedó a medias no se completa.
  ['liberarMira', 'avisar no salta a quien ya tiene la marca', 'apps/web/lib/avisos.ts', 'where $14::text is null or exists (select 1 from k) returning id::text`', 'returning id::text`'],
  ['liberarMira', 'el SMS sin anotar queda «fallo»', 'apps/web/lib/avisos.ts', "origen aviso:${id}): ${String((e as Error)?.message ?? e).slice(0, 200)}`);\n    }", "origen aviso:${id}): ${String((e as Error)?.message ?? e).slice(0, 200)}`);\n      await db().query(`update notifications set sms_status = 'fallo' where id = $1::bigint`, [id]);\n    }"],
  ['liberarMira', 'avisar se traga el «no quedó»', 'apps/web/lib/avisos.ts', '    console.error(`[avisos] ${tpl}: el aviso a ${userId} no quedó:', '    void (`[avisos] ${tpl}: el aviso a ${userId} no quedó:'],
  ['liberarMira', 'viaje: el aviso a quien pagó sin su llave', VL, '}, `cobrada:viaje_cx:${numero}`)));', '})));'],
  ['liberarMira', 'evento privado: el aviso a quien pagó sin su llave', EP, '}, `cobrada:evp_cancelado:${numero}`)));', '})));'],
  ['liberarMira', 'viaje: avisoParte copiada aquí', VL, 'export async function avisarViajeTardeCobrado(', 'async function avisoParte(numero: string, tpl: string, f: () => Promise<boolean | undefined>): Promise<boolean> { return (await f()) !== false; }\nexport async function avisarViajeTardeCobrado('],
  ['liberarMira', 'la regla sin su marca', CO, ", 'reglaCobradaAt', coalesce(details->'reglaCobradaAt', to_jsonb(now()))) where id = $1::bigint`, [opId, mitad]);", ") where id = $1::bigint`, [opId, mitad]);"],
  ['liberarMira', 'la que quedó a medias no se completa', CO, 'await cobradaConSuRegla(x.op, REPARA, x.aplicada ? "completar" : "reparar");', 'await cobradaConSuRegla(x.op, REPARA, "reparar");'],
  // (revisión de 90170a1) · La regla vuelve a pedir la devolución de su llave que ya falló (renombrada «~fallida-») o que no se pudo anotar (refund_stuck):
  // se devolvería dos veces; «completar» con la llave ya pedida mueve dinero; «Se completó» sin regla; «completar» sin tope; el SMS se anota una sola vez.
  ['liberarMira', 'la regla pide otra vez la devolución fallida', CO, '    if (previa) return { queda: mitad, dev: segunLoDevuelto(previa, o.amt - o.ref - mitad, o.ref) };', '    if (previa?.e === "hecha") return { queda: mitad, dev: previa };'],
  ['liberarMira', 'la regla pide otra vez la que no se pudo anotar', CO, '    if (atascada) return { queda: mitad, dev: segunLoDevuelto(', '    if (false) return { queda: mitad, dev: segunLoDevuelto('],
  ['liberarMira', 'la relectura no dice fallida sin fila', CO, '!o.rst ? (o.atascada !== null ? { e: "fallida", monto: Math.max(0, o.atascada) } : null)', '!o.rst ? null'],
  ['liberarMira', '«completar» con la llave pedida vuelve a aplicar la regla', CO, 'const regla = await (pedida ? reglaTardeLeida(opId) : reglaTardeConLoCobrado(opId))', 'const regla = await (pedida ? reglaTardeConLoCobrado(opId) : reglaTardeConLoCobrado(opId))'],
  ['liberarMira', '«Se completó» sin regla', CO, 'antes de su aviso o de esta alerta.${regla ? " Se completó." : ""}`', 'antes de su aviso o de esta alerta. Se completó.`'],
  ['liberarMira', '«completar» sin regla vuelve cada minuto', CO, '    if (n < COMPLETAR_INTENTOS) {', '    if (n < Infinity) {'],
  ['liberarMira', 'el barrido sin el tope de «completar»', CO, '[f.negocio ?? null, BARRIDO_TARDE_DIAS, COMPLETAR_INTENTOS]', '[f.negocio ?? null, BARRIDO_TARDE_DIAS, 1e9]'],
  ['liberarMira', 'el SMS se anota una sola vez', 'apps/web/lib/avisos.ts', '  await anotar().catch(() => anotar());', '  await anotar();'],
  // (revisión de 51a794d) · «completar» al tope sin regla con su alerta cobrada: ya abierta: «No se pudo completar» se pierde (sin su alerta completar:, o
  // sin volver el tope atrás si no se anota, o sin contar la cobrada: que lanzó); la devolución ya devuelta a mano dice «no salió» (o «$0.00»).
  ['liberarMira', '«completar» al tope sin su alerta propia', CO, '    const dicha = nueva === false && await (await import("./dinero-alertas")).alertar("hold_stuck", `completar:${c.id}`', '    const dicha = nueva === false && await (await import("./dinero-alertas")).alertar("hold_stuck", `cobrada:${c.id}`'],
  ['liberarMira', '«completar»: el tope no vuelve atrás', CO, '    if (!dicha) await db().query(', '    if (false) await db().query('],
  ['liberarMira', '«completar»: la cobrada: que lanzó no cuenta', CO, 'if (como === "completar" && !regla && nueva !== true) {', 'if (como === "completar" && !regla && nueva === false) {'],
  ['liberarMira', 'ya devuelta a mano dice «no salió»', CO, '  if (falta <= 0) { const r: DevCuadrar = ref <= 0 ? { e: "nada", monto: 0 } : dev.monto > 0 ? { e: "hecha", monto: Math.min(ref, dev.monto) } : { e: "nada", monto: 0, cuadrar: true }; return r; }\n', ''],
  ['liberarMira', 'la regla sin fila no mira lo devuelto', CO, '    if (atascada) return { queda: mitad, dev: segunLoDevuelto({ e: "fallida", monto: Math.max(0, atascada.pedido) }, o.amt - o.ref - mitad, o.ref) };', '    if (atascada) return { queda: mitad, dev: { e: "fallida", monto: Math.max(0, atascada.pedido) } };'],
  ['liberarMira', 'la relectura no mira lo devuelto', CO, 'return { queda, dev: dev && segunLoDevuelto(dev, o.amt - o.ref - queda, o.ref) };', 'return { queda, dev };'],
  ['liberarMira', 'completar: se cierra sola', 'apps/web/lib/dinero-alertas.ts', "a.subject_id ~ '^(liberar|cobrar):[0-9]{1,18}$'", "a.subject_id ~ '^(liberar|cobrar|completar):[0-9]{1,18}$'"],
  // (revisión de 5255ce2, 26 nov) · M1: «hecha» con todo lo devuelto del cobro (no lo de esta cancelación); lo pedido sin fila sale de lo que falta (no de su
  // refund_stuck), en la regla y en su relectura; sin saber lo pedido, la alerta no dice «revisa que cuadre». M2: lo que pide devolver a mano sin mirar antes
  // la devolución de la llave vcx-; ojoLlave sin la llave. M3: barrerCobradasTarde llamado fuera del barrido central, o el barrido sin su candado. M4: el tope
  // que no vuelve atrás sin su alerta completar:.
  ['liberarMira', '«hecha» con todo lo devuelto del cobro', CO, 'dev.monto > 0 ? { e: "hecha", monto: Math.min(ref, dev.monto) }', 'dev.monto > 0 ? { e: "hecha", monto: ref }'],
  ['liberarMira', 'la regla sin fila: lo pedido de lo que falta', CO, 'monto: Math.max(0, atascada.pedido) }', 'monto: Math.max(0, o.amt - o.ref - mitad) }'],
  ['liberarMira', 'la relectura sin fila: lo pedido de lo que falta', CO, '{ e: "fallida", monto: Math.max(0, o.atascada) }', '{ e: "fallida", monto: Math.max(0, o.amt - o.ref - queda) }'],
  ['liberarMira', 'sin saber lo pedido, la alerta calla', CO, '{ es: " y ya no falta nada por devolver: revisa que cuadre", en: " and nothing is left to refund: check that it matches" }', '{ es: "", en: "" }'],
  ['liberarMira', '«devuélveselo» sin mirar la llave vcx-', CO, 'si no, devuélveselo al cliente.${ojo.es}`', 'si no, devuélveselo al cliente.`'],
  ['liberarMira', 'reparar: «apply it by hand» sin mirar la llave vcx-', CO, 'and tell the payer and the business.${ojo.en}` } });', 'and tell the payer and the business.` } });'],
  ['liberarMira', 'la llave vcx- también fuera de la cancelación tarde de quien pagó', CO, 'const ojo: Msg = ojoLlave(c.tarde ? c.kind : "", c.num);', 'const ojo: Msg = ojoLlave(c.kind, c.num);'],
  ['liberarMira', 'ojoLlave sin la llave', CO, 'si la devolución con la llave vcx-${num} ya salió o va en camino', 'si la devolución ya salió o va en camino'],
  ['liberarMira', 'barrerCobradasTarde fuera del barrido central', 'apps/web/lib/dinero-alertas.ts', 'export async function barrerAlertasDinero(): Promise<number> {\n  let n = 0;', 'export async function barrerAlertasDinero(): Promise<number> {\n  let n = await (await import("./cobros")).barrerCobradasTarde();'],
  ['liberarMira', 'el barrido central sin su candado', 'apps/web/lib/barrido.ts', '`select pg_try_advisory_lock($1) as ok`', '`select $1::bigint > 0 as ok`'],
  ['liberarMira', '«completar»: el tope que no vuelve atrás, solo en el registro', CO, '        await (await import("./dinero-alertas")).alertar("hold_stuck", `completar:${c.id}`, { monto: c.amt, negocio: c.biz, ciudad: c.city, detalle: {\n          es: nueva === false', '        await Promise.resolve({ monto: c.amt, negocio: c.biz, ciudad: c.city, detalle: {\n          es: nueva === false'],
  ['liberarMira', 'a medias: solo sin alerta (el aviso sin reclamar se pierde)', CO, " or (coalesce((o.details->>'reglaCompletarIntentos')::int, 0) < $3::int and not coalesce((o.details->>'avisoCobro')::boolean, false) and not (o.details ? 'avisoCobroAt'))))", "))"],
  ['liberarMira', 'la marca aparte de la fila', 'apps/web/lib/avisos.ts', 'with k as (insert into notif_once (key) select $14::text where $14::text is not null on conflict do nothing returning 1)\n       insert into notifications', 'insert into notifications'],
  ['liberarMira', 'viaje: el aviso al negocio sin su llave', VL, '}, `cobrada:biz_viaje_cx:${numero}`)));', '})));'],
  ['liberarMira', 'evento privado: el aviso al negocio sin su llave', EP, '{ dep: neg }, `cobrada:evp_biz_cx:${numero}`)));', '{ dep: neg })));'],
  ['liberarMira', 'la parte que tira se lleva la otra', 'apps/web/lib/avisos.ts', '  try { return (await f()) !== false; } catch (e) { console.error(', '  try { return (await f()) !== false; } finally { console.error('],
  ['liberarMira', 'evento privado: avisoParte copiada aquí', EP, 'export async function avisarEvpTardeCobrado(', 'async function avisoParte(numero: string, tpl: string, f: () => Promise<boolean | undefined>): Promise<boolean> { return (await f()) !== false; }\nexport async function avisarEvpTardeCobrado('],
  // H5: el resultado del aviso pisa el reclamo de otro (sin mirar avisoCobroAt).
  ['liberarMira', 'el aviso que quedó pisa el reclamo de otro', CO, "where id = $1::bigint and details->>'avisoCobroAt' = $2::text`, [opId, c.at]);", "where id = $1::bigint`, [opId, c.at]);"],
  ['liberarMira', 'el reclamo devuelto pisa el de otro', CO, "        where id = $1::bigint and details->>'avisoCobroAt' = $2::text returning", "        where id = $1::bigint returning"],
  // H4: reintentos sin espera creciente; agotados o sin regla, sin alerta; la alerta cobrada: pide «díselo tú» sin saberlo.
  ['liberarMira', 'los reintentos sin espera creciente', CO, 'export const AVISO_TARDE_ESPERA_MIN = [1, 5, 15, 60, 240];', 'export const AVISO_TARDE_ESPERA_MIN = [1, 1, 1, 1, 1];'],
  ['liberarMira', 'el reclamo no espera', CO, "< now() - make_interval(mins => coalesce(($4::int[])[coalesce((details->>'avisoCobroIntentos')::int, 0)], 0)))", "< now())"],
  ['liberarMira', 'agotado sin alerta aviso:', CO, 'if (agotado || sinRegla) await alertarAvisoTarde(', 'if (sinRegla) await alertarAvisoTarde('],
  ['liberarMira', 'sin regla para armarlo, en silencio', CO, '    else await avisoSinRegla(x.op, x.num);', '    else void x;'],
  ['liberarMira', 'la alerta cobrada: pide «díselo tú»', CO, 'si no llega, se abre la alerta aviso:${c.id}.`', 'si no llega, díselo tú.`'],
  // H6: el reintento depende de que exista la alerta cobrada:.
  ['liberarMira', 'el reintento depende de la alerta cobrada:', CO, "o.cancelled_at > now() - interval '30 days' and o.details ? 'avisoCobroFalta'", "o.cancelled_at > now() - interval '30 days' and o.details ? 'avisoCobroFalta' and exists (select 1 from money_alerts a where a.kind = 'hold_stuck' and a.subject_id = 'cobrada:' || p.id::text)"],
  // H2: la ventana vuelve a ser la del cobro; lo que sale de la ventana cae en silencio; sin el índice parcial.
  ['liberarMira', 'la ventana del cobro, no de la cancelación', CO, "where o.cancel_reason = 'tarde' and o.kind in ('trip', 'private_event') and o.cancelled_at > now() - interval '30 days' and o.cancelled_at < now() - interval '5 minutes'", "where o.cancel_reason = 'tarde' and o.kind in ('trip', 'private_event') and p.captured_at > now() - interval '2 days' and o.cancelled_at < now() - interval '5 minutes'"],
  ['liberarMira', 'lo que sale de la ventana, en silencio', CO, 'await (await import("./dinero-alertas")).alertar("hold_stuck", `reparar:${x.pid}`', 'void ("hold_stuck", `reparar:${x.pid}`'],
  ['liberarMira', 'sin el índice de las cancelaciones tarde', 'packages/db/migrations/0225_cancelada_tarde_por_su_cancelacion.sql', 'on operations (cancelled_at) where', 'on operations (captured_at) where'],
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
  ['avisoNegUnIdioma', 'viaje: extra sin Bi', VL, 'async function avisarNeg(numero: string, tpl: string, extra: Record<string, string | Bi> = {}, unaVez?: string) {', 'async function avisarNeg(numero: string, tpl: string, extra: Record<string, string> = {}, unaVez?: string) {'],
  // La misma clase en la noche, la fiesta, la inscripción y la visita.
  ['avisoNegUnIdioma', 'noche: el depósito en español', 'apps/web/lib/noche-reservas.ts', '{ dep: o.dep ? { es: ` Depósito ${usdN(o.dep)} retenido.`, en: ` ${usdN(o.dep)} deposit held.` } : "" }', '{ dep: o.dep ? ` Depósito ${usdN(o.dep)} retenido.` : "" }'],
  ['avisoNegUnIdioma', 'fiesta: «N invitados» en español', 'apps/web/lib/fiestas-reservas.ts', 'invitados: g ? { es: `${g} invitados`, en: `${g} guests` } : ""', 'invitados: g ? `${g} invitados` : ""'],
  ['avisoNegUnIdioma', 'inscripción: el grupo con .es', 'apps/web/lib/inscripciones.ts', 'await avisarNeg(numero, "biz_insc_alt_ok", { grupo: lb?.es ? { es: lb.es, en: lb.en || lb.es } : "" });', 'await avisarNeg(numero, "biz_insc_alt_ok", { grupo: lb?.es ?? "" });'],
  ['avisoNegUnIdioma', 'visita: {que} con .es', 'apps/web/lib/visitas-inm.ts', 'que: { es: q.es.toLowerCase(), en: q.en.toLowerCase() }', 'que: q.es.toLowerCase()'],
  // (LAUNCH «promete antes de actuar» d/e) · El aviso a quien lo recibe en el idioma de quien lo recibe, y UNA regla para el dinero que ve el cliente.
  ["avisoNegUnIdioma", "fiesta (cliente): el día con diaFiesta(…, true)", 'apps/web/lib/fiestas-reservas.ts', "dia: { es: diaFiesta(o.ymd, true), en: diaFiesta(o.ymd, false) }, hora: hora(o.m), dev: \"\", dep: \"\", dinero: \"\"", "dia: diaFiesta(o.ymd, true), hora: hora(o.m), dev: \"\", dep: \"\", dinero: \"\""],
  ["avisoNegUnIdioma", "noche (cliente): la noche con .es", 'apps/web/lib/noche-reservas.ts', "noche: nocheL(o), hora: hNoche(Number(o.det.arrive)), guarda:", "noche: nocheL(o).es, hora: hNoche(Number(o.det.arrive)), guarda:"],
  ["avisoNegUnIdioma", "noche (cliente): la puerta en español", 'apps/web/lib/noche-reservas.ts', "await avisarCliente(numero, \"noche_lista\", { puerta: { es: `${puertaTexto(o.det, true)}.`, en: `${puertaTexto(o.det, false)}.` } });", "await avisarCliente(numero, \"noche_lista\", { puerta: `${puertaTexto(o.det, true)}.` });"],
  ["avisoNegUnIdioma", "noche (cliente): el depósito cobrado en español", 'apps/web/lib/noche-reservas.ts', "dep: o.dep ? { es: ` Depósito de ${usdN(o.dep)} cobrado; se descuenta de tu cuenta.`, en: ` ${usdN(o.dep)} deposit charged; it comes off your bill.` } : \"\"", "dep: o.dep ? ` Depósito de ${usdN(o.dep)} cobrado; se descuenta de tu cuenta.` : \"\""],
  ["avisoNegUnIdioma", "noche (cliente): extra sin Bi", 'apps/web/lib/noche-reservas.ts', "async function avisarCliente(numero: string, tpl: string, extra: Record<string, string | Bi> = {}) {", "async function avisarCliente(numero: string, tpl: string, extra: Record<string, string> = {}) {"],
  ["avisoNegUnIdioma", "inscripción (cliente): «empieza el» con cuandoInsc(…, true)", 'apps/web/lib/inscripciones.ts', "cuando: { es: cuandoInsc(o.det, true), en: cuandoInsc(o.det, false) }", "cuando: cuandoInsc(o.det, true)"],
  ["avisoNegUnIdioma", "inscripción (cliente): el certificado en español", 'apps/web/lib/inscripciones.ts', "{ cert: dio ? { es: ` ${o.det.oficial ? \"Tu certificado\" : \"Tu constancia\"} está listo. ¡Felicidades!`, en: ` Your ${o.det.oficial ? \"certificate\" : \"proof of completion\"} is ready. Congratulations!` } : \"\" }", "{ cert: dio ? ` ${o.det.oficial ? \"Tu certificado\" : \"Tu constancia\"} está listo. ¡Felicidades!` : \"\" }"],
  ["avisoNegUnIdioma", "inscripción: «vence» de la oferta sin su mes/día", 'apps/web/lib/inscripciones.ts', "'FMMM/FMDD') as until_en", "'FMDD/FMMM') as until_en"],
  ["avisoNegUnIdioma", "visita (cliente): el artículo con .es", 'apps/web/lib/visitas-inm.ts', "cuando: cuandoL(o), dir: \"\", item: itemL(o), motivo: \"\"", "cuando: cuandoL(o), dir: \"\", item: (o.det.item as Bi)?.es ?? \"\", motivo: \"\""],
  ["avisoNegUnIdioma", "visita (cliente): la dirección en español", 'apps/web/lib/visitas-inm.ts', "{ dir: d ? { es: ` Dirección: ${d}.`, en: ` Address: ${d}.` } : o.det.at_home ? { es: \" Te recogen en tu casa.\", en: \" They pick you up at home.\" } : \"\" }", "{ dir: d ? ` Dirección: ${d}.` : o.det.at_home ? \" Te recogen en tu casa.\" : \"\" }"],
  ["avisoNegUnIdioma", "cita: el servicio leído solo en español", 'apps/web/lib/citas-flujo.ts', "coalesce(nullif(o.details #>> '{svc,en}', ''), o.details #>> '{svc,es}', '') as servicio_en", "'' as servicio_en"],
  ["dineroUnDecimal", "la regla común sin sus dos decimales fijos", 'apps/web/lib/dinero-comun.ts', "minimumFractionDigits: a % 100 ? 2 : 0, maximumFractionDigits: 2", "maximumFractionDigits: 2"],
  ["dineroUnDecimal", "la fiesta deja «$52.5»", 'apps/web/app/(app)/fiesta/[num]/FiestaEstado.tsx', "import { usd as dinero } from \"@/lib/dinero-comun\";", "const dinero = (c: number) => `$${(c / 100).toLocaleString(\"en-US\", { maximumFractionDigits: 2 })}`;"],
  ["dineroUnDecimal", "el aviso de la fiesta deja «$52.5»", 'apps/web/lib/fiestas-reservas.ts', "import { usd as money } from \"./dinero-comun\";", "const money = (c: number) => `$${(c / 100).toLocaleString(\"en-US\", { maximumFractionDigits: 2 })}`;"],
  ["dineroUnDecimal", "los envíos dejan «$52.5»", 'apps/web/lib/envios.ts', "import { usd as money } from \"./dinero-comun\";", "const money = (c: number) => `$${(c / 100).toLocaleString(\"en-US\", { maximumFractionDigits: 2 })}`;"],
  // (revisión de 8d7d0c1) · El primer aviso de la cita y sus hermanos en el idioma de quien los recibe; la regla del dinero con su signo y su cero.
  ["avisoNegUnIdioma", "cita nueva: el servicio solo en español", 'apps/web/lib/citas.ts', "coalesce(nullif(o.details #>> '{svc,en}', ''), o.details #>> '{svc,es}', '') as svc_en,", "'' as svc_en,"],
  ["avisoNegUnIdioma", "cita nueva: « con Ana» solo en español", 'apps/web/lib/citas.ts', "{ es: ` con ${o.con.split(\" \")[0]}`, en: ` with ${o.con.split(\" \")[0]}` }", "` con ${o.con.split(\" \")[0]}`"],
  ["avisoNegUnIdioma", "cita nueva: el día sin su MM/DD", 'apps/web/lib/citas.ts', "to_char(o.scheduled_at at time zone c.timezone, 'FMMM/FMDD') as dia_en, to_char", "to_char"],
  ["avisoNegUnIdioma", "cita de salud: el día sin su MM/DD", 'apps/web/lib/citas-salud.ts', "'FMMM/FMDD') as dia_en, ", "'FMDD/FMMM') as dia_en, "],
  ["avisoNegUnIdioma", "cita de oficina: « con Ana» en español", 'apps/web/lib/citas-pro.ts', "{ es: ` con ${primerNombre(o.con)}`, en: ` with ${primerNombre(o.con)}` }", "` con ${primerNombre(o.con)}`"],
  ["avisoNegUnIdioma", "mesa: el día sin su MM/DD", 'apps/web/lib/avisos.ts', "'FMMM/FMDD') as dia_en, ", "'FMDD/FMMM') as dia_en, "],
  ["avisoNegUnIdioma", "chofer: el día solo DD/MM", 'apps/web/lib/chofer.ts', "'MM/DD') as dia_en,", "'DD/MM') as dia_en,"],
  ["avisoNegUnIdioma", "solicitudes: el servicio de la pregunta solo en español", 'apps/web/lib/solicitudes.ts', "coalesce(nullif(form#>>'{svc,en}', ''), form#>>'{svc,es}', '') as e", "form#>>'{svc,es}' as e"],
  ["avisoNegUnIdioma", "solicitudes: reenviar lee el servicio solo en español", 'apps/web/lib/solicitudes.ts', "coalesce(nullif(r.form#>>'{svc,en}', ''), r.form#>>'{svc,es}', '') as svc_en,", ""],
  ["dineroUnDecimal", "el dinero con Intl.NumberFormat deja «$52.5»", 'apps/web/lib/envios.ts', "import { usd as money } from \"./dinero-comun\";", "const money = (c: number) => `$${new Intl.NumberFormat(\"en-US\", { maximumFractionDigits: 2 }).format(c / 100)}`;"],
  ["dineroUnDecimal", "el dinero con toFixed(1)", 'apps/web/lib/envios.ts', "import { usd as money } from \"./dinero-comun\";", "const money = (c: number) => `$${(c / 100).toFixed(1)}`;"],
  ["dineroUnDecimal", "usd sin el signo delante del «$»", 'apps/web/lib/dinero-comun.ts', "`${r < 0 ? \"-\" : \"\"}$${(a / 100)", "`$${(r / 100)"],
  ["dineroUnDecimal", "usd deja «-$0» o NaN", 'apps/web/lib/dinero-comun.ts', "Math.round(Number.isFinite(n) ? n : 0)", "Math.round(c)"],
  // (LAUNCH «avisos en un solo idioma», 25 nov) · El OBJETO de cada llamada directa a avisar / avisarNegocio / avisarTelefono, en lib/ (y sus subdirectorios) y en app/**/acciones*.ts.
  ["avisoNegUnIdioma", "llamada directa: {que} en un solo idioma (rentas)", 'apps/web/lib/rentas.ts', 'que: { es: "ya no la necesita · volvió a la tienda", en: "no longer needs it · it is back at the shop" }', 'que: "ya no la necesita · volvió a la tienda"'],
  ["avisoNegUnIdioma", "llamada directa: el artículo con .es (apartados)", 'apps/web/lib/apartados.ts', '"apt_falta", { negocio: x.bname, articulo: ln.n }', '"apt_falta", { negocio: x.bname, articulo: ln.n.es }'],
  ["avisoNegUnIdioma", "llamada directa: el día con diaCorto(…, true) (boletos)", 'apps/web/lib/boletos.ts', 'cuando: cuandoBi(o.dia, o.h0) }', 'cuando: `${diaCorto(o.dia, true)} · ${hora(o.h0)}` }'],
  ["avisoNegUnIdioma", "llamada directa: el [0] de un par ES/EN (jobs)", 'apps/web/lib/jobs.ts', 'estado: { es: e[0], en: e[1] }', 'estado: e[0]'],
  ["avisoNegUnIdioma", "llamada directa: el servicio del plan con alias «as plan» solo en español", 'apps/web/lib/planes.ts', ", coalesce(nullif(o.details#>>'{svc,en}', ''), o.details#>>'{svc,es}') as plan_en from operations o where o.id = $1::bigint", " from operations o where o.id = $1::bigint"],
  ["avisoNegUnIdioma", "la consulta de la pantalla ya no se excusa por «as ymd» (citas › miaCita)", 'apps/web/lib/citas.ts', "coalesce(nullif(o.details #>> '{svc,en}', ''), o.details #>> '{svc,es}', '') as svc_en, (o.scheduled_at", "(o.scheduled_at"],
  ["avisoNegUnIdioma", "acciones*.ts: el cupón con .es (admin/acciones-gam)", 'apps/web/app/admin/acciones-gam.ts', '"biz_cupon_ok", { cupon: r.title, costo: v }', '"biz_cupon_ok", { cupon: r.title.es, costo: v }'],
  ["avisoNegUnIdioma", "subdirectorio de lib/: el motivo en un idioma (llaves/llaves.ts)", 'apps/web/lib/llaves/llaves.ts', 'motivo: { es: "parece que alguien usó una copia de esa llave", en: "it looks like someone used a copy of that key" }', 'motivo: "parece que alguien usó una copia de esa llave"'],
  ["avisoNegUnIdioma", "el aviso guardado para después (vars) con .es (puerta-equipo)", 'apps/web/lib/puerta-equipo.ts', 'evento: e.t, cuando: cuandoBi(e.dia, e.h0) }', 'evento: e.t.es, cuando: cuandoBi(e.dia, e.h0) }'],
  ["avisoNegUnIdioma", "avisarTelefono: «N entradas» en un idioma", 'apps/web/lib/boletos-despues.ts', 'cuantos: q === 1 ? { es: "1 entrada", en: "1 entry" } : { es: `${q} entradas`, en: `${q} entries` }', 'cuantos: q === 1 ? "1 entrada" : `${q} entradas`'],
  ["avisoNegUnIdioma", "llamada directa: el dinero armado a mano con toFixed (mercado)", 'apps/web/lib/mercado.ts', 'monto: money(cobrado), libre', 'monto: `$${(cobrado / 100).toFixed(2)}`, libre'],
  ["avisoNegUnIdioma", "« con ${…}» sin su « with ${…}» en CADA aparición (un « with» lejano no excusa a otro « con»)", 'apps/web/lib/citas.ts', '  const con = o.con ? { es: ` con ${o.con.split(" ")[0]}`', '  const conMal = ` con ${o.con}`;\n  /* ' + 'x'.repeat(300) + ' */\n  const con = o.con ? { es: ` con ${o.con.split(" ")[0]}`'],
  // (revisión de b5edd4c) La lista de pendientes tiene que seguir VACÍA (antes «solo baja»: una entrada nueva con su llamada mala pasaba).
  ["avisoNegUnIdioma", "la lista de pendientes tiene que seguir vacía", 'guardianes/run.mjs', 'const PENDIENTES_UN_IDIOMA = {};', 'const PENDIENTES_UN_IDIOMA = { "apps/web/lib/rentas.ts": 3 };'],
  ["avisoNegUnIdioma", "entrada nueva en pendientes + una llamada mala (rentas)", [['guardianes/run.mjs', 'const PENDIENTES_UN_IDIOMA = {};', 'const PENDIENTES_UN_IDIOMA = { "apps/web/lib/rentas.ts": 1 };'], ['apps/web/lib/rentas.ts', 'que: { es: "ya no la necesita · volvió a la tienda", en: "no longer needs it · it is back at the shop" }', 'que: "ya no la necesita · volvió a la tienda"']]],
  // Avisos que pasan por un ayudante o una variable que el guardián no miraba.
  ["avisoNegUnIdioma", "ayudante avisarEvp: {que} en español", EP, '{ que: { es: "No respondieron a tiempo.", en: "They did not reply in time." } }', '{ que: "No respondieron a tiempo." }'],
  ["avisoNegUnIdioma", "ayudante avisarEvp: {dep} en español", EP, '{ dep: { es: " No se había cobrado nada.", en: " Nothing had been charged." } }', '{ dep: " No se había cobrado nada." }'],
  ["avisoNegUnIdioma", "const vars = { … }: el día con diaEvp(…, true)", EP, 'dia: { es: diaEvp(o.ymd, true), en: diaEvp(o.ymd, false) }, hora: horaL(o.m)', 'dia: diaEvp(o.ymd, true), hora: horaL(o.m)'],
  ["avisoNegUnIdioma", "ayudante avisarDueño: el día con es-US fijo", 'apps/web/lib/suscripcion.ts', 'dia: { es: new Date(s.trial_ends_at!).toLocaleDateString("es-US", { day: "numeric", month: "short", timeZone: "America/New_York" }).replace(/\\./g, ""), en: new Date(s.trial_ends_at!).toLocaleDateString("en-US", { day: "numeric", month: "short", timeZone: "America/New_York" }) }', 'dia: new Date(s.trial_ends_at!).toLocaleDateString("es-US", { day: "numeric", month: "short", timeZone: "America/New_York" }).replace(/\\./g, "")'],
  ["avisoNegUnIdioma", "ayudante avisarDueño: el respaldo «tarjeta»", 'apps/web/lib/suscripcion.ts', 'monto: money(a.monto), negocio: await nombre(s.business_id), tarjeta: t ? `${t.marca.toUpperCase()} ·· ${t.l4}` : { es: "tarjeta", en: "card" } }', 'monto: money(a.monto), negocio: await nombre(s.business_id), tarjeta: t ? `${t.marca.toUpperCase()} ·· ${t.l4}` : "tarjeta" }'],
  ["avisoNegUnIdioma", "aviso = { … }: el artículo con .es (mercado)", 'apps/web/lib/mercado.ts', 'articulo: { es: l.name.es, en: l.name.en || l.name.es }', 'articulo: l.name.es'],
  ["avisoNegUnIdioma", "ayudante avisarC: «liberado» en español", 'apps/web/lib/estimados.ts', 'libre: lib > 0 ? { es: ` · liberado ${money(lib)}`, en: ` · ${money(lib)} released` } : ""', 'libre: lib > 0 ? ` · liberado ${money(lib)}` : ""'],
  ["avisoNegUnIdioma", "ayudante avisarEquipo: «Un cliente»", 'apps/web/lib/mensajes.ts', 'cliente: yo?.nombre ?? { es: "Un cliente", en: "A customer" }', 'cliente: yo?.nombre ?? "Un cliente"'],
  // Un objeto dentro de un ternario (la llamada no abre con «{»).
  ["avisoNegUnIdioma", "objeto en un ternario (rentas): {que} en un idioma", 'apps/web/lib/rentas.ts', '{ articulo: x.n, que }, href)', '{ articulo: x.n, que: "Gracias por devolverla." }, href)'],
  ["avisoNegUnIdioma", "objeto en un ternario (acciones-colas): {motivo} con texto fijo", 'apps/web/app/admin/acciones-colas.ts', '{ motivo: m.slice(0, 160) }, { href, ref: ["media", dr.media], sinSms: true }', '{ motivo: "Sin motivo: " + m.slice(0, 160) }, { href, ref: ["media", dr.media], sinSms: true }'],
  // El par {x} + {x_en} solo vale si la plantilla en inglés lee {x_en}.
  ["avisoNegUnIdioma", "par {x}+{x_en} que la plantilla en inglés no lee", 'apps/web/lib/repartidor-admin.ts', 'que: `${q[0]}${hasta}`, que_en: `${q[1]}${hastaEn}`, motivo: m', 'texto: `${q[0]}${hasta}`, texto_en: `${q[1]}${hastaEn}`, motivo: m'],
  // Una ruta es solo lo que empieza por «/»; el nombre propio fijo es solo «To'Latino».
  ["avisoNegUnIdioma", "un texto con «/» y sin espacios ya no pasa por ruta", 'apps/web/lib/apartados.ts', '"apt_falta", { negocio: x.bname, articulo: ln.n }', '"apt_falta", { negocio: x.bname, articulo: "pan/queso" }'],
  ["avisoNegUnIdioma", "«To'Latino» fijo no excusa otras palabras", 'apps/web/lib/rentas.ts', 'cliente: "To\'Latino", que: cobrar', 'cliente: "To\'Latino decidió", que: cobrar'],
  ["avisoNegUnIdioma", "«-- pantalla» ya no excusa la consulta (es /* pantalla */)", 'apps/web/lib/citas.ts', "coalesce(nullif(o.details #>> '{svc,en}', ''), o.details #>> '{svc,es}', '') as svc_en, (o.scheduled_at", "-- pantalla\n (o.scheduled_at"],
  // porIdioma respalda en los dos sentidos; avisarMuchos resuelve cada Bi por idioma.
  ["avisoNegUnIdioma", "porIdioma solo respalda el inglés vacío", 'apps/web/lib/avisos.ts', '(es ? x.es || x.en : x.en || x.es)', '(es ? x.es : x.en || x.es)'],
  ["avisoNegUnIdioma", "avisarMuchos no resuelve los Bi del español", 'apps/web/lib/avisos.ts', 'const ves = porIdioma(v.es, true), ven = porIdioma(v.en, false);', 'const ves = v.es, ven = porIdioma(v.en, false);'],
  // (revisión de e2c1e55) La vía con SMS de avisarMuchos elige las variables del idioma de CADA persona; el archivo con su PROPIO avisar(…) se mira en todos sus argumentos;
  // href y tpl cuentan como texto en el objeto de VARIABLES (solo se saltan en las opciones y el aviso guardado); el nombre de respaldo en español no sale del SQL a un aviso.
  ["avisoNegUnIdioma", "avisarMuchos (con SMS) manda a todas las variables del español", 'apps/web/lib/avisos.ts', 'await avisar(id, tpl, en.has(id) ? ven : ves, o);', 'await avisar(id, tpl, ves, o);'],
  ["avisoNegUnIdioma", "el avisar() propio del archivo: un texto en el cuarto argumento (envios)", 'apps/web/lib/envios.ts', 'tpl, { rastreo: code })', 'tpl, { rastreo: "Código " + code })'],
  ["avisoNegUnIdioma", "una variable que se llama tpl lleva texto (rentas)", 'apps/web/lib/rentas.ts', 'cliente: "To\'Latino", que: cobrar', 'tpl: "Ver la renta", cliente: "To\'Latino", que: cobrar'],
  ["avisoNegUnIdioma", "el nombre de respaldo «Cliente» sale del SQL a un aviso (envios)", 'apps/web/lib/envios.ts', "nullif(u.first_name, '') as cliente", "coalesce(nullif(u.first_name, ''), 'Cliente') as cliente"],
  // (revisión de 4691118) La marca «/* pantalla */» no se acepta a ciegas: el lector compartido de apartados (leer) deja el nombre vacío; la marca no va en un ayudante de SQL (QUIEN) sino en la consulta que lo usa.
  ["avisoNegUnIdioma", "el lector compartido (apartados › leer) vuelve a dar el respaldo «Cliente» que llega a un aviso", 'apps/web/lib/apartados.ts', "nullif(u.first_name, '') || coalesce(' ' || left(nullif(u.last_name, ''), 1) || '.', '') as cliente, o.total_cents as tot,\n            o.details->>'dia'",
    "coalesce(nullif(u.first_name, ''), 'Cliente') || coalesce(' ' || left(nullif(u.last_name, ''), 1) || '.', '') as cliente, o.total_cents as tot,\n            o.details->>'dia'"],
  ["avisoNegUnIdioma", "el lector compartido (apartados › leer) con la marca «pantalla» puesta: su fila llega a un aviso", [['apps/web/lib/apartados.ts', "nullif(u.first_name, '') || coalesce(' ' || left(nullif(u.last_name, ''), 1) || '.', '') as cliente, o.total_cents as tot,\n            o.details->>'dia'",
    "coalesce(nullif(u.first_name, ''), 'Cliente') || coalesce(' ' || left(nullif(u.last_name, ''), 1) || '.', '') as cliente, o.total_cents as tot,\n            o.details->>'dia'"], ['apps/web/lib/apartados.ts', '`select o.id::text as op, o.user_id::text as uid', '`select /* pantalla */ o.id::text as op, o.user_id::text as uid']]],
  ["avisoNegUnIdioma", "la marca «pantalla» dentro de un ayudante de SQL (boletos-despues › QUIEN)", 'apps/web/lib/boletos-despues.ts', "const QUIEN = (u: string) => `coalesce(", "const QUIEN = (u: string) => `/* pantalla */ coalesce("],
  ["avisoNegUnIdioma", "una consulta que usa el ayudante QUIEN sin su marca (boletos-despues › boletosOrdenPanel)", 'apps/web/lib/boletos-despues.ts', '`select /* pantalla */ t.code, coalesce(tt.name', '`select t.code, coalesce(tt.name'],
  // (26 nov, LAUNCH «lo que quedaba») dineroConUsd: un «$» seguido de un decimal fijo en lo que ve una persona (pantallas, panel, avisos, correos); solo se salva con la marca «dinero fijo: …».
  ["dineroConUsd", "la pantalla Pedido de comida (lib/pedir.ts) vuelve a «$15.00»", 'apps/web/lib/pedir.ts', 'import { usd as money } from "./dinero-comun";', 'const money = (c: number) => `$${(c / 100).toFixed(2)}`;'],
  ["dineroConUsd", "un aviso del servidor (lib/cobros.ts) con toFixed(2)", 'apps/web/lib/cobros.ts', 'import { usd as money } from "./dinero-comun";', 'const money = (c: number) => `$${(c / 100).toFixed(2)}`;'],
  ["dineroConUsd", "toFixed(2).replace(/\\.00$/) a mano (lib/planes.ts)", 'apps/web/lib/planes.ts', 'import { usd as money } from "./dinero-comun";', 'const money = (c: number) => `$${(c / 100).toFixed(2).replace(/\\.00$/, "")}`;'],
  ["dineroConUsd", "«$» + toFixed(2) (Publica › money, en dólares)", 'apps/web/app/(app)/publica/logica.ts', 'export const money = (p: number | string) => usd(Math.round((Number(p) || 0) * 100));', 'export const money = (p: number | string) => { const n = Number(p) || 0; return "$" + (n % 1 ? n.toFixed(2) : n.toLocaleString("en-US")); };'],
  ["dineroConUsd", "toLocaleString con minimumFractionDigits: 2 (cuenta › pagos)", 'apps/web/app/(app)/cuenta/pagos/Pagos.tsx', 'import { usd } from "@/lib/dinero-comun";', 'const usd = (c: number) => `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;'],
  ["dineroConUsd", "un «$» suelto en JSX con toFixed(2) (Ficha › Desde)", 'apps/web/app/(app)/n/[id]/Ficha.tsx', '"From"} {usd(mn.m.desde)}</div>', '"From"} ${(mn.m.desde / 100).toFixed(2)}</div>'],
  ["dineroConUsd", "la ficha con «>$» pegado en JSX", 'apps/web/app/(app)/n/[id]/Ficha.tsx', '{usd(it.cents)}</span>', '${(it.cents / 100).toFixed(2)}</span>'],
  ["dineroConUsd", "el panel (Estimado) con su propio formateador", 'apps/web/app/panel/Estimado.tsx', 'import { usd as money } from "@/lib/dinero-comun";', 'const money = (c: number) => `$${(c / 100).toFixed(2)}`;'],
  ["dineroConUsd", "el Super Admin sin su marca «dinero fijo»", 'apps/web/app/admin/Planes.tsx', '/* dinero fijo: super admin (cifras de contabilidad del equipo, siempre con dos decimales) */', ''],
  // (revisión de 2edc372) La marca de archivo solo en apps/web/app/admin/*.tsx; en lib/ y acciones-*.ts va por línea; el literal «$0.00» y comparar contra un monto formateado.
  ["dineroConUsd", "una marca «dinero fijo» en otra línea de lib/ no exime el toFixed(2) (pedir.ts)", 'apps/web/lib/pedir.ts', 'import { usd as money } from "./dinero-comun";', '/* dinero fijo: super admin */\nconst money = (c: number) => `$${(c / 100).toFixed(2)}`;'],
  ["dineroConUsd", "una marca de archivo en acciones-*.ts no exime la línea sin su marca (acciones-tx.ts)", 'apps/web/app/admin/acciones-tx.ts', 'usd = (n: number) => `$${(n / 100).toFixed(2)}`; /* dinero fijo: super admin */', 'usd = (n: number) => `$${(n / 100).toFixed(2)}`;'],
  ["dineroConUsd", "lib/reportes.ts sin la marca de su línea", 'apps/web/lib/reportes.ts', 'minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; /* dinero fijo: super admin */', 'minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;'],
  ["dineroConUsd", "el mínimo por hora escrito «$7.25» (jobs.ts)", 'apps/web/lib/jobs.ts', 'El pago por hora va desde ${usd(PAGO_MIN)} (el mínimo', 'El pago por hora va desde $7.25 (el mínimo'],
  ["dineroConUsd", "un literal «$0.25» en una pantalla del panel (Menu)", 'apps/web/app/panel/Menu.tsx', 'REDONDEA A ${fp(25)}`', 'REDONDEA A $0.25`'],
  ["dineroConUsd", "el ejemplo de Pagar con un «$12.50» a mano (sistema/ejemplos)", 'apps/web/app/sistema/ejemplos.tsx', 'price: usd(1250)', 'price: "$12.50"'],
  ["dineroConUsd", "comparar el precio de Salud contra «$0» (el texto, no el dato)", 'apps/web/app/(app)/n/[id]/Salud.tsx', 'const pagoT = P.cubierta ?', 'const pagoT = P.l === "$0" ?'],
  ["dineroConUsd", "comparar contra «$0.00» (literal y comparación)", 'apps/web/app/(app)/n/[id]/Salud.tsx', 'const pagoT = P.cubierta ?', 'const pagoT = P.l === "$0.00" ?'],
  ["dineroConUsd", "el monto a la izquierda: «$15» === texto", 'apps/web/app/(app)/n/[id]/Salud.tsx', 'const pagoT = P.cubierta ?', 'const pagoT = "$15" === P.l ?'],
];
let bien = 0, total = 0;
const correr = (g) => {
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${g}]`)) ?? ''; return [!!l, l]; }
};
for (const [g, que, f, a, b] of casos) {
  // f puede ser una lista de [archivo, texto, cambio]: varias ediciones a la vez (la entrada nueva en pendientes + su llamada mala).
  const eds = Array.isArray(f) ? f : [[f, a, b]]; total++;
  const origs = new Map(); let falta = false;
  for (const [fx, ax] of eds) {
    const ruta = path.join(R, fx);
    if (!fs.existsSync(ruta)) { console.log(`  ✗ no existe ${fx}`); falta = true; break; }
    const o = origs.get(ruta) ?? fs.readFileSync(ruta, 'utf8'); origs.set(ruta, o);
    if (!o.includes(ax)) { console.log(`  ✗ no encontré el texto a cambiar en ${fx}: ${ax.slice(0, 70)}`); falta = true; break; }
  }
  if (falta) continue;
  let r;
  try {
    for (const [fx, ax, bx] of eds) { const ruta = path.join(R, fx); fs.writeFileSync(ruta, fs.readFileSync(ruta, 'utf8').replace(ax, () => bx)); }
    r = correr(g);
  } finally { for (const [ruta, o] of origs) fs.writeFileSync(ruta, o); }
  console.log(`  ${r[0] ? '✓' : '✗'} ${g} al revés (${que})${r[1] ? ' → ' + r[1].trim().slice(0, 170) : ''}`); if (r[0]) bien++;
}
const limpio = require('../lib/alreves-fin.cjs')(R, { mostrar: true });
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
