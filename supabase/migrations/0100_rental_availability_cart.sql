-- 0100 · Renta: disponibilidad real anti-doble-reserva para el CARRITO.
-- The cart lets a customer rent several items over one date range. To never
-- over-sell the owner's inventory we need (a) a public, privacy-safe busy feed
-- for ALL of a business's items in one call, and (b) a SERVER-SIDE guard that
-- re-checks availability inside create_rental_order so two people paying/booking
-- at once can't both take the last unit.
--
-- Availability truth: an item of stock N is available at qty Q over [s,e] iff the
-- PEAK concurrent booked qty over any day in [s,e] is ≤ N − Q (active orders only:
-- pending/confirmed/out; returned/cancelled release the unit). We compute the peak
-- precisely (max over candidate boundary days), not a loose sum.
-- Idempotent. Vanilla Postgres — portable to self-hosted.

-- 1) Public busy feed for a whole business (no customer data — item + span + qty).
create or replace function public.rental_busy_by_slug(in_slug text)
returns table (item_id uuid, starts date, ends date, qty int)
language sql stable security definer set search_path = public as $$
  select r.item_id, r.start_at::date, coalesce(r.end_at::date, r.start_at::date), r.qty
  from public.business_rentals r
  join public.businesses b on b.id = r.business_id
  where b.slug = in_slug
    and r.status in ('pending', 'confirmed', 'out')
    and r.item_id is not null;
$$;
grant execute on function public.rental_busy_by_slug(text) to anon, authenticated;

-- 2) Peak concurrent booked qty for one item over [in_start, in_end], counting
--    ONLY active orders. Optionally exclude one order (so an edit doesn't fight
--    itself). The peak is reached on a candidate boundary day: the range start or
--    any active line's start clamped into the range.
create or replace function public.rental_peak_booked(
  in_item uuid, in_start timestamptz, in_end timestamptz, in_exclude_order uuid default null
) returns int
language sql stable security definer set search_path = public as $$
  with lines as (
    select start_at::date as s, coalesce(end_at::date, start_at::date) as e, qty
    from public.business_rentals
    where item_id = in_item
      and status in ('pending', 'confirmed', 'out')
      and (in_exclude_order is null or order_id is distinct from in_exclude_order)
      and start_at::date <= coalesce(in_end, in_start)::date
      and coalesce(end_at::date, start_at::date) >= in_start::date
  ),
  cands as (
    select in_start::date as d
    union
    select greatest(s, in_start::date) from lines
  )
  select coalesce(max((
    select coalesce(sum(l.qty), 0) from lines l where cd.d between l.s and l.e
  )), 0)::int
  from cands cd;
$$;
grant execute on function public.rental_peak_booked(uuid, timestamptz, timestamptz, uuid) to anon, authenticated;

-- 3) Guard create_rental_order: reject if any line would exceed the item's stock
--    for the requested dates. Runs inside the same statement as the insert, so it
--    is race-safe against concurrent orders. stock 0/null = unlimited (skip).
create or replace function public.create_rental_order(
  in_slug text,
  in_start_at timestamptz,
  in_end_at timestamptz,
  in_lines jsonb,
  in_extras jsonb default '[]'::jsonb,
  in_notes text default null
) returns uuid
language plpgsql security definer set search_path = public as $fn$
declare
  v_biz uuid; v_owner uuid; v_auto boolean; v_name text;
  v_fee numeric := 0; v_dep numeric := 0; v_extra numeric := 0;
  v_status text; v_order uuid; ln jsonb;
  v_item uuid; v_qty int; v_stock int; v_peak int; v_iname text;
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  if in_lines is null or jsonb_array_length(in_lines) = 0 then raise exception 'empty cart'; end if;
  select id, owner_id, (rental_config->>'autoConfirm')::boolean
    into v_biz, v_owner, v_auto
    from public.businesses where slug = in_slug limit 1;
  if v_biz is null then raise exception 'business not found'; end if;

  -- Availability guard: no line may exceed the item's stock for these dates.
  for ln in select * from jsonb_array_elements(in_lines) loop
    v_item := nullif(ln->>'item_id', '')::uuid;
    v_qty  := greatest(coalesce((ln->>'qty')::int, 1), 1);
    if v_item is not null then
      select coalesce((attrs->>'stock')::int, 0) into v_stock
        from public.business_items where id = v_item and business_id = v_biz;
      if coalesce(v_stock, 0) > 0 then
        v_peak := public.rental_peak_booked(v_item, in_start_at, in_end_at, null);
        if v_peak + v_qty > v_stock then
          v_iname := coalesce(ln->>'item_name', 'Artículo');
          raise exception 'overbooked:%', v_iname using errcode = 'check_violation';
        end if;
      end if;
    end if;
  end loop;

  select coalesce(sum(greatest((l->>'fee')::numeric, 0)), 0),
         coalesce(sum(greatest((l->>'deposit')::numeric, 0)), 0)
    into v_fee, v_dep
    from jsonb_array_elements(in_lines) l;
  select coalesce(sum(greatest((e->>'price')::numeric, 0)), 0) into v_extra
    from jsonb_array_elements(coalesce(in_extras, '[]')) e;
  v_fee := least(v_fee + v_extra, 1000000);
  v_dep := least(v_dep, 1000000);

  select coalesce(nullif(btrim(display_name), ''), 'Cliente') into v_name
    from public.profiles where id = auth.uid();
  v_name := coalesce(v_name, 'Cliente');

  -- status from the business's approval mode, for EVERY caller (owner included).
  v_status := case when coalesce(v_auto, false) then 'confirmed' else 'pending' end;

  insert into public.business_rental_orders
    (business_id, user_id, customer_name, start_at, end_at, status, fee_total, deposit_total, extras, notes)
  values (v_biz, auth.uid(), v_name, in_start_at, in_end_at, v_status, v_fee, v_dep,
          nullif(in_extras, '[]'::jsonb), nullif(btrim(in_notes), ''))
  returning id into v_order;

  for ln in select * from jsonb_array_elements(in_lines) loop
    insert into public.business_rentals
      (order_id, business_id, user_id, customer_name, item_name, item_id, start_at, end_at, qty, total, deposit, status)
    values (v_order, v_biz, auth.uid(), v_name,
            coalesce(ln->>'item_name', 'Artículo'),
            nullif(ln->>'item_id','')::uuid,
            in_start_at, in_end_at,
            greatest(coalesce((ln->>'qty')::int, 1), 1),
            greatest(coalesce((ln->>'fee')::numeric, 0), 0),
            greatest(coalesce((ln->>'deposit')::numeric, 0), 0),
            v_status);
  end loop;

  if v_owner is not null then
    perform public.notify_user(v_owner, 'rental_new',
      jsonb_build_object('item', coalesce(in_lines->0->>'item_name', 'Renta'),
                         'name', v_name, 'count', jsonb_array_length(in_lines),
                         'status', v_status), '/negocio');
  end if;
  return v_order;
end $fn$;

notify pgrst, 'reload schema';
