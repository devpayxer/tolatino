-- 0110_refund_ctx_entity_status.sql
-- Extend refund_ctx to also return the entity's CURRENT status, so a
-- buyer-initiated refund can be restricted server-side to orders the business
-- hasn't accepted yet (prevents "order → pay → receive → self-refund" abuse). The
-- owner can still refund at any status. Idempotent.
-- Apply: node scripts/sbsql.mjs --file supabase/migrations/0110_refund_ctx_entity_status.sql

drop function if exists public.refund_ctx(text, text);
create or replace function public.refund_ctx(in_kind text, in_id text)
returns table (
  pending_id    uuid,
  intent        text,
  amount        integer,
  fee           integer,
  business_id   uuid,
  buyer_id      uuid,
  ref           text,
  status        text,
  entity_status text,
  is_owner      boolean,
  is_buyer      boolean
)
language sql stable security definer set search_path = public as $fn$
  select pp.id, pp.stripe_payment_intent, pp.amount, pp.application_fee,
         pp.business_id, pp.buyer_id, pp.ref, pp.status,
         case in_kind
           when 'order'   then (select o.status from public.business_orders o        where o.id = in_id::uuid)
           when 'booking' then (select b.status from public.business_bookings b       where b.id = in_id::uuid)
           when 'rental'  then (select r.status from public.business_rental_orders r  where r.id = in_id::uuid)
         end as entity_status,
         exists (select 1 from public.businesses b
                  where b.id = pp.business_id and b.owner_id = auth.uid()) as is_owner,
         (pp.buyer_id = auth.uid()) as is_buyer
  from public.pending_purchases pp
  where pp.kind = in_kind and pp.result->>'id' = in_id
  order by pp.created_at desc
  limit 1;
$fn$;

revoke execute on function public.refund_ctx(text, text) from public;
grant execute on function public.refund_ctx(text, text) to authenticated, service_role;

notify pgrst, 'reload schema';
