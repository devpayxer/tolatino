-- 0109_refund_ctx.sql
-- Refund context for the `refund-purchase` edge function. Given a purchase
-- (kind + the ORDER/BOOKING/RENTAL id), returns the payment record and whether the
-- CALLER is the business owner or the buyer — evaluated under the caller's JWT
-- (auth.uid()), so the edge function can authorize a refund without trusting the
-- client. The payment row is found by pending_purchases.result->>'id' (the
-- fulfilled entity id; `ref` is only the business slug). SECURITY DEFINER only to
-- read pending_purchases (locked to service_role); ownership/buyer come from
-- auth.uid(). Idempotent.
-- Apply: node scripts/sbsql.mjs --file supabase/migrations/0109_refund_ctx.sql

drop function if exists public.refund_ctx(text, text);
create or replace function public.refund_ctx(in_kind text, in_id text)
returns table (
  pending_id  uuid,
  intent      text,
  amount      integer,
  fee         integer,
  business_id uuid,
  buyer_id    uuid,
  ref         text,
  status      text,
  is_owner    boolean,
  is_buyer    boolean
)
language sql stable security definer set search_path = public as $fn$
  select pp.id, pp.stripe_payment_intent, pp.amount, pp.application_fee,
         pp.business_id, pp.buyer_id, pp.ref, pp.status,
         exists (select 1 from public.businesses b
                  where b.id = pp.business_id and b.owner_id = auth.uid()) as is_owner,
         (pp.buyer_id = auth.uid()) as is_buyer
  from public.pending_purchases pp
  where pp.kind = in_kind
    and pp.result->>'id' = in_id
  order by pp.created_at desc
  limit 1;
$fn$;

-- Drop the earlier (slug-based) 2-arg signature if it lingers, then re-grant.
revoke execute on function public.refund_ctx(text, text) from public;
grant execute on function public.refund_ctx(text, text) to authenticated, service_role;

notify pgrst, 'reload schema';
