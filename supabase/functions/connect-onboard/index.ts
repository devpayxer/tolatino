// connect-onboard — creates (or reuses) a Stripe Connect Express account for a
// business and returns a hosted onboarding Account Link. verify_jwt = true; the
// caller must own the business. Secrets: STRIPE_SECRET_KEY. Auto: SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY.

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
    const bizRes = await fetch(`${SUPABASE_URL}/rest/v1/businesses?id=eq.${businessId}&select=id,name,owner_id,stripe_account_id`, { headers: svc });
    const biz = (await bizRes.json())?.[0];
    if (!biz || biz.owner_id !== uid) return json({ error: 'not your business' }, 403);

    let acct: string | undefined = biz.stripe_account_id;
    if (!acct) {
      const a = await stripe('accounts', STRIPE, {
        type: 'express',
        country: 'US',
        'capabilities[card_payments][requested]': 'true',
        'capabilities[transfers][requested]': 'true',
        'business_profile[name]': biz.name ?? "To'Latino seller",
        'metadata[business_id]': businessId,
      });
      if (a.error) return json({ error: a.error.message }, 400);
      acct = a.id;
      await fetch(`${SUPABASE_URL}/rest/v1/rpc/apply_connect_status`, {
        method: 'POST', headers: { ...svc, 'Content-Type': 'application/json' },
        body: JSON.stringify({ in_business: businessId, in_account: acct, in_charges: false, in_details: false }),
      });
    }

    const base = safeOrigin(origin);
    const link = await stripe('account_links', STRIPE, {
      account: acct!,
      refresh_url: `${base}/negocio/?connect=refresh`,
      return_url: `${base}/negocio/?connect=done`,
      type: 'account_onboarding',
    });
    if (link.error) return json({ error: link.error.message }, 400);
    return json({ url: link.url });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
