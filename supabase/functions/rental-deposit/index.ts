// rental-deposit — the business OWNER releases or captures a rental's real
// deposit authorization hold (0101). Turo-grade: on return → release (cancel the
// auth, the hold drops off the renter's card); on damage → capture part/all (the
// captured amount transfers to the owner's connected account, the rest releases).
//
// verify_jwt = true: the caller is the owner, identified by JWT. rental_deposit_ctx
// runs under that JWT and returns is_owner, so a non-owner can't touch the hold.
// Stripe ops run with the platform secret. Secrets: STRIPE_SECRET_KEY. Auto:
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
    const order = String(body?.order ?? '');
    const action = String(body?.action ?? ''); // 'release' | 'capture'
    if (!order || (action !== 'release' && action !== 'capture')) return json({ error: 'bad request' }, 400);

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const STRIPE = Deno.env.get('STRIPE_SECRET_KEY');
    if (!STRIPE) return json({ error: 'stripe not configured' }, 500);

    const authHeader = req.headers.get('Authorization') ?? '';
    // Resolve the deposit context UNDER THE CALLER'S JWT so is_owner is real.
    const ctxRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/rental_deposit_ctx`, {
      method: 'POST',
      headers: { apikey: SERVICE, Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ in_order: order }),
    });
    const ctx = (await ctxRes.json())?.[0];
    if (!ctx) return json({ error: 'order not found' }, 404);
    if (ctx.is_owner !== true) return json({ error: 'not authorized' }, 403);

    const svc = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json' };
    const setDeposit = (status: string, captured: number) =>
      fetch(`${SUPABASE_URL}/rest/v1/rpc/set_rental_deposit`, {
        method: 'POST', headers: svc,
        body: JSON.stringify({ in_order: order, in_intent: ctx.deposit_intent, in_status: status, in_captured: captured }),
      });

    const intent = ctx.deposit_intent as string | null;
    const status = String(ctx.deposit_status ?? 'none');
    const depositTotal = Number(ctx.deposit_total ?? 0);

    // Only an active hold can be released/captured.
    if (status !== 'held' || !intent) return json({ error: 'no_active_hold', deposit_status: status }, 400);

    if (action === 'release') {
      const r = await stripe(`payment_intents/${intent}/cancel`, STRIPE, {});
      if (r.error && !/already canceled/i.test(r.error?.message ?? '')) return json({ error: r.error.message }, 400);
      await setDeposit('released', 0);
      return json({ ok: true, deposit_status: 'released' });
    }

    // capture: amount in dollars, clamped to the deposit total; the uncaptured
    // remainder is released automatically by Stripe.
    const amount = Math.max(0, Math.min(depositTotal, Number(body?.amount ?? 0)));
    const cents = Math.round(amount * 100);
    if (cents <= 0) return json({ error: 'bad_amount' }, 400);
    const r = await stripe(`payment_intents/${intent}/capture`, STRIPE, { amount_to_capture: String(cents) });
    if (r.error) return json({ error: r.error.message }, 400);
    await setDeposit('captured', Math.round(cents) / 100);
    return json({ ok: true, deposit_status: 'captured', captured: cents / 100 });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
