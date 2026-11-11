-- 0131 · Fase 8 · 8h · La tubería de las tiendas: llaves por OIDC, builds desde el CI, envíos a las tiendas y «Pedir un build»
-- (docs/diseno/plan/fase8-apps.md §2 «0132 tiendas_tuberia», §3.5, §4 8h).
-- NUMERACIÓN: el plan decía 0132. La última confirmada es 0130 (8d) y 8b (que tomaría otra en el papel) espera el dominio: 8h toma 0131.
-- Nada asume números contiguos (migrar.sh registra cada archivo por su nombre). Anotado en el plan y en REVISION.
-- · ci_oidc_jti: cada token OIDC de GitHub que entró, por su jti (pk): el mismo token NO se usa dos veces (la inserción es la prueba, atómica).
--   Solo inserción; el barrido purga los vencidos hace más de un día (un token vencido ya no entra por su exp).
-- · ci_oidc_log: cada intento contra la tubería (bien o rechazado, con el motivo), SOLO inserción. Lo que dice el token se anota solo si la
--   firma de GitHub ya verificó; sin firma buena no se guarda nada que mande quien llama (salvo el motivo).
-- · store_submissions: cada envío a una tienda, SOLO inserción. Los de la Fase 9 («revision_publica», «lanzamiento») los RECHAZA la base
--   mientras el interruptor app.tiendas.publico esté apagado (y piden la referencia del OK del fundador). TestFlight solo con un build de
--   TestFlight interno; Play interno solo con uno de Play interno.
-- · app_builds (0127) suma: symbols_key (dSYM / mapping.txt en el almacén privado), bundle_key (el .aab, privado), request_id (el «Pedir un
--   build» que lo lanzó) y store_build_id (el id del build en App Store Connect). Se ponen una vez. Y el sabor «produccion» o el canal «tienda»
--   no nacen mientras app.tiendas.publico esté apagado (guardián tiendaSoloProduccion).
-- · build_requests: «Pedir un build» (Super Admin › Sistema › Apps › Versiones): qué app, qué plataforma, quién, por qué y qué contestó GitHub.
--   No se borra; el estado solo avanza.
-- · store_secrets.kind suma 'github_token' (el token del fundador que lanza el workflow_dispatch; vive en el llavero como las demás).
-- · Configuración › Apps: tiendas_pedidos_hora, tiendas_oidc_fallos_min, tiendas_archivo_mb. Interruptores app.tiendas.tuberia (encendido;
--   apagado = la tubería no entrega nada) y app.tiendas.publico (APAGADO hasta la Fase 9).
-- Idempotente: se puede aplicar dos veces. Nada se borra salvo los jti vencidos.
begin;

-- ── El llavero: el token de GitHub para «Pedir un build» ──
alter table store_secrets drop constraint if exists store_secrets_kind_check;
alter table store_secrets add constraint store_secrets_kind_check check (kind in ('asc_api_key', 'apns_key', 'fcm_service_account', 'play_service_account',
  'android_upload_keystore', 'ios_dist_cert', 'pass_type_cert', 'google_wallet_sa', 'pass_type_csr', 'github_token'));

-- ── Interruptores ──
insert into feature_flags (key, enabled, note) values
  ('app.tiendas.tuberia', true, 'Apps · la tubería de las tiendas entrega llaves y recibe builds del CI (apagado: no entrega nada)'),
  ('app.tiendas.publico', false, 'Apps · envíos a revisión pública y lanzamientos en las tiendas: SOLO en la Fase 9, con el OK del fundador')
on conflict (key) do nothing;

-- ── El mismo token no entra dos veces ──
create table if not exists ci_oidc_jti (
  jti     text primary key check (char_length(jti) between 8 and 200 and jti ~ '^[A-Za-z0-9._:-]+$'),
  exp     timestamptz not null,
  run_id  text check (run_id ~ '^[0-9]{1,20}$'),
  para    text not null check (para in ('llaves', 'build', 'archivo')),
  at      timestamptz not null default now()
);
create index if not exists ci_oidc_jti_exp on ci_oidc_jti (exp);
create or replace function ci_oidc_jti_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' then raise exception 'ci_oidc_jti: un jti usado no cambia'; end if;
  -- Solo se purga lo vencido hace más de un día (un token vencido ya no entra por su exp; su jti ya no hace falta).
  if tg_op = 'DELETE' then
    if old.exp > now() - interval '1 day' then raise exception 'ci_oidc_jti: un jti vivo no se borra'; end if;
    return old;
  end if;
  new.at := now();
  return new;
end $$;
drop trigger if exists ci_oidc_jti_antes on ci_oidc_jti;
create trigger ci_oidc_jti_antes before insert or update or delete on ci_oidc_jti for each row execute function ci_oidc_jti_antes();
create or replace function ci_oidc_purgar() returns integer language plpgsql as $$
declare n integer;
begin
  with d as (delete from ci_oidc_jti where exp < now() - interval '1 day' returning 1) select count(*)::int into n from d;
  return n;
end $$;

-- ── Cada intento, bien o rechazado (solo inserción) ──
create table if not exists ci_oidc_log (
  id          bigint generated always as identity primary key,
  at          timestamptz not null default now(),
  ok          boolean not null,
  motivo      text not null check (motivo in ('ok', 'sin_https', 'sin_token', 'mal_formado', 'alg', 'kid', 'firma', 'jwks', 'iss', 'aud', 'sub', 'repo',
                'dueno', 'entorno', 'rama', 'evento', 'flujo', 'runner', 'pr', 'vencido', 'antes_de_tiempo', 'vida', 'jti', 'jti_repetido', 'limite',
                'apagado', 'pedido_invalido', 'build_ajeno', 'sin_llave', 'error')),
  para        text not null check (para in ('llaves', 'build', 'archivo')),
  -- Lo que dice el token, SOLO si su firma de GitHub verificó (si no, null: no se guarda lo que manda cualquiera).
  repo        text check (char_length(repo) <= 140),
  ref         text check (char_length(ref) <= 200),
  environment text check (char_length(environment) <= 80),
  event_name  text check (char_length(event_name) <= 40),
  run_id      text check (run_id ~ '^[0-9]{1,20}$'),
  sha         text check (sha ~ '^[a-f0-9]{40}$'),
  detalle     text check (char_length(detalle) <= 200),
  check (ok = (motivo = 'ok'))
);
create index if not exists ci_oidc_log_at on ci_oidc_log (at desc);
create index if not exists ci_oidc_log_fallos on ci_oidc_log (at desc) where not ok;
create or replace function ci_oidc_log_antes() returns trigger language plpgsql as $$
begin
  if tg_op <> 'INSERT' then raise exception 'ci_oidc_log es solo de inserción'; end if;
  new.at := now();
  return new;
end $$;
drop trigger if exists ci_oidc_log_antes on ci_oidc_log;
create trigger ci_oidc_log_antes before insert or update or delete on ci_oidc_log for each row execute function ci_oidc_log_antes();

-- ── «Pedir un build» ──
create table if not exists build_requests (
  id           bigint generated always as identity primary key,
  app          text not null check (app in ('todas', 'cliente', 'negocio', 'delivery', 'checkin')),
  platform     text not null check (platform in ('ambas', 'ios', 'android')),
  ref          text not null default 'pruebas' check (ref in ('pruebas', 'produccion')),
  reason       text not null check (char_length(reason) between 3 and 300),
  requested_by uuid not null references users (id),
  at           timestamptz not null default now(),
  status       text not null default 'pendiente' check (status in ('pendiente', 'enviado', 'sin_llave', 'error', 'corriendo', 'terminado')),
  sent_at      timestamptz,
  result       text check (char_length(result) <= 200),
  is_test      boolean not null default false
);
create index if not exists build_requests_at on build_requests (at desc);
create or replace function build_requests_antes() returns trigger language plpgsql as $$
declare
  orden constant text[] := array['pendiente', 'enviado', 'corriendo', 'terminado'];
begin
  if tg_op = 'DELETE' then raise exception 'un pedido de build no se borra'; end if;
  if tg_op = 'INSERT' then
    if new.status <> 'pendiente' then raise exception 'un pedido de build nace pendiente'; end if;
    -- produccion: solo con app.tiendas.publico (Fase 9).
    if new.ref = 'produccion' and not coalesce((select enabled from feature_flags where key = 'app.tiendas.publico'), false) then
      raise exception 'tienda_solo_produccion: un build de producción espera la Fase 9 (app.tiendas.publico apagado)';
    end if;
    new.at := now();
    return new;
  end if;
  if (new.app, new.platform, new.ref, new.reason, new.requested_by, new.at, new.is_test) is distinct from (old.app, old.platform, old.ref, old.reason, old.requested_by, old.at, old.is_test) then
    raise exception 'build_requests: qué se pidió, quién y por qué no cambian';
  end if;
  if new.status is distinct from old.status then
    if old.status in ('sin_llave', 'error', 'terminado') then raise exception 'build_requests: un pedido % ya no cambia', old.status; end if;
    if new.status in ('sin_llave', 'error') and old.status <> 'pendiente' then raise exception 'build_requests: solo un pedido pendiente queda sin llave o con error'; end if;
    if new.status in ('pendiente', 'enviado', 'corriendo', 'terminado') and array_position(orden, new.status) <= array_position(orden, old.status) then
      raise exception 'build_requests: el estado solo avanza (% → %)', old.status, new.status;
    end if;
    if new.status = 'enviado' then new.sent_at := now(); end if;
  end if;
  return new;
end $$;
drop trigger if exists build_requests_antes on build_requests;
create trigger build_requests_antes before insert or update or delete on build_requests for each row execute function build_requests_antes();

-- ── app_builds (0127): símbolos, el .aab, el pedido y el id de App Store Connect; producción solo en la Fase 9 ──
alter table app_builds add column if not exists symbols_key text check (symbols_key ~ '^privado/simbolos/[a-z0-9-]{3,80}\.(zip|txt)$');
alter table app_builds add column if not exists bundle_key text check (bundle_key ~ '^privado/aab/[a-z0-9-]{3,80}\.aab$');
alter table app_builds add column if not exists request_id bigint references build_requests (id);
alter table app_builds add column if not exists store_build_id text check (store_build_id ~ '^[A-Za-z0-9-]{1,80}$');
create or replace function app_builds_antes() returns trigger language plpgsql as $$
declare ultimo integer;
  orden constant text[] := array['compilando', 'subido', 'procesando', 'disponible'];
begin
  if tg_op = 'DELETE' then raise exception 'un build no se borra (se retira, con motivo)'; end if;
  if tg_op = 'INSERT' then
    -- 8h · El sabor de producción y la tienda pública esperan la Fase 9 (app.tiendas.publico).
    if (new.flavor = 'produccion' or new.channel = 'tienda') and not coalesce((select enabled from feature_flags where key = 'app.tiendas.publico'), false) then
      raise exception 'tienda_solo_produccion: el sabor de producción y la tienda pública esperan la Fase 9 (app.tiendas.publico apagado)';
    end if;
    -- Creciente por app, plataforma y canal (lo que Apple y Google exigen; el CI no puede volver atrás).
    select max(build) into ultimo from app_builds where app = new.app and platform = new.platform and channel = new.channel;
    if ultimo is not null and new.build <= ultimo then raise exception 'build_no_creciente: % no es mayor que % (%, %, %)', new.build, ultimo, new.app, new.platform, new.channel; end if;
    if new.status = 'retirado' then raise exception 'un build nace vivo'; end if;
    new.created_at := now(); new.updated_at := now();
    return new;
  end if;
  -- Lo que identifica al build no cambia; el archivo, los símbolos, el .aab, el pedido y el id de la tienda, una vez puestos, tampoco.
  if (new.app, new.platform, new.version, new.build, new.channel, new.flavor, new.created_at, new.is_test)
     is distinct from (old.app, old.platform, old.version, old.build, old.channel, old.flavor, old.created_at, old.is_test)
     or (old.commit_sha is not null and new.commit_sha is distinct from old.commit_sha)
     or (old.sha256 is not null and new.sha256 is distinct from old.sha256)
     or (old.artifact_key is not null and new.artifact_key is distinct from old.artifact_key)
     or (old.symbols_key is not null and new.symbols_key is distinct from old.symbols_key)
     or (old.bundle_key is not null and new.bundle_key is distinct from old.bundle_key)
     or (old.request_id is not null and new.request_id is distinct from old.request_id)
     or (old.store_build_id is not null and new.store_build_id is distinct from old.store_build_id)
     or (old.ci_run_url is not null and new.ci_run_url is distinct from old.ci_run_url) then
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
create index if not exists app_builds_vivos on app_builds (status, updated_at) where status in ('compilando', 'subido', 'procesando');

-- ── Envíos a las tiendas (solo inserción; la Fase 9 la rechaza la base) ──
create table if not exists store_submissions (
  id             bigint generated always as identity primary key,
  build_id       bigint not null references app_builds (id),
  kind           text not null check (kind in ('testflight', 'play_interno', 'revision_publica', 'lanzamiento')),
  by_kind        text not null check (by_kind in ('ci', 'servidor', 'equipo')),
  by_user        uuid references users (id),
  founder_ok_ref text check (char_length(founder_ok_ref) between 3 and 200),
  result         text not null check (result in ('enviado', 'aceptado', 'rechazado', 'error')),
  detail         text check (char_length(detail) <= 300),
  at             timestamptz not null default now(),
  check ((by_kind = 'equipo') = (by_user is not null))
);
create index if not exists store_submissions_build on store_submissions (build_id, at desc);
create or replace function store_submissions_antes() returns trigger language plpgsql as $$
declare b record;
begin
  if tg_op <> 'INSERT' then raise exception 'store_submissions es solo de inserción'; end if;
  select channel, flavor into b from app_builds where id = new.build_id;
  if new.kind in ('revision_publica', 'lanzamiento') then
    -- Fase 9: solo con el interruptor encendido, con el OK del fundador y con un build de producción para la tienda.
    if not coalesce((select enabled from feature_flags where key = 'app.tiendas.publico'), false) then
      raise exception 'tienda_solo_produccion: % espera la Fase 9 (app.tiendas.publico apagado)', new.kind;
    end if;
    if new.founder_ok_ref is null then raise exception 'tienda_solo_produccion: % pide la referencia del OK del fundador', new.kind; end if;
    if b.channel <> 'tienda' or b.flavor <> 'produccion' then raise exception 'tienda_solo_produccion: % solo con un build de producción para la tienda', new.kind; end if;
  elsif new.kind = 'testflight' and b.channel <> 'testflight_interno' then
    raise exception 'store_submissions: TestFlight solo con un build de TestFlight interno';
  elsif new.kind = 'play_interno' and b.channel <> 'play_interno' then
    raise exception 'store_submissions: Play interno solo con un build de Play interno';
  end if;
  new.at := now();
  return new;
end $$;
drop trigger if exists store_submissions_antes on store_submissions;
create trigger store_submissions_antes before insert or update or delete on store_submissions for each row execute function store_submissions_antes();

-- ── Configuración › Apps ──
insert into config_keys (key, min, max, def, unit, section, label, help, editable, bloqueo, edit_in, sort) values
  ('tiendas_pedidos_hora', 1, 20, 4, '{"es":"por hora","en":"per hour"}', 'apps', '{"es":"Tubería · «Pedir un build» por hora","en":"Pipeline · «Request a build» per hour"}',
    '{"es":"Cuántas veces por hora el equipo puede lanzar el CI de las tiendas desde Sistema › Apps (cada build tarda unos 15 minutos por app).","en":"How many times per hour the team can start the store CI from System › Apps (each build takes about 15 minutes per app)."}', true, null, null, 390),
  ('tiendas_oidc_fallos_min', 10, 1000, 60, '{"es":"por minuto","en":"per minute"}', 'apps', '{"es":"Tubería · intentos rechazados por minuto","en":"Pipeline · rejected attempts per minute"}',
    '{"es":"Pasado este número de intentos rechazados en un minuto, la tubería contesta «espera» sin revisar ni anotar más (protege la base).","en":"Past this number of rejected attempts in a minute, the pipeline answers «wait» without checking or logging more (protects the database)."}', true, null, null, 391),
  ('tiendas_archivo_mb', 10, 500, 200, '{"es":"MB","en":"MB"}', 'apps', '{"es":"Tubería · tamaño máximo de un archivo del CI","en":"Pipeline · max size of a CI file"}',
    '{"es":"El APK, el .aab o los símbolos que sube el CI no pueden pasar de este tamaño.","en":"The APK, .aab or symbols the CI uploads cannot be larger than this."}', true, null, null, 392)
on conflict (key) do update set min = excluded.min, max = excluded.max, def = excluded.def, unit = excluded.unit, section = excluded.section,
  label = excluded.label, help = excluded.help, editable = excluded.editable, bloqueo = excluded.bloqueo, edit_in = excluded.edit_in, sort = excluded.sort;

commit;
