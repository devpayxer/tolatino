-- To'Latino — professional Productos admin: product structure (categories,
-- reusable option sets/variants, curated collections, discounts, sell mode)
-- stored as one jsonb blob per business. Product ITEMS keep living in
-- business_items (kind='product', migration 0021). The dashboard reads/writes
-- product_config directly (select('*') + resilient update); the public listing
-- renders the real shop via business_products_by_slug. Idempotent. Apply: paste
-- into the Supabase SQL Editor + Run.

alter table public.businesses add column if not exists product_config jsonb;

-- ── public listing: the real products for a slug ─────────────────────────────
-- One row: every available product (jsonb array, sorted) + the product_config.
-- The Tienda tab groups items by config categories, builds the option/variant
-- picker from the config's option sets, and shows featured collections.
-- NOTE: 'price' IS included (a services RPC once omitted it → showed "Gratis").
create or replace function public.business_products_by_slug(in_slug text)
returns table (items jsonb, config jsonb)
language sql stable as $$
  select
    coalesce(
      (select jsonb_agg(
                jsonb_build_object(
                  'id', i.id, 'name', i.name, 'description', i.description,
                  'price', i.price, 'section', i.section, 'available', i.available,
                  'sort', i.sort, 'image_url', i.image_url, 'attrs', i.attrs
                ) order by i.sort, i.created_at)
         from public.business_items i
        where i.business_id = b.id and i.kind = 'product' and i.available),
      '[]'::jsonb),
    coalesce(b.product_config, '{}'::jsonb)
  from public.businesses b
  where b.slug = in_slug
  limit 1;
$$;

grant execute on function public.business_products_by_slug(text) to anon, authenticated;

notify pgrst, 'reload schema';
