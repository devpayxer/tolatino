-- 0001 · Base: extensiones, auditoría inmutable, textos de interfaz, interruptores y configuración.
-- Idempotente. Reglas: nada se borra (estados), la auditoría solo se agrega, ciudad como dimensión.
begin;

create extension if not exists postgis;
create extension if not exists pg_trgm;
create extension if not exists unaccent;
create extension if not exists citext;
create extension if not exists pgcrypto;

-- Auditoría: quién, qué, antes → después, motivo, cuándo. Solo se agrega; un trigger impide cambiarla o borrarla.
create table if not exists audit_entries (
  id          bigint generated always as identity primary key,
  at          timestamptz not null default now(),
  actor_kind  text not null check (actor_kind in ('staff', 'user', 'system')),
  actor_id    text,
  action      text not null,
  target_kind text not null,
  target_id   text,
  city_id     text,
  before      jsonb,
  after       jsonb,
  reason      text,
  meta        jsonb not null default '{}'::jsonb
);
create index if not exists audit_entries_target_idx on audit_entries (target_kind, target_id, at desc);
create index if not exists audit_entries_actor_idx on audit_entries (actor_kind, actor_id, at desc);
create index if not exists audit_entries_city_idx on audit_entries (city_id, at desc);

create or replace function audit_entries_inmutable() returns trigger language plpgsql as $$
begin
  raise exception 'audit_entries es solo de inserción (% no permitido)', tg_op;
end $$;
drop trigger if exists audit_entries_no_cambia on audit_entries;
create trigger audit_entries_no_cambia before update or delete on audit_entries
  for each row execute function audit_entries_inmutable();

-- Textos de interfaz ES/EN, editables desde el Super Admin › Textos y páginas.
create table if not exists cms_strings (
  key        text primary key,
  es         text not null,
  en         text,
  screen     text,
  updated_at timestamptz not null default now(),
  updated_by text
);

-- Interruptores: global, por ciudad, por porcentaje.
create table if not exists feature_flags (
  key        text primary key,
  enabled    boolean not null default false,
  cities     text[] not null default '{}',
  percent    smallint not null default 100 check (percent between 0 and 100),
  note       text,
  updated_at timestamptz not null default now(),
  updated_by text
);

-- Configuración de plataforma (precios, techos, plazos). Clave → valor JSON.
create table if not exists platform_config (
  key        text primary key,
  value      jsonb not null,
  note       text,
  updated_at timestamptz not null default now(),
  updated_by text
);

commit;
