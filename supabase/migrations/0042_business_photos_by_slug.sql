-- To'Latino — the public listing (BizDetail) shows the owner's real gallery
-- photos (business_photos, migration 0019) instead of placeholder tiles. The
-- consumer only has the public slug, so this RPC returns a business's photos by
-- slug in one indexed round-trip (cover first, then sort). Public read.
-- Idempotent. Apply: paste into the SQL Editor + Run.

create or replace function public.business_photos_by_slug(in_slug text)
returns table (url text, is_cover boolean, sort int)
language sql stable as $$
  select p.url, p.is_cover, p.sort
  from public.business_photos p
  join public.businesses b on b.id = p.business_id
  where b.slug = in_slug
  order by p.is_cover desc, p.sort asc, p.created_at asc
  limit 24;
$$;

grant execute on function public.business_photos_by_slug(text) to anon, authenticated;
