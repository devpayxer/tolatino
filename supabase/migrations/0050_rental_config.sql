-- To'Latino — professional Renta admin: rental structure (categories, reusable
-- priced add-ons, rental mode) stored as one jsonb blob per business. Rental
-- ITEMS keep living in business_items (kind='rental', migration 0021); incoming
-- rental requests in business_rentals (0027). The dashboard reads/writes
-- rental_config directly (select('*') + resilient update); the public listing
-- renders the real rental items via business_rentals_by_slug. Idempotent.
-- Apply: paste into the Supabase SQL Editor + Run.

alter table public.businesses add column if not exists rental_config jsonb;

-- ── public listing: the real rental items for a slug ─────────────────────────
-- One row: every available rental item (jsonb array, sorted) + the rental_config.
-- The Renta tab groups items by config categories and builds the extras picker in
-- the Rentar sheet from the config's add-ons. `price` is the daily rate (the rich
-- hour/day/week rates + deposit live in attrs) — it MUST be selected so the public
-- listing shows a price (see the 0047 fix for services).
create or replace function public.business_rentals_by_slug(in_slug text)
returns table (items jsonb, config jsonb)
language sql stable as $$
  select
    coalesce(
      (select jsonb_agg(
                jsonb_build_object(
                  'id', i.id, 'name', i.name, 'description', i.description,
                  'section', i.section, 'available', i.available, 'price', i.price,
                  'sort', i.sort, 'image_url', i.image_url, 'attrs', i.attrs
                ) order by i.sort, i.created_at)
         from public.business_items i
        where i.business_id = b.id and i.kind = 'rental' and i.available),
      '[]'::jsonb),
    coalesce(b.rental_config, '{}'::jsonb)
  from public.businesses b
  where b.slug = in_slug
  limit 1;
$$;

grant execute on function public.business_rentals_by_slug(text) to anon, authenticated;

notify pgrst, 'reload schema';
