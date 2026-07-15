-- 0093_store_order_notify.sql — store orders (Tienda) get their own lifecycle
-- voice. Orders whose lines are PRODUCTS carry fulfillment.kind='store' (stamped
-- by marketplace-checkout / the cash path); the notification payload now includes
-- that kind + the channel so the client copy can say "empacando tu pedido 📦" /
-- "listo para recoger 🛍️" instead of kitchen wording. Idempotent. Vanilla Postgres.

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
        jsonb_build_object('code', new.code, 'status', new.status, 'business', v_name,
                           'channel', new.channel, 'kind', new.fulfillment->>'kind'), '/cuenta');
    elsif (new.fulfillment->>'dispatch') is distinct from (old.fulfillment->>'dispatch')
          and new.fulfillment->>'dispatch' in ('assigned','picked_up','on_the_way','delivered') then
      perform public.notify_user(new.user_id, 'order_status',
        jsonb_build_object('code', new.code, 'dispatch', new.fulfillment->>'dispatch',
                           'driver', new.fulfillment->>'driver', 'business', v_name,
                           'channel', new.channel, 'kind', new.fulfillment->>'kind'), '/cuenta');
    end if;
  end if;
  return new;
end $fn$;

notify pgrst, 'reload schema';
