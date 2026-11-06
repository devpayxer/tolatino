-- 0048 · Hogar + Auto: servicios con su forma de cobrar, Tu herramienta, Mi vehículo y Mi casa (Fase 4 · bloque 4a).
-- Diseño: dash2-asv.js (Servicios de Auto), neg-hogar-listing.js / neg-auto-listing.js (SVC), dash2-cat.js blocksB (Tu
-- herramienta: «Taller y estimados» · «Visitas, planes y renta»), neg-auto-book.js (Mi vehículo), neg-hogar-book.js (Mi
-- casa). Plan: docs/diseno/plan/fase4-hogar-auto.md §2. Nada se borra (estados / removed_at); city_id en lo nuevo que lo pide.
begin;

-- Cómo se cobra cada servicio (Auto: fijo · desde · cotiza · diag · lav · goma · insp · grua; Hogar: visita · fijo · hora ·
-- area · pres · emer · plan). Los datos propios de cada forma van en svc_attrs (los valida el servidor por tipo).
alter table items add column if not exists svc_kind text check (svc_kind in ('fijo', 'desde', 'cotiza', 'diag', 'lav', 'goma', 'insp', 'grua', 'visita', 'hora', 'area', 'pres', 'emer', 'plan'));
alter table items add column if not exists svc_attrs jsonb not null default '{}'::jsonb;
create index if not exists items_svc_kind_idx on items (business_id, svc_kind) where module = 'svc' and removed_at is null;

-- Cómo trabaja el negocio: además de Belleza, el taller con bahías rentadas (bay), quien trabaja solo (solo), la red de
-- técnicos con página propia (red) y el contratista con subcontratistas (gc).
alter table businesses drop constraint if exists businesses_svc_model_check;
alter table businesses add constraint businesses_svc_model_check check (svc_model in ('emp', 'comm', 'chair', 'bay', 'solo', 'red', 'gc'));

-- Tu herramienta (una fila por negocio de Auto u Hogar). La tarifa se COPIA en cada estimado (4d): cambiarla no cambia
-- estimados ya mandados.
create table if not exists trade_settings (
  business_id          text primary key references businesses (id),
  labor_rate_cents     integer not null default 9500 check (labor_rate_cents between 4000 and 25000 and labor_rate_cents % 500 = 0),
  warranty_months      smallint check (warranty_months between 0 and 60),          -- el panel ofrece 3 · 12 · 24
  warranty_miles       integer check (warranty_miles between 0 and 100000),
  same_day_cutoff_h    smallint check (same_day_cutoff_h in (11, 12, 14, 15)),
  bays                 smallint check (bays between 1 and 40),
  h24                  boolean not null default false,
  emergency_eta_min    smallint not null default 60 check (emergency_eta_min between 15 and 240),
  updated_by           uuid references users (id),
  updated_at           timestamptz not null default now()
);

-- Depósito por forma de cobro, por «trabajo grande» y con un mínimo de precio (diseño DEP: k, big, min). 12 h para cancelar.
alter table booking_policies add column if not exists deposit_kinds text[] not null default '{}';
alter table booking_policies add column if not exists deposit_big_over_cents integer check (deposit_big_over_cents between 0 and 10000000);
alter table booking_policies add column if not exists deposit_big_cents integer check (deposit_big_cents between 0 and 1000000);
alter table booking_policies add column if not exists deposit_min_price_cents integer check (deposit_min_price_cents between 0 and 10000000);
alter table booking_policies drop constraint if exists booking_policies_cancel_free_h_check;
alter table booking_policies add constraint booking_policies_cancel_free_h_check check (cancel_free_h in (2, 4, 12, 24, 72));

-- Mi vehículo (Auto). Se usa para filtrar quién trabaja con tu carro, la medida de tus gomas y el precio del lavado.
create table if not exists user_vehicles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users (id),
  year        smallint not null check (year between 1950 and 2100),
  make        text not null check (char_length(make) between 2 and 30),
  model       text not null check (char_length(model) between 1 and 40),
  mileage     integer check (mileage between 0 and 2000000),
  veh_type    text not null default 'c' check (veh_type in ('c', 's', 'm', 'd')),       -- carro · SUV/pickup · moto · diésel/camión
  size        text not null default 'c' check (size in ('c', 's', 'v')),                -- carro · SUV o pickup · van o 3 filas (lavado)
  tire_size   text check (tire_size ~ '^[0-9]{3}/[0-9]{2}R[0-9]{2}$'),
  is_default  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  removed_at  timestamptz
);
create index if not exists user_vehicles_user_idx on user_vehicles (user_id) where removed_at is null;

-- Mi casa (Hogar): sobre una de Mis direcciones (la zona del negocio se mide con su geo).
create table if not exists user_homes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users (id),
  address_id    uuid not null references user_addresses (id),
  kind          text not null default 'casa' check (kind in ('casa', 'apto', 'duplex', 'movil')),
  tenure        text not null default 'dueno' check (tenure in ('dueno', 'inq', 'land')),
  beds          smallint check (beds between 0 and 5),
  baths         numeric(2,1) check (baths in (1, 1.5, 2, 3)),
  sqft          integer check (sqft between 100 and 20000),
  year_band     text check (year_band in ('pre50', '50', '80', '00')),
  pets          text check (pets in ('no', 'perro', 'gato', 'varios')),
  heat          text check (heat in ('caldera', 'horno', 'bomba', 'zocalo')),
  heat_age      text check (heat_age in ('m5', '5a15', 'p15', 'nose')),
  water_heater  text check (water_heater in ('gas', 'elec', 'sintanque', 'aceite')),
  wh_age        text check (wh_age in ('m5', '5a15', 'p15', 'nose')),
  access_note   text check (char_length(access_note) <= 120),
  is_default    boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  removed_at    timestamptz
);
create index if not exists user_homes_user_idx on user_homes (user_id) where removed_at is null;

alter table media drop constraint if exists media_owner_kind_check;
alter table media add constraint media_owner_kind_check
  check (owner_kind in ('business', 'logo', 'item', 'member', 'review', 'post', 'event', 'user', 'help', 'support', 'claim', 'appointment', 'estimate_line', 'request'));

commit;
