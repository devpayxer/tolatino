-- 0003 · Categorías y búsqueda (modelo de datos §2): Category, Subcategory, ModuleType, FilterOption, Synonym, Amenity.
-- 17 categorías fijas; subcategorías, filtros y sinónimos se editan en el Super Admin › Catálogo. Nada se borra: status.
begin;

create table if not exists module_types (
  key   text primary key check (key in ('menu','pedidos','rsv','svc','citas','cot','shop','renta','staff','eventos','nov','jobs')),
  name  jsonb not null,
  descr jsonb,
  free  jsonb not null default '{}'::jsonb,
  pro   jsonb not null default '{}'::jsonb
);

create table if not exists categories (
  id                text primary key check (id ~ '^NEG-[A-Z]+$'),
  sort              smallint not null,
  name              jsonb not null,
  short             jsonb not null,
  short_provisional boolean not null default false,
  icon              text,
  op_kind           text check (op_kind in ('order', 'booking', 'ticket', 'none')),
  filter_families   jsonb not null default '[]'::jsonb,
  allowed_modules   jsonb not null default '[]'::jsonb,
  main_module       text not null default 'svc',
  module_labels     jsonb not null default '{}'::jsonb,
  item_noun         jsonb,
  fixed_line        jsonb,
  status            text not null default 'on' check (status in ('on', 'off')),
  updated_at        timestamptz not null default now()
);

create table if not exists subcategories (
  id          text primary key,
  category_id text not null references categories (id),
  sort        smallint not null,
  name        jsonb not null,
  "group"     text,
  photo_url   text,
  top         boolean not null default false,
  status      text not null default 'on' check (status in ('on', 'off')),
  updated_at  timestamptz not null default now()
);
create index if not exists subcategories_cat_idx on subcategories (category_id, status, sort);
-- Búsqueda por nombre en los dos idiomas, sin acentos y con errores de tipeo.
create index if not exists subcategories_name_trgm on subcategories
  using gin ((lower(name ->> 'es') || ' ' || lower(name ->> 'en')) gin_trgm_ops);

create table if not exists filter_options (
  id          bigint generated always as identity primary key,
  category_id text references categories (id),
  group_key   text not null,
  group_label jsonb not null,
  key         text not null,
  label       jsonb not null,
  quick       boolean not null default false,
  active      boolean not null default true,
  unique (category_id, group_key, key)
);

create table if not exists synonyms (
  id          bigint generated always as identity primary key,
  term        text not null,
  lang        text not null check (lang in ('es', 'en')),
  target_kind text not null check (target_kind in ('category', 'subcategory', 'filter', 'query')),
  target      text not null,
  active      boolean not null default true,
  created_by  text,
  created_at  timestamptz not null default now(),
  unique (term, lang, target_kind, target)
);
create index if not exists synonyms_term_trgm on synonyms using gin (lower(term) gin_trgm_ops);

create table if not exists amenities (
  key        text primary key,
  icon       text,
  label      jsonb not null,
  categories text[] not null default '{}'
);

-- Los 12 módulos (nombres del diseño).
insert into module_types (key, name) values
  ('menu',    '{"es":"Menú","en":"Menu"}'),
  ('pedidos', '{"es":"Pedidos en línea","en":"Online orders"}'),
  ('rsv',     '{"es":"Reservaciones","en":"Reservations"}'),
  ('svc',     '{"es":"Servicios","en":"Services"}'),
  ('citas',   '{"es":"Citas (Booking)","en":"Booking"}'),
  ('cot',     '{"es":"Cotizaciones","en":"Quotes"}'),
  ('shop',    '{"es":"Tienda","en":"Shop"}'),
  ('renta',   '{"es":"Renta","en":"Rentals"}'),
  ('staff',   '{"es":"Staff","en":"Staff"}'),
  ('eventos', '{"es":"Eventos","en":"Events"}'),
  ('nov',     '{"es":"Novedades","en":"Updates"}'),
  ('jobs',    '{"es":"Vacantes","en":"Jobs"}')
on conflict (key) do update set name = excluded.name;

commit;
