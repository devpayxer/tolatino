-- SOLO SANDBOX. Reservaciones de Sabor Dominicano (Fase 2 · 2e), como el prototipo (neg-rsv.js · CFG): Salón y Terraza,
-- almuerzo 12:00–3:30 y cena 5:30–8:30, responde en ~10 min, guardan la mesa 15 min, cancelar gratis hasta 2 h antes. Repetible.
begin;
update businesses set modules_on = array(select distinct x from unnest(modules_on || array['rsv']) x)
 where id = 'sabor-dominicano' and is_demo and not ('rsv' = any(modules_on));
insert into reservation_settings (business_id) select id from businesses where id = 'sabor-dominicano' and is_demo
on conflict (business_id) do nothing;
commit;
