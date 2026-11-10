-- 0117 · soporte (7b · docs/diseno/plan/fase7-compa.md §2 0117 y §4 7b). Los casos de una persona CON To'Latino (no con un negocio: eso es
-- la «Ayuda con …» de cada operación, help_requests): la cuenta, un pago en general, la app, un negocio o una reseña, una idea, seguridad.
-- Sin IA (El Compa llega en 7c/7d y abre casos por la misma función, con origen 'compa' y la referencia de su conversación).
-- · support_cases: TK-5201… (secuencia propia; ningún otro número de la app empieza por TK-), de una persona (y del negocio si lo abre un
--   miembro desde su panel), ciudad, tema, la operación («¿Cuál?») o la ayuda ligada, origen form · panel · compa, estados new · in_progress ·
--   waiting · resolved · reopened · merged (nada se borra), prioridad, asignado, plazo (sla_due_at en horas hábiles del equipo, hora de la
--   ciudad), primera respuesta, resuelto por, «¿Se resolvió?» sí / no, enlazado («Abrir otro caso») y unido (duplicados).
-- · support_messages (SOLO INSERCIÓN; el texto solo se oculta con motivo): de la persona, del equipo o del sistema; foto PRIVADA
--   (media.owner_kind 'support'); `internal` = nota interna del equipo, que nunca sale a la persona. La base rechaza un número de tarjeta
--   (Luhn) o un SSN aunque alguien se salte el tapado de la app.
-- · support_macros: respuestas guardadas ES/EN con {nombre}, de texto plano (la base rechaza etiquetas HTML); se apagan, no se borran.
-- · support_refunds: cada «Resolver y devolver» de un caso, con su llave (idempotente) y el TOPE DEL ROL LEÍDO DE LA BASE en el momento
--   de decidir: un rol con Transacciones › aprobar (Admin, Finanzas) devuelve hasta lo cobrado; uno con Soporte › editar (Soporte), hasta
--   soporte_devolver_max_cents por caso, sumando lo ya devuelto en ese caso. Un rol sin ninguno de los dos no devuelve. Solo inserción
--   (pendiente → hecha / fallida).
-- · La cola «ticket» (8 h hábiles de Configuración): la base abre el caso en la cola cuando le toca al equipo (nuevo, la persona volvió
--   a escribir, reabierto) y la cierra cuando le toca a la persona (respondido, resuelto, unido). Así ningún caso queda sin cola ni plazo.
-- · Configuración › Soporte (sección nueva): horas del plazo, días y horario del equipo, casos por día, tope de devolución de Soporte y
--   días para reabrir. Plantillas de aviso sop_recibido, sop_respuesta, sop_resuelto (en la app; sin SMS) y sop_vencido (al equipo).
-- · Finanzas pasa a VER Soporte (para «Pasar a Finanzas»), solo si nadie cambió ese permiso a mano.
-- Idempotente: se puede aplicar dos veces.
begin;

-- ── Números ──
create sequence if not exists support_case_seq start 5201;

-- ── Casos ──
create table if not exists support_cases (
  id                    bigint generated always as identity primary key,
  number                text not null unique check (number ~ '^TK-[0-9]{4,12}$'),
  user_id               uuid not null references users (id),
  business_id           text references businesses (id),            -- lo abrió un miembro desde el panel de su negocio
  city_id               text not null references cities (id),
  topic                 text not null check (topic in ('pedido', 'cita', 'pago', 'negocio', 'cuenta', 'tecnico', 'sugerencia', 'seguridad')),
  operation_id          bigint references operations (id),         -- «¿Cuál?» o ligada por el equipo
  help_request_id       bigint references help_requests (id),      -- ligada a una «Ayuda con …»
  origin                text not null default 'form' check (origin in ('form', 'panel', 'compa')),
  compa_conversation_id bigint,                                    -- 7c le pone su llave foránea (compa_conversations)
  summary               text check (char_length(summary) <= 500),  -- lo que pasa El Compa (7d)
  status                text not null default 'new' check (status in ('new', 'in_progress', 'waiting', 'resolved', 'reopened', 'merged')),
  priority              text not null default 'normal' check (priority in ('normal', 'alta')),
  assigned_staff_id     uuid references users (id),
  escalated_to          text check (escalated_to in ('finanzas', 'admin')),
  sla_due_at            timestamptz not null,
  first_reply_at        timestamptz,
  resolved_by           text check (resolved_by in ('user', 'staff')),
  resolved_at           timestamptz,
  linked_case_id        bigint references support_cases (id),     -- «Abrir otro caso» desde uno resuelto
  merged_into_id        bigint references support_cases (id),     -- duplicado unido a otro
  csat                  text check (csat in ('yes', 'no')),        -- «¿Se resolvió?»
  csat_at               timestamptz,
  refunded_cents        integer not null default 0 check (refunded_cents >= 0),
  device                text check (char_length(device) <= 120),
  app_version           text check (char_length(app_version) <= 40),
  client_key            uuid,                                      -- un toque = un caso (enviar dos veces no abre dos)
  is_test               boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  check ((status = 'merged') = (merged_into_id is not null)),
  check (merged_into_id is null or merged_into_id <> id),
  check (status <> 'resolved' or (resolved_at is not null and resolved_by is not null)),
  check ((csat is null) = (csat_at is null))
);
create index if not exists support_cases_usuario on support_cases (user_id, created_at desc);
create index if not exists support_cases_estado on support_cases (status, sla_due_at);
create index if not exists support_cases_negocio on support_cases (business_id, created_at desc) where business_id is not null;
create index if not exists support_cases_ciudad on support_cases (city_id, status, created_at desc);
create index if not exists support_cases_operacion on support_cases (operation_id) where operation_id is not null;
create unique index if not exists support_cases_clave on support_cases (user_id, client_key) where client_key is not null;

-- ── Plazo en horas hábiles del equipo (hora de la ciudad; sin feriados) ──
create or replace function soporte_sla(ciudad text, desde timestamptz, horas numeric) returns timestamptz language plpgsql stable as $$
declare tz text; d0 int := cfg_int('soporte_desde_h'); d1 int := cfg_int('soporte_hasta_h'); dias int := cfg_int('soporte_dias');
        t timestamp; ini timestamp; fin timestamp; queda interval := make_interval(secs => greatest(horas, 0) * 3600); i int := 0;
begin
  select timezone into tz from cities where id = ciudad;
  tz := coalesce(tz, 'America/New_York');
  if d1 <= d0 then d1 := least(d0 + 1, 24); end if;
  t := desde at time zone tz;
  loop
    i := i + 1;
    exit when i > 400;
    if extract(isodow from t) <= dias then
      ini := date_trunc('day', t) + make_interval(hours => d0);
      fin := date_trunc('day', t) + make_interval(hours => d1);
      if t < ini then t := ini; end if;
      if t < fin then
        if t + queda <= fin then return (t + queda) at time zone tz; end if;
        queda := queda - (fin - t);
      end if;
    end if;
    t := date_trunc('day', t) + interval '1 day';
  end loop;
  return t at time zone tz;
end $$;

-- Le toca al equipo: nuevo, alguien lo está viendo o la persona volvió a escribir, reabierto.
create or replace function soporte_toca_equipo(st text) returns boolean language sql immutable as $$ select st in ('new', 'in_progress', 'reopened') $$;

create or replace function support_cases_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'un caso de soporte no se borra (estados)'; end if;
  if tg_op = 'INSERT' then
    if new.sla_due_at is null then new.sla_due_at := soporte_sla(new.city_id, now(), cfg_int('soporte_sla_h')); end if;
    return new;
  end if;
  if new.number <> old.number or new.user_id <> old.user_id or new.business_id is distinct from old.business_id or new.created_at <> old.created_at then
    raise exception 'el número, la persona, el negocio y la fecha de un caso no cambian';
  end if;
  if old.status = 'merged' and new.status <> 'merged' then raise exception 'un caso unido a otro no se vuelve a abrir'; end if;
  -- Vuelve al equipo: plazo nuevo desde ahora.
  if soporte_toca_equipo(new.status) and not soporte_toca_equipo(old.status) then
    new.sla_due_at := soporte_sla(new.city_id, now(), cfg_int('soporte_sla_h'));
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists support_cases_antes on support_cases;
create trigger support_cases_antes before insert or update or delete on support_cases for each row execute function support_cases_antes();

-- La cola «ticket» la lleva la base: abierta mientras le toca al equipo, decidida cuando le toca a la persona.
create or replace function support_cases_cola() returns trigger language plpgsql as $$
begin
  if soporte_toca_equipo(new.status) and (tg_op = 'INSERT' or not soporte_toca_equipo(old.status)) then
    insert into queue_items (queue, subject_kind, subject_id, business_id, city_id, priority, assigned_to, assigned_at, opened_at)
    values ('ticket', 'support_case', new.id::text, new.business_id, new.city_id, new.priority, new.assigned_staff_id, case when new.assigned_staff_id is not null then now() end,
            case when tg_op = 'INSERT' then new.created_at else now() end)
    on conflict do nothing;
  elsif tg_op = 'UPDATE' and soporte_toca_equipo(old.status) and not soporte_toca_equipo(new.status) then
    update queue_items set status = 'decided', decision = new.status, decided_at = now()
     where queue = 'ticket' and subject_kind = 'support_case' and subject_id = new.id::text and status = 'open';
  end if;
  if tg_op = 'UPDATE' and soporte_toca_equipo(new.status) and (new.priority <> old.priority or new.assigned_staff_id is distinct from old.assigned_staff_id) then
    update queue_items set priority = new.priority, assigned_to = new.assigned_staff_id,
           assigned_at = case when new.assigned_staff_id is distinct from old.assigned_staff_id then case when new.assigned_staff_id is null then null else now() end else assigned_at end
     where queue = 'ticket' and subject_kind = 'support_case' and subject_id = new.id::text and status = 'open';
  end if;
  return null;
end $$;
drop trigger if exists support_cases_cola on support_cases;
create trigger support_cases_cola after insert or update on support_cases for each row execute function support_cases_cola();

-- ── Tarjetas y SSN: la base los rechaza aunque alguien se salte el tapado de la app (lib/compa/tapar.ts) ──
create or replace function luhn_ok(d text) returns boolean language plpgsql immutable as $$
declare s int := 0; n int; i int; dbl boolean := false;
begin
  if d !~ '^[0-9]{13,19}$' then return false; end if;
  for i in reverse char_length(d)..1 loop
    n := substr(d, i, 1)::int;
    if dbl then n := n * 2; if n > 9 then n := n - 9; end if; end if;
    s := s + n; dbl := not dbl;
  end loop;
  return s % 10 = 0;
end $$;
create or replace function texto_con_secretos(t text) returns boolean language plpgsql immutable as $$
declare m text[];
begin
  if t is null then return false; end if;
  if t ~ '(^|[^0-9])[0-9]{3}-[0-9]{2}-[0-9]{4}([^0-9]|$)' then return true; end if;
  for m in select regexp_matches(t, '((?:[0-9][ -]?){12,18}[0-9])', 'g') loop
    if luhn_ok(regexp_replace(m[1], '[^0-9]', '', 'g')) then return true; end if;
  end loop;
  return false;
end $$;

-- ── Mensajes (solo inserción) ──
create table if not exists support_messages (
  id             bigint generated always as identity primary key,
  case_id        bigint not null references support_cases (id),
  city_id        text not null references cities (id),
  sender         text not null check (sender in ('user', 'staff', 'system')),
  user_id        uuid references users (id),                 -- quien escribió (persona) · null del sistema
  staff_id       uuid references users (id),                 -- quien escribió (equipo)
  body           text check (char_length(body) <= 2000),
  photo_media_id uuid references media (id),
  internal       boolean not null default false,             -- nota interna del equipo: NUNCA sale a la persona
  macro_key      text,
  sys_key        text check (sys_key in ('recibido', 'resuelto_usuario', 'resuelto_equipo', 'reabierto', 'reabierto_usuario', 'unido', 'unido_desde', 'devuelto', 'escalado', 'ligado', 'tomado')),
  vars           jsonb,
  hidden_at      timestamptz,
  hidden_reason  text check (char_length(hidden_reason) <= 300),
  hidden_by      uuid references users (id),
  at             timestamptz not null default now(),
  check (not internal or sender = 'staff' or (sender = 'system' and sys_key in ('escalado', 'ligado', 'tomado', 'unido_desde'))),
  check (sender <> 'staff' or staff_id is not null),
  check (sender <> 'user' or user_id is not null),
  check (sender <> 'system' or sys_key is not null),
  check (body is not null or photo_media_id is not null or sys_key is not null),
  check ((hidden_at is null) = (hidden_reason is null) and (hidden_at is null) = (hidden_by is null))
);
create index if not exists support_messages_caso on support_messages (case_id, at, id);
create or replace function support_messages_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'support_messages es solo de inserción'; end if;
  if tg_op = 'UPDATE' then
    -- Lo único que cambia, una vez: ocultar el texto con motivo (nada se borra).
    if old.hidden_at is not null or new.hidden_at is null
       or (new.case_id, new.sender, new.user_id, new.staff_id, new.body, new.photo_media_id, new.internal, new.macro_key, new.sys_key, new.vars, new.at)
          is distinct from (old.case_id, old.sender, old.user_id, old.staff_id, old.body, old.photo_media_id, old.internal, old.macro_key, old.sys_key, old.vars, old.at) then
      raise exception 'support_messages es solo de inserción (solo se oculta, con motivo, una vez)';
    end if;
    return new;
  end if;
  if texto_con_secretos(new.body) then raise exception 'support_sin_secretos: un mensaje no guarda números de tarjeta ni de seguro social'; end if;
  return new;
end $$;
drop trigger if exists support_messages_antes on support_messages;
create trigger support_messages_antes before insert or update or delete on support_messages for each row execute function support_messages_antes();
-- El resumen de El Compa tampoco.
create or replace function support_cases_resumen() returns trigger language plpgsql as $$
begin
  if texto_con_secretos(new.summary) then raise exception 'support_sin_secretos: el resumen no guarda números de tarjeta ni de seguro social'; end if;
  return new;
end $$;
drop trigger if exists support_cases_resumen on support_cases;
create trigger support_cases_resumen before insert or update of summary on support_cases for each row execute function support_cases_resumen();

-- ── Macros (ES/EN, texto plano, {nombre}; se apagan, no se borran) ──
create table if not exists support_macros (
  key        text primary key check (key ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(key) <= 40),
  title      jsonb not null check (title ? 'es' and title ? 'en' and char_length(title->>'es') between 2 and 60 and char_length(title->>'en') between 2 and 60),
  body       jsonb not null check (body ? 'es' and body ? 'en' and char_length(body->>'es') between 10 and 1000 and char_length(body->>'en') between 10 and 1000),
  topic      text check (topic in ('pedido', 'cita', 'pago', 'negocio', 'cuenta', 'tecnico', 'sugerencia', 'seguridad')),
  status     text not null default 'on' check (status in ('on', 'off')),
  sort       integer not null default 0,
  created_by uuid references users (id),
  updated_by uuid references users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Texto plano: nada que parezca HTML y ninguna llave que no sea {nombre} / {name}.
  check (((title->>'es') || (title->>'en') || (body->>'es') || (body->>'en')) !~ '<[A-Za-z!/?]'),
  check (((body->>'es') || (body->>'en')) !~ '\{(?!nombre\}|name\})')
);
create or replace function support_macros_no_borra() returns trigger language plpgsql as $$
begin raise exception 'una macro no se borra: se apaga'; end $$;
drop trigger if exists support_macros_no_borra on support_macros;
create trigger support_macros_no_borra before delete on support_macros for each row execute function support_macros_no_borra();

-- ── Devoluciones desde un caso (tope del rol leído de la base al decidir) ──
-- null = sin tope del rol (hasta lo cobrado, que impone devolverPago y Stripe) · número = tope por caso · 0 = no devuelve.
create or replace function soporte_tope_devolver(rol text) returns integer language sql stable as $$
  select case when exists (select 1 from role_permissions where role = rol and section = 'tx' and action = 'aprobar' and allowed) then null
              when exists (select 1 from role_permissions where role = rol and section = 'sop' and action = 'editar' and allowed) then cfg_int('soporte_devolver_max_cents')
              else 0 end
$$;
create table if not exists support_refunds (
  id           bigint generated always as identity primary key,
  case_id      bigint not null references support_cases (id),
  payment_id   bigint not null references payments (id),
  idem_key     text not null unique check (idem_key ~ '^tk-[0-9a-f-]{36}$'),
  amount_cents integer not null check (amount_cents > 0),
  staff_id     uuid not null references users (id),
  staff_role   text,                               -- lo pone la base (staff_members), no la app
  cap_cents    integer,                            -- el tope que se aplicó (null = hasta lo cobrado)
  status       text not null default 'pending' check (status in ('pending', 'done', 'failed')),
  fail_reason  text check (char_length(fail_reason) <= 200),
  created_at   timestamptz not null default now(),
  done_at      timestamptz
);
create index if not exists support_refunds_caso on support_refunds (case_id);
create or replace function support_refunds_antes() returns trigger language plpgsql as $$
declare c support_cases; p payments; rol text; tope integer; ya integer;
begin
  if tg_op = 'DELETE' then raise exception 'support_refunds es solo de inserción'; end if;
  if tg_op = 'UPDATE' then
    if old.status <> 'pending' or new.status = 'pending'
       or (new.case_id, new.payment_id, new.idem_key, new.amount_cents, new.staff_id, new.staff_role, new.cap_cents, new.created_at)
          is distinct from (old.case_id, old.payment_id, old.idem_key, old.amount_cents, old.staff_id, old.staff_role, old.cap_cents, old.created_at) then
      raise exception 'support_refunds es solo de inserción (pendiente → hecha o fallida, una vez)';
    end if;
    return new;
  end if;
  select * into c from support_cases where id = new.case_id for update;   -- una decisión a la vez por caso
  if not found then raise exception 'ese caso no existe'; end if;
  if c.status in ('resolved', 'merged') then raise exception 'devolucion_caso_cerrado: el caso ya se cerró'; end if;
  select * into p from payments where id = new.payment_id;
  if not found or c.operation_id is null or p.operation_id <> c.operation_id or p.user_id <> c.user_id then
    raise exception 'devolucion_otro_cobro: ese cobro no es de la operación de este caso';
  end if;
  if p.status not in ('captured', 'partially_refunded') then raise exception 'devolucion_sin_cobro: solo se devuelve lo que ya se cobró'; end if;
  select role into rol from staff_members where user_id = new.staff_id and status = 'active';
  if rol is null then raise exception 'devolucion_sin_rol: solo el equipo devuelve'; end if;
  tope := soporte_tope_devolver(rol);
  new.staff_role := rol; new.cap_cents := tope; new.status := 'pending'; new.done_at := null; new.fail_reason := null;
  if tope is not null then
    select coalesce(sum(amount_cents), 0) into ya from support_refunds where case_id = new.case_id and status in ('pending', 'done');
    if ya + new.amount_cents > tope then raise exception 'devolucion_sobre_tope: % + % pasa del tope de su rol (%)', ya, new.amount_cents, tope; end if;
  end if;
  return new;
end $$;
drop trigger if exists support_refunds_antes on support_refunds;
create trigger support_refunds_antes before insert or update or delete on support_refunds for each row execute function support_refunds_antes();

-- ── La cola ──
alter table queue_items drop constraint if exists queue_items_queue_check;
alter table queue_items add constraint queue_items_queue_check check (queue in ('sello', 'nuevo', 'lic', 'medios', 'rec', 'cambio', 'rep', 'sop', 'chat', 'disputa', 'renta', 'mesa', 'noid', 'cuidado', 'salir',
  'grupo', 'plantones', 'estafa', 'vivienda', 'repUsr', 'apel', 'evt', 'evtcx', 'evtpago', 'ticket'));
alter table queue_items drop constraint if exists queue_items_subject_kind_check;
alter table queue_items add constraint queue_items_subject_kind_check check (subject_kind in ('verification_request', 'business', 'license', 'media', 'recommendation', 'claim', 'sensitive_change',
  'review', 'help_request', 'chat_thread', 'dispute', 'rental', 'listing', 'dm_thread', 'user', 'appeal', 'com_post', 'com_comment', 'event', 'event_settlement', 'support_case'));

-- ── Finanzas ve Soporte («Pasar a Finanzas»): solo si nadie cambió ese permiso a mano ──
update role_permissions set allowed = true, updated_at = now()
 where role = 'finanzas' and section = 'sop' and action = 'ver' and not allowed and updated_by is null;

-- ── Avisos ──
insert into notif_templates (key, grp, pref, sms, title, body) values
  ('sop_recibido', 'tx', null, false, '{"es":"Recibimos tu caso {num}","en":"We got your case {num}"}',
    '{"es":"Una persona del equipo te responde {cuando}. Lo ves en Mi cuenta › Ayuda y soporte.","en":"A person from the team replies {cuando}. See it in My account › Help and support."}'),
  ('sop_respuesta', 'tx', null, false, '{"es":"Te respondieron en {num}","en":"You got a reply on {num}"}',
    '{"es":"{quien} del equipo de To''Latino te escribió. Contesta en Mi cuenta › Ayuda y soporte.","en":"{quien} from the To''Latino team wrote to you. Reply in My account › Help and support."}'),
  ('sop_resuelto', 'tx', null, false, '{"es":"Tu caso {num} quedó resuelto","en":"Your case {num} is resolved"}',
    '{"es":"Dinos si se resolvió. Si necesitas algo más con esto, abre otro caso desde ahí.","en":"Tell us if it was solved. If you need anything else about it, open another case from there."}'),
  ('sop_vencido', 'mod', null, false, '{"es":"Caso {num} fuera de plazo","en":"Case {num} past its deadline"}',
    '{"es":"Nadie le ha respondido en {horas} h hábiles. Está primero en Soporte.","en":"Nobody has replied in {horas} business hours. It is first in Support."}')
on conflict (key) do update set title = excluded.title, body = excluded.body
  where notif_templates.edited_by is null;

-- ── Configuración › Soporte ──
alter table config_keys drop constraint if exists config_keys_section_check;
alter table config_keys add constraint config_keys_section_check check (section in ('comunidad', 'gamificacion', 'salud_pro', 'noche', 'edu', 'fe_inm_autos', 'eventos', 'compa', 'soporte'));
insert into config_keys (key, min, max, def, unit, section, label, help, editable, bloqueo, edit_in, sort) values
  ('soporte_sla_h', 1, 72, 8, '{"es":"horas hábiles","en":"business hours"}', 'soporte', '{"es":"Primera respuesta de un caso","en":"First reply to a case"}',
    '{"es":"Plazo de la cola Soporte, en horas del horario del equipo (hora de la ciudad).","en":"Support queue deadline, in team business hours (city time)."}', true, null, null, 300),
  ('soporte_dias', 5, 7, 5, '{"es":"días desde el lunes","en":"days from Monday"}', 'soporte', '{"es":"Días que atiende el equipo","en":"Days the team works"}',
    '{"es":"5 = lunes a viernes · 6 = hasta el sábado · 7 = todos los días. Lo dicen las pantallas de Soporte.","en":"5 = Monday to Friday · 6 = through Saturday · 7 = every day. The Support screens say it."}', true, null, null, 301),
  ('soporte_desde_h', 0, 23, 9, '{"es":"hora (0–23)","en":"hour (0–23)"}', 'soporte', '{"es":"El equipo empieza a las","en":"The team starts at"}',
    '{"es":"Hora de la ciudad. 9 = 9 AM.","en":"City time. 9 = 9 AM."}', true, null, null, 302),
  ('soporte_hasta_h', 1, 24, 18, '{"es":"hora (1–24)","en":"hour (1–24)"}', 'soporte', '{"es":"El equipo termina a las","en":"The team ends at"}',
    '{"es":"Hora de la ciudad. 18 = 6 PM.","en":"City time. 18 = 6 PM."}', true, null, null, 303),
  ('soporte_casos_dia_max', 1, 50, 5, '{"es":"casos por día","en":"cases per day"}', 'soporte', '{"es":"Casos que abre una persona al día","en":"Cases a person opens per day"}',
    '{"es":"Un caso de seguridad nunca se frena por este límite.","en":"A safety case is never blocked by this limit."}', true, null, null, 304),
  ('soporte_devolver_max_cents', 0, 100000, 5000, '{"es":"centavos por caso","en":"cents per case"}', 'soporte', '{"es":"Tope de devolución del rol Soporte","en":"Support role refund cap"}',
    '{"es":"«Resolver y devolver» de un caso: Soporte devuelve hasta esto por caso; más, Finanzas o Admin (hasta lo cobrado). 5000 = $50.","en":"«Resolve and refund» on a case: Support refunds up to this per case; more needs Finance or Admin (up to what was charged). 5000 = $50."}', true, null, null, 305),
  ('soporte_reabrir_dias', 1, 60, 7, '{"es":"días","en":"days"}', 'soporte', '{"es":"Días para reabrir un caso resuelto","en":"Days to reopen a resolved case"}',
    '{"es":"Si la persona dice que no se resolvió dentro de este plazo, el caso vuelve a la cola. Después, abre otro caso enlazado.","en":"If the person says it was not solved within this time, the case goes back to the queue. After that, they open another linked case."}', true, null, null, 306)
on conflict (key) do update set min = excluded.min, max = excluded.max, def = excluded.def, unit = excluded.unit, section = excluded.section,
  label = excluded.label, help = excluded.help, editable = excluded.editable, bloqueo = excluded.bloqueo, edit_in = excluded.edit_in, sort = excluded.sort;

-- ── Macros de fábrica (texto ES/EN; el equipo las edita o las apaga en Super Admin › Soporte › Macros; si ya existen, no se tocan) ──
insert into support_macros (key, title, body, topic, sort) values
  ('ya-lo-veo', '{"es":"Ya lo estoy viendo","en":"I am on it"}',
    '{"es":"Hola {nombre}. Ya estoy viendo tu caso. Te escribo aquí en cuanto tenga respuesta; no tienes que hacer nada más.","en":"Hi {name}. I am looking at your case now. I will write here as soon as I have an answer; you do not need to do anything else."}', null, 10),
  ('dato-mas', '{"es":"Necesito un dato más","en":"I need one more detail"}',
    '{"es":"Hola {nombre}. Para ayudarte necesito un dato más: ¿qué día pasó y con qué negocio? No me mandes números de tarjeta ni contraseñas.","en":"Hi {name}. To help you I need one more detail: what day did it happen and with which business? Do not send me card numbers or passwords."}', null, 20),
  ('codigo-sms', '{"es":"El código no llega","en":"The code does not arrive"}',
    '{"es":"Hola {nombre}. Pide el código otra vez desde Entrar: llega al número de tu cuenta. Si cambiaste de número, dinos cuál es aquí y lo revisamos contigo.","en":"Hi {name}. Ask for the code again from Sign in: it goes to your account number. If you changed numbers, tell us here and we will check it with you."}', 'cuenta', 30),
  ('deposito-doble', '{"es":"Dos retenciones","en":"Two holds"}',
    '{"es":"Hola {nombre}. Vimos dos retenciones por la misma reservación. Una se libera hoy: tu banco la quita en 1 a 3 días hábiles. Perdón por el susto.","en":"Hi {name}. We saw two holds for the same booking. One is released today: your bank removes it in 1 to 3 business days. Sorry for the scare."}', 'pago', 40),
  ('negocio-cancelo', '{"es":"El negocio canceló","en":"The business cancelled"}',
    '{"es":"Hola {nombre}. Lo que pagaste se devuelve completo a tu tarjeta. Tu banco lo muestra en 3 a 5 días hábiles.","en":"Hi {name}. What you paid is refunded in full to your card. Your bank shows it in 3 to 5 business days."}', 'cita', 50),
  ('sugerencia', '{"es":"Sugerencia recibida","en":"Suggestion received"}',
    '{"es":"Gracias, {nombre}. Lo anotamos para el equipo. Si lo hacemos, te avisamos aquí.","en":"Thanks, {name}. We noted it for the team. If we build it, we will tell you here."}', 'sugerencia', 60)
on conflict (key) do nothing;

commit;
