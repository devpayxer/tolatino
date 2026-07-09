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
