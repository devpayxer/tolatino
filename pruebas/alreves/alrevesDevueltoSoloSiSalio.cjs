// Prueba al revés del guardián devueltoSoloSiSalio (25 nov, 9v): un patrocinio dice «devuelto» (el panel: «Reserva cancelada. Te devolvemos $15.00 a tu
// tarjeta») solo con lo que la pasarela devolvió. Pasaba: «Cancelar reserva» del dueño devolvía lo decidido (refund_cents) aunque Stripe hubiera rechazado la
// devolución (din9v2). Ampliado (25 nov, segunda tanda): boletos y eventos (cancelar, «Devolver» del panel, «Devolución total», el evento cancelado,
// la orden) y las cuatro pantallas de reservas. Tercera tanda: cuando el NEGOCIO cancela (viaje, noche, inscripción, fiesta), aviso, panel, alerta y plantillas. Cuarta: cuando cancela quien pagó y el evento privado (0221), y la retención que no se soltó. Quinta: toda retención que se suelta (soltarRetencion) y los avisos al negocio (0222). Sexta: la cita que cancela el cliente y las pantallas del mercado, el apartado y el pedido (0223). Restos (regla 13): lo que se dice antes de actuar (hojas de la cita, «Te propone otra hora»), el cobro que no se hizo, la solicitud vencida del panel y ord_no cuando la consulta falla; y lo de la revisión: «otra hora» sin promesa de devolución, la cita confirmada con el cobro retenido, la ficha de servicios. Ampliada (13): la misma promesa antes de actuar en la noche, el viaje, la fiesta, la inscripción, el evento privado, el patrocinio, los paneles y los avisos de otra hora (0224). Revisión: los tramos eximidos ya no eximen la línea entera, cancelarEvp (lo que se queda), los mensajes no(…), el viaje tarde y la noche sin llegar. Segunda revisión: el no(…) en inglés y en varias líneas, sin la exención ph:, la nota del viaje, cancelarEvp con el cobro de la base, el Super Admin y «lo que quedaba». Se inyecta el defecto, el guardián debe fallar con SU renglón ([devueltoSoloSiSalio]); se restaura.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const G = 'devueltoSoloSiSalio';
const P = 'apps/web/lib/patrocinio.ts', E = 'apps/web/lib/patrocinio-evento.ts', BD = 'apps/web/lib/boletos-despues.ts', EC = 'apps/web/lib/evt-cambios.ts';
const NE = 'apps/web/app/(app)/noche/[num]/NocheEstado.tsx', VE = 'apps/web/app/(app)/viaje/[num]/ViajeEstado.tsx', FE = 'apps/web/app/(app)/fiesta/[num]/FiestaEstado.tsx', IE = 'apps/web/app/(app)/insc/[num]/InscEstado.tsx', EE = 'apps/web/app/(app)/privado/[num]/EstadoEvp.tsx';
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
  // 25 nov (tercera tanda) · El NEGOCIO cancela (viaje, noche, inscripción, fiesta): lo que pasó, y el «no» alerta al equipo.
  // La noche vuelve a devolver con devolverPago por el negocio, tirando el resultado (y el aviso dice «hecha» sin mirar).
  ['noche devuelve tirando el resultado', 'apps/web/lib/noche-reservas.ts', 'const d = await devolverAlCancelar(o, { actorId, motivo: "El local canceló", idem: `nbx-${numero}` });', 'await devolverPago({ paymentId: o.pid!, centavos: o.amount!, por: "business", actorId, motivo: "El local canceló", idem: `nbx-${numero}` }); const d = { e: "hecha" as const, monto: o.amount! };'],
  // El aviso de la salida cancelada sin {dinero}.
  ['viaje cancelado sin {dinero}', 'apps/web/lib/viajes.ts', 'await avisarCliente(o.num, "viaje_cancelada", { motivo: mot, dinero: dineroAlCancelar(d) });', 'await avisarCliente(o.num, "viaje_cancelada", { motivo: mot });'],
  // La inscripción avisa sin lo que pasó.
  ['inscripción sin {dinero}', 'apps/web/lib/inscripciones.ts', 'await avisarCliente(o.num, tpl, { motivo: mot, dinero: dineroAlCancelar(d) });', 'await avisarCliente(o.num, tpl, { motivo: mot });'],
  // La devolución del negocio deja de alertar: sin nadieMira.
  ['cancelación sin nadieMira', 'apps/web/lib/cobros.ts', 'idem: x.idem, nadieMira: true });', 'idem: x.idem });'],
  // ejecutarDevolucionPago vuelve a alertar solo por política o barrido.
  ['el «no» sin alerta', 'apps/web/lib/cobros.ts', 'o.barrido || o.nadieMira || r.por === "policy" ? "stuck" : null', 'o.barrido || r.por === "policy" ? "stuck" : null'],
  // La que va en camino se da por hecha.
  ['en camino como hecha', 'apps/web/lib/cobros.ts', 'if (f?.st === "pending") return { e: "en_camino"', 'if (f?.st === "pending") return { e: "hecha"'],
  // La que ni siquiera se anotó no alerta a nadie.
  ['sin anotar y sin alerta', 'apps/web/lib/cobros.ts', '  if (!f) {\n    const p = (await db()', '  if (false) {\n    const p = (await db()'],
  // El texto «Te devolvimos» para la que va en camino.
  ['en camino dice te devolvimos', 'apps/web/lib/devolucion-cancelar.ts', 'if (d.e === "en_camino") return { es: `La devolución de ${usd(d.monto)} a tu tarjeta va en camino', 'if (d.e === "en_camino") return { es: `Te devolvimos ${usd(d.monto)} a tu tarjeta'],
  // La plantilla de la salida vuelve a «Te devolvemos todo».
  ['plantilla del viaje sin {dinero}', 'packages/db/migrations/0220_avisos_cancelacion_negocio_lo_que_paso.sql', '{motivo}. {dinero}","en":"{negocio} cancelled the {dia} {hora} departure: {motivo}. {dinero}', '{motivo}. Te devolvemos todo.","en":"{negocio} cancelled the {dia} {hora} departure: {motivo}. You get everything back.'],
  // El título vuelve a dar la devolución por hecha.
  ['título te devolvieron', 'packages/db/migrations/0220_avisos_cancelacion_negocio_lo_que_paso.sql', '\'{"es":"Tus boletos: la devolución","en":"Your tickets: the refund"}\'', '\'{"es":"Te devolvieron tus boletos","en":"Your tickets were refunded"}\''],
  // El panel vuelve a «todos reciben su dinero».
  ['panel todos reciben su dinero', 'apps/web/app/panel/ViajesPanel.tsx', '(r: { devolucion?: DevCuenta }) => { const t = textoPanelCancelar(r?.devolucion); return `${E2("Salida cancelada.", "Departure cancelled.")} ${E2(t.es, t.en)}`; }', 'E2("Salida cancelada: todos reciben su dinero.", "Departure cancelled: everyone gets their money back.")'],
  // La acción de la noche deja de pasar lo que pasó.
  ['acción de la noche sin devolucion', 'apps/web/app/panel/acciones-noche.ts', 'return rDev(await cancelarNocheNegocio(', 'return r2(await cancelarNocheNegocio('],
  // «Probar en mi teléfono» sin {dinero}.
  ['muestra sin dinero', 'apps/web/lib/admin-notif.ts', '  dinero: { es: "Te devolvimos $45.00', '  dineroX: { es: "Te devolvimos $45.00'],
  // 25 nov (cuarta tanda) · Cancela QUIEN PAGÓ (viaje, noche, fiesta, inscripción, evento privado) y el restaurante cancela un evento privado.
  // El viaje vuelve a llenar {dev} con lo decidido.
  ['viaje_cx con lo decidido', 'apps/web/lib/viajes.ts', 'await avisarCliente(numero, "viaje_cx", { dinero: dineroAlCancelarCliente(d, ', 'await avisarCliente(numero, "viaje_cx", { dev: " Te devolvemos todo.", x: dineroAlCancelarCliente(d, '],
  // La noche vuelve a devolver con devolverPago tirando el resultado.
  ['noche del cliente con devolverPago', 'apps/web/lib/noche-reservas.ts', 'const d = pierde ? null : await devolverAlCancelar(o, { actorId: userId, motivo: "Cancelación antes del corte", idem: `ncx-${numero}`, por: "policy" });', 'if (!pierde) await devolverPago({ paymentId: o.pid!, centavos: o.amount!, por: "policy", actorId: userId, motivo: "Cancelación antes del corte", idem: `ncx-${numero}` }); const d = null;'],
  // El restaurante cancela el evento privado y el aviso vuelve a «Te devolvemos el depósito completo».
  ['evento privado del restaurante sin {dinero}', 'apps/web/lib/evento-privado.ts', '"evp_cancelado_negocio", { motivo: mot, dinero: dineroAlCancelar(d) }', '"evp_cancelado_negocio", { motivo: mot }'],
  // La plantilla de la fiesta vuelve a {dev}.
  ['plantilla de la fiesta con {dev}', 'packages/db/migrations/0221_avisos_cancelacion_cliente_lo_que_paso.sql', '{"es":"Cancelaste tu fecha del {dia} con {negocio}. {dinero}","en":"You cancelled your date on {dia} with {negocio}. {dinero}"}', '{"es":"Cancelaste tu fecha del {dia} con {negocio}.{dev}","en":"You cancelled your date on {dia} with {negocio}.{dev}"}'],
  // liberarOperacion da por soltada una retención que la pasarela no soltó.
  ['retención no soltada como soltada', 'apps/web/lib/cobros.ts', '  if (!r.ok) return "fallo";', '  if (!r.ok) return "liberada";'],
  // devolverAlCancelar no mira lo que dijo liberarOperacion.
  ['cancelar no mira la retención', 'apps/web/lib/cobros.ts', '    return s.e === "retenida" ? { e: "retenida", monto: s.monto } : { e: "liberada"', '    return false ? { e: "retenida", monto: s.monto } : { e: "liberada"'],
  // La retención que no se soltó no alerta a nadie.
  ['retención sin alerta', 'apps/web/lib/cobros.ts', '  await (await import("./dinero-alertas")).alertar("hold_stuck", `liberar:', '  if (false) await (await import("./dinero-alertas")).alertar("hold_stuck", `liberar:'],
  // El panel cuenta la retención soltada como devolución hecha («Le devolvimos todo»).
  ['soltada cuenta como hecha', 'apps/web/lib/devolucion-cancelar.ts', 'hechas: c.hechas + (d.e === "hecha" ? 1 : 0)', 'hechas: c.hechas + (d.e === "hecha" || d.e === "liberada" ? 1 : 0)'],
  // El panel del evento privado vuelve a «el cliente recibe su depósito completo».
  ['panel del evento privado promete', 'apps/web/app/panel/EventoPrivado.tsx', '(r: { devolucion?: DevCuenta }) => { const t = textoPanelCancelar(r?.devolucion); return `${E2("Cancelado.", "Cancelled.")} ${E2(t.es, t.en)}`; }', 'E2("Cancelado: el cliente recibe su depósito completo.", "Cancelled: the client gets the full deposit back.")'],
  // La acción del evento privado deja de pasar lo que pasó.
  ['acción del evento privado sin devolucion', 'apps/web/app/panel/acciones-evento-privado.ts', 'return rDev(await cancelarEvpNegocio(', 'return r2(await cancelarEvpNegocio('],
  // La pantalla del evento privado calla la fallida.
  ['evento privado calla la fallida', 'apps/web/app/(app)/privado/[num]/EstadoEvp.tsx', '    : x.devolucion.fallida ? [E2(', '    : false ? [E2('],
  // La vista del evento privado deja de leer lo que no está hecho.
  ['evento privado sin devolucionesDe', 'apps/web/lib/evento-privado.ts', 'devolucion: o.status === "cancelled" ? await devolucionesDe(o.id) : { camino: 0, fallida: 0 },', 'devolucion: { camino: 0, fallida: 0 },'],
  // 25 nov (quinta tanda) · Lo retenido que se suelta sin cancelación y los avisos al negocio cuando cancela quien pagó (0222).
  // soltarRetencion deja de mirar lo que dijo liberarOperacion.
  ['soltar no mira la pasarela', 'apps/web/lib/cobros.ts', '  if (l !== "fallo") return { e: l, monto: 0 };', '  if (l || true) return { e: "liberada", monto: 0 };'],
  // «No hay mesa» vuelve a tirar lo que dijo la pasarela.
  ['no hay mesa tira el resultado', 'apps/web/lib/noche-reservas.ts', 'const s = await soltarRetencion(o.id, { es: "No hay mesa (el local)", en: "No table (the venue)" }); retenida = s.e === "retenida";', 'await soltarRetencion(o.id, { es: "No hay mesa (el local)", en: "No table (the venue)" }); const s = { e: "liberada" as const, monto: 0 };'],
  // Un pedido vencido vuelve a liberarOperacion directo (sin alerta si no se suelta).
  ['pedido vencido con liberarOperacion', 'apps/web/lib/pedidos.ts', '(await soltarRetencion(id, { es: "El pedido venció sin que lo aceptaran", en: "The order expired without being accepted" })).e === "retenida"', '(await liberarOperacion(id)) === "fallo"'],
  // El barrido de pagos vuelve a soltar tirando el resultado.
  ['barrido tira el resultado', 'apps/web/lib/cobros.ts', '    else if ((await soltarRetencion(x.op, SWEEP)).e === "retenida") return;', '    else await liberarOperacion(x.op);'],
  // El mercado suelta con .then y tira lo que pasó.
  ['mercado con then', 'apps/web/lib/mercado.ts', '  const s = await soltarRetencion(o.id, { es: "Canceló el pedido del mercado (el cliente)", en: "Market order cancelled (the client)" });', '  soltarRetencion(o.id, { es: "x", en: "x" }).then(() => undefined); const s = { e: "liberada" as const, monto: 0 };'],
  // La fiesta vencida vuelve a decir «Se liberó tu depósito» sin mirar.
  ['fiesta dice se liberó sin mirar', 'apps/web/lib/fiestas-reservas.ts', 'dev: v.dep ? soltadaO(s, { es: ` Se liberó tu depósito de ${money(v.dep)}.`, en: ` Your ${money(v.dep)} deposit was released.` }) : ""', 'dev: v.dep ? ` Se liberó tu depósito de ${money(v.dep)}.` : ""'],
  // La plantilla del viaje sin cupo vuelve a «Liberamos lo retenido».
  ['plantilla viaje_no sin {dinero}', 'packages/db/migrations/0222_avisos_retencion_y_negocio_lo_que_paso.sql', '{"es":"{negocio} no tiene cupo para el {dia} a las {hora}.{dinero}","en":"{negocio} has no room on {dia} at {hora}.{dinero}"}', '{"es":"{negocio} no tiene cupo para el {dia} a las {hora}. Liberamos lo retenido.","en":"{negocio} has no room on {dia} at {hora}. We released the hold."}'],
  // Al negocio de la noche otra vez «Se le devuelve el depósito» con lo decidido.
  ['biz_noche_cx con lo decidido', 'apps/web/lib/noche-reservas.ts', 'if (!lista) await avisarNeg(numero, "biz_noche_cx", { dinero: pierde ?', 'if (!lista) await avisarNeg(numero, "biz_noche_cx", { dep: o.dep ? ` Se le devuelve el depósito de ${usdN(o.dep)}.` : "", x: pierde ?'],
  // Lo que se queda la fiesta vuelve a ser el depósito entero.
  ['fiesta se queda el depósito entero', 'apps/web/lib/fiestas-reservas.ts', '      const queda = Math.max(0, (o.amount ?? o.dep) - (o.refunded ?? 0));', '      const queda = o.dep;'],
  // El panel de la noche vuelve a «se liberó su depósito» sin mirar.
  ['panel noche sin retenida', 'apps/web/app/panel/NocheReservas.tsx', '(r) => (r?.retenida ? E2(', '(r) => (false ? E2('],
  // La acción del mercado deja de pasar retenida.
  ['acción mercado sin retenida', 'apps/web/app/panel/acciones-mercado.ts', '(r.ok ? (r.retenida ? { ok: true, retenida: true } : { ok: true }) :', '(r.ok ? { ok: true } :'],
  // «No me sirve» de la fiesta vuelve a «se liberó tu depósito» sin mirar.
  ['fiesta no me sirve sin retenida', 'apps/web/app/(app)/fiesta/[num]/FiestaEstado.tsx', 'setFlash("retenida" in r && r.retenida ? E2(', 'setFlash(false ? E2('],
  // La alerta vuelve a llamarse solo «retención renovada».
  ['etiqueta hold_stuck renovada', 'apps/web/lib/dinero-alertas.ts', 'hold_stuck: { es: "una retención atascada (no se soltó o no se renovó)", en: "a stuck hold (not released or not renewed)" },', 'hold_stuck: { es: "una retención renovada sin respuesta", en: "a renewed hold with no answer" },'],
  // 25 nov (sexta tanda) · La cita que cancela el cliente, y las pantallas del mercado, del apartado y del pedido que no se dio (0223).
  // La cita vuelve a devolver con devolverPago tirando el resultado.
  ['cita cancela con devolverPago', 'apps/web/lib/citas-flujo.ts', '? await devolverAlCancelar(o, { actorId: userId, motivo: o.pay === "held"', '? await devolverPago({ paymentId: o.pid!, centavos: o.amount!, por: "policy", actorId: userId, motivo: "x", idem: `cx-${numero}` }).then(() => null) ?? await devolverAlCancelar(o, { actorId: userId, motivo: o.pay === "held"'],
  // Cancelar la cita deja de decir que la retención no se soltó.
  ['cita sin retenida', 'apps/web/lib/citas-flujo.ts', 'retenida = d?.e === "retenida";', 'retenida = false;'],
  // Al negocio, otra vez el depósito entero aunque ya hubo una devolución parcial.
  ['cita se queda el depósito entero', 'apps/web/lib/citas-flujo.ts', 'const queda = Math.max(0, (o.amount ?? o.dep) - (o.refunded ?? 0));', 'const queda = o.dep;'],
  // biz_cita_cx vuelve a {dep} con lo decidido.
  ['biz_cita_cx sin {dinero}', 'apps/web/lib/citas-flujo.ts', 'await avisarNeg(numero, "biz_cita_cx", { dinero: pierde ?', 'await avisarNeg(numero, "biz_cita_cx", { dep: pierde ?'],
  // Las plantillas de 0223 vuelven a lo de antes.
  ['plantilla biz_cita_cx con {dep}', 'packages/db/migrations/0223_avisos_cita_y_pedido_lo_que_paso.sql', '{hora}.{dinero}","en":"{cliente} cancelled {servicio} on {dia} at {hora}.{dinero}"', '{hora}.{dep}","en":"{cliente} cancelled {servicio} on {dia} at {hora}.{dep}"'],
  ['plantilla ord_no fija', 'packages/db/migrations/0223_avisos_cita_y_pedido_lo_que_paso.sql', '\'{"es":"{negocio} no pudo aceptar tu pedido #{num}.{dinero}","en":"{negocio} could not accept your order #{num}.{dinero}"}\'', '\'{"es":"{negocio} no pudo aceptar tu pedido #{num}. No se te cobró nada.","en":"{negocio} could not accept your order #{num}. You were not charged."}\''],
  // La pantalla de la cita vuelve a «Te devolvemos» sin mirar.
  ['cita dice te devolvemos', 'apps/web/app/(app)/cita/[num]/Estado.tsx', '  const dev = !c.dep || !c.pago ? E2("No se cobró nada.", "Nothing was charged.")', '  const dev = c.dep ? E2(`Te devolvemos los ${dinero(c.dep)} del depósito.`, "") : E2("No se cobró nada.", "Nothing was charged.");\n  const dev0 = !c.dep || !c.pago ? E2("No se cobró nada.", "Nothing was charged.")'],
  // La devolución que no salió vuelve a contarse como «Se queda con …».
  ['cita la fallida como se queda', 'apps/web/app/(app)/cita/[num]/Estado.tsx', '    else if (c.perdio) plata.push(', '    else if (c.perdio || c.pago === "captured") plata.push('],
  // La pantalla de la cita calla la retención que no se soltó.
  ['cita pantalla sin retenida', 'apps/web/app/(app)/cita/[num]/Estado.tsx', 'aviso("retenida" in r && r.retenida ? E2(', 'aviso(false ? E2('],
  ['cita acción sin retenida', 'apps/web/app/(app)/cita/[num]/acciones.ts', 'return r.ok ? (r.retenida ? { ok: true, retenida: true } : { ok: true }) : { ok: false, msg: r.msg };', 'return r.ok ? { ok: true } : { ok: false, msg: r.msg };'],
  // La vista de la cita deja de leer lo que no está hecho.
  ['cita sin devolucionesDe', 'apps/web/lib/citas.ts', 'devolucion: r.pago ? await devolucionesDe(r.oid) : { camino: 0, fallida: 0 },', 'devolucion: { camino: 0, fallida: 0 },'],
  // El apartado vuelve a «Se liberó» fijo, o soltado deja de mirar el cobro.
  ['apartado se liberó fijo', 'apps/web/app/(app)/apartado/[num]/ApartadoEstado.tsx', 'soltado(E2("Se liberó el abono retenido. No se cobró nada.", "The held down payment was released. Nothing was charged."))', 'E2("Se liberó el abono retenido. No se cobró nada.", "The held down payment was released. Nothing was charged.")'],
  // El mismo, con soltado("") delante en la línea (antes bastaba un soltado( cualquiera en la línea).
  ['apartado se liberó junto a otro soltado', 'apps/web/app/(app)/apartado/[num]/ApartadoEstado.tsx', 'soltado(E2("Se liberó lo retenido. No se cobró nada.", "The hold was released. Nothing was charged."))', 'soltado("") + E2("Se liberó lo retenido. No se cobró nada.", "The hold was released. Nothing was charged.")'],
  ['apartado soltado sin mirar', 'apps/web/app/(app)/apartado/[num]/ApartadoEstado.tsx', 'const soltado = (siSalio: string) => pg?.st === "released" ? siSalio', 'const soltado = (siSalio: string) => true ? siSalio'],
  ['apartado acción sin retenida', 'apps/web/app/(app)/apartado/[num]/acciones.ts', 'return r.ok ? (r.retenida ? { ok: true, retenida: true } : { ok: true }) : { ok: false, msg: r.msg };', 'return r.ok ? { ok: true } : { ok: false, msg: r.msg };'],
  ['apartado pantalla sin retenida', 'apps/web/app/(app)/apartado/[num]/ApartadoEstado.tsx', 'setFlash("retenida" in r && r.retenida ? E2(', 'setFlash(false ? E2('],
  // El mercado vuelve a «No se cobró nada» fijo, o deja de mirar lo retenido.
  ['mercado no aceptaron fijo', 'apps/web/app/(app)/mercado/[num]/MercadoEstado.tsx', 'E2("El mercado no puede hoy", "The market cannot today"), noSeDio]', 'E2("El mercado no puede hoy", "The market cannot today"), E2("No se cobró nada.", "Nothing was charged.")]'],
  ['mercado sin lo retenido', 'apps/web/app/(app)/mercado/[num]/MercadoEstado.tsx', ': t.retenido > 0 ? E2(`No se cobró nada, pero la retención', ': false ? E2(`No se cobró nada, pero la retención'],
  // El pedido que no se dio vuelve a «No se cobró nada» fijo; ord_no sin {dinero}; el panel y su acción sin retenida.
  ['pedido no se cobró fijo', 'apps/web/app/(app)/pedido/[num]/Pedido.tsx', 'const sinCobro = p.pago?.estado === "held" ?', 'const sinCobro = false ?'],
  ['ord_no sin {dinero}', 'apps/web/lib/avisos.ts', 'hora: o.hora, dinero }', 'hora: o.hora }'],
  ['panel pedidos sin retenida', 'apps/web/app/panel/Pedidos.tsx', '(r) => (r?.retenida ? E2(', '(r) => (false ? E2('],
  ['acción pedidos sin retenida', 'apps/web/app/panel/acciones-pedidos.ts', 'const r2 = (r.retenida ? { ok: true, retenida: true } : { ok: true })', 'const r2 = ({ ok: true })'],
  // 25 nov (restos de la clase) · Lo que se dice ANTES de actuar y cuando no se pudo mirar (regla 13).
  // La hoja de cancelar la solicitud vuelve a prometer «Te devolvemos los $X».
  ['cita hoja promete te devolvemos', 'apps/web/app/(app)/cita/[num]/Estado.tsx', '${E2("Es gratis. ", "It is free. ")}${pideCx}`\n    : aTiempo', '${E2("Es gratis. ", "It is free. ")}${c.dep ? E2(`Te devolvemos los ${dinero(c.dep)} del depósito.`, "") : ""}`\n    : aTiempo'],
  // «Te propone otra hora» vuelve a «Si no te sirve, te devolvemos los $X».
  ['cita otra hora promete', 'apps/web/app/(app)/cita/[num]/Estado.tsx', '${pideAlt || E2("Decide abajo.", "Decide below.")}', '${c.dep ? E2(`Si no te sirve, te devolvemos los ${dinero(c.dep)}.`, "") : E2("Decide abajo.", "Decide below.")}'],
  // La hoja dice lo de la retención sin mirar el cobro.
  ['cita hoja sin mirar el cobro', 'apps/web/app/(app)/cita/[num]/Estado.tsx', 'const pideCx = !c.dep ? "" : c.pago === "held" ? E2(`Pedimos que se suelte', 'const pideCx = !c.dep ? "" : true ? E2(`Pedimos que se suelte'],
  // Un cobro que no se hizo vuelve a «sigue cobrado» (sin su texto en dev, o sin su fila).
  ['cita failed sin texto', 'apps/web/app/(app)/cita/[num]/Estado.tsx', '        : c.pago === "failed" ? E2(`El cobro del depósito de ${dinero(c.cobro)} no se hizo: no se te cobró nada.`, `The ${dinero(c.cobro)} deposit charge did not go through: you were not charged.`)\n', ''],
  ['cita failed sin fila', 'apps/web/app/(app)/cita/[num]/Estado.tsx', '    if (c.pago === "failed") plata.push(', '    if (false) plata.push('],
  // El panel de citas vuelve a «la solicitud venció y se devolvió el depósito» fijo, o vencidaPanel deja de mirar la retención.
  ['panel cita vencida fija', 'apps/web/lib/citas-flujo.ts', '{ ok: false, msg: vencidaPanel(o) }', 'no("Pasó el tiempo para responder: la solicitud venció y se devolvió el depósito.", "The time to reply passed: the request expired and the deposit was returned.")'],
  ['panel cita vencida sin la retención', 'apps/web/lib/citas-flujo.ts', 'if (o.pay === "held") return { es: `${base.es} No se había', 'if (false) return { es: `${base.es} No se había'],
  // vencidaPanel vuelve a afirmar «el equipo ya tiene el aviso» sin leer la alerta.
  ['panel cita vencida afirma el aviso', 'apps/web/lib/citas-flujo.ts', 'se sigue soltando sola.`, en:', "se sigue soltando sola y el equipo de To'Latino ya tiene el aviso.`, en:"],
  // ord_no vuelve a caer en «No se te cobró nada» si la consulta falla.
  ['ord_no consulta fallida como vacía', 'apps/web/lib/avisos.ts', '.then((r) => r.rows, () => null)', '.then((r) => r.rows, () => [])'],
  // ord_no lee un cobro cualquiera (el primero), no el retenido.
  ['ord_no cobro cualquiera', 'apps/web/lib/avisos.ts', "order by (p.status = 'held') desc, p.id desc limit 1", 'order by p.id limit 1'],
  // Revisión (25 nov) · «Otra hora» vuelve a prometer la devolución con el depósito cobrado, o deja de mirar c.pago.
  ['otra hora promete la devolución', 'apps/web/app/(app)/cita/[num]/Estado.tsx', 'we ask for the ${dinero(c.cobro)} hold to come off your card.`) : "";', 'we ask for the ${dinero(c.cobro)} hold to come off your card.`) : cobrado ? E2(`Si no te sirve, pedimos la devolución de ${dinero(queda)} a tu tarjeta.`, "") : "";'],
  ['otra hora sin mirar el cobro', 'apps/web/app/(app)/cita/[num]/Estado.tsx', 'const pideAlt = !c.dep ? "" : c.pago === "held" ?', 'const pideAlt = !c.dep ? "" : true ?'],
  // La hoja de cancelar tarde vuelve a decir el depósito entero sin mirar el cobro.
  ['hoja tarde con c.dep', 'apps/web/app/(app)/cita/[num]/Estado.tsx', '${c.dep && cobrado && queda > 0 ? (queda === c.cobro ? E2(`El depósito de ${dinero(queda)} se queda con ${who1}.`', '${c.dep ? (true ? E2(`El depósito de ${dinero(c.dep)} se queda con ${who1}.`'],
  // Confirmada con la captura que no salió: «Depósito pagado» sin mirar, o sin su fila de retenido.
  ['pagado sin cobrado', 'apps/web/app/(app)/cita/[num]/Estado.tsx', '      if (cobrado) plata.push(["check", E2("Depósito pagado"', '      if (c.pago !== "failed") plata.push(["check", E2("Depósito pagado"'],
  ['confirmada retenida sin fila', 'apps/web/app/(app)/cita/[num]/Estado.tsx', '`${tarjeta}${E2(" · todavía no se cobró", " · not charged yet")}`', '`${tarjeta}${E2(" · se cobra al confirmar", " · charged on confirmation")}`'],
  ['se descontó sin cobrado', 'apps/web/app/(app)/cita/[num]/Estado.tsx', '${c.dep && cobrado ? E2(` El depósito de ${dinero(c.dep)} se descontó del total.`', '${c.dep && c.pago !== "failed" ? E2(` El depósito de ${dinero(c.dep)} se descontó del total.`'],
  ['no había nadie con el depósito entero', 'apps/web/app/(app)/cita/[num]/Estado.tsx', '${c.dep && cobrado && queda > 0 ? E2(`El depósito de ${dinero(queda)} se queda con el negocio.`', '${c.dep && c.pago !== "failed" ? E2(`El depósito de ${dinero(c.dep)} se queda con el negocio.`'],
  ['cobrado mientras espera sin mirar', 'apps/web/app/(app)/cita/[num]/Estado.tsx', '      else if (cobrado) plata.push(["card", E2("Depósito cobrado"', '      else plata.push(["card", E2("Depósito cobrado"'],
  // Con «otra hora», lo retenido vuelve a «se cobra solo si confirman».
  ['otra hora se cobra si confirman', 'apps/web/app/(app)/cita/[num]/Estado.tsx', '${alt ? E2(" · se cobra solo si aceptas la otra hora", " · charged only if you accept the new time") : E2(" · se cobra solo si confirman", " · charged only if they confirm")}', '${E2(" · se cobra solo si confirman", " · charged only if they confirm")}'],
  // La ficha de servicios vuelve a «se cobra al enviar… te lo devolvemos».
  ['ficha te lo devolvemos', 'apps/web/app/(app)/n/[id]/Servicios.tsx', ': E2(`Depósito de ${dinero(persona.dep)}: se retiene al enviar, se cobra cuando', ': E2(`Depósito de ${dinero(persona.dep)}: se cobra al enviar. Si no se confirma, te lo devolvemos. Se cobra cuando'],
  ['ord_no sin lo neutro', 'apps/web/lib/avisos.ts', 'dinero = !q ? neutro :', 'dinero = !q ? { es: " No se te cobró nada.", en: " You were not charged." } :'],
  // (13, ampliada 25 nov) · La misma promesa antes de actuar en la noche, el viaje, la fiesta, la inscripción, el evento privado, el patrocinio y los paneles.
  ['noche: la hoja vuelve a «te devolvemos»', NE, '${E2(`Antes de las ${corte} de esa noche: es gratis.`, `Before ${corte} that night: it is free.`)} ${pideCx || sinCargo}', 'E2(`Antes de las ${corte} de esa noche: te devolvemos ${usdN(dep)}.`, `Before ${corte} that night: we refund ${usdN(dep)}.`)'],
  ['noche: «Si no confirman, te devolvemos el depósito»', NE, '${E2(`Confirman en menos de ${espL(x.resp, true)}.`, `They confirm within ${espL(x.resp, false)}.`)}${nm(pideSoltarSi("confirman", x.pago, usdN))}', '${E2(`Confirman en menos de ${espL(x.resp, true)}. Si no confirman, te devolvemos el depósito.`, `They confirm within ${espL(x.resp, false)}. If they do not, your deposit comes back.`)}'],
  ['noche: tarde con el depósito entero sin mirar el cobro', NE, ': cobrado && queda > 0 ? (queda === dep ? E2(`Ya pasaron las ${corte}: el depósito de ${usdN(queda)} se queda con el local.`', ': dep > 0 ? (true ? E2(`Ya pasaron las ${corte}: el depósito de ${usdN(dep)} se queda con el local.`'],
  ['noche: «No me sirve» dice «se liberó» sin retención', NE, 'hacer("nogracias", retenido ? E2(', 'hacer("nogracias", true ? E2('],
  ['viaje: la hoja tarde sin mirar el cobro', VE, '(retenido || cobrado) && mitad > 0 ?', 'mitad > 0 ?'],
  ['viaje: «te devolvemos el resto»', VE, 'E2(` Pedimos la devolución del resto (${dinero(resto)}) a tu tarjeta; aquí ves cuando salga.`', 'E2(` Te devolvemos el resto (${dinero(resto)}).`'],
  ['viaje: otra salida «se libera lo retenido» sin mirar', VE, 'retenido ? nm(pideSoltarSi("sirve", x.pago, dinero)).trim() :', 'true ? E2("Si no te sirve, se libera lo retenido.", "If it does not work, the hold is released.") :'],
  ['fiesta: la hoja vuelve a «te devolvemos»', FE, '${E2(`Faltan ${x.diasFaltan} días (${x.cancelDias} o más): es gratis.`, `${x.diasFaltan} days left (${x.cancelDias} or more): it is free.`)} ${pideCx || sinCargo}', 'E2(`Faltan ${x.diasFaltan} días (${x.cancelDias} o más): te devolvemos ${dinero(dep)}.`, `${x.diasFaltan} days left (${x.cancelDias} or more): we refund ${dinero(dep)}.`)'],
  ['fiesta: otra hora «se libera tu depósito»', FE, '`${E2("La fecha está libre, pero a otra hora.", "The date is free, but at another time.")}${nm(pideSoltarSi("sirve", x.pago, dinero))}`', 'E2("La fecha está libre, pero a otra hora. Si no te sirve, se libera tu depósito.", "The date is free, but at another time. If it does not work, your deposit is released.")'],
  ['inscripción: «te devolvemos» antes de empezar', IE, '!empezo ? `${E2("Todavía no empieza: es gratis.", "It has not started yet: it is free.")} ${pideCx || sinCargo}`', '!empezo ? E2(`Todavía no empieza: te devolvemos ${usdI(x.mat)}.`, `It has not started yet: we refund ${usdI(x.mat)}.`)'],
  ['evento privado: la hoja vuelve a «te devolvemos»', EE, '${E2(`Faltan más de ${x.cancelH} h: es gratis.`, `More than ${x.cancelH} h left: it is free.`)} ${pideCx || sinCargo}', 'E2(`Faltan más de ${x.cancelH} h: te devolvemos ${dinero(x.pago.monto - x.pago.devuelto)} en 3–5 días hábiles.`, `More than ${x.cancelH} h left: we refund ${dinero(x.pago.monto - x.pago.devuelto)} in 3–5 business days.`)'],
  ['evento privado: tarde con el depósito entero sin mirar', EE, ': cobrado && queda > 0 ? (queda === x.pago.monto ? E2(`Faltan menos de ${x.cancelH} h: el depósito de ${dinero(queda)} se queda con ${B}.`', ': x.pago.monto > 0 ? (true ? E2(`Faltan menos de ${x.cancelH} h: el depósito de ${dinero(x.pago.monto)} se queda con ${B}.`'],
  ['evento privado: «Depósito cobrado» con la captura sin salir', EE, 'if (st === "confirmed" && ac) nota = cobrado ? [', 'if (st === "confirmed" && ac) nota = x.pago.st !== "failed" ? ['],
  ['evento privado: la propuesta «te devolvemos el depósito»', EE, '(pedimos la devolución del depósito a tu tarjeta)', '(te devolvemos el depósito en 3–5 días hábiles)'],
  ['patrocinio: «te devolvemos los $X completos»', 'apps/web/app/panel/Patrocinio.tsx', 'pedimos la devolución de los ${$(v.precio)} completos a tu tarjeta; aquí ves cuando salga.', 'te devolvemos los ${$(v.precio)} completos a tu tarjeta.'],
  ['patrocinio de evento: «te devolvemos los días»', 'apps/web/app/panel/PatrocinioEvento.tsx', 'y pedimos la devolución de los días que no se usaron a tu tarjeta', 'y te devolvemos los días que no se usaron'],
  ['panel de citas: «vence y se devuelve el depósito»', 'apps/web/app/panel/Citas.tsx', 'x.dep && x.pago === "held" ? " y pedimos que se suelte la retención del depósito de su tarjeta"', 'x.dep ? " y se devuelve el depósito"'],
  ['panel de citas: «pedimos que se suelte» sin retención', 'apps/web/app/panel/Citas.tsx', 'x.dep && x.pago === "held" ? " y pedimos que se suelte', 'x.dep ? " y pedimos que se suelte'],
  ['panel de la noche: «pedimos que se suelte» sin retención', 'apps/web/app/panel/NocheReservas.tsx', '(x.dep && x.pay === "held" ? E2(`Responde en ${x.resp} min. Si no, vence y pedimos', '(x.dep ? E2(`Responde en ${x.resp} min. Si no, vence y pedimos'],
  ['panel de la fiesta: «se le libera el depósito»', 'apps/web/app/panel/FiestasReservas.tsx', 'E2(`Responde en ${h} h. Si no, vence y pedimos que se suelte la retención del depósito de su tarjeta.`', 'E2(`Responde en ${h} h. Si no, vence y se le libera el depósito.`'],
  ['panel del viaje: «se libera su dinero»', 'apps/web/app/panel/ViajesPanel.tsx', 'Si no le sirve o no contesta, pedimos que se suelte la retención de su tarjeta.`', 'Si no le sirve o no contesta, se libera su dinero.`'],
  ['panel del evento privado: sin mirar la retención', 'apps/web/app/panel/EventoPrivado.tsx', ': x.pago.st === "held" ? E2("No se había cobrado nada; la retención', ': false ? E2("No se había cobrado nada; la retención'],
  ['panel del evento privado: «se le devolvió el depósito completo» fijo', 'apps/web/app/panel/EventoPrivado.tsx', '${E2(`Cancelaste: «${x.motivoNeg}».`, `You cancelled: “${x.motivoNeg}”.`)}${depCx ? ` ${depCx}` : ""}', '${E2(`Cancelaste: «${x.motivoNeg}». Se le devolvió el depósito completo.`, `You cancelled: “${x.motivoNeg}”. The full deposit was refunded.`)}'],
  ['evpPanel sin devolucionesDe', 'apps/web/lib/evento-privado.ts', '    cfg: { propuestaH: cfg.evp_propuesta_h, cancelarH: cfg.evp_cancelar_h },\n    devolucion: o.status === "cancelled" ? await devolucionesDe(o.id) : { camino: 0, fallida: 0 },', '    cfg: { propuestaH: cfg.evp_propuesta_h, cancelarH: cfg.evp_cancelar_h },\n    devolucion: { camino: 0, fallida: 0 },'],
  ['pideAlCancelar: lo que queda sin mirar que esté cobrado', 'apps/web/lib/devolucion-cancelar.ts', 'export const quedaVisto = (p: PagoVisto) => (cobradoVisto(p) ? Math.max(0, p.monto - p.devuelto) : 0);', 'export const quedaVisto = (p: PagoVisto) => Math.max(0, p.monto - p.devuelto);'],
  ['pideSoltarSi: promete soltar sin retención', 'apps/web/lib/devolucion-cancelar.ts', 'if (p.st !== "held" || !(p.monto > 0)) return { es: "", en: "" };', 'if (!(p.monto > 0)) return { es: "", en: "" };'],
  ['aviso noche_alt sin {dinero}', 'apps/web/lib/noche-reservas.ts', '{ alt: hNoche(m), dinero: pideSoltarSi("sirve", { st: o.pay, monto: o.amount ?? o.dep }, usdN) }', '{ alt: hNoche(m) }'],
  ['plantilla viaje_alt sin {dinero}', 'packages/db/migrations/0224_avisos_otra_hora_lo_que_se_pide.sql', " where key = 'viaje_alt'\n", " where key = 'viaje_alt_otro'\n"],
  // (13, revisión del 25 nov) · Los tramos eximidos ya no eximen la línea entera; más frases; cancelarEvp y lo que se queda; los mensajes no(…); viaje y noche.
  ['una promesa en la misma línea que lo que va en camino', NE, 'const pendT = [x.devolucion.camino ?', 'const pendT = [E2("Te devolvemos el depósito.", "We refund the deposit."), x.devolucion.camino ?'],
  ['una promesa en la misma línea que un ejemplo «Ej.:»', 'apps/web/app/panel/Citas.tsx', 'alt: ["Ej.: Tienes razón en parte. Te devolvemos $10.", "e.g. You are partly right. We refund $10."]', 'alt: ["Tienes razón en parte. Te devolvemos $10.", "You are partly right. We refund $10."]'],
  ['«te liberamos el depósito»', EE, '(pedimos la devolución del depósito a tu tarjeta)', '(te liberamos el depósito)'],
  ['«deposit back»', EE, '(we request the deposit refund to your card)', '(deposit back in 3–5 business days)'],
  ['«will be refunded»', 'apps/web/app/panel/Patrocinio.tsx', 'we request a refund of the full ${$(v.precio)} to your card; you see here when it goes through.', 'the full ${$(v.precio)} will be refunded to your card.'],
  ['«we release your deposit»', FE, '"The date is free, but at another time.")', '"The date is free, but at another time; if not, we release your deposit.")'],
  ['cancelarEvp: perdio sin mirar el cobro', 'apps/web/lib/evento-privado.ts', 'perdio = !aTiempo && (cobrado > 0 || held);', 'perdio = !aTiempo && (o.amount ?? 0) > 0;'],
  ['cancelarEvp: el aviso con el depósito entero', 'apps/web/lib/evento-privado.ts', 'es: `El depósito de ${dinero(P.queda)} se queda con el restaurante.`', 'es: `El depósito de ${dinero(P.dep)} se queda con el restaurante.`'],
  ['cancelarEvp: la nota «se devuelve el depósito» antes de actuar', 'apps/web/lib/evento-privado.ts', '{ es: `Canceló con ${plazo} h o más`, en: `Cancelled ${plazo} h or more before` }', '{ es: `Canceló con ${plazo} h o más: se devuelve el depósito`, en: `Cancelled ${plazo} h or more before: the deposit is refunded` }'],
  ['evento privado: «se quedó» sin mirar lo que quedaba', EE, ': x.perdio && queda > 0 ? [queda === x.pago.monto ?', ': x.perdio ? [true ?'],
  ['panel del evento privado: «tarde» de perdio', 'apps/web/app/panel/EventoPrivado.tsx', 'tardeCx = x.cxr === "tarde"', 'tardeCx = x.perdio'],
  ['panel del evento privado: «se queda contigo» sin lo que quedaba', 'apps/web/app/panel/EventoPrivado.tsx', ': x.perdio && quedaCx > 0 ? (quedaCx === x.pago.monto ?', ': x.perdio ? (true ?'],
  ['panel del evento privado: sin «No se había cobrado nada»', 'apps/web/app/panel/EventoPrivado.tsx', '    : !cobradoVisto(x.pago) && x.pago.st !== "refunded" ? E2("No se había cobrado nada.", "Nothing had been charged.")\n', ''],
  ['evento privado: la tabla «Depósito cobrado» sin mirar', EE, 'conPago ? (cobrado ?', 'conPago ? (!retenido ?'],
  ['evento privado: «Depósito cobrado» con el depósito acordado', EE, '${E2("Depósito cobrado: ", "Deposit charged: ")}${dinero(queda)}', '${E2("Depósito cobrado: ", "Deposit charged: ")}${dinero(ac.dep)}'],
  ['no(…): «pedimos que se suelte» sin retención', 'apps/web/lib/fiestas-reservas.ts', 'return o.dep > 0 && o.pay === "held" ? no("Ese día ya se ocupó.', 'return o.dep >= 0 ? no("Ese día ya se ocupó.'],
  ['no(…): promete la devolución', 'apps/web/lib/noche-reservas.ts', 'no("Tu depósito ya no está retenido. Elige «No me sirve» y pide la mesa otra vez.",', 'no("Tu depósito ya no está retenido. Elige «No me sirve» y te devolvemos el depósito.",'],
  ['viaje: la mitad sin mirar lo que queda', VE, 'mitad = Math.min(Math.floor(x.tot / 2), base)', 'mitad = Math.floor(x.tot / 2)'],
  ['viajes.ts: «cobra la mitad» de un cobro devuelto', 'apps/web/lib/viajes.ts', '["captured", "partially_refunded"].includes(p.status) ? Math.min(cobra, Math.max(0, p.amount - (p.refunded ?? 0))) : 0;', '["captured", "partially_refunded", "refunded"].includes(p.status) ? cobra : 0;'],
  ['noche: sin llegar «No se cobró nada» aunque se devolvió', NE, ': devT || E2("No se cobró nada.", "Nothing was charged.");', ': E2("No se cobró nada.", "Nothing was charged.");'],
  ['avisarCliente sin {dinero} por defecto', 'apps/web/lib/noche-reservas.ts', 'puerta: "", dinero: "", ...extra }', 'puerta: "", ...extra }'],
  // (13, revisión de 07fe94a) · El no(…) en inglés y en varias líneas, sin la exención ph:, la nota del viaje neutra, cancelarEvp con el cobro de la base,
  // el Super Admin sin perdio crudo y «lo que quedaba» del viaje.
  ['no(…): la promesa solo en el literal en inglés', 'apps/web/lib/noche-reservas.ts', '"Your deposit is no longer held. Choose “Doesn’t work” and request the table again.")', '"Your deposit is no longer held. Choose “Doesn’t work” and we refund your deposit.")'],
  ['no(…) en varias líneas con la promesa', 'apps/web/lib/noche-reservas.ts', 'return no("Tu depósito ya no está retenido. Elige «No me sirve» y pide la mesa otra vez.", "', 'return no(\n      "Tu depósito ya no está retenido. Te devolvemos el depósito.",\n      "'],
  ['no(…): «hold to come off» en inglés sin retención', 'apps/web/lib/viajes.ts', '  if (!NUM_V.test(numero)) return no("Ese viaje no existe.", "That trip does not exist.");\n  await barrerViajes({ userId, numero });\n  let despues', '  if (!NUM_V.test(numero)) return no("Ese viaje no existe.", "That trip does not exist. We ask for the hold to come off your card.");\n  await barrerViajes({ userId, numero });\n  let despues'],
  ['ph: E2(…) ya no exime una promesa', 'apps/web/app/panel/ViajesPanel.tsx', 'ph: E2("Ej.: la van se dañó", "E.g. the van broke down")', 'ph: E2("Te devolvemos todo", "We refund everything")'],
  ['viaje: la nota «se cobra la mitad ($X)» antes de actuar', 'apps/web/lib/viajes.ts', '{ es: "Canceló a menos de 24 h", en: "Cancelled less than 24 h before" }', '{ es: `Canceló a menos de 24 h: se cobra la mitad (${money(cobra)})`, en: `Cancelled less than 24 h before: half is charged (${money(cobra)})` }'],
  ['viaje: la nota del historial que el guardián no encuentra', 'apps/web/lib/viajes.ts', 'await ev(c, o.id, "cancelled", "user", userId, cobra ?', 'await ev(c, o.id, "cancelled", "user", userId,\n        cobra ?'],
  ['cancelarEvp: «se queda» sin el cobro hecho', 'apps/web/lib/evento-privado.ts', 'quedo = o2?.pst === "captured" || o2?.pst === "partially_refunded";', 'quedo = o2?.pst !== "held";'],
  ['cancelarEvp: cobrarOperacion sin try/catch', 'apps/web/lib/evento-privado.ts', 'try { await cobrarOperacion(o.id); } catch (e) { fallo = e ?? new Error("captura"); }', 'await cobrarOperacion(o.id);'],
  ['Transacciones: perdio crudo', 'apps/web/lib/admin-tx.ts', "'perdio', ${QUEDO}) end as no", "'perdio', coalesce((o.details->>'perdio')::boolean, false)) end as no"],
  ['viaje: «Se cobró la mitad» con menos', VE, 'x.cobroMitad ? (x.cobroMitad < Math.floor(x.tot / 2) ?', 'x.cobroMitad ? (false ?'],
  ['Transacciones: «se cobró la mitad» con menos', 'apps/web/app/admin/Transacciones.tsx', 'x.vi.mitad < Math.floor(x.total / 2) ? E("se cobró lo que quedaba"', 'false ? E("se cobró lo que quedaba"'],
  ['cancelarEvp: tarde con el cobro ya devuelto avisa «No se cobró nada»', 'apps/web/lib/evento-privado.ts', '  if (!quedo && (!d || d.e === "nada")) d = P.pst === "refunded"', '  if (false) d = P.pst === "refunded"'],
  ['viajes.ts: cobrarOperacion sin try/catch', 'apps/web/lib/viajes.ts', '{ try { await cobrarOperacion(o.id); } catch (e) { fallo = e ?? new Error("captura"); } }', 'await cobrarOperacion(o.id);'],
  // (13, segunda revisión) · La captura tarde que lanza deja rastro; lo ya soltado se dice soltado; la ventana de «held» del no(…) es su sentencia.
  ['cancelarEvp: el catch de la captura sin rastro', 'apps/web/lib/evento-privado.ts', 'catch (e) { fallo = e ?? new Error("captura"); }', 'catch { /* nada */ }'],
  ['cancelarEvp: sin alerta al equipo de dinero', 'apps/web/lib/evento-privado.ts', '    if (fallo && o) await alertarCapturaTarde(o.id, numero, fallo, d);', '    if (fallo && o) console.log(fallo);'],
  ['viajes.ts: sin alerta al equipo de dinero', 'apps/web/lib/viajes.ts', '        if (fallo) await alertarCapturaTarde(o.id, numero, fallo, d);', '        if (fallo) console.log(fallo);'],
  ['cancelarEvp: lo soltado por otro sin decirlo', 'apps/web/lib/evento-privado.ts', '      else if (o2?.pst === "released") d = { e: "liberada", monto: P.dep };', ''],
  ['no(…): «held» de otra sentencia', 'apps/web/lib/fiestas-reservas.ts', '      if (d?.ocupada) return o.dep > 0 && o.pay === "held" ? no(', '      const conRetencion = o.pay === "held";\n      if (d?.ocupada) return o.dep > 0 ? no('],
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
