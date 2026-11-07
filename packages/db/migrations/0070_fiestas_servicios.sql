-- 0070 · Fiestas: servicios, «Calendario y depósito», fechas ocupadas, «Tu fecha» (Fase 4 · bloque 4t).
-- Plan: docs/diseno/plan/fase4-fiestas-transporte.md §2 y §4t. Diseño: neg-fiesta.js, neg-fiesta-listing.js (k pack · hora ·
-- unid · fijo · visita · cotiza), dash2-cat.js TOOLS['NEG-FIESTA'] «Calendario y depósito».
-- «Ocupada» se deriva (día marcado a mano o reservas confirmadas que llenan los eventos del día): nunca se edita a mano.
begin;

-- Formas de cobrar de Fiestas: paquete (pack) y por unidad (unid); hora, fijo, visita y cotiza ya existen.
alter table items drop constraint if exists items_svc_kind_check;
alter table items add constraint items_svc_kind_check check (svc_kind = any (array[
  'fijo', 'desde', 'cotiza', 'diag', 'lav', 'goma', 'insp', 'grua', 'visita', 'hora', 'area', 'pres', 'emer', 'plan',
  'cons', 'tele', 'walk', 'free', 'proc', 'pct', 'pack', 'unid']));

-- Tu herramienta de Fiestas (una fila por negocio). La zona vive en businesses.service_radius_mi.
create table if not exists fiesta_settings (
  business_id text primary key references businesses (id),
  deposit_cents int not null default 0 check (deposit_cents between 0 and 300000 and deposit_cents % 5000 = 0),
  guests_max smallint check (guests_max is null or guests_max between 10 and 1000),
  events_per_day smallint not null default 1 check (events_per_day between 1 and 20),
  book_ahead_days smallint not null default 180 check (book_ahead_days between 30 and 365),
  cancel_full_days smallint not null default 30 check (cancel_full_days between 1 and 90),
  updated_by uuid references users (id),
  updated_at timestamptz not null default now()
);

-- El calendario real: días que el negocio marcó ocupados y (4v) los que ocupa una reserva confirmada.
create table if not exists party_days (
  id bigint generated always as identity primary key,
  business_id text not null references businesses (id),
  city_id text not null references cities (id),
  day date not null,
  source text not null check (source in ('manual', 'booking')),
  operation_id bigint references operations (id),
  created_by uuid references users (id),
  created_at timestamptz not null default now(),
  removed_at timestamptz,
  check ((source = 'booking') = (operation_id is not null))
);
create unique index if not exists party_days_manual_uq on party_days (business_id, day) where source = 'manual' and removed_at is null;
create index if not exists party_days_dia_idx on party_days (business_id, day) where removed_at is null;
create index if not exists party_days_ciudad_idx on party_days (city_id, day) where removed_at is null;

-- «Tu fecha» (como Mi vehículo / Tu seguro): guardarla no aparta nada.
create table if not exists user_event_plans (
  user_id uuid primary key references users (id),
  city_id text not null references cities (id),
  kind text not null check (kind in ('quince', 'boda', 'cumple', 'baby', 'bautizo', 'grad', 'empresa')),
  day date not null,
  guests smallint check (guests is null or guests between 1 and 2000),
  where_kind text not null default 'nose' check (where_kind in ('salon', 'casa', 'nose')),
  updated_at timestamptz not null default now()
);

-- Licencias de Fiestas (sin verificar la lista legal: LAUNCH-CHECKLIST). Sello, no bloquean (salvo limosina, en Transporte).
insert into license_kinds (key, category_id, title, can, cannot, issuer, registry_site, registry_url, number_label, sort) values
  ('pa_inflables', 'NEG-FIESTA', '{"es":"Inflables registrados e inspeccionados","en":"Registered and inspected inflatables"}', '{"es":"Rentar brincolines e inflables","en":"Rent bounce houses and inflatables"}', null,
   '{"es":"Departamento de Agricultura de PA (atracciones)","en":"PA Department of Agriculture (amusement rides)"}', 'agriculture.pa.gov', 'https://www.agriculture.pa.gov/Protect/AmusementRideSafety/Pages/default.aspx', 'Registro #', 1),
  ('alimentos', 'NEG-FIESTA', '{"es":"Licencia de alimentos","en":"Food license"}', '{"es":"Vender comida y pasteles para eventos","en":"Sell food and cakes for events"}', null,
   '{"es":"Departamento de Agricultura de PA o la ciudad","en":"PA Department of Agriculture or the city"}', 'agriculture.pa.gov', 'https://www.agriculture.pa.gov/consumer_protection/FoodSafety/Pages/default.aspx', 'Licencia #', 2),
  ('seguro_general', 'NEG-FIESTA', '{"es":"Seguro de responsabilidad","en":"Liability insurance"}', '{"es":"Montar en salones y casas","en":"Set up at venues and homes"}', null,
   '{"es":"La aseguradora del negocio","en":"The business insurer"}', 'insurance.pa.gov', 'https://www.insurance.pa.gov/Consumers/Pages/default.aspx', 'Póliza #', 3)
on conflict (key) do nothing;

-- Comisión de Fiestas (solo sobre el depósito cobrado en la app; Preguntas #2, #20). Empieza igual que la de citas.
alter table fee_rules drop constraint fee_rules_kind_check;
alter table fee_rules add constraint fee_rules_kind_check check (kind = any (array['ped', 'cita', 'bol', 'apt', 'rsv', 'plan', 'renta', 'merc', 'fiesta']));
insert into fee_rules (kind, rate_bp, fixed_cents, effective_from, reason)
select 'fiesta', 800, 0, '2026-01-01', 'Comisión inicial del depósito de una fiesta (igual que la de citas; Super Admin › Planes)'
 where not exists (select 1 from fee_rules where kind = 'fiesta');
commit;
