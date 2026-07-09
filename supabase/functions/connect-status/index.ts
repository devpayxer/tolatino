// connect-status — reads the business's Stripe Connect account and syncs its
// charges_enabled / details_submitted flags to the DB. verify_jwt = true; owner-only.
// Called on return from onboarding and to refresh status. Secrets: STRIPE_SECRET_KEY.

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  try {
    const { businessId } = await req.json();
    if (!businessId) return json({ error: 'bad request' }, 400);
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const STRIPE = Deno.env.get('STRIPE_SECRET_KEY');
    if (!STRIPE) return json({ error: 'stripe not configured' }, 500);

    const authHeader = req.headers.get('Authorization') ?? '';
    const uid = (await (await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: authHeader, apikey: SERVICE } })).json())?.id;
    if (!uid) return json({ error: 'auth required' }, 401);

    const svc = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` };
    const biz = (await (await fetch(`${SUPABASE_URL}/rest/v1/businesses?id=eq.${businessId}&select=owner_id,stripe_account_id`, { headers: svc })).json())?.[0];
    if (!biz || biz.owner_id !== uid) return json({ error: 'not your business' }, 403);

    const acct = biz.stripe_account_id;
    if (!acct) return json({ connected: false, charges_enabled: false, details_submitted: false });

    const a = await (await fetch(`https://api.stripe.com/v1/accounts/${acct}`, { headers: { Authorization: `Bearer ${STRIPE}` } })).json();
    if (a.error) return json({ error: a.error.message }, 400);
    const charges = !!a.charges_enabled;
    const details = !!a.details_submitted;

    await fetch(`${SUPABASE_URL}/rest/v1/rpc/apply_connect_status`, {
      method: 'POST', headers: { ...svc, 'Content-Type': 'application/json' },
      body: JSON.stringify({ in_business: businessId, in_account: acct, in_charges: charges, in_details: details }),
    });
    return json({ connected: true, charges_enabled: charges, details_submitted: details });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
