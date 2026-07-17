-- 0101 · Renta: DEPÓSITO REAL estilo Turo — una autorización (hold) de verdad en
-- la tarjeta del cliente, liberada al devolver o cobrada por daño. Solo aplica a
-- rentas pagadas EN LÍNEA (negocio con Stripe). El hold se coloca off-session con
-- la tarjeta que el cliente ya usó para la tarifa; el dueño lo libera o cobra
-- desde el panel. Sin Stripe, el depósito se sigue tomando en efectivo al recoger
-- (regla canónica #4 — el depósito es garantía, no pago).
--
-- deposit_status lifecycle (online orders):
--   none      · sin hold (pay-at-pickup, o negocio sin Stripe)
--   held      · autorizado en la tarjeta (dinero retenido, no cobrado)
--   released  · liberado al devolver (el hold se cancela → desaparece del estado)
--   captured  · se cobró (parte o todo) por daño; deposit_captured = monto cobrado
--   failed    · no se pudo autorizar (SCA / tarjeta) → el dueño cobra al recoger
-- Idempotente. Vanilla Postgres — portable a self-hosted.

alter table public.business_rental_orders
  add column if not exists deposit_intent   text,
  add column if not exists deposit_status    text not null default 'none',
  add column if not exists deposit_captured  numeric not null default 0;

-- The buyer's Stripe Customer id (so the fee card can be saved + re-used for the
-- off-session deposit hold). One per user; created lazily at checkout.
alter table public.profiles
  add column if not exists stripe_customer_id text;

-- Record/patch a rental order's deposit hold state. service_role only: the webhook
-- (placing the hold) and the rental-deposit edge fn (release/capture) call it.
create or replace function public.set_rental_deposit(
  in_order uuid, in_intent text, in_status text, in_captured numeric default 0
) returns void
language plpgsql security definer set search_path = public as $fn$
begin
  update public.business_rental_orders
     set deposit_intent  = coalesce(in_intent, deposit_intent),
         deposit_status   = in_status,
         deposit_captured = greatest(coalesce(in_captured, 0), 0)
   where id = in_order;
end $fn$;
revoke all on function public.set_rental_deposit(uuid, text, text, numeric) from public, anon, authenticated;
grant execute on function public.set_rental_deposit(uuid, text, text, numeric) to service_role;

-- Owner-facing read helper: resolve an order the caller OWNS to its deposit hold
-- + the seller's connected account (so the edge fn can verify ownership and route
-- a damage capture). SECURITY DEFINER but gated to the business owner via auth.uid().
create or replace function public.rental_deposit_ctx(in_order uuid)
returns table (deposit_intent text, deposit_status text, deposit_total numeric,
               deposit_captured numeric, seller_account text, is_owner boolean)
language sql stable security definer set search_path = public as $fn$
  select o.deposit_intent, o.deposit_status, o.deposit_total, o.deposit_captured,
         b.stripe_account_id,
         (b.owner_id = auth.uid()) as is_owner
  from public.business_rental_orders o
  join public.businesses b on b.id = o.business_id
  where o.id = in_order;
$fn$;
grant execute on function public.rental_deposit_ctx(uuid) to authenticated;

notify pgrst, 'reload schema';
