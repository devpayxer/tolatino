-- Semilla de pruebas · 9a · Lo que 0040, 0044, 0045 y 0046 no hacen en una base NUEVA. SOLO SANDBOX (decisión I; regla 13). Todo is_test.
-- Las semillas ya confirmadas no se editan (9a): esta las completa.
--   · En una base recién sembrada no existen Ana (+1 570 555 0199, del equipo), Juan (+1 570 555 0144, repartidor de Sabor Dominicano) ni
--     Lucía (+1 570 555 0155): las creaban las pruebas al entrar. Sin ellas, 0044 no les pone sus teléfonos de push, 0045 no crea los testers
--     ni el caso de «Reportar un problema» de Lucía y 0046 no crea las entregas de Juan (LAUNCH L1239, L1265; el CI de tiendas creaba a Juan a mano).
--     Aquí se crean (números de FICCIÓN 555; on conflict: si ya existen, no se tocan) y Ana queda como Admin SOLO si la base no tiene ningún Admin
--     (la misma regla que el código de arranque del primer Admin; en el sandbox de siempre ya lo es y no cambia nada).
--   · Después se repiten, tal cual, los bloques idempotentes de 0044, 0045 (testers y el caso de Lucía) y 0046: en una base que ya los tenía no
--     hacen nada; en una nueva hacen lo que les faltó.
--   · El pedido pagado de Marisol en El Fogón (0040, client_key …00a1) nació sin líneas: su «Ayuda con el pedido › Falta algo» no tenía platos
--     (LAUNCH L1041). Se le ponen dos líneas que suman su subtotal ($80), solo si no tiene ninguna.
begin;

insert into users (phone, phone_verified_at, first_name, last_name, home_city_id) values
  ('+15705550199', now(), 'Ana', 'Equipo', 'hzl'),
  ('+15705550144', now(), 'Juan', 'Repartidor', 'hzl'),
  ('+15705550155', now(), 'Lucía', 'Prueba', 'hzl')
on conflict (phone) do nothing;
insert into staff_members (user_id, role)
  select id, 'admin' from users where phone = '+15705550199' and not exists (select 1 from staff_members where role = 'admin' and status = 'active')
on conflict (user_id) do nothing;

-- ── 0040: las líneas del pedido de El Fogón ──
do $$
declare op bigint;
begin
  select o.id into op from operations o join users u on u.id = o.user_id
   where u.phone = '+15705550122' and o.client_key = 'b0e1c6b0-0040-4000-8000-0000000000a1';
  if op is not null and not exists (select 1 from operation_lines where operation_id = op) then
    insert into operation_lines (operation_id, item_id, name, qty, unit_price_cents, line_total_cents, tax_pct) values
      (op, null, '{"es":"Parrillada para dos","en":"Grill platter for two"}'::jsonb, 1, 4500, 4500, 6),
      (op, null, '{"es":"Chuleta a la parrilla","en":"Grilled pork chop"}'::jsonb, 2, 1750, 3500, 6);
  end if;
end $$;

-- ── 0044 (repetido tal cual: idempotente) ──
do $$
declare u users; l users; x record; tid bigint; nid bigint; oid bigint; t2 bigint; quien users; tok bigint;
begin
  for x in select * from (values
      ('+15705550210', 'cliente', 'ios', 'iPhone · To''Latino'),
      ('+15705550155', 'cliente', 'android', 'Android · To''Latino'),
      ('+15705550333', 'negocio', 'android', 'Android · To''Latino Negocios'),
      ('+15705550144', 'delivery', 'android', 'Android · To''Latino Repartidor'),
      ('+15705550512', 'checkin', 'ios', 'iPhone · To''Latino Puerta')
    ) v(tel, app, plat, label) loop
    select * into u from users where phone = x.tel;
    continue when u.id is null;
    if not exists (select 1 from push_tokens where token_hash = encode(sha256(convert_to('semilla:push:' || x.tel || ':' || x.app, 'UTF8')), 'hex')) then
      insert into push_tokens (user_id, city_id, app, platform, provider, token_enc, token_hash, label, lang, is_test, last_seen_at)
      values (u.id, u.home_city_id, x.app, x.plat, 'sim', gen_random_bytes(48), encode(sha256(convert_to('semilla:push:' || x.tel || ':' || x.app, 'UTF8')), 'hex'), x.label, u.lang, true, now());
    end if;
  end loop;

  -- Lucía: un teléfono anterior que el proveedor dio por inválido (revocado solo, como haría el trabajador con un 410).
  select * into u from users where phone = '+15705550155';
  if u.id is not null and not exists (select 1 from push_tokens where token_hash = encode(sha256(convert_to('semilla:push:+15705550155:viejo', 'UTF8')), 'hex')) then
    insert into push_tokens (user_id, city_id, app, platform, provider, token_enc, token_hash, label, lang, is_test, last_seen_at)
    values (u.id, u.home_city_id, 'cliente', 'android', 'sim', gen_random_bytes(48), encode(sha256(convert_to('semilla:push:+15705550155:viejo', 'UTF8')), 'hex'), 'Android · To''Latino', u.lang, true, now() - interval '40 days')
    returning id into t2;
    update push_tokens set revoked_at = now(), revoked_reason = 'invalido' where id = t2;
  end if;

  -- Héctor: un aviso por resultado, con su intento anotado.
  select * into u from users where phone = '+15705550210';
  if u.id is not null then
    select id into tid from push_tokens where token_hash = encode(sha256(convert_to('semilla:push:+15705550210:cliente', 'UTF8')), 'hex');
    select * into l from users where phone = '+15705550155';
    select id into t2 from push_tokens where token_hash = encode(sha256(convert_to('semilla:push:+15705550155:viejo', 'UTF8')), 'hex');
    for x in select * from (values ('enviado', 'enviado', null::text, 201), ('pruebas', 'pruebas', 'simulado', null), ('invalido', 'fallo', 'Unregistered', 410),
                                   ('rechazado', 'fallo', 'BadRequest', 400), ('limite', 'enviado', 'TooManyRequests', 429), ('error', 'enviado', 'HTTP 503', 503), ('apagado', 'fallo', 'canal_apagado', null)) v(res, pst, code, http) loop
      -- El token inválido es el viejo de Lucía (por eso quedó revocado); lo demás, el iPhone de Héctor.
      if x.res = 'invalido' then quien := l; tok := t2; else quien := u; tok := tid; end if;
      continue when quien.id is null or tok is null;
      continue when exists (select 1 from notifications where user_id = quien.id and ref_kind = 'semilla_push' and ref_id = x.res);
      insert into notifications (user_id, city_id, tpl, title, body, href, ref_kind, ref_id, sms_status, push_status, push_at, created_at)
      values (quien.id, quien.home_city_id, 'push_prueba', 'Prueba de avisos', 'Si ves esto en tu teléfono, los avisos de To''Latino te llegan bien.', '/avisos', 'semilla_push', x.res,
              'no', x.pst, now() - interval '3 hours', now() - interval '3 hours')
      returning id into nid;
      insert into push_outbox (notification_id, token_id, city_id, priority, payload_enc, expires_at, tries, status)
      values (nid, tok, quien.home_city_id, 'normal', null, now() + interval '21 hours', case when x.res in ('limite', 'error') then 2 else 1 end, case when x.pst = 'fallo' then 'fallo' else 'hecho' end)
      returning id into oid;
      -- Un límite o un error se reintentan: el primer intento falló y el segundo llegó.
      if x.res in ('limite', 'error') then
        insert into push_deliveries (outbox_id, notification_id, token_id, tpl, city_id, app, platform, provider, result, error_code, http_status, ms, is_test)
        values (oid, nid, tok, 'push_prueba', quien.home_city_id, 'cliente', 'ios', 'sim', x.res, x.code, x.http, 180, true);
      end if;
      insert into push_deliveries (outbox_id, notification_id, token_id, tpl, city_id, app, platform, provider, result, error_code, http_status, ms, is_test)
      values (oid, nid, tok, 'push_prueba', quien.home_city_id, 'cliente', case when tok = t2 then 'android' else 'ios' end, 'sim', case when x.res in ('limite', 'error') then 'enviado' else x.res end,
              case when x.res in ('limite', 'error') then null else x.code end, case when x.res in ('limite', 'error') then 200 else x.http end, 120, true);
    end loop;
  end if;
end $$;


-- ── 0045: testers y el caso de Lucía (repetido tal cual: idempotente) ──
do $$
declare ana uuid; u users; b record; t bigint; c support_cases;
begin
  -- ── Testers ──
  select id into ana from users where phone = '+15705550199';
  if ana is not null then
    for b in select * from (values
        ('+15705550144', 'delivery', 'android', 'apk_propio', 'activo', 'Repartidor de prueba en Sabor Dominicano', null::text),
        ('+15705550155', 'cliente', 'android', 'play_interno', 'pendiente_consola', 'Vecina de confianza (Android)', null),
        ('+15705550210', 'cliente', 'android', 'apk_propio', 'quitado', 'Vecino de confianza (Android)', 'Terminó la prueba de octubre')
      ) v(tel, app, plat, canal, estado, motivo, quitado) loop
      select * into u from users where phone = b.tel;
      continue when u.id is null;
      continue when exists (select 1 from beta_testers where user_id = u.id and app = b.app and platform = b.plat);
      insert into beta_testers (user_id, city_id, app, platform, channel, status, sync, invited_by, invite_reason, is_test)
      values (u.id, u.home_city_id, b.app, b.plat, b.canal, case when b.estado = 'quitado' then 'activo' else b.estado end, 'ok', ana, b.motivo, true)
      returning id into t;
      if b.quitado is not null then
        update beta_testers set status = 'quitado', removed_at = now(), removed_by = ana, removed_reason = b.quitado where id = t;
      end if;
    end loop;
  end if;

  -- ── Un «Reportar un problema» de Lucía, con su registro técnico ──
  select * into u from users where phone = '+15705550155';
  if u.id is not null and not exists (select 1 from support_cases where user_id = u.id and client_key = 'b0e1c6b0-0045-4000-8000-000000000001') then
    insert into support_cases (number, user_id, city_id, topic, origin, priority, device, app_version, client_key, is_test)
    values ('TK-' || nextval('support_case_seq'), u.id, coalesce(u.home_city_id, 'hzl'), 'tecnico', 'reporte_app', 'normal', 'Android · app', 'To''Latino 1.0.0 (6)', 'b0e1c6b0-0045-4000-8000-000000000001', true)
    returning * into c;
    insert into support_messages (case_id, city_id, sender, user_id, body, at) values (c.id, c.city_id, 'user', u.id, 'Mis boletos se queda en blanco cuando abro la app sin señal. Con señal sí salen.', c.created_at);
    insert into support_messages (case_id, city_id, sender, sys_key, vars, at) values (c.id, c.city_id, 'system', 'recibido', jsonb_build_object('num', c.number), c.created_at + interval '1 second');
    insert into support_case_logs (case_id, city_id, kind, body) values (c.id, c.city_id, 'registro_app', jsonb_build_object(
      'sistema', 'Android 14', 'modelo', 'Pixel 6a',
      'lineas', jsonb_build_array('09:41:02 pantalla /', '09:41:10 pantalla /cuenta', '09:41:14 pantalla /cuenta/boletos', '09:41:30 señal: no',
                                  '09:41:31 pantalla /cuenta/boletos/sin-conexion', '09:41:33 error TypeError: Cannot read properties of null (reading ''llave'')')));
  end if;
end $$;

-- ── 0046 (repetido tal cual: idempotente) ──
do $$
declare juan users; hector users; did bigint; dir uuid; op bigint; num text; t0 timestamptz; i integer;
  lat0 constant double precision := 40.95500; lng0 constant double precision := -75.97818;
begin
  select * into juan from users where phone = '+15705550144';
  select * into hector from users where phone = '+15705550210';
  if juan.id is null or hector.id is null or not exists (select 1 from businesses where id = 'sabor-dominicano') then return; end if;
  if not exists (select 1 from feature_flags where key = 'app.ubicacion_vivo' and enabled) then return; end if;

  -- Juan, repartidor activo de Sabor Dominicano.
  select id into did from delivery_drivers where business_id = 'sabor-dominicano' and user_id = juan.id and status = 'active' order by id limit 1;
  if did is null then
    update delivery_drivers set status = 'removed', removed_at = now(), removed_reason = 'semilla 8e', online = false, invite_code = null
     where business_id = 'sabor-dominicano' and phone = '+15705550144' and status = 'invited';
    insert into delivery_drivers (business_id, user_id, display_name, phone, vehicle, status, online, online_at, accepted_at)
    values ('sabor-dominicano', juan.id, 'Juan Repartidor', '+15705550144', 'moto', 'active', true, now(), now() - interval '20 days') returning id into did;
  end if;

  -- La dirección de Héctor (con su punto en el mapa).
  select id into dir from user_addresses where user_id = hector.id and street = '701 N Wyoming St' and removed_at is null limit 1;
  if dir is null then
    insert into user_addresses (user_id, label, street, apt, zip, geo, geo_quality, city_id)
    values (hector.id, 'casa', '701 N Wyoming St', null, '18201', st_setsrid(st_makepoint(-75.97806, 40.96260), 4326)::geography, 'numero', 'hzl') returning id into dir;
  end if;

  -- ── La entrega ACTIVA ──
  if not exists (select 1 from operations where user_id = hector.id and client_key = 'c0e1c6b0-0046-4000-8000-0000000000a1') then
    num := nextval('operations_order_seq')::text;
    t0 := now() - interval '14 minutes';
    insert into operations (number, kind, city_id, business_id, user_id, status, stage, mode, details, subtotal_cents, delivery_cents, tax_cents, total_cents, pay_mode,
                            sent_at, answered_at, confirmed_at, ready_at, client_key, driver_id, is_test)
    values (num, 'order', 'hzl', 'sabor-dominicano', hector.id, 'confirmed', 'ready', 'delivery',
            jsonb_build_object('to', jsonb_build_object('label', 'casa', 'street', '701 N Wyoming St', 'apt', null, 'zip', '18201', 'mi', 0.5, 'addressId', dir::text),
                               'drop', jsonb_build_object('drop', 'mano', 'at', '["timbre"]'::jsonb, 'note', '')),
            900, 300, 54, 1254, 'entrega', now() - interval '35 minutes', now() - interval '33 minutes', now() - interval '33 minutes', now() - interval '15 minutes',
            'c0e1c6b0-0046-4000-8000-0000000000a1', did, true)
    returning id into op;
    insert into operation_lines (operation_id, item_id, name, qty, unit_price_cents, line_total_cents, tax_pct)
    select op, x.id, x.name, 1, x.price_cents, x.price_cents, 6 from items x where x.business_id = 'sabor-dominicano' and x.id in (11, 9);
    insert into operation_events (operation_id, kind, actor, actor_id, at) values
      (op, 'sent', 'user', hector.id, now() - interval '35 minutes'), (op, 'accepted', 'business', null, now() - interval '33 minutes');
    insert into operation_events (operation_id, kind, actor, actor_id, note, at) values
      (op, 'driver_assigned', 'member', null, '{"es":"Asignado a Juan Repartidor","en":"Assigned to Juan Repartidor"}', now() - interval '20 minutes'),
      (op, 'driver_started', 'member', juan.id, '{"es":"El repartidor va por el pedido","en":"The driver is heading to pick it up"}', t0);
    -- La ruta empieza con «Voy por el pedido» (sin teléfono: sin token) y el cliente la ve desde «Recogí».
    insert into delivery_tracks (operation_id, city_id, business_id, rider_user_id, driver_id, started_step, sharing_from, is_test)
    values (op, 'hzl', 'sabor-dominicano', juan.id, did, 'empezar', t0, true);
    update operations set stage = 'on_the_way', updated_at = now() where id = op;
    insert into operation_events (operation_id, kind, actor, actor_id, note, at) values
      (op, 'on_the_way', 'member', juan.id, '{"es":"El repartidor recogió el pedido","en":"The driver picked up the order"}', now() - interval '8 minutes');
    update delivery_tracks set customer_from = now() - interval '8 minutes' where operation_id = op and sharing_until is null;
    for i in 0..29 loop
      insert into delivery_positions (operation_id, rider_user_id, city_id, at, geom, accuracy_m, speed_mps, heading, source, is_test)
      values (op, juan.id, 'hzl', t0 + make_interval(secs => i * 25),
              st_setsrid(st_makepoint(lng0 + 0.000004 * sin(i / 3.0), lat0 + i * 0.00024), 4326)::geography, 6 + (i % 4), 1.1, 0, 'app', true);
    end loop;
  end if;

  -- ── La entrega TERMINADA ayer (su resumen y su recorrido) ──
  if not exists (select 1 from operations where user_id = hector.id and client_key = 'c0e1c6b0-0046-4000-8000-0000000000a2') then
    num := nextval('operations_order_seq')::text;
    t0 := now() - interval '1 day' - interval '40 minutes';
    insert into operations (number, kind, city_id, business_id, user_id, status, stage, mode, details, subtotal_cents, delivery_cents, tax_cents, total_cents, pay_mode,
                            sent_at, answered_at, confirmed_at, ready_at, client_key, driver_id, is_test)
    values (num, 'order', 'hzl', 'sabor-dominicano', hector.id, 'confirmed', 'on_the_way', 'delivery',
            jsonb_build_object('to', jsonb_build_object('label', 'casa', 'street', '701 N Wyoming St', 'apt', null, 'zip', '18201', 'mi', 0.5, 'addressId', dir::text),
                               'drop', jsonb_build_object('drop', 'puerta', 'at', '[]'::jsonb, 'note', '')),
            650, 300, 39, 989, 'entrega', t0 - interval '20 minutes', t0 - interval '18 minutes', t0 - interval '18 minutes', t0, 'c0e1c6b0-0046-4000-8000-0000000000a2', did, true)
    returning id into op;
    insert into operation_lines (operation_id, item_id, name, qty, unit_price_cents, line_total_cents, tax_pct)
    select op, x.id, x.name, 1, x.price_cents, x.price_cents, 6 from items x where x.business_id = 'sabor-dominicano' and x.id = 16;
    insert into operation_events (operation_id, kind, actor, actor_id, at) values (op, 'sent', 'user', hector.id, t0 - interval '20 minutes'), (op, 'accepted', 'business', null, t0 - interval '18 minutes');
    insert into operation_events (operation_id, kind, actor, actor_id, note, at) values
      (op, 'on_the_way', 'member', juan.id, '{"es":"El repartidor recogió el pedido","en":"The driver picked up the order"}', t0);
    insert into delivery_tracks (operation_id, city_id, business_id, rider_user_id, driver_id, started_step, sharing_from, customer_from, is_test)
    values (op, 'hzl', 'sabor-dominicano', juan.id, did, 'recogi', t0, t0, true);
    for i in 0..29 loop
      insert into delivery_positions (operation_id, rider_user_id, city_id, at, geom, accuracy_m, speed_mps, heading, source, is_test)
      values (op, juan.id, 'hzl', t0 + make_interval(secs => i * 25), st_setsrid(st_makepoint(lng0 + 0.000003 * cos(i / 4.0), lat0 + i * 0.00026), 4326)::geography, 5 + (i % 3), 1.2, 0, 'app', true);
    end loop;
    -- Entregado (la base cierra la ruta: «entregado») y la hora de verdad de ayer.
    update operations set status = 'done', stage = 'delivered', done_at = t0 + interval '13 minutes', cash_collected_cents = total_cents, cash_collected_at = t0 + interval '13 minutes', updated_at = now() where id = op;
    insert into operation_events (operation_id, kind, actor, actor_id, note, at) values
      (op, 'delivered', 'member', juan.id, '{"es":"Entregado · cobró $9.89 en efectivo","en":"Delivered · collected $9.89 cash"}', t0 + interval '13 minutes');
    update delivery_tracks set sharing_until = t0 + interval '13 minutes' where operation_id = op and ended_reason = 'entregado';
  end if;
end $$;

commit;
