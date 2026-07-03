-- To'Latino — follow graph. A user follows another; the "Siguiendo" feed shows
-- posts by the people you follow, and the profile shows Following/Followers.
-- Counts are public (follow relationships aren't secret); only the owner can
-- add/remove their own follow rows. Idempotent.
-- Apply: paste into the Supabase SQL Editor and Run.

create table if not exists public.follows (
  follower_id  uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
create index if not exists follows_following_idx on public.follows (following_id);

alter table public.follows enable row level security;
drop policy if exists "public read follows" on public.follows;
drop policy if exists "follow as self"      on public.follows;
drop policy if exists "unfollow as self"    on public.follows;
create policy "public read follows" on public.follows for select using (true);
create policy "follow as self"   on public.follows for insert to authenticated with check (auth.uid() = follower_id);
create policy "unfollow as self" on public.follows for delete to authenticated using (auth.uid() = follower_id);
