-- To'Latino — seed data (idempotent). Mirrors the app's sample businesses so
-- the live app shows the same listings, now backed by Postgres + PostGIS.
-- Apply after 0001_init.sql.

-- ── Categories (the 16) ─────────────────────────────────────────────────────
insert into public.categories (id, name_es, name_en, sort) values
  ('auto',         'Servicios de auto',  'Auto services',    1),
  ('beauty',       'Belleza y salud',    'Beauty & health',  2),
  ('food',         'Comida y bebida',    'Food & drink',     3),
  ('retail',       'Tiendas y retail',   'Retail & shops',   4),
  ('services',     'Servicios',          'Services',         5),
  ('health',       'Salud',              'Health',           6),
  ('events',       'Eventos',            'Events',           7),
  ('home',         'Hogar y reparación', 'Home & repair',    8),
  ('education',    'Educación',          'Education',         9),
  ('professional', 'Profesional',        'Professional',     10),
  ('nightlife',    'Vida nocturna',      'Nightlife',        11),
  ('fitness',      'Fitness',            'Fitness',          12),
  ('pets',         'Mascotas',           'Pets',             13),
  ('arts',         'Arte y cultura',     'Arts & culture',   14),
  ('travel',       'Viajes',             'Travel',           15),
  ('community',    'Comunidad',          'Community',        16)
on conflict (id) do update set name_es = excluded.name_es, name_en = excluded.name_en, sort = excluded.sort;

-- ── Amenities ───────────────────────────────────────────────────────────────
insert into public.amenities (id, name_es, name_en) values
  ('delivery',   'A domicilio',     'Delivery'),
  ('takeout',    'Para llevar',     'Takeout'),
  ('cards',      'Acepta tarjeta',  'Cards accepted'),
  ('family',     'Apto familias',   'Family friendly'),
  ('custom',     'Por encargo',     'Custom orders')
on conflict (id) do update set name_es = excluded.name_es, name_en = excluded.name_en;

-- ── Businesses (with Houston geo points: st_makepoint(lng, lat)) ─────────────
insert into public.businesses
  (slug, name, category_id, tagline_es, tagline_en, tier, price_level,
   about_es, about_en, address, phone, hours_es, hours_en, is_open,
   promo_es, promo_en, photo_seed, rating, reviews_count, location)
values
  ('esperanza', 'Taquería La Esperanza', 'food', 'Comida Mexicana', 'Mexican Food',
   'verified', '$$',
   'Tacos al pastor, birria y aguas frescas hechas en casa. Negocio familiar desde 2009.',
   'Al pastor tacos, birria, and homemade aguas frescas. Family-owned since 2009.',
   '2890 Mission St, Houston, TX', '(713) 555-0148',
   'Abierto · cierra 10:00 PM', 'Open · closes 10:00 PM', true,
   'Martes 2×1', 'Tuesday 2×1', 'taqueria', 4.9, 320,
   st_setsrid(st_makepoint(-95.4060, 29.7450), 4326)::geography),

  ('primo', 'Tacos El Primo', 'food', 'Food truck', 'Food truck',
   'free', '$',
   null, null, 'Harrisburg Blvd, Houston, TX', null, null, null, true,
   null, null, 'tacoselprimo', 4.6, 54,
   st_setsrid(st_makepoint(-95.3210, 29.7430), 4326)::geography),

  ('dulce', 'Panadería Dulce', 'food', 'Panadería', 'Bakery',
   'verified', '$$',
   'Pan dulce, conchas y pasteles por encargo. Café de olla todas las mañanas.',
   'Pan dulce, conchas, and custom cakes. Café de olla every morning.',
   '5410 Gulfton St, Houston, TX', '(713) 555-0192',
   'Cerrado · abre 7:00 AM', 'Closed · opens 7:00 AM', false,
   'Pan caliente 6 PM', 'Fresh bread 6 PM', 'panaderia', 4.8, 210,
   st_setsrid(st_makepoint(-95.4940, 29.7100), 4326)::geography)
on conflict (slug) do update set
  name = excluded.name, category_id = excluded.category_id,
  tagline_es = excluded.tagline_es, tagline_en = excluded.tagline_en,
  tier = excluded.tier, price_level = excluded.price_level,
  about_es = excluded.about_es, about_en = excluded.about_en,
  address = excluded.address, phone = excluded.phone,
  hours_es = excluded.hours_es, hours_en = excluded.hours_en, is_open = excluded.is_open,
  promo_es = excluded.promo_es, promo_en = excluded.promo_en,
  photo_seed = excluded.photo_seed, rating = excluded.rating,
  reviews_count = excluded.reviews_count, location = excluded.location;

-- ── Business amenities (verified businesses) ────────────────────────────────
insert into public.business_amenities (business_id, amenity_id)
select b.id, a.id
from public.businesses b
join (values
  ('esperanza','delivery'), ('esperanza','takeout'), ('esperanza','cards'), ('esperanza','family'),
  ('dulce','custom'), ('dulce','takeout'), ('dulce','cards')
) as x(slug, amenity) on x.slug = b.slug
join public.amenities a on a.id = x.amenity
on conflict do nothing;

-- ── Reviews (featured for the verified detail) ──────────────────────────────
insert into public.reviews (business_id, author_name, author_initials, rating, body_es, body_en, featured)
select b.id, 'María G.', 'MG', 5,
  '«Los mejores tacos al pastor del barrio. Porciones generosas y trato familiar.»',
  '“Best al pastor tacos in the neighborhood. Generous portions and a family feel.”',
  true
from public.businesses b where b.slug = 'esperanza'
on conflict do nothing;
