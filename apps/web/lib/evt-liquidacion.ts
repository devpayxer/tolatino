import "server-only";
import type { PoolClient } from "pg";
import type { Staff } from "./admin";
import { cfgSql } from "./config";
import { db, tx } from "./db";
import { bi, diaCorto, dinero, hora, type Bi } from "./evt-comun";
import { pasarela } from "./pagos/pasarela";

/* 6e · La liquidación del martes (fase6-eventos.md §3 «Dónde vive el dinero», §6 #2 y #16). El cobro de boletos queda en la plataforma
   (transfer_group = el evento) y al organizador se le transfiere, POR FECHA, el martes (evt_pago_dia) después de que termina:
     lo del organizador = cobrado − devuelto − perdido en disputas − comisión de To'Latino (la que no cedió).
   - Los montos NO salen de este archivo ni de una pantalla: al pasar la liquidación a 'paying' la base los calcula del libro (evt_liq_calc
     sobre payments, refunds, ticket_refund_lines y disputes), descuenta la deuda de ajustes posteriores (evt_liq_deuda) y SOLO deja pasar
     una fecha terminada, con su martes llegado, sin disputas abiertas, sin devoluciones pendientes, sin cobros a medias, sin boletos vivos
     de una fecha cancelada, con la cuenta de cobro habilitada y sin retener, y sin la retención del organizador nuevo (event_settlements_antes).
   - Una transferencia por fecha: la llave de Stripe es la de la liquidación (`evt-liq-<fecha>`, única); los reintentos van con la MISMA
     llave y el MISMO monto (ya fijo en 'paying'); 'paid' una sola vez (where status = 'paying').
   - Retenida: disputa abierta (sale sola al cerrarse), cuenta de cobro pausada o sin habilitar (sale sola), primer evento de un organizador
     nuevo sobre evt_retener_nuevo_cents (caso en Colas «Pagos de eventos retenidos»: la suelta Finanzas) o retenida por To'Latino con motivo.
   - Ajuste después de pagar (una devolución o una disputa perdida de una fecha ya pagada): resta de la siguiente liquidación del organizador;
     si en evt_ajuste_dias no hay otra, se revierte la transferencia (dos pasos, la misma llave en cada reintento; nunca más de lo transferido).
   Todo movimiento de dinero deja su AuditEntry (solo inserción). */
type Q = Pick<PoolClient, "query">;
type Res<T = object> = ({ ok: true } & T) | { ok: false; msg: string };
const ISO = (x: string) => `to_char((${x}) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;
async function auditar(c: Q, x: { actor: string | null; action: string; id: string; city: string; after: unknown; reason?: string | null }) {
  await c.query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, after, reason) values ($1, $2, $3, 'event_settlement', $4, $5, $6::jsonb, $7)`,
    [x.actor ? "staff" : "system", x.actor, x.action, x.id, x.city, JSON.stringify(x.after), x.reason ?? null]);
}
const MOTIVO_HOLD: Record<string, Bi> = {
  disputa: { es: "Hay una disputa abierta con el banco de un comprador: sale cuando se cierre.", en: "A buyer's bank dispute is open: it goes out once it closes." },
  nuevo: { es: "Es tu primer evento grande: To'Latino lo revisa antes de pagar.", en: "It is your first large event: To'Latino reviews it before paying." },
  cuenta: { es: "Tu cuenta de cobro no recibe pagos ahora (revísala en Cobros).", en: "Your payout account cannot receive payouts right now (check Payouts)." },
  admin: { es: "To'Latino lo retuvo para revisarlo.", en: "To'Latino held it to review it." },
};

/* 1) Cada fecha terminada con cobros de boletos tiene su liquidación (una por fecha; una fecha cancelada, solo con su cancelación hecha). */
export async function crearLiquidaciones(): Promise<number> {
  const r = await db().query(
    `insert into event_settlements (event_date_id)
     select d.id from event_dates d join events e on e.id = d.event_id
      where d.ends_at < now() and d.ends_at > now() - interval '180 days' and not exists (select 1 from event_settlements s where s.event_date_id = d.id)
        and exists (select 1 from operations o join payments p on p.operation_id = o.id and p.kind = 'full' and p.transfer_group is not null
                     where o.kind = 'tickets' and (o.details->>'event_date_id')::bigint = d.id and p.status in ('captured', 'partially_refunded', 'refunded'))
        and (not (d.status = 'cancelled' or e.status = 'cancelled')
             or exists (select 1 from event_cancellations x where x.event_id = e.id and (x.event_date_id is null or x.event_date_id = d.id) and x.status = 'done'))
      order by d.ends_at limit 500
     on conflict (event_date_id) do nothing`);
  return r.rowCount ?? 0;
}

/* 2) Las que llegan a su martes: retener con su motivo o pagar. */
export async function liquidar(): Promise<{ pagadas: number; retenidas: number }> {
  await crearLiquidaciones();
  const L = (await db().query<{ id: string; st: string; hk: string | null; eid: string; biz: string; city: string; acc: boolean; nuevo: boolean; abiertas: number; pend: number; held: number; vivos: number }>(
    `select s.id::text, s.status as st, s.hold_kind as hk, s.event_id::text as eid, s.business_id as biz, s.city_id as city,
            exists (select 1 from stripe_accounts a where a.business_id = s.business_id and a.stripe_account_id is not null and a.payouts_enabled and not a.payouts_paused) as acc,
            evt_liq_retener_nuevo(s.event_id, s.business_id) as nuevo, k.abiertas, k.pendientes as pend, k.retenidos as held, k.vivos_cx as vivos
       from event_settlements s join cities ci on ci.id = s.city_id cross join lateral evt_liq_calc(s.event_date_id) k
      where (s.status = 'pending' or (s.status = 'held' and s.hold_kind in ('disputa', 'cuenta'))) and s.pay_on <= (now() at time zone ci.timezone)::date
      order by s.pay_on, s.id limit 100`)).rows;
  let pagadas = 0, retenidas = 0;
  for (const s of L) {
    // El organizador nuevo: lo suelta una persona (Finanzas) desde Colas; las demás retenciones salen solas.
    const hold = s.nuevo ? "nuevo" : s.abiertas > 0 ? "disputa" : !s.acc ? "cuenta" : null;
    if (hold) {
      if (s.st !== "held" || s.hk !== hold) { await retenerAuto(s.id, hold); retenidas++; }
      continue;
    }
    if (s.pend > 0 || s.held > 0 || s.vivos > 0) continue; // devoluciones o cobros a medias: espera a que terminen (el barrido los acaba)
    const ok = await tx(async (c) => {
      if (s.st === "held") await c.query(`update event_settlements set status = 'pending', hold_kind = null, hold_note = null where id = $1::bigint and status = 'held'`, [s.id]);
      const u = await c.query(`update event_settlements set status = 'paying' where id = $1::bigint and status = 'pending'`, [s.id]);
      return !!u.rowCount;
    }).catch((e) => { console.error("[evt-liquidacion] pagar", s.id, String((e as Error)?.message ?? e).slice(0, 200)); return false; });
    if (ok && (await pagarUna(s.id))) pagadas++;
  }
  return { pagadas, retenidas };
}
async function retenerAuto(id: string, hold: "nuevo" | "disputa" | "cuenta") {
  const s = await tx(async (c) => {
    const x = (await c.query<{ biz: string; city: string; t: Bi; dia: string; h0: number; eid: string }>(
      `update event_settlements s set status = 'held', hold_kind = $2, hold_note = null, held_at = now(), held_by = null from event_dates d, events e, cities ci
        where s.id = $1::bigint and s.status in ('pending', 'held') and d.id = s.event_date_id and e.id = s.event_id and ci.id = s.city_id
        returning s.business_id as biz, s.city_id as city, e.title as t, d.local_date::text as dia, (extract(hour from d.starts_at at time zone ci.timezone) * 60 + extract(minute from d.starts_at at time zone ci.timezone))::int as h0, s.event_id::text as eid`, [id, hold])).rows[0];
    if (!x) return null;
    await auditar(c, { actor: null, action: "evento.liquidacion.retener", id, city: x.city, after: { motivo: MOTIVO_HOLD[hold]!.es } });
    if (hold === "nuevo") await c.query(`insert into queue_items (queue, subject_kind, subject_id, business_id, city_id, priority) values ('evtpago', 'event_settlement', $1, $2, $3, 'alta')
                                         on conflict (queue, subject_kind, subject_id) where status = 'open' do nothing`, [id, x.biz, x.city]);
    return x;
  });
  if (!s) return;
  // Un aviso por liquidación y motivo.
  if ((await db().query(`select 1 from notifications where tpl = 'evt_pago_retenido' and ref_kind = 'evt_liq' and ref_id = $1 limit 1`, [`${id}:${hold}`])).rowCount) return;
  await (await import("./avisos")).avisarNegocio(s.biz, "evt_pago_retenido", { evento: s.t.es, cuando: `${diaCorto(s.dia, true)} · ${hora(s.h0)}`, motivo: MOTIVO_HOLD[hold]!.es }, { href: `/panel/${s.biz}/cobros`, ref: ["evt_liq", `${id}:${hold}`] });
}

/* La transferencia de una liquidación ya en 'paying' (monto y destino fijos). Idempotente: la misma llave en cada intento. */
export async function pagarUna(id: string): Promise<boolean> {
  const s = (await db().query<{ id: string; st: string; net: number; dest: string; idem: string; eid: string; fid: string; biz: string; city: string; t: Bi; dia: string; h0: number }>(
    `select s.id::text, s.status as st, s.net_cents as net, s.destination as dest, s.idem_key as idem, s.event_id::text as eid, s.event_date_id::text as fid, s.business_id as biz, s.city_id as city,
            e.title as t, d.local_date::text as dia, (extract(hour from d.starts_at at time zone ci.timezone) * 60 + extract(minute from d.starts_at at time zone ci.timezone))::int as h0
       from event_settlements s join events e on e.id = s.event_id join event_dates d on d.id = s.event_date_id join cities ci on ci.id = s.city_id where s.id = $1::bigint`, [id])).rows[0];
  if (!s || s.st !== "paying") return s?.st === "paid";
  let tr: string | null = null;
  if (s.net > 0) {
    const r = await pasarela.transferir({ centavos: s.net, destino: s.dest, grupo: `evt-${s.eid}`, idem: s.idem, meta: { event_date_id: s.fid, business_id: s.biz, settlement: s.id } }).catch(() => ({ ok: false as const, codigo: "error" }));
    if (!r.ok || !("id" in r) || !r.id) {
      await db().query(`update event_settlements set attempts = least(10000, attempts + 1), last_error = left($2, 120) where id = $1::bigint and status = 'paying'`, [id, ("codigo" in r && r.codigo) || "error"]);
      return false;
    }
    tr = r.id;
  }
  const ok = await tx(async (c) => {
    const u = await c.query(`update event_settlements set status = 'paid', transfer_id = $2, paid_at = now(), last_error = null where id = $1::bigint and status = 'paying'`, [id, tr]);
    if (!u.rowCount) return false;
    await auditar(c, { actor: null, action: "evento.liquidacion.pagar", id, city: s.city, after: { monto: dinero(s.net), transferencia: tr ?? "sin transferencia (neto $0)" } });
    return true;
  });
  if (ok && s.net > 0) await (await import("./avisos")).avisarNegocio(s.biz, "evt_pago", { evento: s.t.es, cuando: `${diaCorto(s.dia, true)} · ${hora(s.h0)}`, monto: dinero(s.net) }, { href: `/panel/${s.biz}/cobros`, ref: ["evt_liq", s.id] });
  return ok;
}

/* 3) Lo que quedó en camino (la app se cortó o Stripe no respondió): se reintenta con la misma llave y el mismo monto. */
export async function repararLiquidaciones(): Promise<number> {
  const L = (await db().query<{ id: string }>(`select id::text from event_settlements where status = 'paying' and paying_at < now() - interval '1 minute' order by paying_at limit 50`)).rows;
  let n = 0;
  for (const s of L) if (await pagarUna(s.id)) n++;
  // Las reversiones pendientes, con su llave.
  const R = (await db().query<{ id: string }>(`select id::text from event_settlement_reversals where status = 'pending' and manual_at is null and created_at < now() - interval '30 seconds' order by created_at limit 50`)).rows;
  for (const r of R) await ejecutarReversion(r.id);
  return n;
}

/* 4) Ajustes sin liquidación siguiente: si el organizador debe algo de fechas ya pagadas y en evt_ajuste_dias no tuvo otra liquidación (ni
   tiene fechas por delante con cobros), se revierte de sus transferencias más recientes. */
export async function revertirDeudas(): Promise<number> {
  const B = (await db().query<{ biz: string }>(
    `select distinct s.business_id as biz from event_settlements s where s.status in ('paid', 'reversed') and s.paid_at < now() - make_interval(days => ${cfgSql("evt_ajuste_dias")})
        and not exists (select 1 from event_settlements z where z.business_id = s.business_id and (z.status in ('pending', 'held', 'paying') or z.paid_at >= now() - make_interval(days => ${cfgSql("evt_ajuste_dias")})))
        and not exists (select 1 from event_dates d join events e on e.id = d.event_id where e.business_id = s.business_id and d.status = 'scheduled' and d.ends_at > now()
                          and exists (select 1 from payments p where p.transfer_group = 'evt-' || e.id and p.status in ('captured', 'partially_refunded')))
        and evt_liq_deuda(s.business_id) > 0 limit 50`)).rows;
  let n = 0;
  for (const { biz } of B) {
    const ids = await tx(async (c) => {
      await c.query(`select pg_advisory_xact_lock(hashtext('evt-liq:' || $1))`, [biz]);
      let deuda = (await c.query<{ d: number }>(`select evt_liq_deuda($1) as d`, [biz])).rows[0]!.d;
      const S = (await c.query<{ id: string; resto: number; n: number }>(
        `select s.id::text, s.net_cents - coalesce((select sum(r.amount_cents) from event_settlement_reversals r where r.settlement_id = s.id), 0) as resto,
                (select count(*)::int from event_settlement_reversals r where r.settlement_id = s.id) as n
           from event_settlements s where s.business_id = $1 and s.status = 'paid' and s.transfer_id is not null order by s.paid_at desc, s.id desc limit 20`, [biz])).rows;
      const out: string[] = [];
      for (const s of S) {
        if (deuda <= 0) break;
        const q = Math.min(deuda, s.resto);
        if (q <= 0) continue;
        out.push((await c.query<{ id: string }>(`insert into event_settlement_reversals (settlement_id, business_id, city_id, amount_cents, idem_key) values ($1::bigint, '', '', $2, $3) returning id::text`,
          [s.id, q, `evt-rev-${s.id}-${s.n + 1}`])).rows[0]!.id);
        deuda -= q;
      }
      return out;
    });
    for (const id of ids) if (await ejecutarReversion(id)) n++;
  }
  return n;
}
async function ejecutarReversion(id: string): Promise<boolean> {
  const r = (await db().query<{ id: string; st: string; amt: number; idem: string; tr: string; sid: string; city: string; net: number }>(
    `select r.id::text, r.status as st, r.amount_cents as amt, r.idem_key as idem, s.transfer_id as tr, s.id::text as sid, s.city_id as city, s.net_cents as net
       from event_settlement_reversals r join event_settlements s on s.id = r.settlement_id where r.id = $1::bigint`, [id])).rows[0];
  if (!r || r.st !== "pending") return r?.st === "done";
  // 9k · Resuelta a mano (se le cobró al organizador fuera de Stripe): no se vuelve a pedir a Stripe.
  if ((await db().query(`select 1 from event_settlement_reversals where id = $1::bigint and manual_at is not null`, [id])).rowCount) return false;
  const x = await pasarela.revertirTransferencia(r.tr, r.amt, r.idem).catch(() => ({ ok: false as const, codigo: "error" }));
  if (!x.ok) { await db().query(`update event_settlement_reversals set attempts = least(10000, attempts + 1), last_error = left($2, 120) where id = $1::bigint and status = 'pending'`, [id, ("codigo" in x && x.codigo) || "error"]); return false; }
  return tx(async (c) => {
    const u = await c.query(`update event_settlement_reversals set status = 'done', stripe_reversal_id = $2, last_error = null where id = $1::bigint and status = 'pending'`, [id, ("id" in x && x.id) || null]);
    if (!u.rowCount) return false;
    await c.query(`update event_settlements s set status = 'reversed' where s.id = $1::bigint and s.status = 'paid' and (select coalesce(sum(amount_cents), 0) from event_settlement_reversals where settlement_id = s.id and status = 'done') >= s.net_cents`, [r.sid]);
    await auditar(c, { actor: null, action: "evento.liquidacion.revertir", id: r.sid, city: r.city, after: { monto: dinero(r.amt), motivo: "Ajuste después de pagar sin otra liquidación" } });
    return true;
  });
}

/* ── Super Admin › Liquidaciones de eventos: retener con motivo / soltar (Finanzas, tx:aprobar). ── */
const CIUD = "(cardinality($2::text[]) = 0 or s.city_id = any($2::text[]))";
export async function retenerLiquidacion(s: Staff, id: string, motivo: string): Promise<Res> {
  if (!/^\d{1,18}$/.test(id)) return { ok: false, msg: "Esa liquidación no existe." };
  const m = String(motivo ?? "").trim().slice(0, 300);
  if (m.length < 4) return { ok: false, msg: "Escribe el motivo." };
  const r = await tx(async (c) => {
    const x = (await c.query<{ city: string; st: string; biz: string; hk: string | null }>(`select s.city_id as city, s.status as st, s.business_id as biz, s.hold_kind as hk from event_settlements s where s.id = $1::bigint and ${CIUD} for update`, [id, s.cities])).rows[0];
    if (!x) return "Esa liquidación no existe.";
    if (!["pending", "held"].includes(x.st)) return "Ya se pagó o va en camino: no se retiene.";
    if (x.st === "held" && x.hk === "admin") return "Ya está retenida por To'Latino.";
    await c.query(`update event_settlements set status = 'held', hold_kind = 'admin', hold_note = $2, held_at = now(), held_by = $3 where id = $1::bigint`, [id, m, s.id]);
    await c.query(`update queue_items set status = 'decided', decision = 'retener', reason = $3, decided_by = $2, decided_at = now() where queue = 'evtpago' and subject_kind = 'event_settlement' and subject_id = $1 and status = 'open'`, [id, s.id, m]);
    await auditar(c, { actor: s.id, action: "evento.liquidacion.retener", id, city: x.city, after: { estado: "retenida por To'Latino" }, reason: m });
    return `ok:${x.biz}`;
  });
  if (!r.startsWith("ok:")) return { ok: false, msg: r };
  const biz = r.slice(3), d = await datosAviso(id);
  if (d) await (await import("./avisos")).avisarNegocio(biz, "evt_pago_retenido", { evento: d.t, cuando: d.cuando, motivo: `${MOTIVO_HOLD.admin!.es} ${m}.` }, { href: `/panel/${biz}/cobros`, ref: ["evt_liq", `${id}:admin`] });
  return { ok: true };
}
export async function soltarLiquidacion(s: Staff, id: string, motivo: string): Promise<Res> {
  if (!/^\d{1,18}$/.test(id)) return { ok: false, msg: "Esa liquidación no existe." };
  const m = String(motivo ?? "").trim().slice(0, 300);
  if (m.length < 4) return { ok: false, msg: "Escribe el motivo." };
  const r = await tx(async (c) => {
    const x = (await c.query<{ city: string; st: string; hk: string | null; biz: string }>(`select s.city_id as city, s.status as st, s.hold_kind as hk, s.business_id as biz from event_settlements s where s.id = $1::bigint and ${CIUD} for update`, [id, s.cities])).rows[0];
    if (!x) return "Esa liquidación no existe.";
    if (x.st !== "held") return "No está retenida.";
    if (x.hk === "disputa" || x.hk === "cuenta") return "Esta retención sale sola cuando se cierre la disputa o la cuenta reciba pagos.";
    await c.query(`update event_settlements set status = 'pending', hold_kind = null, hold_note = null, released_at = now(), released_by = $2, release_note = $3 where id = $1::bigint`, [id, s.id, m]);
    // El primer evento grande ya lo miró Confianza: sus siguientes eventos no se retienen por eso.
    if (x.hk === "nuevo") await c.query(`insert into event_organizers (business_id, city_id, payout_cleared_at, payout_cleared_by, payout_cleared_note) values ($1, $2, now(), $3, $4)
                                         on conflict (business_id) do update set payout_cleared_at = now(), payout_cleared_by = $3, payout_cleared_note = $4`, [x.biz, x.city, s.id, m]);
    await c.query(`update queue_items set status = 'decided', decision = 'soltar', reason = $3, decided_by = $2, decided_at = now() where queue = 'evtpago' and subject_kind = 'event_settlement' and subject_id = $1 and status = 'open'`, [id, s.id, m]);
    await auditar(c, { actor: s.id, action: "evento.liquidacion.soltar", id, city: x.city, after: { estado: "pendiente: sale en el siguiente barrido" }, reason: m });
    return "ok";
  });
  return r === "ok" ? { ok: true } : { ok: false, msg: r };
}
async function datosAviso(id: string) {
  return (await db().query<{ t: string; cuando: string }>(
    `select e.title->>'es' as t, to_char(d.starts_at at time zone ci.timezone, 'DD/MM HH12:MI AM') as cuando from event_settlements s join events e on e.id = s.event_id join event_dates d on d.id = s.event_date_id join cities ci on ci.id = s.city_id where s.id = $1::bigint`, [id])).rows[0] ?? null;
}

/* ── Lo que ve el organizador (Panel › la ficha › DINERO DEL EVENTO y Panel › Cobros › PAGOS DE EVENTOS) ── */
export type FilaLiq = {
  id: string | null; fecha: string; evento: Bi; eid: string; dia: string; h0: number; st: "proxima" | "pendiente" | "retenida" | "pagando" | "pagada" | "revertida";
  motivo: Bi | null; payOn: string; bruto: number; comision: number; devuelto: number; disputa: number; base: number; descontado: number; neto: number; pagada: string | null; cancelada: boolean;
};
export async function liquidacionesPanel(negocio: string, eventoId: string | null): Promise<{ filas: FilaLiq[]; deuda: number }> {
  const r = (await db().query<{ id: string | null; fid: string; t: Bi; eid: string; dia: string; h0: number; st: string | null; hk: string | null; hn: string | null; pay_on: string; gross: number; fee: number; refunded: number; disputed: number; base: number; carry: number; net: number; paid: string | null; cx: boolean;
    kg: number; kf: number; kr: number; kd: number; kb: number }>(
    `select s.id::text, d.id::text as fid, e.title as t, e.id::text as eid, d.local_date::text as dia,
            (extract(hour from d.starts_at at time zone ci.timezone) * 60 + extract(minute from d.starts_at at time zone ci.timezone))::int as h0,
            s.status as st, s.hold_kind as hk, s.hold_note as hn, coalesce(s.pay_on, evt_pago_dia((d.ends_at at time zone ci.timezone)::date))::text as pay_on,
            s.gross_cents as gross, s.fee_cents as fee, s.refunded_cents as refunded, s.disputed_cents as disputed, s.base_cents as base, s.carry_cents as carry, s.net_cents as net,
            ${ISO("s.paid_at")} as paid, d.status = 'cancelled' or e.status = 'cancelled' as cx,
            k.gross as kg, k.fee as kf, k.refunded as kr, k.disputed as kd, k.base as kb
       from event_dates d join events e on e.id = d.event_id join cities ci on ci.id = d.city_id left join event_settlements s on s.event_date_id = d.id
       cross join lateral evt_liq_calc(d.id) k
      where e.business_id = $1 and ($2::bigint is null or e.id = $2::bigint) and e.entry = 'tickets'
        and (s.id is not null or (k.gross > 0 and d.ends_at > now() - interval '180 days'
             and ((d.status = 'scheduled' and e.status in ('live', 'paused')) or exists (select 1 from event_cancellations x where x.event_id = e.id and (x.event_date_id is null or x.event_date_id = d.id)))))
      -- 6j · Primero las fechas que ya pasaron (su dinero está en camino o pagado; la más reciente arriba) y después las próximas.
      order by (d.starts_at > now()), d.starts_at desc limit 60`, [negocio, eventoId])).rows;
  const deuda = (await db().query<{ d: number }>(`select evt_liq_deuda($1) as d`, [negocio])).rows[0]?.d ?? 0;
  return {
    deuda,
    filas: r.map((x): FilaLiq => {
      const fijo = x.st === "paying" || x.st === "paid" || x.st === "reversed";
      const st: FilaLiq["st"] = !x.st ? "proxima" : x.st === "pending" ? "pendiente" : x.st === "held" ? "retenida" : x.st === "paying" ? "pagando" : x.st === "paid" ? "pagada" : "revertida";
      return { id: x.id, fecha: x.fid, evento: x.t, eid: x.eid, dia: x.dia, h0: x.h0, st, motivo: x.hk ? (x.hk === "admin" && x.hn ? { es: `${MOTIVO_HOLD.admin!.es} ${x.hn}.`, en: `${MOTIVO_HOLD.admin!.en} ${x.hn}.` } : MOTIVO_HOLD[x.hk] ?? null) : null,
        payOn: x.pay_on, bruto: fijo ? x.gross : x.kg, comision: fijo ? x.fee : x.kf, devuelto: fijo ? x.refunded : x.kr, disputa: fijo ? x.disputed : x.kd, base: fijo ? x.base : x.kb, descontado: fijo ? x.carry : 0,
        neto: fijo ? x.net : x.kb, pagada: x.paid, cancelada: x.cx };
    }),
  };
}

/* ── Super Admin › Liquidaciones de eventos ── */
export type FilaLiqAdm = { id: string; negocio: string; bizId: string; evento: string; eid: string; dia: string; ciudad: string; st: string; hk: string | null; hn: string | null; payOn: string; bruto: number; comision: number; devuelto: number; disputa: number; neto: number; base: number; descontado: number; transfer: string | null; pagada: string | null; intentos: number; error: string | null };
export async function liquidacionesAdmin(s: Staff, st: string | null, q: string) {
  const est = st && ["pending", "held", "paying", "paid", "reversed"].includes(st) ? st : null, qq = String(q ?? "").trim().slice(0, 60);
  const [L, K] = await Promise.all([
    db().query<FilaLiqAdm>(
      `select s.id::text, b.name as negocio, b.id as "bizId", e.title->>'es' as evento, e.id::text as eid, d.local_date::text as dia, ci.name as ciudad, s.status as st, s.hold_kind as hk, s.hold_note as hn,
              s.pay_on::text as "payOn", case when s.status in ('paying', 'paid', 'reversed') then s.gross_cents else k.gross end as bruto, case when s.status in ('paying', 'paid', 'reversed') then s.fee_cents else k.fee end as comision,
              case when s.status in ('paying', 'paid', 'reversed') then s.refunded_cents else k.refunded end as devuelto, case when s.status in ('paying', 'paid', 'reversed') then s.disputed_cents else k.disputed end as disputa,
              case when s.status in ('paying', 'paid', 'reversed') then s.net_cents else k.base end as neto, case when s.status in ('paying', 'paid', 'reversed') then s.base_cents else k.base end as base, s.carry_cents as descontado,
              s.transfer_id as transfer, ${ISO("s.paid_at")} as pagada, s.attempts as intentos, s.last_error as error
         from event_settlements s join events e on e.id = s.event_id join event_dates d on d.id = s.event_date_id join businesses b on b.id = s.business_id join cities ci on ci.id = s.city_id
         cross join lateral evt_liq_calc(s.event_date_id) k
        where ${CIUD} and ($1::text is null or s.status = $1) and ($3 = '' or b.name ilike '%' || $3 || '%' or e.title->>'es' ilike '%' || $3 || '%')
        order by (s.status = 'held') desc, s.pay_on desc, s.id desc limit 200`, [est, s.cities, qq]),
    db().query<{ martes: number; nM: number; held: number; nH: number; pagado: number; nP: number; deuda: number }>(
      `select coalesce(sum((evt_liq_calc(s.event_date_id)).base) filter (where s.status = 'pending'), 0)::int as martes, count(*) filter (where s.status = 'pending')::int as "nM",
              coalesce(sum((evt_liq_calc(s.event_date_id)).base) filter (where s.status = 'held'), 0)::int as held, count(*) filter (where s.status = 'held')::int as "nH",
              coalesce(sum(s.net_cents) filter (where s.status in ('paid', 'reversed') and s.paid_at > now() - interval '30 days'), 0)::int as pagado,
              count(*) filter (where s.status in ('paid', 'reversed') and s.paid_at > now() - interval '30 days')::int as "nP",
              coalesce((select sum(evt_liq_deuda(z.business_id)) from (select distinct business_id from event_settlements y where (cardinality($1::text[]) = 0 or y.city_id = any($1::text[])) and y.status in ('paid', 'reversed')) z), 0)::int as deuda
         from event_settlements s where (cardinality($1::text[]) = 0 or s.city_id = any($1::text[]))`, [s.cities]),
  ]);
  return { filas: L.rows, kpi: K.rows[0]! };
}
export type LiqAdmin = Awaited<ReturnType<typeof liquidacionesAdmin>>;
/* CSV (como Ingresos, 2s): una fila por liquidación, montos en dólares; lo escribe lib/csv.ts. */
export const CSV_LIQ = ["Liquidación", "Negocio", "Evento", "Fecha", "Ciudad", "Estado", "Motivo", "Se paga", "Bruto", "Comisión", "Devuelto", "Disputas", "Del organizador", "Descontado", "Transferido", "Transferencia", "Pagada"];
export function liquidacionesCsv(filas: FilaLiqAdm[]): string[][] {
  const m = (x: number) => (x / 100).toFixed(2);
  return filas.map((x) => [x.id, x.negocio, x.evento, x.dia, x.ciudad, x.st, x.hk ?? "", x.payOn, m(x.bruto), m(x.comision), m(x.devuelto), m(x.disputa), m(x.base), m(x.descontado), m(x.st === "paid" || x.st === "reversed" || x.st === "paying" ? x.neto : 0), x.transfer ?? "", x.pagada ?? ""]);
}
/* El caso de la cola «Pagos de eventos retenidos» (primer evento grande de un organizador nuevo). */
export async function casoLiquidacion(id: string) {
  if (!/^\d{1,18}$/.test(id)) return null;
  const x = (await db().query<{ id: string; negocio: string; biz: string; evento: string; eid: string; dia: string; st: string; hk: string | null; bruto: number; neto: number; ordenes: number; devuelto: number; disputas: number; desde: string; eventos: number; verificado: boolean }>(
    `select s.id::text, b.name as negocio, b.id as biz, e.title->>'es' as evento, e.id::text as eid, d.local_date::text as dia, s.status as st, s.hold_kind as hk, k.gross as bruto, k.base as neto,
            (select count(*)::int from operations o where o.kind = 'tickets' and o.pay_mode = 'app' and (o.details->>'event_date_id')::bigint = d.id) as ordenes, k.refunded as devuelto,
            (select count(*)::int from disputes z join payments p on p.id = z.payment_id where p.transfer_group = 'evt-' || e.id) as disputas,
            to_char(b.created_at, 'YYYY-MM-DD') as desde, (select count(*)::int from events y where y.business_id = b.id and y.status not in ('draft', 'rejected')) as eventos,
            exists (select 1 from event_organizers o where o.business_id = b.id and o.verified_at is not null) as verificado
       from event_settlements s join events e on e.id = s.event_id join event_dates d on d.id = s.event_date_id join businesses b on b.id = s.business_id cross join lateral evt_liq_calc(s.event_date_id) k
      where s.id = $1::bigint`, [id])).rows[0];
  return x ?? null;
}
export const liqFecha = (dia: string, h0: number, es: boolean) => `${diaCorto(dia, es)} · ${hora(h0)}`;
export const liqBi = bi;
