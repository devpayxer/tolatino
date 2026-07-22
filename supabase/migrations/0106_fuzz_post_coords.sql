-- 0106_fuzz_post_coords.sql
-- Community posts stored the author's EXACT coordinates (lat/lng ≈ 11m, i.e. their
-- saved home address when set) and posts are world-readable — a doxxing/safety
-- risk for a neighbors' network. Round every post's coordinates to ~hood level
-- (2 decimals ≈ 1.1 km) on every write, and backfill existing rows. The 30-mile
-- hyperlocal feed and the client radius check keep working; the exact location
-- never leaves the client. Idempotent.
-- Apply: node scripts/sbsql.mjs --file supabase/migrations/0106_fuzz_post_coords.sql

create or replace function public.tg_fuzz_post_coords() returns trigger
language plpgsql as $$
begin
  if new.lat is not null then new.lat := round(new.lat::numeric, 2); end if;
  if new.lng is not null then new.lng := round(new.lng::numeric, 2); end if;
  return new;
end $$;

drop trigger if exists fuzz_post_coords on public.posts;
create trigger fuzz_post_coords
  before insert or update of lat, lng on public.posts
  for each row execute function public.tg_fuzz_post_coords();

-- Backfill existing rows to the fuzzed precision (location recomputes from lat/lng).
update public.posts
   set lat = round(lat::numeric, 2), lng = round(lng::numeric, 2)
 where lat is not null or lng is not null;
