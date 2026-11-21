import "server-only";
import type { Staff } from "./admin";
import { db, tx } from "./db";

/* 9k · Las alertas del dinero que Stripe nunca hace (L800, L821, L357, L393; fase9-apertura.md §4 9k):
   - refund_stuck: una devolución que Stripe sigue rechazando (tarjeta cerrada, cuenta con disputa) pasado dinero_alerta_intentos;
   - transfer_reversal_stuck: revertir una transferencia al organizador que no tiene saldo, pasado el mismo número de intentos;
   - dispute_due: una disputa sin responder a disputa_alerta_dias del plazo del banco;
   - payout_failed: un pago al banco que falló;
   - recon_diff / recon_no_corrio: la conciliación del día con diferencias sin dueño, o que no corrió o falló (lib/conciliacion.ts).
   Una alerta por tipo y objeto (money_alerts, solo inserción: dos barridos no avisan dos veces) y el aviso al equipo de dinero (Admin y Finanzas). Quién se
   hizo cargo y cómo se resolvió va en money_alert_notes (solo inserción). El camino manual: una devolución o una reversión atascada se resuelve fuera de
   Stripe con su nota (refunds / event_settlement_reversals.manual_*: el barrido deja de reintentarla y sigue contando como hecha; la base lo impone). */
/* 9t2 (0198) · refund_failed: una devolución hecha que Stripe dio por fallida después (webhook charge.refund.updated); charge_unapplied: un cobro
   de Pro que salió mientras el plan cambiaba (no se pisó el cambio: el equipo de dinero decide si se devuelve). */
/* 9t3 (0199) · transfer_stuck: la transferencia al organizador lleva HORAS_LLAVE en camino sin un «sí» de Stripe (ya no se pide otra vez con la
   misma llave); charge_stuck: un cobro de Pro anotado que lleva HORAS_LLAVE sin respuesta de Stripe (no se cobra otra vez). Las dos, para mirar en Stripe. */
/* 9t4 (0202) · offsession_stuck: un cobro con tarjeta guardada (plan del Hogar, renta, renovación de un patrocinio) anotado que lleva HORAS_LLAVE sin
   respuesta de Stripe (no se cobra otra vez); offsession_unapplied: uno que salió cuando lo que pagaba ya había cambiado (no se aplicó: el equipo decide si
   se devuelve). lib/cobro-fuera.ts. */
/* 9t5 (0203) · charge_stuck, offsession_stuck y transfer_stuck ya no se quedan para siempre: el barrido (y «Preguntar a Stripe ahora») le pregunta a la
   pasarela y la intención se cierra con lo que dijo (lib/consulta-pasarela.ts); la alerta se cierra sola (nota 'resuelta_sola', sin persona) cuando la
   intención deja de estar en camino, y muestra qué dijo la última consulta y cuándo. gateway_review: la consulta encontró algo que no se cierra solo (varios
   objetos para una intención, otro monto, un cobro de Pro de un período ya cobrado). */
export type TipoAlerta = "refund_stuck" | "transfer_reversal_stuck" | "dispute_due" | "recon_diff" | "recon_no_corrio" | "payout_failed" | "refund_failed" | "charge_unapplied"
  | "transfer_stuck" | "charge_stuck" | "offsession_stuck" | "offsession_unapplied" | "gateway_review";
type Bi = { es: string; en: string };
const QUE: Record<TipoAlerta, Bi> = {
  refund_stuck: { es: "una devolución atascada", en: "a stuck refund" }, transfer_reversal_stuck: { es: "una transferencia sin saldo para revertir", en: "a transfer that cannot be reversed" },
  dispute_due: { es: "una disputa por vencer", en: "a dispute about to expire" }, recon_diff: { es: "el dinero no cuadra", en: "money does not match" },
  recon_no_corrio: { es: "la conciliación no corrió", en: "reconciliation did not run" }, payout_failed: { es: "un pago al banco falló", en: "a bank payout failed" },
  refund_failed: { es: "una devolución que Stripe dio por fallida", en: "a refund Stripe marked as failed" }, charge_unapplied: { es: "un cobro de Pro sin aplicar", en: "an unapplied Pro charge" },
  transfer_stuck: { es: "una transferencia al organizador sin respuesta", en: "an organizer transfer with no answer" }, charge_stuck: { es: "un cobro de Pro sin respuesta", en: "a Pro charge with no answer" },
  offsession_stuck: { es: "un cobro con tarjeta guardada sin respuesta", en: "a saved-card charge with no answer" },
  offsession_unapplied: { es: "un cobro con tarjeta guardada sin aplicar", en: "an unapplied saved-card charge" },
  gateway_review: { es: "lo que dijo Stripe no se cierra solo", en: "what Stripe said does not close by itself" },
};
const money = (c: number) => `$${(c / 100).toFixed(2)}`;

/* Anota la alerta (una vez) y, si es nueva, avisa al equipo de dinero. */
export async function alertar(kind: TipoAlerta, sujeto: string, x: { monto: number; detalle: Bi; negocio?: string | null; ciudad?: string | null }): Promise<boolean> {
  const n = (await db().query<{ id: string }>(
    `insert into money_alerts (kind, subject_id, business_id, city_id, amount_cents, detail)
     values ($1::text, $2::text, (select id from businesses where id = $3::text), (select id from cities where id = $4::text), $5::bigint, $6::jsonb)
     on conflict (kind, subject_id) do nothing returning id::text`, [kind, sujeto.slice(0, 200), x.negocio ?? null, x.ciudad ?? null, Math.round(x.monto), JSON.stringify(x.detalle)])).rows[0];
  if (!n) return false;
  const equipo = (await db().query<{ id: string; lang: string | null }>(
    `select m.user_id::text as id, u.lang from staff_members m join users u on u.id = m.user_id where m.status = 'active' and m.role in ('admin', 'finanzas')
        and ($1::text is null or cardinality(coalesce(m.cities, '{}'::text[])) = 0 or $1::text = any(m.cities))`, [x.ciudad ?? null]).catch(() => ({ rows: [] as { id: string; lang: string | null }[] }))).rows;
  if (equipo.length) await (await import("./avisos")).avisarMuchos(equipo.map((u) => u.id), "din_alerta",
    { es: { que: QUE[kind].es, detalle: x.detalle.es }, en: { que: QUE[kind].en, detalle: x.detalle.en } }, { href: `/admin/planes?tab=ing` }).catch(() => undefined);
  return true;
}

/* Barrido: las alertas que nadie más hace. Cada una se anota una sola vez. */
export async function barrerAlertasDinero(): Promise<number> {
  let n = 0;
  const R = (await db().query<{ id: string; amt: number; biz: string | null; city: string | null; n: number; err: string | null }>(
    `select r.id::text, r.amount_cents as amt, p.business_id as biz, p.city_id as city, r.attempts as n, r.last_error as err from refunds r join payments p on p.id = r.payment_id
      where r.status = 'pending' and r.manual_at is null and r.attempts >= cfg_int('dinero_alerta_intentos')
        and not exists (select 1 from money_alerts a where a.kind = 'refund_stuck' and a.subject_id = r.id::text) limit 100`)).rows;
  for (const r of R) if (await alertar("refund_stuck", r.id, { monto: r.amt, negocio: r.biz, ciudad: r.city, detalle: { es: `Devolución de ${money(r.amt)}: Stripe la rechazó ${r.n} veces (${r.err ?? "sin motivo"})`, en: `Refund of ${money(r.amt)}: Stripe rejected it ${r.n} times (${r.err ?? "no reason"})` } })) n++;
  const V = (await db().query<{ id: string; amt: number; biz: string; city: string; n: number; err: string | null }>(
    `select r.id::text, r.amount_cents as amt, r.business_id as biz, r.city_id as city, r.attempts as n, r.last_error as err from event_settlement_reversals r
      where r.status = 'pending' and r.manual_at is null and r.attempts >= cfg_int('dinero_alerta_intentos')
        and not exists (select 1 from money_alerts a where a.kind = 'transfer_reversal_stuck' and a.subject_id = r.id::text) limit 100`)).rows;
  for (const r of V) if (await alertar("transfer_reversal_stuck", r.id, { monto: r.amt, negocio: r.biz, ciudad: r.city, detalle: { es: `Revertir ${money(r.amt)} al organizador: Stripe lo rechazó ${r.n} veces (${r.err ?? "sin saldo"})`, en: `Reverse ${money(r.amt)} from the organizer: Stripe rejected it ${r.n} times (${r.err ?? "no balance"})` } })) n++;
  // Disputas sin responder cerca del plazo del banco (una vez por disputa).
  const D = (await db().query<{ id: string; amt: number; biz: string | null; city: string | null; due: string; num: string | null }>(
    `update disputes d set due_alert_at = now() where d.status = 'needs_response' and d.due_alert_at is null and d.evidence_due_by is not null
        and d.evidence_due_by < now() + make_interval(days => cfg_int('disputa_alerta_dias'))
     returning d.id::text, d.amount_cents as amt, d.business_id as biz, d.city_id as city, to_char(d.evidence_due_by at time zone 'America/New_York', 'YYYY-MM-DD HH24:MI') as due,
               (select o.number from operations o where o.id = d.operation_id) as num`)).rows;
  for (const d of D) if (await alertar("dispute_due", d.id, { monto: d.amt, negocio: d.biz, ciudad: d.city, detalle: { es: `Disputa ${d.num ? `del pedido ${d.num}` : d.id} (${money(d.amt)}) sin responder: el banco cierra el ${d.due}`, en: `Dispute ${d.num ? `for order ${d.num}` : d.id} (${money(d.amt)}) unanswered: the bank closes on ${d.due}` } })) n++;
  const P = (await db().query<{ id: string; amt: number; biz: string | null; city: string | null; code: string | null }>(
    `select p.stripe_payout_id as id, p.amount_cents as amt, p.business_id as biz, p.city_id as city, p.failure_code as code from payouts p
      where p.status = 'failed' and not exists (select 1 from money_alerts a where a.kind = 'payout_failed' and a.subject_id = p.stripe_payout_id) limit 100`)).rows;
  for (const p of P) if (await alertar("payout_failed", p.id, { monto: p.amt, negocio: p.biz, ciudad: p.city, detalle: { es: `El pago al banco de ${money(p.amt)} falló (${p.code ?? "sin código"})`, en: `The ${money(p.amt)} bank payout failed (${p.code ?? "no code"})` } })) n++;
  // 9t5 · Las alertas «sin respuesta» cuya intención ya no está en camino (la cerró la consulta a la pasarela o su flujo) se cierran solas.
  await cerrarAlertasResueltas();
  return n;
}

/* ── Super Admin › Planes › Ingresos · Alertas del dinero ── */
export type FilaAlerta = { id: string; kind: TipoAlerta; sujeto: string; negocio: string | null; nombre: string | null; ciudad: string | null; monto: number; detalle: Bi; at: string;
  estado: "abierta" | "con_dueno" | "resuelta"; nota: { accion: string; quien: string; nota: string; at: string } | null; aMano: boolean;
  /* 9t5 · Lo que dijo la última consulta a la pasarela de esa intención (y cuándo), y si todavía se le puede preguntar (sigue en camino): lo decide el servidor. */
  consulta: { resultado: string; at: string; stripe: string | null; origen: string } | null; preguntar: boolean };
const CIUD = "(cardinality($1::text[]) = 0 or a.city_id = any($1::text[]))";
/* 9t5 · La intención de una alerta «sin respuesta» (para la consulta a la pasarela): su tabla, su id y si sigue en camino. */
const INTENCION_DE_LA_ALERTA = `select 'subscription_charges'::text as sk, z.id as sid, z.status = 'pending' as vivo from subscription_charges z where a.kind = 'charge_stuck' and z.idem_key = a.subject_id
                          union all select 'offsession_charges', z.id, z.status = 'pending' from offsession_charges z where a.kind = 'offsession_stuck' and z.idem_key = a.subject_id
                          union all select 'event_settlements', z.id, z.status = 'paying' from event_settlements z where a.kind = 'transfer_stuck' and a.subject_id ~ '^[0-9]{1,18}$' and z.id = a.subject_id::bigint`;
export async function alertasDinero(s: Staff, abiertas: boolean, antes: string | null = null, n = 30): Promise<{ filas: FilaAlerta[]; sigue: string | null }> {
  // 9t2 · «Resolver a mano» solo cuando la devolución (o la reversión) SIGUE pendiente y la base lo deja (Stripe ya la intentó): una que quedó
  // fallida o hecha muestra la alerta como informativa (antes ofrecía el botón y contestaba «Ya no está pendiente»). Lo decide el servidor.
  // 9t3 (0199) · La base también lo deja cuando lleva 23 h (HORAS_LLAVE) anotada sin un solo intento (nadie la va a mandar ya): la misma regla aquí.
  // 9t5 · La intención de una alerta «sin respuesta» (su tabla, su id y si sigue en camino) y lo último que dijo la consulta a la pasarela.
  const r = await db().query<Omit<FilaAlerta, "estado" | "aMano" | "preguntar"> & { monto: string; ult: string | null; mano: boolean; vivo: boolean | null }>(
    `select a.id::text, a.kind, a.subject_id as sujeto, case
              when a.kind = 'refund_stuck' then exists (select 1 from refunds r where r.id = case when a.subject_id ~ '^[0-9]{1,18}$' then a.subject_id::bigint end
                                                          and r.status = 'pending' and r.manual_at is null and (r.attempts >= 1 or r.created_at <= now() - interval '23 hours'))
              when a.kind = 'transfer_reversal_stuck' then exists (select 1 from event_settlement_reversals r where r.id = case when a.subject_id ~ '^[0-9]{1,18}$' then a.subject_id::bigint end
                                                          and r.status = 'pending' and r.manual_at is null and (r.attempts >= 1 or r.created_at <= now() - interval '23 hours'))
              else false end as mano, a.business_id as negocio, b.name as nombre, a.city_id as ciudad, coalesce(a.amount_cents, 0)::text as monto, a.detail as detalle,
            to_char(a.at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at, x.action as ult,
            case when x.action is null then null else json_build_object('accion', x.action, 'quien', x.quien, 'nota', x.note, 'at', to_char(x.at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')) end as nota,
            o.vivo, case when g.result is null then null else json_build_object('resultado', g.result, 'at', to_char(g.at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), 'stripe', g.stripe_id, 'origen', g.origin) end as consulta
       from money_alerts a left join businesses b on b.id = a.business_id
       left join lateral (select n.action, n.note, n.at, case when n.staff_id is null then 'To''Latino' else coalesce(nullif(trim(coalesce(u.first_name, '') || ' ' || left(coalesce(u.last_name, ''), 1)), ''), 'Equipo') end as quien
                            from money_alert_notes n left join users u on u.id = n.staff_id where n.alert_id = a.id order by n.at desc, n.id desc limit 1) x on true
       left join lateral (${INTENCION_DE_LA_ALERTA}) o on true
       left join lateral (select y.result, y.at, y.stripe_id, y.origin from gateway_checks y where y.subject_kind = o.sk and y.subject_id = o.sid order by y.at desc, y.id desc limit 1) g on true
      where ${CIUD} and ($2::boolean is false or coalesce(x.action, 'reabierta') not in ('resuelta', 'resuelta_a_mano', 'resuelta_sola')) and ($3::bigint is null or a.id < $3::bigint)
      order by a.id desc limit $4::int`, [s.cities, abiertas, antes, n + 1]);
  const filas = r.rows.slice(0, n).map(({ ult, mano, vivo, ...x }) => ({ ...x, monto: Number(x.monto), estado: (ult === "resuelta" || ult === "resuelta_a_mano" || ult === "resuelta_sola" ? "resuelta" : ult === "me_hago_cargo" ? "con_dueno" : "abierta") as FilaAlerta["estado"],
    aMano: mano && ult !== "resuelta_a_mano", preguntar: vivo === true }));
  return { filas, sigue: r.rows.length > n ? filas[filas.length - 1]!.id : null };
}
export async function cuantasAlertasAbiertas(s: Staff): Promise<number> {
  return (await db().query<{ n: number }>(
    `select count(*)::int as n from money_alerts a where ${CIUD}
        and coalesce((select n.action from money_alert_notes n where n.alert_id = a.id order by n.at desc, n.id desc limit 1), 'reabierta') not in ('resuelta', 'resuelta_a_mano', 'resuelta_sola', 'me_hago_cargo')`, [s.cities])).rows[0]!.n;
}

/* 9t5 · «Preguntar a Stripe ahora» (Super Admin, tx:aprobar, tus ciudades, con nota): la MISMA función del barrido (resolverCobroPro, resolverCobroFuera,
   resolverTransferencia), sin esperar su turno. La consulta y la auditoría de quien la pidió van en una transacción; la llamada a la pasarela, fuera.
   El servidor decide con lo que contesta Stripe; aquí no entra ningún «sí se cobró». */
export async function preguntarPorAlerta(s: Staff, id: string, nota: string): Promise<{ ok: true; msg: string } | { ok: false; msg: string }> {
  const n = nota.trim().slice(0, 500);
  if (n.length < 4) return { ok: false, msg: "Escribe la nota (mínimo 4 letras)." };
  if (!/^\d{1,18}$/.test(id)) return { ok: false, msg: "Esa alerta no existe." };
  const a = (await db().query<{ kind: TipoAlerta; sk: string | null; sid: string | null; vivo: boolean | null; city: string | null }>(
    `select a.kind, o.sk, o.sid::text as sid, o.vivo, a.city_id as city from money_alerts a left join lateral (${INTENCION_DE_LA_ALERTA}) o on true
      where a.id = $2::bigint and ${CIUD}`, [s.cities, id])).rows[0];
  if (!a) return { ok: false, msg: "Esa alerta no existe (o no es de tus ciudades)." };
  if (!a.sk || !a.sid) return { ok: false, msg: "A esta alerta no se le pregunta a Stripe." };
  if (!a.vivo) return { ok: false, msg: "Ya no está en camino: se cerró." };
  const { auditar } = await import("./admin");
  const K = await import("./consulta-pasarela");
  const o: import("./consulta-pasarela").Origen = { origen: "equipo", staff: s.id, alGuardar: (c) => auditar(c, { actor: s.id, action: "dinero.alerta.preguntar", targetKind: "money_alert", targetId: id, city: a.city,
    after: { alerta: QUE[a.kind].es, intencion: `${a.sk}:${a.sid}` }, reason: n }) };
  const r = a.sk === "subscription_charges" ? await (await import("./suscripcion")).resolverCobroPro(a.sid, o)
    : a.sk === "offsession_charges" ? await (await import("./cobro-fuera")).resolverCobroFuera(a.sid, o)
    : await (await import("./evt-liquidacion")).resolverTransferencia(a.sid, o);
  if (!r.resultado) return { ok: false, msg: "Todavía no pasan 23 h (o ya no está en camino): no se le pregunta a Stripe." };
  const QUEDO: Record<string, string> = { hecha: "quedó hecha, una vez, y la alerta se cerró", fallida: "quedó fallida: no se cobró y sigue el flujo normal", no_llego: "nunca llegó a Stripe: quedó fallida y el siguiente cobro puede salir",
    reabierta: "nunca llegó a Stripe: se manda otra vez con la misma llave", sigue: "sigue en camino; la alerta sigue abierta", ya_no_estaba: "ya no estaba en camino" };
  return { ok: true, msg: `Stripe dijo que ${K.RESULTADO[r.resultado].es}: ${QUEDO[r.quedo] ?? r.quedo}. Quedó en la auditoría.` };
}

/* «Me hago cargo», «Resuelta», «Reabrir» o «Resolver a mano» (la devolución o la reversión se hizo fuera de Stripe: con nota, una vez, y el barrido
   deja de reintentarla). Solo inserción + la auditoría; lo llama la acción con permiso (tx:aprobar). */
export async function notaAlerta(s: Staff, id: string, accion: "me_hago_cargo" | "resuelta" | "reabierta" | "resuelta_a_mano", nota: string): Promise<{ ok: true } | { ok: false; msg: string }> {
  const n = nota.trim().slice(0, 500);
  if (n.length < 4) return { ok: false, msg: "Escribe la nota (mínimo 4 letras)." };
  if (!/^\d{1,18}$/.test(id)) return { ok: false, msg: "Esa alerta no existe." };
  const a = (await db().query<{ kind: TipoAlerta; sujeto: string; city: string | null }>(`select a.kind, a.subject_id as sujeto, a.city_id as city from money_alerts a where a.id = $2::bigint and ${CIUD}`, [s.cities, id])).rows[0];
  if (!a) return { ok: false, msg: "Esa alerta no existe (o no es de tus ciudades)." };
  if (accion === "resuelta_a_mano" && ((a.kind !== "refund_stuck" && a.kind !== "transfer_reversal_stuck") || !/^\d{1,18}$/.test(a.sujeto))) return { ok: false, msg: "Esta alerta no tiene camino manual." };
  const { auditar } = await import("./admin");
  const r = await tx(async (c) => {
    if (accion === "resuelta_a_mano") {
      const t = a.kind === "refund_stuck" ? "refunds" : "event_settlement_reversals";
      const u = await c.query(`update ${t} set manual_at = now(), manual_by = $2::uuid, manual_note = $3::text where id = $1::bigint and status = 'pending' and manual_at is null`, [a.sujeto, s.id, n]);
      if (!u.rowCount) return "Ya no está pendiente: Stripe la hizo o ya se resolvió a mano.";
    }
    await c.query(`insert into money_alert_notes (alert_id, action, staff_id, note) values ($1::bigint, $2::text, $3::uuid, $4::text)`, [id, accion, s.id, n]);
    await auditar(c, { actor: s.id, action: `dinero.alerta.${accion}`, targetKind: "money_alert", targetId: id, city: a.city,
      after: { alerta: QUE[a.kind].es, estado: ({ me_hago_cargo: "con dueño", resuelta: "resuelta", reabierta: "abierta", resuelta_a_mano: "resuelta fuera de Stripe" } as Record<string, string>)[accion]! }, reason: n });
    return "ok";
  });
  return r === "ok" ? { ok: true } : { ok: false, msg: r };
}

/* ── 9t5 · Las alertas «sin respuesta» que se cierran solas (lib/consulta-pasarela.ts) ── */
/* La alerta «sin respuesta» de una intención se cierra sola cuando deja de estar en camino: una nota 'resuelta_sola' (sin persona), una vez. */
export async function cerrarAlertaSola(kind: "charge_stuck" | "offsession_stuck" | "transfer_stuck", sujeto: string, nota: Bi): Promise<boolean> {
  return tx(async (c) => {
    // El candado de la alerta primero; la última nota, después, en otra sentencia (ve lo que otro cerró mientras esperaba): una sola vez.
    const a = (await c.query<{ id: string }>(`select a.id::text from money_alerts a where a.kind = $1 and a.subject_id = $2 for update`, [kind, sujeto])).rows[0];
    if (!a) return false;
    const ult = (await c.query<{ ult: string | null }>(`select (select n.action from money_alert_notes n where n.alert_id = $1::bigint order by n.at desc, n.id desc limit 1) as ult`, [a.id])).rows[0]?.ult;
    if (ult === "resuelta_sola") return false;
    await c.query(`insert into money_alert_notes (alert_id, action, staff_id, note) values ($1::bigint, 'resuelta_sola', null, $2)`, [a.id, `${nota.es} · ${nota.en}`.slice(0, 500)]);
    return true;
  });
}
/* El barrido: las alertas «sin respuesta» abiertas cuya intención ya no está en camino (la cerró la consulta o el flujo) se cierran solas. */
export async function cerrarAlertasResueltas(): Promise<number> {
  const L = (await db().query<{ kind: "charge_stuck" | "offsession_stuck" | "transfer_stuck"; sujeto: string; st: string }>(
    `select a.kind, a.subject_id as sujeto, o.st from money_alerts a
       join lateral (select z.status as st from subscription_charges z where a.kind = 'charge_stuck' and z.idem_key = a.subject_id
                     union all select z.status from offsession_charges z where a.kind = 'offsession_stuck' and z.idem_key = a.subject_id
                     union all select z.status from event_settlements z where a.kind = 'transfer_stuck' and a.subject_id ~ '^[0-9]{1,18}$' and z.id = a.subject_id::bigint) o on true
      where a.kind in ('charge_stuck', 'offsession_stuck', 'transfer_stuck') and o.st not in ('pending', 'paying')
        and coalesce((select n.action from money_alert_notes n where n.alert_id = a.id order by n.at desc, n.id desc limit 1), '') not in ('resuelta_sola', 'resuelta', 'resuelta_a_mano')
      order by a.id limit 100`)).rows;
  let n = 0;
  for (const x of L) if (await cerrarAlertaSola(x.kind, x.sujeto, CERRADA[x.st] ?? CERRADA.failed!)) n++;
  return n;
}
const CERRADA: Record<string, Bi> = {
  done: { es: "Cerrada sola: el cobro quedó hecho.", en: "Closed by itself: the charge is done." },
  failed: { es: "Cerrada sola: la intención quedó fallida (no se cobró).", en: "Closed by itself: the intent failed (nothing was charged)." },
  action: { es: "Cerrada sola: el banco pidió confirmar y el cobro siguió por la verificación.", en: "Closed by itself: the bank asked to confirm and the charge went on through verification." },
  paid: { es: "Cerrada sola: la transferencia quedó hecha.", en: "Closed by itself: the transfer is done." },
  reversed: { es: "Cerrada sola: la transferencia quedó hecha (y después se revirtió).", en: "Closed by itself: the transfer is done (and was reversed later)." },
};
