// Prueba al revés de los guardianes de 9k (dinero real listo: conciliación diaria, 3-D Secure, la huella de la tarjeta, las alertas del dinero, las
// disputas con evidencia, los pagos al banco del martes, devolver repartido y el simulador en un solo lugar). Se inyecta el defecto, el guardián debe
// fallar con SU mensaje ([nombre]); se restaura. «crear»: se crea el archivo, se corre y se borra.
const ENT = require('../lib/entorno.cjs'); // rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const M = 'packages/db/migrations/0141_conciliacion.sql', BA = 'apps/web/lib/barrido.ts', CO = 'apps/web/lib/conciliacion.ts', PA = 'apps/web/lib/pagos/pasarela.ts',
  VE = 'apps/web/lib/pagos/verificacion.ts', PE = 'apps/web/lib/pedir.ts', CB = 'apps/web/lib/cobros.ts', SU = 'apps/web/lib/suscripcion.ts', AL = 'apps/web/lib/dinero-alertas.ts',
  DI = 'apps/web/lib/disputas.ts', BO = 'apps/web/lib/boletos.ts', BD = 'apps/web/lib/boletos-despues.ts', LQ = 'apps/web/lib/evt-liquidacion.ts', WH = 'apps/web/app/api/stripe/webhook/route.ts',
  AC = 'apps/web/app/(app)/pago/acciones.ts', PG = 'apps/web/app/(app)/n/[id]/pagar/Pagar.tsx', TX = 'apps/web/app/admin/acciones-tx.ts', HO = 'apps/web/app/admin/page.tsx',
  CF = 'apps/web/lib/admin-confianza.ts', MAPA = 'packages/db/mapa-de-datos.json', CS = 'scripts/contrato-stripe/correr.sh', CP = 'scripts/contrato-stripe/prueba.cjs';
const casos = [
  // conciliacionDiaria: el barrido deja de conciliar ayer, o el vigilante no corre
  ['conciliacionDiaria', BA, '["conciliacion", async () => (await import("./conciliacion")).conciliarAyer()], ', ''],
  ['conciliacionDiaria', BA, ' ["conciliacionVigilar", async () => (await import("./conciliacion")).vigilarConciliacion()],', ''],
  // … la conciliación deja de mirar las retenciones sueltas o los payouts de Stripe
  ['conciliacionDiaria', CO, 'if (i.estado === "requires_capture") { dif({ kind: "hold_orphan"', 'if (i.estado === "requires_capture") { dif({ kind: "payment_intent"'],
  ['conciliacionDiaria', CO, '  for (const p of st.payouts) {', '  for (const p of [] as LadoStripe["payouts"]) {'],
  // … una diferencia sin dueño ya no avisa al instante
  ['conciliacionDiaria', CO, 'if (r.sinDueno > 0 || r.estado === "fallo") await (await import("./dinero-alertas")).alertar(', 'if (false) await (await import("./dinero-alertas")).alertar('],
  // … las diferencias dejan de ser de solo inserción, o la base deja de revisar el número de diferencias
  ['conciliacionDiaria', M, 'create trigger recon_diffs_no_cambia before update or delete on recon_diffs for each row execute function dinero_solo_insercion();', ''],
  ['conciliacionDiaria', M, 'create constraint trigger recon_runs_cuadra after insert on recon_runs deferrable initially deferred', 'create constraint trigger recon_runs_cuadra after update on recon_runs deferrable initially deferred'],
  // … el Inicio deja de decir «el dinero no cuadra»
  ['conciliacionDiaria', HO, 'EL DINERO NO CUADRA', 'DIFERENCIAS'],
  // tresDSecure: la pasarela deja de reusar la verificación (cobraría otra vez), o el simulador da por retenido un «requires_action»
  ['tresDSecure', PA, '    const v = await this.verificacionPrevia(x.idem, !!x.usuario);\n    if (v && "r" in v) return v.r;\n    const idem = v?.idem ?? x.idem;\n    if (modoPago() === "simulador") {\n      const m = SIM_PM.exec(x.pm);\n      if (!m) return { ok: false, codigo: "card_declined", mensaje: { es: "Esa tarjeta no es de prueba. En el sandbox usa 4242 4242 4242 4242.", en: "That is not a test card. In the sandbox use 4242 4242 4242 4242." } };\n      const id = `pi_sim_${idem}`, h = huellaSim(m[1]!, m[2]!);\n      const ya = (await db().query<{ id: string; status: string }>', '    const idem = x.idem;\n    if (modoPago() === "simulador") {\n      const m = SIM_PM.exec(x.pm);\n      if (!m) return { ok: false, codigo: "card_declined", mensaje: { es: "Esa tarjeta no es de prueba. En el sandbox usa 4242 4242 4242 4242.", en: "That is not a test card. In the sandbox use 4242 4242 4242 4242." } };\n      const id = `pi_sim_${idem}`, h = huellaSim(m[1]!, m[2]!);\n      const ya = (await db().query<{ id: string; status: string }>'],
  ['tresDSecure', PA, '      if (ya && ya.status !== "requires_action") return ya.status === "failed" ? { ok: false, codigo: "card_declined", mensaje: traducir("card_declined") } : { ok: true, pi: ya.id, estado: "retenido"', '      if (ya) return ya.status === "failed" ? { ok: false, codigo: "card_declined", mensaje: traducir("card_declined") } : { ok: true, pi: ya.id, estado: "retenido"'],
  // … el pedido vuelve a soltar el cobro y pedir otra tarjeta, o la pantalla deja de abrir la hoja
  ['tresDSecure', PE, 'const v = (await import("./pagos/verificacion")).pideVerificar(ret);', 'const v = null as null | { verificar: never };'],
  ['tresDSecure', PG, '      {V.hoja}\n', ''],
  // … otra persona podría completar la verificación, o el servidor le cree a la pantalla
  ['tresDSecure', VE, 'if (!a || a.user_id !== userId) return { ok: false, msg: { es: "Esa verificación no existe.", en: "That verification does not exist." } };', 'if (!a) return { ok: false, msg: { es: "Esa verificación no existe.", en: "That verification does not exist." } };'],
  // … la renovación de Pro cobra otra vez sin mirar la verificación vieja
  ['tresDSecure', SU, '  if (await soltarVerificaciones(s.business_id)) return { ok: true };\n', ''],
  // … retenerPedido deja de pasar quien paga
  ['tresDSecure', CB, ', usuario: { id: x.userId, negocio: x.negocio } });', ' });'],
  // huellaDeTarjeta: guardar una tarjeta sin su huella; el máximo de boletos sin la huella; la purga deja la huella
  ['huellaDeTarjeta', AC, 'insert into payment_methods (user_id, stripe_pm_id, brand, last4, exp, is_default, simulated, card_fingerprint) values ($1, $2, $3, $4, $5, $6, $7, $8)', 'insert into payment_methods (user_id, stripe_pm_id, brand, last4, exp, is_default, simulated) values ($1, $2, $3, $4, $5, $6, $7)'],
  ['huellaDeTarjeta', BO, 'entradasDe(c, h.fid, userId, dev, pm, holdId, await pasarela.huella(pm))', 'entradasDe(c, h.fid, userId, dev, pm, holdId)'],
  ['huellaDeTarjeta', MAPA, '"is_default": "false", "card_fingerprint": "null" }', '"is_default": "false" }'],
  ['huellaDeTarjeta', CF, "tarjetas_en_varias_cuentas(cfg_int('tarjeta_cuentas_senal'), 90)", 'tarjetas_en_varias_cuentas(3, 90)'],
  // alertasDelDinero: sin la alerta de la devolución atascada; la alerta se repite; el reintento vuelve a pedir a Stripe lo resuelto a mano
  ['alertasDelDinero', AL, 'if (await alertar("refund_stuck", r.id,', 'if (r.id === "" && await alertar("refund-stuck", r.id,'],
  ['alertasDelDinero', AL, 'on conflict (kind, subject_id) do nothing returning id::text', 'returning id::text'],
  ['alertasDelDinero', BD, '  if (r.mano) return false;\n', ''],
  ['alertasDelDinero', LQ, "status = 'pending' and manual_at is null and created_at", "status = 'pending' and created_at"],
  ['alertasDelDinero', M, "create trigger refunds_a_mano before update on refunds for each row execute function dinero_a_mano();", ''],
  // disputaConEvidencia: la cola vuelve a 168 h; responder sin subir los archivos; un archivo que no sube y se envía igual; evidencia que se cambia
  ['disputaConEvidencia', 'apps/web/lib/colas.ts', 'icon: "card", sla: 120,', 'icon: "card", sla: 168,'],
  ['disputaConEvidencia', DI, 'archivos: { recibo: archivos.recibo, conversacion: archivos.conversacion, entrega: archivos.entrega, otro: archivos.foto_entrega } });', '});'],
  ['disputaConEvidencia', DI, '      if (!up.ok) return { ok: false, msg: "Stripe no aceptó un archivo de la evidencia. No se envió nada; inténtalo otra vez." };\n', ''],
  ['disputaConEvidencia', M, "raise exception 'de la evidencia solo cambia, una vez, su archivo en Stripe y cuándo se envió';", 'return new;'],
  // pagoAlBancoMartes: la cuenta nueva sin el martes; el webhook sin payouts; la Configuración se puede cambiar
  ['pagoAlBancoMartes', PA, '      settings: { payouts: { schedule: { interval: "weekly", weekly_anchor: "tuesday" } } },\n', ''],
  ['pagoAlBancoMartes', WH, '    case "payout.paid":\n', ''],
  ['pagoAlBancoMartes', M, `    false, '{"es":"Fijo los martes por decisión del fundador.","en":"Fixed on Tuesdays by founder decision."}', null, 950),`, `    true, null, null, 950),`],
  // devolverRepartido: una sola llave para todas las partes; Transacciones vuelve a devolver de un solo cobro
  ['devolverRepartido', CB, 'idem: `${x.idem}-p${p.id}` });', 'idem: x.idem });'],
  ['devolverRepartido', TX, 'const r = await devolverOperacion({ opId: o.id, centavos: cents, kinds: KINDS[o.kind]!, por: "admin", actorId: s.id, motivo: String(motivo ?? "").trim(), idem: `adm-${clave}` });', 'const r = await (await import("@/lib/cobros")).devolverPago({ paymentId: o.id, centavos: cents, por: "admin", actorId: s.id, motivo: String(motivo ?? "").trim(), idem: `adm-${clave}` }) as { ok: true; partes: number } | { ok: false; msg: { es: string; en: string } };'],
  // contratoCubreLaPasarela (ampliado): el contrato vuelve a correr sin el doble de la base, o deja de probar la huella
  ['contratoCubreLaPasarela', CS, 'const clientes = new Map<string, string | null>();', 'const otros = new Map<string, string | null>();'],
  ['contratoCubreLaPasarela', CP, "const hu = await pasarela.huella('pm_card_visa_123');", "const hu = null;"],
  // dineroDelServidor (ampliado): verificar el pago recibe un monto desde la pantalla
  ['dineroDelServidor', AC, 'export async function verificarPago(pi: string)', 'export async function verificarPago(pi: string, monto_cents: number)'],
];
const crear = [
  // conciliacionDiaria: otra parte de la app escribe la conciliación
  ['conciliacionDiaria', 'apps/web/lib/zz9kconc.ts', 'import { db } from "./db";\nexport const x = () => db().query(`update recon_diffs set diff_cents = 0 where id = 1`);\n'],
  // simuladorDeDinero: otra parte de la app lee el «Stripe» del sandbox
  ['simuladorDeDinero', 'apps/web/lib/zz9ksim.ts', 'import { db } from "./db";\nexport const x = () => db().query(`select sum(amount_cents) from sim_payouts`);\n'],
];
let bien = 0, total = 0;
const correr = (g, env = {}) => {
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe', env: { ...process.env, ...env } }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${g}]`)) ?? ''; return [!!l, l]; }
};
const informe = (g, que, [falla, out]) => { total++; console.log(`  ${falla ? '✓' : '✗'} ${g} al revés (${que})${out ? ' → ' + out.trim().slice(0, 170) : ''}`); if (falla) bien++; };
for (const [g, f, a, b, env] of casos) {
  const ruta = path.join(R, f);
  if (!fs.existsSync(ruta)) { total++; console.log(`  ✗ ${g}: no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ ${g}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let r; try { r = correr(g, env); } finally { fs.writeFileSync(ruta, orig); }
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
process.exit(bien === total && limpio ? 0 : 1);
