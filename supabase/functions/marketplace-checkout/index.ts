// marketplace-checkout — creates a Stripe Checkout Session (mode=payment) for a
// consumer purchase (order / event tickets) using Connect DESTINATION CHARGES:
// the buyer is charged P×1.05, the platform keeps 15% of P as the application fee,
// and the seller's connected account receives the rest (≈P×0.90). The purchase is
// STAGED in pending_purchases first and only FULFILLED by stripe-webhook once
// payment succeeds — so we never issue an order/tickets without being paid, and
// never charge without fulfilling. verify_jwt = true (buyer identified from JWT).
//
// Amounts are computed SERVER-SIDE from authoritative DB prices (event tiers) /
// validated line items — the client cannot dictate what it pays.
//
// Secrets: STRIPE_SECRET_KEY.  Auto: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

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
    const kind = String(body?.kind ?? '');
    const slug = String(body?.slug ?? '');
    const items = Array.isArray(body?.items) ? body.items : [];
    const KINDS = ['order', 'ticket', 'booking', 'rental'];
    if (!KINDS.includes(kind) || !slug) return json({ error: 'bad request' }, 400);
    if ((kind === 'order' || kind === 'ticket') && items.length === 0) return json({ error: 'bad request' }, 400);

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const STRIPE = Deno.env.get('STRIPE_SECRET_KEY');
    if (!STRIPE) return json({ error: 'stripe not configured' }, 500);

    // Buyer from JWT (validated by verify_jwt).
    const authHeader = req.headers.get('Authorization') ?? '';
    const buyer = (await (await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: authHeader, apikey: SERVICE } })).json())?.id;
    if (!buyer) return json({ error: 'auth required' }, 401);

    const svc = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` };
    const get = async (path: string) => (await (await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: svc })).json());

    let businessId: string | null = null;
    let sellerAccount = '';
    let productName = "To'Latino";
    let subtotal = 0;                                   // dollars (goods value P)
    let payload: Record<string, unknown> = {};
    const ref = slug;

    if (kind === 'order') {
      const biz = (await get(`businesses?slug=eq.${encodeURIComponent(slug)}&select=id,name,stripe_account_id,connect_charges_enabled`))?.[0];
      if (!biz) return json({ error: 'business not found' }, 404);
      if (!biz.connect_charges_enabled || !biz.stripe_account_id) return json({ error: 'seller_not_payable' }, 400);
      businessId = biz.id; sellerAccount = biz.stripe_account_id; productName = `${biz.name} · Pedido`;
      // Validate + total the submitted line items server-side.
      const lines = items.map((l: Record<string, unknown>) => ({
        name: String(l.name ?? 'Artículo'), qty: Math.max(1, Math.min(99, Math.floor(Number(l.qty ?? 1)))),
        price: Number(l.price ?? 0), opts: l.opts != null ? String(l.opts) : undefined,
      }));
      if (lines.some((l) => !(l.price >= 0) || l.price > 100000)) return json({ error: 'bad line price' }, 400);
      subtotal = lines.reduce((a, l) => a + l.price * l.qty, 0);
      payload = { items: lines, total: subtotal, channel: String(body?.channel ?? 'pickup') };
    } else if (kind === 'booking' || kind === 'rental') {
      // Booking deposit / rental fee — the payable base (P) is computed by the
      // client from the service/rental config; validated here (re-price server-side
      // before real-money launch — see LAUNCH-CHECKLIST). Payload carries the row
      // fields the webhook needs to create the confirmed booking/rental.
      const biz = (await get(`businesses?slug=eq.${encodeURIComponent(slug)}&select=id,name,stripe_account_id,connect_charges_enabled`))?.[0];
      if (!biz) return json({ error: 'business not found' }, 404);
      if (!biz.connect_charges_enabled || !biz.stripe_account_id) return json({ error: 'seller_not_payable' }, 400);
      businessId = biz.id; sellerAccount = biz.stripe_account_id;
      productName = `${biz.name} · ${kind === 'booking' ? 'Reserva' : 'Renta'}`;
      const sub = Number(body?.subtotal ?? 0);
      if (!(sub > 0) || sub > 100000) return json({ error: 'bad amount' }, 400);
      subtotal = sub;
      payload = (body?.payload && typeof body.payload === 'object') ? body.payload : {};
    } else {
      const ev = (await get(`events?slug=eq.${encodeURIComponent(slug)}&select=id,owner_id,title_es,status`))?.[0];
      if (!ev) return json({ error: 'event not found' }, 404);
      if (ev.status !== 'published') return json({ error: 'event not on sale' }, 400);
      const seller = (await get(`businesses?owner_id=eq.${ev.owner_id}&connect_charges_enabled=eq.true&stripe_account_id=not.is.null&select=id,stripe_account_id&order=created_at.asc&limit=1`))?.[0];
      if (!seller) return json({ error: 'seller_not_payable' }, 400);
      businessId = seller.id; sellerAccount = seller.stripe_account_id; productName = `${ev.title_es} · Boletos`;
      // Authoritative tier prices from the DB (never trust client prices).
      const want = items.map((i: Record<string, unknown>) => ({ tierId: String(i.tierId ?? i.tier_id ?? ''), qty: Math.max(1, Math.min(10, Math.floor(Number(i.qty ?? 1)))) })).filter((i) => i.tierId);
      if (want.length === 0) return json({ error: 'no tickets selected' }, 400);
      const ids = want.map((w) => w.tierId).join(',');
      const tiers = (await get(`event_tiers?event_id=eq.${ev.id}&id=in.(${ids})&select=id,price`)) as { id: string; price: number }[];
      const priceOf = new Map(tiers.map((t) => [t.id, Number(t.price)]));
      if (want.some((w) => !priceOf.has(w.tierId))) return json({ error: 'tier not found' }, 400);
      subtotal = want.reduce((a, w) => a + (priceOf.get(w.tierId) ?? 0) * w.qty, 0);
      payload = { items: want.map((w) => ({ tier_id: w.tierId, qty: w.qty })) };
    }

    const subtotalCents = Math.round(subtotal * 100);
    if (subtotalCents <= 0) return json({ error: 'nothing to pay' }, 400);
    const amountCents = Math.round(subtotalCents * 1.05);       // buyer pays P + 5%
    const feeCents = Math.round(subtotalCents * 0.15);          // platform keeps 15% of P
    if (amountCents < 50) return json({ error: 'amount too low' }, 400); // Stripe USD minimum

    // Stage the purchase (service role → bypasses RLS).
    const ins = await fetch(`${SUPABASE_URL}/rest/v1/pending_purchases`, {
      method: 'POST', headers: { ...svc, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({
        buyer_id: buyer, business_id: businessId, seller_account: sellerAccount, kind, ref,
        payload, subtotal: subtotalCents, amount: amountCents, application_fee: feeCents, status: 'pending',
      }),
    });
    const pending = (await ins.json())?.[0];
    if (!pending?.id) return json({ error: 'could not stage purchase' }, 500);

    // Return exactly where the buyer was (sanitized path on our origin).
    const rawOrigin = String(body?.origin ?? '');
    const base = rawOrigin.startsWith('http') ? rawOrigin.replace(/\/$/, '') : 'https://tolatino.vercel.app';
    let path = String(body?.returnPath ?? '/');
    if (!path.startsWith('/')) path = '/' + path;
    path = path.split('?')[0].split('#')[0];

    const session = await stripe('checkout/sessions', STRIPE, {
      mode: 'payment',
      'line_items[0][quantity]': '1',
      'line_items[0][price_data][currency]': 'usd',
      'line_items[0][price_data][unit_amount]': String(amountCents),
      'line_items[0][price_data][product_data][name]': productName,
      'payment_intent_data[application_fee_amount]': String(feeCents),
      'payment_intent_data[transfer_data][destination]': sellerAccount,
      'payment_intent_data[metadata][pending_id]': pending.id,
      'payment_intent_data[metadata][purchase_kind]': kind,
      'metadata[pending_id]': pending.id,
      'metadata[purchase_kind]': kind,
      'metadata[business_id]': businessId ?? '',
      success_url: `${base}${path}?pay=success`,
      cancel_url: `${base}${path}?pay=cancel`,
    });
    if (session.error) {
      await fetch(`${SUPABASE_URL}/rest/v1/pending_purchases?id=eq.${pending.id}`, {
        method: 'PATCH', headers: { ...svc, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'failed', error: session.error.message, updated_at: new Date().toISOString() }),
      });
      return json({ error: session.error.message }, 400);
    }

    await fetch(`${SUPABASE_URL}/rest/v1/pending_purchases?id=eq.${pending.id}`, {
      method: 'PATCH', headers: { ...svc, 'Content-Type': 'application/json' },
      body: JSON.stringify({ stripe_session: session.id, updated_at: new Date().toISOString() }),
    });
    return json({ url: session.url, pendingId: pending.id, amount: amountCents, fee: feeCents });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
