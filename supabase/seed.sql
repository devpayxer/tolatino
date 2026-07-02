-- To'Latino v2 seed — the Handoff v2 fixture world (Houston), idempotent.
-- Paste into the Supabase SQL Editor after 0002_v2_multicanal.sql.

-- ── Categories (v2 card categories) ─────────────────────────────────────────
insert into public.categories (id, name_es, name_en, sort) values
  ('AutoServices',  'Servicios de Auto',        'Auto Services',        1),
  ('BeautyHealth',  'Belleza y Salud',          'Beauty & Health',      2),
  ('FoodDrinks',    'Comida y Bebida',          'Food & Drinks',        3),
  ('HomeServices',  'Servicios del Hogar',      'Home Services',        4),
  ('NightLife',     'Vida Nocturna',            'Night Life',           5),
  ('Grocery',       'Supermercado',             'Grocery & Market',     6),
  ('Party',         'Fiestas y Celebraciones',  'Party & Celebrations', 7),
  ('HealthMedicine','Salud y Medicina',         'Health & Medicine',    8),
  ('ProServices',   'Servicios Profesionales',  'Professional Services',9),
  ('Shops',         'Tiendas',                  'Shops & Stores',      10),
  ('Transportation','Transporte',               'Transportation',      11),
  ('Education',     'Cursos y Educación',       'Courses & Education', 12),
  ('Children',      'Niños',                    'Children',            13),
  ('Sports',        'Vida Activa y Deportes',   'Active Life & Sports',14),
  ('Churches',      'Iglesias y Religión',      'Churches & Religion', 15)
on conflict (id) do update set name_es = excluded.name_es, name_en = excluded.name_en, sort = excluded.sort;

-- ── Amenities ───────────────────────────────────────────────────────────────
insert into public.amenities (id, name_es, name_en) values
  ('delivery',      'A domicilio',        'Delivery'),
  ('spanish',       'Español',            'Spanish'),
  ('parking',       'Estacionamiento',    'Parking'),
  ('free-quote',    'Presupuesto gratis', 'Free quote'),
  ('warranty',      'Garantía',           'Warranty'),
  ('custom-orders', 'Por encargo',        'Custom orders'),
  ('appointments',  'Con cita',           'Appointments'),
  ('no-wait',       'Sin espera',         'No wait'),
  ('no-insurance',  'Sin seguro OK',      'No insurance OK'),
  ('same-day',      'Mismo día',          'Same day'),
  ('free-consult',  'Consulta gratis',    'Free consult'),
  ('payment-plans', 'Planes de pago',     'Payment plans'),
  ('walk-in',       'Sin cita',           'Walk-in'),
  ('fast',          'Rápido',             'Fast'),
  ('nearby',        'Cerca',              'Nearby')
on conflict (id) do update set name_es = excluded.name_es, name_en = excluded.name_en;

-- ── Businesses (v2 cards) ───────────────────────────────────────────────────
insert into public.businesses
  (slug, name, category_id, tier, price_level, is_open, rating, reviews_count,
   endorse_count, tile_a, tile_b, specialty_es, specialty_en, city, address,
   phone, location)
values
  ('taqueria-la-esperanza', 'Taquería La Esperanza', 'FoodDrinks',     'verified', '$$',  true,  4.9, 320, 47, '#ECE3F8', '#E3D7F4', 'Especialidad · Tacos al pastor',        'Specialty · Tacos al pastor',        'Houston, TX', '5821 Bellaire Blvd, Houston, TX', '(832) 555-4521', st_setsrid(st_makepoint(-95.4588, 29.7058), 4326)::geography),
  ('don-beto-mecanica',     'Don Beto Mecánica',     'AutoServices',   'verified', '$',   true,  4.7, 128, 23, '#E7EEFB', '#DAE5F6', 'Especialidad · Frenos y suspensión',     'Specialty · Brakes & suspension',    'Houston, TX', '8203 Long Point Rd, Houston, TX', '(832) 555-1177', st_setsrid(st_makepoint(-95.5205, 29.8021), 4326)::geography),
  ('dulces-encanto',        'Dulces Encanto',        'FoodDrinks',     'verified', '$$',  true,  5.0,  96, 31, '#FBE9F0', '#F6DCE8', 'Especialidad · Pasteles temáticos',      'Specialty · Theme cakes',            'Houston, TX', '910 Mason Rd, Katy, TX',          '(832) 555-9042', st_setsrid(st_makepoint(-95.7700, 29.7900), 4326)::geography),
  ('salon-bella-vida',      'Salón Bella Vida',      'BeautyHealth',   'verified', '$$',  true,  4.8, 154, 19, '#FBE9F0', '#F5D8E6', 'Especialidad · Color y tratamientos',    'Specialty · Color & treatments',     'Houston, TX', '6446 Hillcroft Ave, Houston, TX', '(832) 555-3310', st_setsrid(st_makepoint(-95.4990, 29.7110), 4326)::geography),
  ('clinica-familiar-sana', 'Clínica Familiar Sana', 'HealthMedicine', 'verified', '$$',  false, 4.6,  78, 14, '#E3F5EA', '#D6EFDF', 'Especialidad · Medicina familiar',       'Specialty · Family medicine',        'Houston, TX', '7011 Harwin Dr, Houston, TX',     '(832) 555-2208', st_setsrid(st_makepoint(-95.5300, 29.7200), 4326)::geography),
  ('abogada-ramirez',       'Abogada Ramírez',       'ProServices',    'verified', '$$$', true,  4.9,  42, 12, '#E8E4FB', '#DCD6F6', 'Especialidad · Inmigración',             'Specialty · Immigration',            'Houston, TX', '2909 Hillcroft St, Houston, TX',  '(832) 555-8814', st_setsrid(st_makepoint(-95.4900, 29.7300), 4326)::geography),
  ('lavado-express-sol',    'Lavado Express Sol',    'AutoServices',   'free',     '$',   true,  4.5,  64,  0, '#E5EFFB', '#D7E5F6', 'Especialidad · Detallado completo',      'Specialty · Full detail',            'Houston, TX', '4410 Telephone Rd, Houston, TX',  '(832) 555-6720', st_setsrid(st_makepoint(-95.3200, 29.7000), 4326)::geography),
  ('ferreteria-el-tornillo','Ferretería El Tornillo','HomeServices',   'free',     '$',   true,  4.4,  53,  0, '#FCF1C7', '#F6E8AE', 'Especialidad · Herramienta y plomería',  'Specialty · Tools & plumbing',       'Houston, TX', '7500 Harrisburg Blvd, Houston, TX','(832) 555-4485', st_setsrid(st_makepoint(-95.3100, 29.7350), 4326)::geography)
on conflict (slug) do update set
  name = excluded.name, category_id = excluded.category_id, tier = excluded.tier,
  price_level = excluded.price_level, is_open = excluded.is_open,
  rating = excluded.rating, reviews_count = excluded.reviews_count,
  endorse_count = excluded.endorse_count, tile_a = excluded.tile_a, tile_b = excluded.tile_b,
  specialty_es = excluded.specialty_es, specialty_en = excluded.specialty_en,
  city = excluded.city, address = excluded.address, phone = excluded.phone,
  location = excluded.location;

-- amenities per business
with pairs(slug, amenity) as (values
  ('taqueria-la-esperanza','delivery'),('taqueria-la-esperanza','spanish'),('taqueria-la-esperanza','parking'),
  ('don-beto-mecanica','free-quote'),('don-beto-mecanica','spanish'),('don-beto-mecanica','warranty'),
  ('dulces-encanto','custom-orders'),('dulces-encanto','spanish'),('dulces-encanto','delivery'),
  ('salon-bella-vida','appointments'),('salon-bella-vida','spanish'),('salon-bella-vida','no-wait'),
  ('clinica-familiar-sana','no-insurance'),('clinica-familiar-sana','spanish'),('clinica-familiar-sana','same-day'),
  ('abogada-ramirez','free-consult'),('abogada-ramirez','spanish'),('abogada-ramirez','payment-plans'),
  ('lavado-express-sol','walk-in'),('lavado-express-sol','fast'),
  ('ferreteria-el-tornillo','spanish'),('ferreteria-el-tornillo','nearby')
)
insert into public.business_amenities (business_id, amenity_id)
select b.id, p.amenity from pairs p join public.businesses b on b.slug = p.slug
on conflict do nothing;

-- featured reviews (the card quote)
insert into public.reviews (business_id, author_name, author_initials, rating, body_es, body_en, featured)
select b.id, r.author, r.initials, 5, r.es, r.en, true
from (values
  ('taqueria-la-esperanza', 'Carlos R.',  'CR', '“El mejor pastor de Houston, sin exagerar.” — Carlos R.',      '“Best pastor in Houston, no joke.” — Carlos R.'),
  ('don-beto-mecanica',     'María G.',   'MG', '“Honrado y rápido, no te roba.” — María G.',                    '“Honest and fast, won’t rip you off.” — María G.'),
  ('dulces-encanto',        'Jonathan P.','JP', '“El pastel de Encanto quedó precioso.” — Jonathan P.',          '“The Encanto cake came out gorgeous.” — Jonathan P.'),
  ('salon-bella-vida',      'Sofía L.',   'SL', '“Salgo feliz cada vez, súper amables.” — Sofía L.',             '“I leave happy every time, so kind.” — Sofía L.'),
  ('clinica-familiar-sana', 'Ana E.',     'AE', '“Me atendieron sin seguro, muy humanos.” — Ana E.',             '“Seen without insurance, very caring.” — Ana E.'),
  ('abogada-ramirez',       'Roberto M.', 'RM', '“Nos guió en todo el proceso con paciencia.” — Roberto M.',     '“Guided us through it all patiently.” — Roberto M.')
) as r(slug, author, initials, es, en)
join public.businesses b on b.slug = r.slug
where not exists (select 1 from public.reviews x where x.business_id = b.id and x.featured);

-- ── Events ──────────────────────────────────────────────────────────────────
insert into public.events
  (slug, title_es, title_en, venue_es, venue_en, cat, city, starts_at,
   time_label_es, time_label_en, price_label, going_count, desc_es, desc_en, tile_a, tile_b)
values
  ('sabados-reggaeton',  'Sábados de Reggaetón', 'Reggaetón Saturdays', 'Club Tropikal · Bellaire',      'Club Tropikal · Bellaire',      'musica',  'Houston, TX', '2026-07-05 22:00-05', 'Sáb · 10:00 pm', 'Sat · 10:00 pm', '$15', 512, 'La mejor noche de reggaetón y perreo con DJ en vivo. Barra completa y zona VIP. +21.', 'The best reggaetón night with a live DJ. Full bar and VIP area. 21+.', '#E5DEF9', '#D9CEF3'),
  ('pulga-parque-59',    'Pulga del Parque 59',  'Park 59 Flea Market', 'Parque de la 59 · Gulfton',     'Park off 59 · Gulfton',         'mercado', 'Houston, TX', '2026-07-21 08:00-05', 'Dom · 8:00 am',  'Sun · 8:00 am',  null,  240, 'Encuentra de todo: ropa, antojitos, plantas y tesoros usados. Trae efectivo y sombrero.', 'Find everything: clothes, snacks, plants and used treasures. Bring cash and a hat.', '#FCF1C7', '#F6E8AE'),
  ('noche-de-loteria',   'Noche de Lotería',     'Lotería Night',       'Salón Jalisco · Bellaire',      'Salón Jalisco · Bellaire',      'musica',  'Houston, TX', '2026-07-27 19:00-05', 'Sáb · 7:00 pm',  'Sat · 7:00 pm',  '$10',  88, 'Lotería con premios en efectivo, cena y música. Ambiente familiar.', 'Lotería with cash prizes, dinner and music. Family-friendly.', '#EFEBFF', '#E5DEF9'),
  ('taller-de-pinatas',  'Taller de Piñatas',    'Piñata Workshop',     'Centro Comunitario · Alief',    'Community Center · Alief',      'familia', 'Houston, TX', '2026-08-05 11:00-05', 'Sáb · 11:00 am', 'Sat · 11:00 am', '$15',  64, 'Aprende a hacer piñatas tradicionales. Materiales incluidos. Para toda la familia.', 'Learn to make traditional piñatas. Materials included. For the whole family.', '#FBE9F0', '#F5D8E6'),
  ('feria-del-taco',     'Feria del Taco',       'Taco Fair',           'East End Market · Houston',     'East End Market · Houston',     'comida',  'Houston, TX', '2026-08-13 12:00-05', 'Dom · 12:00 pm', 'Sun · 12:00 pm', null,  380, 'Más de 20 taquerías, concurso de salsas y música regional. Entrada libre.', '20+ taquerías, a salsa contest and regional music. Free entry.', '#FCEBD6', '#F6DCBF'),
  ('concierto-de-banda', 'Concierto de Banda',   'Banda Concert',       'Arena Tejano · Pasadena',       'Arena Tejano · Pasadena',       'musica',  'Houston, TX', '2026-08-18 20:00-05', 'Sáb · 8:00 pm',  'Sat · 8:00 pm',  '$25', 720, 'Una noche de pura banda y corridos con artistas invitados. Boletos limitados.', 'A night of pure banda and corridos with guest artists. Limited tickets.', '#E8E4FB', '#DCD6F6')
on conflict (slug) do update set
  title_es = excluded.title_es, title_en = excluded.title_en,
  venue_es = excluded.venue_es, venue_en = excluded.venue_en,
  cat = excluded.cat, starts_at = excluded.starts_at,
  time_label_es = excluded.time_label_es, time_label_en = excluded.time_label_en,
  price_label = excluded.price_label, going_count = excluded.going_count,
  desc_es = excluded.desc_es, desc_en = excluded.desc_en,
  tile_a = excluded.tile_a, tile_b = excluded.tile_b;

-- ── Community posts ─────────────────────────────────────────────────────────
insert into public.posts
  (type, author_name, author_initials, author_color, hood, city, body_es, body_en,
   business_name, business_rating, poll_options, poll_votes, recommends, created_at)
select * from (values
  ('rec'::text,  'Carlos R.',   'CR', '#1F9D57', 'Bellaire',      'Houston, TX', 'El mejor al pastor de todo Houston, se los juro por mi abuela. Díganle a Don Beto que van de parte de Carlos. 🌮', 'Best al pastor in all of Houston, I swear on my abuela. Tell Don Beto that Carlos sent you. 🌮', 'Taquería La Esperanza', 4.9::numeric, null::jsonb, null::jsonb, 47, now() - interval '4 hours'),
  ('poll',       'Ana E.',      'AE', '#0E9384', 'Bellaire',      'Houston, TX', '¿Cuál es la mejor taquería del barrio? 🌮 ¡Voten!', 'Which is the best taquería in the hood? 🌮 Vote!', null, null, '["Taquería La Esperanza","El Rey del Taco","Doña Mary"]'::jsonb, '[24,18,9]'::jsonb, 6, now() - interval '5 hours'),
  ('ask',        'María G.',    'MG', '#7B61FF', 'Spring Branch', 'Houston, TX', '¿Alguien conoce un buen mecánico que no me robe? 😅 Mi Honda lleva días haciendo un ruido rarísimo.', 'Anyone know a good mechanic who won''t rob me? 😅 My Honda''s been making a weird noise for days.', null, null, null, null, 12, now() - interval '2 hours'),
  ('local',      'Doña Lucía',  'DL', '#2F6FED', 'Gulfton',       'Houston, TX', 'Mañana hay pulga en el parque de la 59. Lleven efectivo y sombrero, que va a estar el solazo ☀️', 'Flea market tomorrow at the park off 59. Bring cash and a hat — it''s gonna be scorching ☀️', null, null, null, null, 31, now() - interval '6 hours'),
  ('ask',        'Jonathan P.', 'JP', '#E8A23D', 'Katy',          'Houston, TX', 'Busco quién haga pasteles para el cumple de mi hija, tema de Encanto. ¡Recomiéndenme porfa! 🎂', 'Looking for someone who makes cakes for my daughter''s bday, Encanto theme. Recs please! 🎂', null, null, null, null, 9, now() - interval '8 hours')
) as p(type, author_name, author_initials, author_color, hood, city, body_es, body_en, business_name, business_rating, poll_options, poll_votes, recommends, created_at)
where not exists (select 1 from public.posts);
