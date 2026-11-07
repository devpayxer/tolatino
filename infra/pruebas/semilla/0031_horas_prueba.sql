-- SOLO SANDBOX (4ie). Horas de prueba de manejo «cualquier carro» de los dealers de prueba (los que venden): lunes a sábado 10 AM, 12 PM
-- y 3 PM, una persona por hora. Autos El Cibao también hace la prueba en tu casa (como Valle Motors en la semilla 0029). El barrido abre
-- las horas 14 días adelante; aquí no se crea ningún grupo a mano. Solo negocios de demostración; nunca corre en producción.
begin;
update dealer_settings s set test_pattern = (
    select jsonb_agg(jsonb_build_object('dow', d, 'min', m, 'on', true) order by d, m) from unnest(array[1, 2, 3, 4, 5, 6]) d, unnest(array[600, 720, 900]) m),
  test_cupo = 1, updated_at = now()
  from businesses b
 where b.id = s.business_id and b.is_demo and b.category_id = 'NEG-DEALER' and jsonb_array_length(s.test_pattern) = 0
   and s.business_id in ('autos-el-cibao', 'valle-motors', 'compre-aqui-hzl', 'clasicos-lujo-valle', 'keystone-trucks', 'comercial-keystone', 'power-sports-hazleton', 'lote-la-81', 'carros-por-dueno-hzl');
update dealer_settings s set home_test = true, updated_at = now() from businesses b where b.id = s.business_id and b.is_demo and s.business_id = 'autos-el-cibao';
commit;
