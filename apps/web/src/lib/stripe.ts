import { supabase } from '@/lib/supabase';

// Client helpers for the Stripe Edge Functions. Checkout + portal run server-side
// (secret key never touches the browser); these just fetch the hosted URL to
// redirect to. The user's Supabase session JWT is attached automatically by
// supabase.functions.invoke → the function verifies ownership before charging.

const origin = () => (typeof window !== 'undefined' ? window.location.origin : undefined);

/** Start a subscription Checkout for a business plan. Returns the Stripe URL. */
export async function startCheckout(plan: 'verified' | 'premium', businessId: string): Promise<{ url?: string; error?: string }> {
  if (!supabase) return { error: 'offline' };
  const { data, error } = await supabase.functions.invoke('stripe-checkout', { body: { plan, businessId, origin: origin() } });
  if (error) return { error: error.message };
  if (data?.url) return { url: data.url as string };
  return { error: (data?.error as string) || 'checkout failed' };
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
  | { kind: 'ticket'; slug: string; items: TicketLine[] }
  // subtotal is display-only; the server RE-PRICES the deposit/fee from DB using
  // service_id/item_id + these structured inputs (party_size / mode+hours+units)
  // + addon_ids. The client's subtotal is never trusted.
  | { kind: 'booking'; slug: string; subtotal: number; payload: BookingPayload; party_size?: number; addon_ids?: string[] }
  | { kind: 'rental'; slug: string; subtotal: number; payload: RentalPayload; mode?: 'hour' | 'day'; hours?: number; units?: number; addon_ids?: string[] };

/**
 * Start a real marketplace Checkout for a consumer purchase (order / tickets).
 * The buyer is charged P + 5%, the seller's connected account receives ≈P − 10%,
 * and To'Latino keeps 15% of P — all computed server-side from authoritative
 * prices. The order/tickets are only created once payment succeeds (webhook).
 * Returns the Stripe hosted URL to redirect to. `returnPath` is where Stripe
 * sends the buyer back (defaults to the current page).
 */
export async function startMarketplaceCheckout(input: MarketplaceInput, returnPath?: string): Promise<{ url?: string; error?: string }> {
  if (!supabase) return { error: 'offline' };
  const path = returnPath ?? (typeof window !== 'undefined' ? window.location.pathname : '/');
  const { data, error } = await supabase.functions.invoke('marketplace-checkout', { body: { ...input, origin: origin(), returnPath: path } });
  if (error) return { error: error.message };
  if (data?.url) return { url: data.url as string };
  return { error: (data?.error as string) || 'checkout failed' };
}
