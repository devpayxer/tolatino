-- Generado por scripts/semilla/extraer-dealer.cjs desde el prototipo. SOLO SANDBOX. No editar a mano.
begin;
do $$
declare b text := 'autos-el-cibao'; s bigint; it bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-DEALER') or exists (select 1 from dealer_settings where business_id = b) then return; end if;
  insert into dealer_settings (business_id, city_id, kind_override, doc_fee_cents, tags_cents, fin, itin, no_credit, itin_down_cents, apr_bp, term_m, trade, home_test, reports_credit, warranty_default,
     bhph_down_cents, bhph_week_cents, bhph_months, lot_total)
   select b, x.city_id, null, least(39900, coalesce((select (value #>> '{}')::int from platform_config where key = 'dealer_doc_fee_cap_cents'), 0)), 15000, true, true, true,
          150000, 1490, 48, true, false, false, 3,
          99900, 9500, 18, 38
     from businesses x where x.id = b;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into items (business_id, module, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', '{"es":"2016 Honda Civic LX","en":"2016 Honda Civic LX"}'::jsonb, '{"es":"","en":""}'::jsonb, 1190000, 30, 'auto', '{}'::jsonb, 0, '{"https://images.pexels.com/photos/6794821/pexels-photo-6794821.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 0) returning id into it;
  insert into vehicle_listings (item_id, business_id, city_id, vin, year, make, model, trim_level, body, miles, engine_hours, transmission, fuel, drivetrain, title, history_report, history_src, pa_inspection,
        warranty, warranty_months, warranty_miles, street_legal, cdl, price_cents, tax_bp, tax_cents, tags_cents, doc_fee_cents, otd_cents)
   select it, b, x.city_id, '2HGFC2F56GATL0001', 2016, 'Honda', 'Civic', 'LX', 'carro', 88400, null,
          'cvt', 'gasolina', 'fwd', 'limpio', true, 'Carfax', true,
          'dealer', 3, 3000, true, false, 1190000,
          t.bp, (1190000::bigint * t.bp + 5000) / 10000, s2.tags_cents, s2.doc_fee_cents, 1190000 + ((1190000::bigint * t.bp + 5000) / 10000)::int + s2.tags_cents + s2.doc_fee_cents
     from businesses x join dealer_settings s2 on s2.business_id = x.id
          cross join lateral (select parts_bp as bp from tax_rules where city_id = x.city_id and category_id = 'NEG-DEALER' and effective_from <= now() order by effective_from desc, id desc limit 1) t
    where x.id = b;
  insert into items (business_id, module, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', '{"es":"2017 Toyota Camry SE","en":"2017 Toyota Camry SE"}'::jsonb, '{"es":"","en":""}'::jsonb, 1450000, 30, 'auto', '{}'::jsonb, 0, '{"https://images.pexels.com/photos/11285174/pexels-photo-11285174.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 1) returning id into it;
  insert into vehicle_listings (item_id, business_id, city_id, vin, year, make, model, trim_level, body, miles, engine_hours, transmission, fuel, drivetrain, title, history_report, history_src, pa_inspection,
        warranty, warranty_months, warranty_miles, street_legal, cdl, price_cents, tax_bp, tax_cents, tags_cents, doc_fee_cents, otd_cents)
   select it, b, x.city_id, '4T1BF1FK9HATL0002', 2017, 'Toyota', 'Camry', 'SE', 'carro', 76200, null,
          'automatica', 'gasolina', 'fwd', 'limpio', true, 'Carfax', true,
          'dealer', 3, 3000, true, false, 1450000,
          t.bp, (1450000::bigint * t.bp + 5000) / 10000, s2.tags_cents, s2.doc_fee_cents, 1450000 + ((1450000::bigint * t.bp + 5000) / 10000)::int + s2.tags_cents + s2.doc_fee_cents
     from businesses x join dealer_settings s2 on s2.business_id = x.id
          cross join lateral (select parts_bp as bp from tax_rules where city_id = x.city_id and category_id = 'NEG-DEALER' and effective_from <= now() order by effective_from desc, id desc limit 1) t
    where x.id = b;
  insert into items (business_id, module, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', '{"es":"2018 Toyota RAV4 LE AWD","en":"2018 Toyota RAV4 LE AWD"}'::jsonb, '{"es":"","en":""}'::jsonb, 1790000, 30, 'auto', '{}'::jsonb, 0, '{"https://images.pexels.com/photos/28086865/pexels-photo-28086865.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 2) returning id into it;
  insert into vehicle_listings (item_id, business_id, city_id, vin, year, make, model, trim_level, body, miles, engine_hours, transmission, fuel, drivetrain, title, history_report, history_src, pa_inspection,
        warranty, warranty_months, warranty_miles, street_legal, cdl, price_cents, tax_bp, tax_cents, tags_cents, doc_fee_cents, otd_cents)
   select it, b, x.city_id, '2T3BFREV7JATL0003', 2018, 'Toyota', 'RAV4', 'LE AWD', 'suv', 69800, null,
          'automatica', 'gasolina', 'awd', 'limpio', true, 'Carfax', true,
          'dealer', 3, 3000, true, false, 1790000,
          t.bp, (1790000::bigint * t.bp + 5000) / 10000, s2.tags_cents, s2.doc_fee_cents, 1790000 + ((1790000::bigint * t.bp + 5000) / 10000)::int + s2.tags_cents + s2.doc_fee_cents
     from businesses x join dealer_settings s2 on s2.business_id = x.id
          cross join lateral (select parts_bp as bp from tax_rules where city_id = x.city_id and category_id = 'NEG-DEALER' and effective_from <= now() order by effective_from desc, id desc limit 1) t
    where x.id = b;
  insert into items (business_id, module, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', '{"es":"2015 Nissan Altima","en":"2015 Nissan Altima"}'::jsonb, '{"es":"","en":""}'::jsonb, 690000, 30, 'auto', '{}'::jsonb, 0, '{"https://images.pexels.com/photos/5864402/pexels-photo-5864402.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 3) returning id into it;
  insert into vehicle_listings (item_id, business_id, city_id, vin, year, make, model, trim_level, body, miles, engine_hours, transmission, fuel, drivetrain, title, history_report, history_src, pa_inspection,
        warranty, warranty_months, warranty_miles, street_legal, cdl, price_cents, tax_bp, tax_cents, tags_cents, doc_fee_cents, otd_cents)
   select it, b, x.city_id, '1N4AL3APXFATL0004', 2015, 'Nissan', 'Altima', null, 'carro', 119000, null,
          'automatica', 'gasolina', 'fwd', 'limpio', true, 'Carfax', true,
          'dealer', 3, 3000, true, false, 690000,
          t.bp, (690000::bigint * t.bp + 5000) / 10000, s2.tags_cents, s2.doc_fee_cents, 690000 + ((690000::bigint * t.bp + 5000) / 10000)::int + s2.tags_cents + s2.doc_fee_cents
     from businesses x join dealer_settings s2 on s2.business_id = x.id
          cross join lateral (select parts_bp as bp from tax_rules where city_id = x.city_id and category_id = 'NEG-DEALER' and effective_from <= now() order by effective_from desc, id desc limit 1) t
    where x.id = b;
  insert into items (business_id, module, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', '{"es":"2016 Nissan Rogue SV","en":"2016 Nissan Rogue SV"}'::jsonb, '{"es":"","en":""}'::jsonb, 1290000, 30, 'auto', '{}'::jsonb, 0, '{"https://images.pexels.com/photos/5864402/pexels-photo-5864402.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 4) returning id into it;
  insert into vehicle_listings (item_id, business_id, city_id, vin, year, make, model, trim_level, body, miles, engine_hours, transmission, fuel, drivetrain, title, history_report, history_src, pa_inspection,
        warranty, warranty_months, warranty_miles, street_legal, cdl, price_cents, tax_bp, tax_cents, tags_cents, doc_fee_cents, otd_cents)
   select it, b, x.city_id, '5N1AT2MV7GATL0005', 2016, 'Nissan', 'Rogue', 'SV', 'suv', 81000, null,
          'automatica', 'gasolina', 'awd', 'limpio', true, 'Carfax', true,
          'dealer', 3, 3000, true, false, 1290000,
          t.bp, (1290000::bigint * t.bp + 5000) / 10000, s2.tags_cents, s2.doc_fee_cents, 1290000 + ((1290000::bigint * t.bp + 5000) / 10000)::int + s2.tags_cents + s2.doc_fee_cents
     from businesses x join dealer_settings s2 on s2.business_id = x.id
          cross join lateral (select parts_bp as bp from tax_rules where city_id = x.city_id and category_id = 'NEG-DEALER' and effective_from <= now() order by effective_from desc, id desc limit 1) t
    where x.id = b;
end $$;
do $$
declare b text := 'keystone-trucks'; s bigint; it bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-DEALER') or exists (select 1 from dealer_settings where business_id = b) then return; end if;
  insert into dealer_settings (business_id, city_id, kind_override, doc_fee_cents, tags_cents, fin, itin, no_credit, itin_down_cents, apr_bp, term_m, trade, home_test, reports_credit, warranty_default,
     bhph_down_cents, bhph_week_cents, bhph_months, lot_total)
   select b, x.city_id, null, least(29900, coalesce((select (value #>> '{}')::int from platform_config where key = 'dealer_doc_fee_cap_cents'), 0)), 15000, true, false, true,
          150000, null, null, true, false, false, 3,
          99900, 9500, 18, 3
     from businesses x where x.id = b;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into items (business_id, module, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', '{"es":"2015 Ford F-150 XLT 4x4","en":"2015 Ford F-150 XLT 4x4"}'::jsonb, '{"es":"","en":""}'::jsonb, 1890000, 30, 'auto', '{}'::jsonb, 0, '{"https://images.pexels.com/photos/8066253/pexels-photo-8066253.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 0) returning id into it;
  insert into vehicle_listings (item_id, business_id, city_id, vin, year, make, model, trim_level, body, miles, engine_hours, transmission, fuel, drivetrain, title, history_report, history_src, pa_inspection,
        warranty, warranty_months, warranty_miles, street_legal, cdl, price_cents, tax_bp, tax_cents, tags_cents, doc_fee_cents, otd_cents)
   select it, b, x.city_id, '1FTEW1EF6FATL0006', 2015, 'Ford', 'F-150', 'XLT 4x4', 'pickup', 112000, null,
          'automatica', 'gasolina', '4x4', 'limpio', true, 'Carfax', true,
          'dealer', 3, 3000, true, false, 1890000,
          t.bp, (1890000::bigint * t.bp + 5000) / 10000, s2.tags_cents, s2.doc_fee_cents, 1890000 + ((1890000::bigint * t.bp + 5000) / 10000)::int + s2.tags_cents + s2.doc_fee_cents
     from businesses x join dealer_settings s2 on s2.business_id = x.id
          cross join lateral (select parts_bp as bp from tax_rules where city_id = x.city_id and category_id = 'NEG-DEALER' and effective_from <= now() order by effective_from desc, id desc limit 1) t
    where x.id = b;
  insert into items (business_id, module, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', '{"es":"2016 Chevrolet Silverado 1500","en":"2016 Chevrolet Silverado 1500"}'::jsonb, '{"es":"","en":""}'::jsonb, 1950000, 30, 'auto', '{}'::jsonb, 0, '{"https://images.pexels.com/photos/9115472/pexels-photo-9115472.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 1) returning id into it;
  insert into vehicle_listings (item_id, business_id, city_id, vin, year, make, model, trim_level, body, miles, engine_hours, transmission, fuel, drivetrain, title, history_report, history_src, pa_inspection,
        warranty, warranty_months, warranty_miles, street_legal, cdl, price_cents, tax_bp, tax_cents, tags_cents, doc_fee_cents, otd_cents)
   select it, b, x.city_id, '1GCVKREC2GATL0007', 2016, 'Chevrolet', 'Silverado 1500', null, 'pickup', 98300, null,
          'automatica', 'gasolina', '4x4', 'limpio', true, 'Carfax', true,
          'dealer', 3, 3000, true, false, 1950000,
          t.bp, (1950000::bigint * t.bp + 5000) / 10000, s2.tags_cents, s2.doc_fee_cents, 1950000 + ((1950000::bigint * t.bp + 5000) / 10000)::int + s2.tags_cents + s2.doc_fee_cents
     from businesses x join dealer_settings s2 on s2.business_id = x.id
          cross join lateral (select parts_bp as bp from tax_rules where city_id = x.city_id and category_id = 'NEG-DEALER' and effective_from <= now() order by effective_from desc, id desc limit 1) t
    where x.id = b;
  insert into items (business_id, module, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', '{"es":"2017 Toyota Sienna LE","en":"2017 Toyota Sienna LE"}'::jsonb, '{"es":"","en":""}'::jsonb, 1690000, 30, 'auto', '{}'::jsonb, 0, '{"https://images.pexels.com/photos/20846594/pexels-photo-20846594.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 2) returning id into it;
  insert into vehicle_listings (item_id, business_id, city_id, vin, year, make, model, trim_level, body, miles, engine_hours, transmission, fuel, drivetrain, title, history_report, history_src, pa_inspection,
        warranty, warranty_months, warranty_miles, street_legal, cdl, price_cents, tax_bp, tax_cents, tags_cents, doc_fee_cents, otd_cents)
   select it, b, x.city_id, '5TDKZ3DC5HATL0008', 2017, 'Toyota', 'Sienna', 'LE', 'van', 91000, null,
          'automatica', 'gasolina', 'fwd', 'limpio', true, 'Carfax', true,
          'dealer', 3, 3000, true, false, 1690000,
          t.bp, (1690000::bigint * t.bp + 5000) / 10000, s2.tags_cents, s2.doc_fee_cents, 1690000 + ((1690000::bigint * t.bp + 5000) / 10000)::int + s2.tags_cents + s2.doc_fee_cents
     from businesses x join dealer_settings s2 on s2.business_id = x.id
          cross join lateral (select parts_bp as bp from tax_rules where city_id = x.city_id and category_id = 'NEG-DEALER' and effective_from <= now() order by effective_from desc, id desc limit 1) t
    where x.id = b;
end $$;
do $$
declare b text := 'compre-aqui-hzl'; s bigint; it bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-DEALER') or exists (select 1 from dealer_settings where business_id = b) then return; end if;
  insert into dealer_settings (business_id, city_id, kind_override, doc_fee_cents, tags_cents, fin, itin, no_credit, itin_down_cents, apr_bp, term_m, trade, home_test, reports_credit, warranty_default,
     bhph_down_cents, bhph_week_cents, bhph_months, lot_total)
   select b, x.city_id, null, least(19900, coalesce((select (value #>> '{}')::int from platform_config where key = 'dealer_doc_fee_cap_cents'), 0)), 15000, false, true, false,
          150000, null, null, false, false, false, 0,
          99900, 9500, 18, 2
     from businesses x where x.id = b;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into items (business_id, module, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', '{"es":"2012 Honda Accord EX","en":"2012 Honda Accord EX"}'::jsonb, '{"es":"","en":""}'::jsonb, 690000, 30, 'auto', '{}'::jsonb, 0, '{"https://images.pexels.com/photos/16350076/pexels-photo-16350076.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 0) returning id into it;
  insert into vehicle_listings (item_id, business_id, city_id, vin, year, make, model, trim_level, body, miles, engine_hours, transmission, fuel, drivetrain, title, history_report, history_src, pa_inspection,
        warranty, warranty_months, warranty_miles, street_legal, cdl, price_cents, tax_bp, tax_cents, tags_cents, doc_fee_cents, otd_cents)
   select it, b, x.city_id, '1HGCP2F89CATL0009', 2012, 'Honda', 'Accord', 'EX', 'carro', 142000, null,
          'automatica', 'gasolina', 'fwd', 'limpio', true, 'Carfax', true,
          'como_esta', null, null, true, false, 690000,
          t.bp, (690000::bigint * t.bp + 5000) / 10000, s2.tags_cents, s2.doc_fee_cents, 690000 + ((690000::bigint * t.bp + 5000) / 10000)::int + s2.tags_cents + s2.doc_fee_cents
     from businesses x join dealer_settings s2 on s2.business_id = x.id
          cross join lateral (select parts_bp as bp from tax_rules where city_id = x.city_id and category_id = 'NEG-DEALER' and effective_from <= now() order by effective_from desc, id desc limit 1) t
    where x.id = b;
  insert into items (business_id, module, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', '{"es":"2013 Toyota Corolla LE","en":"2013 Toyota Corolla LE"}'::jsonb, '{"es":"","en":""}'::jsonb, 740000, 30, 'auto', '{}'::jsonb, 0, '{"https://images.pexels.com/photos/11285174/pexels-photo-11285174.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 1) returning id into it;
  insert into vehicle_listings (item_id, business_id, city_id, vin, year, make, model, trim_level, body, miles, engine_hours, transmission, fuel, drivetrain, title, history_report, history_src, pa_inspection,
        warranty, warranty_months, warranty_miles, street_legal, cdl, price_cents, tax_bp, tax_cents, tags_cents, doc_fee_cents, otd_cents)
   select it, b, x.city_id, '2T1BU4EE7DATL0010', 2013, 'Toyota', 'Corolla', 'LE', 'carro', 131500, null,
          'automatica', 'gasolina', 'fwd', 'limpio', true, 'Carfax', true,
          'como_esta', null, null, true, false, 740000,
          t.bp, (740000::bigint * t.bp + 5000) / 10000, s2.tags_cents, s2.doc_fee_cents, 740000 + ((740000::bigint * t.bp + 5000) / 10000)::int + s2.tags_cents + s2.doc_fee_cents
     from businesses x join dealer_settings s2 on s2.business_id = x.id
          cross join lateral (select parts_bp as bp from tax_rules where city_id = x.city_id and category_id = 'NEG-DEALER' and effective_from <= now() order by effective_from desc, id desc limit 1) t
    where x.id = b;
end $$;
do $$
declare b text := 'placas-y-titulos'; s bigint; it bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-DEALER') or exists (select 1 from dealer_settings where business_id = b) then return; end if;
  insert into dealer_settings (business_id, city_id, kind_override, doc_fee_cents, tags_cents, fin, itin, no_credit, itin_down_cents, apr_bp, term_m, trade, home_test, reports_credit, warranty_default,
     bhph_down_cents, bhph_week_cents, bhph_months, lot_total)
   select b, x.city_id, 'placas', least(0, coalesce((select (value #>> '{}')::int from platform_config where key = 'dealer_doc_fee_cap_cents'), 0)), 15000, false, false, false,
          150000, null, null, false, false, false, 0,
          99900, 9500, 18, 0
     from businesses x where x.id = b;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Trámites","en":"Services"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Placas y registro","en":"Placas y registro"}'::jsonb, '{"es":"Placa temporal y registro el mismo día.","en":"Placa temporal y registro el mismo día."}'::jsonb, 4500, 60, '{}'::jsonb, 0, '{}'::text[], 0);
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Cambio de título","en":"Cambio de título"}'::jsonb, '{"es":"Compraste o vendiste: el título a tu nombre.","en":"Compraste o vendiste: el título a tu nombre."}'::jsonb, 6500, 60, '{}'::jsonb, 0, '{}'::text[], 1);
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Título perdido","en":"Título perdido"}'::jsonb, '{"es":"Te ayudamos a pedir uno nuevo.","en":"Te ayudamos a pedir uno nuevo."}'::jsonb, 4000, 60, '{}'::jsonb, 0, '{}'::text[], 2);
end $$;
do $$
declare b text := 'cash-for-cars-pa'; s bigint; it bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-DEALER') or exists (select 1 from dealer_settings where business_id = b) then return; end if;
  insert into dealer_settings (business_id, city_id, kind_override, doc_fee_cents, tags_cents, fin, itin, no_credit, itin_down_cents, apr_bp, term_m, trade, home_test, reports_credit, warranty_default,
     bhph_down_cents, bhph_week_cents, bhph_months, lot_total)
   select b, x.city_id, null, least(0, coalesce((select (value #>> '{}')::int from platform_config where key = 'dealer_doc_fee_cap_cents'), 0)), 15000, false, false, false,
          150000, null, null, false, false, false, 0,
          99900, 9500, 18, 0
     from businesses x where x.id = b;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Compra","en":"Buying"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Oferta por tu carro","en":"Oferta por tu carro"}'::jsonb, '{"es":"Gratis, por escrito, funcione o no.","en":"Gratis, por escrito, funcione o no."}'::jsonb, 0, 60, '{}'::jsonb, 0, '{}'::text[], 0);
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Grúa","en":"Grúa"}'::jsonb, '{"es":"Gratis hasta 30 millas.","en":"Gratis hasta 30 millas."}'::jsonb, 0, 60, '{}'::jsonb, 0, '{}'::text[], 1);
end $$;
do $$
declare b text := 'valle-motors'; s bigint; it bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-DEALER') or exists (select 1 from dealer_settings where business_id = b) then return; end if;
  insert into dealer_settings (business_id, city_id, kind_override, doc_fee_cents, tags_cents, fin, itin, no_credit, itin_down_cents, apr_bp, term_m, trade, home_test, reports_credit, warranty_default,
     bhph_down_cents, bhph_week_cents, bhph_months, lot_total)
   select b, x.city_id, null, least(49900, coalesce((select (value #>> '{}')::int from platform_config where key = 'dealer_doc_fee_cap_cents'), 0)), 15000, false, false, false,
          150000, null, null, true, true, false, 0,
          99900, 9500, 18, 36
     from businesses x where x.id = b;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into items (business_id, module, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', '{"es":"2025 Toyota Corolla LE","en":"2025 Toyota Corolla LE"}'::jsonb, '{"es":"Nuevo. Primer servicio gratis.","en":"New. First service free."}'::jsonb, 2390000, 30, 'auto', '{}'::jsonb, 0, '{"https://images.pexels.com/photos/2127039/pexels-photo-2127039.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 0) returning id into it;
  insert into vehicle_listings (item_id, business_id, city_id, vin, year, make, model, trim_level, body, miles, engine_hours, transmission, fuel, drivetrain, title, history_report, history_src, pa_inspection,
        warranty, warranty_months, warranty_miles, street_legal, cdl, price_cents, tax_bp, tax_cents, tags_cents, doc_fee_cents, otd_cents)
   select it, b, x.city_id, '5YFB4MDE1SATL0011', 2025, 'Toyota', 'Corolla', 'LE', 'carro', 12, null,
          'automatica', 'gasolina', 'fwd', 'limpio', false, null, false,
          'fabrica', 36, 36000, true, false, 2390000,
          t.bp, (2390000::bigint * t.bp + 5000) / 10000, s2.tags_cents, s2.doc_fee_cents, 2390000 + ((2390000::bigint * t.bp + 5000) / 10000)::int + s2.tags_cents + s2.doc_fee_cents
     from businesses x join dealer_settings s2 on s2.business_id = x.id
          cross join lateral (select parts_bp as bp from tax_rules where city_id = x.city_id and category_id = 'NEG-DEALER' and effective_from <= now() order by effective_from desc, id desc limit 1) t
    where x.id = b;
  insert into items (business_id, module, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', '{"es":"2022 Honda CR-V EX","en":"2022 Honda CR-V EX"}'::jsonb, '{"es":"Certificado del fabricante: 7 años en motor.","en":"Manufacturer certified: 7-year powertrain."}'::jsonb, 2690000, 30, 'auto', '{}'::jsonb, 0, '{"https://images.pexels.com/photos/116675/pexels-photo-116675.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 1) returning id into it;
  insert into vehicle_listings (item_id, business_id, city_id, vin, year, make, model, trim_level, body, miles, engine_hours, transmission, fuel, drivetrain, title, history_report, history_src, pa_inspection,
        warranty, warranty_months, warranty_miles, street_legal, cdl, price_cents, tax_bp, tax_cents, tags_cents, doc_fee_cents, otd_cents)
   select it, b, x.city_id, '2HKRW2H55NATL0012', 2022, 'Honda', 'CR-V', 'EX', 'suv', 31200, null,
          'automatica', 'gasolina', 'awd', 'limpio', true, 'Carfax', false,
          'certificado', 84, 100000, true, false, 2690000,
          t.bp, (2690000::bigint * t.bp + 5000) / 10000, s2.tags_cents, s2.doc_fee_cents, 2690000 + ((2690000::bigint * t.bp + 5000) / 10000)::int + s2.tags_cents + s2.doc_fee_cents
     from businesses x join dealer_settings s2 on s2.business_id = x.id
          cross join lateral (select parts_bp as bp from tax_rules where city_id = x.city_id and category_id = 'NEG-DEALER' and effective_from <= now() order by effective_from desc, id desc limit 1) t
    where x.id = b;
end $$;
do $$
declare b text := 'primer-carro-financiamiento'; s bigint; it bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-DEALER') or exists (select 1 from dealer_settings where business_id = b) then return; end if;
  insert into dealer_settings (business_id, city_id, kind_override, doc_fee_cents, tags_cents, fin, itin, no_credit, itin_down_cents, apr_bp, term_m, trade, home_test, reports_credit, warranty_default,
     bhph_down_cents, bhph_week_cents, bhph_months, lot_total)
   select b, x.city_id, null, least(0, coalesce((select (value #>> '{}')::int from platform_config where key = 'dealer_doc_fee_cap_cents'), 0)), 15000, true, true, true,
          100000, null, null, false, false, false, 0,
          99900, 9500, 18, 0
     from businesses x where x.id = b;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Servicios","en":"Services"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Precalificación para tu primer carro","en":"First car pre-qualification"}'::jsonb, '{"es":"Gratis, con ITIN o sin crédito. Te decimos cuánto te prestan antes de ir al dealer.","en":"Free, with ITIN or no credit. We tell you how much before you go to the dealer."}'::jsonb, 0, 60, '{}'::jsonb, 0, '{"https://images.pexels.com/photos/7144195/pexels-photo-7144195.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 0);
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Garantía extendida · 3 años","en":"Extended warranty · 3 years"}'::jsonb, '{"es":"Motor, transmisión y aire. No es obligatoria para el préstamo.","en":"Engine, transmission and A/C. Not required for the loan."}'::jsonb, 129500, 60, '{}'::jsonb, 0, '{"https://images.pexels.com/photos/7144195/pexels-photo-7144195.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 1);
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"GAP","en":"GAP"}'::jsonb, '{"es":"Paga lo que debes si el seguro da menos. No es obligatorio.","en":"Pays what you owe if insurance pays less. Not required."}'::jsonb, 49500, 60, '{}'::jsonb, 0, '{"https://images.pexels.com/photos/7144195/pexels-photo-7144195.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 2);
end $$;
do $$
declare b text := 'power-sports-hazleton'; s bigint; it bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-DEALER') or exists (select 1 from dealer_settings where business_id = b) then return; end if;
  insert into dealer_settings (business_id, city_id, kind_override, doc_fee_cents, tags_cents, fin, itin, no_credit, itin_down_cents, apr_bp, term_m, trade, home_test, reports_credit, warranty_default,
     bhph_down_cents, bhph_week_cents, bhph_months, lot_total)
   select b, x.city_id, null, least(19900, coalesce((select (value #>> '{}')::int from platform_config where key = 'dealer_doc_fee_cap_cents'), 0)), 15000, true, true, false,
          80000, null, null, true, false, false, 6,
          99900, 9500, 18, 27
     from businesses x where x.id = b;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into items (business_id, module, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', '{"es":"2021 Honda Rebel 500","en":"2021 Honda Rebel 500"}'::jsonb, '{"es":"","en":""}'::jsonb, 590000, 30, 'auto', '{}'::jsonb, 0, '{"https://images.pexels.com/photos/2393835/pexels-photo-2393835.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 0) returning id into it;
  insert into vehicle_listings (item_id, business_id, city_id, vin, year, make, model, trim_level, body, miles, engine_hours, transmission, fuel, drivetrain, title, history_report, history_src, pa_inspection,
        warranty, warranty_months, warranty_miles, street_legal, cdl, price_cents, tax_bp, tax_cents, tags_cents, doc_fee_cents, otd_cents)
   select it, b, x.city_id, 'JH2PC5600MATL0013', 2021, 'Honda', 'Rebel 500', null, 'moto', 4100, null,
          'manual', 'gasolina', null, 'limpio', true, 'Carfax', true,
          'dealer', 6, 6000, true, false, 590000,
          t.bp, (590000::bigint * t.bp + 5000) / 10000, s2.tags_cents, s2.doc_fee_cents, 590000 + ((590000::bigint * t.bp + 5000) / 10000)::int + s2.tags_cents + s2.doc_fee_cents
     from businesses x join dealer_settings s2 on s2.business_id = x.id
          cross join lateral (select parts_bp as bp from tax_rules where city_id = x.city_id and category_id = 'NEG-DEALER' and effective_from <= now() order by effective_from desc, id desc limit 1) t
    where x.id = b;
  insert into items (business_id, module, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', '{"es":"2022 Yamaha Grizzly 700","en":"2022 Yamaha Grizzly 700"}'::jsonb, '{"es":"Las cuatrimotos no se manejan en la calle en PA.","en":"ATVs are not street legal in PA."}'::jsonb, 840000, 30, 'auto', '{}'::jsonb, 0, '{"https://images.pexels.com/photos/1715193/pexels-photo-1715193.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 1) returning id into it;
  insert into vehicle_listings (item_id, business_id, city_id, vin, year, make, model, trim_level, body, miles, engine_hours, transmission, fuel, drivetrain, title, history_report, history_src, pa_inspection,
        warranty, warranty_months, warranty_miles, street_legal, cdl, price_cents, tax_bp, tax_cents, tags_cents, doc_fee_cents, otd_cents)
   select it, b, x.city_id, 'JY4AM08Y0NATL0014', 2022, 'Yamaha', 'Grizzly 700', null, 'cuatrimoto', 380, null,
          'automatica', 'gasolina', null, 'limpio', true, 'Carfax', true,
          'dealer', 6, 6000, false, false, 840000,
          t.bp, (840000::bigint * t.bp + 5000) / 10000, s2.tags_cents, s2.doc_fee_cents, 840000 + ((840000::bigint * t.bp + 5000) / 10000)::int + s2.tags_cents + s2.doc_fee_cents
     from businesses x join dealer_settings s2 on s2.business_id = x.id
          cross join lateral (select parts_bp as bp from tax_rules where city_id = x.city_id and category_id = 'NEG-DEALER' and effective_from <= now() order by effective_from desc, id desc limit 1) t
    where x.id = b;
  insert into items (business_id, module, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', '{"es":"2024 Scooter 150 cc","en":"2024 Scooter 150 cc"}'::jsonb, '{"es":"","en":""}'::jsonb, 189900, 30, 'auto', '{}'::jsonb, 0, '{"https://images.pexels.com/photos/1413412/pexels-photo-1413412.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 2) returning id into it;
  insert into vehicle_listings (item_id, business_id, city_id, vin, year, make, model, trim_level, body, miles, engine_hours, transmission, fuel, drivetrain, title, history_report, history_src, pa_inspection,
        warranty, warranty_months, warranty_miles, street_legal, cdl, price_cents, tax_bp, tax_cents, tags_cents, doc_fee_cents, otd_cents)
   select it, b, x.city_id, 'L5YACBPA9RATL0015', 2024, 'Scooter', '150 cc', null, 'scooter', 90, null,
          'automatica', 'gasolina', null, 'limpio', true, 'Carfax', true,
          'dealer', 6, 6000, true, false, 189900,
          t.bp, (189900::bigint * t.bp + 5000) / 10000, s2.tags_cents, s2.doc_fee_cents, 189900 + ((189900::bigint * t.bp + 5000) / 10000)::int + s2.tags_cents + s2.doc_fee_cents
     from businesses x join dealer_settings s2 on s2.business_id = x.id
          cross join lateral (select parts_bp as bp from tax_rules where city_id = x.city_id and category_id = 'NEG-DEALER' and effective_from <= now() order by effective_from desc, id desc limit 1) t
    where x.id = b;
end $$;
do $$
declare b text := 'lake-harmony-botes-campers'; s bigint; it bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-DEALER') or exists (select 1 from dealer_settings where business_id = b) then return; end if;
  insert into dealer_settings (business_id, city_id, kind_override, doc_fee_cents, tags_cents, fin, itin, no_credit, itin_down_cents, apr_bp, term_m, trade, home_test, reports_credit, warranty_default,
     bhph_down_cents, bhph_week_cents, bhph_months, lot_total)
   select b, x.city_id, null, least(39900, coalesce((select (value #>> '{}')::int from platform_config where key = 'dealer_doc_fee_cap_cents'), 0)), 15000, false, false, false,
          150000, null, null, true, false, false, 0,
          99900, 9500, 18, 3
     from businesses x where x.id = b;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into items (business_id, module, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', '{"es":"2019 Bayliner VR5","en":"2019 Bayliner VR5"}'::jsonb, '{"es":"Remolque incluido.","en":"Trailer included."}'::jsonb, 2450000, 30, 'auto', '{}'::jsonb, 0, '{"https://images.pexels.com/photos/296278/pexels-photo-296278.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 0) returning id into it;
  insert into vehicle_listings (item_id, business_id, city_id, vin, year, make, model, trim_level, body, miles, engine_hours, transmission, fuel, drivetrain, title, history_report, history_src, pa_inspection,
        warranty, warranty_months, warranty_miles, street_legal, cdl, price_cents, tax_bp, tax_cents, tags_cents, doc_fee_cents, otd_cents)
   select it, b, x.city_id, null, 2019, 'Bayliner', 'VR5', null, 'bote', null, 140,
          null, 'gasolina', null, 'limpio', true, 'Carfax', true,
          'como_esta', null, null, false, false, 2450000,
          t.bp, (2450000::bigint * t.bp + 5000) / 10000, s2.tags_cents, s2.doc_fee_cents, 2450000 + ((2450000::bigint * t.bp + 5000) / 10000)::int + s2.tags_cents + s2.doc_fee_cents
     from businesses x join dealer_settings s2 on s2.business_id = x.id
          cross join lateral (select parts_bp as bp from tax_rules where city_id = x.city_id and category_id = 'NEG-DEALER' and effective_from <= now() order by effective_from desc, id desc limit 1) t
    where x.id = b;
  insert into items (business_id, module, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', '{"es":"2018 Camper 24 pies","en":"2018 Camper 24 pies"}'::jsonb, '{"es":"Duerme 6.","en":"Sleeps 6."}'::jsonb, 1890000, 30, 'auto', '{}'::jsonb, 0, '{"https://images.pexels.com/photos/2533092/pexels-photo-2533092.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 1) returning id into it;
  insert into vehicle_listings (item_id, business_id, city_id, vin, year, make, model, trim_level, body, miles, engine_hours, transmission, fuel, drivetrain, title, history_report, history_src, pa_inspection,
        warranty, warranty_months, warranty_miles, street_legal, cdl, price_cents, tax_bp, tax_cents, tags_cents, doc_fee_cents, otd_cents)
   select it, b, x.city_id, '4YDT24R23JATL0016', 2018, 'Camper', '24 pies', null, 'rv', null, null,
          'automatica', 'gasolina', null, 'limpio', true, 'Carfax', true,
          'como_esta', null, null, true, false, 1890000,
          t.bp, (1890000::bigint * t.bp + 5000) / 10000, s2.tags_cents, s2.doc_fee_cents, 1890000 + ((1890000::bigint * t.bp + 5000) / 10000)::int + s2.tags_cents + s2.doc_fee_cents
     from businesses x join dealer_settings s2 on s2.business_id = x.id
          cross join lateral (select parts_bp as bp from tax_rules where city_id = x.city_id and category_id = 'NEG-DEALER' and effective_from <= now() order by effective_from desc, id desc limit 1) t
    where x.id = b;
  insert into items (business_id, module, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', '{"es":"2023 Carrito de golf eléctrico 4 asientos","en":"2023 Carrito de golf eléctrico 4 asientos"}'::jsonb, '{"es":"Batería nueva.","en":"New battery."}'::jsonb, 650000, 30, 'auto', '{}'::jsonb, 0, '{"https://images.pexels.com/photos/1325659/pexels-photo-1325659.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 2) returning id into it;
  insert into vehicle_listings (item_id, business_id, city_id, vin, year, make, model, trim_level, body, miles, engine_hours, transmission, fuel, drivetrain, title, history_report, history_src, pa_inspection,
        warranty, warranty_months, warranty_miles, street_legal, cdl, price_cents, tax_bp, tax_cents, tags_cents, doc_fee_cents, otd_cents)
   select it, b, x.city_id, null, 2023, 'Carrito de golf', 'eléctrico 4 asientos', null, 'golf', null, null,
          null, 'electrico', null, 'limpio', true, 'Carfax', true,
          'como_esta', null, null, false, false, 650000,
          t.bp, (650000::bigint * t.bp + 5000) / 10000, s2.tags_cents, s2.doc_fee_cents, 650000 + ((650000::bigint * t.bp + 5000) / 10000)::int + s2.tags_cents + s2.doc_fee_cents
     from businesses x join dealer_settings s2 on s2.business_id = x.id
          cross join lateral (select parts_bp as bp from tax_rules where city_id = x.city_id and category_id = 'NEG-DEALER' and effective_from <= now() order by effective_from desc, id desc limit 1) t
    where x.id = b;
end $$;
do $$
declare b text := 'comercial-keystone'; s bigint; it bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-DEALER') or exists (select 1 from dealer_settings where business_id = b) then return; end if;
  insert into dealer_settings (business_id, city_id, kind_override, doc_fee_cents, tags_cents, fin, itin, no_credit, itin_down_cents, apr_bp, term_m, trade, home_test, reports_credit, warranty_default,
     bhph_down_cents, bhph_week_cents, bhph_months, lot_total)
   select b, x.city_id, null, least(39900, coalesce((select (value #>> '{}')::int from platform_config where key = 'dealer_doc_fee_cap_cents'), 0)), 15000, false, false, false,
          150000, null, null, true, false, false, 3,
          99900, 9500, 18, 16
     from businesses x where x.id = b;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into items (business_id, module, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', '{"es":"2019 Ford Transit 250 van de carga","en":"2019 Ford Transit 250 van de carga"}'::jsonb, '{"es":"","en":""}'::jsonb, 2290000, 30, 'auto', '{}'::jsonb, 0, '{"https://images.pexels.com/photos/2449454/pexels-photo-2449454.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 0) returning id into it;
  insert into vehicle_listings (item_id, business_id, city_id, vin, year, make, model, trim_level, body, miles, engine_hours, transmission, fuel, drivetrain, title, history_report, history_src, pa_inspection,
        warranty, warranty_months, warranty_miles, street_legal, cdl, price_cents, tax_bp, tax_cents, tags_cents, doc_fee_cents, otd_cents)
   select it, b, x.city_id, '1FTYR2CM3KATL0017', 2019, 'Ford', 'Transit 250', 'van de carga', 'trabajo', 84300, null,
          'automatica', 'gasolina', 'rwd', 'limpio', true, 'Carfax', true,
          'dealer', 3, 3000, true, false, 2290000,
          t.bp, (2290000::bigint * t.bp + 5000) / 10000, s2.tags_cents, s2.doc_fee_cents, 2290000 + ((2290000::bigint * t.bp + 5000) / 10000)::int + s2.tags_cents + s2.doc_fee_cents
     from businesses x join dealer_settings s2 on s2.business_id = x.id
          cross join lateral (select parts_bp as bp from tax_rules where city_id = x.city_id and category_id = 'NEG-DEALER' and effective_from <= now() order by effective_from desc, id desc limit 1) t
    where x.id = b;
  insert into items (business_id, module, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', '{"es":"2018 Isuzu NPR caja 16 pies","en":"2018 Isuzu NPR caja 16 pies"}'::jsonb, '{"es":"Pesa menos de 26,001 libras: no necesitas CDL.","en":"Under 26,001 lbs: no CDL needed."}'::jsonb, 3450000, 30, 'auto', '{}'::jsonb, 0, '{"https://images.pexels.com/photos/2449454/pexels-photo-2449454.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 1) returning id into it;
  insert into vehicle_listings (item_id, business_id, city_id, vin, year, make, model, trim_level, body, miles, engine_hours, transmission, fuel, drivetrain, title, history_report, history_src, pa_inspection,
        warranty, warranty_months, warranty_miles, street_legal, cdl, price_cents, tax_bp, tax_cents, tags_cents, doc_fee_cents, otd_cents)
   select it, b, x.city_id, 'JALC4W16XJATL0018', 2018, 'Isuzu', 'NPR', 'caja 16 pies', 'caja', 121000, null,
          'automatica', 'diesel', 'rwd', 'limpio', true, 'Carfax', true,
          'dealer', 3, 3000, true, false, 3450000,
          t.bp, (3450000::bigint * t.bp + 5000) / 10000, s2.tags_cents, s2.doc_fee_cents, 3450000 + ((3450000::bigint * t.bp + 5000) / 10000)::int + s2.tags_cents + s2.doc_fee_cents
     from businesses x join dealer_settings s2 on s2.business_id = x.id
          cross join lateral (select parts_bp as bp from tax_rules where city_id = x.city_id and category_id = 'NEG-DEALER' and effective_from <= now() order by effective_from desc, id desc limit 1) t
    where x.id = b;
end $$;
do $$
declare b text := 'clasicos-lujo-valle'; s bigint; it bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-DEALER') or exists (select 1 from dealer_settings where business_id = b) then return; end if;
  insert into dealer_settings (business_id, city_id, kind_override, doc_fee_cents, tags_cents, fin, itin, no_credit, itin_down_cents, apr_bp, term_m, trade, home_test, reports_credit, warranty_default,
     bhph_down_cents, bhph_week_cents, bhph_months, lot_total)
   select b, x.city_id, null, least(59900, coalesce((select (value #>> '{}')::int from platform_config where key = 'dealer_doc_fee_cap_cents'), 0)), 15000, false, false, false,
          150000, null, null, true, false, false, 0,
          99900, 9500, 18, 2
     from businesses x where x.id = b;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into items (business_id, module, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', '{"es":"2017 Maserati GranTurismo","en":"2017 Maserati GranTurismo"}'::jsonb, '{"es":"","en":""}'::jsonb, 5290000, 30, 'auto', '{}'::jsonb, 0, '{"https://images.pexels.com/photos/977003/pexels-photo-977003.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 0) returning id into it;
  insert into vehicle_listings (item_id, business_id, city_id, vin, year, make, model, trim_level, body, miles, engine_hours, transmission, fuel, drivetrain, title, history_report, history_src, pa_inspection,
        warranty, warranty_months, warranty_miles, street_legal, cdl, price_cents, tax_bp, tax_cents, tags_cents, doc_fee_cents, otd_cents)
   select it, b, x.city_id, 'ZAM45VLA6HATL0019', 2017, 'Maserati', 'GranTurismo', null, 'carro', 28400, null,
          'automatica', 'gasolina', 'rwd', 'limpio', true, 'Carfax', true,
          'como_esta', null, null, true, false, 5290000,
          t.bp, (5290000::bigint * t.bp + 5000) / 10000, s2.tags_cents, s2.doc_fee_cents, 5290000 + ((5290000::bigint * t.bp + 5000) / 10000)::int + s2.tags_cents + s2.doc_fee_cents
     from businesses x join dealer_settings s2 on s2.business_id = x.id
          cross join lateral (select parts_bp as bp from tax_rules where city_id = x.city_id and category_id = 'NEG-DEALER' and effective_from <= now() order by effective_from desc, id desc limit 1) t
    where x.id = b;
  insert into items (business_id, module, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', '{"es":"1976 Cadillac Eldorado convertible","en":"1976 Cadillac Eldorado convertible"}'::jsonb, '{"es":"Clásico: revísalo con tu mecánico antes de firmar.","en":"Classic: have your mechanic check it before signing."}'::jsonb, 1850000, 30, 'auto', '{}'::jsonb, 0, '{"https://images.pexels.com/photos/1974520/pexels-photo-1974520.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 1) returning id into it;
  insert into vehicle_listings (item_id, business_id, city_id, vin, year, make, model, trim_level, body, miles, engine_hours, transmission, fuel, drivetrain, title, history_report, history_src, pa_inspection,
        warranty, warranty_months, warranty_miles, street_legal, cdl, price_cents, tax_bp, tax_cents, tags_cents, doc_fee_cents, otd_cents)
   select it, b, x.city_id, null, 1976, 'Cadillac', 'Eldorado', 'convertible', 'carro', 61000, null,
          'automatica', 'gasolina', 'fwd', 'limpio', true, 'Carfax', true,
          'como_esta', null, null, true, false, 1850000,
          t.bp, (1850000::bigint * t.bp + 5000) / 10000, s2.tags_cents, s2.doc_fee_cents, 1850000 + ((1850000::bigint * t.bp + 5000) / 10000)::int + s2.tags_cents + s2.doc_fee_cents
     from businesses x join dealer_settings s2 on s2.business_id = x.id
          cross join lateral (select parts_bp as bp from tax_rules where city_id = x.city_id and category_id = 'NEG-DEALER' and effective_from <= now() order by effective_from desc, id desc limit 1) t
    where x.id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"En el lote","en":"On the lot"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Vende tu clásico en consignación","en":"Sell your classic on consignment"}'::jsonb, '{"es":"Lo fotografiamos y lo vendemos; cobramos 8 % solo si se vende.","en":"We photograph and sell it; 8% only if it sells."}'::jsonb, 0, 60, '{}'::jsonb, 0, '{"https://images.pexels.com/photos/3156482/pexels-photo-3156482.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 2);
end $$;
do $$
declare b text := 'servicio-rapido-valle'; s bigint; it bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-DEALER') or exists (select 1 from dealer_settings where business_id = b) then return; end if;
  insert into dealer_settings (business_id, city_id, kind_override, doc_fee_cents, tags_cents, fin, itin, no_credit, itin_down_cents, apr_bp, term_m, trade, home_test, reports_credit, warranty_default,
     bhph_down_cents, bhph_week_cents, bhph_months, lot_total)
   select b, x.city_id, 'taller', least(0, coalesce((select (value #>> '{}')::int from platform_config where key = 'dealer_doc_fee_cap_cents'), 0)), 15000, false, false, false,
          150000, null, null, false, false, false, 0,
          99900, 9500, 18, 0
     from businesses x where x.id = b;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Servicios","en":"Services"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Cambio de aceite sintético","en":"Synthetic oil change"}'::jsonb, '{"es":"Con filtro y revisión de 20 puntos.","en":"With filter and 20-point check."}'::jsonb, 4900, 60, '{}'::jsonb, 0, '{"https://images.pexels.com/photos/2244746/pexels-photo-2244746.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 0);
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Inspección de PA y emisiones","en":"PA inspection and emissions"}'::jsonb, '{"es":"Si algo falla, te damos el presupuesto antes.","en":"If anything fails, you get an estimate first."}'::jsonb, 5900, 60, '{}'::jsonb, 0, '{"https://images.pexels.com/photos/4489702/pexels-photo-4489702.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 1);
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Frenos delanteros","en":"Front brakes"}'::jsonb, '{"es":"Pastillas y discos, piezas y mano de obra.","en":"Pads and rotors, parts and labor."}'::jsonb, 28900, 60, '{}'::jsonb, 0, '{"https://images.pexels.com/photos/6870318/pexels-photo-6870318.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 2);
end $$;
do $$
declare b text := 'envios-carros-quisqueya'; s bigint; it bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-DEALER') or exists (select 1 from dealer_settings where business_id = b) then return; end if;
  insert into dealer_settings (business_id, city_id, kind_override, doc_fee_cents, tags_cents, fin, itin, no_credit, itin_down_cents, apr_bp, term_m, trade, home_test, reports_credit, warranty_default,
     bhph_down_cents, bhph_week_cents, bhph_months, lot_total)
   select b, x.city_id, 'envio', least(0, coalesce((select (value #>> '{}')::int from platform_config where key = 'dealer_doc_fee_cap_cents'), 0)), 15000, false, false, false,
          150000, null, null, false, false, false, 0,
          99900, 9500, 18, 0
     from businesses x where x.id = b;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Servicios","en":"Services"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Carro a Santo Domingo","en":"Car to Santo Domingo"}'::jsonb, '{"es":"Por barco desde Nueva Jersey, de 2 a 4 semanas. Impuestos de aduana en RD aparte.","en":"By ship from New Jersey, 2 to 4 weeks. DR customs duties extra."}'::jsonb, 165000, 60, '{}'::jsonb, 0, '{"https://images.pexels.com/photos/1117210/pexels-photo-1117210.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 0);
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"SUV o pickup a Santiago","en":"SUV or pickup to Santiago"}'::jsonb, '{"es":"Por Puerto Plata, de 3 a 4 semanas.","en":"Via Puerto Plata, 3 to 4 weeks."}'::jsonb, 195000, 60, '{}'::jsonb, 0, '{"https://images.pexels.com/photos/262353/pexels-photo-262353.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 1);
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Recogida en Hazleton","en":"Pickup in Hazleton"}'::jsonb, '{"es":"Lo llevamos al puerto en grúa.","en":"We tow it to the port."}'::jsonb, 15000, 60, '{}'::jsonb, 0, '{"https://images.pexels.com/photos/262353/pexels-photo-262353.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 2);
end $$;
do $$
declare b text := 'subasta-keystone'; s bigint; it bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-DEALER') or exists (select 1 from dealer_settings where business_id = b) then return; end if;
  insert into dealer_settings (business_id, city_id, kind_override, doc_fee_cents, tags_cents, fin, itin, no_credit, itin_down_cents, apr_bp, term_m, trade, home_test, reports_credit, warranty_default,
     bhph_down_cents, bhph_week_cents, bhph_months, lot_total)
   select b, x.city_id, 'mayor', least(0, coalesce((select (value #>> '{}')::int from platform_config where key = 'dealer_doc_fee_cap_cents'), 0)), 15000, false, false, false,
          150000, null, null, false, false, false, 0,
          99900, 9500, 18, 0
     from businesses x where x.id = b;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Subasta","en":"Auction"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Subasta pública · sábado","en":"Subasta pública · sábado"}'::jsonb, '{"es":"Abierta al público; tarifa del comprador $250.","en":"Abierta al público; tarifa del comprador $250."}'::jsonb, 25000, 60, '{}'::jsonb, 0, '{}'::text[], 0);
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Carros reconstruidos","en":"Carros reconstruidos"}'::jsonb, '{"es":"Con fotos del choque y la inspección de PA.","en":"Con fotos del choque y la inspección de PA."}'::jsonb, 390000, 60, '{}'::jsonb, 0, '{}'::text[], 1);
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Mayoristas","en":"Mayoristas"}'::jsonb, '{"es":"Solo dealers con licencia.","en":"Solo dealers con licencia."}'::jsonb, 0, 60, '{}'::jsonb, 0, '{}'::text[], 2);
end $$;
do $$
declare b text := 'remolques-traileres-pa'; s bigint; it bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-DEALER') or exists (select 1 from dealer_settings where business_id = b) then return; end if;
  insert into dealer_settings (business_id, city_id, kind_override, doc_fee_cents, tags_cents, fin, itin, no_credit, itin_down_cents, apr_bp, term_m, trade, home_test, reports_credit, warranty_default,
     bhph_down_cents, bhph_week_cents, bhph_months, lot_total)
   select b, x.city_id, null, least(0, coalesce((select (value #>> '{}')::int from platform_config where key = 'dealer_doc_fee_cap_cents'), 0)), 15000, false, false, false,
          150000, null, null, false, false, false, 0,
          99900, 9500, 18, 3
     from businesses x where x.id = b;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into items (business_id, module, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', '{"es":"2022 Remolque de carga 6 × 12","en":"2022 Remolque de carga 6 × 12"}'::jsonb, '{"es":"Cerrado, con rampa.","en":"Cerrado, con rampa."}'::jsonb, 490000, 30, 'auto', '{}'::jsonb, 0, '{}'::text[], 0) returning id into it;
  insert into vehicle_listings (item_id, business_id, city_id, vin, year, make, model, trim_level, body, miles, engine_hours, transmission, fuel, drivetrain, title, history_report, history_src, pa_inspection,
        warranty, warranty_months, warranty_miles, street_legal, cdl, price_cents, tax_bp, tax_cents, tags_cents, doc_fee_cents, otd_cents)
   select it, b, x.city_id, '5NHUAS211NATL0020', 2022, 'Remolque de carga', '6 × 12', null, 'remolque', null, null,
          null, null, null, 'limpio', false, null, false,
          'como_esta', null, null, true, false, 490000,
          t.bp, (490000::bigint * t.bp + 5000) / 10000, s2.tags_cents, s2.doc_fee_cents, 490000 + ((490000::bigint * t.bp + 5000) / 10000)::int + s2.tags_cents + s2.doc_fee_cents
     from businesses x join dealer_settings s2 on s2.business_id = x.id
          cross join lateral (select parts_bp as bp from tax_rules where city_id = x.city_id and category_id = 'NEG-DEALER' and effective_from <= now() order by effective_from desc, id desc limit 1) t
    where x.id = b;
  insert into items (business_id, module, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', '{"es":"2021 Remolque para carro","en":"2021 Remolque para carro"}'::jsonb, '{"es":"Con frenos eléctricos.","en":"Con frenos eléctricos."}'::jsonb, 380000, 30, 'auto', '{}'::jsonb, 0, '{}'::text[], 1) returning id into it;
  insert into vehicle_listings (item_id, business_id, city_id, vin, year, make, model, trim_level, body, miles, engine_hours, transmission, fuel, drivetrain, title, history_report, history_src, pa_inspection,
        warranty, warranty_months, warranty_miles, street_legal, cdl, price_cents, tax_bp, tax_cents, tags_cents, doc_fee_cents, otd_cents)
   select it, b, x.city_id, '4YMUC182XMATL0021', 2021, 'Remolque', 'para carro', null, 'remolque', null, null,
          null, null, null, 'limpio', false, null, false,
          'como_esta', null, null, true, false, 380000,
          t.bp, (380000::bigint * t.bp + 5000) / 10000, s2.tags_cents, s2.doc_fee_cents, 380000 + ((380000::bigint * t.bp + 5000) / 10000)::int + s2.tags_cents + s2.doc_fee_cents
     from businesses x join dealer_settings s2 on s2.business_id = x.id
          cross join lateral (select parts_bp as bp from tax_rules where city_id = x.city_id and category_id = 'NEG-DEALER' and effective_from <= now() order by effective_from desc, id desc limit 1) t
    where x.id = b;
  insert into items (business_id, module, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', '{"es":"2016 Tráiler 53 pies","en":"2016 Tráiler 53 pies"}'::jsonb, '{"es":"Para tractocamión; CDL para moverlo.","en":"Para tractocamión; CDL para moverlo."}'::jsonb, 1850000, 30, 'auto', '{}'::jsonb, 0, '{}'::text[], 2) returning id into it;
  insert into vehicle_listings (item_id, business_id, city_id, vin, year, make, model, trim_level, body, miles, engine_hours, transmission, fuel, drivetrain, title, history_report, history_src, pa_inspection,
        warranty, warranty_months, warranty_miles, street_legal, cdl, price_cents, tax_bp, tax_cents, tags_cents, doc_fee_cents, otd_cents)
   select it, b, x.city_id, '1JJV532D8GATL0022', 2016, 'Tráiler', '53 pies', null, 'trailer', null, null,
          null, null, null, 'limpio', false, null, false,
          'como_esta', null, null, true, true, 1850000,
          t.bp, (1850000::bigint * t.bp + 5000) / 10000, s2.tags_cents, s2.doc_fee_cents, 1850000 + ((1850000::bigint * t.bp + 5000) / 10000)::int + s2.tags_cents + s2.doc_fee_cents
     from businesses x join dealer_settings s2 on s2.business_id = x.id
          cross join lateral (select parts_bp as bp from tax_rules where city_id = x.city_id and category_id = 'NEG-DEALER' and effective_from <= now() order by effective_from desc, id desc limit 1) t
    where x.id = b;
end $$;
do $$
declare b text := 'lote-la-81'; s bigint; it bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-DEALER') or exists (select 1 from dealer_settings where business_id = b) then return; end if;
  insert into dealer_settings (business_id, city_id, kind_override, doc_fee_cents, tags_cents, fin, itin, no_credit, itin_down_cents, apr_bp, term_m, trade, home_test, reports_credit, warranty_default,
     bhph_down_cents, bhph_week_cents, bhph_months, lot_total)
   select b, x.city_id, null, least(0, coalesce((select (value #>> '{}')::int from platform_config where key = 'dealer_doc_fee_cap_cents'), 0)), 15000, false, false, false,
          150000, null, null, false, false, false, 0,
          99900, 9500, 18, 3
     from businesses x where x.id = b;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into items (business_id, module, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', '{"es":"2014 Honda Odyssey","en":"2014 Honda Odyssey"}'::jsonb, '{"es":"148,000 millas.","en":"148,000 millas."}'::jsonb, 790000, 30, 'auto', '{}'::jsonb, 0, '{}'::text[], 0) returning id into it;
  insert into vehicle_listings (item_id, business_id, city_id, vin, year, make, model, trim_level, body, miles, engine_hours, transmission, fuel, drivetrain, title, history_report, history_src, pa_inspection,
        warranty, warranty_months, warranty_miles, street_legal, cdl, price_cents, tax_bp, tax_cents, tags_cents, doc_fee_cents, otd_cents)
   select it, b, x.city_id, '5FNRL5H61EATL0023', 2014, 'Honda', 'Odyssey', null, 'van', 148000, null,
          'automatica', 'gasolina', null, 'limpio', false, null, false,
          'como_esta', null, null, true, false, 790000,
          t.bp, (790000::bigint * t.bp + 5000) / 10000, s2.tags_cents, s2.doc_fee_cents, 790000 + ((790000::bigint * t.bp + 5000) / 10000)::int + s2.tags_cents + s2.doc_fee_cents
     from businesses x join dealer_settings s2 on s2.business_id = x.id
          cross join lateral (select parts_bp as bp from tax_rules where city_id = x.city_id and category_id = 'NEG-DEALER' and effective_from <= now() order by effective_from desc, id desc limit 1) t
    where x.id = b;
  insert into items (business_id, module, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', '{"es":"2012 Toyota Sienna","en":"2012 Toyota Sienna"}'::jsonb, '{"es":"161,000 millas.","en":"161,000 millas."}'::jsonb, 650000, 30, 'auto', '{}'::jsonb, 0, '{}'::text[], 1) returning id into it;
  insert into vehicle_listings (item_id, business_id, city_id, vin, year, make, model, trim_level, body, miles, engine_hours, transmission, fuel, drivetrain, title, history_report, history_src, pa_inspection,
        warranty, warranty_months, warranty_miles, street_legal, cdl, price_cents, tax_bp, tax_cents, tags_cents, doc_fee_cents, otd_cents)
   select it, b, x.city_id, '5TDKK3DC7CATL0024', 2012, 'Toyota', 'Sienna', null, 'van', 161000, null,
          'automatica', 'gasolina', null, 'limpio', false, null, false,
          'como_esta', null, null, true, false, 650000,
          t.bp, (650000::bigint * t.bp + 5000) / 10000, s2.tags_cents, s2.doc_fee_cents, 650000 + ((650000::bigint * t.bp + 5000) / 10000)::int + s2.tags_cents + s2.doc_fee_cents
     from businesses x join dealer_settings s2 on s2.business_id = x.id
          cross join lateral (select parts_bp as bp from tax_rules where city_id = x.city_id and category_id = 'NEG-DEALER' and effective_from <= now() order by effective_from desc, id desc limit 1) t
    where x.id = b;
  insert into items (business_id, module, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', '{"es":"2015 Nissan Altima","en":"2015 Nissan Altima"}'::jsonb, '{"es":"119,000 millas.","en":"119,000 millas."}'::jsonb, 690000, 30, 'auto', '{}'::jsonb, 0, '{}'::text[], 2) returning id into it;
  insert into vehicle_listings (item_id, business_id, city_id, vin, year, make, model, trim_level, body, miles, engine_hours, transmission, fuel, drivetrain, title, history_report, history_src, pa_inspection,
        warranty, warranty_months, warranty_miles, street_legal, cdl, price_cents, tax_bp, tax_cents, tags_cents, doc_fee_cents, otd_cents)
   select it, b, x.city_id, '1N4AL3AP7FATL0025', 2015, 'Nissan', 'Altima', null, 'carro', 119000, null,
          'automatica', 'gasolina', null, 'limpio', false, null, false,
          'como_esta', null, null, true, false, 690000,
          t.bp, (690000::bigint * t.bp + 5000) / 10000, s2.tags_cents, s2.doc_fee_cents, 690000 + ((690000::bigint * t.bp + 5000) / 10000)::int + s2.tags_cents + s2.doc_fee_cents
     from businesses x join dealer_settings s2 on s2.business_id = x.id
          cross join lateral (select parts_bp as bp from tax_rules where city_id = x.city_id and category_id = 'NEG-DEALER' and effective_from <= now() order by effective_from desc, id desc limit 1) t
    where x.id = b;
end $$;
do $$
declare b text := 'carros-por-dueno-hzl'; s bigint; it bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-DEALER') or exists (select 1 from dealer_settings where business_id = b) then return; end if;
  insert into dealer_settings (business_id, city_id, kind_override, doc_fee_cents, tags_cents, fin, itin, no_credit, itin_down_cents, apr_bp, term_m, trade, home_test, reports_credit, warranty_default,
     bhph_down_cents, bhph_week_cents, bhph_months, lot_total)
   select b, x.city_id, 'broker', least(0, coalesce((select (value #>> '{}')::int from platform_config where key = 'dealer_doc_fee_cap_cents'), 0)), 15000, false, false, false,
          150000, null, null, false, false, false, 0,
          99900, 9500, 18, 0
     from businesses x where x.id = b;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Servicios","en":"Services"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Buscamos tu carro","en":"Buscamos tu carro"}'::jsonb, '{"es":"Tarifa fija por escrito.","en":"Tarifa fija por escrito."}'::jsonb, 35000, 60, '{}'::jsonb, 0, '{}'::text[], 0);
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Avalúo de tu carro","en":"Avalúo de tu carro"}'::jsonb, '{"es":"Cuánto vale para cambio o venta.","en":"Cuánto vale para cambio o venta."}'::jsonb, 0, 60, '{}'::jsonb, 0, '{}'::text[], 1);
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Cambio de título con el dueño","en":"Cambio de título con el dueño"}'::jsonb, '{"es":"Lo hacemos contigo para que sea seguro.","en":"Lo hacemos contigo para que sea seguro."}'::jsonb, 7500, 60, '{}'::jsonb, 0, '{}'::text[], 2);
end $$;
insert into users (phone, first_name, last_name, lang, home_city_id) select '+15705550444', 'Juan', 'Polanco', 'es', 'hzl' where exists (select 1 from businesses where id = 'autos-el-cibao' and is_demo) on conflict (phone) do nothing;
insert into business_members (business_id, user_id, kind, display_name, role, status, show_on_page, panel_access, since_year, sort, same_as_business_hours) select 'autos-el-cibao', u.id, 'owner', 'Juan Polanco', '{"es":"Dueño","en":"Owner"}'::jsonb, 'active', true, '{all}', 2014, 0, true from users u where u.phone = '+15705550444' and exists (select 1 from businesses where id = 'autos-el-cibao' and is_demo) and not exists (select 1 from business_members m where m.business_id = 'autos-el-cibao' and m.kind = 'owner' and m.status = 'active');
update dealer_settings s set derived_on = null from businesses x where x.id = s.business_id and x.is_demo;
insert into platform_config (key, value, note) values ('autos_totales', '{}'::jsonb, 'Recalculo por lotes de los totales en la puerta (cursor)') on conflict (key) do update set value = '{}'::jsonb, updated_at = now();
commit;
