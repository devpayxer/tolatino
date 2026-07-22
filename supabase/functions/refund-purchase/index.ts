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
    const kind = String(body?.kind ?? '');        // 'order' | 'booking' | 'rental'
    const id = String(body?.id ?? '');             // the order/booking/rental id
    if (!['order', 'booking', 'rental'].includes(kind) || !id) return json({ error: 'bad request' }, 400);

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const STRIPE = Deno.env.get('STRIPE_SECRET_KEY');
    if (!STRIPE) return json({ error: 'stripe not configured' }, 500);

    const svc = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json' };
    const authHeader = req.headers.get('Authorization') ?? '';

    // Resolve the refund context UNDER THE CALLER'S JWT so is_owner/is_buyer are real.
    const ctxRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/refund_ctx`, {
      method: 'POST',
      headers: { apikey: SERVICE, Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ in_kind: kind, in_id: id }),
    });
    const ctx = (await ctxRes.json())?.[0];
    if (!ctx) return json({ error: 'purchase not found' }, 404);
    if (ctx.is_owner !== true && ctx.is_buyer !== true) return json({ error: 'not authorized' }, 403);

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
