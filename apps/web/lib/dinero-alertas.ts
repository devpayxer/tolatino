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
/* 9t6 (0204) · hold_stuck: la renovación de una retención (depósito de una renta, lo retenido de un estimado) que Stripe no contestó y la consulta no cerró
   (lib/renovar-retencion.ts): la vieja no se soltó ni se avisó a nadie. extra_refund_stuck: devolver (o revertir) lo que Stripe hizo de más, decidido al
   cerrar una gateway_review (lib/revision-pasarela.ts), que Stripe rechazó o que no se cierra sola. gateway_review se cierra con «Elegir cuál vale». */
export type TipoAlerta = "refund_stuck" | "transfer_reversal_stuck" | "dispute_due" | "recon_diff" | "recon_no_corrio" | "payout_failed" | "refund_failed" | "charge_unapplied"
  | "transfer_stuck" | "charge_stuck" | "offsession_stuck" | "offsession_unapplied" | "gateway_review" | "hold_stuck" | "extra_refund_stuck";
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
  hold_stuck: { es: "una retención renovada sin respuesta", en: "a renewed hold with no answer" },
  extra_refund_stuck: { es: "devolver lo que Stripe hizo de más", en: "refunding what Stripe made in excess" },
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
  // 9t9 · Cada alerta por su cuenta (lib/barrido-uno.ts): una que no se anota no deja a las demás sin anotar; la tarea sale fallida diciendo cuál. Cada
  // selección con su orden (la más vieja primero; antes sin orden).
  const B = new (await import("./barrido-uno")).Fallos("alertasDinero");
  const R = (await db().query<{ id: string; amt: number; biz: string | null; city: string | null; n: number; err: string | null }>(
    `select r.id::text, r.amount_cents as amt, p.business_id as biz, p.city_id as city, r.attempts as n, r.last_error as err from refunds r join payments p on p.id = r.payment_id
      where r.status = 'pending' and r.manual_at is null and r.attempts >= cfg_int('dinero_alerta_intentos')
        and not exists (select 1 from money_alerts a where a.kind = 'refund_stuck' and a.subject_id = r.id::text) order by r.created_at, r.id limit 100`)).rows;
  await B.cada(R, (r) => `devolucion ${r.id}`, async (r) => { if (await alertar("refund_stuck", r.id, { monto: r.amt, negocio: r.biz, ciudad: r.city, detalle: { es: `Devolución de ${money(r.amt)}: Stripe la rechazó ${r.n} veces (${r.err ?? "sin motivo"})`, en: `Refund of ${money(r.amt)}: Stripe rejected it ${r.n} times (${r.err ?? "no reason"})` } })) n++; });
  const V = (await db().query<{ id: string; amt: number; biz: string; city: string; n: number; err: string | null }>(
    `select r.id::text, r.amount_cents as amt, r.business_id as biz, r.city_id as city, r.attempts as n, r.last_error as err from event_settlement_reversals r
      where r.status = 'pending' and r.manual_at is null and r.attempts >= cfg_int('dinero_alerta_intentos')
        and not exists (select 1 from money_alerts a where a.kind = 'transfer_reversal_stuck' and a.subject_id = r.id::text) order by r.created_at, r.id limit 100`)).rows;
  await B.cada(V, (r) => `reversion ${r.id}`, async (r) => { if (await alertar("transfer_reversal_stuck", r.id, { monto: r.amt, negocio: r.biz, ciudad: r.city, detalle: { es: `Revertir ${money(r.amt)} al organizador: Stripe lo rechazó ${r.n} veces (${r.err ?? "sin saldo"})`, en: `Reverse ${money(r.amt)} from the organizer: Stripe rejected it ${r.n} times (${r.err ?? "no balance"})` } })) n++; });
  // Disputas sin responder cerca del plazo del banco (una vez por disputa).
  const D = (await db().query<{ id: string; amt: number; biz: string | null; city: string | null; due: string; num: string | null }>(
    `update disputes d set due_alert_at = now() where d.status = 'needs_response' and d.due_alert_at is null and d.evidence_due_by is not null
        and d.evidence_due_by < now() + make_interval(days => cfg_int('disputa_alerta_dias'))
     returning d.id::text, d.amount_cents as amt, d.business_id as biz, d.city_id as city, to_char(d.evidence_due_by at time zone 'America/New_York', 'YYYY-MM-DD HH24:MI') as due,
               (select o.number from operations o where o.id = d.operation_id) as num`)).rows;
  await B.cada(D, (d) => `disputa ${d.id}`, async (d) => { if (await alertar("dispute_due", d.id, { monto: d.amt, negocio: d.biz, ciudad: d.city, detalle: { es: `Disputa ${d.num ? `del pedido ${d.num}` : d.id} (${money(d.amt)}) sin responder: el banco cierra el ${d.due}`, en: `Dispute ${d.num ? `for order ${d.num}` : d.id} (${money(d.amt)}) unanswered: the bank closes on ${d.due}` } })) n++; });
  const P = (await db().query<{ id: string; amt: number; biz: string | null; city: string | null; code: string | null }>(
    `select p.stripe_payout_id as id, p.amount_cents as amt, p.business_id as biz, p.city_id as city, p.failure_code as code from payouts p
      where p.status = 'failed' and not exists (select 1 from money_alerts a where a.kind = 'payout_failed' and a.subject_id = p.stripe_payout_id) order by p.created_at, p.id limit 100`)).rows;
  await B.cada(P, (p) => `pago ${p.id}`, async (p) => { if (await alertar("payout_failed", p.id, { monto: p.amt, negocio: p.biz, ciudad: p.city, detalle: { es: `El pago al banco de ${money(p.amt)} falló (${p.code ?? "sin código"})`, en: `The ${money(p.amt)} bank payout failed (${p.code ?? "no code"})` } })) n++; });
  // 9t5 · Las alertas «sin respuesta» cuya intención ya no está en camino (la cerró la consulta a la pasarela o su flujo) se cierran solas.
  await cerrarAlertasResueltas();
  B.fin();
  return n;
}

/* ── Super Admin › Planes › Ingresos · Alertas del dinero ── */
export type FilaAlerta = { id: string; kind: TipoAlerta; sujeto: string; negocio: string | null; nombre: string | null; ciudad: string | null; monto: number; detalle: Bi; at: string;
  estado: "abierta" | "con_dueno" | "resuelta"; nota: { accion: string; quien: string; nota: string; at: string } | null; aMano: boolean;
  /* 9t5 · Lo que dijo la última consulta a la pasarela de esa intención (y cuándo), y si todavía se le puede preguntar (sigue en camino): lo decide el servidor. */
  consulta: { resultado: string; at: string; stripe: string | null; origen: string } | null; preguntar: boolean;
  /* 9t6 · gateway_review abierta que una persona puede cerrar: qué puede elegir según la última consulta (solo para mostrar: al guardar, el servidor vuelve a
     preguntar a la pasarela y decide con eso). */
  revisar: Revisar | null;
  /* 22 nov (0209) · «Devolver otra vez» unos boletos desde su refund_failed: cuánto devolvería (lo de la fallida) si el servidor lo ofrece (fallida, sin resolver a
     mano, sin otra vez, sin disputa y con saldo en el cobro). La base lo vuelve a imponer al anotarla (refunds_otra_vez, refunds_tope). */
  otraVez: number | null;
  /* 22 nov (0209) · La devolución de un patrocinio que Stripe dio por fallida DESPUÉS de su alerta «sin respuesta» (money_alerts es de una vez): cuándo y con
     qué código, para que la fila diga lo último que dijo Stripe. */
  fallo: { at: string; codigo: string | null } | null };
/* 22 nov (0209) · Los minutos después de un envío en los que la base no deja resolver a mano una intención que sigue en camino (dinero_envio_reciente; el
   guardián manoTrasEnvioReciente los compara con la migración). */
export const MINUTOS_ENVIO_MANO = 10;
const CIUD = "(cardinality($1::text[]) = 0 or a.city_id = any($1::text[]))";
/* 9t5 · La intención de una alerta «sin respuesta» (para la consulta a la pasarela): su tabla, su id y si sigue en camino.
   9t6 · También la renovación de una retención (hold_stuck) y la devolución de lo que sobró (extra_refund_stuck), por su id.
   9t8 · Y la devolución de lo no usado de un patrocinio (refund_stuck con sujeto 'sponsorship_refunds:<id>'). */
const INTENCION_DE_LA_ALERTA = `select 'subscription_charges'::text as sk, z.id as sid, z.status = 'pending' as vivo from subscription_charges z where a.kind = 'charge_stuck' and z.idem_key = a.subject_id
                          union all select 'offsession_charges', z.id, z.status = 'pending' from offsession_charges z where a.kind = 'offsession_stuck' and z.idem_key = a.subject_id
                          union all select 'event_settlements', z.id, z.status = 'paying' from event_settlements z where a.kind = 'transfer_stuck' and a.subject_id ~ '^[0-9]{1,18}$' and z.id = a.subject_id::bigint
                          union all select 'hold_renewals', z.id, z.status = 'pending' from hold_renewals z where a.kind = 'hold_stuck' and a.subject_id ~ '^[0-9]{1,18}$' and z.id = a.subject_id::bigint
                          union all select 'gateway_refunds', z.id, z.status = 'pending' and z.manual_at is null from gateway_refunds z where a.kind = 'extra_refund_stuck' and a.subject_id ~ '^[0-9]{1,18}$' and z.id = a.subject_id::bigint
                          union all select 'refunds', z.id, z.status = 'pending' and z.manual_at is null from refunds z where a.kind = 'refund_stuck' and a.subject_id ~ '^[0-9]{1,18}$' and z.id = a.subject_id::bigint
                          union all select 'event_settlement_reversals', z.id, z.status = 'pending' and z.manual_at is null from event_settlement_reversals z where a.kind = 'transfer_reversal_stuck' and a.subject_id ~ '^[0-9]{1,18}$' and z.id = a.subject_id::bigint
                          union all select 'sponsorship_refunds', z.id, z.status = 'pending' and z.manual_at is null from sponsorship_refunds z where a.kind = 'refund_stuck' and a.subject_id ~ '^sponsorship_refunds:[0-9]{1,18}$' and z.id = split_part(a.subject_id, ':', 2)::bigint`;
export async function alertasDinero(s: Staff, abiertas: boolean, antes: string | null = null, n = 30): Promise<{ filas: FilaAlerta[]; sigue: string | null }> {
  // 9t2 · «Resolver a mano» solo cuando la devolución (o la reversión) SIGUE pendiente y la base lo deja (Stripe ya la intentó): una que quedó
  // fallida o hecha muestra la alerta como informativa (antes ofrecía el botón y contestaba «Ya no está pendiente»). Lo decide el servidor.
  // 9t3 (0199) · La base también lo deja cuando lleva 23 h (HORAS_LLAVE) anotada sin un solo intento (nadie la va a mandar ya): la misma regla aquí.
  // 9t5 · La intención de una alerta «sin respuesta» (su tabla, su id y si sigue en camino) y lo último que dijo la consulta a la pasarela.
  const r = await db().query<Omit<FilaAlerta, "estado" | "aMano" | "preguntar" | "revisar"> & { monto: string; ult: string | null; mano: boolean; vivo: boolean | null; reciente: boolean }>(
    `select a.id::text, a.kind, a.subject_id as sujeto, case
              -- 9t8 · La devolución de lo no usado de un patrocinio: en camino (con la regla de la base: sponsorship_refunds_reglas) o rechazada por Stripe; nunca hecha.
              when a.kind = 'refund_stuck' and a.subject_id ~ '^sponsorship_refunds:[0-9]{1,18}$' then exists (select 1 from sponsorship_refunds z where z.id = split_part(a.subject_id, ':', 2)::bigint and z.manual_at is null
                                                          and (z.status = 'failed' or (z.status = 'pending' and (z.attempts >= 1 or coalesce(z.sent_at, z.created_at) <= now() - interval '23 hours'))))
              when a.kind = 'refund_stuck' then exists (select 1 from refunds r where r.id = case when a.subject_id ~ '^[0-9]{1,18}$' then a.subject_id::bigint end
                                                          and r.status = 'pending' and r.manual_at is null and (r.attempts >= 1 or r.created_at <= now() - interval '23 hours'))
              when a.kind = 'transfer_reversal_stuck' then exists (select 1 from event_settlement_reversals r where r.id = case when a.subject_id ~ '^[0-9]{1,18}$' then a.subject_id::bigint end
                                                          and r.status = 'pending' and r.manual_at is null and (r.attempts >= 1 or r.created_at <= now() - interval '23 hours'))
              -- 9t7 · La devolución de lo que sobró: en camino (con la misma regla de la base: gateway_refunds_a_mano) o rechazada por Stripe; nunca hecha.
              when a.kind = 'extra_refund_stuck' then exists (select 1 from gateway_refunds g where g.id = case when a.subject_id ~ '^[0-9]{1,18}$' then a.subject_id::bigint end and g.manual_at is null
                                                          and (g.status = 'failed' or (g.status = 'pending' and (g.attempts >= 1 or coalesce(g.sent_at, g.created_at) <= now() - interval '23 hours'))))
              else false end as mano,
            -- 0209 · Mandada a Stripe hace menos de MINUTOS_ENVIO_MANO y todavía en camino: la base no deja resolverla a mano (puede no verse aún en Stripe).
            case when a.kind = 'refund_stuck' and a.subject_id ~ '^sponsorship_refunds:[0-9]{1,18}$' then exists (select 1 from sponsorship_refunds z where z.id = split_part(a.subject_id, ':', 2)::bigint and z.status = 'pending' and z.last_sent_at > now() - interval '10 minutes')
                 when a.subject_id !~ '^[0-9]{1,18}$' then false
                 when a.kind = 'refund_stuck' then exists (select 1 from refunds z where z.id = a.subject_id::bigint and z.status = 'pending' and z.last_sent_at > now() - interval '10 minutes')
                 when a.kind = 'transfer_reversal_stuck' then exists (select 1 from event_settlement_reversals z where z.id = a.subject_id::bigint and z.status = 'pending' and z.last_sent_at > now() - interval '10 minutes')
                 when a.kind = 'extra_refund_stuck' then exists (select 1 from gateway_refunds z where z.id = a.subject_id::bigint and z.status = 'pending' and z.last_sent_at > now() - interval '10 minutes')
                 else false end as reciente,
            -- 0209 · «Devolver otra vez» (refund_failed de boletos): el monto de la fallida, solo si se puede (la misma regla que refunds_otra_vez y refunds_tope).
            case when a.kind = 'refund_failed' and a.subject_id ~ '^[0-9]{1,18}$' then (
              select f.amount_cents from refunds f join payments p on p.id = f.payment_id
               where f.id = a.subject_id::bigint and f.status = 'failed' and f.manual_at is null and not exists (select 1 from refunds y where y.retry_of = f.id)
                 and exists (select 1 from ticket_refund_lines l where l.refund_id = coalesce(f.lines_of, f.id))
                 and p.status in ('captured', 'partially_refunded')
                 and not exists (select 1 from disputes d where d.payment_id = p.id and d.status in ('needs_response', 'under_review', 'lost', 'accepted'))
                 and (select coalesce(sum(x.amount_cents), 0) from refunds x where x.payment_id = p.id and x.status in ('pending', 'done')) + f.amount_cents <= p.amount_cents) end as "otraVez",
            -- 0209 · (d) La devolución de un patrocinio que Stripe dio por fallida (sin resolver a mano): cuándo y con qué código.
            case when a.kind = 'refund_stuck' and a.subject_id ~ '^sponsorship_refunds:[0-9]{1,18}$' then (
              select json_build_object('at', to_char(z.failed_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), 'codigo', case when z.last_error in ('consulta_fallido', 'nunca_llego') then null else z.last_error end)
                from sponsorship_refunds z where z.id = split_part(a.subject_id, ':', 2)::bigint and z.status = 'failed' and z.manual_at is null and z.failed_at is not null) end as fallo,
            a.business_id as negocio, b.name as nombre, a.city_id as ciudad, coalesce(a.amount_cents, 0)::text as monto, a.detail as detalle,
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
  // 9t6 · Las gateway_review abiertas: qué se puede elegir (una consulta para todas; el servidor vuelve a decidir al guardar).
  const abiertasRev = r.rows.slice(0, n).filter((x) => x.kind === "gateway_review" && !["resuelta", "resuelta_a_mano", "resuelta_sola"].includes(x.ult ?? ""));
  const rev = abiertasRev.length ? await opcionesDeAlertas(abiertasRev.map((x) => ({ id: x.id, sujeto: x.sujeto }))) : new Map<string, Revisar>();
  const filas = r.rows.slice(0, n).map(({ ult, mano, vivo, reciente, ...x }) => ({ ...x, monto: Number(x.monto), estado: (ult === "resuelta" || ult === "resuelta_a_mano" || ult === "resuelta_sola" ? "resuelta" : ult === "me_hago_cargo" ? "con_dueno" : "abierta") as FilaAlerta["estado"],
    aMano: mano && ult !== "resuelta_a_mano" && !reciente, otraVez: x.otraVez == null || ult === "resuelta" || ult === "resuelta_sola" ? null : Number(x.otraVez), preguntar: vivo === true, revisar: rev.get(x.id) ?? null }));
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
  // 9t6 · También la renovación de una retención (resolverRenovacion) y la devolución de lo que sobró (resolverDevolucionSobra): la misma función del barrido.
  const r: { resultado: import("./consulta-pasarela").Resultado | null; quedo: string } = a.sk === "subscription_charges" ? await (await import("./suscripcion")).resolverCobroPro(a.sid, o)
    : a.sk === "offsession_charges" ? await (await import("./cobro-fuera")).resolverCobroFuera(a.sid, o)
    : a.sk === "hold_renewals" ? await (await import("./renovar-retencion")).resolverRenovacion(a.sid, o)
    : a.sk === "gateway_refunds" ? await (await import("./revision-pasarela")).resolverDevolucionSobra(a.sid, o).then((x) => ({ resultado: x.resultado, quedo: x.st === "done" ? "devolucion_hecha" : x.st === "failed" ? "devolucion_fallida" : "sigue" }))
    // 9t7 · Una devolución de un cobro (o de boletos) y una reversión al organizador: la misma función del barrido.
    : a.sk === "refunds" ? await (await import("./devolucion-consulta")).resolverDevolucion(a.sid, o).then((x) => ({ resultado: x.resultado, quedo: x.quedo === "hecha" ? "devolucion_hecha" : x.quedo === "fallida" ? "devolucion_no" : x.quedo === "reabierta" ? "devolucion_otra_llave" : x.quedo === "no_llego" ? "devolucion_no_llego" : x.quedo }))
    // 9t8 · La devolución de lo no usado de un patrocinio: la misma función del barrido.
    : a.sk === "sponsorship_refunds" ? await (await import("./patrocinio")).resolverDevolucionPat(a.sid, o).then((x) => ({ resultado: x.resultado, quedo: x.quedo === "hecha" ? "devolucion_hecha" : x.quedo === "fallida" ? "devolucion_pat_no" : x.quedo === "reabierta" ? "devolucion_otra_llave" : x.quedo }))
    : a.sk === "event_settlement_reversals" ? await (await import("./evt-liquidacion")).resolverReversion(a.sid, o).then((x) => ({ resultado: x.resultado, quedo: x.quedo === "hecha" ? "reversion_hecha" : x.quedo === "reabierta" ? "reversion_otra_llave" : x.quedo }))
    : await (await import("./evt-liquidacion")).resolverTransferencia(a.sid, o);
  if (!r.resultado) return { ok: false, msg: "Todavía no pasa la ventana de la llave (o ya no está en camino): no se le pregunta a Stripe." };
  const QUEDO: Record<string, string> = { hecha: "quedó hecha, una vez, y la alerta se cerró", fallida: "quedó fallida: no se cobró y sigue el flujo normal", no_llego: "nunca llegó a Stripe: quedó fallida y el siguiente cobro puede salir",
    devolucion_no: "Stripe la tiene como fallida: quedó fallida y su saldo libre (alerta aparte: si todavía se debe, devuélvela otra vez)",
    devolucion_otra_llave: "nunca llegó a Stripe: se mandó otra vez con otra llave y sigue en camino", devolucion_no_llego: "nunca llegó a Stripe y el cobro cambió: quedó fallida (alerta aparte)",
    reversion_hecha: "la reversión quedó hecha y la alerta se cerró", reversion_otra_llave: "nunca llegó a Stripe: se mandó otra vez con otra llave y sigue en camino",
    reabierta: "nunca llegó a Stripe: se manda otra vez con la misma llave", sigue: "sigue en camino; la alerta sigue abierta", ya_no_estaba: "ya no estaba en camino",
    devuelto: "el equipo decidió que ninguno vale: quedó fallida y se devuelve lo cobrado", soltada: "la retención nueva ya no hacía falta: se soltó",
    devolucion_hecha: "la devolución quedó hecha y la alerta se cerró", devolucion_pat_no: "Stripe la tiene como fallida: quedó fallida (hazla desde Stripe o por fuera y resuélvela a mano)", devolucion_fallida: "Stripe dijo que no: quedó fallida (hazla desde Stripe o por fuera)" };
  return { ok: true, msg: `Stripe dijo que ${K.RESULTADO[r.resultado].es}: ${QUEDO[r.quedo] ?? r.quedo}. Quedó en la auditoría.` };
}

/* «Me hago cargo», «Resuelta», «Reabrir» o «Resolver a mano» (la devolución o la reversión se hizo fuera de Stripe: con nota, una vez, y el barrido
   deja de reintentarla). Solo inserción + la auditoría; lo llama la acción con permiso (tx:aprobar). */
export async function notaAlerta(s: Staff, id: string, accion: "me_hago_cargo" | "resuelta" | "reabierta" | "resuelta_a_mano", nota: string): Promise<{ ok: true; msg?: string } | { ok: false; msg: string }> {
  const n = nota.trim().slice(0, 500);
  if (n.length < 4) return { ok: false, msg: "Escribe la nota (mínimo 4 letras)." };
  if (!/^\d{1,18}$/.test(id)) return { ok: false, msg: "Esa alerta no existe." };
  const a = (await db().query<{ kind: TipoAlerta; sujeto: string; city: string | null }>(`select a.kind, a.subject_id as sujeto, a.city_id as city from money_alerts a where a.id = $2::bigint and ${CIUD}`, [s.cities, id])).rows[0];
  if (!a) return { ok: false, msg: "Esa alerta no existe (o no es de tus ciudades)." };
  // 9t8 · La devolución de lo no usado de un patrocinio: refund_stuck con sujeto 'sponsorship_refunds:<id>'.
  const pat = a.kind === "refund_stuck" ? /^sponsorship_refunds:(\d{1,18})$/.exec(a.sujeto) : null, sid = pat ? pat[1]! : a.sujeto;
  if (accion === "resuelta_a_mano" && ((a.kind !== "refund_stuck" && a.kind !== "transfer_reversal_stuck" && a.kind !== "extra_refund_stuck") || !/^\d{1,18}$/.test(sid))) return { ok: false, msg: "Esta alerta no tiene camino manual." };
  // 9t7 · «Resolver a mano» le pregunta ANTES a la pasarela (fuera de la transacción, anotada con quien la pidió): si Stripe dice que salió, se cierra como
  // hecha y no se marca a mano; si no contesta (o la tiene en curso, o tiene varias), no cambia nada. Lo decide el servidor, nunca la pantalla.
  if (accion === "resuelta_a_mano") {
    const pre = await (await import("./devolucion-consulta")).antesDeAMano(s, id, a.kind, a.sujeto, n);
    if (!pre.sigue) return pre.ok ? { ok: true, msg: pre.msg } : { ok: false, msg: pre.msg };
  }
  // 9t6 · Una gateway_review que todavía se puede decidir no se marca «resuelta» sin decidir: la intención seguiría en camino y bloqueando al objeto.
  if (accion === "resuelta" && a.kind === "gateway_review" && (await opcionesDeAlertas([{ id, sujeto: a.sujeto }])).has(id))
    return { ok: false, msg: "Esta alerta se cierra con «Elegir cuál vale»: si solo se marca resuelta, la intención sigue en camino." };
  const { auditar } = await import("./admin");
  // 0209 · La base no deja marcarla a mano en los MINUTOS_ENVIO_MANO siguientes a un envío (Stripe puede no mostrarla todavía): se dice, sin cambiar nada.
  const r = await tx(async (c) => {
    if (accion === "resuelta_a_mano") {
      // La tabla sale de una lista cerrada escrita aquí (Semgrep). La devolución de lo que sobró también se resuelve a mano rechazada por Stripe (9t7).
      // 9t8 · La de un patrocinio también rechazada por Stripe (como la de lo que sobró).
      const t = pat ? "sponsorship_refunds" : a.kind === "refund_stuck" ? "refunds" : a.kind === "transfer_reversal_stuck" ? "event_settlement_reversals" : "gateway_refunds";
      const est = t === "gateway_refunds" || t === "sponsorship_refunds" ? "status in ('pending', 'failed')" : "status = 'pending'";
      const u = await c.query(`update ${t} set manual_at = now(), manual_by = $2::uuid, manual_note = $3::text where id = $1::bigint and ${est} and manual_at is null`, [sid, s.id, n]);
      if (!u.rowCount) return "Ya no está pendiente: Stripe la hizo o ya se resolvió a mano.";
    }
    await c.query(`insert into money_alert_notes (alert_id, action, staff_id, note) values ($1::bigint, $2::text, $3::uuid, $4::text)`, [id, accion, s.id, n]);
    await auditar(c, { actor: s.id, action: `dinero.alerta.${accion}`, targetKind: "money_alert", targetId: id, city: a.city,
      after: { alerta: QUE[a.kind].es, estado: ({ me_hago_cargo: "con dueño", resuelta: "resuelta", reabierta: "abierta", resuelta_a_mano: "resuelta fuera de Stripe" } as Record<string, string>)[accion]! }, reason: n });
    return "ok";
  }).catch((e: unknown) => {
    // 0209 · Ya se devolvió otra vez (o ya no está pendiente): la base no deja marcarla a mano; se dice, sin cambiar nada.
    if (/otra_vez_a_mano|dinero_a_mano: solo lo que sigue pendiente/.test(String((e as Error)?.message ?? ""))) return "Ya no está pendiente: se devolvió otra vez desde su alerta o Stripe la cerró. No se cambió nada.";
    if (/dinero_a_mano_reciente/.test(String((e as Error)?.message ?? ""))) return `Se mandó a Stripe hace menos de ${MINUTOS_ENVIO_MANO} minutos y puede no verse todavía: espera y vuelve a intentarlo. No se cambió nada.`;
    throw e;
  });
  return r === "ok" ? { ok: true } : { ok: false, msg: r };
}

/* 9t6 · La nota «resuelta» de quien decidió una gateway_review, en la transacción de su decisión (lib/revision-pasarela.ts): la alerta se cierra con ella. */
export async function notaEnTx(c: Pick<import("pg").PoolClient, "query">, alerta: string, staff: string, nota: string) {
  await c.query(`insert into money_alert_notes (alert_id, action, staff_id, note) values ($1::bigint, 'resuelta', $2::uuid, $3::text)`, [alerta, staff, nota.slice(0, 500)]);
}

/* ── 9t5 · Las alertas «sin respuesta» que se cierran solas (lib/consulta-pasarela.ts) ── */
/* La alerta «sin respuesta» de una intención se cierra sola cuando deja de estar en camino: una nota 'resuelta_sola' (sin persona), una vez. */
/* 9t7 · También refund_stuck y transfer_reversal_stuck (la consulta a la pasarela las cierra). */
export type KindSola = "charge_stuck" | "offsession_stuck" | "transfer_stuck" | "hold_stuck" | "extra_refund_stuck" | "gateway_review" | "refund_stuck" | "transfer_reversal_stuck" | "refund_failed";
export async function cerrarAlertaSola(kind: KindSola, sujeto: string, nota: Bi): Promise<boolean> {
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
/* 9t6 · También: hold_stuck (la renovación dejó de estar en camino), gateway_review (la intención se cerró: por la decisión del equipo o por su flujo) y
   extra_refund_stuck SOLO cuando la devolución quedó hecha (una que Stripe rechazó sigue abierta: alguien tiene que devolver ese dinero). */
/* 9t7 · Y refund_stuck / transfer_reversal_stuck SOLO cuando la devolución o la reversión quedó hecha (una fallida sigue abierta: si todavía se debe, alguien
   tiene que devolverla otra vez; una resuelta a mano ya tiene su nota). */
export async function cerrarAlertasResueltas(): Promise<number> {
  const L = (await db().query<{ kind: KindSola; sujeto: string; st: string }>(
    `select a.kind, a.subject_id as sujeto, o.st from money_alerts a
       join lateral (select z.status as st from subscription_charges z where a.kind = 'charge_stuck' and z.idem_key = a.subject_id
                     union all select z.status from offsession_charges z where a.kind = 'offsession_stuck' and z.idem_key = a.subject_id
                     union all select z.status from event_settlements z where a.kind = 'transfer_stuck' and a.subject_id ~ '^[0-9]{1,18}$' and z.id = a.subject_id::bigint
                     union all select z.status from hold_renewals z where a.kind = 'hold_stuck' and a.subject_id ~ '^[0-9]{1,18}$' and z.id = a.subject_id::bigint
                     union all select case when z.status = 'done' then 'refund_done' else 'pending' end from gateway_refunds z where a.kind = 'extra_refund_stuck' and a.subject_id ~ '^[0-9]{1,18}$' and z.id = a.subject_id::bigint
                     union all select z.status from subscription_charges z where a.kind = 'gateway_review' and a.subject_id ~ '^subscription_charges:[0-9]{1,18}$' and z.id = split_part(a.subject_id, ':', 2)::bigint
                     union all select z.status from offsession_charges z where a.kind = 'gateway_review' and a.subject_id ~ '^offsession_charges:[0-9]{1,18}$' and z.id = split_part(a.subject_id, ':', 2)::bigint
                     union all select z.status from event_settlements z where a.kind = 'gateway_review' and a.subject_id ~ '^event_settlements:[0-9]{1,18}$' and z.id = split_part(a.subject_id, ':', 2)::bigint
                     union all select z.status from hold_renewals z where a.kind = 'gateway_review' and a.subject_id ~ '^hold_renewals:[0-9]{1,18}$' and z.id = split_part(a.subject_id, ':', 2)::bigint
                     union all select case when z.status = 'done' then 'refund_done' else 'pending' end from refunds z where a.kind = 'refund_stuck' and a.subject_id ~ '^[0-9]{1,18}$' and z.id = a.subject_id::bigint
                     union all select case when z.status = 'done' then 'reversal_done' else 'pending' end from event_settlement_reversals z where a.kind = 'transfer_reversal_stuck' and a.subject_id ~ '^[0-9]{1,18}$' and z.id = a.subject_id::bigint
                     union all select case when z.manual_at is not null then 'manual' else z.status end from refunds z where a.kind = 'gateway_review' and a.subject_id ~ '^refunds:[0-9]{1,18}$' and z.id = split_part(a.subject_id, ':', 2)::bigint
                     union all select case when z.manual_at is not null then 'manual' else z.status end from event_settlement_reversals z where a.kind = 'gateway_review' and a.subject_id ~ '^event_settlement_reversals:[0-9]{1,18}$' and z.id = split_part(a.subject_id, ':', 2)::bigint
                     union all select case when z.manual_at is not null then 'manual' else z.status end from gateway_refunds z where a.kind = 'gateway_review' and a.subject_id ~ '^gateway_refunds:[0-9]{1,18}$' and z.id = split_part(a.subject_id, ':', 2)::bigint
                     -- 9t8 · La devolución de lo no usado de un patrocinio: su refund_stuck solo cuando quedó hecha (una fallida sigue abierta); su gateway_review como las demás.
                     union all select case when z.status = 'done' then 'refund_done' else 'pending' end from sponsorship_refunds z where a.kind = 'refund_stuck' and a.subject_id ~ '^sponsorship_refunds:[0-9]{1,18}$' and z.id = split_part(a.subject_id, ':', 2)::bigint
                     union all select case when z.manual_at is not null then 'manual' else z.status end from sponsorship_refunds z where a.kind = 'gateway_review' and a.subject_id ~ '^sponsorship_refunds:[0-9]{1,18}$' and z.id = split_part(a.subject_id, ':', 2)::bigint
                     -- 0209 · La refund_failed de unos boletos que se devolvieron otra vez: solo cuando la de otra vez quedó hecha (si falla, tiene su propia alerta).
                     union all select case when z.status = 'done' then 'refund_done' else 'pending' end from refunds z where a.kind = 'refund_failed' and a.subject_id ~ '^[0-9]{1,18}$' and z.retry_of = a.subject_id::bigint) o on true
      where a.kind in ('charge_stuck', 'offsession_stuck', 'transfer_stuck', 'hold_stuck', 'extra_refund_stuck', 'gateway_review', 'refund_stuck', 'transfer_reversal_stuck', 'refund_failed') and o.st not in ('pending', 'paying')
        and coalesce((select n.action from money_alert_notes n where n.alert_id = a.id order by n.at desc, n.id desc limit 1), '') not in ('resuelta_sola', 'resuelta', 'resuelta_a_mano')
      order by a.id limit 100`)).rows;
  let n = 0;
  for (const x of L) if (await cerrarAlertaSola(x.kind, x.sujeto, CERRADA[x.st] ?? CERRADA.failed!)) n++;
  return n;
}
/* 0209 · La devolución de otra vez falló (al mandarla, por la consulta o por el webhook): la alerta de la fallida de antes se reabre (nota 'reabierta' a nombre
   de quien pidió devolver otra vez: la base pide persona en toda nota que no sea 'resuelta_sola'), una vez, y dice dónde sigue. La nueva fallida trae su
   propia refund_failed, desde la que se puede devolver otra vez. */
export async function reabrirOtraVez(retryOf: string, nueva: string): Promise<boolean> {
  return tx(async (c) => {
    const quien = (await c.query<{ actor: string | null }>(`select actor_id::text as actor from refunds where id = $1::bigint and retry_of = $2::bigint`, [nueva, retryOf])).rows[0]?.actor;
    if (!quien) return false;
    const a = (await c.query<{ id: string }>(`select a.id::text from money_alerts a where a.kind = 'refund_failed' and a.subject_id = $1 for update`, [retryOf])).rows[0];
    if (!a) return false;
    const ult = (await c.query<{ ult: string | null }>(`select (select n.action from money_alert_notes n where n.alert_id = $1::bigint order by n.at desc, n.id desc limit 1) as ult`, [a.id])).rows[0]?.ult;
    if (ult === "reabierta" || ult === "resuelta") return false;
    await c.query(`insert into money_alert_notes (alert_id, action, staff_id, note) values ($1::bigint, 'reabierta', $3::uuid, $2)`,
      [a.id, `La devolución de otra vez (${nueva}) también falló: sigue en su propia alerta. · The refund made again (${nueva}) also failed: it continues in its own alert.`.slice(0, 500), quien]);
    return true;
  });
}

/* ── 0209 · «Devolver otra vez» unos boletos desde su alerta refund_failed (Super Admin, tx:aprobar —el permiso de Transacciones › Devolver—, tus ciudades,
   con nota). La devolución fallida no se toca; la nueva es otra fila de refunds con retry_of (la base: una sola por fallida, del mismo cobro y monto, con
   boletos, sin disputa y nunca más de lo cobrado menos lo devuelto o en camino). La llave sale de la fallida (bol-otra-<id>): el mismo toque dos veces, o
   dos personas a la vez, es la misma devolución. Va por el camino de las devoluciones de un cobro (lib/cobros: anotar → Stripe → cerrar o fallar; sin
   respuesta, el barrido y la consulta). La auditoría de quien la pide entra en la transacción que la anota. ── */
export async function devolverOtraVez(s: Staff, id: string, nota: string): Promise<{ ok: true; msg: string } | { ok: false; msg: string }> {
  const n = nota.trim().slice(0, 300);
  if (n.length < 4) return { ok: false, msg: "Escribe la nota (mínimo 4 letras)." };
  if (!/^\d{1,18}$/.test(id)) return { ok: false, msg: "Esa alerta no existe." };
  const a = (await db().query<{ sujeto: string; city: string | null; op: string | null; num: string | null; pid: string | null; amt: number | null; raiz: string | null }>(
    `select a.subject_id as sujeto, a.city_id as city, p.operation_id::text as op, o.number as num, f.payment_id::text as pid, f.amount_cents as amt,
            (select split_part(x.idem_key, '~fallida-', 1) from refunds x where x.id = coalesce(f.lines_of, f.id)) as raiz
       from money_alerts a left join refunds f on a.subject_id ~ '^[0-9]{1,18}$' and f.id = a.subject_id::bigint left join payments p on p.id = f.payment_id left join operations o on o.id = p.operation_id
      where a.id = $2::bigint and a.kind = 'refund_failed' and ${CIUD}`, [s.cities, id])).rows[0];
  if (!a) return { ok: false, msg: "Esa alerta no existe (o no es de tus ciudades)." };
  if (!a.pid || !a.amt || !a.op) return { ok: false, msg: "Esta alerta no es de unos boletos que se puedan devolver otra vez." };
  const { anotarDevolucionPago, ejecutarDevolucionPago } = await import("./cobros");
  const { auditar } = await import("./admin");
  const usd = money(a.amt);
  let rid: string, estado: string, nueva = false;
  try {
    const x = await tx(async (c) => {
      const r = await anotarDevolucionPago(c, { paymentId: a.pid!, centavos: a.amt!, por: "admin", actorId: s.id, motivo: n, idem: `bol-otra-${a.sujeto}`, otraVezDe: a.sujeto },
        async (c2, h) => {
          nueva = true;
          await auditar(c2, { actor: s.id, action: "dinero.alerta.devolver_otra_vez", targetKind: "money_alert", targetId: id, city: a.city,
            after: { alerta: QUE.refund_failed.es, orden: a.num, devolucion_fallida: a.sujeto, monto: money(h.centavos), pago: h.pago }, reason: n });
          await c2.query(`insert into money_alert_notes (alert_id, action, staff_id, note) values ($1::bigint, 'me_hago_cargo', $2::uuid, $3::text)`, [id, s.id, `Devolver otra vez ${usd}: ${n}`.slice(0, 500)]);
          // Lo que la cancelación del evento cuenta como devuelto vuelve a contar (la fallida lo había restado; si esta falla, lo resta otra vez).
          const cx = /^evtcx-(\d{1,18})-\d{1,18}$/.exec(a.raiz ?? "");
          if (cx) await c2.query(`update event_cancellations set refunded_cents = refunded_cents + $2 where id = $1::bigint`, [cx[1], h.centavos]);
        });
      return r;
    });
    if (!x.ok) return { ok: false, msg: x.msg.es };
    rid = x.id; estado = x.estado;
  } catch (e) {
    const m = String((e as Error)?.message ?? "");
    if (/devolucion_de_mas/.test(m)) return { ok: false, msg: `El cobro ya no tiene saldo para devolver ${usd}: lo demás ya se devolvió. Resuélvelo con la persona.` };
    if (/otra_vez: el cobro tiene una disputa/.test(m)) return { ok: false, msg: "El cobro tiene una disputa con el banco: el dinero va por el banco, no se devuelve desde aquí." };
    if (/otra_vez:|refunds_otra_vez_uq|idem_key/.test(m)) return { ok: false, msg: "Ya se devolvió otra vez (o ya no está fallida). Actualiza la pantalla." };
    throw e;
  }
  // La misma llave otra vez (el mismo toque, u otra persona a la vez): es la misma devolución; no se manda otra vez desde aquí (si sigue en camino, la termina
  // quien la anotó o el barrido, con la misma llave).
  if (!nueva) return { ok: true, msg: estado === "done" ? `Ya se había devuelto otra vez ${usd}: es la misma devolución.` : `Ya se pidió devolver otra vez ${usd} (es la misma devolución) y va en camino: se termina sola.` };
  const d = await ejecutarDevolucionPago(rid);
  if (d.ok) return { ok: true, msg: `Devueltos otra vez ${usd}. La persona ya lo sabe y la alerta se cerró. Quedó en la auditoría.` };
  if (d.enCamino) return { ok: true, msg: `${d.msg.es} Quedó en la auditoría.` };
  return { ok: false, msg: `Stripe dijo que no otra vez: quedó fallida y tiene su propia alerta. Quedó en la auditoría.` };
}

const CERRADA: Record<string, Bi> = {
  done: { es: "Cerrada sola: el cobro quedó hecho.", en: "Closed by itself: the charge is done." },
  failed: { es: "Cerrada sola: la intención quedó fallida (no se cobró).", en: "Closed by itself: the intent failed (nothing was charged)." },
  action: { es: "Cerrada sola: el banco pidió confirmar y el cobro siguió por la verificación.", en: "Closed by itself: the bank asked to confirm and the charge went on through verification." },
  paid: { es: "Cerrada sola: la transferencia quedó hecha.", en: "Closed by itself: the transfer is done." },
  reversed: { es: "Cerrada sola: la transferencia quedó hecha (y después se revirtió).", en: "Closed by itself: the transfer is done (and was reversed later)." },
  dropped: { es: "Cerrada sola: la retención nueva ya no hacía falta y se soltó.", en: "Closed by itself: the new hold was no longer needed and was released." },
  refund_done: { es: "Cerrada sola: la devolución quedó hecha.", en: "Closed by itself: the refund is done." },
  reversal_done: { es: "Cerrada sola: la reversión quedó hecha.", en: "Closed by itself: the reversal is done." },
  manual: { es: "Cerrada sola: se resolvió a mano desde su alerta.", en: "Closed by itself: it was resolved manually from its alert." },
};

/* ── 9t6 · gateway_review: lo que se puede elegir. lib/revision-pasarela.ts decide con esta regla y con la pasarela OTRA VEZ; la pantalla la usa solo para
   mostrar, con la última consulta anotada. Vive aquí para que la lista de alertas no dependa de otro módulo. ── */
/* 9t7 · También las intenciones que DEVUELVEN dinero: una devolución de un cobro (refunds), una reversión al organizador (event_settlement_reversals) y la
   devolución de lo que sobró (gateway_refunds). Con varias en Stripe se elige cuál vale (solo «vale»: lo que salió de más no se deshace con otra devolución);
   con otro monto no se elige (se mira en Stripe y se resuelve a mano en su alerta; el servidor vuelve a preguntar antes). */
/* 9t8 · Y la devolución de lo no usado de un patrocinio (sponsorship_refunds). */
export type T4 = "subscription_charges" | "offsession_charges" | "event_settlements" | "hold_renewals" | "refunds" | "event_settlement_reversals" | "gateway_refunds" | "sponsorship_refunds";
const REF_REV = /^(subscription_charges|offsession_charges|event_settlements|hold_renewals|refunds|event_settlement_reversals|gateway_refunds|sponsorship_refunds):(\d{1,18})$/;
const STRIPE_ID = /^(pi|tr|re|trr|pyr)_[A-Za-z0-9_]{3,200}$/;
const DEVUELVE = (t: T4) => t === "refunds" || t === "event_settlement_reversals" || t === "gateway_refunds" || t === "sponsorship_refunds";
/* Lo que se puede elegir con lo que contestó la pasarela: vale solo lo hallado, hecho y con el monto de la intención; nada en curso; y solo si Stripe sigue
   diciendo lo que pide revisión (varios, otro monto, o un cobro de Pro hecho de un período que ya estaba cobrado). */
export function elegibles(x: { t: T4; monto: number; periodoCobrado: boolean }, resultado: string, H: { id: string; estado: string; centavos: number }[]): { vale: string[]; ninguno: boolean; enCurso: boolean } {
  const enCurso = H.some((h) => h.estado === "en_curso");
  if (DEVUELVE(x.t)) return resultado !== "varios" || enCurso ? { vale: [], ninguno: false, enCurso } : { vale: H.filter((h) => h.centavos === x.monto && h.estado === "hecho").map((h) => h.id), ninguno: false, enCurso };
  const pide = resultado === "varios" || resultado === "monto_distinto" || (x.t === "subscription_charges" && resultado === "hecho" && x.periodoCobrado);
  if (!pide || enCurso) return { vale: [], ninguno: false, enCurso };
  // Un período de Pro ya cobrado con otro cobro: este no puede valer (sería cobrar dos veces el mismo período); solo se devuelve.
  const vale = x.t === "subscription_charges" && x.periodoCobrado ? [] : H.filter((h) => h.estado === "hecho" && h.centavos === x.monto).map((h) => h.id);
  // Una transferencia que sobra se revierte; «ninguna vale» no: la llave de la transferencia ya se usó y el organizador espera su pago.
  return { vale, ninguno: x.t !== "event_settlements", enCurso };
}
/* 9t6 (0205) · Cada cosa que Stripe tiene para la intención, como la ve la hoja «Elegir cuál vale»: su id, su monto, cuándo se creó y si se puede elegir
   (si no, por qué: otro monto, no salió, sigue en curso, o el período de Pro ya estaba cobrado). Solo para mostrar: al decidir, el servidor vuelve a
   preguntar a la pasarela (revision-pasarela.ts › decidirRevision) y decide con ESA respuesta. centavos y creado son null en una consulta anterior a 0205
   (sin detalle guardado): entonces se ofrecen los ids como antes. */
export type PorQueNo = "otro_monto" | "no_salio" | "en_curso" | "periodo_cobrado";
export type OpcionRevision = { id: string; centavos: number | null; creado: string | null; vale: boolean; por: PorQueNo | null };
/* tz: la zona de la ciudad de la alerta (null: sin ciudad; la pantalla usa la del sandbox, como el resto del Super Admin). mas: cuántos halló la consulta
   que no se guardaron con su detalle (tope de 0205). */
/* 9t7 · devuelve: la intención devuelve dinero (lo que salió de más no se devuelve: la hoja lo dice). */
export type Revisar = { vale: string[]; ninguno: boolean; hallados: OpcionRevision[]; tz: string | null; mas: number; devuelve: boolean };
type Guardado = { id: string; estado: string; centavos: number; creado?: string | null };
/* El primero arriba: por cuándo se creó; lo que no trae fecha, al final y en el orden en que llegó. */
function porCreacion<T extends { creado?: string | null }>(H: T[]): T[] {
  return H.map((h, i) => ({ h, i })).sort((a, b) => (a.h.creado && b.h.creado ? (a.h.creado < b.h.creado ? -1 : a.h.creado > b.h.creado ? 1 : a.i - b.i) : a.h.creado ? -1 : b.h.creado ? 1 : a.i - b.i)).map((x) => x.h);
}
/* Para la pantalla (solo mostrar; el servidor decide al guardar): qué se puede elegir en cada alerta gateway_review abierta, según la ÚLTIMA consulta
   anotada (una consulta solo se hace pasada la ventana de la llave). Una sentencia para todas (sin N+1). */
export async function opcionesDeAlertas(L: { id: string; sujeto: string }[]): Promise<Map<string, Revisar>> {
  const out = new Map<string, Revisar>();
  const P = L.map((a) => ({ a: a.id, m: REF_REV.exec(a.sujeto) })).filter((x): x is { a: string; m: RegExpExecArray } => !!x.m);
  if (!P.length) return out;
  const R = (await db().query<{ a: string; t: T4; vivo: boolean; monto: number; pc: boolean; res: string | null; ids: string | null; cents: number | null; found: Guardado[] | null; n: number; tz: string | null; rev: boolean }>(
    `with s as (select * from unnest($1::text[], $2::text[], $3::bigint[]) as s(a, t, id))
     select s.a, s.t, coalesce(z.vivo, false) as vivo, coalesce(z.monto, 0) as monto, coalesce(z.pc, false) as pc, g.result as res, g.stripe_id as ids, g.amount_cents as cents,
            g.found, coalesce(g.found_n, 0)::int as n, ci.timezone as tz,
            exists (select 1 from gateway_reviews r where r.subject_kind = s.t and r.subject_id = s.id) as rev
       from s
       left join money_alerts al on al.id = s.a::bigint
       left join cities ci on ci.id = al.city_id
       left join lateral (
         select y.status = 'pending' as vivo, y.amount_cents as monto,
                exists (select 1 from subscription_charges w where w.business_id = y.business_id and w.period_start = y.period_start and w.status = 'done' and w.id <> y.id) as pc
           from subscription_charges y where s.t = 'subscription_charges' and y.id = s.id
         union all select y.status = 'pending', y.amount_cents, false from offsession_charges y where s.t = 'offsession_charges' and y.id = s.id
         union all select y.status = 'paying' and y.net_cents > 0, y.net_cents, false from event_settlements y where s.t = 'event_settlements' and y.id = s.id
         union all select y.status = 'pending', y.amount_cents, false from hold_renewals y where s.t = 'hold_renewals' and y.id = s.id
         union all select y.status = 'pending' and y.manual_at is null, y.amount_cents, false from refunds y where s.t = 'refunds' and y.id = s.id
         union all select y.status = 'pending' and y.manual_at is null, y.amount_cents, false from event_settlement_reversals y where s.t = 'event_settlement_reversals' and y.id = s.id
         union all select y.status = 'pending' and y.manual_at is null, y.amount_cents, false from gateway_refunds y where s.t = 'gateway_refunds' and y.id = s.id
         union all select y.status = 'pending' and y.manual_at is null, y.amount_cents, false from sponsorship_refunds y where s.t = 'sponsorship_refunds' and y.id = s.id
       ) z on true
       -- La última consulta que CONTESTÓ (una que no contestó no cambia lo que hay que decidir).
       left join lateral (select x.result, x.stripe_id, x.amount_cents, x.found, x.found_n from gateway_checks x where x.subject_kind = s.t and x.subject_id = s.id and x.result <> 'sin_respuesta' order by x.at desc, x.id desc limit 1) g on true`,
    [P.map((x) => x.a), P.map((x) => x.m[1]!), P.map((x) => x.m[2]!)])).rows;
  for (const r of R) {
    if (!r.vivo || r.rev || !r.res) continue;
    // Con detalle (0205): cada hallado con su estado, su monto y cuándo se creó, el primero arriba.
    const det = Array.isArray(r.found) ? porCreacion(r.found.filter((h) => STRIPE_ID.test(h.id))) : null;
    // Sin detalle (una consulta anterior a 0205): «varios» guardó solo los ids (sin montos: se ofrecen y el servidor comprueba el monto al decidir); uno
    // solo, con su monto.
    const ids = (r.ids ?? "").split(",").filter((x) => STRIPE_ID.test(x));
    const H = det ?? (r.res === "varios" ? ids.map((x) => ({ id: x, estado: "hecho", centavos: r.monto })) : ids.map((x) => ({ id: x, estado: r.res === "hecho" || r.res === "monto_distinto" ? "hecho" : "en_curso", centavos: r.cents ?? 0 })));
    // Uno que sigue en curso se muestra (con su porqué) y no se puede elegir; lo demás se ofrece igual: la alerta sigue decidiéndose desde aquí (no se
    // marca «Resuelta» sin decidir) y, al decidir, el servidor vuelve a preguntar y espera si todavía hay algo en curso.
    const e = elegibles({ t: r.t, monto: r.monto, periodoCobrado: r.pc }, r.res, H.filter((h) => h.estado !== "en_curso"));
    if (!e.vale.length && !e.ninguno) continue;
    const hallados = H.map((h): OpcionRevision => {
      const vale = e.vale.includes(h.id);
      const por: PorQueNo | null = vale ? null : h.estado === "en_curso" ? "en_curso" : h.estado !== "hecho" ? "no_salio" : r.t === "subscription_charges" && r.pc ? "periodo_cobrado" : h.centavos !== r.monto ? "otro_monto" : null;
      return { id: h.id, centavos: det || r.res !== "varios" ? h.centavos : null, creado: det ? ((h as Guardado).creado ?? null) : null, vale, por };
    });
    out.set(r.a, { vale: e.vale, ninguno: e.ninguno, hallados, tz: r.tz, mas: det ? Math.max(0, r.n - det.length) : 0, devuelve: DEVUELVE(r.t) });
  }
  return out;
}
