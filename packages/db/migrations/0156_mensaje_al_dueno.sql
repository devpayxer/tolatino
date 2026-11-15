-- 0156 · Fase 9 · 9n-7 — «Mensaje al dueño» desde el Negocio 360° (LAUNCH «Acciones del 360° que dependen de otras piezas»).
-- Las plantillas del grupo «biz» (como las demás del negocio): el push abre la app Negocios en su panel (guardián pushAbreSuApp), la campana
-- dice el texto del equipo y, por SMS, «To'Latino: {texto}» (respeta STOP y las horas de silencio). La fila de admin_messages es
-- target_kind 'business' (0147 ya lo admite). Idempotente.
begin;
insert into notif_templates (key, grp, pref, sms, sms_mode, push, push_private, title, body) values
  ('biz_msg_equipo', 'biz', null, false, 'nunca', true, true, '{"es":"Mensaje de To''Latino","en":"Message from To''Latino"}', '{"es":"{texto}","en":"{texto_en}"}'),
  ('biz_msg_equipo_sms', 'biz', null, true, 'sin_push', false, true, '{"es":"Mensaje de To''Latino","en":"Message from To''Latino"}', '{"es":"To''Latino: {texto}","en":"To''Latino: {texto_en}"}')
on conflict (key) do nothing;
commit;
