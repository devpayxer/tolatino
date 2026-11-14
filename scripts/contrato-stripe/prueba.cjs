/* Contrato con Stripe: el código real de la pasarela (no el simulador) contra stripe-mock, que valida cada llamada contra
   la especificación oficial de la API (rutas, parámetros y tipos). Si mandamos un parámetro que Stripe no acepta, falla. */
process.env.STRIPE_SECRET_KEY = 'sk_test_123';
process.env.STRIPE_API_BASE = process.env.STRIPE_API_BASE || 'http://127.0.0.1:12111';
const { pasarela, evidenciaStripe } = require(process.env.CONTRATO_OUT + '/pagos/pasarela.js');
const { formulario, firmaValida } = require(process.env.CONTRATO_OUT + '/pagos/stripe.js');
const crypto = require('crypto');
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
(async () => {
  ok(pasarela.modo() === 'stripe', 'con clave: modo Stripe');
  ok(formulario({ a: { b: 1 }, c: ['x', 'y'], d: [{ e: 2 }] }).join('&') === 'a%5Bb%5D=1&c%5B0%5D=x&c%5B1%5D=y&d%5B0%5D%5Be%5D=2', 'codifica objetos anidados como Stripe');
  const acct = await pasarela.cuentaCrear('sabor-dominicano', 'Sabor Dominicano'); ok(/^acct_/.test(acct), 'crear cuenta Express (accounts)');
  const link = await pasarela.cuentaEnlace(acct, 'https://pruebas.tolatino.com/panel/x/cobros?vuelta=1', 'https://pruebas.tolatino.com/panel/x/cobros?otra=1'); ok(/^https?:/.test(link), 'enlace de alta (account_links)');
  const login = await pasarela.cuentaPanel(acct); ok(/^https?:/.test(login), 'panel de Stripe (login_links)');
  const e = await pasarela.cuentaLeer(acct); ok(e && typeof e.cargos === 'boolean' && Array.isArray(e.pide), 'leer estado de la cuenta');
  ok(await pasarela.cuentaPagos(acct, true), 'pausar pagos al banco: calendario manual (accounts)');
  ok(await pasarela.cuentaPagos(acct, false), 'reanudar pagos: semanal los martes (accounts)');
  const dir = await pasarela.cobrarDirecto({ centavos: 1499, pm: 'pm_card_visa', cliente: null, idem: 'contrato-pro-' + Date.now(), meta: { business_id: 'sabor-dominicano', kind: 'pro' } });
  ok(dir.ok || /requires_/.test(dir.codigo), 'cobro de Pro: payment_intents off_session con confirm (parámetros válidos)');
  const r = await pasarela.retener({ centavos: 2500, comision: 220, destino: acct, pm: 'pm_card_visa', cliente: null, idem: 'contrato-' + Date.now(), meta: { order: '1001', business_id: 'sabor-dominicano' } });
  // stripe-mock no guarda estado: responde «requires_payment_method»; lo que importa es que aceptó cada parámetro.
  ok(r.ok || r.codigo === 'requires_payment_method', 'retener: payment_intents con captura manual, comisión y destino (parámetros válidos)');
  const rf = await pasarela.retener({ centavos: 2500, comision: 220, destino: acct, pm: 'pm_card_visa', cliente: null, idem: 'contrato-fuera-' + Date.now(), meta: { appointment: 'C-1', business_id: 'plomeria-rodriguez', kind: 'estimate' }, fuera: true });
  ok(rf.ok || /requires_/.test(rf.codigo), 'renovar fuera de sesión: off_session con captura manual (parámetros válidos)');
  const cf = await pasarela.cobrarFuera({ centavos: 14900, comision: 1192, destino: acct, pm: 'pm_card_visa', cliente: null, idem: 'contrato-plan-' + Date.now(), meta: { plan: 'PL-1', business_id: 'hermanos-diaz-multiservicios' } });
  ok(cf.ok || /requires_|succeeded/.test(cf.codigo), 'plan: cobro fuera de sesión con comisión y destino (parámetros válidos)');
  // 6c · Boletos: cobro en la plataforma con transfer_group (sin destino ni comisión) y captura sin comisión.
  const rp = await pasarela.retenerPlataforma({ centavos: 3000, pm: 'pm_card_visa', cliente: null, idem: 'contrato-bol-' + Date.now(), grupo: 'evt-2', meta: { order: 'B-9401', event_id: '2', business_id: 'la-terraza-night' } });
  ok(rp.ok || /requires_/.test(rp.codigo), 'boletos: payment_intents con captura manual y transfer_group, sin destino (parámetros válidos)');
  const cp = await pasarela.capturarPlataforma(rp.ok ? rp.pi : 'pi_123', 3000); ok(cp.ok, 'boletos: capture sin comisión');
  const pi = r.ok ? r.pi : 'pi_123';
  const c = await pasarela.cobrar(pi, 2500, 220); ok(c.ok, 'cobrar: capture con comisión');
  const l = await pasarela.liberar(pi); ok(l.ok, 'liberar: cancel');
  const d = await pasarela.devolver(pi, 500, 'contrato-' + Date.now()); ok(d.ok && /^re_/.test(d.id), 'devolver: refunds con reverse_transfer y refund_application_fee');
  // 6d · Boletos: devolver un cobro de la plataforma (sin transferencia ni comisión de destino que revertir).
  const dvp = await pasarela.devolver(rp.ok ? rp.pi : 'pi_123', 500, 'contrato-bol-' + Date.now(), { plataforma: true }); ok(dvp.ok && /^re_/.test(dvp.id), 'boletos: refunds de un cobro de la plataforma (sin reverse_transfer)');
  // 6e · La liquidación del martes: transferir lo del organizador a su cuenta conectada (transfers, con transfer_group e idempotencia)
  // y revertir parte de una transferencia (transfers/{id}/reversals) cuando un ajuste no tiene liquidación siguiente.
  const tr = await pasarela.transferir({ centavos: 6350, destino: acct, grupo: 'evt-2', idem: 'evt-liq-' + Date.now(), meta: { event_date_id: '1', business_id: 'la-terraza-night' } });
  ok(tr.ok && /^tr_/.test(tr.id), 'liquidación: transfers con destino, transfer_group y metadatos');
  const rv = await pasarela.revertirTransferencia(tr.ok ? tr.id : 'tr_123', 500, 'evt-rev-1-' + Date.now());
  ok(rv.ok && /^trr_/.test(rv.id), 'liquidación: revertir parte de una transferencia (transfers/{id}/reversals)');
  ok(await pasarela.disputaResponder('dp_123', { texto: 'Delivered as ordered.', producto: '1 x Mofongo', cliente: 'Marisol P', fecha: '2026-11-06', envio: '420 N Wyoming St, 18201' }), 'disputa: responder con evidencia (disputes, submit)');
  ok(await pasarela.disputaAceptar('dp_123'), 'disputa: aceptar (disputes/close)');
  const dp = await (await fetch(process.env.STRIPE_API_BASE + '/v1/disputes/dp_123', { headers: { authorization: 'Bearer sk_test_123' } })).json();
  const nuestros = Object.keys(evidenciaStripe({ texto: 'x', producto: 'x', cliente: 'x', fecha: 'x', envio: 'x' })), deStripe = Object.keys(dp.evidence || {});
  ok(deStripe.length > 10 && nuestros.every((k) => deStripe.includes(k)), 'disputa: cada campo de evidencia existe en la especificación (' + nuestros.join(', ') + ')');
  // 9k · El cliente de Stripe de una persona (L817): con el doble de la base, la primera vez se crea (customers) y se guarda; la segunda se lee de la base.
  const { __clientes } = require(process.env.CONTRATO_OUT + '/db.js');
  const c1 = await pasarela.cliente('00000000-0000-4000-8000-000000000001'); ok(/^cus_/.test(c1) && __clientes.get('00000000-0000-4000-8000-000000000001') === c1, 'cliente: customers con metadatos, guardado en la base');
  ok((await pasarela.cliente('00000000-0000-4000-8000-000000000001')) === c1, 'cliente: la segunda vez sale de la base, sin crear otro');
  // 9k · 3-D Secure: el estado de un PaymentIntent (después de la verificación) y su tarjeta con la huella.
  const it = await pasarela.intento('pi_123'); ok(it && typeof it.estado === 'string' && typeof it.monto === 'number', 'intento: payment_intents/{id} con expand de la tarjeta (huella)');
  // 9k · La huella de una tarjeta guardada (card.fingerprint): payment_methods/{id}.
  const hu = await pasarela.huella('pm_card_visa_123'); ok(hu === null || typeof hu === 'string', 'huella: payment_methods/{id} (card.fingerprint)');
  // 9k · La conciliación del día: payment_intents, refunds, transfers y disputes con created[gte|lt] y paginación, y payouts de una cuenta conectada.
  const dd = await pasarela.delDia(new Date(Date.now() - 86400000), new Date(), [acct]);
  ok(Array.isArray(dd.intents) && Array.isArray(dd.refunds) && Array.isArray(dd.transfers) && Array.isArray(dd.payouts) && Array.isArray(dd.disputes), 'conciliación: listas del día (created) y payouts con Stripe-Account');
  // 9k · Evidencia de una disputa en archivo (API de archivos, purpose dispute_evidence) y en el envío (receipt, customer_communication, shipping_documentation).
  const up = await pasarela.subirEvidencia({ cuerpo: Buffer.from('%PDF-1.4\n%%EOF\n'), nombre: 'recibo.pdf', tipo: 'application/pdf', idem: 'contrato-file-' + Date.now(), sim: false });
  ok(up.ok && /^file_/.test(up.id), 'disputa: subir un archivo de evidencia (files, multipart)');
  ok(await pasarela.disputaResponder('dp_123', { texto: 'Delivered as ordered.', producto: '1 x Mofongo', cliente: 'Marisol P', fecha: '2026-11-06', envio: '420 N Wyoming St, 18201', archivos: { recibo: up.ok ? up.id : 'file_123', conversacion: 'file_123', entrega: 'file_123' } }), 'disputa: responder con archivos de evidencia (receipt, customer_communication, shipping_documentation)');
  const ev2 = Object.keys(evidenciaStripe({ texto: 'x', producto: 'x', cliente: 'x', fecha: 'x', envio: 'x', archivos: { recibo: 'file_1', conversacion: 'file_2', entrega: 'file_3', otro: 'file_4' } }));
  ok(ev2.every((k) => deStripe.includes(k)), 'disputa: los campos de archivos existen en la especificación (' + ev2.filter((k) => !nuestros.includes(k)).join(', ') + ')');
  const t = Math.floor(Date.now() / 1000), cuerpo = '{"id":"evt_1"}', s = `t=${t},v1=${crypto.createHmac('sha256', 'whsec_x').update(`${t}.${cuerpo}`).digest('hex')}`;
  ok(firmaValida(cuerpo, s, 'whsec_x') && !firmaValida(cuerpo, s, 'whsec_y') && !firmaValida(cuerpo + ' ', s, 'whsec_x'), 'firma del webhook: buena pasa, otro secreto o cuerpo cambiado no');
  console.log('OK');
})().catch((e) => { console.error(e); process.exit(1); });
