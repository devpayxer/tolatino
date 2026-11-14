-- 0142 · Avisos, correo y canales listos (Fase 9 · 9l; fase9-apertura.md §4 9l). Todo contra los simuladores y los contratos; de verdad con 9q.
-- · UN SOLO CAMINO para todos los SMS: `sms_outbox` (avisos, avisos a un teléfono sin cuenta, el código para entrar, las respuestas de El Compa por SMS).
--   Cada intento queda en `sms_attempts` (solo inserción; su resultado final llega UNA vez por el webhook de Telnyx `message.finalized`). Reintentos con
--   espera creciente (Configuración › Avisos y canales); un código vencido no se reintenta. El teléfono y el texto viajan CIFRADOS (el texto lleva códigos)
--   y se vacían a los `retener_sms_dias`. En el sandbox el proveedor es el simulador (`sim`, lib/sms/simulador.ts), nunca en producción.
-- · Estado de entrega: «entregado» en los avisos, los SMS a teléfonos sin cuenta y la salida de El Compa (también los `statuses` de Meta).
-- · El tope GLOBAL de remitentes (números distintos) por minuto (una inundación de números falsos) con su alerta al equipo, una vez por cada 10 minutos (`canal_alertas`).
-- · Las plantillas de WhatsApp para escribir primero (`wa_templates`, con su estado en Meta; `wa_template_events` solo inserción).
-- · Soporte por correo: `support_email_in` (solo lo que SES firma y aprueba: SPF, DKIM, spam y virus) → un caso TK- con origen «correo»; las respuestas
--   del equipo por correo o por WhatsApp (dentro de la ventana de 24 h) quedan en `support_replies_out` (solo inserción).
-- · Correo: el enlace para verificar es de UN uso y el nuevo anula los anteriores (`revoked_at`); la baja de un toque (List-Unsubscribe) queda en
--   `email_unsubscribes` (solo inserción); plantillas `support_reply` y `support_ack` agregadas a la lista que haya.
-- · Las plantillas de aviso que faltaban (el código para entrar editable, pedido tarde, entregado, sello decidido, ciudad abierta, resumen semanal, la prueba
--   de Pro, recomendar, «Avísame cuando haya», la invitación al equipo, «quedan pocos», reseña nueva, el resultado de una foto reportada, «cambiaste tu
--   número», el tope de remitentes) y `notif_once` (un aviso que sale una sola vez por objeto).
-- · `phone_messages` deja de guardar para siempre: su teléfono y su texto se vacían a los `retener_sms_dias`.
-- Reglas: nada se borra (estados); lo de solo inserción lo impone la base; los CHECK que listan valores se AMPLÍAN (nunca se reescriben con una lista
-- fija: otro bloque puede haber agregado los suyos). Idempotente: aplicarla dos veces no cambia nada.
begin;

-- Agrega valores a un CHECK «col = ANY (ARRAY[…])» sin perder los que otro bloque haya puesto (como 0141 con la sección «dinero»).
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

-- ── El único camino de los SMS ──
create table if not exists sms_outbox (
  id               bigint generated always as identity primary key,
  city_id          text references cities (id),
  to_hash          text not null check (to_hash ~ '^[a-f0-9]{64}$'),
  to_enc           bytea,                                              -- el teléfono cifrado; la retención lo vacía
  to_last4         text not null check (to_last4 ~ '^[0-9]{4}$'),
  from_number      text check (char_length(from_number) between 2 and 40),   -- el número de To'Latino que manda (null = TELNYX_FROM)
  tpl              text references notif_templates (key),
  origin_kind      text not null check (origin_kind in ('aviso', 'telefono', 'codigo', 'compa', 'prueba')),
  origin_id        text check (char_length(origin_id) <= 80),
  body_enc         bytea,                                              -- el texto cifrado (puede llevar un código); la retención lo vacía
  chars            integer not null check (chars between 1 and 1600),
  provider         text not null check (provider in ('telnyx', 'sim')),
  status           text not null default 'pendiente' check (status in ('pendiente', 'enviado', 'entregado', 'reintento', 'fallo', 'vencido', 'sin_proveedor')),
  attempts         integer not null default 0 check (attempts between 0 and 10),
  max_attempts     integer not null check (max_attempts between 1 and 10),
  next_at          timestamptz,
  expires_at       timestamptz,                                        -- un código vencido no se reintenta
  error_code       text check (char_length(error_code) <= 40),
  error            text check (char_length(error) <= 200),
  is_test          boolean not null default false,
  created_at       timestamptz not null default now(),
  sent_at          timestamptz,
  delivered_at     timestamptz,
  finished_at      timestamptz,
  purged_at        timestamptz,
  check ((status = 'reintento') = (next_at is not null)),
  check (status <> 'entregado' or delivered_at is not null)
);
create index if not exists sms_outbox_toca on sms_outbox (next_at) where status = 'reintento';
create index if not exists sms_outbox_pend on sms_outbox (created_at) where status = 'pendiente';
create index if not exists sms_outbox_dia on sms_outbox (created_at desc);
create index if not exists sms_outbox_tel on sms_outbox (to_hash, created_at desc);
create index if not exists sms_outbox_purga on sms_outbox (created_at) where purged_at is null;
create index if not exists sms_outbox_origen on sms_outbox (origin_kind, origin_id);

-- Solo avanza: pendiente → enviado | reintento | fallo | vencido | sin_proveedor; enviado → entregado | reintento | fallo; reintento → enviado |
-- reintento | fallo | vencido | sin_proveedor. Lo final no cambia. El teléfono y el texto solo se vacían con la purga (una vez). No se borra.
create or replace function sms_outbox_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'sms_outbox no se borra (estados)'; end if;
  if tg_op = 'INSERT' then
    new.created_at := now(); new.purged_at := null; new.delivered_at := null; new.finished_at := null;
    if new.status not in ('pendiente', 'sin_proveedor') then raise exception 'un SMS nace pendiente'; end if;
    return new;
  end if;
  if (new.to_hash, new.to_last4, new.from_number, new.tpl, new.origin_kind, new.origin_id, new.provider, new.city_id, new.created_at, new.chars, new.max_attempts, new.expires_at, new.is_test)
     is distinct from (old.to_hash, old.to_last4, old.from_number, old.tpl, old.origin_kind, old.origin_id, old.provider, old.city_id, old.created_at, old.chars, old.max_attempts, old.expires_at, old.is_test) then
    raise exception 'de un SMS solo avanza su estado';
  end if;
  if new.to_enc is distinct from old.to_enc or new.body_enc is distinct from old.body_enc then
    if new.to_enc is not null or new.body_enc is not null or old.purged_at is not null or new.purged_at is null then
      raise exception 'el teléfono y el texto de un SMS solo se vacían con la purga';
    end if;
  end if;
  if old.purged_at is not null and new.purged_at is distinct from old.purged_at then raise exception 'la purga de un SMS es una vez'; end if;
  if new.attempts < old.attempts then raise exception 'los intentos de un SMS solo suben'; end if;
  if new.status is distinct from old.status and not (
       (old.status = 'pendiente' and new.status in ('enviado', 'reintento', 'fallo', 'vencido', 'sin_proveedor'))
    or (old.status = 'enviado' and new.status in ('entregado', 'reintento', 'fallo'))
    or (old.status = 'reintento' and new.status in ('enviado', 'fallo', 'vencido', 'sin_proveedor'))
    or (old.status = 'sin_proveedor' and new.status in ('enviado', 'reintento', 'fallo', 'vencido'))) then
    raise exception 'ese SMS ya se decidió (% → %)', old.status, new.status;
  end if;
  if new.status in ('entregado', 'fallo', 'vencido') and new.finished_at is null then new.finished_at := now(); end if;
  if new.status = 'entregado' and new.delivered_at is null then new.delivered_at := now(); end if;
  return new;
end $$;
drop trigger if exists sms_outbox_antes on sms_outbox;
create trigger sms_outbox_antes before insert or update or delete on sms_outbox for each row execute function sms_outbox_antes();

-- Cada intento ante el proveedor: solo inserción; su resultado final (entregado o falló) llega una vez (webhook o simulador).
create table if not exists sms_attempts (
  id               bigint generated always as identity primary key,
  sms_id           bigint not null references sms_outbox (id),
  n                integer not null check (n between 1 and 10),
  provider         text not null check (provider in ('telnyx', 'sim')),
  provider_msg_id  text check (char_length(provider_msg_id) between 1 and 200),
  accepted         boolean not null,                                   -- el proveedor lo aceptó (o no: red, 4xx, 5xx)
  error_code       text check (char_length(error_code) <= 40),
  final            text check (final in ('entregado', 'fallo')),
  final_code       text check (char_length(final_code) <= 40),
  at               timestamptz not null default now(),
  final_at         timestamptz,
  unique (sms_id, n),
  check ((final is null) = (final_at is null)),
  check (accepted or final is null)
);
create unique index if not exists sms_attempts_proveedor on sms_attempts (provider, provider_msg_id) where provider_msg_id is not null;
create or replace function sms_attempts_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'sms_attempts es solo de inserción'; end if;
  if tg_op = 'INSERT' then new.at := now(); new.final := null; new.final_at := null; new.final_code := null; return new; end if;
  if (new.sms_id, new.n, new.provider, new.provider_msg_id, new.accepted, new.error_code, new.at) is distinct from (old.sms_id, old.n, old.provider, old.provider_msg_id, old.accepted, old.error_code, old.at)
     or (old.final is not null and (new.final, new.final_code, new.final_at) is distinct from (old.final, old.final_code, old.final_at)) then
    raise exception 'sms_attempts es solo de inserción (su resultado final llega una vez)';
  end if;
  return new;
end $$;
drop trigger if exists sms_attempts_antes on sms_attempts;
create trigger sms_attempts_antes before insert or update or delete on sms_attempts for each row execute function sms_attempts_antes();

-- Los avisos, los SMS a teléfonos sin cuenta y la salida de El Compa apuntan a su SMS y dicen «entregado».
alter table notifications add column if not exists sms_id bigint references sms_outbox (id);
alter table phone_messages add column if not exists sms_id bigint references sms_outbox (id);
alter table phone_messages add column if not exists purged_at timestamptz;
alter table phone_messages alter column phone_enc drop not null;
alter table phone_messages alter column body drop not null;
alter table compa_outbound add column if not exists sms_id bigint references sms_outbox (id);
alter table compa_outbound add column if not exists delivered_at timestamptz;
create index if not exists notifications_sms on notifications (sms_id) where sms_id is not null;
create index if not exists phone_messages_sms on phone_messages (sms_id) where sms_id is not null;
create index if not exists phone_messages_purga on phone_messages (created_at) where purged_at is null;
create index if not exists compa_outbound_proveedor on compa_outbound (provider_msg_id) where provider_msg_id is not null;
do $$ begin perform pg_temp.ampliar_check('notifications', 'notifications_sms_status_check', array['entregado']); end $$;
do $$ begin perform pg_temp.ampliar_check('phone_messages', 'phone_messages_sms_status_check', array['entregado']); end $$;
do $$ begin perform pg_temp.ampliar_check('compa_outbound', 'compa_outbound_status_check', array['entregado']); end $$;
do $$ begin perform pg_temp.ampliar_check('compa_outbound', 'compa_outbound_kind_check', array['soporte', 'plantilla']); end $$;
do $$ begin perform pg_temp.ampliar_check('compa_inbound', 'compa_inbound_result_check', array['tope_global']); end $$;

-- compa_outbound (0123) + 9l: lo enviado también avanza a «entregado» o «falló» (el estado de entrega de Telnyx y de Meta), una vez.
create or replace function compa_outbound_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'compa_outbound es solo de inserción'; end if;
  if tg_op = 'INSERT' then
    new.created_at := now(); new.purged_at := null; new.delivered_at := null;
    if texto_con_secretos(coalesce(new.body, '')) then raise exception 'compa_sin_secretos: la salida no guarda números de tarjeta ni de seguro social'; end if;
    return new;
  end if;
  if (new.inbound_id, new.channel, new.provider, new.number_id, new.to_hash, new.user_id, new.conversation_id, new.business_id, new.city_id, new.kind, new.created_at)
     is distinct from (old.inbound_id, old.channel, old.provider, old.number_id, old.to_hash, old.user_id, old.conversation_id, old.business_id, old.city_id, old.kind, old.created_at) then
    raise exception 'compa_outbound es solo de inserción (solo avanza su estado y la purga)';
  end if;
  if new.body is distinct from old.body and (new.body is not null or new.purged_at is null or old.purged_at is not null) then
    raise exception 'compa_outbound: el texto solo se vacía con la purga';
  end if;
  if old.sms_id is not null and new.sms_id is distinct from old.sms_id then raise exception 'compa_outbound: su SMS no cambia'; end if;
  -- «pendiente» avanza a enviado o falló; «enviado», a entregado o falló (el aviso de entrega). Lo decidido no cambia.
  if new.status is distinct from old.status and not ((old.status = 'pendiente' and new.status in ('enviado', 'fallo')) or (old.status = 'enviado' and new.status in ('entregado', 'fallo'))) then
    raise exception 'compa_outbound: ese envío ya se decidió';
  end if;
  if new.status = 'entregado' and new.delivered_at is null then new.delivered_at := now(); end if;
  return new;
end $$;

-- El enlace que va en el SMS de un aviso (seguimiento del pedido, de la cita): la plantilla lo pide; el texto del enlace no se edita.
alter table notif_templates add column if not exists sms_enlace boolean not null default false;

-- ── Un aviso una sola vez por objeto (pedido tarde, el resumen de la semana, «ya publicó», la prueba de Pro…) ──
create table if not exists notif_once (
  key  text primary key check (char_length(key) between 3 and 200),
  at   timestamptz not null default now()
);
create or replace function notif_once_antes() returns trigger language plpgsql as $$
begin raise exception 'notif_once es solo de inserción'; end $$;
drop trigger if exists notif_once_antes on notif_once;
create trigger notif_once_antes before update or delete on notif_once for each row execute function notif_once_antes();

-- ── El tope global de remitentes por minuto y su alerta (una por tipo y ventana de 10 minutos) ──
create table if not exists canal_alertas (
  id       bigint generated always as identity primary key,
  kind     text not null check (kind in ('remitentes')),
  bucket   timestamptz not null,                                       -- el inicio de la ventana de 10 minutos
  n        integer not null check (n >= 0),
  tope     integer not null check (tope >= 1),
  at       timestamptz not null default now(),
  unique (kind, bucket)
);
create or replace function canal_alertas_antes() returns trigger language plpgsql as $$
begin raise exception 'canal_alertas es solo de inserción'; end $$;
drop trigger if exists canal_alertas_antes on canal_alertas;
create trigger canal_alertas_antes before update or delete on canal_alertas for each row execute function canal_alertas_antes();
create index if not exists compa_inbound_minuto on compa_inbound (received_at, from_hash);

-- ── Plantillas de WhatsApp para escribir primero (fuera de la ventana de 24 h), listas para que Meta las apruebe ──
create table if not exists wa_templates (
  id            bigint generated always as identity primary key,
  name          text not null check (name ~ '^[a-z0-9_]{3,60}$'),
  language      text not null check (language in ('es', 'en_US')),
  category      text not null check (category in ('UTILITY', 'AUTHENTICATION', 'MARKETING')),
  purpose       text not null check (purpose in ('codigo', 'boletos', 'cita', 'soporte')),
  body          text not null check (char_length(body) between 10 and 1024),
  vars          jsonb not null default '[]'::jsonb,                    -- {{1}}, {{2}}… → el nombre de cada variable
  example       jsonb not null default '[]'::jsonb,                    -- los valores de ejemplo que pide Meta
  status        text not null default 'borrador' check (status in ('borrador', 'enviada', 'aprobada', 'rechazada', 'pausada', 'deshabilitada')),
  meta_id       text check (char_length(meta_id) <= 60),
  reason        text check (char_length(reason) <= 300),
  submitted_at  timestamptz,
  submitted_by  uuid references users (id),
  decided_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (name, language)
);
create or replace function wa_templates_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'una plantilla de WhatsApp no se borra (estados)'; end if;
  if tg_op = 'UPDATE' then
    if (new.name, new.language, new.category, new.purpose, new.created_at) is distinct from (old.name, old.language, old.category, old.purpose, old.created_at) then
      raise exception 'el nombre, el idioma, la categoría y el uso de una plantilla de WhatsApp no cambian';
    end if;
    -- El texto solo cambia mientras es borrador o la rechazaron (después de mandarla, Meta revisa ESE texto).
    if (new.body, new.vars, new.example) is distinct from (old.body, old.vars, old.example) and old.status not in ('borrador', 'rechazada') then
      raise exception 'el texto de una plantilla enviada a Meta no cambia';
    end if;
    new.updated_at := now();
  end if;
  return new;
end $$;
drop trigger if exists wa_templates_antes on wa_templates;
create trigger wa_templates_antes before insert or update or delete on wa_templates for each row execute function wa_templates_antes();

create table if not exists wa_template_events (
  id           bigint generated always as identity primary key,
  template_id  bigint not null references wa_templates (id),
  status       text not null check (status in ('enviada', 'aprobada', 'rechazada', 'pausada', 'deshabilitada', 'fallo')),
  reason       text check (char_length(reason) <= 300),
  via          text not null check (via in ('equipo', 'meta', 'simulador')),
  actor_id     uuid references users (id),
  at           timestamptz not null default now()
);
create index if not exists wa_template_events_plantilla on wa_template_events (template_id, at desc);
create or replace function wa_template_events_antes() returns trigger language plpgsql as $$
begin raise exception 'wa_template_events es solo de inserción'; end $$;
drop trigger if exists wa_template_events_antes on wa_template_events;
create trigger wa_template_events_antes before update or delete on wa_template_events for each row execute function wa_template_events_antes();

insert into wa_templates (name, language, category, purpose, body, vars, example) values
  ('tl_codigo', 'es', 'AUTHENTICATION', 'codigo', '*{{1}}* es tu código de verificación. Por tu seguridad, no lo compartas.', '["codigo"]', '["482913"]'),
  ('tl_codigo', 'en_US', 'AUTHENTICATION', 'codigo', '*{{1}}* is your verification code. For your security, do not share this code.', '["codigo"]', '["482913"]'),
  ('tl_boletos', 'es', 'UTILITY', 'boletos', 'Tus boletos para {{1}} están listos. Tu QR está en To''Latino › Mis boletos: {{2}}', '["evento", "enlace"]', '["Noche de bachata", "https://tolatino.com/eventos/orden/B-1042"]'),
  ('tl_boletos', 'en_US', 'UTILITY', 'boletos', 'Your tickets for {{1}} are ready. Your QR is in To''Latino › My tickets: {{2}}', '["evento", "enlace"]', '["Bachata night", "https://tolatino.com/eventos/orden/B-1042"]'),
  ('tl_cita', 'es', 'UTILITY', 'cita', 'Tu cita en {{1}} quedó confirmada para el {{2}} a las {{3}}. Detalles: {{4}}', '["negocio", "dia", "hora", "enlace"]', '["Barbería El Corte", "14/11", "3:30 PM", "https://tolatino.com/cita/C-2041"]'),
  ('tl_cita', 'en_US', 'UTILITY', 'cita', 'Your appointment at {{1}} is confirmed for {{2}} at {{3}}. Details: {{4}}', '["negocio", "dia", "hora", "enlace"]', '["Barbería El Corte", "11/14", "3:30 PM", "https://tolatino.com/cita/C-2041"]'),
  ('tl_soporte', 'es', 'UTILITY', 'soporte', 'Te respondimos en tu caso {{1}} de Soporte de To''Latino. Léelo aquí: {{2}}', '["caso", "enlace"]', '["TK-1042", "https://tolatino.com/soporte?caso=TK-1042"]'),
  ('tl_soporte', 'en_US', 'UTILITY', 'soporte', 'We replied to your To''Latino Support case {{1}}. Read it here: {{2}}', '["caso", "enlace"]', '["TK-1042", "https://tolatino.com/soporte?caso=TK-1042"]')
on conflict (name, language) do nothing;

-- ── Soporte por correo (SES → SNS firmado → /api/correo/entrada) ──
do $$ begin perform pg_temp.ampliar_check('support_cases', 'support_cases_origin_check', array['correo']); end $$;
create table if not exists support_email_in (
  id              bigint generated always as identity primary key,
  sns_message_id  text not null unique check (char_length(sns_message_id) between 1 and 100),
  ses_message_id  text not null unique check (char_length(ses_message_id) between 1 and 200),
  from_hash       text not null check (from_hash ~ '^[a-f0-9]{64}$'),
  from_enc        bytea,                                               -- el remitente cifrado; la retención lo vacía
  from_domain     text not null check (char_length(from_domain) between 1 and 253),
  subject         text check (char_length(subject) <= 200),            -- TAPADO (sin tarjetas ni seguro social)
  body            text check (char_length(body) <= 4000),              -- TAPADO; la retención lo vacía
  spf             text not null check (spf in ('PASS', 'FAIL', 'GRAY', 'PROCESSING_FAILED', 'DISABLED')),
  dkim            text not null check (dkim in ('PASS', 'FAIL', 'GRAY', 'PROCESSING_FAILED', 'DISABLED')),
  spam            text not null check (spam in ('PASS', 'FAIL', 'GRAY', 'PROCESSING_FAILED', 'DISABLED')),
  virus           text not null check (virus in ('PASS', 'FAIL', 'GRAY', 'PROCESSING_FAILED', 'DISABLED')),
  status          text not null check (status in ('caso', 'mensaje', 'sin_cuenta', 'rechazado')),
  reason          text check (reason in ('spf', 'dkim', 'spam', 'virus', 'vacio', 'varias_cuentas', 'tope')),
  user_id         uuid references users (id),
  case_id         bigint references support_cases (id),
  city_id         text not null references cities (id),
  received_at     timestamptz not null default now(),
  purged_at       timestamptz,
  check ((status in ('caso', 'mensaje')) = (case_id is not null)),
  check ((status = 'rechazado') = (reason in ('spf', 'dkim', 'spam', 'virus', 'vacio')))
);
create index if not exists support_email_in_dia on support_email_in (received_at desc);
create index if not exists support_email_in_de on support_email_in (from_hash, received_at desc);
create index if not exists support_email_in_purga on support_email_in (received_at) where purged_at is null;
create or replace function support_email_in_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'support_email_in es solo de inserción'; end if;
  if tg_op = 'INSERT' then
    new.received_at := now(); new.purged_at := null;
    if texto_con_secretos(coalesce(new.body, '')) or texto_con_secretos(coalesce(new.subject, '')) then raise exception 'support_sin_secretos: el correo se guarda tapado'; end if;
    return new;
  end if;
  -- Solo la purga (la retención o la cuenta borrada, por el mapa de datos): el asunto, el texto y el remitente cifrado pasan a vacío.
  if (new.sns_message_id, new.ses_message_id, new.from_hash, new.from_domain, new.spf, new.dkim, new.spam, new.virus, new.status, new.reason, new.user_id, new.case_id, new.city_id, new.received_at)
     is distinct from (old.sns_message_id, old.ses_message_id, old.from_hash, old.from_domain, old.spf, old.dkim, old.spam, old.virus, old.status, old.reason, old.user_id, old.case_id, old.city_id, old.received_at)
     or (new.body is distinct from old.body and new.body is not null) or (new.from_enc is distinct from old.from_enc and new.from_enc is not null)
     or (new.subject is distinct from old.subject and new.subject is not null)
     or (old.purged_at is not null and new.purged_at is distinct from old.purged_at) then
    raise exception 'support_email_in es solo de inserción (solo la purga lo vacía, una vez)';
  end if;
  return new;
end $$;
drop trigger if exists support_email_in_antes on support_email_in;
create trigger support_email_in_antes before insert or update or delete on support_email_in for each row execute function support_email_in_antes();

-- Lo que el equipo contestó fuera de la app (correo o WhatsApp dentro de las 24 h): solo inserción.
create table if not exists support_replies_out (
  id             bigint generated always as identity primary key,
  case_id        bigint not null references support_cases (id),
  message_id     bigint not null references support_messages (id),
  channel        text not null check (channel in ('correo', 'whatsapp')),
  status         text not null check (status in ('enviado', 'pruebas', 'simulado', 'ventana', 'apagado', 'sin_correo', 'fallo', 'pendiente', 'sin_proveedor', 'baja', 'silencio', 'plantilla')),
  email_id       bigint references email_outbox (id),
  compa_out_id   bigint references compa_outbound (id),
  at             timestamptz not null default now(),
  unique (message_id, channel)
);
create or replace function support_replies_out_antes() returns trigger language plpgsql as $$
begin raise exception 'support_replies_out es solo de inserción'; end $$;
drop trigger if exists support_replies_out_antes on support_replies_out;
create trigger support_replies_out_antes before update or delete on support_replies_out for each row execute function support_replies_out_antes();

-- ── Correo ──
do $$ begin perform pg_temp.ampliar_check('email_outbox', 'email_outbox_tpl_check', array['support_reply', 'support_ack', 'weekly']); end $$;
alter table email_verifications add column if not exists revoked_at timestamptz;
create table if not exists email_unsubscribes (
  id        bigint generated always as identity primary key,
  user_id   uuid not null references users (id),
  kind      text not null check (kind in ('mkt')),
  via       text not null check (via in ('un_toque', 'enlace')),
  email_id  bigint references email_outbox (id),
  at        timestamptz not null default now()
);
create index if not exists email_unsubscribes_usuario on email_unsubscribes (user_id, at desc);
create or replace function email_unsubscribes_antes() returns trigger language plpgsql as $$
begin raise exception 'email_unsubscribes es solo de inserción'; end $$;
drop trigger if exists email_unsubscribes_antes on email_unsubscribes;
create trigger email_unsubscribes_antes before update or delete on email_unsubscribes for each row execute function email_unsubscribes_antes();

-- ── Las plantillas de aviso que faltaban (ES y EN en la misma línea; el texto se edita en Notificaciones) ──
insert into notif_templates (key, grp, pref, sms, sms_mode, push, title, body) values
  ('cuenta_codigo', 'crit', null, true, 'siempre', false, '{"es":"Tu código para entrar","en":"Your sign-in code"}', '{"es":"{codigo} es tu código de To''Latino. Vence en {min} minutos. No lo compartas con nadie.","en":"{codigo} is your To''Latino code. It expires in {min} minutes. Do not share it with anyone."}'),
  ('cuenta_tel_cambio', 'crit', null, true, 'siempre', false, '{"es":"Tu número de To''Latino cambió","en":"Your To''Latino number changed"}', '{"es":"El teléfono de tu cuenta de To''Latino cambió a uno que termina en {ultimos}. Si no fuiste tú, escríbele a Soporte: {enlace}","en":"Your To''Latino account phone changed to one ending in {ultimos}. If it was not you, write to Support: {enlace}"}'),
  ('rsv_hoy', 'tx', 'cit', true, 'sin_push', true, '{"es":"Hoy tienes mesa","en":"You have a table today"}', '{"es":"Hoy a las {hora} te espera {negocio}. Si no puedes llegar, cancela desde la reservación.","en":"{negocio} is expecting you today at {hora}. If you cannot make it, cancel from the booking."}'),
  ('ord_tarde', 'tx', 'ord', true, 'sin_push', true, '{"es":"Tu pedido va tarde","en":"Your order is running late"}', '{"es":"Tu pedido #{num} en {negocio} va un poco tarde. Te avisamos en cuanto esté listo.","en":"Your order #{num} at {negocio} is running a bit late. We will let you know as soon as it is ready."}'),
  ('ord_entregado', 'tx', 'ord', true, 'sin_push', true, '{"es":"Tu pedido llegó","en":"Your order was delivered"}', '{"es":"Tu pedido #{num} de {negocio} se entregó. ¡Buen provecho!","en":"Your order #{num} from {negocio} was delivered. Enjoy!"}'),
  ('sello_ok', 'biz', null, true, 'sin_push', true, '{"es":"Tu negocio tiene el sello","en":"Your business is verified"}', '{"es":"To''Latino verificó {negocio}: el sello ya sale en tu página.","en":"To''Latino verified {negocio}: the badge now shows on your page."}'),
  ('sello_info', 'biz', null, true, 'sin_push', true, '{"es":"El sello: te falta un dato","en":"The badge: one thing is missing"}', '{"es":"Para el sello de {negocio} nos falta un dato: {motivo}. Míralo en tu panel.","en":"For the {negocio} badge we need one more thing: {motivo}. See it in your dashboard."}'),
  ('sello_no', 'biz', null, true, 'sin_push', true, '{"es":"El sello no se aprobó","en":"The badge was not approved"}', '{"es":"No pudimos verificar {negocio}: {motivo}. Puedes pedirlo otra vez desde tu panel.","en":"We could not verify {negocio}: {motivo}. You can ask again from your dashboard."}'),
  ('ciudad_abierta', 'tx', null, true, 'sin_push', true, '{"es":"To''Latino abrió en {ciudad}","en":"To''Latino opened in {ciudad}"}', '{"es":"To''Latino ya abrió en {ciudad}. Entra cuando quieras: {enlace}","en":"To''Latino is now open in {ciudad}. Come in anytime: {enlace}"}'),
  ('biz_resumen_semana', 'biz', null, false, 'nunca', true, '{"es":"Tu semana en {negocio}","en":"Your week at {negocio}"}', '{"es":"Últimos 7 días: {vistas} visitas a tu página, {ops} pedidos, citas y reservas, y {resenas} reseñas nuevas.","en":"Last 7 days: {vistas} visits to your page, {ops} orders, appointments and bookings, and {resenas} new reviews."}'),
  ('pro_d20', 'biz', null, true, 'sin_push', true, '{"es":"Te quedan 10 días de Pro","en":"10 days of Pro left"}', '{"es":"A {negocio} le quedan 10 días de la prueba Pro. Agrega una tarjeta para seguir con Pro; si no, pasa a Free sin cobrarte.","en":"{negocio} has 10 days left of the Pro trial. Add a card to keep Pro; if not, it moves to Free with no charge."}'),
  ('pro_ultimo', 'biz', null, true, 'sin_push', true, '{"es":"Hoy termina tu prueba Pro","en":"Your Pro trial ends today"}', '{"es":"Hoy es el último día de la prueba Pro de {negocio}. Sin tarjeta, mañana pasa a Free; nada se borra.","en":"Today is the last day of the {negocio} Pro trial. Without a card, it moves to Free tomorrow; nothing is deleted."}'),
  ('rec_negocio', 'tx', null, true, 'sin_push', false, '{"es":"Te recomendaron en To''Latino","en":"You were recommended on To''Latino"}', '{"es":"Hola, {quien} recomendó {negocio} en To''Latino. Publicar tu página es gratis: {enlace} Para no recibir más, responde STOP.","en":"Hi, {quien} recommended {negocio} on To''Latino. Listing your page is free: {enlace} To stop these texts, reply STOP."}'),
  ('rec_publico', 'tx', null, false, 'nunca', true, '{"es":"{negocio} ya está en To''Latino","en":"{negocio} is now on To''Latino"}', '{"es":"{negocio}, que recomendaste, ya tiene su página en To''Latino. Gracias por traerlo.","en":"{negocio}, which you recommended, now has its page on To''Latino. Thanks for bringing it."}'),
  ('busqueda_hay', 'tx', null, false, 'nunca', true, '{"es":"Ya hay {que} en {ciudad}","en":"There is {que} in {ciudad} now"}', '{"es":"Te avisamos: {negocio} ya está en To''Latino ({ciudad}).","en":"Heads up: {negocio} is now on To''Latino ({ciudad})."}'),
  ('equipo_invitado', 'tx', null, true, 'sin_push', false, '{"es":"Te invitaron a un equipo","en":"You were invited to a team"}', '{"es":"{negocio} te invitó a su equipo en To''Latino como {rol}. Tu código de invitación: {codigo}. Vence en 7 días.","en":"{negocio} invited you to its team on To''Latino as {rol}. Your invite code: {codigo}. It expires in 7 days."}'),
  ('biz_quedan_pocos', 'biz', null, true, 'sin_push', true, '{"es":"Quedan pocos","en":"Running low"}', '{"es":"Quedan {n} de {item} en {negocio}. Cuando se acabe, sale como agotado.","en":"{n} left of {item} at {negocio}. When it runs out, it shows as sold out."}'),
  ('biz_resena', 'biz', null, false, 'nunca', true, '{"es":"Reseña nueva","en":"New review"}', '{"es":"{negocio} tiene una reseña nueva de {estrellas} estrellas. Contéstala desde tu panel.","en":"{negocio} has a new {estrellas}-star review. Reply from your dashboard."}'),
  ('foto_rep_quitada', 'tx', null, true, 'sin_push', true, '{"es":"Quitamos la foto que reportaste","en":"We removed the photo you reported"}', '{"es":"Revisamos la foto que reportaste de {negocio}: la quitamos. Gracias por avisar.","en":"We reviewed the photo you reported from {negocio}: we removed it. Thanks for telling us."}'),
  ('foto_rep_queda', 'tx', null, true, 'sin_push', true, '{"es":"Revisamos la foto que reportaste","en":"We reviewed the photo you reported"}', '{"es":"Revisamos la foto que reportaste de {negocio}: cumple las reglas y se queda. Gracias por avisar.","en":"We reviewed the photo you reported from {negocio}: it follows the rules and stays. Thanks for telling us."}'),
  ('canal_tope', 'mod', null, false, 'nunca', true, '{"es":"Muchos números escriben a la vez","en":"Many numbers are texting at once"}', '{"es":"{n} números distintos escribieron en un minuto (el tope es {tope}). A los que pasan del tope no se les contesta. Míralo en Notificaciones › SMS y WhatsApp.","en":"{n} different numbers texted in one minute (the cap is {tope}). Those over the cap get no reply. See it in Notifications › SMS and WhatsApp."}')
on conflict (key) do nothing;
update notif_templates set sms_enlace = true where key in ('ord_way', 'ord_tarde', 'merc_camino', 'cita_camino', 'caja_salio', 'chofer_salida') and not sms_enlace;
-- 9l · La solicitud de empleo nueva al negocio va también por SMS (de respaldo del push), como cada respuesta a la persona (L307).
update notif_templates set sms = true where key = 'biz_job' and not sms and edited_by is null;

-- ── Configuración › Avisos y canales (sección nueva, agregada a la lista que haya) ──
do $$ begin perform pg_temp.ampliar_check('config_keys', 'config_keys_section_check', array['avisos']); end $$;
insert into config_keys (key, min, max, def, unit, section, label, help, editable, bloqueo, edit_in, sort) values
  ('sms_reintentos', 1, 5, 3, '{"es":"intentos","en":"attempts"}', 'avisos', '{"es":"SMS · intentos antes de darlo por fallido","en":"SMS · attempts before giving up"}',
    '{"es":"Si el proveedor no lo acepta o el operador no lo entrega, se vuelve a intentar con espera creciente. El código para entrar no se reintenta vencido.","en":"If the provider does not accept it or the carrier does not deliver it, it is retried with growing waits. The sign-in code is never retried once expired."}',
    true, null, null, 960),
  ('sms_reintento_min', 1, 30, 2, '{"es":"minutos","en":"minutes"}', 'avisos', '{"es":"SMS · espera antes del primer reintento","en":"SMS · wait before the first retry"}',
    '{"es":"El segundo reintento espera el doble, y así.","en":"The second retry waits twice as long, and so on."}', true, null, null, 961),
  ('canal_remitentes_min', 10, 1000, 60, '{"es":"números por minuto","en":"numbers per minute"}', 'avisos', '{"es":"Tope global · números distintos por minuto","en":"Global cap · different numbers per minute"}',
    '{"es":"Si escriben más números distintos que esto en un minuto (WhatsApp y SMS, todos los números de To''Latino y de los negocios: una inundación de números falsos), a los que llegan después del tope no se les contesta en ese minuto y el equipo recibe una alerta. STOP siempre se respeta.","en":"If more different numbers than this write in one minute (WhatsApp and SMS, every To''Latino and business number: a flood of fake numbers), those arriving after the cap get no reply that minute and the team gets an alert. STOP is always honored."}',
    true, null, null, 962),
  ('canal_stop_propia', 0, 1, 1, '{"es":"1 = la nuestra · 0 = la del proveedor","en":"1 = ours · 0 = the provider''s"}', 'avisos', '{"es":"STOP · quién confirma la baja","en":"STOP · who confirms the opt-out"}',
    '{"es":"Una sola respuesta a STOP: la nuestra (en el idioma de la persona) o la que manda el proveedor. La baja se anota siempre. Al conectar Telnyx y Meta (9q) se apaga la del perfil del proveedor o esta.","en":"A single reply to STOP: ours (in the person''s language) or the provider''s. The opt-out is always recorded. When Telnyx and Meta are connected (9q), either the provider profile reply or this one is turned off."}',
    true, null, null, 963),
  ('soporte_whatsapp', 0, 1, 1, '{"es":"1 = sí · 0 = no","en":"1 = yes · 0 = no"}', 'avisos', '{"es":"Soporte contesta por WhatsApp","en":"Support replies on WhatsApp"}',
    '{"es":"Si el caso entró por WhatsApp y la persona escribió en las últimas 24 horas, la respuesta del equipo le llega también por WhatsApp (dentro de esa ventana, Meta no cobra). Fuera de la ventana, solo con la plantilla aprobada.","en":"If the case came in on WhatsApp and the person wrote in the last 24 hours, the team reply also reaches them on WhatsApp (inside that window, Meta does not charge). Outside the window, only with the approved template."}',
    true, null, null, 964),
  ('pedido_tarde_min', 5, 120, 15, '{"es":"minutos","en":"minutes"}', 'avisos', '{"es":"Pedido tarde · avisar pasados","en":"Late order · notify after"}',
    '{"es":"Si un pedido aceptado pasa su hora de listo por estos minutos y no está listo, la persona recibe «Tu pedido va tarde» (una vez).","en":"If an accepted order passes its ready time by these minutes and is not ready, the person gets «Your order is running late» (once)."}',
    true, null, null, 965),
  ('retener_sms_dias', 7, 365, 90, '{"es":"días","en":"days"}', 'retencion', '{"es":"SMS · cuánto se guardan el teléfono y el texto","en":"SMS · how long the phone and text are kept"}',
    '{"es":"Pasado este plazo, el teléfono cifrado y el texto de cada SMS (y de los SMS a números sin cuenta) se vacían; el registro queda con su estado.","en":"After this, the encrypted phone and the text of each SMS (and of SMS to numbers without an account) are cleared; the record keeps its status."}',
    true, null, null, 908),
  ('retener_correo_entrante_dias', 30, 730, 365, '{"es":"días","en":"days"}', 'retencion', '{"es":"Correo a Soporte · cuánto se guarda","en":"Email to Support · how long it is kept"}',
    '{"es":"El texto y el remitente cifrado de un correo que entró a Soporte se vacían pasado este plazo; el caso sigue con su conversación.","en":"The text and encrypted sender of an email that came into Support are cleared after this; the case keeps its conversation."}',
    true, null, null, 909)
on conflict (key) do nothing;

commit;
