-- 0216 · Anfitriones del barrio, segunda parte (decisión AO; docs/diseno/plan/anfitriones.md §5b): noticias de República Dominicana y de los países
-- latinos por RSS/Atom. Yadira (noticias) y Rafelito (deportes) publican una nota con el ENLACE a la fuente y un resumen de dos o tres líneas hecho
-- SOLO con el título y la descripción que trae la fuente; nunca el artículo copiado, nunca una noticia inventada.
-- · com_host_sources: las fuentes (medio, URL https del RSS/Atom, su servidor, país, tema, voz que la lleva, idioma, palabras que descartan).
--   Estados (on · off · retired), nada se borra. Catálogo: en producción nace VACÍA; las de ejemplo del sandbox van en infra/pruebas/semilla, APAGADAS.
--   El lector (lib/noticias-lector.ts) solo lee una fuente de esta tabla: el servidor de la URL tiene que ser `host` (lo comprueba la base).
-- · com_host_source_reads: cada lectura (barrido o «Probar»), solo inserción: si salió bien, cuántas notas trajo y cuántas nuevas, o el error.
-- · com_host_news: las notas leídas (huella única = no se repiten), con su estado (nueva · publicada · descartada con motivo). Retención: lo que no se
--   publicó se VACÍA (título, descripción y enlace) a los anf_noticias_retener_dias; la huella queda para no volver a leerla.
-- · com_posts.source_url / source_name: el enlace a la fuente de una nota. Solo lo puede llevar una publicación de una voz de la casa (la base lo cierra).
-- · Configuración › Comunidad: fuentes por pasada, minutos entre lecturas de una fuente, horas que una nota sigue siendo reciente y días de retención.
-- Idempotente. Nada se borra.
begin;

-- ── Las fuentes ──
create table if not exists com_host_sources (
  id            bigint generated always as identity primary key,
  name          text not null check (char_length(name) between 2 and 60),
  url           text not null check (char_length(url) between 12 and 500 and url ~ '^https://[a-z0-9.-]+(/[^[:space:]]*)?$'),
  host          text not null check (host ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$' and char_length(host) <= 253),
  country       text not null check (country ~ '^[A-Z]{2}$'),
  topic         text not null check (topic in ('noticias', 'deportes')),
  host_user_id  uuid not null references com_hosts (user_id),
  lang          text not null default 'es' check (lang in ('es', 'en')),
  veto_words    text[] not null default '{}' check (cardinality(veto_words) <= 30),
  status        text not null default 'off' check (status in ('on', 'off', 'retired')),
  next_read_at  timestamptz not null default now(),
  fails         integer not null default 0 check (fails >= 0),
  last_ok_at    timestamptz,
  last_error    text check (last_error is null or char_length(last_error) <= 200),
  last_error_at timestamptz,
  created_by    uuid references users (id),
  updated_by    uuid references users (id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- El servidor de la URL es `host` (sin usuario, clave ni puerto: la URL solo admite [a-z0-9.-] antes de la primera barra).
  check (split_part(substr(url, 9), '/', 1) = host)
);
create unique index if not exists com_host_sources_url_viva on com_host_sources (url) where status <> 'retired';
create index if not exists com_host_sources_toca_idx on com_host_sources (next_read_at, id) where status = 'on';
create or replace function com_host_sources_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'una fuente no se borra: se apaga o se retira'; end if;
  if tg_op = 'UPDATE' and old.status = 'retired' and new.status <> 'retired' then raise exception 'una fuente retirada no vuelve: se da de alta otra'; end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists com_host_sources_antes on com_host_sources;
create trigger com_host_sources_antes before insert or update or delete on com_host_sources for each row execute function com_host_sources_antes();

-- ── Cada lectura (solo inserción) ──
create table if not exists com_host_source_reads (
  id         bigint generated always as identity primary key,
  source_id  bigint not null references com_host_sources (id),
  via        text not null check (via in ('barrido', 'probar')),
  ok         boolean not null,
  items      integer not null default 0 check (items between 0 and 1000),
  new_items  integer not null default 0 check (new_items between 0 and 1000),
  ms         integer not null default 0 check (ms >= 0),
  error      text check (error is null or char_length(error) <= 200),
  by_user    uuid references users (id),
  at         timestamptz not null default now(),
  check (ok = (error is null))
);
create index if not exists com_host_source_reads_fuente_idx on com_host_source_reads (source_id, at desc);
create index if not exists com_host_source_reads_at_idx on com_host_source_reads (at desc);
create or replace function com_host_source_reads_inmutable() returns trigger language plpgsql as $$
begin raise exception 'com_host_source_reads es solo de inserción'; end $$;
drop trigger if exists com_host_source_reads_no_cambia on com_host_source_reads;
create trigger com_host_source_reads_no_cambia before update or delete on com_host_source_reads for each row execute function com_host_source_reads_inmutable();

-- ── Las notas leídas ──
create table if not exists com_host_news (
  id            bigint generated always as identity primary key,
  source_id     bigint not null references com_host_sources (id),
  fingerprint   text not null unique check (fingerprint ~ '^[0-9a-f]{64}$'),
  title         text check (title is null or char_length(title) between 1 and 200),
  summary       text check (summary is null or char_length(summary) <= 500),
  link          text check (link is null or (char_length(link) <= 1000 and link ~ '^https://')),
  published_at  timestamptz,
  status        text not null default 'nueva' check (status in ('nueva', 'publicada', 'descartada')),
  reason        text check (reason is null or reason in ('politica', 'violencia', 'menores', 'delicado', 'palabra', 'vieja', 'enlace', 'filtro')),
  detail        text check (detail is null or char_length(detail) <= 200),
  first_post_id bigint references com_posts (id),
  published_n   integer not null default 0 check (published_n >= 0),
  purged_at     timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check ((status = 'descartada') = (reason is not null)),
  check ((status = 'publicada') = (first_post_id is not null)),
  check ((purged_at is null) = (title is not null and link is not null)),
  check (purged_at is null or status <> 'publicada')
);
create index if not exists com_host_news_elegibles_idx on com_host_news (created_at desc, id desc) where status in ('nueva', 'publicada') and purged_at is null;
create index if not exists com_host_news_purga_idx on com_host_news (created_at) where status <> 'publicada' and purged_at is null;
create index if not exists com_host_news_fuente_idx on com_host_news (source_id, created_at desc);
create or replace function com_host_news_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'una nota leída no se borra: se descarta o se vacía por retención'; end if;
  if (new.source_id, new.fingerprint, new.created_at) is distinct from (old.source_id, old.fingerprint, old.created_at) then raise exception 'una nota leída no cambia de fuente ni de huella'; end if;
  if old.status = 'publicada' and new.status <> 'publicada' then raise exception 'una nota publicada se queda publicada'; end if;
  if old.status = 'descartada' and new.status <> 'descartada' then raise exception 'una nota descartada se queda descartada'; end if;
  if old.purged_at is not null and new.purged_at is null then raise exception 'una nota vaciada no vuelve'; end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists com_host_news_antes on com_host_news;
create trigger com_host_news_antes before update or delete on com_host_news for each row execute function com_host_news_antes();

-- ── El enlace a la fuente en una publicación (solo de una voz de la casa) ──
alter table com_posts add column if not exists source_url text;
alter table com_posts add column if not exists source_name text;
alter table com_posts drop constraint if exists com_posts_fuente;
alter table com_posts add constraint com_posts_fuente check ((source_url is null) = (source_name is null)
  and (source_url is null or (source_url ~ '^https://[a-z0-9.-]+(/[^[:space:]]*)?$' and char_length(source_url) <= 1000))
  and (source_name is null or char_length(source_name) between 2 and 60));
create or replace function com_posts_fuente_anfitrion() returns trigger language plpgsql as $$
begin
  if new.source_url is not null and (new.author_user_id is null or not anf_es(new.author_user_id)) then
    raise exception 'anfitrion_fuente: solo una voz de la casa publica con enlace a una fuente';
  end if;
  if tg_op = 'UPDATE' and (new.source_url, new.source_name) is distinct from (old.source_url, old.source_name) and old.source_url is not null then
    raise exception 'anfitrion_fuente: el enlace de una nota no cambia';
  end if;
  return new;
end $$;
drop trigger if exists com_posts_fuente_anfitrion on com_posts;
create trigger com_posts_fuente_anfitrion before insert or update of source_url, source_name on com_posts for each row execute function com_posts_fuente_anfitrion();

-- ── Los números (Configuración › Comunidad) ──
insert into config_keys (key, min, max, def, unit, section, label, help, editable, bloqueo, edit_in, sort) values
  ('anf_fuentes_por_pasada', 1, 20, 5, '{"es":"fuentes","en":"sources"}', 'comunidad', '{"es":"Anfitriones · fuentes por pasada","en":"Hosts · sources per pass"}',
    '{"es":"Lo más que el barrido lee de las fuentes de noticias en una pasada (cada minuto).","en":"The most news sources the sweep reads in one pass (every minute)."}', true, null, null, 74),
  ('anf_fuente_cada_min', 10, 1440, 30, '{"es":"min","en":"min"}', 'comunidad', '{"es":"Anfitriones · minutos entre lecturas de una fuente","en":"Hosts · minutes between reads of a source"}',
    '{"es":"Una fuente no se vuelve a leer antes de esto. Si falla, la espera se duplica en cada fallo (hasta un día).","en":"A source is not read again before this. If it fails, the wait doubles with each failure (up to a day)."}', true, null, null, 75),
  ('anf_noticia_horas', 1, 168, 48, '{"es":"horas","en":"hours"}', 'comunidad', '{"es":"Anfitriones · una nota es reciente por","en":"Hosts · a news item is recent for"}',
    '{"es":"Una nota más vieja que esto ya no se publica (se descarta como vieja).","en":"A news item older than this is no longer posted (discarded as old)."}', true, null, null, 76),
  ('anf_noticias_retener_dias', 1, 90, 14, '{"es":"días","en":"days"}', 'comunidad', '{"es":"Anfitriones · retención de notas no publicadas","en":"Hosts · retention of unposted news"}',
    '{"es":"A los días, el barrido vacía el título, la descripción y el enlace de lo que no se publicó (queda la huella para no repetirla).","en":"After these days, the sweep clears the title, description and link of what was not posted (the fingerprint stays so it is never repeated)."}', true, null, null, 77)
on conflict (key) do nothing;

commit;
