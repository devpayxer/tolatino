-- To'Latino — professional Servicios admin: service structure (categories,
-- reusable add-ons, booking mode) stored as one jsonb blob per business. Service
-- ITEMS keep living in business_items (kind='service', migration 0021); bookings
-- in business_bookings (0027). The dashboard reads/writes service_config directly
-- (select('*') + resilient update); the public listing renders the real services
-- via business_services_by_slug. Idempotent. Apply: paste into the Supabase SQL
-- Editor + Run.

alter table public.businesses add column if not exists service_config jsonb;

-- ── public listing: the real services for a slug ─────────────────────────────
-- One row: every available service (jsonb array, sorted) + the service_config.
-- The Servicios tab groups items by config categories and builds the add-on
-- picker in the booking sheet from the config's add-ons.
create or replace function public.business_services_by_slug(in_slug text)
returns table (items jsonb, config jsonb)
language sql stable as $$
  select
    coalesce(
      (select jsonb_agg(
                jsonb_build_object(
                  'id', i.id, 'name', i.name, 'description', i.description,
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
