-- Semilla de pruebas · 7f · Respuestas automáticas de El Compa (Pro) en Mensajes. SOLO SANDBOX.
--   · Sabor Dominicano (Pro): respuestas automáticas ENCENDIDAS («fuera de tu horario», los cuatro temas) con la nota del diseño «Los sábados hay
--     sancocho desde las 12. Catering con 3 días de aviso.» (ES/EN). Si el negocio no tiene Pro en esta base, se dejan apagadas (la base no deja
--     encenderlas sin Pro).
--   · Dos conversaciones de clientes de prueba con Sabor Dominicano en las que contestó El Compa, escritas como las contesta el motor del sandbox
--     (las reglas fijas con la página del negocio; nada copiado del registro del prototipo): Héctor «¿A qué hora abren mañana?» → la presentación
--     y el horario; Yaritza «¿Me hacen descuento para 20 personas el sábado?» → «Eso lo decide Sabor Dominicano: le pasé tu mensaje…» y el hilo
--     pasa al negocio (sin leer). Solo si esa persona todavía no tiene conversación con el negocio (no se mezcla con lo que haya).
--   · Una moderadora de prueba en Sabor Dominicano con UNA parte del panel («Hoy y pedidos»), propuesta en 7e (LAUNCH): Rosa Prueba
--     (5705550691). Sirve para mirar «Eso lo ve el dueño» en el asistente del panel y que sin «Mensajes» no ve ni cambia las respuestas
--     automáticas.
--   · Barbería El Primo: respuestas automáticas encendidas por el negocio y APAGADAS POR EL EQUIPO con motivo (la pausa del negocio del nivel
--     «Respuestas automáticas»). Esa pausa necesita a alguien del equipo Admin: si la base no tiene ninguno (CI), se salta; la semilla no depende
--     del equipo.
-- Idempotente: los ajustes con «on conflict», las conversaciones por su texto fijo y la pausa si no hay una viva.
begin;

insert into users (phone, phone_verified_at, first_name, last_name, home_city_id, lang, is_test) values
  ('+15705550288', now(), 'Héctor', 'Prueba', 'hzl', 'es', true),
  ('+15705550299', now(), 'Yaritza', 'Prueba', 'hzl', 'es', true),
  ('+15705550691', now(), 'Rosa', 'Prueba', 'hzl', 'es', true)
on conflict (phone) do nothing;

do $$
declare b businesses; u users; t bigint; cm bigint; cv compa_conversations; s record; adm uuid; nota jsonb;
begin
  -- ── Sabor Dominicano ──
  select * into b from businesses where id = 'sabor-dominicano';
  if b.id is not null then
    nota := '{"es":"Los sábados hay sancocho desde las 12. Catering con 3 días de aviso.","en":"Sancocho on Saturdays from 12. Catering with 3 days'' notice."}'::jsonb;
    insert into compa_business_settings (business_id, city_id, enabled, owner_note)
    values (b.id, b.city_id, compa_negocio_pro(b.id), nota)
    on conflict (business_id) do nothing;

    -- La moderadora con una sola parte (Hoy y pedidos).
    select * into u from users where phone = '+15705550691';
    if not exists (select 1 from business_members where business_id = b.id and user_id = u.id) then
      insert into business_members (business_id, user_id, kind, display_name, status, show_on_page, panel_access)
      values (b.id, u.id, 'staff', 'Rosa Prueba', 'active', false, '{ord}');
    end if;

    -- Dos conversaciones en las que contestó El Compa (solo si esa persona no tiene una con el negocio).
    for s in select * from (values
        ('+15705550288', 600, '¿A qué hora abren mañana?',
          'Soy El Compa, el asistente de IA de Sabor Dominicano. Ahora estamos cerrados. Abrimos mañana a las 11 AM. Estamos en 412 N Wyoming St, Hazleton, PA.', false),
        ('+15705550299', 240, '¿Me hacen descuento para 20 personas el sábado?',
          'Soy El Compa, el asistente de IA de Sabor Dominicano. Eso lo decide Sabor Dominicano: le pasé tu mensaje y te contesta cuando abra.', true)
      ) v(tel, hace, texto, resp, pasa) loop
      select * into u from users where phone = s.tel;
      continue when u.id is null or exists (select 1 from chat_threads where user_id = u.id and business_id = b.id);
      insert into chat_threads (user_id, business_id, city_id, context, last_at, last_from, last_text, biz_unread, created_at)
      values (u.id, b.id, b.city_id, '{"es":"Consulta general","en":"General question"}', now() - make_interval(mins => s.hace) + interval '20 seconds', 'auto', left(s.resp, 150), 1,
              now() - make_interval(mins => s.hace))
      returning id into t;
      insert into chat_messages (thread_id, sender, sender_user_id, body, created_at) values (t, 'user', u.id, s.texto, now() - make_interval(mins => s.hace));
      insert into chat_messages (thread_id, sender, body, compa, created_at) values (t, 'auto', s.resp, true, now() - make_interval(mins => s.hace) + interval '20 seconds')
      returning id into cm;
      insert into compa_conversations (number, use, channel, surface, user_id, city_id, lang, business_id, chat_thread_id, ai, is_test, started_at)
      values ('CP-' || nextval('compa_conversation_seq'), 'auto_reply', 'app', 'business_chat', u.id, b.city_id, 'es', b.id, t, false, true, now() - make_interval(mins => s.hace))
      returning * into cv;
      insert into compa_messages (conversation_id, city_id, sender, user_id, text, at) values (cv.id, b.city_id, 'user', u.id, s.texto, cv.started_at);
      insert into compa_messages (conversation_id, city_id, sender, text, source_label, engine, at)
      values (cv.id, b.city_id, 'compa', s.resp, case when s.pasa then null else 'SEGÚN LA PÁGINA DE SABOR DOMINICANO' end, 'reglas', cv.started_at + interval '20 seconds');
      if s.pasa then
        insert into compa_handoffs (conversation_id, "to", reason, chat_thread_id, chat_message_id, summary, at) values (cv.id, 'owner', 'owner', t, cm, s.texto, cv.started_at + interval '20 seconds');
      else
        update compa_conversations set closed_at = now(), outcome = 'self_resolved' where id = cv.id;
      end if;
    end loop;
  end if;

  -- ── Barbería El Primo: encendidas por el negocio, apagadas por el equipo (si hay alguien del equipo Admin) ──
  select * into b from businesses where id = 'barberia-el-primo';
  if b.id is not null then
    insert into compa_business_settings (business_id, city_id, enabled, owner_note)
    values (b.id, b.city_id, compa_negocio_pro(b.id), '{"es":"Cortes sin cita de martes a sábado.","en":"Walk-in cuts Tuesday to Saturday."}'::jsonb)
    on conflict (business_id) do nothing;
    select m.user_id into adm from staff_members m where m.role = 'admin' and m.status = 'active' order by m.user_id limit 1;
    if adm is not null and not exists (select 1 from compa_pauses p where p.scope = 'business' and p.business_id = b.id and p.lifted_at is null) then
      insert into compa_pauses (scope, business_id, use, reason, paused_by)
      values ('business', b.id, 'auto_reply', 'Prueba del sandbox: reportaron respuestas que no eran de su página.', adm);
    end if;
  end if;
end $$;

commit;
