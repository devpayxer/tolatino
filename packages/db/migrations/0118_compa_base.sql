-- 0118 · compa_base (7c · docs/diseno/plan/fase7-compa.md §2 0118, §3 y §4 7c). El motor de El Compa: conversaciones, mensajes, acciones de
-- la lista cerrada, pasos a una persona, el libro de uso con su costo, el tope mensual que se reserva antes de llamar y los interruptores.
-- Sin pantallas de vecino (7d) ni del panel (7e). El servidor decide todo; esta base vuelve a imponer lo importante:
-- · compa_conversations: CP-6101… (secuencia propia), de una persona (o de un teléfono cifrado, 7h), uso neighbor · owner · auto_reply ·
--   copilot, canal app · web · whatsapp · sms, ciudad. «outcome» es DERIVADO: lo pone la base al pasar a una persona, al confirmarse una
--   acción o al cerrarse (nadie lo escribe a mano). turns_n lo cuenta la base con cada mensaje de la persona.
-- · compa_messages (SOLO INSERCIÓN): texto ya tapado por la app (lib/compa/tapar.ts); la base rechaza tarjeta o SSN igual que Soporte.
-- · compa_actions: la lista cerrada (cancel_request · open_screen · go_to_panel), con id uuid de un solo uso, vencimiento y estados
--   proposed → confirming (una sola petición la toma) → confirmed · failed · expired; o proposed → dismissed · expired. Nada se borra.
-- · compa_handoffs (solo inserción): a Soporte (caso TK-) o al dueño (7f), con motivo y resumen tapado.
-- · compa_models: precios de la API por millón de tokens EN MICRODÓLARES y el recargo de inferencia en EE. UU. (inference_geo «us» = ×1.1);
--   el modelo de cada papel (cotidiano = Haiku, copiloto = Sonnet). El código nunca escribe un precio.
-- · compa_spend_month + compa_reservations + compa_usage: el TOPE. compa_reservar() reserva el máximo de una llamada ANTES de llamar, con
--   candado de fila por mes, contra cfg_int('compa_tope_mes_cents') leído en ese momento; compa_anotar() liquida con los tokens reales,
--   escribe el libro (solo inserción: tokens, costo, modelo, espera, resultado; SIN texto) y marca las alertas del 80 % y del 100 %.
--   Muchas llamadas a la vez nunca pasan del tope. Una reserva que se queda abierta (proceso caído) la suelta el barrido.
-- · compa_pauses: pausas por ciudad o por negocio (todo El Compa o un nivel), con motivo, quién y cuándo; se levantan, no se borran.
-- · feature_flags compa.use.* y compa.channel.*: encendidos (el sandbox los usa; en producción la app no enciende El Compa hasta la fase 9
--   — candado en lib/compa/interruptores.ts). Pausar pide motivo y queda en la auditoría.
-- · Super Admin › El Compa (sección «compa», grupo Operar): Admin todo; Soporte ver y editar (marcar, 7i); Solo lectura ver.
-- · Configuración › El Compa: tope, alerta, espera, límites por persona, turnos, cierre, vencimiento de acciones, contexto, retención y
--   salida máxima. ayuda_trozos_max y ayuda_umbral_rank (0116) pasan a editables: El Compa ya los lee.
-- · Avisos compa_tope_80 y compa_tope_100 al equipo Admin.
-- Idempotente: se puede aplicar dos veces.
begin;

-- ── Números ──
create sequence if not exists compa_conversation_seq start 6101;

-- ── Modelos y precios (microdólares por millón de tokens; 1 USD = 1 000 000) ──
create table if not exists compa_models (
  id                           text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(id) <= 60),
  label                        text not null check (char_length(label) between 2 and 60),
  input_per_mtok_microusd      bigint not null check (input_per_mtok_microusd >= 0),
  output_per_mtok_microusd     bigint not null check (output_per_mtok_microusd >= 0),
  cache_read_per_mtok_microusd bigint not null check (cache_read_per_mtok_microusd >= 0),
  cache_write_per_mtok_microusd bigint not null check (cache_write_per_mtok_microusd >= 0),
  geo_pct                      integer not null default 110 check (geo_pct between 100 and 200),  -- inference_geo «us»
  role                         text unique check (role in ('cotidiano', 'copiloto')),
  status                       text not null default 'on' check (status in ('on', 'off')),
  priced_at                    date not null,
  updated_by                   uuid references users (id),
  updated_at                   timestamptz not null default now()
);
create or replace function compa_models_no_borra() returns trigger language plpgsql as $$
begin raise exception 'un modelo no se borra: se apaga (status off)'; end $$;
drop trigger if exists compa_models_no_borra on compa_models;
create trigger compa_models_no_borra before delete on compa_models for each row execute function compa_models_no_borra();
-- Precios de la API del 3 nov 2026. «simulador» cuesta como Haiku para que el tope se pruebe de verdad en el sandbox (nunca en producción).
insert into compa_models (id, label, input_per_mtok_microusd, output_per_mtok_microusd, cache_read_per_mtok_microusd, cache_write_per_mtok_microusd, geo_pct, role, priced_at) values
  ('claude-haiku-5-5', 'Claude Haiku 5.5', 100000, 500000, 10000, 125000, 110, 'cotidiano', '2026-11-03'),
  ('claude-sonnet-5-5', 'Claude Sonnet 5.5', 2000000, 10000000, 100000, 2500000, 110, 'copiloto', '2026-11-03'),
  ('simulador', 'Simulador del sandbox', 100000, 500000, 10000, 125000, 110, null, '2026-11-03')
on conflict (id) do nothing;

-- ── Conversaciones ──
create table if not exists compa_conversations (
  id                 bigint generated always as identity primary key,
  number             text not null unique check (number ~ '^CP-[0-9]{4,12}$'),
  use                text not null check (use in ('neighbor', 'owner', 'auto_reply', 'copilot')),
  channel            text not null default 'app' check (channel in ('app', 'web', 'whatsapp', 'sms')),
  surface            text not null check (surface in ('support_page', 'help_sheet', 'panel', 'business_chat', 'ticket')),
  user_id            uuid references users (id),
  contact_phone_enc  text,                                   -- 7h: WhatsApp/SMS sin cuenta (cifrado, lib/cifrado.ts)
  contact_phone_hash text,
  business_id        text references businesses (id),
  operation_id       bigint references operations (id),       -- la hoja de una operación (7d)
  support_case_id    bigint references support_cases (id),    -- el caso al que pasó o el del copiloto
  city_id            text not null references cities (id),
  lang               text not null default 'es' check (lang in ('es', 'en')),
  outcome            text not null default 'open' check (outcome in ('open', 'self_resolved', 'action_done', 'handed_off', 'to_owner')),
  handoff_reason     text check (handoff_reason in ('money', 'account', 'safety', 'asked_person', 'unknown', 'owner')),
  ai                 boolean not null default true,          -- false = al menos una respuesta salió de las reglas fijas
  turns_n            integer not null default 0 check (turns_n >= 0),
  is_test            boolean not null default false,
  started_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  closed_at          timestamptz,
  check (user_id is not null or contact_phone_hash is not null),
  check ((outcome = 'open') = (closed_at is null) or outcome in ('handed_off', 'to_owner', 'action_done'))
);
create index if not exists compa_conv_usuario on compa_conversations (user_id, started_at desc) where user_id is not null;
create index if not exists compa_conv_negocio on compa_conversations (business_id, use, started_at desc) where business_id is not null;
create index if not exists compa_conv_resultado on compa_conversations (outcome, started_at desc);
create index if not exists compa_conv_ciudad on compa_conversations (city_id, started_at);
create index if not exists compa_conv_lista on compa_conversations (started_at desc, id desc);
create index if not exists compa_conv_abiertas on compa_conversations (updated_at) where closed_at is null;

-- 7b dejó el hueco: el caso de Soporte apunta a la conversación que lo abrió.
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'support_cases_compa_conversation_fk') then
    alter table support_cases add constraint support_cases_compa_conversation_fk foreign key (compa_conversation_id) references compa_conversations (id);
  end if;
end $$;

create or replace function compa_conversations_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'una conversación de El Compa no se borra (la purga por retención es de 7i)'; end if;
  if tg_op = 'UPDATE' then
    if new.number <> old.number or new.use <> old.use or new.user_id is distinct from old.user_id or new.business_id is distinct from old.business_id
       or new.city_id <> old.city_id or new.started_at <> old.started_at or new.channel <> old.channel then
      raise exception 'el número, el uso, el canal, la persona, el negocio, la ciudad y la fecha de una conversación no cambian';
    end if;
    -- El resultado solo avanza (lo pone la base): una conversación que pasó a una persona no vuelve a «resolvió solo».
    if old.outcome in ('handed_off', 'to_owner') and new.outcome not in ('handed_off', 'to_owner') then new.outcome := old.outcome; end if;
    if old.outcome = 'action_done' and new.outcome in ('open', 'self_resolved') then new.outcome := old.outcome; end if;
    if old.ai = false then new.ai := false; end if;
    new.updated_at := now();
  end if;
  return new;
end $$;
drop trigger if exists compa_conversations_antes on compa_conversations;
create trigger compa_conversations_antes before update or delete on compa_conversations for each row execute function compa_conversations_antes();

-- ── Mensajes (solo inserción; tapados por la app y revisados aquí) ──
create table if not exists compa_messages (
  id              bigint generated always as identity primary key,
  conversation_id bigint not null references compa_conversations (id),
  city_id         text not null references cities (id),
  sender          text not null check (sender in ('user', 'compa', 'system')),
  user_id         uuid references users (id),               -- quien escribió (solo mensajes de la persona; para los límites)
  text            text not null check (char_length(text) between 1 and 2000),
  source_slug     text,                                      -- artículo de ayuda citado (estaba entre los trozos dados y es de su audiencia)
  source_label    text check (char_length(source_label) <= 80),
  chips           text[] not null default '{}' check (cardinality(chips) <= 3),
  step_key        text check (char_length(step_key) <= 40),
  draft           boolean not null default false,
  engine          text check (engine in ('modelo', 'reglas', 'simulador')),
  at              timestamptz not null default now(),
  check ((sender = 'compa') = (engine is not null)),
  check (sender <> 'user' or user_id is not null)
);
create index if not exists compa_messages_conv on compa_messages (conversation_id, at, id);
create index if not exists compa_messages_persona on compa_messages (user_id, at desc) where sender = 'user';
create or replace function compa_messages_antes() returns trigger language plpgsql as $$
begin
  if tg_op <> 'INSERT' then raise exception 'compa_messages es solo de inserción'; end if;
  if texto_con_secretos(new.text) then raise exception 'compa_sin_secretos: un mensaje no guarda números de tarjeta ni de seguro social'; end if;
  return new;
end $$;
drop trigger if exists compa_messages_antes on compa_messages;
create trigger compa_messages_antes before insert or update or delete on compa_messages for each row execute function compa_messages_antes();
-- Cada mensaje de la persona cuenta un turno (derivado: nadie lo escribe a mano).
create or replace function compa_messages_turno() returns trigger language plpgsql as $$
begin
  if new.sender = 'user' then update compa_conversations set turns_n = turns_n + 1 where id = new.conversation_id;
  elsif new.sender = 'compa' and new.engine = 'reglas' then update compa_conversations set ai = false where id = new.conversation_id and ai; end if;
  return null;
end $$;
drop trigger if exists compa_messages_turno on compa_messages;
create trigger compa_messages_turno after insert on compa_messages for each row execute function compa_messages_turno();

-- ── Acciones (lista cerrada; un uso; se confirman en otra petición) ──
create table if not exists compa_actions (
  id              uuid primary key default gen_random_uuid(),
  conversation_id bigint not null references compa_conversations (id),
  message_id      bigint references compa_messages (id),
  user_id         uuid not null references users (id),      -- la única persona que puede confirmarla
  type            text not null check (type in ('cancel_request', 'open_screen', 'go_to_panel')),
  operation_id    bigint references operations (id),
  op_status       text,                                      -- el estado de la operación al proponerla (si cambió, vence)
  target          jsonb not null default '{}'::jsonb,
  status          text not null default 'proposed' check (status in ('proposed', 'confirming', 'confirmed', 'dismissed', 'expired', 'failed')),
  confirmed_via   text check (confirmed_via in ('app', 'link')),
  fail_reason     text check (char_length(fail_reason) <= 200),
  proposed_at     timestamptz not null default now(),
  expires_at      timestamptz not null,
  decided_at      timestamptz,
  check (type <> 'cancel_request' or operation_id is not null),
  check ((status in ('proposed', 'confirming')) = (decided_at is null)),
  check (status not in ('confirming', 'confirmed') or confirmed_via is not null)
);
create index if not exists compa_actions_conv on compa_actions (conversation_id, proposed_at desc);
create index if not exists compa_actions_vivas on compa_actions (expires_at) where status in ('proposed', 'confirming');
create index if not exists compa_actions_operacion on compa_actions (operation_id) where operation_id is not null;
create or replace function compa_actions_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'una acción de El Compa no se borra (estados)'; end if;
  if tg_op = 'INSERT' then
    if new.status <> 'proposed' then raise exception 'una acción nace propuesta'; end if;
    return new;
  end if;
  -- proposed → confirming (la petición de confirmar la toma: una sola gana) · dismissed · expired · failed;  confirming → confirmed · failed · expired.
  if not ((old.status = 'proposed' and new.status in ('confirming', 'dismissed', 'expired', 'failed'))
       or (old.status = 'confirming' and new.status in ('confirmed', 'failed', 'expired'))) then
    raise exception 'compa_accion_decidida: esa acción ya se decidió';
  end if;
  if (new.id, new.conversation_id, new.message_id, new.user_id, new.type, new.operation_id, new.op_status, new.target, new.proposed_at, new.expires_at)
     is distinct from (old.id, old.conversation_id, old.message_id, old.user_id, old.type, old.operation_id, old.op_status, old.target, old.proposed_at, old.expires_at) then
    raise exception 'de una acción solo cambia su estado';
  end if;
  if new.status = 'confirming' and old.expires_at < now() then raise exception 'compa_accion_vencida: esa acción ya venció'; end if;
  if new.status = 'confirming' then new.decided_at := null; return new; end if;
  new.decided_at := coalesce(new.decided_at, now());
  return new;
end $$;
drop trigger if exists compa_actions_antes on compa_actions;
create trigger compa_actions_antes before insert or update or delete on compa_actions for each row execute function compa_actions_antes();
-- Una acción confirmada marca la conversación (derivado).
create or replace function compa_actions_resultado() returns trigger language plpgsql as $$
begin
  if new.status = 'confirmed' and old.status = 'confirming' and new.type = 'cancel_request' then
    update compa_conversations set outcome = 'action_done' where id = new.conversation_id and outcome in ('open', 'self_resolved');
  end if;
  return null;
end $$;
drop trigger if exists compa_actions_resultado on compa_actions;
create trigger compa_actions_resultado after update on compa_actions for each row execute function compa_actions_resultado();

-- ── Pasos a una persona (solo inserción) ──
create table if not exists compa_handoffs (
  id              bigint generated always as identity primary key,
  conversation_id bigint not null references compa_conversations (id),
  "to"            text not null check ("to" in ('support', 'owner')),
  reason          text not null check (reason in ('money', 'account', 'safety', 'asked_person', 'unknown', 'owner')),
  support_case_id bigint references support_cases (id),
  chat_thread_id  bigint,                                    -- 7f: el hilo que pasa al dueño
  summary         text check (char_length(summary) <= 500),
  promised_reply  text check (char_length(promised_reply) <= 120),
  at              timestamptz not null default now(),
  check ("to" <> 'support' or support_case_id is not null)
);
create index if not exists compa_handoffs_conv on compa_handoffs (conversation_id);
create or replace function compa_handoffs_antes() returns trigger language plpgsql as $$
begin
  if tg_op <> 'INSERT' then raise exception 'compa_handoffs es solo de inserción'; end if;
  if texto_con_secretos(new.summary) then raise exception 'compa_sin_secretos: el resumen no guarda números de tarjeta ni de seguro social'; end if;
  return new;
end $$;
drop trigger if exists compa_handoffs_antes on compa_handoffs;
create trigger compa_handoffs_antes before insert or update or delete on compa_handoffs for each row execute function compa_handoffs_antes();
create or replace function compa_handoffs_resultado() returns trigger language plpgsql as $$
begin
  update compa_conversations set outcome = case when new."to" = 'owner' then 'to_owner' else 'handed_off' end, handoff_reason = new.reason,
         support_case_id = coalesce(new.support_case_id, support_case_id)
   where id = new.conversation_id;
  return null;
end $$;
drop trigger if exists compa_handoffs_resultado on compa_handoffs;
create trigger compa_handoffs_resultado after insert on compa_handoffs for each row execute function compa_handoffs_resultado();

-- ── El tope: el gasto del mes (contador) y las reservas de cada llamada ──
-- El mes de To'Latino (hora de la costa este, donde están las cinco ciudades).
create or replace function compa_mes(t timestamptz default now()) returns text language sql stable as $$ select to_char(t at time zone 'America/New_York', 'YYYY-MM') $$;
create table if not exists compa_spend_month (
  month              text primary key check (month ~ '^[0-9]{4}-[0-9]{2}$'),
  spent_microusd     bigint not null default 0 check (spent_microusd >= 0),
  reserved_microusd  bigint not null default 0 check (reserved_microusd >= 0),
  alert_pct_at       timestamptz,                            -- pasó compa_alerta_pct
  alert_cap_at       timestamptz,                            -- llegó al tope
  updated_at         timestamptz not null default now()
);
create table if not exists compa_reservations (
  id             uuid primary key default gen_random_uuid(),
  month          text not null references compa_spend_month (month),
  use            text not null check (use in ('neighbor', 'owner', 'auto_reply', 'copilot')),
  model          text not null references compa_models (id),
  max_microusd   bigint not null check (max_microusd > 0),
  status         text not null default 'open' check (status in ('open', 'settled', 'released')),
  created_at     timestamptz not null default now(),
  closed_at      timestamptz
);
create index if not exists compa_reservations_abiertas on compa_reservations (created_at) where status = 'open';
create table if not exists compa_usage (
  id                 bigint generated always as identity primary key,
  conversation_id    bigint references compa_conversations (id),
  reservation_id     uuid unique references compa_reservations (id),
  use                text not null check (use in ('neighbor', 'owner', 'auto_reply', 'copilot')),
  city_id            text references cities (id),
  business_id        text references businesses (id),
  user_id            uuid references users (id),
  model              text not null check (model in ('reglas') or model ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  input_tokens       integer not null default 0 check (input_tokens >= 0),
  cache_read_tokens  integer not null default 0 check (cache_read_tokens >= 0),
  cache_write_tokens integer not null default 0 check (cache_write_tokens >= 0),
  output_tokens      integer not null default 0 check (output_tokens >= 0),
  cost_microusd      bigint not null default 0 check (cost_microusd >= 0),
  ms                 integer not null default 0 check (ms >= 0),
  result             text not null check (result in ('ok', 'timeout', 'error', 'refusal', 'invalid', 'cap', 'off', 'limit')),
  month              text not null check (month ~ '^[0-9]{4}-[0-9]{2}$'),
  at                 timestamptz not null default now()
);
create index if not exists compa_usage_mes on compa_usage (month, use);
create index if not exists compa_usage_conv on compa_usage (conversation_id) where conversation_id is not null;
create or replace function compa_libro_solo_insercion() returns trigger language plpgsql as $$
begin raise exception '% es solo de inserción', tg_table_name; end $$;
drop trigger if exists compa_usage_solo_insercion on compa_usage;
create trigger compa_usage_solo_insercion before update or delete on compa_usage for each row execute function compa_libro_solo_insercion();
-- Una reserva solo se cierra una vez (abierta → liquidada o soltada); el contador del mes solo lo mueven las funciones de abajo.
create or replace function compa_reservations_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'una reserva del tope no se borra'; end if;
  if old.status <> 'open' or new.status = 'open'
     or (new.id, new.month, new.use, new.model, new.max_microusd, new.created_at) is distinct from (old.id, old.month, old.use, old.model, old.max_microusd, old.created_at) then
    raise exception 'una reserva del tope se cierra una sola vez';
  end if;
  new.closed_at := now();
  return new;
end $$;
drop trigger if exists compa_reservations_antes on compa_reservations;
create trigger compa_reservations_antes before update or delete on compa_reservations for each row execute function compa_reservations_antes();
create or replace function compa_spend_no_borra() returns trigger language plpgsql as $$
begin raise exception 'el gasto de un mes no se borra'; end $$;
drop trigger if exists compa_spend_no_borra on compa_spend_month;
create trigger compa_spend_no_borra before delete on compa_spend_month for each row execute function compa_spend_no_borra();

-- Lo que puede costar una llamada (en microdólares, redondeado hacia arriba), con los precios de la tabla.
create or replace function compa_costo(p_model text, p_in bigint, p_cache_read bigint, p_cache_write bigint, p_out bigint) returns bigint language sql stable as $$
  select ceil((greatest(p_in, 0) * m.input_per_mtok_microusd + greatest(p_cache_read, 0) * m.cache_read_per_mtok_microusd
              + greatest(p_cache_write, 0) * m.cache_write_per_mtok_microusd + greatest(p_out, 0) * m.output_per_mtok_microusd)
              * m.geo_pct / 100.0 / 1000000.0)::bigint
    from compa_models m where m.id = p_model
$$;

-- Reservar ANTES de llamar: el máximo de la llamada (entrada estimada por arriba + la salida máxima, todo como entrada sin caché) contra
-- el tope leído ahora (cfg_int: un cambio del tope vale para la llamada siguiente). El update con la condición es atómico: con 20 a la
-- vez, la fila del mes se toma de a una y la suma nunca pasa del tope. Devuelve la reserva o null (al tope / modelo apagado).
create or replace function compa_reservar(p_use text, p_model text, p_in_max bigint, p_out_max bigint) returns uuid language plpgsql as $$
declare m text := compa_mes(); maxi bigint; tope bigint := cfg_int('compa_tope_mes_cents')::bigint * 10000; r uuid;
begin
  if not exists (select 1 from compa_models where id = p_model and status = 'on') then return null; end if;
  maxi := greatest(1, compa_costo(p_model, p_in_max, 0, 0, p_out_max));
  insert into compa_spend_month (month) values (m) on conflict (month) do nothing;
  update compa_spend_month set reserved_microusd = reserved_microusd + maxi, updated_at = now()
   where month = m and spent_microusd + reserved_microusd + maxi <= tope;
  if not found then return null; end if;
  insert into compa_reservations (month, use, model, max_microusd) values (m, p_use, p_model, maxi) returning id into r;
  return r;
end $$;

-- Liquidar DESPUÉS de llamar: suelta la reserva, suma el costo real (tokens que devolvió el proveedor; en un tiempo agotado, lo reservado)
-- y escribe el libro. Devuelve 'pct' si ahora se cruzó compa_alerta_pct (para avisar al equipo Admin una sola vez por mes) o null.
create or replace function compa_anotar(p_reserva uuid, p_conv bigint, p_use text, p_city text, p_business text, p_user uuid, p_model text,
  p_in integer, p_cache_read integer, p_cache_write integer, p_out integer, p_ms integer, p_result text, p_cobrar_reservado boolean default false)
returns text language plpgsql as $$
declare v compa_reservations; costo bigint := 0; m text := compa_mes(); s compa_spend_month; tope bigint := cfg_int('compa_tope_mes_cents')::bigint * 10000;
        pct integer := cfg_int('compa_alerta_pct'); alerta text := null;
begin
  if p_reserva is not null then
    select * into v from compa_reservations where id = p_reserva for update;
    if not found or v.status <> 'open' then raise exception 'compa_reserva_cerrada: esa reserva no existe o ya se cerró'; end if;
    m := v.month;
    costo := case when p_cobrar_reservado then v.max_microusd else coalesce(compa_costo(p_model, p_in, p_cache_read, p_cache_write, p_out), 0) end;
    update compa_reservations set status = 'settled' where id = p_reserva;
    update compa_spend_month set reserved_microusd = greatest(0, reserved_microusd - v.max_microusd), spent_microusd = spent_microusd + costo, updated_at = now()
     where month = v.month returning * into s;
    if tope > 0 and s.alert_pct_at is null and s.spent_microusd * 100 >= tope * pct then
      update compa_spend_month set alert_pct_at = now() where month = v.month; alerta := 'pct';
    end if;
  end if;
  insert into compa_usage (conversation_id, reservation_id, use, city_id, business_id, user_id, model, input_tokens, cache_read_tokens, cache_write_tokens,
                           output_tokens, cost_microusd, ms, result, month)
  values (p_conv, p_reserva, p_use, p_city, p_business, p_user, p_model, greatest(p_in, 0), greatest(p_cache_read, 0), greatest(p_cache_write, 0),
          greatest(p_out, 0), costo, greatest(p_ms, 0), p_result, m);
  return alerta;
end $$;

-- Una reserva que no cupo = al tope: la primera vez del mes lo marca y devuelve true (la app avisa al equipo Admin una sola vez).
create or replace function compa_marcar_tope() returns boolean language plpgsql as $$
begin
  insert into compa_spend_month (month) values (compa_mes()) on conflict (month) do nothing;
  update compa_spend_month set alert_cap_at = now(), alert_pct_at = coalesce(alert_pct_at, now()) where month = compa_mes() and alert_cap_at is null and cfg_int('compa_tope_mes_cents') > 0;
  return found;
end $$;

-- El barrido suelta las reservas de llamadas que nunca volvieron (proceso caído): no se cobra nada que no se anotó.
create or replace function compa_soltar_reservas(p_min integer default 10) returns integer language plpgsql as $$
declare v compa_reservations; n integer := 0;
begin
  for v in select * from compa_reservations where status = 'open' and created_at < now() - make_interval(mins => p_min) order by created_at limit 500 for update skip locked loop
    update compa_reservations set status = 'released' where id = v.id;
    update compa_spend_month set reserved_microusd = greatest(0, reserved_microusd - v.max_microusd), updated_at = now() where month = v.month;
    n := n + 1;
  end loop;
  return n;
end $$;

-- Gasto del mes por nivel (para el Super Admin; sin personas).
create or replace view compa_gasto_mes as
  select month, use, count(*) filter (where result = 'ok')::int as llamadas, count(*) filter (where result = 'cap')::int as al_tope,
         count(*) filter (where result in ('timeout', 'error', 'refusal', 'invalid'))::int as a_reglas, sum(cost_microusd)::bigint as costo_microusd,
         sum(input_tokens + cache_read_tokens + cache_write_tokens)::bigint as tokens_entrada, sum(output_tokens)::bigint as tokens_salida
    from compa_usage group by month, use;

-- ── Pausas por ciudad o por negocio (se levantan, no se borran) ──
create table if not exists compa_pauses (
  id            bigint generated always as identity primary key,
  scope         text not null check (scope in ('city', 'business')),
  city_id       text references cities (id),
  business_id   text references businesses (id),
  use           text check (use in ('neighbor', 'owner', 'auto_reply', 'copilot')),   -- null = todo El Compa ahí
  reason        text not null check (char_length(reason) between 3 and 300),
  paused_by     uuid not null references users (id),
  paused_at     timestamptz not null default now(),
  lifted_at     timestamptz,
  lifted_by     uuid references users (id),
  lift_reason   text check (char_length(lift_reason) <= 300),
  check ((scope = 'city') = (city_id is not null) and (scope = 'business') = (business_id is not null)),
  check ((lifted_at is null) = (lifted_by is null) and (lifted_at is null) = (lift_reason is null))
);
create unique index if not exists compa_pauses_viva on compa_pauses (scope, coalesce(city_id, ''), coalesce(business_id, ''), coalesce(use, '*')) where lifted_at is null;
create or replace function compa_pauses_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'una pausa de El Compa no se borra: se levanta'; end if;
  if old.lifted_at is not null or new.lifted_at is null
     or (new.scope, new.city_id, new.business_id, new.use, new.reason, new.paused_by, new.paused_at) is distinct from (old.scope, old.city_id, old.business_id, old.use, old.reason, old.paused_by, old.paused_at) then
    raise exception 'de una pausa solo se anota cuándo se levantó (una vez)';
  end if;
  return new;
end $$;
drop trigger if exists compa_pauses_antes on compa_pauses;
create trigger compa_pauses_antes before update or delete on compa_pauses for each row execute function compa_pauses_antes();

-- ── Interruptores por nivel y por canal (MD L1706). Encendidos; pausar pide motivo y queda en la auditoría. ──
insert into feature_flags (key, enabled, note) values
  ('compa.use.neighbor', true, 'El Compa · vecinos'), ('compa.use.owner', true, 'El Compa · panel del negocio'),
  ('compa.use.auto_reply', true, 'El Compa · respuestas automáticas'), ('compa.use.copilot', true, 'El Compa · copiloto del equipo'),
  ('compa.channel.app', true, 'El Compa · app y web'), ('compa.channel.whatsapp', true, 'El Compa · WhatsApp'), ('compa.channel.sms', true, 'El Compa · SMS')
on conflict (key) do nothing;

-- ── Super Admin › El Compa (grupo Operar, después de Soporte) ──
do $$ begin
  if not exists (select 1 from admin_sections where key = 'compa') then
    update admin_sections set sort = sort + 1 where sort >= 7;
    insert into admin_sections (key, name, grp, icon, sort) values ('compa', '{"es":"El Compa · IA","en":"El Compa · AI"}', 'operar', 'chat', 7);
  end if;
end $$;
insert into role_permissions (role, section, action, allowed)
select r.key, 'compa', a, (r.key = 'admin') or (r.key = 'soporte' and a in ('ver', 'editar')) or (r.key = 'lectura' and a = 'ver')
  from staff_roles r, unnest('{ver,editar,aprobar,retirar,exportar}'::text[]) a
on conflict (role, section, action) do nothing;

-- ── Avisos al equipo Admin ──
insert into notif_templates (key, grp, pref, sms, title, body) values
  ('compa_tope_80', 'mod', null, false, '{"es":"El Compa va en el {pct} % del tope","en":"El Compa is at {pct} % of its cap"}',
    '{"es":"Este mes lleva {gastado} de {tope}. Al llegar al tope contesta con reglas fijas y ofrece «Con una persona». Míralo en Super Admin › El Compa.","en":"This month it has spent {gastado} of {tope}. At the cap it answers with fixed rules and offers «Talk to a person». See Super Admin › El Compa."}'),
  ('compa_tope_100', 'mod', null, false, '{"es":"El Compa llegó al tope del mes","en":"El Compa reached the monthly cap"}',
    '{"es":"Gastó {gastado} de {tope}. Hasta el mes que viene contesta con reglas fijas y ofrece «Con una persona». Puedes subir el tope en Super Admin › El Compa.","en":"It spent {gastado} of {tope}. Until next month it answers with fixed rules and offers «Talk to a person». You can raise the cap in Super Admin › El Compa."}')
on conflict (key) do update set title = excluded.title, body = excluded.body
  where notif_templates.edited_by is null;

-- ── Configuración › El Compa ──
insert into config_keys (key, min, max, def, unit, section, label, help, editable, bloqueo, edit_in, sort) values
  ('compa_tope_mes_cents', 0, 1000000, 10000, '{"es":"centavos al mes","en":"cents per month"}', 'compa', '{"es":"Tope de gasto de El Compa","en":"El Compa spending cap"}',
    '{"es":"Lo máximo que El Compa gasta en IA en un mes (hora de la costa este). Al tope contesta con reglas fijas y ofrece «Con una persona». 10000 = $100. 0 = sin IA.","en":"The most El Compa spends on AI in a month (Eastern time). At the cap it answers with fixed rules and offers «Talk to a person». 10000 = $100. 0 = no AI."}', true, null, null, 210),
  ('compa_alerta_pct', 50, 99, 80, '{"es":"% del tope","en":"% of the cap"}', 'compa', '{"es":"Aviso antes del tope","en":"Warning before the cap"}',
    '{"es":"Al pasar este porcentaje, aviso al equipo Admin y en Super Admin › Inicio (una vez al mes).","en":"Past this percentage, the Admin team is notified and it shows in Super Admin › Home (once a month)."}', true, null, null, 211),
  ('compa_espera_ms', 2000, 20000, 8000, '{"es":"milisegundos","en":"milliseconds"}', 'compa', '{"es":"Espera máxima de la IA","en":"Maximum AI wait"}',
    '{"es":"Pasado este tiempo, El Compa contesta con reglas fijas (no se queda esperando).","en":"After this time, El Compa answers with fixed rules (it never keeps people waiting)."}', true, null, null, 212),
  ('compa_salida_tokens', 200, 2000, 700, '{"es":"tokens","en":"tokens"}', 'compa', '{"es":"Respuesta más larga de la IA","en":"Longest AI answer"}',
    '{"es":"Límite de cada respuesta del modelo (también decide cuánto se reserva del tope por llamada).","en":"Limit of each model answer (it also sets how much of the cap is reserved per call)."}', true, null, null, 213),
  ('compa_msgs_hora', 1, 200, 20, '{"es":"mensajes por hora","en":"messages per hour"}', 'compa', '{"es":"Mensajes por persona en una hora","en":"Messages per person per hour"}',
    '{"es":"Pasado esto, El Compa ofrece «Con una persona» y no llama a la IA.","en":"Past this, El Compa offers «Talk to a person» and does not call the AI."}', true, null, null, 214),
  ('compa_msgs_dia', 1, 1000, 60, '{"es":"mensajes por día","en":"messages per day"}', 'compa', '{"es":"Mensajes por persona en un día","en":"Messages per person per day"}', null, true, null, null, 215),
  ('compa_turnos_max', 2, 100, 20, '{"es":"turnos","en":"turns"}', 'compa', '{"es":"Turnos por conversación","en":"Turns per conversation"}',
    '{"es":"Una conversación más larga pide empezar otra o hablar con una persona.","en":"A longer conversation asks to start a new one or talk to a person."}', true, null, null, 216),
  ('compa_conv_cierra_h', 1, 168, 24, '{"es":"horas","en":"hours"}', 'compa', '{"es":"Una conversación se cierra después de","en":"A conversation closes after"}',
    '{"es":"Horas sin mensajes; el barrido la cierra y queda «resolvió solo» si nadie más la tomó.","en":"Hours without messages; the sweep closes it as «solved alone» unless it was handed off."}', true, null, null, 217),
  ('compa_accion_min', 1, 120, 15, '{"es":"minutos","en":"minutes"}', 'compa', '{"es":"Una acción preparada vence a los","en":"A prepared action expires after"}',
    '{"es":"«Así queda» se confirma dentro de este plazo; después, El Compa la vuelve a preparar.","en":"«This is how it ends up» must be confirmed within this time; after that, El Compa prepares it again."}', true, null, null, 218),
  ('compa_contexto_ops', 1, 20, 10, '{"es":"operaciones","en":"operations"}', 'compa', '{"es":"Operaciones de la persona que ve El Compa","en":"Person''s operations El Compa sees"}',
    '{"es":"Las más recientes, solo de esa persona y nunca de Salud, Profesionales ni Niños.","en":"The most recent ones, only that person''s and never Health, Professionals or Kids."}', true, null, null, 219),
  ('compa_retener_meses', 1, 36, 12, '{"es":"meses","en":"months"}', 'compa', '{"es":"Se guardan las conversaciones","en":"Conversations are kept for"}',
    '{"es":"Después solo quedan las cifras (resultado, uso y motivo). La purga llega con el Super Admin completo de El Compa.","en":"After that only the numbers remain (outcome, usage and reason). The purge comes with the full El Compa Super Admin."}', false,
    '{"es":"La purga por retención todavía no corre: se cambia cuando exista.","en":"The retention purge does not run yet: it can be changed once it exists."}', null, 220)
on conflict (key) do update set min = excluded.min, max = excluded.max, def = excluded.def, unit = excluded.unit, section = excluded.section,
  label = excluded.label, help = excluded.help, editable = excluded.editable, bloqueo = excluded.bloqueo, edit_in = excluded.edit_in, sort = excluded.sort;
-- El Compa ya lee los trozos de ayuda: se pueden cambiar.
update config_keys set editable = true, bloqueo = null where key in ('ayuda_trozos_max', 'ayuda_umbral_rank') and not editable;

commit;
