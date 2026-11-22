// Prueba al revés de 0209 (22 nov) · «Devolver otra vez» unos boletos desde su alerta y la carrera de «Resolver a mano» mientras el barrido la manda
// (guardianes devolverOtraVezUnaVez y manoTrasEnvioReciente). Cada caso deshace un arreglo a propósito y el guardián tiene que fallar con SU mensaje; después
// se restaura y los guardianes quedan limpios:
//   manoTrasEnvioReciente: la base sin la regla de los minutos (o con otros minutos que la app), sin el trigger en una de las cuatro, un envío que no anota
//   el último envío (por clase, en cualquier archivo de lib/), la pantalla que ofrece el botón en ese rato, notaAlerta que traga el error;
//   devolverOtraVezUnaVez: sin el índice único, el trigger sin cada una de sus reglas, la llave o el monto que vienen de la pantalla, la auditoría después de
//   Stripe, otro permiso, el cierre y la reapertura de la alerta de antes, el botón sin que lo ofrezca el servidor.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const MG = 'packages/db/migrations/0209_devolver_otra_vez_y_envio_reciente.sql', DA = 'apps/web/lib/dinero-alertas.ts', CB = 'apps/web/lib/cobros.ts';
const PA = 'apps/web/lib/patrocinio.ts', RV = 'apps/web/lib/revision-pasarela.ts', AT = 'apps/web/app/admin/acciones-tx.ts', PT = 'apps/web/app/admin/Planes.tsx';
const M = 'manoTrasEnvioReciente', O = 'devolverOtraVezUnaVez';
const casos = [
  // (b) La base
  [M, MG, "old.last_sent_at > now() - interval '10 minutes' then", "old.last_sent_at > now() - interval '1 minutes' then", 'siguientes a su último envío'],
  [M, MG, "  if new.manual_at is not null and old.manual_at is null and old.status = 'pending' and old.last_sent_at > now() - interval '10 minutes' then\n", "  if false then\n", 'siguientes a su último envío'],
  [M, MG, "  if tg_op = 'INSERT' then new.last_sent_at := null; return new; end if;\n", "  if tg_op = 'INSERT' then return new; end if;\n", 'hacia adelante'],
  [M, MG, "create trigger gateway_refunds_envio_reciente before insert or update on gateway_refunds for each row execute function dinero_envio_reciente();\n", '', 'gateway_refunds: sin el trigger'],
  [M, MG, "create trigger sponsorship_refunds_envio_reciente before insert or update on sponsorship_refunds for each row execute function dinero_envio_reciente();\n", '', 'sponsorship_refunds: sin el trigger'],
  // (b) Por clase: un envío que no anota el último
  [M, PA, "sent_at = coalesce(sent_at, now()), last_sent_at = now() where id = $1::bigint", "sent_at = coalesce(sent_at, now()) where id = $1::bigint", 'sponsorship_refunds: anota que se manda pero no el último envío'],
  [M, RV, "sent_at = coalesce(sent_at, now()), last_sent_at = now() where id = $1::bigint", "sent_at = coalesce(sent_at, now()) where id = $1::bigint", 'gateway_refunds: anota que se manda pero no el último envío'],
  [M, CB, "sent_at = coalesce(sent_at, now()), last_sent_at = now() where id = $1::bigint", "sent_at = coalesce(sent_at, now()) where id = $1::bigint", 'refunds: anota que se manda pero no el último envío'],
  // (b) La app
  [M, DA, 'export const MINUTOS_ENVIO_MANO = 10;', 'export const MINUTOS_ENVIO_MANO = 5;', 'siguientes a su último envío'],
  [M, DA, 'aMano: mano && ult !== "resuelta_a_mano" && !reciente', 'aMano: mano && ult !== "resuelta_a_mano"', 'alertasDinero no ofrece «Resolver a mano»'],
  [M, DA, "when a.kind = 'extra_refund_stuck' then exists (select 1 from gateway_refunds z where z.id = a.subject_id::bigint and z.status = 'pending' and z.last_sent_at > now() - interval '10 minutes')", "when a.kind = 'extra_refund_stuck' then false", 'alertasDinero no ofrece «Resolver a mano»'],
  [M, DA, "    if (/dinero_a_mano_reciente/.test(String((e as Error)?.message ?? \"\"))) return `Se mandó", "    if (/x/.test(String((e as Error)?.message ?? \"\"))) return `Se mandó", 'notaAlerta dice que espere'],
  [M, DA, '    throw e;\n  });\n  return r === "ok"', '    return "error";\n  });\n  return r === "ok"', 'notaAlerta dice que espere'],
  // (a) La base
  [O, MG, 'create unique index if not exists refunds_otra_vez_uq on refunds (retry_of) where retry_of is not null;', 'create index if not exists refunds_otra_vez_uq on refunds (retry_of) where retry_of is not null;', 'una sola devolución de otra vez por fallida'],
  [O, MG, "    if f.status <> 'failed' or f.manual_at is not null then raise exception", "    if f.manual_at is not null then raise exception", 'solo de una fallida sin resolver a mano'],
  [O, MG, "    if f.payment_id <> new.payment_id or f.amount_cents <> new.amount_cents then raise exception", "    if f.payment_id <> new.payment_id then raise exception", 'del mismo cobro y por el mismo monto'],
  [O, MG, "    if new.initiated_by <> 'admin' or new.actor_id is null then raise exception", "    if new.actor_id is null then raise exception", 'la pide una persona del equipo'],
  [O, MG, "    if not exists (select 1 from ticket_refund_lines l where l.refund_id = new.lines_of) then raise exception 'otra_vez: solo devoluciones de boletos'; end if;\n", '', 'solo devoluciones de boletos'],
  [O, MG, "d.status in ('needs_response', 'under_review', 'lost', 'accepted')) then\n      raise exception 'otra_vez: el cobro tiene una disputa", "d.status in ('needs_response')) then\n      raise exception 'otra_vez: el cobro tiene una disputa", 'sin disputa con el banco'],
  [O, MG, "    new.lines_of := null;\n", '', 'lines_of solo lo pone la base'],
  [O, MG, "  if old.status = 'failed' and new.status <> 'failed' and exists (select 1 from refunds x where x.retry_of = old.id) then\n", "  if false then\n", 'la fallida que ya tiene la suya sigue fallida'],
  // (a) La app
  [O, DA, 'idem: `bol-otra-${a.sujeto}`, otraVezDe: a.sujeto', 'idem: `bol-otra-${a.sujeto}-${Date.now()}`, otraVezDe: a.sujeto', 'la llave sale de la devolución fallida'],
  [O, DA, 'centavos: a.amt!, por: "admin"', 'centavos: Math.round(parseFloat(n) * 100), por: "admin"', 'el monto es el de la devolución fallida'],
  [O, DA, 'action: "dinero.alerta.devolver_otra_vez"', 'action: "dinero.alerta.otra"', 'la auditoría de quien la pide entra en la transacción'],
  [O, DA, '  const d = await ejecutarDevolucionPago(rid);\n', '', 'la auditoría de quien la pide entra en la transacción'],
  [O, AT, '  if (!s || !s.puede("tx", "aprobar")) return { ok: false, mensaje: "Tu rol no devuelve dinero." };\n  const r = await (await import("@/lib/dinero-alertas")).devolverOtraVez', '  if (!s || !s.puede("tx", "ver")) return { ok: false, mensaje: "Tu rol no devuelve dinero." };\n  const r = await (await import("@/lib/dinero-alertas")).devolverOtraVez', 'el mismo permiso que Transacciones › Devolver'],
  [O, CB, '  if (h.otra) await (await import("./dinero-alertas")).cerrarAlertaSola("refund_failed", h.otra,', '  if (h.otra) await (await import("./dinero-alertas")).cerrarAlertaSola("refund_stuck", h.otra,', 'cierra la alerta de la fallida de antes'],
  [O, CB, '    await reabrirOtraVez(f.otra, r.id).catch(() => false);\n', '', 'trae su propia refund_failed y reabre la de antes'],
  [O, CB, '    if (h.otra) await (await import("./dinero-alertas")).reabrirOtraVez(h.otra, h.id).catch(() => false);\n', '', 'reabre la alerta de antes'],
  [O, PT, '...(a.otraVez ? [{ l: E("Devolver otra vez", "Refund again")', '...(a.kind === "refund_failed" ? [{ l: E("Devolver otra vez", "Refund again")', 'solo cuando el servidor lo ofrece'],
];
const soloTextos = !!process.env.ALREVES_SOLO_TEXTOS;
let bien = 0, total = 0;
const correr = (g) => {
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); return []; }
  catch (e) { return String(e.stderr).split('\n').filter((x) => x.trim().startsWith(`[${g}]`)); }
};
const informe = (g, que, msg, lineas) => {
  total++;
  const l = soloTextos ? lineas[0] : lineas.find((x) => x.includes(msg));
  console.log(`  ${l ? '✓' : '✗'} ${g} al revés (${que}: «${msg}»)${l ? ' → ' + l.trim().slice(0, 200) : lineas.length ? ' → otro mensaje: ' + lineas[0].trim().slice(0, 160) : ' → el guardián no falló'}`);
  if (l) bien++;
};
for (const [G, f, a, b, msg] of casos) {
  const ruta = path.join(R, f);
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ ${G}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  try { informe(G, path.basename(f), msg, correr(G)); } finally { fs.writeFileSync(ruta, orig); }
}
let limpio = true;
if (!require('../lib/alreves-fin.cjs')(R)) limpio = false;
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
