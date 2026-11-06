-- 0023 · Pedidos (modelo de datos §6 y DeliverySettings §4) para la Fase 2 · bloque 2b: el pedido de Comida con pago
-- en el local. Todo lo que un cliente pide a un negocio es una operación con un tipo (una sola tabla para Mi cuenta,
-- el panel y el Super Admin). Dinero en centavos. Nada se borra: estados. La línea de tiempo es solo de inserción.
begin;

-- Entrega y pedidos en línea del negocio. Sin fila = lo de abajo (Comida Free: solo pickup, se paga en el local).
create table if not exists delivery_settings (
  business_id       text primary key references businesses (id),
  pickup            boolean not null default true,
  delivery          boolean not null default false,
  prep_min          smallint not null default 20 check (prep_min between 5 and 120),
  scheduled_orders  boolean not null default true,       -- para hoy; antes de abrir, para cuando abra
  auto_accept       boolean not null default false,      -- apagado: el negocio acepta cada pedido en 10 min o se libera
  pay_card          boolean not null default false,      -- exige Stripe activo (bloque 2d)
  pay_cash_pickup   boolean not null default true,       -- se paga en el local al recoger
  pay_cash_delivery boolean not null default false,
  ask_tip           boolean not null default true,
  pickup_note       jsonb,                               -- {es, en} hasta 120: «Pide en la caja con tu número de pedido.»
  zone_mi           smallint not null default 3 check (zone_mi in (1, 3, 5, 10)),
  fee_cents         integer not null default 300 check (fee_cents between 0 and 5000),
  free_over_cents   integer not null default 0 check (free_over_cents between 0 and 50000),
  min_order_cents   integer not null default 0 check (min_order_cents between 0 and 50000),
  travel_min        smallint not null default 15 check (travel_min in (10, 15, 20)),
  last_delivery_min smallint not null default 0 check (last_delivery_min in (0, 30, 60)),
  who               text not null default 'team' check (who in ('team', 'external')),
  external_app      text check (external_app in ('doordash', 'uber_eats', 'other')),
  updated_at        timestamptz not null default now()
);

-- Número visible: #1051 pedido (C-… cita, R-… reservación llegan con su bloque).
create sequence if not exists operations_order_seq start 1001;

create table if not exists operations (
  id               bigint generated always as identity primary key,
  number           text not null unique,
  kind             text not null check (kind in ('order', 'market_order', 'hold', 'appointment', 'quote', 'party', 'private_event',
                                                 'table', 'night', 'trip', 'enrollment', 'visit', 'tickets', 'rental')),
  city_id          text not null references cities (id),
  business_id      text not null references businesses (id),
  user_id          uuid not null references users (id),
  member_id        uuid references business_members (id),
  status           text not null default 'pending' check (status in ('pending', 'change_proposed', 'confirmed', 'declined', 'expired', 'cancelled', 'done')),
  status_detail    text,
  stage            text check (stage in ('sent', 'accepted', 'preparing', 'ready', 'on_the_way', 'delivered', 'picked_up')),
  mode             text check (mode in ('pickup', 'delivery')),
  scheduled_at     timestamptz,                              -- null = lo antes posible
  ready_at         timestamptz,                              -- estimado al enviar (prep + tiempo extra) o la hora programada
  customer_note    text check (char_length(customer_note) <= 200),
  details          jsonb not null default '{}'::jsonb,
  subtotal_cents   integer not null default 0 check (subtotal_cents >= 0),
  delivery_cents   integer not null default 0 check (delivery_cents >= 0),
  tip_cents        integer not null default 0 check (tip_cents >= 0),
  tax_cents        integer not null default 0 check (tax_cents >= 0),
  discount_cents   integer not null default 0 check (discount_cents >= 0),
  total_cents      integer not null default 0 check (total_cents >= 0),
  deposit_cents    integer not null default 0 check (deposit_cents >= 0),
  pay_mode         text not null check (pay_mode in ('app', 'local', 'entrega', 'none')),
  respond_by       timestamptz,                              -- pendiente sin respuesta después de esto = SIN RESPUESTA (al leer)
  sent_at          timestamptz not null default now(),
  answered_at      timestamptz,
  confirmed_at     timestamptz,
  done_at          timestamptz,
  cancelled_at     timestamptz,
  cancelled_by     text check (cancelled_by in ('user', 'business', 'admin', 'system')),
  cancel_reason    text,
  late_notice_at   timestamptz,
  free_quota_month text check (free_quota_month ~ '^\d{4}-\d{2}$'),  -- cuenta para el techo Free del negocio
  client_key       uuid not null,                            -- el mismo envío dos veces (doble toque, red) = un solo pedido
  is_test          boolean not null default false,           -- hecho en el sandbox (TOLATINO_ENTORNO = pruebas)
  updated_at       timestamptz not null default now(),
  unique (user_id, client_key)
);
create index if not exists operations_biz_idx on operations (business_id, sent_at desc);
create index if not exists operations_user_idx on operations (user_id, sent_at desc);
create index if not exists operations_city_idx on operations (city_id, sent_at desc);
create index if not exists operations_free_idx on operations (business_id, free_quota_month) where free_quota_month is not null;
create index if not exists operations_pend_idx on operations (business_id, respond_by) where status = 'pending';

create table if not exists operation_lines (
  id                bigint generated always as identity primary key,
  operation_id      bigint not null references operations (id),
  item_id           bigint references items (id),
  name              jsonb not null,                           -- copia {es, en}
  qty               integer not null check (qty between 1 and 99),
  unit_price_cents  integer not null check (unit_price_cents >= 0),  -- precio del plato + opciones, como se cobró
  line_total_cents  integer not null check (line_total_cents >= 0),
  tax_pct           numeric(5, 2) not null default 0,
  options           jsonb not null default '[]'::jsonb,       -- [{g: {es,en}, o: {es,en}, cents}]
  instructions      text check (char_length(instructions) <= 200),
  weight_est        numeric(8, 2),
  weight_final      numeric(8, 2)
);
create index if not exists operation_lines_op_idx on operation_lines (operation_id);

create table if not exists operation_events (
  id           bigint generated always as identity primary key,
  operation_id bigint not null references operations (id),
  at           timestamptz not null default now(),
  kind         text not null check (char_length(kind) <= 40),
  actor        text not null check (actor in ('user', 'business', 'member', 'system', 'admin')),
  actor_id     text,
  note         jsonb
);
create index if not exists operation_events_op_idx on operation_events (operation_id, at);
create or replace function operation_events_inmutable() returns trigger language plpgsql as $$
begin
  raise exception 'operation_events es solo de inserción (% no permitido)', tg_op;
end $$;
drop trigger if exists operation_events_no_cambia on operation_events;
create trigger operation_events_no_cambia before update or delete on operation_events for each row execute function operation_events_inmutable();

-- Techo Free (PlatformConfig): 10 operaciones en línea al mes; al llegar, la ficha ofrece Llamar.
insert into platform_config (key, value, note) values ('free_ops_cap', '10', 'Pedidos o citas en línea al mes de un negocio Free')
on conflict (key) do nothing;

-- Evento nuevo en la lista cerrada de la analítica.
alter table app_events drop constraint if exists app_events_name_check;
alter table app_events add constraint app_events_name_check check (name in ('ver_categoria', 'ver_ficha', 'buscar', 'contactar', 'entrar',
  'registrarse', 'publicar_negocio', 'recomendar', 'reclamar', 'reportar_foto', 'pedir_aviso', 'pedir'));

commit;
