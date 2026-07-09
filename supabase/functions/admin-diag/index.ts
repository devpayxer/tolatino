// admin-diag — TEMPORARY internal diagnostics (Stripe read-only) for debugging the
// payments pipeline from the sandbox (api.stripe.com is unreachable there).
// verify_jwt = true AND the caller must present the service_role key — never a
// user JWT. Read-only against Stripe. Remove after the payments verification work.

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json' } });
}

function b64urlJson(part: string): Record<string, unknown> {
  try {
    return JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return {};
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  const STRIPE = Deno.env.get('STRIPE_SECRET_KEY');
  if (!STRIPE) return json({ error: 'stripe not configured' }, 500);

  // Only the service role may call this (verify_jwt already checked the signature).
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const claims = b64urlJson(token.split('.')[1] ?? '');
  if (claims.role !== 'service_role') return json({ error: 'forbidden' }, 403);

  try {
    const { action, id } = await req.json();
    const get = async (path: string) =>
      (await fetch(`https://api.stripe.com/v1/${path}`, { headers: { Authorization: `Bearer ${STRIPE}` } })).json();

    if (action === 'session' && typeof id === 'string' && /^cs_[a-zA-Z0-9_]+$/.test(id)) {
      const s = await get(`checkout/sessions/${id}`);
      return json({
        id: s.id, status: s.status, payment_status: s.payment_status,
        amount_total: s.amount_total, currency: s.currency, mode: s.mode,
        payment_intent: s.payment_intent, metadata: s.metadata, error: s.error?.message,
      });
    }
    if (action === 'webhooks') {
      const w = await get('webhook_endpoints?limit=10');
      return json({
        endpoints: (w.data ?? []).map((e: Record<string, unknown>) => ({
          id: e.id, url: e.url, status: e.status, enabled_events: e.enabled_events,
        })),
        error: w.error?.message,
      });
    }
    if (action === 'payment_intent' && typeof id === 'string' && /^pi_[a-zA-Z0-9_]+$/.test(id)) {
      const p = await get(`payment_intents/${id}`);
      return json({
        id: p.id, status: p.status, amount: p.amount, application_fee_amount: p.application_fee_amount,
        transfer_destination: p.transfer_data?.destination, latest_charge: p.latest_charge, error: p.error?.message,
      });
    }
    if (action === 'events') {
      const ev = await get('events?limit=10');
      return json({
        events: (ev.data ?? []).map((e: Record<string, unknown>) => ({ id: e.id, type: e.type, created: e.created })),
        error: ev.error?.message,
      });
    }
    // TEST MODE ONLY: deliver a checkout.session.completed for a real session to
    // our own webhook, signed with the real STRIPE_WEBHOOK_SECRET — byte-for-byte
    // what Stripe would send after the buyer pays. Verifies the entire fulfillment
    // pipeline without the hosted page (unreachable from the dev sandbox).
    if (action === 'simulate-completed' && typeof id === 'string' && /^cs_[a-zA-Z0-9_]+$/.test(id)) {
      if (!STRIPE.startsWith('sk_test_')) return json({ error: 'live mode — refusing' }, 400);
      const WHSEC = Deno.env.get('STRIPE_WEBHOOK_SECRET');
      if (!WHSEC) return json({ error: 'no webhook secret' }, 500);
      const s = await get(`checkout/sessions/${id}`);
      if (s.error) return json({ error: s.error.message }, 400);
      s.payment_status = 'paid';
      s.payment_intent = s.payment_intent ?? 'pi_simulated_e2e';
      const event = { id: 'evt_simulated_e2e', type: 'checkout.session.completed', data: { object: s } };
      const payload = JSON.stringify(event);
      const t = Math.floor(Date.now() / 1000);
      const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(WHSEC), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${payload}`));
      const v1 = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');
      const hook = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/stripe-webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Stripe-Signature': `t=${t},v1=${v1}` },
        body: payload,
      });
      return json({ webhook_status: hook.status, webhook_body: await hook.text() });
    }
    // TEST MODE ONLY: confirm a PaymentIntent with the standard test card
    // (pm_card_visa ≈ 4242…) — simulates the buyer completing hosted Checkout,
    // so Stripe fires the real checkout.session.completed at our webhook.
    if (action === 'confirm-pi' && typeof id === 'string' && /^pi_[a-zA-Z0-9_]+$/.test(id)) {
      if (!STRIPE.startsWith('sk_test_')) return json({ error: 'live mode — refusing' }, 400);
      const p = await (await fetch(`https://api.stripe.com/v1/payment_intents/${id}/confirm`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${STRIPE}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ payment_method: 'pm_card_visa' }).toString(),
      })).json();
      return json({ id: p.id, status: p.status, amount: p.amount, error: p.error?.message });
    }
    // Refund a paid-but-unfulfilled marketplace charge (reverses the seller
    // transfer + the platform fee). Service-role only (gate above).
    if (action === 'refund' && typeof id === 'string' && /^pi_[a-zA-Z0-9_]+$/.test(id)) {
      const r = await (await fetch('https://api.stripe.com/v1/refunds', {
        method: 'POST',
        headers: { Authorization: `Bearer ${STRIPE}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ payment_intent: id, reverse_transfer: 'true', refund_application_fee: 'true' }).toString(),
      })).json();
      return json({ id: r.id, status: r.status, amount: r.amount, error: r.error?.message });
    }
    return json({ error: 'unknown action' }, 400);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
