-- Generado por scripts/semilla/extraer-deporte.cjs desde el prototipo. SOLO SANDBOX. No editar a mano.
begin;
do $$
declare b text := 'power-gym-hzl'; s bigint; it bigint; d date;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-DEPORTE') or exists (select 1 from insc_settings where business_id = b) then return; end if;
  insert into insc_settings (business_id, city_id, rubro, esp, contract_m, cancel_fee_cents, signup_cents, childcare, free_agents, league_until)
   select b, city_id, 'dep', true, 0, 0, 0, true, false,
          null from businesses where id = b;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Membresías","en":"Memberships"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Membresía sin contrato","en":"No-contract membership"}'::jsonb, '{"es":"Acceso 24 horas. Cancelas cuando quieras, sin penalidad.","en":"24-hour access. Cancel any time, no penalty."}'::jsonb, 2500, 60, 'mes', '{"g1":true,"inc":[{"es":"Sin cuota de inscripción","en":"No signup fee"},{"es":"Guardería 5–8 PM","en":"Childcare 5–8 PM"}]}'::jsonb, 0, '{"https://images.pexels.com/photos/6628962/pexels-photo-6628962.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 0) returning id into it;
  d := (select (now() at time zone ci.timezone)::date + 0 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, '{"es":"Empieza hoy","en":"Start today"}'::jsonb, d, null, '{}'::smallint[], null, 8 from businesses where id = b;
  d := (select (now() at time zone ci.timezone)::date + 4 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  d := d + (select min((x - extract(dow from d)::int + 7) % 7) from unnest(array[1]) x);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, '{"es":"Empieza el lunes","en":"Start Monday"}'::jsonb, d, null, '{1}'::smallint[], null, 8 from businesses where id = b;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Entrenador personal","en":"Personal trainer"}'::jsonb, '{"es":"Sesión de 1 hora, en español.","en":"1-hour session, in Spanish."}'::jsonb, 3500, 60, 'hora', '{}'::jsonb, 0, '{"https://images.pexels.com/photos/5878672/pexels-photo-5878672.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 1) returning id into it;
  d := (select (now() at time zone ci.timezone)::date + 0 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, jsonb_build_object('es', (array['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'])[extract(dow from d)::int + 1] || ' ' || extract(day from d)::int || ' ' || (array['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'])[extract(month from d)::int] || ' · 6 PM',
                                'en', (array['Sun','Mon','Tue','Wed','Thu','Fri','Sat'])[extract(dow from d)::int + 1] || ' ' || (array['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'])[extract(month from d)::int] || ' ' || extract(day from d)::int || ' · 6 PM'), d, d, '{}'::smallint[], 1080, 1 from businesses where id = b;
  d := (select (now() at time zone ci.timezone)::date + 1 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, jsonb_build_object('es', (array['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'])[extract(dow from d)::int + 1] || ' ' || extract(day from d)::int || ' ' || (array['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'])[extract(month from d)::int] || ' · 7 AM',
                                'en', (array['Sun','Mon','Tue','Wed','Thu','Fri','Sat'])[extract(dow from d)::int + 1] || ' ' || (array['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'])[extract(month from d)::int] || ' ' || extract(day from d)::int || ' · 7 AM'), d, d, '{}'::smallint[], 420, 1 from businesses where id = b;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Pase de un día","en":"Day pass"}'::jsonb, '{"es":"Sin membresía.","en":"No membership."}'::jsonb, 1000, 60, 'clase', '{}'::jsonb, 0, '{"https://images.pexels.com/photos/12250460/pexels-photo-12250460.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 2) returning id into it;
  d := (select (now() at time zone ci.timezone)::date + 0 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, jsonb_build_object('es', (array['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'])[extract(dow from d)::int + 1] || ' ' || extract(day from d)::int || ' ' || (array['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'])[extract(month from d)::int],
                                'en', (array['Sun','Mon','Tue','Wed','Thu','Fri','Sat'])[extract(dow from d)::int + 1] || ' ' || (array['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'])[extract(month from d)::int] || ' ' || extract(day from d)::int), d, d, '{}'::smallint[], null, 8 from businesses where id = b;
  d := (select (now() at time zone ci.timezone)::date + 1 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, jsonb_build_object('es', (array['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'])[extract(dow from d)::int + 1] || ' ' || extract(day from d)::int || ' ' || (array['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'])[extract(month from d)::int],
                                'en', (array['Sun','Mon','Tue','Wed','Thu','Fri','Sat'])[extract(dow from d)::int + 1] || ' ' || (array['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'])[extract(month from d)::int] || ' ' || extract(day from d)::int), d, d, '{}'::smallint[], null, 8 from businesses where id = b;
end $$;
do $$
declare b text := 'boxeo-el-campeon'; s bigint; it bigint; d date;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-DEPORTE') or exists (select 1 from insc_settings where business_id = b) then return; end if;
  insert into insc_settings (business_id, city_id, rubro, esp, contract_m, cancel_fee_cents, signup_cents, childcare, free_agents, league_until)
   select b, city_id, 'dep', true, 0, 0, 0, false, false,
          null from businesses where id = b;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Boxeo","en":"Boxing"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Boxeo · mes","en":"Boxing · month"}'::jsonb, '{"es":"Lunes a viernes 6 PM. Guantes prestados.","en":"Mon–Fri 6 PM. Loaner gloves."}'::jsonb, 6000, 60, 'mes', '{"g1":true}'::jsonb, 0, '{"https://images.pexels.com/photos/5750886/pexels-photo-5750886.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 0) returning id into it;
  d := (select (now() at time zone ci.timezone)::date + 4 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  d := d + (select min((x - extract(dow from d)::int + 7) % 7) from unnest(array[1,2,3,4,5]) x);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, '{"es":"Lun a Vie 6 PM","en":"Mon–Fri 6 PM"}'::jsonb, d, null, '{1,2,3,4,5}'::smallint[], 1080, 8 from businesses where id = b;
  d := (select (now() at time zone ci.timezone)::date + 4 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, jsonb_build_object('es', (array['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'])[extract(dow from d)::int + 1] || ' ' || extract(day from d)::int || ' ' || (array['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'])[extract(month from d)::int] || ' · 6 AM',
                                'en', (array['Sun','Mon','Tue','Wed','Thu','Fri','Sat'])[extract(dow from d)::int + 1] || ' ' || (array['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'])[extract(month from d)::int] || ' ' || extract(day from d)::int || ' · 6 AM'), d, null, '{}'::smallint[], 360, 8 from businesses where id = b;
end $$;
do $$
declare b text := 'zumba-con-yari'; s bigint; it bigint; d date;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-DEPORTE') or exists (select 1 from insc_settings where business_id = b) then return; end if;
  insert into insc_settings (business_id, city_id, rubro, esp, contract_m, cancel_fee_cents, signup_cents, childcare, free_agents, league_until)
   select b, city_id, 'dep', true, 0, 0, 0, true, false,
          null from businesses where id = b;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Clases","en":"Classes"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Zumba · mes","en":"Zumba · month"}'::jsonb, '{"es":"Todas las clases. Cuidan a los niños.","en":"All classes. Childcare included."}'::jsonb, 4000, 60, 'mes', '{"g1":true,"inc":[{"es":"Cuidado de niños","en":"Childcare"}]}'::jsonb, 0, '{"https://images.pexels.com/photos/4090012/pexels-photo-4090012.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 0) returning id into it;
  d := (select (now() at time zone ci.timezone)::date + 1 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, '{"es":"6 AM","en":"6 AM"}'::jsonb, d, null, '{}'::smallint[], 360, 8 from businesses where id = b;
  d := (select (now() at time zone ci.timezone)::date + 0 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, '{"es":"7 PM","en":"7 PM"}'::jsonb, d, null, '{}'::smallint[], 1140, 8 from businesses where id = b;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Clase suelta","en":"Drop-in class"}'::jsonb, '{"es":"Paga solo el día que vas.","en":"Pay only the day you go."}'::jsonb, 800, 60, 'clase', '{}'::jsonb, 0, '{"https://images.pexels.com/photos/3873002/pexels-photo-3873002.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 1) returning id into it;
  d := (select (now() at time zone ci.timezone)::date + 0 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, jsonb_build_object('es', (array['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'])[extract(dow from d)::int + 1] || ' ' || extract(day from d)::int || ' ' || (array['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'])[extract(month from d)::int] || ' · 7 PM',
                                'en', (array['Sun','Mon','Tue','Wed','Thu','Fri','Sat'])[extract(dow from d)::int + 1] || ' ' || (array['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'])[extract(month from d)::int] || ' ' || extract(day from d)::int || ' · 7 PM'), d, d, '{}'::smallint[], 1140, 8 from businesses where id = b;
  d := (select (now() at time zone ci.timezone)::date + 1 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, jsonb_build_object('es', (array['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'])[extract(dow from d)::int + 1] || ' ' || extract(day from d)::int || ' ' || (array['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'])[extract(month from d)::int] || ' · 6 AM',
                                'en', (array['Sun','Mon','Tue','Wed','Thu','Fri','Sat'])[extract(dow from d)::int + 1] || ' ' || (array['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'])[extract(month from d)::int] || ' ' || extract(day from d)::int || ' · 6 AM'), d, d, '{}'::smallint[], 360, 8 from businesses where id = b;
end $$;
do $$
declare b text := 'liga-latina-futbol'; s bigint; it bigint; d date;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-DEPORTE') or exists (select 1 from insc_settings where business_id = b) then return; end if;
  insert into insc_settings (business_id, city_id, rubro, esp, contract_m, cancel_fee_cents, signup_cents, childcare, free_agents, league_until)
   select b, city_id, 'dep', true, 0, 0, 0, false, false,
          (now() at time zone 'America/New_York')::date + 3 from businesses where id = b;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Liga","en":"League"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Equipo · temporada de otoño","en":"Team · fall season"}'::jsonb, '{"es":"10 fechas los domingos, árbitro y cancha incluidos.","en":"10 Sunday games, referee and field included."}'::jsonb, 45000, 60, 'curso', '{"sem":10,"dep":10000,"team":true,"inc":[{"es":"Árbitro","en":"Referee"},{"es":"Cancha","en":"Field"}]}'::jsonb, 10000, '{"https://images.pexels.com/photos/9402855/pexels-photo-9402855.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 0) returning id into it;
  d := (select (now() at time zone ci.timezone)::date + 10 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, jsonb_build_object('es', 'Empieza el ' || extract(day from d)::int || ' ' || (array['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'])[extract(month from d)::int],
                                'en', 'Starts ' || (array['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'])[extract(month from d)::int] || ' ' || extract(day from d)::int), d, d + 69, '{}'::smallint[], null, 4 from businesses where id = b;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Cancha por hora","en":"Field by the hour"}'::jsonb, '{"es":"Fútbol 7, con luz.","en":"7-a-side, lit."}'::jsonb, 6000, 60, 'hora', '{"per_field":true}'::jsonb, 0, '{"https://images.pexels.com/photos/186239/pexels-photo-186239.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 1) returning id into it;
  d := (select (now() at time zone ci.timezone)::date + 0 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, jsonb_build_object('es', (array['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'])[extract(dow from d)::int + 1] || ' ' || extract(day from d)::int || ' ' || (array['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'])[extract(month from d)::int] || ' · 7 PM',
                                'en', (array['Sun','Mon','Tue','Wed','Thu','Fri','Sat'])[extract(dow from d)::int + 1] || ' ' || (array['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'])[extract(month from d)::int] || ' ' || extract(day from d)::int || ' · 7 PM'), d, d, '{}'::smallint[], 1140, 1 from businesses where id = b;
  d := (select (now() at time zone ci.timezone)::date + 2 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  d := d + (select min((x - extract(dow from d)::int + 7) % 7) from unnest(array[6]) x);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, '{"es":"Sáb 10 AM","en":"Sat 10 AM"}'::jsonb, d, d, '{6}'::smallint[], 600, 1 from businesses where id = b;
end $$;
do $$
declare b text := 'softbol-dominicano'; s bigint; it bigint; d date;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-DEPORTE') or exists (select 1 from insc_settings where business_id = b) then return; end if;
  insert into insc_settings (business_id, city_id, rubro, esp, contract_m, cancel_fee_cents, signup_cents, childcare, free_agents, league_until)
   select b, city_id, 'dep', true, 0, 0, 0, false, true,
          (now() at time zone 'America/New_York')::date + 2 from businesses where id = b;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Liga","en":"League"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Jugador · temporada","en":"Player · season"}'::jsonb, '{"es":"Te ponen en un equipo. Camiseta incluida.","en":"You are placed on a team. Jersey included."}'::jsonb, 6000, 60, 'curso', '{"sem":8,"dep":2000,"team":false,"inc":[{"es":"Camiseta","en":"Jersey"}]}'::jsonb, 2000, '{"https://images.pexels.com/photos/5184676/pexels-photo-5184676.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 0) returning id into it;
  d := (select (now() at time zone ci.timezone)::date + 9 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, jsonb_build_object('es', 'Empieza el ' || extract(day from d)::int || ' ' || (array['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'])[extract(month from d)::int],
                                'en', 'Starts ' || (array['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'])[extract(month from d)::int] || ' ' || extract(day from d)::int), d, d + 55, '{}'::smallint[], null, 12 from businesses where id = b;
end $$;
do $$
declare b text := 'hierro-crossfit'; s bigint; it bigint; d date;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-DEPORTE') or exists (select 1 from insc_settings where business_id = b) then return; end if;
  insert into insc_settings (business_id, city_id, rubro, esp, contract_m, cancel_fee_cents, signup_cents, childcare, free_agents, league_until)
   select b, city_id, 'dep', true, 0, 0, 3000, false, false,
          null from businesses where id = b;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Membresías","en":"Memberships"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"CrossFit · mes","en":"CrossFit · month"}'::jsonb, '{"es":"Clases sin límite, de lunes a sábado. Te enseñan cada movimiento antes de cargar peso.","en":"Unlimited classes, Monday to Saturday. Every movement is taught before you add weight."}'::jsonb, 9500, 60, 'mes', '{"g1":true,"inc":[{"es":"Clases sin límite","en":"Unlimited classes"},{"es":"Plan de pesas","en":"Lifting plan"}]}'::jsonb, 0, '{"https://images.pexels.com/photos/9958671/pexels-photo-9958671.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 0) returning id into it;
  d := (select (now() at time zone ci.timezone)::date + 1 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, '{"es":"5 AM","en":"5 AM"}'::jsonb, d, null, '{}'::smallint[], 300, 8 from businesses where id = b;
  d := (select (now() at time zone ci.timezone)::date + 0 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, '{"es":"6 PM","en":"6 PM"}'::jsonb, d, null, '{}'::smallint[], 1080, 8 from businesses where id = b;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Pase de un día","en":"Day pass"}'::jsonb, '{"es":"Una clase de 1 hora, sin membresía.","en":"One 1-hour class, no membership."}'::jsonb, 2000, 60, 'clase', '{}'::jsonb, 0, '{"https://images.pexels.com/photos/7676548/pexels-photo-7676548.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 1) returning id into it;
  d := (select (now() at time zone ci.timezone)::date + 0 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, jsonb_build_object('es', (array['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'])[extract(dow from d)::int + 1] || ' ' || extract(day from d)::int || ' ' || (array['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'])[extract(month from d)::int] || ' · 6 PM',
                                'en', (array['Sun','Mon','Tue','Wed','Thu','Fri','Sat'])[extract(dow from d)::int + 1] || ' ' || (array['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'])[extract(month from d)::int] || ' ' || extract(day from d)::int || ' · 6 PM'), d, d, '{}'::smallint[], 1080, 8 from businesses where id = b;
  d := (select (now() at time zone ci.timezone)::date + 1 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, jsonb_build_object('es', (array['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'])[extract(dow from d)::int + 1] || ' ' || extract(day from d)::int || ' ' || (array['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'])[extract(month from d)::int] || ' · 5 AM',
                                'en', (array['Sun','Mon','Tue','Wed','Thu','Fri','Sat'])[extract(dow from d)::int + 1] || ' ' || (array['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'])[extract(month from d)::int] || ' ' || extract(day from d)::int || ' · 5 AM'), d, d, '{}'::smallint[], 300, 8 from businesses where id = b;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Pesas · sesión personal","en":"Lifting · personal session"}'::jsonb, '{"es":"Técnica de levantamiento olímpico, 1 hora con el coach.","en":"Olympic lifting technique, 1 hour with the coach."}'::jsonb, 4000, 60, 'hora', '{}'::jsonb, 0, '{"https://images.pexels.com/photos/703012/pexels-photo-703012.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 2) returning id into it;
  d := (select (now() at time zone ci.timezone)::date + 0 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, jsonb_build_object('es', (array['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'])[extract(dow from d)::int + 1] || ' ' || extract(day from d)::int || ' ' || (array['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'])[extract(month from d)::int] || ' · 12 PM',
                                'en', (array['Sun','Mon','Tue','Wed','Thu','Fri','Sat'])[extract(dow from d)::int + 1] || ' ' || (array['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'])[extract(month from d)::int] || ' ' || extract(day from d)::int || ' · 12 PM'), d, d, '{}'::smallint[], 720, 1 from businesses where id = b;
  d := (select (now() at time zone ci.timezone)::date + 2 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  d := d + (select min((x - extract(dow from d)::int + 7) % 7) from unnest(array[6]) x);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, '{"es":"Sáb 9 AM","en":"Sat 9 AM"}'::jsonb, d, d, '{6}'::smallint[], 540, 1 from businesses where id = b;
end $$;
do $$
declare b text := 'ritmo-spin'; s bigint; it bigint; d date;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-DEPORTE') or exists (select 1 from insc_settings where business_id = b) then return; end if;
  insert into insc_settings (business_id, city_id, rubro, esp, contract_m, cancel_fee_cents, signup_cents, childcare, free_agents, league_until)
   select b, city_id, 'dep', true, 0, 0, 0, false, false,
          null from businesses where id = b;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Clases","en":"Classes"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Spinning · mes","en":"Spinning · month"}'::jsonb, '{"es":"Todas las clases del mes. Bicicleta y zapatos incluidos.","en":"Every class of the month. Bike and shoes included."}'::jsonb, 6500, 60, 'mes', '{"g1":true,"inc":[{"es":"Zapatos prestados","en":"Loaner shoes"}]}'::jsonb, 0, '{"https://images.pexels.com/photos/8766368/pexels-photo-8766368.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 0) returning id into it;
  d := (select (now() at time zone ci.timezone)::date + 1 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, '{"es":"6 AM","en":"6 AM"}'::jsonb, d, null, '{}'::smallint[], 360, 8 from businesses where id = b;
  d := (select (now() at time zone ci.timezone)::date + 0 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, '{"es":"6 PM","en":"6 PM"}'::jsonb, d, null, '{}'::smallint[], 1080, 8 from businesses where id = b;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Clase suelta","en":"Drop-in class"}'::jsonb, '{"es":"45 minutos, a tu ritmo.","en":"45 minutes, at your pace."}'::jsonb, 1200, 60, 'clase', '{}'::jsonb, 0, '{"https://images.pexels.com/photos/12905809/pexels-photo-12905809.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 1) returning id into it;
  d := (select (now() at time zone ci.timezone)::date + 0 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, jsonb_build_object('es', (array['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'])[extract(dow from d)::int + 1] || ' ' || extract(day from d)::int || ' ' || (array['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'])[extract(month from d)::int] || ' · 6 PM',
                                'en', (array['Sun','Mon','Tue','Wed','Thu','Fri','Sat'])[extract(dow from d)::int + 1] || ' ' || (array['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'])[extract(month from d)::int] || ' ' || extract(day from d)::int || ' · 6 PM'), d, d, '{}'::smallint[], 1080, 8 from businesses where id = b;
  d := (select (now() at time zone ci.timezone)::date + 1 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, jsonb_build_object('es', (array['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'])[extract(dow from d)::int + 1] || ' ' || extract(day from d)::int || ' ' || (array['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'])[extract(month from d)::int] || ' · 6 AM',
                                'en', (array['Sun','Mon','Tue','Wed','Thu','Fri','Sat'])[extract(dow from d)::int + 1] || ' ' || (array['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'])[extract(month from d)::int] || ' ' || extract(day from d)::int || ' · 6 AM'), d, d, '{}'::smallint[], 360, 8 from businesses where id = b;
end $$;
do $$
declare b text := 'cuerpo-en-balance'; s bigint; it bigint; d date;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-DEPORTE') or exists (select 1 from insc_settings where business_id = b) then return; end if;
  insert into insc_settings (business_id, city_id, rubro, esp, contract_m, cancel_fee_cents, signup_cents, childcare, free_agents, league_until)
   select b, city_id, 'dep', true, 6, 5000, 0, false, false,
          null from businesses where id = b;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Clases","en":"Classes"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Pilates · mes (8 clases)","en":"Pilates · month (8 classes)"}'::jsonb, '{"es":"Dos clases a la semana en máquina, grupos de 6.","en":"Two reformer classes a week, groups of 6."}'::jsonb, 14000, 60, 'mes', '{}'::jsonb, 0, '{"https://images.pexels.com/photos/25599821/pexels-photo-25599821.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 0) returning id into it;
  d := (select (now() at time zone ci.timezone)::date + 4 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  d := d + (select min((x - extract(dow from d)::int + 7) % 7) from unnest(array[2,4]) x);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, '{"es":"Mar y Jue 7 AM","en":"Tue & Thu 7 AM"}'::jsonb, d, null, '{2,4}'::smallint[], 420, 8 from businesses where id = b;
  d := (select (now() at time zone ci.timezone)::date + 4 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  d := d + (select min((x - extract(dow from d)::int + 7) % 7) from unnest(array[1,3]) x);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, '{"es":"Lun y Mié 6 PM","en":"Mon & Wed 6 PM"}'::jsonb, d, null, '{1,3}'::smallint[], 1080, 8 from businesses where id = b;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Clase suelta","en":"Drop-in class"}'::jsonb, '{"es":"Una clase en máquina, 50 minutos.","en":"One reformer class, 50 minutes."}'::jsonb, 2500, 60, 'clase', '{}'::jsonb, 0, '{"https://images.pexels.com/photos/25596671/pexels-photo-25596671.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 1) returning id into it;
  d := (select (now() at time zone ci.timezone)::date + 0 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, jsonb_build_object('es', (array['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'])[extract(dow from d)::int + 1] || ' ' || extract(day from d)::int || ' ' || (array['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'])[extract(month from d)::int] || ' · 6 PM',
                                'en', (array['Sun','Mon','Tue','Wed','Thu','Fri','Sat'])[extract(dow from d)::int + 1] || ' ' || (array['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'])[extract(month from d)::int] || ' ' || extract(day from d)::int || ' · 6 PM'), d, d, '{}'::smallint[], 1080, 8 from businesses where id = b;
  d := (select (now() at time zone ci.timezone)::date + 2 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  d := d + (select min((x - extract(dow from d)::int + 7) % 7) from unnest(array[6]) x);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, '{"es":"Sáb 9 AM","en":"Sat 9 AM"}'::jsonb, d, d, '{6}'::smallint[], 540, 8 from businesses where id = b;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Nutrición deportiva · primera cita","en":"Sports nutrition · first visit"}'::jsonb, '{"es":"Un plan de comidas para tu entrenamiento, por escrito. No es una consulta médica.","en":"A written meal plan for your training. Not a medical visit."}'::jsonb, 4500, 60, 'hora', '{}'::jsonb, 0, '{}'::text[], 2) returning id into it;
  d := (select (now() at time zone ci.timezone)::date + 1 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, jsonb_build_object('es', (array['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'])[extract(dow from d)::int + 1] || ' ' || extract(day from d)::int || ' ' || (array['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'])[extract(month from d)::int] || ' · 10 AM',
                                'en', (array['Sun','Mon','Tue','Wed','Thu','Fri','Sat'])[extract(dow from d)::int + 1] || ' ' || (array['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'])[extract(month from d)::int] || ' ' || extract(day from d)::int || ' · 10 AM'), d, d, '{}'::smallint[], 600, 1 from businesses where id = b;
  d := (select (now() at time zone ci.timezone)::date + 2 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  d := d + (select min((x - extract(dow from d)::int + 7) % 7) from unnest(array[6]) x);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, '{"es":"Sáb 11 AM","en":"Sat 11 AM"}'::jsonb, d, d, '{6}'::smallint[], 660, 1 from businesses where id = b;
end $$;
do $$
declare b text := 'dojo-hazleton'; s bigint; it bigint; d date;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-DEPORTE') or exists (select 1 from insc_settings where business_id = b) then return; end if;
  insert into insc_settings (business_id, city_id, rubro, esp, contract_m, cancel_fee_cents, signup_cents, childcare, free_agents, league_until)
   select b, city_id, 'dep', true, 3, 0, 4000, false, false,
          null from businesses where id = b;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Clases","en":"Classes"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Karate y taekwondo · mes","en":"Karate & taekwondo · month"}'::jsonb, '{"es":"Adultos, lunes a viernes 6 PM. Por cinturón.","en":"Adults, Mon–Fri 6 PM. By belt level."}'::jsonb, 7000, 60, 'mes', '{"g1":true,"inc":[{"es":"Uniforme con la inscripción","en":"Uniform with signup"}]}'::jsonb, 0, '{"https://images.pexels.com/photos/7045585/pexels-photo-7045585.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 0) returning id into it;
  d := (select (now() at time zone ci.timezone)::date + 4 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  d := d + (select min((x - extract(dow from d)::int + 7) % 7) from unnest(array[1,2,3,4,5]) x);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, '{"es":"Lun a Vie 6 PM","en":"Mon–Fri 6 PM"}'::jsonb, d, null, '{1,2,3,4,5}'::smallint[], 1080, 8 from businesses where id = b;
  d := (select (now() at time zone ci.timezone)::date + 2 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  d := d + (select min((x - extract(dow from d)::int + 7) % 7) from unnest(array[6]) x);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, '{"es":"Sáb 9 AM","en":"Sat 9 AM"}'::jsonb, d, null, '{6}'::smallint[], 540, 8 from businesses where id = b;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Lucha · mes","en":"Wrestling · month"}'::jsonb, '{"es":"Martes y jueves 7:30 PM, sobre colchoneta.","en":"Tue & Thu 7:30 PM, on the mat."}'::jsonb, 6000, 60, 'mes', '{"g1":true}'::jsonb, 0, '{"https://images.pexels.com/photos/7045722/pexels-photo-7045722.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 1) returning id into it;
  d := (select (now() at time zone ci.timezone)::date + 5 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  d := d + (select min((x - extract(dow from d)::int + 7) % 7) from unnest(array[2,4]) x);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, '{"es":"Mar y Jue 7:30 PM","en":"Tue & Thu 7:30 PM"}'::jsonb, d, null, '{2,4}'::smallint[], 1170, 8 from businesses where id = b;
end $$;
do $$
declare b text := 'liga-basquet-voley'; s bigint; it bigint; d date;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-DEPORTE') or exists (select 1 from insc_settings where business_id = b) then return; end if;
  insert into insc_settings (business_id, city_id, rubro, esp, contract_m, cancel_fee_cents, signup_cents, childcare, free_agents, league_until)
   select b, city_id, 'dep', true, 0, 0, 0, false, true,
          (now() at time zone 'America/New_York')::date + 3 from businesses where id = b;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Liga","en":"League"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Equipo · básquet de invierno","en":"Team · winter basketball"}'::jsonb, '{"es":"10 fechas, miércoles en la noche. Árbitro y cancha techada incluidos.","en":"10 games, Wednesday nights. Referee and indoor court included."}'::jsonb, 35000, 60, 'curso', '{"sem":10,"dep":8000,"team":true,"inc":[{"es":"Árbitro","en":"Referee"},{"es":"Cancha techada","en":"Indoor court"}]}'::jsonb, 8000, '{"https://images.pexels.com/photos/13179883/pexels-photo-13179883.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 0) returning id into it;
  d := (select (now() at time zone ci.timezone)::date + 10 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, jsonb_build_object('es', 'Empieza el ' || extract(day from d)::int || ' ' || (array['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'])[extract(month from d)::int],
                                'en', 'Starts ' || (array['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'])[extract(month from d)::int] || ' ' || extract(day from d)::int), d, d + 69, '{}'::smallint[], null, 4 from businesses where id = b;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Jugador · voleibol mixto","en":"Player · coed volleyball"}'::jsonb, '{"es":"Te ponen en un equipo. 8 sábados.","en":"You are placed on a team. 8 Saturdays."}'::jsonb, 4000, 60, 'curso', '{"sem":8,"team":false}'::jsonb, 0, '{}'::text[], 1) returning id into it;
  d := (select (now() at time zone ci.timezone)::date + 10 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, jsonb_build_object('es', 'Empieza el ' || extract(day from d)::int || ' ' || (array['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'])[extract(month from d)::int],
                                'en', 'Starts ' || (array['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'])[extract(month from d)::int] || ' ' || extract(day from d)::int), d, d + 55, '{}'::smallint[], null, 12 from businesses where id = b;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Cancha por hora","en":"Court by the hour"}'::jsonb, '{"es":"Básquet o voleibol, techada.","en":"Basketball or volleyball, indoor."}'::jsonb, 5000, 60, 'hora', '{"per_field":true}'::jsonb, 0, '{}'::text[], 2) returning id into it;
  d := (select (now() at time zone ci.timezone)::date + 0 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, jsonb_build_object('es', (array['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'])[extract(dow from d)::int + 1] || ' ' || extract(day from d)::int || ' ' || (array['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'])[extract(month from d)::int] || ' · 8 PM',
                                'en', (array['Sun','Mon','Tue','Wed','Thu','Fri','Sat'])[extract(dow from d)::int + 1] || ' ' || (array['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'])[extract(month from d)::int] || ' ' || extract(day from d)::int || ' · 8 PM'), d, d, '{}'::smallint[], 1200, 1 from businesses where id = b;
  d := (select (now() at time zone ci.timezone)::date + 3 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  d := d + (select min((x - extract(dow from d)::int + 7) % 7) from unnest(array[0]) x);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, '{"es":"Dom 1 PM","en":"Sun 1 PM"}'::jsonb, d, d, '{0}'::smallint[], 780, 1 from businesses where id = b;
end $$;
do $$
declare b text := 'aqua-hazleton'; s bigint; it bigint; d date;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-DEPORTE') or exists (select 1 from insc_settings where business_id = b) then return; end if;
  insert into insc_settings (business_id, city_id, rubro, esp, contract_m, cancel_fee_cents, signup_cents, childcare, free_agents, league_until)
   select b, city_id, 'dep', true, 0, 0, 0, false, false,
          null from businesses where id = b;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Alberca","en":"Pool"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Alberca · mes","en":"Pool · month"}'::jsonb, '{"es":"Nado libre todos los días. Salvavidas siempre.","en":"Open swim every day. Lifeguard always on duty."}'::jsonb, 4500, 60, 'mes', '{}'::jsonb, 0, '{"https://images.pexels.com/photos/346777/pexels-photo-346777.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 0) returning id into it;
  d := (select (now() at time zone ci.timezone)::date + 0 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, '{"es":"Empieza hoy","en":"Start today"}'::jsonb, d, null, '{}'::smallint[], null, 8 from businesses where id = b;
  d := (select (now() at time zone ci.timezone)::date + 4 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  d := d + (select min((x - extract(dow from d)::int + 7) % 7) from unnest(array[1]) x);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, '{"es":"Empieza el lunes","en":"Start Monday"}'::jsonb, d, null, '{1}'::smallint[], null, 8 from businesses where id = b;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Clase de natación","en":"Swim lesson"}'::jsonb, '{"es":"Niños desde 6 meses con mamá o papá; adultos que nunca aprendieron.","en":"Kids from 6 months with a parent; adults who never learned."}'::jsonb, 1500, 60, 'clase', '{}'::jsonb, 0, '{"https://images.pexels.com/photos/9044049/pexels-photo-9044049.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 1) returning id into it;
  d := (select (now() at time zone ci.timezone)::date + 2 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  d := d + (select min((x - extract(dow from d)::int + 7) % 7) from unnest(array[6]) x);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, '{"es":"Sáb 10 AM","en":"Sat 10 AM"}'::jsonb, d, d, '{6}'::smallint[], 600, 8 from businesses where id = b;
  d := (select (now() at time zone ci.timezone)::date + 5 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  d := d + (select min((x - extract(dow from d)::int + 7) % 7) from unnest(array[2]) x);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, '{"es":"Mar 6 PM","en":"Tue 6 PM"}'::jsonb, d, d, '{2}'::smallint[], 1080, 8 from businesses where id = b;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Pase de un día","en":"Day pass"}'::jsonb, '{"es":"Nado libre, sin membresía.","en":"Open swim, no membership."}'::jsonb, 800, 60, 'clase', '{}'::jsonb, 0, '{}'::text[], 2) returning id into it;
  d := (select (now() at time zone ci.timezone)::date + 0 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, jsonb_build_object('es', (array['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'])[extract(dow from d)::int + 1] || ' ' || extract(day from d)::int || ' ' || (array['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'])[extract(month from d)::int],
                                'en', (array['Sun','Mon','Tue','Wed','Thu','Fri','Sat'])[extract(dow from d)::int + 1] || ' ' || (array['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'])[extract(month from d)::int] || ' ' || extract(day from d)::int), d, d, '{}'::smallint[], null, 8 from businesses where id = b;
  d := (select (now() at time zone ci.timezone)::date + 1 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, jsonb_build_object('es', (array['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'])[extract(dow from d)::int + 1] || ' ' || extract(day from d)::int || ' ' || (array['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'])[extract(month from d)::int],
                                'en', (array['Sun','Mon','Tue','Wed','Thu','Fri','Sat'])[extract(dow from d)::int + 1] || ' ' || (array['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'])[extract(month from d)::int] || ' ' || extract(day from d)::int), d, d, '{}'::smallint[], null, 8 from businesses where id = b;
end $$;
insert into users (phone, first_name, last_name, lang, home_city_id) select '+15705550411', 'Anthony', 'Guzmán', 'es', 'hzl' where exists (select 1 from businesses where id = 'power-gym-hzl' and is_demo) on conflict (phone) do nothing;
insert into business_members (business_id, user_id, kind, display_name, role, status, show_on_page, panel_access, since_year, sort, same_as_business_hours) select 'power-gym-hzl', u.id, 'owner', 'Anthony Guzmán', '{"es":"Dueño y entrenador","en":"Owner and coach"}'::jsonb, 'active', true, '{all}', 2017, 0, true from users u where u.phone = '+15705550411' and exists (select 1 from businesses where id = 'power-gym-hzl' and is_demo) and not exists (select 1 from business_members m where m.business_id = 'power-gym-hzl' and m.kind = 'owner' and m.status = 'active');
insert into stripe_accounts (business_id, stripe_account_id, status, charges_enabled, payouts_enabled, requirements, bank_last4, simulated)
  select 'power-gym-hzl', 'acct_sim_power-gym-hzl', 'enabled', true, true, '[]'::jsonb, '4288', true where exists (select 1 from businesses where id = 'power-gym-hzl' and is_demo) on conflict (business_id) do nothing;
commit;
