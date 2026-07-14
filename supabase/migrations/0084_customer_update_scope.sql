-- 0084_customer_update_scope.sql — L2 + L3 (2026-07-14 security audit). The
-- self-update policies let a customer rewrite ANY column of their own row after
-- creation. Scope each customer UPDATE to only what the app legitimately changes.
-- Idempotent. Portable vanilla Postgres.

-- ── L2 · Customers may only CANCEL their order/booking/rental (not re-price / re-target) ──
-- The app's only customer update is status → 'cancelled' (myActivity.cancel). Guard
-- with a BEFORE UPDATE trigger (SECURITY INVOKER so current_user reflects the
-- caller). Owner updates (advance status, assign driver…) are exempt via the owner
-- check. to_jsonb() lets one function serve all three tables despite different
-- money columns (business_orders.total; bookings.deposit; rentals.total+deposit).
create or replace function public.tg_txn_customer_update_guard() returns trigger
language plpgsql set search_path = public as $fn$
begin
  if current_user in ('authenticated', 'anon')
     and old.user_id = auth.uid()
     and not exists (select 1 from public.businesses b where b.id = old.business_id and b.owner_id = auth.uid())
  then
    if new.status is distinct from old.status and new.status <> 'cancelled' then
      raise exception 'solo puedes cancelar tu pedido/reserva';
    end if;
    if (to_jsonb(new)->>'total')   is distinct from (to_jsonb(old)->>'total')   then raise exception 'no autorizado: no puedes cambiar el monto'; end if;
    if (to_jsonb(new)->>'deposit') is distinct from (to_jsonb(old)->>'deposit') then raise exception 'no autorizado: no puedes cambiar el depósito'; end if;
    if new.business_id is distinct from old.business_id or new.user_id is distinct from old.user_id then
      raise exception 'no autorizado';
    end if;
  end if;
  return new;
end $fn$;

drop trigger if exists txn_customer_update_guard on public.business_orders;
create trigger txn_customer_update_guard before update on public.business_orders
  for each row execute function public.tg_txn_customer_update_guard();
drop trigger if exists txn_customer_update_guard on public.business_bookings;
create trigger txn_customer_update_guard before update on public.business_bookings
  for each row execute function public.tg_txn_customer_update_guard();
drop trigger if exists txn_customer_update_guard on public.business_rentals;
create trigger txn_customer_update_guard before update on public.business_rentals
  for each row execute function public.tg_txn_customer_update_guard();

-- ── L3 · Column-scope the read-state updates (notifications + conversations) ──
-- The client only ever flips these: notifications.read, and the per-side unread
-- counters on conversations. Column-level UPDATE grants stop a user from rewriting
-- other columns (a notification's link/data, a conversation's fields) via direct
-- PostgREST. The message-insert trigger bump_conversation() is SECURITY DEFINER
-- (runs as owner), so it is unaffected by these authenticated-role grants.
revoke update on public.notifications from authenticated, anon;
grant  update (read) on public.notifications to authenticated;

revoke update on public.business_conversations from authenticated, anon;
grant  update (unread, customer_unread) on public.business_conversations to authenticated;

notify pgrst, 'reload schema';
