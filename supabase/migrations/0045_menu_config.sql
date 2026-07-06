-- To'Latino — professional Food-menu admin: menu structure (categories, reusable
-- modifier groups, dayparts, promotions, stock automation) stored as one jsonb
-- blob per business. Menu ITEMS keep living in business_items (kind='menu',
-- migration 0021). The dashboard reads/writes menu_config directly (select('*')
-- + resilient update — no RPC changes needed); the public listing renders the
-- real menu via business_menu_by_slug. Idempotent. Apply: paste into the
-- Supabase SQL Editor + Run.

alter table public.businesses add column if not exists menu_config jsonb;

-- ── public listing: the real menu for a slug ─────────────────────────────────
-- One row: every menu item (jsonb array, sorted) + the business's menu_config.
-- The Menú tab groups items by config categories and builds the option pickers
-- from the config's modifier groups.
create or replace function public.business_menu_by_slug(in_slug text)
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
        where i.business_id = b.id and i.kind = 'menu' and i.available),
      '[]'::jsonb),
    coalesce(b.menu_config, '{}'::jsonb)
  from public.businesses b
  where b.slug = in_slug
  limit 1;
$$;

grant execute on function public.business_menu_by_slug(text) to anon, authenticated;

notify pgrst, 'reload schema';
