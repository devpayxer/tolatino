-- To'Latino — rental availability truth (no double-booking). Tie each rental
-- request to a specific rental item, and expose ONLY the busy date-ranges (no
-- customer info) so the public Rentar calendar can grey out days that are already
-- booked to capacity. business_rentals RLS stays locked (customer/owner only);
-- the public read goes through a SECURITY DEFINER function that returns just
-- dates + quantities. Idempotent. Apply: paste into the Supabase SQL Editor + Run.

-- 1) link a rental request to the exact item (nullable for back-compat).
alter table public.business_rentals
  add column if not exists item_id uuid references public.business_items(id) on delete set null;
create index if not exists business_rentals_item_idx
  on public.business_rentals (item_id, start_at);

-- 2) public availability: busy date-ranges for one item (active statuses only),
--    exposing NO customer data — just the span + how many units are taken.
create or replace function public.rental_busy_by_item(in_item_id uuid)
returns table (starts date, ends date, qty int)
language sql
stable
security definer
set search_path = public
as $$
  select
    (start_at)::date,
    coalesce((end_at)::date, (start_at)::date),
    qty
  from public.business_rentals
  where item_id = in_item_id
    and status in ('pending', 'confirmed', 'out');
$$;

grant execute on function public.rental_busy_by_item(uuid) to anon, authenticated;

notify pgrst, 'reload schema';
