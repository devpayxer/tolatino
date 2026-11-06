-- 0063 · Ayuda con la cita de Doctores y con el trámite de Profesionales (Fase 4 · bloque 4m-2). Diseño: neg-salud-rev.js RSN
-- (cobro · seguro · noseg · interp · espera · trato · otro) y neg-pro-rev.js RSN (cobro · ley · nohizo · fecha · contesta · trato ·
-- otro). Lo que se pide suma «que corrijan el cobro a mi seguro» (seguro) y «que terminen lo acordado» (terminar).
-- Las fotos de una ayuda de Salud o Pro son PRIVADAS (media.private, «privado/a/…») y se borran 90 días después de cerrarse.
begin;
alter table help_requests drop constraint help_requests_reason_check;
alter table help_requests add constraint help_requests_reason_check check (reason = any (array[
  'falta', 'equivocado', 'frio', 'danado', 'tarde', 'nollego', 'pago', 'otro',          -- pedidos
  'cobro', 'quien', 'quedo', 'espera', 'dep',                                             -- citas de Belleza (y «cobro», «tarde» en Auto)
  'win', 'more', 'bad', 'dmg', 'who',                                                     -- visitas del Hogar
  'igual', 'dano', 'piezas',                                                              -- citas de Auto
  'seguro', 'noseg', 'interp', 'trato',                                                   -- citas de Doctores (y «cobro», «espera»)
  'ley', 'nohizo', 'fecha', 'contesta']));                                                -- trámites de Profesionales
alter table help_requests drop constraint help_requests_wants_check;
alter table help_requests add constraint help_requests_wants_check check (wants = any (array['reponer', 'devolver', 'avisar', 'seguro', 'terminar']));
alter table media add column if not exists purged_at timestamptz;
create index if not exists media_ayuda_privada_idx on media (owner_id) where owner_kind = 'help' and private and status = 'visible';

-- Avisos neutros de Salud (sin consultorio ni paciente, §3). Pro usa los de siempre (el nombre de la oficina sí; el trámite nunca).
insert into notif_templates (key, grp, pref, sms, title, body) values
  ('sal_help_reply', 'tx', null, true, '{"es":"Respuesta a tu solicitud de ayuda","en":"Reply to your help request"}', '{"es":"Respondieron tu solicitud {num}. Detalles en la app.","en":"Your request {num} got a reply. Details in the app."}'),
  ('sal_help_done', 'tx', null, true, '{"es":"Solicitud resuelta","en":"Request resolved"}', '{"es":"To''Latino resolvió tu solicitud {num}. Detalles en la app.","en":"To''Latino resolved your request {num}. Details in the app."}'),
  ('biz_sal_help', 'biz', null, true, '{"es":"Un paciente pide ayuda con una cita","en":"A patient asks for help with a visit"}', '{"es":"Un paciente pide ayuda con la cita {num}. Responde en 24 horas.","en":"A patient asks for help with visit {num}. Reply within 24 hours."}'),
  ('biz_sal_help_rev', 'biz', null, false, '{"es":"To''Latino revisa una solicitud","en":"To''Latino reviews a request"}', '{"es":"Pidieron que To''Latino revise la solicitud {num}. Te escribimos si hace falta algo.","en":"To''Latino was asked to review request {num}. We will write if we need anything."}')
on conflict (key) do nothing;
commit;
