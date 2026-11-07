-- 0065 · Pedido del mercado (Fase 4 · bloque 4p). Plan: docs/diseno/plan/fase4-mercados-tiendas.md §2 y §3. Diseño: neg-merc-flow.js
-- (APP-NEG-MERC-PEDIDO / -ESTADO). Un pedido del mercado es una operación (M-…, kind 'market_order'):
--   enviado (se retiene el estimado + 10 % de lo que va por peso + envío) → preparando → pesado (peso real con foto de la balanza;
--   lo que no hay: sustituto con el OK del cliente o se quita) → «Está bien, cobrar» (captura parcial de lo real y se libera el
--   resto) → listo / en camino → recogido / entregado. Nunca se cobra más de lo retenido sin un OK.
begin;
-- Lo que se cobra de cada línea lo calcula la base (nunca se edita): peso real × precio por libra; lo que no hubo, $0.
alter table operation_lines add column if not exists weigh_photo_id uuid references media (id);
alter table operation_lines add column if not exists sub_of bigint references operation_lines (id);          -- el sustituto aceptado de una línea
alter table operation_lines add column if not exists final_cents integer generated always as (
  case when status in ('out', 'removed') then 0
       when weight_final is not null then round(unit_price_cents * weight_final)::int
       else line_total_cents end) stored;
-- Una línea pesada lleva su foto (guardián pesoConFoto). Peso razonable: hasta 3 veces lo pedido (y nunca 0).
alter table operation_lines drop constraint if exists operation_lines_peso_foto;
alter table operation_lines add constraint operation_lines_peso_foto check (weight_final is null or (weigh_photo_id is not null and weight_final > 0 and (weight_est is null or weight_final <= weight_est * 3)));

-- Sustitución propuesta (10 min para contestar): change_proposals kind 'items' con la línea que no había.
alter table change_proposals add column if not exists line_id bigint references operation_lines (id);
create sequence if not exists market_seq start 6101;
create index if not exists operations_market_idx on operations (business_id, status, scheduled_at) where kind = 'market_order';

insert into notif_templates (key, grp, pref, sms, title, body) values
  ('biz_merc', 'biz', null, true, '{"es":"Pedido nuevo del mercado","en":"New market order"}', '{"es":"{cliente} pidió {modo} para {cuando}: {n} artículos. Acepta en 10 minutos.","en":"{cliente} ordered {modo} for {cuando}: {n} items. Accept within 10 minutes."}'),
  ('merc_ok', 'tx', null, false, '{"es":"Están armando tu pedido","en":"Your order is being prepared"}', '{"es":"{negocio} aceptó tu pedido {num}. Te mandan la foto de la balanza de lo que va por peso.","en":"{negocio} accepted your order {num}. They send the scale photo for by-weight items."}'),
  ('merc_pesado', 'tx', null, true, '{"es":"Revisa el peso de tu pedido","en":"Check your order weight"}', '{"es":"Así lo pesaron: total real {monto}. Se cobra cuando digas que está bien.","en":"Here is the weight: real total {monto}. It is charged when you say it is OK."}'),
  ('merc_sust', 'tx', null, true, '{"es":"Algo no hay","en":"Something is out"}', '{"es":"{negocio} no tiene {articulo} y propone {sustituto}. Contesta en 10 minutos; si no, se quita y no se cobra.","en":"{negocio} is out of {articulo} and proposes {sustituto}. Answer within 10 minutes; otherwise it is removed and not charged."}'),
  ('merc_listo', 'tx', null, true, '{"es":"Tu pedido está listo","en":"Your order is ready"}', '{"es":"Tu pedido {num} está listo para recoger en {negocio}.","en":"Your order {num} is ready for pickup at {negocio}."}'),
  ('merc_camino', 'tx', null, true, '{"es":"Tu pedido va en camino","en":"Your order is on the way"}', '{"es":"Tu pedido {num} de {negocio} va en camino.","en":"Your order {num} from {negocio} is on the way."}'),
  ('merc_cobrado', 'tx', null, false, '{"es":"Pedido cobrado","en":"Order charged"}', '{"es":"Se cobraron {monto} de tu pedido {num}{libre}.","en":"{monto} was charged for your order {num}{libre}."}'),
  ('merc_no', 'tx', null, true, '{"es":"El mercado no puede hoy","en":"The market cannot today"}', '{"es":"{negocio} no puede con tu pedido {num}. No se cobró nada.","en":"{negocio} cannot take your order {num}. Nothing was charged."}'),
  ('merc_exp', 'tx', null, true, '{"es":"Sin respuesta","en":"No answer"}', '{"es":"{negocio} no aceptó tu pedido {num} en 10 minutos. No se cobró nada.","en":"{negocio} did not accept your order {num} within 10 minutes. Nothing was charged."}'),
  ('biz_merc_ok', 'biz', null, false, '{"es":"El cliente aprobó el peso","en":"The customer approved the weight"}', '{"es":"{cliente} dijo que está bien: se cobraron {monto} del pedido {num}.","en":"{cliente} approved: {monto} was charged for order {num}."}'),
  ('biz_merc_sust', 'biz', null, true, '{"es":"Respuesta a la sustitución","en":"Substitution answer"}', '{"es":"{cliente} {respuesta} el cambio en el pedido {num}.","en":"{cliente} {respuesta} the swap in order {num}."}')
on conflict (key) do nothing;
commit;
