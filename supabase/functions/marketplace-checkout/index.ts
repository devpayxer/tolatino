// marketplace-checkout — creates a Stripe Checkout Session (mode=payment) for a
// consumer purchase (order / event tickets) using Connect DESTINATION CHARGES:
// the buyer is charged P×1.05, the platform keeps 15% of P as the application fee,
// and the seller's connected account receives the rest (≈P×0.90). The purchase is
// STAGED in pending_purchases first and only FULFILLED by stripe-webhook once
// payment succeeds — so we never issue an order/tickets without being paid, and
// never charge without fulfilling. verify_jwt = true (buyer identified from JWT).
//
// Amounts are computed SERVER-SIDE from authoritative DB prices — orders are
// re-priced from business_items + menu/product config (base + add-on options by
// id), booking deposits from the service price × party + add-ons, rental fees from
// the rate × re-derived span + add-ons, tickets from event_tiers — the client
// cannot dictate what it pays. A business's own `percent` promo code (menu/service/
// rental config) is applied business-absorbed: it lowers what the buyer pays and
// the seller's transfer, but the platform keeps its full 15% fee.
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

// AUTHORITATIVE order pricing (never trust the client's `price`). Build a map
// businessItemId → { base, groups }, where `groups` maps a reusable-group id to
// its option prices by index, mirroring the client's menu/shop mapping
// (lib/live.tsx). Menu: attrs.mods → config.mods[].options[].price. Shop:
// attrs.options → config.optionSets[].values[].price. 86'd menu items
// (attrs.stock === 'out') are excluded, so they can't be ordered.
type PriceEntry = { base: number; groups: Map<string, number[]> };
function buildPriceMap(
  menuRow: { items?: unknown; config?: unknown } | undefined,
  prodRow: { items?: unknown; config?: unknown } | undefined,
): Map<string, PriceEntry> {
  const map = new Map<string, PriceEntry>();
  const add = (
    rows: unknown, config: unknown, refKey: string, groupKey: string, valuesKey: string, drop86: boolean,
  ) => {
    const items = Array.isArray(rows) ? (rows as Record<string, unknown>[]) : [];
    const cfg = (config ?? {}) as Record<string, unknown>;
    const groupDefs = Array.isArray(cfg[groupKey]) ? (cfg[groupKey] as Record<string, unknown>[]) : [];
    const pricesById = new Map<string, number[]>();
    for (const g of groupDefs) {
      const gid = g?.id != null ? String(g.id) : '';
      if (!gid) continue;
      const vals = Array.isArray(g[valuesKey]) ? (g[valuesKey] as Record<string, unknown>[]) : [];
      pricesById.set(gid, vals.map((o) => Number(o?.price ?? 0) || 0));
    }
    for (const it of items) {
      const id = it?.id != null ? String(it.id) : '';
      if (!id) continue;
      const attrs = (it.attrs ?? {}) as Record<string, unknown>;
      if (drop86 && attrs.stock === 'out') continue;
      const refs = Array.isArray(attrs[refKey]) ? (attrs[refKey] as unknown[]).map(String) : [];
      const groups = new Map<string, number[]>();
      for (const gid of refs) { const p = pricesById.get(gid); if (p) groups.set(gid, p); }
      map.set(id, { base: Number(it.price ?? 0) || 0, groups });
    }
  };
  add(menuRow?.items, menuRow?.config, 'mods', 'mods', 'options', true);
  add(prodRow?.items, prodRow?.config, 'options', 'optionSets', 'values', false);
  return map;
}

// Sum the DB prices of the client-selected add-on ids for a booking/rental,
// accepting ONLY ids the item actually offers (itemAddonIds) AND that exist in
// the business's add-on catalog (configAddons: [{id, price}]). Returns -1 if any
// selected id is not allowed/known (caller rejects with bad_addon).
function pickAddonSum(itemAddonIds: unknown, configAddons: unknown, selected: unknown): number {
  const sel = Array.isArray(selected) ? selected.map(String) : [];
  if (sel.length === 0) return 0;
  const allowed = new Set((Array.isArray(itemAddonIds) ? itemAddonIds : []).map(String));
  const priceById = new Map<string, number>();
  for (const c of (Array.isArray(configAddons) ? configAddons as Record<string, unknown>[] : [])) {
    if (c?.id != null) priceById.set(String(c.id), Number(c.price ?? 0) || 0);
  }
  let sum = 0;
  for (const id of sel) {
    if (!allowed.has(id) || !priceById.has(id)) return -1;
    sum += priceById.get(id)!;
  }
  return sum;
}

// Only return the caller's origin if it's one of OURS — else the default. Stops an
// attacker from crafting a legit-looking Stripe Checkout that redirects the victim
// to evil.com on completion (open redirect). Add a custom prod domain via SITE_ORIGIN.
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
    const rpcGet = async (fn: string, args: Record<string, unknown>) =>
      (await (await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { ...svc, 'Content-Type': 'application/json' }, body: JSON.stringify(args) })).json());

    let businessId: string | null = null;
    let sellerAccount = '';
    let productName = "To'Latino";
    let subtotal = 0;                                   // dollars (goods value P)
    let payload: Record<string, unknown> = {};
    const ref = slug;

    // Extra money on top of the goods value P: delivery fee + tip go 100% to the
    // seller (no platform cut); the 5% buyer service fee applies to P only.
    let deliveryFee = 0;   // dollars
    let tip = 0;           // dollars
    let discount = 0;      // dollars (promo — platform absorbed)

    if (kind === 'order') {
      const biz = (await get(`businesses?slug=eq.${encodeURIComponent(slug)}&select=id,name,stripe_account_id,connect_charges_enabled,settings`))?.[0];
      if (!biz) return json({ error: 'business not found' }, 404);
      if (!biz.connect_charges_enabled || !biz.stripe_account_id) return json({ error: 'seller_not_payable' }, 400);
      businessId = biz.id; sellerAccount = biz.stripe_account_id; productName = `${biz.name} · Pedido`;
      // RE-PRICE every line from authoritative DB prices — the client's `price`
      // is IGNORED. Each line must carry a real business_items id + its structured
      // add-on picks (sel); we recompute base + option prices from the business's
      // menu/product config. A tampered price ($50 order for $0.55) can't happen.
      const [menuRow, prodRow] = await Promise.all([
        rpcGet('business_menu_by_slug', { in_slug: slug }).then((r) => (Array.isArray(r) ? r[0] : undefined)),
        rpcGet('business_products_by_slug', { in_slug: slug }).then((r) => (Array.isArray(r) ? r[0] : undefined)),
      ]);
      const priceMap = buildPriceMap(menuRow, prodRow);
      const lines: { name: string; qty: number; price: number; opts?: string }[] = [];
      for (const l of items as Record<string, unknown>[]) {
        const id = l?.id != null ? String(l.id) : '';
        const entry = id ? priceMap.get(id) : undefined;
        if (!entry) return json({ error: 'item_unavailable' }, 400);
        const qty = Math.max(1, Math.min(99, Math.floor(Number(l?.qty ?? 1))));
        let unit = entry.base;
        const sel = Array.isArray(l?.sel) ? (l.sel as Record<string, unknown>[]) : [];
        for (const s of sel) {
          const g = s?.g != null ? String(s.g) : '';
          const o = Math.floor(Number(s?.o));
          const prices = entry.groups.get(g);
          if (!prices || !Number.isFinite(o) || o < 0 || o >= prices.length) return json({ error: 'bad_addon' }, 400);
          unit += prices[o];
        }
        if (!(unit >= 0) || unit > 100000) return json({ error: 'bad line price' }, 400);
        lines.push({ name: String(l?.name ?? 'Artículo'), qty, price: Math.round(unit * 100) / 100, opts: l?.opts != null ? String(l.opts) : undefined });
      }
      if (lines.length === 0) return json({ error: 'bad request' }, 400);
      subtotal = lines.reduce((a, l) => a + l.price * l.qty, 0);

      const channel = body?.channel === 'delivery' ? 'delivery' : 'pickup';
      const settings = (biz.settings ?? {}) as Record<string, never>;
      if (channel === 'delivery') {
        // Delivery fee + minimum come from the BUSINESS's own config (never the client).
        const del = (settings as Record<string, Record<string, Record<string, unknown>>>)?.shipping?.delivery;
        if (!del || del.on === false) return json({ error: 'no_delivery' }, 400);
        deliveryFee = Math.max(0, Number(String(del.fee ?? '0').replace(/[^0-9.]/g, '')) || 0);
        const minOrder = Number(((settings as Record<string, Record<string, unknown>>)?.delivery_ops?.minOrder as string) ?? '0') || 0;
        if (subtotal < minOrder) return json({ error: 'below_minimum', minimum: minOrder }, 400);
        const addr = (body?.address ?? {}) as Record<string, unknown>;
        if (!addr.formatted || String(addr.formatted).trim().length < 5) return json({ error: 'address_required' }, 400);
      }
      // A driver tip is accepted ONLY when the OWNER enabled tips and the order
      // meets their minimum (mirrors the cart) — the platform never adds it.
      const tCfg = (settings as Record<string, unknown>).tips as Record<string, unknown> | undefined;
      const tipsOn = tCfg?.on === true && subtotal >= (Number(tCfg?.minOrder ?? 0) || 0);
      tip = tipsOn ? Math.max(0, Math.min(500, Number(body?.tip ?? 0) || 0)) : 0;
      // The BUSINESS's own promo code (menu_config.promos, already loaded above):
      // an active `percent` promo whose code matches and whose minOrder the order
      // meets. The business funds it (see the fee math — the platform fee is NOT
      // reduced). Never trust a client-supplied amount; recompute from the config.
      const code = String(body?.promo ?? '').trim().toUpperCase();
      if (code) {
        const promos = Array.isArray((menuRow?.config as Record<string, unknown>)?.promos)
          ? ((menuRow!.config as Record<string, unknown>).promos as Record<string, unknown>[]) : [];
        const hit = promos.find((p) => p?.status === 'active' && p?.type === 'percent'
          && String(p?.code ?? '').trim().toUpperCase() === code
          && Number(p?.value ?? 0) > 0
          && subtotal >= (Number(p?.minOrder ?? 0) || 0));
        if (hit) discount = Math.min(subtotal, Math.round(Number(hit.value) * subtotal) / 100);
      }

      const addr = (body?.address ?? null) as Record<string, unknown> | null;
      const prep = Number(((settings as Record<string, Record<string, unknown>>)?.delivery_ops?.prepTime as string) ?? '20') || 20;
      payload = {
        items: lines, total: subtotal, channel, business: biz.name, business_slug: slug,
        fulfillment: {
          ...(channel === 'delivery'
            ? {
                address: String(addr?.formatted ?? ''),
                ...(addr?.label ? { address_label: String(addr.label) } : {}),
                ...(body?.instructions ? { instructions: String(body.instructions).slice(0, 300) } : {}),
                dispatch: 'unassigned',
                eta_range: `${prep + 10}–${prep + 25} min`,
              }
            : { eta_range: `${prep} min` }),
          subtotal, delivery_fee: deliveryFee, tip,
          service_fee: Math.round(subtotal * 5) / 100,
          // Record the redeemed promo so the owner's Promociones stats count it
          // (owner_promo_stats reads fulfillment->>'promo') and paid_total nets it out.
          ...(discount > 0 && code ? { promo: code, discount: Math.round(discount * 100) / 100 } : {}),
          paid_total: Math.round(subtotal * 105 + deliveryFee * 100 + tip * 100 - discount * 100) / 100,
        },
      };
    } else if (kind === 'booking') {
      // RE-PRICE the booking deposit from DB (never trust body.subtotal). The
      // service id comes in the payload; party size + add-on ids are structured
      // inputs. total = (persona ? price×party : price) + Σ allowed add-on prices.
      const biz = (await get(`businesses?slug=eq.${encodeURIComponent(slug)}&select=id,name,stripe_account_id,connect_charges_enabled`))?.[0];
      if (!biz) return json({ error: 'business not found' }, 404);
      if (!biz.connect_charges_enabled || !biz.stripe_account_id) return json({ error: 'seller_not_payable' }, 400);
      businessId = biz.id; sellerAccount = biz.stripe_account_id; productName = `${biz.name} · Reserva`;
      const svcRow = await rpcGet('business_services_by_slug', { in_slug: slug }).then((r) => (Array.isArray(r) ? r[0] : undefined));
      const svcId = (body?.payload as Record<string, unknown> | undefined)?.service_id;
      const svc = (Array.isArray(svcRow?.items) ? svcRow!.items as Record<string, unknown>[] : []).find((i) => String(i.id) === String(svcId ?? ''));
      if (!svc) return json({ error: 'item_unavailable' }, 400);
      const a = (svc.attrs ?? {}) as Record<string, unknown>;
      if (!a.deposit) return json({ error: 'no_deposit' }, 400);              // only deposit bookings charge online
      const price0 = svc.price != null ? Number(svc.price) : NaN;
      if (!(price0 >= 0)) return json({ error: 'not_payable' }, 400);
      const party = Math.max(1, Math.min(999, Math.floor(Number(body?.party_size ?? 1))));
      let total = a.priceType === 'persona' ? price0 * party : price0;
      // Price VARIANT (e.g. vehicle type): the client sends the option index; the
      // delta + label come from the service's own attrs — never a client amount.
      let variantLabel = '';
      const vGroup = (a.variants ?? null) as { options?: { es?: unknown; delta?: unknown }[] } | null;
      if (body?.variant_i != null && String(body.variant_i) !== '') {
        const vi = Math.floor(Number(body.variant_i));
        const opt = Array.isArray(vGroup?.options) ? vGroup!.options![vi] : undefined;
        if (!opt) return json({ error: 'bad_variant' }, 400);
        total += Math.max(0, Number(opt.delta ?? 0) || 0);
        variantLabel = String(opt.es ?? '');
      }
      const bookAddonSum = pickAddonSum(a.addons, (svcRow?.config as Record<string, unknown>)?.addons, body?.addon_ids);
      if (bookAddonSum < 0) return json({ error: 'bad_addon' }, 400);         // -1 sentinel = invalid add-on ref
      total += bookAddonSum;
      // Assigned professional: must exist in the business's own provider roster.
      let staffId = '', staffName = '';
      if (body?.staff_id != null && String(body.staff_id) !== '' && String(body.staff_id) !== 'any') {
        const provs = (svcRow?.config as Record<string, unknown>)?.providers;
        const p = (Array.isArray(provs) ? provs as Record<string, unknown>[] : []).find((x) => String(x?.id ?? '') === String(body.staff_id));
        if (!p) return json({ error: 'bad_staff' }, 400);
        staffId = String(p.id); staffName = String(p.name ?? '');
      }
      // Duration + chosen add-on detail snapshot (names/prices at booking time).
      const durMin = (() => { const m = /(\d+(?:\.\d+)?)\s*h/i.exec(String(a.dur ?? '')); if (m) return Math.round(Number(m[1]) * 60); const n = parseInt(String(a.dur ?? ''), 10); return Number.isFinite(n) && n > 0 ? n : 30; })();
      const cfgAddons = Array.isArray((svcRow?.config as Record<string, unknown>)?.addons) ? ((svcRow!.config as Record<string, unknown>).addons as Record<string, unknown>[]) : [];
      const addonDetail = (Array.isArray(body?.addon_ids) ? (body.addon_ids as unknown[]).map(String) : [])
        .map((id) => cfgAddons.find((c) => String(c?.id ?? '') === id))
        .filter(Boolean)
        .map((c) => ({ n: String(c!.es ?? ''), p: Number(c!.price ?? 0) || 0 }));
      if (!(total > 0) || total > 100000) return json({ error: 'bad amount' }, 400);
      subtotal = total;
      // The BUSINESS's own service promo (service_config.promos): an active `percent`
      // code that matches and whose minOrder the deposit meets. Business-absorbed
      // (the platform fee is NOT reduced). Recompute from config — never trust a
      // client amount. The code is stashed on the payload so owner_promo_stats
      // (0088) counts the redemption once the booking is fulfilled.
      const bCode = String(body?.promo ?? '').trim().toUpperCase();
      if (bCode) {
        const promos = Array.isArray((svcRow?.config as Record<string, unknown>)?.promos)
          ? ((svcRow!.config as Record<string, unknown>).promos as Record<string, unknown>[]) : [];
        const hit = promos.find((p) => p?.status === 'active' && p?.type === 'percent'
          && String(p?.code ?? '').trim().toUpperCase() === bCode
          && Number(p?.value ?? 0) > 0
          && subtotal >= (Number(p?.minOrder ?? 0) || 0));
        if (hit) discount = Math.min(subtotal, Math.round(Number(hit.value) * subtotal) / 100);
      }
      payload = {
        ...((body?.payload && typeof body.payload === 'object') ? body.payload as Record<string, unknown> : {}),
        deposit: total,
        total,
        duration_min: durMin,
        ...(staffId ? { staff_id: staffId, staff_name: staffName } : {}),
        ...(variantLabel ? { variant: variantLabel } : {}),
        ...(addonDetail.length ? { addons: addonDetail } : {}),
        ...(body?.note ? { notes: String(body.note).slice(0, 300) } : {}),
        ...(discount > 0 && bCode ? { promo: bCode, discount: Math.round(discount * 100) / 100 } : {}),
      };
    } else if (kind === 'rental') {
      // RE-PRICE the rental fee from DB (never trust body.subtotal). Rates
      // (hour/day/week) + add-on prices come from DB; the DURATION is re-derived
      // from the authoritative start/end dates (day mode) so a client can't pay
      // 1 day's rate and block the item for 30. Deposit is collected at pickup.
      const biz = (await get(`businesses?slug=eq.${encodeURIComponent(slug)}&select=id,name,stripe_account_id,connect_charges_enabled`))?.[0];
      if (!biz) return json({ error: 'business not found' }, 404);
      if (!biz.connect_charges_enabled || !biz.stripe_account_id) return json({ error: 'seller_not_payable' }, 400);
      businessId = biz.id; sellerAccount = biz.stripe_account_id; productName = `${biz.name} · Renta`;
      const rentRow = await rpcGet('business_rentals_by_slug', { in_slug: slug }).then((r) => (Array.isArray(r) ? r[0] : undefined));
      const pl = (body?.payload ?? {}) as Record<string, unknown>;
      const it = (Array.isArray(rentRow?.items) ? rentRow!.items as Record<string, unknown>[] : []).find((i) => String(i.id) === String(pl.item_id ?? ''));
      if (!it) return json({ error: 'item_unavailable' }, 400);
      const a = (it.attrs ?? {}) as Record<string, unknown>;
      const dayRate = it.price != null ? Number(it.price) : Number(a.day ?? 0);
      const hourRate = a.hour != null ? Number(a.hour) : dayRate;
      const weekRate = Number(a.week ?? 0);
      const stock = Number(a.stock ?? 0);
      const units = Math.max(1, Math.min(stock > 0 ? stock : 99, Math.floor(Number(body?.units ?? 1))));
      let unitFee: number;
      if (body?.mode === 'hour') {
        const hours = Math.max(1, Math.min(24, Math.floor(Number(body?.hours ?? 1))));
        unitFee = hourRate * hours;
      } else {
        // inclusive day span from the dates (matches client spanDaysInc; the fixed
        // 09:00→18:00 convention rounds away). Weekly rate auto-applies at 7+ days.
        const s = Date.parse(String(pl.start_at ?? '')); const e = Date.parse(String(pl.end_at ?? ''));
        let span = 1;
        if (Number.isFinite(s) && Number.isFinite(e) && e >= s) span = Math.round((e - s) / 86400000) + 1;
        span = Math.max(1, Math.min(365, span));
        unitFee = weekRate > 0 && span >= 7 ? Math.floor(span / 7) * weekRate + (span % 7) * dayRate : span * dayRate;
      }
      let fee = unitFee * units;
      const addonSum = pickAddonSum(a.addons, (rentRow?.config as Record<string, unknown>)?.addons, body?.addon_ids);
      if (addonSum < 0) return json({ error: 'bad_addon' }, 400);
      fee += addonSum;
      if (!(fee > 0) || fee > 100000) return json({ error: 'bad amount' }, 400);
      subtotal = fee;
      // The BUSINESS's own rental promo (rental_config.promos): active `percent`
      // code, minOrder met. Business-absorbed; recompute from config. Stashed on the
      // payload so owner_promo_stats (0088) counts it once the rental is fulfilled.
      const rCode = String(body?.promo ?? '').trim().toUpperCase();
      if (rCode) {
        const promos = Array.isArray((rentRow?.config as Record<string, unknown>)?.promos)
          ? ((rentRow!.config as Record<string, unknown>).promos as Record<string, unknown>[]) : [];
        const hit = promos.find((p) => p?.status === 'active' && p?.type === 'percent'
          && String(p?.code ?? '').trim().toUpperCase() === rCode
          && Number(p?.value ?? 0) > 0
          && subtotal >= (Number(p?.minOrder ?? 0) || 0));
        if (hit) discount = Math.min(subtotal, Math.round(Number(hit.value) * subtotal) / 100);
      }
      payload = {
        ...((body?.payload && typeof body.payload === 'object') ? body.payload as Record<string, unknown> : {}),
        ...(discount > 0 && rCode ? { promo: rCode, discount: Math.round(discount * 100) / 100 } : {}),
      };
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
    // Buyer pays P + 5% (+ delivery + tip on orders); platform keeps 15% of P.
    // Delivery fee and tip pass through to the seller untouched.
    const extrasCents = Math.round(deliveryFee * 100) + Math.round(tip * 100);
    const discountCents = Math.round(discount * 100);
    const amountCents = Math.round(subtotalCents * 1.05) + extrasCents - discountCents;
    // The platform keeps its full 15%; the BUSINESS funds its own promo (the
    // discount lowers what the buyer pays → lowers the seller's transfer). Clamp
    // the fee to the charge so the seller's transfer can never go negative.
    const feeCents = Math.min(Math.round(subtotalCents * 0.15), Math.max(0, amountCents));
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

    // ── PaymentIntent mode (custom on-site checkout, Stripe Payment Element) ──
    // When the client asks for `intent`, we return a PaymentIntent client_secret
    // instead of a hosted Checkout URL, so the buyer pays INSIDE our own branded
    // page (like DoorDash) — Stripe still renders the secure card fields. Same
    // destination-charge economics + metadata as the hosted path; the webhook
    // fulfills on `payment_intent.succeeded`.
    if (body?.intent === true) {
      const pi = await stripe('payment_intents', STRIPE, {
        amount: String(amountCents),
        currency: 'usd',
        'automatic_payment_methods[enabled]': 'true', // card + Apple/Google Pay + Link, per eligibility
        application_fee_amount: String(feeCents),
        'transfer_data[destination]': sellerAccount,
        'metadata[pending_id]': pending.id,
        'metadata[purchase_kind]': kind,
        'metadata[business_id]': businessId ?? '',
        description: productName,
      });
      if (pi.error || !pi.client_secret) {
        await fetch(`${SUPABASE_URL}/rest/v1/pending_purchases?id=eq.${pending.id}`, {
          method: 'PATCH', headers: { ...svc, 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'failed', error: pi.error?.message ?? 'no client secret', updated_at: new Date().toISOString() }),
        });
        return json({ error: pi.error?.message ?? 'could not start payment' }, 400);
      }
      await fetch(`${SUPABASE_URL}/rest/v1/pending_purchases?id=eq.${pending.id}`, {
        method: 'PATCH', headers: { ...svc, 'Content-Type': 'application/json' },
        body: JSON.stringify({ stripe_payment_intent: pi.id, updated_at: new Date().toISOString() }),
      });
      return json({ clientSecret: pi.client_secret, pendingId: pending.id, amount: amountCents, fee: feeCents, productName });
    }

    // Return exactly where the buyer was (sanitized path on OUR origin only).
    const base = safeOrigin(body?.origin);
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
      success_url: `${base}${path}?pay=success&pid=${pending.id}`,
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
