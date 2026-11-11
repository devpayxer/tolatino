-- 0129 · Fase 8 · 8g · El boleto en Apple Wallet y Google Wallet (docs/diseno/plan/fase8-apps.md §2 «0131 pases_wallet», §4 8g, §6 #15).
-- NUMERACIÓN: el plan decía 0131 (y la semilla 0047_pases.sql). La última confirmada es 0128 (8e) y la última semilla 0046 (8e): 8g toma 0129 y
-- la semilla 0047_pases.sql (esa sí coincide). 8b y 8d esperan el dominio y tomarán las siguientes libres. Nada asume números contiguos.
-- Anotado en el plan y en REVISION.
--
-- Firma y actualizaciones (Opus/high). Lo que pone la base, además de lo que revisa lib/pases/:
-- · ticket_passes: un pase por boleto y plataforma (apple | google), con su número de serie al azar (no dice nada del boleto). El token del
--   servicio web de Apple se guarda SOLO como huella (sha256); el servidor lo vuelve a derivar con la llave del entorno para armar el pase.
--   `version` es DERIVADO: lo sube SOLO pase_tocar() (marca tl.pase), nunca la app; un pase anulado no vuelve.
-- · Todo cambio del boleto toca su pase EN LA MISMA TRANSACCIÓN que lo cambia (guardián paseSigueAlBoleto): triggers en tickets (estado, versión
--   del QR, dueño, nombre), en event_dates (fecha, hora, cancelar) y en events (nombre, lugar, cancelar). Transferido, devuelto, anulado,
--   cambiado de dueño o con la fecha o el evento cancelado → el pase queda ANULADO; lo demás → ACTUALIZADO. NOTIFY 'pases'.
-- · pass_devices / pass_registrations: el servicio web de PassKit (qué teléfono sigue qué pase). El token de push del teléfono va cifrado y con
--   su huella; un registro se da de baja (estado), no se borra. Límite de registros por teléfono por hora (pase_registros_hora) en la base.
-- · pass_log: SOLO inserción (emitido, actualizado, anulado, registrado, baja, aviso, google…), sin personas.
-- · store_secrets suma 'pass_type_csr': la llave privada que el servidor genera para pedir el certificado del Pass Type ID (la solicitud
--   CSR va a Apple; la llave nunca sale del llavero). Al subir el certificado (.cer), se guarda como 'pass_type_cert' y la solicitud se retira.
-- · Configuración › Apps: pase_registros_hora, pase_ws_por_minuto, pase_reintentos, pase_cert_aviso_dias (30). Interruptores app.wallet.apple
--   y app.wallet.google (sandbox encendidos; producción: Fase 9). Aviso al equipo pase_cert_vence.
-- Idempotente: se puede aplicar dos veces. Nada se borra.
begin;

-- ── El llavero suma la llave de la solicitud del certificado del pase ──
alter table store_secrets drop constraint if exists store_secrets_kind_check;
alter table store_secrets add constraint store_secrets_kind_check check (kind in ('asc_api_key', 'apns_key', 'fcm_service_account', 'play_service_account',
  'android_upload_keystore', 'ios_dist_cert', 'pass_type_cert', 'google_wallet_sa', 'pass_type_csr'));

-- ── Los pases ──
create table if not exists ticket_passes (
  id                    bigint generated always as identity primary key,
  ticket_id             bigint not null references tickets (id),
  city_id               text not null references cities (id),
  platform              text not null check (platform in ('apple', 'google')),
  serial                text not null unique check (serial ~ '^[A-Z2-7]{26}$'),
  -- Apple: la huella del token del servicio web (nunca el token) y su generación (el token = HMAC del entorno sobre serie + generación).
  auth_token_hash       text check (auth_token_hash ~ '^[a-f0-9]{64}$'),
  token_gen             smallint not null default 1 check (token_gen between 1 and 1000),
  pass_type_id          text check (pass_type_id ~ '^pass\.[A-Za-z0-9.-]{3,120}$'),
  -- Google: la clase (evento y fecha) y el objeto (el boleto) en la API de Google Wallet.
  google_class_id       text check (google_class_id ~ '^\d{6,25}\.[A-Za-z0-9._-]{1,120}$'),
  google_object_id      text check (google_object_id ~ '^\d{6,25}\.[A-Z2-7]{26}$'),
  google_synced_version integer not null default 0 check (google_synced_version >= 0),
  google_tries          smallint not null default 0 check (google_tries >= 0),
  google_not_before     timestamptz,
  google_error          text check (char_length(google_error) <= 120),
  -- Derivado (solo pase_tocar): sube con cada cambio del boleto, de la fecha o del evento.
  version               integer not null default 1 check (version >= 1),
  issued_to             uuid not null references users (id),
  voided_at             timestamptz,
  void_reason           text check (void_reason in ('boleto', 'dueno', 'fecha', 'evento')),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (ticket_id, platform),
  check ((platform = 'apple') = (auth_token_hash is not null and pass_type_id is not null)),
  check ((platform = 'google') = (google_object_id is not null and google_class_id is not null)),
  check ((voided_at is null) = (void_reason is null)),
  check (google_synced_version <= version)
);
create index if not exists ticket_passes_cambiados_idx on ticket_passes (pass_type_id, updated_at) where platform = 'apple';
create index if not exists ticket_passes_google_idx on ticket_passes (google_not_before) where platform = 'google' and google_synced_version < version;
create index if not exists ticket_passes_ciudad_idx on ticket_passes (city_id, created_at desc);

create or replace function ticket_passes_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'un pase no se borra: se anula'; end if;
  if tg_op = 'INSERT' then
    new.version := 1; new.google_synced_version := 0; new.voided_at := null; new.void_reason := null; new.created_at := now(); new.updated_at := now();
    select t.city_id into new.city_id from tickets t where t.id = new.ticket_id;
    if not exists (select 1 from tickets t join event_dates d on d.id = t.event_date_id join events e on e.id = t.event_id
                    where t.id = new.ticket_id and t.holder_user_id = new.issued_to and t.status in ('valid', 'used')
                      and d.status = 'scheduled' and e.status not in ('cancelled', 'rejected') and d.ends_at > now()) then
      raise exception 'pase: solo para un boleto vivo de quien lo tiene';
    end if;
    return new;
  end if;
  if (new.ticket_id, new.city_id, new.platform, new.serial, new.issued_to, new.created_at, new.pass_type_id, new.google_class_id, new.google_object_id)
     is distinct from (old.ticket_id, old.city_id, old.platform, old.serial, old.issued_to, old.created_at, old.pass_type_id, old.google_class_id, old.google_object_id) then
    raise exception 'pase: lo emitido no cambia';
  end if;
  if (new.version, new.voided_at, new.void_reason) is distinct from (old.version, old.voided_at, old.void_reason) and coalesce(current_setting('tl.pase', true), '') <> 'si' then
    raise exception 'pase: la versión y el estado los lleva la base (pase_tocar)';
  end if;
  if new.version < old.version then raise exception 'pase: la versión solo sube'; end if;
  if old.voided_at is not null and new.voided_at is null then raise exception 'pase: un pase anulado no vuelve'; end if;
  if new.token_gen < old.token_gen then raise exception 'pase: la generación del token solo sube'; end if;
  return new;
end $$;
drop trigger if exists ticket_passes_antes on ticket_passes;
create trigger ticket_passes_antes before insert or update or delete on ticket_passes for each row execute function ticket_passes_antes();

-- ── El servicio web de PassKit: teléfonos y registros ──
create table if not exists pass_devices (
  device_library_id text primary key check (device_library_id ~ '^[A-Za-z0-9-]{8,128}$'),
  push_token_enc    bytea not null check (octet_length(push_token_enc) between 29 and 600),
  push_token_hash   text not null check (push_token_hash ~ '^[a-f0-9]{64}$'),
  created_at        timestamptz not null default now(),
  last_seen_at      timestamptz not null default now(),
  invalid_at        timestamptz,
  invalid_reason    text check (invalid_reason in ('apns', 'admin')),
  check ((invalid_at is null) = (invalid_reason is null))
);
create or replace function pass_devices_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'un teléfono de Wallet no se borra: se marca inválido'; end if;
  return new;
end $$;
drop trigger if exists pass_devices_antes on pass_devices;
create trigger pass_devices_antes before delete on pass_devices for each row execute function pass_devices_antes();

create table if not exists pass_registrations (
  id                bigint generated always as identity primary key,
  device_library_id text not null references pass_devices (device_library_id),
  pass_id           bigint not null references ticket_passes (id),
  city_id           text not null references cities (id),
  created_at        timestamptz not null default now(),
  removed_at        timestamptz,
  removed_reason    text check (removed_reason in ('telefono', 'token_invalido', 'admin')),
  pushed_version    integer not null default 0 check (pushed_version >= 0),
  push_tries        smallint not null default 0 check (push_tries >= 0),
  push_not_before   timestamptz,
  last_push_at      timestamptz,
  last_push_result  text check (last_push_result in ('enviado', 'invalido', 'rechazado', 'limite', 'error', 'sin_cert')),
  check ((removed_at is null) = (removed_reason is null))
);
create unique index if not exists pass_registrations_viva on pass_registrations (device_library_id, pass_id) where removed_at is null;
create index if not exists pass_registrations_pase_idx on pass_registrations (pass_id) where removed_at is null;
create index if not exists pass_registrations_hora_idx on pass_registrations (device_library_id, created_at desc);

-- Un registro no se borra; uno dado de baja no vuelve (se registra otro). Límite por teléfono por hora (pase_registros_hora), en la base.
create or replace function pass_registrations_antes() returns trigger language plpgsql as $$
declare n int;
begin
  if tg_op = 'DELETE' then raise exception 'un registro de Wallet no se borra: se da de baja'; end if;
  if tg_op = 'INSERT' then
    select count(*) into n from pass_registrations where device_library_id = new.device_library_id and created_at > now() - interval '1 hour';
    if n >= cfg_int('pase_registros_hora') then raise exception 'pase: demasiados registros de este teléfono (pase_registros_hora)' using errcode = 'P0429'; end if;
    select p.city_id into new.city_id from ticket_passes p where p.id = new.pass_id;
    new.created_at := now(); new.removed_at := null; new.removed_reason := null; new.pushed_version := 0;
    return new;
  end if;
  if (new.device_library_id, new.pass_id, new.city_id, new.created_at) is distinct from (old.device_library_id, old.pass_id, old.city_id, old.created_at) then raise exception 'pase: un registro no cambia de teléfono ni de pase'; end if;
  if old.removed_at is not null and (new.removed_at is null or new.removed_at <> old.removed_at) then raise exception 'pase: un registro dado de baja no vuelve'; end if;
  if new.pushed_version < old.pushed_version then raise exception 'pase: lo avisado solo sube'; end if;
  return new;
end $$;
drop trigger if exists pass_registrations_antes on pass_registrations;
create trigger pass_registrations_antes before insert or update or delete on pass_registrations for each row execute function pass_registrations_antes();

-- ── El libro de los pases (solo inserción, sin personas) ──
create table if not exists pass_log (
  id      bigint generated always as identity primary key,
  pass_id bigint not null references ticket_passes (id),
  city_id text not null references cities (id),
  action  text not null check (action in ('emitido', 'descargado', 'actualizado', 'anulado', 'registrado', 'baja', 'aviso', 'aviso_fallo', 'google', 'google_fallo', 'enviado')),
  detail  text check (char_length(detail) <= 120),
  at      timestamptz not null default now()
);
create index if not exists pass_log_pase_idx on pass_log (pass_id, at desc);
create index if not exists pass_log_at_brin on pass_log using brin (at);
create or replace function pass_log_inmutable() returns trigger language plpgsql as $$
begin raise exception 'pass_log es solo de inserción'; end $$;
drop trigger if exists pass_log_no_cambia on pass_log;
create trigger pass_log_no_cambia before update or delete on pass_log for each row execute function pass_log_inmutable();

-- ── Evento sensible: el pase va con texto genérico (sin nombre del evento, lugar ni organizador) ──
-- Fe (creencia religiosa), Salud y Niños: la misma regla que el push privado de 8c para esos grupos. Un solo lugar (lib/pases la usa).
create or replace function pase_generico(ev bigint) returns boolean language sql stable as $$
  select coalesce((select e.format = 'fe' or b.category_id in ('NEG-SALUD', 'NEG-NINOS', 'NEG-FE') from events e join businesses b on b.id = e.business_id where e.id = ev), true)
$$;

-- ── Tocar los pases de unos boletos (la ÚNICA que sube la versión o anula) ──
-- Anulado si el boleto ya no vale nunca más (anulado, devuelto, transferido), si cambió de dueño, o si la fecha o el evento se cancelaron.
create or replace function pase_tocar(ids bigint[], porque text) returns integer language plpgsql as $$
declare n int;
begin
  if ids is null or cardinality(ids) = 0 then return 0; end if;
  perform set_config('tl.pase', 'si', true);
  with x as (
    select p.id, p.city_id,
           case when t.status in ('void', 'refunded', 'replaced') then 'boleto'
                when t.holder_user_id is distinct from p.issued_to then 'dueno'
                when e.status = 'cancelled' then 'evento'
                when d.status = 'cancelled' then 'fecha' end as fin
      from ticket_passes p join tickets t on t.id = p.ticket_id join event_dates d on d.id = t.event_date_id join events e on e.id = t.event_id
     where p.ticket_id = any(ids) and p.voided_at is null
     for update of p
  ), u as (
    update ticket_passes p set version = p.version + 1, updated_at = now(), voided_at = case when x.fin is not null then now() end, void_reason = x.fin
      from x where p.id = x.id returning p.id, p.city_id, p.voided_at is not null as anulado
  )
  , l as (
    insert into pass_log (pass_id, city_id, action, detail) select u.id, u.city_id, case when u.anulado then 'anulado' else 'actualizado' end, left(porque, 120) from u returning 1
  )
  select count(*) into n from l;
  perform set_config('tl.pase', '', true);
  if n > 0 then perform pg_notify('pases', ''); end if;
  return n;
end $$;

create or replace function tickets_pase() returns trigger language plpgsql as $$
begin
  if exists (select 1 from ticket_passes where ticket_id = new.id and voided_at is null) then
    perform pase_tocar(array[new.id], case when new.status is distinct from old.status then 'estado: ' || new.status
      when new.qr_ver is distinct from old.qr_ver then 'qr: versión ' || new.qr_ver when new.holder_user_id is distinct from old.holder_user_id then 'dueño' else 'nombre' end);
  end if;
  return null;
end $$;
drop trigger if exists tickets_pase on tickets;
create trigger tickets_pase after update of status, qr_ver, holder_user_id, holder_name on tickets for each row
  when ((new.status, new.qr_ver, new.holder_user_id, new.holder_name) is distinct from (old.status, old.qr_ver, old.holder_user_id, old.holder_name))
  execute function tickets_pase();

create or replace function event_dates_pase() returns trigger language plpgsql as $$
begin
  perform pase_tocar(array(select p.ticket_id from ticket_passes p join tickets t on t.id = p.ticket_id
                            where p.voided_at is null and (t.event_date_id = new.id or (t.event_id = new.event_id and new.id = any(bol_fechas_validas(t.id))))),
                     case when new.status is distinct from old.status then 'fecha: ' || new.status else 'fecha: hora' end);
  return null;
end $$;
drop trigger if exists event_dates_pase on event_dates;
create trigger event_dates_pase after update of starts_at, ends_at, doors_at, local_date, status on event_dates for each row
  when ((new.starts_at, new.ends_at, new.doors_at, new.local_date, new.status) is distinct from (old.starts_at, old.ends_at, old.doors_at, old.local_date, old.status))
  execute function event_dates_pase();

create or replace function events_pase() returns trigger language plpgsql as $$
begin
  perform pase_tocar(array(select p.ticket_id from ticket_passes p join tickets t on t.id = p.ticket_id where p.voided_at is null and t.event_id = new.id),
                     case when new.status is distinct from old.status then 'evento: ' || new.status else 'evento: datos' end);
  return null;
end $$;
drop trigger if exists events_pase on events;
create trigger events_pase after update of title, venue_mode, venue_name, venue_address, status on events for each row
  when ((new.title, new.venue_mode, new.venue_name, new.venue_address, new.status) is distinct from (old.title, old.venue_mode, old.venue_name, old.venue_address, old.status))
  execute function events_pase();

-- ── Configuración › Apps ──
insert into config_keys (key, min, max, def, unit, section, label, help, editable, bloqueo, edit_in, sort) values
  ('pase_registros_hora', 5, 500, 60, '{"es":"registros","en":"registrations"}', 'apps', '{"es":"Wallet · registros por teléfono por hora","en":"Wallet · registrations per phone per hour"}',
    '{"es":"Cuántos pases puede registrar un mismo teléfono en una hora en el servicio de Apple Wallet. Más: la base lo rechaza.","en":"How many passes one phone can register in an hour with the Apple Wallet service. More: the database rejects it."}', true, null, null, 370),
  ('pase_ws_por_minuto', 10, 2000, 120, '{"es":"pedidos","en":"requests"}', 'apps', '{"es":"Wallet · pedidos por minuto por dirección","en":"Wallet · requests per minute per address"}',
    '{"es":"Pedidos por minuto al servicio de Apple Wallet desde una misma dirección de internet. Más: 429.","en":"Requests per minute to the Apple Wallet service from one internet address. More: 429."}', true, null, null, 371),
  ('pase_reintentos', 1, 10, 5, '{"es":"intentos","en":"attempts"}', 'apps', '{"es":"Wallet · reintentos de un aviso","en":"Wallet · retries of an update"}',
    '{"es":"Cuántas veces se reintenta avisarle a un teléfono o a Google que un pase cambió (con espera creciente).","en":"How many times we retry telling a phone or Google that a pass changed (with growing waits)."}', true, null, null, 372),
  ('pase_cert_aviso_dias', 7, 90, 30, '{"es":"días","en":"days"}', 'apps', '{"es":"Wallet · avisar antes de que venza el certificado","en":"Wallet · warn before the certificate expires"}',
    '{"es":"Cuántos días antes de vencer el certificado del pase de Apple se avisa al equipo (vence cada año).","en":"How many days before the Apple pass certificate expires the team is warned (it expires every year)."}', true, null, null, 373)
on conflict (key) do update set min = excluded.min, max = excluded.max, def = excluded.def, unit = excluded.unit, section = excluded.section,
  label = excluded.label, help = excluded.help, editable = excluded.editable, bloqueo = excluded.bloqueo, edit_in = excluded.edit_in, sort = excluded.sort;

-- ── Aviso al equipo: el certificado del pase está por vencer o venció ──
insert into notif_templates (key, grp, pref, sms, title, body) values
  ('pase_cert_vence', 'mod', null, false, '{"es":"El certificado de Apple Wallet vence {cuando}","en":"The Apple Wallet certificate expires {cuando}"}',
    '{"es":"Pass Type ID {tipo}: vence el {fecha}. Renuévalo en Sistema › Integraciones › Wallet; sin él no se emiten ni se actualizan pases de Apple.","en":"Pass Type ID {tipo}: it expires on {fecha}. Renew it in System › Integrations › Wallet; without it Apple passes are not issued or updated."}')
on conflict (key) do nothing;

-- ── Interruptores (sandbox encendidos; producción: Fase 9) ──
insert into feature_flags (key, enabled, note) values
  ('app.wallet.apple', true, 'Apps · el boleto en Apple Wallet (apagado: no se emiten pases nuevos; los emitidos siguen recibiendo cambios)'),
  ('app.wallet.google', true, 'Apps · el boleto en Google Wallet (apagado: no se emiten pases nuevos; los emitidos siguen recibiendo cambios)')
on conflict (key) do nothing;

commit;
