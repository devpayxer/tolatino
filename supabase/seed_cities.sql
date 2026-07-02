-- To'Latino — seed businesses / events / community posts for three
-- Latino-heavy cities: Hazleton PA (Dominican), Boston MA (Salvadoran/
-- Colombian, East Boston & JP), The Bronx NY (Puerto Rican/Dominican).
-- Coordinates are real neighborhood points so the distance-scoped geo query
-- surfaces them per city. Idempotent (on conflict / not-exists guards).
--
-- Apply AFTER 0002_v2_multicanal.sql, seed.sql and 0004_geo_scope.sql.
-- Paste into the Supabase SQL Editor and Run.

-- ── Backfill Houston events with coordinates (so radius scoping works) ───────
update public.events e set location = v.loc
from (values
  ('sabados-reggaeton',  st_setsrid(st_makepoint(-95.459, 29.706), 4326)::geography),
  ('pulga-parque-59',    st_setsrid(st_makepoint(-95.497, 29.703), 4326)::geography),
  ('noche-de-loteria',   st_setsrid(st_makepoint(-95.462, 29.706), 4326)::geography),
  ('taller-de-pinatas',  st_setsrid(st_makepoint(-95.606, 29.713), 4326)::geography),
  ('feria-del-taco',     st_setsrid(st_makepoint(-95.310, 29.740), 4326)::geography),
  ('concierto-de-banda', st_setsrid(st_makepoint(-95.209, 29.691), 4326)::geography)
) as v(slug, loc)
where e.slug = v.slug and e.location is null;

-- ── Businesses (Hazleton · Boston · Bronx) ──────────────────────────────────
insert into public.businesses
  (slug, name, category_id, tier, price_level, is_open, rating, reviews_count,
   endorse_count, tile_a, tile_b, specialty_es, specialty_en, city, address, phone, location)
values
  -- Hazleton, PA (Dominican community — Alter St / Broad St)
  ('hz-sabor-quisqueya',   'El Sabor de Quisqueya',   'FoodDrinks',   'verified', '$$',  true,  4.8, 176, 38, '#ECE3F8', '#E3D7F4', 'Especialidad · La bandera dominicana', 'Specialty · Dominican bandera plate', 'Hazleton, PA', '52 W Broad St, Hazleton, PA', '(570) 555-2210', st_setsrid(st_makepoint(-75.9760, 40.9490), 4326)::geography),
  ('hz-barberia-primera',  'Barbería D'' Primera',     'BeautyHealth', 'verified', '$',   true,  4.9, 142, 27, '#FBE9F0', '#F5D8E6', 'Especialidad · Cortes y diseños',      'Specialty · Cuts & designs',           'Hazleton, PA', '118 Alter St, Hazleton, PA',   '(570) 555-3341', st_setsrid(st_makepoint(-75.9720, 40.9605), 4326)::geography),
  ('hz-colmado-esquina',   'Colmado La Esquina',       'Grocery',      'free',     '$',   true,  4.5,  61,  0, '#E3F5EA', '#D6E7D0', 'Especialidad · Víveres y productos latinos', 'Specialty · Latin groceries',      'Hazleton, PA', '201 Alter St, Hazleton, PA',   '(570) 555-8890', st_setsrid(st_makepoint(-75.9800, 40.9560), 4326)::geography),
  ('hz-taller-reyes',      'Taller Hermanos Reyes',    'AutoServices', 'verified', '$',   true,  4.7,  88, 15, '#E7EEFB', '#DAE5F6', 'Especialidad · Frenos y diagnóstico',  'Specialty · Brakes & diagnostics',     'Hazleton, PA', '445 N Wyoming St, Hazleton, PA','(570) 555-4477', st_setsrid(st_makepoint(-75.9680, 40.9520), 4326)::geography),
  ('hz-remesas-caribe',    'Envíos y Remesas Caribe',  'ProServices',  'verified', '$$',  true,  4.6,  54, 11, '#E8E4FB', '#DCD6F6', 'Especialidad · Remesas y envíos a RD', 'Specialty · Remittances to DR',        'Hazleton, PA', '33 E Broad St, Hazleton, PA',  '(570) 555-6612', st_setsrid(st_makepoint(-75.9755, 40.9575), 4326)::geography),

  -- Boston, MA (Salvadoran/Colombian — East Boston / Jamaica Plain / Roxbury)
  ('bo-pupuseria-bendicion','Pupusería La Bendición',  'FoodDrinks',   'verified', '$$',  true,  4.9, 264, 52, '#ECE3F8', '#E3D7F4', 'Especialidad · Pupusas salvadoreñas',  'Specialty · Salvadoran pupusas',       'Boston, MA', '215 Meridian St, East Boston, MA','(617) 555-1120', st_setsrid(st_makepoint(-71.0389, 42.3702), 4326)::geography),
  ('bo-panaderia-trigal',  'Panadería El Trigal',      'FoodDrinks',   'verified', '$',   true,  4.8, 138, 24, '#FBE9F0', '#F6DCE8', 'Especialidad · Pan y pandebono',       'Specialty · Colombian bread',          'Boston, MA', '310 Centre St, Jamaica Plain, MA','(617) 555-7788', st_setsrid(st_makepoint(-71.1145, 42.3099), 4326)::geography),
  ('bo-salon-glamour',     'Salón Latino Glamour',     'BeautyHealth', 'verified', '$$',  true,  4.7, 118, 20, '#FBE9F0', '#F5D8E6', 'Especialidad · Color y keratina',      'Specialty · Color & keratin',          'Boston, MA', '190 Bennington St, East Boston, MA','(617) 555-9042', st_setsrid(st_makepoint(-71.0400, 42.3720), 4326)::geography),
  ('bo-taller-aparicio',   'Taller Aparicio Auto',     'AutoServices', 'free',     '$',   true,  4.5,  72,  0, '#E7EEFB', '#DAE5F6', 'Especialidad · Mecánica general',      'Specialty · General mechanic',         'Boston, MA', '410 Warren St, Roxbury, MA',    '(617) 555-3310', st_setsrid(st_makepoint(-71.0952, 42.3255), 4326)::geography),
  ('bo-clinica-familia',   'Clínica La Familia',       'HealthMedicine','verified','$$',  true,  4.6,  96, 17, '#E3F5EA', '#D6EFDF', 'Especialidad · Medicina familiar',     'Specialty · Family medicine',          'Boston, MA', '85 Dudley St, Roxbury, MA',     '(617) 555-2208', st_setsrid(st_makepoint(-71.0800, 42.3300), 4326)::geography),
  ('bo-abogado-restrepo',  'Abogado Restrepo',         'ProServices',  'verified', '$$$', true,  4.9,  48, 13, '#E8E4FB', '#DCD6F6', 'Especialidad · Inmigración y asilo',   'Specialty · Immigration & asylum',     'Boston, MA', '11 Beacon St, Boston, MA',      '(617) 555-8814', st_setsrid(st_makepoint(-71.0605, 42.3554), 4326)::geography),

  -- The Bronx, NY (Puerto Rican/Dominican — Grand Concourse / Fordham / Mott Haven)
  ('bx-malecon-dominicano','El Malecón Dominicano',    'FoodDrinks',   'verified', '$$',  true,  4.9, 402, 68, '#ECE3F8', '#E3D7F4', 'Especialidad · Mangú y chicharrón',    'Specialty · Mangú & chicharrón',       'The Bronx, NY', '4141 Grand Concourse, Bronx, NY','(718) 555-4521', st_setsrid(st_makepoint(-73.9200, 40.8300), 4326)::geography),
  ('bx-barberia-panas',    'Barbería Los Panas',       'BeautyHealth', 'verified', '$',   true,  4.8, 210, 34, '#FBE9F0', '#F5D8E6', 'Especialidad · Fade y barba',          'Specialty · Fades & beard',            'The Bronx, NY', '2465 Grand Concourse, Bronx, NY','(718) 555-1177', st_setsrid(st_makepoint(-73.9010, 40.8610), 4326)::geography),
  ('bx-bodega-la-isla',    'Bodega & Deli La Isla',    'Grocery',      'free',     '$',   true,  4.4,  95,  0, '#E3F5EA', '#D6E7D0', 'Especialidad · Sándwiches y víveres',  'Specialty · Sandwiches & groceries',   'The Bronx, NY', '401 E 138th St, Bronx, NY',      '(718) 555-9042', st_setsrid(st_makepoint(-73.9229, 40.8090), 4326)::geography),
  ('bx-mecanica-boricua',  'Mecánica Boricua Auto',    'AutoServices', 'verified', '$',   true,  4.7, 134, 22, '#E7EEFB', '#DAE5F6', 'Especialidad · Frenos y suspensión',   'Specialty · Brakes & suspension',      'The Bronx, NY', '1000 Hunts Point Ave, Bronx, NY','(718) 555-6720', st_setsrid(st_makepoint(-73.8830, 40.8110), 4326)::geography),
  ('bx-salon-caribena',    'Salón Caribeña Beauty',    'BeautyHealth', 'verified', '$$',  true,  4.8, 156, 21, '#FBE9F0', '#F5D8E6', 'Especialidad · Uñas y tratamientos',   'Specialty · Nails & treatments',       'The Bronx, NY', '2510 Grand Concourse, Bronx, NY','(718) 555-3310', st_setsrid(st_makepoint(-73.9000, 40.8620), 4326)::geography),
  ('bx-legal-vargas',      'Oficina Legal Vargas',     'ProServices',  'verified', '$$$', true,  4.9,  58, 16, '#E8E4FB', '#DCD6F6', 'Especialidad · Inmigración',           'Specialty · Immigration',              'The Bronx, NY', '3510 Grand Concourse, Bronx, NY','(718) 555-8814', st_setsrid(st_makepoint(-73.9150, 40.8350), 4326)::geography)
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
  ('hz-sabor-quisqueya','delivery'),('hz-sabor-quisqueya','spanish'),('hz-sabor-quisqueya','parking'),
  ('hz-barberia-primera','walk-in'),('hz-barberia-primera','spanish'),('hz-barberia-primera','no-wait'),
  ('hz-colmado-esquina','spanish'),('hz-colmado-esquina','nearby'),
  ('hz-taller-reyes','free-quote'),('hz-taller-reyes','spanish'),('hz-taller-reyes','warranty'),
  ('hz-remesas-caribe','spanish'),('hz-remesas-caribe','fast'),('hz-remesas-caribe','nearby'),
  ('bo-pupuseria-bendicion','delivery'),('bo-pupuseria-bendicion','spanish'),('bo-pupuseria-bendicion','parking'),
  ('bo-panaderia-trigal','custom-orders'),('bo-panaderia-trigal','spanish'),('bo-panaderia-trigal','delivery'),
  ('bo-salon-glamour','appointments'),('bo-salon-glamour','spanish'),('bo-salon-glamour','no-wait'),
  ('bo-taller-aparicio','walk-in'),('bo-taller-aparicio','fast'),
  ('bo-clinica-familia','no-insurance'),('bo-clinica-familia','spanish'),('bo-clinica-familia','same-day'),
  ('bo-abogado-restrepo','free-consult'),('bo-abogado-restrepo','spanish'),('bo-abogado-restrepo','payment-plans'),
  ('bx-malecon-dominicano','delivery'),('bx-malecon-dominicano','spanish'),('bx-malecon-dominicano','parking'),
  ('bx-barberia-panas','walk-in'),('bx-barberia-panas','spanish'),('bx-barberia-panas','no-wait'),
  ('bx-bodega-la-isla','spanish'),('bx-bodega-la-isla','nearby'),
  ('bx-mecanica-boricua','free-quote'),('bx-mecanica-boricua','spanish'),('bx-mecanica-boricua','warranty'),
  ('bx-salon-caribena','appointments'),('bx-salon-caribena','spanish'),('bx-salon-caribena','no-wait'),
  ('bx-legal-vargas','free-consult'),('bx-legal-vargas','spanish'),('bx-legal-vargas','payment-plans')
)
insert into public.business_amenities (business_id, amenity_id)
select b.id, p.amenity from pairs p join public.businesses b on b.slug = p.slug
on conflict do nothing;

-- featured reviews (the card quote)
insert into public.reviews (business_id, author_name, author_initials, rating, body_es, body_en, featured)
select b.id, r.author, r.initials, 5, r.es, r.en, true
from (values
  ('hz-sabor-quisqueya',   'Ramón D.',   'RD', '“Como comer donde mi abuela en Santiago. El mangú, épico.” — Ramón D.', '“Tastes like my abuela''s in Santiago. The mangú is epic.” — Ramón D.'),
  ('hz-barberia-primera',  'Luis F.',    'LF', '“El mejor fade de Hazleton, siempre lleno pero vale la pena.” — Luis F.', '“Best fade in Hazleton, always packed but worth it.” — Luis F.'),
  ('hz-taller-reyes',      'José M.',    'JM', '“Honestos y rápidos, me explicaron todo en español.” — José M.', '“Honest and fast, explained everything in Spanish.” — José M.'),
  ('hz-remesas-caribe',    'Yahaira P.', 'YP', '“Mando dinero a RD en minutos, buen tipo de cambio.” — Yahaira P.', '“I send money to DR in minutes, great rate.” — Yahaira P.'),
  ('bo-pupuseria-bendicion','Marvin A.', 'MA', '“Las pupusas de queso con loroco son de otro mundo.” — Marvin A.', '“The cheese & loroco pupusas are out of this world.” — Marvin A.'),
  ('bo-panaderia-trigal',  'Carolina G.','CG', '“El pandebono recién horneado me recuerda a Cali.” — Carolina G.', '“Fresh pandebono takes me right back to Cali.” — Carolina G.'),
  ('bo-salon-glamour',     'Diana R.',   'DR', '“Me dejaron el color perfecto, súper profesionales.” — Diana R.', '“Nailed the color, so professional.” — Diana R.'),
  ('bo-clinica-familia',   'Sonia E.',   'SE', '“Me atendieron sin seguro y con mucho cariño.” — Sonia E.', '“Seen without insurance and with real care.” — Sonia E.'),
  ('bo-abogado-restrepo',  'Wilmer T.',  'WT', '“Nos ayudó con el asilo paso a paso. Eternamente agradecidos.” — Wilmer T.', '“Guided our asylum case step by step. Forever grateful.” — Wilmer T.'),
  ('bx-malecon-dominicano','Frank R.',   'FR', '“El mejor mangú del Bronx, sin discusión. La bandera es enorme.” — Frank R.', '“Best mangú in the Bronx, hands down. Huge portions.” — Frank R.'),
  ('bx-barberia-panas',    'Kelvin S.',  'KS', '“Ambiente de barrio, música y el mejor corte. Mi sitio fijo.” — Kelvin S.', '“Neighborhood vibe, music and the best cut. My spot.” — Kelvin S.'),
  ('bx-mecanica-boricua',  'Héctor V.',  'HV', '“Boricua de confianza, no te inventa cosas. Recomendadísimo.” — Héctor V.', '“Trustworthy, won''t make up problems. Highly recommend.” — Héctor V.'),
  ('bx-salon-caribena',    'Yamila C.',  'YC', '“Salgo como reina cada vez. Las uñas duran semanas.” — Yamila C.', '“I leave like a queen every time. Nails last for weeks.” — Yamila C.'),
  ('bx-legal-vargas',      'Ana T.',     'AT', '“Nos guió con la residencia con mucha paciencia.” — Ana T.', '“Guided us through the green card with real patience.” — Ana T.')
) as r(slug, author, initials, es, en)
join public.businesses b on b.slug = r.slug
where not exists (select 1 from public.reviews x where x.business_id = b.id and x.featured);

-- ── Events (with real coordinates so they scope by city) ────────────────────
insert into public.events
  (slug, title_es, title_en, venue_es, venue_en, cat, city, starts_at,
   time_label_es, time_label_en, price_label, going_count, desc_es, desc_en, tile_a, tile_b, location)
values
  ('hz-festival-dominicano', 'Festival Dominicano de Hazleton', 'Hazleton Dominican Festival', 'Broad St · Downtown', 'Broad St · Downtown', 'comida', 'Hazleton, PA', '2026-08-16 12:00-04', 'Dom · 12:00 pm', 'Sun · 12:00 pm', null, 340, 'Comida típica, merengue y bachata en vivo, y desfile por Broad St. Entrada libre para toda la familia.', 'Typical food, live merengue and bachata, and a parade down Broad St. Free entry for the whole family.', '#FCEBD6', '#F6DCBF', st_setsrid(st_makepoint(-75.9755, 40.9585), 4326)::geography),
  ('hz-noche-bachata',       'Noche de Bachata',               'Bachata Night',                'Salón Caribe · Alter St', 'Salón Caribe · Alter St', 'musica', 'Hazleton, PA', '2026-07-25 21:00-04', 'Sáb · 9:00 pm', 'Sat · 9:00 pm', '$15', 120, 'Baile de bachata y merengue con DJ en vivo. +21.', 'Bachata and merengue night with a live DJ. 21+.', '#E5DEF9', '#D9CEF3', st_setsrid(st_makepoint(-75.9720, 40.9605), 4326)::geography),
  ('bo-fiesta-salvadorena',  'Fiesta Patronal Salvadoreña',    'Salvadoran Patron Festival',   'East Boston · Maverick Sq', 'East Boston · Maverick Sq', 'familia', 'Boston, MA', '2026-08-09 11:00-04', 'Dom · 11:00 am', 'Sun · 11:00 am', null, 280, 'Pupusas, procesión, marimba y juegos para los niños. Celebra con la comunidad salvadoreña.', 'Pupusas, a procession, marimba and kids'' games. Celebrate with the Salvadoran community.', '#FBE9F0', '#F5D8E6', st_setsrid(st_makepoint(-71.0389, 42.3690), 4326)::geography),
  ('bo-carnaval-latino',     'Carnaval Latino de Boston',      'Boston Latino Carnival',       'Jamaica Plain · Centre St', 'Jamaica Plain · Centre St', 'musica', 'Boston, MA', '2026-08-22 14:00-04', 'Sáb · 2:00 pm', 'Sat · 2:00 pm', '$10', 460, 'Comparsas, salsa, cumbia y comida de toda Latinoamérica. Un día para bailar en familia.', 'Dance troupes, salsa, cumbia and food from across Latin America. A day to dance with family.', '#E8E4FB', '#DCD6F6', st_setsrid(st_makepoint(-71.1145, 42.3099), 4326)::geography),
  ('bx-fiesta-boricua',      'Fiesta Puertorriqueña del Bronx','Bronx Puerto Rican Festival',  'Grand Concourse · 161 St', 'Grand Concourse · 161 St', 'familia', 'The Bronx, NY', '2026-08-02 12:00-04', 'Dom · 12:00 pm', 'Sun · 12:00 pm', null, 620, 'Plena, bomba, lechón y banderas por todo el Concourse. ¡Orgullo boricua!', 'Plena, bomba, lechón and flags all down the Concourse. Boricua pride!', '#FCF1C7', '#F6E8AE', st_setsrid(st_makepoint(-73.9220, 40.8280), 4326)::geography),
  ('bx-concierto-salsa',     'Concierto de Salsa en Vivo',     'Live Salsa Concert',           'Orchard Beach · The Bronx', 'Orchard Beach · The Bronx', 'musica', 'The Bronx, NY', '2026-07-19 19:00-04', 'Sáb · 7:00 pm', 'Sat · 7:00 pm', '$20', 540, 'Orquesta de salsa en vivo frente al mar. Trae tu silla y tus mejores pasos.', 'Live salsa orchestra by the water. Bring your chair and your best moves.', '#E5DEF9', '#D9CEF3', st_setsrid(st_makepoint(-73.7940, 40.8680), 4326)::geography)
on conflict (slug) do update set
  title_es = excluded.title_es, title_en = excluded.title_en,
  venue_es = excluded.venue_es, venue_en = excluded.venue_en,
  cat = excluded.cat, city = excluded.city, starts_at = excluded.starts_at,
  time_label_es = excluded.time_label_es, time_label_en = excluded.time_label_en,
  price_label = excluded.price_label, going_count = excluded.going_count,
  desc_es = excluded.desc_es, desc_en = excluded.desc_en,
  tile_a = excluded.tile_a, tile_b = excluded.tile_b, location = excluded.location;

-- ── Community posts per city (guarded per city so re-runs don't duplicate) ──
insert into public.posts
  (type, author_name, author_initials, author_color, hood, city, body_es, body_en, business_name, business_rating, recommends, created_at)
select * from (values
  ('rec'::text, 'Ramón D.',  'RD', '#1F9D57', 'Downtown',    'Hazleton, PA', 'Si extrañan el sabor de la isla, El Sabor de Quisqueya en Broad tiene el mangú más real de Hazleton. 🇩🇴', 'If you miss the island flavor, El Sabor de Quisqueya on Broad has the realest mangú in Hazleton. 🇩🇴', 'El Sabor de Quisqueya', 4.8::numeric, 34, now() - interval '3 hours'),
  ('ask',       'Yahaira P.','YP', '#7B61FF', 'Alter St',    'Hazleton, PA', '¿Alguien sabe de un buen mecánico por Alter que hable español? Mi carro está sonando raro. 🙏', 'Anyone know a good Spanish-speaking mechanic near Alter? My car is making a weird noise. 🙏', null, null, 11, now() - interval '7 hours'),
  ('local',     'Marvin A.', 'MA', '#2F6FED', 'East Boston', 'Boston, MA', 'Mañana hay fiesta patronal salvadoreña en Maverick Sq. Lleven para las pupusas, se acaban temprano. 🫓', 'Salvadoran patron festival tomorrow at Maverick Sq. Come for the pupusas, they sell out early. 🫓', null, null, 41, now() - interval '5 hours'),
  ('rec',       'Carolina G.','CG','#1F9D57', 'Jamaica Plain','Boston, MA', 'La Panadería El Trigal en Centre St tiene pandebono como en Colombia. Recién horneado a las 8am. ☕', 'Panadería El Trigal on Centre St has pandebono just like in Colombia. Fresh out at 8am. ☕', 'Panadería El Trigal', 4.8::numeric, 28, now() - interval '9 hours'),
  ('rec',       'Frank R.',  'FR', '#1F9D57', 'Concourse',   'The Bronx, NY', 'El Malecón en el Concourse sigue siendo el rey del mangú en el Bronx. Díganle que van de parte de Frank. 🇩🇴', 'El Malecón on the Concourse is still the mangú king in the Bronx. Tell them Frank sent you. 🇩🇴', 'El Malecón Dominicano', 4.9::numeric, 68, now() - interval '2 hours'),
  ('poll',      'Kelvin S.', 'KS', '#0E9384', 'Fordham',     'The Bronx, NY', '¿Cuál es la mejor barbería del Bronx? 💈 ¡Voten!', 'Which is the best barbershop in the Bronx? 💈 Vote!', null, null, 9, now() - interval '6 hours')
) as p(type, author_name, author_initials, author_color, hood, city, body_es, body_en, business_name, business_rating, recommends, created_at)
where not exists (select 1 from public.posts where city in ('Hazleton, PA', 'Boston, MA', 'The Bronx, NY'));

-- poll options for the Bronx barbershop poll
update public.posts
   set poll_options = '["Barbería Los Panas","D''Style Barbershop","Kings Cuts"]'::jsonb,
       poll_votes   = '[31,18,12]'::jsonb
 where city = 'The Bronx, NY' and type = 'poll' and poll_options is null;
