-- 0145 · Fase 9 · 9o · Producción como código y ensayada (docs/diseno/plan/fase9-apertura.md §2 «0145 despliegues», §3.2–§3.5, §4 9o; T#16, PLAN §3.4).
-- · deploy_releases (SOLO INSERCIÓN): cada despliegue terminado, con su commit, la imagen (digest), las migraciones que aplicó, cuándo empezó, cuándo
--   quedó sano y su resultado: 'ok', 'vuelta_atras' (la vigilancia de 10 minutos volvió a la versión anterior sola) o 'fallo' (no llegó a servir: la
--   versión anterior siguió). La escribe el deploy.sh del entorno (infra/comun/registro.sh) al terminar; en producción no entra sin founder_ok_ref
--   (la frase del OK del fundador con su fecha, de la etiqueta ok-produccion/* que deja pasar el commit). Sistema › Despliegues la lee.
-- · incident_log (SOLO INSERCIÓN; de una fila solo se anota el cierre, una vez): cada incidente con su caso del manual (docs/incidentes/), qué se vio
--   y qué se hizo. Lo abren la vuelta atrás, el monitoreo y el equipo; los simulacros del ensayo también (source 'simulacro').
-- · server_keys: las llaves que nacen en el servidor y viven FUERA del llavero (RESPALDO_LLAVE, el certificado de origen de Cloudflare, el token del
--   proveedor, la llave age del servidor y la de recuperación): solo su huella y su vencimiento (nunca la llave). Una huella nueva retira la anterior y
--   deja su fila en key_rotations. El aviso de vencimiento es el mismo `llave_vence` del llavero (lib/sistema/salud.ts).
-- · health_checks suma 'vigia' (el latido del monitoreo externo de la réplica: si calla, el segundo testigo de GitHub Actions avisa).
-- · backup_runs y restore_drills admiten el entorno 'ensayo' (la «producción de mentira» del ensayo, en máquinas desechables).
-- · maintenance_windows.notice_at y announcements.maintenance_id: el aviso a los vecinos antes del mantenimiento (un anuncio por ciudad, el barrido).
-- · despliegues_estado (vista): lo que lee Sistema › Salud y el reporte diario (último despliegue, vueltas atrás de 24 h y 7 días, incidentes abiertos).
-- · vueltas_atras_del_dia(día): el renglón «Vueltas atrás» del reporte diario (9g).
-- · Configuración › Despliegues (sección nueva, agregada a la lista que haya): la vigilancia de 10 minutos y sus umbrales, con límites, y las horas
--   del aviso del mantenimiento. El deploy.sh los lee con cfg_int().
-- · Avisos: despliegue_vuelta (crítico: al equipo, con SMS), respaldo_alerta (crítico: la restauración de prueba falló o no corrió en 8 días) y
--   monitoreo_alerta (crítico: lo que enciende el monitoreo de la réplica; /api/interno/alerta).
-- Idempotente: se puede aplicar dos veces. Nada se borra.
begin;

-- ── Despliegues (solo inserción) ──
create table if not exists deploy_releases (
  id                 bigint generated always as identity primary key,
  entorno            text not null check (entorno in ('pruebas', 'ensayo', 'produccion')),
  commit_sha         text not null check (commit_sha ~ '^[0-9a-f]{7,40}$'),
  previous_sha       text check (previous_sha ~ '^[0-9a-f]{7,40}$'),
  image_digest       text check (image_digest ~ '^sha256:[0-9a-f]{64}$'),
  color              text check (color in ('azul', 'verde', 'unico')),
  migrations_applied text[] not null default '{}' check (cardinality(migrations_applied) <= 200),
  started_at         timestamptz not null,
  healthy_at         timestamptz,
  finished_at        timestamptz not null default now(),
  result             text not null check (result in ('ok', 'vuelta_atras', 'fallo')),
  reason             text check (char_length(reason) between 3 and 500),
  watch              jsonb not null default '{}' check (jsonb_typeof(watch) = 'object' and pg_column_size(watch) <= 4000),
  rollback_s         integer check (rollback_s >= 0),
  founder_ok_ref     text check (char_length(founder_ok_ref) between 10 and 500),
  noticed_at         timestamptz,                         -- el barrido ya avisó de esta vuelta atrás o este fallo (lo único que cambia, una vez)
  is_test            boolean not null default false,
  check (entorno <> 'produccion' or founder_ok_ref is not null),
  check (result = 'ok' or reason is not null),
  check (result = 'fallo' or healthy_at is not null),
  check (healthy_at is null or healthy_at >= started_at),
  check (finished_at >= started_at),
  check (result <> 'vuelta_atras' or rollback_s is not null)
);
create index if not exists deploy_releases_fecha on deploy_releases (entorno, finished_at desc);
create index if not exists deploy_releases_sin_aviso on deploy_releases (finished_at) where result <> 'ok' and noticed_at is null;
create or replace function deploy_releases_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'deploy_releases es solo de inserción'; end if;
  if old.noticed_at is null and new.noticed_at is not null
     and (to_jsonb(new) - 'noticed_at') = (to_jsonb(old) - 'noticed_at') then return new; end if;
  raise exception 'deploy_releases es solo de inserción (solo se anota, una vez, que ya se avisó)';
end $$;
drop trigger if exists deploy_releases_antes on deploy_releases;
create trigger deploy_releases_antes before update or delete on deploy_releases for each row execute function deploy_releases_antes();

-- ── Incidentes (solo inserción; el cierre se anota una vez) ──
create table if not exists incident_log (
  id                bigint generated always as identity primary key,
  entorno           text not null check (entorno in ('pruebas', 'ensayo', 'produccion')),
  started_at        timestamptz not null,
  ended_at          timestamptz,
  severity          text not null check (severity in ('critica', 'alta', 'media', 'baja')),
  kind              text not null check (kind ~ '^[a-z][a-z0-9-]{2,40}$'),
  seen              text not null check (char_length(seen) between 3 and 1000),
  done              text check (char_length(done) between 3 and 1000),
  manual_ref        text check (manual_ref ~ '^docs/incidentes/[a-z0-9-]+\.md$'),
  source            text not null check (source in ('despliegue', 'monitoreo', 'testigo', 'equipo', 'simulacro')),
  deploy_release_id bigint references deploy_releases (id),
  closed_by         uuid references users (id),
  created_at        timestamptz not null default now(),
  is_test           boolean not null default false,
  check (ended_at is null or ended_at >= started_at),
  check (ended_at is null or done is not null)
);
create index if not exists incident_log_fecha on incident_log (entorno, started_at desc);
create index if not exists incident_log_abiertos on incident_log (started_at) where ended_at is null;
create or replace function incident_log_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'incident_log es solo de inserción'; end if;
  if old.ended_at is not null then raise exception 'un incidente cerrado no se vuelve a tocar'; end if;
  if new.ended_at is not null and (to_jsonb(new) - array['ended_at', 'done', 'closed_by']) = (to_jsonb(old) - array['ended_at', 'done', 'closed_by'])
     and (old.done is null or new.done = old.done) then return new; end if;
  raise exception 'incident_log es solo de inserción (solo se anota el cierre, una vez)';
end $$;
drop trigger if exists incident_log_antes on incident_log;
create trigger incident_log_antes before update or delete on incident_log for each row execute function incident_log_antes();

-- ── Llaves que viven fuera del llavero (solo su huella y su vencimiento) ──
create table if not exists server_keys (
  id          bigint generated always as identity primary key,
  entorno     text not null check (entorno in ('pruebas', 'ensayo', 'produccion')),
  key_name    text not null check (key_name in ('respaldo_llave', 'cloudflare_origen', 'proveedor_token', 'age_servidor', 'recuperacion')),
  machine     text not null default 'unica' check (machine ~ '^[a-z][a-z0-9-]{1,30}$'),
  fingerprint text not null check (fingerprint ~ '^[a-f0-9]{16,64}$'),
  expires_on  date,
  created_at  timestamptz not null default now(),
  retired_at  timestamptz,
  unique (entorno, key_name, machine, fingerprint)
);
create unique index if not exists server_keys_viva on server_keys (entorno, key_name, machine) where retired_at is null;
create or replace function server_keys_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'server_keys no se borra: se retira'; end if;
  if old.retired_at is null and new.retired_at is not null and (to_jsonb(new) - 'retired_at') = (to_jsonb(old) - 'retired_at') then return new; end if;
  raise exception 'server_keys: de una llave solo se anota, una vez, que se retiró';
end $$;
drop trigger if exists server_keys_antes on server_keys;
create trigger server_keys_antes before update or delete on server_keys for each row execute function server_keys_antes();
-- Anotar la huella viva de una llave del servidor: si es nueva, retira la anterior y deja la rotación (key_rotations, solo inserción).
create or replace function server_key_anotar(e text, n text, m text, fp text, vence date) returns boolean language plpgsql as $$
declare vieja server_keys;
begin
  select * into vieja from server_keys where entorno = e and key_name = n and machine = m and retired_at is null;
  if found and vieja.fingerprint = fp then return false; end if;
  if found then
    update server_keys set retired_at = now() where id = vieja.id;
    insert into key_rotations (key_name, old_fp, new_fp, reason) values (n, vieja.fingerprint, fp, 'llave del servidor ' || m || ' (' || e || ') reemplazada en el despliegue');
  end if;
  insert into server_keys (entorno, key_name, machine, fingerprint, expires_on) values (e, n, m, fp, vence) on conflict (entorno, key_name, machine, fingerprint) do nothing;
  return true;
end $$;

-- ── Salud: el latido del monitoreo externo ──
do $$
declare d text;
begin
  select pg_get_constraintdef(oid) into d from pg_constraint where conname = 'health_checks_service_check' and conrelid = 'health_checks'::regclass;
  if d is not null and position('''vigia''' in d) = 0 then
    execute 'alter table health_checks drop constraint health_checks_service_check';
    execute 'alter table health_checks add constraint health_checks_service_check ' || replace(d, 'ARRAY[', 'ARRAY[''vigia''::text, ');
  end if;
  -- El ensayo también deja respaldos y restauraciones (con su entorno).
  select pg_get_constraintdef(oid) into d from pg_constraint where conname = 'backup_runs_entorno_check' and conrelid = 'backup_runs'::regclass;
  if d is not null and position('''ensayo''' in d) = 0 then
    execute 'alter table backup_runs drop constraint backup_runs_entorno_check';
    execute 'alter table backup_runs add constraint backup_runs_entorno_check ' || replace(d, 'ARRAY[', 'ARRAY[''ensayo''::text, ');
  end if;
  select pg_get_constraintdef(oid) into d from pg_constraint where conname = 'restore_drills_entorno_check' and conrelid = 'restore_drills'::regclass;
  if d is not null and position('''ensayo''' in d) = 0 then
    execute 'alter table restore_drills drop constraint restore_drills_entorno_check';
    execute 'alter table restore_drills add constraint restore_drills_entorno_check ' || replace(d, 'ARRAY[', 'ARRAY[''ensayo''::text, ');
  end if;
end $$;

-- ── El aviso del mantenimiento a los vecinos (un anuncio por ciudad, una vez) ──
alter table maintenance_windows add column if not exists notice_at timestamptz;
alter table announcements add column if not exists maintenance_id bigint references maintenance_windows (id);
create index if not exists announcements_mantenimiento on announcements (maintenance_id) where maintenance_id is not null;

-- ── Lo que leen Salud, Despliegues y el reporte diario ──
create or replace view despliegues_estado as
  select e.entorno,
         (select row_to_json(x) from (select r.id, r.commit_sha, r.result, r.finished_at, r.healthy_at from deploy_releases r where r.entorno = e.entorno order by r.finished_at desc limit 1) x) as ultimo,
         (select r.commit_sha from deploy_releases r where r.entorno = e.entorno and r.result = 'ok' order by r.finished_at desc limit 1) as ultimo_ok,
         (select count(*)::int from deploy_releases r where r.entorno = e.entorno and r.result = 'vuelta_atras' and r.finished_at > now() - interval '24 hours') as vueltas_24h,
         (select count(*)::int from deploy_releases r where r.entorno = e.entorno and r.result = 'vuelta_atras' and r.finished_at > now() - interval '7 days') as vueltas_7d,
         (select count(*)::int from deploy_releases r where r.entorno = e.entorno and r.result = 'fallo' and r.finished_at > now() - interval '7 days') as fallos_7d,
         (select count(*)::int from incident_log i where i.entorno = e.entorno and i.ended_at is null) as incidentes_abiertos
    from (select distinct entorno from deploy_releases union select distinct entorno from incident_log) e;

create or replace function vueltas_atras_del_dia(dia date) returns integer language sql stable as $$
  select count(*)::int from deploy_releases
   where result = 'vuelta_atras' and not is_test and (finished_at at time zone 'America/New_York')::date = dia
$$;

-- ── Configuración › Despliegues ──
do $$
declare d text;
begin
  select pg_get_constraintdef(oid) into d from pg_constraint where conname = 'config_keys_section_check' and conrelid = 'config_keys'::regclass;
  -- Se agrega «despliegues» a la lista que haya (otro bloque puede haber agregado su sección antes o después): nunca se pierde una.
  if d is not null and position('''despliegues''' in d) = 0 then
    execute 'alter table config_keys drop constraint config_keys_section_check';
    execute 'alter table config_keys add constraint config_keys_section_check ' || replace(d, 'ARRAY[', 'ARRAY[''despliegues''::text, ');
  end if;
end $$;
insert into config_keys (key, min, max, def, unit, section, label, help, editable, bloqueo, edit_in, sort) values
  ('vuelta_vigilancia_min', 5, 30, 10, '{"es":"minutos","en":"minutes"}', 'despliegues', '{"es":"Vigilancia después de cambiar de versión","en":"Watch after switching versions"}',
    '{"es":"Tras pasar la puerta de salud, la versión nueva se vigila este tiempo; si pasa un umbral, vuelve sola a la anterior.","en":"After the health gate, the new version is watched for this long; if a threshold is crossed it goes back to the previous one on its own."}',
    true, null, null, 960),
  ('vuelta_5xx_pct', 1, 20, 2, '{"es":"% de respuestas","en":"% of responses"}', 'despliegues', '{"es":"Vuelta atrás · errores del servidor (5xx)","en":"Rollback · server errors (5xx)"}',
    '{"es":"Si en la vigilancia más de este porcentaje de las respuestas son 5xx (con al menos 50 respuestas), se vuelve atrás.","en":"If during the watch more than this percentage of responses are 5xx (with at least 50 responses), it rolls back."}',
    true, null, null, 961),
  ('vuelta_p95_ms', 300, 5000, 1500, '{"es":"ms (p95)","en":"ms (p95)"}', 'despliegues', '{"es":"Vuelta atrás · lentitud","en":"Rollback · slowness"}',
    '{"es":"Si el p95 del tiempo de respuesta pasa de esto en la vigilancia, se vuelve atrás.","en":"If the p95 response time goes above this during the watch, it rolls back."}',
    true, null, null, 962),
  ('vuelta_errores_nuevos', 1, 100, 5, '{"es":"grupos nuevos","en":"new groups"}', 'despliegues', '{"es":"Vuelta atrás · errores nuevos","en":"Rollback · new errors"}',
    '{"es":"Grupos de errores nuevos (web, apps y servidor) que aparecen en la vigilancia y bastan para volver atrás.","en":"New error groups (web, apps and server) appearing during the watch that are enough to roll back."}',
    true, null, null, 963),
  ('vuelta_salud_fallos', 1, 10, 3, '{"es":"seguidos","en":"in a row"}', 'despliegues', '{"es":"Vuelta atrás · /api/salud falla","en":"Rollback · /api/salud fails"}',
    '{"es":"Respuestas malas seguidas de /api/salud (cada 30 s) que bastan para volver atrás.","en":"Bad /api/salud responses in a row (every 30 s) that are enough to roll back."}',
    true, null, null, 964),
  ('mantenimiento_aviso_h', 1, 72, 24, '{"es":"horas antes","en":"hours before"}', 'despliegues', '{"es":"Mantenimiento · aviso a los vecinos","en":"Maintenance · notice to neighbors"}',
    '{"es":"Este tiempo antes de un mantenimiento programado sale un anuncio en el Inicio de cada ciudad (hasta que termina).","en":"This long before a scheduled maintenance an announcement shows on each city Home (until it ends)."}',
    true, null, null, 965)
on conflict (key) do nothing;

-- ── Avisos ──
insert into notif_templates (key, grp, pref, sms, title, body) values
  ('despliegue_vuelta', 'crit', null, true, '{"es":"Despliegue: {que}","en":"Deploy: {que_en}"}',
    '{"es":"{entorno} · {commit}: {motivo}. La versión anterior sigue sirviendo. Míralo en Sistema › Despliegues.","en":"{entorno} · {commit}: {motivo}. The previous version keeps serving. See it in System › Deploys."}'),
  ('respaldo_alerta', 'crit', null, true, '{"es":"Respaldos: {que}","en":"Backups: {que_en}"}',
    '{"es":"{detalle}. Míralo en Sistema › Respaldos.","en":"{detalle}. See it in System › Backups."}'),
  ('monitoreo_alerta', 'crit', null, true, '{"es":"Alerta: {que_en}","en":"Alert: {que_en}"}',
    '{"es":"{que}. El caso del manual es {caso}. Míralo en Sistema › Despliegues.","en":"{que}. The runbook case is {caso}. See it in System › Deploys."}')
on conflict (key) do nothing;

commit;
