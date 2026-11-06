-- 0038 · Mensajes cliente ↔ negocio (bloque 2p; modelo ChatThread · Message; Mi cuenta USR-MENSAJES / USR-CHAT-NEG y Panel
-- v2 «Mensajes»). Una conversación por vecino y negocio; el contexto (pedido, reservación o consulta) es el más reciente.
-- Los teléfonos no viajan por el chat: el negocio comparte el suyo con un botón (queda como mensaje del sistema).
-- Respuesta automática fuera de horario (opcional, del negocio). Nada se borra: un mensaje se oculta con motivo.
-- El equipo de To'Latino no lee chats salvo con un reporte abierto (content_reports.target_kind = 'chat').
begin;

create table if not exists chat_threads (
  id                 bigint generated always as identity primary key,
  kind               text not null default 'user_business' check (kind in ('user_business')),
  user_id            uuid not null references users (id),
  business_id        text not null references businesses (id),
  city_id            text references cities (id),
  operation_id       bigint references operations (id),                    -- contexto: el pedido o la reservación más reciente
  context            jsonb,                                               -- {es, en}: «Pedido #1051», «Consulta general»
  assigned_user_id   uuid references users (id),                         -- quién del equipo la lleva (Pro con equipo)
  last_at            timestamptz not null default now(),
  last_from          text not null default 'user' check (last_from in ('user', 'business', 'auto', 'system')),
  last_text          text check (char_length(last_text) <= 160),         -- derivado para la lista
  user_unread        integer not null default 0 check (user_unread >= 0), -- derivados: los escribe solo el servidor
  biz_unread         integer not null default 0 check (biz_unread >= 0),
  user_read_at       timestamptz,
  biz_read_at        timestamptz,
  biz_notified_at    timestamptz,                                         -- para no avisar al negocio por cada mensaje
  phone_shared_at    timestamptz,
  blocked_at         timestamptz,                                         -- el negocio bloqueó a esta persona
  blocked_by         uuid references users (id),
  created_at         timestamptz not null default now(),
  unique (user_id, business_id)
);
create index if not exists chat_threads_user_idx on chat_threads (user_id, last_at desc);
create index if not exists chat_threads_biz_idx on chat_threads (business_id, last_at desc);

create table if not exists chat_messages (
  id              bigint generated always as identity primary key,
  thread_id       bigint not null references chat_threads (id),
  sender          text not null check (sender in ('user', 'business', 'auto', 'system')),
  sender_user_id  uuid references users (id),                             -- la persona (cliente o del equipo)
  body            text not null check (char_length(body) between 1 and 1000),
  hidden_at       timestamptz,
  hidden_reason   text check (char_length(hidden_reason) <= 300),
  created_at      timestamptz not null default now()
);
create index if not exists chat_messages_thread_idx on chat_messages (thread_id, id);
create index if not exists chat_messages_sender_idx on chat_messages (sender_user_id, created_at desc);

-- Ajustes de Mensajes del negocio (respuesta automática fuera de horario).
alter table businesses add column if not exists chat_auto_reply boolean not null default false;

-- Reportar una conversación.
alter table content_reports drop constraint if exists content_reports_target_kind_check;
alter table content_reports add constraint content_reports_target_kind_check check (target_kind in ('review', 'post', 'comment', 'chat'));

insert into notif_templates (key, grp, pref, sms, title, body) values
  ('msg_user', 'tx', null, false, '{"es": "Mensaje de {negocio}", "en": "Message from {negocio}"}', '{"es": "{negocio}: {texto}", "en": "{negocio}: {texto}"}'),
  ('biz_msg', 'biz', null, true, '{"es": "Un cliente te escribió", "en": "A customer wrote to you"}', '{"es": "{cliente} te escribió en To’Latino: «{texto}». Contesta en Mensajes.", "en": "{cliente} wrote to you on To’Latino: “{texto}”. Reply in Messages."}')
on conflict (key) do nothing;

commit;
