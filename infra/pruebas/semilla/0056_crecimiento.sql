-- Semilla de pruebas · 9h · Crecimiento (fase9-apertura.md §2 0138 y §4 9h). SOLO SANDBOX (decisión I; regla 13): todo is_test.
-- Para ver Super Admin › Crecimiento con datos: dos enlaces de calle y uno de volante con escaneos de las últimas semanas (sin personas), una campaña
-- programada y una enviada (con sus envíos), un destacado que ya terminó y un negocio Free quitado de la rotación (no cambia la vitrina de los Pro ni las
-- capturas aprobadas), un promotor con su código y un negocio traído, y 20 entradas de prueba en la lista de la landing con códigos postales de las cinco
-- ciudades y de fuera. Las cuentas de prueba usan teléfonos 570-555-95xx y 570-555-96xx (las pruebas de punta a punta usan los suyos).
-- La pone la cuenta del equipo de la semilla (Ana, +15705550199). Idempotente: cada fila se identifica por su código, su nombre o su teléfono.
begin;

-- ── Cuentas de prueba: 3 vecinos con «Novedades» encendido (reciben campañas), un promotor y 20 de la lista ──
insert into users (phone, phone_verified_at, first_name, last_name, home_city_id, lang, is_test, notif_prefs) values
  ('+15705559501', now(), 'Nora', 'Novedades', 'hzl', 'es', true, '{"mkt": true, "mkt_push": true}'),
  ('+15705559502', now(), 'Néstor', 'Novedades', 'hzl', 'es', true, '{"mkt": true, "mkt_push": true}'),
  ('+15705559503', now(), 'Nina', 'Novedades', 'hzl', 'en', true, '{"mkt": true, "mkt_push": true}'),
  ('+15705559510', now(), 'Pablo', 'Promotor', 'hzl', 'es', true, '{}')
on conflict (phone) do nothing;
insert into users (phone, phone_verified_at, lang, is_test)
select '+157055596' || lpad(g::text, 2, '0'), now(), case when g % 4 = 0 then 'en' else 'es' end, true from generate_series(1, 20) g
on conflict (phone) do nothing;

-- ── La lista de la landing: 20 entradas (las cinco ciudades y dos de fuera); 4 con negocio ──
with e (n, zip, ciudad, pedida, neg, modo, nombre, dias) as (values
  (1, '18201', 'hzl', null, false, null, null, 20), (2, '18202', 'hzl', null, true, 'casa', 'Bizcochos de Rosa', 19), (3, '18201', 'hzl', null, false, null, null, 18),
  (4, '18222', 'hzl', null, false, null, null, 17), (5, '18101', 'alw', null, false, null, null, 16), (6, '18102', 'alw', null, true, 'local', 'Barbería La Siete', 15),
  (7, '18103', 'alw', null, false, null, null, 14), (8, '18104', 'alw', null, false, null, null, 13), (9, '18701', 'wbr', null, false, null, null, 12),
  (10, '18702', 'wbr', null, true, 'domicilio', 'Trenzas Yari', 11), (11, '18705', 'wbr', null, false, null, null, 10), (12, '18503', 'scr', null, false, null, null, 9),
  (13, '18504', 'scr', null, false, null, null, 8), (14, '18505', 'scr', null, false, null, null, 7), (15, '19601', 'rdg', null, true, 'encargo', 'Pasteles Reading', 6),
  (16, '19602', 'rdg', null, false, null, null, 5), (17, '19604', 'rdg', null, false, null, null, 4), (18, '19605', 'rdg', null, false, null, null, 3),
  (19, '19020', null, 'CP 19020', false, null, null, 2), (20, '10001', null, 'CP 10001', false, null, null, 1))
insert into early_access (user_id, zip, city_id, asked_city, has_business, business_kind, business_name, lang, is_test, created_at)
select u.id, e.zip, e.ciudad, e.pedida, e.neg, e.modo, e.nombre, u.lang, true, now() - make_interval(days => e.dias)
  from e join users u on u.phone = '+157055596' || lpad(e.n::text, 2, '0')
 where not exists (select 1 from early_access x where x.user_id = u.id)
 order by e.dias desc;
insert into city_waitlist (city_id, city_name, user_id, source)
select x.city_id, x.asked_city, x.user_id, 'coming_soon' from early_access x
 where x.is_test and not exists (select 1 from city_waitlist w where w.user_id = x.user_id and w.removed_at is null);

-- ── Enlaces y QR con escaneos (sin personas: código, hora, ciudad, web/app, clase de navegador) ──
insert into short_links (code, label, target, city_id, kind, created_by, created_at, is_test)
select v.code, v.label, v.target, v.city, v.kind, u.id, now() - interval '25 days', true
  from (values ('HZCAPE2', 'Bodega de Alter St', '/acceso', 'hzl', 'calle'), ('HZVQ3TA', 'Volantes en North End', '/publica', 'hzl', 'volante'),
               ('AWCAPE2', 'Iglesia de 7th St', '/acceso', 'alw', 'iglesia')) v (code, label, target, city, kind)
  join users u on u.phone = '+15705550199'
on conflict (code) do nothing;
insert into link_scans (code, at, city_id, app, ua_class)
select l.code, now() - make_interval(days => (g % 21), hours => (g * 7) % 12), l.city_id, case when g % 9 = 0 then 'app' else 'web' end,
       case when g % 5 = 0 then 'escritorio' when g % 13 = 0 then 'otro' else 'telefono' end
  from short_links l, generate_series(1, 40) g
 where l.code in ('HZCAPE2', 'HZVQ3TA', 'AWCAPE2') and not exists (select 1 from link_scans s where s.code = l.code);

-- ── Campañas: una programada (en 3 días, 10 AM de Hazleton) y una enviada hace una semana, con sus envíos ──
insert into campaigns (name, city_id, kind, segment, channel, template_key, title, body, href, scheduled_at, status, audience_n, created_by, is_test)
select 'Reclutar barberías de Hazleton (prueba)', 'hzl', 'reclutamiento', '{"rol": "negocios", "cat": "NEG-BELL"}'::jsonb, 'inapp', 'mkt_campana_app',
       '{"es": "Tu barbería en To''Latino", "en": "Your barbershop on To''Latino"}'::jsonb,
       '{"es": "Arma tu página gratis antes de que abra la ciudad.", "en": "Build your page for free before the city opens."}'::jsonb, '/publica',
       (date_trunc('day', now() at time zone 'America/New_York') + interval '3 days 10 hours') at time zone 'America/New_York', 'programada', 0, u.id, true
  from users u where u.phone = '+15705550199'
   and not exists (select 1 from campaigns where name = 'Reclutar barberías de Hazleton (prueba)');
insert into campaigns (name, city_id, kind, segment, channel, template_key, title, body, href, scheduled_at, status, audience_n, sent_n, started_at, finished_at, created_by, is_test, created_at)
select 'Eventos de la semana (prueba)', 'hzl', 'aviso', '{"rol": "vecinos"}'::jsonb, 'inapp', 'mkt_campana_app',
       '{"es": "Lo de esta semana", "en": "This week"}'::jsonb, '{"es": "Mira los eventos de esta semana en Hazleton.", "en": "See this week''s events in Hazleton."}'::jsonb, '/eventos',
       now() - interval '7 days', 'enviada', 3, 3, now() - interval '7 days', now() - interval '7 days', u.id, true, now() - interval '8 days'
  from users u where u.phone = '+15705550199'
   and not exists (select 1 from campaigns where name = 'Eventos de la semana (prueba)');
insert into campaign_sends (campaign_id, user_id, city_id, channel, template_key, result, at)
select k.id, u.id, 'hzl', 'inapp', 'mkt_campana_app', 'enviado', now() - interval '7 days'
  from campaigns k, users u
 where k.name = 'Eventos de la semana (prueba)' and u.phone in ('+15705559501', '+15705559502', '+15705559503')
on conflict (campaign_id, user_id) do nothing;

-- ── Destacados: uno que ya terminó (un Pro) y un negocio Free quitado de la rotación (no estaba en ella: la vitrina no cambia) ──
insert into featured (city_id, business_id, mode, from_at, to_at, by_staff_id, reason, is_test)
select 'hzl', b.id, 'fijar', now() - interval '12 days', now() - interval '5 days', u.id, 'Negocio nuevo de la campaña (prueba)', true
  from (select b.id from businesses b join business_stats_cache s on s.business_id = b.id where b.city_id = 'hzl' and b.status = 'active' and s.plan = 'pro' order by b.id limit 1) b,
       users u
 where u.phone = '+15705550199' and not exists (select 1 from featured where reason = 'Negocio nuevo de la campaña (prueba)');
insert into featured (city_id, business_id, mode, to_at, by_staff_id, reason, is_test)
select 'hzl', b.id, 'quitar', now() + interval '6 days', u.id, 'Pidió no salir esta semana (prueba)', true
  from (select b.id from businesses b join business_stats_cache s on s.business_id = b.id where b.city_id = 'hzl' and b.status = 'active' and s.plan = 'free' order by b.id limit 1) b,
       users u
 where u.phone = '+15705550199' and not exists (select 1 from featured where reason = 'Pidió no salir esta semana (prueba)')
   and not exists (select 1 from featured f where f.business_id = b.id and f.retired_at is null and f.to_at > now());

-- ── Un promotor con su código y un negocio traído (el primero Free de Hazleton por nombre que no sea suyo) ──
update users set is_promoter = true where phone = '+15705559510';
insert into promo_codes (code, kind, city_id, promoter_user_id, trial_days, created_by, is_test)
select 'PABLO42', 'promotor', 'hzl', p.id, 60, a.id, true from users p, users a where p.phone = '+15705559510' and a.phone = '+15705550199'
on conflict (code) do nothing;
insert into business_referrals (promoter_user_id, code, business_id, city_id, status, at)
select p.id, 'PABLO42', b.id, 'hzl', 'traido', now() - interval '9 days'
  from users p, (select b.id from businesses b join business_stats_cache s on s.business_id = b.id where b.city_id = 'hzl' and b.status = 'active' and s.plan = 'free'
                    and b.owner_user_id is distinct from (select id from users where phone = '+15705559510') order by b.name limit 1) b
 where p.phone = '+15705559510'
on conflict (business_id) do nothing;
commit;
