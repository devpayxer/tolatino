-- Semilla de pruebas · 7b · Soporte. SOLO SANDBOX.
-- Marisol Prueba (+15705550122, la vecina de prueba de siempre: si no existe, se crea) y el equipo de prueba (cuentas del sandbox; entran con su teléfono y el código en pantalla): Dayana (+15705550677, rol Soporte: devuelve hasta
-- el tope de Configuración) y Omar (+15705550688, rol Finanzas: ve Soporte y devuelve hasta lo cobrado). Casos de vecinos de prueba en cada
-- estado (RECIBIDO · LO ESTÁN VIENDO con nota interna · TE RESPONDIERON · RESUELTO sin calificar), uno de seguridad con prioridad ALTA y fuera
-- de plazo, uno con un pedido pagado con tarjeta (para «Resolver y devolver») y uno de un negocio abierto desde su panel. Las macros de fábrica
-- vienen en la migración 0117 (producción no empieza vacía).
-- Base nueva sin equipo (CI): no depende de nadie del equipo de antes; si una persona o un negocio no existe, ese caso se salta.
-- Idempotente: cada caso por su client_key fija (si ya existe, en cualquier estado, no se vuelve a crear); el pedido, igual.
begin;

insert into users (phone, phone_verified_at, first_name, last_name, home_city_id) values
  ('+15705550122', now(), 'Marisol', 'Prueba', 'hzl'),
  ('+15705550677', now(), 'Dayana', 'Rosario', 'hzl'),
  ('+15705550688', now(), 'Omar', 'Castillo', 'hzl')
on conflict (phone) do nothing;
insert into staff_members (user_id, role) select id, 'soporte' from users where phone = '+15705550677' on conflict (user_id) do nothing;
insert into staff_members (user_id, role) select id, 'finanzas' from users where phone = '+15705550688' on conflict (user_id) do nothing;

do $$
declare dayana uuid; u users; b businesses; c support_cases; op bigint; pi text; num text; s record; dueno uuid;
begin
  select id into dayana from users where phone = '+15705550677';

  -- Un pedido de Marisol pagado con tarjeta en El Fogón de Wyoming St ($85, cobrado en el simulador), para el caso de pago.
  select * into u from users where phone = '+15705550122';
  select * into b from businesses where id = 'el-fogon';
  if u.id is not null and b.id is not null then
    select id into op from operations where user_id = u.id and client_key = 'b0e1c6b0-0040-4000-8000-0000000000a1';
    if op is null then
      num := nextval('operations_order_seq')::text;
      insert into operations (number, kind, city_id, business_id, user_id, status, stage, mode, pay_mode, subtotal_cents, tax_cents, total_cents, done_at, client_key, is_test, sent_at)
      values (num, 'order', b.city_id, b.id, u.id, 'done', 'picked_up', 'pickup', 'app', 8000, 500, 8500, now() - interval '5 hours', 'b0e1c6b0-0040-4000-8000-0000000000a1', true, now() - interval '6 hours')
      returning id into op;
      insert into operation_events (operation_id, kind, actor, actor_id) values (op, 'sent', 'user', u.id);
      pi := 'pi_sim_semilla-tk-' || op;
      insert into sim_intents (id, amount_cents, fee_cents, destination, status, captured_cents, card)
      values (pi, 8500, 850, coalesce((select stripe_account_id from stripe_accounts where business_id = b.id), 'acct_sim_el-fogon'), 'succeeded', 8500, 'pm_sim_visa_4242') on conflict (id) do nothing;
      insert into payments (operation_id, user_id, business_id, city_id, kind, method, stripe_payment_intent, amount_cents, held_cents, fee_cents, status, card_brand, card_last4, held_at, captured_at, simulated)
      values (op, u.id, b.id, b.city_id, 'full', 'card', pi, 8500, 8500, 850, 'captured', 'visa', '4242', now() - interval '6 hours', now() - interval '5 hours', true);
      update operations set pay_status = 'captured' where id = op;
    end if;
  end if;

  for s in select * from (values
      -- clave, teléfono, tema, estado, prioridad, hace (min), texto, respuesta del equipo, nota interna, ¿con el pedido?, negocio (panel)
      ('b0e1c6b0-0040-4000-8000-000000000001'::uuid, '+15705550122', 'cuenta', 'new', 'normal', 35, 'No me llega el código para entrar en mi tablet. En el teléfono sí entro sin problema.', null, null, false, null),
      ('b0e1c6b0-0040-4000-8000-000000000002'::uuid, '+15705550122', 'pago', 'waiting', 'normal', 200, 'Me cobraron el pedido completo pero faltó el mofongo. El negocio no me contesta y ya pasaron horas.',
        'Hola Marisol. Ya vi tu pedido y el cobro de $85. Le escribí a El Fogón; si no responden hoy, te devolvemos lo del mofongo a tu tarjeta.', null, true, null),
      ('b0e1c6b0-0040-4000-8000-000000000003'::uuid, '+15705550122', 'tecnico', 'resolved', 'normal', 1500, 'La app se queda en blanco cuando abro Boletos desde el teléfono.',
        'Hola Marisol. Era un problema de nuestra parte y ya quedó arreglado. Abre Boletos otra vez y dinos si lo ves bien.', null, false, null),
      ('b0e1c6b0-0040-4000-8000-000000000004'::uuid, '+15705550299', 'seguridad', 'new', 'alta', 2900, 'Alguien entró a mi cuenta y cambió mi foto. No fui yo y no reconozco el teléfono de la sesión.', null, null, false, null),
      ('b0e1c6b0-0040-4000-8000-000000000005'::uuid, '+15705550299', 'sugerencia', 'in_progress', 'normal', 90, 'Sería bueno poder guardar la dirección del trabajo además de la de la casa.', null,
        'Ya existe: Mi cuenta › Direcciones guarda varias. Contestarle con el paso a paso.', false, null),
      ('b0e1c6b0-0040-4000-8000-000000000006'::uuid, '+15705550288', 'negocio', 'waiting', 'normal', 400, 'La página de un taller dice que abre los domingos pero fui y estaba cerrado.',
        'Hola Héctor. Gracias por avisar. Le pedimos al taller que revise su horario. ¿Te acuerdas de qué domingo fuiste?', null, false, null),
      ('b0e1c6b0-0040-4000-8000-000000000007'::uuid, '+15705550433', 'pago', 'new', 'normal', 60, 'Mis pagos del martes no llegaron a mi banco. En Cobros dice que salieron.', null, null, false, 'rentas-hazleton-latino')
    ) v(clave, tel, tema, st, prio, hace, texto, resp, nota, conpedido, neg) loop
    select * into u from users where phone = s.tel;
    continue when u.id is null;
    continue when exists (select 1 from support_cases where user_id = u.id and client_key = s.clave);
    continue when s.neg is not null and not exists (select 1 from business_members where business_id = s.neg and user_id = u.id and status = 'active');
    continue when s.conpedido and op is null;
    insert into support_cases (number, user_id, business_id, city_id, topic, operation_id, origin, priority, sla_due_at, device, app_version, client_key, is_test, created_at)
    values ('TK-' || nextval('support_case_seq'), u.id, s.neg, coalesce((select city_id from businesses where id = s.neg), u.home_city_id, 'hzl'), s.tema, case when s.conpedido then op end,
            case when s.neg is not null then 'panel' else 'form' end, s.prio,
            soporte_sla(coalesce(u.home_city_id, 'hzl'), now() - make_interval(mins => s.hace), cfg_int('soporte_sla_h')),
            'iPhone · Safari', 'web', s.clave, true, now() - make_interval(mins => s.hace))
    returning * into c;
    insert into support_messages (case_id, city_id, sender, user_id, body, at) values (c.id, c.city_id, 'user', u.id, s.texto, c.created_at);
    insert into support_messages (case_id, city_id, sender, sys_key, vars, at) values (c.id, c.city_id, 'system', 'recibido', jsonb_build_object('num', c.number), c.created_at + interval '1 second');
    if dayana is not null and s.st in ('in_progress', 'waiting', 'resolved') then
      update support_cases set assigned_staff_id = dayana where id = c.id;
      if s.nota is not null then
        insert into support_messages (case_id, city_id, sender, staff_id, body, internal, at) values (c.id, c.city_id, 'staff', dayana, s.nota, true, c.created_at + interval '20 minutes');
      end if;
      if s.st = 'in_progress' then update support_cases set status = 'in_progress' where id = c.id; end if;
      if s.resp is not null then
        insert into support_messages (case_id, city_id, sender, staff_id, body, at) values (c.id, c.city_id, 'staff', dayana, s.resp, c.created_at + interval '40 minutes');
        update support_cases set status = 'waiting', first_reply_at = c.created_at + interval '40 minutes' where id = c.id;
      end if;
      if s.st = 'resolved' then
        update support_cases set status = 'resolved', resolved_by = 'staff', resolved_at = c.created_at + interval '50 minutes' where id = c.id;
        insert into support_messages (case_id, city_id, sender, sys_key, at) values (c.id, c.city_id, 'system', 'resuelto_equipo', c.created_at + interval '50 minutes');
      end if;
    end if;
  end loop;
end $$;

commit;
