-- Semilla de pruebas · 9b-1 · Los dueños que la base del sandbox tenía desde el 5 nov y que una base NUEVA no tiene. SOLO SANDBOX (decisión I;
-- regla 13). Las semillas ya confirmadas no se editan: esta las completa (como 0049).
--   · Pedro Prueba (+1 570 555 0133, ficción 555) es el dueño de Sabor Dominicano: lo da por hecho la semilla 0007 (firma las respuestas a las
--     reseñas de Sabor Dominicano con su id) y lo dan por hecho ~40 pruebas del panel (menú, pedidos, mensajes, planes, Free/Pro). En el sandbox
--     de siempre lo hizo dueño la prueba rec2 (reclamo con código, 5 nov); en una base recién sembrada Pedro no existía y Sabor Dominicano no
--     tenía dueño: esas pruebas fallaban en el primer paso. rec2 ahora reclama un negocio propio de la corrida.
--   · Kelvin (+1 570 555 0177, ya en la semilla) es el dueño de Multiservicios La Patria (licencias, 1k: lic) por la misma razón.
--   · Luis (+1 570 555 0166, ya en la semilla) es el dueño de Bufete Almonte (lo reclamó rec1j el 5 nov): las pruebas de Profesionales
--     (pro4l, pro4l2, svc4h2) entran a su panel con él, y sin una persona que reciba citas el bufete no tenía horas para pedir en línea.
--   · Sabor Dominicano cobra con tarjeta: su cuenta de cobro del simulador (como las de 0015…0026 para los otros negocios). En el sandbox de
--     siempre la conectó pagos2d (2d); en una base nueva, las pruebas que corren antes (din2o, avisos, pedidos con tarjeta) no la tenían.
-- Solo si el negocio NO tiene dueño (en el sandbox de siempre ya lo tiene y no cambia nada). Nada se borra.
begin;

insert into users (phone, phone_verified_at, first_name, last_name, home_city_id) values
  ('+15705550133', now(), 'Pedro', 'Prueba', 'hzl')
on conflict (phone) do nothing;

do $$
declare x record; u users;
begin
  for x in select * from (values ('sabor-dominicano', '+15705550133'), ('multiservicios-la-patria', '+15705550177'), ('bufete-almonte', '+15705550166')) v(negocio, tel) loop
    select * into u from users where phone = x.tel;
    if u.id is null or not exists (select 1 from businesses where id = x.negocio and owner_user_id is null and status = 'active') then continue; end if;
    -- Lo mismo que hace «Aplicar cambio» de un reclamo (admin/acciones-colas.ts, decidirReclamo): miembro dueño con todo el panel y owner_user_id.
    update business_members set kind = 'owner', panel_access = '{all}', updated_at = now()
     where business_id = x.negocio and user_id = u.id and status = 'active';
    if not found then
      insert into business_members (business_id, user_id, kind, display_name, phone, panel_access, status)
      values (x.negocio, u.id, 'owner', trim(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')), u.phone, '{all}', 'active');
    end if;
    update businesses set owner_user_id = u.id, updated_at = now() where id = x.negocio and owner_user_id is null;
  end loop;
end $$;

insert into stripe_accounts (business_id, stripe_account_id, status, charges_enabled, payouts_enabled, requirements, bank_last4, simulated)
select 'sabor-dominicano', 'acct_sim_sabor-dominicano', 'enabled', true, true, '[]'::jsonb, '6789', true
 where exists (select 1 from businesses where id = 'sabor-dominicano')
on conflict (business_id) do nothing;

-- Boutique Yaritza cobra con tarjeta (0019: «update delivery_settings set pay_card = true»): en una base nueva la tienda no tenía su fila de
-- Pedidos y el update no hacía nada, así que el plan de pagos (layaway) no salía en su ficha. La fila, con la tarjeta encendida.
insert into delivery_settings (business_id, pay_card)
select 'boutique-yaritza', true where exists (select 1 from businesses where id = 'boutique-yaritza' and is_demo)
on conflict (business_id) do nothing;

-- Los organizadores de la semilla 0035 (la Parroquia «publica sin revisión previa», la Cantina, El Palacio, Welly Cruz, Inglés para Todos) tienen sus eventos en
-- vivo, pero en una base nueva no tenían el módulo Eventos encendido: ninguno salía en /eventos ni se podía comprar (evt_negocio_publico). En
-- el sandbox de siempre ya lo tienen. El trigger businesses_evt_relistar vuelve a calcular sus fechas.
update businesses set modules_on = array(select distinct x from unnest(modules_on || array['eventos']) x), updated_at = now()
 where id in ('parroquia-santa-maria', 'cantina-don-beto', 'el-palacio-show', 'welly-cruz-eventos', 'ingles-para-todos') and is_demo and not ('eventos' = any(modules_on));

-- Los eventos de 0035 que nacen «en vivo» quedaban en la cola en una base nueva: 0035 corre antes de que exista un Admin (Ana la crea 0049)
-- y «sin una persona del equipo que apruebe, nada se pone en vivo sin revisión». Ahora sí hay quien apruebe: Ana los aprueba como lo haría
-- 0035 (en vivo, aprobado y revisado por ella). Solo los que 0035 marcó «live» y siguen en revisión sin aprobar (los «review» y «draft» de
-- 0035 se quedan como están). En el sandbox de siempre ya estaban en vivo y no cambia nada.
update events e set status = 'live', approved_at = now(), approved_by = a.id, reviewed_at = now(), reviewed_by = a.id
  from (select u.id from users u join staff_members s on s.user_id = u.id where u.phone = '+15705550199' and s.role = 'admin' and s.status = 'active') a
 where e.status = 'review' and e.approved_at is null
   and (e.business_id, e.title->>'es') in (('la-terraza-night', 'Jueves de Bachata en Vivo'), ('la-terraza-night', 'Karaoke latino · entrada libre'),
        ('sabor-dominicano', 'Noche de merengue en vivo'), ('sabor-dominicano', 'Sancocho del domingo en familia'),
        ('ingles-para-todos', 'Taller gratis: inglés para tu entrevista de trabajo'), ('el-palacio-show', 'Comedia dominicana · Noche de risa'),
        ('cantina-don-beto', 'Banda La Dinastía en vivo'));
-- Y el que 0035 deja «con cambios pedidos» (aforo), también por Ana.
update events e set status = 'changes', reviewed_at = now(), reviewed_by = a.id, review_reason_key = 'aforo'
  from (select u.id from users u join staff_members s on s.user_id = u.id where u.phone = '+15705550199' and s.role = 'admin' and s.status = 'active') a
 where e.status = 'review' and e.approved_at is null and e.reviewed_at is null and e.business_id = 'sabor-dominicano' and e.title->>'es' = 'Festival del Sancocho';

-- Lo que una migración arregló en los datos que YA estaban (en el sandbox de siempre, la semilla corrió antes) y que en una base nueva no
-- alcanza: aquí las migraciones corren primero y la semilla después, con la forma vieja. Se repite lo mismo, solo donde falta:
--   · 0099: los vecinos con la edad confirmada son adultos (sin esto, los 15 vecinos de 0032 no existían para Mensajes: «No encontramos esta
--     conversación»);
update community_profiles set adult = true where adult is null and adult_ok_at is not null;
--   · 0071: los filtros de fecha de Fiestas con sus claves nuevas (0001 los crea con las viejas, d:2/d:3/d:9, que la app ya no calcula: «Libre
--     este sábado» no filtraba y salía «Libre el 3 oct»);
update filter_options set key = 'd:sab', label = '{"es":"Libre este sábado","en":"Free this Saturday"}'::jsonb where category_id = 'NEG-FIESTA' and key = 'd:2'
  and not exists (select 1 from filter_options where category_id = 'NEG-FIESTA' and key = 'd:sab');
update filter_options set key = 'd:dom', label = '{"es":"Libre este domingo","en":"Free this Sunday"}'::jsonb where category_id = 'NEG-FIESTA' and key = 'd:3'
  and not exists (select 1 from filter_options where category_id = 'NEG-FIESTA' and key = 'd:dom');
update filter_options set key = 'd:sab2', label = '{"es":"Libre el sábado siguiente","en":"Free the following Saturday"}'::jsonb where category_id = 'NEG-FIESTA' and key = 'd:9'
  and not exists (select 1 from filter_options where category_id = 'NEG-FIESTA' and key = 'd:sab2');
update businesses set filter_values = array(select x from unnest(filter_values) x where x not in ('d:2', 'd:3', 'd:9'))
 where category_id = 'NEG-FIESTA' and filter_values && array['d:2', 'd:3', 'd:9'];
--   · el idioma de las respuestas a reseñas (las de 0007 nacieron sin él);
update reviews set reply_lang = 'es' where reply is not null and reply_lang is null;
--   · lo retenido de un pago es lo cobrado cuando no se dijo otra cosa.
update payments set held_cents = amount_cents where held_cents is null;

-- 0036 (repetido tal cual: idempotente por client_key): las órdenes B- de Yokasta y Ramón para «Jueves de Bachata en Vivo». En una base nueva
-- 0036 no sembró nada porque el evento seguía en revisión; ahora que Ana lo aprobó, sí (sin esto no había boletos de la semilla: app8e, la Puerta).
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

-- Las respuestas de Sabor Dominicano que 0007 firmó con Pedro cuando todavía no existía (reply_by quedó vacío).
update reviews set reply_by = (select id from users where phone = '+15705550133')
 where business_id = 'sabor-dominicano' and reply is not null and reply_by is null;

commit;
