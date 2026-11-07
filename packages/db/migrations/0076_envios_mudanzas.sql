-- 0076 · Envío de cajas y mudanza con precio cerrado (Fase 4 · 4y-2 · fase4-fiestas-transporte.md §4y).
-- Un envío de caja y una mudanza son viajes (`trip`, V-…): la caja retiene el total al pedir y se cobra al confirmar, con el
-- DESTINATARIO cifrado en op_private (nunca en operations, avisos ni vistas públicas); la mudanza se pide con fotos (media
-- 'trip', privadas como las del pre-estimado), el negocio manda el precio cerrado (written_totals, vale 48 h) y al aceptarlo se
-- retiene y se cobra. La ayuda de Fiestas y Transporte (antes 0076 en el plan) pasa a 0077.
begin;

alter table media drop constraint if exists media_owner_kind_check;
alter table media add constraint media_owner_kind_check check (owner_kind = any (array['business', 'logo', 'item', 'member', 'review', 'post', 'event', 'user', 'help', 'support', 'claim', 'appointment', 'estimate_line', 'request', 'line', 'trip']));

-- El destinatario de la caja va cifrado en op_private con su propio motivo.
alter table op_private drop constraint if exists op_private_reason_check;
alter table op_private add constraint op_private_reason_check
  check (reason = any (array['nuevo', 'seguimiento', 'receta', 'papeles', 'chequeo', 'primera', 'caso', 'carta', 'fecha', 'destinatario']));

insert into notif_templates (key, grp, pref, sms, title, body) values
  ('biz_envio', 'biz', null, true, '{"es":"Nuevo envío","en":"New shipment"}', '{"es":"{cliente} pidió {servicio}: recogida el {dia} a las {hora}. Confirma en la app.","en":"{cliente} requested {servicio}: pickup on {dia} at {hora}. Confirm in the app."}'),
  ('biz_mudanza', 'biz', null, true, '{"es":"Piden precio cerrado","en":"Fixed price requested"}', '{"es":"{cliente} pide precio cerrado para {servicio} el {dia} a las {hora}. Mira las fotos y manda el precio.","en":"{cliente} asks for a fixed price for {servicio} on {dia} at {hora}. See the photos and send the price."}'),
  ('viaje_precio', 'tx', 'cit', true, '{"es":"Tu precio cerrado","en":"Your fixed price"}', '{"es":"{negocio} te mandó el precio cerrado: {total}. Vale 48 horas. Acéptalo en la app.","en":"{negocio} sent your fixed price: {total}. Valid for 48 hours. Accept it in the app."}'),
  ('caja_recogida', 'tx', 'cit', false, '{"es":"Recogimos tu caja","en":"Your box was picked up"}', '{"es":"{negocio} recogió tu envío.","en":"{negocio} picked up your shipment."}'),
  ('caja_salio', 'tx', 'cit', true, '{"es":"Tu caja salió","en":"Your box shipped"}', '{"es":"Tu envío salió del almacén de {negocio}. Rastreo: {rastreo}.","en":"Your shipment left {negocio}''s warehouse. Tracking: {rastreo}."}'),
  ('caja_entregada', 'tx', 'cit', true, '{"es":"Tu caja llegó","en":"Your box arrived"}', '{"es":"{negocio} marcó tu envío como entregado.","en":"{negocio} marked your shipment as delivered."}'),
  ('biz_precio_ok', 'biz', null, true, '{"es":"Aceptaron tu precio","en":"Price accepted"}', '{"es":"{cliente} aceptó el precio cerrado de {total} para el {dia} a las {hora}. Ya se cobró.","en":"{cliente} accepted the {total} fixed price for {dia} at {hora}. It was charged."}'),
  ('biz_precio_no', 'biz', null, false, '{"es":"No aceptaron el precio","en":"Price declined"}', '{"es":"{cliente} no aceptó el precio cerrado del {dia}.","en":"{cliente} declined the fixed price for {dia}."}')
on conflict (key) do nothing;

commit;
