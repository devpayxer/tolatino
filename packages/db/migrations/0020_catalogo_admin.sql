-- 0020 · Super Admin › Catálogo (ADM-CAT): subcategorías que el equipo agrega o quita (nada se borra: status), y que
-- una subcategoría quitada deje de verse en todas partes (tarjetas, ficha, mapa, Buscar). Filtros y sinónimos ya se
-- encienden y apagan con `active` (0003); las semillas nunca pisan esos interruptores.
begin;

-- Quién y por qué cambió una subcategoría (el detalle vive en la auditoría).
alter table subcategories add column if not exists created_by uuid references users (id);
alter table subcategories add column if not exists status_reason text;
alter table subcategories add column if not exists status_at timestamptz;

-- Lo que ve el público: solo subcategorías encendidas de categorías encendidas. Las lecturas públicas usan esta vista
-- (guardián subcategoriasVivas).
create or replace view subcategorias_vivas as
  select s.* from subcategories s join categories c on c.id = s.category_id and c.status = 'on' where s.status = 'on';

-- Documento de búsqueda: sin subcategorías apagadas. Recalcularlo para un cambio del catálogo no es actividad del
-- negocio: con tolatino.solo_doc = 'on' no toca updated_at.
create or replace function businesses_search_doc() returns trigger language plpgsql as $$
declare subs text; cat text; extra text;
begin
  select string_agg((s.name->>'es') || ' ' || (s.name->>'en'), ' ') into subs from subcategories s where s.id = any (new.subcategory_ids) and s.status = 'on';
  select (c.name->>'es') || ' ' || (c.name->>'en') || ' ' || (c.short->>'es') || ' ' || (c.short->>'en') into cat from categories c where c.id = new.category_id;
  extra := concat_ws(' ', new.category_attrs #>> '{tarjeta,offer,es}', new.category_attrs #>> '{tarjeta,offer,en}',
                     new.category_attrs #>> '{tarjeta,fee,es}', new.category_attrs #>> '{tarjeta,eta,es}', new.address);
  new.search_doc :=
    setweight(to_tsvector('simple', unaccent(coalesce(new.name, ''))), 'A') ||
    setweight(to_tsvector('simple', unaccent(coalesce(subs, ''))), 'B') ||
    setweight(to_tsvector('simple', unaccent(coalesce(cat, ''))), 'B') ||
    setweight(to_tsvector('simple', unaccent(coalesce(new.about->>'es', '') || ' ' || coalesce(new.about->>'en', ''))), 'C') ||
    setweight(to_tsvector('simple', unaccent(coalesce(extra, ''))), 'D');
  if coalesce(current_setting('tolatino.solo_doc', true), '') <> 'on' then new.updated_at := now(); end if;
  return new;
end $$;

-- Recalcula el documento de los negocios con esa subcategoría (al quitarla o restaurarla). Devuelve cuántos.
create or replace function catalogo_refrescar_docs(sub text) returns integer language plpgsql as $$
declare n integer;
begin
  perform set_config('tolatino.solo_doc', 'on', true);
  update businesses set name = name where subcategory_ids @> array[sub];
  get diagnostics n = row_count;
  perform set_config('tolatino.solo_doc', '', true);
  return n;
end $$;

-- Sinónimos: quién y cuándo los cambió por última vez (agregar, apagar, encender).
alter table synonyms add column if not exists updated_at timestamptz;

commit;
