-- 0002 · Ciudad y lugar (modelo de datos §1): City, Zone, CityWaitlist.
begin;

create table if not exists cities (
  id             text primary key,
  name           text not null,
  state          text not null,
  status         text not null default 'soon' check (status in ('on', 'soon', 'off')),
  center         geography(point, 4326) not null,
  radius_options smallint[] not null default '{2,5,10,30}',
  default_radius smallint not null default 5,
  timezone       text not null default 'America/New_York',
  tax_rate       numeric(5, 4) not null,
  zips           text[] not null default '{}',
  open_rule      jsonb not null default '{}'::jsonb,
  opened_at      timestamptz,
  closed_reason  text,
  sort           smallint not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists cities_center_gix on cities using gist (center);
create index if not exists cities_status_idx on cities (status);

create table if not exists zones (
  id       text not null,
  city_id  text not null references cities (id),
  name     jsonb not null,
  streets  jsonb,
  center   geography(point, 4326),
  primary key (city_id, id)
);
create index if not exists zones_center_gix on zones using gist (center);

create table if not exists city_waitlist (
  id          bigint generated always as identity primary key,
  city_id     text references cities (id),
  city_name   text,
  user_id     uuid,
  contact     text,
  wants       text[] not null default '{}',
  source      text not null check (source in ('city', 'coming_soon', 'search')),
  created_at  timestamptz not null default now(),
  notified_at timestamptz,
  check (city_id is not null or city_name is not null)
);
create index if not exists city_waitlist_city_idx on city_waitlist (city_id, created_at desc);

commit;
