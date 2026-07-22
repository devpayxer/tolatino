-- 0107_freeze_paid_order_content.sql
-- The customer-update guard blocked changes to total/deposit/business_id/user_id
-- but NOT to the order's items or fulfillment — so a buyer could rewrite what they
-- ordered / where it ships on their OWN paid order via a direct PostgREST update.
-- Extend the guard to freeze the content/money columns too. Columns absent on a
-- given table compare NULL=NULL → no-op, so one guard safely covers orders,
-- bookings and rentals. RPC-driven updates (SECURITY DEFINER, current_user is the
-- definer role) still bypass this — only direct customer table writes are caught.
-- Idempotent. Apply: node scripts/sbsql.mjs --file supabase/migrations/0107_freeze_paid_order_content.sql

create or replace function public.tg_txn_customer_update_guard()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_resched boolean := false;
begin
  if current_user in ('authenticated', 'anon')
     and old.user_id = auth.uid()
     and not exists (select 1 from public.businesses b where b.id = old.business_id and b.owner_id = auth.uid())
  then
    if tg_table_name = 'business_bookings' then
      v_resched := new.status = 'pending'
        and old.status in ('pending','confirmed')
        and new.starts_at is distinct from old.starts_at
        and old.starts_at > now();
    end if;
    if new.status is distinct from old.status and new.status <> 'cancelled' and not v_resched then
      raise exception 'solo puedes cancelar tu pedido/reserva';
    end if;
    if tg_table_name = 'business_bookings' then
      if new.starts_at is distinct from old.starts_at and not v_resched and new.status <> 'cancelled' then
        raise exception 'no autorizado: usa reagendar';
      end if;
    end if;
    -- money + identity (unchanged)
    if (to_jsonb(new)->>'total')   is distinct from (to_jsonb(old)->>'total')   then raise exception 'no autorizado: no puedes cambiar el monto'; end if;
    if (to_jsonb(new)->>'deposit') is distinct from (to_jsonb(old)->>'deposit') then raise exception 'no autorizado: no puedes cambiar el depósito'; end if;
    if new.business_id is distinct from old.business_id or new.user_id is distinct from old.user_id then
      raise exception 'no autorizado';
    end if;
    -- NEW: freeze order/booking/rental CONTENT the customer must not mutate after
    -- creation (a paid order's items/where-it-ships/amount/etc.).
    if (to_jsonb(new)->>'items')        is distinct from (to_jsonb(old)->>'items')        then raise exception 'no autorizado: no puedes cambiar los artículos'; end if;
    if (to_jsonb(new)->>'fulfillment')  is distinct from (to_jsonb(old)->>'fulfillment')  then raise exception 'no autorizado: no puedes cambiar la entrega'; end if;
    if (to_jsonb(new)->>'subtotal')     is distinct from (to_jsonb(old)->>'subtotal')     then raise exception 'no autorizado'; end if;
    if (to_jsonb(new)->>'amount')       is distinct from (to_jsonb(old)->>'amount')       then raise exception 'no autorizado'; end if;
    if (to_jsonb(new)->>'party_size')   is distinct from (to_jsonb(old)->>'party_size')   then raise exception 'no autorizado'; end if;
    if (to_jsonb(new)->>'addon_ids')    is distinct from (to_jsonb(old)->>'addon_ids')    then raise exception 'no autorizado'; end if;
    if (to_jsonb(new)->>'service_id')   is distinct from (to_jsonb(old)->>'service_id')   then raise exception 'no autorizado'; end if;
    if (to_jsonb(new)->>'promo')        is distinct from (to_jsonb(old)->>'promo')        then raise exception 'no autorizado'; end if;
    if (to_jsonb(new)->>'code')         is distinct from (to_jsonb(old)->>'code')         then raise exception 'no autorizado'; end if;
    if (to_jsonb(new)->>'result')       is distinct from (to_jsonb(old)->>'result')       then raise exception 'no autorizado'; end if;
    if (to_jsonb(new)->>'payload')      is distinct from (to_jsonb(old)->>'payload')      then raise exception 'no autorizado'; end if;
  end if;
  return new;
end $function$;

notify pgrst, 'reload schema';
