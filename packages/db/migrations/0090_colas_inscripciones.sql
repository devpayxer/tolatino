-- 0090 · Colas de Educación, Niños y Deporte en el Super Admin (fase4-edu-ninos-deporte.md §4eg):
--   cuidado «Cuidado de niños»: la ayuda «No cuidaron bien a mi niño» (va directo, con prioridad y un SLA corto; ver los datos del niño
--           exige motivo y queda en la auditoría).
--   salir   «No me dejan cancelar»: la ayuda de una membresía que no dejan cancelar, cuando el lugar no la resuelve.
--   grupo   «Grupos que no abrieron»: un lugar que cancela 3 grupos en 90 días (devolvió todo a todos, pero la gente se quedó sin curso).
-- Idempotente: solo amplía el check; nada se borra.
alter table queue_items drop constraint if exists queue_items_queue_check;
alter table queue_items add constraint queue_items_queue_check check (queue = any (array['sello', 'nuevo', 'lic', 'medios', 'rec', 'cambio', 'rep', 'sop', 'chat', 'disputa', 'renta', 'mesa', 'noid',
  'cuidado', 'salir', 'grupo']));
