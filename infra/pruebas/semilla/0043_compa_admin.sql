-- Semilla de pruebas · 7i · Super Admin completo de El Compa. SOLO SANDBOX.
-- Para que Resumen › «LO QUE EL COMPA NO SUPO · PARA EL CENTRO DE AYUDA» y «MARCADAS POR EL EQUIPO» se vean con algo real del motor (nada copiado
-- de las CP-5100 del prototipo):
--   · NO SUPO (vecino, abierta): Héctor pregunta «¿Hacen envíos a Freeland?» en Soporte › El Compa → «No tengo ese dato…» (reglas fijas) y se cierra.
--   · NO SUPO (negocio, abierta): la dueña de Sabor Dominicano pregunta en Panel › El Compa «¿Cómo descargo la lista de mis clientes?» → «No tengo
--     ese dato…» y se cierra.
--   · NO SUPO (vecino, ANOTADA por Soporte): la conversación «¿Qué pidió Ana ayer en El Fogón?» de la semilla 0041 (pedía datos de otra persona).
--   · MARCADA por Soporte: la de 0041 «¿Cómo reservo una mesa en un restaurante?» (motivo «El tono»).
-- Lo que pide a alguien del equipo (anotar, marcar) solo se escribe si Dayana (Soporte, semilla 0040) existe: en una base nueva sin equipo (CI) se
-- salta. Idempotente: cada conversación por el texto fijo de su primer mensaje (de esa persona, de prueba); la pregunta por (conversación, texto);
-- la marca, una viva por conversación.
begin;

do $$
declare u users; d users; b businesses; cv compa_conversations; s record; ciudad text;
begin
  select * into d from users where phone = '+15705550677';   -- Dayana (Soporte)
  for s in select * from (values
      -- teléfono, uso, superficie, negocio, audiencia, hace (min), lo que escribió la persona, lo que contestó El Compa
      ('+15705550288', 'neighbor', 'support_page', null, 'vecino', 150, '¿Hacen envíos a Freeland?', 'No tengo ese dato. Si quieres, te paso con una persona.'),
      ('+15705550133', 'owner', 'panel', 'sabor-dominicano', 'negocio', 75, '¿Cómo descargo la lista de mis clientes?', 'No tengo ese dato. Si quieres, te paso con una persona.')
    ) v(tel, uso, sup, neg, aud, hace, texto, resp) loop
    select * into u from users where phone = s.tel;
    continue when u.id is null;
    if s.neg is not null then
      select * into b from businesses where id = s.neg;
      continue when b.id is null;
    end if;
    continue when exists (select 1 from compa_conversations c join compa_messages x on x.conversation_id = c.id
                           where c.user_id = u.id and c.is_test and x.sender = 'user' and x.text = s.texto);
    ciudad := coalesce(case when s.neg is not null then b.city_id end, u.home_city_id, 'hzl');
    insert into compa_conversations (number, use, channel, surface, user_id, city_id, lang, business_id, is_test, started_at)
    values ('CP-' || nextval('compa_conversation_seq'), s.uso, 'app', s.sup, u.id, ciudad, 'es', s.neg, true, now() - make_interval(mins => s.hace))
    returning * into cv;
    insert into compa_messages (conversation_id, city_id, sender, user_id, text, at) values (cv.id, ciudad, 'user', u.id, s.texto, cv.started_at);
    insert into compa_messages (conversation_id, city_id, sender, text, engine, at) values (cv.id, ciudad, 'compa', s.resp, 'reglas', cv.started_at + interval '2 seconds');
    insert into compa_unknowns (conversation_id, city_id, audience, lang, query_tapada, is_test) values (cv.id, ciudad, s.aud, 'es', s.texto, true) on conflict do nothing;
    update compa_conversations set closed_at = now(), outcome = 'self_resolved' where id = cv.id;
  end loop;

  -- La de 0041 que pedía datos de otra persona: en la lista y, si hay Soporte, ya anotada.
  for cv in select c.* from compa_conversations c join compa_messages x on x.conversation_id = c.id
             where c.is_test and x.sender = 'user' and x.text = '¿Qué pidió Ana ayer en El Fogón?' loop
    insert into compa_unknowns (conversation_id, city_id, audience, lang, query_tapada, is_test)
    values (cv.id, cv.city_id, 'vecino', 'es', '¿Qué pidió Ana ayer en El Fogón?', true) on conflict do nothing;
    if d.id is not null then
      update compa_unknowns set status = 'noted', note = 'Pide datos de otra persona: El Compa hizo bien en no saber.', decided_by = d.id
       where conversation_id = cv.id and status = 'open';
    end if;
  end loop;

  -- La marca (si hay Soporte): una viva por conversación.
  if d.id is not null then
    insert into compa_reviews (conversation_id, city_id, staff_id, reason, note, is_test)
    select c.id, c.city_id, d.id, 'tone', 'La respuesta es larga para el teléfono: tres frases cortas.', true
      from compa_conversations c join compa_messages x on x.conversation_id = c.id
     where c.is_test and x.sender = 'user' and x.text = '¿Cómo reservo una mesa en un restaurante?'
       and not exists (select 1 from compa_reviews r where r.conversation_id = c.id and r.cleared_at is null)
     limit 1;
  end if;
end $$;

commit;
