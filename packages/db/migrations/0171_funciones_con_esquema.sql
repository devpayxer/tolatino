-- 0171 · Anchos (16 nov) — las funciones que la base evalúa SOLA (índices por expresión y columnas generadas) llaman a las demás con su esquema.
-- El registro del sandbox decía cada minuto «function tl_unaccent(text) does not exist»: el autovacuum corre con search_path vacío y, al analizar
-- businesses, evalúa el índice businesses_norm_name_trgm → biz_norm_name → tl_unaccent sin «public.» → falla. La tabla de negocios se quedaba sin
-- estadísticas (el planificador a ciegas a 1M) y una restauración del respaldo (pg_restore también corre con search_path vacío) no habría podido
-- rehacer ese índice ni la columna generada help_chunks.tsv (ayuda_tsv → ayuda_sin_acentos). Mismo resultado, solo cambia cómo se nombra cada
-- llamada: el índice y la columna no cambian. Guardián funcionConEsquema. Idempotente.
begin;

create or replace function biz_norm_name(t text) returns text language sql immutable parallel safe as $$
  select btrim(regexp_replace(regexp_replace(lower(public.tl_unaccent(coalesce(t, ''))), '[^a-z0-9]+', ' ', 'g'), '\s+', ' ', 'g'))
$$;
create or replace function biz_first_word(t text) returns text language sql immutable parallel safe as $$
  select w from unnest(string_to_array(public.biz_norm_name(t), ' ')) with ordinality as x(w, i)
   where length(w) > 2 and w <> all (array['the', 'del', 'los', 'las', 'and']) order by i limit 1
$$;
create or replace function ayuda_tsv(lang text, titulo text, heading text, body text) returns tsvector language sql immutable parallel safe as $$
  select setweight(to_tsvector(case when lang = 'en' then 'english'::regconfig else 'spanish'::regconfig end, public.ayuda_sin_acentos(titulo)), 'A')
      || setweight(to_tsvector(case when lang = 'en' then 'english'::regconfig else 'spanish'::regconfig end, public.ayuda_sin_acentos(heading)), 'B')
      || setweight(to_tsvector(case when lang = 'en' then 'english'::regconfig else 'spanish'::regconfig end, public.ayuda_sin_acentos(body)), 'C')
$$;

commit;
