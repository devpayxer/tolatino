// Prueba al revés de los guardianes devolucionEnDosPasos, estadoEnElWhere y candadoEnSuConexion (9t, 21 nov; LAUNCH «→ 9t» de la confirmación del
// 20 nov): (1) devolverPago llamaba a Stripe ANTES de cualquier renglón en la base; (2) Colas › Ayuda con monto podía devolver dos veces el mismo caso
// (la llave era el toque) y el caso no sumaba lo devuelto; (3) «Anular» con cobro fallido dejaba «anuló» en la auditoría con Pro pagado, y los cambios
// del plan no miraban su estado; (4) las disputas se escribían sin su estado en el `where` (un webhook quedaba pisado); y, por clase, el candado del
// plan se tomaba y se soltaba por el pool (el desbloqueo podía caer en otra conexión). Se inyecta cada defecto, el guardián debe fallar con SU
// mensaje ([nombre]); se restaura. La prueba con la base y la pasarela de mentira es pruebas/e2e/din9t.cjs.
// 9t2 (21 nov, LAUNCH «Dinero por clase, 21 nov»): llaveSoloUnDia, casoSeCierraConSuDevolucion, intencionAntesDeStripe, alertaSoloConCaminoReal,
// webhookDevolucionFallida y disputaCierraSuCaso (y lo nuevo de devolucionEnDosPasos y estadoEnElWhere); su prueba con la base es pruebas/e2e/din9t2.cjs.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const CB = 'apps/web/lib/cobros.ts', BA = 'apps/web/lib/barrido.ts', CL = 'apps/web/app/admin/acciones-colas.ts', SE = 'apps/web/lib/soporte-equipo.ts', AY = 'apps/web/lib/ayuda-cita.ts';
const DI = 'apps/web/lib/disputas.ts', SU = 'apps/web/lib/suscripcion.ts', BO = 'apps/web/lib/boletos-despues.ts';
const D = 'devolucionEnDosPasos', W = 'estadoEnElWhere', K = 'candadoEnSuConexion';
// 9t2 (21 nov): los guardianes de «Dinero por clase, 21 nov».
const L = 'llaveSoloUnDia', C = 'casoSeCierraConSuDevolucion', I = 'intencionAntesDeStripe', A = 'alertaSoloConCaminoReal', H = 'webhookDevolucionFallida', DC = 'disputaCierraSuCaso';
const PA = 'apps/web/lib/patrocinio.ts', AD = 'apps/web/app/admin/acciones-dinero.ts', PB = 'apps/web/lib/pagos-banco.ts', DA = 'apps/web/lib/dinero-alertas.ts', RT = 'apps/web/app/api/stripe/webhook/route.ts';
const IF = 'intentoFallidoQueda';
// 9t3 (21 nov, LAUNCH «Dinero por clase, 21 nov · lo que quedó», a–f): cobroProAnotadoAntes, manoTrasLaLlave, boletoFallidoCoherente, ayudaNoReabreConDinero,
// webhookEventosEscritos (y lo nuevo de llaveSoloUnDia); su prueba con la base es pruebas/e2e/din9t3.cjs.
const PR = 'cobroProAnotadoAntes', M = 'manoTrasLaLlave', BF = 'boletoFallidoCoherente', AN = 'ayudaNoReabreConDinero', WE = 'webhookEventosEscritos';
const LQ = 'apps/web/lib/evt-liquidacion.ts', MG = 'packages/db/migrations/0199_dinero_llaves_y_cobros_pro.sql', DOC = 'docs/ayuda/admin-conciliacion.md';
// 9t4 (21 nov, LAUNCH «Dinero por clase, 21 nov · lo que quedó» (4)): cobroFueraAnotadoAntes, por clase (todo cobro fuera de sesión: planes del Hogar,
// rentas, renovaciones de patrocinios); su prueba con la base es pruebas/e2e/din9t4.cjs.
const FA = 'cobroFueraAnotadoAntes', CFU = 'apps/web/lib/cobro-fuera.ts', PLN = 'apps/web/lib/planes.ts', REN = 'apps/web/lib/rentas.ts', PEV = 'apps/web/lib/patrocinio-evento.ts';
const MG2 = 'packages/db/migrations/0202_cobros_fuera_de_sesion.sql', PLT = 'apps/web/app/admin/Planes.tsx';
// 9t5 (21 nov): preguntarALaPasarela (y lo nuevo de llaveSoloUnDia, cobroProAnotadoAntes y cobroFueraAnotadoAntes); su prueba con la base es pruebas/e2e/din9t5.cjs.
const PG = 'preguntarALaPasarela', KP = 'apps/web/lib/consulta-pasarela.ts', PSA = 'apps/web/lib/pagos/pasarela.ts', ACO = 'apps/web/app/admin/acciones-conciliacion.ts';
const MG3 = 'packages/db/migrations/0203_preguntar_a_la_pasarela.sql';
// 9t5 (CI de 9t4, plan4f): yaCobradoNoSeQuedaMudo.
const YM = 'yaCobradoNoSeQuedaMudo';
// 9t6 (21 nov): retencionRenovadaComoIntencion y revisionPreguntaOtraVez; su prueba con la base es pruebas/e2e/din9t6.cjs.
const RT6 = 'retencionRenovadaComoIntencion', RV6 = 'revisionPreguntaOtraVez', RRF = 'apps/web/lib/renovar-retencion.ts', RVF = 'apps/web/lib/revision-pasarela.ts', ESF = 'apps/web/lib/estimados.ts';
const MG4 = 'packages/db/migrations/0204_retenciones_y_revision.sql';
// 9t6 (0205, LAUNCH «lo que quedó de 9t6» (4)): la hoja «Elegir cuál vale» con monto, fecha y orden; el detalle guardado nunca decide.
const MG5 = 'packages/db/migrations/0205_consulta_con_detalle.sql';
const casos6 = [
  // (1) Como estaba: el estimado vuelve a retener y soltar por su cuenta (sin respuesta = «el banco no dejó»).
  [RT6, ESF, "    if (x) await RR.renovarRetencion(x);", "    if (x) await pasarela.retener({ centavos: 1, comision: 0, destino: \"a\", pm: \"p\", idem: `renov-${p.id}`, meta: {}, fuera: true });\n    if (x) await RR.renovarRetencion(x);"],
  [RT6, REN, "    if (x) await RR.renovarRetencion(x);", "    if (x) await pasarela.liberar(x.pi);\n    if (x) await RR.renovarRetencion(x);"],
  // (2) Sin el dato buscable, o anotado DESPUÉS de mandar.
  [RT6, RRF, ", ...(m.gref ? { tl_intencion: m.gref } : {}) }, fuera: true })", " }, fuera: true })"],
  // (3) Sin respuesta como «no»: suelta la vieja y avisa; o reintenta con la llave vencida o con la vieja ya muerta.
  [RT6, RRF, "      return \"sigue\";\n    }", "      return cerrarSin(x, f.id, \"banco\", false);\n    }"],
  [RT6, RRF, "  if (!f.enviada || (f.llave && f.viva)) {", "  if (true) {"],
  [RT6, RRF, "export const HORAS_VIVE = 168;", "export const HORAS_VIVE = 192;"],
  // (4) «Nunca llegó» sin la consulta; lo que no cierra no avisa al equipo.
  [RT6, RRF, "  else if (v?.noLlego) quedo = await cerrarSin(x, id, \"nunca_llego\", true);", "  else if (v?.resultado === \"no_hallado\") quedo = await cerrarSin(x, id, \"nunca_llego\", true);"],
  [RT6, RRF, "  if (quedo === \"sigue\") await alertaSigue(x, h);\n", ""],
  // (5) La vieja se suelta en Stripe antes de anotar la nueva.
  [RT6, RRF, "  const h = await tx(async (c) => {\n    const f = (await c.query<{ ciudad: string | null }>(`select city_id as ciudad from hold_renewals", "  await soltarSuelta(x.pi, suelta(x, { es: \"\", en: \"\" }));\n  const h = await tx(async (c) => {\n    const f = (await c.query<{ ciudad: string | null }>(`select city_id as ciudad from hold_renewals"],
  // El aviso dice «tu banco» siempre; la base deja dos renovaciones por retención.
  [RT6, ESF, 'm === "banco" ? "hold_fallo" : "hold_no_renovada"', '"hold_fallo"'],
  [RT6, MG4, "  payment_id      bigint not null unique references payments (id),", "  payment_id      bigint not null references payments (id),"],
  // revisionPreguntaOtraVez · (1) decide con lo que dice la pantalla (sin volver a preguntar), o deja valer uno que no está, de otro monto o en curso.
  [RV6, RVF, "  const resultado = await K.consultar({ tabla: t, id, monto: x.monto, ciudad: x.ciudad, negocio: x.negocio, grupo: x.grupo, medio: x.medio, objeto: x.objeto }, { origen: \"equipo\", staff: s.id }, det);", "  const resultado = \"varios\" as import(\"./consulta-pasarela\").Resultado; det.hallados = [{ id: eleccion, estado: \"hecho\", centavos: x.monto }];"],
  [RV6, RVF, "  if (eleccion === \"ninguno\" ? !E.ninguno : !E.vale.includes(eleccion)) {", "  if (eleccion === \"ninguno\" && !E.ninguno) {"],
  [RV6, DA, "h.estado === \"hecho\" && h.centavos === x.monto", "h.estado === \"hecho\""],
  [RV6, RVF, "  if (E.enCurso) return { ok: false, msg: \"Stripe todavía tiene uno en curso: espera a que termine y vuelve a intentarlo.\" };\n", ""],
  // (2) Dos personas a la vez: dos decisiones; lo que se devuelve, a la pasarela dentro de la transacción; sin auditoría.
  [RV6, RVF, "       on conflict (subject_kind, subject_id) do nothing returning id::text`,", "       returning id::text`,"],
  [RV6, RVF, "      if (g) devs.push({ id: g.id, stripe: h.id, centavos: h.centavos });", "      if (g) { devs.push({ id: g.id, stripe: h.id, centavos: h.centavos }); await pasarela.devolver(h.id, h.centavos, `gwr-${h.id}`); }"],
  [RV6, RVF, "    await auditar(c, { actor: s.id, action: \"dinero.alerta.decidir\",", "    void ({ actor: s.id, action: \"dinero.alerta.decidir\","],
  // (3) «Ninguno» como un «no» del banco; el siguiente cobro de Pro con la misma llave.
  [RV6, SU, "set status = 'failed', last_error = 'devuelto' where id = $1::bigint and status = 'pending'`, [a.id])).rowCount)\n      return", "set status = 'failed', last_error = 'consulta_fallido' where id = $1::bigint and status = 'pending'`, [a.id])).rowCount)\n      return"],
  [RV6, SU, "last_error in ('nunca_llego', 'devuelto')", "last_error = 'nunca_llego'"],
  [RV6, KP, "  if (rv) return {", "  if (rv && false) return {"],
  // (4) Lo que sobra: sin respuesta como rechazo; pasada la llave, otra vez a Stripe con ella.
  [RV6, RVF, "    await db().query(`update gateway_refunds set attempts = least(10000, attempts + 1), last_error = left($2, 120) where id = $1::bigint and status = 'pending'`, [id, codigo]);\n    return \"pending\";", "    return fallar(g, codigo, false);"],
  [RV6, RVF, "  if (g.enviada && g.vieja) return (await resolverDevolucionSobra(id, { origen: \"barrido\" })).st;\n", ""],
  // (5) Sin el permiso; el botón siempre; «Resuelta» deja la intención en camino; la base deja cambiar la decisión.
  [RV6, ACO, "  if (!s || !s.puede(\"tx\", \"aprobar\")) return { ok: false, mensaje: \"Tu rol no decide sobre dinero.\" };\n  const r = await (await import(\"@/lib/revision-pasarela\")).decidirRevision(", "  if (!s) return { ok: false, mensaje: \"Entra otra vez.\" };\n  const r = await (await import(\"@/lib/revision-pasarela\")).decidirRevision("],
  [RV6, PLT, '...(a.revisar ? [{ l: E("Elegir cuál vale", "Choose which counts")', '...(true ? [{ l: E("Elegir cuál vale", "Choose which counts")'],
  [RV6, DA, "  if (accion === \"resuelta\" && a.kind === \"gateway_review\" && (await opcionesDeAlertas([{ id, sujeto: a.sujeto }])).has(id))", "  if (false)"],
  [RV6, MG4, "create trigger gateway_reviews_no_cambia before update or delete on gateway_reviews for each row execute function dinero_solo_insercion();\n", ""],
  // (6) 0205 · La hoja ofrece ids pelados (sin monto ni fecha), o sin la fecha; la pantalla ignora el detalle guardado; la consulta no lo guarda; la base
  // sin su forma.
  [RV6, PLT, "l: etiqueta(h, a.revisar!.tz) }))", "l: h.id }))"],
  [RV6, PLT, "h.creado ? cuandoSalio(h.creado, tz) : null, h.id]", "h.id]"],
  [RV6, DA, "x.found, x.found_n from gateway_checks", "null::jsonb as found, x.found_n from gateway_checks"],
  [RV6, KP, "        found ? JSON.stringify(found) : null])).rows[0]!;", "        null])).rows[0]!;"],
  [RV6, MG5, "alter table gateway_checks add constraint gateway_checks_found_forma check (gateway_checks_found_ok(found));\n", ""],
  // (1b) La decisión usa el detalle guardado de la consulta anterior en vez de lo que la pasarela contesta ahora.
  [RV6, RVF, "  if (resultado === \"sin_respuesta\") return { ok: false, msg: \"Stripe no contestó la consulta: no se cambió nada. Prueba en un momento.\" };\n",
    "  if (resultado === \"sin_respuesta\") return { ok: false, msg: \"Stripe no contestó la consulta: no se cambió nada. Prueba en un momento.\" };\n  det.hallados = (await db().query(`select found from gateway_checks where subject_kind = $1 and subject_id = $2::bigint and found is not null order by at desc limit 1 offset 1`, [t, id])).rows[0]?.found ?? det.hallados;\n"],
];
const casos = [
  ...casos6,
  // 9t2 · Soporte: el intento que no cabe queda en el libro como fallido (sop7b lo vio rojo cuando se deshacía la transacción entera).
  [IF, SE, "        await c.query(`update support_refunds set status = 'failed', fail_reason = left($2, 200), done_at = now() where id = $1::bigint and status = 'pending'`, [fx.id, a.msg.es]);\n        return a.msg.es;", "        return a.msg.es;"],
  [IF, SE, '        await c.query("rollback to savepoint anota");\n', ""],
  [IF, SE, '      await c.query("savepoint anota");\n', ""],
  // (1) Como estaba: la pasarela primero y la devolución nace 'done'.
  [D, CB, "  const a = await tx((c) => anotarDevolucionPago(c, x, alGuardar));\n", "  await pasarela.devolver(\"pi\", x.centavos, x.idem);\n  const a = await tx((c) => anotarDevolucionPago(c, x, alGuardar));\n"],
  [D, CB, "values ($1::bigint, $2, $3, $4, $5, 'pending', $6, $7::bigint) returning id::text`,", "values ($1::bigint, $2, $3, $4, $5, 'done', $6, $7::bigint) returning id::text`,"],
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
  [D, SE, '    if (!d.enCamino) {\n', '    {\n'],
  [D, AY, '    if (!d.ok && d.enCamino) camino = true;\n    else if (!d.ok) rechazo = d.msg;\n', '    if (!d.ok) rechazo = d.msg;\n'],
  // ── 9t2 (21 nov, LAUNCH «Dinero por clase, 21 nov») ──
  // (1) El cierre de los boletos vuelve a sumar a lo devuelto (el webhook charge.refunded pudo contarla antes).
  [D, BO, '    const p = await devueltoDelLibro(c, u.pid);\n', '    const p = (await c.query<{ st: string }>(`update payments set refunded_cents = refunded_cents + $2 where id = $1::bigint returning status as st`, [u.pid, u.amt])).rows[0]!;\n'],
  // (2) Una llave de más de un día vuelve a la pasarela (otro toque, el barrido de boletos o el de patrocinios devolverían dos veces).
  [L, CB, '  if (r.vieja) return { ok: false, msg: VIEJA, enCamino: true };\n', ''],
  [L, BO, '  if (r.vieja) return false;\n', ''],
  // 9t8 · La del patrocinio es una intención (sponsorship_refunds): la llave vieja no vuelve a la pasarela; su barrido no reintenta 30 días.
  [L, PA, '  if (r.mano || r.vieja) return "pending";', '  if (r.mano) return "pending";'],
  [L, BO, " and coalesce(r.key_from, r.created_at) > now() - make_interval(hours => $1::int)", ''],
  [L, PA, "coalesce(z.key_from, z.created_at) > now() - make_interval(hours => $2::int)\n        and not (z.id = any($3::bigint[])) order by z.created_at, z.id limit 50", "coalesce(z.key_from, z.created_at) > now() - interval '30 days'\n        and not (z.id = any($3::bigint[])) order by z.created_at, z.id limit 50"],
  // (3) La ayuda de la cita: la llave del toque, la suma de lo pedido y el caso que no se cierra con la devolución.
  [C, AY, 'idem: `ayb-h${h.id}`', 'idem: `ayb-${x.clave}`'],
  [C, AY, "closed_by = 'user', resolved_at = now(), updated_at = now() where id = $1::bigint and status = 'answered'`, [h.id]);", "closed_by = 'user', refunded_cents = refunded_cents + $2, resolved_at = now(), updated_at = now() where id = $1::bigint and status = 'answered'`, [h.id, 0]);"],
  [C, CB, '    const caso = await cerrarDelCaso(c, { idem: u.idem, amt: u.amt }, !!alCerrar);\n', '    const caso = null as string | null;\n'],
  // (4) Soporte: la fila no se cierra con la devolución (o la cierra el que tocó), y un «no» no la deja fallida.
  [C, SE, "where idem_key = $1 and status = 'pending' returning id::text, case_id::text as caso", "where idem_key = $1 returning id::text, case_id::text as caso"],
  [C, SE, '  const f = fila;\n', "  const f = fila;\n  await db().query(`update support_refunds set status = 'done' where id = $1::bigint`, [fila.id]);\n"],
  [C, CB, "      await c.query(`update support_refunds set status = 'failed', fail_reason = left($2, 200), done_at = now() where idem_key = $1 and status = 'pending'`, [r.idem, STRIPE_NO.es]);\n", ''],
  // (5) Pausar pagos: Stripe antes de anotar; la marca se limpia aunque la decisión haya cambiado; nadie la vuelve a pedir.
  [I, AD, '  let hecho = false;\n', '  if (!(await pasarela.cuentaPagos(a.acct, !!pausar))) return { ok: false, mensaje: "Stripe no respondió." };\n  let hecho = false;\n'],
  [I, PB, 'where business_id = $1 and payouts_sync_at = $2::timestamptz and payouts_paused = $3`', 'where business_id = $1`'],
  [I, BA, '        ["pausasStripe", async () => (await import("./pagos-banco")).sincronizarPausas()],\n', ''],
  // (6) Planes: el cobro, Free y «cobro fallido» sin el estado leído en el where (pisan una cortesía puesta en ese segundo).
  [W, SU, 'where business_id = $1 and status = $3`', 'where business_id = $1`'],
  [W, SU, 'where business_id = $1 and status = $2`, [negocio, esperado]', 'where business_id = $1`, [negocio]'],
  [W, SU, 'where business_id = $1 and status = $4`', 'where business_id = $1`'],
  // (7) «Resolver a mano» por el tipo de alerta, no por el estado de hoy de la devolución.
  [A, DA, 'aMano: mano && ult !== "resuelta_a_mano"', 'aMano: (x.kind === "refund_stuck" || x.kind === "transfer_reversal_stuck") && ult !== "resuelta_a_mano"'],
  [A, DA, "and r.status = 'pending' and r.manual_at is null and (r.attempts >= 1 or r.created_at <= now() - interval '23 hours'))", ')'],
  // ── 9t3 (21 nov, LAUNCH «Dinero por clase, 21 nov · lo que quedó») ──
  // (a) La transferencia al organizador y su reversión vuelven a Stripe con una llave de más de un día (o el barrido las reintenta sin tope).
  [L, LQ, '  if (s.vieja && s.net > 0) return pagarVieja(s);\n', ''],
  [L, LQ, '  if (r.vieja) { await alertaReversionVieja(r, !!r.gref); return false; }\n', ''],
  [L, LQ, " and coalesce(key_from, paying_at) > now() - make_interval(hours => $1::int)", ''],
  // (b) El cobro de Pro: una llave de más de un día, o 72 h en vez de las de cobros.
  [L, SU, '  if (a.vieja) return terminarViejo(s, a);\n', ''],
  [L, SU, 'const HORAS_LLAVE = 23;', 'const HORAS_LLAVE = 72;'],
  // (b) Como estaba: la pasarela antes de anotar; sin respuesta = «no»; en camino cuenta como cobro fallido; el cierre sin «una vez»; sin barrido; otra
  // intención mientras una va en camino; la base sin su tope de una en camino.
  [PR, SU, '  return terminarCobro(s, await anotarCobro(s, desde, alGuardar), enSesion);\n', '  await pasarela.cobrarDirecto({ centavos: 1, pm: s.card_pm, idem: "x", meta: {} });\n  return terminarCobro(s, await anotarCobro(s, desde, alGuardar), enSesion);\n'],
  [PR, SU, "      await db().query(`update subscription_charges set attempts = least(10000, attempts + 1)", "      await db().query(`update subscription_charges set status = 'failed', attempts = least(10000, attempts + 1)"],
  [PR, SU, 'if (!r.ok && !r.enCamino) await fallo(', 'if (!r.ok) await fallo('],
  [PR, SU, "where id = $1::bigint and status = 'pending'`, [a.id, pi])).rowCount) return null;", "where id = $1::bigint`, [a.id, pi])).rowCount) return null;"],
  [PR, BA, '        ["cobrosPro", async () => (await import("./suscripcion")).barrerCobrosPro()],\n', ''],
  [PR, SU, "where business_id = $1 and (status = 'pending' or idem_key = $2 or (status = 'done' and period_start = $3::timestamptz))", "where business_id = $1 and (status = 'pending' or idem_key = $2)"],
  // Una intención de un período ya cobrado llega a Stripe (la base la frenaría solo al cerrar, con el dinero ya cobrado).
  [PR, SU, "y.status = 'done' and y.id <> z.id", "y.status = 'ninguno' and y.id <> z.id"],
  [PR, MG, "create unique index if not exists subscription_charges_una_en_camino on subscription_charges (business_id) where status = 'pending';\n", ''],
  // (c) «Resolver a mano» sin intentos antes de las 23 h (la base), o la pantalla con otras horas que la base.
  [M, MG, "if old.attempts < 1 and old.created_at > now() - interval '23 hours' then", "if old.attempts < 1 and old.created_at > now() - interval '1 hours' then"],
  [M, DA, "(r.attempts >= 1 or r.created_at <= now() - interval '23 hours'))", "(r.attempts >= 1 or r.created_at <= now() - interval '1 hours'))"],
  // (d) Boletos: la cancelación no resta, el boleto se repone solo, o la comisión cedida sigue contando con la devolución fallida.
  [BF, CB, "    if (cx) await c.query(`update event_cancellations set refunded_cents = greatest(0, refunded_cents - $2) where id = $1::bigint`, [cx[1], r.amt]);\n", ''],
  [BF, CB, '    return { ...r, bol };\n', "    await c.query(`update tickets set status = 'valid' where id in (select ticket_id from ticket_refund_lines where refund_id = $1::bigint)`, [r.id]);\n    return { ...r, bol };\n"],
  // 0209 · evt_liq_calc vive ahora en la 0209 (la última que la define es la que manda).
  [BF, 'packages/db/migrations/0209_devolver_otra_vez_y_envio_reciente.sql', "from ticket_refund_lines l join refunds r on r.id = l.refund_id\n                      where l.operation_id = p.op and r.status in ('pending', 'done')", 'from ticket_refund_lines l where l.operation_id = p.op'],
  // (f) La ayuda de la cita: se corta en el primer «no», reabre aunque algo haya salido, o muestra lo pedido en vez de lo que salió.
  [AN, AY, '    else if (!d.ok) rechazo = d.msg;\n', '    else if (!d.ok) { rechazo = d.msg; break; }\n'],
  [AN, AY, 'if (L.salio + L.va === 0) {', 'if (L.salio === 0) {'],
  [AN, AY, '[h.id, L.salio + L.va]', '[h.id, devolver]'],
  // (e) El webhook escucha un evento que no está escrito en su lista o en la ayuda del equipo.
  [WE, RT, '     charge.refund.updated · charge.dispute.created', '     charge.dispute.created'],
  [WE, DOC, '`charge.refund.updated` · `charge.dispute.created`', '`charge.dispute.created`'],
  [WE, RT, '    case "charge.dispute.created":\n', '    case "charge.refund.created":\n    case "charge.dispute.created":\n'],
  // (8) El webhook no escucha charge.refund.updated; la fallida sin «una vez» o con lo devuelto restado sin el libro.
  [H, RT, '    case "charge.refund.updated": {', '    case "charge.refund.updated.x": {'],
  [H, CB, "where r.stripe_refund_id = $1 and r.status = 'done'", 'where r.stripe_refund_id = $1'],
  [H, CB, 'greatest(x.hecho, p.refunded_cents - $2::int)', 'p.refunded_cents - $2::int'],
  // (9) La disputa cerrada por el banco no cierra su caso (o lo cierra sin «una vez» o sin decir que fue el sistema).
  [DC, DI, "and subject_id = $1 and status = 'open' returning id::text", 'and subject_id = $1 returning id::text'],
  [DC, DI, 'quien: "sistema"', 'quien: "equipo"'],
  [DC, DI, "        `update queue_items set status = 'decided', decision = $2", "        `update queue_items_otra set status = 'decided', decision = $2"],
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
  // ── 9t4 (21 nov, LAUNCH «Dinero por clase · lo que quedó» (4)) ──
  // Como estaba: el plan, la renta y el patrocinio llaman a la pasarela sin intención anotada (por clase: en cualquier archivo).
  [FA, PLN, "  await terminarCobroPlan(a);\n}", "  await pasarela.cobrarFuera({ centavos: s.cents, comision: fee, destino, pm: s.pm, idem: `plan-${subId}-a1`, meta: {} });\n  await terminarCobroPlan(a);\n}"],
  [FA, REN, "    if (x.st !== \"out\") return no(\"Solo mientras la tienes.\", \"Only while you have it.\");\n", "    if (x.st !== \"out\") return no(\"Solo mientras la tienes.\", \"Only while you have it.\");\n    await pasarela.cobrarFuera({ centavos: x.p, comision: 0, destino: \"x\", pm: x.pm, idem: `renta-${x.rid}-dia${x.dias}-a1`, meta: {} });\n"],
  [FA, PA, "  const r = await CF.terminarCobro(a);\n  if (!r.ok) {\n    if (r.enCamino)", "  await pasarela.cobrarDirecto({ centavos: x.centavos, pm: x.pm, idem: x.idem, meta });\n  const r = await CF.terminarCobro(a);\n  if (!r.ok) {\n    if (r.enCamino)"],
  // La intención: sin respuesta = «no»; una llave de más de un día; «mandada» después de la llamada; el cierre sin «una vez»; otra intención mientras una
  // va en camino; lo mandado se suelta sin preguntar; el barrido sin tope o sin correr; otras horas que las de lib/cobros.
  [FA, CFU, "      await db().query(`update offsession_charges set attempts = least(10000, attempts + 1), last_error = left($2, 120) where id = $1::bigint and status = 'pending'`, [a.id, codigo]);\n      return { ok: false, enCamino: true, msg: EN_CAMINO };",
    "      await db().query(`update offsession_charges set status = 'failed', attempts = least(10000, attempts + 1), last_error = left($2, 120) where id = $1::bigint and status = 'pending'`, [a.id, codigo]);\n      return { ok: false, enCamino: true, msg: EN_CAMINO };"],
  [FA, CFU, "  if (a.vieja) return terminarVieja(a, cerrar);\n", ""],
  [FA, CFU, "(`update offsession_charges set gateway_ref = case when sent_at is null then 'offsession_charges:' || id else gateway_ref end, sent_at = coalesce(sent_at, now()) where id = $1::bigint and status = 'pending' returning gateway_ref as gref`", "(`select gateway_ref as gref from offsession_charges where id = $1::bigint and status = 'pending'`"],
  [FA, CFU, "set status = 'done', stripe_pi = $2, last_error = null where id = $1::bigint and status = 'pending' returning city_id as ciudad`", "set status = 'done', stripe_pi = $2, last_error = null where id = $1::bigint returning city_id as ciudad`"],
  [FA, CFU, "(status = 'pending' or (status = 'done' and purpose = $3))", "(status = 'done' and purpose = $3)"],
  [FA, CFU, "  if (!a.enviada && (await soltarSinMandar(a.id, porque))) return true;", "  if (await soltarSinMandar(a.id, porque)) return true;"],
  [FA, CFU, "and status = 'pending' and sent_at is null`, [id, porque]", "and status = 'pending'`, [id, porque]"],
  [FA, CFU, "        and created_at > now() - make_interval(hours => $1::int) and not (id = any($2::bigint[])) order by created_at, offsession_charges.id limit 50`, [HORAS_LLAVE, vistos])).rows,", "        and not (id = any($2::bigint[])) order by created_at, offsession_charges.id limit 50`, [HORAS_LLAVE, vistos])).rows,"],
  [FA, BA, '        ["cobrosFuera", async () => (await import("./cobro-fuera")).barrerCobrosFuera()],\n', ''],
  [FA, CFU, 'import { HORAS_LLAVE_STRIPE as HORAS_LLAVE, soltarSuelta } from "./cobros";', 'import { soltarSuelta } from "./cobros";\nconst HORAS_LLAVE = 72;'],
  // Planes: en camino cuenta como rechazo; el período avanza aunque el plan ya no lo espere.
  [FA, PLN, "  if (r.enCamino) return false;\n  await rechazoPlan(", "  await rechazoPlan("],
  [FA, PLN, "where id = $1::bigint and next_charge_on = $3::date and status = 'active'`", "where id = $1::bigint`"],
  // Rentas: los días tarde fuera de la transacción de la devolución; el depósito con otra llave por toque; vence con un cobro en camino.
  [FA, REN, 'detalle: { meta: { rental: numero, business_id: negocio }, que: "tarde", dias: tarde } }, c);', 'detalle: { meta: { rental: numero, business_id: negocio }, que: "tarde", dias: tarde } });'],
  [FA, REN, 'idem: `${a.idem}-dep`', 'idem: `${a.idem}-dep-${Date.now()}`'],
  [FA, REN, " and status = 'held' and expires_at < now() and not exists (select 1 from offsession_charges q where q.kind = 'renta' and q.ref_id = rentals.id::text and q.status = 'pending')`", " and status = 'held' and expires_at < now()`"],
  // Patrocinios: en camino termina el patrocinio; la intención no se cierra con el patrocinio nuevo; la renovación sin su intención (sin ref).
  [FA, PA, "      if (!p.ok && p.enCamino) return null;\n      if (p.ok) {", "      if (p.ok) {"],
  [FA, PEV, "        if (!(await CF.marcarHecho(c, p.intencion!, p.pi))) {\n", "        if (false) {\n"],
  [FA, PEV, ', duration: s.duration }, ref: id };', ', duration: s.duration } };'],
  // La base sin su tope de una en camino; una alerta nueva sin su rótulo en el Super Admin.
  [FA, MG2, "create unique index if not exists offsession_charges_una_en_camino on offsession_charges (kind, ref_id) where status = 'pending';\n", ''],
  [FA, PLT, ', offsession_unapplied: E("Cobro con tarjeta guardada sin aplicar", "Unapplied saved-card charge")', ''],
  // ── 9t5 (21 nov, LAUNCH «Cobros fuera de sesión, lo que quedó de 9t4» y «Dinero por clase · lo que quedó» (2)): preguntarle a la pasarela ──
  // (1) Una creación sin el dato buscable, o el dato anotado cada vez (un reintento de una que salió sin él lo «inventaría»).
  [PG, CFU, "cobro: a.id, ...(m.gref ? { tl_intencion: m.gref } : {}) };", "cobro: a.id };"],
  [PG, SU, 'kind: "pro", ...(m.gref ? { tl_intencion: m.gref } : {}) } })', 'kind: "pro" } })'],
  [PG, LQ, "settlement: s.id, ...(m.gref ? { tl_intencion: m.gref } : {}) } })", "settlement: s.id } })"],
  [PG, CFU, "set gateway_ref = case when sent_at is null then 'offsession_charges:' || id else gateway_ref end, sent_at", "set gateway_ref = 'offsession_charges:' || id, sent_at"],
  [PG, PSA, "await db().query(`insert into sim_transfers (id, destination, amount_cents, transfer_group, metadata) values ($1, $2, $3, $4, $5::jsonb) on conflict (id) do nothing`, [id, x.destino, x.centavos, x.grupo, JSON.stringify(x.meta)]);",
    "await db().query(`insert into sim_transfers (id, destination, amount_cents, transfer_group) values ($1, $2, $3, $4) on conflict (id) do nothing`, [id, x.destino, x.centavos, x.grupo]);"],
  // (2) «No llegó» sin consultar, sin el dato buscable, sin margen, o con un margen de 0.
  [PG, CFU, '  if (v?.resultado === "fallido" || v?.noLlego) {', '  if (v?.resultado === "fallido" || a.vieja) {'],
  [PG, SU, "export async function resolverCobroPro(", "async function soltarViejos(biz: string) { await db().query(`update subscription_charges set status = 'failed', last_error = 'nunca_llego' where business_id = $1 and status = 'pending'`, [biz]); }\nexport async function resolverCobroPro("],
  [PG, KP, "z.gateway_ref is not null and ", ""],
  [PG, KP, " and g.at >= ${desde} + make_interval(hours => $3::int)", ""],
  [PG, KP, "export const MARGEN_NO_LLEGO_H = 1;", "export const MARGEN_NO_LLEGO_H = 0;"],
  // La tabla vuelve a entrar al texto de la consulta desde el parámetro (lo que cazó Semgrep), o se quita el corte de la lista cerrada
  [PG, KP, "from gateway_checks g join ${tabla} z on", "from gateway_checks g join ${t} z on"],
  [PG, KP, '  if (!tabla) throw new Error("veredicto: tabla desconocida");\n', ""],
  // (3) La consulta fuera de su lugar (dentro de un cierre), sin anotarse, o «no hallado» cuando Stripe no contestó; varios que se cierran solos.
  [PG, SU, "async function terminarViejo(s: Fila, a: Intencion): Promise<ResCobro> {\n", "async function terminarViejo(s: Fila, a: Intencion): Promise<ResCobro> {\n  await pasarela.buscarCobro(`subscription_charges:${a.id}`);\n"],
  [PG, KP, "    const g = (await c.query<{ id: string }>(`insert into gateway_checks (", "    const g = (await c.query<{ id: string }>(`insert into gateway_checks_x ("],
  [PG, PSA, "    } catch { return { ok: false }; }\n  },\n  async buscarTransferencia(", "    } catch { return { ok: true, hallado: null }; }\n  },\n  async buscarTransferencia("],
  [PG, KP, 'if (resultado === "varios" || resultado === "monto_distinto") await alertaRevisar(', 'if (false) await alertaRevisar('],
  // (4) Lo que encontró la consulta se cierra por fuera del cierre del flujo (sin el período, sin el libro, sin el aviso).
  [PG, SU, "    await registrarPeriodo(s, a, v.stripe);\n    return { ok: true };", "    await db().query(`update subscription_charges set status = 'done', stripe_pi = $2 where id = $1::bigint`, [a.id, v.stripe]);\n    return { ok: true };"],
  [PG, LQ, "  if (v?.resultado === \"hecho\" && v.stripe) return cerrarPagada(s, v.stripe, true);", "  if (v?.resultado === \"hecho\" && v.stripe) { await db().query(`update event_settlements set status = 'paid', transfer_id = $2 where id = $1::bigint`, [s.id, v.stripe]); return true; }"],
  [FA, CFU, 'resolverCobroFuera(x.id, { origen: "barrido" })', 'intencion(x.id)'],
  // (5) «Preguntar a Stripe ahora» sin el permiso, sobre algo que ya no está en camino, o el botón siempre; la alerta que no se cierra sola.
  [PG, ACO, '  if (!s || !s.puede("tx", "aprobar")) return { ok: false, mensaje: "Tu rol no decide sobre dinero." };\n  const r = await (await import("@/lib/dinero-alertas")).preguntarPorAlerta(', '  if (!s) return { ok: false, mensaje: "Entra otra vez." };\n  const r = await (await import("@/lib/dinero-alertas")).preguntarPorAlerta('],
  [PG, DA, '  if (!a.vivo) return { ok: false, msg: "Ya no está en camino: se cerró." };\n', ''],
  [PG, PLT, '...(a.preguntar ? [{ l: E("Preguntar a Stripe ahora"', '...(true ? [{ l: E("Preguntar a Stripe ahora"'],
  [PG, DA, '  await cerrarAlertasResueltas();\n', ''],
  // La base: las consultas se pueden cambiar; Pro vuelve a decidir «nunca se mandó» con attempts = 0.
  [PG, MG3, "create trigger gateway_checks_no_cambia before update or delete on gateway_checks for each row execute function dinero_solo_insercion();\n", ''],
  [PR, SU, "and status = 'pending' and sent_at is null`, [a.id])).rowCount) return { ok: true };", "and status = 'pending' and attempts = 0`, [a.id])).rowCount) return { ok: true };"],
  // 9t5 (CI de 9t4) · «Ya cobrado» con el objeto esperándolo: mudo otra vez (el plan atascado), avanzar sin mirar el período, la renta «lista» sin avisar,
  // el patrocinio vivo para siempre.
  [YM, PLN, "    if (r.ya) { await periodoYaPagado(a); return true; }", "    if (r.ya) return true;"],
  [YM, PLN, "where id = $1::bigint and next_charge_on = $3::date and status = 'active' returning city_id as ciudad`", "where id = $1::bigint and status = 'active' returning city_id as ciudad`"],
  [YM, REN, "    await CF.alertaSinAplicar(a, { es: `la renta ${x.numero} seguía esperando ese cobro", "    void ({ es: `la renta ${x.numero} seguía esperando ese cobro"],
  [YM, PA, "          await terminar(YA_COBRADA);\n", ""],
  [YM, PEV, "          await CF.alertaSinAplicar(ia, {", "          void ({"],
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
let limpio = require('../lib/alreves-fin.cjs')(R, { mostrar: true });
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
