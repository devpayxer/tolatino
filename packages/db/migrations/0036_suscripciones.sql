-- 0036 · Plan Pro (bloque 2m · Cobros y plan, prototipo pro-trial.js «Prueba Pro y día 30»). Prueba de 30 días (HZL30 =
-- 60) → seguir con Pro (tarjeta; el primer cobro es el día 30) o no seguir → el día 30 la página pasa a Free con su
-- contenido Pro guardado (nunca se borra). Volver a Pro se cobra ese día (no hay segunda prueba). Mensual $14.99; anual =
-- 10 meses. Cobro fallido: 3 intentos en 7 días con aviso; al tercero, Free. Cortesía: Pro sin cobro hasta una fecha.
-- business_stats_cache.plan es el derivado que leen la ficha y el panel: lo escribe solo el servidor.
begin;

create table if not exists subscriptions (
  business_id        text primary key references businesses (id),
  status             text not null check (status in ('trial', 'active', 'past_due', 'courtesy', 'canceling', 'ended')),
  cycle              text not null default 'month' check (cycle in ('month', 'year')),
  price_cents        integer not null default 1499 check (price_cents >= 0),
  trial_started_at   timestamptz,
  trial_ends_at      timestamptz,
  trial_choice       text not null default 'none' check (trial_choice in ('none', 'card', 'no_continue')),
  promo_code         text,
  payer_user_id      uuid references users (id),               -- quien paga (el dueño)
  card_pm            text,                                      -- payment_methods.stripe_pm_id del que paga
  current_period_end timestamptz,
  failed_attempts    smallint not null default 0,
  next_attempt_at    timestamptz,
  courtesy_until     timestamptz,
  courtesy_reason    text,
  ended_at           timestamptz,
  updated_at         timestamptz not null default now(),
  created_at         timestamptz not null default now()
);
create index if not exists subscriptions_vence_idx on subscriptions (status, trial_ends_at, current_period_end);

-- Historia (solo inserción): inicio, decisión, cobros, fallos, avisos enviados, fin.
create table if not exists subscription_events (
  id           bigint generated always as identity primary key,
  business_id  text not null references businesses (id),
  kind         text not null check (char_length(kind) <= 40),
  amount_cents integer,
  note         jsonb,
  actor_id     uuid references users (id),
  idem_key     text unique,
  at           timestamptz not null default now()
);
create index if not exists subscription_events_negocio_idx on subscription_events (business_id, at desc);
create or replace function subscription_events_inmutable() returns trigger language plpgsql as $$
begin raise exception 'subscription_events es solo de inserción (% no permitido)', tg_op; end $$;
drop trigger if exists subscription_events_no_cambia on subscription_events;
create trigger subscription_events_no_cambia before update or delete on subscription_events for each row execute function subscription_events_inmutable();

-- Las pruebas que ya existían (guardadas por Publica tu negocio en category_attrs.onb.trial) pasan a la tabla.
insert into subscriptions (business_id, status, trial_started_at, trial_ends_at, payer_user_id)
select b.id, 'trial', (b.category_attrs->'onb'->'trial'->>'until')::timestamptz - make_interval(days => coalesce((b.category_attrs->'onb'->'trial'->>'days')::int, 30)),
       (b.category_attrs->'onb'->'trial'->>'until')::timestamptz,
       (select m.user_id from business_members m where m.business_id = b.id and m.kind = 'owner' and m.status = 'active' limit 1)
  from businesses b
 where b.category_attrs->'onb'->'trial'->>'until' is not null
on conflict (business_id) do nothing;

insert into notif_templates (key, grp, pref, sms, title, body) values
  ('pro_d25', 'biz', null, true, '{"es": "Tu prueba Pro termina pronto", "en": "Your Pro trial ends soon"}', '{"es": "Tu prueba Pro de {negocio} termina el {dia}. Decide en Cobros y plan; si no sigues, nada se borra.", "en": "Your {negocio} Pro trial ends {dia}. Decide in Payouts and plan; if you stop, nothing is deleted."}'),
  ('pro_charged', 'biz', null, false, '{"es": "Cobro de Pro", "en": "Pro charge"}', '{"es": "Cobramos {monto} de Pro de {negocio} a tu {tarjeta}.", "en": "We charged {monto} for {negocio} Pro to your {tarjeta}."}'),
  ('pro_failed', 'biz', null, true, '{"es": "No pudimos cobrar Pro", "en": "We could not charge Pro"}', '{"es": "No pudimos cobrar Pro de {negocio}. Intento {n} de 3: cambia la tarjeta en Cobros y plan.", "en": "We could not charge {negocio} Pro. Try {n} of 3: change the card in Payouts and plan."}'),
  ('pro_free', 'biz', null, true, '{"es": "Tu página pasó a Free", "en": "Your page is now Free"}', '{"es": "{negocio} pasó a Free. Tu contenido Pro está guardado: vuelve a Pro cuando quieras.", "en": "{negocio} is now Free. Your Pro content is saved: come back to Pro anytime."}')
on conflict (key) do nothing;

commit;
