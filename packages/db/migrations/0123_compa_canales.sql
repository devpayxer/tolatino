-- 0123 · compa_canales (7h · docs/diseno/plan/fase7-compa.md §2 0123, §3 «Canales WhatsApp y SMS» y §4 7h). El Compa por WhatsApp y SMS:
-- la entrada llega por un webhook propio con la FIRMA del proveedor verificada (Telnyx: Ed25519 con su hora; WhatsApp Cloud API:
-- X-Hub-Signature-256 con el secreto de la app), una sola vez por id de mensaje, con límite por teléfono. El teléfono solo identifica a una
-- CUENTA ACTIVA con ese teléfono VERIFICADO que encendió «Hablar con El Compa por WhatsApp y SMS» en Mi cuenta › Avisos; si no, la respuesta
-- fija (nunca datos de una cuenta). Las acciones NUNCA se hacen por mensaje: El Compa manda un ENLACE DE UN USO que abre la confirmación en
-- la app después de entrar como siempre (nunca entra solo). Un negocio Pro puede tener su número conectado: ahí contestan sus respuestas
-- automáticas (7f) por ese canal, a cualquiera, sin datos de ninguna cuenta. Esta base suma:
-- · compa_channel_numbers: los números que reciben (de To'Latino o de un negocio), por proveedor; se retiran, no se borran.
-- · compa_inbound (SOLO INSERCIÓN salvo su procesamiento, que solo avanza): cada mensaje que entró con firma buena, único por
--   (proveedor, provider_msg_id); el teléfono como huella (HMAC) y cifrado para contestar; el texto TAPADO. La purga por retención
--   (compa_canal_retener_dias) vacía el texto y el teléfono cifrado; nada se borra.
-- · compa_canal_rechazos: cuántas entradas se rechazaron por día, proveedor y motivo (firma, hora, tamaño), sin nada de lo que traían.
-- · compa_outbound (la salida): cada mensaje que El Compa mandó o NO mandó y por qué (simulado en el sandbox, baja, silencio, ventana de
--   24 h de WhatsApp, apagado); solo avanza su estado. En el sandbox es el buzón del simulador.
-- · compa_links: el enlace de un uso (la huella del token, nunca el token) atado a UNA acción y UNA persona, con vencimiento
--   (compa_link_min); se usa una vez (used_at), no se borra.
-- · compa_canal_consent (SOLO INSERCIÓN): las bajas y altas (STOP / START) por teléfono y número, y el encendido o apagado del canal desde
--   Mi cuenta (trigger sobre users.notif_prefs «cpa»). La baja vale al instante: la salida la lee antes de cada envío (y los avisos por SMS).
-- · compa_conversations.surface suma «channel»; compa_messages.contact_phone_hash (un mensaje de alguien sin cuenta a un negocio).
-- · notifications / phone_messages.sms_status suman «baja» (el teléfono pidió STOP).
-- · Configuración › El Compa: compa_link_min 30, compa_canal_msgs_dia 30, compa_canal_respuesta_min 5, compa_canal_retener_dias 30,
--   compa_canal_firma_seg 300.
-- Sin semilla (los números de prueba los agrega el Admin en el sandbox). Idempotente: se puede aplicar dos veces.
begin;

-- ── Los números que reciben ──
create table if not exists compa_channel_numbers (
  id            bigint generated always as identity primary key,
  channel       text not null check (channel in ('sms', 'whatsapp')),
  provider      text not null check (provider in ('telnyx', 'whatsapp', 'sim')),
  -- SMS: el número E.164; WhatsApp: el phone_number_id de Meta (solo dígitos).
  address       text not null check (address ~ '^(\+1[2-9][0-9]{9}|[0-9]{6,20})$'),
  business_id   text references businesses (id),            -- null = To'Latino (El Compa de los vecinos)
  city_id       text not null references cities (id),
  status        text not null default 'active' check (status in ('active', 'retired')),
  reason        text not null check (char_length(reason) between 3 and 300),
  added_by      uuid not null references users (id),
  created_at    timestamptz not null default now(),
  retired_at    timestamptz,
  retired_by    uuid references users (id),
  retire_reason text check (char_length(retire_reason) <= 300),
  check (provider = 'sim' or (provider = 'telnyx') = (channel = 'sms')),
  check (channel <> 'sms' or address ~ '^\+1[2-9][0-9]{9}$'),
  check ((status = 'retired') = (retired_at is not null) and (retired_at is null) = (retired_by is null))
);
create unique index if not exists compa_numeros_vivos on compa_channel_numbers (provider, address) where status = 'active';
create index if not exists compa_numeros_negocio on compa_channel_numbers (business_id, channel) where status = 'active';
create or replace function compa_channel_numbers_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'un número de El Compa no se borra: se retira'; end if;
  if tg_op = 'UPDATE' then
    if old.status = 'retired' or new.status <> 'retired'
       or (new.channel, new.provider, new.address, new.business_id, new.city_id, new.reason, new.added_by, new.created_at)
          is distinct from (old.channel, old.provider, old.address, old.business_id, old.city_id, old.reason, old.added_by, old.created_at) then
      raise exception 'de un número de El Compa solo cambia, una vez, que se retira';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists compa_channel_numbers_antes on compa_channel_numbers;
create trigger compa_channel_numbers_antes before update or delete on compa_channel_numbers for each row execute function compa_channel_numbers_antes();

-- ── Lo que entró (con firma buena) ──
create table if not exists compa_inbound (
  id               bigint generated always as identity primary key,
  provider         text not null check (provider in ('telnyx', 'whatsapp', 'sim')),
  channel          text not null check (channel in ('sms', 'whatsapp')),
  provider_msg_id  text not null check (char_length(provider_msg_id) between 1 and 200),
  signature_ok     boolean not null check (signature_ok),         -- lo que no tiene firma buena no llega aquí (se cuenta en compa_canal_rechazos)
  from_hash        text not null check (from_hash ~ '^[a-f0-9]{64}$'),
  from_enc         text,                                          -- cifrado (lib/cifrado.ts) para poder contestar; la purga lo vacía
  to_number        text not null check (char_length(to_number) <= 40),
  number_id        bigint references compa_channel_numbers (id),  -- null = no es un número nuestro (no se contesta)
  business_id      text references businesses (id),
  city_id          text not null references cities (id),
  kind             text not null check (kind in ('text', 'stop', 'start', 'help', 'media', 'other')),
  body             text check (char_length(body) <= 2000),        -- TAPADO; la purga lo vacía
  provider_at      timestamptz,
  received_at      timestamptz not null default now(),
  -- El procesamiento (lo único que cambia, y solo avanza):
  estado           text not null default 'recibido' check (estado in ('recibido', 'procesando', 'hecho', 'fallo')),
  attempts         smallint not null default 0 check (attempts between 0 and 10),
  user_id          uuid references users (id),
  conversation_id  bigint references compa_conversations (id),
  result           text check (result in ('respuesta', 'enlace', 'persona', 'fija', 'baja', 'alta', 'ayuda', 'en_baja', 'limite', 'apagado', 'tope', 'auto',
                                          'auto_paso', 'auto_nada', 'sin_ruta', 'media', 'error')),
  processed_at     timestamptz,
  purged_at        timestamptz,
  unique (provider, provider_msg_id)
);
create index if not exists compa_inbound_tel on compa_inbound (from_hash, received_at desc);
create index if not exists compa_inbound_lista on compa_inbound (received_at desc, id desc);
create index if not exists compa_inbound_pendientes on compa_inbound (received_at) where estado in ('recibido', 'procesando');
create index if not exists compa_inbound_purga on compa_inbound (received_at) where purged_at is null;
create or replace function compa_inbound_antes() returns trigger language plpgsql as $$
declare orden constant text[] := array['recibido', 'procesando', 'hecho', 'fallo'];
begin
  if tg_op = 'DELETE' then raise exception 'compa_inbound es solo de inserción'; end if;
  if tg_op = 'INSERT' then
    new.received_at := now(); new.estado := 'recibido'; new.attempts := 0; new.result := null; new.processed_at := null; new.purged_at := null;
    if texto_con_secretos(coalesce(new.body, '')) then raise exception 'compa_sin_secretos: la entrada no guarda números de tarjeta ni de seguro social'; end if;
    return new;
  end if;
  if (new.provider, new.channel, new.provider_msg_id, new.signature_ok, new.from_hash, new.to_number, new.number_id, new.business_id, new.city_id, new.kind, new.provider_at, new.received_at)
     is distinct from (old.provider, old.channel, old.provider_msg_id, old.signature_ok, old.from_hash, old.to_number, old.number_id, old.business_id, old.city_id, old.kind, old.provider_at, old.received_at) then
    raise exception 'compa_inbound es solo de inserción (solo avanza su procesamiento y la purga)';
  end if;
  -- La purga: el texto y el teléfono cifrado solo pasan a vacío, una vez, después de la retención.
  if (new.body is distinct from old.body or new.from_enc is distinct from old.from_enc) then
    if new.body is not null or new.from_enc is not null or old.purged_at is not null or new.purged_at is null then
      raise exception 'compa_inbound: el texto y el teléfono solo se vacían con la purga';
    end if;
  end if;
  if old.purged_at is not null and new.purged_at is distinct from old.purged_at then raise exception 'compa_inbound: la purga es una vez'; end if;
  if array_position(orden, new.estado) < array_position(orden, old.estado) or (old.estado in ('hecho', 'fallo') and new.estado <> old.estado) then
    raise exception 'compa_inbound: el procesamiento solo avanza';
  end if;
  if old.user_id is not null and new.user_id is distinct from old.user_id then raise exception 'compa_inbound: la cuenta no cambia'; end if;
  if old.conversation_id is not null and new.conversation_id is distinct from old.conversation_id then raise exception 'compa_inbound: la conversación no cambia'; end if;
  if old.result is not null and new.result is distinct from old.result then raise exception 'compa_inbound: el resultado se anota una vez'; end if;
  return new;
end $$;
drop trigger if exists compa_inbound_antes on compa_inbound;
create trigger compa_inbound_antes before insert or update or delete on compa_inbound for each row execute function compa_inbound_antes();

-- ── Lo rechazado (sin nada de lo que traía): cuántos por día, proveedor y motivo ──
create table if not exists compa_canal_rechazos (
  day       date not null default ((now() at time zone 'America/New_York')::date),
  provider  text not null check (provider in ('telnyx', 'whatsapp', 'otro')),
  reason    text not null check (reason in ('firma', 'hora', 'tamano', 'formato', 'sin_secreto')),
  n         integer not null default 0 check (n >= 0),
  primary key (day, provider, reason)
);

-- ── La salida (lo que El Compa mandó o no mandó, y por qué) ──
create table if not exists compa_outbound (
  id                bigint generated always as identity primary key,
  inbound_id        bigint references compa_inbound (id),
  channel           text not null check (channel in ('sms', 'whatsapp')),
  provider          text not null check (provider in ('telnyx', 'whatsapp', 'sim')),
  number_id         bigint references compa_channel_numbers (id),
  to_hash           text not null check (to_hash ~ '^[a-f0-9]{64}$'),
  user_id           uuid references users (id),
  conversation_id   bigint references compa_conversations (id),
  business_id       text references businesses (id),
  city_id           text not null references cities (id),
  kind              text not null check (kind in ('respuesta', 'enlace', 'fija', 'baja', 'alta', 'ayuda', 'limite', 'auto')),
  body              text check (char_length(body) between 1 and 1600),   -- TAPADO; la purga lo vacía
  status            text not null check (status in ('simulado', 'pendiente', 'enviado', 'fallo', 'apagado', 'baja', 'silencio', 'ventana', 'sin_proveedor')),
  provider_msg_id   text check (char_length(provider_msg_id) <= 200),
  error             text check (char_length(error) <= 200),
  created_at        timestamptz not null default now(),
  sent_at           timestamptz,
  purged_at         timestamptz
);
create index if not exists compa_outbound_entrada on compa_outbound (inbound_id);
create index if not exists compa_outbound_tel on compa_outbound (to_hash, created_at desc);
create index if not exists compa_outbound_purga on compa_outbound (created_at) where purged_at is null;
create or replace function compa_outbound_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'compa_outbound es solo de inserción'; end if;
  if tg_op = 'INSERT' then
    new.created_at := now(); new.purged_at := null;
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
  -- Solo «pendiente» avanza (a enviado o falló); lo decidido no cambia.
  if new.status is distinct from old.status and not (old.status = 'pendiente' and new.status in ('enviado', 'fallo')) then
    raise exception 'compa_outbound: ese envío ya se decidió';
  end if;
  return new;
end $$;
drop trigger if exists compa_outbound_antes on compa_outbound;
create trigger compa_outbound_antes before insert or update or delete on compa_outbound for each row execute function compa_outbound_antes();

-- ── El enlace de un uso (abre la confirmación en la app después de entrar como siempre) ──
create table if not exists compa_links (
  token_hash       text primary key check (token_hash ~ '^[a-f0-9]{64}$'),   -- sha256 del token; el token solo va en el mensaje
  action_id        uuid not null unique references compa_actions (id),
  user_id          uuid not null references users (id),                      -- la única cuenta que lo puede usar
  conversation_id  bigint not null references compa_conversations (id),
  channel          text not null check (channel in ('sms', 'whatsapp')),
  inbound_id       bigint references compa_inbound (id),
  created_at       timestamptz not null default now(),
  expires_at       timestamptz not null,
  used_at          timestamptz,
  used_result      text check (used_result in ('confirmed', 'dismissed', 'expired', 'failed')),
  check ((used_at is null) = (used_result is null)),
  check (expires_at > created_at)
);
create index if not exists compa_links_usuario on compa_links (user_id, created_at desc);
create or replace function compa_links_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'un enlace de El Compa no se borra'; end if;
  if tg_op = 'INSERT' then new.created_at := now(); new.used_at := null; new.used_result := null; return new; end if;
  if old.used_at is not null then raise exception 'compa_enlace_usado: ese enlace ya se usó'; end if;
  if (new.token_hash, new.action_id, new.user_id, new.conversation_id, new.channel, new.inbound_id, new.created_at, new.expires_at)
     is distinct from (old.token_hash, old.action_id, old.user_id, old.conversation_id, old.channel, old.inbound_id, old.created_at, old.expires_at) then
    raise exception 'de un enlace de El Compa solo se anota, una vez, que se usó';
  end if;
  if new.used_at is null then raise exception 'de un enlace de El Compa solo se anota, una vez, que se usó'; end if;
  if old.expires_at < now() and new.used_result <> 'expired' then raise exception 'compa_enlace_vencido: ese enlace ya venció'; end if;
  new.used_at := now();
  return new;
end $$;
drop trigger if exists compa_links_antes on compa_links;
create trigger compa_links_antes before insert or update or delete on compa_links for each row execute function compa_links_antes();

-- ── Bajas y altas (STOP / START) y el canal encendido desde Mi cuenta (solo inserción) ──
create table if not exists compa_canal_consent (
  id           bigint generated always as identity primary key,
  phone_hash   text check (phone_hash ~ '^[a-f0-9]{64}$'),
  user_id      uuid references users (id),
  channel      text check (channel in ('sms', 'whatsapp')),          -- null = los dos (Mi cuenta)
  business_id  text references businesses (id),                     -- null = To'Latino
  action       text not null check (action in ('stop', 'start', 'optin', 'optout')),
  via          text not null check (via in ('mensaje', 'cuenta', 'simulador')),
  inbound_id   bigint references compa_inbound (id),
  at           timestamptz not null default now(),
  check ((action in ('stop', 'start')) = (phone_hash is not null and channel is not null)),
  check ((action in ('optin', 'optout')) = (user_id is not null and via = 'cuenta'))
);
create index if not exists compa_consent_tel on compa_canal_consent (phone_hash, channel, id desc) where phone_hash is not null;
create index if not exists compa_consent_usuario on compa_canal_consent (user_id, id desc) where user_id is not null;
create or replace function compa_canal_consent_antes() returns trigger language plpgsql as $$
begin
  if tg_op <> 'INSERT' then raise exception 'compa_canal_consent es solo de inserción'; end if;
  new.at := now();
  return new;
end $$;
drop trigger if exists compa_canal_consent_antes on compa_canal_consent;
create trigger compa_canal_consent_antes before insert or update or delete on compa_canal_consent for each row execute function compa_canal_consent_antes();
-- ¿Este teléfono pidió STOP a ese número (To'Latino o un negocio) por ese canal? La última palabra manda.
create or replace function compa_canal_en_baja(p_hash text, p_canal text, p_negocio text) returns boolean language sql stable as $$
  select coalesce((select action = 'stop' from compa_canal_consent where phone_hash = p_hash and channel = p_canal and business_id is not distinct from p_negocio
                    and action in ('stop', 'start') order by id desc limit 1), false)
$$;
-- Encender o apagar «Hablar con El Compa por WhatsApp y SMS» en Mi cuenta (notif_prefs.cpa) queda anotado (quién, cuándo).
create or replace function users_compa_canal_consent() returns trigger language plpgsql as $$
begin
  if coalesce(new.notif_prefs->>'cpa', 'false') is distinct from coalesce(old.notif_prefs->>'cpa', 'false') then
    insert into compa_canal_consent (user_id, action, via) values (new.id, case when new.notif_prefs->>'cpa' = 'true' then 'optin' else 'optout' end, 'cuenta');
  end if;
  return null;
end $$;
drop trigger if exists users_compa_canal_consent on users;
create trigger users_compa_canal_consent after update of notif_prefs on users for each row execute function users_compa_canal_consent();

-- ── La conversación por un canal y el mensaje de alguien sin cuenta ──
alter table compa_conversations drop constraint if exists compa_conversations_surface_check;
alter table compa_conversations add constraint compa_conversations_surface_check check (surface in ('support_page', 'help_sheet', 'panel', 'business_chat', 'ticket', 'channel'));
create index if not exists compa_conv_contacto on compa_conversations (contact_phone_hash, business_id, started_at desc) where contact_phone_hash is not null;
create index if not exists compa_conv_canal on compa_conversations (user_id, channel, started_at desc) where surface = 'channel' and closed_at is null;
alter table compa_messages add column if not exists contact_phone_hash text check (contact_phone_hash ~ '^[a-f0-9]{64}$');
alter table compa_messages drop constraint if exists compa_messages_check1;
alter table compa_messages add constraint compa_messages_check1 check (sender <> 'user' or user_id is not null or contact_phone_hash is not null);
create index if not exists compa_messages_contacto on compa_messages (contact_phone_hash, at desc) where sender = 'user' and contact_phone_hash is not null;

-- ── STOP también apaga los avisos por SMS de ese teléfono ──
alter table notifications drop constraint if exists notifications_sms_status_check;
alter table notifications add constraint notifications_sms_status_check check (sms_status in ('no', 'pruebas', 'pendiente', 'enviado', 'fallo', 'silencio', 'apagado', 'sin_proveedor', 'baja'));
alter table phone_messages drop constraint if exists phone_messages_sms_status_check;
alter table phone_messages add constraint phone_messages_sms_status_check check (sms_status in ('pruebas', 'pendiente', 'enviado', 'fallo', 'silencio', 'sin_proveedor', 'baja'));

-- ── Configuración › El Compa ──
insert into config_keys (key, min, max, def, unit, section, label, help, editable, bloqueo, edit_in, sort) values
  ('compa_link_min', 5, 60, 30, '{"es":"minutos","en":"minutes"}', 'compa', '{"es":"Vigencia del enlace de WhatsApp y SMS","en":"WhatsApp and SMS link lifetime"}',
    '{"es":"El enlace de un uso que manda El Compa para confirmar algo en la app. Pasado esto ya no abre nada.","en":"The one-use link El Compa sends to confirm something in the app. After this it opens nothing."}', true, null, null, 225),
  ('compa_canal_msgs_dia', 5, 200, 30, '{"es":"mensajes al día","en":"messages per day"}', 'compa', '{"es":"Mensajes por teléfono al día (WhatsApp y SMS)","en":"Messages per phone per day (WhatsApp and SMS)"}',
    '{"es":"Pasado esto, El Compa avisa una vez y ese día no contesta más a ese teléfono.","en":"Past this, El Compa says so once and does not reply to that phone again that day."}', true, null, null, 226),
  ('compa_canal_respuesta_min', 0, 30, 5, '{"es":"minutos","en":"minutes"}', 'compa', '{"es":"Respuesta a tiempo por WhatsApp y SMS","en":"On-time reply by WhatsApp and SMS"}',
    '{"es":"Una respuesta dentro de estos minutos después del mensaje de la persona sale a cualquier hora (contesta lo que preguntó). Más tarde respeta las horas de silencio (10 PM a 7 AM de su ciudad). 0 = siempre las respeta.","en":"A reply within these minutes of the person''s message goes out at any hour (it answers what they asked). Later it respects quiet hours (10 PM to 7 AM in their city). 0 = always respects them."}', true, null, null, 227),
  ('compa_canal_retener_dias', 7, 90, 30, '{"es":"días","en":"days"}', 'compa', '{"es":"Texto de lo que entra y sale por WhatsApp y SMS","en":"Text of what comes in and goes out by WhatsApp and SMS"}',
    '{"es":"Pasado esto se vacían el texto y el teléfono cifrado del registro de entrada y salida (quedan las cifras). La conversación sigue su propia retención.","en":"After this, the text and the encrypted phone are emptied from the in/out log (counts remain). The conversation keeps its own retention."}', true, null, null, 228),
  ('compa_canal_firma_seg', 60, 900, 300, '{"es":"segundos","en":"seconds"}', 'compa', '{"es":"Ventana de la hora firmada (Telnyx)","en":"Signed timestamp window (Telnyx)"}',
    '{"es":"Una entrada firmada con una hora más vieja o más nueva que esto se rechaza (repetición).","en":"A signed entry with a timestamp older or newer than this is rejected (replay)."}', true, null, null, 229)
on conflict (key) do update set min = excluded.min, max = excluded.max, def = excluded.def, unit = excluded.unit, section = excluded.section,
  label = excluded.label, help = excluded.help, editable = excluded.editable, bloqueo = excluded.bloqueo, edit_in = excluded.edit_in, sort = excluded.sort;

commit;
