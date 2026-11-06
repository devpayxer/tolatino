-- 0034 · Pagos con tarjeta (bloque 2d). Stripe Connect Express con cargos «destino»: el cobro es de To'Latino, se
-- transfiere al negocio y To'Latino se queda con la comisión (application_fee), de donde sale el cargo de la tarjeta
-- (Super Admin › Planes › Comisiones: pedidos 10 % del subtotal; envío y propina van íntegros). PaymentIntent con
-- captura manual: Retenido al enviar → Cobrado cuando el negocio acepta → Liberado si no se da → Devuelto.
-- Nada se borra; los montos son centavos enteros; cada cambio de dinero es idempotente (clave única por operación).
-- En el sandbox, sin clave de Stripe, todo corre contra el simulador propio (`sim_intents`), nunca en producción.
begin;

-- Cuenta de cobro del negocio (StripeAccount). Stripe pide los datos fiscales y el banco; To'Latino no los ve.
create table if not exists stripe_accounts (
  business_id        text primary key references businesses (id),
  stripe_account_id  text not null unique,
  status             text not null default 'pending' check (status in ('pending', 'enabled', 'restricted')),
  charges_enabled    boolean not null default false,
  payouts_enabled    boolean not null default false,
  requirements       jsonb not null default '[]'::jsonb,       -- lo que Stripe todavía pide (claves, no datos)
  bank_last4         text check (bank_last4 ~ '^[0-9]{4}$'),
  payouts_paused     boolean not null default false,           -- el Super Admin retiene los pagos al banco
  paused_reason      text check (char_length(paused_reason) <= 300),
  simulated          boolean not null default false,           -- creada por el simulador del sandbox
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- Comisiones (FeeRule). La vigente es la última con effective_from <= ahora. Un cambio se programa con 30 días.
create table if not exists fee_rules (
  id              bigint generated always as identity primary key,
  kind            text not null check (kind in ('ped', 'cita', 'bol', 'apt', 'rsv')),
  rate_bp         integer not null check (rate_bp between 0 and 3000),   -- puntos básicos: 1000 = 10 %
  fixed_cents     integer not null default 0 check (fixed_cents between 0 and 1000),
  effective_from  timestamptz not null default now(),
  created_by      uuid references users (id),
  reason          text,
  created_at      timestamptz not null default now()
);
create index if not exists fee_rules_kind_idx on fee_rules (kind, effective_from desc);
insert into fee_rules (kind, rate_bp, fixed_cents, effective_from, reason)
select k, r, f, '2026-01-01', 'Comisión inicial (Super Admin › Planes)'
  from (values ('ped', 1000, 0), ('cita', 800, 0), ('bol', 500, 100), ('apt', 600, 0), ('rsv', 0, 0)) v(k, r, f)
 where not exists (select 1 from fee_rules);

-- Cobro (Payment). Uno por operación y tipo; el PaymentIntent es único.
create table if not exists payments (
  id                     bigint generated always as identity primary key,
  operation_id           bigint not null references operations (id),
  user_id                uuid not null references users (id),
  business_id            text not null references businesses (id),
  city_id                text references cities (id),
  kind                   text not null default 'full' check (kind in ('full', 'deposit', 'balance', 'tip')),
  method                 text not null default 'card' check (method in ('card', 'wallet')),
  stripe_payment_intent  text unique,
  amount_cents           integer not null check (amount_cents > 0),
  fee_cents              integer not null default 0 check (fee_cents >= 0),            -- comisión de To'Latino
  refunded_cents         integer not null default 0 check (refunded_cents >= 0),
  status                 text not null default 'held' check (status in ('held', 'captured', 'released', 'refunded', 'partially_refunded', 'failed')),
  card_brand             text,
  card_last4             text check (card_last4 ~ '^[0-9]{4}$'),
  failure_code           text,
  held_at                timestamptz,
  captured_at            timestamptz,
  released_at            timestamptz,
  simulated              boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (operation_id, kind),
  check (refunded_cents <= amount_cents)
);
create index if not exists payments_negocio_idx on payments (business_id, created_at desc);
create index if not exists payments_usuario_idx on payments (user_id, created_at desc);
create index if not exists payments_ciudad_idx on payments (city_id, created_at desc);

-- Devolución (Refund). Parcial o total; la comisión baja en proporción (la absorbe To'Latino o el negocio).
create table if not exists refunds (
  id                bigint generated always as identity primary key,
  payment_id        bigint not null references payments (id),
  amount_cents      integer not null check (amount_cents > 0),
  reason            text check (char_length(reason) <= 300),
  initiated_by      text not null check (initiated_by in ('business', 'admin', 'policy', 'event_cancelled')),
  actor_id          uuid references users (id),
  fee_absorbed_by   text not null default 'platform' check (fee_absorbed_by in ('platform', 'business')),
  stripe_refund_id  text unique,
  status            text not null default 'pending' check (status in ('pending', 'done', 'failed')),
  idem_key          text not null unique,
  created_at        timestamptz not null default now()
);
create index if not exists refunds_pago_idx on refunds (payment_id);

-- Tarjetas guardadas (PaymentMethod): solo la referencia de Stripe y lo que se muestra.
create table if not exists payment_methods (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references users (id),
  stripe_pm_id  text not null unique,
  brand         text not null,
  last4         text not null check (last4 ~ '^[0-9]{4}$'),
  exp           text not null check (exp ~ '^[0-9]{2}/[0-9]{2}$'),
  is_default    boolean not null default false,
  status        text not null default 'active' check (status in ('active', 'removed')),
  simulated     boolean not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists payment_methods_usuario_idx on payment_methods (user_id) where status = 'active';
alter table users add column if not exists stripe_customer_id text unique;

-- Eventos de Stripe (webhook): cada uno se procesa una vez.
create table if not exists stripe_events (
  id            text primary key,
  type          text not null,
  account       text,
  payload       jsonb not null,
  received_at   timestamptz not null default now(),
  processed_at  timestamptz,
  error         text
);

-- Simulador del sandbox (sin clave de Stripe): el estado de cada «PaymentIntent» simulado. Nunca en producción.
create table if not exists sim_intents (
  id              text primary key,                -- pi_sim_…
  amount_cents    integer not null,
  fee_cents       integer not null default 0,
  destination     text not null,
  status          text not null check (status in ('requires_capture', 'succeeded', 'canceled', 'failed')),
  captured_cents  integer not null default 0,
  refunded_cents  integer not null default 0,
  card            text not null,                   -- pm_sim_visa_4242…
  created_at      timestamptz not null default now()
);

-- La operación recuerda cómo se paga y el estado del dinero (derivado de payments; lo escribe solo el servidor).
alter table operations add column if not exists pay_status text check (pay_status in ('held', 'captured', 'released', 'refunded', 'partially_refunded', 'failed'));

-- Avisos del dinero.
insert into notif_templates (key, grp, pref, sms, title, body) values
  ('pay_released', 'tx', null, false, '{"es": "Liberamos tu dinero", "en": "We released your money"}', '{"es": "Liberamos {monto} retenidos para el pedido #{num}. Tu banco lo muestra en 1 a 5 días.", "en": "We released {monto} held for order #{num}. Your bank shows it in 1 to 5 days."}'),
  ('pay_refund', 'tx', null, true, '{"es": "Te devolvimos dinero", "en": "We refunded you"}', '{"es": "Te devolvimos {monto} del pedido #{num} a tu {tarjeta}. Llega en 3 a 5 días hábiles.", "en": "We refunded {monto} for order #{num} to your {tarjeta}. It arrives in 3 to 5 business days."}'),
  ('biz_stripe_on', 'biz', null, true, '{"es": "Cobros con tarjeta activos", "en": "Card payouts on"}', '{"es": "Tu cuenta de cobros está lista. Ya puedes encender la tarjeta en Pedidos.", "en": "Your payout account is ready. You can now turn on cards in Orders."}')
on conflict (key) do nothing;

commit;
