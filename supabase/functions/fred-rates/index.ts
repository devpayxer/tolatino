// fred-rates — refresh public.market_rates with the LIVE national average
// mortgage rate (Freddie Mac PMMS) from FRED. Run weekly via Supabase cron.
//
// Secret to set (free key, 1 min): FRED_API_KEY  → https://fredaccount.stlouisfed.org/apikeys
// Auto-provided: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
//
// FRED series: MORTGAGE30US (30-yr fixed) · MORTGAGE15US (15-yr fixed), weekly.
// Idempotent: upserts one row per term via the set_market_rate RPC (service role).

const SERIES: Record<number, string> = { 30: 'MORTGAGE30US', 15: 'MORTGAGE15US' };

async function latest(seriesId: string, key: string): Promise<{ rate: number; asOf: string } | null> {
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}` +
    `&api_key=${key}&file_type=json&sort_order=desc&limit=1`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const j = await res.json().catch(() => null) as { observations?: { date: string; value: string }[] } | null;
  const o = j?.observations?.[0];
  if (!o || o.value === '.' || o.value == null) return null;
  const rate = Number(o.value);
  if (!Number.isFinite(rate) || rate <= 0 || rate > 25) return null;
  return { rate, asOf: o.date };
}

Deno.serve(async () => {
  const KEY = Deno.env.get('FRED_API_KEY') ?? '';
  const URL_ = Deno.env.get('SUPABASE_URL')!;
  const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'content-type': 'application/json' } });

  if (!KEY) return json({ ok: false, error: 'FRED_API_KEY not set — seeded rates remain in use' }, 200);

  const updated: Record<number, { rate: number; asOf: string }> = {};
  for (const [termStr, seriesId] of Object.entries(SERIES)) {
    const term = Number(termStr);
    const r = await latest(seriesId, KEY);
    if (!r) continue;
    const res = await fetch(`${URL_}/rest/v1/rpc/set_market_rate`, {
      method: 'POST',
      headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ in_term: term, in_rate: r.rate, in_as_of: r.asOf, in_source: 'Freddie Mac PMMS (FRED)' }),
    });
    if (res.ok) updated[term] = r;
  }
  return json({ ok: Object.keys(updated).length > 0, updated });
});
