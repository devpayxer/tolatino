-- 4ne · Colas de Noche en el Super Admin (fase4-noche.md §4ne, §6 #2):
--   mesa  «Mesas no respetadas»: el local canceló una mesa ya confirmada o el cliente pidió ayuda porque no le respetaron la
--         mesa o la lista; 3 en 30 noches abren un caso (uno por local).
--   noid  «Sin identificación»: el local marcó «No entró: sin identificación» en una mesa con depósito (el depósito se queda);
--         3 en 30 noches abren un caso para que nadie lo use para quedarse depósitos.
-- Idempotente: solo amplía los checks; nada se borra.
alter table queue_items drop constraint if exists queue_items_queue_check;
alter table queue_items add constraint queue_items_queue_check check (queue = any (array['sello', 'nuevo', 'lic', 'medios', 'rec', 'cambio', 'rep', 'sop', 'chat', 'disputa', 'renta', 'mesa', 'noid']));

-- El conteo usa operations_noche_idx (business_id, night_date, status) de la 0082.
