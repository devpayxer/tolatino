-- To'Latino — business updates / announcements (Clientes → Novedades): offers,
-- news and event blurbs an owner posts to their business stream. Public read (the
-- listing can show them); each owner manages only their own. Idempotent.
-- Apply: paste into the Supabase SQL Editor and Run.

create table if not exists public.business_updates (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  kind        text not null default 'news' check (kind in ('offer', 'news', 'event')),
  body_es     text not null,
  body_en     text,
  image_url   text,
  likes       int not null default 0,
  views       int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists business_updates_biz_idx on public.business_updates (business_id, created_at desc);

alter table public.business_updates enable row level security;

drop policy if exists "public read business_updates"  on public.business_updates;
drop policy if exists "owner insert business_updates" on public.business_updates;
drop policy if exists "owner update business_updates" on public.business_updates;
drop policy if exists "owner delete business_updates" on public.business_updates;

create policy "public read business_updates" on public.business_updates
  for select using (true);
create policy "owner insert business_updates" on public.business_updates
  for insert with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));
create policy "owner update business_updates" on public.business_updates
  for update using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()))
          with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));
create policy "owner delete business_updates" on public.business_updates
  for delete using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));
