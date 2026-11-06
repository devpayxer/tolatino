-- Citas de ejemplo en Barbería El Primo (Fase 3 · 3b). SOLO SANDBOX: corre solo sobre el negocio de ejemplo (is_demo) y
-- una vez. Deja (1) una cuenta de cobro simulada para que los depósitos se prueben con las tarjetas de prueba (4242…)
-- y (2) dos citas confirmadas de mañana (Juan con Luis a las 10:00 y con Kelvin a las 3:00 PM) para que la agenda tenga
-- horas ocupadas. En producción la cuenta la abre el dueño en Panel › Cobros y plan.
begin;
do $$
declare b text := 'barberia-el-primo'; juan uuid; luis uuid; kelvin uuid; tz text; hoy date; fade bigint; corte bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo) then return; end if;
  insert into stripe_accounts (business_id, stripe_account_id, status, charges_enabled, payouts_enabled, requirements, bank_last4, simulated)
    values (b, 'acct_sim_' || b, 'enabled', true, true, '[]'::jsonb, '4321', true) on conflict (business_id) do nothing;
  if exists (select 1 from operations where business_id = b and kind = 'appointment') then return; end if;
  select id into juan from users where phone = '+15705550144';
  select id into luis from business_members where business_id = b and kind = 'owner' and status = 'active' limit 1;
  select id into kelvin from business_members where business_id = b and chair_seat = 2 and status = 'active' limit 1;
  select id into fade from items where business_id = b and module = 'svc' and name->>'es' = 'Fade' limit 1;
  select id into corte from items where business_id = b and module = 'svc' and name->>'es' = 'Corte clásico' limit 1;
  if juan is null or luis is null or kelvin is null or fade is null or corte is null then return; end if;
  select c.timezone into tz from businesses x join cities c on c.id = x.city_id where x.id = b;
  hoy := (now() at time zone tz)::date;
  insert into operations (number, kind, city_id, business_id, user_id, member_id, status, scheduled_at, duration_min, buffer_min, details, subtotal_cents, total_cents,
                          pay_mode, confirmed_at, answered_at, client_key, is_test)
  values ('C-' || nextval('operations_appt_seq'), 'appointment', 'hzl', b, juan, luis, 'confirmed', ((hoy + 1) + time '10:00') at time zone tz, 40, 5,
          jsonb_build_object('svc', '{"es":"Fade","en":"Fade"}'::jsonb, 'svcId', fade::text, 'opts', '[]'::jsonb, 'adds', '[]'::jsonb, 'para', 'me', 'sms', true, 'base', 2800),
          2800, 2800, 'local', now(), now(), gen_random_uuid(), true),
         ('C-' || nextval('operations_appt_seq'), 'appointment', 'hzl', b, juan, kelvin, 'confirmed', ((hoy + 1) + time '15:00') at time zone tz, 30, 5,
          jsonb_build_object('svc', '{"es":"Corte clásico","en":"Classic cut"}'::jsonb, 'svcId', corte::text, 'opts', '[]'::jsonb, 'adds', '[]'::jsonb, 'para', 'me', 'sms', true, 'base', 2000),
          2000, 2000, 'local', now(), now(), gen_random_uuid(), true);
end $$;
commit;
