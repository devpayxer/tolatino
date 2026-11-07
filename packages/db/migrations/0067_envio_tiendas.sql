-- 0067 · Envío de la tienda (Fase 4 · bloque 4q-2). Plan: docs/diseno/plan/fase4-mercados-tiendas.md §4q y Preguntas #10.
-- Un apartado con envío (operations.mode 'delivery', details.ship) se paga con tarjeta: se retiene al enviarlo (el cliente está
-- en la app), se cobra lo que de verdad se envía al marcar «Enviado» (nunca más de lo retenido) y se libera si no pasa.
-- La tienda pega el enlace de seguimiento (details.tracking) y marca «Entregado». Sin columnas nuevas: stage 'on_the_way' /
-- 'delivered' y delivery_cents ya existen. (El layaway pasa a 0068 y la ayuda de Mercados+Tiendas a 0069.)
begin;
insert into notif_templates (key, grp, pref, sms, title, body) values
  ('apt_prepara', 'tx', null, true, '{"es":"Lo tienen","en":"They have it"}', '{"es":"{negocio} tiene tu pedido y lo envía en {dias} días. Se cobra al enviarlo.","en":"{negocio} has your order and ships it within {dias} days. You are charged when it ships."}'),
  ('apt_enviado', 'tx', null, true, '{"es":"Va en camino","en":"On its way"}', '{"es":"{negocio} envió tu pedido. Se cobraron {monto}.","en":"{negocio} shipped your order. {monto} was charged."}'),
  ('apt_entregado', 'tx', null, false, '{"es":"Entregado","en":"Delivered"}', '{"es":"{negocio} marcó tu pedido como entregado.","en":"{negocio} marked your order as delivered."}')
on conflict (key) do nothing;
commit;
