-- Fase 4 · 4l-1 · La consulta con un profesional (fase4-salud-pro.md §4l). Usa op_private como Doctores: la situación (solo
-- la clave) y la nota cifrada; nunca el trámite en los avisos al negocio (el cliente sí ve el nombre de la oficina).
alter table op_private drop constraint if exists op_private_reason_check;
alter table op_private add constraint op_private_reason_check
  check (reason in ('nuevo', 'seguimiento', 'receta', 'papeles', 'chequeo', 'primera', 'caso', 'carta', 'fecha'));

insert into notif_templates (key, grp, pref, sms, title, body) values
  ('biz_pro_cita', 'biz', null, true, '{"es":"Nueva solicitud de consulta","en":"New consultation request"}', '{"es":"{cliente} pide una consulta el {dia} a las {hora}{con}. Responde en {min} minutos.","en":"{cliente} requests a consultation on {dia} at {hora}{con}. Reply within {min} minutes."}'),
  ('biz_pro_cx', 'biz', null, true, '{"es":"Consulta cancelada","en":"Consultation cancelled"}', '{"es":"{cliente} canceló su consulta del {dia} a las {hora}.","en":"{cliente} cancelled their {dia} {hora} consultation."}')
on conflict (key) do nothing;
