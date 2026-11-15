-- 0157 · Fase 9 · 9n-7 — «Invitar a reclamar» desde el Negocio 360° (LAUNCH «Acciones del 360°» y «Admin Negocios › … Invitar a reclamar (SMS)»).
-- El equipo manda UN SMS al teléfono de un negocio sin dueño (la semilla) con el enlace a /recuperar/{id}: reclamarla es gratis. Sale por el camino
-- de los SMS a un teléfono sin cuenta (avisarTelefono: STOP, horas de silencio, modo pruebas en el sandbox). Una vez cada 30 días por negocio (lo
-- cuenta la acción con la auditoría). Idempotente.
begin;
insert into notif_templates (key, grp, pref, sms, sms_mode, push, title, body) values
  ('reclamar_invita', 'tx', null, true, 'sin_push', false, '{"es":"Tu negocio está en To''Latino","en":"Your business is on To''Latino"}',
   '{"es":"Hola, {negocio} ya sale en To''Latino. Reclamar tu página es gratis y la manejas tú: {enlace} Para no recibir más, responde STOP.","en":"Hi, {negocio} is already on To''Latino. Claiming your page is free and you run it: {enlace} To stop these texts, reply STOP."}')
on conflict (key) do nothing;
commit;
