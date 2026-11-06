-- GENERADO por scripts/semilla/generar-resenas.py — no editar a mano.
-- SOLO SANDBOX. Reseñas de Sabor Dominicano (Fase 2 · 2g), las 14 del prototipo (datos/neg-rev.js): vecinos de ejemplo
-- (teléfonos 555-02xx, ficción), respuestas del dueño, «Útil» entre ellos y sus fotos. Al final, ★ y conteo de TODOS los
-- negocios se recalculan desde las reseñas reales (antes venían fijos en la semilla). Repetible.
begin;
insert into users (phone, phone_verified_at, first_name, last_name, home_city_id) values ('+15705550201', now(), 'Yokasta', 'Méndez', 'hzl') on conflict (phone) do nothing;
insert into users (phone, phone_verified_at, first_name, last_name, home_city_id) values ('+15705550202', now(), 'Mariela', 'Santos', 'hzl') on conflict (phone) do nothing;
insert into users (phone, phone_verified_at, first_name, last_name, home_city_id) values ('+15705550203', now(), 'Ramón', 'Almonte', 'hzl') on conflict (phone) do nothing;
insert into users (phone, phone_verified_at, first_name, last_name, home_city_id) values ('+15705550204', now(), 'Luis', 'Reyes', 'hzl') on conflict (phone) do nothing;
insert into users (phone, phone_verified_at, first_name, last_name, home_city_id) values ('+15705550205', now(), 'Daisy', 'Tavárez', 'hzl') on conflict (phone) do nothing;
insert into users (phone, phone_verified_at, first_name, last_name, home_city_id) values ('+15705550206', now(), 'José', 'López', 'hzl') on conflict (phone) do nothing;
insert into users (phone, phone_verified_at, first_name, last_name, home_city_id) values ('+15705550207', now(), 'Kathy', 'Peña', 'hzl') on conflict (phone) do nothing;
insert into users (phone, phone_verified_at, first_name, last_name, home_city_id) values ('+15705550208', now(), 'Wilfredo', 'Cabrera', 'hzl') on conflict (phone) do nothing;
insert into users (phone, phone_verified_at, first_name, last_name, home_city_id) values ('+15705550209', now(), 'Anny', 'Vásquez', 'hzl') on conflict (phone) do nothing;
insert into users (phone, phone_verified_at, first_name, last_name, home_city_id) values ('+15705550210', now(), 'Héctor', 'Batista', 'hzl') on conflict (phone) do nothing;
insert into users (phone, phone_verified_at, first_name, last_name, home_city_id) values ('+15705550211', now(), 'Carmen', 'García', 'hzl') on conflict (phone) do nothing;
insert into users (phone, phone_verified_at, first_name, last_name, home_city_id) values ('+15705550212', now(), 'Pedro', 'Núñez', 'hzl') on conflict (phone) do nothing;
insert into users (phone, phone_verified_at, first_name, last_name, home_city_id) values ('+15705550213', now(), 'Rosanna', 'Féliz', 'hzl') on conflict (phone) do nothing;
insert into users (phone, phone_verified_at, first_name, last_name, home_city_id) values ('+15705550214', now(), 'Freddy', 'Durán', 'hzl') on conflict (phone) do nothing;
insert into reviews (business_id, city_id, user_id, src, stars, body, lang, answers, facts, rec, reply, reply_at, reply_by, created_at, edited_at)
select 'sabor-dominicano', 'hzl', (select id from users where phone = '+15705550201'), 'dl', 5, 'La bandera como en casa: el pollo guisado suave y las habichuelas con sazón. Pedí delivery y llegó caliente, antes de la hora que decía.', 'es', '{"taste": 1, "hot": 1, "val": 1}'::jsonb, '{"late": -2}'::jsonb,
       array(select id::text from items where business_id = 'sabor-dominicano' and removed_at is null and name->>'es' = any(array['La bandera']::text[])),
       'Gracias, Yokasta. Te esperamos el sábado para el sancocho.', now() - interval '2 days', (select id from users where phone = '+15705550133'),
       now() - interval '3 days', null
 where exists (select 1 from businesses where id = 'sabor-dominicano' and is_demo)
   and not exists (select 1 from reviews where business_id = 'sabor-dominicano' and user_id = (select id from users where phone = '+15705550201') and status <> 'removed');
insert into media (id, owner_kind, owner_id, url, credit, sort, uploaded_by)
select md5('semilla:resena:+15705550201:0')::uuid, 'review', r.id::text, 'https://images.pexels.com/photos/27556972/pexels-photo-27556972.jpeg', 'Pexels', 0, r.user_id from reviews r
 where r.business_id = 'sabor-dominicano' and r.user_id = (select id from users where phone = '+15705550201') and r.status <> 'removed'
on conflict (id) do nothing;
insert into reviews (business_id, city_id, user_id, src, stars, body, lang, answers, facts, rec, reply, reply_at, reply_by, created_at, edited_at)
select 'sabor-dominicano', 'hzl', (select id from users where phone = '+15705550202'), 'dl', 5, 'Mangú con los tres golpes a las 11 de la mañana, como en la capital. El morir soñando llegó bien frío, que es como tiene que llegar.', 'es', '{"taste": 1, "hot": 1, "val": 1}'::jsonb, '{"late": 3}'::jsonb,
       array(select id::text from items where business_id = 'sabor-dominicano' and removed_at is null and name->>'es' = any(array['Mangú con los tres golpes', 'Morir soñando']::text[])),
       'Gracias, Mariela. Buen provecho.', now() - interval '1 days', (select id from users where phone = '+15705550133'),
       now() - interval '2 days', null
 where exists (select 1 from businesses where id = 'sabor-dominicano' and is_demo)
   and not exists (select 1 from reviews where business_id = 'sabor-dominicano' and user_id = (select id from users where phone = '+15705550202') and status <> 'removed');
insert into media (id, owner_kind, owner_id, url, credit, sort, uploaded_by)
select md5('semilla:resena:+15705550202:0')::uuid, 'review', r.id::text, 'https://images.pexels.com/photos/14810483/pexels-photo-14810483.jpeg', 'Pexels', 0, r.user_id from reviews r
 where r.business_id = 'sabor-dominicano' and r.user_id = (select id from users where phone = '+15705550202') and r.status <> 'removed'
on conflict (id) do nothing;
insert into media (id, owner_kind, owner_id, url, credit, sort, uploaded_by)
select md5('semilla:resena:+15705550202:1')::uuid, 'review', r.id::text, 'https://images.pexels.com/photos/20300401/pexels-photo-20300401.jpeg', 'Pexels', 1, r.user_id from reviews r
 where r.business_id = 'sabor-dominicano' and r.user_id = (select id from users where phone = '+15705550202') and r.status <> 'removed'
on conflict (id) do nothing;
insert into reviews (business_id, city_id, user_id, src, stars, body, lang, answers, facts, rec, reply, reply_at, reply_by, created_at, edited_at)
select 'sabor-dominicano', 'hzl', (select id from users where phone = '+15705550203'), 'pk', 5, 'El chivo guisado es el mejor de Hazleton. Pedí pickup para las 12:30 y a las 12:25 ya estaba listo en el mostrador.', 'es', '{"taste": 1, "hot": 1, "val": 1}'::jsonb, '{"late": 0}'::jsonb,
       array(select id::text from items where business_id = 'sabor-dominicano' and removed_at is null and name->>'es' = any(array['Chivo guisado']::text[])),
       'Gracias, Ramón. El chivo sale todos los días hasta que se acaba.', now() - interval '4 days', (select id from users where phone = '+15705550133'),
       now() - interval '5 days', null
 where exists (select 1 from businesses where id = 'sabor-dominicano' and is_demo)
   and not exists (select 1 from reviews where business_id = 'sabor-dominicano' and user_id = (select id from users where phone = '+15705550203') and status <> 'removed');
insert into media (id, owner_kind, owner_id, url, credit, sort, uploaded_by)
select md5('semilla:resena:+15705550203:0')::uuid, 'review', r.id::text, 'https://images.pexels.com/photos/27556981/pexels-photo-27556981.jpeg', 'Pexels', 0, r.user_id from reviews r
 where r.business_id = 'sabor-dominicano' and r.user_id = (select id from users where phone = '+15705550203') and r.status <> 'removed'
on conflict (id) do nothing;
insert into reviews (business_id, city_id, user_id, src, stars, body, lang, answers, facts, rec, reply, reply_at, reply_by, created_at, edited_at)
select 'sabor-dominicano', 'hzl', (select id from users where phone = '+15705550204'), 'rsv', 5, 'El mofongo de chicharrón vale la pena. Los viernes en la noche hay espera de unos 20 minutos aunque reserves; llega temprano.', 'es', '{"taste": 1, "val": 1}'::jsonb, '{}'::jsonb,
       array(select id::text from items where business_id = 'sabor-dominicano' and removed_at is null and name->>'es' = any(array['Mofongo de chicharrón']::text[])),
       null, null, null,
       now() - interval '7 days', null
 where exists (select 1 from businesses where id = 'sabor-dominicano' and is_demo)
   and not exists (select 1 from reviews where business_id = 'sabor-dominicano' and user_id = (select id from users where phone = '+15705550204') and status <> 'removed');
insert into media (id, owner_kind, owner_id, url, credit, sort, uploaded_by)
select md5('semilla:resena:+15705550204:0')::uuid, 'review', r.id::text, 'https://images.pexels.com/photos/37121074/pexels-photo-37121074.jpeg', 'Pexels', 0, r.user_id from reviews r
 where r.business_id = 'sabor-dominicano' and r.user_id = (select id from users where phone = '+15705550204') and r.status <> 'removed'
on conflict (id) do nothing;
insert into media (id, owner_kind, owner_id, url, credit, sort, uploaded_by)
select md5('semilla:resena:+15705550204:1')::uuid, 'review', r.id::text, 'https://images.pexels.com/photos/39143744/pexels-photo-39143744.jpeg', 'Pexels', 1, r.user_id from reviews r
 where r.business_id = 'sabor-dominicano' and r.user_id = (select id from users where phone = '+15705550204') and r.status <> 'removed'
on conflict (id) do nothing;
insert into reviews (business_id, city_id, user_id, src, stars, body, lang, answers, facts, rec, reply, reply_at, reply_by, created_at, edited_at)
select 'sabor-dominicano', 'hzl', (select id from users where phone = '+15705550205'), 'vis', 5, 'Fui con mi mamá un domingo. Nos atendió Yanet, súper amable, y nos explicó los platos en español y en inglés.', 'es', '{"taste": 1}'::jsonb, '{}'::jsonb,
       array(select id::text from items where business_id = 'sabor-dominicano' and removed_at is null and name->>'es' = any(array[]::text[])),
       null, null, null,
       now() - interval '9 days', null
 where exists (select 1 from businesses where id = 'sabor-dominicano' and is_demo)
   and not exists (select 1 from reviews where business_id = 'sabor-dominicano' and user_id = (select id from users where phone = '+15705550205') and status <> 'removed');
insert into reviews (business_id, city_id, user_id, src, stars, body, lang, answers, facts, rec, reply, reply_at, reply_by, created_at, edited_at)
select 'sabor-dominicano', 'hzl', (select id from users where phone = '+15705550206'), 'pk', 4, 'Rico todo, pero el pickup se atrasó 12 minutos a la hora del almuerzo. El flan, de lo mejor que he probado aquí.', 'es', '{"taste": 1, "hot": 1, "val": 1}'::jsonb, '{"late": 12}'::jsonb,
       array(select id::text from items where business_id = 'sabor-dominicano' and removed_at is null and name->>'es' = any(array['Flan de leche']::text[])),
       null, null, null,
       now() - interval '11 days', null
 where exists (select 1 from businesses where id = 'sabor-dominicano' and is_demo)
   and not exists (select 1 from reviews where business_id = 'sabor-dominicano' and user_id = (select id from users where phone = '+15705550206') and status <> 'removed');
insert into reviews (business_id, city_id, user_id, src, stars, body, lang, answers, facts, rec, reply, reply_at, reply_by, created_at, edited_at)
select 'sabor-dominicano', 'hzl', (select id from users where phone = '+15705550207'), 'dl', 4, 'Buena comida y precio justo. El delivery llegó 22 minutos tarde y los tostones tibios. El pica pollo, perfecto.', 'es', '{"taste": 1, "hot": 0, "val": 1}'::jsonb, '{"late": 22}'::jsonb,
       array(select id::text from items where business_id = 'sabor-dominicano' and removed_at is null and name->>'es' = any(array['Pica pollo']::text[])),
       'Tienes razón, Kathy. Ese día tuvimos un solo chofer. Ya contratamos otro y te devolvimos el envío.', now() - interval '13 days', (select id from users where phone = '+15705550133'),
       now() - interval '14 days', null
 where exists (select 1 from businesses where id = 'sabor-dominicano' and is_demo)
   and not exists (select 1 from reviews where business_id = 'sabor-dominicano' and user_id = (select id from users where phone = '+15705550207') and status <> 'removed');
insert into reviews (business_id, city_id, user_id, src, stars, body, lang, answers, facts, rec, reply, reply_at, reply_by, created_at, edited_at)
select 'sabor-dominicano', 'hzl', (select id from users where phone = '+15705550208'), 'dl', 3, 'El pescado llegó frío y para $18 esperaba más porción. El sabor sí estaba bien. Pedí ayuda con el pedido y me devolvieron el plato.', 'es', '{"taste": 1, "hot": -1, "val": -1}'::jsonb, '{"late": 9}'::jsonb,
       array(select id::text from items where business_id = 'sabor-dominicano' and removed_at is null and name->>'es' = any(array[]::text[])),
       'Wilfredo, tienes razón. El pescado no viaja bien lejos; ahora solo lo mandamos hasta 2 millas.', now() - interval '17 days', (select id from users where phone = '+15705550133'),
       now() - interval '18 days', now() - interval '17 days'
 where exists (select 1 from businesses where id = 'sabor-dominicano' and is_demo)
   and not exists (select 1 from reviews where business_id = 'sabor-dominicano' and user_id = (select id from users where phone = '+15705550208') and status <> 'removed');
insert into media (id, owner_kind, owner_id, url, credit, sort, uploaded_by)
select md5('semilla:resena:+15705550208:0')::uuid, 'review', r.id::text, 'https://images.pexels.com/photos/36857725/pexels-photo-36857725.jpeg', 'Pexels', 0, r.user_id from reviews r
 where r.business_id = 'sabor-dominicano' and r.user_id = (select id from users where phone = '+15705550208') and r.status <> 'removed'
on conflict (id) do nothing;
insert into reviews (business_id, city_id, user_id, src, stars, body, lang, answers, facts, rec, reply, reply_at, reply_by, created_at, edited_at)
select 'sabor-dominicano', 'hzl', (select id from users where phone = '+15705550209'), 'rsv', 5, 'Reservamos para 8 el domingo por el cumpleaños de mi papá. La mesa estaba lista a la hora y el sancocho de siete carnes, espectacular.', 'es', '{"taste": 1, "val": 1}'::jsonb, '{}'::jsonb,
       array(select id::text from items where business_id = 'sabor-dominicano' and removed_at is null and name->>'es' = any(array['Sancocho']::text[])),
       'Felicidades a tu papá, Anny. Los esperamos otra vez.', now() - interval '20 days', (select id from users where phone = '+15705550133'),
       now() - interval '21 days', null
 where exists (select 1 from businesses where id = 'sabor-dominicano' and is_demo)
   and not exists (select 1 from reviews where business_id = 'sabor-dominicano' and user_id = (select id from users where phone = '+15705550209') and status <> 'removed');
insert into media (id, owner_kind, owner_id, url, credit, sort, uploaded_by)
select md5('semilla:resena:+15705550209:0')::uuid, 'review', r.id::text, 'https://images.pexels.com/photos/27397342/pexels-photo-27397342.jpeg', 'Pexels', 0, r.user_id from reviews r
 where r.business_id = 'sabor-dominicano' and r.user_id = (select id from users where phone = '+15705550209') and r.status <> 'removed'
on conflict (id) do nothing;
insert into media (id, owner_kind, owner_id, url, credit, sort, uploaded_by)
select md5('semilla:resena:+15705550209:1')::uuid, 'review', r.id::text, 'https://images.pexels.com/photos/38330332/pexels-photo-38330332.jpeg', 'Pexels', 1, r.user_id from reviews r
 where r.business_id = 'sabor-dominicano' and r.user_id = (select id from users where phone = '+15705550209') and r.status <> 'removed'
on conflict (id) do nothing;
insert into reviews (business_id, city_id, user_id, src, stars, body, lang, answers, facts, rec, reply, reply_at, reply_by, created_at, edited_at)
select 'sabor-dominicano', 'hzl', (select id from users where phone = '+15705550210'), 'vis', 2, 'Esperé 40 minutos por una mesa un viernes y nadie me dijo nada. La comida bien, pero así no vuelvo un viernes.', 'es', '{"taste": 0}'::jsonb, '{}'::jsonb,
       array(select id::text from items where business_id = 'sabor-dominicano' and removed_at is null and name->>'es' = any(array[]::text[])),
       'Héctor, lo sentimos. Ahora los viernes hay lista de espera en To’Latino y te avisamos por SMS cuando se libera la mesa.', now() - interval '25 days', (select id from users where phone = '+15705550133'),
       now() - interval '26 days', null
 where exists (select 1 from businesses where id = 'sabor-dominicano' and is_demo)
   and not exists (select 1 from reviews where business_id = 'sabor-dominicano' and user_id = (select id from users where phone = '+15705550210') and status <> 'removed');
insert into reviews (business_id, city_id, user_id, src, stars, body, lang, answers, facts, rec, reply, reply_at, reply_by, created_at, edited_at)
select 'sabor-dominicano', 'hzl', (select id from users where phone = '+15705550211'), 'dl', 5, 'Pedí para la oficina, seis mofongos. Llegaron calientes, bien empacados y con el caldo aparte para que no se ablandaran.', 'es', '{"taste": 1, "hot": 1, "val": 1}'::jsonb, '{"late": -4}'::jsonb,
       array(select id::text from items where business_id = 'sabor-dominicano' and removed_at is null and name->>'es' = any(array['Mofongo de chicharrón']::text[])),
       'Gracias, Carmen. Para la oficina también hacemos catering.', now() - interval '29 days', (select id from users where phone = '+15705550133'),
       now() - interval '30 days', null
 where exists (select 1 from businesses where id = 'sabor-dominicano' and is_demo)
   and not exists (select 1 from reviews where business_id = 'sabor-dominicano' and user_id = (select id from users where phone = '+15705550211') and status <> 'removed');
insert into reviews (business_id, city_id, user_id, src, stars, body, lang, answers, facts, rec, reply, reply_at, reply_by, created_at, edited_at)
select 'sabor-dominicano', 'hzl', (select id from users where phone = '+15705550212'), 'pk', 5, 'La libra de chicharrón da para tres. Crujiente de verdad.', 'es', '{"taste": 1, "hot": 1, "val": 1}'::jsonb, '{"late": 0}'::jsonb,
       array(select id::text from items where business_id = 'sabor-dominicano' and removed_at is null and name->>'es' = any(array['Chicharrón de cerdo']::text[])),
       null, null, null,
       now() - interval '35 days', null
 where exists (select 1 from businesses where id = 'sabor-dominicano' and is_demo)
   and not exists (select 1 from reviews where business_id = 'sabor-dominicano' and user_id = (select id from users where phone = '+15705550212') and status <> 'removed');
insert into media (id, owner_kind, owner_id, url, credit, sort, uploaded_by)
select md5('semilla:resena:+15705550212:0')::uuid, 'review', r.id::text, 'https://images.pexels.com/photos/8954034/pexels-photo-8954034.jpeg', 'Pexels', 0, r.user_id from reviews r
 where r.business_id = 'sabor-dominicano' and r.user_id = (select id from users where phone = '+15705550212') and r.status <> 'removed'
on conflict (id) do nothing;
insert into reviews (business_id, city_id, user_id, src, stars, body, lang, answers, facts, rec, reply, reply_at, reply_by, created_at, edited_at)
select 'sabor-dominicano', 'hzl', (select id from users where phone = '+15705550213'), 'vis', 4, 'Rica la bandera. Un poco cara desde que subieron el precio, pero la porción es grande.', 'es', '{"taste": 1, "val": 0}'::jsonb, '{}'::jsonb,
       array(select id::text from items where business_id = 'sabor-dominicano' and removed_at is null and name->>'es' = any(array['La bandera']::text[])),
       null, null, null,
       now() - interval '40 days', null
 where exists (select 1 from businesses where id = 'sabor-dominicano' and is_demo)
   and not exists (select 1 from reviews where business_id = 'sabor-dominicano' and user_id = (select id from users where phone = '+15705550213') and status <> 'removed');
insert into reviews (business_id, city_id, user_id, src, stars, body, lang, answers, facts, rec, reply, reply_at, reply_by, created_at, edited_at)
select 'sabor-dominicano', 'hzl', (select id from users where phone = '+15705550214'), 'dl', 5, 'Pido casi todas las semanas. Nunca me ha llegado frío y el jugo de chinola es natural de verdad.', 'es', '{"taste": 1, "hot": 1, "val": 1}'::jsonb, '{"late": 1}'::jsonb,
       array(select id::text from items where business_id = 'sabor-dominicano' and removed_at is null and name->>'es' = any(array['Jugo de chinola']::text[])),
       'Freddy, gracias por ser de la casa.', now() - interval '44 days', (select id from users where phone = '+15705550133'),
       now() - interval '45 days', null
 where exists (select 1 from businesses where id = 'sabor-dominicano' and is_demo)
   and not exists (select 1 from reviews where business_id = 'sabor-dominicano' and user_id = (select id from users where phone = '+15705550214') and status <> 'removed');
insert into media (id, owner_kind, owner_id, url, credit, sort, uploaded_by)
select md5('semilla:resena:+15705550214:0')::uuid, 'review', r.id::text, 'https://images.pexels.com/photos/33709196/pexels-photo-33709196.jpeg', 'Pexels', 0, r.user_id from reviews r
 where r.business_id = 'sabor-dominicano' and r.user_id = (select id from users where phone = '+15705550214') and r.status <> 'removed'
on conflict (id) do nothing;
insert into review_helpful (review_id, user_id)
select r.id, (select id from users where phone = '+15705550205') from reviews r
 where r.business_id = 'sabor-dominicano' and r.user_id = (select id from users where phone = '+15705550201') and r.status <> 'removed'
on conflict do nothing;
insert into review_helpful (review_id, user_id)
select r.id, (select id from users where phone = '+15705550209') from reviews r
 where r.business_id = 'sabor-dominicano' and r.user_id = (select id from users where phone = '+15705550201') and r.status <> 'removed'
on conflict do nothing;
insert into review_helpful (review_id, user_id)
select r.id, (select id from users where phone = '+15705550213') from reviews r
 where r.business_id = 'sabor-dominicano' and r.user_id = (select id from users where phone = '+15705550201') and r.status <> 'removed'
on conflict do nothing;
insert into review_helpful (review_id, user_id)
select r.id, (select id from users where phone = '+15705550204') from reviews r
 where r.business_id = 'sabor-dominicano' and r.user_id = (select id from users where phone = '+15705550202') and r.status <> 'removed'
on conflict do nothing;
insert into review_helpful (review_id, user_id)
select r.id, (select id from users where phone = '+15705550208') from reviews r
 where r.business_id = 'sabor-dominicano' and r.user_id = (select id from users where phone = '+15705550202') and r.status <> 'removed'
on conflict do nothing;
insert into review_helpful (review_id, user_id)
select r.id, (select id from users where phone = '+15705550212') from reviews r
 where r.business_id = 'sabor-dominicano' and r.user_id = (select id from users where phone = '+15705550202') and r.status <> 'removed'
on conflict do nothing;
insert into review_helpful (review_id, user_id)
select r.id, (select id from users where phone = '+15705550207') from reviews r
 where r.business_id = 'sabor-dominicano' and r.user_id = (select id from users where phone = '+15705550203') and r.status <> 'removed'
on conflict do nothing;
insert into review_helpful (review_id, user_id)
select r.id, (select id from users where phone = '+15705550211') from reviews r
 where r.business_id = 'sabor-dominicano' and r.user_id = (select id from users where phone = '+15705550203') and r.status <> 'removed'
on conflict do nothing;
insert into review_helpful (review_id, user_id)
select r.id, (select id from users where phone = '+15705550202') from reviews r
 where r.business_id = 'sabor-dominicano' and r.user_id = (select id from users where phone = '+15705550204') and r.status <> 'removed'
on conflict do nothing;
insert into review_helpful (review_id, user_id)
select r.id, (select id from users where phone = '+15705550206') from reviews r
 where r.business_id = 'sabor-dominicano' and r.user_id = (select id from users where phone = '+15705550204') and r.status <> 'removed'
on conflict do nothing;
insert into review_helpful (review_id, user_id)
select r.id, (select id from users where phone = '+15705550210') from reviews r
 where r.business_id = 'sabor-dominicano' and r.user_id = (select id from users where phone = '+15705550204') and r.status <> 'removed'
on conflict do nothing;
insert into review_helpful (review_id, user_id)
select r.id, (select id from users where phone = '+15705550214') from reviews r
 where r.business_id = 'sabor-dominicano' and r.user_id = (select id from users where phone = '+15705550204') and r.status <> 'removed'
on conflict do nothing;
insert into review_helpful (review_id, user_id)
select r.id, (select id from users where phone = '+15705550201') from reviews r
 where r.business_id = 'sabor-dominicano' and r.user_id = (select id from users where phone = '+15705550205') and r.status <> 'removed'
on conflict do nothing;
insert into review_helpful (review_id, user_id)
select r.id, (select id from users where phone = '+15705550209') from reviews r
 where r.business_id = 'sabor-dominicano' and r.user_id = (select id from users where phone = '+15705550205') and r.status <> 'removed'
on conflict do nothing;
insert into review_helpful (review_id, user_id)
select r.id, (select id from users where phone = '+15705550213') from reviews r
 where r.business_id = 'sabor-dominicano' and r.user_id = (select id from users where phone = '+15705550205') and r.status <> 'removed'
on conflict do nothing;
insert into review_helpful (review_id, user_id)
select r.id, (select id from users where phone = '+15705550204') from reviews r
 where r.business_id = 'sabor-dominicano' and r.user_id = (select id from users where phone = '+15705550206') and r.status <> 'removed'
on conflict do nothing;
insert into review_helpful (review_id, user_id)
select r.id, (select id from users where phone = '+15705550208') from reviews r
 where r.business_id = 'sabor-dominicano' and r.user_id = (select id from users where phone = '+15705550206') and r.status <> 'removed'
on conflict do nothing;
insert into review_helpful (review_id, user_id)
select r.id, (select id from users where phone = '+15705550212') from reviews r
 where r.business_id = 'sabor-dominicano' and r.user_id = (select id from users where phone = '+15705550206') and r.status <> 'removed'
on conflict do nothing;
insert into review_helpful (review_id, user_id)
select r.id, (select id from users where phone = '+15705550203') from reviews r
 where r.business_id = 'sabor-dominicano' and r.user_id = (select id from users where phone = '+15705550207') and r.status <> 'removed'
on conflict do nothing;
insert into review_helpful (review_id, user_id)
select r.id, (select id from users where phone = '+15705550211') from reviews r
 where r.business_id = 'sabor-dominicano' and r.user_id = (select id from users where phone = '+15705550207') and r.status <> 'removed'
on conflict do nothing;
insert into review_helpful (review_id, user_id)
select r.id, (select id from users where phone = '+15705550202') from reviews r
 where r.business_id = 'sabor-dominicano' and r.user_id = (select id from users where phone = '+15705550208') and r.status <> 'removed'
on conflict do nothing;
insert into review_helpful (review_id, user_id)
select r.id, (select id from users where phone = '+15705550206') from reviews r
 where r.business_id = 'sabor-dominicano' and r.user_id = (select id from users where phone = '+15705550208') and r.status <> 'removed'
on conflict do nothing;
insert into review_helpful (review_id, user_id)
select r.id, (select id from users where phone = '+15705550210') from reviews r
 where r.business_id = 'sabor-dominicano' and r.user_id = (select id from users where phone = '+15705550208') and r.status <> 'removed'
on conflict do nothing;
insert into review_helpful (review_id, user_id)
select r.id, (select id from users where phone = '+15705550214') from reviews r
 where r.business_id = 'sabor-dominicano' and r.user_id = (select id from users where phone = '+15705550208') and r.status <> 'removed'
on conflict do nothing;
insert into review_helpful (review_id, user_id)
select r.id, (select id from users where phone = '+15705550201') from reviews r
 where r.business_id = 'sabor-dominicano' and r.user_id = (select id from users where phone = '+15705550209') and r.status <> 'removed'
on conflict do nothing;
insert into review_helpful (review_id, user_id)
select r.id, (select id from users where phone = '+15705550205') from reviews r
 where r.business_id = 'sabor-dominicano' and r.user_id = (select id from users where phone = '+15705550209') and r.status <> 'removed'
on conflict do nothing;
insert into review_helpful (review_id, user_id)
select r.id, (select id from users where phone = '+15705550213') from reviews r
 where r.business_id = 'sabor-dominicano' and r.user_id = (select id from users where phone = '+15705550209') and r.status <> 'removed'
on conflict do nothing;
insert into review_helpful (review_id, user_id)
select r.id, (select id from users where phone = '+15705550204') from reviews r
 where r.business_id = 'sabor-dominicano' and r.user_id = (select id from users where phone = '+15705550210') and r.status <> 'removed'
on conflict do nothing;
insert into review_helpful (review_id, user_id)
select r.id, (select id from users where phone = '+15705550208') from reviews r
 where r.business_id = 'sabor-dominicano' and r.user_id = (select id from users where phone = '+15705550210') and r.status <> 'removed'
on conflict do nothing;
insert into review_helpful (review_id, user_id)
select r.id, (select id from users where phone = '+15705550212') from reviews r
 where r.business_id = 'sabor-dominicano' and r.user_id = (select id from users where phone = '+15705550210') and r.status <> 'removed'
on conflict do nothing;
insert into review_helpful (review_id, user_id)
select r.id, (select id from users where phone = '+15705550203') from reviews r
 where r.business_id = 'sabor-dominicano' and r.user_id = (select id from users where phone = '+15705550211') and r.status <> 'removed'
on conflict do nothing;
insert into review_helpful (review_id, user_id)
select r.id, (select id from users where phone = '+15705550207') from reviews r
 where r.business_id = 'sabor-dominicano' and r.user_id = (select id from users where phone = '+15705550211') and r.status <> 'removed'
on conflict do nothing;
insert into review_helpful (review_id, user_id)
select r.id, (select id from users where phone = '+15705550202') from reviews r
 where r.business_id = 'sabor-dominicano' and r.user_id = (select id from users where phone = '+15705550212') and r.status <> 'removed'
on conflict do nothing;
insert into review_helpful (review_id, user_id)
select r.id, (select id from users where phone = '+15705550206') from reviews r
 where r.business_id = 'sabor-dominicano' and r.user_id = (select id from users where phone = '+15705550212') and r.status <> 'removed'
on conflict do nothing;
insert into review_helpful (review_id, user_id)
select r.id, (select id from users where phone = '+15705550210') from reviews r
 where r.business_id = 'sabor-dominicano' and r.user_id = (select id from users where phone = '+15705550212') and r.status <> 'removed'
on conflict do nothing;
insert into review_helpful (review_id, user_id)
select r.id, (select id from users where phone = '+15705550214') from reviews r
 where r.business_id = 'sabor-dominicano' and r.user_id = (select id from users where phone = '+15705550212') and r.status <> 'removed'
on conflict do nothing;
insert into review_helpful (review_id, user_id)
select r.id, (select id from users where phone = '+15705550201') from reviews r
 where r.business_id = 'sabor-dominicano' and r.user_id = (select id from users where phone = '+15705550213') and r.status <> 'removed'
on conflict do nothing;
insert into review_helpful (review_id, user_id)
select r.id, (select id from users where phone = '+15705550205') from reviews r
 where r.business_id = 'sabor-dominicano' and r.user_id = (select id from users where phone = '+15705550213') and r.status <> 'removed'
on conflict do nothing;
insert into review_helpful (review_id, user_id)
select r.id, (select id from users where phone = '+15705550209') from reviews r
 where r.business_id = 'sabor-dominicano' and r.user_id = (select id from users where phone = '+15705550213') and r.status <> 'removed'
on conflict do nothing;
insert into review_helpful (review_id, user_id)
select r.id, (select id from users where phone = '+15705550204') from reviews r
 where r.business_id = 'sabor-dominicano' and r.user_id = (select id from users where phone = '+15705550214') and r.status <> 'removed'
on conflict do nothing;
insert into review_helpful (review_id, user_id)
select r.id, (select id from users where phone = '+15705550208') from reviews r
 where r.business_id = 'sabor-dominicano' and r.user_id = (select id from users where phone = '+15705550214') and r.status <> 'removed'
on conflict do nothing;
insert into review_helpful (review_id, user_id)
select r.id, (select id from users where phone = '+15705550212') from reviews r
 where r.business_id = 'sabor-dominicano' and r.user_id = (select id from users where phone = '+15705550214') and r.status <> 'removed'
on conflict do nothing;
update reviews r set helpful_count = (select count(*) from review_helpful h where h.review_id = r.id) where r.business_id = 'sabor-dominicano';
do $$ begin perform reviews_stats(id) from businesses where is_demo; end $$;
commit;
