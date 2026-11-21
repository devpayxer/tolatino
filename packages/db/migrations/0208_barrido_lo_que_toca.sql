-- 0208 · Dinero, novena tanda (9t9, 21 nov): nada queda fuera por un tope.
-- Idempotente. Solo índices: nada se borra ni cambia de datos.
--
-- El barrido central de los planes del Hogar (lib/planes.ts › barrerPlanes) tomaba 50 planes vivos cualesquiera, sin orden ni filtro: con más de 50, los
-- que quedaban fuera de esa tajada no se cobraban ni recibían su visita nunca (CI 44940985674 lo destapó). Ahora elige solo lo que TOCA hoy en la ciudad de
-- cada plan, por ramas (unión), lo más atrasado primero y por tandas. Cada rama tiene su índice parcial:
--   · la pausa que terminó          → plan_subs_pausa_idx (paused_until) where status = 'paused'
--   · la visita que pasó            → plan_subs_visita_idx (next_visit_on) where status = 'active'
--   · el cobro del período          → plan_subs_cobro_idx (ya existía, 0053)
--   · la intención en camino        → offsession_charges_una_en_camino (ya existía, 0202)
--   · el plan que cambió en el día  → plan_subs_cambio_idx (updated_at) where status = 'active'  (saltar la próxima deja la visita siguiente al barrido)
-- y la comprobación de que la visita de la próxima existe busca las citas del plan por su número: operations_visita_plan_idx (antes, sin índice, también
-- en crearVisita y en la ficha del plan).
begin;

create index if not exists plan_subs_pausa_idx on plan_subscriptions (paused_until) where status = 'paused';
create index if not exists plan_subs_visita_idx on plan_subscriptions (next_visit_on) where status = 'active';
create index if not exists plan_subs_cambio_idx on plan_subscriptions (updated_at) where status = 'active';
create index if not exists operations_visita_plan_idx on operations ((details->>'plan')) where kind = 'appointment' and (details->>'plan') is not null;

commit;
