-- 0126 · Fase 8 · 8c · Avisos push propios: Web Push, APNs y FCM; push primero y SMS de respaldo (docs/diseno/plan/fase8-apps.md §2 «0127 push»,
-- §3.3, §4 8c). NUMERACIÓN: el plan reservaba 0126 para 8b (enlaces universales) y 0127 para 8c; 8b espera el dominio (Paquete 8-0) y no se
-- construyó, así que 8c toma 0126 y 8b tomará la siguiente libre (anotado en el plan y en REVISION). Nada asume números contiguos.
-- · push_tokens: un token por teléfono / navegador y app, atado a la SESIÓN que lo registró (salir de la cuenta o bloquear la sesión lo revoca en la
--   misma transacción: trigger en sessions). El token va CIFRADO (token_enc, AES-256-GCM con la llave del entorno) y se busca por su huella
--   (token_hash, HMAC); las llaves de Web Push (p256dh y auth) también cifradas. Nunca en claro. No se borra: se revoca una vez, con motivo.
-- · push_outbox: la cola (un envío por aviso y token: único → nunca dos veces el mismo aviso al mismo teléfono). El contenido va cifrado y se vacía
--   al terminar (hecho o fallo). Reintentos con espera creciente (not_before) que hace el barrido.
-- · push_deliveries: cada intento con su resultado, SOLO inserción, sin personas (plantilla, app, plataforma, proveedor, ciudad, código).
-- · notifications suma push_status, push_at, opened_at y opened_via; sms_status suma 'respaldo' (el SMS espera a ver si el push llega) y 'ahorrado'
--   (el push llegó: no salió el SMS).
-- · notif_templates suma push (va o no por push), push_private (texto genérico: Salud, Niños, Soporte, sanciones y cuenta; la base no deja quitarlo
--   en esos grupos), app (qué app abre el aviso) y sms_mode ('siempre' solo el grupo crit; 'sin_push' = SMS solo si no hay push; 'nunca').
--   La columna sms queda como la veía todo lo anterior: un trigger la mantiene igual a (sms_mode <> 'nunca').
-- · Configuración › Apps (se cambia en Sistema › Integraciones › Push): push_ttl_h, push_reintentos, push_lote, push_por_minuto, push_inactivo_dias.
-- · Interruptores por canal: push.webpush · push.apns · push.fcm (apagado = ese canal no se usa y el SMS de respaldo sale como si no hubiera push).
-- · Plantilla push_prueba («Mandar un push de prueba a mi teléfono», Sistema › Integraciones › Push).
-- Idempotente: se puede aplicar dos veces. Nada se borra.
begin;

-- ── Tokens ──
create table if not exists push_tokens (
  id               bigint generated always as identity primary key,
  user_id          uuid not null references users (id),
  session_id       uuid references sessions (id),
  city_id          text references cities (id),
  app              text not null check (app in ('cliente', 'negocio', 'delivery', 'checkin', 'web')),
  platform         text not null check (platform in ('ios', 'android', 'web')),
  provider         text not null check (provider in ('apns', 'fcm', 'webpush', 'sim')),
  token_enc        bytea not null check (octet_length(token_enc) between 29 and 9000),
  token_hash       text not null check (token_hash ~ '^[a-f0-9]{64}$'),
  webpush_keys_enc bytea check (octet_length(webpush_keys_enc) between 29 and 400),
  label            text check (char_length(label) between 2 and 60),
  lang             text not null default 'es' check (lang in ('es', 'en')),
  is_test          boolean not null default false,
  created_at       timestamptz not null default now(),
  last_seen_at     timestamptz not null default now(),
  last_ok_at       timestamptz,
  revoked_at       timestamptz,
  revoked_reason   text check (revoked_reason in ('salir', 'invalido', 'apagado', 'reemplazado', 'admin', 'vencido')),
  revoked_by       uuid references users (id),
  check ((revoked_at is null) = (revoked_reason is null)),
  check ((provider = 'webpush') = (webpush_keys_enc is not null)),
  check (provider <> 'apns' or platform = 'ios'),
  check (provider <> 'fcm' or platform = 'android'),
  check ((provider = 'webpush') = (app = 'web')),
  check ((app = 'web') = (platform = 'web'))
);
create unique index if not exists push_tokens_vivo on push_tokens (token_hash) where revoked_at is null;
create index if not exists push_tokens_usuario on push_tokens (user_id, app) where revoked_at is null;
create index if not exists push_tokens_sesion on push_tokens (session_id) where revoked_at is null;
create index if not exists push_tokens_inactivos on push_tokens (last_seen_at) where revoked_at is null;

-- Un token no se borra ni cambia de dueño; vivo, solo cambia lo informativo (visto, último bueno, idioma, rótulo); revocar es una vez.
create or replace function push_tokens_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'un token de push no se borra (se revoca, con motivo)'; end if;
  if tg_op = 'INSERT' then
    if new.revoked_at is not null then raise exception 'un token nace vivo'; end if;
    new.created_at := now();
    return new;
  end if;
  if old.revoked_at is not null then raise exception 'push_tokens: un token revocado ya no cambia'; end if;
  if (to_jsonb(new) - array['last_seen_at', 'last_ok_at', 'lang', 'label', 'revoked_at', 'revoked_reason', 'revoked_by'])
     <> (to_jsonb(old) - array['last_seen_at', 'last_ok_at', 'lang', 'label', 'revoked_at', 'revoked_reason', 'revoked_by']) then
    raise exception 'push_tokens: el token, su dueño, su sesión y su app no cambian';
  end if;
  if new.revoked_at is not null then new.revoked_at := now(); end if;
  return new;
end $$;
drop trigger if exists push_tokens_antes on push_tokens;
create trigger push_tokens_antes before insert or update or delete on push_tokens for each row execute function push_tokens_antes();

-- Salir de la cuenta (o que el equipo bloquee la sesión) revoca en la MISMA transacción el token de esa sesión.
create or replace function sessions_push_revocar() returns trigger language plpgsql as $$
begin
  if (new.blocked and not old.blocked) or (new.signed_out_at is not null and old.signed_out_at is null) then
    update push_tokens set revoked_at = now(), revoked_reason = case when new.blocked and not old.blocked then 'admin' else 'salir' end
     where session_id = new.id and revoked_at is null;
  end if;
  return new;
end $$;
drop trigger if exists sessions_push_revocar on sessions;
create trigger sessions_push_revocar after update of signed_out_at, blocked on sessions for each row execute function sessions_push_revocar();

-- Una cuenta borrada no recibe push en ningún teléfono.
create or replace function users_push_revocar() returns trigger language plpgsql as $$
begin
  if new.status = 'deleted' and old.status is distinct from 'deleted' then
    update push_tokens set revoked_at = now(), revoked_reason = 'salir' where user_id = new.id and revoked_at is null;
  end if;
  return new;
end $$;
drop trigger if exists users_push_revocar on users;
create trigger users_push_revocar after update of status on users for each row execute function users_push_revocar();

-- ── Avisos: el estado del push, abrir y el SMS de respaldo ──
alter table notifications add column if not exists push_status text not null default 'no';
alter table notifications drop constraint if exists notifications_push_status_check;
alter table notifications add constraint notifications_push_status_check check (push_status in ('no', 'pendiente', 'enviado', 'fallo', 'sin_app', 'apagado', 'silencio', 'pruebas'));
alter table notifications add column if not exists push_at timestamptz;
alter table notifications add column if not exists opened_at timestamptz;
alter table notifications add column if not exists opened_via text;
alter table notifications drop constraint if exists notifications_opened_via_check;
alter table notifications add constraint notifications_opened_via_check check (opened_via in ('push', 'campana', 'sms', 'correo'));
alter table notifications drop constraint if exists notifications_sms_status_check;
alter table notifications add constraint notifications_sms_status_check check (sms_status in ('no', 'pruebas', 'pendiente', 'enviado', 'fallo', 'silencio', 'apagado', 'sin_proveedor', 'baja', 'respaldo', 'ahorrado'));
create index if not exists notifications_respaldo on notifications (created_at) where sms_status = 'respaldo';

-- ── Plantillas: push, texto genérico, la app que abre el aviso y cuándo va el SMS ──
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name = 'notif_templates' and column_name = 'sms_mode') then
    alter table notif_templates add column sms_mode text;
    -- Lo que «siempre llegaba» por SMS (grupo crit) sigue siempre; lo demás que iba por SMS pasa a respaldo del push; lo que no iba, nunca.
    update notif_templates set sms_mode = case when sms and grp = 'crit' then 'siempre' when sms then 'sin_push' else 'nunca' end;
    alter table notif_templates alter column sms_mode set not null;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'notif_templates' and column_name = 'push') then
    alter table notif_templates add column push boolean not null default true;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'notif_templates' and column_name = 'push_private') then
    alter table notif_templates add column push_private boolean not null default false;
    -- Salud, Niños, Soporte, moderación y sanciones, cuenta: por Apple y Google solo pasa «Tienes un aviso nuevo en To'Latino.».
    update notif_templates set push_private = true
     where key ~ '^(sal_|biz_sal_|nin_|ninos_|cuenta_)' or grp in ('support', 'mod') or key in ('mod_sancion', 'biz_help_sancion', 'evt_bloqueado', 'pay_hold', 'gam_excluido');
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'notif_templates' and column_name = 'app') then
    alter table notif_templates add column app text not null default 'cliente';
    -- Qué app abre el aviso: el repartidor, la puerta, el negocio; lo demás, To'Latino (de la familia de su enlace).
    update notif_templates set app = case
      when key like 'drv\_%' or key like 'chofer\_%' then 'delivery'
      when key in ('puerta_abre', 'puerta_asignado', 'puerta_invitado') then 'checkin'
      when grp = 'biz' or key like 'biz\_%' then 'negocio'
      else 'cliente' end;
  end if;
end $$;
alter table notif_templates drop constraint if exists notif_templates_sms_mode_check;
alter table notif_templates add constraint notif_templates_sms_mode_check check (sms_mode in ('siempre', 'sin_push', 'nunca') and (sms_mode <> 'siempre' or grp = 'crit'));
alter table notif_templates drop constraint if exists notif_templates_app_check;
alter table notif_templates add constraint notif_templates_app_check check (app in ('cliente', 'negocio', 'delivery', 'checkin'));
alter table notif_templates drop constraint if exists notif_templates_push_private_check;
alter table notif_templates add constraint notif_templates_push_private_check check (push_private or not (key ~ '^(sal_|biz_sal_|nin_|ninos_|cuenta_)' or grp in ('support', 'mod')));

-- `sms` (lo que lee todo lo anterior) = (sms_mode <> 'nunca'). Una plantilla nueva escrita con `sms` toma su modo de ahí.
create or replace function notif_templates_sms_mode() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if new.sms_mode is null then new.sms_mode := case when new.sms and new.grp = 'crit' then 'siempre' when new.sms then 'sin_push' else 'nunca' end; end if;
  elsif new.sms is distinct from old.sms and new.sms_mode is not distinct from old.sms_mode then
    new.sms_mode := case when new.sms and new.grp = 'crit' then 'siempre' when new.sms then 'sin_push' else 'nunca' end;
  end if;
  if new.sms_mode = 'siempre' and new.grp <> 'crit' then new.sms_mode := 'sin_push'; end if;
  new.sms := new.sms_mode <> 'nunca';
  -- Lo sensible nunca pasa con su texto por Apple y Google, aunque una migración nueva lo cree o lo mueva de grupo.
  if new.key ~ '^(sal_|biz_sal_|nin_|ninos_|cuenta_)' or new.grp in ('support', 'mod') then new.push_private := true; end if;
  return new;
end $$;
drop trigger if exists notif_templates_sms_mode on notif_templates;
create trigger notif_templates_sms_mode before insert or update on notif_templates for each row execute function notif_templates_sms_mode();

-- ── La cola ──
create table if not exists push_outbox (
  id              bigint generated always as identity primary key,
  notification_id bigint not null references notifications (id),
  token_id        bigint not null references push_tokens (id),
  city_id         text references cities (id),
  priority        text not null default 'normal' check (priority in ('alta', 'normal')),
  collapse_key    text check (char_length(collapse_key) between 1 and 64),
  payload_enc     bytea check (octet_length(payload_enc) between 29 and 8000),
  not_before      timestamptz not null default now(),
  expires_at      timestamptz not null,
  tries           smallint not null default 0 check (tries between 0 and 20),
  status          text not null default 'pendiente' check (status in ('pendiente', 'enviando', 'hecho', 'fallo')),
  claimed_at      timestamptz,
  last_error      text check (char_length(last_error) <= 120),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (notification_id, token_id),
  check (status in ('hecho', 'fallo') or payload_enc is not null)
);
create index if not exists push_outbox_pendientes on push_outbox (not_before, id) where status = 'pendiente';
create index if not exists push_outbox_enviando on push_outbox (claimed_at) where status = 'enviando';
create index if not exists push_outbox_aviso on push_outbox (notification_id);

-- ── Cada intento (solo inserción; sin personas) ──
create table if not exists push_deliveries (
  id              bigint generated always as identity primary key,
  outbox_id       bigint not null references push_outbox (id),
  notification_id bigint not null references notifications (id),
  token_id        bigint not null references push_tokens (id),
  tpl             text not null references notif_templates (key),
  city_id         text references cities (id),
  app             text not null check (app in ('cliente', 'negocio', 'delivery', 'checkin', 'web')),
  platform        text not null check (platform in ('ios', 'android', 'web')),
  provider        text not null check (provider in ('apns', 'fcm', 'webpush', 'sim')),
  result          text not null check (result in ('enviado', 'invalido', 'rechazado', 'limite', 'error', 'pruebas', 'apagado')),
  provider_id     text check (char_length(provider_id) <= 100),
  error_code      text check (char_length(error_code) <= 60),
  http_status     smallint check (http_status between 0 and 999),
  ms              integer check (ms between 0 and 600000),
  is_test         boolean not null default false,
  at              timestamptz not null default now()
);
create index if not exists push_deliveries_at on push_deliveries using brin (at);
create index if not exists push_deliveries_tpl on push_deliveries (tpl, at desc);
create or replace function push_deliveries_antes() returns trigger language plpgsql as $$
begin
  if tg_op <> 'INSERT' then raise exception 'push_deliveries es solo de inserción'; end if;
  new.at := now();
  return new;
end $$;
drop trigger if exists push_deliveries_antes on push_deliveries;
create trigger push_deliveries_antes before insert or update or delete on push_deliveries for each row execute function push_deliveries_antes();

-- ── Cifras por día (Super Admin › Notificaciones › Push): sin personas ──
create or replace view push_cifras_dia as
select (d.at at time zone coalesce(ci.timezone, 'America/New_York'))::date as dia, d.city_id, d.tpl, d.app, d.platform, d.provider,
       count(*) filter (where d.result in ('enviado', 'pruebas')) as entregados,
       count(*) filter (where d.result = 'invalido') as invalidos,
       count(*) filter (where d.result in ('rechazado', 'limite', 'error', 'apagado')) as fallidos,
       count(*) as intentos
  from push_deliveries d left join cities ci on ci.id = d.city_id
 group by 1, 2, 3, 4, 5, 6;

-- ── Configuración › Apps (se cambia en Sistema › Integraciones › Push) ──
insert into config_keys (key, min, max, def, unit, section, label, help, editable, bloqueo, edit_in, sort) values
  ('push_ttl_h', 1, 72, 24, '{"es":"horas","en":"hours"}', 'apps', '{"es":"Push · horas que vale un aviso","en":"Push · hours a notice is valid"}',
    '{"es":"Pasado este tiempo, un push que no se pudo entregar se deja y, si el aviso lleva SMS de respaldo, sale el SMS.","en":"After this time, a push that could not be delivered is dropped and, if the notice has SMS fallback, the SMS goes out."}', true, null, '/admin/sistema/integraciones', 330),
  ('push_reintentos', 0, 10, 5, '{"es":"intentos","en":"tries"}', 'apps', '{"es":"Push · reintentos","en":"Push · retries"}',
    '{"es":"Cuántas veces se reintenta un push que falló por el proveedor (con espera creciente). Un token inválido no se reintenta.","en":"How many times a push that failed at the provider is retried (with growing waits). An invalid token is not retried."}', true, null, '/admin/sistema/integraciones', 331),
  ('push_lote', 10, 2000, 500, '{"es":"avisos","en":"notices"}', 'apps', '{"es":"Push · lote por vuelta","en":"Push · batch per run"}',
    '{"es":"Cuántos push toma el trabajador en cada vuelta.","en":"How many pushes the worker takes per run."}', true, null, '/admin/sistema/integraciones', 332),
  ('push_por_minuto', 100, 100000, 10000, '{"es":"por minuto","en":"per minute"}', 'apps', '{"es":"Push · tope por minuto","en":"Push · cap per minute"}',
    '{"es":"Lo máximo que sale por minuto en todo el sistema; lo demás espera a la vuelta siguiente.","en":"The most that goes out per minute across the system; the rest waits for the next run."}', true, null, '/admin/sistema/integraciones', 333),
  ('push_inactivo_dias', 30, 365, 90, '{"es":"días","en":"days"}', 'apps', '{"es":"Push · token sin uso","en":"Push · unused token"}',
    '{"es":"Un teléfono que no abre To''Latino en este tiempo deja de recibir push (token vencido); al volver a abrir, se registra solo.","en":"A phone that does not open To''Latino in this time stops getting push (expired token); when it opens again, it registers on its own."}', true, null, '/admin/sistema/integraciones', 334)
on conflict (key) do update set min = excluded.min, max = excluded.max, def = excluded.def, unit = excluded.unit, section = excluded.section,
  label = excluded.label, help = excluded.help, editable = excluded.editable, bloqueo = excluded.bloqueo, edit_in = excluded.edit_in, sort = excluded.sort;

-- ── Interruptores por canal (sandbox encendidos; producción: Fase 9) ──
insert into feature_flags (key, enabled, note) values
  ('push.webpush', true, 'Push · Web Push (VAPID)'), ('push.apns', true, 'Push · Apple (APNs)'), ('push.fcm', true, 'Push · Android (FCM)')
on conflict (key) do nothing;

-- ── La plantilla de la prueba (Sistema › Integraciones › Push › «Mandar un push de prueba a mi teléfono») ──
insert into notif_templates (key, grp, pref, sms, title, body) values
  ('push_prueba', 'tx', null, false, '{"es": "Prueba de avisos", "en": "Notification test"}', '{"es": "Si ves esto en tu teléfono, los avisos de To''Latino te llegan bien.", "en": "If you see this on your phone, To''Latino notifications reach you."}')
on conflict (key) do nothing;

commit;
