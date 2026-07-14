// stripe-portal — opens the Stripe Billing Portal for a business's customer so the
// owner can update their card, download invoices, or cancel. verify_jwt = true.
// Secrets: STRIPE_SECRET_KEY. Auto-injected: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}
// Open-redirect guard: only OUR origins are echoed into Stripe return URLs.
function safeOrigin(raw: unknown): string {
  const DEFAULT = 'https://tolatino.vercel.app';
  if (typeof raw !== 'string' || !raw) return DEFAULT;
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return DEFAULT;
    const site = Deno.env.get('SITE_ORIGIN');
    const ok = u.hostname === 'tolatino.vercel.app' || u.hostname === 'localhost' || u.hostname === '127.0.0.1'
      || (site ? (() => { try { return new URL(site).hostname === u.hostname; } catch { return false; } })() : false);
    if (ok) return u.origin;
  } catch { /* fall through */ }
  return DEFAULT;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  try {
    const { businessId, origin } = await req.json();
    if (!businessId) return json({ error: 'bad request' }, 400);
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const STRIPE = Deno.env.get('STRIPE_SECRET_KEY');
    if (!STRIPE) return json({ error: 'stripe not configured' }, 500);

    const authHeader = req.headers.get('Authorization') ?? '';
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: authHeader, apikey: SERVICE } });
    const uid = (await userRes.json())?.id;
    if (!uid) return json({ error: 'auth required' }, 401);

    const svc = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` };
    const bizRes = await fetch(`${SUPABASE_URL}/rest/v1/businesses?id=eq.${businessId}&select=owner_id`, { headers: svc });
    const biz = (await bizRes.json())?.[0];
    if (!biz || biz.owner_id !== uid) return json({ error: 'not your business' }, 403);

    const subRes = await fetch(`${SUPABASE_URL}/rest/v1/business_subscriptions?business_id=eq.${businessId}&select=stripe_customer_id`, { headers: svc });
    const customer = (await subRes.json())?.[0]?.stripe_customer_id;
    if (!customer) return json({ error: 'no subscription' }, 400);

    const base = safeOrigin(origin);
    const res = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${STRIPE}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ customer, return_url: `${base}/negocio/` }).toString(),
    });
    const portal = await res.json();
    if (portal.error) return json({ error: portal.error.message }, 400);
    return json({ url: portal.url });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
