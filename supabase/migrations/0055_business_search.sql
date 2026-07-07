-- To'Latino — professional server-side search. Today the consumer text search is
-- a client-side substring match over the ~50-business geo slice — it misses
-- matches beyond the radius and doesn't rank. This adds real Postgres full-text
-- search (GIN over a generated tsvector) + trigram fuzzy fallback, with the same
-- geo + filter + pagination story, so search scales (non-negotiable #4) and ranks
-- by relevance then distance. Returns the SAME columns as businesses_v2 so the
-- client reuses its row mapper. Idempotent. Apply: paste into the SQL Editor + Run.

create extension if not exists pg_trgm;

-- search document (name + specialty + subcategories + category); 'simple' config =
-- tokenize/lowercase without stemming (works for ES + EN + brand names).
-- NOTE: to_tsvector(regconfig, text) is STABLE, not IMMUTABLE, so it can't back a
-- GENERATED column (Postgres error 42P17). We keep search_tsv as a plain column and
-- maintain it with a BEFORE INSERT/UPDATE trigger + a one-time backfill instead.
alter table public.businesses add column if not exists search_tsv tsvector;

create or replace function public.tg_business_search_tsv() returns trigger
language plpgsql as $$
begin
  new.search_tsv := to_tsvector('simple',
    coalesce(new.name, '') || ' ' ||
    coalesce(new.specialty_es, '') || ' ' || coalesce(new.specialty_en, '') || ' ' ||
    coalesce(array_to_string(new.subcategories, ' '), '') || ' ' ||
    coalesce(new.category_id, ''));
  return new;
end $$;
drop trigger if exists trg_business_search_tsv on public.businesses;
create trigger trg_business_search_tsv before insert or update on public.businesses
  for each row execute function public.tg_business_search_tsv();

-- backfill existing rows (trigger only fires on future writes)
update public.businesses set search_tsv = to_tsvector('simple',
  coalesce(name, '') || ' ' ||
  coalesce(specialty_es, '') || ' ' || coalesce(specialty_en, '') || ' ' ||
  coalesce(array_to_string(subcategories, ' '), '') || ' ' ||
  coalesce(category_id, ''));

create index if not exists businesses_search_gin on public.businesses using gin (search_tsv);
create index if not exists businesses_name_trgm on public.businesses using gin (name gin_trgm_ops);

create or replace function public.search_businesses(
  in_q          text default null,
  user_lat      double precision default null,
  user_lng      double precision default null,
  in_city       text default null,
  in_cat        text default null,
  in_price      text default null,
  in_min_rating numeric default null,
  max_results   int default 40,
  in_offset     int default 0,
  radius_m      double precision default 80000
) returns table (
  slug text, name text, category_id text,
  rating numeric, reviews_count int,
  price_level text, is_open boolean, tier text,
  endorse_count int, tile_a text, tile_b text,
  specialty_es text, specialty_en text,
  subcategories text[],
  features text[], card_features text[],
  hours jsonb, hours_exceptions jsonb,
  amenities_es text[], amenities_en text[],
  review_es text, review_en text,
  phone text, address text, city text, website text, logo_url text,
  accepts_messages boolean, message_channel text, message_phone text,
  about_es text, about_en text,
  distance_m double precision
) language sql stable as $$
  with q as (select nullif(btrim(coalesce(in_q, '')), '') as t),
  origin as (
    select case when user_lat is not null and user_lng is not null
                then st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography end as g
  )
  select b.slug, b.name, b.category_id,
         b.rating, b.reviews_count,
         b.price_level, b.is_open, b.tier,
         b.endorse_count, b.tile_a, b.tile_b,
         b.specialty_es, b.specialty_en,
         b.subcategories,
         b.features, b.card_features,
         b.hours, b.hours_exceptions,
         (select coalesce(array_agg(a.name_es order by a.id), '{}')
            from public.business_amenities ba join public.amenities a on a.id = ba.amenity_id
           where ba.business_id = b.id),
         (select coalesce(array_agg(a.name_en order by a.id), '{}')
            from public.business_amenities ba join public.amenities a on a.id = ba.amenity_id
           where ba.business_id = b.id),
         (select r.body_es from public.reviews r where r.business_id = b.id and r.featured order by r.created_at desc limit 1),
         (select r.body_en from public.reviews r where r.business_id = b.id and r.featured order by r.created_at desc limit 1),
         b.phone, b.address, b.city, b.website, b.logo_url,
         b.accepts_messages, b.message_channel, b.message_phone,
         b.about_es, b.about_en,
         case when o.g is not null and b.location is not null then st_distance(b.location, o.g) end
  from public.businesses b
  cross join origin o
  cross join q
  where b.tile_a is not null
    and (in_city is null or b.city = in_city)
    and (in_cat is null or in_cat = 'all' or b.category_id = in_cat)
    and (in_price is null or b.price_level = in_price)
    and (in_min_rating is null or b.rating >= in_min_rating)
    and (o.g is null or radius_m is null or b.location is null or st_distance(b.location, o.g) <= radius_m)
    and (
      q.t is null
      or b.search_tsv @@ websearch_to_tsquery('simple', q.t)
      or b.name ilike '%' || q.t || '%'
      or similarity(b.name, q.t) > 0.2
    )
  order by
    (case when q.t is not null then ts_rank(b.search_tsv, websearch_to_tsquery('simple', q.t)) end) desc nulls last,
    (case when o.g is not null and b.location is not null then st_distance(b.location, o.g) end) asc nulls last,
    b.rating desc
  offset greatest(0, in_offset)
  limit greatest(1, least(max_results, 60));
$$;

grant execute on function public.search_businesses to anon, authenticated;

notify pgrst, 'reload schema';
