-- 0008 · Negocios (modelo de datos §3) y búsqueda/guardados (§2, §5). Escala 1M+: GIST geo, GIN búsqueda,
-- btree en (city_id, category_id, status). Derivados (plan, verificado, ★, abierto ahora) NO son columnas editables:
-- se cachean en business_stats_cache por triggers/procesos y nunca se escriben a mano.
begin;

create table if not exists businesses (
  id                    text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  city_id               text not null references cities (id),
  category_id           text not null references categories (id),
  subcategory_ids       text[] not null default '{}',
  name                  text not null check (char_length(name) between 2 and 80),
  status                text not null default 'draft'
                          check (status in ('draft','active','temp_closed','hidden','suspended','closed','merged')),
  temp_closed_until     timestamptz,
  merged_into           text references businesses (id),
  origin                text not null default 'self' check (origin in ('self', 'seed', 'claim')),
  owner_user_id         uuid references users (id),
  operation             text not null default 'local' check (operation in ('local', 'casa', 'ambos', 'rento')),
  hosted_at_business_id text references businesses (id),
  seat_label            text,
  address               text,
  address_ref           text,
  geo                   geography(point, 4326),
  works_from_home       boolean not null default false,
  service_radius_mi     smallint check (service_radius_mi between 1 and 100),
  phone                 text check (phone ~ '^\+1[2-9][0-9]{9}$'),
  whatsapp              boolean not null default false,
  email                 citext,
  instagram             text,
  facebook              text,
  languages             text[] not null default '{es}',
  about                 jsonb,
  founded_year          smallint check (founded_year between 1900 and 2100),
  amenities             text[] not null default '{}',
  filter_values         text[] not null default '{}',
  payment_modes         text[] not null default '{local}',
  category_attrs        jsonb not null default '{}'::jsonb,
  logo_url              text,
  modules_on            text[] not null default '{}',
  modules_paused        text[] not null default '{}',
  staff_hidden          boolean not null default false,
  is_demo               boolean not null default false,       -- solo semilla del sandbox (decisión I)
  search_doc            tsvector,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists businesses_city_cat_idx on businesses (city_id, category_id, status);
create index if not exists businesses_city_status_idx on businesses (city_id, status);
create index if not exists businesses_owner_idx on businesses (owner_user_id);
create index if not exists businesses_geo_gix on businesses using gist (geo);
create index if not exists businesses_subcats_gin on businesses using gin (subcategory_ids);
create index if not exists businesses_filters_gin on businesses using gin (filter_values);
create index if not exists businesses_search_gin on businesses using gin (search_doc);
create index if not exists businesses_name_trgm on businesses using gin (lower(name) gin_trgm_ops);

-- Documento de búsqueda ES/EN sin acentos: nombre (A), subcategorías (B), sobre nosotros (C).
create or replace function businesses_search_doc() returns trigger language plpgsql as $$
declare subs text;
begin
  select string_agg((s.name->>'es') || ' ' || (s.name->>'en'), ' ') into subs from subcategories s where s.id = any (new.subcategory_ids);
  new.search_doc :=
    setweight(to_tsvector('simple', unaccent(coalesce(new.name, ''))), 'A') ||
    setweight(to_tsvector('simple', unaccent(coalesce(subs, ''))), 'B') ||
    setweight(to_tsvector('simple', unaccent(coalesce(new.about->>'es', '') || ' ' || coalesce(new.about->>'en', ''))), 'C');
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists businesses_search_doc_trg on businesses;
create trigger businesses_search_doc_trg before insert or update on businesses
  for each row execute function businesses_search_doc();

-- Caché de derivados (plan, sello, ★, conteos). La escribe el servidor/procesos; la pantalla solo la lee.
create table if not exists business_stats_cache (
  business_id   text primary key references businesses (id),
  plan          text not null default 'free' check (plan in ('free', 'pro')),
  verified      boolean not null default false,
  rating_avg    numeric(2, 1),
  review_count  integer not null default 0,
  photo_count   integer not null default 0,
  profile_strength smallint not null default 0,
  updated_at    timestamptz not null default now()
);

create table if not exists business_hours (
  business_id text not null references businesses (id),
  module      text not null default '',             -- '' = horario general
  weekday     smallint not null check (weekday between 0 and 6),
  open        boolean not null default true,
  ranges      jsonb not null default '[]'::jsonb,    -- [["09:00","18:00"], ["19:00","22:00"]]
  primary key (business_id, module, weekday)
);

create table if not exists special_hours (
  id          bigint generated always as identity primary key,
  business_id text not null references businesses (id),
  kind        text not null check (kind in ('holiday', 'season', 'scheduled')),
  date_from   date not null,
  date_to     date not null,
  closed      boolean not null default false,
  ranges      jsonb not null default '[]'::jsonb,
  label       jsonb,
  check (date_to >= date_from)
);
create index if not exists special_hours_biz_idx on special_hours (business_id, date_to);

create table if not exists business_links (
  a_id text not null references businesses (id),
  b_id text not null references businesses (id),
  kind text not null check (kind in ('sucursal', 'dueno')),
  note_a jsonb, note_b jsonb,
  status text not null default 'proposed' check (status in ('proposed', 'ok', 'rejected', 'removed')),
  requested_at timestamptz not null default now(),
  answered_at timestamptz,
  hidden_by_admin timestamptz, hidden_reason text,
  primary key (a_id, b_id),
  check (a_id <> b_id)
);

create table if not exists business_members (
  id              uuid primary key default gen_random_uuid(),
  business_id     text not null references businesses (id),
  user_id         uuid references users (id),
  kind            text not null check (kind in ('owner', 'staff', 'renter')),
  display_name    text not null,
  nickname        text,
  role            jsonb,
  photo_url       text,
  languages       text[] not null default '{es}',
  specialties     jsonb not null default '[]'::jsonb,
  bio             jsonb,
  weekly_schedule jsonb,
  certification   jsonb,
  panel_access    text[] not null default '{}',
  status          text not null default 'active' check (status in ('invited', 'requested', 'active', 'removed')),
  show_on_page    boolean not null default true,
  sort            smallint not null default 0,
  phone           text,
  invited_at      timestamptz, invite_expires_at timestamptz,
  join_message    jsonb,
  same_as_business_hours boolean not null default true,
  hidden_by_admin timestamptz, hidden_reason text
);
create index if not exists business_members_biz_idx on business_members (business_id, status, sort);
create index if not exists business_members_user_idx on business_members (user_id);

create table if not exists licenses (
  id bigint generated always as identity primary key,
  business_id text not null references businesses (id),
  kind text not null, title jsonb not null,
  can jsonb not null default '[]'::jsonb, cannot jsonb not null default '[]'::jsonb,
  issuer text, number text,
  status text not null default 'review' check (status in ('valid', 'expired', 'review', 'revoked')),
  next_review date, registry_url text,
  verified_by uuid references users (id), verified_at timestamptz
);
create index if not exists licenses_biz_idx on licenses (business_id);

create table if not exists verification_requests (
  id bigint generated always as identity primary key,
  business_id text not null references businesses (id),
  status text not null default 'review' check (status in ('review', 'ok', 'info', 'no')),
  evidence jsonb not null default '{}'::jsonb,
  reason_key text, note text,
  reviewed_by uuid references users (id), decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists verification_requests_queue_idx on verification_requests (status, created_at);

create table if not exists media (
  id uuid primary key default gen_random_uuid(),
  owner_kind text not null check (owner_kind in ('business','item','member','review','post','event','user','help','support','claim')),
  owner_id text not null,
  url text not null, w integer, h integer,
  credit text,                                         -- p. ej. «Foto: Nombre / Pexels»
  sort smallint not null default 0,
  status text not null default 'visible' check (status in ('visible', 'removed')),
  removed_reason text, removed_by uuid references users (id),
  uploaded_by uuid references users (id),
  created_at timestamptz not null default now()
);
create index if not exists media_owner_idx on media (owner_kind, owner_id, status, sort);

create table if not exists faqs (
  id bigint generated always as identity primary key,
  business_id text not null references businesses (id),
  question jsonb not null, answer jsonb not null, sort smallint not null default 0
);

create table if not exists claims (
  id text primary key,
  business_id text not null references businesses (id),
  user_id uuid not null references users (id),
  role text not null check (role in ('dueno', 'socio', 'encargado')),
  method text not null check (method in ('call_code', 'document')),
  doc_kind text check (doc_kind in ('licencia', 'servicio', 'ein', 'otro')),
  doc_media uuid references media (id),
  note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reason text, decided_by uuid references users (id), decided_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists onboarding_drafts (
  user_id uuid primary key references users (id),
  step text not null default 'A1',
  answers jsonb not null default '{}'::jsonb,
  imported_from jsonb, promo_code text,
  started_at timestamptz not null default now(), completed_at timestamptz,
  business_id text references businesses (id)
);

create table if not exists contact_taps (
  id bigint generated always as identity primary key,
  business_id text not null references businesses (id),
  user_id uuid references users (id),
  kind text not null check (kind in ('call', 'whatsapp', 'directions', 'share', 'calendar', 'copy')),
  source text, at timestamptz not null default now()
);
create index if not exists contact_taps_biz_idx on contact_taps (business_id, at desc);

create table if not exists favorites (
  user_id uuid not null references users (id),
  kind text not null check (kind in ('business', 'item', 'event')),
  target_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, kind, target_id)
);

create table if not exists follows (
  follower_user_id uuid not null references users (id),
  target_kind text not null check (target_kind in ('user', 'business')),
  target_id text not null,
  created_at timestamptz not null default now(),
  primary key (follower_user_id, target_kind, target_id)
);
create index if not exists follows_target_idx on follows (target_kind, target_id);

create table if not exists search_logs (
  id bigint generated always as identity primary key,
  city_id text references cities (id), user_id uuid references users (id),
  query text not null, understood jsonb, results integer not null default 0,
  at timestamptz not null default now()
);
create index if not exists search_logs_city_idx on search_logs (city_id, at desc);
create index if not exists search_logs_zero_idx on search_logs (city_id, at desc) where results = 0;

create table if not exists search_alerts (
  id bigint generated always as identity primary key,
  user_id uuid not null references users (id), city_id text not null references cities (id),
  query text not null, filters jsonb,
  created_at timestamptz not null default now(), notified_at timestamptz, removed_at timestamptz
);

create table if not exists recommendations (
  id bigint generated always as identity primary key,
  by_user_id uuid not null references users (id), city_id text not null references cities (id),
  business_name text not null, category_id text references categories (id),
  "where" text check ("where" in ('address', 'sin_local')), address text,
  contact_phone text, how_known text,
  is_mine boolean not null default false, reveal_me boolean not null default false,
  status text not null default 'sent' check (status in ('draft', 'sent', 'joined', 'seeded', 'declined')),
  business_id text references businesses (id),
  created_at timestamptz not null default now()
);
create index if not exists recommendations_queue_idx on recommendations (status, created_at);

commit;
