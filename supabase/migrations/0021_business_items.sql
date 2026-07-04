-- To'Latino — catalog items for the business dashboard's module content: menu
-- dishes, products, services and rental items all live here, discriminated by
-- `kind`. Common columns cover the shared fields; per-kind extras go in `attrs`
-- (jsonb). Public read (the listing shows them); each owner manages only their
-- own business's items. Idempotent. Apply: paste into the SQL Editor and Run.

create table if not exists public.business_items (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  kind        text not null check (kind in ('menu','product','service','rental')),
  name        text not null,
  description text,
  price       numeric,
  unit        text,                              -- e.g. 'día' for rental
  section     text,                              -- menu section / product collection
  available   boolean not null default true,
  sort        int not null default 0,
  image_url   text,
  attrs       jsonb not null default '{}',       -- kind-specific extras
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists business_items_biz_idx on public.business_items (business_id, kind, sort, created_at);

drop trigger if exists business_items_updated_at on public.business_items;
create trigger business_items_updated_at before update on public.business_items
  for each row execute function public.set_updated_at();

alter table public.business_items enable row level security;

drop policy if exists "public read business_items"  on public.business_items;
drop policy if exists "owner insert business_items" on public.business_items;
drop policy if exists "owner update business_items" on public.business_items;
drop policy if exists "owner delete business_items" on public.business_items;

create policy "public read business_items" on public.business_items
  for select using (true);
create policy "owner insert business_items" on public.business_items
  for insert with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));
create policy "owner update business_items" on public.business_items
  for update using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()))
          with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));
create policy "owner delete business_items" on public.business_items
  for delete using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));
