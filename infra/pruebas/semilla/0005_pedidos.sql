-- SOLO SANDBOX. Pedidos en línea de Sabor Dominicano (Fase 2 · 2b): los módulos que «Publica tu negocio» enciende para
-- Comida (Menú, Pedidos en línea, Eventos) y su forma de pedir: pickup con pago en el local. Repetible.
begin;
update businesses set modules_on = array['menu', 'pedidos', 'eventos']
 where id = 'sabor-dominicano' and is_demo and cardinality(modules_on) = 0;
insert into delivery_settings (business_id, pickup, delivery, prep_min, scheduled_orders, auto_accept, pay_cash_pickup, pickup_note)
select id, true, false, 20, true, false, true, '{"es":"Pide en la caja con tu número de pedido.","en":"Ask at the register with your order number."}'::jsonb
  from businesses where id = 'sabor-dominicano' and is_demo
on conflict (business_id) do nothing;
commit;
