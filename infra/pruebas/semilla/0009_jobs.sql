-- SOLO SANDBOX. Jobs (Fase 2 · 2g-3), las vacantes del prototipo (datos/neg-jobs.js · dash2-job.js) de los negocios Pro
-- de ejemplo: Sabor Dominicano (ayudante de cocina, chofer de delivery) y El Fogón (mesero). Pizza Express es Free: su
-- vacante no se siembra (Jobs es de Pro). Solicitudes de los vecinos de ejemplo (555-02xx) en varios estados, para revisar
-- el panel, Hoy y el estado del cliente. Enciende el módulo Jobs. Repetible.
begin;
update businesses set modules_on = array(select distinct x from unnest(modules_on || array['jobs']) x)
 where id in ('sabor-dominicano', 'el-fogon') and is_demo and not ('jobs' = any(modules_on));

insert into job_postings (business_id, city_id, title, kind, pay_from_cents, pay_to_cents, tips, days, start_min, end_min, openings, lang_es, lang_en, descr, requirements, benefits, status, published_at, created_at)
select 'sabor-dominicano', 'hzl', '{"es": "Ayudante de cocina", "en": "Kitchen helper"}', 'ft', 1500, 1700, false, '{1,2,3,4,5,6}', 660, 1140, 1, 'need', 'plus',
       '{"es": "Preparación, limpieza y apoyo en la línea con Rosa y Juan Carlos. Si sabes de cocina dominicana, mejor; si no, te enseñamos.", "en": "Prep, cleaning and line support with Rosa and Juan Carlos. Dominican cooking experience is a plus; if not, we teach you."}',
       '[["Mayor de 18 años", "18 or older"], ["Poder estar de pie todo el turno", "Able to stand the whole shift"]]',
       '[["Comida del turno gratis", "Free shift meal"], ["Pago cada semana", "Paid weekly"], ["Aumento a los 90 días", "Raise after 90 days"]]',
       'live', now() - interval '3 days', now() - interval '3 days'
 where exists (select 1 from businesses where id = 'sabor-dominicano' and is_demo)
   and not exists (select 1 from job_postings where business_id = 'sabor-dominicano' and title->>'es' = 'Ayudante de cocina');
insert into job_postings (business_id, city_id, title, kind, pay_from_cents, pay_to_cents, tips, days, start_min, end_min, openings, lang_es, lang_en, descr, requirements, benefits, status, published_at, created_at)
select 'sabor-dominicano', 'hzl', '{"es": "Chofer de delivery", "en": "Delivery driver"}', 'pt', 1300, null, true, '{3,4,5,6}', 1020, 1260, 2, 'need', 'need',
       '{"es": "Llevas los pedidos por Hazleton. Te damos la bolsa térmica y la gasolina se paga por milla.", "en": "You deliver orders around Hazleton. We give you the thermal bag and gas is paid per mile."}',
       '[["Carro propio", "Own car"], ["Licencia de Pensilvania", "Pennsylvania license"], ["Seguro del carro al día", "Current car insurance"]]',
       '[["Propinas completas para ti", "You keep all tips"], ["Millaje pagado", "Mileage paid"], ["Comida del turno gratis", "Free shift meal"]]',
       'live', now() - interval '6 days', now() - interval '6 days'
 where exists (select 1 from businesses where id = 'sabor-dominicano' and is_demo)
   and not exists (select 1 from job_postings where business_id = 'sabor-dominicano' and title->>'es' = 'Chofer de delivery');
insert into job_postings (business_id, city_id, title, kind, pay_from_cents, pay_to_cents, tips, days, start_min, end_min, openings, lang_es, lang_en, descr, requirements, benefits, status, published_at, created_at)
select 'el-fogon', 'hzl', '{"es": "Mesero o mesera", "en": "Server"}', 'pt', 1000, null, true, '{3,4,5,6}', 1080, 1440, 1, 'need', 'need',
       '{"es": "Atiendes el salón y la terraza los fines de semana. Noches movidas con la Serie del Caribe.", "en": "You serve the dining room and patio on weekends. Busy nights during the Caribbean Series."}',
       '[["Mayor de 18 años", "18 or older"]]', '[["Propinas", "Tips"], ["Comida del turno gratis", "Free shift meal"]]',
       'live', now() - interval '2 days', now() - interval '2 days'
 where exists (select 1 from businesses where id = 'el-fogon' and is_demo)
   and not exists (select 1 from job_postings where business_id = 'el-fogon' and title->>'es' = 'Mesero o mesera');

-- Solicitudes de vecinos de ejemplo: dos nuevas y una vista (cocina), una «le vas a llamar» (delivery).
insert into job_applications (number, job_id, business_id, city_id, user_id, name, phone, experience, days, languages, note, status, seen_at, answered_at, created_at, updated_at)
select 'J-' || nextval('job_app_number_seq'), j.id, j.business_id, j.city_id, u.id, v.name, u.phone, v.exp, v.days::smallint[], v.langs::text[], v.note, v.st,
       case when v.st <> 'sent' then now() - (v.h || ' hours')::interval + interval '3 hours' end,
       case when v.st not in ('sent', 'seen') then now() - (v.h || ' hours')::interval + interval '5 hours' end,
       now() - (v.h || ' hours')::interval, now() - (v.h || ' hours')::interval
  from (values
    ('Ayudante de cocina', '+15705550204', 'Luis Reyes', 1, '{1,2,3,4,5,6}', '{es}', 'Trabajé en la cocina de un restaurante en Santiago. Puedo empezar ya.', 'sent', 5),
    ('Ayudante de cocina', '+15705550207', 'Kathy Peña', 0, '{1,2,3,4}', '{es,en}', null, 'sent', 20),
    ('Ayudante de cocina', '+15705550210', 'Héctor Batista', 3, '{2,3,4,5,6}', '{es}', 'Dos años de preparador en Allentown.', 'seen', 40),
    ('Chofer de delivery', '+15705550208', 'Wilfredo Cabrera', 3, '{3,4,5,6}', '{es,en}', 'Tengo carro y conozco Hazleton.', 'contact', 60)
  ) as v(job, tel, name, exp, days, langs, note, st, h)
  join job_postings j on j.business_id = 'sabor-dominicano' and j.title->>'es' = v.job and j.status <> 'removed'
  join users u on u.phone = v.tel
 where exists (select 1 from businesses where id = 'sabor-dominicano' and is_demo)
   and not exists (select 1 from job_applications a where a.job_id = j.id and a.user_id = u.id);
commit;
