-- Generado por scripts/semilla/extraer-ninos.cjs desde el prototipo. SOLO SANDBOX. No editar a mano.
begin;
do $$
declare b text := 'guarderia-mis-angelitos'; s bigint; it bigint; d date;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-NINOS') or exists (select 1 from insc_settings where business_id = b) then return; end if;
  insert into insc_settings (business_id, city_id, rubro, esp, age_min, age_max, ccis, extended, meals, night, transport, medicaid, home_based, week_cents, eval_wait_w)
   select b, city_id, 'ninos', true, 2, 5, true, true, true, false, false, false, false,
          23500, null from businesses where id = b;
  insert into care_openings (business_id, city_id, band_min, band_max, label, openings, sort) select b, city_id, 2, 2, '{"es":"2 años","en":"Age 2"}'::jsonb, 1, 0 from businesses where id = b;
  insert into care_openings (business_id, city_id, band_min, band_max, label, openings, sort) select b, city_id, 3, 3, '{"es":"3 años","en":"Age 3"}'::jsonb, 2, 1 from businesses where id = b;
  insert into care_openings (business_id, city_id, band_min, band_max, label, openings, sort) select b, city_id, 4, 5, '{"es":"4 y 5 años","en":"Ages 4 and 5"}'::jsonb, 0, 2 from businesses where id = b;
  insert into licenses (business_id, kind, title, issuer, number, status, city_id, source, sort, verified_at, next_review) select b, 'pa_dhs_childcare', '{"es":"Licencia de cuidado infantil (DHS)","en":"Child care certificate (DHS)"}'::jsonb, null, 'PRUEBA-12137', 'valid', city_id, 'semilla', 1, now(), (now() + interval '6 months')::date from businesses where id = b;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Guardería","en":"Daycare"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Guardería · tiempo completo","en":"Full-time daycare"}'::jsonb, '{"es":"Lunes a viernes 6 AM–6 PM. Desayuno, almuerzo y merienda.","en":"Mon–Fri 6 AM–6 PM. Breakfast, lunch and snack."}'::jsonb, 23500, 60, 'semana', '{"inc":[{"es":"Comidas","en":"Meals"},{"es":"Pañales no","en":"Diapers not included"}]}'::jsonb, 0, '{"https://images.pexels.com/photos/8422170/pexels-photo-8422170.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 0) returning id into it;
  d := (select (now() at time zone ci.timezone)::date + 11 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, jsonb_build_object('es', (array['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'])[extract(dow from d)::int + 1] || ' ' || extract(day from d)::int || ' ' || (array['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'])[extract(month from d)::int],
                                'en', (array['Sun','Mon','Tue','Wed','Thu','Fri','Sat'])[extract(dow from d)::int + 1] || ' ' || (array['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'])[extract(month from d)::int] || ' ' || extract(day from d)::int), d, null, '{}'::smallint[], null, 8 from businesses where id = b;
  d := (select (now() at time zone ci.timezone)::date + 18 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, jsonb_build_object('es', (array['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'])[extract(dow from d)::int + 1] || ' ' || extract(day from d)::int || ' ' || (array['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'])[extract(month from d)::int],
                                'en', (array['Sun','Mon','Tue','Wed','Thu','Fri','Sat'])[extract(dow from d)::int + 1] || ' ' || (array['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'])[extract(month from d)::int] || ' ' || extract(day from d)::int), d, null, '{}'::smallint[], null, 8 from businesses where id = b;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Pre-K (4 años)","en":"Pre-K (age 4)"}'::jsonb, '{"es":"Programa de PA Pre-K Counts: gratis si calificas.","en":"PA Pre-K Counts program: free if you qualify."}'::jsonb, 0, 60, 'mes', '{}'::jsonb, 0, '{"https://images.pexels.com/photos/8613100/pexels-photo-8613100.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 1) returning id into it;
  d := (select (now() at time zone ci.timezone)::date + 11 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, jsonb_build_object('es', (array['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'])[extract(dow from d)::int + 1] || ' ' || extract(day from d)::int || ' ' || (array['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'])[extract(month from d)::int] || ' · 11 AM',
                                'en', (array['Sun','Mon','Tue','Wed','Thu','Fri','Sat'])[extract(dow from d)::int + 1] || ' ' || (array['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'])[extract(month from d)::int] || ' ' || extract(day from d)::int || ' · 11 AM'), d, null, '{}'::smallint[], 660, 8 from businesses where id = b;
end $$;
do $$
declare b text := 'cuidado-dona-carmen'; s bigint; it bigint; d date;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-NINOS') or exists (select 1 from insc_settings where business_id = b) then return; end if;
  insert into insc_settings (business_id, city_id, rubro, esp, age_min, age_max, ccis, extended, meals, night, transport, medicaid, home_based, week_cents, eval_wait_w)
   select b, city_id, 'ninos', true, 0, 10, true, false, true, true, false, false, true,
          18000, null from businesses where id = b;
  insert into care_openings (business_id, city_id, band_min, band_max, label, openings, sort) select b, city_id, 0, 10, '{"es":"Bebés a 10 años","en":"Babies to 10"}'::jsonb, 2, 0 from businesses where id = b;
  insert into licenses (business_id, kind, title, issuer, number, status, city_id, source, sort, verified_at, next_review) select b, 'pa_dhs_childcare', '{"es":"Licencia de cuidado infantil (DHS)","en":"Child care certificate (DHS)"}'::jsonb, null, 'PRUEBA-70461', 'valid', city_id, 'semilla', 1, now(), (now() + interval '6 months')::date from businesses where id = b;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Cuidado","en":"Care"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Turno de noche","en":"Night shift"}'::jsonb, '{"es":"Para padres que trabajan en los almacenes. Hasta 6 niños.","en":"For parents working warehouse shifts. Up to 6 kids."}'::jsonb, 18000, 60, 'semana', '{}'::jsonb, 0, '{"https://images.pexels.com/photos/15648191/pexels-photo-15648191.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 0) returning id into it;
  d := (select (now() at time zone ci.timezone)::date + 4 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  d := d + (select min((x - extract(dow from d)::int + 7) % 7) from unnest(array[1,2,3,4,5]) x);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, '{"es":"Lun a Vie 5 PM–11 PM","en":"Mon–Fri 5–11 PM"}'::jsonb, d, null, '{1,2,3,4,5}'::smallint[], 1020, 8 from businesses where id = b;
  d := (select (now() at time zone ci.timezone)::date + 2 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  d := d + (select min((x - extract(dow from d)::int + 7) % 7) from unnest(array[6]) x);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, '{"es":"Sábados","en":"Saturdays"}'::jsonb, d, null, '{6}'::smallint[], null, 8 from businesses where id = b;
end $$;
do $$
declare b text := 'after-school-estrellas'; s bigint; it bigint; d date;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-NINOS') or exists (select 1 from insc_settings where business_id = b) then return; end if;
  insert into insc_settings (business_id, city_id, rubro, esp, age_min, age_max, ccis, extended, meals, night, transport, medicaid, home_based, week_cents, eval_wait_w)
   select b, city_id, 'ninos', true, 5, 12, true, false, true, false, true, false, false,
          null, null from businesses where id = b;
  insert into licenses (business_id, kind, title, issuer, number, status, city_id, source, sort, verified_at, next_review) select b, 'pa_dhs_childcare', '{"es":"Licencia de cuidado infantil (DHS)","en":"Child care certificate (DHS)"}'::jsonb, null, 'PRUEBA-94218', 'valid', city_id, 'semilla', 1, now(), (now() + interval '6 months')::date from businesses where id = b;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"After school","en":"After school"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"After school","en":"After school"}'::jsonb, '{"es":"Te recogemos al niño en la escuela, merienda y tareas en español e inglés.","en":"We pick your child up at school, snack and homework in Spanish and English."}'::jsonb, 9000, 60, 'semana', '{"inc":[{"es":"Recogida en la escuela","en":"School pickup"},{"es":"Merienda","en":"Snack"}]}'::jsonb, 0, '{"https://images.pexels.com/photos/8456147/pexels-photo-8456147.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 0) returning id into it;
  d := (select (now() at time zone ci.timezone)::date + 4 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, jsonb_build_object('es', (array['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'])[extract(dow from d)::int + 1] || ' ' || extract(day from d)::int || ' ' || (array['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'])[extract(month from d)::int] || ' · 7 PM',
                                'en', (array['Sun','Mon','Tue','Wed','Thu','Fri','Sat'])[extract(dow from d)::int + 1] || ' ' || (array['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'])[extract(month from d)::int] || ' ' || extract(day from d)::int || ' · 7 PM'), d, null, '{}'::smallint[], 1140, 8 from businesses where id = b;
end $$;
do $$
declare b text := 'karate-kids-hzl'; s bigint; it bigint; d date;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-NINOS') or exists (select 1 from insc_settings where business_id = b) then return; end if;
  insert into insc_settings (business_id, city_id, rubro, esp, age_min, age_max, ccis, extended, meals, night, transport, medicaid, home_based, week_cents, eval_wait_w)
   select b, city_id, 'ninos', true, 4, 14, false, false, false, false, false, false, false,
          null, null from businesses where id = b;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Karate","en":"Karate"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Karate · principiantes","en":"Karate · beginners"}'::jsonb, '{"es":"Martes y jueves. Uniforme incluido.","en":"Tue and Thu. Uniform included."}'::jsonb, 8500, 60, 'mes', '{"g1":true,"inc":[{"es":"Uniforme","en":"Uniform"}]}'::jsonb, 0, '{"https://images.pexels.com/photos/7045594/pexels-photo-7045594.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 0) returning id into it;
  d := (select (now() at time zone ci.timezone)::date + 5 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  d := d + (select min((x - extract(dow from d)::int + 7) % 7) from unnest(array[2,4]) x);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, '{"es":"Mar y Jue 5 PM","en":"Tue & Thu 5 PM"}'::jsonb, d, null, '{2,4}'::smallint[], 1020, 8 from businesses where id = b;
  d := (select (now() at time zone ci.timezone)::date + 2 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  d := d + (select min((x - extract(dow from d)::int + 7) % 7) from unnest(array[6]) x);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, '{"es":"Sábado 10 AM","en":"Saturday 10 AM"}'::jsonb, d, null, '{6}'::smallint[], 600, 8 from businesses where id = b;
end $$;
do $$
declare b text := 'natacion-delfines'; s bigint; it bigint; d date;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-NINOS') or exists (select 1 from insc_settings where business_id = b) then return; end if;
  insert into insc_settings (business_id, city_id, rubro, esp, age_min, age_max, ccis, extended, meals, night, transport, medicaid, home_based, week_cents, eval_wait_w)
   select b, city_id, 'ninos', true, 3, 12, false, false, false, false, false, false, false,
          null, null from businesses where id = b;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Natación","en":"Swimming"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Sesión de natación","en":"Swim session"}'::jsonb, '{"es":"8 semanas, grupos por edad y nivel.","en":"8 weeks, groups by age and level."}'::jsonb, 12000, 60, 'curso', '{"sem":8,"horas":8,"dep":3000}'::jsonb, 3000, '{"https://images.pexels.com/photos/5278447/pexels-photo-5278447.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 0) returning id into it;
  d := (select (now() at time zone ci.timezone)::date + 9 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, jsonb_build_object('es', 'Empieza el ' || extract(day from d)::int || ' ' || (array['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'])[extract(month from d)::int],
                                'en', 'Starts ' || (array['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'])[extract(month from d)::int] || ' ' || extract(day from d)::int), d, d + 55, '{}'::smallint[], null, 8 from businesses where id = b;
  d := (select (now() at time zone ci.timezone)::date + 16 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, jsonb_build_object('es', 'Empieza el ' || extract(day from d)::int || ' ' || (array['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'])[extract(month from d)::int],
                                'en', 'Starts ' || (array['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'])[extract(month from d)::int] || ' ' || extract(day from d)::int), d, d + 55, '{}'::smallint[], null, 8 from businesses where id = b;
end $$;
do $$
declare b text := 'futbol-hazleton-fc'; s bigint; it bigint; d date;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-NINOS') or exists (select 1 from insc_settings where business_id = b) then return; end if;
  insert into insc_settings (business_id, city_id, rubro, esp, age_min, age_max, ccis, extended, meals, night, transport, medicaid, home_based, week_cents, eval_wait_w)
   select b, city_id, 'ninos', true, 5, 14, false, false, false, false, false, false, false,
          null, null from businesses where id = b;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Fútbol","en":"Soccer"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Temporada de otoño","en":"Fall season"}'::jsonb, '{"es":"Prácticas martes y jueves, partidos los sábados.","en":"Practices Tue and Thu, games on Saturdays."}'::jsonb, 9500, 60, 'curso', '{"sem":10,"horas":30,"dep":3000,"inc":[{"es":"Uniforme","en":"Uniform"}]}'::jsonb, 3000, '{"https://images.pexels.com/photos/36871438/pexels-photo-36871438.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 0) returning id into it;
  d := (select (now() at time zone ci.timezone)::date + 5 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, jsonb_build_object('es', 'Empieza el ' || extract(day from d)::int || ' ' || (array['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'])[extract(month from d)::int],
                                'en', 'Starts ' || (array['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'])[extract(month from d)::int] || ' ' || extract(day from d)::int), d, d + 69, '{}'::smallint[], null, 8 from businesses where id = b;
end $$;
do $$
declare b text := 'terapias-pasitos'; s bigint; it bigint; d date;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-NINOS') or exists (select 1 from insc_settings where business_id = b) then return; end if;
  insert into insc_settings (business_id, city_id, rubro, esp, age_min, age_max, ccis, extended, meals, night, transport, medicaid, home_based, week_cents, eval_wait_w)
   select b, city_id, 'ninos', true, 0, 12, false, false, false, false, false, true, false,
          null, 2 from businesses where id = b;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Terapias","en":"Therapy"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Evaluación de habla o terapia ocupacional","en":"Speech or OT evaluation"}'::jsonb, '{"es":"Con Medicaid y CHIP no pagas.","en":"No cost with Medicaid or CHIP."}'::jsonb, 0, 60, 'clase', '{}'::jsonb, 0, '{"https://images.pexels.com/photos/7943248/pexels-photo-7943248.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 0) returning id into it;
  d := (select (now() at time zone ci.timezone)::date + 14 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, jsonb_build_object('es', (array['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'])[extract(dow from d)::int + 1] || ' ' || extract(day from d)::int || ' ' || (array['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'])[extract(month from d)::int] || ' · 10 AM',
                                'en', (array['Sun','Mon','Tue','Wed','Thu','Fri','Sat'])[extract(dow from d)::int + 1] || ' ' || (array['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'])[extract(month from d)::int] || ' ' || extract(day from d)::int || ' · 10 AM'), d, d, '{}'::smallint[], 600, 8 from businesses where id = b;
  d := (select (now() at time zone ci.timezone)::date + 15 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, jsonb_build_object('es', (array['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'])[extract(dow from d)::int + 1] || ' ' || extract(day from d)::int || ' ' || (array['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'])[extract(month from d)::int] || ' · 2 PM',
                                'en', (array['Sun','Mon','Tue','Wed','Thu','Fri','Sat'])[extract(dow from d)::int + 1] || ' ' || (array['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'])[extract(month from d)::int] || ' ' || extract(day from d)::int || ' · 2 PM'), d, d, '{}'::smallint[], 840, 8 from businesses where id = b;
end $$;
do $$
declare b text := 'baile-mini-sabor'; s bigint; it bigint; d date;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-NINOS') or exists (select 1 from insc_settings where business_id = b) then return; end if;
  insert into insc_settings (business_id, city_id, rubro, esp, age_min, age_max, ccis, extended, meals, night, transport, medicaid, home_based, week_cents, eval_wait_w)
   select b, city_id, 'ninos', true, 3, 12, false, false, false, false, false, false, false,
          null, null from businesses where id = b;
end $$;
do $$
declare b text := 'ninera-lucia'; s bigint; it bigint; d date;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-NINOS') or exists (select 1 from insc_settings where business_id = b) then return; end if;
  insert into insc_settings (business_id, city_id, rubro, esp, age_min, age_max, ccis, extended, meals, night, transport, medicaid, home_based, week_cents, eval_wait_w)
   select b, city_id, 'ninos', true, 0, 12, false, false, false, true, false, false, false,
          null, null from businesses where id = b;
end $$;
do $$
declare b text := 'jump-zone'; s bigint; it bigint; d date;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-NINOS') or exists (select 1 from insc_settings where business_id = b) then return; end if;
  insert into insc_settings (business_id, city_id, rubro, esp, age_min, age_max, ccis, extended, meals, night, transport, medicaid, home_based, week_cents, eval_wait_w)
   select b, city_id, 'ninos', false, 1, 14, false, false, false, false, false, false, false,
          null, null from businesses where id = b;
end $$;
do $$
declare b text := 'head-start-hzl'; s bigint; it bigint; d date;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-NINOS') or exists (select 1 from insc_settings where business_id = b) then return; end if;
  insert into insc_settings (business_id, city_id, rubro, esp, age_min, age_max, ccis, extended, meals, night, transport, medicaid, home_based, week_cents, eval_wait_w)
   select b, city_id, 'ninos', true, 3, 5, true, false, true, false, true, false, false,
          null, null from businesses where id = b;
  insert into care_openings (business_id, city_id, band_min, band_max, label, openings, sort) select b, city_id, 3, 3, '{"es":"3 años","en":"Age 3"}'::jsonb, 2, 0 from businesses where id = b;
  insert into care_openings (business_id, city_id, band_min, band_max, label, openings, sort) select b, city_id, 4, 5, '{"es":"4 y 5 años","en":"Ages 4 and 5"}'::jsonb, 0, 1 from businesses where id = b;
  insert into licenses (business_id, kind, title, issuer, number, status, city_id, source, sort, verified_at, next_review) select b, 'pa_dhs_childcare', '{"es":"Licencia de cuidado infantil (DHS)","en":"Child care certificate (DHS)"}'::jsonb, null, 'PRUEBA-30866', 'valid', city_id, 'semilla', 1, now(), (now() + interval '6 months')::date from businesses where id = b;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Head Start","en":"Head Start"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Head Start · 3 a 5 años","en":"Head Start · ages 3–5"}'::jsonb, '{"es":"Lunes a viernes 8 AM–4 PM, gratis si calificas por ingresos. Desayuno y almuerzo.","en":"Mon–Fri 8 AM–4 PM, free if you qualify by income. Breakfast and lunch."}'::jsonb, 0, 60, 'mes', '{"inc":[{"es":"Comidas","en":"Meals"},{"es":"Transporte","en":"Bus"}]}'::jsonb, 0, '{"https://images.pexels.com/photos/35105982/pexels-photo-35105982.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 0) returning id into it;
  d := (select (now() at time zone ci.timezone)::date + 11 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, jsonb_build_object('es', (array['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'])[extract(dow from d)::int + 1] || ' ' || extract(day from d)::int || ' ' || (array['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'])[extract(month from d)::int],
                                'en', (array['Sun','Mon','Tue','Wed','Thu','Fri','Sat'])[extract(dow from d)::int + 1] || ' ' || (array['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'])[extract(month from d)::int] || ' ' || extract(day from d)::int), d, null, '{}'::smallint[], null, 8 from businesses where id = b;
  d := (select (now() at time zone ci.timezone)::date + 39 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, jsonb_build_object('es', (array['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'])[extract(dow from d)::int + 1] || ' ' || extract(day from d)::int || ' ' || (array['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'])[extract(month from d)::int],
                                'en', (array['Sun','Mon','Tue','Wed','Thu','Fri','Sat'])[extract(dow from d)::int + 1] || ' ' || (array['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'])[extract(month from d)::int] || ' ' || extract(day from d)::int), d, null, '{}'::smallint[], null, 8 from businesses where id = b;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Cita para WIC y beneficios","en":"WIC and benefits appointment"}'::jsonb, '{"es":"Te ayudan a pedir WIC y a inscribir al niño en la escuela. No preguntan estatus.","en":"They help you apply for WIC and enroll your child in school. They do not ask about status."}'::jsonb, 0, 60, 'clase', '{}'::jsonb, 0, '{"https://images.pexels.com/photos/28097511/pexels-photo-28097511.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 1) returning id into it;
  d := (select (now() at time zone ci.timezone)::date + 5 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, jsonb_build_object('es', (array['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'])[extract(dow from d)::int + 1] || ' ' || extract(day from d)::int || ' ' || (array['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'])[extract(month from d)::int] || ' · 10 AM',
                                'en', (array['Sun','Mon','Tue','Wed','Thu','Fri','Sat'])[extract(dow from d)::int + 1] || ' ' || (array['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'])[extract(month from d)::int] || ' ' || extract(day from d)::int || ' · 10 AM'), d, d, '{}'::smallint[], 600, 8 from businesses where id = b;
  d := (select (now() at time zone ci.timezone)::date + 7 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, jsonb_build_object('es', (array['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'])[extract(dow from d)::int + 1] || ' ' || extract(day from d)::int || ' ' || (array['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'])[extract(month from d)::int] || ' · 2 PM',
                                'en', (array['Sun','Mon','Tue','Wed','Thu','Fri','Sat'])[extract(dow from d)::int + 1] || ' ' || (array['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'])[extract(month from d)::int] || ' ' || extract(day from d)::int || ' · 2 PM'), d, d, '{}'::smallint[], 840, 8 from businesses where id = b;
end $$;
do $$
declare b text := 'campamento-pocono-kids'; s bigint; it bigint; d date;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-NINOS') or exists (select 1 from insc_settings where business_id = b) then return; end if;
  insert into insc_settings (business_id, city_id, rubro, esp, age_min, age_max, ccis, extended, meals, night, transport, medicaid, home_based, week_cents, eval_wait_w)
   select b, city_id, 'ninos', true, 6, 13, false, false, true, false, true, false, false,
          null, null from businesses where id = b;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Campamentos","en":"Camps"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Campamento de invierno","en":"Winter camp"}'::jsonb, '{"es":"Semana de vacaciones: juegos, manualidades y salida. Almuerzo incluido.","en":"Vacation week: games, crafts and a field trip. Lunch included."}'::jsonb, 16500, 60, 'semana', '{"inc":[{"es":"Almuerzo","en":"Lunch"},{"es":"Transporte desde paradas de Hazleton","en":"Bus from Hazleton stops"}]}'::jsonb, 0, '{"https://images.pexels.com/photos/5036963/pexels-photo-5036963.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 0) returning id into it;
  d := (select (now() at time zone ci.timezone)::date + 88 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, jsonb_build_object('es', (array['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'])[extract(dow from d)::int + 1] || ' ' || extract(day from d)::int || ' ' || (array['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'])[extract(month from d)::int],
                                'en', (array['Sun','Mon','Tue','Wed','Thu','Fri','Sat'])[extract(dow from d)::int + 1] || ' ' || (array['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'])[extract(month from d)::int] || ' ' || extract(day from d)::int), d, null, '{}'::smallint[], null, 8 from businesses where id = b;
  d := (select (now() at time zone ci.timezone)::date + 95 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, jsonb_build_object('es', (array['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'])[extract(dow from d)::int + 1] || ' ' || extract(day from d)::int || ' ' || (array['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'])[extract(month from d)::int],
                                'en', (array['Sun','Mon','Tue','Wed','Thu','Fri','Sat'])[extract(dow from d)::int + 1] || ' ' || (array['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'])[extract(month from d)::int] || ' ' || extract(day from d)::int), d, null, '{}'::smallint[], null, 8 from businesses where id = b;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Campamento de primavera","en":"Spring camp"}'::jsonb, '{"es":"La semana de Semana Santa.","en":"Easter break week."}'::jsonb, 16500, 60, 'semana', '{"inc":[{"es":"Almuerzo","en":"Lunch"}]}'::jsonb, 0, '{"https://images.pexels.com/photos/9303535/pexels-photo-9303535.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 1) returning id into it;
  d := (select (now() at time zone ci.timezone)::date + 187 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, jsonb_build_object('es', (array['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'])[extract(dow from d)::int + 1] || ' ' || extract(day from d)::int || ' ' || (array['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'])[extract(month from d)::int],
                                'en', (array['Sun','Mon','Tue','Wed','Thu','Fri','Sat'])[extract(dow from d)::int + 1] || ' ' || (array['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'])[extract(month from d)::int] || ' ' || extract(day from d)::int), d, null, '{}'::smallint[], null, 8 from businesses where id = b;
end $$;
do $$
declare b text := 'liga-infantil-hzl'; s bigint; it bigint; d date;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-NINOS') or exists (select 1 from insc_settings where business_id = b) then return; end if;
  insert into insc_settings (business_id, city_id, rubro, esp, age_min, age_max, ccis, extended, meals, night, transport, medicaid, home_based, week_cents, eval_wait_w)
   select b, city_id, 'ninos', true, 5, 14, false, false, false, false, false, false, false,
          null, null from businesses where id = b;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Ligas","en":"Leagues"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Básquetbol · temporada de invierno","en":"Basketball · winter season"}'::jsonb, '{"es":"Prácticas martes y jueves, juegos los sábados.","en":"Practices Tue and Thu, games on Saturdays."}'::jsonb, 8000, 60, 'curso', '{"sem":12,"horas":36,"dep":2000,"inc":[{"es":"Uniforme","en":"Uniform"}]}'::jsonb, 2000, '{"https://images.pexels.com/photos/1752757/pexels-photo-1752757.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 0) returning id into it;
  d := (select (now() at time zone ci.timezone)::date + 39 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, jsonb_build_object('es', 'Empieza el ' || extract(day from d)::int || ' ' || (array['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'])[extract(month from d)::int],
                                'en', 'Starts ' || (array['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'])[extract(month from d)::int] || ' ' || extract(day from d)::int), d, d + 83, '{}'::smallint[], null, 8 from businesses where id = b;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Béisbol · temporada de primavera","en":"Baseball · spring season"}'::jsonb, '{"es":"De marzo a junio. Guante prestado si no tienes.","en":"March to June. Loaner glove if needed."}'::jsonb, 9000, 60, 'curso', '{"sem":12,"horas":36,"dep":2000,"inc":[{"es":"Uniforme","en":"Uniform"},{"es":"Guante prestado","en":"Loaner glove"}]}'::jsonb, 2000, '{"https://images.pexels.com/photos/12783350/pexels-photo-12783350.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 1) returning id into it;
  d := (select (now() at time zone ci.timezone)::date + 165 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, jsonb_build_object('es', 'Empieza el ' || extract(day from d)::int || ' ' || (array['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'])[extract(month from d)::int],
                                'en', 'Starts ' || (array['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'])[extract(month from d)::int] || ' ' || extract(day from d)::int), d, d + 83, '{}'::smallint[], null, 8 from businesses where id = b;
end $$;
do $$
declare b text := 'pequenos-artistas'; s bigint; it bigint; d date;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-NINOS') or exists (select 1 from insc_settings where business_id = b) then return; end if;
  insert into insc_settings (business_id, city_id, rubro, esp, age_min, age_max, ccis, extended, meals, night, transport, medicaid, home_based, week_cents, eval_wait_w)
   select b, city_id, 'ninos', true, 4, 12, false, false, false, false, false, false, false,
          null, null from businesses where id = b;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Música y arte","en":"Music & art"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Pintura y dibujo","en":"Painting & drawing"}'::jsonb, '{"es":"Una vez por semana. Materiales incluidos.","en":"Once a week. Materials included."}'::jsonb, 6000, 60, 'mes', '{"g1":true,"inc":[{"es":"Materiales","en":"Materials"}]}'::jsonb, 0, '{"https://images.pexels.com/photos/36713062/pexels-photo-36713062.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 0) returning id into it;
  d := (select (now() at time zone ci.timezone)::date + 6 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  d := d + (select min((x - extract(dow from d)::int + 7) % 7) from unnest(array[3]) x);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, '{"es":"Mié 4 PM","en":"Wed 4 PM"}'::jsonb, d, null, '{3}'::smallint[], 960, 8 from businesses where id = b;
  d := (select (now() at time zone ci.timezone)::date + 2 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  d := d + (select min((x - extract(dow from d)::int + 7) % 7) from unnest(array[6]) x);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, '{"es":"Sáb 10 AM","en":"Sat 10 AM"}'::jsonb, d, null, '{6}'::smallint[], 600, 8 from businesses where id = b;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Guitarra y piano para niños","en":"Kids guitar & piano"}'::jsonb, '{"es":"Grupos de 4 por edad.","en":"Groups of 4 by age."}'::jsonb, 7000, 60, 'mes', '{"g1":true}'::jsonb, 0, '{"https://images.pexels.com/photos/36713062/pexels-photo-36713062.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 1) returning id into it;
  d := (select (now() at time zone ci.timezone)::date + 5 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  d := d + (select min((x - extract(dow from d)::int + 7) % 7) from unnest(array[2]) x);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, '{"es":"Mar 5 PM","en":"Tue 5 PM"}'::jsonb, d, null, '{2}'::smallint[], 1020, 8 from businesses where id = b;
  d := (select (now() at time zone ci.timezone)::date + 7 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  d := d + (select min((x - extract(dow from d)::int + 7) % 7) from unnest(array[4]) x);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, '{"es":"Jue 5 PM","en":"Thu 5 PM"}'::jsonb, d, null, '{4}'::smallint[], 1020, 8 from businesses where id = b;
end $$;
do $$
declare b text := 'nace-lactancia'; s bigint; it bigint; d date;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-NINOS') or exists (select 1 from insc_settings where business_id = b) then return; end if;
  insert into insc_settings (business_id, city_id, rubro, esp, age_min, age_max, ccis, extended, meals, night, transport, medicaid, home_based, week_cents, eval_wait_w)
   select b, city_id, 'ninos', true, 0, 1, false, false, false, false, false, true, false,
          null, null from businesses where id = b;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Lactancia y familia","en":"Lactation & family"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Visita de lactancia","en":"Lactation visit"}'::jsonb, '{"es":"1 hora con consultora certificada, en el local o en tu casa. Con Medicaid puede salir gratis.","en":"1 hour with a certified consultant, here or at home. Medicaid may cover it."}'::jsonb, 8500, 60, 'clase', '{}'::jsonb, 0, '{"https://images.pexels.com/photos/5424649/pexels-photo-5424649.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 0) returning id into it;
  d := (select (now() at time zone ci.timezone)::date + 1 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, jsonb_build_object('es', (array['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'])[extract(dow from d)::int + 1] || ' ' || extract(day from d)::int || ' ' || (array['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'])[extract(month from d)::int] || ' · 10 AM',
                                'en', (array['Sun','Mon','Tue','Wed','Thu','Fri','Sat'])[extract(dow from d)::int + 1] || ' ' || (array['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'])[extract(month from d)::int] || ' ' || extract(day from d)::int || ' · 10 AM'), d, d, '{}'::smallint[], 600, 8 from businesses where id = b;
  d := (select (now() at time zone ci.timezone)::date + 4 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  d := d + (select min((x - extract(dow from d)::int + 7) % 7) from unnest(array[1]) x);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, '{"es":"Lun 2 PM","en":"Mon 2 PM"}'::jsonb, d, d, '{1}'::smallint[], 840, 8 from businesses where id = b;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Clase para papás primerizos","en":"New parents class"}'::jsonb, '{"es":"Sábado 2 horas: bañar, dormir, cuándo llamar al pediatra.","en":"Saturday, 2 hours: bathing, sleep, when to call the pediatrician."}'::jsonb, 2500, 60, 'clase', '{}'::jsonb, 0, '{"https://images.pexels.com/photos/36707289/pexels-photo-36707289.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 1) returning id into it;
  d := (select (now() at time zone ci.timezone)::date + 9 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, jsonb_build_object('es', (array['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'])[extract(dow from d)::int + 1] || ' ' || extract(day from d)::int || ' ' || (array['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'])[extract(month from d)::int] || ' · 10 AM',
                                'en', (array['Sun','Mon','Tue','Wed','Thu','Fri','Sat'])[extract(dow from d)::int + 1] || ' ' || (array['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'])[extract(month from d)::int] || ' ' || extract(day from d)::int || ' · 10 AM'), d, d, '{}'::smallint[], 600, 8 from businesses where id = b;
  d := (select (now() at time zone ci.timezone)::date + 23 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, jsonb_build_object('es', (array['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'])[extract(dow from d)::int + 1] || ' ' || extract(day from d)::int || ' ' || (array['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'])[extract(month from d)::int] || ' · 10 AM',
                                'en', (array['Sun','Mon','Tue','Wed','Thu','Fri','Sat'])[extract(dow from d)::int + 1] || ' ' || (array['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'])[extract(month from d)::int] || ' ' || extract(day from d)::int || ' · 10 AM'), d, d, '{}'::smallint[], 600, 8 from businesses where id = b;
end $$;
do $$
declare b text := 'animaciones-mundo-magico'; s bigint; it bigint; d date;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-NINOS') or exists (select 1 from insc_settings where business_id = b) then return; end if;
  insert into insc_settings (business_id, city_id, rubro, esp, age_min, age_max, ccis, extended, meals, night, transport, medicaid, home_based, week_cents, eval_wait_w)
   select b, city_id, 'ninos', true, 2, 10, false, false, false, false, false, false, false,
          null, null from businesses where id = b;
end $$;
do $$
declare b text := 'nana-maritza'; s bigint; it bigint; d date;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-NINOS') or exists (select 1 from insc_settings where business_id = b) then return; end if;
  insert into insc_settings (business_id, city_id, rubro, esp, age_min, age_max, ccis, extended, meals, night, transport, medicaid, home_based, week_cents, eval_wait_w)
   select b, city_id, 'ninos', true, 0, 6, false, true, false, false, false, false, false,
          null, null from businesses where id = b;
end $$;
do $$
declare b text := 'cool-kids-barberia'; s bigint; it bigint; d date;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-NINOS') or exists (select 1 from insc_settings where business_id = b) then return; end if;
  insert into insc_settings (business_id, city_id, rubro, esp, age_min, age_max, ccis, extended, meals, night, transport, medicaid, home_based, week_cents, eval_wait_w)
   select b, city_id, 'ninos', true, 1, 12, false, false, false, false, false, false, false,
          null, null from businesses where id = b;
end $$;
do $$
declare b text := 'fotos-pequenos-momentos'; s bigint; it bigint; d date;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-NINOS') or exists (select 1 from insc_settings where business_id = b) then return; end if;
  insert into insc_settings (business_id, city_id, rubro, esp, age_min, age_max, ccis, extended, meals, night, transport, medicaid, home_based, week_cents, eval_wait_w)
   select b, city_id, 'ninos', true, 0, 12, false, false, false, false, false, false, false,
          null, null from businesses where id = b;
end $$;
do $$
declare b text := 'bebe-viajero-renta'; s bigint; it bigint; d date;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-NINOS') or exists (select 1 from insc_settings where business_id = b) then return; end if;
  insert into insc_settings (business_id, city_id, rubro, esp, age_min, age_max, ccis, extended, meals, night, transport, medicaid, home_based, week_cents, eval_wait_w)
   select b, city_id, 'ninos', true, 0, 4, false, false, false, false, true, false, false,
          null, null from businesses where id = b;
end $$;
do $$
declare b text := 'familias-de-corazon'; s bigint; it bigint; d date;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-NINOS') or exists (select 1 from insc_settings where business_id = b) then return; end if;
  insert into insc_settings (business_id, city_id, rubro, esp, age_min, age_max, ccis, extended, meals, night, transport, medicaid, home_based, week_cents, eval_wait_w)
   select b, city_id, 'ninos', true, 0, 18, false, false, false, false, false, false, false,
          null, null from businesses where id = b;
end $$;
insert into users (phone, first_name, last_name, lang, home_city_id) select '+15705550388', 'Altagracia', 'Reyes', 'es', 'hzl' where exists (select 1 from businesses where id = 'guarderia-mis-angelitos' and is_demo) on conflict (phone) do nothing;
insert into business_members (business_id, user_id, kind, display_name, role, status, show_on_page, panel_access, since_year, sort, same_as_business_hours) select 'guarderia-mis-angelitos', u.id, 'owner', 'Altagracia Reyes', '{"es":"Dueña y directora","en":"Owner and director"}'::jsonb, 'active', true, '{all}', 2014, 0, true from users u where u.phone = '+15705550388' and exists (select 1 from businesses where id = 'guarderia-mis-angelitos' and is_demo) and not exists (select 1 from business_members m where m.business_id = 'guarderia-mis-angelitos' and m.kind = 'owner' and m.status = 'active');
insert into stripe_accounts (business_id, stripe_account_id, status, charges_enabled, payouts_enabled, requirements, bank_last4, simulated)
  select 'guarderia-mis-angelitos', 'acct_sim_guarderia-mis-angelitos', 'enabled', true, true, '[]'::jsonb, '4288', true where exists (select 1 from businesses where id = 'guarderia-mis-angelitos' and is_demo) on conflict (business_id) do nothing;
select licencias_refrescar(id) from businesses where category_id = 'NEG-NINOS' and is_demo;
commit;
