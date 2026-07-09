-- 0071_stripe_connect.sql — Stripe Connect (Express) so sellers receive payouts and
-- the platform takes a fee per sale. Idempotent. Portable vanilla Postgres.
--
--  · businesses gains the connected-account id + onboarding/charge status.
--  · payments records each marketplace transaction (order / ticket / booking …).
--  · apply_connect_status() (webhook / status sync, service_role) writes the status.
--  · mark_payment() records a paid transaction (called by the payments webhook).

alter table public.businesses add column if not exists stripe_account_id text;
alter table public.businesses add column if not exists connect_charges_enabled boolean not null default false;
alter table public.businesses add column if not exists connect_details_submitted boolean not null default false;
create index if not exists businesses_stripe_account_idx on public.businesses (stripe_account_id);

create table if not exists public.payments (
  id                     uuid primary key default gen_random_uuid(),
  business_id            uuid references public.businesses(id) on delete set null,
  buyer_id               uuid references auth.users(id) on delete set null,
  kind                   text,          -- 'order' | 'ticket' | 'booking' | 'rental'
  ref                    text,          -- order code / event slug / booking id
  stripe_checkout_session text,
  stripe_payment_intent  text,
  amount                 integer,       -- cents (gross)
  application_fee        integer,       -- cents (platform cut)
  currency               text not null default 'usd',
  status                 text not null default 'pending', -- pending | paid | failed | refunded
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index if not exists payments_business_idx on public.payments (business_id, created_at desc);
create index if not exists payments_session_idx on public.payments (stripe_checkout_session);

alter table public.payments enable row level security;
drop policy if exists "owner reads payments" on public.payments;
create policy "owner reads payments" on public.payments for select
  using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
         or buyer_id = auth.uid());

-- Onboarding / charge status sync (called by connect-status + account.updated webhook).
create or replace function public.apply_connect_status(
  in_business uuid, in_account text, in_charges boolean, in_details boolean
) returns void language plpgsql security definer set search_path = public as $fn$
begin
  update public.businesses set
    stripe_account_id = coalesce(in_account, stripe_account_id),
    connect_charges_enabled = coalesce(in_charges, connect_charges_enabled),
    connect_details_submitted = coalesce(in_details, connect_details_submitted)
  where id = in_business;
end $fn$;
revoke execute on function public.apply_connect_status(uuid, text, boolean, boolean) from public;
grant execute on function public.apply_connect_status(uuid, text, boolean, boolean) to service_role;

-- Record a paid marketplace transaction (called by the payments webhook).
create or replace function public.mark_payment(
  in_business uuid, in_buyer uuid, in_kind text, in_ref text, in_session text,
  in_intent text, in_amount int, in_fee int, in_status text
) returns void language plpgsql security definer set search_path = public as $fn$
begin
  insert into public.payments (business_id, buyer_id, kind, ref, stripe_checkout_session, stripe_payment_intent, amount, application_fee, status, updated_at)
  values (in_business, in_buyer, in_kind, in_ref, in_session, in_intent, in_amount, in_fee, coalesce(in_status, 'paid'), now())
  on conflict (id) do nothing;
end $fn$;
revoke execute on function public.mark_payment(uuid, uuid, text, text, text, text, int, int, text) from public;
grant execute on function public.mark_payment(uuid, uuid, text, text, text, text, int, int, text) to service_role;

notify pgrst, 'reload schema';
