-- Semilla de pruebas · 9g · La Analítica completa (fase9-apertura.md §4 9g; el plan la llamaba 0051, que ya tomó 9b). SOLO SANDBOX (decisión I; regla 13).
-- 90 días de operaciones y cobros de prueba en Hazleton para ver Analítica › Dinero, Gente (retención por cohorte) y el embudo de Pro:
-- · 40 vecinos de muestra (+1 570 555 0801…0840, teléfonos de prueba) que se registraron en las últimas 12 semanas, con los días en que volvieron
--   (día 1, 7 y 30), como los vecinos de la semilla 0001 (is_test = false: la retención no cuenta las cuentas de prueba de las pruebas automáticas).
-- · Un pedido cobrado cada día (Tacos El Güero y Pollo Don Lucho), una visita de Hogar cada 3 días (Ventanas Almonte; cada 9, «no llegó»; la mitad
--   llega dentro de la franja), una mesa con depósito cada 5 días y una devolución completa cada 15 días. Nada hoy (las pantallas de «hoy» no cambian).
--   Las operaciones llevan is_test y details.semilla = 'ana9g' (así se reconocen y la semilla no se repite).
-- · Pro: Tacos El Güero pagando cada mes (dos cobros), Jugos Tropical pagando el año, Pollo Don Lucho en prueba y Florería Rosa que no siguió (Free).
--   Los cuatro ya se ven así en la página (business_stats_cache): la semilla solo pone su historia.
-- · Búsquedas sin resultado (search_logs) de varias personas; «xyz» de una sola no sale (Analítica muestra solo lo que buscaron 2 o más).
-- · Pre-estimados de Hogar: 6, de los que 2 terminaron en cita.
-- Al final, los derivados se rehacen con toda la historia (metricas_resumir: lo hace la función del barrido, nunca a mano).
-- Idempotente: cada parte se salta si ya está.
begin;
do $$
declare
  tz text := 'America/New_York'; hoy date := (now() at time zone 'America/New_York')::date;
  i int; d date; u uuid; op bigint; pid bigint; amt int; num text; b text;
  vecinos uuid[];
begin
  if not exists (select 1 from businesses where id = 'tacos-el-guero' and is_demo) then return; end if;

  -- ── Los vecinos de muestra y los días en que volvieron ──
  for i in 1..40 loop
    insert into users (phone, phone_verified_at, first_name, last_name, home_city_id, lang, created_at)
    values ('+15705550' || lpad((800 + i)::text, 3, '0'), now() - make_interval(days => i * 2), case when i % 2 = 0 then 'Vecina' else 'Vecino' end, 'Muestra ' || (800 + i), 'hzl',
            case when i % 5 = 0 then 'en' else 'es' end, now() - make_interval(days => i * 2))
    on conflict (phone) do nothing;
  end loop;
  select array_agg(id order by phone) into vecinos from users where phone like '+157055508%' and phone between '+15705550801' and '+15705550840';
  for i in 1..40 loop
    u := vecinos[i];
    d := ((now() - make_interval(days => i * 2)) at time zone tz)::date;
    insert into user_days (user_id, day, city_id) values (u, d, 'hzl') on conflict do nothing;
    if i % 2 = 0 and d + 1 < hoy then insert into user_days (user_id, day, city_id) values (u, d + 1, 'hzl') on conflict do nothing; end if;
    if i % 3 = 0 and d + 7 < hoy then insert into user_days (user_id, day, city_id) values (u, d + 7, 'hzl') on conflict do nothing; end if;
    if i % 4 = 0 and d + 30 < hoy then insert into user_days (user_id, day, city_id) values (u, d + 30, 'hzl') on conflict do nothing; end if;
  end loop;

  -- ── 90 días de operaciones cobradas ──
  if not exists (select 1 from operations where details->>'semilla' = 'ana9g') then
    for i in 1..90 loop
      d := hoy - i; u := vecinos[(i % 40) + 1];
      -- Un pedido cobrado (pickup, pagado en la app): 10 % de comisión (regla «ped»).
      b := case when i % 2 = 0 then 'pollo-don-lucho' else 'tacos-el-guero' end;
      amt := 1500 + (i % 7) * 250;
      num := nextval('operations_order_seq')::text;
      insert into operations (number, kind, city_id, business_id, user_id, status, stage, mode, details, subtotal_cents, total_cents, pay_mode, pay_status,
                              sent_at, answered_at, confirmed_at, done_at, client_key, is_test)
      values (num, 'order', 'hzl', b, u, 'done', 'picked_up', 'pickup', jsonb_build_object('semilla', 'ana9g'), amt, amt, 'app', 'captured',
              (d + time '12:10') at time zone tz, (d + time '12:12') at time zone tz, (d + time '12:12') at time zone tz, (d + time '12:40') at time zone tz, gen_random_uuid(), true)
      returning id into op;
      insert into payments (operation_id, user_id, business_id, city_id, kind, method, stripe_payment_intent, amount_cents, fee_cents, status, card_brand, card_last4, held_at, captured_at, simulated, created_at)
      values (op, u, b, 'hzl', 'full', 'card', 'pi_sim_seed_ana9g_ord_' || i, amt, round(amt * 0.10)::int, 'captured', 'visa', '4242',
              (d + time '12:10') at time zone tz, (d + time '12:40') at time zone tz, true, (d + time '12:10') at time zone tz)
      returning id into pid;
      -- Cada 15 días, el negocio lo devolvió completo al día siguiente.
      if i % 15 = 0 then
        insert into refunds (payment_id, amount_cents, reason, initiated_by, fee_absorbed_by, stripe_refund_id, status, idem_key, created_at)
        values (pid, amt, 'Semilla 9g: el pedido salió mal.', 'business', 'platform', 're_sim_seed_ana9g_' || i, 'done', 'seed-ana9g-ref-' || i, (d + 1 + time '10:00') at time zone tz);
        update payments set refunded_cents = amt, status = 'refunded', updated_at = now() where id = pid;
      end if;

      -- Una visita de Hogar cada 3 días (franja de 2 h desde las 10:00): 8 % de comisión (regla «cita»). Cada 9 días, «no llegó» (sin cobro).
      if i % 3 = 0 then
        insert into operations (number, kind, city_id, business_id, user_id, status, status_detail, scheduled_at, duration_min, details, subtotal_cents, total_cents, pay_mode, pay_status,
                                sent_at, answered_at, confirmed_at, done_at, client_key, is_test)
        values ('C-' || nextval('operations_appt_seq'), 'appointment', 'hzl', 'ventanas-almonte', u, 'done', case when i % 9 = 0 then 'noshow' end, (d + time '10:00') at time zone tz, 120,
                jsonb_build_object('semilla', 'ana9g', 'svc', '{"es":"Visita","en":"Visit"}'::jsonb), 9500, 9500, case when i % 9 = 0 then 'none' else 'app' end,
                case when i % 9 = 0 then null else 'captured' end,
                (d - 2 + time '18:00') at time zone tz, (d - 2 + time '18:30') at time zone tz, (d - 2 + time '18:30') at time zone tz, (d + time '13:00') at time zone tz, gen_random_uuid(), true)
        returning id into op;
        if i % 9 <> 0 then
          insert into payments (operation_id, user_id, business_id, city_id, kind, method, stripe_payment_intent, amount_cents, fee_cents, status, card_brand, card_last4, held_at, captured_at, simulated, created_at)
          values (op, u, 'ventanas-almonte', 'hzl', 'full', 'card', 'pi_sim_seed_ana9g_cita_' || i, 9500, 760, 'captured', 'visa', '4242',
                  (d - 2 + time '18:30') at time zone tz, (d + time '13:00') at time zone tz, true, (d - 2 + time '18:30') at time zone tz);
          -- Llegó: la mitad dentro de la franja (10:45) y la otra mitad tarde (12:30).
          insert into operation_events (operation_id, kind, actor, at) values (op, 'arrived', 'business', case when i % 6 = 0 then (d + time '10:45') at time zone tz else (d + time '12:30') at time zone tz end);
        end if;
      end if;

      -- Una mesa con depósito cada 5 días (sin comisión: regla «rsv»).
      if i % 5 = 0 then
        insert into operations (number, kind, city_id, business_id, user_id, status, scheduled_at, party_size, details, subtotal_cents, total_cents, deposit_cents, pay_mode, pay_status,
                                sent_at, answered_at, confirmed_at, done_at, client_key, is_test)
        values ('R-' || nextval('operations_table_seq'), 'table', 'hzl', 'pollo-don-lucho', u, 'done', (d + time '19:30') at time zone tz, 4, jsonb_build_object('semilla', 'ana9g'),
                0, 0, 2000, 'app', 'captured', (d - 1 + time '15:00') at time zone tz, (d - 1 + time '15:05') at time zone tz, (d - 1 + time '15:05') at time zone tz, (d + time '21:30') at time zone tz,
                gen_random_uuid(), true)
        returning id into op;
        insert into payments (operation_id, user_id, business_id, city_id, kind, method, stripe_payment_intent, amount_cents, fee_cents, status, card_brand, card_last4, held_at, captured_at, simulated, created_at)
        values (op, u, 'pollo-don-lucho', 'hzl', 'deposit', 'card', 'pi_sim_seed_ana9g_mesa_' || i, 2000, 0, 'captured', 'visa', '4242',
                (d - 1 + time '15:05') at time zone tz, (d + time '19:30') at time zone tz, true, (d - 1 + time '15:05') at time zone tz);
      end if;
    end loop;

    -- Pre-estimados de Hogar: 6 en el último mes; 2 terminaron en cita (la visita de la semilla).
    for i in 1..6 loop
      u := vecinos[i];
      insert into service_requests (number, mode, user_id, city_id, category_id, rubro, form, status, respond_by, created_at, updated_at, operation_id)
      values ('P-' || nextval('service_request_seq'), 'pre', u, 'hzl', 'NEG-HOGAR', 'hogar', jsonb_build_object('semilla', 'ana9g', 'que', 'Una ventana que no cierra'),
              case when i <= 2 then 'used' else 'expired' end, now() - make_interval(days => i * 4) + interval '24 hours', now() - make_interval(days => i * 4), now() - make_interval(days => i * 4),
              case when i <= 2 then (select id from operations where details->>'semilla' = 'ana9g' and kind = 'appointment' and status_detail is null order by sent_at desc offset i - 1 limit 1) end);
    end loop;
  end if;

  -- ── Pro: la historia de cuatro negocios que ya se ven Pro o Free ──
  if not exists (select 1 from subscription_events where idem_key like 'seed-ana9g-%') then
    insert into subscriptions (business_id, status, cycle, price_cents, trial_started_at, trial_ends_at, trial_choice, current_period_end, created_at)
    values ('tacos-el-guero', 'active', 'month', 1499, now() - interval '75 days', now() - interval '45 days', 'card', now() + interval '15 days', now() - interval '75 days'),
           ('jugos-tropical', 'active', 'year', 14990, now() - interval '60 days', now() - interval '30 days', 'card', now() + interval '335 days', now() - interval '60 days'),
           ('pollo-don-lucho', 'trial', 'month', 1499, now() - interval '12 days', now() + interval '18 days', 'none', null, now() - interval '12 days'),
           ('floreria-rosa', 'ended', 'month', 1499, now() - interval '70 days', now() - interval '40 days', 'no_continue', null, now() - interval '70 days')
    on conflict (business_id) do nothing;
    insert into subscription_events (business_id, kind, amount_cents, note, idem_key, at) values
      ('tacos-el-guero', 'trial_start', null, '{"dias": 30}', 'seed-ana9g-1', now() - interval '75 days'),
      ('tacos-el-guero', 'decided_card', null, '{"ciclo": "month"}', 'seed-ana9g-2', now() - interval '55 days'),
      ('tacos-el-guero', 'charged', 1499, '{"semilla": "ana9g"}', 'seed-ana9g-3', now() - interval '45 days'),
      ('tacos-el-guero', 'charged', 1499, '{"semilla": "ana9g"}', 'seed-ana9g-4', now() - interval '15 days'),
      ('jugos-tropical', 'trial_start', null, '{"dias": 30}', 'seed-ana9g-5', now() - interval '60 days'),
      ('jugos-tropical', 'decided_card', null, '{"ciclo": "year"}', 'seed-ana9g-6', now() - interval '35 days'),
      ('jugos-tropical', 'charged', 14990, '{"semilla": "ana9g"}', 'seed-ana9g-7', now() - interval '30 days'),
      ('pollo-don-lucho', 'trial_start', null, '{"dias": 30}', 'seed-ana9g-8', now() - interval '12 days'),
      ('floreria-rosa', 'trial_start', null, '{"dias": 30}', 'seed-ana9g-9', now() - interval '70 days'),
      ('floreria-rosa', 'decided_free', null, '{"semilla": "ana9g"}', 'seed-ana9g-10', now() - interval '45 days'),
      ('floreria-rosa', 'ended', null, '{"por": "no_continue"}', 'seed-ana9g-11', now() - interval '40 days');
  end if;

  -- ── Búsquedas sin resultado (las que buscaron 2 o más personas salen en Analítica) ──
  if not exists (select 1 from search_logs where understood->>'semilla' = 'ana9g') then
    for i in 1..5 loop
      insert into search_logs (city_id, user_id, query, understood, results, at) values ('hzl', vecinos[i], 'mofongo vegano', '{"semilla": "ana9g"}', 0, now() - make_interval(days => i));
    end loop;
    for i in 6..8 loop
      insert into search_logs (city_id, user_id, query, understood, results, at) values ('hzl', vecinos[i], 'notario público', '{"semilla": "ana9g"}', 0, now() - make_interval(days => i));
    end loop;
    insert into search_logs (city_id, user_id, query, understood, results, at) values
      ('hzl', vecinos[9], 'plomero 24 horas', '{"semilla": "ana9g"}', 0, now() - interval '3 days'),
      ('hzl', null, 'plomero 24 horas', '{"semilla": "ana9g"}', 0, now() - interval '2 days'),
      ('hzl', vecinos[10], 'xyz', '{"semilla": "ana9g"}', 0, now() - interval '1 day'),
      ('hzl', vecinos[11], 'tacos', '{"semilla": "ana9g"}', 4, now() - interval '1 day');
  end if;
end $$;

-- Los derivados, como los rehace el barrido (la función del barrido; nadie los escribe a mano).
select metricas_resumir('2000-01-01');
commit;
