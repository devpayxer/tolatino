-- 0127 · Fase 8 · 8f · Programa beta, «Reportar un problema», errores y cierres propios (docs/diseno/plan/fase8-apps.md §2 «0130 apps_beta», §4 8f).
-- NUMERACIÓN: el plan decía 0130 (y la semilla 0046). La última confirmada es 0126 (8c) y 8b (que tomaría 0127 en el papel) espera el dominio
-- (Paquete 8-0) y no se construyó: 8f toma 0127 y la semilla 0045; 8b tomará la siguiente libre. Nada asume números contiguos (migrar.sh
-- registra cada archivo por su nombre). Anotado en el plan y en REVISION.
-- · app_error_groups: los grupos de errores (huella normalizada del stack). Son DERIVADOS: cuenta, personas aprox., primera y última vez, primer y
--   último build los escribe SOLO la base al insertar un evento (trigger); el equipo solo cambia el estado (visto, resuelto en el build N,
--   silenciado con motivo). Un grupo resuelto que vuelve en un build más nuevo pasa solo a «nuevo» (regresión).
-- · app_error_events: cada error o cierre, SOLO inserción, tapado (lib/errores/ingesta.ts) y sin personas: sin usuario, teléfono, correo ni
--   número de operación; la ruta es su familia (/pedido/:n), nunca la URL; la sesión es una huella diaria. La base lo vuelve a revisar
--   (sin dígitos en la familia, sin «?», sin correos, sin teléfonos, sin tarjetas ni SSN). Purga a los errores_retener_dias: solo se borra lo vencido.
-- · app_error_alerts: «Errores en vivo» (grupo nuevo, pico o regresión por build): una sola vez por grupo, tipo y build; SOLO inserción.
-- · app_builds: lo que hay en TestFlight interno, Play interno, el APK propio y la tienda (8h lo llena desde el CI). Build creciente por app,
--   plataforma y canal; el estado solo avanza; no se borra (se retira con motivo).
-- · beta_testers: quién prueba qué app y por dónde. El correo (lo pide Apple para invitar) va CIFRADO; se busca por su huella. Quitar = una vez,
--   con quién y motivo. apk_links: el enlace de un uso del APK propio (solo su huella; abrirlo no lo gasta, bajarlo sí).
-- · support_case_logs: el registro técnico y la captura de un «Reportar un problema» (SOLO inserción; tapado; ≤ reporte_logs_kb). La purga D5 de
--   una cuenta borrada lo vacía como a los mensajes (soporte_purgar_casos, reemplazada aquí). support_cases.origin suma 'reporte_app'.
-- · Configuración › Apps: errores_retener_dias, errores_por_minuto, errores_por_dispositivo, errores_pico_n, reporte_logs_kb, beta_agitar,
--   apk_enlace_horas. Interruptores app.reportar y app.errores. Avisos err_vivo (equipo), beta_testflight, beta_apk y beta_quitado.
-- Idempotente: se puede aplicar dos veces. Nada se borra salvo la purga por retención de los eventos de error.
begin;

-- ── Builds ──
create table if not exists app_builds (
  id             bigint generated always as identity primary key,
  app            text not null check (app in ('cliente', 'negocio', 'delivery', 'checkin')),
  platform       text not null check (platform in ('ios', 'android')),
  version        text not null check (version ~ '^\d{1,3}\.\d{1,3}\.\d{1,3}$'),
  build          integer not null check (build between 1 and 999999999),
  commit_sha     text check (commit_sha ~ '^[a-f0-9]{7,40}$'),
  flavor         text not null default 'pruebas' check (flavor in ('pruebas', 'produccion')),
  channel        text not null check (channel in ('testflight_interno', 'play_interno', 'apk_propio', 'tienda')),
  status         text not null default 'compilando' check (status in ('compilando', 'subido', 'procesando', 'disponible', 'fallo', 'retirado')),
  ci_run_url     text check (ci_run_url ~ '^https://github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/actions/runs/[0-9]{1,20}$'),
  size_bytes     bigint check (size_bytes between 1 and 2000000000),
  sha256         text check (sha256 ~ '^[a-f0-9]{64}$'),
  artifact_key   text check (artifact_key ~ '^privado/apk/[a-z0-9-]{3,80}\.apk$'),
  symbols_media_id uuid references media (id),
  islas_sha      text check (islas_sha ~ '^[a-f0-9]{64}$'),
  fail_reason    text check (char_length(fail_reason) <= 200),
  retired_reason text check (char_length(retired_reason) between 3 and 300),
  retired_by     uuid references users (id),
  is_test        boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (app, platform, channel, build),
  check (channel <> 'testflight_interno' or platform = 'ios'),
  check (channel not in ('play_interno', 'apk_propio') or platform = 'android'),
  check (status <> 'disponible' or channel <> 'apk_propio' or (artifact_key is not null and sha256 is not null and size_bytes is not null)),
  check ((status = 'retirado') = (retired_reason is not null)),
  check (status <> 'fallo' or fail_reason is not null)
);
create index if not exists app_builds_lista on app_builds (app, platform, created_at desc);
create or replace function app_builds_antes() returns trigger language plpgsql as $$
declare ultimo integer;
  orden constant text[] := array['compilando', 'subido', 'procesando', 'disponible'];
begin
  if tg_op = 'DELETE' then raise exception 'un build no se borra (se retira, con motivo)'; end if;
  if tg_op = 'INSERT' then
    -- Creciente por app, plataforma y canal (lo que Apple y Google exigen; el CI no puede volver atrás).
    select max(build) into ultimo from app_builds where app = new.app and platform = new.platform and channel = new.channel;
    if ultimo is not null and new.build <= ultimo then raise exception 'build_no_creciente: % no es mayor que % (%, %, %)', new.build, ultimo, new.app, new.platform, new.channel; end if;
    if new.status = 'retirado' then raise exception 'un build nace vivo'; end if;
    new.created_at := now(); new.updated_at := now();
    return new;
  end if;
  -- Lo que identifica al build no cambia; el archivo y su huella, una vez puestos, tampoco.
  if (new.app, new.platform, new.version, new.build, new.channel, new.flavor, new.created_at, new.is_test)
     is distinct from (old.app, old.platform, old.version, old.build, old.channel, old.flavor, old.created_at, old.is_test)
     or (old.commit_sha is not null and new.commit_sha is distinct from old.commit_sha)
     or (old.sha256 is not null and new.sha256 is distinct from old.sha256)
     or (old.artifact_key is not null and new.artifact_key is distinct from old.artifact_key) then
    raise exception 'app_builds: el build, su canal y su archivo no cambian';
  end if;
  -- El estado solo avanza: compilando → subido → procesando → disponible; cualquiera vivo → fallo; disponible → retirado.
  if new.status is distinct from old.status then
    if old.status in ('fallo', 'retirado') then raise exception 'app_builds: un build % ya no cambia', old.status; end if;
    if new.status = 'retirado' and old.status <> 'disponible' then raise exception 'app_builds: solo se retira un build disponible'; end if;
    if new.status in ('compilando', 'subido', 'procesando', 'disponible') and array_position(orden, new.status) <= array_position(orden, old.status) then
      raise exception 'app_builds: el estado solo avanza (% → %)', old.status, new.status;
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists app_builds_antes on app_builds;
create trigger app_builds_antes before insert or update or delete on app_builds for each row execute function app_builds_antes();

-- ── Testers ──
create table if not exists beta_testers (
  id              bigint generated always as identity primary key,
  user_id         uuid not null references users (id),
  city_id         text references cities (id),
  app             text not null check (app in ('cliente', 'negocio', 'delivery', 'checkin')),
  platform        text not null check (platform in ('ios', 'android')),
  channel         text not null check (channel in ('testflight', 'play_interno', 'apk_propio')),
  email_enc       bytea check (octet_length(email_enc) between 29 and 400),
  email_hash      text check (email_hash ~ '^[a-f0-9]{64}$'),
  status          text not null default 'invitado' check (status in ('invitado', 'activo', 'pendiente_consola', 'quitado')),
  sync            text not null default 'pendiente' check (sync in ('ok', 'pendiente', 'sin_llave', 'error')),
  sync_at         timestamptz,
  sync_error      text check (char_length(sync_error) <= 200),
  asc_invitation_id text check (asc_invitation_id ~ '^[A-Za-z0-9-]{1,80}$'),
  asc_user_id     text check (asc_user_id ~ '^[A-Za-z0-9-]{1,80}$'),
  asc_tester_id   text check (asc_tester_id ~ '^[A-Za-z0-9-]{1,80}$'),
  invited_by      uuid not null references users (id),
  invited_at      timestamptz not null default now(),
  invite_reason   text not null check (char_length(invite_reason) between 3 and 300),
  accepted_at     timestamptz,
  removed_at      timestamptz,
  removed_by      uuid references users (id),
  removed_reason  text check (char_length(removed_reason) between 3 and 300),
  is_test         boolean not null default false,
  check (channel <> 'testflight' or platform = 'ios'),
  check (channel not in ('play_interno', 'apk_propio') or platform = 'android'),
  check (channel <> 'testflight' or (email_enc is not null and email_hash is not null)),
  check ((email_enc is null) = (email_hash is null)),
  check ((removed_at is null) = (removed_reason is null) and (removed_at is null) = (removed_by is null)),
  check ((status = 'quitado') = (removed_at is not null))
);
create unique index if not exists beta_testers_vivo on beta_testers (user_id, app, platform) where removed_at is null;
create index if not exists beta_testers_lista on beta_testers (app, platform, invited_at desc);
create index if not exists beta_testers_sync on beta_testers (sync_at) where sync in ('pendiente', 'error');
create or replace function beta_testers_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'un tester no se borra (se quita, con motivo)'; end if;
  if tg_op = 'INSERT' then
    if new.removed_at is not null then raise exception 'un tester nace invitado'; end if;
    new.invited_at := now();
    return new;
  end if;
  if (to_jsonb(new) - array['status', 'sync', 'sync_at', 'sync_error', 'asc_invitation_id', 'asc_user_id', 'asc_tester_id', 'accepted_at', 'removed_at', 'removed_by', 'removed_reason'])
     <> (to_jsonb(old) - array['status', 'sync', 'sync_at', 'sync_error', 'asc_invitation_id', 'asc_user_id', 'asc_tester_id', 'accepted_at', 'removed_at', 'removed_by', 'removed_reason']) then
    raise exception 'beta_testers: la persona, la app, el canal, el correo y quién invitó no cambian';
  end if;
  if old.removed_at is not null and (new.removed_at, new.removed_by, new.removed_reason, new.status) is distinct from (old.removed_at, old.removed_by, old.removed_reason, old.status) then
    raise exception 'beta_testers: un tester quitado ya no vuelve (se invita otra vez)';
  end if;
  if old.removed_at is null and new.removed_at is not null then new.removed_at := now(); end if;
  return new;
end $$;
drop trigger if exists beta_testers_antes on beta_testers;
create trigger beta_testers_antes before insert or update or delete on beta_testers for each row execute function beta_testers_antes();

-- El enlace de un uso del APK propio: solo su huella (el enlace lo recibe el tester en su aviso). Usarlo o anularlo es una vez.
create table if not exists apk_links (
  id          bigint generated always as identity primary key,
  tester_id   bigint not null references beta_testers (id),
  build_id    bigint not null references app_builds (id),
  token_hash  text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  created_by  uuid not null references users (id),
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  used_at     timestamptz,
  revoked_at  timestamptz,
  check (expires_at > created_at),
  check (used_at is null or revoked_at is null)
);
create index if not exists apk_links_tester on apk_links (tester_id, created_at desc);
create or replace function apk_links_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'un enlace del APK no se borra'; end if;
  if tg_op = 'INSERT' then
    if new.used_at is not null or new.revoked_at is not null then raise exception 'un enlace nace sin usar'; end if;
    new.created_at := now();
    return new;
  end if;
  if (to_jsonb(new) - array['used_at', 'revoked_at']) <> (to_jsonb(old) - array['used_at', 'revoked_at'])
     or (old.used_at is not null and new.used_at is distinct from old.used_at)
     or (old.revoked_at is not null and new.revoked_at is distinct from old.revoked_at) then
    raise exception 'apk_links: un enlace se usa o se anula una sola vez';
  end if;
  if old.used_at is null and new.used_at is not null then
    if old.revoked_at is not null or old.expires_at <= now() then raise exception 'apk_enlace_vencido'; end if;
    new.used_at := now();
  end if;
  if old.revoked_at is null and new.revoked_at is not null then new.revoked_at := now(); end if;
  return new;
end $$;
drop trigger if exists apk_links_antes on apk_links;
create trigger apk_links_antes before insert or update or delete on apk_links for each row execute function apk_links_antes();

-- ── Errores: grupos (derivados) y eventos (solo inserción, sin personas) ──
create table if not exists app_error_groups (
  id                bigint generated always as identity primary key,
  fingerprint       text not null unique check (fingerprint ~ '^[a-f0-9]{40}$'),
  app               text not null check (app in ('cliente', 'negocio', 'delivery', 'checkin', 'web')),
  platform          text not null check (platform in ('ios', 'android', 'web')),
  kind              text not null check (kind in ('js', 'nativo', 'cierre', 'red')),
  title             text not null check (char_length(title) between 1 and 200),
  first_seen        timestamptz not null default now(),
  last_seen         timestamptz not null default now(),
  count             bigint not null default 0 check (count >= 0),
  users_n           integer not null default 0 check (users_n >= 0),
  first_build       text check (char_length(first_build) <= 40),
  last_build        text check (char_length(last_build) <= 40),
  status            text not null default 'nuevo' check (status in ('nuevo', 'visto', 'resuelto', 'silenciado')),
  resolved_in_build text check (char_length(resolved_in_build) <= 40),
  regressed_at      timestamptz,
  status_by         uuid references users (id),
  status_at         timestamptz,
  status_reason     text check (char_length(status_reason) <= 300),
  check ((app = 'web') = (platform = 'web')),
  check ((status = 'resuelto') = (resolved_in_build is not null)),
  check (status <> 'silenciado' or char_length(status_reason) >= 3),
  -- Lo que se ve del grupo tampoco lleva personas.
  check (title !~* '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}' and title !~ '\(?[0-9]{3}\)?[ .-][0-9]{3}[ .-][0-9]{4}' and title !~ '[?&][A-Za-z_]+=' and not texto_con_secretos(title))
);
create index if not exists app_error_groups_ultimo on app_error_groups (last_seen desc, id desc);
create index if not exists app_error_groups_estado on app_error_groups (status, last_seen desc);
create index if not exists app_error_groups_app on app_error_groups (app, platform, last_seen desc);

create table if not exists app_error_events (
  id           bigint generated always as identity primary key,
  group_id     bigint not null references app_error_groups (id),
  at           timestamptz not null default now(),
  release      text check (char_length(release) between 1 and 40),
  build        integer check (build between 0 and 999999999),
  app_version  text check (app_version ~ '^\d{1,3}\.\d{1,3}\.\d{1,3}$'),
  os_version   text check (char_length(os_version) <= 20),
  device_model text check (char_length(device_model) <= 60),
  route_family text check (char_length(route_family) <= 80 and route_family ~ '^/' and route_family !~ '[0-9?#&=]'),
  message      text check (char_length(message) <= 500),
  stack        text check (char_length(stack) <= 16384),
  symbolicated boolean not null default false,
  session_hash text not null check (session_hash ~ '^[a-f0-9]{32}$'),
  is_test      boolean not null default false,
  -- Sin personas ni secretos aunque alguien se salte el tapado de la app: ni correos, ni teléfonos, ni cadenas de consulta, ni tarjetas o SSN.
  check (coalesce(message, '') || ' ' || coalesce(stack, '') !~* '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}'),
  check (coalesce(message, '') || ' ' || coalesce(stack, '') !~ '(\+?1[ .-]?)?\(?[0-9]{3}\)?[ .-][0-9]{3}[ .-][0-9]{4}'),
  check (coalesce(message, '') || ' ' || coalesce(stack, '') !~ '[?&][A-Za-z_]+='),
  check (not texto_con_secretos(message) and not texto_con_secretos(stack))
);
create index if not exists app_error_events_at on app_error_events using brin (at);
create index if not exists app_error_events_grupo on app_error_events (group_id, at desc);
create index if not exists app_error_events_sesion on app_error_events (group_id, session_hash);

-- El grupo nace en cero; sus cifras las escribe SOLO el trigger de los eventos (pg_trigger_depth() > 1). El equipo cambia el estado.
create or replace function app_error_groups_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'un grupo de errores no se borra'; end if;
  if tg_op = 'INSERT' then
    new.count := 0; new.users_n := 0; new.first_seen := now(); new.last_seen := now(); new.first_build := null; new.last_build := null;
    new.status := 'nuevo'; new.resolved_in_build := null; new.regressed_at := null; new.status_by := null; new.status_at := null; new.status_reason := null;
    return new;
  end if;
  if (new.fingerprint, new.app, new.platform, new.kind, new.title) is distinct from (old.fingerprint, old.app, old.platform, old.kind, old.title) then
    raise exception 'app_error_groups: la huella, la app y el título no cambian';
  end if;
  if pg_trigger_depth() <= 1 and (new.count, new.users_n, new.first_seen, new.last_seen, new.first_build, new.last_build, new.regressed_at)
     is distinct from (old.count, old.users_n, old.first_seen, old.last_seen, old.first_build, old.last_build, old.regressed_at) then
    raise exception 'app_error_groups: las cifras de un grupo son derivadas (las escribe la base al llegar un error), no se editan';
  end if;
  return new;
end $$;
drop trigger if exists app_error_groups_antes on app_error_groups;
create trigger app_error_groups_antes before insert or update or delete on app_error_groups for each row execute function app_error_groups_antes();

-- ¿Este build es más nuevo que el del arreglo? Números (apps) se comparan como números; un commit (web) distinto del del arreglo cuenta como nuevo.
create or replace function error_build_posterior(nuevo text, arreglo text) returns boolean language sql immutable as $$
  select case when nuevo is null or arreglo is null then false
              when nuevo ~ '^[0-9]{1,9}$' and arreglo ~ '^[0-9]{1,9}$' then nuevo::bigint > arreglo::bigint
              else nuevo <> arreglo end
$$;

create or replace function app_error_events_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' then raise exception 'app_error_events es solo de inserción'; end if;
  if tg_op = 'DELETE' then
    -- Solo la purga por retención: lo que pasó de errores_retener_dias.
    if old.at >= now() - make_interval(days => cfg_int('errores_retener_dias')) then raise exception 'app_error_events: solo se purga lo vencido (errores_retener_dias)'; end if;
    return old;
  end if;
  new.at := now();
  return new;
end $$;
drop trigger if exists app_error_events_antes on app_error_events;
create trigger app_error_events_antes before insert or update or delete on app_error_events for each row execute function app_error_events_antes();

create or replace function app_error_events_grupo() returns trigger language plpgsql as $$
declare nueva_sesion boolean;
begin
  nueva_sesion := not exists (select 1 from app_error_events e where e.group_id = new.group_id and e.session_hash = new.session_hash and e.id <> new.id);
  update app_error_groups g set
    count = g.count + 1,
    users_n = g.users_n + case when nueva_sesion then 1 else 0 end,
    last_seen = greatest(g.last_seen, new.at),
    first_build = coalesce(g.first_build, new.release),
    last_build = coalesce(new.release, g.last_build),
    -- Regresión: resuelto en el build N y vuelve en uno posterior → «nuevo» otra vez (y «Errores en vivo» avisa).
    status = case when g.status = 'resuelto' and error_build_posterior(new.release, g.resolved_in_build) then 'nuevo' else g.status end,
    resolved_in_build = case when g.status = 'resuelto' and error_build_posterior(new.release, g.resolved_in_build) then null else g.resolved_in_build end,
    regressed_at = case when g.status = 'resuelto' and error_build_posterior(new.release, g.resolved_in_build) then now() else g.regressed_at end
  where g.id = new.group_id;
  return null;
end $$;
drop trigger if exists app_error_events_grupo on app_error_events;
create trigger app_error_events_grupo after insert on app_error_events for each row execute function app_error_events_grupo();

-- La purga (la corre el barrido central): hasta `lim` eventos vencidos por pasada.
create or replace function errores_purgar(lim integer default 5000) returns integer language plpgsql as $$
declare n integer;
begin
  with v as (select id from app_error_events where at < now() - make_interval(days => cfg_int('errores_retener_dias')) order by at limit lim),
       d as (delete from app_error_events e using v where e.id = v.id returning 1)
  select count(*) into n from d;
  return n;
end $$;

-- «Errores en vivo»: una alerta por grupo, tipo y build (solo inserción).
create table if not exists app_error_alerts (
  id         bigint generated always as identity primary key,
  group_id   bigint not null references app_error_groups (id),
  kind       text not null check (kind in ('nuevo', 'pico', 'regresion')),
  release    text not null default '' check (char_length(release) <= 40),
  events_n   integer not null default 0 check (events_n >= 0),
  notified_n integer not null default 0 check (notified_n >= 0),
  at         timestamptz not null default now(),
  unique (group_id, kind, release)
);
create index if not exists app_error_alerts_at on app_error_alerts (at desc);
create or replace function app_error_alerts_antes() returns trigger language plpgsql as $$
begin
  if tg_op <> 'INSERT' then raise exception 'app_error_alerts es solo de inserción'; end if;
  new.at := now();
  return new;
end $$;
drop trigger if exists app_error_alerts_antes on app_error_alerts;
create trigger app_error_alerts_antes before insert or update or delete on app_error_alerts for each row execute function app_error_alerts_antes();

-- ── Soporte: «Reportar un problema» ──
alter table support_cases drop constraint if exists support_cases_origin_check;
alter table support_cases add constraint support_cases_origin_check check (origin in ('form', 'panel', 'compa', 'reporte_app'));
create index if not exists support_cases_reporte on support_cases (created_at desc) where origin = 'reporte_app';

create table if not exists support_case_logs (
  id        bigint generated always as identity primary key,
  case_id   bigint not null references support_cases (id),
  city_id   text references cities (id),
  kind      text not null check (kind in ('registro_app', 'captura')),
  body      jsonb not null check (jsonb_typeof(body) = 'object' and pg_column_size(body) <= 33000),
  at        timestamptz not null default now(),
  purged_at timestamptz,
  check (not texto_con_secretos(body::text)),
  check (body::text !~* '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}')
);
create unique index if not exists support_case_logs_uno on support_case_logs (case_id, kind);
create or replace function support_case_logs_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'support_case_logs es solo de inserción'; end if;
  if tg_op = 'INSERT' then
    if new.purged_at is not null then raise exception 'un registro nace vivo'; end if;
    new.at := now();
    return new;
  end if;
  -- La única actualización: la purga D5 (vaciar una vez, con su fecha).
  if old.purged_at is null and new.purged_at is not null and new.body = '{}'::jsonb
     and (to_jsonb(new) - array['body', 'purged_at']) = (to_jsonb(old) - array['body', 'purged_at']) then
    new.purged_at := now();
    return new;
  end if;
  raise exception 'support_case_logs es solo de inserción';
end $$;
drop trigger if exists support_case_logs_antes on support_case_logs;
create trigger support_case_logs_antes before insert or update or delete on support_case_logs for each row execute function support_case_logs_antes();

-- D5 (7i): vaciar un caso de una cuenta borrada vacía también su registro técnico. Igual que 0124 más la línea de support_case_logs.
create or replace function soporte_purgar_casos(ids bigint[]) returns integer language plpgsql as $$
declare n integer;
begin
  if coalesce(cardinality(ids), 0) = 0 then return 0; end if;
  update support_messages set body = null, purged_at = now() where case_id = any (ids) and purged_at is null;
  update compa_drafts set summary = null, draft = null, next_step = null, purged_at = now() where case_id = any (ids) and purged_at is null;
  update support_case_logs set body = '{}'::jsonb, purged_at = now() where case_id = any (ids) and purged_at is null;
  with p as (update support_cases set summary = null, device = null, purged_at = now() where id = any (ids) and purged_at is null returning 1) select count(*) into n from p;
  return n;
end $$;

-- ── Configuración › Apps ──
insert into config_keys (key, min, max, def, unit, section, label, help, editable, bloqueo, edit_in, sort) values
  ('errores_retener_dias', 7, 365, 90, '{"es":"días","en":"days"}', 'apps', '{"es":"Errores · días que se guarda cada uno","en":"Errors · days each one is kept"}',
    '{"es":"Pasado este tiempo, el barrido borra cada error y cierre guardado (los grupos quedan con sus cifras).","en":"After this time, the sweep deletes each stored error and crash (groups keep their numbers)."}', true, null, null, 340),
  ('errores_por_minuto', 60, 100000, 600, '{"es":"por minuto","en":"per minute"}', 'apps', '{"es":"Errores · tope por minuto","en":"Errors · cap per minute"}',
    '{"es":"Lo máximo que se recibe por minuto en todo el sistema; lo demás se descarta (y se cuenta).","en":"The most received per minute across the system; the rest is dropped (and counted)."}', true, null, null, 341),
  ('errores_por_dispositivo', 5, 600, 30, '{"es":"por minuto","en":"per minute"}', 'apps', '{"es":"Errores · tope por teléfono","en":"Errors · cap per phone"}',
    '{"es":"Lo máximo que un teléfono o navegador manda por minuto (una misma conexión, cuatro veces esto).","en":"The most one phone or browser sends per minute (one connection, four times this)."}', true, null, null, 342),
  ('errores_pico_n', 5, 10000, 50, '{"es":"errores en 10 min","en":"errors in 10 min"}', 'apps', '{"es":"Errores en vivo · pico","en":"Live errors · spike"}',
    '{"es":"Un grupo con al menos esto en 10 minutos en un mismo build (y cinco veces lo de la hora anterior) avisa al equipo una vez.","en":"A group with at least this in 10 minutes on one build (and five times the previous hour) alerts the team once."}', true, null, null, 343),
  ('reporte_logs_kb', 4, 32, 32, '{"es":"KB","en":"KB"}', 'apps', '{"es":"Reportar un problema · registro máximo","en":"Report a problem · max log"}',
    '{"es":"Lo máximo del registro técnico que acompaña un reporte (las últimas pantallas y errores, sin lo que la persona escribió).","en":"The most of the technical log sent with a report (the last screens and errors, without what the person typed)."}', true, null, null, 344),
  ('beta_agitar', 0, 1, 1, '{"es":"1 = sí · 0 = no","en":"1 = yes · 0 = no"}', 'apps', '{"es":"Agitar para reportar (builds de prueba)","en":"Shake to report (test builds)"}',
    '{"es":"En las apps de prueba (contra el sandbox), agitar el teléfono abre «Reportar un problema» con la captura de esa pantalla. En producción no existe.","en":"In test apps (against the sandbox), shaking the phone opens «Report a problem» with a capture of that screen. It does not exist in production."}', true, null, null, 345),
  ('apk_enlace_horas', 1, 168, 48, '{"es":"horas","en":"hours"}', 'apps', '{"es":"APK propio · el enlace vale","en":"Own APK · the link is valid"}',
    '{"es":"El enlace de un uso para bajar el APK de prueba vence pasado este tiempo.","en":"The one-use link to download the test APK expires after this time."}', true, null, null, 346)
on conflict (key) do update set min = excluded.min, max = excluded.max, def = excluded.def, unit = excluded.unit, section = excluded.section,
  label = excluded.label, help = excluded.help, editable = excluded.editable, bloqueo = excluded.bloqueo, edit_in = excluded.edit_in, sort = excluded.sort;

-- ── Interruptores (sandbox encendidos; producción: Fase 9) ──
insert into feature_flags (key, enabled, note) values
  ('app.reportar', true, 'Apps · «Reportar un problema» (apagado: Soporte de siempre)'),
  ('app.errores', true, 'Apps · recibir errores y cierres (apagado: se descartan)')
on conflict (key) do nothing;

-- ── Avisos ──
insert into notif_templates (key, grp, pref, sms, title, body) values
  ('err_vivo', 'mod', null, false, '{"es":"Errores en vivo: {que}","en":"Live errors: {que}"}',
    '{"es":"{titulo} · {app} · build {build}. Míralo en Sistema › Apps › Salud.","en":"{titulo} · {app} · build {build}. See it in System › Apps › Health."}'),
  ('beta_testflight', 'tx', null, false, '{"es":"Te invitamos a probar {app}","en":"You are invited to test {app}"}',
    '{"es":"Te llega un correo de Apple para unirte al equipo de To''Latino. Después, TestFlight te deja instalar la app de prueba.","en":"You will get an email from Apple to join the To''Latino team. Then TestFlight lets you install the test app."}'),
  ('beta_apk', 'tx', null, false, '{"es":"Te invitamos a probar {app}","en":"You are invited to test {app}"}',
    '{"es":"Abre este aviso en tu teléfono Android para bajar la app de prueba. El enlace sirve una vez y vence en {horas} h.","en":"Open this notice on your Android phone to download the test app. The link works once and expires in {horas} h."}'),
  ('beta_quitado', 'tx', null, false, '{"es":"Terminó tu prueba de {app}","en":"Your {app} test ended"}',
    '{"es":"Ya no estás en las pruebas de {app}. Gracias por ayudarnos.","en":"You are no longer testing {app}. Thanks for helping us."}')
on conflict (key) do nothing;

commit;
