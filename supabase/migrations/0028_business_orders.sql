-- To'Latino — orders (Clientes → Pedidos). Owner-managed, PRIVATE. Line items in
-- a jsonb array. Idempotent. Apply: paste into the Supabase SQL Editor and Run.

create table if not exists public.business_orders (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references public.businesses(id) on delete cascade,
  code          text,
  customer_name text,
  items         jsonb not null default '[]',   -- [{name, qty, price}]
  total         numeric,
  channel       text check (channel in ('dinein', 'pickup', 'delivery')),
  status        text not null default 'new' check (status in ('new', 'preparing', 'ready', 'completed', 'cancelled')),
  created_at    timestamptz not null default now()
);
create index if not exists business_orders_biz_idx on public.business_orders (business_id, created_at desc);

alter table public.business_orders enable row level security;
drop policy if exists "owner all business_orders" on public.business_orders;
create policy "owner all business_orders" on public.business_orders
  for all using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()))
          with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));
