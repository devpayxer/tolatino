-- SOLO SANDBOX. Novedades de Sabor Dominicano (Fase 2 · 2g), las del prototipo (datos/neg-nov.js) que ya existen en la app:
-- oferta fijada (mofongo a $10; el «antes» es el precio del menú), encuesta, aviso de horario, «hoy hay» (flan) y novedad (terraza). Sin cupón, evento
-- ni vacante (llegan con sus bloques). Sin fecha de fin, para poder revisarlas en el sandbox. Votos y comentarios de los
-- vecinos de ejemplo (555-02xx) y las respuestas del negocio. Repetible.
begin;
update businesses set modules_on = array(select distinct x from unnest(modules_on || array['nov']) x)
 where id = 'sabor-dominicano' and is_demo and not ('nov' = any(modules_on));

insert into business_posts (business_id, city_id, kind, title, body, link_kind, item_id, price_was_cents, price_now_cents, pinned, publish_at, created_at)
select 'sabor-dominicano', 'hzl', 'oferta', 'Mofongo de chicharrón a $10 hoy', 'Hasta agotar. Con caldo de pollo.', 'item',
       (select id from items where business_id = 'sabor-dominicano' and name->>'es' = 'Mofongo de chicharrón' and removed_at is null limit 1), (select price_cents from items where business_id = 'sabor-dominicano' and name->>'es' = 'Mofongo de chicharrón' and removed_at is null limit 1), 1000, true, now() - interval '2 hours', now() - interval '2 hours'
 where exists (select 1 from businesses where id = 'sabor-dominicano' and is_demo)
   and not exists (select 1 from business_posts where business_id = 'sabor-dominicano' and title = 'Mofongo de chicharrón a $10 hoy');
insert into business_posts (business_id, city_id, kind, title, poll, publish_at, created_at)
select 'sabor-dominicano', 'hzl', 'encuesta', '¿Qué cocinamos el sábado en la noche?', array['Chivo guisado', 'Pescado frito', 'Locrio de pollo'], now() - interval '5 hours', now() - interval '5 hours'
 where exists (select 1 from businesses where id = 'sabor-dominicano' and is_demo)
   and not exists (select 1 from business_posts where business_id = 'sabor-dominicano' and title = '¿Qué cocinamos el sábado en la noche?');
insert into business_posts (business_id, city_id, kind, title, body, aviso, publish_at, created_at)
select 'sabor-dominicano', 'hzl', 'aviso', 'El lunes 12 de octubre cerramos a las 6 PM', 'Día de la Raza.', '{"day": "Lunes 12 oct", "hrs": "early", "hrsT": "11 AM – 6 PM"}'::jsonb, now() - interval '20 hours', now() - interval '20 hours'
 where exists (select 1 from businesses where id = 'sabor-dominicano' and is_demo)
   and not exists (select 1 from business_posts where business_id = 'sabor-dominicano' and title = 'El lunes 12 de octubre cerramos a las 6 PM');
insert into business_posts (business_id, city_id, kind, title, body, link_kind, item_id, publish_at, created_at)
select 'sabor-dominicano', 'hzl', 'hoy', 'Llegó el flan de leche de doña Rosa', 'Son poquitos.', 'item',
       (select id from items where business_id = 'sabor-dominicano' and name->>'es' = 'Flan de leche' and removed_at is null limit 1), now() - interval '30 hours', now() - interval '30 hours'
 where exists (select 1 from businesses where id = 'sabor-dominicano' and is_demo)
   and not exists (select 1 from business_posts where business_id = 'sabor-dominicano' and title = 'Llegó el flan de leche de doña Rosa');
insert into business_posts (business_id, city_id, kind, title, body, publish_at, created_at)
select 'sabor-dominicano', 'hzl', 'novedad', 'Estrenamos terraza', '8 mesas afuera para las noches de septiembre. Se puede reservar.', now() - interval '72 hours', now() - interval '72 hours'
 where exists (select 1 from businesses where id = 'sabor-dominicano' and is_demo)
   and not exists (select 1 from business_posts where business_id = 'sabor-dominicano' and title = 'Estrenamos terraza');

-- Votos + de los vecinos de ejemplo y votos de la encuesta.
insert into post_votes (post_id, user_id, v)
select p.id, u.id, 1 from business_posts p cross join users u
 where p.business_id = 'sabor-dominicano' and u.phone like '+157055502%' and (abs(hashtext(p.title || u.phone)) % 3) <> 0
on conflict do nothing;
insert into post_poll_votes (post_id, user_id, opt)
select p.id, u.id, (abs(hashtext(u.phone)) % 3) from business_posts p cross join users u
 where p.business_id = 'sabor-dominicano' and p.kind = 'encuesta' and u.phone like '+157055502%'
on conflict do nothing;
-- Comentarios con la respuesta del negocio.
insert into post_comments (post_id, user_id, body, reply, reply_at, reply_by, created_at)
select p.id, (select id from users where phone = '+15705550202'), '¿Lo tienen para delivery también?', 'Sí. El precio es el mismo en delivery y pickup.', now() - interval '1 hour',
       (select id from users where phone = '+15705550133'), now() - interval '90 minutes'
  from business_posts p where p.business_id = 'sabor-dominicano' and p.kind = 'oferta'
   and not exists (select 1 from post_comments c where c.post_id = p.id and c.body = '¿Lo tienen para delivery también?');
insert into post_comments (post_id, user_id, body, created_at)
select p.id, (select id from users where phone = '+15705550203'), 'El mejor mofongo de Hazleton, sin discusión.', now() - interval '1 hour'
  from business_posts p where p.business_id = 'sabor-dominicano' and p.kind = 'oferta'
   and not exists (select 1 from post_comments c where c.post_id = p.id and c.body = 'El mejor mofongo de Hazleton, sin discusión.');
insert into post_comments (post_id, user_id, body, reply, reply_at, reply_by, created_at)
select p.id, (select id from users where phone = '+15705550206'), '¿Y el domingo abren normal?', 'Sí: domingo de 11 AM a 9 PM.', now() - interval '17 hours',
       (select id from users where phone = '+15705550133'), now() - interval '18 hours'
  from business_posts p where p.business_id = 'sabor-dominicano' and p.kind = 'aviso'
   and not exists (select 1 from post_comments c where c.post_id = p.id and c.body = '¿Y el domingo abren normal?');
commit;
