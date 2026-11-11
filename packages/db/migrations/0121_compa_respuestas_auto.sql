-- 0121 · compa_respuestas_auto (7f · docs/diseno/plan/fase7-compa.md §2 0121, §3 «Respuesta automática» y §4 7f). Respuestas automáticas de
-- El Compa en Mensajes (solo Pro, apagadas de fábrica, «fuera de tu horario») y «Sugerir respuesta con El Compa». El motor es de 0118; esta
-- base suma:
-- · compa_negocio_pro(): ¿el negocio tiene Pro AHORA? (el plan derivado y la suscripción vigente: una prueba, cortesía o «pasar a Free»
--   vencidas que todavía no procesó el barrido NO cuentan). La usan el servidor al decidir y la base al encender.
-- · compa_business_settings (MD L1542): una fila por negocio (la crea quien la enciende; sin fila = apagado). enabled false de fábrica;
--   «when» closed (7f solo contesta fuera del horario del negocio; no_reply_10m y always quedan para después); temas ⊆ hours · menu ·
--   how_to_order · faq (al menos uno); canales ⊆ app · whatsapp · sms (la app siempre; WhatsApp y SMS se encienden en 7h); la nota del dueño
--   {es, en} ≤ 400. La base no deja encender sin Pro (compa_solo_pro) y no se borra. «Apagado por To'Latino» NO vive aquí: es la pausa del
--   negocio de 0118 (compa_pauses, nivel auto_reply o todo El Compa), una sola fuente para los interruptores.
-- · chat_messages.compa: la respuesta automática de El Compa (sender 'auto', compa true) frente a la respuesta fija de siempre
--   (chat_auto_reply, sender 'auto', compa false). El cliente la ve como «EL COMPA · IA».
-- · chat_threads.compa_pending_until: El Compa tiene que contestar este hilo (lo marca el mensaje del cliente; lo limpia la respuesta). Si el
--   proceso se cae, el barrido lo retoma. chat_threads.compa_off_*: «Apagar El Compa aquí» en UNA conversación (Super Admin, con motivo; se
--   enciende otra vez, no se borra).
-- · compa_conversations.chat_thread_id: la conversación de El Compa (uso auto_reply, superficie business_chat) de ese hilo;
--   compa_handoffs.chat_message_id: la respuesta en Mensajes con la que El Compa le pasó el hilo al negocio.
-- · content_reports.reason suma 'compa' («Una respuesta de El Compa no está bien»).
-- · Avisos: compa_te_paso (al dueño y a quien lleva Mensajes: El Compa le pasó un mensaje que no podía contestar; uno por hilo hasta que el
--   negocio conteste), compa_auto_apagado y compa_auto_levantado (al dueño, cuando To'Latino las apaga o las vuelve a dejar).
-- · Configuración › El Compa: compa_auto_hilo_max (mensajes de El Compa seguidos sin que el negocio conteste; el último ya es «Le paso tu
--   mensaje»), compa_auto_dia_negocio (respuestas por negocio al día) y compa_auto_espera_min (para «si no contestas en 10 min», bloqueada).
-- Idempotente: se puede aplicar dos veces.
begin;

-- ── ¿Pro ahora? ──
create or replace function compa_negocio_pro(bid text) returns boolean language sql stable as $$
  select coalesce((select s.plan = 'pro' from business_stats_cache s where s.business_id = bid), false)
     and not exists (select 1 from subscriptions x where x.business_id = bid and (
           x.status = 'ended'
        or (x.status = 'trial' and x.trial_ends_at <= now())
        or (x.status = 'courtesy' and x.courtesy_until <= now())
        or (x.status = 'canceling' and x.current_period_end <= now())))
$$;

-- ── Ajustes de las respuestas automáticas por negocio ──
create table if not exists compa_business_settings (
  business_id  text primary key references businesses (id),
  city_id      text not null references cities (id),
  enabled      boolean not null default false,
  "when"       text not null default 'closed' check ("when" in ('closed', 'no_reply_10m', 'always')),
  topics       text[] not null default '{hours,menu,how_to_order,faq}'
                 check (cardinality(topics) between 1 and 4 and topics <@ '{hours,menu,how_to_order,faq}'::text[]),
  channels     text[] not null default '{app}'
                 check (cardinality(channels) between 1 and 3 and channels <@ '{app,whatsapp,sms}'::text[] and 'app' = any (channels)),
  owner_note   jsonb not null default '{"es":"","en":""}'::jsonb
                 check (owner_note ? 'es' and owner_note ? 'en' and char_length(owner_note->>'es') <= 400 and char_length(owner_note->>'en') <= 400),
  updated_by   uuid references users (id),
  updated_at   timestamptz not null default now(),
  created_at   timestamptz not null default now()
);
create index if not exists compa_business_settings_on on compa_business_settings (city_id) where enabled;
create or replace function compa_business_settings_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'los ajustes de las respuestas automáticas no se borran: se apagan (enabled false)'; end if;
  if tg_op = 'UPDATE' and (new.business_id <> old.business_id or new.created_at <> old.created_at) then raise exception 'el negocio de unos ajustes no cambia'; end if;
  -- Solo Pro: encenderlas pide Pro vigente (el servidor lo revisa antes; esto es la segunda llave).
  if new.enabled and (tg_op = 'INSERT' or not old.enabled) and not compa_negocio_pro(new.business_id) then
    raise exception 'compa_solo_pro: las respuestas automáticas de El Compa son de Pro';
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists compa_business_settings_antes on compa_business_settings;
create trigger compa_business_settings_antes before insert or update or delete on compa_business_settings for each row execute function compa_business_settings_antes();

-- ── Mensajes: la respuesta de El Compa frente a la respuesta fija ──
alter table chat_messages add column if not exists compa boolean not null default false;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'chat_messages_compa_auto') then
    alter table chat_messages add constraint chat_messages_compa_auto check (not compa or sender = 'auto');
  end if;
end $$;
alter table chat_threads add column if not exists compa_pending_until timestamptz;
alter table chat_threads add column if not exists compa_off_at timestamptz;
alter table chat_threads add column if not exists compa_off_by uuid references users (id);
alter table chat_threads add column if not exists compa_off_reason text check (char_length(compa_off_reason) <= 300);
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'chat_threads_compa_off') then
    alter table chat_threads add constraint chat_threads_compa_off check ((compa_off_at is null) = (compa_off_by is null) and (compa_off_at is null) = (compa_off_reason is null));
  end if;
end $$;
create index if not exists chat_threads_compa_pendiente on chat_threads (compa_pending_until) where compa_pending_until is not null;
-- Contar lo que El Compa contestó hoy en un negocio (tope por negocio) y su registro en el panel.
create index if not exists chat_messages_compa on chat_messages (thread_id, created_at desc) where compa;

-- ── La conversación de El Compa de un hilo de Mensajes ──
alter table compa_conversations add column if not exists chat_thread_id bigint;   -- como compa_handoffs.chat_thread_id (0118): sin llave foránea (nada se borra en la app)
create index if not exists compa_conv_hilo on compa_conversations (chat_thread_id, started_at desc) where chat_thread_id is not null;
-- Cuando pasa al negocio: la respuesta de El Compa en Mensajes que lo dijo (para «TE LO PASÓ» en el registro del panel).
alter table compa_handoffs add column if not exists chat_message_id bigint;   -- como chat_thread_id (0118): sin llave foránea; nada se borra en la app

-- ── Reportar una respuesta de El Compa ──
alter table content_reports drop constraint if exists content_reports_reason_check;
alter table content_reports add constraint content_reports_reason_check check (reason in ('fake', 'off', 'pii', 'spam', 'coi', 'otro', 'negocio', 'priv', 'acoso', 'falso', 'propio', 'compa'));

-- ── Avisos ──
insert into notif_templates (key, grp, pref, sms, title, body) values
  ('compa_te_paso', 'biz', null, false, '{"es":"El Compa te pasó un mensaje de {cliente}","en":"El Compa passed you a message from {cliente}"}',
    '{"es":"{cliente} escribió «{texto}». Eso lo decides tú: contéstale en Mensajes.","en":"{cliente} wrote “{texto}”. That is your call: reply in Messages."}'),
  ('compa_auto_apagado', 'biz', null, false, '{"es":"To''Latino apagó las respuestas automáticas de {negocio}","en":"To''Latino turned off auto-replies for {negocio}"}',
    '{"es":"Motivo: {motivo}. Tus clientes esperan tu respuesta como antes. Si crees que es un error, escríbele a Soporte.","en":"Reason: {motivo}. Your clients wait for your reply as before. If you think it is a mistake, write to Support."}'),
  ('compa_auto_levantado', 'biz', null, false, '{"es":"To''Latino volvió a permitir las respuestas automáticas de {negocio}","en":"To''Latino allowed auto-replies for {negocio} again"}',
    '{"es":"Si las tenías encendidas, El Compa vuelve a contestar fuera de tu horario. Lo ves en tu panel › El Compa.","en":"If you had them on, El Compa replies again when you are closed. See it in your dashboard › El Compa."}')
on conflict (key) do update set title = excluded.title, body = excluded.body
  where notif_templates.edited_by is null;

-- ── Configuración › El Compa ──
insert into config_keys (key, min, max, def, unit, section, label, help, editable, bloqueo, edit_in, sort) values
  ('compa_auto_hilo_max', 2, 20, 6, '{"es":"mensajes seguidos","en":"messages in a row"}', 'compa', '{"es":"Respuestas automáticas seguidas en una conversación","en":"Auto-replies in a row in one conversation"}',
    '{"es":"Cuántos mensajes de El Compa salen seguidos sin que el negocio conteste; el último ya es «Le paso tu mensaje» y después espera al negocio.","en":"How many El Compa messages go out in a row before the business replies; the last one is «I passed your message on» and then it waits for the business."}', true, null, null, 221),
  ('compa_auto_dia_negocio', 10, 5000, 200, '{"es":"respuestas al día","en":"replies per day"}', 'compa', '{"es":"Respuestas automáticas por negocio al día","en":"Auto-replies per business per day"}',
    '{"es":"Pasado esto, ese día el negocio vuelve a la respuesta de siempre (la fija, si la tiene) y sus clientes esperan su respuesta.","en":"Past this, that day the business goes back to the usual reply (the fixed one, if it has it) and its clients wait for its reply."}', true, null, null, 222),
  ('compa_auto_espera_min', 1, 60, 10, '{"es":"minutos","en":"minutes"}', 'compa', '{"es":"«Si no contestas en» (respuestas automáticas)","en":"«If you do not reply in» (auto-replies)"}',
    '{"es":"Para la opción «Si no contestas en 10 min». Hoy El Compa solo contesta fuera del horario del negocio.","en":"For the «If you do not reply in 10 min» option. Today El Compa only replies when the business is closed."}', false,
    '{"es":"Hoy las respuestas automáticas solo salen fuera del horario: se cambia cuando exista «Si no contestas en 10 min».","en":"Today auto-replies only go out when closed: it can be changed once «If you do not reply in 10 min» exists."}', null, 223)
on conflict (key) do update set min = excluded.min, max = excluded.max, def = excluded.def, unit = excluded.unit, section = excluded.section,
  label = excluded.label, help = excluded.help, editable = excluded.editable, bloqueo = excluded.bloqueo, edit_in = excluded.edit_in, sort = excluded.sort;

commit;
