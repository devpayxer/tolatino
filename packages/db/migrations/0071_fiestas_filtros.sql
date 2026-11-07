-- 0071 · Fiestas: los filtros de fecha del catálogo pasan a las claves derivadas (4t). El prototipo traía d:2 / d:3 / d:9
-- (días desde su jueves de demo) y «Libre el 3 oct» fijo; ahora salen del calendario real (lib/fiestas.ts) y cambian solos a
-- medianoche: este sábado, este domingo y el sábado siguiente. (Las reservas de fiesta pasan a 0072 y lo demás corre uno.)
begin;
update filter_options set key = 'd:sab', label = '{"es":"Libre este sábado","en":"Free this Saturday"}'::jsonb where category_id = 'NEG-FIESTA' and key = 'd:2';
update filter_options set key = 'd:dom', label = '{"es":"Libre este domingo","en":"Free this Sunday"}'::jsonb where category_id = 'NEG-FIESTA' and key = 'd:3';
update filter_options set key = 'd:sab2', label = '{"es":"Libre el sábado siguiente","en":"Free the following Saturday"}'::jsonb where category_id = 'NEG-FIESTA' and key = 'd:9';
-- Los negocios de la semilla tenían las claves viejas en filter_values: se quitan (las nuevas las pone el recálculo).
update businesses set filter_values = array(select x from unnest(filter_values) x where x not in ('d:2', 'd:3', 'd:9')) where category_id = 'NEG-FIESTA' and filter_values && array['d:2', 'd:3', 'd:9'];
commit;
