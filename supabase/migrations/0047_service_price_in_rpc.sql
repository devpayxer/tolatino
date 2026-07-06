-- To'Latino — fix: the public services RPC (business_services_by_slug, migration
-- 0046) was omitting the item's `price` column from the returned jsonb, so the
-- consumer listing read price = null and rendered fixed-price services as
-- "Gratis". The price lives in business_items.price (the dashboard reads it
-- directly and shows it correctly); only the RPC's jsonb_build_object was missing
-- it. Re-create the function WITH 'price'. Idempotent (create or replace). Apply:
-- paste into the Supabase SQL Editor + Run.

create or replace function public.business_services_by_slug(in_slug text)
returns table (items jsonb, config jsonb)
language sql stable as $$
  select
    coalesce(
      (select jsonb_agg(
                jsonb_build_object(
                  'id', i.id, 'name', i.name, 'description', i.description,
                  'price', i.price,
                  'section', i.section, 'available', i.available,
                  'sort', i.sort, 'image_url', i.image_url, 'attrs', i.attrs
                ) order by i.sort, i.created_at)
         from public.business_items i
        where i.business_id = b.id and i.kind = 'service' and i.available),
      '[]'::jsonb),
    coalesce(b.service_config, '{}'::jsonb)
  from public.businesses b
  where b.slug = in_slug
  limit 1;
$$;

grant execute on function public.business_services_by_slug(text) to anon, authenticated;

notify pgrst, 'reload schema';
