-- Fase 4 · 4j · El Booking y la cita de Doctores (fase4-salud-pro.md §3 y §4j).
-- op_private: lo sensible de una cita de Salud (y de Pro en 4l), fuera de operations: el motivo (solo la clave del chip) y
-- la nota libre CIFRADA en la aplicación (AES-256-GCM, llave en los secretos del entorno). Nunca entra a avisos, correos,
-- logs, búsqueda, analítica ni El Compa. La nota se borra a los 30 días de que la cita termina (purge_at).
create table op_private (
  operation_id bigint primary key references operations(id),
  reason text check (reason in ('nuevo', 'seguimiento', 'receta', 'papeles', 'chequeo')),
  note_enc bytea check (note_enc is null or octet_length(note_enc) between 29 and 1400),
  interp boolean not null default false,
  purge_at timestamptz,
  created_at timestamptz not null default now()
);
create index op_private_purge_idx on op_private (purge_at) where note_enc is not null and purge_at is not null;

-- Avisos de Salud: NEUTROS (sin el nombre del consultorio ni del servicio: en la pantalla bloqueada ya diría demasiado).
-- Dentro de la app, con sesión, se ve todo.
insert into notif_templates (key, grp, pref, sms, title, body) values
  ('sal_cita_ok', 'tx', 'cit', true, '{"es":"Cita confirmada","en":"Visit confirmed"}', '{"es":"Tu cita del {dia} a las {hora} está confirmada. Detalles en la app.","en":"Your visit on {dia} at {hora} is confirmed. Details in the app."}'),
  ('sal_cita_seg', 'tx', 'cit', true, '{"es":"Revisa tu cita","en":"Check your visit"}', '{"es":"Tu consultorio no acepta tu seguro. Tu hora sigue guardada 2 horas: elige en la app qué hacer.","en":"Your clinic does not take your insurance. Your time is held 2 hours: choose what to do in the app."}'),
  ('sal_cita_seg_fin', 'tx', 'cit', true, '{"es":"Se liberó tu hora","en":"Your time was released"}', '{"es":"No elegiste a tiempo y se liberó la hora de tu cita del {dia}. Puedes pedir otra en la app.","en":"You did not choose in time and your {dia} visit time was released. You can request another in the app."}'),
  ('sal_cita_alt', 'tx', 'cit', true, '{"es":"Te proponen otra hora","en":"Another time proposed"}', '{"es":"Te proponen otra hora para tu cita. Tienes 2 h para aceptar en la app.","en":"Another time was proposed for your visit. You have 2 h to accept in the app."}'),
  ('sal_cita_no', 'tx', 'cit', true, '{"es":"Cita no confirmada","en":"Visit not confirmed"}', '{"es":"Tu cita del {dia} a las {hora} no se pudo confirmar. Detalles en la app.","en":"Your visit on {dia} at {hora} could not be confirmed. Details in the app."}'),
  ('sal_cita_exp', 'tx', 'cit', true, '{"es":"Sin respuesta","en":"No reply"}', '{"es":"Tu solicitud de cita del {dia} a las {hora} no tuvo respuesta. Puedes pedir otra en la app.","en":"Your visit request for {dia} at {hora} got no reply. You can request another in the app."}'),
  ('sal_cita_rec', 'tx', 'cit', true, '{"es":"Recordatorio de tu cita","en":"Visit reminder"}', '{"es":"Tu cita es {cuando} a las {hora}. Llega 15 minutos antes con tu tarjeta del seguro.","en":"Your visit is {cuando} at {hora}. Arrive 15 minutes early with your insurance card."}'),
  ('sal_cita_video', 'tx', 'cit', true, '{"es":"Tu consulta por video","en":"Your video visit"}', '{"es":"Tu consulta por video empieza en 10 minutos. Entra desde la app.","en":"Your video visit starts in 10 minutes. Join from the app."}'),
  ('biz_sal_cita', 'biz', null, true, '{"es":"Nueva solicitud de cita","en":"New visit request"}', '{"es":"Nueva solicitud de cita para el {dia} a las {hora}. Responde en {min} minutos.","en":"New visit request for {dia} at {hora}. Reply within {min} minutes."}'),
  ('biz_sal_seg_ok', 'biz', null, true, '{"es":"Sigue sin seguro","en":"Continues uninsured"}', '{"es":"El paciente de la cita del {dia} a las {hora} sigue con el precio sin seguro. La cita quedó confirmada.","en":"The patient for {dia} at {hora} continues at the uninsured price. The visit is confirmed."}')
on conflict (key) do nothing;
