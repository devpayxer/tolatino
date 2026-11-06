-- 0024 · Reservación de mesa (modelo de datos §4 ReservationSettings y §6 Operation · ChangeProposal) para la Fase 2 ·
-- bloque 2e. La reservación es una operación de tipo 'table' (número R-9301…). La disponibilidad es real: mesas por área
-- y tamaño, menos las reservaciones y retenciones que se cruzan en el tiempo. Minutos desde las 0:00 de la ciudad.
begin;

alter table operations add column if not exists duration_min smallint check (duration_min between 15 and 600);
alter table operations add column if not exists party_size smallint check (party_size between 1 and 500);
create index if not exists operations_mesa_idx on operations (business_id, scheduled_at) where kind = 'table';
create sequence if not exists operations_table_seq start 9301;

-- Ajustes del negocio (Panel v2 · Lo que vendes › Reservaciones). Sin fila = los de fábrica del diseño.
create table if not exists reservation_settings (
  business_id    text primary key references businesses (id),
  areas          jsonb not null default '{"salon":{"on":true,"t":{"2":4,"4":6,"6":2,"8":0}},"terraza":{"on":true,"t":{"2":3,"4":3,"6":0,"8":0}},"barra":{"on":false,"t":{"2":4,"4":0,"6":0,"8":0}}}',
  join_tables    boolean not null default true,             -- «Juntamos mesas» para grupos
  join_max       smallint not null default 8 check (join_max between 2 and 40),
  walk_in        smallint not null default 0 check (walk_in between 0 and 40),  -- mesas que no se reservan
  dur_min        smallint not null default 90 check (dur_min in (60, 90, 120)),
  days           smallint[],                                -- 0 = dom; null = los días que abre
  periods        jsonb not null default '{"almuerzo":{"on":true,"f":720,"t":930},"cena":{"on":true,"f":1050,"t":1230}}',  -- f = primera mesa, t = última
  auto_confirm   boolean not null default false,
  hold_min       smallint not null default 15 check (hold_min in (10, 15, 20, 30)),  -- te guardan la mesa N min
  cancel_free_h  smallint not null default 2 check (cancel_free_h in (1, 2, 4, 24)),
  min_ahead_h    smallint not null default 1 check (min_ahead_h in (1, 2, 24)),
  max_days       smallint not null default 14 check (max_days in (7, 14, 30)),
  reply_min      smallint not null default 10 check (reply_min in (5, 10, 15, 30)),
  updated_at     timestamptz not null default now()
);

-- Días sin reservaciones (evento privado, feriado, lluvia en la terraza): un día, un turno o un área.
create table if not exists reservation_blocks (
  id          bigint generated always as identity primary key,
  business_id text not null references businesses (id),
  day         date not null,
  period      text not null default 'all' check (period in ('all', 'almuerzo', 'cena')),
  area        text not null default 'all' check (area in ('all', 'salon', 'terraza', 'barra')),
  created_by  uuid references users (id),
  created_at  timestamptz not null default now(),
  removed_at  timestamptz
);
create index if not exists reservation_blocks_idx on reservation_blocks (business_id, day) where removed_at is null;

-- «Te guardamos esta mesa» 5 minutos mientras la persona completa la solicitud: cuenta para la disponibilidad.
create table if not exists reservation_holds (
  id          uuid primary key default gen_random_uuid(),
  business_id text not null references businesses (id),
  user_id     uuid not null references users (id),
  starts_at   timestamptz not null,
  party_size  smallint not null check (party_size between 1 and 500),
  area        text not null,
  edit_of     bigint references operations (id),           -- cambiar una solicitud: su propia mesa no cuenta
  expires_at  timestamptz not null default now() + interval '5 minutes',
  created_at  timestamptz not null default now()
);
create index if not exists reservation_holds_idx on reservation_holds (business_id, starts_at);

-- Te proponen un cambio (otra hora): el cliente acepta o no.
create table if not exists change_proposals (
  id           bigint generated always as identity primary key,
  operation_id bigint not null references operations (id),
  kind         text not null check (kind in ('time', 'date', 'price', 'items', 'quote')),
  proposed     jsonb not null,                              -- {at, area}
  reason       jsonb,
  status       text not null default 'open' check (status in ('open', 'accepted', 'declined', 'expired')),
  created_by   uuid references users (id),
  created_at   timestamptz not null default now(),
  answered_at  timestamptz
);
create index if not exists change_proposals_op_idx on change_proposals (operation_id, created_at desc);

commit;
