-- 0134 · Fase 9 · 9d · Tus datos: exportar, borrar a los 30 días, retener y fusionar cuentas (docs/diseno/plan/fase9-apertura.md §2 «0134 mis_datos»,
-- §3.7, §4 9d; D5).
-- · data_map: el mapa de datos. Por cada tabla y columna con personas: qué se exporta, qué se borra, qué se vacía, qué se seudonimiza y por qué se
--   guarda. Lo llena la semilla repetible packages/db/seeds/mapa_datos.sql, que sale de packages/db/mapa-de-datos.json (node scripts/datos/mapa.mjs);
--   la app solo lo lee. Una tabla nueva con personas sin su fila rompe el build (guardián mapaDeDatos).
-- · data_exports: el archivo de «Descargar mis datos» (vecino) y «Exportar los datos del negocio» (panel). Uno vivo a la vez por persona o negocio;
--   lo arma el barrido en el almacén privado; se baja UNA vez durante export_vence_h (24 h); uno cada export_cada_dias (7). Nada se borra: vence.
-- · purge_runs y purge_items (SOLO INSERCIÓN): la prueba de que la purga de una cuenta corrió, tabla por tabla, con cuántas filas; nunca el contenido.
-- · account_merges (SOLO INSERCIÓN): una fusión de cuentas aplicada, con quién la pidió y OTRA persona del equipo que la aprobó (la base lo exige).
-- · users.phone queda vacío al purgar o fusionar: el mismo teléfono que vuelve es una cuenta nueva (D5). Lo que las tablas exigían de un texto
--   (largo mínimo de una reseña o una publicación) admite el texto vacío solo en el estado de «quitado» o «borrado».
-- · tl.purga = 'si' (solo dentro de lib/datos/purgar.ts): vaciar el texto de un mensaje entre vecinos de una cuenta borrada (el mensaje sigue
--   siendo de solo inserción para todo lo demás). tl.retencion = 'escaneos' (solo dentro del barrido): un escaneo de la puerta de más de
--   retener_escaneos_meses queda en cifras (sin boleto, sin código, sin dispositivo).
-- · Configuración › Retención: las claves nuevas (export_*, purga_lote, retener_*) con sus límites; plantillas datos_export_listo y cuenta_borrada.
-- · datos_purga_pendiente(cuenta, teléfono): lo que el mapa dice que se borra o se vacía y todavía está (la purga se comprueba con esto; también la
--   prueba de punta a punta y Usuarios 360°).
-- Idempotente: se puede aplicar dos veces. Lo único que borra filas es la purga de D5, por el mapa.
begin;

-- ── El mapa ──
create table if not exists data_map (
  tabla         text not null check (tabla ~ '^[a-z_][a-z0-9_]*$'),
  columna       text not null check (columna ~ '^[a-z_][a-z0-9_]*$'),
  rol           text not null check (rol in ('persona', 'equipo', 'telefono')),
  accion        text not null check (accion in ('borrar', 'vaciar', 'seudonimizar', 'guardar')),
  set_sql       text,                       -- lo que se escribe al vaciar o seudonimizar (sale del mapa, validado por el generador)
  pendiente_sql text,                       -- verdadero si la fila todavía no está vaciada (la purga y su comprobación)
  donde_sql     text,                       -- solo esas filas (p. ej. las fotos personales, no las del negocio)
  porque        jsonb check (porque is null or (porque ? 'es' and porque ? 'en')),
  exporta       text check (exporta ~ '^[a-z0-9_]{2,40}$'),
  fusion        text not null default 'no' check (fusion in ('mover', 'no')),
  fn            text check (fn in ('usuario', 'compa', 'negocios', 'fotos', 'traducciones')),
  derivados     boolean not null default false,
  orden         integer not null,
  primary key (tabla, columna),
  check (accion <> 'vaciar' or set_sql is not null),
  check (accion <> 'guardar' or porque is not null or rol = 'equipo')
);

-- ── Las exportaciones ──
create table if not exists data_exports (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users (id),         -- quién la pidió (y la única persona que la baja)
  business_id   text references businesses (id),             -- exportación del negocio (null = la de la persona)
  city_id       text references cities (id),
  requested_by  uuid references users (id),                  -- null = la persona; si no, la persona del equipo (Usuarios 360°)
  requested_at  timestamptz not null default now(),
  status        text not null default 'pendiente' check (status in ('pendiente', 'armando', 'listo', 'bajado', 'vencido', 'fallo')),
  media_key     text check (media_key ~ '^privado/exportes/[0-9a-f-]{36}\.zip$'),
  sha256        text check (sha256 ~ '^[0-9a-f]{64}$'),
  bytes         integer check (bytes >= 0),
  sections      jsonb not null default '{}',                 -- archivo → filas (sin contenido)
  ready_at      timestamptz,
  expires_at    timestamptz,
  downloaded_at timestamptz,
  file_gone_at  timestamptz,                                 -- el archivo salió del almacén (bajado o vencido)
  ip_hash       text check (ip_hash ~ '^[0-9a-f]{64}$'),
  error         text check (char_length(error) <= 300),
  is_test       boolean not null default false,
  check (status <> 'listo' or (media_key is not null and expires_at is not null and ready_at is not null)),
  check (status <> 'bajado' or downloaded_at is not null)
);
create unique index if not exists data_exports_viva_idx on data_exports (user_id, coalesce(business_id, '')) where status in ('pendiente', 'armando', 'listo');
create index if not exists data_exports_cola_idx on data_exports (requested_at) where status in ('pendiente', 'armando');
create index if not exists data_exports_vence_idx on data_exports (expires_at) where media_key is not null and file_gone_at is null;
create index if not exists data_exports_persona_idx on data_exports (user_id, requested_at desc);
create index if not exists data_exports_negocio_idx on data_exports (business_id, requested_at desc) where business_id is not null;

create or replace function data_exports_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'una exportación no se borra: vence (estados)'; end if;
  if tg_op = 'INSERT' then
    new.requested_at := now(); new.status := 'pendiente'; new.ready_at := null; new.downloaded_at := null; new.media_key := null; new.expires_at := null;
    new.city_id := coalesce(new.city_id, (select home_city_id from users where id = new.user_id));
    return new;
  end if;
  if (new.id, new.user_id, new.business_id, new.requested_at, new.requested_by) is distinct from (old.id, old.user_id, old.business_id, old.requested_at, old.requested_by) then
    raise exception 'de una exportación solo cambia su estado';
  end if;
  -- Un uso: bajado no vuelve a listo; vencido o fallo no vuelven.
  if old.status in ('bajado', 'vencido', 'fallo') and new.status is distinct from old.status and not (old.status = 'bajado' and new.status = 'vencido') then
    raise exception 'una exportación bajada, vencida o fallida no vuelve';
  end if;
  if old.downloaded_at is not null and new.downloaded_at is distinct from old.downloaded_at then raise exception 'el archivo se baja una sola vez'; end if;
  if old.file_gone_at is not null and new.file_gone_at is distinct from old.file_gone_at then raise exception 'el archivo ya salió del almacén'; end if;
  return new;
end $$;
drop trigger if exists data_exports_antes on data_exports;
create trigger data_exports_antes before insert or update or delete on data_exports for each row execute function data_exports_antes();

-- ── La purga: la prueba, tabla por tabla (solo inserción) ──
create table if not exists purge_runs (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references users (id),
  city_id     text references cities (id),
  delete_at   timestamptz,
  started_at  timestamptz not null,
  finished_at timestamptz not null default now(),
  tables_n    integer not null check (tables_n >= 0),
  rows_n      integer not null check (rows_n >= 0),
  pending_n   integer not null check (pending_n >= 0),   -- lo que el mapa dice que se borra y quedó (0 = completa)
  businesses_n integer not null default 0,              -- negocios que quedaron sin dueño («sin reclamar»)
  media_n     integer not null default 0,               -- archivos (fotos) que salieron del almacenamiento (Garage)
  ok          boolean not null,
  is_test     boolean not null default false
);
create unique index if not exists purge_runs_cuenta_ok_idx on purge_runs (user_id) where ok;
create index if not exists purge_runs_fecha_idx on purge_runs (finished_at desc);
create table if not exists purge_items (
  run_id  bigint not null references purge_runs (id),
  tabla   text not null,
  columna text not null,
  accion  text not null check (accion in ('borrar', 'vaciar', 'seudonimizar')),
  filas   integer not null check (filas >= 0),
  at      timestamptz not null default now(),
  primary key (run_id, tabla, columna)
);
create or replace function purga_solo_insercion() returns trigger language plpgsql as $$
begin raise exception '% es solo de inserción', tg_table_name; end $$;
drop trigger if exists purge_runs_no_cambia on purge_runs;
create trigger purge_runs_no_cambia before update or delete on purge_runs for each row execute function purga_solo_insercion();
drop trigger if exists purge_items_no_cambia on purge_items;
create trigger purge_items_no_cambia before update or delete on purge_items for each row execute function purga_solo_insercion();

-- ── Fusionar cuentas: lo pide una persona del equipo y lo aprueba OTRA (solo inserción) ──
create table if not exists account_merges (
  id            bigint generated always as identity primary key,
  from_user_id  uuid not null references users (id),
  to_user_id    uuid not null references users (id),
  requested_by  uuid not null references users (id),
  approved_by   uuid not null references users (id),
  change_id     text references sensitive_changes (id),
  reason        text not null check (char_length(reason) between 3 and 500),
  tables        jsonb not null default '{}',             -- tabla → filas movidas (sin contenido)
  at            timestamptz not null default now(),
  check (from_user_id <> to_user_id),
  check (approved_by <> requested_by)
);
create unique index if not exists account_merges_desde_idx on account_merges (from_user_id);
drop trigger if exists account_merges_no_cambia on account_merges;
create trigger account_merges_no_cambia before update or delete on account_merges for each row execute function purga_solo_insercion();

-- ── El teléfono queda vacío en una cuenta borrada o fusionada: el mismo número que vuelve es una cuenta nueva ──
alter table users alter column phone drop not null;
alter table users drop constraint if exists users_phone_o_borrada;
alter table users add constraint users_phone_o_borrada check (phone is not null or status in ('deleted', 'merged'));

-- Lo que una cuenta borrada deja vacío (el teléfono de una solicitud de empleo, el de un repartidor del negocio).
alter table job_applications alter column phone drop not null;
alter table delivery_drivers alter column phone drop not null;

-- Un texto vacío solo en su estado de «quitado» o «borrado» (la purga de D5); todo lo demás sigue exigiendo su largo.
alter table reviews drop constraint if exists reviews_body_check;
alter table reviews add constraint reviews_body_check check ((char_length(body) between 20 and 1000) or (status = 'removed' and body = ''));
alter table post_comments drop constraint if exists post_comments_body_check;
alter table post_comments add constraint post_comments_body_check check ((char_length(body) between 1 and 300) or (status = 'removed' and body = ''));
alter table com_posts drop constraint if exists com_posts_body_check;
alter table com_posts add constraint com_posts_body_check check ((char_length(body) between 10 and 1000) or (status = 'deleted' and body = ''));
alter table com_comments drop constraint if exists com_comments_texto;
alter table com_comments add constraint com_comments_texto check (char_length(body) <= 600 and (char_length(btrim(body)) >= 1 or business_id is not null or status = 'deleted'));
alter table chat_messages drop constraint if exists chat_messages_body_check;
alter table chat_messages add constraint chat_messages_body_check check ((char_length(body) between 1 and 1000) or (body = '' and hidden_at is not null));
alter table user_addresses drop constraint if exists user_addresses_street_check;
alter table user_addresses add constraint user_addresses_street_check check ((length(street) between 4 and 120) or (removed_at is not null and street = '—'));

-- ── Lo que la persona hizo con su cuenta: también pedir su archivo ──
alter table account_changes drop constraint if exists account_changes_kind_check;
alter table account_changes add constraint account_changes_kind_check check (kind in ('phone', 'city', 'email', 'name', 'photo', 'delete', 'undelete', 'passkey', 'export'));

-- ── El código para pedir tu archivo (como el de borrar la cuenta) ──
alter table otp_codes drop constraint if exists otp_codes_purpose_check;
alter table otp_codes add constraint otp_codes_purpose_check check (purpose in ('login', 'phone_change', 'claim_call', 'account_delete', 'llavero', 'data_export'));

-- ── Mensajes entre vecinos: siguen sin editarse ni borrarse; la purga de una cuenta borrada vacía SU texto (una vez) ──
create or replace function dm_messages_antes() returns trigger language plpgsql as $$
declare t record; otro uuid;
begin
  if tg_op = 'DELETE' then raise exception 'en Mensajes nada se borra: se oculta con motivo'; end if;
  if tg_op = 'UPDATE' then
    -- 9d · D5: el texto de quien borró su cuenta se vacía una vez (quién, cuándo y la conversación quedan; el otro vecino ve «Cuenta borrada»).
    if coalesce(current_setting('tl.purga', true), '') = 'si' and new.body = '' and old.body <> ''
       and (new.thread_id, new.sender_user_id, new.created_at, new.city_id) is not distinct from (old.thread_id, old.sender_user_id, old.created_at, old.city_id)
       and exists (select 1 from users u where u.id = old.sender_user_id and u.delete_at is not null and u.delete_at <= now()) then
      return new;
    end if;
    if (new.thread_id, new.sender_user_id, new.body, new.created_at, new.city_id) is distinct from (old.thread_id, old.sender_user_id, old.body, old.created_at, old.city_id) then
      raise exception 'un mensaje no se edita';
    end if;
    return new;
  end if;
  select * into t from dm_threads where id = new.thread_id for update;
  if new.sender_user_id <> t.a_user_id and new.sender_user_id <> t.b_user_id then raise exception 'solo escriben las dos personas de la conversación'; end if;
  if t.closed_at is not null then raise exception 'la conversación está cerrada'; end if;
  otro := case when new.sender_user_id = t.a_user_id then t.b_user_id else t.a_user_id end;
  if com_bloqueados(new.sender_user_id, otro) then raise exception 'hay un bloqueo entre las dos personas'; end if;
  if not exists (select 1 from follows f where f.follower_user_id = otro and f.target_kind = 'user' and f.target_id = new.sender_user_id::text)
     and not exists (select 1 from dm_messages m where m.thread_id = new.thread_id and m.sender_user_id = otro) then
    raise exception 'solo le escribes a quien te sigue';
  end if;
  new.city_id := t.city_id;
  return new;
end $$;

-- ── La retención de los escaneos de la puerta (L879, §6 #25): 13 meses y luego solo cifras ──
alter table ticket_scans add column if not exists purged_at timestamptz;
create or replace function ticket_scans_antes() returns trigger language plpgsql as $$
begin
  -- 9d · Retención (solo el barrido, retener_escaneos_meses): el escaneo queda en cifras (fecha, puerta, resultado, cuántos), sin boleto, sin
  -- código y sin dispositivo, una vez. Todo lo demás de un escaneo sigue siendo de solo inserción.
  if tg_op = 'UPDATE' and coalesce(current_setting('tl.retencion', true), '') = 'escaneos' and old.purged_at is null and new.purged_at is not null
     and new.ticket_id is null and new.rsvp_id is null and new.noche_res_id is null and new.code_hash is null and new.device is null
     and (to_jsonb(new) - array['ticket_id', 'rsvp_id', 'noche_res_id', 'code_hash', 'device', 'manual_reason', 'purged_at'])
       = (to_jsonb(old) - array['ticket_id', 'rsvp_id', 'noche_res_id', 'code_hash', 'device', 'manual_reason', 'purged_at']) then
    return new;
  end if;
  if tg_op <> 'INSERT' then raise exception 'ticket_scans es solo de inserción'; end if;
  if coalesce(current_setting('tl.puerta', true), '') <> 'si' then raise exception 'un escaneo lo registra solo la puerta (puerta_registrar)'; end if;
  new.at_server := now(); new.created_at := now(); new.purged_at := null;
  -- En línea, la hora que cuenta es la del servidor; sin conexión, la del teléfono corregida (nunca después de llegar al servidor).
  new.at_eff := case when new.offline and new.at_eff is not null then least(new.at_eff, new.at_server) else new.at_server end;
  if not new.offline then new.local_in := null; new.local_res := null; new.sync_id := null; end if;
  return new;
end $$;
create index if not exists ticket_scans_retener_idx on ticket_scans (at_server) where purged_at is null;

create or replace function escaneos_retener(lim integer default 1000) returns integer language plpgsql as $$
declare n integer;
begin
  perform set_config('tl.retencion', 'escaneos', true);
  with v as (select id from ticket_scans where purged_at is null and at_server < now() - make_interval(months => cfg_int('retener_escaneos_meses')) order by at_server limit lim),
  u as (update ticket_scans s set ticket_id = null, rsvp_id = null, noche_res_id = null, code_hash = null, device = null,
               manual_reason = case when s.manual_reason is null then null else '—' end, purged_at = now()
          from v where s.id = v.id returning 1)
  select count(*) into n from u;
  perform set_config('tl.retencion', '', true);
  return n;
end $$;

-- ── Configuración › Retención ──
alter table config_keys drop constraint if exists config_keys_section_check;
alter table config_keys add constraint config_keys_section_check check (section in ('comunidad', 'gamificacion', 'salud_pro', 'noche', 'edu', 'fe_inm_autos', 'eventos', 'compa', 'soporte', 'apps', 'retencion'));
insert into config_keys (key, min, max, def, unit, section, label, help, editable, bloqueo, edit_in, sort) values
  ('export_cada_dias', 1, 30, 7, '{"es":"días","en":"days"}', 'retencion', '{"es":"Descargar mis datos · uno cada","en":"Download my data · one every"}',
    '{"es":"Una persona o un negocio pide su archivo una vez cada tantos días. La ayuda dice 7: si lo cambias, cámbiala también.","en":"A person or a business requests their file once every this many days. The help says 7: if you change it, change the help too."}',
    true, null, null, 900),
  ('export_vence_h', 1, 72, 24, '{"es":"horas","en":"hours"}', 'retencion', '{"es":"Descargar mis datos · el enlace vale","en":"Download my data · the link is valid for"}',
    '{"es":"Después el archivo sale del almacén privado y hay que pedir otro. Se baja una sola vez. La pantalla dice 24 horas.","en":"After that the file leaves private storage and a new one must be requested. It downloads only once. The screen says 24 hours."}',
    true, null, null, 901),
  ('purga_lote', 1, 5000, 1000, '{"es":"filas","en":"rows"}', 'retencion', '{"es":"Borrado a los 30 días · filas por tabla en cada pasada","en":"Deletion after 30 days · rows per table per pass"}',
    '{"es":"El barrido purga las cuentas vencidas por partes; una cuenta con más filas sigue en la pasada siguiente (cada minuto).","en":"The sweep purges expired accounts in parts; an account with more rows continues in the next pass (every minute)."}',
    true, null, null, 902),
  ('retener_escaneos_meses', 1, 36, 13, '{"es":"meses","en":"months"}', 'retencion', '{"es":"Escaneos de la puerta · meses con el detalle","en":"Door scans · months with detail"}',
    '{"es":"Después cada escaneo queda solo en cifras (fecha, puerta, resultado): sin boleto, sin código y sin dispositivo.","en":"After that each scan stays only as numbers (date, door, result): no ticket, no code and no device."}',
    true, null, null, 903),
  ('retener_doc_reclamo_dias', 30, 365, 90, '{"es":"días","en":"days"}', 'retencion', '{"es":"Foto del documento de un reclamo","en":"Photo of a claim document"}',
    '{"es":"Días después de decidido el reclamo; el archivo sale del almacén privado y queda que hubo un documento.","en":"Days after the claim is decided; the file leaves private storage and the record that there was a document stays."}',
    true, null, null, 904),
  ('retener_sesiones_dias', 30, 730, 400, '{"es":"días","en":"days"}', 'retencion', '{"es":"Sesiones cerradas o vencidas","en":"Closed or expired sessions"}',
    '{"es":"Una sesión que ya no sirve se borra pasado este tiempo (con su dirección y su navegador).","en":"A session that no longer works is deleted after this time (with its address and browser)."}',
    true, null, null, 905),
  ('retener_busquedas_dias', 7, 365, 90, '{"es":"días","en":"days"}', 'retencion', '{"es":"Búsquedas","en":"Searches"}',
    '{"es":"Lo que alguien buscó se borra pasado este tiempo. Las tiendas y Privacidad dicen 90 días.","en":"What someone searched is deleted after this time. The stores and Privacy say 90 days."}',
    true, null, null, 906),
  ('retener_codigos_dias', 1, 30, 7, '{"es":"días","en":"days"}', 'retencion', '{"es":"Códigos de entrada (con el teléfono)","en":"Sign-in codes (with the phone)"}',
    '{"es":"Un código vence a los 10 minutos; su fila (con el teléfono) se borra pasado este tiempo.","en":"A code expires after 10 minutes; its row (with the phone) is deleted after this time."}',
    true, null, null, 907)
on conflict (key) do update set min = excluded.min, max = excluded.max, def = excluded.def, unit = excluded.unit, section = excluded.section,
  label = excluded.label, help = excluded.help, editable = excluded.editable, bloqueo = excluded.bloqueo, edit_in = excluded.edit_in, sort = excluded.sort;

-- ── Avisos ──
insert into notif_templates (key, grp, pref, sms, sms_mode, push, push_private, title, body) values
  ('datos_export_listo', 'tx', null, false, 'nunca', true, true, '{"es":"Tu archivo está listo","en":"Your file is ready"}',
    '{"es":"Tus datos están listos para bajar en Mi cuenta › Privacidad › Descargar mis datos. El enlace vale 24 horas y se usa una vez.","en":"Your data is ready to download in My account › Privacy › Download my data. The link is valid for 24 hours and works once."}'),
  ('datos_export_negocio', 'biz', null, false, 'nunca', true, true, '{"es":"El archivo de tu negocio está listo","en":"Your business file is ready"}',
    '{"es":"Los datos de {negocio} están listos para bajar en tu panel › Más › Exportar los datos del negocio. El enlace vale 24 horas y se usa una vez.","en":"The data for {negocio} is ready to download in your dashboard › More › Export business data. The link is valid for 24 hours and works once."}'),
  ('cuenta_borrada', 'crit', null, true, 'siempre', true, true, '{"es":"Tu cuenta se borró","en":"Your account was deleted"}',
    '{"es":"Tu cuenta de To''Latino se borró como pediste. Si vuelves con este número, es una cuenta nueva.","en":"Your To''Latino account was deleted as you asked. If you come back with this number, it is a new account."}')
on conflict (key) do nothing;

-- ── Lo que el mapa dice que se borra o se vacía y todavía está (0 filas = la purga está completa) ──
-- Lo derivado que guarda un texto de la persona (el último mensaje de una conversación entre vecinos): lo escribe la base (tl.derivados), nunca
-- la app (guardián saldoDerivado). La llama la purga de lib/datos/purgar.ts.
create or replace function datos_vaciar_derivados(cuenta uuid) returns integer language plpgsql as $$
declare n integer;
begin
  perform set_config('tl.derivados', 'si', true);
  with u as (update dm_threads set last_text = null where last_from = cuenta and last_text is not null returning 1) select count(*) into n from u;
  perform set_config('tl.derivados', '', true);
  return n;
end $$;

create or replace function datos_purga_pendiente(cuenta uuid, tel text) returns table (tabla text, columna text, accion text, n bigint) language plpgsql stable as $$
declare m record; k bigint;
begin
  for m in select d.* from data_map d where d.accion in ('borrar', 'vaciar', 'seudonimizar') and d.rol in ('persona', 'telefono') order by d.orden loop
    if m.fn = 'traducciones' then
      -- Las traducciones derivadas de lo que escribió (L680): ninguna queda.
      select count(*) into k from ugc_translations t
       where (t.target_kind = 'com_post' and t.target_id in (select p.id from com_posts p where p.author_user_id = cuenta))
          or (t.target_kind = 'com_comment' and t.target_id in (select x.id from com_comments x where x.author_user_id = cuenta))
          or (t.target_kind in ('review', 'review_reply') and t.target_id in (select r.id from reviews r where r.user_id = cuenta))
          or (t.target_kind = 'post_comment' and t.target_id in (select x.id from post_comments x where x.user_id = cuenta));
    elsif m.tabla = 'compa_conversations' then
      -- 7i · Una conversación ABIERTA espera a cerrarse (el barrido la cierra a las 24 h) y compa_purgar la vacía en la pasada siguiente.
      select count(*) into k from compa_conversations c where c.user_id = cuenta and c.closed_at is not null and c.purged_at is null;
    elsif m.tabla = 'compa_messages' then
      select count(*) into k from compa_messages x join compa_conversations c on c.id = x.conversation_id
       where x.user_id = cuenta and x.text is not null and c.closed_at is not null;
    elsif m.tabla = 'media' then
      -- Sus fotos: las que subió (las personales, no las del negocio), las de sus publicaciones y la de su perfil; ninguna queda sin purgar.
      execute format('select count(*) from media x where x.purged_at is null and ((x.uploaded_by = $1 and (%s))'
                  || ' or (x.owner_kind = ''com_post'' and x.owner_id in (select p.id::text from com_posts p where p.author_user_id = $1))'
                  || ' or (x.owner_kind = ''user'' and x.owner_id = $1::text))', coalesce(m.donde_sql, 'true')) into k using cuenta;
    elsif m.rol = 'telefono' then
      if tel is null then continue; end if;
      execute format('select count(*) from %I where %I = $1', m.tabla, m.columna) into k using tel;
    elsif m.accion = 'borrar' then
      execute format('select count(*) from %I where %I = $1 and (%s)', m.tabla, m.columna, coalesce(m.donde_sql, 'true')) into k using cuenta;
    else
      execute format('select count(*) from %I where %I = $1 and (%s) and (%s)', m.tabla, m.columna, coalesce(m.donde_sql, 'true'), coalesce(m.pendiente_sql, 'false')) into k using cuenta;
    end if;
    if k > 0 then tabla := m.tabla; columna := m.columna; accion := m.accion; n := k; return next; end if;
  end loop;
end $$;

commit;
