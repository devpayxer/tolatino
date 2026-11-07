-- Generado por scripts/semilla/extraer-fe.cjs desde el prototipo. SOLO SANDBOX. No editar a mano.
begin;
do $$
declare b text := 'parroquia-santa-maria'; s bigint; it bigint; d date;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-FE') or exists (select 1 from fe_settings where business_id = b) then return; end if;
  insert into fe_settings (business_id, city_id, kind_override, bil, help, sinid, freq, h24, plan_n, rep_days, catequesis_open)
   select b, city_id, null, false, '{despensa,jovenes,bodas}'::text[], false, 'semana', false, 0, '5–7', true from businesses where id = b;
  insert into worship_times (business_id, city_id, dow, start_min, label, lang, kind, sort) select b, city_id, 6, 1080, '{"es":"Misa en español","en":"Spanish mass"}'::jsonb, 'es', 'misa', 0 from businesses where id = b on conflict do nothing;
  insert into worship_times (business_id, city_id, dow, start_min, label, lang, kind, sort) select b, city_id, 0, 720, '{"es":"Misa en español","en":"Spanish mass"}'::jsonb, 'es', 'misa', 1 from businesses where id = b on conflict do nothing;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Misas","en":"Masses"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Misa en español","en":"Spanish mass"}'::jsonb, '{"es":"Domingo 12 PM y sábado 6 PM.","en":"Sunday 12 PM and Saturday 6 PM."}'::jsonb, 0, 60, 'clase', '{"fe":"gratis"}'::jsonb, 0, '{"https://images.pexels.com/photos/19913305/pexels-photo-19913305.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 0) returning id into it;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Sacramentos","en":"Sacraments"}'::jsonb, 1) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Catecismo · primera comunión","en":"Catechism · first communion"}'::jsonb, '{"es":"2 años, los domingos después de misa.","en":"2 years, Sundays after mass."}'::jsonb, 6000, 60, 'curso', '{"fe":"don","sem":60,"dur":{"es":"2 años · los domingos después de misa","en":"2 years · Sundays after mass"},"inc":[{"es":"Libro","en":"Book"}],"no":[{"es":"La matrícula de $20 se paga en la parroquia.","en":"The $20 registration is paid at the parish."}]}'::jsonb, 0, '{"https://images.pexels.com/photos/5824134/pexels-photo-5824134.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 0) returning id into it;
  d := (select (now() at time zone ci.timezone)::date + 10 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, jsonb_build_object('es', 'Empieza el ' || extract(day from d)::int || ' ' || (array['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'])[extract(month from d)::int], 'en', 'Starts ' || (array['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'])[extract(month from d)::int] || ' ' || extract(day from d)::int), d, d + 419, '{}'::smallint[], null, 20 from businesses where id = b;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Bautizo","en":"Baptism"}'::jsonb, '{"es":"Charla para padres y padrinos el primer sábado del mes.","en":"Talk for parents and godparents the first Saturday of the month."}'::jsonb, 5000, 60, 'clase', '{"fe":"don","no":[{"es":"El donativo de $50 es sugerido; si no puedes, no se cobra.","en":"The $50 donation is suggested; if you cannot, there is no charge."}]}'::jsonb, 0, '{"https://images.pexels.com/photos/3212018/pexels-photo-3212018.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 1) returning id into it;
  d := (select (now() at time zone ci.timezone)::date + 9 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, jsonb_build_object('es', 'Charla · ' || (array['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'])[extract(dow from d)::int + 1] || ' ' || extract(day from d)::int || ' ' || (array['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'])[extract(month from d)::int], 'en', 'Talk · ' || (array['Sun','Mon','Tue','Wed','Thu','Fri','Sat'])[extract(dow from d)::int + 1] || ' ' || (array['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'])[extract(month from d)::int] || ' ' || extract(day from d)::int), d, d, '{}'::smallint[], null, 20 from businesses where id = b;
  d := (select (now() at time zone ci.timezone)::date + 44 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, jsonb_build_object('es', 'Charla · ' || (array['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'])[extract(dow from d)::int + 1] || ' ' || extract(day from d)::int || ' ' || (array['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'])[extract(month from d)::int], 'en', 'Talk · ' || (array['Sun','Mon','Tue','Wed','Thu','Fri','Sat'])[extract(dow from d)::int + 1] || ' ' || (array['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'])[extract(month from d)::int] || ' ' || extract(day from d)::int), d, d, '{}'::smallint[], null, 20 from businesses where id = b;
end $$;
do $$
declare b text := 'iglesia-fuente-de-vida'; s bigint; it bigint; d date;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-FE') or exists (select 1 from fe_settings where business_id = b) then return; end if;
  insert into fe_settings (business_id, city_id, kind_override, bil, help, sinid, freq, h24, plan_n, rep_days, catequesis_open)
   select b, city_id, null, false, '{despensa,transporte,jovenes,ninos,bodas}'::text[], false, 'semana', false, 0, '5–7', true from businesses where id = b;
  insert into worship_times (business_id, city_id, dow, start_min, label, lang, kind, sort) select b, city_id, 0, 660, '{"es":"Culto","en":"Service"}'::jsonb, 'es', 'culto', 0 from businesses where id = b on conflict do nothing;
  insert into worship_times (business_id, city_id, dow, start_min, label, lang, kind, sort) select b, city_id, 5, 1140, '{"es":"Jóvenes","en":"Youth"}'::jsonb, 'es', 'grupo', 1 from businesses where id = b on conflict do nothing;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Cultos","en":"Services"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Culto del domingo","en":"Sunday service"}'::jsonb, '{"es":"Domingo 11 AM. Transporte gratis desde Alter St.","en":"Sunday 11 AM. Free ride from Alter St."}'::jsonb, 0, 60, 'clase', '{"fe":"gratis"}'::jsonb, 0, '{"https://images.pexels.com/photos/34328510/pexels-photo-34328510.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 0) returning id into it;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Jóvenes","en":"Youth group"}'::jsonb, '{"es":"Viernes 7 PM, de 13 a 20 años.","en":"Fridays 7 PM, ages 13 to 20."}'::jsonb, 0, 60, 'clase', '{"fe":"gratis"}'::jsonb, 0, '{"https://images.pexels.com/photos/17664540/pexels-photo-17664540.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 1) returning id into it;
end $$;
do $$
declare b text := 'iglesia-pentecostal-rhema'; s bigint; it bigint; d date;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-FE') or exists (select 1 from fe_settings where business_id = b) then return; end if;
  insert into fe_settings (business_id, city_id, kind_override, bil, help, sinid, freq, h24, plan_n, rep_days, catequesis_open)
   select b, city_id, null, false, '{jovenes,bodas}'::text[], false, 'semana', false, 0, '5–7', true from businesses where id = b;
  insert into worship_times (business_id, city_id, dow, start_min, label, lang, kind, sort) select b, city_id, 0, 600, '{"es":"Culto","en":"Service"}'::jsonb, 'es', 'culto', 0 from businesses where id = b on conflict do nothing;
  insert into worship_times (business_id, city_id, dow, start_min, label, lang, kind, sort) select b, city_id, 3, 1140, '{"es":"Estudio bíblico","en":"Bible study"}'::jsonb, 'es', 'grupo', 1 from businesses where id = b on conflict do nothing;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Cultos","en":"Services"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Estudio bíblico","en":"Bible study"}'::jsonb, '{"es":"Miércoles 7 PM.","en":"Wednesdays 7 PM."}'::jsonb, 0, 60, 'clase', '{"fe":"gratis"}'::jsonb, 0, '{"https://images.pexels.com/photos/24023591/pexels-photo-24023591.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 0) returning id into it;
end $$;
do $$
declare b text := 'despensa-manos-unidas'; s bigint; it bigint; d date;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-FE') or exists (select 1 from fe_settings where business_id = b) then return; end if;
  insert into fe_settings (business_id, city_id, kind_override, bil, help, sinid, freq, h24, plan_n, rep_days, catequesis_open)
   select b, city_id, null, false, '{despensa,ropa}'::text[], true, 'semana', false, 0, '5–7', true from businesses where id = b;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Ayuda","en":"Help"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Despensa de alimentos","en":"Food pantry"}'::jsonb, '{"es":"Una caja por familia a la semana. Sin papeles ni cita.","en":"One box per family per week. No papers or appointment."}'::jsonb, 0, 60, 'clase', '{"fe":"gratis"}'::jsonb, 0, '{"https://images.pexels.com/photos/6995201/pexels-photo-6995201.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 0) returning id into it;
end $$;
do $$
declare b text := 'funeraria-la-paz'; s bigint; it bigint; d date;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-FE') or exists (select 1 from fe_settings where business_id = b) then return; end if;
  insert into fe_settings (business_id, city_id, kind_override, bil, help, sinid, freq, h24, plan_n, rep_days, catequesis_open)
   select b, city_id, null, false, '{}'::text[], false, 'semana', true, 12, '5–7', true from businesses where id = b;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Servicios","en":"Services"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Servicio funerario completo","en":"Full funeral service"}'::jsonb, '{"es":"Velorio, misa y entierro en Hazleton. Precio por escrito antes de firmar.","en":"Wake, mass and burial in Hazleton. Written price before signing."}'::jsonb, 680000, 60, 'fijo', '{"fe":"tot","inc":[{"es":"Velorio 4 horas","en":"4-hour wake"},{"es":"Traslado","en":"Transport"},{"es":"Trámites","en":"Paperwork"}],"no":[{"es":"El terreno del cementerio va aparte.","en":"The cemetery plot is extra."}]}'::jsonb, 0, '{"https://images.pexels.com/photos/7317682/pexels-photo-7317682.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 0) returning id into it;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Repatriación a República Dominicana","en":"Repatriation to the Dominican Republic"}'::jsonb, '{"es":"Trámites con el consulado y vuelo. 5–7 días.","en":"Consulate paperwork and flight. 5–7 days."}'::jsonb, 520000, 60, 'fijo', '{"fe":"tot","inc":[{"es":"Trámites del consulado","en":"Consulate paperwork"},{"es":"Vuelo","en":"Flight"}]}'::jsonb, 0, '{"https://images.pexels.com/photos/3212018/pexels-photo-3212018.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 1) returning id into it;
end $$;
do $$
declare b text := 'iglesia-bautista-hispana'; s bigint; it bigint; d date;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-FE') or exists (select 1 from fe_settings where business_id = b) then return; end if;
  insert into fe_settings (business_id, city_id, kind_override, bil, help, sinid, freq, h24, plan_n, rep_days, catequesis_open)
   select b, city_id, null, false, '{ninos}'::text[], false, 'semana', false, 0, '5–7', true from businesses where id = b;
  insert into worship_times (business_id, city_id, dow, start_min, label, lang, kind, sort) select b, city_id, 0, 600, '{"es":"Culto","en":"Service"}'::jsonb, 'es', 'culto', 0 from businesses where id = b on conflict do nothing;
  insert into worship_times (business_id, city_id, dow, start_min, label, lang, kind, sort) select b, city_id, 3, 1140, '{"es":"Culto","en":"Service"}'::jsonb, 'es', 'culto', 1 from businesses where id = b on conflict do nothing;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Cultos","en":"Services"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Culto del domingo","en":"Culto del domingo"}'::jsonb, '{"es":"Domingo 10 AM, en español. Escuela bíblica para niños.","en":"Domingo 10 AM, en español. Escuela bíblica para niños."}'::jsonb, 0, 60, 'clase', '{"fe":"gratis"}'::jsonb, 0, '{}'::text[], 0) returning id into it;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Oración y estudio","en":"Oración y estudio"}'::jsonb, '{"es":"Miércoles 7 PM.","en":"Miércoles 7 PM."}'::jsonb, 0, 60, 'clase', '{"fe":"gratis"}'::jsonb, 0, '{}'::text[], 1) returning id into it;
end $$;
do $$
declare b text := 'iglesia-adventista-hzl'; s bigint; it bigint; d date;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-FE') or exists (select 1 from fe_settings where business_id = b) then return; end if;
  insert into fe_settings (business_id, city_id, kind_override, bil, help, sinid, freq, h24, plan_n, rep_days, catequesis_open)
   select b, city_id, null, false, '{despensa}'::text[], false, 'semana', false, 0, '5–7', true from businesses where id = b;
  insert into worship_times (business_id, city_id, dow, start_min, label, lang, kind, sort) select b, city_id, 6, 570, '{"es":"Culto","en":"Service"}'::jsonb, 'es', 'culto', 0 from businesses where id = b on conflict do nothing;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Cultos","en":"Services"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Culto del sábado","en":"Culto del sábado"}'::jsonb, '{"es":"Sábado 9:30 AM, en español.","en":"Sábado 9:30 AM, en español."}'::jsonb, 0, 60, 'clase', '{"fe":"gratis"}'::jsonb, 0, '{}'::text[], 0) returning id into it;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Banco de comida","en":"Banco de comida"}'::jsonb, '{"es":"El primer domingo del mes, 10 AM. Gratis para quien lo necesite.","en":"El primer domingo del mes, 10 AM. Gratis para quien lo necesite."}'::jsonb, 0, 60, 'clase', '{"fe":"gratis"}'::jsonb, 0, '{}'::text[], 1) returning id into it;
end $$;
do $$
declare b text := 'iglesia-metodista-esperanza'; s bigint; it bigint; d date;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-FE') or exists (select 1 from fe_settings where business_id = b) then return; end if;
  insert into fe_settings (business_id, city_id, kind_override, bil, help, sinid, freq, h24, plan_n, rep_days, catequesis_open)
   select b, city_id, null, true, '{despensa,ninos}'::text[], false, 'semana', false, 0, '5–7', true from businesses where id = b;
  insert into worship_times (business_id, city_id, dow, start_min, label, lang, kind, sort) select b, city_id, 0, 600, '{"es":"Culto","en":"Service"}'::jsonb, 'bil', 'culto', 0 from businesses where id = b on conflict do nothing;
  insert into worship_times (business_id, city_id, dow, start_min, label, lang, kind, sort) select b, city_id, 2, 1140, '{"es":"Damas","en":"Women"}'::jsonb, 'bil', 'grupo', 1 from businesses where id = b on conflict do nothing;
  insert into worship_times (business_id, city_id, dow, start_min, label, lang, kind, sort) select b, city_id, 6, 480, '{"es":"Varones","en":"Men"}'::jsonb, 'bil', 'grupo', 2 from businesses where id = b on conflict do nothing;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Cultos y grupos","en":"Services & groups"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Culto del domingo","en":"Sunday service"}'::jsonb, '{"es":"Domingo 10 AM, en español e inglés.","en":"Sunday 10 AM, in Spanish and English."}'::jsonb, 0, 60, 'clase', '{"fe":"gratis"}'::jsonb, 0, '{"https://images.pexels.com/photos/27686681/pexels-photo-27686681.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 0) returning id into it;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Escuela dominical","en":"Sunday school"}'::jsonb, '{"es":"Domingo 9 AM, para niños y adultos.","en":"Sunday 9 AM, for kids and adults."}'::jsonb, 0, 60, 'clase', '{"fe":"gratis"}'::jsonb, 0, '{"https://images.pexels.com/photos/8815031/pexels-photo-8815031.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 1) returning id into it;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Ministerio de damas","en":"Women''s ministry"}'::jsonb, '{"es":"Martes 7 PM.","en":"Tuesdays 7 PM."}'::jsonb, 0, 60, 'clase', '{"fe":"gratis"}'::jsonb, 0, '{"https://images.pexels.com/photos/8815031/pexels-photo-8815031.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 2) returning id into it;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Desayuno de varones","en":"Men''s breakfast"}'::jsonb, '{"es":"Sábado 8 AM.","en":"Saturdays 8 AM."}'::jsonb, 0, 60, 'clase', '{"fe":"gratis"}'::jsonb, 0, '{"https://images.pexels.com/photos/27686681/pexels-photo-27686681.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 3) returning id into it;
end $$;
do $$
declare b text := 'comunidad-cristiana-nueva-vida'; s bigint; it bigint; d date;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-FE') or exists (select 1 from fe_settings where business_id = b) then return; end if;
  insert into fe_settings (business_id, city_id, kind_override, bil, help, sinid, freq, h24, plan_n, rep_days, catequesis_open)
   select b, city_id, null, false, '{transporte,jovenes}'::text[], false, 'semana', false, 0, '5–7', true from businesses where id = b;
  insert into worship_times (business_id, city_id, dow, start_min, label, lang, kind, sort) select b, city_id, 0, 660, '{"es":"Culto","en":"Service"}'::jsonb, 'es', 'culto', 0 from businesses where id = b on conflict do nothing;
  insert into worship_times (business_id, city_id, dow, start_min, label, lang, kind, sort) select b, city_id, 4, 1140, '{"es":"Recuperación","en":"Recovery"}'::jsonb, 'es', 'grupo', 1 from businesses where id = b on conflict do nothing;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Cultos y grupos","en":"Services & groups"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Culto del domingo","en":"Sunday service"}'::jsonb, '{"es":"Domingo 11 AM. Transporte gratis si llamas antes.","en":"Sunday 11 AM. Free ride if you call ahead."}'::jsonb, 0, 60, 'clase', '{"fe":"gratis"}'::jsonb, 0, '{"https://images.pexels.com/photos/23015910/pexels-photo-23015910.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 0) returning id into it;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Celebremos la Recuperación","en":"Celebrate Recovery"}'::jsonb, '{"es":"Jueves 7 PM. Grupo cristiano de 12 pasos para adicciones y heridas.","en":"Thursdays 7 PM. Christian 12-step group for addictions and hurts."}'::jsonb, 0, 60, 'clase', '{"fe":"gratis"}'::jsonb, 0, '{"https://images.pexels.com/photos/7447253/pexels-photo-7447253.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 1) returning id into it;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Consejería cristiana","en":"Christian counseling"}'::jsonb, '{"es":"Con un pastor, una hora, con cita. No es terapia médica.","en":"With a pastor, one hour, by appointment. Not medical therapy."}'::jsonb, 0, 60, 'clase', '{"fe":"gratis","dur":{"es":"Con cita · 1 hora","en":"By appointment · 1 hour"}}'::jsonb, 0, '{"https://images.pexels.com/photos/7447253/pexels-photo-7447253.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 2) returning id into it;
end $$;
do $$
declare b text := 'parroquia-san-gabriel'; s bigint; it bigint; d date;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-FE') or exists (select 1 from fe_settings where business_id = b) then return; end if;
  insert into fe_settings (business_id, city_id, kind_override, bil, help, sinid, freq, h24, plan_n, rep_days, catequesis_open)
   select b, city_id, 'misa', false, '{bodas}'::text[], false, 'semana', false, 0, '5–7', true from businesses where id = b;
  insert into worship_times (business_id, city_id, dow, start_min, label, lang, kind, sort) select b, city_id, 6, 1020, '{"es":"Misa en español","en":"Spanish mass"}'::jsonb, 'es', 'misa', 0 from businesses where id = b on conflict do nothing;
  insert into worship_times (business_id, city_id, dow, start_min, label, lang, kind, sort) select b, city_id, 0, 540, '{"es":"Misa en español","en":"Spanish mass"}'::jsonb, 'es', 'misa', 1 from businesses where id = b on conflict do nothing;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Misas","en":"Masses"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Misa en español","en":"Spanish mass"}'::jsonb, '{"es":"Sábado 5 PM y domingo 9 AM.","en":"Saturday 5 PM and Sunday 9 AM."}'::jsonb, 0, 60, 'clase', '{"fe":"gratis"}'::jsonb, 0, '{"https://images.pexels.com/photos/30871487/pexels-photo-30871487.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 0) returning id into it;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Sacramentos y celebraciones","en":"Sacraments & celebrations"}'::jsonb, 1) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Misa de quinceañera","en":"Quinceañera mass"}'::jsonb, '{"es":"Pide la fecha con seis meses. Dos charlas para la quinceañera y sus padres.","en":"Ask for the date six months ahead. Two talks for the girl and her parents."}'::jsonb, 15000, 60, 'clase', '{"fe":"don"}'::jsonb, 0, '{"https://images.pexels.com/photos/35761559/pexels-photo-35761559.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 0) returning id into it;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Boda religiosa","en":"Church wedding"}'::jsonb, '{"es":"Seis meses de preparación con charlas para la pareja.","en":"Six months of preparation with talks for the couple."}'::jsonb, 30000, 60, 'clase', '{"fe":"don"}'::jsonb, 0, '{"https://images.pexels.com/photos/30871487/pexels-photo-30871487.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 1) returning id into it;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Primera comunión y confirmación","en":"First communion and confirmation"}'::jsonb, '{"es":"Un año, los sábados en la mañana.","en":"One year, Saturday mornings."}'::jsonb, 0, 60, 'curso', '{"fe":"gratis","sem":40,"dur":{"es":"1 año · los sábados","en":"1 year · Saturdays"}}'::jsonb, 0, '{"https://images.pexels.com/photos/35761559/pexels-photo-35761559.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 2) returning id into it;
  d := (select (now() at time zone ci.timezone)::date + 9 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, jsonb_build_object('es', 'Empieza el ' || extract(day from d)::int || ' ' || (array['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'])[extract(month from d)::int], 'en', 'Starts ' || (array['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'])[extract(month from d)::int] || ' ' || extract(day from d)::int), d, d + 279, '{}'::smallint[], null, 20 from businesses where id = b;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Bautizo","en":"Baptism"}'::jsonb, '{"es":"Charla el segundo sábado del mes.","en":"Talk on the second Saturday of the month."}'::jsonb, 4000, 60, 'clase', '{"fe":"don"}'::jsonb, 0, '{"https://images.pexels.com/photos/35761559/pexels-photo-35761559.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 3) returning id into it;
  d := (select (now() at time zone ci.timezone)::date + 16 from businesses x join cities ci on ci.id = x.city_id where x.id = b);
  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, jsonb_build_object('es', 'Charla · ' || (array['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'])[extract(dow from d)::int + 1] || ' ' || extract(day from d)::int || ' ' || (array['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'])[extract(month from d)::int], 'en', 'Talk · ' || (array['Sun','Mon','Tue','Wed','Thu','Fri','Sat'])[extract(dow from d)::int + 1] || ' ' || (array['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'])[extract(month from d)::int] || ' ' || extract(day from d)::int), d, d, '{}'::smallint[], null, 20 from businesses where id = b;
end $$;
do $$
declare b text := 'consejeria-familiar-shalom'; s bigint; it bigint; d date;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-FE') or exists (select 1 from fe_settings where business_id = b) then return; end if;
  insert into fe_settings (business_id, city_id, kind_override, bil, help, sinid, freq, h24, plan_n, rep_days, catequesis_open)
   select b, city_id, null, false, '{}'::text[], false, 'semana', false, 0, '5–7', true from businesses where id = b;
  insert into worship_times (business_id, city_id, dow, start_min, label, lang, kind, sort) select b, city_id, 6, 600, '{"es":"Taller para matrimonios","en":"Marriage workshop"}'::jsonb, 'es', 'grupo', 0 from businesses where id = b on conflict do nothing;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Consejería","en":"Counseling"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Consejería de pareja","en":"Couples counseling"}'::jsonb, '{"es":"Una hora, con cita, en español.","en":"One hour, by appointment, in Spanish."}'::jsonb, 0, 60, 'clase', '{"fe":"gratis","dur":{"es":"Con cita · 1 hora","en":"By appointment · 1 hour"}}'::jsonb, 0, '{"https://images.pexels.com/photos/23496489/pexels-photo-23496489.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 0) returning id into it;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Consejería familiar","en":"Family counseling"}'::jsonb, '{"es":"Para padres e hijos, con cita.","en":"For parents and kids, by appointment."}'::jsonb, 0, 60, 'clase', '{"fe":"gratis","dur":{"es":"Con cita · 1 hora","en":"By appointment · 1 hour"}}'::jsonb, 0, '{"https://images.pexels.com/photos/23496489/pexels-photo-23496489.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 1) returning id into it;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Taller para matrimonios","en":"Marriage workshop"}'::jsonb, '{"es":"Sábado 10 AM, en grupo.","en":"Saturday 10 AM, in a group."}'::jsonb, 0, 60, 'clase', '{"fe":"gratis"}'::jsonb, 0, '{"https://images.pexels.com/photos/23496489/pexels-photo-23496489.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 2) returning id into it;
end $$;
do $$
declare b text := 'cremacion-memorial-del-valle'; s bigint; it bigint; d date;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-FE') or exists (select 1 from fe_settings where business_id = b) then return; end if;
  insert into fe_settings (business_id, city_id, kind_override, bil, help, sinid, freq, h24, plan_n, rep_days, catequesis_open)
   select b, city_id, null, false, '{}'::text[], false, 'semana', false, 12, '5–7', true from businesses where id = b;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Servicios","en":"Services"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Cremación directa","en":"Direct cremation"}'::jsonb, '{"es":"Trámites, cremación y urna sencilla. Lista en 5 días.","en":"Paperwork, cremation and a simple urn. Ready in 5 days."}'::jsonb, 245000, 60, 'fijo', '{"fe":"tot","inc":[{"es":"Trámites","en":"Paperwork"},{"es":"Urna sencilla","en":"Simple urn"}]}'::jsonb, 0, '{"https://images.pexels.com/photos/7317671/pexels-photo-7317671.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 0) returning id into it;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Servicio memorial y novenario","en":"Memorial service and novena"}'::jsonb, '{"es":"Sala por 4 horas y las nueve noches de rezo.","en":"Room for 4 hours and the nine nights of prayer."}'::jsonb, 120000, 60, 'fijo', '{"fe":"tot"}'::jsonb, 0, '{"https://images.pexels.com/photos/7317665/pexels-photo-7317665.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 1) returning id into it;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Velorio con cremación","en":"Wake with cremation"}'::jsonb, '{"es":"Velorio, misa y cremación.","en":"Wake, mass and cremation."}'::jsonb, 490000, 60, 'fijo', '{"fe":"tot","no":[{"es":"Las flores van aparte.","en":"Flowers are extra."}]}'::jsonb, 0, '{"https://images.pexels.com/photos/7317671/pexels-photo-7317671.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 2) returning id into it;
end $$;
do $$
declare b text := 'linea-oracion-luz-del-valle'; s bigint; it bigint; d date;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-FE') or exists (select 1 from fe_settings where business_id = b) then return; end if;
  insert into fe_settings (business_id, city_id, kind_override, bil, help, sinid, freq, h24, plan_n, rep_days, catequesis_open)
   select b, city_id, null, true, '{}'::text[], false, 'semana', true, 0, '5–7', true from businesses where id = b;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Oración","en":"Prayer"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Línea de oración","en":"Prayer line"}'::jsonb, '{"es":"Llama o escribe a cualquier hora; contesta una persona.","en":"Call or text any time; a person answers."}'::jsonb, 0, 60, 'clase', '{"fe":"gratis"}'::jsonb, 0, '{"https://images.pexels.com/photos/14354566/pexels-photo-14354566.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 0) returning id into it;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Visita al hospital o la cárcel","en":"Hospital or jail visit"}'::jsonb, '{"es":"Un capellán va con cita; avisas el nombre y el lugar.","en":"A chaplain goes by appointment; give the name and place."}'::jsonb, 0, 60, 'clase', '{"fe":"gratis","dur":{"es":"Con cita","en":"By appointment"}}'::jsonb, 0, '{"https://images.pexels.com/photos/14354566/pexels-photo-14354566.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 1) returning id into it;
end $$;
do $$
declare b text := 'ministerio-ayuda-al-inmigrante'; s bigint; it bigint; d date;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-FE') or exists (select 1 from fe_settings where business_id = b) then return; end if;
  insert into fe_settings (business_id, city_id, kind_override, bil, help, sinid, freq, h24, plan_n, rep_days, catequesis_open)
   select b, city_id, null, false, '{}'::text[], true, 'semana', false, 0, '5–7', true from businesses where id = b;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Ayuda","en":"Help"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Orientación migratoria","en":"Immigration guidance"}'::jsonb, '{"es":"Con una representante acreditada (DOJ), con cita. No es consejo legal.","en":"With a DOJ accredited representative, by appointment. Not legal advice."}'::jsonb, 0, 60, 'clase', '{"fe":"gratis","dur":{"es":"Con cita · 2.º sábado del mes","en":"By appointment · 2nd Saturday"}}'::jsonb, 0, '{"https://images.pexels.com/photos/6646981/pexels-photo-6646981.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 0) returning id into it;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Clases de ciudadanía","en":"Citizenship classes"}'::jsonb, '{"es":"Martes 6 PM, para el examen de inglés y cívica.","en":"Tuesdays 6 PM, for the English and civics test."}'::jsonb, 0, 60, 'clase', '{"fe":"gratis"}'::jsonb, 0, '{"https://images.pexels.com/photos/6646981/pexels-photo-6646981.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 1) returning id into it;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Voluntariado y misiones","en":"Volunteering and missions"}'::jsonb, '{"es":"Sábado 9 AM repartimos comida en el barrio.","en":"Saturdays 9 AM we hand out food in the neighborhood."}'::jsonb, 0, 60, 'clase', '{"fe":"gratis"}'::jsonb, 0, '{"https://images.pexels.com/photos/7156158/pexels-photo-7156158.jpeg?auto=compress&cs=tinysrgb&h=600"}'::text[], 2) returning id into it;
end $$;
do $$
declare b text := 'salon-del-reino-hazleton'; s bigint; it bigint; d date;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-FE') or exists (select 1 from fe_settings where business_id = b) then return; end if;
  insert into fe_settings (business_id, city_id, kind_override, bil, help, sinid, freq, h24, plan_n, rep_days, catequesis_open)
   select b, city_id, null, false, '{}'::text[], false, 'semana', false, 0, '5–7', true from businesses where id = b;
  insert into worship_times (business_id, city_id, dow, start_min, label, lang, kind, sort) select b, city_id, 4, 1140, '{"es":"Reunión","en":"Meeting"}'::jsonb, 'es', 'culto', 0 from businesses where id = b on conflict do nothing;
  insert into worship_times (business_id, city_id, dow, start_min, label, lang, kind, sort) select b, city_id, 0, 600, '{"es":"Reunión","en":"Meeting"}'::jsonb, 'es', 'culto', 1 from businesses where id = b on conflict do nothing;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Reuniones","en":"Meetings"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Reunión del domingo","en":"Reunión del domingo"}'::jsonb, '{"es":"Domingo 10 AM, en español. Discurso y estudio de la Biblia.","en":"Domingo 10 AM, en español. Discurso y estudio de la Biblia."}'::jsonb, 0, 60, 'clase', '{"fe":"gratis"}'::jsonb, 0, '{}'::text[], 0) returning id into it;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Reunión del jueves","en":"Reunión del jueves"}'::jsonb, '{"es":"Jueves 7 PM.","en":"Jueves 7 PM."}'::jsonb, 0, 60, 'clase', '{"fe":"gratis"}'::jsonb, 0, '{}'::text[], 1) returning id into it;
end $$;
do $$
declare b text := 'capilla-sud-hazleton'; s bigint; it bigint; d date;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-FE') or exists (select 1 from fe_settings where business_id = b) then return; end if;
  insert into fe_settings (business_id, city_id, kind_override, bil, help, sinid, freq, h24, plan_n, rep_days, catequesis_open)
   select b, city_id, null, true, '{jovenes}'::text[], false, 'semana', false, 0, '5–7', true from businesses where id = b;
  insert into worship_times (business_id, city_id, dow, start_min, label, lang, kind, sort) select b, city_id, 0, 600, '{"es":"Reunión","en":"Meeting"}'::jsonb, 'bil', 'culto', 0 from businesses where id = b on conflict do nothing;
  insert into worship_times (business_id, city_id, dow, start_min, label, lang, kind, sort) select b, city_id, 3, 1140, '{"es":"Jóvenes","en":"Youth"}'::jsonb, 'bil', 'grupo', 1 from businesses where id = b on conflict do nothing;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Reuniones","en":"Meetings"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Reunión sacramental","en":"Reunión sacramental"}'::jsonb, '{"es":"Domingo 10 AM, en español e inglés.","en":"Domingo 10 AM, en español e inglés."}'::jsonb, 0, 60, 'clase', '{"fe":"gratis"}'::jsonb, 0, '{}'::text[], 0) returning id into it;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Jóvenes","en":"Jóvenes"}'::jsonb, '{"es":"Miércoles 7 PM.","en":"Miércoles 7 PM."}'::jsonb, 0, 60, 'clase', '{"fe":"gratis"}'::jsonb, 0, '{}'::text[], 1) returning id into it;
end $$;
do $$
declare b text := 'iglesia-ortodoxa-san-nicolas'; s bigint; it bigint; d date;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-FE') or exists (select 1 from fe_settings where business_id = b) then return; end if;
  insert into fe_settings (business_id, city_id, kind_override, bil, help, sinid, freq, h24, plan_n, rep_days, catequesis_open)
   select b, city_id, 'culto', false, '{}'::text[], false, 'semana', false, 0, '5–7', true from businesses where id = b;
  insert into worship_times (business_id, city_id, dow, start_min, label, lang, kind, sort) select b, city_id, 6, 1020, '{"es":"Vísperas","en":"Vespers"}'::jsonb, 'otro', 'culto', 0 from businesses where id = b on conflict do nothing;
  insert into worship_times (business_id, city_id, dow, start_min, label, lang, kind, sort) select b, city_id, 0, 570, '{"es":"Liturgia","en":"Liturgy"}'::jsonb, 'otro', 'culto', 1 from businesses where id = b on conflict do nothing;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Servicios","en":"Services"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Divina liturgia","en":"Divina liturgia"}'::jsonb, '{"es":"Domingo 9:30 AM, en inglés y eslavo.","en":"Domingo 9:30 AM, en inglés y eslavo."}'::jsonb, 0, 60, 'clase', '{"fe":"gratis"}'::jsonb, 0, '{}'::text[], 0) returning id into it;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Vísperas","en":"Vísperas"}'::jsonb, '{"es":"Sábado 5 PM.","en":"Sábado 5 PM."}'::jsonb, 0, 60, 'clase', '{"fe":"gratis"}'::jsonb, 0, '{}'::text[], 1) returning id into it;
end $$;
do $$
declare b text := 'centro-islamico-hazleton'; s bigint; it bigint; d date;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-FE') or exists (select 1 from fe_settings where business_id = b) then return; end if;
  insert into fe_settings (business_id, city_id, kind_override, bil, help, sinid, freq, h24, plan_n, rep_days, catequesis_open)
   select b, city_id, null, true, '{}'::text[], false, 'semana', false, 0, '5–7', true from businesses where id = b;
  insert into worship_times (business_id, city_id, dow, start_min, label, lang, kind, sort) select b, city_id, 5, 810, '{"es":"Oración del viernes","en":"Friday prayer"}'::jsonb, 'otro', 'oracion', 0 from businesses where id = b on conflict do nothing;
  insert into worship_times (business_id, city_id, dow, start_min, label, lang, kind, sort) select b, city_id, 0, 600, '{"es":"Clases para niños","en":"Kids classes"}'::jsonb, 'otro', 'grupo', 1 from businesses where id = b on conflict do nothing;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Oración","en":"Prayer"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Oración del viernes","en":"Oración del viernes"}'::jsonb, '{"es":"Viernes 1:30 PM. Sermón en árabe e inglés.","en":"Viernes 1:30 PM. Sermón en árabe e inglés."}'::jsonb, 0, 60, 'clase', '{"fe":"gratis"}'::jsonb, 0, '{}'::text[], 0) returning id into it;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Clases para niños","en":"Clases para niños"}'::jsonb, '{"es":"Domingo 10 AM.","en":"Domingo 10 AM."}'::jsonb, 0, 60, 'clase', '{"fe":"gratis"}'::jsonb, 0, '{}'::text[], 1) returning id into it;
end $$;
do $$
declare b text := 'sinagoga-beth-shalom'; s bigint; it bigint; d date;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-FE') or exists (select 1 from fe_settings where business_id = b) then return; end if;
  insert into fe_settings (business_id, city_id, kind_override, bil, help, sinid, freq, h24, plan_n, rep_days, catequesis_open)
   select b, city_id, null, false, '{}'::text[], false, 'semana', false, 0, '5–7', true from businesses where id = b;
  insert into worship_times (business_id, city_id, dow, start_min, label, lang, kind, sort) select b, city_id, 5, 1140, '{"es":"Shabat","en":"Shabbat"}'::jsonb, 'otro', 'culto', 0 from businesses where id = b on conflict do nothing;
  insert into worship_times (business_id, city_id, dow, start_min, label, lang, kind, sort) select b, city_id, 6, 570, '{"es":"Servicio","en":"Service"}'::jsonb, 'otro', 'culto', 1 from businesses where id = b on conflict do nothing;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Servicios","en":"Services"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Shabat","en":"Shabat"}'::jsonb, '{"es":"Viernes 7 PM.","en":"Viernes 7 PM."}'::jsonb, 0, 60, 'clase', '{"fe":"gratis"}'::jsonb, 0, '{}'::text[], 0) returning id into it;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, '{"es":"Servicio del sábado","en":"Servicio del sábado"}'::jsonb, '{"es":"Sábado 9:30 AM.","en":"Sábado 9:30 AM."}'::jsonb, 0, 60, 'clase', '{"fe":"gratis"}'::jsonb, 0, '{}'::text[], 1) returning id into it;
end $$;
insert into users (phone, first_name, last_name, lang, home_city_id) select '+15705550422', 'Luis', 'Herrera', 'es', 'hzl' where exists (select 1 from businesses where id = 'parroquia-santa-maria' and is_demo) on conflict (phone) do nothing;
insert into business_members (business_id, user_id, kind, display_name, role, status, show_on_page, panel_access, since_year, sort, same_as_business_hours) select 'parroquia-santa-maria', u.id, 'owner', 'Padre Luis Herrera', '{"es":"Párroco","en":"Parish priest"}'::jsonb, 'active', true, '{all}', 2011, 0, true from users u where u.phone = '+15705550422' and exists (select 1 from businesses where id = 'parroquia-santa-maria' and is_demo) and not exists (select 1 from business_members m where m.business_id = 'parroquia-santa-maria' and m.kind = 'owner' and m.status = 'active');
commit;
