-- 05_realestate.sql — Bienes Raíces test data (0117). 4 agencies (2 Hazleton, 2
-- Bronx; paid + free each), license set, modules.inmuebles ON, 16 published
-- properties across the 4 deals with real coords, reviews, leads, tours, saves.
-- All logins password '123'. Idempotent-ish (on conflict / not exists guards).
begin;

do $$
declare
  u_hz1 uuid; u_hz2 uuid; u_bx1 uuid; u_bx2 uuid;
  b_hz1 uuid; b_hz2 uuid; b_bx1 uuid; b_bx2 uuid;
  c1 uuid; c2 uuid; c3 uuid;  -- consumer test users for leads/tours/saves
  p1 uuid; p2 uuid; p3 uuid; p4 uuid;
  mods jsonb := '{"menu":false,"services":false,"bookings":false,"products":false,"rental":false,"events":false,"inmuebles":true,"updates":true,"staff":true}'::jsonb;
begin
  u_hz1 := public._seed_user('a@re1.com', 'Marisol Reyes', 'MR', '#7B61FF', 'Hazleton, PA', 40.9584, -75.9746);
  u_hz2 := public._seed_user('b@re1.com', 'Pedro del Valle', 'PV', '#1F9D57', 'Hazleton, PA', 40.9584, -75.9746);
  u_bx1 := public._seed_user('a@re2.com', 'Carmen Núñez', 'CN', '#D6336C', 'Bronx, NY', 40.8448, -73.8648);
  u_bx2 := public._seed_user('b@re2.com', 'Rafael Peña', 'RP', '#2A6CB0', 'Bronx, NY', 40.8448, -73.8648);
  select id into c1 from auth.users where email = '1@1.com';
  select id into c2 from auth.users where email = '2@1.com';
  select id into c3 from auth.users where email = '1@2.com';

  insert into public.businesses (slug, name, category_id, owner_id, tier, city, address, phone, about_es, about_en,
    tagline_es, tagline_en, specialty_es, specialty_en, subcategories, features, tile_a, tile_b, location, is_open, modules, re_config, accepts_messages)
  values
    ('hz-re-p1', 'Casa Latina Realty Hazleton', 'RealEstate', u_hz1, 'verified', 'Hazleton, PA', '1 W Broad St, Hazleton, PA 18201', '(570) 555-0141',
     'Agencia bilingüe con 12 años ayudando a familias latinas a comprar y rentar su hogar en Hazleton. Te acompañamos en tu idioma, con o sin historial de crédito tradicional.',
     'Bilingual agency with 12 years helping Latino families buy and rent in Hazleton. We guide you in your language, with or without traditional credit history.',
     'Tu casa, en tu idioma', 'Your home, in your language', 'Inmobiliaria', 'Real estate agency',
     array['Inmobiliaria'], array['Atención bilingüe','Agentes con licencia','Sin verificación de crédito','Financiamiento'],
     '#E5DEF9', '#D9CEF3', st_setsrid(st_makepoint(-75.9746, 40.9584), 4326)::geography, true, mods,
     '{"license":"PA-RS319845","specialty":"residential","langs":"ES/EN","zones":["Downtown Hazleton","Heights","West Hazleton"],"broker":"Casa Latina Realty LLC"}'::jsonb, true),
    ('hz-re-f1', 'Del Valle Propiedades Hazleton', 'RealEstate', u_hz2, 'free', 'Hazleton, PA', '598 Alter St, Hazleton, PA 18201', '(570) 555-0192',
     'Agente independiente dominicano. Rentas y cuartos económicos para recién llegados — te ayudo con contrato y depósito, acepto aval.',
     'Independent Dominican agent. Affordable rentals and rooms for newcomers — I help with lease and deposit, co-signer accepted.',
     'Rentas sin complicaciones', 'Rentals made simple', 'Agente independiente', 'Independent agent',
     array['Agente independiente'], array['Atención bilingüe','Acepta aval','Sin verificación de crédito'],
     '#E3F5EA', '#D6E7D0', st_setsrid(st_makepoint(-75.9812, 40.9551), 4326)::geography, true, mods,
     '{"license":"PA-RS342110","specialty":"rentals","langs":"ES/EN","zones":["Alter St","Diamond Ave"]}'::jsonb, true),
    ('bx-re-p1', 'Bronx Hogar Realty', 'RealEstate', u_bx1, 'premium', 'Bronx, NY', '2488 Grand Concourse, Bronx, NY 10458', '(718) 555-0164',
     'Inmobiliaria puertorriqueña en el corazón del Bronx. Compra, venta y renta residencial y comercial — 25 agentes bilingües a tu servicio.',
     'Puerto Rican agency in the heart of the Bronx. Residential and commercial buying, selling and renting — 25 bilingual agents at your service.',
     'El Bronx es tu hogar', 'The Bronx is home', 'Inmobiliaria', 'Real estate agency',
     array['Inmobiliaria','Bienes raíces comercial'], array['Atención bilingüe','Agentes con licencia','Tours virtuales','Financiamiento'],
     '#E5DEF9', '#D9CEF3', st_setsrid(st_makepoint(-73.8916, 40.8621), 4326)::geography, true, mods,
     '{"license":"NY-10401237845","specialty":"residential","langs":"ES/EN","zones":["Fordham","Belmont","Kingsbridge"],"broker":"Bronx Hogar Realty Corp"}'::jsonb, true),
    ('bx-re-f1', 'Quisqueya Homes Bronx', 'RealEstate', u_bx2, 'free', 'Bronx, NY', '1035 Southern Blvd, Bronx, NY 10459', '(718) 555-0129',
     'Agente dominicano especializado en cuartos y apartamentos económicos en el sur del Bronx. Hablo tu idioma y conozco tu situación.',
     'Dominican agent focused on affordable rooms and apartments in the South Bronx. I speak your language and know your situation.',
     'Cuartos y apartamentos', 'Rooms & apartments', 'Agente independiente', 'Independent agent',
     array['Agente independiente','Rentas'], array['Atención bilingüe','Sin verificación de crédito','Acepta aval'],
     '#FCEBD6', '#F6DCBF', st_setsrid(st_makepoint(-73.8935, 40.8256), 4326)::geography, true, mods,
     '{"license":"NY-10401256790","specialty":"rentals","langs":"ES/EN","zones":["Longwood","Hunts Point","Foxhurst"]}'::jsonb, true)
  on conflict (slug) do update set modules = excluded.modules, re_config = excluded.re_config, category_id = excluded.category_id;

  select id into b_hz1 from public.businesses where slug = 'hz-re-p1';
  select id into b_hz2 from public.businesses where slug = 'hz-re-f1';
  select id into b_bx1 from public.businesses where slug = 'bx-re-p1';
  select id into b_bx2 from public.businesses where slug = 'bx-re-f1';

  -- reviews (skip if already seeded)
  if not exists (select 1 from public.reviews where business_id = b_hz1) then
    insert into public.reviews (business_id, author_name, author_initials, rating, body_es, body_en) values
      (b_hz1, 'Yolanda M.', 'YM', 5, 'Marisol nos ayudó a comprar nuestra primera casa. Todo en español y con mucha paciencia.', 'Marisol helped us buy our first home. Everything in Spanish and with a lot of patience.'),
      (b_hz1, 'José R.', 'JR', 5, 'Nos consiguieron financiamiento sin crédito tradicional. 100% recomendados.', 'They got us financing without traditional credit. 100% recommended.'),
      (b_hz1, 'Ana P.', 'AP', 4, 'Muy profesionales, el tour fue puntual y la casa era tal como en las fotos.', 'Very professional, the tour was on time and the house was just like the photos.'),
      (b_hz2, 'Luis F.', 'LF', 5, 'Pedro me consiguió cuarto en una semana, sin tanto papeleo.', 'Pedro found me a room in a week, without so much paperwork.'),
      (b_hz2, 'Rosa T.', 'RT', 4, 'Buen trato y honesto con los precios.', 'Good service and honest about prices.'),
      (b_bx1, 'Miguel A.', 'MA', 5, 'Vendieron mi apartamento en Fordham en 3 semanas. Excelente equipo.', 'They sold my Fordham apartment in 3 weeks. Excellent team.'),
      (b_bx1, 'Carmen D.', 'CD', 5, 'La mejor inmobiliaria del Bronx para la comunidad latina.', 'The best agency in the Bronx for the Latino community.'),
      (b_bx1, 'Franklin S.', 'FS', 4, 'Buen servicio aunque a veces tardan en contestar los mensajes.', 'Good service though sometimes slow to answer messages.'),
      (b_bx2, 'Marta L.', 'ML', 5, 'Rafael me ayudó cuando nadie más quería rentarme sin crédito. Mil gracias.', 'Rafael helped me when no one else would rent to me without credit. A thousand thanks.'),
      (b_bx2, 'Domingo H.', 'DH', 4, 'Cuarto limpio y al precio que me dijo desde el principio.', 'Clean room at the price he quoted from the start.');
  end if;

  -- properties (16) — only if none exist yet for these agencies
  if not exists (select 1 from public.properties where business_id = b_hz1) then
    insert into public.properties (owner_id, business_id, slug, deal, ptype, title, desc_es, desc_en, price, beds, baths, sqft, lot_sqft, year_built, hoa, address, hood, city, location, feats, policies, rental, open_house, status, published_at, views) values
    -- Casa Latina (Hazleton, paid) — 5
    (u_hz1, b_hz1, 'hz-casa-alter-3rec', 'venta', 'casa', 'Casa remodelada de 3 recámaras en Alter St',
     'Casa completamente remodelada: cocina nueva con granito, pisos de madera, sótano terminado y patio cercado. Lista para mudarse, a 5 minutos del centro.',
     'Fully remodeled home: new granite kitchen, hardwood floors, finished basement and fenced yard. Move-in ready, 5 minutes from downtown.',
     189900, 3, 1.5, 1420, 3900, 1938, null, '612 Alter St', 'Downtown Hazleton', 'Hazleton, PA',
     st_setsrid(st_makepoint(-75.9801, 40.9542), 4326)::geography,
     '[{"es":"Cocina remodelada","en":"Remodeled kitchen"},{"es":"Sótano terminado","en":"Finished basement"},{"es":"Patio cercado","en":"Fenced yard"},{"es":"Estacionamiento","en":"Off-street parking"}]',
     '{"visits":true}', '{}', now() + interval '3 days', 'published', now() - interval '12 days', 148),
    (u_hz1, b_hz1, 'hz-casa-heights-4rec', 'venta', 'casa', 'Amplia casa familiar de 4 recámaras en Heights',
     'Casa de dos pisos en zona tranquila: 4 recámaras, 2 baños completos, garaje doble y jardín amplio. Cerca de escuelas y de la iglesia San Gabriel.',
     'Two-story home in a quiet area: 4 bedrooms, 2 full baths, 2-car garage and large yard. Near schools and San Gabriel church.',
     244500, 4, 2, 1980, 6200, 1954, null, '88 N Laurel St', 'Heights', 'Hazleton, PA',
     st_setsrid(st_makepoint(-75.9689, 40.9631), 4326)::geography,
     '[{"es":"Garaje doble","en":"2-car garage"},{"es":"Jardín amplio","en":"Large yard"},{"es":"Cerca de escuelas","en":"Near schools"}]',
     '{"visits":true}', '{}', null, 'published', now() - interval '25 days', 96),
    (u_hz1, b_hz1, 'hz-depa-broad-2rec', 'renta', 'departamento', 'Departamento de 2 recámaras en W Broad St',
     'Segundo piso recién pintado, cocina equipada, agua incluida. A una cuadra del transporte y las tiendas latinas del centro.',
     'Freshly painted second floor, equipped kitchen, water included. One block from transit and the downtown Latino shops.',
     1150, 2, 1, 850, null, 1962, null, '231 W Broad St', 'Downtown Hazleton', 'Hazleton, PA',
     st_setsrid(st_makepoint(-75.9772, 40.9578), 4326)::geography,
     '[{"es":"Agua incluida","en":"Water included"},{"es":"Cocina equipada","en":"Equipped kitchen"},{"es":"Cerca del transporte","en":"Near transit"}]',
     '{"pets":false,"noCredit":true,"cosigner":true,"visits":true}',
     '{"deposit":1150,"available":"2026-08-01","lease":"12 meses"}', null, 'published', now() - interval '6 days', 210),
    (u_hz1, b_hz1, 'hz-townhouse-pine', 'venta', 'townhouse', 'Townhouse moderno de 3 niveles en Pine St',
     'Construcción 2019: 3 recámaras, 2.5 baños, cocina abierta con isla, garaje y terraza. HOA cubre mantenimiento exterior y nieve.',
     '2019 build: 3 bedrooms, 2.5 baths, open kitchen with island, garage and deck. HOA covers exterior maintenance and snow.',
     259000, 3, 2.5, 1650, null, 2019, 145, '45 S Pine St', 'Downtown Hazleton', 'Hazleton, PA',
     st_setsrid(st_makepoint(-75.9735, 40.9557), 4326)::geography,
     '[{"es":"Construcción 2019","en":"Built 2019"},{"es":"Cocina con isla","en":"Kitchen island"},{"es":"Terraza","en":"Deck"}]',
     '{"visits":true}', '{}', now() + interval '5 days', 'published', now() - interval '3 days', 74),
    (u_hz1, b_hz1, 'hz-local-wyoming', 'comercial', 'local', 'Local comercial sobre Wyoming St con vitrina',
     'Local de 1,200 ft² con vitrina a la calle, medio baño y bodega. Ideal para tienda, salón o oficina. Alto tráfico peatonal latino.',
     '1,200 ft² storefront with street-facing window, half bath and storage. Ideal for a shop, salon or office. High Latino foot traffic.',
     1650, null, 1, 1200, null, 1948, null, '109 Wyoming St', 'Downtown Hazleton', 'Hazleton, PA',
     st_setsrid(st_makepoint(-75.9758, 40.9569), 4326)::geography,
     '[{"es":"Vitrina a la calle","en":"Street-facing window"},{"es":"Bodega incluida","en":"Storage included"},{"es":"Alto tráfico","en":"High foot traffic"}]',
     '{"visits":true}', '{"deposit":3300,"available":"2026-08-15","lease":"24 meses"}', null, 'published', now() - interval '18 days', 61),
    -- Del Valle (Hazleton, free) — 3
    (u_hz2, b_hz2, 'hz-cuarto-diamond', 'cuarto', 'cuarto', 'Cuarto amueblado con baño compartido en Diamond Ave',
     'Cuarto grande y luminoso en casa familiar tranquila. Incluye todos los servicios, internet y lavandería. Entrada independiente.',
     'Large bright room in a quiet family home. All utilities, internet and laundry included. Private entrance.',
     525, 1, null, 180, null, null, null, '742 Diamond Ave', 'Diamond Ave', 'Hazleton, PA',
     st_setsrid(st_makepoint(-75.9663, 40.9498), 4326)::geography,
     '[{"es":"Todo incluido","en":"All utilities included"},{"es":"Entrada independiente","en":"Private entrance"},{"es":"Internet y lavandería","en":"Internet & laundry"}]',
     '{"pets":false,"noCredit":true,"cosigner":false,"visits":true}',
     '{"deposit":300,"available":"2026-08-01","lease":"Mes a mes"}', null, 'published', now() - interval '2 days', 187),
    (u_hz2, b_hz2, 'hz-cuarto-garfield', 'cuarto', 'cuarto', 'Cuarto económico cerca de la fábrica en Garfield Ct',
     'Ideal para trabajador solo: cuarto limpio con clóset, cocina compartida y estacionamiento en la calle. A 10 min de los parques industriales.',
     'Ideal for a single worker: clean room with closet, shared kitchen and street parking. 10 min from the industrial parks.',
     460, 1, null, 150, null, null, null, '15 Garfield Ct', 'West Hazleton', 'Hazleton, PA',
     st_setsrid(st_makepoint(-75.9915, 40.9587), 4326)::geography,
     '[{"es":"Cocina compartida","en":"Shared kitchen"},{"es":"Cerca de fábricas","en":"Near industrial parks"}]',
     '{"pets":false,"noCredit":true,"cosigner":true,"visits":true}',
     '{"deposit":230,"available":"2026-07-28","lease":"Mes a mes"}', null, 'published', now() - interval '1 day', 143),
    (u_hz2, b_hz2, 'hz-depa-1rec-alter', 'renta', 'departamento', 'Departamento de 1 recámara en Alter St',
     'Primer piso con sala amplia, calefacción de gas y patio trasero compartido. Acepto aval si no tienes historial de renta.',
     'First floor with a large living room, gas heat and shared backyard. Co-signer accepted if you have no rental history.',
     875, 1, 1, 640, null, 1940, null, '520 Alter St', 'Alter St', 'Hazleton, PA',
     st_setsrid(st_makepoint(-75.9794, 40.9538), 4326)::geography,
     '[{"es":"Calefacción de gas","en":"Gas heat"},{"es":"Patio compartido","en":"Shared backyard"}]',
     '{"pets":true,"noCredit":true,"cosigner":true,"visits":true}',
     '{"deposit":875,"available":"2026-08-10","lease":"12 meses"}', null, 'published', now() - interval '9 days', 92),
    -- Bronx Hogar (Bronx, premium) — 5
    (u_bx1, b_bx1, 'bx-condo-concourse-2rec', 'venta', 'condo', 'Condo de 2 recámaras en Grand Concourse',
     'Edificio art déco renovado: 2 recámaras amplias, cocina de granito, portero de medio tiempo. A 2 cuadras del expreso D y del parque St. James.',
     'Renovated art deco building: 2 large bedrooms, granite kitchen, part-time doorman. 2 blocks from the D express and St. James Park.',
     385000, 2, 1, 950, null, 1939, 720, '2810 Grand Concourse', 'Fordham', 'Bronx, NY',
     st_setsrid(st_makepoint(-73.8942, 40.8664), 4326)::geography,
     '[{"es":"Edificio con portero","en":"Doorman building"},{"es":"Cocina de granito","en":"Granite kitchen"},{"es":"Cerca del metro D","en":"Near the D train"}]',
     '{"visits":true}', '{}', now() + interval '4 days', 'published', now() - interval '15 days', 342),
    (u_bx1, b_bx1, 'bx-casa-belmont-3rec', 'venta', 'casa', 'Casa de 3 familias en Belmont — inversión',
     'Propiedad de inversión en la Pequeña Italia del Bronx: 3 unidades rentadas, ingreso mensual actual de $5,400. Techo nuevo 2023.',
     'Investment property in the Bronx''s Little Italy: 3 rented units, current monthly income $5,400. New roof 2023.',
     689000, 6, 3, 2850, 2400, 1925, null, '2385 Hughes Ave', 'Belmont', 'Bronx, NY',
     st_setsrid(st_makepoint(-73.8871, 40.8552), 4326)::geography,
     '[{"es":"3 unidades rentadas","en":"3 rented units"},{"es":"Techo nuevo 2023","en":"New roof 2023"},{"es":"Ingreso $5,400/mes","en":"$5,400/mo income"}]',
     '{"visits":true}', '{}', null, 'published', now() - interval '30 days', 268),
    (u_bx1, b_bx1, 'bx-depa-kingsbridge-2rec', 'renta', 'departamento', 'Apartamento de 2 recámaras en Kingsbridge',
     'Tercer piso con mucha luz, pisos de madera originales, súper en el edificio. Calefacción y agua caliente incluidas. Cerca del 1 y del A.',
     'Bright third floor, original hardwood floors, live-in super. Heat and hot water included. Near the 1 and A trains.',
     2250, 2, 1, 900, null, 1931, null, '3215 Kingsbridge Ave', 'Kingsbridge', 'Bronx, NY',
     st_setsrid(st_makepoint(-73.9051, 40.8782), 4326)::geography,
     '[{"es":"Calefacción incluida","en":"Heat included"},{"es":"Súper en el edificio","en":"Live-in super"},{"es":"Pisos de madera","en":"Hardwood floors"}]',
     '{"pets":true,"noCredit":false,"cosigner":true,"visits":true}',
     '{"deposit":2250,"available":"2026-09-01","lease":"12 meses"}', null, 'published', now() - interval '4 days', 421),
    (u_bx1, b_bx1, 'bx-oficina-fordham', 'comercial', 'oficina', 'Oficina profesional sobre Fordham Rd',
     'Suite de 800 ft² en segundo piso: recepción, 2 privados y baño. Perfecta para contador, abogado de inmigración o agencia de viajes.',
     '800 ft² second-floor suite: reception, 2 offices and bath. Perfect for an accountant, immigration lawyer or travel agency.',
     2400, null, 1, 800, null, 1958, null, '386 E Fordham Rd', 'Fordham', 'Bronx, NY',
     st_setsrid(st_makepoint(-73.8935, 40.8618), 4326)::geography,
     '[{"es":"Recepción","en":"Reception area"},{"es":"2 privados","en":"2 private offices"},{"es":"Sobre Fordham Rd","en":"On Fordham Rd"}]',
     '{"visits":true}', '{"deposit":4800,"available":"2026-08-15","lease":"36 meses"}', null, 'published', now() - interval '11 days', 87),
    (u_bx1, b_bx1, 'bx-townhouse-pelham', 'venta', 'townhouse', 'Townhouse de ladrillo en Pelham Parkway',
     'Casa adosada de ladrillo con 3 recámaras, sótano rentable con entrada propia y patio. A 5 minutos del zoológico del Bronx.',
     'Brick townhouse with 3 bedrooms, rentable basement with its own entrance and yard. 5 minutes from the Bronx Zoo.',
     545000, 3, 2, 1720, 1900, 1946, null, '2140 Wallace Ave', 'Pelham Parkway', 'Bronx, NY',
     st_setsrid(st_makepoint(-73.8622, 40.8551), 4326)::geography,
     '[{"es":"Sótano rentable","en":"Rentable basement"},{"es":"Patio propio","en":"Private yard"},{"es":"Ladrillo sólido","en":"Solid brick"}]',
     '{"visits":true}', '{}', null, 'published', now() - interval '21 days', 195),
    -- Quisqueya (Bronx, free) — 3
    (u_bx2, b_bx2, 'bx-cuarto-longwood', 'cuarto', 'cuarto', 'Cuarto grande en Longwood — todo incluido',
     'Cuarto amueblado en apartamento compartido con dominicanos trabajadores. Luz, gas, internet incluidos. A 3 cuadras del 6.',
     'Furnished room in an apartment shared with working Dominicans. Electric, gas, internet included. 3 blocks from the 6 train.',
     950, 1, null, 200, null, null, null, '840 Beck St', 'Longwood', 'Bronx, NY',
     st_setsrid(st_makepoint(-73.8968, 40.8214), 4326)::geography,
     '[{"es":"Amueblado","en":"Furnished"},{"es":"Todo incluido","en":"All utilities included"},{"es":"Cerca del tren 6","en":"Near the 6 train"}]',
     '{"pets":false,"noCredit":true,"cosigner":false,"visits":true}',
     '{"deposit":500,"available":"2026-08-01","lease":"Mes a mes"}', null, 'published', now() - interval '2 days', 234),
    (u_bx2, b_bx2, 'bx-cuarto-hunts-point', 'cuarto', 'cuarto', 'Cuarto económico en Hunts Point',
     'Para persona sola que trabaje: cuarto limpio, cocina y baño compartidos, referencias de trabajo en lugar de crédito.',
     'For a single working person: clean room, shared kitchen and bath, work references instead of credit.',
     800, 1, null, 160, null, null, null, '1120 Lafayette Ave', 'Hunts Point', 'Bronx, NY',
     st_setsrid(st_makepoint(-73.8892, 40.8172), 4326)::geography,
     '[{"es":"Referencias de trabajo OK","en":"Work references OK"},{"es":"Cocina compartida","en":"Shared kitchen"}]',
     '{"pets":false,"noCredit":true,"cosigner":true,"visits":true}',
     '{"deposit":400,"available":"2026-07-30","lease":"Mes a mes"}', null, 'published', now() - interval '5 days', 176),
    (u_bx2, b_bx2, 'bx-depa-southern-1rec', 'renta', 'departamento', 'Apartamento de 1 recámara en Southern Blvd',
     'Recién pintado, segundo piso sobre bodega, ideal para pareja. El dueño acepta programas y vouchers. Sin verificación de crédito.',
     'Freshly painted second floor above a bodega, ideal for a couple. Owner accepts programs and vouchers. No credit check.',
     1750, 1, 1, 600, null, 1935, null, '1042 Southern Blvd', 'Foxhurst', 'Bronx, NY',
     st_setsrid(st_makepoint(-73.8930, 40.8266), 4326)::geography,
     '[{"es":"Acepta vouchers","en":"Vouchers accepted"},{"es":"Recién pintado","en":"Freshly painted"}]',
     '{"pets":false,"noCredit":true,"cosigner":true,"visits":true}',
     '{"deposit":1750,"available":"2026-08-05","lease":"12 meses"}', null, 'published', now() - interval '7 days', 158);
  end if;

  -- leads + tours + saves for the PAID agencies (real pipeline to manage)
  if c1 is not null and not exists (select 1 from public.property_leads where business_id = b_hz1) then
    select id into p1 from public.properties where slug = 'hz-casa-alter-3rec';
    select id into p2 from public.properties where slug = 'hz-depa-broad-2rec';
    select id into p3 from public.properties where slug = 'bx-condo-concourse-2rec';
    select id into p4 from public.properties where slug = 'bx-depa-kingsbridge-2rec';
    insert into public.property_leads (property_id, business_id, user_id, name, phone, email, kind, stage, message, offer_amount, income, move_in) values
      (p1, b_hz1, c1, 'María González', '(570) 555-2211', '1@1.com', 'oferta', 'offer', 'Nos encanta la casa. Ofrecemos $182,000 con pre-aprobación en mano.', 182000, null, null),
      (p1, b_hz1, c2, 'Carlos Jiménez', '(570) 555-3345', '2@1.com', 'mensaje', 'new', '¿La casa acepta FHA? ¿Cuándo puedo verla?', null, null, null),
      (p2, b_hz1, c2, 'Carlos Jiménez', '(570) 555-3345', '2@1.com', 'solicitud', 'contacted', 'Trabajo en la fábrica de Amazon, busco mudarme el 1 de agosto.', null, '$3,000 - $4,000', 'En 1 mes'),
      (p3, b_bx1, c3, 'Josefina Rodríguez', '(718) 555-8890', '1@2.com', 'mensaje', 'new', '¿El condo permite rentar después de comprar? ¿Cuánto es el mantenimiento?', null, null, null),
      (p4, b_bx1, c3, 'Josefina Rodríguez', '(718) 555-8890', '1@2.com', 'solicitud', 'tour', 'Somos pareja sin niños, los dos trabajamos en Manhattan.', null, '$5,000+', 'Lo antes posible');
    insert into public.property_tours (property_id, business_id, user_id, name, phone, mode, at, status, message) values
      (p1, b_hz1, c1, 'María González', '(570) 555-2211', 'presencial', now() + interval '2 days' + interval '10 hours', 'pendiente', 'Podemos después de las 5pm.'),
      (p2, b_hz1, c2, 'Carlos Jiménez', '(570) 555-3345', 'video', now() + interval '1 day' + interval '18 hours', 'confirmada', null),
      (p4, b_bx1, c3, 'Josefina Rodríguez', '(718) 555-8890', 'presencial', now() + interval '3 days' + interval '11 hours', 'pendiente', null);
    insert into public.property_saves (property_id, user_id) values
      (p1, c1), (p2, c2), (p3, c3), (p4, c3)
    on conflict do nothing;
  end if;
end $$;

commit;
