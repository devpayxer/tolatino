-- To'Latino — "Contacto por mensaje". The owner opts in to being messaged and
-- picks the channel (SMS or WhatsApp); the public listing then shows a functional
-- Mensaje button that opens that channel to the business phone. Adds two columns
-- and threads them through BOTH read paths. Return-type change → drop + recreate.
-- Idempotent. Apply: paste into the Supabase SQL Editor and Run.

alter table public.businesses add column if not exists accepts_messages boolean not null default false;
alter table public.businesses add column if not exists message_channel text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'businesses_message_channel_chk') then
    alter table public.businesses
      add constraint businesses_message_channel_chk
      check (message_channel is null or message_channel in ('sms', 'whatsapp'));
  end if;
end $$;

-- ── businesses_v2: geo feed + message opt-in ────────────────────────────────
drop function if exists public.businesses_v2(double precision, double precision, text, int, double precision);

create or replace function public.businesses_v2(
  user_lat double precision default null,
  user_lng double precision default null,
  in_city  text default null,
  max_results int default 50,
  radius_m double precision default 80000
) returns table (
  slug text, name text, category_id text,
  rating numeric, reviews_count int,
  price_level text, is_open boolean, tier text,
  endorse_count int, tile_a text, tile_b text,
  specialty_es text, specialty_en text,
  subcategories text[],
  features text[],
  hours jsonb,
  amenities_es text[], amenities_en text[],
  review_es text, review_en text,
  phone text, address text, city text, website text,
  accepts_messages boolean, message_channel text,
  about_es text, about_en text,
  distance_m double precision
) language sql stable as $$
  with origin as (
    select case when user_lat is not null and user_lng is not null
                then st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography
           end as g
  )
  select b.slug, b.name, b.category_id,
         b.rating, b.reviews_count,
         b.price_level, b.is_open, b.tier,
         b.endorse_count, b.tile_a, b.tile_b,
         b.specialty_es, b.specialty_en,
         b.subcategories,
         b.features,
         b.hours,
         (select coalesce(array_agg(a.name_es order by a.id), '{}')
            from public.business_amenities ba join public.amenities a on a.id = ba.amenity_id
           where ba.business_id = b.id),
         (select coalesce(array_agg(a.name_en order by a.id), '{}')
            from public.business_amenities ba join public.amenities a on a.id = ba.amenity_id
           where ba.business_id = b.id),
         (select r.body_es from public.reviews r where r.business_id = b.id and r.featured order by r.created_at desc limit 1),
         (select r.body_en from public.reviews r where r.business_id = b.id and r.featured order by r.created_at desc limit 1),
         b.phone, b.address, b.city, b.website,
         b.accepts_messages, b.message_channel,
         b.about_es, b.about_en,
         case when o.g is not null and b.location is not null
              then st_distance(b.location, o.g) end
  from public.businesses b
  cross join origin o
  where (in_city is null or b.city = in_city)
    and b.tile_a is not null
    and (
      o.g is null or radius_m is null or b.location is null
      or st_distance(b.location, o.g) <= radius_m
    )
  order by
    (case when o.g is not null and b.location is not null
          then st_distance(b.location, o.g) end) asc nulls last,
    b.rating desc
  limit greatest(1, least(max_results, 100));
$$;

grant execute on function public.businesses_v2 to anon, authenticated;

-- ── business_by_slug: single listing by slug + message opt-in ───────────────
drop function if exists public.business_by_slug(text);

create or replace function public.business_by_slug(in_slug text)
returns table (
  slug text, name text, category_id text,
  rating numeric, reviews_count int,
  price_level text, is_open boolean, tier text,
  endorse_count int, tile_a text, tile_b text,
  specialty_es text, specialty_en text,
  subcategories text[],
  features text[],
  hours jsonb,
  amenities_es text[], amenities_en text[],
  review_es text, review_en text,
  phone text, address text, city text, website text,
  accepts_messages boolean, message_channel text,
  about_es text, about_en text,
  distance_m double precision
) language sql stable as $$
  select b.slug, b.name, b.category_id,
         b.rating, b.reviews_count,
         b.price_level, b.is_open, b.tier,
         b.endorse_count, b.tile_a, b.tile_b,
         b.specialty_es, b.specialty_en,
         b.subcategories,
         b.features,
         b.hours,
         (select coalesce(array_agg(a.name_es order by a.id), '{}')
            from public.business_amenities ba join public.amenities a on a.id = ba.amenity_id
           where ba.business_id = b.id),
         (select coalesce(array_agg(a.name_en order by a.id), '{}')
            from public.business_amenities ba join public.amenities a on a.id = ba.amenity_id
           where ba.business_id = b.id),
         (select r.body_es from public.reviews r where r.business_id = b.id and r.featured order by r.created_at desc limit 1),
         (select r.body_en from public.reviews r where r.business_id = b.id and r.featured order by r.created_at desc limit 1),
         b.phone, b.address, b.city, b.website,
         b.accepts_messages, b.message_channel,
         b.about_es, b.about_en,
         null::double precision
  from public.businesses b
  where b.slug = in_slug
  limit 1;
$$;

grant execute on function public.business_by_slug(text) to anon, authenticated;
