-- 0163 · Fase 9 · 9n-13 — Super Admin › Negocio 360° › Equipo: «Quitar acceso» / «Devolver acceso» al panel de alguien del equipo de un negocio
-- (prototipo tab 'eq' teamOff; LAUNCH «Acciones del 360°… quitar acceso al panel (Moderadores)»). No se borra nada ni se toca lo que el dueño le
-- dio (panel_access): se marca el bloqueo con quién, cuándo y por qué, y el acceso al panel (accesoPanel, misNegocios) lo respeta. El dueño recibe el
-- aviso. Al dueño no se le quita acceso desde aquí (eso es un cambio de dueño). Idempotente.
begin;

alter table business_members add column if not exists panel_off_at timestamptz;
alter table business_members add column if not exists panel_off_by uuid references users (id);
alter table business_members add column if not exists panel_off_reason text;
alter table business_members drop constraint if exists business_members_panel_off;
alter table business_members add constraint business_members_panel_off check (
  (panel_off_at is null) = (panel_off_by is null) and (panel_off_at is null) = (panel_off_reason is null)
  and (panel_off_reason is null or char_length(panel_off_reason) between 1 and 500)
  and (panel_off_at is null or kind <> 'owner'));

insert into notif_templates (key, grp, pref, sms, sms_mode, push, push_private, title, body) values
  ('biz_equipo_sin_acceso', 'biz', null, false, 'nunca', true, false,
   '{"es":"Alguien de tu equipo ya no entra al panel","en":"Someone on your team can no longer open the dashboard"}',
   '{"es":"To''Latino le quitó a {persona} el acceso al panel de {negocio}. El motivo está en Equipo.","en":"To''Latino removed {persona}''s access to the {negocio} dashboard. The reason is in Team."}'),
  ('biz_equipo_con_acceso', 'biz', null, false, 'nunca', true, false,
   '{"es":"Alguien de tu equipo vuelve a entrar al panel","en":"Someone on your team can open the dashboard again"}',
   '{"es":"{persona} vuelve a entrar al panel de {negocio}.","en":"{persona} can open the {negocio} dashboard again."}')
on conflict (key) do nothing;

commit;
