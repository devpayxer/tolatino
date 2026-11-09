-- 0106 · eventos_base (6a · docs/diseno/plan/fase6-eventos.md §2 0106 y §4 6a).
-- · Catálogo de formatos (noche · comida · clase · fe · comunidad: qué campos y qué palabras trae cada uno, TLEvP.FMT), qué formatos
--   publica cada categoría (TLEvP.CAT; el resto: comunidad y clase) y géneros de música (TLEvP.GEN). Editable desde el Super Admin
--   (hueco #8, 6j), con auditoría.
-- · events: el evento del negocio (el organizador siempre es un negocio). Estados draft · review · changes · live · paused ·
--   cancelled · rejected · done (agotado es derivado). Lo que oculta To'Latino va aparte (hidden_*) para que volver a mostrar
--   devuelva el estado. Un cambio que importa (fecha, hora, puertas, lugar, edad, entrada) en un evento publicado de un organizador
--   sin verificar NO toca la fila: se guarda en `pending` y vuelve a la cola; la versión anterior sigue en vivo hasta decidir.
--   `version` sube con cada cambio que importa aplicado. Boletos, mesas y extras se guardan como configuración (tickets_cfg,
--   tables_cfg, addons_cfg) y NO se venden hasta 6c, que los pasa a ticket_types / event_tables / event_addons (0108).
-- · event_dates: una fila por fecha (6a: un evento de un día = una fecha; series y varios días en 6f). `listable` lo deriva la base
--   (evento live/paused, aprobado, sin ocultar, fecha programada): ninguna fecha sale al público sin revisión.
-- · event_lineup (line-up / programa; una línea quitada queda con removed_at), event_review_log (solo inserción: cada envío y cada
--   decisión con lo que se revisó), event_organizers (verificado = publica sin revisión previa; bloqueado = no publica, con motivo,
--   aviso y apelación).
-- · La base impide publicar sin revisión: `live` exige approved_at; aprobar sin persona (approved_by null) solo con el organizador
--   verificado; un organizador bloqueado no envía ni publica (trigger events_antes). Guardián revisionAntesDePublicar.
-- · Extras: solo detalle · material · servicio · otro, y nunca alcohol, botellas ni hookah (la app no los vende; guardián
--   alcoholNoSeVende): lo revisa el servidor y lo vuelve a imponer la base.
-- · Cola «evt» (Eventos a revisar; plazo = Configuración › evt_revision_h), apelaciones de un evento oculto o no aprobado y de un
--   bloqueo de organizador (appeals.target_kind 'event' · 'evt_org'), plantillas evt_* (SMS solo evt_aprobado y evt_rechazado) y las
--   claves de Configuración de la sección «eventos».
-- Idempotente: if not exists, checks que se reemplazan, triggers que se recrean, catálogos on conflict. Nada se borra.
begin;

-- ── Catálogo: formatos, formatos por categoría y géneros ──
create table if not exists event_formats (
  key     text primary key check (key in ('noche', 'comida', 'clase', 'fe', 'comunidad')),
  label   jsonb not null check (label ? 'es' and label ? 'en'),
  sub     jsonb not null check (sub ? 'es' and sub ? 'en'),
  icon    text not null,
  dark    boolean not null default false,
  ages    smallint[] not null check (cardinality(ages) between 1 and 4 and ages <@ array[0, 12, 18, 21]::smallint[]),
  fields  jsonb not null check (jsonb_typeof(fields) = 'object'),
  enabled boolean not null default true,
  sort    smallint not null default 0
);
insert into event_formats (key, label, sub, icon, dark, ages, sort, fields) values
  ('noche', '{"es":"Fiesta o show","en":"Party or show"}', '{"es":"DJ, artista en vivo o noche temática. Boletos, mesas con consumo mínimo y extras.","en":"DJ, live artist or theme night. Tickets, tables with minimum spend and extras."}',
    'drink', true, '{0,18,21}', 1,
    '{"entry":"tickets","age0":21,"mesas":true,"adds":true,"gen":true,"dress":true,"party":false,"kids":null,"payAt":false,"h0":1320,"len":240,"dr":60,
      "luL":{"es":"Line-up","en":"Line-up"},"luWho":{"es":"Artista o DJ","en":"Artist or DJ"},"luRole":{"es":"Ej. Set principal","en":"e.g. Main set"},
      "tkL":{"es":"Boletos","en":"Tickets"},"cntL":{"es":"boletos","en":"tickets"},"tk1":{"es":"Boleto","en":"Ticket"},"tixL":{"es":"Con boletos","en":"Ticketed"},
      "freeL":{"es":"Entrada libre · RSVP","en":"Free entry · RSVP"},"galL":{"es":"El ambiente","en":"The vibe"},"cta":{"es":"Boletos","en":"Tickets"},
      "tk0":{"es":"Entrada general","en":"General admission"},"p0":1500,"c0":100,"ph":{"es":"Ej. Jueves de bachata en vivo","en":"e.g. Live bachata Thursday"}}'),
  ('comida', '{"es":"Comida y música","en":"Food and music"}', '{"es":"Sancocho del domingo, cena especial, partido en pantalla grande. Casi siempre entrada libre con RSVP.","en":"Sunday sancocho, special dinner, game on the big screen. Usually free entry with RSVP."}',
    'restaurant', false, '{0,18,21}', 2,
    '{"entry":"rsvp","age0":0,"mesas":false,"adds":true,"gen":false,"dress":false,"party":true,"kids":"fam","payAt":true,"h0":780,"len":180,"dr":0,
      "luL":{"es":"Programa","en":"Schedule"},"luWho":{"es":"Qué pasa","en":"What happens"},"luRole":{"es":"Ej. Música en vivo","en":"e.g. Live music"},
      "tkL":{"es":"Entradas","en":"Tickets"},"cntL":{"es":"entradas","en":"tickets"},"tk1":{"es":"Entrada","en":"Ticket"},"tixL":{"es":"Con precio","en":"Paid"},
      "freeL":{"es":"Entrada libre · RSVP","en":"Free entry · RSVP"},"galL":{"es":"Fotos","en":"Photos"},"cta":{"es":"Reservar","en":"Book"},
      "tk0":{"es":"Cena completa","en":"Full dinner"},"p0":2500,"c0":40,"ph":{"es":"Ej. Sancocho del domingo en familia","en":"e.g. Family Sunday sancocho"}}'),
  ('clase', '{"es":"Clase o taller","en":"Class or workshop"}', '{"es":"Bizcocho, salsa, inglés, finanzas. Cupo limitado, pagado o gratis.","en":"Cake, salsa, English, finances. Limited spots, paid or free."}',
    'edit', false, '{0,12,18}', 3,
    '{"entry":"tickets","age0":0,"mesas":false,"adds":true,"gen":false,"dress":false,"party":false,"kids":null,"payAt":false,"h0":1080,"len":120,"dr":0,
      "luL":{"es":"Programa","en":"Schedule"},"luWho":{"es":"Qué se hace","en":"What you do"},"luRole":{"es":"Ej. Con la profe Miriam","en":"e.g. With teacher Miriam"},
      "tkL":{"es":"Cupos","en":"Spots"},"cntL":{"es":"cupos","en":"spots"},"tk1":{"es":"Cupo","en":"Spot"},"tixL":{"es":"Cupo pagado","en":"Paid spot"},
      "freeL":{"es":"Gratis · con cupo","en":"Free · limited spots"},"galL":{"es":"Fotos","en":"Photos"},"cta":{"es":"Reservar cupo","en":"Book a spot"},
      "tk0":{"es":"Cupo en la clase","en":"Class spot"},"p0":2000,"c0":12,"ph":{"es":"Ej. Clase de bizcocho dominicano","en":"e.g. Dominican cake class"}}'),
  ('fe', '{"es":"Culto, vigilia o retiro","en":"Service, vigil or retreat"}', '{"es":"Alabanza, oración, retiro o conferencia. Entrada libre con RSVP o inscripción.","en":"Worship, prayer, retreat or conference. Free with RSVP or registration."}',
    'heart', false, '{0}', 4,
    '{"entry":"rsvp","age0":0,"mesas":false,"adds":false,"gen":false,"dress":false,"party":true,"kids":"care","payAt":false,"h0":1140,"len":180,"dr":30,
      "luL":{"es":"Programa","en":"Program"},"luWho":{"es":"Quién o qué","en":"Who or what"},"luRole":{"es":"Ej. Alabanza","en":"e.g. Worship"},
      "tkL":{"es":"Inscripción","en":"Registration"},"cntL":{"es":"inscritos","en":"registered"},"tk1":{"es":"Inscripción","en":"Registration"},"tixL":{"es":"Con inscripción","en":"With registration"},
      "freeL":{"es":"Entrada libre · RSVP","en":"Free entry · RSVP"},"galL":{"es":"Fotos","en":"Photos"},"cta":{"es":"Inscribirme","en":"Register"},
      "tk0":{"es":"Inscripción","en":"Registration"},"p0":1500,"c0":40,"ph":{"es":"Ej. Vigilia de oración y alabanza","en":"e.g. Prayer and worship vigil"}}'),
  ('comunidad', '{"es":"Comunitario o benéfico","en":"Community or charity"}', '{"es":"Día familiar, colecta de juguetes, feria, torneo o festival. Casi siempre gratis.","en":"Family day, toy drive, fair, tournament or festival. Usually free."}',
    'users', false, '{0,18,21}', 5,
    '{"entry":"rsvp","age0":0,"mesas":false,"adds":false,"gen":false,"dress":false,"party":true,"kids":"fam","payAt":false,"h0":720,"len":300,"dr":0,
      "luL":{"es":"Programa","en":"Schedule"},"luWho":{"es":"Qué pasa","en":"What happens"},"luRole":{"es":"Ej. Final del torneo","en":"e.g. Tournament final"},
      "tkL":{"es":"Entradas","en":"Tickets"},"cntL":{"es":"entradas","en":"tickets"},"tk1":{"es":"Entrada","en":"Ticket"},"tixL":{"es":"Entrada pagada","en":"Paid entry"},
      "freeL":{"es":"Gratis · RSVP","en":"Free · RSVP"},"galL":{"es":"Fotos","en":"Photos"},"cta":{"es":"Entradas","en":"Tickets"},
      "tk0":{"es":"Entrada general","en":"General admission"},"p0":1000,"c0":100,"ph":{"es":"Ej. Feria de salud en el parque","en":"e.g. Health fair in the park"}}')
on conflict (key) do nothing;

create table if not exists event_format_categories (
  category_id text not null references categories (id),
  format      text not null references event_formats (key),
  sort        smallint not null default 0,
  primary key (category_id, format)
);
-- TLEvP.CAT; las categorías que no están ahí publican comunidad y clase.
insert into event_format_categories (category_id, format, sort)
select c, f, s from (values
  ('NEG-NOCHE', 'noche', 1), ('NEG-NOCHE', 'comida', 2), ('NEG-NOCHE', 'clase', 3), ('NEG-NOCHE', 'comunidad', 4),
  ('NEG-FIESTA', 'noche', 1), ('NEG-FIESTA', 'comunidad', 2),
  ('NEG-FOOD', 'comida', 1), ('NEG-FOOD', 'noche', 2), ('NEG-FOOD', 'clase', 3), ('NEG-FOOD', 'comunidad', 4),
  ('NEG-FE', 'fe', 1), ('NEG-FE', 'comunidad', 2),
  ('NEG-DEPORTE', 'comunidad', 1), ('NEG-DEPORTE', 'clase', 2),
  ('NEG-EDU', 'clase', 1), ('NEG-EDU', 'comunidad', 2),
  ('NEG-NINOS', 'clase', 1), ('NEG-NINOS', 'comunidad', 2),
  ('NEG-MERC', 'comunidad', 1), ('NEG-MERC', 'comida', 2), ('NEG-MERC', 'clase', 3),
  ('NEG-TIENDA', 'comunidad', 1), ('NEG-TIENDA', 'clase', 2)
) as x (c, f, s) where exists (select 1 from categories where id = x.c)
on conflict do nothing;
insert into event_format_categories (category_id, format, sort)
select c.id, f.f, f.s from categories c cross join (values ('comunidad', 1), ('clase', 2)) as f (f, s)
 where c.id not in ('NEG-NOCHE', 'NEG-FIESTA', 'NEG-FOOD', 'NEG-FE', 'NEG-DEPORTE', 'NEG-EDU', 'NEG-NINOS', 'NEG-MERC', 'NEG-TIENDA')
on conflict do nothing;

create table if not exists event_genres (
  key     text primary key check (key ~ '^[a-z]{2,20}$'),
  label   jsonb not null check (label ? 'es' and label ? 'en'),
  sort    smallint not null default 0,
  enabled boolean not null default true
);
insert into event_genres (key, label, sort) values
  ('bachata', '{"es":"Bachata","en":"Bachata"}', 1), ('merengue', '{"es":"Merengue","en":"Merengue"}', 2), ('salsa', '{"es":"Salsa","en":"Salsa"}', 3),
  ('dembow', '{"es":"Dembow","en":"Dembow"}', 4), ('reggaeton', '{"es":"Reggaetón","en":"Reggaeton"}', 5), ('tipico', '{"es":"Típico","en":"Típico"}', 6),
  ('variado', '{"es":"Variado","en":"Mixed"}', 7)
on conflict (key) do nothing;

-- ── Organizadores ──
create table if not exists event_organizers (
  business_id    text primary key references businesses (id),
  city_id        text not null references cities (id),
  verified_at    timestamptz,
  verified_by    uuid references users (id),
  blocked_at     timestamptz,
  blocked_by     uuid references users (id),
  blocked_reason text check (char_length(blocked_reason) <= 500),
  updated_at     timestamptz not null default now(),
  check ((blocked_at is null) = (blocked_reason is null)),
  check (verified_at is null or blocked_at is null)
);
create index if not exists event_organizers_ciudad_idx on event_organizers (city_id) where verified_at is not null or blocked_at is not null;

-- ── El evento ──
-- Un extra nunca es alcohol, botellas ni hookah (la app no los vende): nombres que lo dicen y tipos fuera de la lista se rechazan.
create or replace function evt_extras_ok(a jsonb) returns boolean language sql immutable as $$
  select jsonb_typeof(a) = 'array' and jsonb_array_length(a) <= 12 and not exists (
    select 1 from jsonb_array_elements(a) x
     where coalesce(x->>'kind', '') not in ('detalle', 'material', 'servicio', 'otro')
        or lower(coalesce(x->'name'->>'es', '') || ' ' || coalesce(x->'name'->>'en', '') || ' ' || coalesce(x->'desc'->>'es', '') || ' ' || coalesce(x->'desc'->>'en', ''))
           ~ '(botell|bottle|hookah|huka|cachimba|narguil|trago|shot|cerveza|beer|licor|liquor|whisk|vodka|tequila|ron |rum |brandy|champ[aá]n|champagne|vino|wine|alcohol|cubeta|bucket|open bar|barra libre)')
$$;

create table if not exists events (
  id                 bigint generated always as identity primary key,
  slug               text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  city_id            text not null references cities (id),
  business_id        text not null references businesses (id),
  format             text not null references event_formats (key),
  title              jsonb not null check (jsonb_typeof(title) = 'object' and char_length(btrim(coalesce(title->>'es', ''))) between 3 and 70 and char_length(coalesce(title->>'en', '')) <= 70),
  description        jsonb not null default '{"es":"","en":""}' check (char_length(coalesce(description->>'es', '')) <= 400 and char_length(coalesce(description->>'en', '')) <= 400),
  genres             text[] not null default '{}' check (cardinality(genres) <= 3),
  min_age            smallint not null default 0 check (min_age in (0, 12, 18, 21)),
  id_required        boolean not null default false,
  reentry            boolean not null default false,
  dress_code         jsonb check (dress_code is null or (char_length(coalesce(dress_code->>'es', '')) <= 80 and char_length(coalesce(dress_code->>'en', '')) <= 80)),
  kids               text check (kids in ('fam', 'care')),
  food_paid_at_venue boolean not null default false,
  before_you_go      jsonb not null default '[]' check (jsonb_typeof(before_you_go) = 'array' and jsonb_array_length(before_you_go) <= 6),
  venue_mode         text not null default 'own' check (venue_mode in ('own', 'other')),
  venue_name         text check (char_length(venue_name) <= 60),
  venue_address      text check (char_length(venue_address) <= 100),
  geom               geography(Point, 4326),
  -- Cuándo (6a: un solo día). Minutos desde la medianoche local del día; el final puede pasar de 1440 (la 1 AM del día siguiente = 1500).
  kind               text not null default 'single' check (kind in ('single', 'series', 'span')),
  start_date         date not null,
  start_min          smallint not null check (start_min between 0 and 1439),
  end_min            smallint not null,
  doors_before_min   smallint not null default 0 check (doors_before_min in (0, 30, 60)),
  rep                jsonb,
  span_days          smallint not null default 1 check (span_days between 1 and 30),
  -- Entrada (sin «pagar en la puerta»: D1). Boletos, mesas y extras: configuración guardada, se venden desde 6c.
  entry              text not null check (entry in ('free', 'rsvp', 'tickets')),
  rsvp_capacity      integer not null default 0 check (rsvp_capacity between 0 and 20000),
  party_max          smallint not null default 1 check (party_max between 1 and 10),
  door_count         boolean not null default false,
  sales_until        text not null default 'start' check (sales_until in ('start', 'doors', 'day_before')),
  max_per_person     smallint check (max_per_person between 1 and 50),
  tickets_cfg        jsonb not null default '[]' check (jsonb_typeof(tickets_cfg) = 'array' and jsonb_array_length(tickets_cfg) <= 16),
  tables_cfg         jsonb not null default '[]' check (jsonb_typeof(tables_cfg) = 'array' and jsonb_array_length(tables_cfg) <= 12),
  addons_cfg         jsonb not null default '[]' check (evt_extras_ok(addons_cfg)),
  -- Estado y revisión
  status             text not null default 'draft' check (status in ('draft', 'review', 'changes', 'live', 'paused', 'cancelled', 'rejected', 'done')),
  submitted_at       timestamptz,
  approved_at        timestamptz,
  approved_by        uuid references users (id),
  reviewed_at        timestamptz,
  reviewed_by        uuid references users (id),
  review_reason_key  text,
  review_note        text check (char_length(review_note) <= 500),
  -- Un cambio que importa esperando revisión (la versión anterior sigue en vivo).
  pending            jsonb check (pending is null or jsonb_typeof(pending) = 'object'),
  pending_status     text check (pending_status in ('review', 'changes', 'rejected')),
  pending_at         timestamptz,
  pending_note       text check (char_length(pending_note) <= 500),
  hidden_at          timestamptz,
  hidden_by          uuid references users (id),
  hidden_reason      text check (char_length(hidden_reason) <= 500),
  cancel_reason      text check (char_length(cancel_reason) <= 500),
  cancelled_at       timestamptz,
  cancelled_by       text check (cancelled_by in ('business', 'admin')),
  version            integer not null default 1 check (version >= 1),
  origin             text not null default 'panel' check (origin in ('panel', 'publica')),
  tsv                tsvector,
  created_by         uuid references users (id),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (city_id, slug),
  check (end_min > start_min and end_min <= start_min + 720),
  check (venue_mode = 'own' or (char_length(btrim(coalesce(venue_name, ''))) >= 2 and char_length(btrim(coalesce(venue_address, ''))) >= 4)),
  -- Nada se publica sin aprobar (una persona del equipo, o el sistema si el organizador está verificado).
  check (status not in ('live', 'paused', 'done') or approved_at is not null),
  check ((hidden_at is null) = (hidden_reason is null)),
  check ((pending is null) = (pending_status is null)),
  check (entry = 'tickets' or (tickets_cfg = '[]'::jsonb and tables_cfg = '[]'::jsonb and addons_cfg = '[]'::jsonb))
);
create index if not exists events_negocio_idx on events (business_id, status);
create index if not exists events_tsv_idx on events using gin (tsv);
create index if not exists events_ciudad_idx on events (city_id, status) where hidden_at is null;
create index if not exists events_revision_idx on events (submitted_at) where status = 'review' or pending_status = 'review';

-- Antes de guardar: slug, búsqueda, y las reglas que la base impone aunque el código falle.
create or replace function events_antes() returns trigger language plpgsql as $$
declare o event_organizers;
begin
  if tg_op = 'DELETE' then raise exception 'un evento no se borra: se cancela o se oculta (estados)'; end if;
  if tg_op = 'INSERT' or new.slug is null or new.slug = '' then
    new.slug := coalesce(nullif(trim(both '-' from left(regexp_replace(lower(unaccent(coalesce(new.title->>'es', ''))), '[^a-z0-9]+', '-', 'g'), 50)), ''), 'evento') || '-' || new.id;
  end if;
  new.tsv := to_tsvector('simple', unaccent(coalesce(new.title->>'es', '') || ' ' || coalesce(new.title->>'en', '') || ' ' || coalesce(new.venue_name, '') || ' ' || array_to_string(new.genres, ' ')));
  new.updated_at := now();
  select * into o from event_organizers where business_id = new.business_id;
  -- Un organizador bloqueado no envía a revisión ni publica.
  if new.status in ('review', 'live') and (tg_op = 'INSERT' or old.status is distinct from new.status) and o.blocked_at is not null then
    raise exception 'el organizador está bloqueado: no puede publicar eventos';
  end if;
  if new.pending_status = 'review' and (tg_op = 'INSERT' or old.pending_status is distinct from 'review') and o.blocked_at is not null then
    raise exception 'el organizador está bloqueado: no puede publicar eventos';
  end if;
  -- Revisión antes de publicar: pasar a live sin persona que apruebe solo con el organizador verificado.
  if new.status = 'live' and (tg_op = 'INSERT' or old.status not in ('live', 'paused')) then
    if new.approved_at is null then raise exception 'un evento se publica solo aprobado'; end if;
    if new.approved_by is null and o.verified_at is null then raise exception 'sin revisión solo publica un organizador verificado'; end if;
  end if;
  return new;
end $$;
drop trigger if exists events_antes on events;
create trigger events_antes before insert or update or delete on events for each row execute function events_antes();

-- ── Fechas ──
create table if not exists event_dates (
  id              bigint generated always as identity primary key,
  event_id        bigint not null references events (id),
  city_id         text not null references cities (id),
  starts_at       timestamptz not null,
  ends_at         timestamptz not null,
  doors_at        timestamptz not null,
  local_date      date not null,
  day_index       smallint not null default 0 check (day_index between 0 and 29),
  status          text not null default 'scheduled' check (status in ('scheduled', 'skipped', 'cancelled', 'done')),
  cancel_reason   text check (char_length(cancel_reason) <= 500),
  lineup_override jsonb,
  day_capacity    integer not null default 0 check (day_capacity >= 0),
  geom            geography(Point, 4326),
  listable        boolean not null default false,
  -- Derivados (los llevan sus triggers en 6b–6g; nunca se editan a mano).
  sold_n          integer not null default 0 check (sold_n >= 0),
  rsvp_n          integer not null default 0 check (rsvp_n >= 0),
  going_n         integer not null default 0 check (going_n >= 0),
  inside_n        integer not null default 0 check (inside_n >= 0),
  entered_n       integer not null default 0 check (entered_n >= 0),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (ends_at > starts_at and doors_at <= starts_at),
  unique (event_id, starts_at)
);
create index if not exists event_dates_lista_idx on event_dates (city_id, starts_at, id) where listable;
create index if not exists event_dates_geom_idx on event_dates using gist (geom) where listable;
create index if not exists event_dates_evento_idx on event_dates (event_id, starts_at);

-- listable lo decide la base: evento publicado y aprobado, sin ocultar, fecha programada.
create or replace function evt_listable(e events, st text) returns boolean language sql immutable as $$
  select e.status in ('live', 'paused') and e.approved_at is not null and e.hidden_at is null and st = 'scheduled'
$$;
create or replace function event_dates_antes() returns trigger language plpgsql as $$
declare e events;
begin
  if tg_op = 'DELETE' then raise exception 'una fecha no se borra: se salta o se cancela'; end if;
  select * into e from events where id = new.event_id;
  new.listable := evt_listable(e, new.status);
  new.city_id := e.city_id;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists event_dates_antes on event_dates;
create trigger event_dates_antes before insert or update or delete on event_dates for each row execute function event_dates_antes();

create or replace function events_despues() returns trigger language plpgsql as $$
begin
  update event_dates d set listable = evt_listable(new, d.status), city_id = new.city_id, geom = new.geom
   where d.event_id = new.id and (d.listable is distinct from evt_listable(new, d.status) or d.city_id <> new.city_id or d.geom is distinct from new.geom);
  return null;
end $$;
drop trigger if exists events_despues on events;
create trigger events_despues after update on events for each row execute function events_despues();

-- La fecha de un evento de un día sale de la fila del evento (día, hora y puertas en la zona de su ciudad). Idempotente; una fecha
-- con ventas no se mueve aquí (cambiar fecha con ventas es 6e). 6f la amplía a series y varios días.
create or replace function evt_sincronizar_fechas(eid bigint) returns void language plpgsql as $$
declare e events; tz text; s timestamptz; f timestamptz; p timestamptz; d event_dates;
begin
  select * into e from events where id = eid for update;
  if not found then return; end if;
  select timezone into tz from cities where id = e.city_id;
  s := (e.start_date::timestamp + make_interval(mins => e.start_min)) at time zone tz;
  f := (e.start_date::timestamp + make_interval(mins => e.end_min)) at time zone tz;
  p := s - make_interval(mins => e.doors_before_min);
  select * into d from event_dates where event_id = eid and day_index = 0 and status in ('scheduled', 'done') order by starts_at limit 1;
  if not found then
    insert into event_dates (event_id, city_id, starts_at, ends_at, doors_at, local_date, day_index, geom)
    values (eid, e.city_id, s, f, p, e.start_date, 0, e.geom) on conflict (event_id, starts_at) do nothing;
  elsif d.sold_n = 0 and (d.starts_at, d.ends_at, d.doors_at, d.local_date) is distinct from (s, f, p, e.start_date) then
    update event_dates set starts_at = s, ends_at = f, doors_at = p, local_date = e.start_date, geom = e.geom where id = d.id;
  end if;
end $$;

-- ── Line-up / programa ──
create table if not exists event_lineup (
  id         bigint generated always as identity primary key,
  event_id   bigint not null references events (id),
  day_index  smallint not null default 0 check (day_index between 0 and 29),
  at_min     smallint not null check (at_min between 0 and 2879),
  who        text not null check (char_length(btrim(who)) between 1 and 60),
  role       jsonb not null default '{"es":"","en":""}' check (char_length(coalesce(role->>'es', '')) <= 60 and char_length(coalesce(role->>'en', '')) <= 60),
  sort       smallint not null default 0,
  removed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists event_lineup_evento_idx on event_lineup (event_id, day_index, at_min) where removed_at is null;

-- ── Revisión: solo inserción ──
create table if not exists event_review_log (
  id         bigint generated always as identity primary key,
  event_id   bigint not null references events (id),
  city_id    text not null references cities (id),
  version    integer not null,
  decision   text not null check (decision in ('submitted', 'approved', 'changes', 'rejected', 'resubmitted')),
  reason_key text,
  note       text check (char_length(note) <= 500),
  by_user    uuid references users (id),
  by_kind    text not null check (by_kind in ('business', 'staff', 'auto')),
  snapshot   jsonb not null,
  at         timestamptz not null default now()
);
create index if not exists event_review_log_evento_idx on event_review_log (event_id, at desc);
create or replace function event_review_log_inmutable() returns trigger language plpgsql as $$
begin raise exception 'event_review_log es solo de inserción'; end $$;
drop trigger if exists event_review_log_no_cambia on event_review_log;
create trigger event_review_log_no_cambia before update or delete on event_review_log for each row execute function event_review_log_inmutable();

-- ── Cola «Eventos a revisar» ──
alter table queue_items drop constraint if exists queue_items_queue_check;
alter table queue_items add constraint queue_items_queue_check check (queue = any (array['sello', 'nuevo', 'lic', 'medios', 'rec', 'cambio', 'rep', 'sop', 'chat', 'disputa', 'renta', 'mesa', 'noid',
  'cuidado', 'salir', 'grupo', 'plantones', 'estafa', 'vivienda', 'repUsr', 'apel', 'evt']));
alter table queue_items drop constraint if exists queue_items_subject_kind_check;
alter table queue_items add constraint queue_items_subject_kind_check check (subject_kind = any (array['verification_request', 'business', 'license', 'media', 'recommendation', 'claim',
  'sensitive_change', 'review', 'help_request', 'chat_thread', 'dispute', 'rental', 'listing', 'dm_thread', 'user', 'appeal', 'com_post', 'com_comment', 'event']));

-- Quién ve Eventos y boletos (adm-data.js PERM: verificador, moderador, soporte, finanzas y lectura solo ven).
update role_permissions set allowed = true where section = 'evt' and action = 'ver' and role in ('moderador', 'soporte', 'finanzas', 'verificador', 'lectura') and not allowed;

-- ── Apelar un evento oculto o no aprobado, y un bloqueo de organizador (lo apela el dueño del negocio) ──
alter table appeals drop constraint if exists appeals_target_kind_check;
alter table appeals add constraint appeals_target_kind_check check (target_kind in ('com_post', 'com_comment', 'dm_message', 'media', 'sanction', 'event', 'evt_org'));

create or replace function appeals_antes() returns trigger language plpgsql as $$
declare x record;
begin
  if tg_op = 'DELETE' then raise exception 'una apelación no se borra'; end if;
  if tg_op = 'UPDATE' then
    if old.status <> 'open' then raise exception 'una apelación decidida no cambia'; end if;
    if (new.user_id, new.city_id, new.target_kind, new.target_id, new.sanction_id, new.sanctioned_by, new.hidden_reason, new.text, new.created_at, new.number)
       is distinct from (old.user_id, old.city_id, old.target_kind, old.target_id, old.sanction_id, old.sanctioned_by, old.hidden_reason, old.text, old.created_at, old.number) then
      raise exception 'de una apelación solo cambia la decisión';
    end if;
    if new.status = 'open' then raise exception 'decidir una apelación es mantener (upheld) o levantar (lifted)'; end if;
    if new.decided_by is null then raise exception 'la decisión dice quién la tomó'; end if;
    if new.decided_by = old.user_id then raise exception 'nadie decide su propia apelación'; end if;
    if old.sanctioned_by is not null and new.decided_by = old.sanctioned_by then raise exception 'la apelación la decide otra persona, no quien sancionó'; end if;
    new.decided_at := coalesce(new.decided_at, now());
    return new;
  end if;
  new.status := 'open'; new.decided_by := null; new.decided_at := null; new.decision_reason := null;
  if new.target_kind = 'com_post' then
    select p.hidden_staff_id as por, p.hidden_reason as motivo, p.city_id as ciudad into x from com_posts p
     where p.id::text = new.target_id and p.author_user_id = new.user_id and p.status = 'hidden';
  elsif new.target_kind = 'com_comment' then
    select c.hidden_staff_id as por, c.hidden_reason as motivo, c.city_id as ciudad into x from com_comments c
     where c.id::text = new.target_id and c.author_user_id = new.user_id and c.status = 'hidden';
  elsif new.target_kind = 'dm_message' then
    select m.hidden_by as por, m.hidden_reason as motivo, m.city_id as ciudad into x from dm_messages m
     where m.id::text = new.target_id and m.sender_user_id = new.user_id and m.hidden_at is not null;
  elsif new.target_kind = 'media' then
    select m.removed_by as por, m.removed_note as motivo, p.city_id as ciudad into x from media m join com_posts p on m.owner_kind = 'com_post' and p.id::text = m.owner_id
     where m.id::text = new.target_id and m.uploaded_by = new.user_id and m.status = 'removed' and m.removed_reason = 'admin';
  elsif new.target_kind = 'event' then
    -- 6a · lo apela el dueño del negocio organizador: un evento oculto por To'Latino o no aprobado.
    select case when e.hidden_at is not null then e.hidden_by else e.reviewed_by end as por, coalesce(e.hidden_reason, e.review_note) as motivo, e.city_id as ciudad into x
      from events e join business_members m on m.business_id = e.business_id and m.kind = 'owner' and m.status = 'active' and m.user_id = new.user_id
     where e.id::text = new.target_id and (e.hidden_at is not null or e.status = 'rejected');
  elsif new.target_kind = 'evt_org' then
    select o.blocked_by as por, o.blocked_reason as motivo, o.city_id as ciudad into x
      from event_organizers o join business_members m on m.business_id = o.business_id and m.kind = 'owner' and m.status = 'active' and m.user_id = new.user_id
     where o.business_id = new.target_id and o.blocked_at is not null;
  else
    select s.by_staff as por, s.reason as motivo, s.city_id as ciudad, s.id as sid into x from sanctions s
     where s.id::text = new.target_id and s.target_kind = 'user' and s.target_id = new.user_id::text and s.lifted_at is null and (s.ends_at is null or s.ends_at > now());
    if not found then raise exception 'no hay nada oculto ni sanción vigente que apelar'; end if;
    new.sanction_id := x.sid;
  end if;
  if not found then raise exception 'no hay nada oculto ni sanción vigente que apelar'; end if;
  new.sanctioned_by := x.por; new.hidden_reason := left(x.motivo, 500); new.city_id := coalesce(x.ciudad, new.city_id);
  return new;
end $$;
drop trigger if exists appeals_antes on appeals;
create trigger appeals_antes before insert or update or delete on appeals for each row execute function appeals_antes();

-- ── Avisos al organizador (SMS solo evt_aprobado y evt_rechazado: lo dice Publica tu evento) ──
insert into notif_templates (key, grp, pref, sms, title, body) values
  ('evt_revision', 'biz', null, false, '{"es":"Tu evento está en revisión","en":"Your event is under review"}', '{"es":"«{evento}»: To''Latino lo revisa en {horas} h. Nada se publica antes; te avisamos.","en":"«{evento}»: To''Latino reviews it within {horas} h. Nothing goes live before; we will let you know."}'),
  ('evt_aprobado', 'biz', null, true, '{"es":"Tu evento ya está publicado","en":"Your event is live"}', '{"es":"«{evento}» ya sale en Eventos y en tu página.","en":"«{evento}» now shows in Events and on your page."}'),
  ('evt_cambios', 'biz', null, false, '{"es":"To''Latino pide un cambio en tu evento","en":"To''Latino asks for a change to your event"}', '{"es":"«{evento}»: {motivo}. Cámbialo en tu panel y envíalo otra vez.","en":"«{evento}»: {motivo}. Change it in your dashboard and send it again."}'),
  ('evt_rechazado', 'biz', null, true, '{"es":"Tu evento no se publicó","en":"Your event was not published"}', '{"es":"«{evento}» no se aprobó: {motivo}. Puedes apelar desde tu panel.","en":"«{evento}» was not approved: {motivo}. You can appeal from your dashboard."}'),
  ('evt_oculto', 'biz', null, false, '{"es":"To''Latino ocultó tu evento","en":"To''Latino hid your event"}', '{"es":"«{evento}» ya no sale en Eventos ni en tu página: {motivo}. Puedes apelar.","en":"«{evento}» no longer shows in Events or on your page: {motivo}. You can appeal."}'),
  ('evt_visible', 'biz', null, false, '{"es":"Tu evento se ve otra vez","en":"Your event shows again"}', '{"es":"«{evento}» vuelve a salir en Eventos y en tu página.","en":"«{evento}» shows again in Events and on your page."}'),
  ('evt_bloqueado', 'biz', null, false, '{"es":"No puedes publicar eventos por ahora","en":"You cannot publish events for now"}', '{"es":"To''Latino bloqueó la publicación de eventos de {negocio}: {motivo}. Puedes apelar.","en":"To''Latino blocked event publishing for {negocio}: {motivo}. You can appeal."}'),
  ('evt_desbloqueado', 'biz', null, false, '{"es":"Ya puedes publicar eventos","en":"You can publish events again"}', '{"es":"{negocio} puede publicar eventos otra vez.","en":"{negocio} can publish events again."}'),
  ('evt_verificado', 'biz', null, false, '{"es":"Organizador verificado","en":"Verified organizer"}', '{"es":"{negocio} es organizador verificado: tus eventos se publican al enviarlos.","en":"{negocio} is a verified organizer: your events go live when you send them."}')
on conflict (key) do nothing;

-- ── Configuración › Eventos ──
alter table config_keys drop constraint if exists config_keys_section_check;
alter table config_keys add constraint config_keys_section_check check (section in ('comunidad', 'gamificacion', 'salud_pro', 'noche', 'edu', 'fe_inm_autos', 'eventos'));
insert into config_keys (key, min, max, def, unit, section, label, help, editable, bloqueo, edit_in, sort) values
  ('evt_revision_h', 1, 168, 24, '{"es":"h","en":"h"}', 'eventos', '{"es":"To''Latino revisa un evento en","en":"To''Latino reviews an event within"}',
    '{"es":"Plazo de la cola Eventos a revisar. Lo dicen Publica tu evento, el panel y el aviso al negocio.","en":"Deadline of the Events to review queue. Publish your event, the dashboard and the business notice say it."}', true, null, null, 80),
  ('evt_fechas_max', 1, 104, 52, '{"es":"fechas","en":"dates"}', 'eventos', '{"es":"Fechas de una serie","en":"Dates in a series"}',
    '{"es":"Lo más que puede repetirse un evento (llega con las series).","en":"Most a recurring event can repeat (arrives with series)."}', true, null, null, 81),
  ('evt_dias_adelante', 30, 365, 180, '{"es":"días","en":"days"}', 'eventos', '{"es":"Se publica con anticipación de hasta","en":"Can be published up to"}',
    '{"es":"El calendario del editor muestra estos días hacia adelante.","en":"The editor calendar shows these days ahead."}', true, null, null, 82),
  ('evt_fotos_max', 1, 12, 6, '{"es":"fotos","en":"photos"}', 'eventos', '{"es":"Cartel y fotos de un evento","en":"Poster and photos of an event"}',
    '{"es":"La primera es el cartel.","en":"The first one is the poster."}', true, null, null, 83),
  ('evt_dias_seguidos_max', 2, 60, 30, '{"es":"días","en":"days"}', 'eventos', '{"es":"Días seguidos de un evento","en":"Consecutive days of an event"}',
    '{"es":"Una feria o festival de varios días (llega con los eventos de varios días).","en":"A multi-day fair or festival (arrives with multi-day events)."}', true, null, null, 84)
on conflict (key) do update set min = excluded.min, max = excluded.max, def = excluded.def, unit = excluded.unit, section = excluded.section, label = excluded.label,
  help = excluded.help, editable = excluded.editable, bloqueo = excluded.bloqueo, edit_in = excluded.edit_in, sort = excluded.sort;

commit;
