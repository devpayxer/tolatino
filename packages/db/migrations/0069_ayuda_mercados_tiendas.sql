-- 0069 · Ayuda con el pedido del mercado y con la compra de la tienda (Fase 4 · bloque 4s). Plan: fase4-mercados-tiendas.md §4s.
-- La misma solicitud (help_requests, una por operación) que las citas (lib/ayuda-cita.ts), ahora también para pedidos del
-- mercado (M-…) y apartados (A-…). Motivos nuevos: Mercados peso · falto · fresco · sust · caja (+ tarde · otro);
-- Tiendas caja · apa · talla · cambio (+ dano · otro). «falto» no es «falta» de Comida para no mezclar etiquetas.
begin;
alter table help_requests drop constraint help_requests_reason_check;
alter table help_requests add constraint help_requests_reason_check check (reason = any (array[
  'falta', 'equivocado', 'frio', 'danado', 'tarde', 'nollego', 'pago', 'otro',
  'cobro', 'quien', 'quedo', 'espera', 'dep', 'win', 'more', 'bad', 'dmg', 'who', 'igual', 'dano', 'piezas',
  'seguro', 'noseg', 'interp', 'trato', 'ley', 'nohizo', 'fecha', 'contesta',
  'peso', 'falto', 'fresco', 'sust', 'caja', 'apa', 'talla', 'cambio']));
commit;
