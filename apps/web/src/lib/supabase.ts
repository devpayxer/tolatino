import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase browser client. The URL + anon key are public by design (RLS
 * protects the data) and are baked into the static build from env vars
 * (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY).
 *
 * When the env vars aren't set, `supabase` is null and the data layer falls
 * back to local sample data — so the app keeps working before Supabase is wired.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string)
  : null;
