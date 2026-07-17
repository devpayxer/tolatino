// stripe-webhook — Stripe calls this on subscription AND marketplace (Connect)
// events. Deployed with verify_jwt = false (Stripe has no Supabase JWT); we verify
// Stripe's signature (HMAC-SHA256 over "timestamp.payload") with STRIPE_WEBHOOK_SECRET,
// then act with the service role.
//
//   · subscription events              → apply_subscription (flip the business tier)
//   · marketplace checkout.session.completed (mode=payment) → FULFILL the staged
//     purchase (create the order / issue the tickets) + record the payment. If
//     fulfillment fails after payment (e.g. tickets sold out), the buyer is
//     automatically refunded (transfer + our fee reversed) and notified.
//   · account.updated                  → sync the seller's Connect charge status.
//
// Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET.  Auto: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

async function verifySig(payload: string, header: string, secret: string): Promise<boolean> {
  const parts: Record<string, string> = {};
  for (const seg of header.split(',')) {
    const i = seg.indexOf('=');
    if (i > 0) parts[seg.slice(0, i)] = seg.slice(i + 1);
  }
  const t = parts['t'];
  const v1 = parts['v1'];
  if (!t || !v1) return false;
  // Reject replays: the signed timestamp must be within 5 min (Stripe's tolerance).
  // A captured valid webhook body can otherwise be re-POSTed indefinitely.
  const ts = Number(t);
  if (!Number.isFinite(ts) || Math.abs(Math.floor(Date.now() / 1000) - ts) > 300) return false;
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
async function stripePost(path: string, key: string, form: Record<string, string>) {
  const r = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(form).toString(),
  });
  return r.json();
}

// PostgREST helpers (service role).
function svcHeaders(service: string) {
  return { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json' };
}
async function rpc(url: string, service: string, fn: string, args: Record<string, unknown>): Promise<{ ok: boolean; status: number; data: unknown }> {
  const res = await fetch(`${url}/rest/v1/rpc/${fn}`, { method: 'POST', headers: svcHeaders(service), body: JSON.stringify(args) });
  const text = await res.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}
async function patchPending(url: string, service: string, id: string, patch: Record<string, unknown>) {
  await fetch(`${url}/rest/v1/pending_purchases?id=eq.${id}`, {
    method: 'PATCH', headers: svcHeaders(service),
    body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
  });
}

async function applySub(url: string, service: string, businessId: string, customer: string, subId: string, plan: string, status: string, periodEnd: number) {
  await rpc(url, service, 'apply_subscription', {
    in_business: businessId, in_customer: customer, in_sub: subId, in_plan: plan, in_status: status,
    in_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
  });
}

// Fulfill a marketplace purchase once Stripe confirms payment. Idempotent: only a
// still-'pending' staged row is acted on, so Stripe retries never double-fulfill.
async function fulfillMarketplace(url: string, service: string, stripeKey: string, obj: Record<string, unknown>, meta: Record<string, string>) {
  const pendingId = meta.pending_id;
  if (!pendingId) return;
  const pending = (await (await fetch(`${url}/rest/v1/pending_purchases?id=eq.${pendingId}&select=*`, { headers: svcHeaders(service) })).json())?.[0];
  if (!pending || pending.status !== 'pending') return; // unknown / already handled
  // A hosted-Checkout purchase fires BOTH checkout.session.completed AND
  // payment_intent.succeeded; let the session event fulfill it so we don't race.
  // The Payment-Element (on-site) path has no session → the PI event fulfills it.
  if (obj.object === 'payment_intent' && pending.stripe_session) return;
  // The intent id: for a session event it's obj.payment_intent; for a PI event
  // it IS obj.id (used for the refund-on-failure path + payment record).
  const intent = (obj.payment_intent as string | undefined) ?? (obj.object === 'payment_intent' ? (obj.id as string) : null);
  const payload = (pending.payload ?? {}) as Record<string, unknown>;

  let ok = false;
  let result: unknown = null;
  let errMsg = '';
  try {
    if (pending.kind === 'order') {
      const r = await rpc(url, service, 'fulfill_order', {
        in_buyer: pending.buyer_id, in_business: pending.business_id,
        in_items: payload.items ?? [], in_total: payload.total ?? (pending.subtotal / 100), in_channel: payload.channel ?? 'pickup',
        in_fulfillment: payload.fulfillment ?? {},
      });
      if (r.ok && Array.isArray(r.data) && r.data.length) { result = r.data[0]; ok = true; }
      else { errMsg = (r.data as { message?: string })?.message || 'order fulfillment failed'; }
    } else if (pending.kind === 'ticket') {
      const r = await rpc(url, service, 'fulfill_event_tickets_multi', {
        in_buyer: pending.buyer_id, in_slug: pending.ref, in_items: payload.items ?? [], in_promo: null,
      });
      if (r.ok && Array.isArray(r.data) && r.data.length) { result = { tickets: (r.data as { code: string }[]).map((x) => x.code) }; ok = true; }
      else { errMsg = (r.data as { message?: string })?.message || 'ticket fulfillment failed'; }
    } else if (pending.kind === 'booking') {
      const r = await rpc(url, service, 'fulfill_booking', {
        in_buyer: pending.buyer_id, in_business: pending.business_id,
        in_service_name: payload.service_name ?? null, in_service_id: payload.service_id ?? null,
        in_starts_at: payload.starts_at ?? null, in_party_size: payload.party_size ?? null,
        in_deposit: payload.deposit ?? (pending.subtotal / 100),
        in_duration_min: payload.duration_min ?? null, in_staff_id: payload.staff_id ?? null,
        in_staff_name: payload.staff_name ?? null, in_addons: payload.addons ?? null,
        in_variant: payload.variant ?? null, in_total: payload.total ?? payload.deposit ?? null,
        in_notes: payload.notes ?? null,
      });
      if (r.ok && Array.isArray(r.data) && r.data.length) { result = r.data[0]; ok = true; }
      else { errMsg = (r.data as { message?: string })?.message || 'booking fulfillment failed'; }
    } else if (pending.kind === 'rental' && payload.order === true) {
      // Rental CART (0097/0099): one paid ORDER with N line items over one date
      // range. The fee was re-priced server-side at checkout; deposit is collected
      // at pickup. fulfill_rental_order creates the confirmed+paid order + lines
      // and notifies the owner.
      const r = await rpc(url, service, 'fulfill_rental_order', {
        in_buyer: pending.buyer_id, in_business: pending.business_id,
        in_start_at: payload.start_at ?? null, in_end_at: payload.end_at ?? null,
        in_lines: payload.lines ?? [], in_extras: payload.extras ?? [],
        in_fee: payload.fee_total ?? (pending.subtotal / 100),
        in_deposit: payload.deposit_total ?? 0,
      });
      if (r.ok && r.data != null) { result = Array.isArray(r.data) ? r.data[0] : r.data; ok = true; }
      else { errMsg = (r.data as { message?: string })?.message || 'rental order fulfillment failed'; }
    } else if (pending.kind === 'rental') {
      const r = await rpc(url, service, 'fulfill_rental', {
        in_buyer: pending.buyer_id, in_business: pending.business_id,
        in_item_name: payload.item_name ?? null, in_item_id: payload.item_id ?? null,
        in_start_at: payload.start_at ?? null, in_end_at: payload.end_at ?? null,
        in_qty: payload.qty ?? 1, in_total: payload.total ?? (pending.subtotal / 100), in_deposit: payload.deposit ?? null,
      });
      if (r.ok && Array.isArray(r.data) && r.data.length) { result = r.data[0]; ok = true; }
      else { errMsg = (r.data as { message?: string })?.message || 'rental fulfillment failed'; }
    }
  } catch (e) {
    errMsg = String(e);
  }

  if (ok) {
    await rpc(url, service, 'mark_payment', {
      in_business: pending.business_id, in_buyer: pending.buyer_id, in_kind: pending.kind, in_ref: pending.ref,
      in_session: pending.stripe_session, in_intent: intent, in_amount: pending.amount, in_fee: pending.application_fee, in_status: 'paid',
    });
    await patchPending(url, service, pendingId, { status: 'fulfilled', stripe_payment_intent: intent, result });
    // ── Rental deposit HOLD (0101): place a REAL off-session authorization on the
    // saved card for the refundable deposit — money is held, not captured. The
    // owner releases it on return or captures part of it for damage (rental-deposit
    // edge fn). Destination charge → a damage capture pays the seller directly; a
    // release just cancels the auth. If the off-session auth fails (SCA/decline)
    // the deposit falls back to "collect at pickup".
    if (pending.kind === 'rental' && payload.order === true) {
      const orderId = String(result ?? '');
      const depCents = Math.round(Number(payload.deposit_total ?? 0) * 100);
      const customer = obj.customer as string | undefined;
      const pm = obj.payment_method as string | undefined;
      if (orderId && depCents > 0 && customer && pm) {
        try {
          const biz = (await (await fetch(`${url}/rest/v1/businesses?id=eq.${pending.business_id}&select=stripe_account_id`, { headers: svcHeaders(service) })).json())?.[0];
          const seller = biz?.stripe_account_id as string | undefined;
          const hold = await stripePost('payment_intents', stripeKey, {
            amount: String(depCents), currency: 'usd',
            customer, payment_method: pm,
            confirm: 'true', off_session: 'true', capture_method: 'manual',
            description: 'Depósito de renta (garantía reembolsable)',
            ...(seller ? { 'transfer_data[destination]': seller } : {}),
            'metadata[rental_order]': orderId, 'metadata[purchase_kind]': 'rental_deposit',
          });
          const held = hold?.id && !hold.error && (hold.status === 'requires_capture' || hold.status === 'succeeded');
          await rpc(url, service, 'set_rental_deposit', {
            in_order: orderId, in_intent: hold?.id ?? null, in_status: held ? 'held' : 'failed', in_captured: 0,
          });
        } catch (_e) {
          await rpc(url, service, 'set_rental_deposit', { in_order: orderId, in_intent: null, in_status: 'failed', in_captured: 0 });
        }
      }
    }
  } else {
    // Paid but could not fulfill → make the buyer whole (reverse the transfer + our fee).
    if (intent) {
      try { await stripePost('refunds', stripeKey, { payment_intent: intent, reverse_transfer: 'true', refund_application_fee: 'true' }); } catch { /* logged below via status */ }
    }
    await rpc(url, service, 'mark_payment', {
      in_business: pending.business_id, in_buyer: pending.buyer_id, in_kind: pending.kind, in_ref: pending.ref,
      in_session: pending.stripe_session, in_intent: intent, in_amount: pending.amount, in_fee: pending.application_fee, in_status: 'refunded',
    });
    await patchPending(url, service, pendingId, { status: 'refunded', stripe_payment_intent: intent, error: errMsg });
    await rpc(url, service, 'notify_user', {
      in_user: pending.buyer_id, in_kind: 'purchase_refunded',
      in_data: { kind: pending.kind, reason: errMsg }, in_link: '/mi-cuenta',
    });
  }
}

Deno.serve(async (req) => {
  const STRIPE = Deno.env.get('STRIPE_SECRET_KEY')!;
  const WHSEC = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const sig = req.headers.get('Stripe-Signature') ?? '';
  const raw = await req.text();

  // FAIL CLOSED. verify_jwt is off for this function (Stripe has no Supabase JWT),
  // so the Stripe signature is the ONLY thing standing between the public internet
  // and service-role fulfillment/subscription writes. If the secret is missing we
  // must refuse — never process an UNVERIFIED body (that would let anyone forge a
  // paid order or grant a business a premium tier for free).
  if (!WHSEC) return new Response('server misconfigured: webhook secret unset', { status: 500 });
  if (!(await verifySig(raw, sig, WHSEC))) return new Response('invalid signature', { status: 400 });

  let event: { type?: string; data?: { object?: Record<string, unknown> } };
  try { event = JSON.parse(raw); } catch { return new Response('bad json', { status: 400 }); }

  try {
    const obj = (event.data?.object ?? {}) as Record<string, unknown>;
    const meta = (obj.metadata ?? {}) as Record<string, string>;

    if (event.type === 'checkout.session.completed') {
      if (obj.mode === 'payment' && meta.purchase_kind) {
        // Marketplace (Connect) purchase.
        await fulfillMarketplace(SUPABASE_URL, SERVICE, STRIPE, obj, meta);
      } else {
        // Subscription checkout.
        const businessId = meta.business_id;
        const subId = obj.subscription as string | undefined;
        const customer = obj.customer as string | undefined;
        if (businessId && subId) {
          const sub = await stripeGet(`subscriptions/${subId}`, STRIPE);
          await applySub(SUPABASE_URL, SERVICE, businessId, customer ?? '', subId, meta.plan || planFromSub(sub), sub.status, sub.current_period_end);
        }
      }
    } else if (event.type === 'payment_intent.succeeded') {
      // On-site Payment-Element purchase (no hosted Checkout Session). Fulfill the
      // staged purchase; the guard in fulfillMarketplace skips hosted purchases that
      // also fire this event, and the 'pending'-only guard makes retries idempotent.
      if (meta.purchase_kind && meta.pending_id) {
        await fulfillMarketplace(SUPABASE_URL, SERVICE, STRIPE, obj, meta);
      }
    } else if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const sub = obj as Record<string, unknown>;
      const smeta = (sub.metadata ?? {}) as Record<string, string>;
      const businessId = smeta.business_id;
      if (businessId) {
        const status = event.type === 'customer.subscription.deleted' ? 'canceled' : (sub.status as string);
        await applySub(SUPABASE_URL, SERVICE, businessId, (sub.customer as string) ?? '', (sub.id as string) ?? '', smeta.plan || planFromSub(sub as never), status, sub.current_period_end as number);
      }
    } else if (event.type === 'account.updated') {
      // Keep the seller's Connect status fresh (charges_enabled / details_submitted).
      const acct = obj as Record<string, unknown>;
      const businessId = (acct.metadata as Record<string, string> | undefined)?.business_id;
      if (businessId) {
        await rpc(SUPABASE_URL, SERVICE, 'apply_connect_status', {
          in_business: businessId, in_account: acct.id as string,
          in_charges: !!acct.charges_enabled, in_details: !!acct.details_submitted,
        });
      }
    }
  } catch (e) {
    return new Response('handler error: ' + String(e), { status: 500 });
  }
  return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } });
});
