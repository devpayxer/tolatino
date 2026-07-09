-- 0073_marketplace_booking_rental.sql — extend marketplace checkout (0072) to
-- Reservas (bookings) and Renta (rentals). Same Connect destination-charge model:
-- the buyer pays P + 5%, the platform keeps 15% of P, the seller receives ≈P − 10%.
-- Payment is staged in pending_purchases (kind = 'booking' | 'rental') and these
-- service-role fulfillers create the confirmed booking / rental once Stripe confirms
-- payment (fired by stripe-webhook). For bookings P = the deposit/price charged at
-- booking; for rentals P = the rental fee (the refundable security deposit is still
-- collected at pickup — see LAUNCH-CHECKLIST). Idempotent. Portable vanilla Postgres.

-- Booking fulfillment — create the paid, confirmed booking (fires trg_notify_booking).
create or replace function public.fulfill_booking(
  in_buyer uuid, in_business uuid, in_service_name text, in_service_id uuid,
  in_starts_at timestamptz, in_party_size int, in_deposit numeric
) returns table(id uuid)
language plpgsql security definer set search_path = public as $fn$
declare v_name text; v_id uuid;
begin
  select coalesce(nullif(btrim(p.display_name), ''), 'Cliente') into v_name from public.profiles p where p.id = in_buyer;
  v_id := gen_random_uuid();
  insert into public.business_bookings (id, business_id, user_id, customer_name, service_name, service_id, starts_at, party_size, deposit, status)
  values (v_id, in_business, in_buyer, coalesce(v_name, 'Cliente'), in_service_name, in_service_id, in_starts_at, in_party_size, in_deposit, 'confirmed');
  id := v_id; return next;
end $fn$;
revoke execute on function public.fulfill_booking(uuid, uuid, text, uuid, timestamptz, int, numeric) from public;
grant execute on function public.fulfill_booking(uuid, uuid, text, uuid, timestamptz, int, numeric) to service_role;

-- Rental fulfillment — create the paid, confirmed rental (fires trg_notify_rental).
create or replace function public.fulfill_rental(
  in_buyer uuid, in_business uuid, in_item_name text, in_item_id uuid,
  in_start_at timestamptz, in_end_at timestamptz, in_qty int, in_total numeric, in_deposit numeric
) returns table(id uuid)
language plpgsql security definer set search_path = public as $fn$
declare v_name text; v_id uuid;
begin
  select coalesce(nullif(btrim(p.display_name), ''), 'Cliente') into v_name from public.profiles p where p.id = in_buyer;
  v_id := gen_random_uuid();
  insert into public.business_rentals (id, business_id, user_id, customer_name, item_name, item_id, start_at, end_at, qty, total, deposit, status)
  values (v_id, in_business, in_buyer, coalesce(v_name, 'Cliente'), in_item_name, in_item_id, in_start_at, in_end_at, coalesce(in_qty, 1), in_total, in_deposit, 'confirmed');
  id := v_id; return next;
end $fn$;
revoke execute on function public.fulfill_rental(uuid, uuid, text, uuid, timestamptz, timestamptz, int, numeric, numeric) from public;
grant execute on function public.fulfill_rental(uuid, uuid, text, uuid, timestamptz, timestamptz, int, numeric, numeric) to service_role;

notify pgrst, 'reload schema';
