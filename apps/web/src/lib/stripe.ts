import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { supabase } from '@/lib/supabase';

// Client helpers for the Stripe Edge Functions. Checkout + portal run server-side
// (secret key never touches the browser); these just fetch the hosted URL to
// redirect to. The user's Supabase session JWT is attached automatically by
// supabase.functions.invoke → the function verifies ownership before charging.

const origin = () => (typeof window !== 'undefined' ? window.location.origin : undefined);

// Stripe.js singleton (publishable key is public by design). Used by the on-site
// Payment Element checkout. Resolves to null if the key isn't configured.
let stripeJs: Promise<Stripe | null> | null = null;
export function getStripe(): Promise<Stripe | null> {
  if (!stripeJs) {
    const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    stripeJs = pk ? loadStripe(pk) : Promise.resolve(null);
  }
  return stripeJs;
}

/**
 * Suscribir un negocio a Verified COBRANDO DENTRO DE NUESTRA HOJA.
 *
 * Devuelve el `clientSecret` de la primera factura para montarlo en
 * `CheckoutSheet` (Payment Element) — nunca una URL de Stripe. Es la regla
 * «checkout propio SIEMPRE» del fundador: Stripe pinta los campos de tarjeta
 * dentro de iframes seguros (el PCI sigue mínimo), pero la marca y el flujo son
 * de To'Latino.
 *
 * El tier NO se otorga aquí: lo pone el webhook cuando Stripe confirma el cobro.
 * `alreadyActive` avisa de que el negocio ya paga, para no cobrarle dos veces.
 */
export async function startSubscription(
  plan: 'verified', businessId: string,
): Promise<{ clientSecret?: string; amount?: number; alreadyActive?: boolean; error?: string }> {
  if (!supabase) return { error: 'offline' };
  const { data, error } = await supabase.functions.invoke('stripe-subscribe', { body: { plan, businessId } });
  if (data?.clientSecret) return { clientSecret: data.clientSecret as string, amount: data.amount as number };
  if (data?.alreadyActive) return { alreadyActive: true };
  return { error: (data?.error as string) || error?.message || 'subscribe failed' };
}

/** Start a subscription Checkout for a business plan. Returns the Stripe URL. */
export async function startCheckout(plan: 'verified' | 'premium', businessId: string): Promise<{ url?: string; error?: string }> {
  if (!supabase) return { error: 'offline' };
  const { data, error } = await supabase.functions.invoke('stripe-checkout', { body: { plan, businessId, origin: origin() } });
  if (error) return { error: error.message };
  if (data?.url) return { url: data.url as string };
  return { error: (data?.error as string) || 'checkout failed' };
}

/** Owner releases (return) or captures (damage) a rental's real deposit hold
 *  (0101). amount is dollars, only for 'capture'. Returns the new deposit_status. */
export async function rentalDeposit(
  order: string, action: 'release' | 'capture', amount?: number,
): Promise<{ ok?: boolean; deposit_status?: string; captured?: number; error?: string }> {
  if (!supabase) return { error: 'offline' };
  const { data, error } = await supabase.functions.invoke('rental-deposit', { body: { order, action, ...(amount != null ? { amount } : {}) } });
  if (error) return { error: error.message };
  if (data?.ok) return { ok: true, deposit_status: data.deposit_status as string, captured: data.captured as number };
  return { error: (data?.error as string) || 'deposit action failed' };
}

/** Refund a PAID order/booking/rental when it's cancelled or rejected (0109 +
 *  refund-purchase fn). The server checks the caller is the owner or the buyer and
 *  finds the payment; a cash/unpaid purchase returns refunded:false with no error,
 *  so it's safe to call on every cancel. */
export async function refundPurchase(
  kind: 'order' | 'booking' | 'rental', id: string,
): Promise<{ ok?: boolean; refunded?: boolean; amount?: number; error?: string }> {
  if (!supabase) return { error: 'offline' };
  const { data, error } = await supabase.functions.invoke('refund-purchase', { body: { kind, id } });
  if (error) return { error: error.message };
  if (data?.ok) return { ok: true, refunded: !!data.refunded, amount: data.amount as number };
  return { error: (data?.error as string) || 'refund failed' };
}

/** Open the Stripe Billing Portal (update card / invoices / cancel). Returns the URL. */
export async function openBillingPortal(businessId: string): Promise<{ url?: string; error?: string }> {
  if (!supabase) return { error: 'offline' };
  const { data, error } = await supabase.functions.invoke('stripe-portal', { body: { businessId, origin: origin() } });
  if (error) return { error: error.message };
  if (data?.url) return { url: data.url as string };
  return { error: (data?.error as string) || 'portal failed' };
}

// ---- Connect (marketplace payouts) ----------------------------------------

export type ConnectStatus = { connected: boolean; charges_enabled: boolean; details_submitted: boolean };

/** Start Connect Express onboarding for a business. Returns the hosted URL. */
export async function startConnectOnboarding(businessId: string): Promise<{ url?: string; error?: string }> {
  if (!supabase) return { error: 'offline' };
  const { data, error } = await supabase.functions.invoke('connect-onboard', { body: { businessId, origin: origin() } });
  if (error) return { error: error.message };
  if (data?.url) return { url: data.url as string };
  return { error: (data?.error as string) || 'onboarding failed' };
}

/** Read + sync the business's Connect account status. */
export async function getConnectStatus(businessId: string): Promise<ConnectStatus & { error?: string }> {
  const empty = { connected: false, charges_enabled: false, details_submitted: false };
  if (!supabase) return { ...empty, error: 'offline' };
  const { data, error } = await supabase.functions.invoke('connect-status', { body: { businessId } });
  if (error) return { ...empty, error: error.message };
  return {
    connected: !!data?.connected,
    charges_enabled: !!data?.charges_enabled,
    details_submitted: !!data?.details_submitted,
    error: (data?.error as string) || undefined,
  };
}

// ---- Marketplace checkout (buyer pays the seller via Connect) ---------------

export type MarketplaceKind = 'order' | 'ticket' | 'booking' | 'rental';
// id + sel let the server re-price the line from DB prices (never trust `price`).
type OrderLine = { id?: string; sel?: { g: string; o: number }[]; name: string; qty: number; price: number; opts?: string };
type TicketLine = { tierId: string; qty: number };
type BookingPayload = { service_name: string; service_id: string | null; starts_at: string; party_size: number | null; deposit: number | null };
type RentalPayload = { item_name: string; item_id: string | null; start_at: string; end_at: string | null; qty: number; total: number; deposit: number | null };
export type MarketplaceInput =
  | {
      kind: 'order'; slug: string; items: OrderLine[];
      /** 'delivery' requires `address`; delivery fee + minimum are enforced server-side from the business's config. */
      channel?: 'pickup' | 'delivery';
      address?: { formatted: string; label?: string };
      instructions?: string;
      /** Tip in dollars — passes through 100% to the seller. */
      tip?: number;
    }
  // `promo` is the event promo code; the server re-validates it and re-computes
  // the discount from event_promo_codes (the client value is never trusted).
  // `seats` are the picked seat/table ids (e.g. ['A1','A2'] or ['T3']); the server
  // fail-fasts on already-claimed seats and the webhook claims them at issuance.
  // `addonIds` are the chosen OPTIONAL package ids; the server always adds
  // required packages and re-prices everything from events.addons (0115).
  | { kind: 'ticket'; slug: string; items: TicketLine[]; promo?: string; seats?: string[]; addonIds?: string[] }
  // subtotal is display-only; the server RE-PRICES the deposit/fee from DB using
  // service_id/item_id + these structured inputs (party_size / mode+hours+units)
  // + addon_ids. The client's subtotal is never trusted.
  | {
      kind: 'booking'; slug: string; subtotal: number; payload: BookingPayload; party_size?: number; addon_ids?: string[];
      /** Index into the service's own attrs.variants.options — the server re-prices the delta from DB. */
      variant_i?: number;
      /** Provider id from the business's service_config.providers (omit / 'any' = no assignment). */
      staff_id?: string;
      /** Free-text note to the professional (clipped server-side). */
      note?: string;
    }
  | { kind: 'rental'; slug: string; subtotal: number; payload: RentalPayload; mode?: 'hour' | 'day'; hours?: number; units?: number; addon_ids?: string[] }
  // Rental CART (order, 0097/0099): several items over ONE shared date range.
  // The server re-prices every line (day/week rate × re-derived span × qty) and
  // the order-level extras by id; the client's subtotal is display-only. The fee
  // is paid online; the refundable deposit is still collected at pickup.
  | {
      kind: 'rental'; slug: string; subtotal: number;
      lines: { item_id: string; qty: number }[];
      payload: { start_at: string; end_at: string | null };
      addon_ids?: string[];
      promo?: string;
    };

/**
 * Payment-grade caller for the marketplace-checkout function. functions.invoke()
 * was the wrong tool here — it hid the function's 4xx reason (everything looked
 * like a generic failure), rode the app's global 15s fetch timeout (aborted on
 * slow mobile networks / cold starts), and reused a possibly-EXPIRED access
 * token after the phone had the tab asleep — the "sometimes payment won't start"
 * bug. This: refreshes the session first, uses its own 30s timeout, retries ONCE
 * on transient failures (network / timeout / 5xx — never on a 4xx verdict), and
 * surfaces the function's real `error` key so the UI can say what happened.
 */
async function callMarketplace(body: Record<string, unknown>): Promise<{ data: Record<string, unknown> | null; error?: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabase || !url || !anon) return { data: null, error: 'offline' };
  const { data: sess } = await supabase.auth.getSession(); // refreshes if expired
  const token = sess.session?.access_token;
  if (!token) return { data: null, error: 'auth' };
  const attempt = async (): Promise<{ ok: boolean; status: number; data: Record<string, unknown> | null }> => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 30000);
    try {
      const res = await fetch(`${url}/functions/v1/marketplace-checkout`, {
        method: 'POST',
        headers: { apikey: anon, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      let j: Record<string, unknown> | null = null;
      try { j = (await res.json()) as Record<string, unknown>; } catch { j = null; }
      return { ok: res.ok, status: res.status, data: j };
    } catch {
      return { ok: false, status: 0, data: null }; // network error / timeout
    } finally {
      clearTimeout(t);
    }
  };
  let r = await attempt();
  if (!r.ok && (r.status === 0 || r.status >= 500)) {
    await new Promise((res) => setTimeout(res, 1200));
    r = await attempt();
  }
  if (r.ok) return { data: r.data };
  return { data: r.data, error: (r.data?.error as string) || (r.status === 0 ? 'network' : `http_${r.status}`) };
}

/**
 * Start a real marketplace Checkout for a consumer purchase (order / tickets).
 * The buyer is charged P + 5%, the seller's connected account receives ≈P − 10%,
 * and To'Latino keeps 15% of P — all computed server-side from authoritative
 * prices. The order/tickets are only created once payment succeeds (webhook).
 * Returns the Stripe hosted URL to redirect to. `returnPath` is where Stripe
 * sends the buyer back (defaults to the current page).
 */
export async function startMarketplaceCheckout(input: MarketplaceInput, returnPath?: string): Promise<{ url?: string; error?: string }> {
  const path = returnPath ?? (typeof window !== 'undefined' ? window.location.pathname : '/');
  const { data, error } = await callMarketplace({ ...input, origin: origin(), returnPath: path });
  if (data?.url) return { url: data.url as string };
  return { error: error || 'checkout failed' };
}

/**
 * Start an ON-SITE marketplace payment (Stripe Payment Element). Same authoritative
 * re-pricing + Connect economics as startMarketplaceCheckout, but returns a
 * PaymentIntent `clientSecret` so the buyer pays INSIDE our own branded checkout
 * (no redirect to Stripe's hosted page). The order/tickets are still created only
 * once payment succeeds (webhook → payment_intent.succeeded).
 */
/**
 * Pedido «pago en el establecimiento». Va por la MISMA función que el pago con
 * tarjeta para que el precio lo calcule el servidor desde el catálogo del
 * negocio. Antes el navegador insertaba la fila con el total que él quisiera:
 * un comprador podía pedir 3 platos de $45 y dejarlos registrados en $0,01
 * (comprobado con un ataque real el 2026-08-04).
 */
export async function placeCashOrder(
  input: Extract<MarketplaceInput, { kind: 'order' }>,
): Promise<{ orderId?: string; code?: string; error?: string }> {
  const { data, error } = await callMarketplace({ ...input, cod: true, origin: origin() });
  if (data?.code) return { orderId: (data.orderId as string) ?? undefined, code: data.code as string };
  return { error: error || 'could_not_place' };
}

export async function startMarketplacePayment(
  input: MarketplaceInput,
): Promise<{ clientSecret?: string; pendingId?: string; amount?: number; error?: string }> {
  const { data, error } = await callMarketplace({ ...input, intent: true, origin: origin() });
  if (data?.clientSecret) return { clientSecret: data.clientSecret as string, pendingId: data.pendingId as string, amount: data.amount as number };
  return { error: error || 'payment failed' };
}
