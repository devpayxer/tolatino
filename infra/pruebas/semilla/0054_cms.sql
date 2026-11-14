-- Semilla de pruebas · 9f · Textos y páginas (fase9-apertura.md §4 9f). SOLO SANDBOX (decisión I; regla 13).
-- Dos anuncios para ver el banner del Inicio y la lista de Anuncios del Super Admin: uno vivo (Allentown: la ciudad aún no abre, así que el Inicio de
-- Hazleton de las capturas aprobadas no cambia) y uno vencido (Hazleton: ya no se ve). Los pone una cuenta del equipo de la semilla. Las cadenas no van
-- aquí: nacen del código (scripts/cms/indexar.mjs). Idempotente: cada anuncio se identifica por su texto en español.
begin;
insert into announcements (city_id, audience, text, from_at, to_at, by_staff_id)
select 'alw', 'todos', '{"es":"Allentown abre pronto. Gracias por la paciencia.","en":"Allentown opens soon. Thank you for your patience."}'::jsonb,
       date_trunc('day', now()) - interval '1 day', date_trunc('day', now()) + interval '30 days', u.id
  from users u where u.phone = '+15705550199'
   and not exists (select 1 from announcements a where a.text->>'es' = 'Allentown abre pronto. Gracias por la paciencia.');
insert into announcements (city_id, audience, text, from_at, to_at, by_staff_id)
select 'hzl', 'todos', '{"es":"Feria del barrio, ya pasó.","en":"Neighborhood fair, already over."}'::jsonb,
       now() - interval '10 days', now() - interval '3 days', u.id
  from users u where u.phone = '+15705550199'
   and not exists (select 1 from announcements a where a.text->>'es' = 'Feria del barrio, ya pasó.');
commit;
