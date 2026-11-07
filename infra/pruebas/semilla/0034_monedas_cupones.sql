-- Semilla de pruebas · 5g · Monedas y cupones de negocios. SOLO SANDBOX (negocios de prueba de Hazleton y los vecinos de prueba de 0032).
-- De docs/diseno/pantallas/datos/com-data.js COUPONS L182–189: los 5 cupones por monedas de los negocios de prueba, ya aprobados por
-- To'Latino con el costo del prototipo (80 · 120 · 150 · 250 · 300), 30 días de validez y un cupo del mes. Las condiciones dicen lo de
-- siempre: uno por persona, en el local, sin valor en dinero.
-- Las 100 monedas de bienvenida de cada vecino de prueba se asientan con el libro (mon_bienvenida: la misma función de la bienvenida),
-- nunca escribiendo el saldo. Idempotente: un cupón que ya existe (mismo negocio y título) no se repite; la bienvenida es una vez.
begin;

insert into coupons (business_id, city_id, title, terms, cost_coins, monthly_stock, valid_days, status, created_by, approved_at)
select b.id, b.city_id, x.title::jsonb, x.terms::jsonb, x.cost, x.stock, 30, 'live',
       (select m.user_id from business_members m where m.business_id = b.id and m.kind = 'owner' and m.status = 'active' limit 1), now()
  from (values
    ('cafe-quisqueya', '{"es":"Café con leche gratis","en":"Free café con leche"}', '{"es":"Uno por persona. En el local, de lunes a viernes. No se cambia por dinero.","en":"One per person. In store, Monday to Friday. Not exchangeable for cash."}', 80, 40),
    ('panaderia-la-espiga', '{"es":"$3 en pan y dulces","en":"$3 off bread and sweets"}', '{"es":"Uno por persona, en compras de $10 o más. No se cambia por dinero.","en":"One per person, on purchases of $10 or more. Not exchangeable for cash."}', 120, 30),
    ('empanadas-dona-tere', '{"es":"3 empanadas gratis","en":"3 free empanadas"}', '{"es":"Uno por persona. De pollo, res o queso. No se cambia por dinero.","en":"One per person. Chicken, beef or cheese. Not exchangeable for cash."}', 150, 25),
    ('barberia-el-primo', '{"es":"$5 en tu corte","en":"$5 off your cut"}', '{"es":"Uno por persona. Con cita o sin cita. No se cambia por dinero.","en":"One per person. With or without an appointment. Not exchangeable for cash."}', 250, 20),
    ('llantera-el-cibao', '{"es":"Rotación de gomas gratis","en":"Free tire rotation"}', '{"es":"Uno por persona. Carros y guaguas. No se cambia por dinero.","en":"One per person. Cars and vans. Not exchangeable for cash."}', 300, 15)
  ) as x (biz, title, terms, cost, stock)
  join businesses b on b.id = x.biz and b.status = 'active'
 where not exists (select 1 from coupons c where c.business_id = b.id and c.title ->> 'es' = x.title::jsonb ->> 'es');

-- 100 monedas de bienvenida a cada vecino de prueba que ya hizo la bienvenida (con el libro; si ya las tiene, no pasa nada).
do $$ declare x record; begin
  for x in select u.id from users u join community_profiles cp on cp.user_id = u.id where u.is_test and cp.welcome_at is not null and cp.adult is true loop
    perform mon_bienvenida(x.id);
  end loop;
end $$;

commit;
