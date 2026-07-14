import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase browser client. URL + publishable key are public by design (RLS
 * protects the data: public read only, writes locked) and get baked into the
 * static build from NEXT_PUBLIC_* env vars.
 *
 * When unset, `supabase` is null and the data layer serves the local sample
 * fixtures — the app keeps working without a backend.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

// A stalled request must NEVER hang the UI forever. The whole dashboard gates its
// loading spinners on Supabase fetches resolving (admin.loading + each module's
// `loading`); with no timeout, a dead/slow mobile connection leaves a request
// pending and the spinner spins indefinitely. Wrap fetch with a hard timeout so a
// hung request fails fast → screens fall back to an empty/error state instead of
// spinning forever. (Realtime uses a websocket, not this fetch, so it's unaffected.)
const REQUEST_TIMEOUT_MS = 15000;
const timeoutFetch: typeof fetch = (input, init) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  // Honor a caller-provided signal too (e.g. a query's .abortSignal()).
  const caller = init?.signal;
  if (caller) {
    if (caller.aborted) controller.abort();
    else caller.addEventListener('abort', () => controller.abort(), { once: true });
  }
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
};

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string, { global: { fetch: timeoutFetch } })
  : null;
