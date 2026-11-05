-- 0011 · Buscar (APP-BUSCAR): el documento de búsqueda de cada negocio suma el nombre de su categoría (B) y el texto
-- de su tarjeta y dirección (D), como el motor del prototipo; y un vocabulario para «¿Quisiste decir…?» con trigramas.
begin;

create or replace function businesses_search_doc() returns trigger language plpgsql as $$
declare subs text; cat text; extra text;
begin
  select string_agg((s.name->>'es') || ' ' || (s.name->>'en'), ' ') into subs from subcategories s where s.id = any (new.subcategory_ids);
  select (c.name->>'es') || ' ' || (c.name->>'en') || ' ' || (c.short->>'es') || ' ' || (c.short->>'en') into cat from categories c where c.id = new.category_id;
  extra := concat_ws(' ', new.category_attrs #>> '{tarjeta,offer,es}', new.category_attrs #>> '{tarjeta,offer,en}',
                     new.category_attrs #>> '{tarjeta,fee,es}', new.category_attrs #>> '{tarjeta,eta,es}', new.address);
  new.search_doc :=
    setweight(to_tsvector('simple', unaccent(coalesce(new.name, ''))), 'A') ||
    setweight(to_tsvector('simple', unaccent(coalesce(subs, ''))), 'B') ||
    setweight(to_tsvector('simple', unaccent(coalesce(cat, ''))), 'B') ||
    setweight(to_tsvector('simple', unaccent(coalesce(new.about->>'es', '') || ' ' || coalesce(new.about->>'en', ''))), 'C') ||
    setweight(to_tsvector('simple', unaccent(coalesce(extra, ''))), 'D');
  new.updated_at := now();
  return new;
end $$;
-- Recalcula los documentos ya guardados con la regla nueva.
update businesses set name = name;

-- Vocabulario (palabras de 4+ letras sin acentos) de categorías, subcategorías, negocios activos y sinónimos.
-- Derivado: nunca se edita; se refresca con refrescar_busqueda() (lo llama la semilla en cada despliegue).
create materialized view if not exists search_vocab as
  select distinct w as word from (
    select unnest(regexp_split_to_array(lower(unaccent(name->>'es') || ' ' || unaccent(name->>'en') || ' ' || unaccent(short->>'es') || ' ' || unaccent(short->>'en')), '[^a-z0-9]+')) as w from categories
    union all select unnest(regexp_split_to_array(lower(unaccent(name->>'es') || ' ' || unaccent(name->>'en')), '[^a-z0-9]+')) from subcategories where status = 'on'
    union all select unnest(regexp_split_to_array(lower(unaccent(name)), '[^a-z0-9]+')) from businesses where status = 'active'
    union all select unnest(regexp_split_to_array(lower(unaccent(term)), '[^a-z0-9]+')) from synonyms where active
  ) x where char_length(w) >= 4 and w !~ '^[0-9]+$';
create unique index if not exists search_vocab_word on search_vocab (word);
create index if not exists search_vocab_trgm on search_vocab using gin (word gin_trgm_ops);

create or replace function refrescar_busqueda() returns void language sql as $$ refresh materialized view search_vocab $$;

commit;
