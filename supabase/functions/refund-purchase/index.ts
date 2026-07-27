// refund-purchase — refund a PAID order/booking/rental when it's cancelled or
// rejected. Before this, cancelling a prepaid purchase left the buyer's money
// captured (no path back). Called by the panel's reject/cancel and by a customer
// cancelling their own still-'new' paid order.
//
// AUTH: the caller's JWT. refund_ctx (0109) runs under it and returns is_owner /
// is_buyer, so only the business owner or the buyer can trigger a refund. The
// Stripe refund reverses the destination transfer AND our platform fee, so the
// buyer is made whole and the seller/platform give back their cut. Idempotent:
// a purchase already 'refunded' is a no-op; a cash (not-paid-online) purchase
// returns refunded:false with no error. Secrets: STRIPE_SECRET_KEY. Auto:
// SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
//
// kind:'payment' es la rama ADMIN (0122, plan §3.6 Dinero): reembolso manual de
// CUALQUIER pago del ledger desde /admin. La autorización NO se decide aquí —
// admin_refund_ctx / admin_refund_finalize corren bajo el JWT del que llama y
// llaman _require_admin() adentro, así que un no-admin recibe 'forbidden' de
// Postgres y esta función devuelve 403 sin haber tocado Stripe.

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}
async function stripe(path: string, key: string, form: Record<string, string>) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(form).toString(),
  });
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  try {
    const body = await req.json();
    const kind = String(body?.kind ?? '');        // 'order' | 'booking' | 'rental' | 'payment' (admin)
    const id = String(body?.id ?? '');             // the order/booking/rental id, o el payments.id
    if (!['order', 'booking', 'rental', 'payment'].includes(kind) || !id) return json({ error: 'bad request' }, 400);

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const STRIPE = Deno.env.get('STRIPE_SECRET_KEY');
    if (!STRIPE) return json({ error: 'stripe not configured' }, 500);

    const svc = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json' };
    const authHeader = req.headers.get('Authorization') ?? '';
    const asCaller = { apikey: SERVICE, Authorization: authHeader, 'Content-Type': 'application/json' };

    // ── Rama ADMIN: reembolso manual de un pago del ledger ────────────────────
    if (kind === 'payment') {
      const reason = String(body?.reason ?? '').trim();
      if (!reason) return json({ error: 'razón requerida' }, 400);

      // _require_admin() corre DENTRO de este RPC, bajo el JWT del que llama.
      const aRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_refund_ctx`, {
        method: 'POST', headers: asCaller, body: JSON.stringify({ in_payment: id }),
      });
      const aBody = await aRes.json().catch(() => null);
      if (!aRes.ok) {
        const msg = String(aBody?.message ?? aBody?.error ?? 'forbidden');
        return json({ error: msg }, /forbidden|auth required/i.test(msg) ? 403 : 400);
      }
      const a = Array.isArray(aBody) ? aBody[0] : null;
      if (!a) return json({ error: 'pago no encontrado' }, 404);
      if (a.status === 'refunded') return json({ ok: true, refunded: true, already: true });
      if (!a.intent) return json({ ok: true, refunded: false, reason: 'not_paid_online' });

      const ar = await stripe('refunds', STRIPE, {
        payment_intent: a.intent, reverse_transfer: 'true', refund_application_fee: 'true',
      });
      // Stripe ya lo devolvió antes (p. ej. desde su panel) → seguimos al cierre
      // para que nuestro ledger deje de mentir; cualquier otro error aborta.
      if (ar.error && ar.error.code !== 'charge_already_refunded') {
        return json({ error: ar.error.message ?? 'refund failed' }, 400);
      }

      // Cierra bajo el JWT del admin: ledger + pending + entidad + aviso + bitácora.
      const fRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_refund_finalize`, {
        method: 'POST', headers: asCaller,
        body: JSON.stringify({ in_payment: id, in_reason: reason }),
      });
      if (!fRes.ok) {
        const f = await fRes.json().catch(() => null);
        return json({ error: String(f?.message ?? 'no se pudo cerrar el reembolso'), stripe_refunded: !ar.error }, 500);
      }
      return json({ ok: true, refunded: true, amount: a.amount, already: !!ar.error });
    }

    // Resolve the refund context UNDER THE CALLER'S JWT so is_owner/is_buyer are real.
    const ctxRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/refund_ctx`, {
      method: 'POST',
      headers: { apikey: SERVICE, Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ in_kind: kind, in_id: id }),
    });
    const ctx = (await ctxRes.json())?.[0];
    if (!ctx) return json({ error: 'purchase not found' }, 404);
    if (ctx.is_owner !== true && ctx.is_buyer !== true) return json({ error: 'not authorized' }, 403);

    // A BUYER may self-refund only while the business hasn't accepted the purchase
    // yet (order still 'new', booking/rental still 'pending') — otherwise they'd
    // "order → pay → receive → self-refund". The OWNER can refund at any status.
    if (ctx.is_owner !== true && ctx.is_buyer === true) {
      const early = (kind === 'order' && ctx.entity_status === 'new')
        || (kind === 'booking' && ctx.entity_status === 'pending')
        || (kind === 'rental' && ctx.entity_status === 'pending');
      if (!early) return json({ ok: true, refunded: false, reason: 'contact_business' });
    }

    // Already refunded → idempotent no-op.
    if (ctx.status === 'refunded') return json({ ok: true, refunded: true, already: true });
    // Not an online-paid purchase (cash / no intent) → nothing to refund.
    if (ctx.status !== 'fulfilled' || !ctx.intent) return json({ ok: true, refunded: false, reason: 'not_paid_online' });

    // Reverse the charge: buyer made whole, transfer + platform fee reversed.
    const r = await stripe('refunds', STRIPE, {
      payment_intent: ctx.intent, reverse_transfer: 'true', refund_application_fee: 'true',
    });
    if (r.error) return json({ error: r.error.message ?? 'refund failed' }, 400);

    // Record it: payment ledger, pending row, buyer notification.
    await fetch(`${SUPABASE_URL}/rest/v1/rpc/mark_payment`, {
      method: 'POST', headers: svc,
      body: JSON.stringify({
        in_business: ctx.business_id, in_buyer: ctx.buyer_id, in_kind: kind, in_ref: ctx.ref,
        in_session: null, in_intent: ctx.intent, in_amount: ctx.amount, in_fee: ctx.fee, in_status: 'refunded',
      }),
    });
    await fetch(`${SUPABASE_URL}/rest/v1/pending_purchases?id=eq.${ctx.pending_id}`, {
      method: 'PATCH', headers: svc,
      body: JSON.stringify({ status: 'refunded', updated_at: new Date().toISOString() }),
    });
    await fetch(`${SUPABASE_URL}/rest/v1/rpc/notify_user`, {
      method: 'POST', headers: svc,
      body: JSON.stringify({ in_user: ctx.buyer_id, in_kind: 'purchase_refunded', in_data: { kind }, in_link: '/cuenta' }),
    });

    return json({ ok: true, refunded: true, amount: ctx.amount });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
