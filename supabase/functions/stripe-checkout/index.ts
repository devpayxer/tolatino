// stripe-checkout — creates a Stripe Checkout Session (subscription mode) for a
// business plan (Verified / Premium). Deployed with verify_jwt = true, so Supabase
// validates the caller's JWT before this runs; we then confirm the caller OWNS the
// business and build a subscription Checkout with inline price_data (no pre-created
// Stripe Products needed). Returns { url } to redirect to Stripe's hosted page.
//
// Secrets (Supabase Edge Function env): STRIPE_SECRET_KEY.
// Auto-injected by Supabase: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

const PLANS: Record<string, { amount: number; name: string }> = {
  verified: { amount: 1900, name: "To'Latino Verified" },
  premium: { amount: 4900, name: "To'Latino Premium" },
};

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
    const { plan, businessId, origin } = await req.json();
    const p = PLANS[plan];
    if (!p || !businessId) return json({ error: 'bad request' }, 400);

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const STRIPE = Deno.env.get('STRIPE_SECRET_KEY');
    if (!STRIPE) return json({ error: 'stripe not configured' }, 500);

    // Identify the caller from their JWT (already validated by verify_jwt).
    const authHeader = req.headers.get('Authorization') ?? '';
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: authHeader, apikey: SERVICE } });
    const user = await userRes.json();
    const uid = user?.id;
    if (!uid) return json({ error: 'auth required' }, 401);

    // Confirm the caller owns the business.
    const svc = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` };
    const bizRes = await fetch(`${SUPABASE_URL}/rest/v1/businesses?id=eq.${businessId}&select=id,name,owner_id`, { headers: svc });
    const biz = (await bizRes.json())?.[0];
    if (!biz || biz.owner_id !== uid) return json({ error: 'not your business' }, 403);

    // Reuse the business's Stripe customer if one exists, else create it.
    const subRes = await fetch(`${SUPABASE_URL}/rest/v1/business_subscriptions?business_id=eq.${businessId}&select=stripe_customer_id`, { headers: svc });
    let customer: string | undefined = (await subRes.json())?.[0]?.stripe_customer_id;
    if (!customer) {
      const c = await stripe('customers', STRIPE, { name: biz.name ?? 'To’Latino', 'metadata[business_id]': businessId });
      if (c.error) return json({ error: c.error.message }, 400);
      customer = c.id;
    }

    const base = safeOrigin(origin);
    const session = await stripe('checkout/sessions', STRIPE, {
      mode: 'subscription',
      customer: customer!,
      'line_items[0][quantity]': '1',
      'line_items[0][price_data][currency]': 'usd',
      'line_items[0][price_data][unit_amount]': String(p.amount),
      'line_items[0][price_data][recurring][interval]': 'month',
      'line_items[0][price_data][product_data][name]': p.name,
      'metadata[business_id]': businessId,
      'metadata[plan]': plan,
      'subscription_data[metadata][business_id]': businessId,
      'subscription_data[metadata][plan]': plan,
      allow_promotion_codes: 'true',
      success_url: `${base}/negocio/?checkout=success`,
      cancel_url: `${base}/negocio/?checkout=cancel`,
    });
    if (session.error) return json({ error: session.error.message }, 400);
    return json({ url: session.url });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
