-- Semilla de pruebas · 6c · Boletos. SOLO SANDBOX.
-- Para «Jueves de Bachata en Vivo» (La Terraza, semilla 0035): dos códigos del organizador (TERRAZA10 −10 %, 30 usos; AMIGOS5 −$5, 10 usos) y
-- dos órdenes B- ya pagadas de vecinos de prueba (Yokasta y Ramón, de la semilla 0007) con pagos simulados (`simulated`, PaymentIntent
-- pi_sim_semilla_*): 2 entradas generales y 1 mesa de pista. La comisión de cada boleto sale de fee_rules «bol» (5 % + $1), como en la app.
-- Las cortesías y la lista de espera llegan con 6d.
-- Base nueva sin equipo (CI): si el evento no está en vivo (quedó en revisión porque no hay quien lo apruebe) o su fecha ya pasó, no se
-- siembran órdenes; los códigos sí. Idempotente: cada orden se reconoce por su client_key fijo y no se repite; los códigos, por (evento, código).
begin;

do $$
declare
  e record; d record; u record; op bigint; tt record; mt record; n int; i int; fee int; total int; pi text; k uuid; fr record;
  ordenes jsonb := $j$[
    {"phone":"+15705550201","key":"6c000000-0000-4000-8000-000000000001","tipos":[["gen",2]],"mesa":null,"pm":"pm_sim_visa_4242","marca":"visa","l4":"4242","nombres":["Yokasta M","Daisy T"]},
    {"phone":"+15705550203","key":"6c000000-0000-4000-8000-000000000002","tipos":[],"mesa":"pista","pm":"pm_sim_mc_4444","marca":"mc","l4":"4444","nombres":["Ramón A"]}
  ]$j$;
  o jsonb; x jsonb;
begin
  select ev.* into e from events ev where ev.business_id = 'la-terraza-night' and ev.title->>'es' = 'Jueves de Bachata en Vivo' order by ev.id limit 1;
  if not found then return; end if;
  perform evt_sincronizar_venta(e.id);
  insert into discount_codes (event_id, city_id, business_id, code, kind, value, uses_max)
  values (e.id, e.city_id, e.business_id, 'TERRAZA10', 'pct', 10, 30), (e.id, e.city_id, e.business_id, 'AMIGOS5', 'amount', 500, 10)
  on conflict (event_id, code) do nothing;
  if e.status <> 'live' then return; end if;
  select * into d from event_dates where event_id = e.id and status = 'scheduled' and ends_at > now() order by starts_at limit 1;
  if not found then return; end if;
  select rate_bp, fixed_cents into fr from fee_rules where kind = 'bol' and effective_from <= now() order by effective_from desc, id desc limit 1;
  for o in select value from jsonb_array_elements(ordenes) loop
    select * into u from users where phone = o->>'phone';
    continue when not found;
    k := (o->>'key')::uuid;
    continue when exists (select 1 from operations where user_id = u.id and client_key = k);
    total := 0;
    for x in select value from jsonb_array_elements(o->'tipos') loop
      select * into tt from ticket_types where event_id = e.id and cfg_key = x->>0;
      total := total + tt.price_cents * (x->>1)::int;
    end loop;
    if o->>'mesa' is not null then select * into mt from event_tables where event_id = e.id and cfg_key = o->>'mesa'; total := total + mt.deposit_cents; end if;
    continue when total = 0;
    insert into operations (number, kind, city_id, business_id, user_id, status, details, subtotal_cents, total_cents, pay_mode, confirmed_at, client_key, is_test, pay_status)
    values ('B-' || nextval('ticket_order_seq'), 'tickets', d.city_id, e.business_id, u.id, 'confirmed',
            jsonb_build_object('event_id', e.id::text, 'event_date_id', d.id::text, 'title', e.title, 'venue', 'La Terraza Night Club', 'local_date', d.local_date::text,
                               'h0', (extract(hour from d.starts_at at time zone (select timezone from cities where id = d.city_id)) * 60 + extract(minute from d.starts_at at time zone (select timezone from cities where id = d.city_id)))::int),
            total, total, 'app', now(), k, true, 'captured') returning id into op;
    fee := 0; i := 0;
    for x in select value from jsonb_array_elements(o->'tipos') loop
      select * into tt from ticket_types where event_id = e.id and cfg_key = x->>0;
      n := (x->>1)::int;
      update ticket_stock set sold_n = sold_n + n where ticket_type_id = tt.id and event_date_id = d.id;
      insert into operation_lines (operation_id, item_id, name, qty, unit_price_cents, line_total_cents, tax_pct, options)
      values (op, null, tt.name, n, tt.price_cents, tt.price_cents * n, 0, jsonb_build_array(jsonb_build_object('k', 't', 'id', tt.id::text)));
      for j in 1..n loop
        i := i + 1;
        insert into tickets (event_date_id, event_id, city_id, ticket_type_id, operation_id, holder_user_id, holder_name, admits, kind, price_cents, fee_cents)
        values (d.id, e.id, d.city_id, tt.id, op, u.id, o->'nombres'->>(i - 1), 1, 'paid', tt.price_cents, least(tt.price_cents, round(tt.price_cents * fr.rate_bp / 10000.0)::int + fr.fixed_cents));
        fee := fee + least(tt.price_cents, round(tt.price_cents * fr.rate_bp / 10000.0)::int + fr.fixed_cents);
      end loop;
    end loop;
    if o->>'mesa' is not null then
      update table_stock set sold_n = sold_n + 1 where table_id = mt.id and event_date_id = d.id;
      insert into operation_lines (operation_id, item_id, name, qty, unit_price_cents, line_total_cents, tax_pct, options)
      values (op, null, mt.zone, 1, mt.deposit_cents, mt.deposit_cents, 0, jsonb_build_array(jsonb_build_object('k', 'm', 'id', mt.id::text)));
      insert into tickets (event_date_id, event_id, city_id, table_id, operation_id, holder_user_id, holder_name, admits, kind, price_cents, fee_cents)
      values (d.id, e.id, d.city_id, mt.id, op, u.id, o->'nombres'->>0, mt.seats, 'paid', mt.deposit_cents, least(mt.deposit_cents, round(mt.deposit_cents * fr.rate_bp / 10000.0)::int + fr.fixed_cents));
      fee := fee + least(mt.deposit_cents, round(mt.deposit_cents * fr.rate_bp / 10000.0)::int + fr.fixed_cents);
    end if;
    pi := 'pi_sim_semilla_' || replace(k::text, '-', '');
    insert into sim_intents (id, amount_cents, fee_cents, destination, status, captured_cents, card) values (pi, total, 0, 'tolatino', 'succeeded', total, o->>'pm') on conflict (id) do nothing;
    insert into payments (operation_id, user_id, business_id, city_id, kind, method, stripe_payment_intent, amount_cents, held_cents, fee_cents, status, card_brand, card_last4, held_at, captured_at, simulated, payment_method, transfer_group)
    values (op, u.id, e.business_id, d.city_id, 'full', 'card', pi, total, total, least(fee, total), 'captured', o->>'marca', o->>'l4', now(), now(), true, o->>'pm', 'evt-' || e.id);
    insert into ticket_log (ticket_id, operation_id, city_id, kind, by_user, by_kind) select id, operation_id, city_id, 'emitido', u.id, 'user' from tickets where operation_id = op;
    insert into operation_events (operation_id, kind, actor, actor_id) values (op, 'tickets_sold', 'user', u.id);
    insert into operation_events (operation_id, kind, actor) values (op, 'payment_captured', 'system');
  end loop;
end $$;

commit;
