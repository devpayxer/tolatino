-- 0125 · Fase 8 · 8a · Las cuatro cáscaras, el puente nativo y el llavero de las tiendas (docs/diseno/plan/fase8-apps.md §2 «0125 apps_base», §4 8a).
-- · app_clients: las cuatro apps (To'Latino · Negocios · Repartidor · Puerta) con sus ids de tienda, su entrada y su alcance. La fuente es
--   apps/mobile/apps.json: esta migración copia sus valores y el guardián appsUnaFuente revisa que coincidan (y que nadie más los escriba).
--   La pausa de cada app NO es una columna: es el interruptor app.cascara.{app} (una sola fuente; con motivo y auditoría en Sistema › Apps).
--   store_ios_id y store_android_url quedan vacíos hasta la Fase 9 (no hay ficha pública).
-- · sessions suma app_version, app_build y os_version (del rótulo TLApp del user-agent; SOLO informativo: nunca da permisos) y un índice
--   (app, platform, last_seen_at desc) para «sesiones activas por app y versión».
-- · app_events suma app y plat (null = la web) y los nombres app_abrir, app_actualizar, permiso_pedido y permiso_respuesta (sin personas).
-- · store_secrets: el LLAVERO de las tiendas. Cada llave es un sobre cifrado (blob_enc: AES-256-GCM con una llave de datos que va envuelta
--   con la del entorno, DATOS_SECRET; nunca en el repo) + su huella sha256 (lo único que se muestra). Una viva por tipo; subir otra retira la
--   anterior con motivo. No se borra: se retira (una vez, con quién y por qué). store_secret_reads: cada lectura (servidor o CI), SOLO inserción.
-- · otp_codes.purpose suma 'llavero': antes de subir una llave, el Super Admin vuelve a pedir el código al teléfono del Admin.
-- · Super Admin: secciones «apps» (Sistema › Apps) e «integ» (Sistema › Integraciones), grupo control. Admin todo; Soporte y Solo lectura ven
--   Apps; Integraciones (las llaves) solo Admin.
-- · Configuración (sección «apps», nueva): app_min_build_{app}_{plataforma} (por debajo → «Actualiza la app»; 0 = sin mínimo) y
--   app_aviso_build_* (por debajo → aviso suave). Se cambian en Sistema › Apps (edit_in = '/admin/sistema/apps': revisa además que el aviso quede sobre el mínimo).
-- · feature_flags app.cascara.{app}: encendidas (apagada = «Esta app está en pausa · Abrir en la web»; para emergencias).
-- Idempotente: se puede aplicar dos veces. Nada se borra.
begin;

-- ── Las cuatro apps ──
create table if not exists app_clients (
  key               text primary key check (key in ('cliente', 'negocio', 'delivery', 'checkin')),
  name              jsonb not null check (name ? 'es' and name ? 'en'),
  bundle_ios        text not null unique check (bundle_ios ~ '^com\.tolatino\.[a-z]+$'),
  package_android   text not null unique check (package_android ~ '^com\.tolatino\.[a-z]+$'),
  entry_path        text not null check (entry_path ~ '^/[a-z/-]*$'),
  scope             text[] not null check (cardinality(scope) between 1 and 20),
  store_ios_id      text check (store_ios_id ~ '^\d{6,12}$'),
  store_android_url text check (store_android_url ~ '^https://play\.google\.com/'),
  sort              smallint not null default 0,
  updated_at        timestamptz not null default now()
);
insert into app_clients (key, name, bundle_ios, package_android, entry_path, scope, sort) values
  ('cliente', '{"es":"To''Latino","en":"To''Latino"}', 'com.tolatino.app', 'com.tolatino.app', '/', '{/}', 1),
  ('negocio', '{"es":"To''Latino Negocios","en":"To''Latino Negocios"}', 'com.tolatino.negocios', 'com.tolatino.negocios', '/panel', '{/panel}', 2),
  ('delivery', '{"es":"To''Latino Repartidor","en":"To''Latino Repartidor"}', 'com.tolatino.repartidor', 'com.tolatino.repartidor', '/repartidor', '{/repartidor}', 3),
  ('checkin', '{"es":"To''Latino Puerta","en":"To''Latino Puerta"}', 'com.tolatino.puerta', 'com.tolatino.puerta', '/puerta', '{/puerta}', 4)
on conflict (key) do update set name = excluded.name, bundle_ios = excluded.bundle_ios, package_android = excluded.package_android, entry_path = excluded.entry_path,
  scope = excluded.scope, sort = excluded.sort, updated_at = now()
  where (app_clients.name, app_clients.bundle_ios, app_clients.package_android, app_clients.entry_path, app_clients.scope, app_clients.sort)
     is distinct from (excluded.name, excluded.bundle_ios, excluded.package_android, excluded.entry_path, excluded.scope, excluded.sort);

-- ── Sesiones: qué app y qué versión (informativo) ──
alter table sessions add column if not exists app_version text check (app_version ~ '^\d{1,3}\.\d{1,3}\.\d{1,3}$');
alter table sessions add column if not exists app_build integer check (app_build between 0 and 999999999);
alter table sessions add column if not exists os_version text check (char_length(os_version) <= 20);
create index if not exists sessions_app_version on sessions (app, platform, last_seen_at desc);

-- ── Analítica propia: app y plataforma, y los eventos de las apps ──
alter table app_events add column if not exists app text check (app in ('cliente', 'negocio', 'delivery', 'checkin'));
alter table app_events add column if not exists plat text check (plat in ('ios', 'android'));
alter table app_events drop constraint if exists app_events_name_check;
alter table app_events add constraint app_events_name_check check (name in ('ver_categoria', 'ver_ficha', 'buscar', 'contactar', 'entrar', 'registrarse', 'publicar_negocio', 'recomendar', 'reclamar', 'reportar_foto', 'pedir_aviso', 'pedir', 'ver_evento', 'rsvp', 'guardar_evento', 'compartir_evento', 'compa_abrir', 'compa_mensaje', 'compa_accion', 'compa_persona', 'app_abrir', 'app_actualizar', 'permiso_pedido', 'permiso_respuesta'));

-- ── El llavero de las tiendas ──
create table if not exists store_secrets (
  id             bigint generated always as identity primary key,
  kind           text not null check (kind in ('asc_api_key', 'apns_key', 'fcm_service_account', 'play_service_account', 'android_upload_keystore', 'ios_dist_cert', 'pass_type_cert', 'google_wallet_sa')),
  version        integer not null check (version >= 1),
  blob_enc       bytea not null check (octet_length(blob_enc) between 60 and 200000),
  meta           jsonb not null default '{}' check (jsonb_typeof(meta) = 'object' and pg_column_size(meta) <= 2000),
  fingerprint    text not null check (fingerprint ~ '^[a-f0-9]{64}$'),
  size_bytes     integer not null check (size_bytes between 1 and 65536),
  expires_on     date,
  uploaded_by    uuid not null references users (id),
  uploaded_at    timestamptz not null default now(),
  retired_at     timestamptz,
  retired_by     uuid references users (id),
  retired_reason text check (char_length(retired_reason) between 3 and 300),
  unique (kind, version),
  check ((retired_at is null) = (retired_by is null) and (retired_at is null) = (retired_reason is null))
);
create unique index if not exists store_secrets_una_viva on store_secrets (kind) where retired_at is null;
create or replace function store_secrets_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'una llave del llavero no se borra (se retira, con motivo)'; end if;
  if tg_op = 'INSERT' then
    if new.retired_at is not null then raise exception 'una llave nace viva'; end if;
    new.uploaded_at := now();
    return new;
  end if;
  -- Retirar: una vez, con quién y motivo; nada más cambia (ni el sobre, ni la huella, ni quién la subió).
  if old.retired_at is null and new.retired_at is not null
     and (to_jsonb(new) - array['retired_at', 'retired_by', 'retired_reason']) = (to_jsonb(old) - array['retired_at', 'retired_by', 'retired_reason']) then
    new.retired_at := now();
    return new;
  end if;
  raise exception 'store_secrets: de una llave solo se retira, una vez';
end $$;
drop trigger if exists store_secrets_antes on store_secrets;
create trigger store_secrets_antes before insert or update or delete on store_secrets for each row execute function store_secrets_antes();

create table if not exists store_secret_reads (
  id        bigint generated always as identity primary key,
  secret_id bigint not null references store_secrets (id),
  by        text not null check (by in ('servidor', 'ci')),
  ci_run    text check (ci_run ~ '^[0-9]{1,20}$'),
  ci_sha    text check (ci_sha ~ '^[a-f0-9]{7,40}$'),
  purpose   text not null check (char_length(purpose) between 3 and 120),
  ok        boolean not null,
  at        timestamptz not null default now()
);
create index if not exists store_secret_reads_secret on store_secret_reads (secret_id, at desc);
create or replace function store_secret_reads_antes() returns trigger language plpgsql as $$
begin
  if tg_op <> 'INSERT' then raise exception 'store_secret_reads es solo de inserción'; end if;
  new.at := now();
  return new;
end $$;
drop trigger if exists store_secret_reads_antes on store_secret_reads;
create trigger store_secret_reads_antes before insert or update or delete on store_secret_reads for each row execute function store_secret_reads_antes();

-- ── Volver a pedir el código antes de subir una llave ──
alter table otp_codes drop constraint if exists otp_codes_purpose_check;
alter table otp_codes add constraint otp_codes_purpose_check check (purpose in ('login', 'phone_change', 'claim_call', 'account_delete', 'llavero'));

-- ── Super Admin › Sistema › Apps e Integraciones (grupo control, después de Sistema) ──
do $$ begin
  if not exists (select 1 from admin_sections where key = 'apps') then
    insert into admin_sections (key, name, grp, icon, sort) values ('apps', '{"es":"Apps","en":"Apps"}', 'control', 'phone', (select coalesce(max(sort), 0) + 1 from admin_sections));
  end if;
  if not exists (select 1 from admin_sections where key = 'integ') then
    insert into admin_sections (key, name, grp, icon, sort) values ('integ', '{"es":"Integraciones","en":"Integrations"}', 'control', 'key', (select coalesce(max(sort), 0) + 1 from admin_sections));
  end if;
end $$;
insert into role_permissions (role, section, action, allowed)
select r.key, s.sec, a, (r.key = 'admin') or (s.sec = 'apps' and a = 'ver' and r.key in ('soporte', 'lectura'))
  from staff_roles r, unnest('{apps,integ}'::text[]) s(sec), unnest('{ver,editar,aprobar,retirar,exportar}'::text[]) a
on conflict (role, section, action) do nothing;

-- ── Configuración › Apps ──
alter table config_keys drop constraint if exists config_keys_section_check;
alter table config_keys add constraint config_keys_section_check check (section in ('comunidad', 'gamificacion', 'salud_pro', 'noche', 'edu', 'fe_inm_autos', 'eventos', 'compa', 'soporte', 'apps'));
insert into config_keys (key, min, max, def, unit, section, label, help, editable, bloqueo, edit_in, sort) values
  ('app_min_build_cliente_ios', 0, 999999, 0, '{"es":"build","en":"build"}', 'apps', '{"es":"To''Latino · iPhone · build mínimo","en":"To''Latino · iPhone · minimum build"}',
    '{"es":"Un build más viejo muestra «Actualiza la app» y no sigue. 0 = sin mínimo.","en":"An older build shows «Update the app» and stops. 0 = no minimum."}', true, null, '/admin/sistema/apps', 300),
  ('app_min_build_cliente_android', 0, 999999, 0, '{"es":"build","en":"build"}', 'apps', '{"es":"To''Latino · Android · build mínimo","en":"To''Latino · Android · minimum build"}',
    '{"es":"Un build más viejo muestra «Actualiza la app» y no sigue. 0 = sin mínimo.","en":"An older build shows «Update the app» and stops. 0 = no minimum."}', true, null, '/admin/sistema/apps', 301),
  ('app_min_build_negocio_ios', 0, 999999, 0, '{"es":"build","en":"build"}', 'apps', '{"es":"Negocios · iPhone · build mínimo","en":"Negocios · iPhone · minimum build"}',
    '{"es":"Un build más viejo muestra «Actualiza la app» y no sigue. 0 = sin mínimo.","en":"An older build shows «Update the app» and stops. 0 = no minimum."}', true, null, '/admin/sistema/apps', 302),
  ('app_min_build_negocio_android', 0, 999999, 0, '{"es":"build","en":"build"}', 'apps', '{"es":"Negocios · Android · build mínimo","en":"Negocios · Android · minimum build"}',
    '{"es":"Un build más viejo muestra «Actualiza la app» y no sigue. 0 = sin mínimo.","en":"An older build shows «Update the app» and stops. 0 = no minimum."}', true, null, '/admin/sistema/apps', 303),
  ('app_min_build_delivery_ios', 0, 999999, 0, '{"es":"build","en":"build"}', 'apps', '{"es":"Repartidor · iPhone · build mínimo","en":"Repartidor · iPhone · minimum build"}',
    '{"es":"Un build más viejo muestra «Actualiza la app» y no sigue. 0 = sin mínimo.","en":"An older build shows «Update the app» and stops. 0 = no minimum."}', true, null, '/admin/sistema/apps', 304),
  ('app_min_build_delivery_android', 0, 999999, 0, '{"es":"build","en":"build"}', 'apps', '{"es":"Repartidor · Android · build mínimo","en":"Repartidor · Android · minimum build"}',
    '{"es":"Un build más viejo muestra «Actualiza la app» y no sigue. 0 = sin mínimo.","en":"An older build shows «Update the app» and stops. 0 = no minimum."}', true, null, '/admin/sistema/apps', 305),
  ('app_min_build_checkin_ios', 0, 999999, 0, '{"es":"build","en":"build"}', 'apps', '{"es":"Puerta · iPhone · build mínimo","en":"Puerta · iPhone · minimum build"}',
    '{"es":"Un build más viejo muestra «Actualiza la app» y no sigue. 0 = sin mínimo.","en":"An older build shows «Update the app» and stops. 0 = no minimum."}', true, null, '/admin/sistema/apps', 306),
  ('app_min_build_checkin_android', 0, 999999, 0, '{"es":"build","en":"build"}', 'apps', '{"es":"Puerta · Android · build mínimo","en":"Puerta · Android · minimum build"}',
    '{"es":"Un build más viejo muestra «Actualiza la app» y no sigue. 0 = sin mínimo.","en":"An older build shows «Update the app» and stops. 0 = no minimum."}', true, null, '/admin/sistema/apps', 307),
  ('app_aviso_build_cliente_ios', 0, 999999, 0, '{"es":"build","en":"build"}', 'apps', '{"es":"To''Latino · iPhone · build de aviso","en":"To''Latino · iPhone · notice build"}',
    '{"es":"Un build más viejo ve arriba «Hay una versión nueva» (se cierra y vuelve a los 7 días). 0 = sin aviso.","en":"An older build sees «There is a new version» at the top (dismissible; back after 7 days). 0 = no notice."}', true, null, '/admin/sistema/apps', 310),
  ('app_aviso_build_cliente_android', 0, 999999, 0, '{"es":"build","en":"build"}', 'apps', '{"es":"To''Latino · Android · build de aviso","en":"To''Latino · Android · notice build"}',
    '{"es":"Un build más viejo ve arriba «Hay una versión nueva» (se cierra y vuelve a los 7 días). 0 = sin aviso.","en":"An older build sees «There is a new version» at the top (dismissible; back after 7 days). 0 = no notice."}', true, null, '/admin/sistema/apps', 311),
  ('app_aviso_build_negocio_ios', 0, 999999, 0, '{"es":"build","en":"build"}', 'apps', '{"es":"Negocios · iPhone · build de aviso","en":"Negocios · iPhone · notice build"}',
    '{"es":"Un build más viejo ve arriba «Hay una versión nueva» (se cierra y vuelve a los 7 días). 0 = sin aviso.","en":"An older build sees «There is a new version» at the top (dismissible; back after 7 days). 0 = no notice."}', true, null, '/admin/sistema/apps', 312),
  ('app_aviso_build_negocio_android', 0, 999999, 0, '{"es":"build","en":"build"}', 'apps', '{"es":"Negocios · Android · build de aviso","en":"Negocios · Android · notice build"}',
    '{"es":"Un build más viejo ve arriba «Hay una versión nueva» (se cierra y vuelve a los 7 días). 0 = sin aviso.","en":"An older build sees «There is a new version» at the top (dismissible; back after 7 days). 0 = no notice."}', true, null, '/admin/sistema/apps', 313),
  ('app_aviso_build_delivery_ios', 0, 999999, 0, '{"es":"build","en":"build"}', 'apps', '{"es":"Repartidor · iPhone · build de aviso","en":"Repartidor · iPhone · notice build"}',
    '{"es":"Un build más viejo ve arriba «Hay una versión nueva» (se cierra y vuelve a los 7 días). 0 = sin aviso.","en":"An older build sees «There is a new version» at the top (dismissible; back after 7 days). 0 = no notice."}', true, null, '/admin/sistema/apps', 314),
  ('app_aviso_build_delivery_android', 0, 999999, 0, '{"es":"build","en":"build"}', 'apps', '{"es":"Repartidor · Android · build de aviso","en":"Repartidor · Android · notice build"}',
    '{"es":"Un build más viejo ve arriba «Hay una versión nueva» (se cierra y vuelve a los 7 días). 0 = sin aviso.","en":"An older build sees «There is a new version» at the top (dismissible; back after 7 days). 0 = no notice."}', true, null, '/admin/sistema/apps', 315),
  ('app_aviso_build_checkin_ios', 0, 999999, 0, '{"es":"build","en":"build"}', 'apps', '{"es":"Puerta · iPhone · build de aviso","en":"Puerta · iPhone · notice build"}',
    '{"es":"Un build más viejo ve arriba «Hay una versión nueva» (se cierra y vuelve a los 7 días). 0 = sin aviso.","en":"An older build sees «There is a new version» at the top (dismissible; back after 7 days). 0 = no notice."}', true, null, '/admin/sistema/apps', 316),
  ('app_aviso_build_checkin_android', 0, 999999, 0, '{"es":"build","en":"build"}', 'apps', '{"es":"Puerta · Android · build de aviso","en":"Puerta · Android · notice build"}',
    '{"es":"Un build más viejo ve arriba «Hay una versión nueva» (se cierra y vuelve a los 7 días). 0 = sin aviso.","en":"An older build sees «There is a new version» at the top (dismissible; back after 7 days). 0 = no notice."}', true, null, '/admin/sistema/apps', 317)
on conflict (key) do update set min = excluded.min, max = excluded.max, def = excluded.def, unit = excluded.unit, section = excluded.section,
  label = excluded.label, help = excluded.help, editable = excluded.editable, bloqueo = excluded.bloqueo, edit_in = excluded.edit_in, sort = excluded.sort;

-- ── Interruptores de cada cáscara (emergencia) ──
insert into feature_flags (key, enabled, note) values
  ('app.cascara.cliente', true, 'App To''Latino'), ('app.cascara.negocio', true, 'App To''Latino Negocios'),
  ('app.cascara.delivery', true, 'App To''Latino Repartidor'), ('app.cascara.checkin', true, 'App To''Latino Puerta')
on conflict (key) do nothing;

commit;
