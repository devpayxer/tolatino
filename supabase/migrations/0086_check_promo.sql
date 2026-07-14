-- 0086_check_promo.sql — validate a business's own promo CODE at the cart, so the
-- discount preview is authoritative (the client never sees other codes or invents
-- one). A redeemable promo is an ACTIVE `percent` promo in the business's
-- menu_config with a non-empty `code`; the customer's subtotal must meet its
-- `minOrder`. The business funds the discount — the platform never does.
-- Idempotent, portable vanilla Postgres.
create or replace function public.check_promo(in_slug text, in_code text, in_subtotal numeric)
returns table(ok boolean, percent numeric, discount numeric, label text)
language sql stable security definer set search_path = public as $fn$
  with hit as (
    select pr
    from public.businesses b,
         lateral jsonb_array_elements(coalesce(b.menu_config->'promos', '[]'::jsonb)) as pr
    where b.slug = in_slug
      and pr->>'status' = 'active'
      and pr->>'type' = 'percent'
      and coalesce(nullif(btrim(pr->>'code'), ''), '') <> ''
      and upper(btrim(pr->>'code')) = upper(btrim(coalesce(in_code, '')))
      and coalesce((pr->>'value')::numeric, 0) > 0
      and coalesce(in_subtotal, 0) >= coalesce((pr->>'minOrder')::numeric, 0)
    limit 1
  )
  select
    (select count(*) from hit) > 0,
    coalesce((select (pr->>'value')::numeric from hit), 0),
    -- discount is % of subtotal, never more than the subtotal itself
    least(coalesce(in_subtotal, 0),
          round(coalesce((select (pr->>'value')::numeric from hit), 0) * coalesce(in_subtotal, 0) / 100, 2)),
    (select coalesce(nullif(pr->>'es', ''), pr->>'code') from hit);
$fn$;

grant execute on function public.check_promo(text, text, numeric) to anon, authenticated;

notify pgrst, 'reload schema';
