-- 0018 · Recuperar / reclamar negocio (ONB-NEG-RECUPERAR) y semillas desde recomendaciones (decisión I / D2).
-- Decisiones R1 (código por SMS al teléfono del negocio, no llamada) y R2 (con dueño: aviso en su panel + 7 días).
begin;

-- Reclamos: número legible, ciudad, prueba del código, dueño al momento de pedir, aviso al dueño, origen.
create sequence if not exists claims_num start 7101;
alter table claims alter column id set default 'CL-' || nextval('claims_num');
alter table claims add column if not exists city_id text references cities (id);
update claims c set city_id = b.city_id from businesses b where b.id = c.business_id and c.city_id is null;
alter table claims alter column city_id set not null;
alter table claims add column if not exists call_phone text check (call_phone ~ '^\+1[2-9][0-9]{9}$');   -- teléfono del negocio al que fue el código
alter table claims add column if not exists call_verified_at timestamptz;
alter table claims add column if not exists had_owner_id uuid references users (id);                       -- dueño cuando se pidió
alter table claims add column if not exists owner_notified_at timestamptz;                                 -- aviso al dueño (R2)
alter table claims add column if not exists source text not null default 'directo' check (source in ('publica', 'directo', 'semilla'));
alter table claims add column if not exists ip inet;
alter table claims drop constraint if exists claims_note_len;
alter table claims add constraint claims_note_len check (note is null or char_length(note) <= 300);
alter table claims drop constraint if exists claims_doc_ok;
alter table claims add constraint claims_doc_ok check (method <> 'document' or (doc_kind is not null and doc_media is not null));
alter table claims drop constraint if exists claims_call_ok;
alter table claims add constraint claims_call_ok check (method <> 'call_code' or (call_phone is not null and call_verified_at is not null));
create unique index if not exists claims_abierto_idx on claims (business_id, user_id) where status = 'pending';
create index if not exists claims_user_idx on claims (user_id, created_at desc);
create index if not exists claims_biz_idx on claims (business_id, created_at desc);

-- Documento del reclamo: privado (clave «privado/…», nginx nunca lo sirve; solo el equipo por una ruta con permiso).
alter table media add column if not exists private boolean not null default false;

-- Panel: el dueño anterior sale por un reclamo aprobado.
alter table business_members drop constraint if exists business_members_removed_reason_check;
alter table business_members add constraint business_members_removed_reason_check
  check (removed_reason in ('owner', 'declined', 'canceled', 'expired', 'left', 'claim'));

-- Cola «Cambios sensibles» (por ahora solo reclamos).
alter table queue_items drop constraint if exists queue_items_queue_check;
alter table queue_items add constraint queue_items_queue_check check (queue in ('sello', 'nuevo', 'lic', 'medios', 'rec', 'cambio'));
alter table queue_items drop constraint if exists queue_items_subject_kind_check;
alter table queue_items add constraint queue_items_subject_kind_check
  check (subject_kind in ('verification_request', 'business', 'license', 'media', 'recommendation', 'claim'));

-- Semillas (modelo SeedListing): solo desde una recomendación; no son negocios (sin ficha, sin panel, no salen en
-- Buscar ni en el Mapa). Salen al final de «También en {ciudad}» de su categoría hasta que el dueño las reclame.
create table if not exists seed_listings (
  id                bigint generated always as identity primary key,
  recommendation_id bigint not null unique references recommendations (id),
  city_id           text not null references cities (id),
  category_id       text not null references categories (id),
  name              text not null check (char_length(name) between 2 and 80),
  "where"           text not null check ("where" in ('address', 'sin_local')),
  address           text,
  phone             text check (phone ~ '^\+1[2-9][0-9]{9}$'),
  status            text not null default 'shown' check (status in ('shown', 'claimed', 'removed')),
  business_id       text references businesses (id),
  created_by        uuid not null references users (id),
  created_at        timestamptz not null default now(),
  claimed_at        timestamptz,
  removed_at        timestamptz, removed_by uuid references users (id), removed_reason text
);
create index if not exists seed_listings_cat_idx on seed_listings (city_id, category_id, status, created_at desc);
create index if not exists seed_listings_name_trgm on seed_listings using gin (lower(name) gin_trgm_ops);
alter table recommendations add column if not exists seed_id bigint references seed_listings (id);
-- «Llamar» desde una semilla: el toque todavía no tiene negocio.
alter table contact_taps alter column business_id drop not null;
alter table contact_taps add column if not exists seed_id bigint references seed_listings (id);
alter table contact_taps drop constraint if exists contact_taps_destino;
alter table contact_taps add constraint contact_taps_destino check (business_id is not null or seed_id is not null);

commit;
