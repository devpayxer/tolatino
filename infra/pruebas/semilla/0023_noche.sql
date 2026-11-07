-- Generado por scripts/semilla/extraer-noche.cjs desde el prototipo. SOLO SANDBOX. No editar a mano.
begin;
do $$
declare b text := 'la-terraza-night';
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-NOCHE') or exists (select 1 from noche_settings where business_id = b) then return; end if;
  insert into noche_settings (business_id, city_id, cover_cents, after_min, after_cents, min_age, list_on, list_until_min, line_min, line_at, music, music_note, dress)
   select b, city_id, 1000, 660, 1500, 21, true, 660, 20, (select ((n.d + time '12:00') + make_interval(mins => 690)) at time zone ci.timezone
        from businesses x join cities ci on ci.id = x.city_id cross join lateral (select ((now() at time zone ci.timezone) - interval '6 hours')::date as hoy) h
        cross join lateral (select h.hoy - (case when ((extract(dow from h.hoy)::int - 6 + 7) % 7) = 0 then 7 else ((extract(dow from h.hoy)::int - 6 + 7) % 7) end) as d) n where x.id = b), '{m:bachata,m:salsa,m:tipico,m:mixto}'::text[],
          '{"es":"Bachata y merengue · DJ Kelvin","en":"Bachata and merengue · DJ Kelvin"}'::jsonb, '{"es":"Sin gorra ni chancletas","en":"No caps or flip-flops"}'::jsonb from businesses where id = b;
  insert into licenses (business_id, kind, title, issuer, number, status, city_id, source, sort, verified_at, next_review) select b, 'pa_plcb', '{"es":"Licencia de licor (PLCB)","en":"Liquor license (PLCB)"}'::jsonb, null, 'R-10000', 'valid', city_id, 'semilla', 1, now(), now() + interval '1 year' from businesses where id = b and not exists (select 1 from licenses where business_id = b and kind = 'pa_plcb');
end $$;
do $$
declare b text := 'mambo-lounge';
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-NOCHE') or exists (select 1 from noche_settings where business_id = b) then return; end if;
  insert into noche_settings (business_id, city_id, cover_cents, after_min, after_cents, min_age, list_on, list_until_min, line_min, line_at, music, music_note, dress)
   select b, city_id, 0, null, null, 21, false, null, 0, (select ((n.d + time '12:00') + make_interval(mins => 600)) at time zone ci.timezone
        from businesses x join cities ci on ci.id = x.city_id cross join lateral (select ((now() at time zone ci.timezone) - interval '6 hours')::date as hoy) h
        cross join lateral (select h.hoy - 1 as d) n where x.id = b), '{m:mixto,m:salsa}'::text[],
          '{"es":"Salsa de fondo · hookah","en":"Background salsa · hookah"}'::jsonb, null from businesses where id = b;
  insert into licenses (business_id, kind, title, issuer, number, status, city_id, source, sort, verified_at, next_review) select b, 'pa_plcb', '{"es":"Licencia de licor (PLCB)","en":"Liquor license (PLCB)"}'::jsonb, null, 'R-10731', 'valid', city_id, 'semilla', 1, now(), now() + interval '1 year' from businesses where id = b and not exists (select 1 from licenses where business_id = b and kind = 'pa_plcb');
end $$;
do $$
declare b text := 'el-rincon-sports';
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-NOCHE') or exists (select 1 from noche_settings where business_id = b) then return; end if;
  insert into noche_settings (business_id, city_id, cover_cents, after_min, after_cents, min_age, list_on, list_until_min, line_min, line_at, music, music_note, dress)
   select b, city_id, 0, null, null, 21, false, null, 0, (select ((n.d + time '12:00') + make_interval(mins => 480)) at time zone ci.timezone
        from businesses x join cities ci on ci.id = x.city_id cross join lateral (select ((now() at time zone ci.timezone) - interval '6 hours')::date as hoy) h
        cross join lateral (select h.hoy - 1 as d) n where x.id = b), '{m:mixto}'::text[],
          '{"es":"Fútbol y béisbol en 12 pantallas","en":"Soccer and baseball on 12 screens"}'::jsonb, null from businesses where id = b;
  insert into licenses (business_id, kind, title, issuer, number, status, city_id, source, sort, verified_at, next_review) select b, 'pa_plcb', '{"es":"Licencia de licor (PLCB)","en":"Liquor license (PLCB)"}'::jsonb, null, 'R-12924', 'valid', city_id, 'semilla', 1, now(), now() + interval '1 year' from businesses where id = b and not exists (select 1 from licenses where business_id = b and kind = 'pa_plcb');
end $$;
do $$
declare b text := 'club-caliente';
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-NOCHE') or exists (select 1 from noche_settings where business_id = b) then return; end if;
  insert into noche_settings (business_id, city_id, cover_cents, after_min, after_cents, min_age, list_on, list_until_min, line_min, line_at, music, music_note, dress)
   select b, city_id, 2000, 720, 2500, 18, true, 720, 35, (select ((n.d + time '12:00') + make_interval(mins => 750)) at time zone ci.timezone
        from businesses x join cities ci on ci.id = x.city_id cross join lateral (select ((now() at time zone ci.timezone) - interval '6 hours')::date as hoy) h
        cross join lateral (select h.hoy - (case when ((extract(dow from h.hoy)::int - 6 + 7) % 7) = 0 then 7 else ((extract(dow from h.hoy)::int - 6 + 7) % 7) end) as d) n where x.id = b), '{m:reggaeton,m:mixto}'::text[],
          '{"es":"Reguetón y dembow · DJ Flow","en":"Reggaeton and dembow · DJ Flow"}'::jsonb, '{"es":"Sin ropa deportiva","en":"No athletic wear"}'::jsonb from businesses where id = b;
  insert into licenses (business_id, kind, title, issuer, number, status, city_id, source, sort, verified_at, next_review) select b, 'pa_plcb', '{"es":"Licencia de licor (PLCB)","en":"Liquor license (PLCB)"}'::jsonb, null, 'R-11462', 'valid', city_id, 'semilla', 1, now(), now() + interval '1 year' from businesses where id = b and not exists (select 1 from licenses where business_id = b and kind = 'pa_plcb');
end $$;
do $$
declare b text := 'karaoke-estrella';
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-NOCHE') or exists (select 1 from noche_settings where business_id = b) then return; end if;
  insert into noche_settings (business_id, city_id, cover_cents, after_min, after_cents, min_age, list_on, list_until_min, line_min, line_at, music, music_note, dress)
   select b, city_id, 500, null, null, 21, false, null, 10, (select ((n.d + time '12:00') + make_interval(mins => 600)) at time zone ci.timezone
        from businesses x join cities ci on ci.id = x.city_id cross join lateral (select ((now() at time zone ci.timezone) - interval '6 hours')::date as hoy) h
        cross join lateral (select h.hoy - 1 as d) n where x.id = b), '{m:mixto}'::text[],
          '{"es":"Karaoke en español · 30.000 canciones","en":"Spanish karaoke · 30,000 songs"}'::jsonb, null from businesses where id = b;
  insert into licenses (business_id, kind, title, issuer, number, status, city_id, source, sort, verified_at, next_review) select b, 'pa_plcb', '{"es":"Licencia de licor (PLCB)","en":"Liquor license (PLCB)"}'::jsonb, null, 'R-13655', 'valid', city_id, 'semilla', 1, now(), now() + interval '1 year' from businesses where id = b and not exists (select 1 from licenses where business_id = b and kind = 'pa_plcb');
end $$;
do $$
declare b text := 'cantina-don-beto';
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-NOCHE') or exists (select 1 from noche_settings where business_id = b) then return; end if;
  insert into noche_settings (business_id, city_id, cover_cents, after_min, after_cents, min_age, list_on, list_until_min, line_min, line_at, music, music_note, dress)
   select b, city_id, 0, null, null, 21, false, null, 0, (select ((n.d + time '12:00') + make_interval(mins => 540)) at time zone ci.timezone
        from businesses x join cities ci on ci.id = x.city_id cross join lateral (select ((now() at time zone ci.timezone) - interval '6 hours')::date as hoy) h
        cross join lateral (select h.hoy - 1 as d) n where x.id = b), '{m:banda}'::text[],
          '{"es":"Rancheras y norteño en la rocola","en":"Rancheras and norteño on the jukebox"}'::jsonb, null from businesses where id = b;
end $$;
do $$
declare b text := 'casa-borinquen';
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-NOCHE') or exists (select 1 from noche_settings where business_id = b) then return; end if;
  insert into noche_settings (business_id, city_id, cover_cents, after_min, after_cents, min_age, list_on, list_until_min, line_min, line_at, music, music_note, dress)
   select b, city_id, 1200, null, null, 21, true, 540, 10, (select ((n.d + time '12:00') + make_interval(mins => 630)) at time zone ci.timezone
        from businesses x join cities ci on ci.id = x.city_id cross join lateral (select ((now() at time zone ci.timezone) - interval '6 hours')::date as hoy) h
        cross join lateral (select h.hoy - (case when ((extract(dow from h.hoy)::int - 6 + 7) % 7) = 0 then 7 else ((extract(dow from h.hoy)::int - 6 + 7) % 7) end) as d) n where x.id = b), '{m:salsa}'::text[],
          '{"es":"Salsa en vivo con Orquesta La Sabrosura · clase 8 PM","en":"Live salsa with Orquesta La Sabrosura · 8 PM class"}'::jsonb, null from businesses where id = b;
  insert into licenses (business_id, kind, title, issuer, number, status, city_id, source, sort, verified_at, next_review) select b, 'pa_plcb', '{"es":"Licencia de licor (PLCB)","en":"Liquor license (PLCB)"}'::jsonb, null, 'R-12193', 'valid', city_id, 'semilla', 1, now(), now() + interval '1 year' from businesses where id = b and not exists (select 1 from licenses where business_id = b and kind = 'pa_plcb');
end $$;
do $$
declare b text := 'billar-los-amigos';
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-NOCHE') or exists (select 1 from noche_settings where business_id = b) then return; end if;
  insert into noche_settings (business_id, city_id, cover_cents, after_min, after_cents, min_age, list_on, list_until_min, line_min, line_at, music, music_note, dress)
   select b, city_id, 0, null, null, 21, false, null, 0, (select ((n.d + time '12:00') + make_interval(mins => 540)) at time zone ci.timezone
        from businesses x join cities ci on ci.id = x.city_id cross join lateral (select ((now() at time zone ci.timezone) - interval '6 hours')::date as hoy) h
        cross join lateral (select h.hoy - 1 as d) n where x.id = b), '{m:mixto}'::text[],
          '{"es":"Mesas a $10 la hora","en":"Tables $10 an hour"}'::jsonb, null from businesses where id = b;
end $$;
do $$
declare b text := 'coal-town-brewing';
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-NOCHE') or exists (select 1 from noche_settings where business_id = b) then return; end if;
  insert into noche_settings (business_id, city_id, cover_cents, after_min, after_cents, min_age, list_on, list_until_min, line_min, line_at, music, music_note, dress)
   select b, city_id, 0, null, null, 21, false, null, 0, (select ((n.d + time '12:00') + make_interval(mins => 480)) at time zone ci.timezone
        from businesses x join cities ci on ci.id = x.city_id cross join lateral (select ((now() at time zone ci.timezone) - interval '6 hours')::date as hoy) h
        cross join lateral (select h.hoy - 1 as d) n where x.id = b), '{m:envivo}'::text[],
          '{"es":"Jueves de trivia en inglés y español","en":"Bilingual trivia Thursday"}'::jsonb, null from businesses where id = b;
end $$;
do $$
declare b text := 'el-palacio-show';
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-NOCHE') or exists (select 1 from noche_settings where business_id = b) then return; end if;
  insert into noche_settings (business_id, city_id, cover_cents, after_min, after_cents, min_age, list_on, list_until_min, line_min, line_at, music, music_note, dress)
   select b, city_id, 2500, null, null, 18, false, null, 10, (select ((n.d + time '12:00') + make_interval(mins => 510)) at time zone ci.timezone
        from businesses x join cities ci on ci.id = x.city_id cross join lateral (select ((now() at time zone ci.timezone) - interval '6 hours')::date as hoy) h
        cross join lateral (select h.hoy - (case when ((extract(dow from h.hoy)::int - 6 + 7) % 7) = 0 then 7 else ((extract(dow from h.hoy)::int - 6 + 7) % 7) end) as d) n where x.id = b), '{m:envivo}'::text[],
          '{"es":"Viernes: comedia dominicana, 9 PM","en":"Friday: Dominican comedy, 9 PM"}'::jsonb, null from businesses where id = b;
end $$;
do $$
declare b text := 'skyline-rooftop';
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-NOCHE') or exists (select 1 from noche_settings where business_id = b) then return; end if;
  insert into noche_settings (business_id, city_id, cover_cents, after_min, after_cents, min_age, list_on, list_until_min, line_min, line_at, music, music_note, dress)
   select b, city_id, 0, null, null, 21, false, null, 10, (select ((n.d + time '12:00') + make_interval(mins => 570)) at time zone ci.timezone
        from businesses x join cities ci on ci.id = x.city_id cross join lateral (select ((now() at time zone ci.timezone) - interval '6 hours')::date as hoy) h
        cross join lateral (select h.hoy - 1 as d) n where x.id = b), '{m:mixto}'::text[],
          '{"es":"DJ de lounge desde las 9 PM","en":"Lounge DJ from 9 PM"}'::jsonb, '{"es":"Casual elegante","en":"Smart casual"}'::jsonb from businesses where id = b;
  insert into licenses (business_id, kind, title, issuer, number, status, city_id, source, sort, verified_at, next_review) select b, 'pa_plcb', '{"es":"Licencia de licor (PLCB)","en":"Liquor license (PLCB)"}'::jsonb, null, 'R-14386', 'valid', city_id, 'semilla', 1, now(), now() + interval '1 year' from businesses where id = b and not exists (select 1 from licenses where business_id = b and kind = 'pa_plcb');
end $$;
do $$
declare b text := 'bar-el-cibao';
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-NOCHE') or exists (select 1 from noche_settings where business_id = b) then return; end if;
  insert into noche_settings (business_id, city_id, cover_cents, after_min, after_cents, min_age, list_on, list_until_min, line_min, line_at, music, music_note, dress)
   select b, city_id, 0, null, null, 21, false, null, null, null, '{m:tipico}'::text[],
          null, null from businesses where id = b;
end $$;
do $$
declare b text := 'hookah-palace';
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-NOCHE') or exists (select 1 from noche_settings where business_id = b) then return; end if;
  insert into noche_settings (business_id, city_id, cover_cents, after_min, after_cents, min_age, list_on, list_until_min, line_min, line_at, music, music_note, dress)
   select b, city_id, 0, null, null, 21, false, null, null, null, '{m:reggaeton}'::text[],
          null, null from businesses where id = b;
end $$;
do $$
declare b text := 'tragos-y-dardos';
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-NOCHE') or exists (select 1 from noche_settings where business_id = b) then return; end if;
  insert into noche_settings (business_id, city_id, cover_cents, after_min, after_cents, min_age, list_on, list_until_min, line_min, line_at, music, music_note, dress)
   select b, city_id, 0, null, null, 21, false, null, null, null, '{m:mixto}'::text[],
          null, null from businesses where id = b;
end $$;
do $$
declare b text := 'la-barra-de-vinos';
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-NOCHE') or exists (select 1 from noche_settings where business_id = b) then return; end if;
  insert into noche_settings (business_id, city_id, cover_cents, after_min, after_cents, min_age, list_on, list_until_min, line_min, line_at, music, music_note, dress)
   select b, city_id, 0, null, null, 21, false, null, null, null, '{m:mixto}'::text[],
          null, null from businesses where id = b;
end $$;
do $$
declare b text := 'el-charro-cantina';
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-NOCHE') or exists (select 1 from noche_settings where business_id = b) then return; end if;
  insert into noche_settings (business_id, city_id, cover_cents, after_min, after_cents, min_age, list_on, list_until_min, line_min, line_at, music, music_note, dress)
   select b, city_id, 0, null, null, 21, false, null, null, null, '{m:banda}'::text[],
          null, null from businesses where id = b;
end $$;
do $$
declare b text := 'rumba-club';
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-NOCHE') or exists (select 1 from noche_settings where business_id = b) then return; end if;
  insert into noche_settings (business_id, city_id, cover_cents, after_min, after_cents, min_age, list_on, list_until_min, line_min, line_at, music, music_note, dress)
   select b, city_id, 1000, null, null, 18, false, null, null, null, '{m:reggaeton,m:mixto}'::text[],
          null, null from businesses where id = b;
end $$;
do $$
declare b text := 'la-terraza-night'; s bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-NOCHE') or exists (select 1 from items where business_id = b and module = 'svc' and removed_at is null) then return; end if;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc','rsv']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Esta noche","en":"Tonight"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, price_from, photos, sort) values (b, 'svc', s, '{"es":"Lista de la noche","en":"Tonight’s list"}'::jsonb, '{"es":"Gratis hasta las 11 PM con tu nombre en la lista. Después, cover de $15.","en":"Free until 11 PM with your name on the list. After that, $15 cover."}'::jsonb, 0, 60, 'lista', '{"until":660}'::jsonb, 0, false, array['https://images.pexels.com/photos/8281148/pexels-photo-8281148.jpeg?auto=compress&cs=tinysrgb&h=600'], 0);
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, price_from, photos, sort) values (b, 'svc', s, '{"es":"Entrada","en":"Entry"}'::jsonb, '{"es":"$10 hasta las 11 PM, $15 después. Se paga en la puerta.","en":"$10 until 11 PM, $15 after. Paid at the door."}'::jsonb, 1000, 60, 'cover', '{}'::jsonb, 0, false, array['https://images.pexels.com/photos/5192307/pexels-photo-5192307.jpeg?auto=compress&cs=tinysrgb&h=600'], 1);
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, price_from, photos, sort) values (b, 'svc', s, '{"es":"Mesa en la terraza","en":"Terrace table"}'::jsonb, '{"es":"Hasta 6 personas. Mínimo de $150 en consumo.","en":"Up to 6 people. $150 minimum spend."}'::jsonb, 15000, 60, 'mesa', '{"pax":6,"tables":4,"dep":5000}'::jsonb, 5000, false, array['https://images.pexels.com/photos/35005900/pexels-photo-35005900.jpeg?auto=compress&cs=tinysrgb&h=600'], 2);
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, price_from, photos, sort) values (b, 'svc', s, '{"es":"Mesa VIP con botella","en":"VIP table with bottle"}'::jsonb, '{"es":"Hasta 8 personas, una botella de Brugal o Barceló y mezcladores.","en":"Up to 8 people, a bottle of Brugal or Barceló and mixers."}'::jsonb, 25000, 60, 'vip', '{"pax":8,"tables":2,"dep":10000}'::jsonb, 10000, false, array['https://images.pexels.com/photos/16125869/pexels-photo-16125869.jpeg?auto=compress&cs=tinysrgb&h=600'], 3);
end $$;
do $$
declare b text := 'mambo-lounge'; s bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-NOCHE') or exists (select 1 from items where business_id = b and module = 'svc' and removed_at is null) then return; end if;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc','rsv']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Esta noche","en":"Tonight"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, price_from, photos, sort) values (b, 'svc', s, '{"es":"Mesa con hookah","en":"Table with hookah"}'::jsonb, '{"es":"Hasta 4 personas. La hookah se paga aparte ($25).","en":"Up to 4 people. Hookah is extra ($25)."}'::jsonb, 6000, 60, 'mesa', '{"pax":4,"tables":4}'::jsonb, 0, false, array['https://images.pexels.com/photos/7518765/pexels-photo-7518765.jpeg?auto=compress&cs=tinysrgb&h=600'], 0);
end $$;
do $$
declare b text := 'el-rincon-sports'; s bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-NOCHE') or exists (select 1 from items where business_id = b and module = 'svc' and removed_at is null) then return; end if;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc','rsv']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Esta noche","en":"Tonight"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, price_from, photos, sort) values (b, 'svc', s, '{"es":"Mesa para el juego","en":"Table for the game"}'::jsonb, '{"es":"Frente a la pantalla grande. Hasta 8 personas, sin mínimo.","en":"In front of the big screen. Up to 8 people, no minimum."}'::jsonb, 0, 60, 'mesa', '{"pax":8,"tables":4}'::jsonb, 0, false, array['https://images.pexels.com/photos/6241298/pexels-photo-6241298.jpeg?auto=compress&cs=tinysrgb&h=600'], 0);
end $$;
do $$
declare b text := 'club-caliente'; s bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-NOCHE') or exists (select 1 from items where business_id = b and module = 'svc' and removed_at is null) then return; end if;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc','rsv']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Mañana viernes","en":"Tomorrow, Friday"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, price_from, photos, sort) values (b, 'svc', s, '{"es":"Lista del viernes","en":"Friday list"}'::jsonb, '{"es":"$10 hasta las 12 AM con la lista. Después, $25.","en":"$10 until midnight with the list. After that, $25."}'::jsonb, 1000, 60, 'lista', '{"until":720}'::jsonb, 0, false, array['https://images.pexels.com/photos/10063279/pexels-photo-10063279.jpeg?auto=compress&cs=tinysrgb&h=600'], 0);
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, price_from, photos, sort) values (b, 'svc', s, '{"es":"Entrada","en":"Entry"}'::jsonb, '{"es":"$20 hasta las 12 AM, $25 después. 18+ con identificación.","en":"$20 until midnight, $25 after. 18+ with ID."}'::jsonb, 2000, 60, 'cover', '{}'::jsonb, 0, false, array['https://images.pexels.com/photos/5192307/pexels-photo-5192307.jpeg?auto=compress&cs=tinysrgb&h=600'], 1);
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, price_from, photos, sort) values (b, 'svc', s, '{"es":"Mesa VIP","en":"VIP table"}'::jsonb, '{"es":"Hasta 10 personas, 2 botellas.","en":"Up to 10 people, 2 bottles."}'::jsonb, 40000, 60, 'vip', '{"pax":10,"tables":2,"dep":15000}'::jsonb, 15000, false, array['https://images.pexels.com/photos/16125869/pexels-photo-16125869.jpeg?auto=compress&cs=tinysrgb&h=600'], 2);
end $$;
do $$
declare b text := 'karaoke-estrella'; s bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-NOCHE') or exists (select 1 from items where business_id = b and module = 'svc' and removed_at is null) then return; end if;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc','rsv']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Esta noche","en":"Tonight"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, price_from, photos, sort) values (b, 'svc', s, '{"es":"Mesa para cantar","en":"Singing table"}'::jsonb, '{"es":"Hasta 6 personas. Tu turno en la lista de canciones.","en":"Up to 6 people. Your turn on the song list."}'::jsonb, 3000, 60, 'mesa', '{"pax":6,"tables":4}'::jsonb, 0, false, array['https://images.pexels.com/photos/7887036/pexels-photo-7887036.jpeg?auto=compress&cs=tinysrgb&h=600'], 0);
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, price_from, photos, sort) values (b, 'svc', s, '{"es":"Entrada","en":"Entry"}'::jsonb, '{"es":"$5 en la puerta.","en":"$5 at the door."}'::jsonb, 500, 60, 'cover', '{}'::jsonb, 0, false, array['https://images.pexels.com/photos/7887036/pexels-photo-7887036.jpeg?auto=compress&cs=tinysrgb&h=600'], 1);
end $$;
do $$
declare b text := 'cantina-don-beto'; s bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-NOCHE') or exists (select 1 from items where business_id = b and module = 'svc' and removed_at is null) then return; end if;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc','rsv']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Esta semana","en":"This week"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, price_from, photos, sort) values (b, 'svc', s, '{"es":"Sábado: Banda La Dinastía","en":"Saturday: Banda La Dinastía"}'::jsonb, '{"es":"En vivo desde las 10 PM. Boleto $10.","en":"Live from 10 PM. $10 ticket."}'::jsonb, 1000, 60, 'evento', '{}'::jsonb, 0, false, array['https://images.pexels.com/photos/14364672/pexels-photo-14364672.jpeg?auto=compress&cs=tinysrgb&h=600'], 0);
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, price_from, photos, sort) values (b, 'svc', s, '{"es":"Mesa","en":"Table"}'::jsonb, '{"es":"Hasta 8 personas, sin mínimo.","en":"Up to 8 people, no minimum."}'::jsonb, 0, 60, 'mesa', '{"pax":8,"tables":4}'::jsonb, 0, false, array['https://images.pexels.com/photos/16936184/pexels-photo-16936184.jpeg?auto=compress&cs=tinysrgb&h=600'], 1);
end $$;
do $$
declare b text := 'casa-borinquen'; s bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-NOCHE') or exists (select 1 from items where business_id = b and module = 'svc' and removed_at is null) then return; end if;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc','rsv']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Esta noche","en":"Tonight"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, price_from, photos, sort) values (b, 'svc', s, '{"es":"Lista + clase de salsa","en":"List + salsa class"}'::jsonb, '{"es":"Clase gratis a las 8 PM; con la lista, $8 hasta las 9 PM.","en":"Free class at 8 PM; with the list, $8 until 9 PM."}'::jsonb, 800, 60, 'lista', '{"until":540}'::jsonb, 0, false, array['https://images.pexels.com/photos/8281148/pexels-photo-8281148.jpeg?auto=compress&cs=tinysrgb&h=600'], 0);
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, price_from, photos, sort) values (b, 'svc', s, '{"es":"Entrada","en":"Entry"}'::jsonb, '{"es":"$12 con orquesta en vivo.","en":"$12 with a live orchestra."}'::jsonb, 1200, 60, 'cover', '{}'::jsonb, 0, false, array['https://images.pexels.com/photos/6173811/pexels-photo-6173811.jpeg?auto=compress&cs=tinysrgb&h=600'], 1);
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, price_from, photos, sort) values (b, 'svc', s, '{"es":"Mesa frente a la pista","en":"Table by the dance floor"}'::jsonb, '{"es":"Hasta 6 personas. Mínimo $80.","en":"Up to 6 people. $80 minimum."}'::jsonb, 8000, 60, 'mesa', '{"pax":6,"tables":4,"dep":3000}'::jsonb, 3000, false, array['https://images.pexels.com/photos/6173811/pexels-photo-6173811.jpeg?auto=compress&cs=tinysrgb&h=600'], 2);
end $$;
do $$
declare b text := 'billar-los-amigos'; s bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-NOCHE') or exists (select 1 from items where business_id = b and module = 'svc' and removed_at is null) then return; end if;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc','rsv']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Mesas","en":"Tables"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, price_from, photos, sort) values (b, 'svc', s, '{"es":"Mesa de billar","en":"Pool table"}'::jsonb, '{"es":"$10 la hora, hasta 4 jugadores.","en":"$10 an hour, up to 4 players."}'::jsonb, 1000, 60, 'mesa', '{"pax":4,"tables":6,"hr":true}'::jsonb, 0, false, array['https://images.pexels.com/photos/31512997/pexels-photo-31512997.jpeg?auto=compress&cs=tinysrgb&h=600'], 0);
end $$;
do $$
declare b text := 'coal-town-brewing'; s bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-NOCHE') or exists (select 1 from items where business_id = b and module = 'svc' and removed_at is null) then return; end if;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc','rsv']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Esta noche","en":"Tonight"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, price_from, photos, sort) values (b, 'svc', s, '{"es":"Trivia bilingüe","en":"Bilingual trivia"}'::jsonb, '{"es":"Equipos de hasta 6, a las 7 PM. Gratis.","en":"Teams up to 6, at 7 PM. Free."}'::jsonb, 0, 60, 'mesa', '{"pax":6,"tables":4}'::jsonb, 0, false, array['https://images.pexels.com/photos/5530263/pexels-photo-5530263.jpeg?auto=compress&cs=tinysrgb&h=600'], 0);
end $$;
do $$
declare b text := 'el-palacio-show'; s bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-NOCHE') or exists (select 1 from items where business_id = b and module = 'svc' and removed_at is null) then return; end if;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc','rsv']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Mañana viernes","en":"Tomorrow, Friday"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, price_from, photos, sort) values (b, 'svc', s, '{"es":"Comedia dominicana · 9 PM","en":"Dominican comedy · 9 PM"}'::jsonb, '{"es":"Boleto general. Asiento por orden de llegada.","en":"General admission. First come, first seated."}'::jsonb, 2500, 60, 'evento', '{}'::jsonb, 0, false, array['https://images.pexels.com/photos/713149/pexels-photo-713149.jpeg?auto=compress&cs=tinysrgb&h=600'], 0);
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, price_from, photos, sort) values (b, 'svc', s, '{"es":"Mesa frente al escenario","en":"Table by the stage"}'::jsonb, '{"es":"Hasta 4 personas, con 2 boletos incluidos.","en":"Up to 4 people, 2 tickets included."}'::jsonb, 9000, 60, 'mesa', '{"pax":4,"tables":4,"dep":4000}'::jsonb, 4000, false, array['https://images.pexels.com/photos/13230484/pexels-photo-13230484.jpeg?auto=compress&cs=tinysrgb&h=600'], 1);
end $$;
do $$
declare b text := 'dj-rafy-mejia'; s bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-NOCHE') or exists (select 1 from items where business_id = b and module = 'svc' and removed_at is null) then return; end if;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Para tu fecha","en":"For your date"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, price_from, photos, sort) values (b, 'svc', s, '{"es":"Fiesta privada · 4 horas","en":"Private party · 4 hours"}'::jsonb, '{"es":"Cumpleaños, bodas y quinceañeras. Llevo bocinas, luces y micrófono.","en":"Birthdays, weddings and quinceañeras. I bring speakers, lights and a mic."}'::jsonb, 35000, 60, 'fecha', '{}'::jsonb, 0, true, array['https://images.pexels.com/photos/11533554/pexels-photo-11533554.jpeg?auto=compress&cs=tinysrgb&h=600'], 0);
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, price_from, photos, sort) values (b, 'svc', s, '{"es":"Hora extra","en":"Extra hour"}'::jsonb, '{"es":"Si la fiesta sigue.","en":"If the party keeps going."}'::jsonb, 7500, 60, 'fecha', '{}'::jsonb, 0, true, array['https://images.pexels.com/photos/9789246/pexels-photo-9789246.jpeg?auto=compress&cs=tinysrgb&h=600'], 1);
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, price_from, photos, sort) values (b, 'svc', s, '{"es":"Noche en tu local","en":"A night at your venue"}'::jsonb, '{"es":"Para bares y discotecas. El precio es por noche.","en":"For bars and clubs. Priced per night."}'::jsonb, 25000, 60, 'fecha', '{}'::jsonb, 0, true, array['https://images.pexels.com/photos/32589034/pexels-photo-32589034.jpeg?auto=compress&cs=tinysrgb&h=600'], 2);
end $$;
do $$
declare b text := 'welly-cruz-eventos'; s bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-NOCHE') or exists (select 1 from items where business_id = b and module = 'svc' and removed_at is null) then return; end if;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Próximas noches","en":"Upcoming nights"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, price_from, photos, sort) values (b, 'svc', s, '{"es":"Noche Retro 2000 · reguetón viejo","en":"Retro 2000 night · old-school reggaeton"}'::jsonb, '{"es":"Vie 9 oct en Club Caliente. 21+ con identificación.","en":"Fri Oct 9 at Club Caliente. 21+ with ID."}'::jsonb, 1500, 60, 'evento', '{}'::jsonb, 0, false, array['https://images.pexels.com/photos/9005510/pexels-photo-9005510.jpeg?auto=compress&cs=tinysrgb&h=600'], 0);
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, price_from, photos, sort) values (b, 'svc', s, '{"es":"Noche temática en tu local","en":"A theme night at your venue"}'::jsonb, '{"es":"Tú pones el local; yo, la promoción, el DJ y la puerta.","en":"You bring the venue; I bring the promo, the DJ and the door."}'::jsonb, 0, 60, 'fecha', '{}'::jsonb, 0, true, array['https://images.pexels.com/photos/13146320/pexels-photo-13146320.jpeg?auto=compress&cs=tinysrgb&h=600'], 1);
end $$;
do $$
declare b text := 'salon-las-palmas'; s bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-NOCHE') or exists (select 1 from items where business_id = b and module = 'svc' and removed_at is null) then return; end if;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Para tu fiesta","en":"For your party"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, price_from, photos, sort) values (b, 'svc', s, '{"es":"Salón · 5 horas","en":"Hall · 5 hours"}'::jsonb, '{"es":"Hasta 150 personas. Mesas, sillas y limpieza incluidas.","en":"Up to 150 guests. Tables, chairs and cleanup included."}'::jsonb, 65000, 60, 'fecha', '{"pax":150}'::jsonb, 0, true, array['https://images.pexels.com/photos/17109123/pexels-photo-17109123.jpeg?auto=compress&cs=tinysrgb&h=600'], 0);
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, price_from, photos, sort) values (b, 'svc', s, '{"es":"Salón + DJ y luces","en":"Hall + DJ and lights"}'::jsonb, '{"es":"Lo mismo, con DJ por 4 horas.","en":"The same, with a DJ for 4 hours."}'::jsonb, 95000, 60, 'fecha', '{"pax":150}'::jsonb, 0, true, array['https://images.pexels.com/photos/17109158/pexels-photo-17109158.jpeg?auto=compress&cs=tinysrgb&h=600'], 1);
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, price_from, photos, sort) values (b, 'svc', s, '{"es":"Decoración","en":"Decorations"}'::jsonb, '{"es":"Centros de mesa y arco de globos.","en":"Centerpieces and a balloon arch."}'::jsonb, 18000, 60, 'fecha', '{}'::jsonb, 0, true, array['https://images.pexels.com/photos/33602222/pexels-photo-33602222.jpeg?auto=compress&cs=tinysrgb&h=600'], 2);
end $$;
do $$
declare b text := 'skyline-rooftop'; s bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-NOCHE') or exists (select 1 from items where business_id = b and module = 'svc' and removed_at is null) then return; end if;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc','rsv']::text[]))) where id = b;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Esta noche","en":"Tonight"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, price_from, photos, sort) values (b, 'svc', s, '{"es":"Mesa en la terraza","en":"Rooftop table"}'::jsonb, '{"es":"Hasta 6 personas. Mínimo $120. Casual elegante.","en":"Up to 6 people. $120 minimum. Smart casual."}'::jsonb, 12000, 60, 'mesa', '{"pax":6,"tables":4,"dep":4000}'::jsonb, 4000, false, array['https://images.pexels.com/photos/35005900/pexels-photo-35005900.jpeg?auto=compress&cs=tinysrgb&h=600'], 0);
end $$;
insert into night_posts (business_id, city_id, night, field, value, at)
select b.id, b.city_id, n.d, v.f, v.val::jsonb, ((n.d + time '12:00') + make_interval(mins => v.m)) at time zone ci.timezone
  from businesses b join cities ci on ci.id = b.city_id
  cross join lateral (select (((now() at time zone ci.timezone) - interval '6 hours')::date - k) as d from generate_series(1, 7) k) n
  cross join lateral (values ('cover', '{"cents":1000}', 480), ('after', '{"min":660,"cents":1500}', 481), ('line', '0', 570), ('line', '10', 630), ('line', '20', 690), ('line', '10', 780)) v(f, val, m)
 where b.id = 'la-terraza-night' and b.is_demo and extract(dow from n.d)::int in (4, 5, 6)
   and not exists (select 1 from night_posts p where p.business_id = b.id);
insert into users (phone, first_name, last_name, lang, home_city_id) select '+15705550366', 'Héctor', 'Almánzar', 'es', 'hzl' where exists (select 1 from businesses where id = 'la-terraza-night' and is_demo) on conflict (phone) do nothing;
insert into business_members (business_id, user_id, kind, display_name, role, status, show_on_page, panel_access, since_year, sort, same_as_business_hours) select 'la-terraza-night', u.id, 'owner', 'Héctor Almánzar', '{"es":"Dueño","en":"Owner"}'::jsonb, 'active', true, '{all}', 2014, 0, true from users u where u.phone = '+15705550366' and exists (select 1 from businesses where id = 'la-terraza-night' and is_demo) and not exists (select 1 from business_members m where m.business_id = 'la-terraza-night' and m.kind = 'owner');
insert into stripe_accounts (business_id, stripe_account_id, status, charges_enabled, payouts_enabled, requirements, bank_last4, simulated)
  select 'la-terraza-night', 'acct_sim_la-terraza-night', 'enabled', true, true, '[]'::jsonb, '4288', true where exists (select 1 from businesses where id = 'la-terraza-night' and is_demo) on conflict (business_id) do nothing;
commit;
