-- Semilla de pruebas · 7d · El Compa para vecinos. SOLO SANDBOX.
-- Conversaciones de vecinos de prueba con El Compa, una por cada resultado, escritas como las contesta el motor del sandbox (el simulador y las
-- reglas fijas de lib/compa; nada copiado de las CP-5100 del prototipo):
--   · RESOLVIÓ SOLO: Marisol pregunta cómo reservar una mesa → El Compa contesta con la ayuda «Reservar una mesa» (fuente) y se cierra.
--   · ACCIÓN CONFIRMADA: desde la hoja de una reservación PENDIENTE de Marisol en Sabor Dominicano, «Cancelarla» → «Así queda» → la confirma ella:
--     la reservación queda cancelada con el evento de la operación de autor 'compa' y nada cobrado.
--   · A UNA PERSONA · DINERO: Yaritza «Me cobraron doble el pedido de ayer» → caso TK- de pago con el resumen (sin pasar por el modelo).
--   · A UNA PERSONA · SEGURIDAD: Yaritza «Alguien entró a mi cuenta y cambió mi foto» → caso TK- de seguridad con prioridad ALTA.
--   · A UNA PERSONA · LO PIDIÓ: Héctor «Quiero hablar con una persona» → caso TK- técnico.
--   · CUENTA: Héctor «Cambiar mi teléfono» → «Te abro Mi cuenta para eso. Tú confirmas cada cambio.» (abre Mi cuenta; no hay caso: la cuenta la
--     cambia la persona) y se cierra.
--   · NO SABE: Marisol pregunta qué pidió otra persona → «No tengo ese dato…» y se cierra.
-- Las personas son las de siempre (Marisol, Yaritza y Héctor; si no existen, se crean). Base nueva sin equipo (CI): no depende de nadie del
-- equipo; si un negocio no existe, la conversación que lo usa se salta. Idempotente: cada conversación por el texto fijo de su primer mensaje
-- (de esa persona, de prueba); los casos y la reservación por su client_key fija.
begin;

insert into users (phone, phone_verified_at, first_name, last_name, home_city_id) values
  ('+15705550122', now(), 'Marisol', 'Prueba', 'hzl'),
  ('+15705550299', now(), 'Yaritza', 'Prueba', 'hzl'),
  ('+15705550288', now(), 'Héctor', 'Prueba', 'hzl')
on conflict (phone) do nothing;

-- De paso (7d): el pedido pagado de la semilla 0040 (El Fogón, client_key …00a1) nació sin ready_at ni respond_by y su pantalla (/pedido/{n})
-- fallaba al pintarlo; se completan con lo que dice su historia (listo al terminar; respondía a los 10 min de enviarlo).
update operations set ready_at = coalesce(ready_at, done_at), respond_by = coalesce(respond_by, sent_at + interval '10 minutes')
 where client_key = 'b0e1c6b0-0040-4000-8000-0000000000a1' and kind = 'order' and (ready_at is null or respond_by is null);

do $$
declare u users; b businesses; cv compa_conversations; k support_cases; s record; op bigint; m bigint; a uuid; ciudad text;
begin
  for s in select * from (values
      -- teléfono, superficie, resultado, motivo, hace (min), lo que escribió la persona, lo que contestó El Compa, motor, fuente (slug), clave del caso, tema, prioridad
      ('+15705550122', 'support_page', 'solo', null, 180, '¿Cómo reservo una mesa en un restaurante?',
        'Abre la página del restaurante y toca Reservar mesa: eliges el día, la hora y cuántos son. El restaurante te confirma y te avisamos.', 'simulador', 'reservar-mesa', null, null, null),
      ('+15705550122', 'help_sheet', 'accion', null, 90, 'Cancelarla',
        'Todavía es una solicitud: Sabor Dominicano no la ha confirmado. Si la cancelas no pagas nada y se libera lo retenido.', 'reglas', 'reservar-mesa', null, null, null),
      ('+15705550299', 'support_page', 'persona', 'money', 300, 'Me cobraron doble el pedido de ayer',
        'Eso lo revisa una persona del equipo: yo no muevo dinero ni cambio tu cuenta. Ya le pasé tu caso con el resumen.', 'reglas', null, 'c0e1c6b0-0041-4000-8000-000000000001', 'pago', 'normal'),
      ('+15705550299', 'support_page', 'persona', 'safety', 60, 'Alguien entró a mi cuenta y cambió mi foto',
        'Eso lo ve una persona del equipo ahora mismo. Ya le pasé tu caso con el resumen. Si estás en peligro, llama al 911.', 'reglas', null, 'c0e1c6b0-0041-4000-8000-000000000002', 'seguridad', 'alta'),
      ('+15705550288', 'support_page', 'persona', 'asked_person', 240, 'Quiero hablar con una persona',
        'Te paso con una persona del equipo. Ya le dejé el resumen para que no tengas que repetirlo.', 'reglas', null, 'c0e1c6b0-0041-4000-8000-000000000003', 'tecnico', 'normal'),
      ('+15705550288', 'support_page', 'cuenta', null, 400, 'Cambiar mi teléfono',
        'Te abro Mi cuenta para eso. Tú confirmas cada cambio.', 'reglas', null, null, null, null),
      ('+15705550122', 'support_page', 'nosabe', null, 600, '¿Qué pidió Ana ayer en El Fogón?',
        'No tengo ese dato. Si quieres, te paso con una persona.', 'simulador', null, null, null, null)
    ) v(tel, sup, res, motivo, hace, texto, resp, motor, fuente, clave, tema, prio) loop
    select * into u from users where phone = s.tel;
    continue when u.id is null;
    continue when exists (select 1 from compa_conversations c join compa_messages x on x.conversation_id = c.id
                           where c.user_id = u.id and c.is_test and x.sender = 'user' and x.text = s.texto);
    ciudad := coalesce(u.home_city_id, 'hzl');
    op := null;
    -- La reservación pendiente que El Compa prepara para cancelar (Sabor Dominicano; si no existe, se salta).
    if s.res = 'accion' then
      select * into b from businesses where id = 'sabor-dominicano';
      continue when b.id is null;
      select id into op from operations where user_id = u.id and client_key = 'c0e1c6b0-0041-4000-8000-0000000000a1';
      continue when op is not null;   -- ya existe (en cualquier estado): no se vuelve a crear
      insert into operations (number, kind, city_id, business_id, user_id, status, scheduled_at, duration_min, party_size, details, pay_mode, respond_by, client_key, is_test, sent_at)
      values ('R-' || nextval('operations_table_seq'), 'table', b.city_id, b.id, u.id, 'pending', now() + interval '2 days', 90, 2, '{"area":"salon"}', 'none', now() + interval '1 hour',
              'c0e1c6b0-0041-4000-8000-0000000000a1', true, now() - make_interval(mins => s.hace + 5))
      returning id into op;
      insert into operation_events (operation_id, kind, actor, actor_id) values (op, 'sent', 'user', u.id);
    end if;
    insert into compa_conversations (number, use, channel, surface, user_id, city_id, lang, operation_id, business_id, is_test, started_at)
    values ('CP-' || nextval('compa_conversation_seq'), 'neighbor', 'app', s.sup, u.id, ciudad, 'es', op, case when op is not null then 'sabor-dominicano' end, true,
            now() - make_interval(mins => s.hace))
    returning * into cv;
    insert into compa_messages (conversation_id, city_id, sender, user_id, text, step_key, at)
    values (cv.id, ciudad, 'user', u.id, s.texto, case when s.res = 'accion' then 'cancel' end, cv.started_at);
    insert into compa_messages (conversation_id, city_id, sender, text, source_slug, source_label, engine, at)
    values (cv.id, ciudad, 'compa', s.resp, s.fuente, case when s.fuente is not null then 'SEGÚN EL CENTRO DE AYUDA' end, s.motor, cv.started_at + interval '2 seconds')
    returning id into m;
    if s.res = 'accion' then
      insert into compa_actions (conversation_id, message_id, user_id, type, operation_id, op_status, target, expires_at, proposed_at)
      values (cv.id, m, u.id, 'cancel_request', op, 'pending', jsonb_build_object('numero', (select number from operations where id = op), 'negocio', 'Sabor Dominicano'),
              now() + interval '15 minutes', cv.started_at + interval '2 seconds')
      returning id into a;
      update compa_actions set status = 'confirming', confirmed_via = 'app' where id = a;
      update operations set status = 'cancelled', cancelled_by = 'user', cancelled_at = now(), cancel_reason = 'otro', details = details || '{"cxWhy":"otro"}'::jsonb, updated_at = now() where id = op;
      insert into operation_events (operation_id, kind, actor, actor_id) values (op, 'cancelled', 'compa', u.id);
      update compa_actions set status = 'confirmed' where id = a;
      insert into compa_messages (conversation_id, city_id, sender, text, engine, at)
      values (cv.id, ciudad, 'system', 'CANCELASTE LA SOLICITUD EN SABOR DOMINICANO · NO SE COBRÓ NADA', null, cv.started_at + interval '40 seconds');
      update compa_conversations set closed_at = now() where id = cv.id;
    elsif s.res = 'persona' then
      select * into k from support_cases where user_id = u.id and client_key = s.clave::uuid;
      if k.id is null then
        insert into support_cases (number, user_id, city_id, topic, origin, compa_conversation_id, summary, priority, sla_due_at, device, app_version, client_key, is_test, created_at)
        values ('TK-' || nextval('support_case_seq'), u.id, ciudad, s.tema, 'compa', cv.id, 'Desde El Compa: ' || s.texto, s.prio,
                soporte_sla(ciudad, cv.started_at, cfg_int('soporte_sla_h')), 'iPhone · Safari', 'web', s.clave::uuid, true, cv.started_at + interval '3 seconds')
        returning * into k;
        insert into support_messages (case_id, city_id, sender, user_id, body, at) values (k.id, ciudad, 'user', u.id, s.texto || ' (desde El Compa)', k.created_at);
        insert into support_messages (case_id, city_id, sender, sys_key, vars, at) values (k.id, ciudad, 'system', 'recibido', jsonb_build_object('num', k.number), k.created_at + interval '1 second');
      end if;
      insert into compa_handoffs (conversation_id, "to", reason, support_case_id, summary, promised_reply, at)
      values (cv.id, 'support', s.motivo, k.id, s.texto, 'lunes a viernes, de 9 AM a 6 PM', cv.started_at + interval '3 seconds');
    elsif s.res = 'cuenta' then
      insert into compa_actions (conversation_id, message_id, user_id, type, target, expires_at, proposed_at)
      values (cv.id, m, u.id, 'open_screen', '{"pantalla":"cuenta_telefono","href":"/cuenta/ajustes"}', now() + interval '15 minutes', cv.started_at + interval '2 seconds')
      returning id into a;
      update compa_actions set status = 'confirming', confirmed_via = 'app' where id = a;
      update compa_actions set status = 'confirmed' where id = a;
      update compa_conversations set closed_at = now(), outcome = 'self_resolved' where id = cv.id;
    else
      update compa_conversations set closed_at = now(), outcome = 'self_resolved' where id = cv.id;
    end if;
  end loop;
end $$;

commit;
