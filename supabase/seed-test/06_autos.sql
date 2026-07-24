-- 06_autos.sql — Autos test data (0119). 4 dealers/sellers (Hazleton + Bronx,
-- paid + free), auto_config license set, modules.vehiculos ON, ~16 vehicles with
-- coords, history, BHPH, leads (incl pre-qual), test drives, saves. Logins '123'.
begin;

do $$
declare
  u_hz1 uuid; u_hz2 uuid; u_bx1 uuid; u_bx2 uuid;
  b_hz1 uuid; b_hz2 uuid; b_bx1 uuid; b_bx2 uuid;
  c1 uuid; c2 uuid; c3 uuid;
  v1 uuid; v2 uuid; v3 uuid; v4 uuid;
  mods jsonb := '{"menu":false,"services":false,"bookings":false,"products":false,"rental":false,"events":false,"inmuebles":false,"vehiculos":true,"updates":true,"staff":true}'::jsonb;
begin
  u_hz1 := public._seed_user('a@auto2.com', 'Rubén Castillo', 'RC', '#2A6CB0', 'Hazleton, PA', 40.9584, -75.9746);
  u_hz2 := public._seed_user('b@auto2.com', 'Elena Torres', 'ET', '#1F9D57', 'Hazleton, PA', 40.9584, -75.9746);
  u_bx1 := public._seed_user('a@auto3.com', 'Wilson Grullón', 'WG', '#7B61FF', 'Bronx, NY', 40.8448, -73.8648);
  u_bx2 := public._seed_user('b@auto3.com', 'Yamilet Cruz', 'YC', '#D6336C', 'Bronx, NY', 40.8448, -73.8648);

  insert into public.businesses (slug, name, category_id, owner_id, tier, city, address, phone, about_es, about_en,
    tagline_es, tagline_en, specialty_es, specialty_en, subcategories, features, tile_a, tile_b, location, is_open, modules, auto_config, accepts_messages)
  values
    ('hz-cardealer-p1', 'Autos del Valle Hazleton', 'CarDealer', u_hz1, 'premium', 'Hazleton, PA', '901 N Church St, Hazleton, PA 18201', '(570) 555-0311',
     'Lote latino con 60+ autos usados y seminuevos. Financiamos NOSOTROS — aquí pagas aquí, sin verificación de crédito, aceptamos ITIN y tu troca de cambio.',
     'Latino car lot with 60+ used and certified vehicles. WE finance — buy here pay here, no credit check, ITIN accepted and trade-ins welcome.',
     'Aquí pagas aquí', 'Buy here pay here', 'Dealer de autos usados', 'Used car dealer',
     array['Dealer de autos usados','Aquí pagas aquí'], array['Aquí pagas aquí','Sin verificación de crédito','Acepta ITIN','Financiamiento','Acepta trade-in'],
     '#E4EEFB', '#DAE5F6', st_setsrid(st_makepoint(-75.9723, 40.9611), 4326)::geography, true, mods,
     '{"license":"PA-DL-88231","sellerType":"dealer","bhph":true,"financing":true,"cash":true,"langs":"ES/EN","zones":["Hazleton","West Hazleton","Drums"],"team":[{"name":"Rubén Castillo","role":"Gerente","phone":"(570) 555-0311"},{"name":"Marcos Díaz","role":"Vendedor","phone":"(570) 555-0312"}]}'::jsonb, true),
    ('hz-cardealer-f1', 'Elena Autos Hazleton', 'CarDealer', u_hz2, 'free', 'Hazleton, PA', '245 E Broad St, Hazleton, PA 18201', '(570) 555-0355',
     'Vendo autos confiables y económicos, revisados y con historial limpio. Trato directo y honesto, en español.',
     'I sell reliable, affordable cars — inspected with clean history. Direct, honest deals, in Spanish.',
     'Autos confiables', 'Reliable cars', 'Vendedor particular', 'Private seller',
     array['Vendedor particular'], array['Historial limpio','Atención bilingüe','Garantía'],
     '#F1EFFA', '#E6E1F5', st_setsrid(st_makepoint(-75.9758, 40.9569), 4326)::geography, true, mods,
     '{"license":"PA-DL-90114","sellerType":"particular","bhph":false,"financing":false,"cash":true,"langs":"ES/EN"}'::jsonb, true),
    ('bx-cardealer-p1', 'Grullón Motors Bronx', 'CarDealer', u_bx1, 'verified', 'Bronx, NY', '1840 Westchester Ave, Bronx, NY 10472', '(718) 555-0388',
     'Dealer dominicano en el Bronx: SUVs, sedanes y trocas seminuevas. Financiamiento propio, aceptamos ITIN y tu carro de intercambio.',
     'Dominican dealer in the Bronx: certified SUVs, sedans and trucks. In-house financing, ITIN accepted and trade-ins welcome.',
     'Tu carro sin crédito', 'Your car without credit', 'Dealer de autos usados', 'Used car dealer',
     array['Dealer de autos usados','Aquí pagas aquí'], array['Aquí pagas aquí','Sin verificación de crédito','Acepta ITIN','Financiamiento','Historial limpio'],
     '#E4EEFB', '#DAE5F6', st_setsrid(st_makepoint(-73.8688, 40.8322), 4326)::geography, true, mods,
     '{"license":"NY-DL-7742199","sellerType":"dealer","bhph":true,"financing":true,"cash":true,"langs":"ES/EN","zones":["Soundview","Parkchester","Castle Hill"],"team":[{"name":"Wilson Grullón","role":"Dueño","phone":"(718) 555-0388"},{"name":"Frankie Reyes","role":"Vendedor","phone":"(718) 555-0389"}]}'::jsonb, true),
    ('bx-cardealer-f1', 'Yamilet Vende su Carro', 'CarDealer', u_bx2, 'free', 'Bronx, NY', '720 E 149th St, Bronx, NY 10455', '(718) 555-0342',
     'Vendo mi carro y ayudo a vecinos a vender el suyo. Precios justos, sin vueltas.',
     'Selling my car and helping neighbors sell theirs. Fair prices, no runaround.',
     'Precio justo', 'Fair price', 'Vendedor particular', 'Private seller',
     array['Vendedor particular'], array['Atención bilingüe','Historial limpio'],
     '#F1EFFA', '#E6E1F5', st_setsrid(st_makepoint(-73.9127, 40.8151), 4326)::geography, true, mods,
     '{"license":"NY-DL-8890123","sellerType":"particular","bhph":false,"financing":false,"cash":true,"langs":"ES/EN"}'::jsonb, true)
  on conflict (slug) do update set modules = excluded.modules, auto_config = excluded.auto_config, category_id = excluded.category_id;

  select id into b_hz1 from public.businesses where slug='hz-cardealer-p1';
  select id into b_hz2 from public.businesses where slug='hz-cardealer-f1';
  select id into b_bx1 from public.businesses where slug='bx-cardealer-p1';
  select id into b_bx2 from public.businesses where slug='bx-cardealer-f1';
  select id into c1 from auth.users where email='1@1.com';
  select id into c2 from auth.users where email='2@1.com';
  select id into c3 from auth.users where email='1@2.com';

  if not exists (select 1 from public.reviews where business_id=b_hz1) then
    insert into public.reviews (business_id, author_name, author_initials, rating, body_es, body_en) values
      (b_hz1,'Pedro M.','PM',5,'Me financiaron sin crédito y con ITIN. Salí manejando el mismo día.','They financed me with no credit and ITIN. Drove off the same day.'),
      (b_hz1,'Luz R.','LR',5,'Aceptaron mi troca vieja como enganche. Muy buen trato.','They took my old truck as down payment. Great deal.'),
      (b_hz1,'Andrés G.','AG',4,'Buen inventario y todo en español.','Good inventory and everything in Spanish.'),
      (b_bx1,'Ramona T.','RT',5,'Wilson me consiguió mi SUV sin líos de crédito. Gracias!','Wilson got me my SUV with no credit hassle. Thank you!'),
      (b_bx1,'Julio C.','JC',4,'Financiamiento propio rápido, buen servicio.','Fast in-house financing, good service.'),
      (b_hz2,'Marta S.','MS',5,'Carro limpio y al precio acordado.','Clean car at the agreed price.'),
      (b_bx2,'Delia P.','DP',4,'Honesta y directa. Recomendada.','Honest and direct. Recommended.');
  end if;

  if not exists (select 1 from public.vehicles where business_id=b_hz1) then
    insert into public.vehicles (owner_id, business_id, slug, cond, vtype, make, model, year, price, down, miles, trans, fuel, drivetrain, mpg, color_es, color_en, vin, desc_es, desc_en, city, location, feats, history, bhph, financing, trade_in, apr, status, published_at, views) values
    -- Autos del Valle (Hazleton, premium, BHPH) — 5
    (u_hz1,b_hz1,'2019-toyota-camry-hz1','usado','sedan','Toyota','Camry',2019,17995,1500,42000,'automatica','gasolina','fwd',32,'Plateado','Silver','4T1B11HK9KU000001','Sedán confiable, un solo dueño, servicio al día. Aquí pagas aquí — financiamos nosotros.','Reliable sedan, one owner, serviced. Buy here pay here — we finance.','Hazleton, PA',st_setsrid(st_makepoint(-75.9723,40.9611),4326)::geography,'[{"es":"Cámara de reversa","en":"Backup camera"},{"es":"Bluetooth","en":"Bluetooth"},{"es":"Un dueño","en":"One owner"}]','{"cleanTitle":true,"accidents":0,"owners":1,"serviced":true,"report":[{"t":"Título limpio","d":"Sin accidentes reportados"},{"t":"1 dueño","d":"Historial de servicio completo"}]}',true,true,true,null,'published',now()-interval '5 days',312),
    (u_hz1,b_hz1,'2020-honda-crv-hz1','seminuevo','suv','Honda','CR-V',2020,23495,2000,38000,'automatica','gasolina','awd',30,'Blanco','White','2HKRW2H85LH000002','SUV familiar AWD, certificada, garantía disponible. Acepta tu carro de cambio.','AWD family SUV, certified, warranty available. Trade-ins welcome.','Hazleton, PA',st_setsrid(st_makepoint(-75.9718,40.9615),4326)::geography,'[{"es":"AWD","en":"AWD"},{"es":"CarPlay","en":"CarPlay"},{"es":"Certificado","en":"Certified"}]','{"cleanTitle":true,"accidents":0,"owners":1,"serviced":true}',true,true,true,null,'published',now()-interval '3 days',241),
    (u_hz1,b_hz1,'2017-ford-f150-hz1','usado','pickup','Ford','F-150',2017,22900,2500,78000,'automatica','gasolina','4wd',20,'Negro','Black','1FTEW1EP0HK000003','Troca 4x4 lista para el trabajo. Financiamiento sin crédito.','4x4 work truck ready to go. No-credit financing.','Hazleton, PA',st_setsrid(st_makepoint(-75.9701,40.9628),4326)::geography,'[{"es":"4x4","en":"4x4"},{"es":"Cama larga","en":"Long bed"},{"es":"Enganche de remolque","en":"Tow hitch"}]','{"cleanTitle":true,"accidents":1,"owners":2,"serviced":true,"report":[{"t":"1 accidente menor","d":"Daño cosmético reparado"}]}',true,true,true,null,'published',now()-interval '8 days',198),
    (u_hz1,b_hz1,'2018-nissan-sentra-hz1','usado','sedan','Nissan','Sentra',2018,13495,1000,56000,'cvt','gasolina','fwd',35,'Gris','Gray','3N1AB7AP0JY000004','Económico en gasolina, ideal primer carro. Aquí pagas aquí.','Great on gas, perfect first car. Buy here pay here.','Hazleton, PA',st_setsrid(st_makepoint(-75.9735,40.9601),4326)::geography,'[{"es":"Bajo consumo","en":"Fuel efficient"},{"es":"Bluetooth","en":"Bluetooth"}]','{"cleanTitle":true,"accidents":0,"owners":2,"serviced":true}',true,true,true,null,'published',now()-interval '1 day',276),
    (u_hz1,b_hz1,'2021-jeep-compass-hz1','seminuevo','suv','Jeep','Compass',2021,24995,3000,29000,'automatica','gasolina','4wd',28,'Rojo','Red','3C4NJDBB5MT000005','SUV compacta 4x4, poco millaje, como nueva.','Compact 4x4 SUV, low miles, like new.','Hazleton, PA',st_setsrid(st_makepoint(-75.9711,40.9619),4326)::geography,'[{"es":"4x4","en":"4x4"},{"es":"Pantalla táctil","en":"Touchscreen"},{"es":"Poco millaje","en":"Low miles"}]','{"cleanTitle":true,"accidents":0,"owners":1,"serviced":true}',true,true,true,null,'published',now()-interval '4 days',163),
    -- Elena Autos (Hazleton, free, particular) — 3
    (u_hz2,b_hz2,'2016-honda-civic-hz2','usado','sedan','Honda','Civic',2016,12900,null,71000,'automatica','gasolina','fwd',34,'Azul','Blue','2HGFC2F50GH000006','Mi Civic personal, siempre bien cuidado. Precio de contado.','My personal Civic, always well kept. Cash price.','Hazleton, PA',st_setsrid(st_makepoint(-75.9762,40.9566),4326)::geography,'[{"es":"Un dueño","en":"One owner"},{"es":"No fumador","en":"Non-smoker"}]','{"cleanTitle":true,"accidents":0,"owners":1,"serviced":true}',false,false,false,null,'published',now()-interval '2 days',144),
    (u_hz2,b_hz2,'2015-toyota-corolla-hz2','usado','sedan','Toyota','Corolla',2015,11500,null,88000,'automatica','gasolina','fwd',33,'Blanco','White','5YFBURHE0FP000007','Corolla confiable, motor sólido, buen carro para trabajar.','Reliable Corolla, solid engine, good work car.','Hazleton, PA',st_setsrid(st_makepoint(-75.9749,40.9573),4326)::geography,'[{"es":"Bajo mantenimiento","en":"Low maintenance"}]','{"cleanTitle":true,"accidents":0,"owners":2,"serviced":true}',false,false,false,null,'published',now()-interval '6 days',97),
    (u_hz2,b_hz2,'2014-chevrolet-silverado-hz2','usado','pickup','Chevrolet','Silverado',2014,16900,null,102000,'automatica','gasolina','4wd',18,'Gris','Gray','3GCUKREC0EG000008','Troca fuerte para el trabajo, 4x4, buen estado.','Strong work truck, 4x4, good shape.','Hazleton, PA',st_setsrid(st_makepoint(-75.9755,40.9560),4326)::geography,'[{"es":"4x4","en":"4x4"},{"es":"Caja de herramientas","en":"Toolbox"}]','{"cleanTitle":true,"accidents":1,"owners":2,"serviced":true}',false,false,false,null,'published',now()-interval '9 days',121),
    -- Grullón Motors (Bronx, verified, BHPH) — 5
    (u_bx1,b_bx1,'2019-nissan-rogue-bx1','seminuevo','suv','Nissan','Rogue',2019,19995,1500,49000,'cvt','gasolina','awd',29,'Negro','Black','5N1AT2MV0KC000009','SUV AWD ideal para la nieve. Financiamiento propio, sin crédito.','AWD SUV great for snow. In-house financing, no credit.','Bronx, NY',st_setsrid(st_makepoint(-73.8688,40.8322),4326)::geography,'[{"es":"AWD","en":"AWD"},{"es":"Cámara 360","en":"360 camera"},{"es":"ITIN OK","en":"ITIN OK"}]','{"cleanTitle":true,"accidents":0,"owners":1,"serviced":true}',true,true,true,null,'published',now()-interval '3 days',421),
    (u_bx1,b_bx1,'2018-toyota-rav4-bx1','usado','suv','Toyota','RAV4',2018,20495,2000,58000,'automatica','gasolina','awd',30,'Plateado','Silver','JTMRFREV0JD000010','RAV4 confiable, AWD, perfecta para la ciudad.','Reliable RAV4, AWD, perfect for the city.','Bronx, NY',st_setsrid(st_makepoint(-73.8692,40.8318),4326)::geography,'[{"es":"AWD","en":"AWD"},{"es":"CarPlay","en":"CarPlay"}]','{"cleanTitle":true,"accidents":0,"owners":2,"serviced":true}',true,true,true,null,'published',now()-interval '5 days',288),
    (u_bx1,b_bx1,'2020-honda-accord-bx1','seminuevo','sedan','Honda','Accord',2020,22995,2000,41000,'automatica','gasolina','fwd',33,'Blanco','White','1HGCV1F30LA000011','Sedán elegante y económico, certificado.','Elegant, economical sedan, certified.','Bronx, NY',st_setsrid(st_makepoint(-73.8684,40.8326),4326)::geography,'[{"es":"Certificado","en":"Certified"},{"es":"Techo solar","en":"Sunroof"}]','{"cleanTitle":true,"accidents":0,"owners":1,"serviced":true}',true,true,true,null,'published',now()-interval '2 days',334),
    (u_bx1,b_bx1,'2017-ram-1500-bx1','usado','pickup','RAM','1500',2017,23900,3000,72000,'automatica','gasolina','4wd',19,'Rojo','Red','1C6RR7LT0HS000012','Troca RAM 4x4, motor Hemi, lista para todo.','RAM 4x4 truck, Hemi engine, ready for anything.','Bronx, NY',st_setsrid(st_makepoint(-73.8696,40.8314),4326)::geography,'[{"es":"4x4","en":"4x4"},{"es":"Hemi V8","en":"Hemi V8"}]','{"cleanTitle":true,"accidents":1,"owners":2,"serviced":true}',true,true,true,null,'published',now()-interval '7 days',207),
    (u_bx1,b_bx1,'2016-hyundai-elantra-bx1','usado','sedan','Hyundai','Elantra',2016,10995,800,83000,'automatica','gasolina','fwd',34,'Gris','Gray','5NPDH4AE0GH000013','Económico y confiable, ideal primer carro. Aquí pagas aquí.','Economical and reliable, great first car. Buy here pay here.','Bronx, NY',st_setsrid(st_makepoint(-73.8680,40.8330),4326)::geography,'[{"es":"Bajo consumo","en":"Fuel efficient"},{"es":"ITIN OK","en":"ITIN OK"}]','{"cleanTitle":true,"accidents":0,"owners":2,"serviced":true}',true,true,true,null,'published',now()-interval '1 day',256),
    -- Yamilet (Bronx, free, particular) — 3
    (u_bx2,b_bx2,'2017-kia-optima-bx2','usado','sedan','Kia','Optima',2017,13900,null,64000,'automatica','gasolina','fwd',31,'Negro','Black','5XXGT4L30HG000014','Mi Optima, bien cuidado, precio de contado justo.','My Optima, well kept, fair cash price.','Bronx, NY',st_setsrid(st_makepoint(-73.9127,40.8151),4326)::geography,'[{"es":"Un dueño","en":"One owner"},{"es":"No fumador","en":"Non-smoker"}]','{"cleanTitle":true,"accidents":0,"owners":1,"serviced":true}',false,false,false,null,'published',now()-interval '2 days',176),
    (u_bx2,b_bx2,'2015-nissan-altima-bx2','usado','sedan','Nissan','Altima',2015,10500,null,95000,'cvt','gasolina','fwd',32,'Plateado','Silver','1N4AL3AP0FC000015','Altima confiable para el día a día, buen precio.','Reliable daily Altima, good price.','Bronx, NY',st_setsrid(st_makepoint(-73.9120,40.8156),4326)::geography,'[{"es":"Económico","en":"Economical"}]','{"cleanTitle":true,"accidents":0,"owners":2,"serviced":true}',false,false,false,null,'published',now()-interval '5 days',132),
    (u_bx2,b_bx2,'2013-honda-odyssey-bx2','usado','minivan','Honda','Odyssey',2013,9900,null,128000,'automatica','gasolina','fwd',22,'Dorado','Gold','5FNRL5H49DB000016','Minivan familiar, mucho espacio, motor fuerte.','Family minivan, lots of space, strong engine.','Bronx, NY',st_setsrid(st_makepoint(-73.9133,40.8146),4326)::geography,'[{"es":"7 pasajeros","en":"7 seats"},{"es":"Puertas eléctricas","en":"Power doors"}]','{"cleanTitle":true,"accidents":1,"owners":3,"serviced":true}',false,false,false,null,'published',now()-interval '10 days',88);
  end if;

  -- leads (incl pre-qual) + tests + saves on the BHPH dealers
  if c1 is not null and not exists (select 1 from public.vehicle_leads where business_id=b_hz1) then
    select id into v1 from public.vehicles where slug='2019-toyota-camry-hz1';
    select id into v2 from public.vehicles where slug='2020-honda-crv-hz1';
    select id into v3 from public.vehicles where slug='2019-nissan-rogue-bx1';
    select id into v4 from public.vehicles where slug='2020-honda-accord-bx1';
    insert into public.vehicle_leads (vehicle_id, business_id, user_id, name, phone, email, kind, stage, message, offer_amount, income, employ, credit, down) values
      (v1,b_hz1,c1,'María González','(570) 555-2211','1@1.com','prequal','financing','Trabajo en la fábrica, quiero saber si califico.',null,'$3,000 - $4,000','empleado','regular',1500),
      (v1,b_hz1,c2,'Carlos Jiménez','(570) 555-3345','2@1.com','prueba','test','¿Puedo manejarlo el sábado?',null,null,null,null,null),
      (v2,b_hz1,c2,'Carlos Jiménez','(570) 555-3345','2@1.com','mensaje','new','¿Acepta mi Sentra 2016 como enganche?',null,null,null,null,null),
      (v3,b_bx1,c3,'Josefina Rodríguez','(718) 555-8890','1@2.com','prequal','new','Tengo ITIN, no número social. ¿Puedo financiar?',null,'$4,000 - $5,000','propio','bueno',1500),
      (v4,b_bx1,c3,'Josefina Rodríguez','(718) 555-8890','1@2.com','oferta','contacted','Ofrezco $21,500 de contado.',21500,null,null,null,null);
    insert into public.vehicle_tests (vehicle_id, business_id, user_id, name, phone, at, status, message) values
      (v1,b_hz1,c2,'Carlos Jiménez','(570) 555-3345',now()+interval '2 days'+interval '15 hours','pendiente','El sábado por la tarde.'),
      (v3,b_bx1,c3,'Josefina Rodríguez','(718) 555-8890',now()+interval '1 day'+interval '17 hours','confirmada',null);
    insert into public.vehicle_saves (vehicle_id, user_id) values (v1,c1),(v2,c2),(v3,c3),(v4,c3) on conflict do nothing;
  end if;
end $$;

commit;
