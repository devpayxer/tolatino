-- Semilla de pruebas · 6i · Evento privado. SOLO SANDBOX.
-- Ajustes de Evento privado de Sabor Dominicano (hasta 40), El Fogón de Wyoming St (60) y Mariscos La Bahía (30) (evp-flow.js CAP), con los menús y
-- extras del diseño, y en Sabor Dominicano una solicitud en cada estado, de una clienta de prueba con su cuenta (Lucía Paredes, +15705550561,
-- solo del sandbox: entra con su teléfono y el código en pantalla): PENDIENTE · TE MANDARON SU PROPUESTA · TE PROPONEN UN CAMBIO (otra fecha) ·
-- CONFIRMADO (depósito cobrado en el simulador) · NO PUDO · SIN RESPUESTA · CANCELADO. Las propuestas las calcula la base (trigger): subtotal,
-- impuesto de la ciudad, total y depósito; vencen a las evp_propuesta_h como cualquier otra. El Fogón y La Bahía no tienen dueño en la semilla:
-- solo sus ajustes (para «Otros que hacen eventos privados»).
-- Base nueva sin equipo (CI): no depende de nadie del equipo; si un negocio no existe, se salta. Idempotente: los ajustes con on conflict; cada
-- solicitud por su client_key fija (si ya existe, viva o cerrada, no se vuelve a crear).
begin;

insert into users (phone, phone_verified_at, first_name, last_name, home_city_id) values ('+15705550561', now(), 'Lucía', 'Paredes', 'hzl') on conflict (phone) do nothing;

insert into private_event_settings (business_id, city_id, is_on, min_party, capacity, lead_days, deposit_pct, areas, whole_cents, menus, extras, reply_h)
select b.id, b.city_id, true, x.min, x.cap, 3, 25, x.areas, x.whole,
       '[{"k":"buffet","es":"Buffet criollo","en":"Creole buffet","des":"Arroz, habichuelas, dos carnes, ensalada y tostones.","desEn":"Rice, beans, two meats, salad and tostones.","cents":2600},
         {"k":"fijo","es":"Menú de 3 tiempos","en":"3-course set menu","des":"Entrada, plato fuerte y postre servidos en la mesa.","desEn":"Starter, main and dessert served at the table.","cents":3000},
         {"k":"prop","es":"Que me propongan","en":"Let them suggest","des":"Te mandan opciones con precio por persona.","desEn":"They send options with a price per person.","cents":null}]'::jsonb,
       '[{"k":"biz","es":"Traemos el bizcocho","en":"We bring the cake","cents":0},{"k":"deco","es":"Decoración","en":"Decorations","cents":8000},{"k":"dj","es":"Música o DJ","en":"Music or DJ","cents":18000},
         {"k":"bebe","es":"Silla para bebé","en":"High chair","cents":0},{"k":"silla","es":"Acceso para silla de ruedas","en":"Wheelchair access","cents":0}]'::jsonb, 2
  from (values ('sabor-dominicano', 9, 40, array['salon', 'terraza']::text[], 25000), ('el-fogon', 9, 60, array['salon']::text[], 35000), ('mariscos-la-bahia', 9, 30, array['salon']::text[], null::int)) x(id, min, cap, areas, whole)
  join businesses b on b.id = x.id
on conflict (business_id) do nothing;

do $$
declare b businesses; u users; tz text; s record; op bigint; q record; pi text; fee int; num text;
begin
  select * into b from businesses where id = 'sabor-dominicano';
  if not found then return; end if;
  select * into u from users where phone = '+15705550561';
  if not found then return; end if;
  select timezone into tz from cities where id = b.city_id;
  for s in select * from (values
      ('a0e1c6b0-0039-4000-8000-000000000001'::uuid, 'pending', 10, 1140, 25, 'cumple', 'Cumpleaños de mi mamá, 60 años.'),
      ('a0e1c6b0-0039-4000-8000-000000000002'::uuid, 'quote', 12, 1110, 30, 'bautizo', null),
      ('a0e1c6b0-0039-4000-8000-000000000003'::uuid, 'alt', 14, 1140, 20, 'grad', null),
      ('a0e1c6b0-0039-4000-8000-000000000004'::uuid, 'confirmed', 20, 1080, 28, 'familia', 'Somos de la familia Paredes.'),
      ('a0e1c6b0-0039-4000-8000-000000000005'::uuid, 'declined', 9, 1200, 35, 'trabajo', null),
      ('a0e1c6b0-0039-4000-8000-000000000006'::uuid, 'expired', 11, 1140, 22, 'despedida', null),
      ('a0e1c6b0-0039-4000-8000-000000000007'::uuid, 'cancelled', 16, 1110, 18, 'cumple', null)) v(clave, st, dias, m, p, occ, nota) loop
    continue when exists (select 1 from operations where user_id = u.id and client_key = s.clave);
    num := 'EP-' || nextval('private_event_seq');
    insert into operations (number, kind, city_id, business_id, user_id, status, scheduled_at, duration_min, party_size, customer_note, details, pay_mode, respond_by, client_key, is_test)
    values (num, 'private_event', b.city_id, b.id, u.id, 'pending', (((now() at time zone tz)::date + s.dias) + make_interval(mins => s.m)) at time zone tz, 180, s.p, s.nota,
            jsonb_build_object('occ', s.occ, 'area', 'salon', 'menu', jsonb_build_object('k', 'buffet', 'es', 'Buffet criollo', 'en', 'Creole buffet', 'cents', 2600), 'bud', '30',
                               'ext', '[{"k":"biz","es":"Traemos el bizcocho","en":"We bring the cake","cents":0},{"k":"deco","es":"Decoración","en":"Decorations","cents":8000}]'::jsonb, 'horas', 3),
            'app', now() + interval '24 hours', s.clave, true) returning id into op;
    insert into operation_events (operation_id, kind, actor, actor_id) values (op, 'sent', 'user', u.id);
    if s.st in ('quote', 'alt', 'confirmed') then
      -- La propuesta: la base calcula las líneas, el impuesto, el total y el depósito.
      insert into private_event_quotes (operation_id, business_id, city_id, version, kind, starts_at, duration_min, party_size, lines, includes, note, subtotal_cents, tax_bp, tax_cents, total_cents, deposit_pct, deposit_cents, cancel_h, valid_until)
      values (op, b.id, b.city_id, 1, case when s.st = 'alt' then 'alt' else 'quote' end,
              case when s.st = 'alt' then (((now() at time zone tz)::date + s.dias + 2) + make_interval(mins => s.m)) at time zone tz else (((now() at time zone tz)::date + s.dias) + make_interval(mins => s.m)) at time zone tz end,
              180, s.p, jsonb_build_array(jsonb_build_object('k', 'menu', 'l', jsonb_build_object('es', 'Buffet criollo · por persona', 'en', 'Creole buffet · per person'), 'q', s.p, 'unit', 2600),
                                         jsonb_build_object('k', 'extra', 'l', jsonb_build_object('es', 'Decoración: mesa principal y globos', 'en', 'Decorations: head table and balloons'), 'q', 1, 'unit', 8000),
                                         jsonb_build_object('k', 'extra', 'l', jsonb_build_object('es', 'Servimos y cortamos su bizcocho', 'en', 'We serve and cut your cake'), 'q', 1, 'unit', 0)),
              '{"es":"Comida, refrescos y agua, el salón por 3 horas y el servicio de meseros.","en":"Comida, refrescos y agua, el salón por 3 horas y el servicio de meseros."}'::jsonb,
              case when s.st = 'alt' then 'Ese sábado ya tenemos otro evento. Les proponemos esta fecha.' end, 0, 0, 0, 0, 0, 0, 0, now())
      returning * into q;
      update operations set status = 'change_proposed', status_detail = case when s.st = 'alt' then 'alt' else 'quote' end, answered_at = now(), respond_by = q.valid_until, total_cents = q.total_cents, deposit_cents = q.deposit_cents where id = op;
      insert into operation_events (operation_id, kind, actor, note) values (op, 'quote_sent', 'member', jsonb_build_object('es', 'Propuesta v1', 'en', 'Proposal v1'));
    end if;
    if s.st = 'confirmed' then
      -- Aceptada con el depósito cobrado en el simulador (destino: la cuenta simulada del restaurante; comisión «evp»).
      pi := 'pi_sim_seed_evp_' || replace(num, '-', '');
      fee := least(q.deposit_cents, coalesce((select round(q.deposit_cents * rate_bp / 10000.0)::int + fixed_cents from fee_rules where kind = 'evp' and effective_from <= now() order by effective_from desc, id desc limit 1), 0));
      insert into sim_intents (id, amount_cents, fee_cents, destination, status, captured_cents, card) values (pi, q.deposit_cents, fee, coalesce((select stripe_account_id from stripe_accounts where business_id = b.id), 'acct_sim_sabor-dominicano'), 'succeeded', q.deposit_cents, 'pm_sim_visa_4242') on conflict (id) do nothing;
      insert into payments (operation_id, user_id, business_id, city_id, kind, method, stripe_payment_intent, amount_cents, held_cents, fee_cents, status, card_brand, card_last4, held_at, captured_at, simulated)
      values (op, u.id, b.id, b.city_id, 'deposit', 'card', pi, q.deposit_cents, q.deposit_cents, fee, 'held', 'visa', '4242', now(), null, true);
      insert into private_event_acceptances (quote_id, operation_id, kind, user_id, payment_id) values (q.id, op, 'quote', u.id, (select id from payments where stripe_payment_intent = pi));
      update payments set status = 'captured', captured_at = now() where stripe_payment_intent = pi;
      update operations set status = 'confirmed', status_detail = null, confirmed_at = now(), respond_by = null, pay_status = 'captured', subtotal_cents = q.subtotal_cents, tax_cents = q.tax_cents where id = op;
      insert into operation_events (operation_id, kind, actor, actor_id, note) values (op, 'quote_ok', 'user', u.id, jsonb_build_object('es', 'Aceptó la propuesta v1', 'en', 'Accepted proposal v1'));
      insert into operation_events (operation_id, kind, actor) values (op, 'payment_captured', 'system');
    elsif s.st = 'declined' then
      update operations set status = 'declined', status_detail = 'negocio', answered_at = now(), respond_by = null, details = details || '{"motivoNo":"Ese día el local ya está reservado para otro evento."}'::jsonb where id = op;
      insert into operation_events (operation_id, kind, actor, note) values (op, 'declined', 'member', '{"es":"No puede: Ese día el local ya está reservado para otro evento.","en":"Cannot: The place is already booked that day."}'::jsonb);
    elsif s.st = 'expired' then
      update operations set status = 'expired', status_detail = 'sin_respuesta', respond_by = null where id = op;
      insert into operation_events (operation_id, kind, actor, note) values (op, 'expired', 'system', '{"es":"No respondieron a tiempo","en":"No reply in time"}'::jsonb);
    elsif s.st = 'cancelled' then
      update operations set status = 'cancelled', cancelled_by = 'user', cancelled_at = now(), cancel_reason = 'solicitud', respond_by = null where id = op;
      insert into operation_events (operation_id, kind, actor, actor_id) values (op, 'cancelled', 'user', u.id);
    end if;
  end loop;
end $$;

commit;
