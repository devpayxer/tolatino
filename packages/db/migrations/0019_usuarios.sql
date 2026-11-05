-- 0019 · Super Admin › Usuarios 360° (ADM-USR): sanciones con su motivo y plazo, dispositivo de cada sesión (cuentas
-- en el mismo dispositivo, bloquear un dispositivo), cambios sensibles (borrado de cuenta con segunda persona y 30 días
-- de gracia), foto quitada por el equipo. Nada se borra: estados.
begin;

-- Estado real de la cuenta: un silencio o una suspensión con plazo vencido ya no cuenta (se levanta sola).
create or replace function cuenta_estado(st text, hasta timestamptz) returns text language sql stable as $$
  select case when st in ('muted', 'suspended') and hasta is not null and hasta <= now() then 'active' else st end
$$;

alter table users add column if not exists photo_removed_reason text;
alter table users add column if not exists merged_into uuid references users (id);
alter table users add column if not exists status_reason text;
create index if not exists users_creado_idx on users (created_at desc, id);
create index if not exists users_visto_idx on users (last_seen_at desc nulls last, id);
create index if not exists users_phone_trgm on users using gin (phone gin_trgm_ops);
create index if not exists users_email_idx on users (lower(email::text));

-- Sanciones (modelo Sanction). adv = advertencia (no restringe), mute7 / nopub = no publica (7 / 30 días),
-- susp14 = no entra 14 días, ban = no entra (lo confirma un Admin). Se levantan solas al vencer o por una persona.
create table if not exists sanctions (
  id          bigint generated always as identity primary key,
  target_kind text not null default 'user' check (target_kind in ('user', 'business')),
  target_id   text not null,
  city_id     text references cities (id),
  kind        text not null check (kind in ('adv', 'mute7', 'hide', 'susp14', 'ban', 'nosello', 'nopro', 'nopub')),
  reason      text not null check (char_length(reason) between 1 and 500),
  by_staff    uuid not null references users (id),
  starts_at   timestamptz not null default now(),
  ends_at     timestamptz,
  lifted_at   timestamptz,
  lifted_by   uuid references users (id),
  lift_reason text
);
create index if not exists sanctions_target_idx on sanctions (target_kind, target_id, starts_at desc);

-- Dispositivo de cada sesión (cookie tl_dev): «comparte dispositivo con N cuentas» y bloquear un dispositivo.
alter table sessions add column if not exists device uuid;
create index if not exists sessions_device_idx on sessions (device) where device is not null;
create table if not exists blocked_devices (
  id          bigint generated always as identity primary key,
  device      uuid not null,
  user_id     uuid references users (id),          -- la cuenta desde la que se bloqueó
  reason      text not null,
  by_staff    uuid not null references users (id),
  at          timestamptz not null default now(),
  lifted_at   timestamptz,
  lifted_by   uuid references users (id),
  lift_reason text
);
create unique index if not exists blocked_devices_activo_idx on blocked_devices (device) where lifted_at is null;

-- Cambios sensibles (modelo SensitiveChange): los pide una persona del equipo y los aplica otra.
create sequence if not exists sensitive_changes_num start 101;
create table if not exists sensitive_changes (
  id              text primary key default 'CS-' || nextval('sensitive_changes_num'),
  type            text not null check (type in ('deleteUser', 'mergeUser', 'transferOwner', 'mergeBiz', 'changeCategory')),
  target_kind     text not null check (target_kind in ('user', 'business')),
  target_id       text not null,
  city_id         text references cities (id),
  payload         jsonb not null default '{}'::jsonb,
  reason          text not null check (char_length(reason) between 1 and 500),
  requested_by    uuid not null references users (id),
  status          text not null default 'pending' check (status in ('pending', 'applied', 'rejected')),
  decided_by      uuid references users (id),
  decided_at      timestamptz,
  decision_reason text,
  created_at      timestamptz not null default now()
);
create unique index if not exists sensitive_changes_abierto_idx on sensitive_changes (type, target_id) where status = 'pending';
create index if not exists sensitive_changes_target_idx on sensitive_changes (target_kind, target_id, created_at desc);

-- Colas: un cambio sensible de una cuenta sin ciudad lo ve solo quien trabaja todas las ciudades.
alter table queue_items alter column city_id drop not null;
alter table queue_items drop constraint if exists queue_items_subject_kind_check;
alter table queue_items add constraint queue_items_subject_kind_check
  check (subject_kind in ('verification_request', 'business', 'license', 'media', 'recommendation', 'claim', 'sensitive_change'));

-- Notas internas sobre una persona: su ciudad para el filtro del equipo.
create index if not exists admin_notes_user_idx on admin_notes (target_id, at desc) where target_kind = 'user';

commit;
