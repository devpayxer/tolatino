-- Semilla de pruebas · 8e · La ruta en vivo del Repartidor. SOLO SANDBOX (decisión I). NUMERACIÓN: el plan la llamaba 0045_ruta.sql; 0045 la tomó
-- 8f (0045_apps_beta.sql), así que 8e es 0046 (anotado en el plan y en REVISION).
-- Para que el pedido del cliente, el panel (Entrega › Despacho), Transacciones › «Ver recorrido» y Configuración › Apps se vean con algo:
--   · Juan (+1 570 555 0144) como repartidor activo de Sabor Dominicano (si no lo es ya).
--   · Una entrega ACTIVA de Héctor (+1 570 555 0210) en Hazleton, en camino: 30 posiciones por N Wyoming St desde Sabor Dominicano hacia el norte
--     (una cada 25 s, a paso de moto en el centro; la última hace ~2 min, así el mapa la muestra «hace 2 min» y luego como vieja).
--   · Otra ENTREGADA ayer con su resumen (distancia, posiciones) y su ruta, para el recorrido del Super Admin.
-- Las posiciones entran por la base de verdad (el trigger de 0128 las vuelve a revisar: entrega activa, de ese repartidor, en esa ciudad,
-- velocidad posible). Sin token (ningún teléfono comparte esta entrega). Todo is_test. Idempotente: cada pedido por su client_key fijo.
-- La regresión del Repartidor (rep2l) borra los repartidores y les quita las entregas: entonces la ruta activa de aquí se cierra sola
-- («reasignado»), como pasaría en la vida real.
begin;

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
