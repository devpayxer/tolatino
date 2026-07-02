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

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string)
  : null;
