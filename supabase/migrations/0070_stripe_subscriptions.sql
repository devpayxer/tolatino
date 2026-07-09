-- 0070_stripe_subscriptions.sql — Stripe subscription state for business plans
-- (Verified / Premium). Idempotent. Portable vanilla Postgres.
--
-- The Stripe webhook (Edge Function, service_role) calls apply_subscription() to
-- upsert the row AND reflect the plan on businesses.tier. Owners can read their own
-- subscription (RLS); only service_role can write (via the definer function).

create table if not exists public.business_subscriptions (
  business_id            uuid primary key references public.businesses(id) on delete cascade,
  stripe_customer_id     text,
  stripe_subscription_id text,
  plan                   text,   -- 'verified' | 'premium'
  status                 text,   -- stripe subscription status
  current_period_end     timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index if not exists business_subscriptions_customer_idx on public.business_subscriptions (stripe_customer_id);

alter table public.business_subscriptions enable row level security;
drop policy if exists "owner reads subscription" on public.business_subscriptions;
create policy "owner reads subscription" on public.business_subscriptions for select
  using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));

-- Webhook-side apply: upsert the subscription + set the business tier from status.
create or replace function public.apply_subscription(
  in_business uuid, in_customer text, in_sub text, in_plan text, in_status text, in_period_end timestamptz
) returns void language plpgsql security definer set search_path = public as $fn$
begin
  insert into public.business_subscriptions
    (business_id, stripe_customer_id, stripe_subscription_id, plan, status, current_period_end, updated_at)
  values (in_business, in_customer, in_sub, in_plan, in_status, in_period_end, now())
  on conflict (business_id) do update set
    stripe_customer_id     = coalesce(excluded.stripe_customer_id, business_subscriptions.stripe_customer_id),
    stripe_subscription_id = coalesce(excluded.stripe_subscription_id, business_subscriptions.stripe_subscription_id),
    plan                   = excluded.plan,
    status                 = excluded.status,
    current_period_end     = excluded.current_period_end,
    updated_at             = now();
  -- active/trialing → the paid tier; anything else (canceled, past_due, unpaid) → free
  update public.businesses
    set tier = case when in_status in ('active', 'trialing') and in_plan in ('verified', 'premium') then in_plan else 'free' end
    where id = in_business;
end $fn$;
revoke execute on function public.apply_subscription(uuid, text, text, text, text, timestamptz) from public;
grant execute on function public.apply_subscription(uuid, text, text, text, text, timestamptz) to service_role;

notify pgrst, 'reload schema';
