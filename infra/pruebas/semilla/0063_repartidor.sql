-- Semilla de pruebas · 9n · El Repartidor: prueba de entrega, código de recogida, oferta y Super Admin › Repartidores. SOLO SANDBOX (decisión I; regla 13).
-- NUMERACIÓN: el plan la llamaba 0056_repartidor.sql; 0056 es de 9h y 0062 queda libre para otro bloque, así que 9n es 0063 (anotado en REVISION).
-- Para que el panel (Entrega › Al recoger y al entregar, el detalle con el código de recogida), el Repartidor y Super Admin › Repartidores se vean con algo:
--   · Sabor Dominicano pide código de recogida y prueba de entrega.
--   · Una entrega de Héctor (+1 570 555 0210) ENTREGADA ayer por Juan (+1 570 555 0144) con el código del cliente como prueba.
--   · Una incidencia ABIERTA de Juan (accidente leve con la moto) con su caso en Colas («Incidencias de entrega»).
-- Todo is_test. Idempotente: el pedido por su client_key fijo; la incidencia, una abierta por pedido.
begin;

do $$
declare juan users; hector users; did bigint; op bigint; num text; inc bigint;
begin
  select * into juan from users where phone = '+15705550144';
  select * into hector from users where phone = '+15705550210';
  if juan.id is null or hector.id is null or not exists (select 1 from businesses where id = 'sabor-dominicano') then return; end if;
  select id into did from delivery_drivers where business_id = 'sabor-dominicano' and user_id = juan.id and status = 'active' order by id limit 1;
  if did is null then return; end if;

  insert into delivery_settings (business_id, proof, pickup_code) values ('sabor-dominicano', true, true)
  on conflict (business_id) do update set proof = true, pickup_code = true where not delivery_settings.proof or not delivery_settings.pickup_code;

  -- ── La entrega de ayer, con el código del cliente ──
  if not exists (select 1 from operations where user_id = hector.id and client_key = 'c0e1c6b0-0063-4000-8000-0000000000b1') then
    num := nextval('operations_order_seq')::text;
    insert into operations (number, kind, city_id, business_id, user_id, status, stage, mode, details, subtotal_cents, delivery_cents, tax_cents, total_cents, pay_mode,
                            sent_at, answered_at, confirmed_at, ready_at, client_key, driver_id, is_test)
    values (num, 'order', 'hzl', 'sabor-dominicano', hector.id, 'confirmed', 'on_the_way', 'delivery',
            jsonb_build_object('to', jsonb_build_object('label', 'casa', 'street', '701 N Wyoming St', 'apt', null, 'zip', '18201', 'mi', 0.5),
                               'drop', jsonb_build_object('drop', 'mano', 'at', '["timbre"]'::jsonb, 'note', '')),
            900, 300, 54, 1254, 'entrega', now() - interval '1 day 2 hours', now() - interval '1 day 2 hours', now() - interval '1 day 2 hours', now() - interval '1 day 90 minutes',
            'c0e1c6b0-0063-4000-8000-0000000000b1', did, true)
    returning id into op;
    insert into operation_lines (operation_id, item_id, name, qty, unit_price_cents, line_total_cents, tax_pct)
    select op, x.id, x.name, 1, x.price_cents, x.price_cents, 6 from items x where x.business_id = 'sabor-dominicano' and x.id = 11;
    -- La prueba primero (la base la exige al cerrar: operations_prueba) y después «entregado».
    insert into delivery_proofs (operation_id, city_id, kind, driver_id, actor_id, at) values (op, 'hzl', 'codigo', did, juan.id, now() - interval '1 day 1 hour');
    update delivery_codes set recogido_at = now() - interval '1 day 80 minutes' where operation_id = op;
    update operations set status = 'done', stage = 'delivered', done_at = now() - interval '1 day 1 hour', cash_collected_cents = 1254, cash_collected_at = now() - interval '1 day 1 hour' where id = op;
    insert into operation_events (operation_id, kind, actor, actor_id, note, at) values
      (op, 'sent', 'user', hector.id::text, null, now() - interval '1 day 2 hours'),
      (op, 'delivered', 'member', juan.id::text, '{"es":"Entregado · código del cliente","en":"Delivered · customer code"}', now() - interval '1 day 1 hour');
  end if;
  select id into op from operations where user_id = hector.id and client_key = 'c0e1c6b0-0063-4000-8000-0000000000b1';

  -- ── La incidencia abierta (y su caso en Colas) ──
  if not exists (select 1 from delivery_incidents where operation_id = op and kind = 'accidente') then
    insert into delivery_incidents (operation_id, driver_user, driver_id, business_id, city_id, kind, note)
    values (op, juan.id, did, 'sabor-dominicano', 'hzl', 'accidente', '{"es":"Accidente leve con la moto en la entrega del pedido (semilla del sandbox): nadie salió herido.","en":"Minor motorbike accident on the delivery (sandbox seed): nobody was hurt."}')
    returning id into inc;
    insert into queue_items (queue, subject_kind, subject_id, business_id, city_id, priority) values ('entrega', 'delivery_incident', inc::text, 'sabor-dominicano', 'hzl', 'alta')
    on conflict do nothing;
  end if;
end $$;

commit;
