// stripe-webhook — Stripe calls this on subscription events. Deployed with
// verify_jwt = false (Stripe has no Supabase JWT). We verify Stripe's signature
// (HMAC-SHA256 over "timestamp.payload") with STRIPE_WEBHOOK_SECRET, then apply the
// subscription to the DB via the apply_subscription RPC using the service role.
//
// Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET.
// Auto-injected: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

async function verifySig(payload: string, header: string, secret: string): Promise<boolean> {
  const parts: Record<string, string> = {};
  for (const seg of header.split(',')) {
    const i = seg.indexOf('=');
    if (i > 0) parts[seg.slice(0, i)] = seg.slice(i + 1);
  }
  const t = parts['t'];
  const v1 = parts['v1'];
  if (!t || !v1) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${payload}`));
  const expected = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');
  if (expected.length !== v1.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ v1.charCodeAt(i);
  return diff === 0;
}

function planFromSub(sub: { items?: { data?: { price?: { unit_amount?: number } }[] } }): string {
  const amt = sub?.items?.data?.[0]?.price?.unit_amount ?? 0;
  return amt >= 4900 ? 'premium' : 'verified';
}

async function stripeGet(path: string, key: string) {
  const r = await fetch(`https://api.stripe.com/v1/${path}`, { headers: { Authorization: `Bearer ${key}` } });
  return r.json();
}

async function apply(url: string, service: string, businessId: string, customer: string, subId: string, plan: string, status: string, periodEnd: number) {
  await fetch(`${url}/rest/v1/rpc/apply_subscription`, {
    method: 'POST',
    headers: { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      in_business: businessId, in_customer: customer, in_sub: subId, in_plan: plan, in_status: status,
      in_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    }),
  });
}

Deno.serve(async (req) => {
  const STRIPE = Deno.env.get('STRIPE_SECRET_KEY')!;
  const WHSEC = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const sig = req.headers.get('Stripe-Signature') ?? '';
  const raw = await req.text();

  if (WHSEC) {
    const ok = await verifySig(raw, sig, WHSEC);
    if (!ok) return new Response('invalid signature', { status: 400 });
  }

  let event: { type?: string; data?: { object?: Record<string, unknown> } };
  try { event = JSON.parse(raw); } catch { return new Response('bad json', { status: 400 }); }

  try {
    const obj = (event.data?.object ?? {}) as Record<string, unknown>;
    if (event.type === 'checkout.session.completed') {
      const meta = (obj.metadata ?? {}) as Record<string, string>;
      const businessId = meta.business_id;
      const subId = obj.subscription as string | undefined;
      const customer = obj.customer as string | undefined;
      if (businessId && subId) {
        const sub = await stripeGet(`subscriptions/${subId}`, STRIPE);
        await apply(SUPABASE_URL, SERVICE, businessId, customer ?? '', subId, meta.plan || planFromSub(sub), sub.status, sub.current_period_end);
      }
    } else if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const sub = obj as Record<string, unknown>;
      const meta = (sub.metadata ?? {}) as Record<string, string>;
      const businessId = meta.business_id;
      if (businessId) {
        const status = event.type === 'customer.subscription.deleted' ? 'canceled' : (sub.status as string);
        await apply(SUPABASE_URL, SERVICE, businessId, (sub.customer as string) ?? '', (sub.id as string) ?? '', meta.plan || planFromSub(sub as never), status, sub.current_period_end as number);
      }
    }
  } catch (e) {
    return new Response('handler error: ' + String(e), { status: 500 });
  }
  return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } });
});
