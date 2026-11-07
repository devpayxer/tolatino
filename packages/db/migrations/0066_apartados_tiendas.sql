-- 0066 · Apartado de Tiendas con tallas y horas (Fase 4 · bloque 4q). Plan: docs/diseno/plan/fase4-mercados-tiendas.md §4q.
-- El motor es el de 4f-3 (apartados.ts): la talla se elige, se reserva (item_variants.stock_left) y vuelve al estante si no
-- pasa; la tienda guarda el apartado las horas de su herramienta (24/48/72; Auto y Hogar siguen en 48). «Falta esa talla» →
-- la tienda ofrece la de al lado al mismo precio y el cliente decide (change_proposals kind 'items' con la línea).
begin;
insert into notif_templates (key, grp, pref, sms, title, body) values
  ('apt_talla', 'tx', null, true, '{"es":"Falta tu talla","en":"Your size is out"}', '{"es":"{negocio} no tiene {articulo} en talla {talla}: te ofrecen la {otra} al mismo precio. Decide en la app.","en":"{negocio} does not have {articulo} in size {talla}: they offer {otra} at the same price. Decide in the app."}')
on conflict (key) do nothing;
commit;
