-- To'Latino — customer directory (Clientes → Clientes). Owner-managed, PRIVATE
-- (contact + spend data). Idempotent. Apply: paste into the SQL Editor and Run.

create table if not exists public.business_customers (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references public.businesses(id) on delete cascade,
  name          text not null,
  initials      text,
  color         text,
  phone         text,
  email         text,
  orders_count  int not null default 0,
  spend         numeric not null default 0,
  tag           text,
  notes         text,
  last_order_at timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists business_customers_biz_idx on public.business_customers (business_id, created_at desc);

alter table public.business_customers enable row level security;
drop policy if exists "owner all business_customers" on public.business_customers;
create policy "owner all business_customers" on public.business_customers
  for all using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()))
          with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));
