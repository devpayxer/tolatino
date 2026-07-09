-- 0075_public_delivery_info.sql — expose the business's delivery offer (on/fee/
-- minimum/eta) on the public read so the cart can show real fees BEFORE checkout
-- (server stays authoritative at charge time). Idempotent.

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
             'prep', coalesce(nullif(b.settings->'delivery_ops'->>'prepTime', ''), '25')::numeric
           )
         else jsonb_build_object('on', false) end
  from public.businesses b
  where b.slug = in_slug
  limit 1;
$function$;

notify pgrst, 'reload schema';
