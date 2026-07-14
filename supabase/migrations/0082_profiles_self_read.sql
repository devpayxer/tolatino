-- 0082_profiles_self_read.sql — M3 (2026-07-14 security audit). The profiles table
-- had a PUBLIC read policy (using(true)), so anyone with the anon key could read
-- every user's lat/lng/location (home coordinates) — a privacy leak Nextdoor-class
-- apps avoid. Nothing legitimately needs OTHER users' profiles:
--   · post author display is DENORMALIZED on posts (author_name/initials/color),
--   · every profile-reading DB function is SECURITY DEFINER (bypasses RLS),
--   · the client only ever reads its OWN profile (select … eq('id', <self>)).
-- So restrict SELECT to the owner's own row. INSERT/UPDATE own policies stay.
-- Idempotent. If a "view a neighbor's public profile" feature is added later,
-- expose only display fields via a SECURITY DEFINER RPC — never re-open the table.
drop policy if exists "public read profiles" on public.profiles;
drop policy if exists "self read profiles"   on public.profiles;
create policy "self read profiles" on public.profiles
  for select using (id = auth.uid());

notify pgrst, 'reload schema';
