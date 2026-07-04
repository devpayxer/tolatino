-- To'Latino — let signed-in users publish a business. A SECURITY DEFINER rpc
-- does the insert (generates a unique slug, sets the PostGIS location and the
-- category-gradient tile, stamps the owner) so the client never needs raw table
-- writes. Owners can later edit/delete their own listing. Idempotent.
-- Apply: paste into the Supabase SQL Editor and Run.

alter table public.businesses add column if not exists owner_id uuid references auth.users(id) on delete set null;
create index if not exists businesses_owner_idx on public.businesses (owner_id);

-- Owner can edit / delete their own listing (public read already exists).
drop policy if exists "update own business" on public.businesses;
drop policy if exists "delete own business" on public.businesses;
create policy "update own business" on public.businesses
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "delete own business" on public.businesses
  for delete using (auth.uid() = owner_id);

-- Guarantee every top-level category exists (so the FK on insert never fails).
insert into public.categories (id, name_es, name_en, sort) values
  ('AutoServices','Servicios de Auto','Auto Services',1),
  ('BeautyHealth','Belleza y Salud','Beauty & Health',2),
  ('FoodDrinks','Comida y Bebida','Food & Drinks',3),
  ('HomeServices','Servicios del Hogar','Home Services',4),
  ('NightLife','Vida Nocturna','Night Life',5),
  ('Grocery','Supermercado','Grocery & Market',6),
  ('Party','Fiestas y Celebraciones','Party & Celebrations',7),
  ('HealthMedicine','Salud y Medicina','Health & Medicine',8),
  ('ProServices','Servicios Profesionales','Professional Services',9),
  ('Shops','Tiendas','Shops & Stores',10),
  ('Transportation','Transporte','Transportation',11),
  ('Education','Cursos y Educación','Courses & Education',12),
  ('Children','Niños','Children',13),
  ('Sports','Vida Activa y Deportes','Active Life & Sports',14),
  ('Churches','Iglesias y Religión','Churches & Religion',15)
on conflict (id) do nothing;

-- ── Create business (returns the new slug) ──────────────────────────────────
create or replace function public.create_business(
  p_name         text,
  p_category     text,
  p_subcats      text[],
  p_price        text,
  p_phone        text,
  p_address      text,
  p_city         text,
  p_about        text,
  p_specialty_es text,
  p_specialty_en text,
  p_tile_a       text,
  p_tile_b       text,
  p_lat          double precision,
  p_lng          double precision
) returns text
language plpgsql security definer set search_path = public as $$
declare
  uid      uuid := auth.uid();
  new_slug text;
begin
  if uid is null then raise exception 'auth required'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'name required'; end if;
  if not exists (select 1 from categories where id = p_category) then raise exception 'invalid category'; end if;

  new_slug := trim(both '-' from regexp_replace(lower(trim(p_name)), '[^a-z0-9]+', '-', 'g'));
  if new_slug = '' then new_slug := 'negocio'; end if;
  new_slug := new_slug || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);

  insert into businesses (
    slug, name, category_id, owner_id, tier, price_level, is_open,
    phone, address, city, about_es, about_en,
    specialty_es, specialty_en, subcategories, tile_a, tile_b,
    rating, reviews_count, location
  ) values (
    new_slug, trim(p_name), p_category, uid, 'free', nullif(p_price, ''), true,
    nullif(p_phone, ''), nullif(p_address, ''), coalesce(nullif(p_city, ''), 'Houston, TX'),
    nullif(p_about, ''), nullif(p_about, ''),
    nullif(p_specialty_es, ''), nullif(p_specialty_en, ''),
    coalesce(p_subcats, '{}'), coalesce(nullif(p_tile_a, ''), '#EFEBFF'), coalesce(nullif(p_tile_b, ''), '#7B61FF'),
    0, 0,
    case when p_lat is not null and p_lng is not null
         then st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography end
  );
  return new_slug;
end $$;

-- Grant the exact signature (not the bare name) so re-running this migration
-- when a later overload also exists never trips "42725: function is not unique".
grant execute on function public.create_business(
  text, text, text[], text, text, text, text, text, text, text, text, text, double precision, double precision
) to authenticated;
