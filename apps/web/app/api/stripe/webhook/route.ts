import { NextResponse, type NextRequest } from "next/server";
import { db, tx } from "@/lib/db";
import { cerrarDisputa, registrarDisputa } from "@/lib/disputas";
import { firmaValida } from "@/lib/pagos/stripe";

/* Webhook de Stripe. Solo acepta eventos firmados con STRIPE_WEBHOOK_SECRET (y frescos); cada evento se guarda una vez
   (idempotente) y se aplica al libro propio: la cuenta del negocio, cobros cancelados o capturados fuera de la app,
   devoluciones y disputas. El dinero lo decide nuestro libro; Stripe solo confirma. */
export const dynamic = "force-dynamic";
type Ev = { id: string; type: string; account?: string; data: { object: Record<string, unknown> } };

export async function POST(req: NextRequest) {
  const secreto = process.env.STRIPE_WEBHOOK_SECRET;
  const cuerpo = await req.text();
  if (!secreto || !firmaValida(cuerpo, req.headers.get("stripe-signature"), secreto)) return new NextResponse("firma", { status: 400 });
  let ev: Ev;
  try { ev = JSON.parse(cuerpo) as Ev; } catch { return new NextResponse("json", { status: 400 }); }
  if (typeof ev?.id !== "string" || typeof ev.type !== "string") return new NextResponse("evento", { status: 400 });
  const nuevo = await db().query(`insert into stripe_events (id, type, account, payload) values ($1, $2, $3, $4::jsonb) on conflict (id) do nothing returning id`, [ev.id, ev.type, ev.account ?? null, cuerpo]);
  if (!nuevo.rowCount) return NextResponse.json({ ok: true, repetido: true });
  try {
    await aplicar(ev);
    await db().query(`update stripe_events set processed_at = now() where id = $1`, [ev.id]);
  } catch (e) {
    await db().query(`update stripe_events set error = $2 where id = $1`, [ev.id, String((e as Error).message ?? e).slice(0, 300)]);
    return new NextResponse("error", { status: 500 }); // Stripe lo reintenta
  }
  return NextResponse.json({ ok: true });
}

async function aplicar(ev: Ev) {
  const o = ev.data.object;
  switch (ev.type) {
    case "account.updated": {
      const req = (o.requirements as { currently_due?: string[] } | undefined)?.currently_due ?? [];
      const ext = (o.external_accounts as { data?: { last4?: string }[] } | undefined)?.data?.[0]?.last4 ?? null;
      const cargos = !!o.charges_enabled, pagos = !!o.payouts_enabled;
      await db().query(`update stripe_accounts set charges_enabled = $2, payouts_enabled = $3, requirements = $4::jsonb, bank_last4 = coalesce($5, bank_last4),
                               status = case when $2 and $3 and jsonb_array_length($4::jsonb) = 0 then 'enabled' when $2 or jsonb_array_length($4::jsonb) > 0 then 'restricted' else 'pending' end, updated_at = now()
                         where stripe_account_id = $1`, [String(o.id), cargos, pagos, JSON.stringify(req.slice(0, 20)), ext]);
      return;
    }
    case "payment_intent.canceled":
      await tx(async (c) => {
        const p = (await c.query<{ op: string }>(`update payments set status = 'released', released_at = coalesce(released_at, now()), updated_at = now() where stripe_payment_intent = $1 and status = 'held' returning operation_id::text as op`, [String(o.id)])).rows[0];
        if (p) await c.query(`update operations set pay_status = 'released' where id = $1::bigint`, [p.op]);
      });
      return;
    case "payment_intent.succeeded":
      await tx(async (c) => {
        const p = (await c.query<{ op: string }>(`update payments set status = 'captured', captured_at = coalesce(captured_at, now()), updated_at = now() where stripe_payment_intent = $1 and status = 'held' returning operation_id::text as op`, [String(o.id)])).rows[0];
        if (p) await c.query(`update operations set pay_status = 'captured' where id = $1::bigint`, [p.op]);
      });
      return;
    case "charge.refunded": {
      // Una devolución hecha desde Stripe (no desde la app): el libro se pone al día con lo que dice Stripe.
      const pi = String(o.payment_intent ?? ""), dev = Number(o.amount_refunded ?? 0);
      await tx(async (c) => {
        const p = (await c.query<{ op: string; st: string }>(
          `update payments set refunded_cents = greatest(refunded_cents, $2), status = case when greatest(refunded_cents, $2) >= amount_cents then 'refunded' else 'partially_refunded' end, updated_at = now()
            where stripe_payment_intent = $1 and status in ('captured', 'partially_refunded') returning operation_id::text as op, status as st`, [pi, dev])).rows[0];
        if (p) await c.query(`update operations set pay_status = $2 where id = $1::bigint`, [p.op, p.st]);
      });
      return;
    }
    case "charge.dispute.created":
    case "charge.dispute.updated": {
      // Disputa (2r): queda en el libro (disputes), abre el caso en la cola «Disputas con el banco» y avisa al dueño.
      const due = Number((o.evidence_details as { due_by?: number } | undefined)?.due_by ?? 0);
      await registrarDisputa({ stripeId: String(o.id), pi: String(o.payment_intent ?? ""), amount: Number(o.amount ?? 0), reason: String(o.reason ?? "general"), dueBy: due ? new Date(due * 1000).toISOString() : null, status: String(o.status ?? "needs_response") });
      return;
    }
    case "charge.dispute.closed":
      await cerrarDisputa(String(o.id), String(o.status ?? ""));
      return;
    default: return;
  }
}
