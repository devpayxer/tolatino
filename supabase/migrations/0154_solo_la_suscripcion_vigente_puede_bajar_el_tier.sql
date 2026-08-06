-- 0154_solo_la_suscripcion_vigente_puede_bajar_el_tier.sql
-- Idempotente. Aplicar: pegar en el SQL Editor de Supabase y darle a Run.
--
-- DE DÓNDE SALE (auditoría multi-agente del alta de negocio, 2026-08-05,
-- hallazgo confirmado de la clase «dinero»):
--
-- Cuando un dueño reintentaba el pago de Verified, cada intento creaba una
-- suscripción NUEVA en Stripe y la abandonada seguía viva. Al expirar (~23 h
-- después, `incomplete` → `incomplete_expired`), Stripe mandaba su webhook con
-- el MISMO `business_id`, y `apply_subscription` — que solo mira el negocio,
-- no QUÉ suscripción habla — ponía `tier = 'free'`. Resultado: el negocio
-- pagaba $14.99/mes por la suscripción buena y perdía la insignia al día
-- siguiente por el eco de la mala.
--
-- El arreglo tiene dos mitades y esta es la de la BASE (la otra vive en las
-- Edge Functions: `stripe-subscribe` ahora REUTILIZA la suscripción incompleta
-- en vez de crear otra, y `stripe-webhook` filtra el evento rezagado antes de
-- llamar aquí). Se pone TAMBIÉN aquí porque esta función es quien ejecuta el
-- daño: si mañana la llama otro camino, la regla tiene que seguir valiendo.
--
-- LA REGLA: solo la suscripción REGISTRADA puede bajar el tier. Subirlo
-- (active/trialing) puede cualquiera — una suscripción nueva que cobra ES la
-- vigente desde ese momento y el upsert la registra.

create or replace function public.apply_subscription(
  in_business uuid, in_customer text, in_sub text, in_plan text, in_status text, in_period_end timestamptz
) returns void language plpgsql security definer set search_path = public as $fn$
declare
  vigente text;
begin
  select stripe_subscription_id into vigente
    from public.business_subscriptions where business_id = in_business;

  -- Un estado NO-activo de una suscripción que no es la vigente es un eco de
  -- un intento viejo: se ignora entero (ni la fila ni el tier se tocan).
  if in_status not in ('active', 'trialing')
     and vigente is not null
     and coalesce(in_sub, '') <> ''
     and vigente <> in_sub then
    return;
  end if;

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

revoke execute on function public.apply_subscription(uuid, text, text, text, text, timestamptz) from public, anon;
grant execute on function public.apply_subscription(uuid, text, text, text, text, timestamptz) to service_role;

notify pgrst, 'reload schema';
