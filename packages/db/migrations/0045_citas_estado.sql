-- 0045 · Estado de la cita y Panel › Citas (Fase 3 · bloque 3c). Solo avisos nuevos (Super Admin › Notificaciones los
-- edita): vencer, otra hora vencida, recordatorios 24 h y 2 h, y los avisos al negocio (cancelación, voy tarde, cambio).
begin;

insert into notif_templates (key, grp, pref, sms, title, body) values
  ('cita_exp', 'tx', 'cit', true, '{"es": "Sin respuesta", "en": "No reply"}', '{"es": "{negocio} no contestó tu solicitud del {dia} a las {hora}.{dev}", "en": "{negocio} did not reply to your request for {dia} at {hora}.{dev}"}'),
  ('cita_alt_fin', 'tx', 'cit', true, '{"es": "Venció la otra hora", "en": "The new time expired"}', '{"es": "Venció la hora que te propuso {negocio}. No hay cita.{dev}", "en": "The time {negocio} proposed expired. No booking.{dev}"}'),
  ('cita_rec', 'tx', 'cit', true, '{"es": "Recordatorio de tu cita", "en": "Booking reminder"}', '{"es": "Tu cita en {negocio} es {cuando} a las {hora}.", "en": "Your booking at {negocio} is {cuando} at {hora}."}'),
  ('biz_cita_cx', 'biz', null, true, '{"es": "Cita cancelada", "en": "Booking cancelled"}', '{"es": "{cliente} canceló {servicio} del {dia} a las {hora}.{dep}", "en": "{cliente} cancelled {servicio} on {dia} at {hora}.{dep}"}'),
  ('biz_cita_tarde', 'biz', null, true, '{"es": "Llega tarde", "en": "Running late"}', '{"es": "{cliente} llega {min} min tarde a su cita de las {hora}.", "en": "{cliente} is {min} min late for the {hora} booking."}'),
  ('biz_cita_chg', 'biz', null, true, '{"es": "Pide cambiar su cita", "en": "Change requested"}', '{"es": "{cliente} pide cambiar su cita a {dia} a las {hora}. Responde en {min} minutos.", "en": "{cliente} asks to move the booking to {dia} at {hora}. Reply within {min} minutes."}'),
  ('cita_chg_no', 'tx', 'cit', true, '{"es": "Tu cita sigue igual", "en": "Your booking stays the same"}', '{"es": "{negocio} no puede cambiar tu cita. Sigue en pie: {dia} a las {hora}.", "en": "{negocio} cannot move your booking. It stays: {dia} at {hora}."}'),
  ('cita_chg_ok', 'tx', 'cit', true, '{"es": "Cambio confirmado", "en": "Change confirmed"}', '{"es": "{negocio} confirmó el cambio: tu cita es el {dia} a las {hora}.", "en": "{negocio} confirmed the change: your booking is on {dia} at {hora}."}'),
  ('biz_cita_alt_ok', 'biz', null, true, '{"es": "Aceptó la otra hora", "en": "New time accepted"}', '{"es": "{cliente} aceptó la hora que le propusiste: {dia} a las {hora}.", "en": "{cliente} accepted the time you proposed: {dia} at {hora}."}')
on conflict (key) do nothing;

-- Reseña verificada de una cita terminada (prototipo: «Calificas a …» al terminar).
alter table reviews drop constraint if exists reviews_src_check;
alter table reviews add constraint reviews_src_check check (src in ('dl', 'pk', 'rsv', 'cita', 'vis'));

-- Propuestas abiertas de otra hora (lado del negocio): el vencimiento se busca por aquí.
create index if not exists change_proposals_negocio_idx on change_proposals (respond_by) where status = 'open' and side = 'business';

commit;
