-- 0140 · Fase 9 · 9j · Super Admin › Sistema completo y la seguridad del equipo (docs/diseno/plan/fase9-apertura.md §2 «0140 sistema», §3.4, §3.5,
-- §4 9j; T#30; LAUNCH → 9j).
-- · staff_mfa: el segundo factor del equipo (TOTP propio, RFC 6238). El secreto va cifrado (lib/cifrado.ts, DATOS_SECRET); los 10 códigos de
--   recuperación solo como huella (HMAC con AUTH_SECRET). Uno vivo por persona (el alta empezada y sin confirmar también ocupa el lugar). Nada se
--   borra: se revoca. El secreto no cambia; un código usado no vuelve (last_step solo sube); los códigos de recuperación solo se gastan.
--   La llave de acceso (8d) es el otro segundo factor: vive en `passkeys` (una sesión abierta con la llave ya trae los dos pasos).
-- · sessions.mfa_at / mfa_via: la sesión que ya dio su segundo factor (lo escribe SOLO lib/equipo/dos-pasos.ts; guardián equipoConDosPasos).
-- · staff_mfa_log (SOLO INSERCIÓN): altas, códigos buenos y malos, repetidos, recuperación, bloqueo y restablecer (el bloqueo por intentos se
--   cuenta aquí).
-- · staff_mfa_pruebas: SOLO SANDBOX. Teléfonos de FICCIÓN (+1 570 555 xxxx, la base lo exige) del equipo de las pruebas de punta a punta que
--   entran sin segundo factor mientras el código de entrada se muestra en pantalla (TOLATINO_SMS_MODO=pruebas, imposible en producción: candado
--   de lib/entorno.ts). En producción la tabla nace vacía (la semilla nunca corre allá) y el código ni la lee.
-- · backup_runs y restore_drills (SOLO INSERCIÓN): cada respaldo (base completa, WAL, fotos, sobre de llaves) y cada restauración de prueba con
--   su RTO, las filas contadas y la consulta de verificación. Los escribe 9o (producción) y la semilla del sandbox; Sistema › Respaldos los lee.
-- · health_checks (SOLO INSERCIÓN, purga a 30 días con tl.retencion = 'salud'): lo que el barrido mide cada 5 minutos (base, barrido, push,
--   disco, errores). Sistema › Salud.
-- · maintenance_windows: el mantenimiento programado (no se borra ni se edita: se cancela con motivo).
-- · key_rotations (SOLO INSERCIÓN): cada llave que se reemplaza (qué llave, huella vieja y nueva, quién y por qué).
-- · break_glass (SOLO INSERCIÓN): el «vidrio roto» del equipo a una foto de Salud: el motivo escrito ANTES de verla; vale 10 minutos.
-- · app_error_groups.kind suma 'servidor' (instrumentation.ts → lib/errores/ingesta.ts, tapados como los demás).
-- · feature_flags suma scope ('all', 'city', 'percent') y scopable (solo un interruptor cuyo código lo lee con flag_para() puede ir por ciudad o
--   porcentaje; los demás siguen todo o nada). flag_para(clave, persona): la ciudad de la persona y su cubeta estable (0–99) por clave.
-- · founder_steps admite los paquetes 9-1 a 9-5 (Sistema › Apps › «Lo que te toca», fase9 §10).
-- · Avisos llave_vence (al equipo: una llave del llavero vence en 30 días o venció) y equipo_dos_pasos (a la persona: cambió su segundo factor).
-- Idempotente: se puede aplicar dos veces. Nada se borra (salvo la purga de health_checks a los 30 días).
begin;

-- ── El segundo factor del equipo ──
create table if not exists staff_mfa (
  id              bigint generated always as identity primary key,
  user_id         uuid not null references users (id),
  kind            text not null default 'totp' check (kind in ('totp')),
  totp_secret_enc bytea not null check (octet_length(totp_secret_enc) between 29 and 200),
  recovery_hashes text[] not null default '{}' check (cardinality(recovery_hashes) <= 10
                    and array_to_string(recovery_hashes, ',') ~ '^([0-9a-f]{64}(,[0-9a-f]{64})*)?$'),
  created_at      timestamptz not null default now(),
  enrolled_at     timestamptz,                        -- null = alta empezada (el QR se mostró) y sin confirmar
  last_step       bigint check (last_step > 0),       -- el último paso de 30 s aceptado: un código no vuelve a entrar
  last_used_at    timestamptz,
  revoked_at      timestamptz,
  revoked_by      uuid references users (id),
  revoked_reason  text check (char_length(revoked_reason) between 3 and 300),
  check ((revoked_at is null) = (revoked_reason is null)),
  check (enrolled_at is null or cardinality(recovery_hashes) <= 10)
);
create unique index if not exists staff_mfa_vivo on staff_mfa (user_id) where revoked_at is null;

create or replace function staff_mfa_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'un segundo factor no se borra (se revoca)'; end if;
  if tg_op = 'UPDATE' then
    if old.revoked_at is not null then raise exception 'un segundo factor revocado no vuelve ni se usa'; end if;
    if (new.user_id, new.kind, new.totp_secret_enc, new.created_at) is distinct from (old.user_id, old.kind, old.totp_secret_enc, old.created_at) then
      raise exception 'el secreto de un segundo factor no cambia';
    end if;
    if old.enrolled_at is not null and new.enrolled_at is distinct from old.enrolled_at then raise exception 'la fecha de alta no cambia'; end if;
    if old.enrolled_at is not null and not (new.recovery_hashes <@ old.recovery_hashes) then raise exception 'los códigos de recuperación solo se gastan'; end if;
    if old.last_step is not null and (new.last_step is null or new.last_step < old.last_step) then
      raise exception 'un código usado no vuelve a entrar';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists staff_mfa_antes on staff_mfa;
create trigger staff_mfa_antes before update or delete on staff_mfa for each row execute function staff_mfa_antes();

alter table sessions add column if not exists mfa_at timestamptz;
alter table sessions add column if not exists mfa_via text;
alter table sessions drop constraint if exists sessions_mfa_check;
alter table sessions add constraint sessions_mfa_check check ((mfa_at is null) = (mfa_via is null) and (mfa_via is null or mfa_via in ('totp', 'recuperacion', 'pruebas')));

create table if not exists staff_mfa_log (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references users (id),
  mfa_id     bigint references staff_mfa (id),
  session_id uuid,
  action     text not null check (action in ('alta_inicio', 'alta', 'codigo', 'codigo_fallo', 'codigo_repetido', 'recuperacion', 'recuperacion_fallo',
                                              'bloqueado', 'restablecido', 'pruebas')),
  by         uuid references users (id),               -- quien restablece (otra persona del equipo)
  ip         inet,
  at         timestamptz not null default now()
);
create index if not exists staff_mfa_log_persona on staff_mfa_log (user_id, at desc);
create or replace function staff_mfa_log_no_cambia() returns trigger language plpgsql as $$
begin raise exception 'staff_mfa_log es solo de inserción'; end $$;
drop trigger if exists staff_mfa_log_no_cambia on staff_mfa_log;
create trigger staff_mfa_log_no_cambia before update or delete on staff_mfa_log for each row execute function staff_mfa_log_no_cambia();

-- SOLO SANDBOX: la lista la llena infra/pruebas/semilla (nunca producción). Teléfonos de ficción 570-555 y nada más.
create table if not exists staff_mfa_pruebas (
  phone text primary key check (phone ~ '^\+1570555[0-9]{4}$'),
  note  text check (char_length(note) <= 200)
);

-- ── Respaldos y restauraciones de prueba (solo inserción) ──
create table if not exists backup_runs (
  id          bigint generated always as identity primary key,
  entorno     text not null check (entorno in ('pruebas', 'produccion')),
  kind        text not null check (kind in ('base', 'wal', 'fotos', 'sobre')),
  started_at  timestamptz not null,
  finished_at timestamptz,
  bytes       bigint check (bytes >= 0),
  sha256      text check (sha256 ~ '^[0-9a-f]{64}$'),
  destino     text check (char_length(destino) <= 200),
  result      text not null check (result in ('ok', 'fallo')),
  detail      text check (char_length(detail) <= 300),
  is_test     boolean not null default false,
  check (finished_at is null or finished_at >= started_at),
  check (result <> 'ok' or (finished_at is not null and sha256 is not null))
);
create index if not exists backup_runs_tipo on backup_runs (kind, started_at desc);
create table if not exists restore_drills (
  id            bigint generated always as identity primary key,
  backup_run_id bigint references backup_runs (id),
  entorno       text not null check (entorno in ('pruebas', 'produccion')),
  started_at    timestamptz not null,
  finished_at   timestamptz,
  point_at      timestamptz,                             -- el punto en el tiempo restaurado
  rto_s         integer check (rto_s >= 0),
  checks        jsonb not null default '{}' check (jsonb_typeof(checks) = 'object' and pg_column_size(checks) <= 4000),
  verify_sql    text check (char_length(verify_sql) <= 2000),
  result        text not null check (result in ('ok', 'fallo')),
  detail        text check (char_length(detail) <= 300),
  is_test       boolean not null default false,
  check (finished_at is null or finished_at >= started_at),
  check (result <> 'ok' or (finished_at is not null and rto_s is not null))
);
create index if not exists restore_drills_fecha on restore_drills (started_at desc);
create or replace function sistema_solo_insercion() returns trigger language plpgsql as $$
begin raise exception '% es solo de inserción', tg_table_name; end $$;
drop trigger if exists backup_runs_no_cambia on backup_runs;
create trigger backup_runs_no_cambia before update or delete on backup_runs for each row execute function sistema_solo_insercion();
drop trigger if exists restore_drills_no_cambia on restore_drills;
create trigger restore_drills_no_cambia before update or delete on restore_drills for each row execute function sistema_solo_insercion();

-- ── Salud: lo que mide el barrido (solo inserción; a los 30 días sale con tl.retencion = 'salud') ──
create table if not exists health_checks (
  id         bigint generated always as identity primary key,
  service    text not null check (service in ('base', 'barrido', 'push', 'disco', 'errores')),
  at         timestamptz not null default now(),
  ok         boolean not null,
  latency_ms integer check (latency_ms >= 0),
  value      numeric check (value >= 0),
  detail     text check (char_length(detail) <= 200),
  is_test    boolean not null default false
);
create index if not exists health_checks_servicio on health_checks (service, at desc);
create index if not exists health_checks_fecha on health_checks using brin (at);
create or replace function health_checks_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' and coalesce(current_setting('tl.retencion', true), '') = 'salud' and old.at < now() - interval '30 days' then return old; end if;
  raise exception 'health_checks es solo de inserción (sale a los 30 días por el barrido)';
end $$;
drop trigger if exists health_checks_antes on health_checks;
create trigger health_checks_antes before update or delete on health_checks for each row execute function health_checks_antes();
create or replace function health_checks_purgar() returns integer language plpgsql as $$
declare n integer;
begin
  perform set_config('tl.retencion', 'salud', true);
  with fuera as (delete from health_checks where id in (select id from health_checks where at < now() - interval '30 days' order by at limit 5000) returning 1)
  select count(*)::integer into n from fuera;
  perform set_config('tl.retencion', '', true);
  return n;
end $$;

-- ── Mantenimiento programado ──
create table if not exists maintenance_windows (
  id            bigint generated always as identity primary key,
  from_at       timestamptz not null,
  to_at         timestamptz not null,
  message       jsonb not null check (jsonb_typeof(message) = 'object' and message ? 'es' and message ? 'en'
                  and char_length(message->>'es') between 3 and 200 and char_length(message->>'en') between 3 and 200),
  by_staff      uuid not null references users (id),
  reason        text not null check (char_length(reason) between 3 and 300),
  created_at    timestamptz not null default now(),
  cancelled_at  timestamptz,
  cancelled_by  uuid references users (id),
  cancel_reason text check (char_length(cancel_reason) between 3 and 300),
  check (to_at > from_at and to_at - from_at <= interval '6 hours'),
  check ((cancelled_at is null) = (cancelled_by is null) and (cancelled_at is null) = (cancel_reason is null))
);
create index if not exists maintenance_windows_desde on maintenance_windows (from_at desc);
create or replace function maintenance_windows_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'un mantenimiento no se borra (se cancela)'; end if;
  if old.cancelled_at is not null then raise exception 'un mantenimiento cancelado no vuelve'; end if;
  if (new.from_at, new.to_at, new.message, new.by_staff, new.reason, new.created_at) is distinct from (old.from_at, old.to_at, old.message, old.by_staff, old.reason, old.created_at) then
    raise exception 'un mantenimiento no se edita: se cancela y se programa otro';
  end if;
  return new;
end $$;
drop trigger if exists maintenance_windows_antes on maintenance_windows;
create trigger maintenance_windows_antes before update or delete on maintenance_windows for each row execute function maintenance_windows_antes();

-- ── Llaves que se reemplazan (solo inserción) ──
create table if not exists key_rotations (
  id       bigint generated always as identity primary key,
  key_name text not null check (key_name ~ '^[a-z][a-z0-9_]{1,40}$'),
  version  integer check (version >= 1),
  old_fp   text check (old_fp ~ '^[a-f0-9]{16,64}$'),
  new_fp   text not null check (new_fp ~ '^[a-f0-9]{16,64}$'),
  by       uuid references users (id),
  reason   text not null check (char_length(reason) between 3 and 300),
  at       timestamptz not null default now()
);
create index if not exists key_rotations_llave on key_rotations (key_name, at desc);
drop trigger if exists key_rotations_no_cambia on key_rotations;
create trigger key_rotations_no_cambia before update or delete on key_rotations for each row execute function sistema_solo_insercion();

-- ── «Vidrio roto»: el motivo antes de ver una foto de Salud (solo inserción) ──
create table if not exists break_glass (
  id          bigint generated always as identity primary key,
  staff_id    uuid not null references users (id),
  target_kind text not null check (target_kind in ('help_request')),
  target_id   text not null check (char_length(target_id) between 1 and 60),
  city_id     text references cities (id),
  reason      text not null check (char_length(reason) between 3 and 300),
  at          timestamptz not null default now(),
  expires_at  timestamptz not null,
  check (expires_at > at and expires_at <= at + interval '30 minutes')
);
create index if not exists break_glass_quien on break_glass (staff_id, target_kind, target_id, expires_at desc);
drop trigger if exists break_glass_no_cambia on break_glass;
create trigger break_glass_no_cambia before update or delete on break_glass for each row execute function sistema_solo_insercion();

-- ── Errores del servidor ──
alter table app_error_groups drop constraint if exists app_error_groups_kind_check;
alter table app_error_groups add constraint app_error_groups_kind_check check (kind in ('js', 'nativo', 'cierre', 'red', 'servidor'));

-- ── Interruptores por ciudad y por porcentaje ──
alter table feature_flags add column if not exists scope text not null default 'all';
alter table feature_flags add column if not exists scopable boolean not null default false;
alter table feature_flags drop constraint if exists feature_flags_scope_check;
alter table feature_flags add constraint feature_flags_scope_check check (scope in ('all', 'city', 'percent') and (scope = 'all' or scopable)
  and (scope <> 'city' or cardinality(cities) > 0) and (scope <> 'percent' or percent between 1 and 99));
-- «Reportar un problema» es el primero que se puede abrir por ciudad o por porcentaje (sus tres lectores usan flag_para).
update feature_flags set scopable = true where key = 'app.reportar' and not scopable;

-- La cubeta estable (0–99) de una persona para un interruptor: la misma persona cae siempre en la misma cubeta de esa clave.
create or replace function flag_cubeta(k text, sujeto text) returns integer language sql immutable as $$
  select (('x' || substr(md5(k || ':' || sujeto), 1, 8))::bit(32)::bigint % 100)::integer
$$;
-- ¿Este interruptor está encendido para esta persona? enabled es el interruptor general; scope lo acota a sus ciudades o a su porcentaje.
create or replace function flag_para(k text, u uuid) returns boolean language sql stable as $$
  select coalesce((
    select f.enabled and case f.scope
      when 'all' then true
      when 'city' then exists (select 1 from users x where x.id = u and x.home_city_id = any (f.cities))
      when 'percent' then u is not null and flag_cubeta(f.key, u::text) < f.percent
        and (cardinality(f.cities) = 0 or exists (select 1 from users x where x.id = u and x.home_city_id = any (f.cities)))
      else false end
    from feature_flags f where f.key = k), false)
$$;

-- ── «Lo que te toca» suma los paquetes de la Fase 9 ──
alter table founder_steps drop constraint if exists founder_steps_step_check;
alter table founder_steps add constraint founder_steps_step_check check (step ~ '^(8-[0-3]|9-[1-5])\.[0-9]{1,2}$');

-- ── Avisos ──
insert into notif_templates (key, grp, pref, sms, title, body) values
  ('llave_vence', 'mod', null, false, '{"es":"Una llave vence {cuando}","en":"A key expires {cuando}"}',
    '{"es":"{llave} (versión {version}) vence el {fecha}. Reemplázala en Sistema › Integraciones › Llaves; cada reemplazo queda anotado.","en":"{llave} (version {version}) expires on {fecha}. Replace it in System › Integrations › Keys; every replacement is logged."}'),
  ('equipo_dos_pasos', 'crit', null, false, '{"es":"Tu segundo paso cambió","en":"Your second step changed"}',
    '{"es":"{que}. Si no fuiste tú, avísale a un Admin ahora.","en":"{que_en}. If it was not you, tell an Admin now."}')
on conflict (key) do nothing;

commit;
