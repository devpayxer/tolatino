-- 0112 · puerta (6g · docs/diseno/plan/fase6-eventos.md §2 0112, §3 «La puerta» y «Porteros», §4 6g; D1: la puerta SOLO escanea).
-- · door_staff: los porteros que invita el negocio (como el Repartidor, 2l): nombre + teléfono (cifrado + huella; nunca en claro) →
--   código de 7 días → la persona entra con SU cuenta de To'Latino y el mismo teléfono (§6 #11: nadie escanea sin cuenta). Alcance:
--   todos los eventos del negocio o solo algunos (event_ids, del mismo negocio). role = 'scan' (D1: no hay «escanear + vender»; el
--   supervisor es quien tiene la parte «evt» del panel). Quitar = 'removed' (no vuelve) y corta al momento sus sesiones abiertas.
--   Tope de porteros por negocio: puerta_porteros_max (Configuración, leído por la base al invitar).
-- · door_sessions: una puerta abierta (Principal · VIP · Terraza…) en una fecha, de un portero o de un miembro del negocio con «evt»
--   (el modo puerta del panel). puerta_acceso(sesión, persona) decide en CADA acción: la sesión abierta, el portero activo con ese
--   evento (o el miembro activo con «evt»), el negocio activo, el evento publicado y la ventana del día (puertas − puerta_ventana_h
--   hasta el final + puerta_ventana_h). Lo usan el servidor (lib/puerta.ts) y las funciones de abajo.
-- · ticket_scans (SOLO INSERCIÓN; id uuid generado en el teléfono = llave de idempotencia): cada escaneo, entrada manual, llegada de
--   un RSVP, de la lista de Noche o conteo en la puerta, con su resultado y resolución. Lo inserta SOLO puerta_registrar (marca
--   tl.puerta): la app no puede escribir una entrada «aceptada» sin pasar por las reglas. Al insertar, el trigger suma los derivados
--   (door_counts por puerta y event_dates.entered_n / inside_n con la marca tl.evt_derivado) y avisa por NOTIFY 'puerta' (el SSE
--   de /api/puerta/vivo). 6h usará la misma función con offline = true y la hora del teléfono (gancho listo).
-- · ticket_entries: la fila que se BLOQUEA por boleto y fecha (un pase de varios días tiene una por día): entraron N de M, adentro
--   (reentrada), primera y última puerta. check (entered_n <= admits): aun con un error de código, nadie entra dos veces.
-- · puerta_entrada(): la decisión del boleto con la fila del boleto bloqueada (dos porteros a la vez → uno entra y el otro ve «ya
--   entró por … a las …»): firma y versión (las verifica el servidor antes con la llave pública; aquí la versión), anulado, devuelto,
--   reemplazado, transferencia pendiente (bol_vigente), día (bol_vale_en), reentrada, hora de cerrar la puerta y aforo (del día y de
--   la puerta). puerta_rsvp(): la llegada de un RSVP (entran N de M). puerta_contar(): «Contar en la puerta» (entrada libre).
-- · door_table_numbers: «TIENE MESA · ¿CUÁL LE DAS?» (un número por mesa vendida en esa fecha; dos grupos nunca con el mismo).
-- · door_incidents: duplicado · edad · seguridad (911) · pide devolución · otro → aviso al organizador. Sin foto (riesgo de fotos de
--   identificaciones; guardián sinImagenDeID): la nota basta.
-- · events: door_close_after_min (hora de cerrar la puerta, minutos después de empezar) y door_caps (aforo por puerta).
--   rsvps.arrived_n (cuántos del grupo llegaron) y rsvp_n cuenta también a los que llegaron (antes, llegar liberaba el lugar).
-- · Plantillas puerta_invitado (SMS con el código, como el Repartidor), puerta_asignado y puerta_abre (en la app), puerta_incidencia
--   (al negocio). Claves puerta_* en Configuración › Eventos.
-- Nada de dinero: ninguna tabla ni función de la puerta toca precios, cobros, órdenes ni boletos nuevos (guardián sinVentaEnLaPuerta).
-- Idempotente: if not exists, checks que se reemplazan, funciones y triggers que se recrean, catálogos on conflict. Nada se borra.
begin;

-- ── Reglas de puerta del evento ──
create or replace function puerta_caps_ok(j jsonb) returns boolean language plpgsql immutable as $$
declare k text; v jsonb;
begin
  if j is null or jsonb_typeof(j) <> 'object' then return false; end if;
  if (select count(*) from jsonb_object_keys(j)) > 6 then return false; end if;
  for k, v in select * from jsonb_each(j) loop
    if char_length(btrim(k)) not between 1 and 30 or jsonb_typeof(v) <> 'number' or (v #>> '{}') !~ '^\d{1,5}$' or (v #>> '{}')::int not between 1 and 20000 then return false; end if;
  end loop;
  return true;
end $$;
alter table events add column if not exists door_close_after_min smallint;
alter table events drop constraint if exists events_door_close_check;
alter table events add constraint events_door_close_check check (door_close_after_min is null or door_close_after_min between 0 and 720);
alter table events add column if not exists door_caps jsonb not null default '{}'::jsonb;
alter table events drop constraint if exists events_door_caps_check;
alter table events add constraint events_door_caps_check check (puerta_caps_ok(door_caps));

-- ── Porteros ──
create table if not exists door_staff (
  id                bigint generated always as identity primary key,
  business_id       text not null references businesses (id),
  city_id           text not null references cities (id),
  user_id           uuid references users (id),
  display_name      text not null check (char_length(btrim(display_name)) between 2 and 40),
  phone_enc         bytea not null,
  phone_hash        text not null check (phone_hash ~ '^[a-f0-9]{64}$'),
  phone_last4       text not null check (phone_last4 ~ '^\d{4}$'),
  invite_code       text check (invite_code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  invite_expires_at timestamptz,
  scope             text not null default 'all' check (scope in ('all', 'events')),
  event_ids         bigint[] not null default '{}',
  role              text not null default 'scan' check (role in ('scan')),
  status            text not null default 'invited' check (status in ('invited', 'active', 'removed')),
  removed_reason    text check (char_length(removed_reason) <= 200),
  removed_at        timestamptz,
  removed_by        uuid references users (id),
  invited_by        uuid references users (id),
  accepted_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (scope = 'all' or cardinality(event_ids) between 1 and 50),
  check (status <> 'invited' or (invite_code is not null and invite_expires_at is not null)),
  check (status <> 'active' or (user_id is not null and accepted_at is not null and invite_code is null)),
  check (status <> 'removed' or (removed_at is not null and invite_code is null))
);
create unique index if not exists door_staff_tel_idx on door_staff (business_id, phone_hash) where status <> 'removed';
create unique index if not exists door_staff_codigo_idx on door_staff (invite_code) where status = 'invited';
create unique index if not exists door_staff_persona_idx on door_staff (business_id, user_id) where status = 'active';
create index if not exists door_staff_usuario_idx on door_staff (user_id) where status = 'active';

create or replace function door_staff_antes() returns trigger language plpgsql as $$
declare n int; b businesses;
begin
  if tg_op = 'DELETE' then raise exception 'un portero no se borra: se quita (estado)'; end if;
  select * into b from businesses where id = new.business_id;
  new.city_id := b.city_id;
  new.updated_at := now();
  if tg_op = 'INSERT' then
    new.status := 'invited'; new.user_id := null; new.accepted_at := null; new.removed_at := null; new.removed_by := null; new.removed_reason := null; new.created_at := now();
    select count(*) into n from door_staff where business_id = new.business_id and status in ('invited', 'active');
    if n >= cfg_int('puerta_porteros_max') then raise exception 'puerta_porteros_max: este negocio ya tiene % porteros', n; end if;
  else
    if (new.business_id, new.phone_hash, new.phone_enc, new.created_at, new.invited_by) is distinct from (old.business_id, old.phone_hash, old.phone_enc, old.created_at, old.invited_by) then
      raise exception 'de un portero no cambia el negocio ni el teléfono: se quita y se invita otra vez';
    end if;
    if old.status = 'removed' then raise exception 'un portero quitado no vuelve: se invita otra vez'; end if;
    if old.status = 'active' and new.status = 'invited' then raise exception 'un portero activo no vuelve a invitado'; end if;
    if old.user_id is not null and new.user_id is distinct from old.user_id then raise exception 'la cuenta de un portero no cambia'; end if;
  end if;
  -- Solo eventos de este negocio.
  if new.scope = 'events' and exists (select 1 from unnest(new.event_ids) x where not exists (select 1 from events e where e.id = x and e.business_id = new.business_id)) then
    raise exception 'puerta_evento_ajeno: un portero solo escanea eventos de su negocio';
  end if;
  if new.scope = 'all' then new.event_ids := '{}'; end if;
  return new;
end $$;
drop trigger if exists door_staff_antes on door_staff;
create trigger door_staff_antes before insert or update or delete on door_staff for each row execute function door_staff_antes();

-- ── Sesiones de puerta ──
create table if not exists door_sessions (
  id              bigint generated always as identity primary key,
  event_date_id   bigint not null references event_dates (id),
  event_id        bigint not null references events (id),
  business_id     text not null references businesses (id),
  city_id         text not null references cities (id),
  door_staff_id   bigint references door_staff (id),
  member_user_id  uuid references users (id),
  user_id         uuid not null references users (id),
  door_name       text not null check (char_length(btrim(door_name)) between 1 and 30),
  device          uuid,
  clock_offset_ms integer,
  package_id      bigint,                  -- 6h: el paquete sin conexión de esta sesión
  started_at      timestamptz not null default now(),
  ended_at        timestamptz,
  ended_by        text check (ended_by in ('self', 'business', 'system', 'removed')),
  check ((door_staff_id is null) <> (member_user_id is null)),
  check (member_user_id is null or member_user_id = user_id),
  check ((ended_at is null) = (ended_by is null))
);
create index if not exists door_sessions_fecha_idx on door_sessions (event_date_id) where ended_at is null;
create index if not exists door_sessions_fecha_todas_idx on door_sessions (event_date_id, started_at);
create index if not exists door_sessions_persona_idx on door_sessions (user_id, started_at desc);
-- Una persona tiene UNA puerta abierta por fecha (cambiar de puerta cierra la anterior).
create unique index if not exists door_sessions_una_idx on door_sessions (user_id, event_date_id) where ended_at is null;

-- ¿Esta persona puede abrir la puerta de esta fecha? (portero activo con ese evento, o miembro activo con «evt»; negocio activo, evento
-- publicado, fecha viva y dentro de la ventana del día). staff = el portero con que abre (null = como miembro del negocio).
create or replace function puerta_puede(fid bigint, uid uuid, staff bigint) returns boolean language sql stable as $$
  select exists (
    select 1 from event_dates d join events e on e.id = d.event_id join businesses b on b.id = e.business_id
     where d.id = fid and b.status = 'active' and e.status in ('live', 'paused', 'done') and d.status in ('scheduled', 'done')
       and now() between d.doors_at - make_interval(hours => cfg_int('puerta_ventana_h')) and d.ends_at + make_interval(hours => cfg_int('puerta_ventana_h'))
       and case when staff is not null then exists (select 1 from door_staff f where f.id = staff and f.user_id = uid and f.status = 'active' and f.business_id = e.business_id
                                                     and (f.scope = 'all' or e.id = any(f.event_ids)))
                else exists (select 1 from business_members m where m.business_id = e.business_id and m.user_id = uid and m.status = 'active'
                                                               and (m.kind = 'owner' or m.panel_access && array['all', 'evt']::text[])) end)
$$;
-- ¿Sigue valiendo esta sesión para esta persona? (en CADA acción: quitar al portero o la parte «evt» corta al momento).
create or replace function puerta_acceso(sid bigint, uid uuid) returns boolean language sql stable as $$
  select exists (select 1 from door_sessions s where s.id = sid and s.user_id = uid and s.ended_at is null
                   and puerta_puede(s.event_date_id, uid, s.door_staff_id))
$$;

create or replace function door_sessions_antes() returns trigger language plpgsql as $$
declare d event_dates; e events;
begin
  if tg_op = 'DELETE' then raise exception 'una sesión de puerta no se borra: se cierra'; end if;
  if tg_op = 'INSERT' then
    select * into d from event_dates where id = new.event_date_id;
    if not found then raise exception 'esa fecha no existe'; end if;
    select * into e from events where id = d.event_id;
    new.event_id := e.id; new.business_id := e.business_id; new.city_id := d.city_id; new.started_at := now(); new.ended_at := null; new.ended_by := null;
    if not puerta_puede(new.event_date_id, new.user_id, new.door_staff_id) then raise exception 'puerta_sin_acceso: no puedes abrir esta puerta ahora'; end if;
    return new;
  end if;
  if (new.event_date_id, new.event_id, new.business_id, new.city_id, new.door_staff_id, new.member_user_id, new.user_id, new.door_name, new.device, new.started_at)
     is distinct from (old.event_date_id, old.event_id, old.business_id, old.city_id, old.door_staff_id, old.member_user_id, old.user_id, old.door_name, old.device, old.started_at) then
    raise exception 'de una sesión de puerta solo cambia el cierre';
  end if;
  if old.ended_at is not null and (new.ended_at, new.ended_by) is distinct from (old.ended_at, old.ended_by) then raise exception 'una sesión cerrada no se vuelve a abrir'; end if;
  return new;
end $$;
drop trigger if exists door_sessions_antes on door_sessions;
create trigger door_sessions_antes before insert or update or delete on door_sessions for each row execute function door_sessions_antes();

-- Al cerrarse una sesión (el portero, el panel, el barrido o quitar al portero), las pantallas abiertas de esa fecha se enteran al momento
-- (NOTIFY 'puerta' → el SSE vuelve a preguntar si cada persona sigue con acceso).
create or replace function door_sessions_despues() returns trigger language plpgsql as $$
begin
  if new.ended_at is not null and old.ended_at is null then perform pg_notify('puerta', new.event_date_id::text); end if;
  return null;
end $$;
drop trigger if exists door_sessions_despues on door_sessions;
create trigger door_sessions_despues after update on door_sessions for each row execute function door_sessions_despues();

-- Quitar a un portero (o que venza su alcance) cierra al momento sus sesiones abiertas.
create or replace function door_staff_despues() returns trigger language plpgsql as $$
begin
  if new.status = 'removed' and old.status <> 'removed' then
    update door_sessions set ended_at = now(), ended_by = 'removed' where door_staff_id = new.id and ended_at is null;
  elsif new.scope = 'events' and (old.scope, old.event_ids) is distinct from (new.scope, new.event_ids) then
    update door_sessions set ended_at = now(), ended_by = 'removed' where door_staff_id = new.id and ended_at is null and not (event_id = any(new.event_ids));
  end if;
  return null;
end $$;
drop trigger if exists door_staff_despues on door_staff;
create trigger door_staff_despues after update on door_staff for each row execute function door_staff_despues();

-- ── Entradas por boleto y fecha (la fila que se bloquea) ──
create table if not exists ticket_entries (
  ticket_id     bigint not null references tickets (id),
  event_date_id bigint not null references event_dates (id),
  city_id       text not null references cities (id),
  admits        smallint not null check (admits between 1 and 20),
  entered_n     smallint not null default 0,
  inside_n      smallint not null default 0,
  first_at      timestamptz,
  first_door    text,
  last_at       timestamptz,
  last_door     text,
  primary key (ticket_id, event_date_id),
  constraint ticket_entries_una_vez check (entered_n between 0 and admits),
  constraint ticket_entries_adentro check (inside_n between 0 and entered_n)
);
create or replace function ticket_entries_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'una entrada no se borra'; end if;
  if coalesce(current_setting('tl.puerta', true), '') <> 'si' then raise exception 'las entradas las lleva la puerta (puerta_entrada)'; end if;
  if tg_op = 'UPDATE' then
    if (new.ticket_id, new.event_date_id, new.admits) is distinct from (old.ticket_id, old.event_date_id, old.admits) then raise exception 'una entrada no cambia de boleto'; end if;
    if new.entered_n < old.entered_n then raise exception 'los que entraron no bajan'; end if;
  end if;
  return new;
end $$;
drop trigger if exists ticket_entries_antes on ticket_entries;
create trigger ticket_entries_antes before insert or update or delete on ticket_entries for each row execute function ticket_entries_antes();

-- ── Contadores por puerta (derivados; los lleva el trigger de ticket_scans) ──
create table if not exists door_counts (
  event_date_id bigint not null references event_dates (id),
  door_name     text not null check (char_length(door_name) between 1 and 30),
  city_id       text not null references cities (id),
  inside_n      integer not null default 0 check (inside_n >= 0),
  entered_n     integer not null default 0 check (entered_n >= 0),
  scans_n       integer not null default 0 check (scans_n >= 0),
  rejected_n    integer not null default 0 check (rejected_n >= 0),
  dup_n         integer not null default 0 check (dup_n >= 0),
  updated_at    timestamptz not null default now(),
  primary key (event_date_id, door_name)
);
create or replace function door_counts_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'los contadores de la puerta no se borran'; end if;
  if coalesce(current_setting('tl.puerta', true), '') <> 'si' then raise exception 'los contadores de la puerta los lleva la base'; end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists door_counts_antes on door_counts;
create trigger door_counts_antes before insert or update or delete on door_counts for each row execute function door_counts_antes();

-- ── Escaneos (SOLO INSERCIÓN) ──
create table if not exists ticket_scans (
  id            uuid primary key,                       -- lo genera el teléfono: llave de idempotencia
  event_date_id bigint not null references event_dates (id),
  event_id      bigint not null references events (id),
  city_id       text not null references cities (id),
  session_id    bigint not null references door_sessions (id),
  user_id       uuid not null references users (id),   -- quién escaneó (auditoría de check-ins)
  door_name     text not null,
  device        uuid,
  ticket_id     bigint references tickets (id),
  rsvp_id       bigint references rsvps (id),
  noche_res_id  bigint references operations (id),
  code_hash     text check (code_hash ~ '^[a-f0-9]{64}$'),
  kind          text not null check (kind in ('ticket', 'rsvp', 'noche', 'count', 'unknown')),
  direction     text not null default 'in' check (direction in ('in', 'out')),
  admits_n      smallint not null default 0 check (admits_n between 0 and 20),
  first_n       smallint not null default 0 check (first_n between 0 and admits_n),
  result        text not null check (result in ('valid', 'manual', 'count', 'already_used', 'wrong_event', 'wrong_day', 'not_found', 'forged', 'void', 'refunded',
                                                'replaced', 'pending_transfer', 'over_capacity', 'door_closed', 'not_inside', 'no_reentry')),
  manual_reason text check (char_length(manual_reason) <= 120),
  table_no      smallint check (table_no between 1 and 60),
  at_device     timestamptz,
  at_server     timestamptz not null default now(),
  offline       boolean not null default false,
  resolution    text not null check (resolution in ('accepted', 'duplicate', 'rejected')),
  created_at    timestamptz not null default now(),
  check (num_nonnulls(ticket_id, rsvp_id, noche_res_id) <= 1),
  check ((resolution = 'accepted') = (result in ('valid', 'manual', 'count'))),
  check (resolution = 'accepted' or admits_n = 0),
  check (result <> 'manual' or manual_reason is not null)
);
create index if not exists ticket_scans_fecha_idx on ticket_scans (event_date_id, at_server);
create index if not exists ticket_scans_boleto_idx on ticket_scans (ticket_id, at_server) where ticket_id is not null;
create index if not exists ticket_scans_sesion_idx on ticket_scans (session_id);

create or replace function ticket_scans_antes() returns trigger language plpgsql as $$
begin
  if tg_op <> 'INSERT' then raise exception 'ticket_scans es solo de inserción'; end if;
  if coalesce(current_setting('tl.puerta', true), '') <> 'si' then raise exception 'un escaneo lo registra solo la puerta (puerta_registrar)'; end if;
  new.at_server := now(); new.created_at := now();
  return new;
end $$;
drop trigger if exists ticket_scans_antes on ticket_scans;
create trigger ticket_scans_antes before insert or update or delete on ticket_scans for each row execute function ticket_scans_antes();

-- Después: los derivados (por puerta y de la fecha) y el aviso en vivo (SSE de /api/puerta/vivo).
create or replace function ticket_scans_despues() returns trigger language plpgsql as $$
declare dentro int := case when new.resolution <> 'accepted' then 0 when new.direction = 'in' then new.admits_n else -new.admits_n end;
begin
  insert into door_counts (event_date_id, door_name, city_id) values (new.event_date_id, new.door_name, new.city_id) on conflict do nothing;
  update door_counts set inside_n = greatest(0, inside_n + dentro), entered_n = entered_n + new.first_n, scans_n = scans_n + 1,
                         rejected_n = rejected_n + case when new.resolution = 'rejected' then 1 else 0 end,
                         dup_n = dup_n + case when new.resolution = 'duplicate' or new.result = 'already_used' then 1 else 0 end
   where event_date_id = new.event_date_id and door_name = new.door_name;
  if dentro <> 0 or new.first_n > 0 then
    perform set_config('tl.evt_derivado', 'si', true);
    update event_dates set inside_n = greatest(0, inside_n + dentro), entered_n = entered_n + new.first_n where id = new.event_date_id;
    perform set_config('tl.evt_derivado', '', true);
  end if;
  perform pg_notify('puerta', new.event_date_id::text);
  return null;
end $$;
drop trigger if exists ticket_scans_despues on ticket_scans;
create trigger ticket_scans_despues after insert on ticket_scans for each row execute function ticket_scans_despues();

-- El aforo de una fecha: el del día (varios días), el cupo del RSVP o lo que se vende (boletos + entradas de las mesas). 0 = sin límite.
create or replace function puerta_aforo(fid bigint) returns integer language sql stable as $$
  select case when d.day_capacity > 0 then d.day_capacity
              when e.entry = 'rsvp' then e.rsvp_capacity
              when e.entry = 'tickets' then coalesce((select sum(s.quantity) from ticket_stock s where s.event_date_id = coalesce(evt_ancla(e.id), d.id)), 0)
                                          + coalesce((select sum(s.quantity * t.seats) from table_stock s join event_tables t on t.id = s.table_id where s.event_date_id = coalesce(evt_ancla(e.id), d.id)), 0)
              else 0 end
    from event_dates d join events e on e.id = d.event_id where d.id = fid
$$;

-- Registra un escaneo: la ÚNICA puerta de entrada a ticket_scans. Bloquea el contador de la puerta y la fecha, revisa el aforo (del día y
-- de la puerta) para quien entra y escribe el escaneo; el trigger suma. Devuelve el escaneo (con resultado over_capacity si no cabe).
create or replace function puerta_registrar(p_scan uuid, s door_sessions, p_kind text, p_ticket bigint, p_rsvp bigint, p_noche bigint, p_code_hash text, p_dir text,
                                            p_k int, p_first int, p_result text, p_manual text, p_at_device timestamptz, p_offline boolean) returns ticket_scans language plpgsql as $$
declare sc ticket_scans; d event_dates; e events; cap int; dcap int; dentro int; r text := p_result; k int := coalesce(p_k, 0); f int := coalesce(p_first, 0);
begin
  if r in ('valid', 'manual', 'count') and p_dir = 'in' and k > 0 then
    perform set_config('tl.puerta', 'si', true);
    insert into door_counts (event_date_id, door_name, city_id) values (s.event_date_id, s.door_name, s.city_id) on conflict do nothing;
    select inside_n into dentro from door_counts where event_date_id = s.event_date_id and door_name = s.door_name for update;
    select * into d from event_dates where id = s.event_date_id for update;
    select * into e from events where id = d.event_id;
    -- El límite que manda: el aforo del día (varios días) o el cupo del RSVP que puso el organizador, y el de cada puerta. Con boletos, lo
    -- vendido ya es el tope (cada boleto entra una vez); la lista de Noche tiene su propio cupo y solo cuenta en el de la puerta.
    cap := case when p_kind = 'noche' then 0 when d.day_capacity > 0 then d.day_capacity when e.entry = 'rsvp' then e.rsvp_capacity else 0 end;
    dcap := coalesce((e.door_caps ->> s.door_name)::int, 0);
    if (cap > 0 and d.inside_n + k > cap) or (dcap > 0 and dentro + k > dcap) then r := 'over_capacity'; k := 0; f := 0; end if;
  end if;
  if r not in ('valid', 'manual', 'count') then k := 0; f := 0; end if;
  perform set_config('tl.puerta', 'si', true);
  insert into ticket_scans (id, event_date_id, event_id, city_id, session_id, user_id, door_name, device, ticket_id, rsvp_id, noche_res_id, code_hash, kind, direction,
                            admits_n, first_n, result, manual_reason, at_device, offline, resolution)
  values (p_scan, s.event_date_id, s.event_id, s.city_id, s.id, s.user_id, s.door_name, s.device, p_ticket, p_rsvp, p_noche, p_code_hash, p_kind, p_dir,
          k, f, r, case when r = 'manual' then coalesce(p_manual, 'manual') end, p_at_device, coalesce(p_offline, false),
          case when r in ('valid', 'manual', 'count') then 'accepted' else 'rejected' end)
  returning * into sc;
  perform set_config('tl.puerta', '', true);
  return sc;
end $$;

-- La sesión, revisada para esta persona (abierta y con acceso ahora). Sin acceso = excepción (la acción no hace nada).
create or replace function puerta_sesion(p_session bigint, p_user uuid) returns door_sessions language plpgsql as $$
declare s door_sessions;
begin
  select * into s from door_sessions where id = p_session;
  if not found or s.user_id <> p_user or s.ended_at is not null then raise exception 'puerta_cerrada: esta puerta ya no está abierta para ti'; end if;
  if not puerta_acceso(p_session, p_user) then raise exception 'puerta_sin_acceso: ya no tienes acceso a esta puerta'; end if;
  return s;
end $$;

-- El escaneo repetido (mismo id) devuelve lo que ya se decidió: nada cuenta dos veces.
create or replace function puerta_repetido(p_scan uuid) returns ticket_scans language plpgsql as $$
declare sc ticket_scans;
begin
  perform pg_advisory_xact_lock(hashtextextended('puerta:' || p_scan::text, 0));
  select * into sc from ticket_scans where id = p_scan;
  return sc;  -- null si es nuevo
end $$;

-- ── Un boleto en la puerta (QR o entrada manual) ──
-- p_ver: la versión del QR (null = entrada manual por nombre o código, con motivo). p_n: cuántos del grupo entran (o salen) ahora.
create or replace function puerta_entrada(p_scan uuid, p_session bigint, p_user uuid, p_ticket bigint, p_ver int, p_code_hash text, p_dir text, p_n int, p_manual text,
                                          p_at_device timestamptz default null, p_offline boolean default false, p_forged boolean default false) returns ticket_scans language plpgsql as $$
declare sc ticket_scans; s door_sessions; d event_dates; e events; t tickets; x ticket_entries; r text; k int := 0; f int := 0; quedan int;
begin
  sc := puerta_repetido(p_scan);
  if sc.id is not null then return sc; end if;
  s := puerta_sesion(p_session, p_user);
  if p_dir not in ('in', 'out') then raise exception 'puerta_direccion'; end if;
  select * into d from event_dates where id = s.event_date_id;
  select * into e from events where id = d.event_id;
  if p_ticket is null then
    -- Un QR que no es de To'Latino (firma mala, llave de otro entorno) o un código que no existe: queda su huella, nunca el texto.
    return puerta_registrar(p_scan, s, 'unknown', null, null, null, p_code_hash, p_dir, 0, 0, case when p_forged then 'forged' else 'not_found' end, null, p_at_device, p_offline);
  end if;
  select * into t from tickets where id = p_ticket for update;
  if not found then return puerta_registrar(p_scan, s, 'unknown', null, null, null, p_code_hash, p_dir, 0, 0, 'not_found', null, p_at_device, p_offline); end if;
  if t.event_id <> d.event_id then r := 'wrong_event';
  elsif t.status = 'void' then r := 'void';
  elsif t.status = 'refunded' then r := 'refunded';
  elsif t.status = 'replaced' or (p_ver is not null and p_ver <> t.qr_ver) then r := 'replaced';
  elsif exists (select 1 from ticket_transfers z where z.ticket_id = t.id and z.status = 'pending' and z.kind = 'transfer') then r := 'pending_transfer';
  elsif not bol_vale_en(t.id, d.id) then r := 'wrong_day';
  elsif t.status not in ('valid', 'used') then r := 'void';
  end if;
  if r is not null then
    return puerta_registrar(p_scan, s, 'ticket', case when r = 'wrong_event' then null else t.id end, null, null, case when r = 'wrong_event' then p_code_hash end, p_dir, 0, 0, r, null, p_at_device, p_offline);
  end if;
  perform set_config('tl.puerta', 'si', true);
  insert into ticket_entries (ticket_id, event_date_id, city_id, admits) values (t.id, d.id, d.city_id, t.admits) on conflict do nothing;
  select * into x from ticket_entries where ticket_id = t.id and event_date_id = d.id for update;
  if p_dir = 'out' then
    if not e.reentry then r := 'no_reentry';
    elsif x.inside_n = 0 then r := 'not_inside';
    else k := least(greatest(coalesce(p_n, x.inside_n), 1), x.inside_n); r := 'valid';
    end if;
  elsif x.entered_n < x.admits then
    quedan := x.admits - x.entered_n;
    k := least(greatest(coalesce(p_n, quedan), 1), quedan); f := k;
    if e.door_close_after_min is not null and now() > d.starts_at + make_interval(mins => e.door_close_after_min) then r := 'door_closed'; k := 0; f := 0;
    else r := case when p_manual is not null then 'manual' else 'valid' end; end if;
  elsif e.reentry and x.inside_n < x.entered_n then
    quedan := x.entered_n - x.inside_n;
    k := least(greatest(coalesce(p_n, quedan), 1), quedan); r := case when p_manual is not null then 'manual' else 'valid' end;
  else r := 'already_used';
  end if;
  sc := puerta_registrar(p_scan, s, 'ticket', t.id, null, null, null, p_dir, k, f, r, p_manual, p_at_device, p_offline);
  if sc.resolution = 'accepted' then
    perform set_config('tl.puerta', 'si', true);
    update ticket_entries set entered_n = entered_n + sc.first_n,
                              inside_n = case when p_dir = 'in' then inside_n + sc.admits_n else inside_n - sc.admits_n end,
                              first_at = coalesce(first_at, now()), first_door = coalesce(first_door, s.door_name), last_at = now(), last_door = s.door_name
     where ticket_id = t.id and event_date_id = d.id;
    perform set_config('tl.puerta', '', true);
    -- La primera entrada aceptada deja el boleto «usado» (no se transfiere ni se cancela; un pase sigue entrando cada día por ticket_entries).
    if t.status = 'valid' and sc.first_n > 0 then update tickets set status = 'used' where id = t.id; end if;
  end if;
  return sc;
end $$;

-- ── Un RSVP que llega (entran N de M) ──
alter table rsvps add column if not exists arrived_n smallint not null default 0;
alter table rsvps drop constraint if exists rsvps_llegaron_check;
alter table rsvps add constraint rsvps_llegaron_check check (arrived_n between 0 and party);
create or replace function rsvps_llegada() returns trigger language plpgsql as $$
begin
  if new.arrived_n is distinct from old.arrived_n then
    if coalesce(current_setting('tl.puerta', true), '') <> 'si' then raise exception 'la llegada de un RSVP la marca la puerta'; end if;
    if new.arrived_n < old.arrived_n then raise exception 'los que llegaron no bajan'; end if;
  end if;
  return new;
end $$;
drop trigger if exists rsvps_llegada on rsvps;
create trigger rsvps_llegada before update of arrived_n on rsvps for each row execute function rsvps_llegada();
-- rsvp_n = los lugares tomados: los que van Y los que ya llegaron (antes, llegar liberaba el lugar y otro podía tomarlo). Uno que vino tarde
-- (vencido → llegó) entra aunque el cupo ya esté lleno: está en la puerta.
create or replace function rsvps_despues() returns trigger language plpgsql as $$
declare dh int; dg int; n int; cap int;
begin
  dh := (case when new.status in ('going', 'attended') then new.party else 0 end) - (case when tg_op = 'UPDATE' and old.status in ('going', 'attended') then old.party else 0 end);
  dg := (case when new.status <> 'cancelled' then new.party else 0 end) - (case when tg_op = 'UPDATE' and old.status <> 'cancelled' then old.party else 0 end);
  if dh = 0 and dg = 0 then return null; end if;
  perform set_config('tl.evt_derivado', 'si', true);
  update event_dates set rsvp_n = greatest(0, rsvp_n + dh), going_n = going_n + dg where id = new.event_date_id returning rsvp_n into n;
  perform set_config('tl.evt_derivado', '', true);
  select rsvp_capacity into cap from events where id = new.event_id;
  if tg_op = 'UPDATE' and old.status = 'expired' and new.status = 'attended' then return null; end if;  -- vino tarde: ya está en la puerta
  if dh > 0 and cap > 0 and n > cap then raise exception 'evt_cupo_lleno: el cupo se llenó'; end if;
  return null;
end $$;

create or replace function puerta_rsvp(p_scan uuid, p_session bigint, p_user uuid, p_rsvp bigint, p_n int, p_at_device timestamptz default null, p_offline boolean default false)
returns ticket_scans language plpgsql as $$
declare sc ticket_scans; s door_sessions; d event_dates; e events; v rsvps; r text; k int := 0; quedan int;
begin
  sc := puerta_repetido(p_scan);
  if sc.id is not null then return sc; end if;
  s := puerta_sesion(p_session, p_user);
  select * into d from event_dates where id = s.event_date_id;
  select * into e from events where id = d.event_id;
  select * into v from rsvps where id = p_rsvp for update;
  if not found then return puerta_registrar(p_scan, s, 'unknown', null, null, null, null, 'in', 0, 0, 'not_found', null, p_at_device, p_offline); end if;
  if v.event_id <> d.event_id then return puerta_registrar(p_scan, s, 'rsvp', null, null, null, null, 'in', 0, 0, 'wrong_event', null, p_at_device, p_offline); end if;
  if v.event_date_id <> d.id then r := 'wrong_day';
  elsif v.status = 'cancelled' then r := 'void';
  elsif v.arrived_n >= v.party then r := 'already_used';
  elsif e.door_close_after_min is not null and now() > d.starts_at + make_interval(mins => e.door_close_after_min) then r := 'door_closed';
  else quedan := v.party - v.arrived_n; k := least(greatest(coalesce(p_n, quedan), 1), quedan); r := 'valid';
  end if;
  sc := puerta_registrar(p_scan, s, 'rsvp', null, v.id, null, null, 'in', k, k, r, null, p_at_device, p_offline);
  if sc.resolution = 'accepted' then
    perform set_config('tl.puerta', 'si', true);
    update rsvps set arrived_n = arrived_n + sc.admits_n, status = 'attended' where id = v.id;
    perform set_config('tl.puerta', '', true);
  end if;
  return sc;
end $$;

-- ── «Contar en la puerta» (entrada libre: cuántos vinieron de verdad) ──
create or replace function puerta_contar(p_scan uuid, p_session bigint, p_user uuid, p_n int, p_dir text, p_at_device timestamptz default null, p_offline boolean default false)
returns ticket_scans language plpgsql as $$
declare sc ticket_scans; s door_sessions; d event_dates; e events; k int := least(greatest(coalesce(p_n, 1), 1), 20); dentro int;
begin
  sc := puerta_repetido(p_scan);
  if sc.id is not null then return sc; end if;
  s := puerta_sesion(p_session, p_user);
  if p_dir not in ('in', 'out') then raise exception 'puerta_direccion'; end if;
  select * into d from event_dates where id = s.event_date_id;
  select * into e from events where id = d.event_id;
  if e.entry <> 'free' then raise exception 'puerta_no_cuenta: este evento entra con boleto o RSVP'; end if;
  if p_dir = 'out' then
    select inside_n into dentro from door_counts where event_date_id = d.id and door_name = s.door_name;
    k := least(k, coalesce(dentro, 0));
    if k = 0 then return puerta_registrar(p_scan, s, 'count', null, null, null, null, 'out', 0, 0, 'not_inside', null, p_at_device, p_offline); end if;
    return puerta_registrar(p_scan, s, 'count', null, null, null, null, 'out', k, 0, 'count', null, p_at_device, p_offline);
  end if;
  if e.door_close_after_min is not null and now() > d.starts_at + make_interval(mins => e.door_close_after_min) then
    return puerta_registrar(p_scan, s, 'count', null, null, null, null, 'in', 0, 0, 'door_closed', null, p_at_device, p_offline);
  end if;
  return puerta_registrar(p_scan, s, 'count', null, null, null, null, 'in', k, k, 'count', null, p_at_device, p_offline);
end $$;

-- ── La lista y las mesas de Noche esa noche (las marca lib/noche-reservas.ts, el único que lee la reserva; aquí solo se registra) ──
create or replace function puerta_noche(p_scan uuid, p_session bigint, p_user uuid, p_op bigint, p_k int, p_at_device timestamptz default null, p_offline boolean default false)
returns ticket_scans language plpgsql as $$
declare sc ticket_scans; s door_sessions; o operations;
begin
  sc := puerta_repetido(p_scan);
  if sc.id is not null then return sc; end if;
  s := puerta_sesion(p_session, p_user);
  select * into o from operations where id = p_op and kind = 'night';
  if not found or o.business_id <> s.business_id then return puerta_registrar(p_scan, s, 'unknown', null, null, null, null, 'in', 0, 0, 'not_found', null, p_at_device, p_offline); end if;
  if coalesce(p_k, 0) < 1 then return puerta_registrar(p_scan, s, 'noche', null, null, o.id, null, 'in', 0, 0, 'already_used', null, p_at_device, p_offline); end if;
  return puerta_registrar(p_scan, s, 'noche', null, null, o.id, null, 'in', p_k, p_k, 'valid', null, p_at_device, p_offline);
end $$;

-- ── Búsquedas en la puerta (límite por minuto, puerta_buscar_min; solo inserción; el texto buscado no se guarda) ──
create table if not exists door_searches (
  id         bigint generated always as identity primary key,
  session_id bigint not null references door_sessions (id),
  user_id    uuid not null references users (id),
  at         timestamptz not null default now()
);
create index if not exists door_searches_persona_idx on door_searches (user_id, at desc);
create or replace function door_searches_inmutable() returns trigger language plpgsql as $$
begin raise exception 'door_searches es solo de inserción'; end $$;
drop trigger if exists door_searches_no_cambia on door_searches;
create trigger door_searches_no_cambia before update or delete on door_searches for each row execute function door_searches_inmutable();

-- ── Mesas: el número que le da la puerta a cada mesa vendida esa noche ──
create table if not exists door_table_numbers (
  id            bigint generated always as identity primary key,
  event_date_id bigint not null references event_dates (id),
  city_id       text not null references cities (id),
  table_id      bigint not null references event_tables (id),
  ticket_id     bigint not null references tickets (id),
  table_no      smallint not null check (table_no between 1 and 60),
  by_user       uuid not null references users (id),
  at            timestamptz not null default now(),
  released_at   timestamptz,
  released_by   uuid references users (id)
);
create unique index if not exists door_table_numbers_mesa_idx on door_table_numbers (event_date_id, table_id, table_no) where released_at is null;
create unique index if not exists door_table_numbers_boleto_idx on door_table_numbers (event_date_id, ticket_id) where released_at is null;
create or replace function door_table_numbers_antes() returns trigger language plpgsql as $$
declare t tickets; et event_tables;
begin
  if tg_op = 'DELETE' then raise exception 'un número de mesa no se borra: se suelta'; end if;
  if tg_op = 'UPDATE' then
    if (new.event_date_id, new.table_id, new.ticket_id, new.table_no, new.by_user, new.at) is distinct from (old.event_date_id, old.table_id, old.ticket_id, old.table_no, old.by_user, old.at)
       or old.released_at is not null then raise exception 'un número de mesa solo se suelta (una vez)'; end if;
    return new;
  end if;
  select * into t from tickets where id = new.ticket_id;
  select * into et from event_tables where id = t.table_id;
  if t.table_id is null or et.id is null then raise exception 'ese boleto no es de una mesa'; end if;
  if new.table_no > et.quantity then raise exception 'esa mesa no existe: hay %', et.quantity; end if;
  new.table_id := t.table_id; new.city_id := t.city_id; new.at := now(); new.released_at := null; new.released_by := null;
  return new;
end $$;
drop trigger if exists door_table_numbers_antes on door_table_numbers;
create trigger door_table_numbers_antes before insert or update or delete on door_table_numbers for each row execute function door_table_numbers_antes();

-- ── Incidencias en la puerta ──
create table if not exists door_incidents (
  id            bigint generated always as identity primary key,
  event_date_id bigint not null references event_dates (id),
  event_id      bigint not null references events (id),
  business_id   text not null references businesses (id),
  city_id       text not null references cities (id),
  session_id    bigint references door_sessions (id),
  ticket_id     bigint references tickets (id),
  kind          text not null check (kind in ('duplicado', 'edad', 'seguridad', 'devolucion', 'otro')),
  note          text not null default '' check (char_length(note) <= 300),
  status        text not null default 'open' check (status in ('open', 'closed')),
  by_user       uuid not null references users (id),
  at            timestamptz not null default now(),
  closed_at     timestamptz,
  closed_by     uuid references users (id),
  closed_note   text check (char_length(closed_note) <= 300),
  check ((status = 'closed') = (closed_at is not null))
);
create index if not exists door_incidents_fecha_idx on door_incidents (event_date_id, at desc);
create index if not exists door_incidents_abiertas_idx on door_incidents (business_id, at desc) where status = 'open';
create or replace function door_incidents_antes() returns trigger language plpgsql as $$
declare d event_dates; e events;
begin
  if tg_op = 'DELETE' then raise exception 'una incidencia no se borra: se cierra'; end if;
  if tg_op = 'INSERT' then
    select * into d from event_dates where id = new.event_date_id;
    select * into e from events where id = d.event_id;
    new.event_id := e.id; new.business_id := e.business_id; new.city_id := d.city_id; new.at := now(); new.status := 'open'; new.closed_at := null; new.closed_by := null; new.closed_note := null;
    if new.ticket_id is not null and not exists (select 1 from tickets t where t.id = new.ticket_id and t.event_id = e.id) then raise exception 'ese boleto no es de este evento'; end if;
    return new;
  end if;
  if (new.event_date_id, new.event_id, new.business_id, new.city_id, new.session_id, new.ticket_id, new.kind, new.note, new.by_user, new.at)
     is distinct from (old.event_date_id, old.event_id, old.business_id, old.city_id, old.session_id, old.ticket_id, old.kind, old.note, old.by_user, old.at)
     or old.status = 'closed' then raise exception 'de una incidencia solo cambia el cierre (una vez)'; end if;
  return new;
end $$;
drop trigger if exists door_incidents_antes on door_incidents;
create trigger door_incidents_antes before insert or update or delete on door_incidents for each row execute function door_incidents_antes();

-- ── Avisos (SMS solo puerta_invitado: el código para entrar, como el Repartidor) ──
insert into notif_templates (key, grp, pref, sms, title, body) values
  ('puerta_invitado', 'tx', null, true, '{"es":"Te invitaron a la puerta","en":"You were invited to the door"}',
    '{"es":"{negocio} te invitó a escanear boletos en su puerta. Entra a To''Latino Puerta con este teléfono y el código {codigo}: {enlace}","en":"{negocio} invited you to scan tickets at their door. Open To''Latino Door with this phone and the code {codigo}: {enlace}"}'),
  ('puerta_asignado', 'tx', null, false, '{"es":"Tienes una puerta","en":"You have a door"}',
    '{"es":"{negocio} te puso en la puerta de {evento} ({cuando}).","en":"{negocio} put you on the door for {evento} ({cuando})."}'),
  ('puerta_abre', 'tx', null, false, '{"es":"Hoy escaneas en la puerta","en":"You scan at the door today"}',
    '{"es":"{evento} abre las puertas a las {hora}. Abre To''Latino Puerta para empezar.","en":"{evento} opens its doors at {hora}. Open To''Latino Door to start."}'),
  ('puerta_incidencia', 'biz', null, false, '{"es":"Incidencia en la puerta","en":"Incident at the door"}',
    '{"es":"{quien} reportó en {puerta} ({evento}): {tipo}. {nota}","en":"{quien} reported at {puerta} ({evento}): {tipo}. {nota}"}')
on conflict (key) do update set grp = excluded.grp, pref = excluded.pref, sms = excluded.sms, title = excluded.title, body = excluded.body;

-- ── Configuración › Eventos (la base las lee en el momento con cfg_int) ──
insert into config_keys (key, min, max, def, unit, section, label, help, editable, bloqueo, edit_in, sort) values
  ('puerta_porteros_max', 1, 100, 20, '{"es":"porteros","en":"door staff"}', 'eventos', '{"es":"Porteros por negocio","en":"Door staff per business"}',
    '{"es":"Lo más que un negocio tiene invitados o activos a la vez. La base no deja pasar de aquí.","en":"Most a business can have invited or active at once. The database enforces it."}', true, null, null, 110),
  ('puerta_ventana_h', 1, 6, 2, '{"es":"h","en":"h"}', 'eventos', '{"es":"La puerta se abre antes y se cierra después","en":"The door opens before and closes after"}',
    '{"es":"Horas antes de las puertas y después del final en que un portero puede escanear. Fuera de ahí, nadie ve ni marca nada.","en":"Hours before doors and after the end when door staff can scan. Outside that, nobody sees or marks anything."}', true, null, null, 111),
  ('puerta_aforo_alerta_pct', 50, 100, 90, '{"es":"%","en":"%"}', 'eventos', '{"es":"Aviso de aforo","en":"Capacity alert"}',
    '{"es":"Con este porcentaje del aforo adentro, la puerta y el panel lo avisan en grande. Al 100 % la puerta no deja entrar a más.","en":"With this share of capacity inside, the door and the dashboard show a big alert. At 100% the door lets no one else in."}', true, null, null, 112),
  ('puerta_buscar_min', 5, 120, 30, '{"es":"búsquedas","en":"searches"}', 'eventos', '{"es":"Búsquedas por minuto en la puerta","en":"Door searches per minute"}',
    '{"es":"Cuántas búsquedas por nombre o código hace un portero por minuto. Frena a quien quiera sacar la lista entera.","en":"How many name or code searches one door staffer can run per minute. Stops anyone trying to pull the whole list."}', true, null, null, 113),
  ('puerta_invitar_dia_max', 1, 100, 15, '{"es":"invitaciones","en":"invites"}', 'eventos', '{"es":"Invitaciones de porteros al día","en":"Door staff invites per day"}',
    '{"es":"Cuántos porteros invita un negocio en un día. Cada invitación manda un SMS.","en":"How many door staff a business can invite in a day. Each invite sends a text."}', true, null, null, 114)
on conflict (key) do update set min = excluded.min, max = excluded.max, def = excluded.def, unit = excluded.unit, section = excluded.section, label = excluded.label,
  help = excluded.help, editable = excluded.editable, bloqueo = excluded.bloqueo, edit_in = excluded.edit_in, sort = excluded.sort;

commit;
