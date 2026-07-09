-- 0074_delivery_checkout.sql — DoorDash-grade paid delivery/pickup orders.
--  · fulfill_order gains a `fulfillment` jsonb (address, instructions, tip,
--    delivery_fee, service_fee, subtotal, paid_total, dispatch) so a paid order
--    lands with its full receipt + dispatch state.
--  · tg_notify_order v2: the CLIENT is also notified when the dispatch state
--    changes (driver assigned / en camino / entregado), not just on status —
--    with the business name so the notification reads like DoorDash's.
-- Idempotent. Portable vanilla Postgres.

-- Client + owner notifications across the whole order lifecycle.
create or replace function public.tg_notify_order()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare v_owner uuid; v_name text;
begin
  select owner_id, name into v_owner, v_name from public.businesses where id = new.business_id;
  if tg_op = 'INSERT' then
    perform public.notify_user(v_owner, 'order_new',
      jsonb_build_object('code', new.code, 'total', new.total, 'channel', new.channel), '/negocio');
  elsif tg_op = 'UPDATE' then
    if new.status is distinct from old.status then
      perform public.notify_user(new.user_id, 'order_status',
        jsonb_build_object('code', new.code, 'status', new.status, 'business', v_name), '/cuenta');
    elsif (new.fulfillment->>'dispatch') is distinct from (old.fulfillment->>'dispatch')
          and new.fulfillment->>'dispatch' in ('assigned','picked_up','on_the_way','delivered') then
      perform public.notify_user(new.user_id, 'order_status',
        jsonb_build_object('code', new.code, 'dispatch', new.fulfillment->>'dispatch',
                           'driver', new.fulfillment->>'driver', 'business', v_name), '/cuenta');
    end if;
  end if;
  return new;
end $fn$;

-- Paid-order fulfiller v2: carries the receipt + delivery details.
drop function if exists public.fulfill_order(uuid, uuid, jsonb, numeric, text);
create function public.fulfill_order(
  in_buyer uuid, in_business uuid, in_items jsonb, in_total numeric, in_channel text,
  in_fulfillment jsonb default null
) returns table(id uuid, code text)
language plpgsql security definer set search_path = public as $fn$
declare v_name text; v_id uuid; v_code text;
begin
  select coalesce(nullif(btrim(p.display_name), ''), 'Cliente') into v_name from public.profiles p where p.id = in_buyer;
  v_id := gen_random_uuid();
  v_code := 'TL-' || upper(substr(replace(v_id::text, '-', ''), 1, 6));
  insert into public.business_orders (id, business_id, user_id, customer_name, items, total, channel, status, code, fulfillment)
  values (v_id, in_business, in_buyer, coalesce(v_name, 'Cliente'), coalesce(in_items, '[]'::jsonb),
          in_total, coalesce(in_channel, 'pickup'), 'new', v_code, coalesce(in_fulfillment, '{}'::jsonb));
  id := v_id; code := v_code; return next;
end $fn$;
revoke execute on function public.fulfill_order(uuid, uuid, jsonb, numeric, text, jsonb) from public;
grant execute on function public.fulfill_order(uuid, uuid, jsonb, numeric, text, jsonb) to service_role;

notify pgrst, 'reload schema';
