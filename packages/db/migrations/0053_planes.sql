-- 0053 · Planes recurrentes del Hogar (Fase 4 · bloque 4f). Diseño: neg-hogar-plan.js (planForm / planStatus).
-- Un plan es una operación (PL-…, kind 'plan') con su suscripción: día fijo (el N-ésimo día de la semana de cada mes, en una
-- franja de 2 h), primera visita, qué revisar y cómo entrar. Cada visita es una cita confirmada (details.plan) que entra a
-- Hoy. Hoy no se cobra nada; el primer cobro es el día de la primera visita y después cada mes ese mismo día del mes
-- (payments kind 'plan', seq = número de cobro). Saltar, pausar y cancelar mueven las fechas; nada se borra.
begin;
alter table operations drop constraint operations_kind_check;
alter table operations add constraint operations_kind_check check (kind = any (array['order', 'market_order', 'hold', 'appointment', 'quote', 'party', 'private_event', 'table', 'night', 'trip', 'enrollment', 'visit', 'tickets', 'rental', 'plan']));

alter table fee_rules drop constraint fee_rules_kind_check;
alter table fee_rules add constraint fee_rules_kind_check check (kind = any (array['ped', 'cita', 'bol', 'apt', 'rsv', 'plan', 'renta']));
insert into fee_rules (kind, rate_bp, fixed_cents, reason) values ('plan', 800, 0, 'Fase 4 · planes recurrentes (como citas)'), ('renta', 600, 0, 'Fase 4 · renta de herramienta (como apartados)');

create sequence plan_seq start 6100;
create table plan_subscriptions (
  id bigint generated always as identity primary key,
  operation_id bigint not null unique references operations(id),
  business_id text not null references businesses(id),
  user_id uuid not null references users(id),
  city_id text not null references cities(id),
  item_id bigint not null references items(id),
  home_id uuid references user_homes(id),
  price_cents int not null check (price_cents > 0),               -- copia del precio al empezar (cambios del negocio no la tocan)
  dow smallint not null check (dow between 0 and 6),              -- el día de la semana fijo
  nth smallint not null check (nth between 1 and 4),              -- el N-ésimo de ese día en el mes (1.º … 4.º)
  window_m smallint not null check (window_m between 0 and 1439), -- inicio de la franja de 2 h
  visit_months smallint[],                                        -- solo esos meses (p. ej. {10,4}: calefacción y aire); null = cada mes
  charge_day smallint not null check (charge_day between 1 and 28), -- el día del mes en que se cobra
  first_visit_on date not null,
  next_visit_on date,
  next_charge_on date,
  status text not null default 'active' check (status in ('active', 'paused', 'cancelled')),
  paused_until date,
  note text check (char_length(note) <= 300),
  access text check (char_length(access) <= 100),
  payment_method text not null check (payment_method ~ '^pm_[A-Za-z0-9_]{3,200}$'),
  charges_ok int not null default 0,
  fail_count smallint not null default 0,                         -- reintentos del cobro del período (días 1, 3 y 5)
  retry_on date,
  visits_done int not null default 0,
  created_at timestamptz not null default now(),
  cancelled_at timestamptz,
  updated_at timestamptz not null default now()
);
create index plan_subs_cobro_idx on plan_subscriptions (next_charge_on) where status = 'active';
create index plan_subs_negocio_idx on plan_subscriptions (business_id, status);
create index plan_subs_usuario_idx on plan_subscriptions (user_id, created_at desc);

insert into notif_templates (key, grp, pref, sms, title, body) values
  ('plan_activo', 'tx', null, false, '{"es": "Tu plan está activo", "en": "Your plan is active"}', '{"es": "{plan} con {negocio}: primera visita el {dia}. Hoy no se cobró nada.", "en": "{plan} with {negocio}: first visit on {dia}. Nothing was charged today."}'),
  ('plan_cobro', 'tx', null, false, '{"es": "Cobro de tu plan", "en": "Plan charge"}', '{"es": "{plan}: se cobraron {monto} en tu tarjeta.", "en": "{plan}: {monto} was charged to your card."}'),
  ('plan_visita', 'tx', null, true, '{"es": "Mañana es tu visita", "en": "Your visit is tomorrow"}', '{"es": "{negocio} llega mañana entre {franja}.", "en": "{negocio} arrives tomorrow between {franja}."}'),
  ('plan_fallo', 'tx', null, true, '{"es": "No se pudo cobrar tu plan", "en": "Your plan charge failed"}', '{"es": "Tu banco rechazó el cobro de {plan}. Lo intentamos otra vez en 2 días; puedes cambiar la tarjeta en tu plan.", "en": "Your bank declined the {plan} charge. We retry in 2 days; you can change the card in your plan."}'),
  ('plan_pausa', 'tx', null, false, '{"es": "Plan en pausa", "en": "Plan paused"}', '{"es": "{plan} vuelve el {dia}. Este mes no se cobra ni hay visita.", "en": "{plan} resumes on {dia}. No charge or visit this month."}'),
  ('plan_cancelado', 'tx', null, false, '{"es": "Plan cancelado", "en": "Plan cancelled"}', '{"es": "Cancelaste {plan}. No se cobra el mes siguiente.", "en": "You cancelled {plan}. Next month is not charged."}'),
  ('biz_plan_nuevo', 'biz', null, true, '{"es": "Plan nuevo", "en": "New plan"}', '{"es": "{cliente} empezó {plan}. Primera visita el {dia}.", "en": "{cliente} started {plan}. First visit on {dia}."}'),
  ('biz_plan_cambio', 'biz', null, false, '{"es": "Cambio en un plan", "en": "Plan change"}', '{"es": "{cliente}: {que} ({plan}).", "en": "{cliente}: {que} ({plan})."}')
on conflict (key) do nothing;
commit;
