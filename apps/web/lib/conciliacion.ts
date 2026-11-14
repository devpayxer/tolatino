import "server-only";
import type { Staff } from "./admin";
import { db, tx } from "./db";
import { pasarela, type LadoStripe } from "./pagos/pasarela";

/* 9k · El guardián del dinero (HERRAMIENTAS #20; fase9-apertura.md §4 9k): la conciliación diaria Stripe ↔ libro propio.
   Cada día (UTC) se compara, objeto por objeto, lo que dice Stripe (en el sandbox, el simulador) con el libro: PaymentIntents ↔ payments (y los cobros de
   Pro y las verificaciones del banco, que son PaymentIntents sin fila de payments), devoluciones ↔ refunds, transferencias ↔ event_settlements, reversiones
   ↔ event_settlement_reversals, payouts ↔ payouts, disputas ↔ disputes; y las retenciones sueltas («requires_capture» sin fila, L416: la base falló entre
   la pasarela y el commit). Se leen tres días (el anterior y el siguiente) para emparejar lo que cruzó la medianoche; se informa solo lo del día.
   La corrida y sus diferencias se escriben juntas (solo inserción, migración 0141); una diferencia sin dueño avisa al equipo al instante (money_alerts
   «recon_diff», una vez por día) y sale en el Inicio del Super Admin («el dinero no cuadra») y en Planes › Ingresos.

   PARA EL REPORTE DIARIO (9g): `conciliacionDelDia(dia)` (o, en SQL, `select * from conciliacion_del_dia('AAAA-MM-DD')`) devuelve si corrió, su estado
   («cuadra», «diferencias», «fallo» o «sin_correr»), cuántas diferencias y cuántas SIN DUEÑO, y los totales de Stripe y del libro. Solo lectura. */
export type DelDia = { dia: string; corrio: boolean; estado: "cuadra" | "diferencias" | "fallo" | "sin_correr"; runId: string | null; corrioAt: string | null; diferencias: number; sinDueno: number;
  diferenciaCents: number; stripeN: number; libroN: number; stripeCents: number; libroCents: number };
export async function conciliacionDelDia(dia: string): Promise<DelDia> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) throw new Error("dia: AAAA-MM-DD");
  const r = (await db().query<{ dia: string; corrio: boolean; estado: DelDia["estado"]; run_id: string | null; at: string | null; diferencias: number; sin_dueno: number; diferencia_cents: string; stripe_n: number; libro_n: number; stripe_cents: string; libro_cents: string }>(
    `select to_char(dia, 'YYYY-MM-DD') as dia, corrio, estado, run_id::text, to_char(corrio_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at, diferencias, sin_dueno,
            diferencia_cents::text, stripe_n, libro_n, stripe_cents::text, libro_cents::text from conciliacion_del_dia($1::date)`, [dia])).rows[0]!;
  return { dia: r.dia, corrio: r.corrio, estado: r.estado, runId: r.run_id, corrioAt: r.at, diferencias: r.diferencias, sinDueno: r.sin_dueno, diferenciaCents: Number(r.diferencia_cents),
    stripeN: r.stripe_n, libroN: r.libro_n, stripeCents: Number(r.stripe_cents), libroCents: Number(r.libro_cents) };
}

type Kind = "payment_intent" | "refund" | "transfer" | "transfer_reversal" | "payout" | "dispute" | "hold_orphan";
type Problema = "falta_en_libro" | "falta_en_stripe" | "monto" | "estado";
export type Diferencia = { kind: Kind; problem: Problema; stripeId: string | null; ledgerRef: string | null; negocio: string | null; ciudad: string | null; stripeCents: number | null; ledgerCents: number | null;
  stripeStatus: string | null; ledgerStatus: string | null };
const llave = (d: Diferencia) => `${d.kind}:${d.problem}:${(d.stripeId ?? d.ledgerRef ?? "x").replace(/[^A-Za-z0-9_.:-]/g, "_").slice(0, 200)}`;
const delta = (d: Diferencia) => (d.stripeCents ?? 0) - (d.ledgerCents ?? 0);

/* Lo que el libro espera de cada estado de un PaymentIntent. */
const ESTADO_LIBRO: Record<string, string[]> = { requires_capture: ["held"], succeeded: ["captured", "partially_refunded", "refunded"], canceled: ["released", "failed"] };
const ESTADO_DISPUTA: Record<string, string> = { warning_needs_response: "needs_response", needs_response: "needs_response", warning_under_review: "under_review", under_review: "under_review", won: "won", lost: "lost", warning_closed: "lost", charge_refunded: "accepted" };

type FilaPago = { pi: string; status: string; amount: number; held: number | null; refunded: number; biz: string | null; city: string | null; at: string; id: string };
/* El libro de esos días (las mismas ventanas que Stripe). */
async function libro(desde: Date, hasta: Date, ids: { pi: string[]; re: string[]; tr: string[]; trr: string[]; po: string[]; dp: string[] }) {
  const a = desde.toISOString(), b = hasta.toISOString();
  const [P, PA, PRO, R, S, V, O, D] = await Promise.all([
    // Cobros: los del rango y los que Stripe nombra (aunque se hayan escrito en otro día).
    db().query<FilaPago>(`select stripe_payment_intent as pi, status, amount_cents as amount, held_cents as held, refunded_cents as refunded, business_id as biz, city_id as city, id::text,
                                 to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at
                            from payments where stripe_payment_intent is not null and ((created_at >= $1::timestamptz and created_at < $2::timestamptz) or stripe_payment_intent = any($3::text[]))`, [a, b, ids.pi]),
    db().query<{ pi: string; status: string; biz: string | null; city: string | null }>(`select pi, status, business_id as biz, city_id as city from payment_actions where pi = any($1::text[]) or (created_at >= $2::timestamptz and created_at < $3::timestamptz)`, [ids.pi, a, b]),
    db().query<{ pi: string; amount: number; biz: string }>(`select note->>'pi' as pi, amount_cents as amount, business_id as biz from subscription_events where kind = 'charged' and note ? 'pi' and (note->>'pi' = any($1::text[]) or (at >= $2::timestamptz and at < $3::timestamptz))`, [ids.pi, a, b]),
    db().query<{ id: string; amount: number; biz: string | null; city: string | null; at: string }>(
      `select r.stripe_refund_id as id, r.amount_cents as amount, p.business_id as biz, p.city_id as city, to_char(coalesce(r.done_at, r.created_at) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at
         from refunds r join payments p on p.id = r.payment_id where r.status = 'done' and r.stripe_refund_id is not null
          and ((coalesce(r.done_at, r.created_at) >= $1::timestamptz and coalesce(r.done_at, r.created_at) < $2::timestamptz) or r.stripe_refund_id = any($3::text[]))`, [a, b, ids.re]),
    db().query<{ id: string; amount: number; biz: string; city: string; at: string }>(
      `select transfer_id as id, net_cents as amount, business_id as biz, city_id as city, to_char(paid_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at from event_settlements
        where transfer_id is not null and ((paid_at >= $1::timestamptz and paid_at < $2::timestamptz) or transfer_id = any($3::text[]))`, [a, b, ids.tr]),
    db().query<{ id: string; amount: number; biz: string; city: string; at: string }>(
      `select stripe_reversal_id as id, amount_cents as amount, business_id as biz, city_id as city, to_char(done_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at from event_settlement_reversals
        where status = 'done' and stripe_reversal_id is not null and ((done_at >= $1::timestamptz and done_at < $2::timestamptz) or stripe_reversal_id = any($3::text[]))`, [a, b, ids.trr]),
    db().query<{ id: string; amount: number; status: string; biz: string | null; city: string | null; at: string }>(
      `select stripe_payout_id as id, amount_cents as amount, status, business_id as biz, city_id as city, to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at from payouts
        where (created_at >= $1::timestamptz and created_at < $2::timestamptz) or stripe_payout_id = any($3::text[])`, [a, b, ids.po]),
    db().query<{ id: string; amount: number; status: string; biz: string | null; city: string | null; at: string }>(
      `select stripe_dispute_id as id, amount_cents as amount, status, business_id as biz, city_id as city, to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at from disputes
        where (created_at >= $1::timestamptz and created_at < $2::timestamptz) or stripe_dispute_id = any($3::text[])`, [a, b, ids.dp]),
  ]);
  return { P: P.rows, PA: PA.rows, PRO: PRO.rows, R: R.rows, S: S.rows, V: V.rows, O: O.rows, D: D.rows };
}

/* La comparación (pura: la prueba al revés y el guardián la miran). `enDia` dice si un objeto (por su fecha) es del día que se informa. */
export function comparar(st: LadoStripe, L: Awaited<ReturnType<typeof libro>>, enDia: (iso: string | null) => boolean, stripeEnDia: Set<string>) {
  const out: Diferencia[] = [];
  const P = new Map(L.P.map((x) => [x.pi, x])), PA = new Map(L.PA.map((x) => [x.pi, x])), PRO = new Map(L.PRO.map((x) => [x.pi, x]));
  const dif = (d: Diferencia) => out.push(d);
  // PaymentIntents
  for (const i of st.intents) {
    if (!stripeEnDia.has(i.id)) continue;
    const p = P.get(i.id), a = PA.get(i.id), pro = PRO.get(i.id);
    if (p) {
      const ok = ESTADO_LIBRO[i.estado];
      if (ok && !ok.includes(p.status)) dif({ kind: "payment_intent", problem: "estado", stripeId: i.id, ledgerRef: `payment:${p.id}`, negocio: p.biz, ciudad: p.city, stripeCents: i.monto, ledgerCents: p.amount, stripeStatus: i.estado, ledgerStatus: p.status });
      else if (i.estado === "requires_capture" && i.monto !== (p.held ?? p.amount)) dif({ kind: "payment_intent", problem: "monto", stripeId: i.id, ledgerRef: `payment:${p.id}`, negocio: p.biz, ciudad: p.city, stripeCents: i.monto, ledgerCents: p.held ?? p.amount, stripeStatus: i.estado, ledgerStatus: p.status });
      else if (i.estado === "succeeded" && (i.capturado !== p.amount || i.devuelto !== p.refunded)) dif({ kind: "payment_intent", problem: "monto", stripeId: i.id, ledgerRef: `payment:${p.id}`, negocio: p.biz, ciudad: p.city, stripeCents: i.capturado - i.devuelto, ledgerCents: p.amount - p.refunded, stripeStatus: i.estado, ledgerStatus: p.status });
      continue;
    }
    if (pro) { if (i.estado !== "succeeded" || i.capturado !== pro.amount) dif({ kind: "payment_intent", problem: i.estado !== "succeeded" ? "estado" : "monto", stripeId: i.id, ledgerRef: `pro:${pro.biz}`, negocio: pro.biz, ciudad: null, stripeCents: i.capturado, ledgerCents: pro.amount, stripeStatus: i.estado, ledgerStatus: "charged" }); continue; }
    // Una verificación del banco viva (o ya vencida y soltada) no es un cobro del libro todavía.
    if (a && ((a.status === "pendiente" && i.estado === "requires_action") || (a.status === "verificada" && i.estado === "requires_capture") || i.estado === "canceled" || i.estado === "requires_payment_method")) continue;
    if (i.estado === "requires_capture") { dif({ kind: "hold_orphan", problem: "falta_en_libro", stripeId: i.id, ledgerRef: null, negocio: a?.biz ?? null, ciudad: a?.city ?? null, stripeCents: i.monto, ledgerCents: null, stripeStatus: i.estado, ledgerStatus: null }); continue; }
    if (i.estado === "succeeded") dif({ kind: "payment_intent", problem: "falta_en_libro", stripeId: i.id, ledgerRef: null, negocio: a?.biz ?? null, ciudad: a?.city ?? null, stripeCents: i.capturado, ledgerCents: null, stripeStatus: i.estado, ledgerStatus: null });
    // Rechazadas, canceladas sin retener o pidiendo verificación sin fila: no movieron dinero.
  }
  const SI = new Set(st.intents.map((x) => x.id));
  for (const p of L.P) if (enDia(p.at) && !SI.has(p.pi) && p.status !== "failed") dif({ kind: "payment_intent", problem: "falta_en_stripe", stripeId: null, ledgerRef: p.pi, negocio: p.biz, ciudad: p.city, stripeCents: null, ledgerCents: p.amount, stripeStatus: null, ledgerStatus: p.status });
  // Devoluciones
  const R = new Map(L.R.map((x) => [x.id, x]));
  for (const r of st.refunds) {
    if (!stripeEnDia.has(r.id)) continue;
    const l = R.get(r.id);
    if (!l) dif({ kind: "refund", problem: "falta_en_libro", stripeId: r.id, ledgerRef: r.pi || null, negocio: P.get(r.pi)?.biz ?? null, ciudad: P.get(r.pi)?.city ?? null, stripeCents: r.monto, ledgerCents: null, stripeStatus: "done", ledgerStatus: null });
    else if (l.amount !== r.monto) dif({ kind: "refund", problem: "monto", stripeId: r.id, ledgerRef: r.id, negocio: l.biz, ciudad: l.city, stripeCents: r.monto, ledgerCents: l.amount, stripeStatus: "done", ledgerStatus: "done" });
  }
  const SR = new Set(st.refunds.map((x) => x.id));
  for (const l of L.R) if (enDia(l.at) && !SR.has(l.id)) dif({ kind: "refund", problem: "falta_en_stripe", stripeId: null, ledgerRef: l.id, negocio: l.biz, ciudad: l.city, stripeCents: null, ledgerCents: l.amount, stripeStatus: null, ledgerStatus: "done" });
  // Transferencias al organizador (6e) y sus reversiones
  const S = new Map(L.S.map((x) => [x.id, x]));
  for (const t of st.transfers) {
    if (!stripeEnDia.has(t.id)) continue;
    const l = S.get(t.id);
    if (!l) dif({ kind: "transfer", problem: "falta_en_libro", stripeId: t.id, ledgerRef: null, negocio: null, ciudad: null, stripeCents: t.monto, ledgerCents: null, stripeStatus: "paid", ledgerStatus: null });
    else if (l.amount !== t.monto) dif({ kind: "transfer", problem: "monto", stripeId: t.id, ledgerRef: t.id, negocio: l.biz, ciudad: l.city, stripeCents: t.monto, ledgerCents: l.amount, stripeStatus: "paid", ledgerStatus: "paid" });
  }
  const ST = new Set(st.transfers.map((x) => x.id));
  for (const l of L.S) if (enDia(l.at) && !ST.has(l.id)) dif({ kind: "transfer", problem: "falta_en_stripe", stripeId: null, ledgerRef: l.id, negocio: l.biz, ciudad: l.city, stripeCents: null, ledgerCents: l.amount, stripeStatus: null, ledgerStatus: "paid" });
  const V = new Map(L.V.map((x) => [x.id, x]));
  for (const v of st.reversals) {
    if (!stripeEnDia.has(v.id)) continue;
    const l = V.get(v.id);
    if (!l) dif({ kind: "transfer_reversal", problem: "falta_en_libro", stripeId: v.id, ledgerRef: v.transfer, negocio: S.get(v.transfer)?.biz ?? null, ciudad: S.get(v.transfer)?.city ?? null, stripeCents: v.monto, ledgerCents: null, stripeStatus: "done", ledgerStatus: null });
    else if (l.amount !== v.monto) dif({ kind: "transfer_reversal", problem: "monto", stripeId: v.id, ledgerRef: v.id, negocio: l.biz, ciudad: l.city, stripeCents: v.monto, ledgerCents: l.amount, stripeStatus: "done", ledgerStatus: "done" });
  }
  const SV = new Set(st.reversals.map((x) => x.id));
  for (const l of L.V) if (enDia(l.at) && !SV.has(l.id)) dif({ kind: "transfer_reversal", problem: "falta_en_stripe", stripeId: null, ledgerRef: l.id, negocio: l.biz, ciudad: l.city, stripeCents: null, ledgerCents: l.amount, stripeStatus: null, ledgerStatus: "done" });
  // Pagos al banco
  const O = new Map(L.O.map((x) => [x.id, x]));
  for (const p of st.payouts) {
    if (!stripeEnDia.has(p.id)) continue;
    const l = O.get(p.id);
    if (!l) dif({ kind: "payout", problem: "falta_en_libro", stripeId: p.id, ledgerRef: p.cuenta, negocio: null, ciudad: null, stripeCents: p.monto, ledgerCents: null, stripeStatus: p.estado, ledgerStatus: null });
    else if (l.amount !== p.monto) dif({ kind: "payout", problem: "monto", stripeId: p.id, ledgerRef: p.id, negocio: l.biz, ciudad: l.city, stripeCents: p.monto, ledgerCents: l.amount, stripeStatus: p.estado, ledgerStatus: l.status });
    else if (l.status !== p.estado) dif({ kind: "payout", problem: "estado", stripeId: p.id, ledgerRef: p.id, negocio: l.biz, ciudad: l.city, stripeCents: p.monto, ledgerCents: l.amount, stripeStatus: p.estado, ledgerStatus: l.status });
  }
  const SO = new Set(st.payouts.map((x) => x.id));
  for (const l of L.O) if (enDia(l.at) && !SO.has(l.id)) dif({ kind: "payout", problem: "falta_en_stripe", stripeId: null, ledgerRef: l.id, negocio: l.biz, ciudad: l.city, stripeCents: null, ledgerCents: l.amount, stripeStatus: null, ledgerStatus: l.status });
  // Disputas
  const D = new Map(L.D.map((x) => [x.id, x]));
  for (const d of st.disputes) {
    if (!stripeEnDia.has(d.id)) continue;
    const l = D.get(d.id), est = ESTADO_DISPUTA[d.estado] ?? d.estado;
    if (!l) dif({ kind: "dispute", problem: "falta_en_libro", stripeId: d.id, ledgerRef: d.pi || null, negocio: P.get(d.pi)?.biz ?? null, ciudad: P.get(d.pi)?.city ?? null, stripeCents: d.monto, ledgerCents: null, stripeStatus: d.estado, ledgerStatus: null });
    else if (l.amount !== d.monto) dif({ kind: "dispute", problem: "monto", stripeId: d.id, ledgerRef: d.id, negocio: l.biz, ciudad: l.city, stripeCents: d.monto, ledgerCents: l.amount, stripeStatus: d.estado, ledgerStatus: l.status });
    else if (est !== l.status && !(l.status === "accepted" && est === "lost")) dif({ kind: "dispute", problem: "estado", stripeId: d.id, ledgerRef: d.id, negocio: l.biz, ciudad: l.city, stripeCents: d.monto, ledgerCents: l.amount, stripeStatus: d.estado, ledgerStatus: l.status });
  }
  const SD = new Set(st.disputes.map((x) => x.id));
  for (const l of L.D) if (enDia(l.at) && !SD.has(l.id) && (pasarela.modo() === "stripe" || l.id.startsWith("dp_sim_"))) dif({ kind: "dispute", problem: "falta_en_stripe", stripeId: null, ledgerRef: l.id, negocio: l.biz, ciudad: l.city, stripeCents: null, ledgerCents: l.amount, stripeStatus: null, ledgerStatus: l.status });
  return out;
}

const DIA = 86_400_000;
/* Concilia un día (AAAA-MM-DD, UTC). `por`: el barrido o una persona del equipo (Planes › Ingresos «Conciliar otra vez», con permiso). Escribe la corrida
   y sus diferencias en una transacción; si Stripe no responde, queda una corrida «fallo» con el error (y la alerta). Devuelve la del día. */
export async function conciliarDia(dia: string, quien: { por: "barrido" } | { por: "equipo"; staffId: string } = { por: "barrido" }): Promise<DelDia> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) throw new Error("dia: AAAA-MM-DD");
  const modo = pasarela.modo();
  if (modo === "apagado") return conciliacionDelDia(dia);
  const ini = new Date(`${dia}T00:00:00Z`), fin = new Date(ini.getTime() + DIA), started = new Date().toISOString();
  const actor = quien.por === "equipo" ? quien.staffId : null;
  let diffs: Diferencia[] = [], error: string | null = null, sN = 0, lN = 0, sC = 0, lC = 0;
  const counts: Record<string, { stripe: number; libro: number }> = {};
  try {
    const cuentas = (await db().query<{ a: string }>(`select stripe_account_id as a from stripe_accounts where simulated = $1::boolean and payouts_enabled order by business_id limit 20000`, [modo === "simulador"])).rows.map((x) => x.a);
    const st = await pasarela.delDia(new Date(ini.getTime() - DIA), new Date(fin.getTime() + DIA), cuentas);
    // Qué objetos de Stripe son del día: se vuelve a pedir solo la ventana del día (barato en el simulador; con Stripe, la misma paginación).
    const hoy = await pasarela.delDia(ini, fin, cuentas);
    const stripeEnDia = new Set([...hoy.intents, ...hoy.refunds, ...hoy.transfers, ...hoy.reversals, ...hoy.payouts, ...hoy.disputes].map((x) => x.id));
    const L = await libro(new Date(ini.getTime() - DIA), new Date(fin.getTime() + DIA), {
      pi: st.intents.map((x) => x.id), re: st.refunds.map((x) => x.id), tr: st.transfers.map((x) => x.id), trr: st.reversals.map((x) => x.id), po: st.payouts.map((x) => x.id), dp: st.disputes.map((x) => x.id) });
    const enDia = (iso: string | null) => !!iso && iso >= ini.toISOString().slice(0, 19) && iso < fin.toISOString().slice(0, 19);
    diffs = comparar(st, L, enDia, stripeEnDia);
    const k = (n: string, s: number, l: number) => { counts[n] = { stripe: s, libro: l }; sN += s; lN += l; };
    k("payment_intent", hoy.intents.length, L.P.filter((x) => enDia(x.at)).length);
    k("refund", hoy.refunds.length, L.R.filter((x) => enDia(x.at)).length);
    k("transfer", hoy.transfers.length, L.S.filter((x) => enDia(x.at)).length);
    k("transfer_reversal", hoy.reversals.length, L.V.filter((x) => enDia(x.at)).length);
    k("payout", hoy.payouts.length, L.O.filter((x) => enDia(x.at)).length);
    k("dispute", hoy.disputes.length, L.D.filter((x) => enDia(x.at)).length);
    // Dinero que se movió ese día según cada lado: lo capturado (neto de devoluciones) de los PaymentIntents del día.
    sC = hoy.intents.filter((x) => x.estado === "succeeded").reduce((s, x) => s + x.capturado - x.devuelto, 0);
    lC = L.P.filter((x) => enDia(x.at) && ["captured", "partially_refunded", "refunded"].includes(x.status)).reduce((s, x) => s + x.amount - x.refunded, 0)
      + L.PRO.filter((x) => hoy.intents.some((i) => i.id === x.pi)).reduce((s, x) => s + x.amount, 0);
  } catch (e) {
    error = String((e as Error)?.message ?? e).slice(0, 300) || "error";
    diffs = [];
  }
  // Una diferencia por llave (la misma no se cuenta dos veces).
  const unicas = [...new Map(diffs.map((d) => [llave(d), d])).values()];
  const estado = error ? "fallo" : unicas.length ? "diferencias" : "cuadra";
  const total = unicas.reduce((s, d) => s + delta(d), 0);
  await tx(async (c) => {
    const run = (await c.query<{ id: string }>(
      `insert into recon_runs (day, mode, status, por, actor_id, stripe_n, ledger_n, stripe_cents, ledger_cents, counts, diffs, diff_cents, error, started_at)
       values ($1::date, $2::text, $3::text, $4::text, $5::uuid, $6::int, $7::int, $8::bigint, $9::bigint, $10::jsonb, $11::int, $12::bigint, $13::text, $14::timestamptz) returning id::text`,
      [dia, modo, estado, quien.por, actor, sN, lN, sC, lC, JSON.stringify(counts), unicas.length, total, error, started])).rows[0]!.id;
    for (const d of unicas)
      await c.query(
        `insert into recon_diffs (run_id, day, kind, problem, diff_key, stripe_id, ledger_ref, business_id, city_id, stripe_cents, ledger_cents, diff_cents, stripe_status, ledger_status)
         values ($1::bigint, $2::date, $3::text, $4::text, $5::text, $6::text, $7::text,
                 (select id from businesses where id = $8::text), (select id from cities where id = $9::text), $10::bigint, $11::bigint, $12::bigint, $13::text, $14::text)`,
        [run, dia, d.kind, d.problem, llave(d), d.stripeId, d.ledgerRef, d.negocio, d.ciudad, d.stripeCents, d.ledgerCents, delta(d), d.stripeStatus, d.ledgerStatus]);
  });
  const r = await conciliacionDelDia(dia);
  // El guardián del dinero avisa al instante: diferencias sin dueño o la corrida que falló (una alerta por día y tipo).
  if (r.sinDueno > 0 || r.estado === "fallo") await (await import("./dinero-alertas")).alertar(r.estado === "fallo" ? "recon_no_corrio" : "recon_diff", dia, {
    monto: r.diferenciaCents, detalle: r.estado === "fallo" ? { es: `La conciliación del ${dia} falló: ${error ?? ""}`, en: `Reconciliation for ${dia} failed: ${error ?? ""}` }
      : { es: `El dinero no cuadra el ${dia}: ${r.sinDueno} diferencia${r.sinDueno === 1 ? "" : "s"} sin dueño`, en: `Money does not match on ${dia}: ${r.sinDueno} difference${r.sinDueno === 1 ? "" : "s"} with no owner` } });
  return r;
}

/* Barrido: a la hora de Configuración (Este), concilia AYER una vez (si no corrió ya). Si pasaron dos horas y no hay corrida de ayer, avisa. */
export async function conciliarAyer(): Promise<string> {
  const h = (await db().query<{ hora: number; ayer: string; cfg: number }>(
    `select extract(hour from now() at time zone 'America/New_York')::int as hora, to_char((now() at time zone 'UTC')::date - 1, 'YYYY-MM-DD') as ayer, cfg_int('conciliacion_hora') as cfg`)).rows[0]!;
  if (h.hora < h.cfg) return "todavía no";
  const ya = (await db().query(`select 1 from recon_runs where day = $1::date and por = 'barrido'`, [h.ayer])).rowCount;
  if (ya) return "ya corrió";
  const r = await conciliarDia(h.ayer, { por: "barrido" });
  return `${h.ayer}: ${r.estado}${r.diferencias ? ` (${r.diferencias})` : ""}`;
}
/* Si la conciliación de ayer no corrió dos horas después de su hora, alerta (el barrido mismo podría estar caído: el guardián lo mira también). */
export async function vigilarConciliacion(): Promise<void> {
  const h = (await db().query<{ tarde: boolean; ayer: string }>(
    `select extract(hour from now() at time zone 'America/New_York')::int >= cfg_int('conciliacion_hora') + 2 as tarde, to_char((now() at time zone 'UTC')::date - 1, 'YYYY-MM-DD') as ayer`)).rows[0]!;
  if (!h.tarde || pasarela.modo() === "apagado") return;
  if ((await db().query(`select 1 from recon_runs where day = $1::date`, [h.ayer])).rowCount) return;
  await (await import("./dinero-alertas")).alertar("recon_no_corrio", h.ayer, { monto: 0, detalle: { es: `La conciliación del ${h.ayer} no corrió`, en: `Reconciliation for ${h.ayer} did not run` } });
}

/* ── Super Admin › Planes › Ingresos · Conciliación ── */
const CIUD = "(cardinality($1::text[]) = 0 or d.city_id = any($1::text[]))";
export type DiaConc = DelDia;
export async function diasConciliacion(n = 14): Promise<DiaConc[]> {
  const dias = (await db().query<{ d: string }>(`select to_char(g::date, 'YYYY-MM-DD') as d from generate_series((now() at time zone 'UTC')::date - $1::int, (now() at time zone 'UTC')::date - 1, interval '1 day') g order by g desc`, [Math.max(1, Math.min(60, n))])).rows;
  return Promise.all(dias.map((x) => conciliacionDelDia(x.d)));
}
export type FilaDif = { id: string; key: string; kind: Kind; problem: Problema; stripeId: string | null; ledgerRef: string | null; negocio: string | null; nombre: string | null; ciudad: string | null;
  stripeCents: number | null; ledgerCents: number | null; diffCents: number; stripeStatus: string | null; ledgerStatus: string | null; dueno: { accion: string; quien: string; nota: string; at: string } | null };
/* Las diferencias de la última corrida de un día, en las ciudades de quien mira (paginadas por id: «antes de»). */
export async function diferenciasDelDia(s: Staff, dia: string, antes: string | null = null, n = 50): Promise<{ filas: FilaDif[]; sigue: string | null }> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) return { filas: [], sigue: null };
  const r = await db().query<FilaDif & { stripe_cents: string | null; ledger_cents: string | null; diff_cents: string }>(
    `select d.id::text, d.diff_key as key, d.kind, d.problem, d.stripe_id as "stripeId", d.ledger_ref as "ledgerRef", d.business_id as negocio, b.name as nombre, d.city_id as ciudad,
            d.stripe_cents::text, d.ledger_cents::text, d.diff_cents::text, d.stripe_status as "stripeStatus", d.ledger_status as "ledgerStatus",
            (select json_build_object('accion', n.action, 'quien', coalesce(nullif(trim(coalesce(u.first_name, '') || ' ' || left(coalesce(u.last_name, ''), 1)), ''), 'Equipo'), 'nota', n.note,
                                      'at', to_char(n.at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
               from recon_diff_notes n left join users u on u.id = n.staff_id where n.diff_key = d.diff_key order by n.at desc, n.id desc limit 1) as dueno
       from recon_diffs d left join businesses b on b.id = d.business_id
      where d.run_id = (select id from recon_runs where day = $2::date order by finished_at desc, id desc limit 1) and ${CIUD} and ($3::bigint is null or d.id < $3::bigint)
      order by d.id desc limit $4::int`, [s.cities, dia, antes, n + 1]);
  const filas = r.rows.slice(0, n).map((x) => ({ ...x, stripeCents: x.stripe_cents == null ? null : Number(x.stripe_cents), ledgerCents: x.ledger_cents == null ? null : Number(x.ledger_cents), diffCents: Number(x.diff_cents) }));
  return { filas, sigue: r.rows.length > n ? filas[filas.length - 1]!.id : null };
}
/* «Me hago cargo», «Resuelta» (con su nota) o «Reabrir»: solo inserción; queda en la auditoría. Lo llama la acción con permiso (plan:editar). */
export async function notaDiferencia(s: Staff, key: string, accion: "me_hago_cargo" | "resuelta" | "reabierta", nota: string): Promise<{ ok: true } | { ok: false; msg: string }> {
  const n = nota.trim().slice(0, 500);
  if (n.length < 4) return { ok: false, msg: "Escribe la nota (mínimo 4 letras)." };
  const d = (await db().query<{ city: string | null; day: string }>(`select city_id as city, to_char(day, 'YYYY-MM-DD') as day from recon_diffs d where diff_key = $2::text and ${CIUD} order by id desc limit 1`, [s.cities, key])).rows[0];
  if (!d) return { ok: false, msg: "Esa diferencia no existe (o no es de tus ciudades)." };
  const { auditar } = await import("./admin");
  await tx(async (c) => {
    await c.query(`insert into recon_diff_notes (diff_key, action, staff_id, note) values ($1::text, $2::text, $3::uuid, $4::text)`, [key, accion, s.id, n]);
    await auditar(c, { actor: s.id, action: `conciliacion.${accion}`, targetKind: "recon_diff", targetId: key, city: d.city, after: { diferencia: ({ me_hago_cargo: "con dueño", resuelta: "resuelta", reabierta: "sin dueño" } as Record<string, string>)[accion]!, dia: d.day }, reason: n });
  });
  return { ok: true };
}
