-- 0022 · Lo que vende (modelo de datos §4) para el módulo Menú (Fase 2 · bloque 2a): secciones (categorías del menú),
-- ítems (platos) y grupos de opciones. Dinero en centavos. Nada se borra: removed_at. Lo que oculta el equipo de
-- To'Latino lleva su motivo (el dueño lo ve en su panel; el cliente no lo ve).
begin;

create table if not exists item_sections (
  id          bigint generated always as identity primary key,
  business_id text not null references businesses (id),
  module      text not null default 'menu' check (module in ('menu', 'shop', 'svc', 'renta')),
  name        jsonb not null check (char_length(name->>'es') between 1 and 40),     -- {es, en}
  sort        smallint not null default 0,
  visible     boolean not null default true,                                      -- «Se ve en tu página»
  avail       text not null default 'siempre' check (avail in ('siempre', 'own')),  -- todo el horario u horario propio
  av          jsonb,                                                              -- {f, t (min desde 0:00), d [0–6, 0 = dom]}
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  removed_at  timestamptz
);
create index if not exists item_sections_biz_idx on item_sections (business_id, module, sort) where removed_at is null;

create table if not exists option_groups (
  id          bigint generated always as identity primary key,
  business_id text not null references businesses (id),
  name        jsonb not null check (char_length(name->>'es') between 1 and 40),
  required    boolean not null default false,
  max_pick    smallint not null default 1 check (max_pick between 1 and 20),
  options     jsonb not null default '[]'::jsonb,                                 -- [{es, en, cents, on}]
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  removed_at  timestamptz
);
create index if not exists option_groups_biz_idx on option_groups (business_id) where removed_at is null;

create table if not exists items (
  id             bigint generated always as identity primary key,
  business_id    text not null references businesses (id),
  module         text not null default 'menu' check (module in ('menu', 'shop', 'svc', 'renta', 'veh', 'inm', 'clase', 'plan')),
  section_id     bigint references item_sections (id),
  name           jsonb not null check (char_length(name->>'es') between 2 and 60),  -- {es, en}
  descr          jsonb not null default '{}'::jsonb,                                -- {es, en}, hasta 140
  price_cents    integer not null check (price_cents between 0 and 10000000),
  unit           text not null default 'u' check (unit in ('u', 'lb', 'hora', 'dia', 'semana', 'mes', 'persona')),
  tax_pct        numeric(5, 2) not null default 6 check (tax_pct between 0 and 20),  -- 6 % comida preparada (PA) · 0 exento
  photos         text[] not null default '{}',                                       -- URLs propias (Garage), hasta 5
  sell           boolean not null default true,                                      -- false = solo catálogo
  channels       text[] not null default '{dlv,pick}' check (channels <@ array['dlv', 'pick']),
  sold_out       boolean not null default false,
  sold_out_until text not null default 'hoy' check (sold_out_until in ('hoy', 'vie', 'manual')),
  sold_out_at    timestamptz,
  stock_mode     text not null default 'none' check (stock_mode in ('none', 'day', 'qty')),
  stock_left     integer not null default 0 check (stock_left between 0 and 9999),
  stock_par      integer not null default 10 check (stock_par between 1 and 9999),
  stock_day      date,                                                                -- «cuenta del día»: el día de stock_left; otro día = vuelve a stock_par
  max_qty        smallint not null default 0 check (max_qty between 0 and 99),       -- 0 = sin tope
  tags           text[] not null default '{}' check (tags <@ array['pica', 'veg', 'sg', 'mar', 'lac', 'hue', 'nuez']),
  extra_min      smallint not null default 0 check (extra_min between 0 and 60),
  featured       boolean not null default false,                                     -- fijo en Populares
  avail          text not null default 'cat' check (avail in ('cat', 'siempre', 'own')),
  av             jsonb,
  group_ids      bigint[] not null default '{}',                                     -- grupos de opciones, en orden
  status         text not null default 'live' check (status in ('live', 'hidden')),  -- hidden = lo ocultó To'Latino
  hidden_reason  text,
  hidden_by      uuid references users (id),
  sort           integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  removed_at     timestamptz
);
create index if not exists items_biz_idx on items (business_id, module, section_id, sort) where removed_at is null;
create index if not exists items_name_trgm on items using gin ((lower(name->>'es') || ' ' || lower(coalesce(name->>'en', ''))) gin_trgm_ops) where removed_at is null;

-- Ajustes del menú del negocio (menuCfg): último pedido N min antes de cerrar, pausa, tiempo extra, aviso de pocos.
create table if not exists menu_settings (
  business_id  text primary key references businesses (id),
  last_min     smallint not null default 15 check (last_min in (0, 15, 30, 45)),
  pause_until  timestamptz,
  pause_kind   text check (pause_kind in ('15', '30', '60', 'dia')),
  busy_min     smallint not null default 0 check (busy_min in (0, 10, 20, 30)),
  low_alert    smallint not null default 3 check (low_alert in (0, 2, 3, 5)),
  updated_at   timestamptz not null default now()
);

-- Módulo pausado por To'Latino (Menú o Pedidos en línea), con su motivo: el dueño lo ve en su panel.
alter table businesses add column if not exists modules_off jsonb not null default '{}'::jsonb;  -- {menu: {reason, at, by}}

commit;
