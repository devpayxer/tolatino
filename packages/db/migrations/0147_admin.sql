-- 0147 · El Super Admin y Configuración, lo que quedaba (Fase 9 · 9n-3; fase9-apertura.md §4 9n).
-- · Configuración › Noche: `noche_responder_min`, `noche_mesa_guardada_min` y `noche_fila_viva_min` pasan a editables (sus textos ya leen el valor de la reserva o no
--   dicen el número) y nace `noche_corte_min` (el corte de las 6 PM para cancelar gratis; cada reserva COPIA el corte al reservar: un cambio solo toca las nuevas).
-- · Ajustar el cupo de un RSVP desde el Super Admin: `event_stock_overrides` suma el tipo 'rsvp' (cupo del evento) y el cupo manda sobre lo que guarde el organizador.
-- · Más interruptores por persona: `app.ubicacion_vivo` pasa a «scopable» (su código lo lee con flag_para, por el repartidor que comparte).
-- · Enviar mensaje del equipo (AdminMessage): `admin_messages` (solo inserción) y las plantillas `msg_equipo` (app) y `msg_equipo_sms` (SMS).
-- · Avisos por SMS de sanciones: `mod_sancion` lleva SMS de respaldo (solo si no hay push que lo lleve; respeta STOP y las horas de silencio).
-- · La persona del equipo cambia su app de códigos o pide códigos de recuperación nuevos por su cuenta: staff_mfa_log suma 'cambio_app' y 'codigos_nuevos'.
-- Reglas: nada se borra; lo de solo inserción lo impone la base; los CHECK que listan valores se AMPLÍAN (nunca una lista fija).
-- Idempotente: dos veces no cambia nada.
begin;

create or replace function pg_temp.ampliar_check(t regclass, nombre text, valores text[]) returns void language plpgsql as $$
declare d text; v text; nuevo text := '';
begin
  select pg_get_constraintdef(oid) into d from pg_constraint where conname = nombre and conrelid = t;
  if d is null then return; end if;
  foreach v in array valores loop
    if position(quote_literal(v) in d) = 0 then nuevo := nuevo || quote_literal(v) || '::text, '; end if;
  end loop;
  if nuevo = '' then return; end if;
  execute format('alter table %s drop constraint %I', t, nombre);
  execute format('alter table %s add constraint %I %s', t, nombre, replace(d, 'ARRAY[', 'ARRAY[' || nuevo));
end $$;

-- ════════════════════ CONFIGURACIÓN › NOCHE ════════════════════
insert into config_keys (key, min, max, def, unit, section, label, help, editable, bloqueo, edit_in, sort) values
  ('noche_corte_min', 120, 600, 360, '{"es":"min después del mediodía","en":"min after noon"}', 'noche',
    '{"es":"Corte para cancelar gratis (360 = 6 PM)","en":"Free-cancellation cutoff (360 = 6 PM)"}',
    '{"es":"Minutos después del mediodía de esa noche: 360 = 6 PM, 420 = 7 PM. Nunca cae a menos de 2 h antes de la llegada. Cada reserva copia el corte al reservar: un cambio solo toca las nuevas.","en":"Minutes after noon of that night: 360 = 6 PM, 420 = 7 PM. It never falls less than 2 h before arrival. Each booking copies the cutoff when it is made: a change only affects new ones."}',
    true, null, null, 53)
on conflict (key) do update set min = excluded.min, max = excluded.max, def = excluded.def, unit = excluded.unit, section = excluded.section, label = excluded.label,
  help = excluded.help, editable = excluded.editable, bloqueo = excluded.bloqueo, edit_in = excluded.edit_in, sort = excluded.sort;
update config_keys set editable = true, bloqueo = null where key in ('noche_responder_min', 'noche_mesa_guardada_min', 'noche_fila_viva_min') and not editable;

-- ════════════════════ RSVP: el cupo desde el Super Admin ════════════════════
do $$ begin perform pg_temp.ampliar_check('event_stock_overrides', 'event_stock_overrides_kind_check', array['rsvp']); end $$;
alter table event_stock_overrides drop constraint if exists event_stock_overrides_check;
alter table event_stock_overrides add constraint event_stock_overrides_check check ((kind in ('dia', 'rsvp')) = (ref_id is null));
-- El último ajuste de To'Latino manda sobre el cupo que vuelva a poner el editor del organizador (como evt_cupo_admin con boletos y mesas).
create or replace function events_cupo_admin() returns trigger language plpgsql as $$
declare q integer;
begin
  select o.quantity into q from event_stock_overrides o where o.event_id = new.id and o.kind = 'rsvp' order by o.id desc limit 1;
  if found and new.rsvp_capacity is distinct from q then new.rsvp_capacity := q; end if;
  return new;
end $$;
drop trigger if exists events_cupo_admin on events;
create trigger events_cupo_admin before update of rsvp_capacity on events for each row execute function events_cupo_admin();

-- ════════════════════ MÁS INTERRUPTORES POR PERSONA ════════════════════
update feature_flags set scopable = true where key = 'app.ubicacion_vivo' and not scopable;

-- ════════════════════ ENVIAR MENSAJE (AdminMessage) ════════════════════
create table if not exists admin_messages (
  id          bigint generated always as identity primary key,
  target_kind text not null check (target_kind in ('user', 'business')),
  target_id   text not null,
  city_id     text references cities (id),
  channel     text not null check (channel in ('sms', 'push')),
  body        text not null check (char_length(body) between 3 and 320),
  reason      text not null check (char_length(reason) between 3 and 500),
  by_staff    uuid not null references users (id),
  at          timestamptz not null default now()
);
create index if not exists admin_messages_destino_idx on admin_messages (target_kind, target_id, at desc);
create index if not exists admin_messages_equipo_idx on admin_messages (by_staff, at desc);
create or replace function admin_messages_solo_insercion() returns trigger language plpgsql as $$
begin raise exception 'admin_messages es solo de inserción'; end $$;
drop trigger if exists admin_messages_no_cambia on admin_messages;
create trigger admin_messages_no_cambia before update or delete on admin_messages for each row execute function admin_messages_solo_insercion();

insert into notif_templates (key, grp, pref, sms, sms_mode, push, push_private, title, body) values
  ('msg_equipo', 'mod', null, false, 'nunca', true, true, '{"es":"Mensaje de To''Latino","en":"Message from To''Latino"}', '{"es":"{texto}","en":"{texto_en}"}'),
  ('msg_equipo_sms', 'mod', null, true, 'sin_push', false, true, '{"es":"Mensaje de To''Latino","en":"Message from To''Latino"}', '{"es":"To''Latino: {texto}","en":"To''Latino: {texto_en}"}')
on conflict (key) do nothing;
-- Una sanción también avisa por SMS cuando no hay push que la lleve (quien está suspendido o baneado quizá ya no abre la app).
update notif_templates set sms = true, sms_mode = 'sin_push' where key = 'mod_sancion' and (not sms or sms_mode <> 'sin_push');

-- ════════════════════ LOS DOS PASOS DEL EQUIPO, POR SU CUENTA ════════════════════
do $$ begin perform pg_temp.ampliar_check('staff_mfa_log', 'staff_mfa_log_action_check', array['cambio_app', 'codigos_nuevos']); end $$;

commit;
