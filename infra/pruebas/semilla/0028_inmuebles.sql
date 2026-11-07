-- Generado por scripts/semilla/extraer-inmueble.cjs desde el prototipo. SOLO SANDBOX. No editar a mano.
begin;
do $$
declare b text := 'rentas-hazleton-latino'; s bigint; it bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-INMUEBLE') or exists (select 1 from inm_settings where business_id = b) then return; end if;
  insert into inm_settings (business_id, city_id, kind_override, itin, s8, pets, min_down_pct, prequal_days, buyer_no_commission, free_from, util, furnished)
   select b, ci.id, null, true, false, true, 10, 2, false,
          null, true, false
     from businesses x join cities ci on ci.id = x.city_id where x.id = b;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into items (business_id, module, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', '{"es":"2 cuartos · 312 Alter St","en":"2 bed · 312 Alter St"}'::jsonb, '{"es":"$1,050 al mes. Para mudarte: $1,050 + depósito $1,050 = $2,100. Sin seguro social.","en":"$1,050 a month. To move in: $1,050 + $1,050 deposit = $2,100. No SSN."}'::jsonb, 105000, 30, 'renta', '{"visit_pattern":[{"dow":4,"min":1020,"on":true},{"dow":5,"min":1080,"on":true},{"dow":6,"min":660,"on":true}],"cupo":1}'::jsonb, 0, '{"https://images.pexels.com/photos/19239905/pexels-photo-19239905.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 0) returning id into it;
  insert into property_listings (item_id, business_id, city_id, kind, beds, baths, sqft, rent_cents, price_cents, deposit_cents, move_in_cents, est_payment_cents, est_down_pct, available_on, furnished, pets, utilities, parking, laundry, s8, ssn_required, papers, lease, senior_62, senior_status, addr_line, zip, geom, addr_public, status)
   select it, b, ci.id, 'apto', 2, 1, 850, 105000, null, 105000, 210000, null, null,
          (now() at time zone ci.timezone)::date, false, true, '{"agua","basura"}'::text[], false, 'edificio', false, false,
          '{"es":"2 recibos de pago o carta del trabajo y una ID de cualquier país.","en":"2 pay stubs or a work letter and an ID from any country."}'::jsonb, '{"es":"12 meses","en":"12 months"}'::jsonb, false, 'none', '312 Alter St', '18201',
          (select st_setsrid(st_point(u.lng, u.lat), 4326)::geography from dir_ubicar('312 Alter St', '18201') u limit 1), true, 'available'
     from businesses x join cities ci on ci.id = x.city_id where x.id = b;
  insert into items (business_id, module, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', '{"es":"3 cuartos · casa · 90 W Diamond Ave","en":"3 bed house · 90 W Diamond Ave"}'::jsonb, '{"es":"$1,400 al mes. Patio y parqueo. Aceptan mascotas ($25 al mes).","en":"$1,400 a month. Yard and parking. Pets OK ($25 a month)."}'::jsonb, 140000, 30, 'renta', '{"visit_pattern":[{"dow":4,"min":1020,"on":true},{"dow":5,"min":1080,"on":true},{"dow":6,"min":660,"on":true}],"cupo":1}'::jsonb, 0, '{"https://images.pexels.com/photos/8963083/pexels-photo-8963083.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 1) returning id into it;
  insert into property_listings (item_id, business_id, city_id, kind, beds, baths, sqft, rent_cents, price_cents, deposit_cents, move_in_cents, est_payment_cents, est_down_pct, available_on, furnished, pets, utilities, parking, laundry, s8, ssn_required, papers, lease, senior_62, senior_status, addr_line, zip, geom, addr_public, status)
   select it, b, ci.id, 'casa', 3, 1.5, 1300, 140000, null, 140000, 280000, null, null,
          (now() at time zone ci.timezone)::date, false, true, '{}'::text[], true, 'no', false, false,
          '{"es":"2 recibos de pago o carta del trabajo y una ID de cualquier país.","en":"2 pay stubs or a work letter and an ID from any country."}'::jsonb, '{"es":"12 meses","en":"12 months"}'::jsonb, false, 'none', '90 W Diamond Ave', '18201',
          (select st_setsrid(st_point(u.lng, u.lat), 4326)::geography from dir_ubicar('90 W Diamond Ave', '18201') u limit 1), true, 'available'
     from businesses x join cities ci on ci.id = x.city_id where x.id = b;
  insert into items (business_id, module, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', '{"es":"Estudio · 15 E Broad St","en":"Studio · 15 E Broad St"}'::jsonb, '{"es":"$750 al mes con calefacción. Para mudarte: $750 + depósito $750.","en":"$750 a month with heat. To move in: $750 + $750 deposit."}'::jsonb, 75000, 30, 'renta', '{"visit_pattern":[{"dow":6,"min":660,"on":true}],"cupo":1}'::jsonb, 0, '{"https://images.pexels.com/photos/31424880/pexels-photo-31424880.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 2) returning id into it;
  insert into property_listings (item_id, business_id, city_id, kind, beds, baths, sqft, rent_cents, price_cents, deposit_cents, move_in_cents, est_payment_cents, est_down_pct, available_on, furnished, pets, utilities, parking, laundry, s8, ssn_required, papers, lease, senior_62, senior_status, addr_line, zip, geom, addr_public, status)
   select it, b, ci.id, 'apto', 0, 1, 450, 75000, null, 75000, 150000, null, null,
          (now() at time zone ci.timezone)::date, false, false, '{"calefaccion"}'::text[], false, 'no', false, false,
          '{"es":"2 recibos de pago o carta del trabajo y una ID de cualquier país.","en":"2 pay stubs or a work letter and an ID from any country."}'::jsonb, '{"es":"6 o 12 meses","en":"6 or 12 months"}'::jsonb, false, 'none', '15 E Broad St', '18201',
          (select st_setsrid(st_point(u.lng, u.lat), 4326)::geography from dir_ubicar('15 E Broad St', '18201') u limit 1), true, 'available'
     from businesses x join cities ci on ci.id = x.city_id where x.id = b;
  insert into items (business_id, module, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', '{"es":"1 cuarto · Section 8 · Cedar St","en":"1 bed · Section 8 · Cedar St"}'::jsonb, '{"es":"$875 al mes; con el voucher pagas tu parte. Para mudarte: $875 + depósito $500.","en":"$875 a month; with the voucher you pay your share. To move in: $875 + $500 deposit."}'::jsonb, 87500, 30, 'renta', '{"visit_pattern":[{"dow":6,"min":660,"on":true}],"cupo":1}'::jsonb, 0, '{"https://images.pexels.com/photos/9308434/pexels-photo-9308434.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 3) returning id into it;
  insert into property_listings (item_id, business_id, city_id, kind, beds, baths, sqft, rent_cents, price_cents, deposit_cents, move_in_cents, est_payment_cents, est_down_pct, available_on, furnished, pets, utilities, parking, laundry, s8, ssn_required, papers, lease, senior_62, senior_status, addr_line, zip, geom, addr_public, status)
   select it, b, ci.id, 's8', 1, 1, null, 87500, null, 50000, 137500, null, null,
          (now() at time zone ci.timezone)::date, false, false, '{"calefaccion","agua"}'::text[], false, 'no', true, false,
          '{"es":"Tu voucher de Section 8 y una ID.","en":"Your Section 8 voucher and an ID."}'::jsonb, null, false, 'none', '41 S Cedar St', '18201',
          (select st_setsrid(st_point(u.lng, u.lat), 4326)::geography from dir_ubicar('41 S Cedar St', '18201') u limit 1), true, 'available'
     from businesses x join cities ci on ci.id = x.city_id where x.id = b;
  insert into items (business_id, module, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', '{"es":"Apartamento 1 cuarto · 118 W Oak St","en":"1 bed apartment · 118 W Oak St"}'::jsonb, '{"es":"$825 al mes. Para mudarte: $825 + depósito $825.","en":"$825 a month. To move in: $825 + $825 deposit."}'::jsonb, 82500, 30, 'renta', '{"visit_pattern":[{"dow":6,"min":660,"on":true}],"cupo":1}'::jsonb, 0, '{"https://images.pexels.com/photos/19239905/pexels-photo-19239905.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 4) returning id into it;
  insert into property_listings (item_id, business_id, city_id, kind, beds, baths, sqft, rent_cents, price_cents, deposit_cents, move_in_cents, est_payment_cents, est_down_pct, available_on, furnished, pets, utilities, parking, laundry, s8, ssn_required, papers, lease, senior_62, senior_status, addr_line, zip, geom, addr_public, status)
   select it, b, ci.id, 'apto', 1, 1, null, 82500, null, 82500, 165000, null, null,
          (now() at time zone ci.timezone)::date, false, false, '{}'::text[], false, 'no', false, false,
          '{"es":"2 recibos de pago o carta del trabajo y una ID de cualquier país.","en":"2 pay stubs or a work letter and an ID from any country."}'::jsonb, null, false, 'none', '118 W Oak St', '18201',
          (select st_setsrid(st_point(u.lng, u.lat), 4326)::geography from dir_ubicar('118 W Oak St', '18201') u limit 1), true, 'rented'
     from businesses x join cities ci on ci.id = x.city_id where x.id = b;
end $$;
do $$
declare b text := 'realty-bilingue-hzl'; s bigint; it bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-INMUEBLE') or exists (select 1 from inm_settings where business_id = b) then return; end if;
  insert into inm_settings (business_id, city_id, kind_override, itin, s8, pets, min_down_pct, prequal_days, buyer_no_commission, free_from, util, furnished)
   select b, ci.id, null, true, false, false, 10, 2, true,
          null, false, false
     from businesses x join cities ci on ci.id = x.city_id where x.id = b;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into items (business_id, module, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', '{"es":"Casa 3 cuartos · 44 N Pine St","en":"3 bed home · 44 N Pine St"}'::jsonb, '{"es":"$159,000. Cuota estimada con 10 % de enganche: $1,280 al mes con impuestos.","en":"$159,000. Estimated payment with 10% down: $1,280 a month with taxes."}'::jsonb, 15900000, 30, 'venta', '{"visit_pattern":[{"dow":4,"min":1020,"on":true},{"dow":5,"min":1080,"on":true},{"dow":6,"min":660,"on":true}],"cupo":1}'::jsonb, 0, '{"https://images.pexels.com/photos/8469940/pexels-photo-8469940.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 0) returning id into it;
  insert into property_listings (item_id, business_id, city_id, kind, beds, baths, sqft, rent_cents, price_cents, deposit_cents, move_in_cents, est_payment_cents, est_down_pct, available_on, furnished, pets, utilities, parking, laundry, s8, ssn_required, papers, lease, senior_62, senior_status, addr_line, zip, geom, addr_public, status)
   select it, b, ci.id, 'venta_casa', 3, 1.5, 1400, null, 15900000, 0, null, 125900, 10,
          null, false, false, '{}'::text[], false, 'no', false, false,
          null, null, false, 'none', '44 N Pine St', '18201',
          (select st_setsrid(st_point(u.lng, u.lat), 4326)::geography from dir_ubicar('44 N Pine St', '18201') u limit 1), true, 'available'
     from businesses x join cities ci on ci.id = x.city_id where x.id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"En venta","en":"For sale"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Consulta para primer comprador","en":"First-time buyer consultation"}'::jsonb, '{"es":"Gratis. Te explicamos programas con ITIN y ayuda con el enganche.","en":"Free. We explain ITIN programs and down payment help."}'::jsonb, 0, 60, '{}'::jsonb, 0, '{"https://images.pexels.com/photos/7642122/pexels-photo-7642122.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 1);
end $$;
do $$
declare b text := 'hipotecas-itin-pa'; s bigint; it bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-INMUEBLE') or exists (select 1 from inm_settings where business_id = b) then return; end if;
  insert into inm_settings (business_id, city_id, kind_override, itin, s8, pets, min_down_pct, prequal_days, buyer_no_commission, free_from, util, furnished)
   select b, ci.id, null, true, false, false, 10, 2, false,
          null, false, false
     from businesses x join cities ci on ci.id = x.city_id where x.id = b;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Hipotecas","en":"Mortgages"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Precalificación con ITIN","en":"ITIN pre-qualification"}'::jsonb, '{"es":"Gratis. Te decimos cuánto te prestan y la cuota real antes de buscar casa.","en":"Free. We tell you how much you can borrow and the real payment before you shop."}'::jsonb, 0, 60, '{"no":[{"es":"Nadie puede garantizarte la aprobación antes de revisar tus papeles.","en":"No one can guarantee approval before reviewing your papers."}]}'::jsonb, 0, '{"https://images.pexels.com/photos/8292879/pexels-photo-8292879.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 0);
end $$;
do $$
declare b text := 'cuartos-dona-mary'; s bigint; it bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-INMUEBLE') or exists (select 1 from inm_settings where business_id = b) then return; end if;
  insert into inm_settings (business_id, city_id, kind_override, itin, s8, pets, min_down_pct, prequal_days, buyer_no_commission, free_from, util, furnished)
   select b, ci.id, null, true, false, false, 10, 2, false,
          (date_trunc('month', (now() at time zone ci.timezone)) + interval '1 month')::date, true, true
     from businesses x join cities ci on ci.id = x.city_id where x.id = b;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into items (business_id, module, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', '{"es":"Cuarto amueblado","en":"Furnished room"}'::jsonb, '{"es":"$550 al mes con luz, agua e internet. Baño compartido. Para mudarte: $550 + depósito $300.","en":"$550 a month with power, water and internet. Shared bath. To move in: $550 + $300 deposit."}'::jsonb, 55000, 30, 'renta', '{"visit_pattern":[{"dow":4,"min":1020,"on":true},{"dow":5,"min":1080,"on":true},{"dow":6,"min":660,"on":true}],"cupo":1}'::jsonb, 0, '{"https://images.pexels.com/photos/37369025/pexels-photo-37369025.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 0) returning id into it;
  insert into property_listings (item_id, business_id, city_id, kind, beds, baths, sqft, rent_cents, price_cents, deposit_cents, move_in_cents, est_payment_cents, est_down_pct, available_on, furnished, pets, utilities, parking, laundry, s8, ssn_required, papers, lease, senior_62, senior_status, addr_line, zip, geom, addr_public, status)
   select it, b, ci.id, 'cuarto', 1, 1, null, 55000, null, 30000, 85000, null, null,
          (now() at time zone ci.timezone)::date, true, false, '{"luz","agua","internet"}'::text[], false, 'unidad', false, false,
          '{"es":"Una ID de cualquier país.","en":"An ID from any country."}'::jsonb, '{"es":"Mes a mes","en":"Month to month"}'::jsonb, false, 'none', '857 N Laurel St', '18201',
          (select st_setsrid(st_point(u.lng, u.lat), 4326)::geography from dir_ubicar('857 N Laurel St', '18201') u limit 1), false, 'available'
     from businesses x join cities ci on ci.id = x.city_id where x.id = b;
  insert into items (business_id, module, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', '{"es":"Cuarto con baño propio","en":"Room with private bath"}'::jsonb, '{"es":"$600 al mes con luz, agua e internet. Para mudarte: $600 + depósito $300.","en":"$600 a month with power, water and internet. To move in: $600 + $300 deposit."}'::jsonb, 60000, 30, 'renta', '{"visit_pattern":[{"dow":6,"min":660,"on":true}],"cupo":1}'::jsonb, 0, '{"https://images.pexels.com/photos/34574611/pexels-photo-34574611.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 1) returning id into it;
  insert into property_listings (item_id, business_id, city_id, kind, beds, baths, sqft, rent_cents, price_cents, deposit_cents, move_in_cents, est_payment_cents, est_down_pct, available_on, furnished, pets, utilities, parking, laundry, s8, ssn_required, papers, lease, senior_62, senior_status, addr_line, zip, geom, addr_public, status)
   select it, b, ci.id, 'cuarto', 1, 1, null, 60000, null, 30000, 90000, null, null,
          (now() at time zone ci.timezone)::date, true, false, '{"luz","agua","internet"}'::text[], false, 'unidad', false, false,
          '{"es":"Una ID de cualquier país.","en":"An ID from any country."}'::jsonb, '{"es":"Mes a mes","en":"Month to month"}'::jsonb, false, 'none', '857 N Laurel St', '18201',
          (select st_setsrid(st_point(u.lng, u.lat), 4326)::geography from dir_ubicar('857 N Laurel St', '18201') u limit 1), false, 'available'
     from businesses x join cities ci on ci.id = x.city_id where x.id = b;
end $$;
do $$
declare b text := 'derechos-inquilino-hzl'; s bigint; it bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-INMUEBLE') or exists (select 1 from inm_settings where business_id = b) then return; end if;
  insert into inm_settings (business_id, city_id, kind_override, itin, s8, pets, min_down_pct, prequal_days, buyer_no_commission, free_from, util, furnished)
   select b, ci.id, null, false, false, false, 10, 2, false,
          null, false, false
     from businesses x join cities ci on ci.id = x.city_id where x.id = b;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Ayuda","en":"Help"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Orientación sobre desalojo","en":"Orientación sobre desalojo"}'::jsonb, '{"es":"Gratis, con cita o sin cita.","en":"Gratis, con cita o sin cita."}'::jsonb, 0, 60, '{}'::jsonb, 0, '{}'::text[], 0);
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Recuperar tu depósito","en":"Recuperar tu depósito"}'::jsonb, '{"es":"Te ayudamos con la carta al dueño.","en":"Te ayudamos con la carta al dueño."}'::jsonb, 0, 60, '{}'::jsonb, 0, '{}'::text[], 1);
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Reparaciones que el dueño no hace","en":"Reparaciones que el dueño no hace"}'::jsonb, '{"es":"Cómo reportarlo a la ciudad.","en":"Cómo reportarlo a la ciudad."}'::jsonb, 0, 60, '{}'::jsonb, 0, '{}'::text[], 2);
end $$;
do $$
declare b text := 'locales-centro'; s bigint; it bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-INMUEBLE') or exists (select 1 from inm_settings where business_id = b) then return; end if;
  insert into inm_settings (business_id, city_id, kind_override, itin, s8, pets, min_down_pct, prequal_days, buyer_no_commission, free_from, util, furnished)
   select b, ci.id, null, false, false, false, 10, 2, false,
          null, false, false
     from businesses x join cities ci on ci.id = x.city_id where x.id = b;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into items (business_id, module, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', '{"es":"Local 800 pies² · Wyoming St","en":"Local 800 pies² · Wyoming St"}'::jsonb, '{"es":"Con vitrina a la calle.","en":"Con vitrina a la calle."}'::jsonb, 120000, 30, 'renta', '{"visit_pattern":[{"dow":6,"min":660,"on":true}],"cupo":1}'::jsonb, 0, '{}'::text[], 0) returning id into it;
  insert into property_listings (item_id, business_id, city_id, kind, beds, baths, sqft, rent_cents, price_cents, deposit_cents, move_in_cents, est_payment_cents, est_down_pct, available_on, furnished, pets, utilities, parking, laundry, s8, ssn_required, papers, lease, senior_62, senior_status, addr_line, zip, geom, addr_public, status)
   select it, b, ci.id, 'local', null, null, 800, 120000, null, 0, 120000, null, null,
          (now() at time zone ci.timezone)::date, false, false, '{}'::text[], false, 'no', false, false,
          null, null, false, 'none', '320 N Wyoming St', '18201',
          (select st_setsrid(st_point(u.lng, u.lat), 4326)::geography from dir_ubicar('320 N Wyoming St', '18201') u limit 1), true, 'available'
     from businesses x join cities ci on ci.id = x.city_id where x.id = b;
  insert into items (business_id, module, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', '{"es":"Oficina 300 pies²","en":"Oficina 300 pies²"}'::jsonb, '{"es":"Con baño y estacionamiento.","en":"Con baño y estacionamiento."}'::jsonb, 65000, 30, 'renta', '{"visit_pattern":[{"dow":6,"min":660,"on":true}],"cupo":1}'::jsonb, 0, '{}'::text[], 1) returning id into it;
  insert into property_listings (item_id, business_id, city_id, kind, beds, baths, sqft, rent_cents, price_cents, deposit_cents, move_in_cents, est_payment_cents, est_down_pct, available_on, furnished, pets, utilities, parking, laundry, s8, ssn_required, papers, lease, senior_62, senior_status, addr_line, zip, geom, addr_public, status)
   select it, b, ci.id, 'oficina', null, null, 300, 65000, null, 0, 65000, null, null,
          (now() at time zone ci.timezone)::date, false, false, '{}'::text[], false, 'no', false, false,
          null, null, false, 'none', '772 N Wyoming St', '18201',
          (select st_setsrid(st_point(u.lng, u.lat), 4326)::geography from dir_ubicar('772 N Wyoming St', '18201') u limit 1), true, 'available'
     from businesses x join cities ci on ci.id = x.city_id where x.id = b;
end $$;
do $$
declare b text := 'casa-propia-agentes'; s bigint; it bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-INMUEBLE') or exists (select 1 from inm_settings where business_id = b) then return; end if;
  insert into inm_settings (business_id, city_id, kind_override, itin, s8, pets, min_down_pct, prequal_days, buyer_no_commission, free_from, util, furnished)
   select b, ci.id, null, true, false, false, 10, 2, true,
          null, false, false
     from businesses x join cities ci on ci.id = x.city_id where x.id = b;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into items (business_id, module, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', '{"es":"Townhouse 2 cuartos · Laurel Mall","en":"2 bed townhouse · Laurel Mall"}'::jsonb, '{"es":"$129,000. Cuota estimada con 3.5 % de enganche: $1,090 al mes con impuestos.","en":"$129,000. Estimated payment with 3.5% down: $1,090 a month with taxes."}'::jsonb, 12900000, 30, 'venta', '{"visit_pattern":[{"dow":4,"min":1020,"on":true},{"dow":5,"min":1080,"on":true},{"dow":6,"min":660,"on":true}],"cupo":1}'::jsonb, 0, '{"https://images.pexels.com/photos/33258708/pexels-photo-33258708.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 0) returning id into it;
  insert into property_listings (item_id, business_id, city_id, kind, beds, baths, sqft, rent_cents, price_cents, deposit_cents, move_in_cents, est_payment_cents, est_down_pct, available_on, furnished, pets, utilities, parking, laundry, s8, ssn_required, papers, lease, senior_62, senior_status, addr_line, zip, geom, addr_public, status)
   select it, b, ci.id, 'condo', 2, 1.5, null, null, 12900000, 0, null, 107600, 3.5,
          null, false, false, '{}'::text[], false, 'no', false, false,
          null, null, false, 'none', '16 Laurel Mall Dr', '18201',
          (select st_setsrid(st_point(u.lng, u.lat), 4326)::geography from dir_ubicar('16 Laurel Mall Dr', '18201') u limit 1), true, 'available'
     from businesses x join cities ci on ci.id = x.city_id where x.id = b;
  insert into items (business_id, module, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', '{"es":"Casa 4 cuartos · 210 E Oak St","en":"4 bed home · 210 E Oak St"}'::jsonb, '{"es":"$189,000. Cuota estimada con 10 % de enganche: $1,520 al mes con impuestos.","en":"$189,000. Estimated payment with 10% down: $1,520 a month with taxes."}'::jsonb, 18900000, 30, 'venta', '{"visit_pattern":[{"dow":4,"min":1020,"on":true},{"dow":5,"min":1080,"on":true},{"dow":6,"min":660,"on":true}],"cupo":1}'::jsonb, 0, '{"https://images.pexels.com/photos/7937330/pexels-photo-7937330.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 1) returning id into it;
  insert into property_listings (item_id, business_id, city_id, kind, beds, baths, sqft, rent_cents, price_cents, deposit_cents, move_in_cents, est_payment_cents, est_down_pct, available_on, furnished, pets, utilities, parking, laundry, s8, ssn_required, papers, lease, senior_62, senior_status, addr_line, zip, geom, addr_public, status)
   select it, b, ci.id, 'venta_casa', 4, 2, null, null, 18900000, 0, null, 149700, 10,
          null, false, false, '{}'::text[], false, 'no', false, false,
          null, null, false, 'none', '210 E Oak St', '18201',
          (select st_setsrid(st_point(u.lng, u.lat), 4326)::geography from dir_ubicar('210 E Oak St', '18201') u limit 1), true, 'available'
     from businesses x join cities ci on ci.id = x.city_id where x.id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"En venta","en":"For sale"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Vende tu casa · análisis de precio","en":"Sell your home · price analysis"}'::jsonb, '{"es":"Gratis. Te decimos en cuánto se vende y cuánto te queda después de la comisión.","en":"Free. We tell you what it sells for and what you keep after commission."}'::jsonb, 0, 60, '{}'::jsonb, 0, '{"https://images.pexels.com/photos/36729941/pexels-photo-36729941.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 2);
end $$;
do $$
declare b text := 'valle-nuevo-obra-nueva'; s bigint; it bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-INMUEBLE') or exists (select 1 from inm_settings where business_id = b) then return; end if;
  insert into inm_settings (business_id, city_id, kind_override, itin, s8, pets, min_down_pct, prequal_days, buyer_no_commission, free_from, util, furnished)
   select b, ci.id, null, false, false, false, 10, 2, false,
          null, false, false
     from businesses x join cities ci on ci.id = x.city_id where x.id = b;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into items (business_id, module, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', '{"es":"Casa nueva 3 cuartos · Drums","en":"New 3 bed home · Drums"}'::jsonb, '{"es":"$289,000. Lista en marzo; escoges pisos y gabinetes. Cuota estimada con 10 %: $2,290 al mes.","en":"$289,000. Ready in March; you pick floors and cabinets. Estimated payment with 10%: $2,290 a month."}'::jsonb, 28900000, 30, 'venta', '{"visit_pattern":[{"dow":4,"min":1020,"on":true},{"dow":5,"min":1080,"on":true},{"dow":6,"min":660,"on":true}],"cupo":1}'::jsonb, 0, '{"https://images.pexels.com/photos/27938317/pexels-photo-27938317.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 0) returning id into it;
  insert into property_listings (item_id, business_id, city_id, kind, beds, baths, sqft, rent_cents, price_cents, deposit_cents, move_in_cents, est_payment_cents, est_down_pct, available_on, furnished, pets, utilities, parking, laundry, s8, ssn_required, papers, lease, senior_62, senior_status, addr_line, zip, geom, addr_public, status)
   select it, b, ci.id, 'obra', 3, 2, null, null, 28900000, 0, null, 228900, 10,
          null, false, false, '{}'::text[], false, 'no', false, false,
          null, null, false, 'none', '10 Valle Nuevo Dr', '18222',
          (select st_setsrid(st_point(u.lng, u.lat), 4326)::geography from dir_ubicar('10 Valle Nuevo Dr', '18222') u limit 1), true, 'available'
     from businesses x join cities ci on ci.id = x.city_id where x.id = b;
  insert into items (business_id, module, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', '{"es":"Terreno 1 acre · Sugarloaf","en":"1 acre lot · Sugarloaf"}'::jsonb, '{"es":"$45,000. Con permiso para construir; agua de pozo.","en":"$45,000. Buildable; well water."}'::jsonb, 4500000, 30, 'venta', '{"visit_pattern":[{"dow":4,"min":1020,"on":true},{"dow":5,"min":1080,"on":true},{"dow":6,"min":660,"on":true}],"cupo":1}'::jsonb, 0, '{"https://images.pexels.com/photos/8148346/pexels-photo-8148346.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 1) returning id into it;
  insert into property_listings (item_id, business_id, city_id, kind, beds, baths, sqft, rent_cents, price_cents, deposit_cents, move_in_cents, est_payment_cents, est_down_pct, available_on, furnished, pets, utilities, parking, laundry, s8, ssn_required, papers, lease, senior_62, senior_status, addr_line, zip, geom, addr_public, status)
   select it, b, ci.id, 'terreno', null, null, null, null, 4500000, 0, null, null, null,
          null, false, false, '{}'::text[], false, 'no', false, false,
          null, null, false, 'none', '250 Tomhicken Rd', '18249',
          (select st_setsrid(st_point(u.lng, u.lat), 4326)::geography from dir_ubicar('250 Tomhicken Rd', '18249') u limit 1), true, 'available'
     from businesses x join cities ci on ci.id = x.city_id where x.id = b;
  insert into items (business_id, module, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', '{"es":"Finca 12 acres · Conyngham","en":"12 acre farm · Conyngham"}'::jsonb, '{"es":"$210,000. Casa de 1950 y granero.","en":"$210,000. 1950 house and barn."}'::jsonb, 21000000, 30, 'venta', '{"visit_pattern":[{"dow":4,"min":1020,"on":true},{"dow":5,"min":1080,"on":true},{"dow":6,"min":660,"on":true}],"cupo":1}'::jsonb, 0, '{"https://images.pexels.com/photos/8583638/pexels-photo-8583638.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 2) returning id into it;
  insert into property_listings (item_id, business_id, city_id, kind, beds, baths, sqft, rent_cents, price_cents, deposit_cents, move_in_cents, est_payment_cents, est_down_pct, available_on, furnished, pets, utilities, parking, laundry, s8, ssn_required, papers, lease, senior_62, senior_status, addr_line, zip, geom, addr_public, status)
   select it, b, ci.id, 'rural', 3, 1, null, null, 21000000, 0, null, 166300, 10,
          null, false, false, '{}'::text[], false, 'no', false, false,
          null, null, false, 'none', '400 Main St', '18219',
          (select st_setsrid(st_point(u.lng, u.lat), 4326)::geography from dir_ubicar('400 Main St', '18219') u limit 1), true, 'available'
     from businesses x join cities ci on ci.id = x.city_id where x.id = b;
end $$;
do $$
declare b text := 'mountain-view-casas-moviles'; s bigint; it bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-INMUEBLE') or exists (select 1 from inm_settings where business_id = b) then return; end if;
  insert into inm_settings (business_id, city_id, kind_override, itin, s8, pets, min_down_pct, prequal_days, buyer_no_commission, free_from, util, furnished)
   select b, ci.id, null, false, false, true, 10, 2, false,
          null, false, false
     from businesses x join cities ci on ci.id = x.city_id where x.id = b;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into items (business_id, module, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', '{"es":"Casa móvil 3 cuartos · 2018","en":"3 bed mobile home · 2018"}'::jsonb, '{"es":"$58,000. El lote es aparte: $450 al mes con agua y basura.","en":"$58,000. Lot is extra: $450 a month with water and trash."}'::jsonb, 5800000, 30, 'venta', '{"visit_pattern":[{"dow":4,"min":1020,"on":true},{"dow":5,"min":1080,"on":true},{"dow":6,"min":660,"on":true}],"cupo":1}'::jsonb, 0, '{"https://images.pexels.com/photos/7937280/pexels-photo-7937280.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 0) returning id into it;
  insert into property_listings (item_id, business_id, city_id, kind, beds, baths, sqft, rent_cents, price_cents, deposit_cents, move_in_cents, est_payment_cents, est_down_pct, available_on, furnished, pets, utilities, parking, laundry, s8, ssn_required, papers, lease, senior_62, senior_status, addr_line, zip, geom, addr_public, status)
   select it, b, ci.id, 'movil', 3, 2, null, null, 5800000, 0, null, 45900, 10,
          null, false, false, '{}'::text[], false, 'no', false, false,
          null, null, false, 'none', '14 Mountain View Dr', '18202',
          (select st_setsrid(st_point(u.lng, u.lat), 4326)::geography from dir_ubicar('14 Mountain View Dr', '18202') u limit 1), true, 'available'
     from businesses x join cities ci on ci.id = x.city_id where x.id = b;
  insert into items (business_id, module, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', '{"es":"Lote en el parque","en":"Lot in the park"}'::jsonb, '{"es":"$450 al mes con agua y basura. Para mudarte: $450 + depósito $450. Mascotas pequeñas, sí.","en":"$450 a month with water and trash. To move in: $450 + $450 deposit. Small pets OK."}'::jsonb, 45000, 30, 'renta', '{"visit_pattern":[{"dow":4,"min":1020,"on":true},{"dow":5,"min":1080,"on":true},{"dow":6,"min":660,"on":true}],"cupo":1}'::jsonb, 0, '{"https://images.pexels.com/photos/7489107/pexels-photo-7489107.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 1) returning id into it;
  insert into property_listings (item_id, business_id, city_id, kind, beds, baths, sqft, rent_cents, price_cents, deposit_cents, move_in_cents, est_payment_cents, est_down_pct, available_on, furnished, pets, utilities, parking, laundry, s8, ssn_required, papers, lease, senior_62, senior_status, addr_line, zip, geom, addr_public, status)
   select it, b, ci.id, 'lote_movil', null, null, null, 45000, null, 45000, 90000, null, null,
          (now() at time zone ci.timezone)::date, false, true, '{"agua","basura"}'::text[], false, 'no', false, false,
          '{"es":"Una ID de cualquier país.","en":"An ID from any country."}'::jsonb, null, false, 'none', '22 Mountain View Dr', '18202',
          (select st_setsrid(st_point(u.lng, u.lat), 4326)::geography from dir_ubicar('22 Mountain View Dr', '18202') u limit 1), true, 'available'
     from businesses x join cities ci on ci.id = x.city_id where x.id = b;
end $$;
do $$
declare b text := 'keystone-inspeccion-cierre'; s bigint; it bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-INMUEBLE') or exists (select 1 from inm_settings where business_id = b) then return; end if;
  insert into inm_settings (business_id, city_id, kind_override, itin, s8, pets, min_down_pct, prequal_days, buyer_no_commission, free_from, util, furnished)
   select b, ci.id, null, false, false, false, 10, 2, false,
          null, false, false
     from businesses x join cities ci on ci.id = x.city_id where x.id = b;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Servicios","en":"Services"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Inspección de casa","en":"Home inspection"}'::jsonb, '{"es":"Hasta 2,000 pies². Reporte con fotos en 24 horas, en español o inglés.","en":"Up to 2,000 sq ft. Photo report in 24 hours, in Spanish or English."}'::jsonb, 42500, 60, '{}'::jsonb, 0, '{"https://images.pexels.com/photos/8292785/pexels-photo-8292785.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 0);
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Avalúo","en":"Appraisal"}'::jsonb, '{"es":"Para compra, refinanciamiento o herencia.","en":"For purchase, refinance or inheritance."}'::jsonb, 50000, 60, '{}'::jsonb, 0, '{"https://images.pexels.com/photos/8293640/pexels-photo-8293640.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 1);
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Título y cierre","en":"Title and closing"}'::jsonb, '{"es":"Te damos los costos de cierre por escrito antes de firmar.","en":"We give you the closing costs in writing before signing."}'::jsonb, 0, 60, '{}'::jsonb, 0, '{"https://images.pexels.com/photos/8293742/pexels-photo-8293742.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 2);
end $$;
do $$
declare b text := 'vivienda-accesible-hazleton'; s bigint; it bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-INMUEBLE') or exists (select 1 from inm_settings where business_id = b) then return; end if;
  insert into inm_settings (business_id, city_id, kind_override, itin, s8, pets, min_down_pct, prequal_days, buyer_no_commission, free_from, util, furnished)
   select b, ci.id, null, false, true, false, 10, 2, false,
          null, true, false
     from businesses x join cities ci on ci.id = x.city_id where x.id = b;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into items (business_id, module, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', '{"es":"1 cuarto · Section 8","en":"1 bed · Section 8"}'::jsonb, '{"es":"$875 al mes. Con el voucher pagas tu parte según tus ingresos. Para mudarte: $875 + depósito $500.","en":"$875 a month. With the voucher you pay your share based on income. To move in: $875 + $500 deposit."}'::jsonb, 87500, 30, 'renta', '{"visit_pattern":[{"dow":4,"min":1020,"on":true},{"dow":5,"min":1080,"on":true},{"dow":6,"min":660,"on":true}],"cupo":1}'::jsonb, 0, '{"https://images.pexels.com/photos/562199/pexels-photo-562199.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 0) returning id into it;
  insert into property_listings (item_id, business_id, city_id, kind, beds, baths, sqft, rent_cents, price_cents, deposit_cents, move_in_cents, est_payment_cents, est_down_pct, available_on, furnished, pets, utilities, parking, laundry, s8, ssn_required, papers, lease, senior_62, senior_status, addr_line, zip, geom, addr_public, status)
   select it, b, ci.id, 's8', 1, 1, null, 87500, null, 50000, 137500, null, null,
          (now() at time zone ci.timezone)::date, false, false, '{"calefaccion","agua"}'::text[], false, 'no', true, true,
          '{"es":"Tu voucher de Section 8 y una ID.","en":"Your Section 8 voucher and an ID."}'::jsonb, '{"es":"12 meses","en":"12 months"}'::jsonb, false, 'none', '250 E Diamond Ave', '18201',
          (select st_setsrid(st_point(u.lng, u.lat), 4326)::geography from dir_ubicar('250 E Diamond Ave', '18201') u limit 1), true, 'available'
     from businesses x join cities ci on ci.id = x.city_id where x.id = b;
  insert into items (business_id, module, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', '{"es":"1 cuarto · mayores de 62","en":"1 bed · 62 and over"}'::jsonb, '{"es":"$780 al mes con utilidades. Elevador y barandas. Para mudarte: $780 + depósito $400.","en":"$780 a month with utilities. Elevator and grab bars. To move in: $780 + $400 deposit."}'::jsonb, 78000, 30, 'renta', '{"visit_pattern":[{"dow":4,"min":1020,"on":true},{"dow":5,"min":1080,"on":true},{"dow":6,"min":660,"on":true}],"cupo":1}'::jsonb, 0, '{"https://images.pexels.com/photos/7642040/pexels-photo-7642040.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 1) returning id into it;
  insert into property_listings (item_id, business_id, city_id, kind, beds, baths, sqft, rent_cents, price_cents, deposit_cents, move_in_cents, est_payment_cents, est_down_pct, available_on, furnished, pets, utilities, parking, laundry, s8, ssn_required, papers, lease, senior_62, senior_status, addr_line, zip, geom, addr_public, status)
   select it, b, ci.id, 'mayores', 1, 1, null, 78000, null, 40000, 118000, null, null,
          (now() at time zone ci.timezone)::date, false, false, '{"luz","agua","gas","calefaccion"}'::text[], false, 'no', false, true,
          '{"es":"Una ID con tu fecha de nacimiento: es vivienda para mayores de 62.","en":"An ID showing you are 62 or over: it is senior housing."}'::jsonb, '{"es":"12 meses","en":"12 months"}'::jsonb, true, 'review', '250 E Diamond Ave', '18201',
          (select st_setsrid(st_point(u.lng, u.lat), 4326)::geography from dir_ubicar('250 E Diamond Ave', '18201') u limit 1), true, 'available'
     from businesses x join cities ci on ci.id = x.city_id where x.id = b;
end $$;
do $$
declare b text := 'amueblados-hazleton'; s bigint; it bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-INMUEBLE') or exists (select 1 from inm_settings where business_id = b) then return; end if;
  insert into inm_settings (business_id, city_id, kind_override, itin, s8, pets, min_down_pct, prequal_days, buyer_no_commission, free_from, util, furnished)
   select b, ci.id, null, true, false, false, 10, 2, false,
          null, true, true
     from businesses x join cities ci on ci.id = x.city_id where x.id = b;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into items (business_id, module, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', '{"es":"Amueblado 1 cuarto · por mes","en":"Furnished 1 bed · monthly"}'::jsonb, '{"es":"$1,250 al mes con todo. Mínimo 1 mes. Para mudarte: $1,250 + depósito $500. Sin seguro social.","en":"$1,250 a month all in. 1-month minimum. To move in: $1,250 + $500 deposit. No SSN."}'::jsonb, 125000, 30, 'renta', '{"visit_pattern":[{"dow":4,"min":1020,"on":true},{"dow":5,"min":1080,"on":true},{"dow":6,"min":660,"on":true}],"cupo":1}'::jsonb, 0, '{"https://images.pexels.com/photos/7045354/pexels-photo-7045354.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 0) returning id into it;
  insert into property_listings (item_id, business_id, city_id, kind, beds, baths, sqft, rent_cents, price_cents, deposit_cents, move_in_cents, est_payment_cents, est_down_pct, available_on, furnished, pets, utilities, parking, laundry, s8, ssn_required, papers, lease, senior_62, senior_status, addr_line, zip, geom, addr_public, status)
   select it, b, ci.id, 'amueblado', 1, 1, null, 125000, null, 50000, 175000, null, null,
          (now() at time zone ci.timezone)::date, true, false, '{"luz","agua","internet","calefaccion"}'::text[], false, 'unidad', false, false,
          '{"es":"2 recibos de pago o carta del trabajo y una ID de cualquier país.","en":"2 pay stubs or a work letter and an ID from any country."}'::jsonb, '{"es":"Desde 1 mes","en":"From 1 month"}'::jsonb, false, 'none', '18 S Vine St', '18201',
          (select st_setsrid(st_point(u.lng, u.lat), 4326)::geography from dir_ubicar('18 S Vine St', '18201') u limit 1), true, 'available'
     from businesses x join cities ci on ci.id = x.city_id where x.id = b;
  insert into items (business_id, module, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', '{"es":"Casa 3 cuartos · opción a compra","en":"3 bed home · rent to own"}'::jsonb, '{"es":"$1,350 al mes; $200 de cada mes va al enganche. Precio de compra $149,000 por escrito. Para mudarte: $1,350 + depósito $1,350.","en":"$1,350 a month; $200 of each month goes to the down payment. Purchase price $149,000 in writing. To move in: $1,350 + $1,350 deposit."}'::jsonb, 135000, 30, 'renta', '{"visit_pattern":[{"dow":4,"min":1020,"on":true},{"dow":5,"min":1080,"on":true},{"dow":6,"min":660,"on":true}],"cupo":1}'::jsonb, 0, '{"https://images.pexels.com/photos/35618218/pexels-photo-35618218.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 1) returning id into it;
  insert into property_listings (item_id, business_id, city_id, kind, beds, baths, sqft, rent_cents, price_cents, deposit_cents, move_in_cents, est_payment_cents, est_down_pct, available_on, furnished, pets, utilities, parking, laundry, s8, ssn_required, papers, lease, senior_62, senior_status, addr_line, zip, geom, addr_public, status)
   select it, b, ci.id, 'opcion', 3, 1.5, null, 135000, null, 135000, 270000, null, null,
          (now() at time zone ci.timezone)::date, false, false, '{}'::text[], true, 'no', false, false,
          '{"es":"2 recibos de pago o carta del trabajo y una ID de cualquier país.","en":"2 pay stubs or a work letter and an ID from any country."}'::jsonb, '{"es":"24 meses; $200 de cada mes va al enganche","en":"24 months; $200 a month goes to the down payment"}'::jsonb, false, 'none', '77 W 9th St', '18201',
          (select st_setsrid(st_point(u.lng, u.lat), 4326)::geography from dir_ubicar('77 W 9th St', '18201') u limit 1), true, 'available'
     from businesses x join cities ci on ci.id = x.city_id where x.id = b;
end $$;
do $$
declare b text := 'propietarios-pa'; s bigint; it bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-INMUEBLE') or exists (select 1 from inm_settings where business_id = b) then return; end if;
  insert into inm_settings (business_id, city_id, kind_override, itin, s8, pets, min_down_pct, prequal_days, buyer_no_commission, free_from, util, furnished)
   select b, ci.id, null, false, false, false, 10, 2, false,
          null, false, false
     from businesses x join cities ci on ci.id = x.city_id where x.id = b;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Servicios","en":"Services"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Contrato de renta bilingüe","en":"Bilingual lease"}'::jsonb, '{"es":"Contrato de PA en español e inglés, listo en 2 días.","en":"PA lease in Spanish and English, ready in 2 days."}'::jsonb, 15000, 60, '{}'::jsonb, 0, '{"https://images.pexels.com/photos/7841424/pexels-photo-7841424.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 0);
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Administración de tu propiedad","en":"Property management"}'::jsonb, '{"es":"8 % de la renta cobrada; incluye cobro, reparaciones y llamadas.","en":"8% of collected rent; includes collection, repairs and calls."}'::jsonb, 0, 60, '{}'::jsonb, 0, '{"https://images.pexels.com/photos/7937684/pexels-photo-7937684.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 1);
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Administración de HOA","en":"HOA management"}'::jsonb, '{"es":"Cuotas, juntas y reparaciones; por unidad al mes.","en":"Dues, meetings and repairs; per unit per month."}'::jsonb, 1200, 60, '{}'::jsonb, 0, '{"https://images.pexels.com/photos/7937684/pexels-photo-7937684.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 2);
end $$;
do $$
declare b text := 'compramos-tu-casa-hzl'; s bigint; it bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-INMUEBLE') or exists (select 1 from inm_settings where business_id = b) then return; end if;
  insert into inm_settings (business_id, city_id, kind_override, itin, s8, pets, min_down_pct, prequal_days, buyer_no_commission, free_from, util, furnished)
   select b, ci.id, null, false, false, false, 10, 2, false,
          null, false, false
     from businesses x join cities ci on ci.id = x.city_id where x.id = b;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Servicios","en":"Services"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Oferta en efectivo","en":"Cash offer"}'::jsonb, '{"es":"Por escrito en 48 horas; sin comisión y sin arreglar nada.","en":"In writing in 48 hours; no commission and no repairs."}'::jsonb, 0, 60, '{}'::jsonb, 0, '{"https://images.pexels.com/photos/7937207/pexels-photo-7937207.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 0);
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Ayuda con venta corta","en":"Short sale help"}'::jsonb, '{"es":"Te explicamos la venta corta y te mandamos al consejero gratis de HUD.","en":"We explain the short sale and refer you to the free HUD counselor."}'::jsonb, 0, 60, '{}'::jsonb, 0, '{"https://images.pexels.com/photos/7937733/pexels-photo-7937733.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 1);
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Reunión de inversionistas","en":"Investor meetup"}'::jsonb, '{"es":"El primer martes del mes, 7 PM. Multifamiliares en Hazleton.","en":"First Tuesday of the month, 7 PM. Multifamily in Hazleton."}'::jsonb, 0, 60, '{}'::jsonb, 0, '{"https://images.pexels.com/photos/7937733/pexels-photo-7937733.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 2);
end $$;
do $$
declare b text := 'keystone-bodegas-espacios'; s bigint; it bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-INMUEBLE') or exists (select 1 from inm_settings where business_id = b) then return; end if;
  insert into inm_settings (business_id, city_id, kind_override, itin, s8, pets, min_down_pct, prequal_days, buyer_no_commission, free_from, util, furnished)
   select b, ci.id, 'comercial', false, false, false, 10, 2, false,
          null, false, false
     from businesses x join cities ci on ci.id = x.city_id where x.id = b;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into items (business_id, module, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', '{"es":"Bodega 5,000 pies²","en":"5,000 sq ft warehouse"}'::jsonb, '{"es":"$2,900 al mes. Puerta para camión. Para empezar: $2,900 + depósito $2,900.","en":"$2,900 a month. Truck door. To start: $2,900 + $2,900 deposit."}'::jsonb, 290000, 30, 'renta', '{"visit_pattern":[{"dow":4,"min":1020,"on":true},{"dow":5,"min":1080,"on":true},{"dow":6,"min":660,"on":true}],"cupo":1}'::jsonb, 0, '{"https://images.pexels.com/photos/36217325/pexels-photo-36217325.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 0) returning id into it;
  insert into property_listings (item_id, business_id, city_id, kind, beds, baths, sqft, rent_cents, price_cents, deposit_cents, move_in_cents, est_payment_cents, est_down_pct, available_on, furnished, pets, utilities, parking, laundry, s8, ssn_required, papers, lease, senior_62, senior_status, addr_line, zip, geom, addr_public, status)
   select it, b, ci.id, 'bodega', null, null, 5000, 290000, null, 290000, 580000, null, null,
          (now() at time zone ci.timezone)::date, false, false, '{}'::text[], false, 'no', false, false,
          null, '{"es":"Desde 1 año","en":"From 1 year"}'::jsonb, false, 'none', '900 Hazle Brook Rd', '18201',
          (select st_setsrid(st_point(u.lng, u.lat), 4326)::geography from dir_ubicar('900 Hazle Brook Rd', '18201') u limit 1), true, 'available'
     from businesses x join cities ci on ci.id = x.city_id where x.id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Espacios","en":"Spaces"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Cocina comercial","en":"Commercial kitchen"}'::jsonb, '{"es":"Con licencia del condado; por hora, mínimo 4.","en":"County licensed; by the hour, 4-hour minimum."}'::jsonb, 2500, 60, '{}'::jsonb, 0, '{"https://images.pexels.com/photos/5843171/pexels-photo-5843171.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 1);
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Salón para 120 personas","en":"Hall for 120"}'::jsonb, '{"es":"Mesas y sillas incluidas; limpieza aparte $100.","en":"Tables and chairs included; cleaning extra $100."}'::jsonb, 60000, 60, '{}'::jsonb, 0, '{"https://images.pexels.com/photos/5843171/pexels-photo-5843171.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 2);
  insert into items (business_id, module, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', '{"es":"Edificio comercial en venta","en":"Commercial building for sale"}'::jsonb, '{"es":"$385,000. Dos locales abajo y oficinas arriba.","en":"$385,000. Two storefronts and offices upstairs."}'::jsonb, 38500000, 30, 'venta', '{"visit_pattern":[{"dow":4,"min":1020,"on":true},{"dow":5,"min":1080,"on":true},{"dow":6,"min":660,"on":true}],"cupo":1}'::jsonb, 0, '{"https://images.pexels.com/photos/36217325/pexels-photo-36217325.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 3) returning id into it;
  insert into property_listings (item_id, business_id, city_id, kind, beds, baths, sqft, rent_cents, price_cents, deposit_cents, move_in_cents, est_payment_cents, est_down_pct, available_on, furnished, pets, utilities, parking, laundry, s8, ssn_required, papers, lease, senior_62, senior_status, addr_line, zip, geom, addr_public, status)
   select it, b, ci.id, 'local', null, null, 6000, null, 38500000, 0, null, null, null,
          null, false, false, '{}'::text[], false, 'no', false, false,
          null, null, false, 'none', '900 Hazle Brook Rd', '18201',
          (select st_setsrid(st_point(u.lng, u.lat), 4326)::geography from dir_ubicar('900 Hazle Brook Rd', '18201') u limit 1), true, 'available'
     from businesses x join cities ci on ci.id = x.city_id where x.id = b;
end $$;
do $$
declare b text := 'almacenaje-hazleton'; s bigint; it bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-INMUEBLE') or exists (select 1 from inm_settings where business_id = b) then return; end if;
  insert into inm_settings (business_id, city_id, kind_override, itin, s8, pets, min_down_pct, prequal_days, buyer_no_commission, free_from, util, furnished)
   select b, ci.id, null, false, false, false, 10, 2, false,
          null, false, false
     from businesses x join cities ci on ci.id = x.city_id where x.id = b;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into items (business_id, module, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', '{"es":"Bodega 5 × 10","en":"Bodega 5 × 10"}'::jsonb, '{"es":"Como un clóset grande.","en":"Como un clóset grande."}'::jsonb, 6500, 30, 'renta', '{"visit_pattern":[{"dow":6,"min":660,"on":true}],"cupo":1}'::jsonb, 0, '{}'::text[], 0) returning id into it;
  insert into property_listings (item_id, business_id, city_id, kind, beds, baths, sqft, rent_cents, price_cents, deposit_cents, move_in_cents, est_payment_cents, est_down_pct, available_on, furnished, pets, utilities, parking, laundry, s8, ssn_required, papers, lease, senior_62, senior_status, addr_line, zip, geom, addr_public, status)
   select it, b, ci.id, 'almacen', null, null, 50, 6500, null, 0, 6500, null, null,
          (now() at time zone ci.timezone)::date, false, false, '{}'::text[], false, 'no', false, false,
          null, null, false, 'none', '1500 Airport Rd', '18201',
          (select st_setsrid(st_point(u.lng, u.lat), 4326)::geography from dir_ubicar('1500 Airport Rd', '18201') u limit 1), true, 'available'
     from businesses x join cities ci on ci.id = x.city_id where x.id = b;
  insert into items (business_id, module, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', '{"es":"Bodega 10 × 20","en":"Bodega 10 × 20"}'::jsonb, '{"es":"Cabe una casa de 2 cuartos.","en":"Cabe una casa de 2 cuartos."}'::jsonb, 14500, 30, 'renta', '{"visit_pattern":[{"dow":6,"min":660,"on":true}],"cupo":1}'::jsonb, 0, '{}'::text[], 1) returning id into it;
  insert into property_listings (item_id, business_id, city_id, kind, beds, baths, sqft, rent_cents, price_cents, deposit_cents, move_in_cents, est_payment_cents, est_down_pct, available_on, furnished, pets, utilities, parking, laundry, s8, ssn_required, papers, lease, senior_62, senior_status, addr_line, zip, geom, addr_public, status)
   select it, b, ci.id, 'almacen', null, null, 200, 14500, null, 0, 14500, null, null,
          (now() at time zone ci.timezone)::date, false, false, '{}'::text[], false, 'no', false, false,
          null, null, false, 'none', '1500 Airport Rd', '18201',
          (select st_setsrid(st_point(u.lng, u.lat), 4326)::geography from dir_ubicar('1500 Airport Rd', '18201') u limit 1), true, 'available'
     from businesses x join cities ci on ci.id = x.city_id where x.id = b;
  insert into items (business_id, module, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', '{"es":"Parqueo para camión o bote","en":"Parqueo para camión o bote"}'::jsonb, '{"es":"Al aire libre, con portón.","en":"Al aire libre, con portón."}'::jsonb, 9000, 30, 'renta', '{"visit_pattern":[{"dow":6,"min":660,"on":true}],"cupo":1}'::jsonb, 0, '{}'::text[], 2) returning id into it;
  insert into property_listings (item_id, business_id, city_id, kind, beds, baths, sqft, rent_cents, price_cents, deposit_cents, move_in_cents, est_payment_cents, est_down_pct, available_on, furnished, pets, utilities, parking, laundry, s8, ssn_required, papers, lease, senior_62, senior_status, addr_line, zip, geom, addr_public, status)
   select it, b, ci.id, 'parqueo', null, null, null, 9000, null, 0, 9000, null, null,
          (now() at time zone ci.timezone)::date, false, false, '{}'::text[], false, 'no', false, false,
          null, null, false, 'none', '1500 Airport Rd', '18201',
          (select st_setsrid(st_point(u.lng, u.lat), 4326)::geography from dir_ubicar('1500 Airport Rd', '18201') u limit 1), true, 'available'
     from businesses x join cities ci on ci.id = x.city_id where x.id = b;
end $$;
do $$
declare b text := 'lente-casa-foto'; s bigint; it bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-INMUEBLE') or exists (select 1 from inm_settings where business_id = b) then return; end if;
  insert into inm_settings (business_id, city_id, kind_override, itin, s8, pets, min_down_pct, prequal_days, buyer_no_commission, free_from, util, furnished)
   select b, ci.id, null, false, false, false, 10, 2, false,
          null, false, false
     from businesses x join cities ci on ci.id = x.city_id where x.id = b;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Servicios","en":"Services"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Fotos de la casa","en":"Fotos de la casa"}'::jsonb, '{"es":"Hasta 25 fotos editadas en 2 días.","en":"Hasta 25 fotos editadas en 2 días."}'::jsonb, 17500, 60, '{}'::jsonb, 0, '{}'::text[], 0);
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Video y dron","en":"Video y dron"}'::jsonb, '{"es":"Video de 1 minuto con vista aérea.","en":"Video de 1 minuto con vista aérea."}'::jsonb, 25000, 60, '{}'::jsonb, 0, '{}'::text[], 1);
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Ambientación","en":"Ambientación"}'::jsonb, '{"es":"Muebles y decoración por un mes.","en":"Muebles y decoración por un mes."}'::jsonb, 90000, 60, '{}'::jsonb, 0, '{}'::text[], 2);
end $$;
insert into users (phone, first_name, last_name, lang, home_city_id) select '+15705550433', 'Yesenia', 'Batista', 'es', 'hzl' where exists (select 1 from businesses where id = 'rentas-hazleton-latino' and is_demo) on conflict (phone) do nothing;
insert into business_members (business_id, user_id, kind, display_name, role, status, show_on_page, panel_access, since_year, sort, same_as_business_hours) select 'rentas-hazleton-latino', u.id, 'owner', 'Yesenia Batista', '{"es":"Agente y dueña","en":"Agent and owner"}'::jsonb, 'active', true, '{all}', 2015, 0, true from users u where u.phone = '+15705550433' and exists (select 1 from businesses where id = 'rentas-hazleton-latino' and is_demo) and not exists (select 1 from business_members m where m.business_id = 'rentas-hazleton-latino' and m.kind = 'owner' and m.status = 'active');
commit;
