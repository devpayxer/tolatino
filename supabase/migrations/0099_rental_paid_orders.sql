-- 0099 · Renta: pago EN LÍNEA del carrito (paridad con Menú/Servicios/Tienda).
-- El carrito de renta ahora puede pagarse con tarjeta dentro de nuestro
-- CheckoutSheet cuando el negocio tiene Stripe Connect (regla canónica: el CÓMO
-- se cobra se deriva de connect_charges_enabled, nunca por ítem). El comprador
-- paga la TARIFA de renta en línea; el DEPÓSITO reembolsable se sigue dejando
-- al recoger (regla canónica #4 — es garantía, no pago).
--
-- 1) businesses_rental_orders.paid — marca si la tarifa ya se pagó en línea
--    (webhook) para que el panel y Mi cuenta muestren "Pagada" vs "Paga al
--    recoger".
-- 2) fulfill_rental_order v2 — igual que 0097 pero marca paid=true y avisa al
--    dueño con paid en el payload. Solo service_role (webhook) puede llamarla;
--    una orden pagada nace 'confirmed' por definición.
-- Idempotente. Vanilla Postgres — portable a self-hosted.

alter table public.business_rental_orders
  add column if not exists paid boolean not null default false;

create or replace function public.fulfill_rental_order(
  in_buyer uuid, in_business uuid, in_start_at timestamptz, in_end_at timestamptz,
  in_lines jsonb, in_extras jsonb, in_fee numeric, in_deposit numeric
) returns uuid
language plpgsql security definer set search_path = public as $fn$
declare v_name text; v_order uuid; ln jsonb;
begin
  select coalesce(nullif(btrim(display_name), ''), 'Cliente') into v_name
    from public.profiles where id = in_buyer;
  insert into public.business_rental_orders
    (business_id, user_id, customer_name, start_at, end_at, status, fee_total, deposit_total, extras, paid)
  values (in_business, in_buyer, coalesce(v_name,'Cliente'), in_start_at, in_end_at, 'confirmed',
          in_fee, in_deposit, nullif(in_extras, '[]'::jsonb), true)
  returning id into v_order;
  for ln in select * from jsonb_array_elements(in_lines) loop
    insert into public.business_rentals
      (order_id, business_id, user_id, customer_name, item_name, item_id, start_at, end_at, qty, total, deposit, status)
    values (v_order, in_business, in_buyer, coalesce(v_name,'Cliente'),
            coalesce(ln->>'item_name','Artículo'), nullif(ln->>'item_id','')::uuid,
            in_start_at, in_end_at, greatest(coalesce((ln->>'qty')::int,1),1),
            greatest(coalesce((ln->>'fee')::numeric,0),0),
            greatest(coalesce((ln->>'deposit')::numeric,0),0), 'confirmed');
  end loop;
  perform public.notify_user(
    (select owner_id from public.businesses where id = in_business), 'rental_new',
    jsonb_build_object('item', coalesce(in_lines->0->>'item_name','Renta'),
                       'name', coalesce(v_name,'Cliente'), 'count', jsonb_array_length(in_lines),
                       'status', 'confirmed', 'paid', true), '/negocio');
  return v_order;
end $fn$;
revoke all on function public.fulfill_rental_order(uuid, uuid, timestamptz, timestamptz, jsonb, jsonb, numeric, numeric) from public, anon, authenticated;
grant execute on function public.fulfill_rental_order(uuid, uuid, timestamptz, timestamptz, jsonb, jsonb, numeric, numeric) to service_role;
