-- To'Latino — persist "saved" businesses (the ♥ on a business card / detail) so
-- a signed-in user finds them in their Guardados list on any device. Guests keep
-- their saves in localStorage; signed-in users sync here. Keyed by business slug
-- (stable, unique) so no id→slug resolution is needed on the client. RLS: a user
-- reads/writes only their own rows. Idempotent.
-- Apply: paste into the Supabase SQL Editor and Run.

create table if not exists public.saved_businesses (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  business_slug text not null,
  created_at    timestamptz not null default now(),
  unique (user_id, business_slug)
);

-- Fast "my saved businesses, newest first".
create index if not exists saved_businesses_user_idx on public.saved_businesses (user_id, created_at desc);

alter table public.saved_businesses enable row level security;

drop policy if exists "read own saved businesses"   on public.saved_businesses;
drop policy if exists "insert own saved businesses" on public.saved_businesses;
drop policy if exists "delete own saved businesses" on public.saved_businesses;

create policy "read own saved businesses" on public.saved_businesses
  for select using (auth.uid() = user_id);
create policy "insert own saved businesses" on public.saved_businesses
  for insert with check (auth.uid() = user_id);
create policy "delete own saved businesses" on public.saved_businesses
  for delete using (auth.uid() = user_id);
