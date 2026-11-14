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
export type TipoAlerta = "refund_stuck" | "transfer_reversal_stuck" | "dispute_due" | "recon_diff" | "recon_no_corrio" | "payout_failed";
type Bi = { es: string; en: string };
const QUE: Record<TipoAlerta, Bi> = {
  refund_stuck: { es: "una devolución atascada", en: "a stuck refund" }, transfer_reversal_stuck: { es: "una transferencia sin saldo para revertir", en: "a transfer that cannot be reversed" },
  dispute_due: { es: "una disputa por vencer", en: "a dispute about to expire" }, recon_diff: { es: "el dinero no cuadra", en: "money does not match" },
  recon_no_corrio: { es: "la conciliación no corrió", en: "reconciliation did not run" }, payout_failed: { es: "un pago al banco falló", en: "a bank payout failed" },
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
  return n;
}

/* ── Super Admin › Planes › Ingresos · Alertas del dinero ── */
export type FilaAlerta = { id: string; kind: TipoAlerta; sujeto: string; negocio: string | null; nombre: string | null; ciudad: string | null; monto: number; detalle: Bi; at: string;
  estado: "abierta" | "con_dueno" | "resuelta"; nota: { accion: string; quien: string; nota: string; at: string } | null; aMano: boolean };
const CIUD = "(cardinality($1::text[]) = 0 or a.city_id = any($1::text[]))";
export async function alertasDinero(s: Staff, abiertas: boolean, antes: string | null = null, n = 30): Promise<{ filas: FilaAlerta[]; sigue: string | null }> {
  const r = await db().query<Omit<FilaAlerta, "estado" | "aMano"> & { monto: string; ult: string | null }>(
    `select a.id::text, a.kind, a.subject_id as sujeto, a.business_id as negocio, b.name as nombre, a.city_id as ciudad, coalesce(a.amount_cents, 0)::text as monto, a.detail as detalle,
            to_char(a.at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at, x.action as ult,
            case when x.action is null then null else json_build_object('accion', x.action, 'quien', x.quien, 'nota', x.note, 'at', to_char(x.at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')) end as nota
       from money_alerts a left join businesses b on b.id = a.business_id
       left join lateral (select n.action, n.note, n.at, coalesce(nullif(trim(coalesce(u.first_name, '') || ' ' || left(coalesce(u.last_name, ''), 1)), ''), 'Equipo') as quien
                            from money_alert_notes n left join users u on u.id = n.staff_id where n.alert_id = a.id order by n.at desc, n.id desc limit 1) x on true
      where ${CIUD} and ($2::boolean is false or coalesce(x.action, 'reabierta') not in ('resuelta', 'resuelta_a_mano')) and ($3::bigint is null or a.id < $3::bigint)
      order by a.id desc limit $4::int`, [s.cities, abiertas, antes, n + 1]);
  const filas = r.rows.slice(0, n).map(({ ult, ...x }) => ({ ...x, monto: Number(x.monto), estado: (ult === "resuelta" || ult === "resuelta_a_mano" ? "resuelta" : ult === "me_hago_cargo" ? "con_dueno" : "abierta") as FilaAlerta["estado"],
    aMano: (x.kind === "refund_stuck" || x.kind === "transfer_reversal_stuck") && ult !== "resuelta_a_mano" }));
  return { filas, sigue: r.rows.length > n ? filas[filas.length - 1]!.id : null };
}
export async function cuantasAlertasAbiertas(s: Staff): Promise<number> {
  return (await db().query<{ n: number }>(
    `select count(*)::int as n from money_alerts a where ${CIUD}
        and coalesce((select n.action from money_alert_notes n where n.alert_id = a.id order by n.at desc, n.id desc limit 1), 'reabierta') not in ('resuelta', 'resuelta_a_mano', 'me_hago_cargo')`, [s.cities])).rows[0]!.n;
}

/* «Me hago cargo», «Resuelta», «Reabrir» o «Resolver a mano» (la devolución o la reversión se hizo fuera de Stripe: con nota, una vez, y el barrido
   deja de reintentarla). Solo inserción + la auditoría; lo llama la acción con permiso (tx:aprobar). */
export async function notaAlerta(s: Staff, id: string, accion: "me_hago_cargo" | "resuelta" | "reabierta" | "resuelta_a_mano", nota: string): Promise<{ ok: true } | { ok: false; msg: string }> {
  const n = nota.trim().slice(0, 500);
  if (n.length < 4) return { ok: false, msg: "Escribe la nota (mínimo 4 letras)." };
  if (!/^\d{1,18}$/.test(id)) return { ok: false, msg: "Esa alerta no existe." };
  const a = (await db().query<{ kind: TipoAlerta; sujeto: string; city: string | null }>(`select a.kind, a.subject_id as sujeto, a.city_id as city from money_alerts a where a.id = $2::bigint and ${CIUD}`, [s.cities, id])).rows[0];
  if (!a) return { ok: false, msg: "Esa alerta no existe (o no es de tus ciudades)." };
  if (accion === "resuelta_a_mano" && a.kind !== "refund_stuck" && a.kind !== "transfer_reversal_stuck") return { ok: false, msg: "Esta alerta no tiene camino manual." };
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
