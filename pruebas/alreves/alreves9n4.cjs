// Prueba al revés de los guardianes de 9n-4 (el dinero y los flujos que faltan): 3-D Secure en todos los flujos que cobran con la persona en la app
// (quien paga, la hoja, la misma llave, «requires_payment_method» no abre la hoja, «Volver a Pro» en el panel y la vuelta desde Free), el OK por más
// del mercado y su recordatorio, liquidar sin pasar de lo retenido, el sustituto por libra, reponer a $0, la visita de garantía, «Me lo devolvieron»
// que se cierra solo, el Repartidor que ofrece solo y el recordatorio de la visita de $0 del plan. Se inyecta el defecto, el guardián debe fallar con
// SU mensaje ([nombre]); se restaura. «crear»: se crea el archivo, se corre y se borra.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const W = 'apps/web/', L = W + 'lib/', MIG = 'packages/db/migrations/0148_dinero2.sql';
const CI = L + 'citas.ts', NO = L + 'noche-reservas.ts', PA = L + 'pagos/pasarela.ts', SU = L + 'suscripcion.ts', ME = L + 'mercado.ts', AY = L + 'ayuda.ts',
  AC = L + 'ayuda-cita.ts', VI = L + 'visitas.ts', RA = L + 'repartidor-auto.ts', CF = L + 'citas-flujo.ts', BA = L + 'barrido.ts',
  FI = W + 'app/(app)/n/[id]/fiesta/Booking.tsx', VS = W + 'app/(app)/n/[id]/visita/Visita.tsx', ES = W + 'app/(app)/cita/[num]/EstimadoCliente.tsx', PN = W + 'app/panel/Panel.tsx';
const casos = [
  // tresDSecureEnTodos: el depósito de la cita sin quien paga (la verificación no queda a su nombre)
  ['tresDSecureEnTodos', CI, 'usuario: { id: userId, negocio: P.x.id, ciudad: P.x.city }, ', ''],
  // … la mesa de noche vuelve a soltar el cobro y pedir otra tarjeta
  ['tresDSecureEnTodos', NO, 'retenido = null; return bancoPide(ret); }', 'retenido = null; await pasarela.liberar(ret.pi); return no("Prueba con otra tarjeta.", "Try another card.", { tarjeta: true }); }'],
  // … «requires_payment_method» (tarjeta rechazada) vuelve a abrir la hoja
  ['tresDSecureEnTodos', PA, 'a.viva && s?.estado === "requires_action")', 'a.viva && (s?.estado === "requires_action" || s?.estado === "requires_payment_method"))'],
  // … la fiesta no abre la hoja
  ['tresDSecureEnTodos', FI, '      {V.hoja}\n', ''],
  // … la visita cambia la clave antes de la hoja (al confirmar sería otro cobro)
  ['tresDSecureEnTodos', VS, '    if (V.pide(r, () => { void enviar(); })) { setOcupado(false); return; }', '    clave.current = uuid();\n    if (V.pide(r, () => { void enviar(); })) { setOcupado(false); return; }'],
  // … el estimado no mira la verificación
  ['tresDSecureEnTodos', ES, '    if (!r.ok && V.pide(r, () => { void correr(f, ok); })) return;\n', ''],
  // … «Volver a Pro» vuelve a cobrar al confirmar la hoja
  ['tresDSecureEnTodos', PN, 'V.pide(r, () => { router.refresh(); })', 'V.pide(r, () => { void planSeguir(d.id, t.pm, ciclo); })'],
  // … en sesión manda además el aviso con el enlace
  ['tresDSecureEnTodos', SU, 'if (!enSesion && pide) await', 'if (pide) await'],
  // … la verificación de «Volver a Pro» desde Free no deja Pro activo (el banco cobra y el plan sigue en Free)
  ['tresDSecureEnTodos', SU, '["past_due", "active", "trial", "canceling", "ended"].includes(s.status)', '["past_due", "active", "trial", "canceling"].includes(s.status)'],
  // okPorMas: se manda el peso que pasa lo retenido sin pedir el OK
  ['okPorMas', ME, 'if (pide && paso !== "mas") return no(', 'if (false && pide && paso !== "mas") return no('],
  // … se marca listo sin el OK por lo que pasa
  ['okPorMas', ME, 'if (t.mas > 0) return no(', 'if (t.mas > 1e9) return no('],
  // … «Está bien, cobrar» cobra sin retener lo que falta
  ['okPorMas', ME, 'const r = await retenerMas(userId, o.id, numero, t0.mas);', 'const r = { ok: true as const };'],
  // … el OK por más suelta el cobro en vez de abrir la hoja
  ['okPorMas', ME, 'retenido = null; return bancoPide(ret); }', 'retenido = null; return no("Prueba con otra tarjeta.", "Try another card."); }'],
  // … lo retenido ya no cuenta el OK por más
  ['okPorMas', ME, "p.kind in ('full', 'extra')) as ret,", "p.kind = 'full') as ret,"],
  // … el recordatorio de los 10 min sale en cada barrido
  ['okPorMas', ME, "and not (o.details ? 'rec10') and (o.details->>'weighed_at')", "and (o.details->>'weighed_at')"],
  // … la base deja cobrar de un cobro más de lo retenido
  ['okPorMas', MIG, 'check (held_cents is null or amount_cents <= held_cents) not valid', 'check (true) not valid'],
  // capturaMercado (ampliado): de una retención se cobra más de lo suyo
  ['capturaMercado', ME, 'const monto = Math.min(resto, p.held);', 'const monto = resto;'],
  // sustitutoPorLibra: el sustituto por libra otra vez prohibido
  ['sustitutoPorLibra', ME, '      // 9n-4 · Por libra:', '      if (s.k === "peso") return no("Por ahora el sustituto tiene que ser por unidad (con precio del estante).", "x");\n      // 9n-4 · Por libra:'],
  // … aceptado entra por unidad (sin pesarse)
  ['sustitutoPorLibra', ME, 'cp.p.tax, cp.line, cp.p.lb ?? null]);', 'cp.p.tax, cp.line, null]);'],
  // reponerSinCosto: la reposición se paga en la app
  ['reponerSinCosto', AY, "$7, 0, 0, 0, 'none', now()", "$7, 0, 0, 0, 'app', now()"],
  // … los platos repuestos con su precio
  ['reponerSinCosto', AY, 'values ($1::bigint, $2, $3::jsonb, $4, 0, 0, 0, $5::jsonb, $6)', 'values ($1::bigint, $2, $3::jsonb, $4, 450, 450, 0, $5::jsonb, $6)'],
  // … reponer toca un cobro
  ['reponerSinCosto', AY, "  const num = (await c.query<{ n: string }>(`select nextval('operations_order_seq')", "  await c.query(`select 1 from payments where operation_id = $1::bigint`, [h.op]);\n  const num = (await c.query<{ n: string }>(`select nextval('operations_order_seq')"],
  // … la base deja reponer dos veces la misma solicitud
  ['reponerSinCosto', MIG, 'create unique index if not exists help_requests_repone_uno', 'create index if not exists help_requests_repone_uno'],
  // garantiaSinCargo: la garantía sin que el negocio la aceptara
  ['garantiaSinCargo', VI, "and h.wants = 'reponer' and h.decision = 'ok'", "and h.wants = 'reponer'"],
  // … la visita de garantía con depósito
  ['garantiaSinCargo', VI, 'let dep = quien.cuenta && !warr ?', 'let dep = quien.cuenta ?'],
  // … la visita de garantía con su precio
  ['garantiaSinCargo', VI, 'warr ? 0 : calc.cents, dep, warr ? "none"', 'calc.cents, dep, warr ? "none"'],
  // … la base deja dos garantías por solicitud
  ['garantiaSinCargo', MIG, 'create unique index if not exists help_requests_garantia_una', 'create index if not exists help_requests_garantia_una'],
  // devueltoSeCierra: el plazo fijo en el código
  ['devueltoSeCierra', AC, 'const dias = `${cfgSql("ayuda_devuelto_dias")}`;', 'const dias = "14";'],
  // … el recordatorio en cada barrido
  ['devueltoSeCierra', AC, ' and h.outside_reminded_at is null', ''],
  // … se cierran también las que esperan a To'Latino
  ['devueltoSeCierra', AC, "where o.id = h.operation_id and h.status = 'answered' and h.outside_refund = 'pending' and h.outside_pending_at <= now() - make_interval(days",
    "where o.id = h.operation_id and h.status in ('answered', 'escalated') and h.outside_pending_at <= now() - make_interval(days"],
  // … el aviso dice el lugar
  ['devueltoSeCierra', AC, '{ num: x.hnum, dias: String(x.dias) }', '{ num: x.hnum, dias: String(x.dias), negocio: "b.name" }'],
  // … no corre en el barrido
  ['devueltoSeCierra', BA, '["ayudaDevuelto", async () => (await import("./ayuda-cita")).cerrarDevueltosSinRespuesta()], ', ''],
  // … desde cuándo espera ya no lo pone la base
  ['devueltoSeCierra', MIG, 'then new.outside_pending_at := now(); end if;', 'then null; end if;'],
  // repartoSolo: ofrece solo aunque el negocio no lo encendió
  ['repartoSolo', RA, "where d.auto_offer and coalesce(d.who, 'team') <> 'external'", "where coalesce(d.who, 'team') <> 'external'"],
  // … sin tope de ofertas
  ['repartoSolo', RA, 'if (x.n >= intentos) { await nadie(', 'if (x.n >= 999) { await nadie('],
  // … el recordatorio del programado en cada barrido
  ['repartoSolo', RA, "and not (o.details ? 'rec_prog') ", ''],
  // … ofrece un pedido que ya tiene repartidor
  ['repartoSolo', RA, 'and o.driver_id is null and ', 'and '],
  // … no corre en el barrido
  ['repartoSolo', BA, ', ["repartoSolo", async () => (await import("./repartidor-auto")).asignarSolos()]', ''],
  // recordatorioVisitaPlan: la visita del plan ya no dice su franja
  ['recordatorioVisitaPlan', CF, 'if (k === "rec24" && x.plan && x.franja) await avisarCliente(x.number, "plan_visita", { franja: x.franja });', 'if (false) await avisarCliente(x.number, "plan_visita2", {});'],
  // … el recordatorio deja fuera las citas de $0
  ['recordatorioVisitaPlan', CF, "and not (o.details ? '${k}') and o.scheduled_at", "and o.total_cents > 0 and not (o.details ? '${k}') and o.scheduled_at"],
];
const crear = [
  // tresDSecureEnTodos: un cobro nuevo con la persona en la app sin quien paga
  ['tresDSecureEnTodos', 'apps/web/lib/zz9n4.ts', 'import { pasarela } from "./pagos/pasarela";\nexport const x = () => pasarela.retener({ centavos: 100, comision: 0, destino: "acct_x", pm: "pm_x", idem: "zz9n4-x", meta: {} });\n'],
  // … un flujo nuevo que suelta el cobro cuando el banco pide verificar
  ['tresDSecureEnTodos', 'apps/web/lib/zz9n4b.ts', 'import { pasarela } from "./pagos/pasarela";\nexport async function x(ret: { estado: string; pi: string }) {\n  if (ret.estado === "accion") { await pasarela.liberar(ret.pi); return "otra tarjeta"; }\n}\n'],
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
  const ruta = path.join(R, f);
  fs.writeFileSync(ruta, c);
  let r; try { r = correr(g); } finally { fs.unlinkSync(ruta); }
  informe(g, `crear ${f.split('/').slice(-2).join('/')}`, r);
}
let limpio = require('../lib/alreves-fin.cjs')(R, { mostrar: true });
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
