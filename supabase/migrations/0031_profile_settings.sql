-- To'Latino — user account hub (Mi cuenta): a short bio and a flexible settings
-- blob (notification prefs, etc.) on the user's profile. Profiles are self-owned;
-- the existing "update own profile" RLS covers writes. Idempotent.
-- Apply: paste into the Supabase SQL Editor and Run.

alter table public.profiles add column if not exists bio      text;
alter table public.profiles add column if not exists settings jsonb;
