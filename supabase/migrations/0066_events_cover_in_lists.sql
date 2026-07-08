-- 0066_events_cover_in_lists.sql — surface the event COVER PHOTO in the list feeds.
-- events_near + search_events returned 15 columns (no cover_url), so the Eventos
-- cards fell back to the striped category gradient even when the organizer uploaded
-- a cover. Add cover_url as a 16th column so cards can show the real photo (the
-- detail already showed it). Return shape changes → DROP each function first (PG
-- refuses to change a live function's RETURNS TABLE columns). Idempotent.
-- Apply: paste this WHOLE file into the Supabase SQL Editor and Run.

-- ── events_near: + cover_url ─────────────────────────────────────────────────
drop function if exists public.events_near(double precision, double precision, double precision, int);
create function public.events_near(
  user_lat double precision default null,
  user_lng double precision default null,
  radius_m double precision default 80000,
  max_results int default 50
) returns table (
  slug text, title_es text, title_en text, venue_es text, venue_en text,
  cat text, starts_at timestamptz, time_label_es text, time_label_en text,
  price_label text, going_count int, desc_es text, desc_en text,
  tile_a text, tile_b text, cover_url text
) language sql stable as $$
  with origin as (
    select case when user_lat is not null and user_lng is not null
                then st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography
           end as g
  )
  select e.slug, e.title_es, e.title_en, e.venue_es, e.venue_en,
         e.cat, e.starts_at, e.time_label_es, e.time_label_en,
         e.price_label, e.going_count, e.desc_es, e.desc_en, e.tile_a, e.tile_b,
         e.cover_url
  from public.events e
  cross join origin o
  where e.status = 'published'
    and coalesce(e.ends_at, e.starts_at + interval '3 hours') >= now()
    and (o.g is null or radius_m is null or e.location is null
         or st_dwithin(e.location, o.g, radius_m))
  order by e.starts_at asc
  limit greatest(1, least(max_results, 100));
$$;
grant execute on function public.events_near to anon, authenticated;

-- ── search_events: + cover_url ───────────────────────────────────────────────
drop function if exists public.search_events(text, double precision, double precision, double precision, text, boolean, int, int);
create function public.search_events(
  in_q        text default null,
  user_lat    double precision default null,
  user_lng    double precision default null,
  radius_m    double precision default 80000,
  in_cat      text default null,
  in_free     boolean default null,
  max_results int default 30,
  in_offset   int default 0
) returns table (
  slug text, title_es text, title_en text, venue_es text, venue_en text,
  cat text, starts_at timestamptz, time_label_es text, time_label_en text,
  price_label text, going_count int, desc_es text, desc_en text,
  tile_a text, tile_b text, cover_url text
) language sql stable as $$
  with q as (select nullif(btrim(coalesce(in_q, '')), '') as t),
  origin as (
    select case when user_lat is not null and user_lng is not null
                then st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography end as g
  )
  select e.slug, e.title_es, e.title_en, e.venue_es, e.venue_en,
         e.cat, e.starts_at, e.time_label_es, e.time_label_en,
         e.price_label, e.going_count, e.desc_es, e.desc_en, e.tile_a, e.tile_b,
         e.cover_url
  from public.events e
  cross join origin o
  cross join q
  where e.status = 'published'
    and coalesce(e.ends_at, e.starts_at + interval '3 hours') >= now()
    and (o.g is null or radius_m is null or e.location is null
         or st_dwithin(e.location, o.g, radius_m))
    and (in_cat is null or e.cat = in_cat)
    and (in_free is null
         or (in_free and e.price_label is null)
         or (not in_free and e.price_label is not null))
    and (
      q.t is null
      or e.search_tsv @@ websearch_to_tsquery('simple', q.t)
      or e.title_es ilike '%' || q.t || '%'
      or e.title_en ilike '%' || q.t || '%'
      or similarity(e.title_es, q.t) > 0.2
    )
  order by
    (case when q.t is not null then ts_rank(e.search_tsv, websearch_to_tsquery('simple', q.t)) end) desc nulls last,
    e.starts_at asc
  offset greatest(0, in_offset)
  limit greatest(1, least(max_results, 60));
$$;
grant execute on function public.search_events(text, double precision, double precision, double precision, text, boolean, int, int) to anon, authenticated;

notify pgrst, 'reload schema';
