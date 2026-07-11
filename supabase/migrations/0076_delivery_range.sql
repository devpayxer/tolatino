-- 0076_delivery_range.sql — delivery-radius check for the cart.
--
-- The owner sets a numeric delivery radius in MILES from the dashboard
-- (Entregas y envíos → Ajustes → "Radio de entrega"), stored as
-- settings.delivery_ops.radiusMi. At checkout the cart asks
-- delivery_range_check() whether the chosen address falls inside that radius —
-- computed by PostGIS (st_dwithin on businesses.location, GIST-indexed) so the
-- geo math lives in the database, not the client.
--
-- Fail-open by design: a business with no radius set, or not yet geocoded,
-- returns in_range = true — the gate only applies to businesses that opted in.
-- The radius is parsed defensively (strict numeric regex); malformed input
-- behaves like "no radius". Also re-creates business_by_slug to expose the
-- radius (miles) inside the public `delivery` jsonb so the cart can display
-- "entrega hasta X mi" without a second round-trip. Idempotent.

create or replace function public.delivery_range_check(
  in_slug text, in_lat double precision, in_lng double precision
)
returns table(distance_m double precision, radius_m double precision, in_range boolean)
language sql stable as $function$
  with biz as (
    select b.location,
           case when coalesce(b.settings->'delivery_ops'->>'radiusMi', '') ~ '^\d+\.?\d*$'
                then (b.settings->'delivery_ops'->>'radiusMi')::numeric end as radius_mi
    from public.businesses b where b.slug = in_slug limit 1
  )
  select
    st_distance(biz.location, st_setsrid(st_makepoint(in_lng, in_lat), 4326)::geography) as distance_m,
    (biz.radius_mi * 1609.344)::double precision as radius_m,
    case
      when biz.location is null then true                 -- not geocoded: can't verify, don't block
      when coalesce(biz.radius_mi, 0) <= 0 then true      -- no radius set: no limit
      else st_dwithin(
             biz.location,
             st_setsrid(st_makepoint(in_lng, in_lat), 4326)::geography,
             (biz.radius_mi * 1609.344)::double precision
           )
    end as in_range
  from biz;
$function$;

grant execute on function public.delivery_range_check(text, double precision, double precision) to anon, authenticated;

-- business_by_slug: add 'radius' (miles, null when unset) to the delivery jsonb.
drop function if exists public.business_by_slug(text);
create function public.business_by_slug(in_slug text)
returns table(
  slug text, name text, category_id text, rating numeric, reviews_count integer,
  price_level text, is_open boolean, tier text, endorse_count integer, tile_a text, tile_b text,
  specialty_es text, specialty_en text, subcategories text[], features text[], card_features text[],
  hours jsonb, hours_exceptions jsonb, amenities_es text[], amenities_en text[],
  review_es text, review_en text, phone text, address text, city text, website text, logo_url text,
  accepts_messages boolean, message_channel text, message_phone text, about_es text, about_en text,
  distance_m double precision, modules jsonb, accepts_payments boolean, delivery jsonb
) language sql stable as $function$
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
         null::double precision,
         b.modules,
         coalesce(b.connect_charges_enabled, false),
         case when (b.settings->'shipping'->'delivery'->>'on')::boolean is true then
           jsonb_build_object(
             'on', true,
             'fee', coalesce(nullif(regexp_replace(b.settings->'shipping'->'delivery'->>'fee', '[^0-9.]', '', 'g'), ''), '0')::numeric,
             'min', coalesce(nullif(b.settings->'delivery_ops'->>'minOrder', ''), '0')::numeric,
             'prep', coalesce(nullif(b.settings->'delivery_ops'->>'prepTime', ''), '25')::numeric,
             'radius', case when coalesce(b.settings->'delivery_ops'->>'radiusMi', '') ~ '^\d+\.?\d*$'
                            then (b.settings->'delivery_ops'->>'radiusMi')::numeric end
           )
         else jsonb_build_object('on', false) end
  from public.businesses b
  where b.slug = in_slug
  limit 1;
$function$;

notify pgrst, 'reload schema';
