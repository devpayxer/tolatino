-- 0180 · Buscar › «Platos y servicios» (9t, LAUNCH «Buscar — pendientes con su módulo»; REVISION «9t · Buscar: platos y servicios»).
-- · items.search_doc: el documento de búsqueda de cada plato y servicio (nombre A, descripción B), sin acentos, como el de los negocios
--   (0011). Lo mantiene un disparador (nadie lo escribe); el índice GIN es parcial: solo lo que no se quitó del Menú y de Servicios.
-- · El vocabulario de «¿Quisiste decir…?» suma los nombres de los platos y servicios vivos de negocios activos («mofngo» → mofongo): un
--   derivado aparte (search_vocab_platos; search_vocab no se toca) que refresca el mismo refrescar_busqueda() (barrido y despliegue).
-- · users.big_text: «Letra más grande» (Mi cuenta › Ajustes, diseño setV), por persona y en el servidor.
-- Idempotente. Solo agrega: nada se borra ni se reconstruye.
begin;

-- ── El documento de búsqueda de cada plato y servicio ──
alter table items add column if not exists search_doc tsvector;

create or replace function items_search_doc() returns trigger language plpgsql as $$
begin
  new.search_doc :=
    setweight(to_tsvector('simple', unaccent(coalesce(new.name->>'es', '') || ' ' || coalesce(new.name->>'en', ''))), 'A') ||
    setweight(to_tsvector('simple', unaccent(coalesce(new.descr->>'es', '') || ' ' || coalesce(new.descr->>'en', ''))), 'B');
  return new;
end $$;

drop trigger if exists items_search_doc on items;
create trigger items_search_doc before insert or update of name, descr on items
  for each row execute function items_search_doc();

-- Lo que ya existe (una vez; sin tocar updated_at).
update items set search_doc =
    setweight(to_tsvector('simple', unaccent(coalesce(name->>'es', '') || ' ' || coalesce(name->>'en', ''))), 'A') ||
    setweight(to_tsvector('simple', unaccent(coalesce(descr->>'es', '') || ' ' || coalesce(descr->>'en', ''))), 'B')
  where search_doc is null;

create index if not exists items_search_gin on items using gin (search_doc) where removed_at is null and module in ('menu', 'svc');

-- ── El vocabulario de los platos y servicios (aparte: search_vocab sigue igual y lo leen los mismos) ──
create materialized view if not exists search_vocab_platos as
  select distinct w as word from (
    select unnest(regexp_split_to_array(lower(unaccent(coalesce(i.name->>'es', '') || ' ' || coalesce(i.name->>'en', ''))), '[^a-z0-9]+')) as w
      from items i join businesses b on b.id = i.business_id
     where i.removed_at is null and i.status = 'live' and i.module in ('menu', 'svc') and b.status = 'active'
  ) x where char_length(w) >= 4 and w !~ '^[0-9]+$';
create unique index if not exists search_vocab_platos_word on search_vocab_platos (word);
create index if not exists search_vocab_platos_trgm on search_vocab_platos using gin (word gin_trgm_ops);

-- El refresco de siempre (barrido cada hora y despliegue) refresca los dos, sin bloquear a quien busca.
create or replace function refrescar_busqueda() returns void language plpgsql as $$
begin
  if (select ispopulated from pg_matviews where matviewname = 'search_vocab') then
    refresh materialized view concurrently search_vocab;
  else
    refresh materialized view search_vocab;
  end if;
  if (select ispopulated from pg_matviews where matviewname = 'search_vocab_platos') then
    refresh materialized view concurrently search_vocab_platos;
  else
    refresh materialized view search_vocab_platos;
  end if;
  insert into platform_config (key, value, note, updated_by) values ('search_vocab_refreshed_at', to_jsonb(now()), 'El vocabulario de búsqueda se refrescó (barrido o despliegue).', 'sistema')
  on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = 'sistema';
end $$;

-- ── «Letra más grande» (Mi cuenta › Ajustes): por persona, en el servidor ──
alter table users add column if not exists big_text boolean not null default false;

commit;
