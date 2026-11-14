-- 0136 · Fase 9 · 9f · Super Admin › Textos y páginas completo (CMS) (docs/diseno/plan/fase9-apertura.md §2 «0136 cms», §4 9f).
-- EL CÓDIGO ES LA FUENTE de cada cadena (scripts/cms/extraer.mjs → apps/web/lib/cms-cadenas.json) y el despliegue las indexa (scripts/cms/indexar.mjs →
-- cms_indexar()), como la ayuda y las páginas legales. La base guarda el texto en vigor: lo que el código dice mientras nadie lo edite, y lo que el Super
-- Admin editó después (siempre con autor y motivo). El servidor sirve primero lo de la base y, si no hay, lo del código (lib/cms.ts).
-- · cms_strings: una fila por cadena. id = ÁREA-MÓDULO-PANTALLA.clave. text {es,en} es lo que se ve; code_text es lo que dice el código (para volver
--   atrás y para comparar). Las marcas {x} de un texto son las del código (la base lo impone); el largo máximo (max_len) también; una línea fija
--   (locked: 911, «nadie te garantiza un resultado», las líneas de §1c y de cada categoría) NO se edita: solo la cambia un despliegue, con el código.
--   status: «vivo» se ve; «borrador» guarda la edición pero se sirve el texto del código (volver a publicarla es un clic). en_state: pendiente
--   (el inglés es el del código sin traducir), traducido (alguien lo escribió) o revisado (alguien lo aprobó).
-- · cms_string_versions (SOLO INSERCIÓN): cada cambio de texto de una cadena, con quién y por qué; lo escribe la propia base (no se puede editar sin dejar rastro).
-- · city_home_config: el Inicio de cada ciudad: un aviso fijo {es,en} bajo el lugar y los bloques encendidos y su orden. Sin fila = todo encendido, en el orden de fábrica.
-- · announcements: el banner del Inicio de la ciudad con fechas (desde, hasta); no se borra: se retira (retired_at) con su motivo.
-- Idempotente: se puede aplicar dos veces.
begin;

-- ── Las marcas {x} de un texto (para que una edición no pierda un {n} ni invente otro) ──
create or replace function cms_marcas(t text) returns text[] language sql immutable as $$
  select coalesce(array_agg(distinct m[1] order by m[1]), '{}'::text[]) from regexp_matches(coalesce(t, ''), '\{([a-zA-Z0-9_]+)\}', 'g') as m
$$;

-- ── Las cadenas ──
-- 0001 dejó una tabla cms_strings de otra forma (key, es, en), vacía y sin uso. Nada se borra: si todavía es esa, se renombra y la nueva toma su lugar.
do $$ begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'cms_strings' and column_name = 'key') then
    alter table cms_strings rename to cms_strings_0001;
    alter index if exists cms_strings_pkey rename to cms_strings_0001_pkey;
  end if;
end $$;
create table if not exists cms_strings (
  id          text primary key check (id ~ '^[A-Z0-9]+(-[A-Z0-9]+)*\.[A-Za-z0-9_.-]+$' and char_length(id) <= 160),
  screen      text not null check (screen ~ '^[A-Z0-9]+(-[A-Z0-9]+)*$'),
  text        jsonb not null check (jsonb_typeof(text) = 'object' and text ? 'es' and text ? 'en' and jsonb_typeof(text->'es') = 'string' and jsonb_typeof(text->'en') = 'string'),
  code_text   jsonb not null check (jsonb_typeof(code_text) = 'object' and code_text ? 'es' and code_text ? 'en' and jsonb_typeof(code_text->'es') = 'string' and jsonb_typeof(code_text->'en') = 'string'),
  status      text not null default 'vivo' check (status in ('borrador', 'vivo')),
  en_state    text not null default 'pendiente' check (en_state in ('pendiente', 'traducido', 'revisado')),
  max_len     integer not null default 200 check (max_len between 1 and 2000),
  locked      boolean not null default false,
  edited      boolean not null default false,
  version     integer not null default 1 check (version >= 1),
  code_sha    text not null check (code_sha ~ '^[0-9a-f]{64}$'),
  updated_by  uuid references users (id),
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now()
);
create index if not exists cms_strings_screen_idx on cms_strings (screen, id);
create index if not exists cms_strings_estado_idx on cms_strings (en_state, id);
-- La búsqueda de la pantalla de Cadenas (id y los dos textos).
create index if not exists cms_strings_buscar_idx on cms_strings using gin (to_tsvector('simple', id || ' ' || coalesce(text->>'es', '') || ' ' || coalesce(text->>'en', '')));

-- ── Las versiones (SOLO INSERCIÓN) ──
create table if not exists cms_string_versions (
  string_id  text not null references cms_strings (id),
  version    integer not null check (version >= 1),
  text       jsonb not null,
  status     text not null check (status in ('borrador', 'vivo')),
  by         uuid references users (id),
  reason     text not null check (char_length(reason) between 3 and 500),
  at         timestamptz not null default now(),
  primary key (string_id, version)
);
create or replace function cms_solo_insercion() returns trigger language plpgsql as $$
begin raise exception '% es solo de inserción', tg_table_name; end $$;
drop trigger if exists cms_string_versions_no_cambia on cms_string_versions;
create trigger cms_string_versions_no_cambia before update or delete on cms_string_versions for each row execute function cms_solo_insercion();

-- ── Las reglas de una cadena (largo, marcas, línea fija, autor y motivo) y su versión ──
-- El despliegue (cms_indexar) pone «tl.cms_indexar» = on en su transacción: solo él cambia el código de una cadena y una línea fija.
-- Quien edita desde el Super Admin pone «tl.cms_por» (el id de la persona) y «tl.cms_motivo» en la suya.
create or replace function cms_cadena_reglas() returns trigger language plpgsql as $$
declare indexando boolean := coalesce(current_setting('tl.cms_indexar', true), '') = 'on';
        por text := nullif(current_setting('tl.cms_por', true), ''); motivo text := nullif(current_setting('tl.cms_motivo', true), '');
        cambio boolean;
begin
  if tg_op = 'INSERT' then
    new.version := 1; new.updated_at := now(); new.edited := false; new.text := new.code_text;
    if new.locked then new.status := 'vivo'; end if;
  else
    if new.id <> old.id or new.screen <> old.screen then raise exception 'cms_id_fijo: la llave de una cadena no cambia'; end if;
    cambio := new.text is distinct from old.text or new.status is distinct from old.status;
    if old.locked and not indexando and (new.text is distinct from old.text or new.status is distinct from old.status or new.locked is distinct from old.locked or new.code_text is distinct from old.code_text) then
      raise exception 'cms_linea_fija: % es una línea fija: solo cambia con el código', old.id;
    end if;
    if not indexando and (new.code_text is distinct from old.code_text or new.code_sha is distinct from old.code_sha or new.max_len is distinct from old.max_len or new.locked is distinct from old.locked) then
      raise exception 'cms_codigo: lo que dice el código solo lo cambia un despliegue';
    end if;
    if cambio and not indexando and (por is null or motivo is null or char_length(motivo) < 3) then raise exception 'cms_sin_autor: un cambio de texto lleva autor y motivo'; end if;
    if cambio then
      new.version := old.version + 1; new.updated_at := now();
      new.edited := new.text is distinct from new.code_text or new.status = 'borrador';
      new.updated_by := case when indexando then null else por::uuid end;
    end if;
  end if;
  if char_length(new.text->>'es') < 1 or char_length(new.text->>'en') < 1 then raise exception 'cms_vacia: % no puede quedar vacía en ningún idioma', new.id; end if;
  if char_length(new.text->>'es') > new.max_len or char_length(new.text->>'en') > new.max_len then raise exception 'cms_largo: % admite % caracteres como máximo', new.id, new.max_len; end if;
  if cms_marcas(new.text->>'es') <> cms_marcas(new.code_text->>'es') or cms_marcas(new.text->>'en') <> cms_marcas(new.code_text->>'en') then
    raise exception 'cms_marcas: % debe conservar sus marcas {…} tal como las trae el código', new.id;
  end if;
  return new;
end $$;
drop trigger if exists cms_strings_reglas on cms_strings;
create trigger cms_strings_reglas before insert or update on cms_strings for each row execute function cms_cadena_reglas();

create or replace function cms_cadena_version() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    insert into cms_string_versions (string_id, version, text, status, by, reason) values (new.id, 1, new.text, new.status, null, 'despliegue');
  elsif new.version <> old.version then
    insert into cms_string_versions (string_id, version, text, status, by, reason)
      values (new.id, new.version, new.text, new.status, new.updated_by, coalesce(nullif(current_setting('tl.cms_motivo', true), ''), 'despliegue'));
  end if;
  return null;
end $$;
drop trigger if exists cms_strings_version on cms_strings;
create trigger cms_strings_version after insert or update on cms_strings for each row execute function cms_cadena_version();

-- Un cambio avisa a todos los procesos (canal tl_config, como la configuración): lo ven al momento.
drop trigger if exists cms_strings_avisa on cms_strings;
create trigger cms_strings_avisa after insert or update or delete on cms_strings for each statement execute function config_avisar();

-- ── El despliegue indexa el código: cadenas nuevas, texto del código que cambió, línea fija nueva. Nada se borra ──
-- p = {id, screen, es, en, max_len, locked, sha256}. Devuelve «nueva», «cambió», «igual» o «fija».
create or replace function cms_indexar(p jsonb) returns text language plpgsql as $$
declare v cms_strings%rowtype; code jsonb := jsonb_build_object('es', p->>'es', 'en', p->>'en');
begin
  perform set_config('tl.cms_indexar', 'on', true);
  select * into v from cms_strings where id = p->>'id' for update;
  if not found then
    -- El inglés nace «traducido» si el código lo trae distinto del español, «pendiente» si es igual (puede ser un nombre propio: alguien lo revisa) y
    -- «revisado» si es una línea fija.
    insert into cms_strings (id, screen, text, code_text, max_len, locked, code_sha, en_state)
      values (p->>'id', p->>'screen', code, code, coalesce((p->>'max_len')::int, 200), coalesce((p->>'locked')::boolean, false), p->>'sha256',
              case when coalesce((p->>'locked')::boolean, false) then 'revisado' when p->>'es' <> p->>'en' then 'traducido' else 'pendiente' end);
    return 'nueva';
  end if;
  if v.code_sha = p->>'sha256' and v.max_len = coalesce((p->>'max_len')::int, 200) and v.locked = coalesce((p->>'locked')::boolean, false) then return 'igual'; end if;
  -- El código cambió. Lo editado se respeta salvo que ya no cumpla (largo o marcas): entonces vuelve al código. Una línea fija siempre es la del código.
  update cms_strings set code_text = code, code_sha = p->>'sha256', max_len = coalesce((p->>'max_len')::int, 200), locked = coalesce((p->>'locked')::boolean, false),
         text = case when v.locked or coalesce((p->>'locked')::boolean, false) or not v.edited
                       or char_length(v.text->>'es') > coalesce((p->>'max_len')::int, 200) or char_length(v.text->>'en') > coalesce((p->>'max_len')::int, 200)
                       or cms_marcas(v.text->>'es') <> cms_marcas(p->>'es') or cms_marcas(v.text->>'en') <> cms_marcas(p->>'en')
                     then code else v.text end,
         status = case when v.locked or coalesce((p->>'locked')::boolean, false) then 'vivo' else v.status end,
         en_state = case when v.edited and not coalesce((p->>'locked')::boolean, false) then v.en_state
                         when coalesce((p->>'locked')::boolean, false) then 'revisado' when p->>'es' <> p->>'en' then 'traducido' else 'pendiente' end
   where id = p->>'id';
  return case when v.locked or coalesce((p->>'locked')::boolean, false) then 'fija' else 'cambió' end;
end $$;

-- ── El Inicio de cada ciudad ──
create or replace function home_bloques_validos(b jsonb) returns boolean language sql immutable as $$
  select jsonb_typeof(b) = 'array' and jsonb_array_length(b) <= 12 and not exists (
    select 1 from jsonb_array_elements(b) e where jsonb_typeof(e) <> 'object' or (e->>'key') not in ('categorias', 'hoy', 'abierto', 'semana', 'comunidad', 'publica')
      or jsonb_typeof(e->'on') <> 'boolean')
     and (select count(distinct e->>'key') = count(*) from jsonb_array_elements(b) e)
$$;
create table if not exists city_home_config (
  city_id     text primary key references cities (id),
  notice      jsonb check (notice is null or (jsonb_typeof(notice) = 'object' and notice ? 'es' and notice ? 'en' and char_length(notice->>'es') between 1 and 160 and char_length(notice->>'en') between 1 and 160)),
  blocks      jsonb not null default '[]'::jsonb check (home_bloques_validos(blocks)),
  updated_by  uuid references users (id),
  updated_at  timestamptz not null default now()
);
drop trigger if exists city_home_config_avisa on city_home_config;
create trigger city_home_config_avisa after insert or update or delete on city_home_config for each statement execute function config_avisar();

-- ── Anuncios (el banner del Inicio de la ciudad; LAUNCH «Anuncios in-app» de 2j) ──
create table if not exists announcements (
  id            bigint generated always as identity primary key,
  city_id       text not null references cities (id),
  audience      text not null default 'todos' check (audience in ('todos', 'vecinos')),
  text          jsonb not null check (jsonb_typeof(text) = 'object' and text ? 'es' and text ? 'en' and char_length(text->>'es') between 1 and 160 and char_length(text->>'en') between 1 and 160),
  from_at       timestamptz not null,
  to_at         timestamptz not null,
  by_staff_id   uuid not null references users (id),
  created_at    timestamptz not null default now(),
  retired_at    timestamptz,
  retired_by    uuid references users (id),
  retired_reason text check (char_length(retired_reason) between 3 and 500),
  check (to_at > from_at and to_at <= from_at + interval '31 days'),
  check ((retired_at is null) = (retired_by is null) and (retired_at is null) = (retired_reason is null))
);
create index if not exists announcements_ciudad_idx on announcements (city_id, from_at desc, to_at desc);
create or replace function announcements_reglas() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'announcements no se borra: se retira'; end if;
  if tg_op = 'UPDATE' and (new.city_id, new.audience, new.text, new.from_at, new.to_at, new.by_staff_id, new.created_at) is distinct from
     (old.city_id, old.audience, old.text, old.from_at, old.to_at, old.by_staff_id, old.created_at) then
    raise exception 'announcements: un anuncio no se edita, se retira y se crea otro';
  end if;
  if tg_op = 'UPDATE' and old.retired_at is not null then raise exception 'announcements: ya estaba retirado'; end if;
  return new;
end $$;
drop trigger if exists announcements_reglas_tg on announcements;
create trigger announcements_reglas_tg before update or delete on announcements for each row execute function announcements_reglas();
drop trigger if exists announcements_avisa on announcements;
create trigger announcements_avisa after insert or update on announcements for each statement execute function config_avisar();

-- ── El pie de la web en todas las páginas (LAUNCH de 9e): apagado de fábrica porque agregarlo bajo el Inicio, la ficha y Buscar cambia las capturas
-- aprobadas de la tubería. Se enciende en Super Admin › Textos y páginas › Páginas cuando el fundador apruebe las capturas nuevas. ──
insert into feature_flags (key, enabled, note, updated_by) values ('web.pie_todas', false, 'El pie de la web (Términos, Privacidad, Ayuda…) también bajo el Inicio, la ficha y Buscar', 'migración 0136')
on conflict (key) do nothing;

commit;
