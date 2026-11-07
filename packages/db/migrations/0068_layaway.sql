-- 0068 · Layaway (plan de pagos) de Tiendas (Fase 4 · bloque 4r). Plan: docs/diseno/plan/fase4-mercados-tiendas.md §4r y Preguntas #11.
-- Un apartado (operations kind 'hold') de artículos «en plan» lleva su acuerdo por escrito: total, abono, número de pagos, cada
-- cuánto, «sin intereses», el cargo si no terminas, que se entrega al terminar. Lo aceptado (texto ES/EN, hora, IP y versión) no se
-- cambia nunca (disparador). El abono se retiene al apartar y se cobra cuando la tienda confirma; cada pago se paga en la app (con
-- la persona presente) o en la tienda. Lo pagado se deriva de los pagos (nunca se edita a mano).
begin;
create table if not exists layaway_plans (
  id bigint generated always as identity primary key,
  operation_id bigint not null unique references operations (id),
  city_id text not null references cities (id),
  total_cents int not null check (total_cents > 0),
  down_pct smallint not null check (down_pct between 5 and 50),
  down_cents int not null check (down_cents > 0 and down_cents < total_cents),
  n_payments smallint not null check (n_payments between 1 and 12),
  every_days smallint not null check (every_days between 7 and 31),
  cancel_pct smallint not null check (cancel_pct between 0 and 20),
  terms jsonb not null,
  accepted_at timestamptz not null default now(),
  accepted_ip text,
  accepted_version text not null,
  status text not null default 'pending' check (status in ('pending', 'active', 'late', 'paid', 'cancelled', 'declined')),
  next_due_at timestamptz,
  cancelled_at timestamptz,
  cancelled_by text check (cancelled_by in ('user', 'business', 'admin', 'system')),
  fee_kept_cents int not null default 0 check (fee_kept_cents >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists layaway_plans_vivos_idx on layaway_plans (next_due_at) where status in ('active', 'late');
create index if not exists layaway_plans_ciudad_idx on layaway_plans (city_id, status);

create table if not exists layaway_payments (
  id bigint generated always as identity primary key,
  plan_id bigint not null references layaway_plans (id),
  seq smallint not null check (seq between 0 and 12),          -- 0 = el abono
  due_at timestamptz,
  amount_cents int not null check (amount_cents > 0),
  payment_id bigint references payments (id),
  status text not null default 'due' check (status in ('due', 'paid', 'late', 'waived')),
  paid_at timestamptz,
  paid_where text check (paid_where in ('app', 'store')),
  reminded_at timestamptz,
  late_noticed_at timestamptz,
  unique (plan_id, seq)
);
create index if not exists layaway_payments_vence_idx on layaway_payments (due_at) where status in ('due', 'late');

-- Lo aceptado no se cambia: el acuerdo, los montos y quién/cuándo/dónde lo aceptó.
create or replace function layaway_plans_inmutable() returns trigger language plpgsql as $$
begin
  if new.terms is distinct from old.terms or new.total_cents <> old.total_cents or new.down_cents <> old.down_cents or new.down_pct <> old.down_pct
     or new.n_payments <> old.n_payments or new.every_days <> old.every_days or new.cancel_pct <> old.cancel_pct
     or new.accepted_at <> old.accepted_at or new.accepted_ip is distinct from old.accepted_ip or new.accepted_version <> old.accepted_version then
    raise exception 'el acuerdo del plan aceptado no se puede cambiar';
  end if;
  return new;
end $$;
drop trigger if exists layaway_plans_inmutable on layaway_plans;
create trigger layaway_plans_inmutable before update on layaway_plans for each row execute function layaway_plans_inmutable();
-- Un pago del plan no cambia de monto ni de número.
create or replace function layaway_payments_inmutable() returns trigger language plpgsql as $$
begin
  if new.amount_cents <> old.amount_cents or new.seq <> old.seq or new.plan_id <> old.plan_id then raise exception 'un pago del plan no cambia de monto'; end if;
  if old.status in ('paid', 'waived') and new.status not in ('paid', 'waived') then raise exception 'un pago hecho no vuelve a deberse'; end if;
  return new;
end $$;
drop trigger if exists layaway_payments_inmutable on layaway_payments;
create trigger layaway_payments_inmutable before update on layaway_payments for each row execute function layaway_payments_inmutable();

insert into notif_templates (key, grp, pref, sms, title, body) values
  ('lay_abono', 'tx', null, true, '{"es":"Plan confirmado","en":"Plan confirmed"}', '{"es":"{negocio} confirmó tu plan: se cobró el abono de {monto}. Tu primer pago de {pago} es el {fecha}.","en":"{negocio} confirmed your plan: the {monto} down payment was charged. Your first {pago} payment is due {fecha}."}'),
  ('lay_pronto', 'tx', null, true, '{"es":"Tu pago se acerca","en":"Payment coming up"}', '{"es":"Tu pago de {monto} del plan en {negocio} es el {fecha}. Págalo en la app o en la tienda.","en":"Your {monto} plan payment at {negocio} is due {fecha}. Pay in the app or at the store."}'),
  ('lay_pagado', 'tx', null, false, '{"es":"Pago recibido","en":"Payment received"}', '{"es":"Recibimos tu pago de {monto} del plan en {negocio}. Te falta {falta}.","en":"We got your {monto} plan payment at {negocio}. {falta} left."}'),
  ('lay_atrasado', 'tx', null, true, '{"es":"Pago atrasado","en":"Payment late"}', '{"es":"Tu pago de {monto} del plan en {negocio} está atrasado. Págalo para no perder tu plan.","en":"Your {monto} plan payment at {negocio} is late. Pay it to keep your plan."}'),
  ('lay_cancelado', 'tx', null, true, '{"es":"Plan cancelado","en":"Plan cancelled"}', '{"es":"Se canceló tu plan en {negocio}. {devuelto}","en":"Your plan at {negocio} was cancelled. {devuelto}"}'),
  ('lay_listo', 'tx', null, true, '{"es":"Terminaste de pagar","en":"Fully paid"}', '{"es":"Terminaste de pagar tu plan en {negocio}. Pasa a recogerlo.","en":"You finished paying your plan at {negocio}. Come pick it up."}')
on conflict (key) do nothing;
commit;
