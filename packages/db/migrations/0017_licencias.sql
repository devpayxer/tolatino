-- 0017 · Licencia (APP-NEG-LICENCIA): catálogo de licencias del diseño, estados reales de cada licencia, quién y cuándo
-- la revisó, y el derivado «licencias verificadas» que leen la ficha, la tarjeta y el filtro. Fase 1: Trámites y
-- profesionales (NEG-PRO).
begin;

-- Catálogo (TLPro.LIC + SRC + NO del diseño). El texto, el emisor y el registro oficial salen de aquí, nunca del dueño.
create table if not exists license_kinds (
  key           text primary key,
  category_id   text not null references categories (id),
  title         jsonb not null,
  can           jsonb not null,
  cannot        jsonb,
  issuer        jsonb not null,
  registry_site text not null,
  registry_url  text not null check (registry_url like 'https://%'),
  number_label  text not null,
  sort          smallint not null default 0
);

alter table licenses drop constraint if exists licenses_status_check;
alter table licenses add constraint licenses_status_check
  check (status in ('review', 'valid', 'expired', 'not_found', 'revoked', 'withdrawn'));
alter table licenses add column if not exists city_id text references cities (id);
update licenses l set city_id = b.city_id from businesses b where b.id = l.business_id and l.city_id is null;
alter table licenses alter column city_id set not null;
alter table licenses add column if not exists source text not null default 'panel' check (source in ('publica', 'panel', 'semilla'));
alter table licenses add column if not exists sort smallint not null default 0;
alter table licenses add column if not exists status_reason text;           -- motivo del equipo (no lo ve el cliente)
alter table licenses add column if not exists checked_at timestamptz;       -- ÚLTIMA REVISIÓN
alter table licenses add column if not exists checked_by uuid references users (id);
alter table licenses add column if not exists created_at timestamptz not null default now();
alter table licenses add column if not exists updated_at timestamptz not null default now();
alter table licenses drop constraint if exists licenses_number_len;
alter table licenses add constraint licenses_number_len check (number is null or (char_length(number) <= 40 and number ~ '^[A-Za-z0-9 #./-]+$'));
create unique index if not exists licenses_viva_idx on licenses (business_id, kind) where status <> 'withdrawn';
create index if not exists licenses_biz_idx on licenses (business_id, sort);
create index if not exists licenses_revision_idx on licenses (city_id, status, next_review);

-- Derivado (nunca editable): las claves con licencia verificada. Lo recalcula el servidor en cada decisión.
alter table business_stats_cache add column if not exists lic_valid text[] not null default '{}';
create index if not exists business_stats_cache_lic_idx on business_stats_cache using gin (lic_valid);

/* Recalcula el derivado y la marca «lic» del filtro «Licencia verificada» (NEG-PRO) de un negocio. */
create or replace function licencias_refrescar(bid text) returns void language sql as $$
  update business_stats_cache s set lic_valid = coalesce((select array_agg(l.kind order by l.sort) from licenses l where l.business_id = bid and l.status = 'valid'), '{}'), updated_at = now()
   where s.business_id = bid;
  update businesses b set filter_values = case
      when exists (select 1 from licenses l where l.business_id = bid and l.status = 'valid') then (case when 'lic' = any(b.filter_values) then b.filter_values else b.filter_values || '{lic}'::text[] end)
      else array_remove(b.filter_values, 'lic') end
   where b.id = bid and b.category_id = 'NEG-PRO';
$$;

commit;
