-- 0113 · puerta_sin_conexion (6h · docs/diseno/plan/fase6-eventos.md §2 0113, §3 «Sin conexión y varios porteros», §4 6h; decisión T #23).
-- · door_packages: el paquete sin conexión de una sesión de puerta. El CONTENIDO no se guarda (se arma al pedirlo, se firma con la llave
--   Ed25519 del QR y se cifra con la llave de esa sesión, que solo deriva el servidor): aquí queda cuándo se armó, cuándo vence (fin de la
--   fecha + puerta_paquete_h), cuántas filas, su huella sha256 y si se revocó. Al cerrarse la sesión (el portero, el panel, el barrido,
--   quitar al portero o «Revocar este teléfono») sus paquetes quedan revocados en el acto (trigger) y el servidor ya no da ni el paquete,
--   ni los cambios, ni la llave.
-- · puerta_paquete_filas(fecha, desde): lo ÚNICO que viaja al teléfono (= door_delta del plan con su cursor): por boleto el id, la versión
--   del QR, entradas, estado (con «se está transfiriendo»), nombre + inicial (o el de la cortesía), últimos 4 y huella del código, días que
--   vale (varios días: todos los boletos del evento, para decir ES DE OTRO DÍA sin señal), tipo o zona, si es mesa, cortesía o recibido,
--   cuántos entraron y por qué puerta y hora; por RSVP el id, personas,
--   estado, nombre + inicial y cuántos llegaron. NUNCA teléfonos, correos, montos ni datos de pago (guardián paqueteMinimo).
-- · door_syncs (SOLO INSERCIÓN): cada subida de la cola de un teléfono: cuántos, aceptados, duplicados, rechazados, ya subidos, el desfase
--   del reloj del teléfono medido en esa subida y si es grande (puerta_reloj_desvio_seg).
-- · ticket_scans suma la hora que cuenta (at_eff: en línea = la del servidor; sin conexión = la del teléfono corregida con su desfase,
--   dentro de la sesión y nunca en el futuro), el desfase, la marca de reloj raro, cuántos pidió entrar, si el teléfono lo dejó entrar
--   (local_in) y qué decidió (local_res), y la subida. Sigue siendo de solo inserción.
-- · ticket_scan_fixes (SOLO INSERCIÓN): cuando llega tarde un escaneo sin conexión con una hora ANTERIOR a otro ya aceptado del mismo
--   boleto, la base vuelve a decidir todos los escaneos de ese boleto en esa fecha por la hora que cuenta (empate: el que llegó antes al
--   servidor; después el id). Lo que cambia queda como una corrección (el escaneo original no se toca) y el trigger mueve los derivados
--   (por puerta y de la fecha). ticket_scans_ef = cada escaneo con su resolución vigente. Así la misma cola en distinto orden da el mismo
--   resultado (guardián choqueDePuertaDeterminista).
-- · puerta_offline(): un escaneo de la cola: idempotente por el id del teléfono (otro id ajeno = error), la sesión de ESA persona (abierta,
--   o cerrada por ella, el panel o el barrido mientras no venza el paquete; revocada o portero quitado = nada se sube), la firma y la versión
--   (las revisa el servidor antes con la llave pública), anulado, devuelto, reemplazado, en transferencia, otro día u otro evento EN EL
--   MOMENTO DE SUBIR: si el teléfono lo dejó entrar y ya no valía → rejected + incidencia «sin_valor». Si valía: puerta_rehacer decide con
--   la fila del boleto bloqueada; el que pierde queda «duplicate» (no deshace nada: ya entró) y abre una incidencia «duplicado» con las dos
--   puertas y horas.
-- · door_incidents suma scan_id / other_scan_id / auto (una incidencia automática por escaneo) y el tipo «sin_valor».
-- · door_sessions.ended_by suma 'revoked' («Revocar este teléfono» del panel): a diferencia de «Cerrar su puerta», lo que ese teléfono
--   tenga sin subir ya no entra.
-- · Claves puerta_paquete_h 6, puerta_sync_seg 15, puerta_offline_aviso_min 10, puerta_sync_lote 200, puerta_reloj_desvio_seg 120.
-- Nada de dinero (D1, guardián sinVentaEnLaPuerta). Idempotente: if not exists, checks que se reemplazan, funciones y triggers que se
-- recrean, catálogos on conflict. Nada se borra.
begin;

-- ── Configuración ──
insert into config_keys (key, min, max, def, unit, section, label, help, editable, bloqueo, edit_in, sort) values
  ('puerta_paquete_h', 1, 24, 6, '{"es":"h","en":"h"}', 'eventos', '{"es":"El paquete sin conexión vence","en":"Offline pack expires"}',
    '{"es":"Horas después del final de la fecha en que el paquete de la puerta deja de servir y se borra del teléfono. También es el plazo para subir lo escaneado sin señal.","en":"Hours after the date ends when the door pack stops working and is wiped from the phone. It is also the deadline to upload what was scanned offline."}', true, null, null, 115),
  ('puerta_sync_seg', 5, 120, 15, '{"es":"s","en":"s"}', 'eventos', '{"es":"Cada cuánto se pone al día la puerta","en":"How often the door catches up"}',
    '{"es":"Con señal, cada cuántos segundos el teléfono sube sus escaneos y baja los cambios (devueltos, transferidos, nuevos). Menos = la lista sin señal es más fresca.","en":"With signal, every how many seconds the phone uploads its scans and downloads changes (refunded, transferred, new). Lower = fresher offline list."}', true, null, null, 116),
  ('puerta_offline_aviso_min', 1, 60, 10, '{"es":"min","en":"min"}', 'eventos', '{"es":"Aviso grande sin señal","en":"Big offline warning"}',
    '{"es":"Minutos sin señal después de los que la puerta lo avisa en grande: lo devuelto o transferido desde entonces no lo sabe ese teléfono.","en":"Minutes without signal after which the door shows a big warning: anything refunded or transferred since then is unknown to that phone."}', true, null, null, 117),
  ('puerta_sync_lote', 20, 1000, 200, '{"es":"escaneos","en":"scans"}', 'eventos', '{"es":"Escaneos por subida","en":"Scans per upload"}',
    '{"es":"Cuántos escaneos sin conexión sube un teléfono en cada llamada. El resto sale en la siguiente, en orden.","en":"How many offline scans a phone uploads per call. The rest go in the next one, in order."}', true, null, null, 118),
  ('puerta_reloj_desvio_seg', 10, 3600, 120, '{"es":"s","en":"s"}', 'eventos', '{"es":"Reloj del teléfono desviado","en":"Phone clock off"}',
    '{"es":"Si la hora del teléfono se aleja de la del servidor más que esto, sus escaneos sin conexión se marcan con «reloj desviado» (la hora se corrige igual).","en":"If the phone time is off from the server by more than this, its offline scans are flagged «clock off» (the time is corrected anyway)."}', true, null, null, 119)
on conflict (key) do update set min = excluded.min, max = excluded.max, def = excluded.def, unit = excluded.unit, section = excluded.section, label = excluded.label,
  help = excluded.help, editable = excluded.editable, bloqueo = excluded.bloqueo, edit_in = excluded.edit_in, sort = excluded.sort;

-- ── «Revocar este teléfono» ──
alter table door_sessions drop constraint if exists door_sessions_ended_by_check;
alter table door_sessions add constraint door_sessions_ended_by_check check (ended_by in ('self', 'business', 'system', 'removed', 'revoked'));

-- ── Nombre + inicial (lo único que la puerta muestra de una persona; = nombreCorto de lib/puerta-comun.ts) ──
create or replace function puerta_nombre(n text, ap text) returns text language sql immutable as $$
  with p as (select regexp_split_to_array(btrim(regexp_replace(coalesce(n, ''), '\s+', ' ', 'g')), ' ') as t)
  select case when btrim(coalesce(n, '')) = '' then '—'
              else t[1] || coalesce(' ' || upper(left(nullif(btrim(case when ap is not null then ap when cardinality(t) > 1 then t[cardinality(t)] else '' end), ''), 1)) || '.', '') end
    from p
$$;

-- ── Paquetes (el contenido NO se guarda) ──
create table if not exists door_packages (
  id             bigint generated always as identity primary key,
  session_id     bigint not null references door_sessions (id),
  event_date_id  bigint not null references event_dates (id),
  event_id       bigint not null references events (id),
  business_id    text not null references businesses (id),
  city_id        text not null references cities (id),
  user_id        uuid not null references users (id),
  device         uuid,
  built_at       timestamptz not null default now(),
  expires_at     timestamptz not null,
  rows_n         integer not null check (rows_n >= 0),
  bytes_n        integer not null default 0 check (bytes_n >= 0),
  sha256         text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  revoked_at     timestamptz,
  revoked_reason text check (revoked_reason in ('self', 'business', 'system', 'removed', 'revoked', 'vencido')),
  check ((revoked_at is null) = (revoked_reason is null))
);
create index if not exists door_packages_sesion_idx on door_packages (session_id, built_at desc);
create index if not exists door_packages_vivos_idx on door_packages (expires_at) where revoked_at is null;

create or replace function door_packages_antes() returns trigger language plpgsql as $$
declare s door_sessions; d event_dates;
begin
  if tg_op = 'DELETE' then raise exception 'un paquete de puerta no se borra: se revoca'; end if;
  if tg_op = 'INSERT' then
    select * into s from door_sessions where id = new.session_id;
    if not found or s.ended_at is not null or not puerta_acceso(s.id, s.user_id) then raise exception 'puerta_cerrada: el paquete solo sale para una puerta abierta'; end if;
    select * into d from event_dates where id = s.event_date_id;
    new.event_date_id := s.event_date_id; new.event_id := s.event_id; new.business_id := s.business_id; new.city_id := s.city_id; new.user_id := s.user_id; new.device := s.device;
    new.built_at := now(); new.revoked_at := null; new.revoked_reason := null;
    new.expires_at := d.ends_at + make_interval(hours => cfg_int('puerta_paquete_h'));
    return new;
  end if;
  if (new.session_id, new.event_date_id, new.event_id, new.business_id, new.city_id, new.user_id, new.device, new.built_at, new.expires_at, new.rows_n, new.bytes_n, new.sha256)
     is distinct from (old.session_id, old.event_date_id, old.event_id, old.business_id, old.city_id, old.user_id, old.device, old.built_at, old.expires_at, old.rows_n, old.bytes_n, old.sha256) then
    raise exception 'de un paquete solo cambia la revocación';
  end if;
  if old.revoked_at is not null and (new.revoked_at, new.revoked_reason) is distinct from (old.revoked_at, old.revoked_reason) then raise exception 'un paquete revocado no vuelve'; end if;
  return new;
end $$;
drop trigger if exists door_packages_antes on door_packages;
create trigger door_packages_antes before insert or update or delete on door_packages for each row execute function door_packages_antes();

-- door_sessions_antes (0112) + 6h: una sesión cerrada (por la persona, el panel o el barrido) todavía se puede REVOCAR («Revocar este
-- teléfono»): lo que ese teléfono tenga sin subir ya no entra. Nada más cambia del cierre; una revocada o de un portero quitado no cambia.
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
  if old.ended_at is not null and (new.ended_at, new.ended_by) is distinct from (old.ended_at, old.ended_by)
     and not (new.ended_at = old.ended_at and new.ended_by = 'revoked' and old.ended_by in ('self', 'business', 'system')) then
    raise exception 'una sesión cerrada no se vuelve a abrir';
  end if;
  return new;
end $$;

-- Al cerrarse una sesión: NOTIFY (como 0112) y sus paquetes quedan revocados con el motivo del cierre.
create or replace function door_sessions_despues() returns trigger language plpgsql as $$
begin
  if new.ended_at is not null and old.ended_at is null then
    update door_packages set revoked_at = now(), revoked_reason = new.ended_by where session_id = new.id and revoked_at is null;
    perform pg_notify('puerta', new.event_date_id::text);
  end if;
  return null;
end $$;

-- ── Lo que viaja al teléfono (door_delta: todo con p_desde null; los cambios desde un cursor con p_desde) ──
create index if not exists tickets_evento_cambio_idx on tickets (event_id, updated_at);
create index if not exists rsvps_fecha_cambio_idx on rsvps (event_date_id, updated_at);
create index if not exists ticket_entries_fecha_idx on ticket_entries (event_date_id, last_at);
create or replace function puerta_paquete_filas(p_fecha bigint, p_desde timestamptz)
returns table (k text, id bigint, v integer, a smallint, st text, nom text, c4 text, ch text, dias smallint[], tipo jsonb, mesa boolean, comp boolean, tr boolean,
               e smallint, i smallint, ud text, uh text, cambio timestamptz)
language sql stable as $$
  select 'b'::text, t.id, t.qr_ver, t.admits,
         case when t.status in ('valid', 'used') and exists (select 1 from ticket_transfers z where z.ticket_id = t.id and z.status = 'pending' and z.kind = 'transfer') then 'pending' else t.status end,
         case when t.kind = 'comp' then coalesce(nullif(btrim(t.comp_name), ''), '—') when t.holder_name is not null then puerta_nombre(t.holder_name, null) else puerta_nombre(u.first_name, u.last_name) end,
         right(t.code, 4), left(encode(sha256(convert_to(t.code, 'UTF8')), 'hex'), 16),
         case when ev.kind = 'span' then t.valid_days end, coalesce(tt.name, et.zone), t.table_id is not null, t.kind = 'comp',
         exists (select 1 from ticket_transfers z where z.new_ticket_id = t.id and z.status = 'claimed'),
         coalesce(x.entered_n, 0)::smallint, coalesce(x.inside_n, 0)::smallint, x.last_door, to_char(x.last_at at time zone ci.timezone, 'HH24:MI'),
         greatest(t.updated_at, coalesce(x.last_at, t.updated_at))
    from event_dates d join events ev on ev.id = d.event_id join cities ci on ci.id = d.city_id
    join tickets t on t.event_id = ev.id and (t.event_date_id = d.id or ev.kind = 'span')   -- varios días: todos los del evento, con sus días (ES DE OTRO DÍA sin señal)
    left join users u on u.id = t.holder_user_id left join ticket_types tt on tt.id = t.ticket_type_id left join event_tables et on et.id = t.table_id
    left join ticket_entries x on x.ticket_id = t.id and x.event_date_id = d.id
   where d.id = p_fecha and (p_desde is null or t.updated_at > p_desde or x.last_at > p_desde)
  union all
  select 'r'::text, v.id, null::integer, v.party, v.status, puerta_nombre(u.first_name, u.last_name), null::text, null::text, null::smallint[], null::jsonb, false, false, false,
         v.arrived_n, v.arrived_n, null::text, null::text, v.updated_at
    from rsvps v join users u on u.id = v.user_id
   where v.event_date_id = p_fecha and (p_desde is not null or v.status in ('going', 'attended', 'expired')) and (p_desde is null or v.updated_at > p_desde)
$$;

-- ── Subidas de la cola (SOLO INSERCIÓN) ──
create table if not exists door_syncs (
  id              bigint generated always as identity primary key,
  session_id      bigint not null references door_sessions (id),
  event_date_id   bigint not null references event_dates (id),
  city_id         text not null references cities (id),
  user_id         uuid not null references users (id),
  device          uuid,
  received_at     timestamptz not null default now(),
  n               integer not null check (n >= 0),
  accepted_n      integer not null default 0 check (accepted_n >= 0),
  duplicate_n     integer not null default 0 check (duplicate_n >= 0),
  rejected_n      integer not null default 0 check (rejected_n >= 0),
  repeated_n      integer not null default 0 check (repeated_n >= 0),
  clock_offset_ms integer,
  skew            boolean not null default false
);
create index if not exists door_syncs_sesion_idx on door_syncs (session_id, received_at desc);
create index if not exists door_syncs_fecha_idx on door_syncs (event_date_id, received_at desc);
create or replace function door_syncs_antes() returns trigger language plpgsql as $$
declare s door_sessions;
begin
  if tg_op <> 'INSERT' then raise exception 'door_syncs es solo de inserción'; end if;
  select * into s from door_sessions where id = new.session_id;
  new.event_date_id := s.event_date_id; new.city_id := s.city_id; new.user_id := s.user_id; new.received_at := now();
  return new;
end $$;
drop trigger if exists door_syncs_antes on door_syncs;
create trigger door_syncs_antes before insert or update or delete on door_syncs for each row execute function door_syncs_antes();

-- ── Escaneos: la hora que cuenta y lo que decidió el teléfono ──
alter table ticket_scans add column if not exists at_eff timestamptz;
alter table ticket_scans add column if not exists clock_offset_ms integer;
alter table ticket_scans add column if not exists skew boolean not null default false;
alter table ticket_scans add column if not exists asked_n smallint check (asked_n between 1 and 20);
alter table ticket_scans add column if not exists local_in boolean;
alter table ticket_scans add column if not exists local_res text check (local_res is null or char_length(local_res) <= 20);
alter table ticket_scans add column if not exists sync_id bigint;   -- la subida (door_syncs.id: se escribe al terminar la subida, por eso sin llave foránea)
create index if not exists ticket_scans_efectiva_idx on ticket_scans (ticket_id, event_date_id) where ticket_id is not null;

create or replace function ticket_scans_antes() returns trigger language plpgsql as $$
begin
  if tg_op <> 'INSERT' then raise exception 'ticket_scans es solo de inserción'; end if;
  if coalesce(current_setting('tl.puerta', true), '') <> 'si' then raise exception 'un escaneo lo registra solo la puerta (puerta_registrar)'; end if;
  new.at_server := now(); new.created_at := now();
  -- En línea, la hora que cuenta es la del servidor; sin conexión, la del teléfono corregida (nunca después de llegar al servidor).
  new.at_eff := case when new.offline and new.at_eff is not null then least(new.at_eff, new.at_server) else new.at_server end;
  if not new.offline then new.local_in := null; new.local_res := null; new.sync_id := null; end if;
  return new;
end $$;

-- ── Correcciones (SOLO INSERCIÓN) y la resolución vigente ──
create table if not exists ticket_scan_fixes (
  id            bigint generated always as identity primary key,
  scan_id       uuid not null references ticket_scans (id),
  event_date_id bigint not null references event_dates (id),
  city_id       text not null references cities (id),
  ticket_id     bigint not null references tickets (id),
  result        text not null check (result in ('valid', 'manual', 'already_used', 'not_inside')),
  resolution    text not null check (resolution in ('accepted', 'duplicate', 'rejected')),
  admits_n      smallint not null default 0 check (admits_n between 0 and 20),
  first_n       smallint not null default 0 check (first_n between 0 and admits_n),
  sync_id       bigint,
  at            timestamptz not null default now(),
  check ((resolution = 'accepted') = (result in ('valid', 'manual'))),
  check (resolution = 'accepted' or admits_n = 0)
);
create index if not exists ticket_scan_fixes_scan_idx on ticket_scan_fixes (scan_id, id desc);
create or replace function ticket_scan_fixes_antes() returns trigger language plpgsql as $$
declare sc ticket_scans;
begin
  if tg_op <> 'INSERT' then raise exception 'ticket_scan_fixes es solo de inserción'; end if;
  if coalesce(current_setting('tl.puerta', true), '') <> 'si' then raise exception 'una corrección la escribe solo la base de la puerta (puerta_rehacer)'; end if;
  select * into sc from ticket_scans where id = new.scan_id;
  if sc.ticket_id is distinct from new.ticket_id then raise exception 'esa corrección no es de ese boleto'; end if;
  new.event_date_id := sc.event_date_id; new.city_id := sc.city_id; new.at := now();
  return new;
end $$;
drop trigger if exists ticket_scan_fixes_antes on ticket_scan_fixes;
create trigger ticket_scan_fixes_antes before insert or update or delete on ticket_scan_fixes for each row execute function ticket_scan_fixes_antes();

-- Después: mueve los derivados de la puerta de ese escaneo y de la fecha por la diferencia con su resolución anterior.
create or replace function ticket_scan_fixes_despues() returns trigger language plpgsql as $$
declare sc ticket_scans; p record; dd int; df int; dp int; dr int;
begin
  select * into sc from ticket_scans where id = new.scan_id;
  select x.result, x.resolution, x.admits_n, x.first_n into p from ticket_scan_fixes x where x.scan_id = new.scan_id and x.id < new.id order by x.id desc limit 1;
  if not found then select sc.result, sc.resolution, sc.admits_n, sc.first_n into p; end if;
  dd := (case when new.resolution = 'accepted' then case when sc.direction = 'in' then new.admits_n else -new.admits_n end else 0 end)
      - (case when p.resolution = 'accepted' then case when sc.direction = 'in' then p.admits_n else -p.admits_n end else 0 end);
  df := new.first_n - p.first_n;
  dp := (case when new.resolution = 'duplicate' or new.result = 'already_used' then 1 else 0 end) - (case when p.resolution = 'duplicate' or p.result = 'already_used' then 1 else 0 end);
  dr := (case when new.resolution = 'rejected' then 1 else 0 end) - (case when p.resolution = 'rejected' then 1 else 0 end);
  update door_counts set inside_n = greatest(0, inside_n + dd), entered_n = greatest(0, entered_n + df), dup_n = greatest(0, dup_n + dp), rejected_n = greatest(0, rejected_n + dr)
   where event_date_id = sc.event_date_id and door_name = sc.door_name;
  if dd <> 0 or df <> 0 then
    perform set_config('tl.evt_derivado', 'si', true);
    update event_dates set inside_n = greatest(0, inside_n + dd), entered_n = greatest(0, entered_n + df) where id = sc.event_date_id;
    perform set_config('tl.evt_derivado', '', true);
  end if;
  perform pg_notify('puerta', sc.event_date_id::text);
  return null;
end $$;
drop trigger if exists ticket_scan_fixes_despues on ticket_scan_fixes;
create trigger ticket_scan_fixes_despues after insert on ticket_scan_fixes for each row execute function ticket_scan_fixes_despues();

-- Cada escaneo con su resolución vigente (la última corrección, si la hay). La leen la puerta, el panel y el Super Admin.
create or replace view ticket_scans_ef as
  select s.id, s.event_date_id, s.event_id, s.city_id, s.session_id, s.user_id, s.door_name, s.device, s.ticket_id, s.rsvp_id, s.noche_res_id, s.code_hash, s.kind, s.direction,
         coalesce(f.result, s.result) as result, coalesce(f.resolution, s.resolution) as resolution, coalesce(f.admits_n, s.admits_n) as admits_n, coalesce(f.first_n, s.first_n) as first_n,
         s.result as orig_result, s.resolution as orig_resolution, s.admits_n as orig_admits, s.manual_reason, s.table_no, s.at_device, s.at_server,
         coalesce(s.at_eff, s.at_server) as at_eff, s.offline, s.clock_offset_ms, s.skew, s.asked_n, s.local_in, s.local_res, s.sync_id, f.id is not null as corrected, s.created_at
    from ticket_scans s
    left join lateral (select x.id, x.result, x.resolution, x.admits_n, x.first_n from ticket_scan_fixes x where x.scan_id = s.id order by x.id desc limit 1) f on true;

-- ── Incidencias automáticas (duplicado sin conexión · entró con un boleto que ya no valía) ──
alter table door_incidents add column if not exists scan_id uuid references ticket_scans (id);
alter table door_incidents add column if not exists other_scan_id uuid references ticket_scans (id);
alter table door_incidents add column if not exists auto boolean not null default false;
alter table door_incidents drop constraint if exists door_incidents_kind_check;
alter table door_incidents add constraint door_incidents_kind_check check (kind in ('duplicado', 'edad', 'seguridad', 'devolucion', 'otro', 'sin_valor'));
alter table door_incidents drop constraint if exists door_incidents_auto_check;
alter table door_incidents add constraint door_incidents_auto_check check (not auto or (scan_id is not null and kind in ('duplicado', 'sin_valor')));
create unique index if not exists door_incidents_auto_idx on door_incidents (scan_id, kind) where auto;
create or replace function door_incidents_antes() returns trigger language plpgsql as $$
declare d event_dates; e events;
begin
  if tg_op = 'DELETE' then raise exception 'una incidencia no se borra: se cierra'; end if;
  if tg_op = 'INSERT' then
    select * into d from event_dates where id = new.event_date_id;
    select * into e from events where id = d.event_id;
    new.event_id := e.id; new.business_id := e.business_id; new.city_id := d.city_id; new.at := now(); new.status := 'open'; new.closed_at := null; new.closed_by := null; new.closed_note := null;
    if new.ticket_id is not null and not exists (select 1 from tickets t where t.id = new.ticket_id and t.event_id = e.id) then raise exception 'ese boleto no es de este evento'; end if;
    if new.kind = 'sin_valor' and not new.auto then raise exception 'esa incidencia la abre solo la base'; end if;
    if new.auto and coalesce(current_setting('tl.puerta', true), '') <> 'si' then raise exception 'una incidencia automática la abre solo la base de la puerta'; end if;
    if new.scan_id is not null and not exists (select 1 from ticket_scans s where s.id = new.scan_id and s.event_date_id = new.event_date_id) then raise exception 'ese escaneo no es de esta fecha'; end if;
    return new;
  end if;
  if (new.event_date_id, new.event_id, new.business_id, new.city_id, new.session_id, new.ticket_id, new.kind, new.note, new.by_user, new.at, new.scan_id, new.other_scan_id, new.auto)
     is distinct from (old.event_date_id, old.event_id, old.business_id, old.city_id, old.session_id, old.ticket_id, old.kind, old.note, old.by_user, old.at, old.scan_id, old.other_scan_id, old.auto)
     or old.status = 'closed' then raise exception 'de una incidencia solo cambia el cierre (una vez)'; end if;
  return new;
end $$;

-- ── La sesión para subir la cola ──
-- La de ESA persona; abierta con acceso, o cerrada por ella, por el panel («Cerrar su puerta») o por el barrido mientras no venza el
-- paquete (lo escaneado sin señal antes del cierre sube igual). Revocada («Revocar este teléfono») o con el portero quitado: nada sube.
create or replace function puerta_sesion_cola(p_session bigint, p_user uuid) returns door_sessions language plpgsql as $$
declare s door_sessions; d event_dates;
begin
  select * into s from door_sessions where id = p_session;
  if not found or s.user_id <> p_user then raise exception 'puerta_cerrada: esa puerta no es tuya'; end if;
  if s.ended_by in ('removed', 'revoked') then raise exception 'puerta_revocada: este teléfono ya no puede subir escaneos de esa puerta'; end if;
  select * into d from event_dates where id = s.event_date_id;
  if now() > d.ends_at + make_interval(hours => cfg_int('puerta_paquete_h')) then raise exception 'puerta_vencida: ya pasó el plazo para subir escaneos de esa fecha'; end if;
  if s.door_staff_id is not null and not exists (select 1 from door_staff f where f.id = s.door_staff_id and f.user_id = p_user and f.status = 'active') then
    raise exception 'puerta_revocada: ya no eres portero de ese negocio';
  end if;
  if s.member_user_id is not null and not exists (select 1 from business_members m where m.business_id = s.business_id and m.user_id = p_user and m.status = 'active'
                                                     and (m.kind = 'owner' or m.panel_access && array['all', 'evt']::text[])) then
    raise exception 'puerta_revocada: ya no manejas los eventos de ese negocio';
  end if;
  -- Abierta pero ya fuera de la ventana (el barrido todavía no la cerró): igual que cerrada por el sistema, sube hasta que venza.
  return s;
end $$;

-- Registra un escaneo SIN CONEXIÓN (la otra única puerta de entrada a ticket_scans, con la marca tl.puerta): sin el freno del aforo —
-- lo que pasó en la puerta ya pasó—, con la hora que cuenta, el desfase, lo que decidió el teléfono y la subida.
create or replace function puerta_registrar_offline(p_scan uuid, s door_sessions, p_kind text, p_ticket bigint, p_rsvp bigint, p_code_hash text, p_dir text, p_k int, p_first int,
                                                    p_result text, p_resolution text, p_manual text, p_at_device timestamptz, p_at_eff timestamptz, p_offset int, p_skew boolean,
                                                    p_asked int, p_local_in boolean, p_local_res text, p_sync bigint) returns ticket_scans language plpgsql as $$
declare sc ticket_scans; k int := coalesce(p_k, 0); f int := coalesce(p_first, 0);
begin
  if p_resolution <> 'accepted' then k := 0; f := 0; end if;
  perform set_config('tl.puerta', 'si', true);
  insert into ticket_scans (id, event_date_id, event_id, city_id, session_id, user_id, door_name, device, ticket_id, rsvp_id, code_hash, kind, direction, admits_n, first_n, result,
                            manual_reason, at_device, offline, resolution, at_eff, clock_offset_ms, skew, asked_n, local_in, local_res, sync_id)
  values (p_scan, s.event_date_id, s.event_id, s.city_id, s.id, s.user_id, s.door_name, s.device, p_ticket, p_rsvp, p_code_hash, p_kind, p_dir, k, f, p_result,
          case when p_result = 'manual' then coalesce(p_manual, 'manual') end, p_at_device, true, p_resolution, p_at_eff, p_offset, coalesce(p_skew, false), p_asked, p_local_in,
          left(p_local_res, 20), p_sync)
  returning * into sc;
  perform set_config('tl.puerta', '', true);
  return sc;
end $$;

-- Vuelve a decidir los escaneos que DEJARON ENTRAR a un boleto en una fecha (los en línea aceptados y los sin conexión que el teléfono dejó
-- pasar y que valían), por la hora que cuenta (empate: el que llegó antes al servidor; después el id), con el nuevo escaneo adentro. El que
-- gana es la primera entrada; con reentrada se sigue la secuencia entrada / salida; una entrada de más es «duplicate» (ya entró: no se
-- deshace) con su incidencia. Lo que cambia de los escaneos ya registrados queda como corrección; el nuevo se registra ya decidido. La fila
-- del boleto la bloqueó quien llama; aquí se bloquea la de su entrada del día.
create or replace function puerta_rehacer(t tickets, d event_dates, e events, s door_sessions, p_scan uuid, p_dir text, p_asked int, p_eff timestamptz, p_manual text,
                                          p_at_device timestamptz, p_offset int, p_skew boolean, p_local_res text, p_sync bigint) returns ticket_scans language plpgsql as $$
declare c record; ent int := 0; dentro int := 0; k int; f int; res text; resl text; nres text := 'already_used'; nresl text := 'duplicate'; nk int := 0; nf int := 0;
        pa timestamptz; pd text; ua timestamptz; ud text; gana uuid; gana_door text; gana_at timestamptz; pierden uuid[] := '{}'; x ticket_entries; nsc ticket_scans; z uuid;
begin
  perform set_config('tl.puerta', 'si', true);
  insert into ticket_entries (ticket_id, event_date_id, city_id, admits) values (t.id, d.id, d.city_id, t.admits) on conflict do nothing;
  select * into x from ticket_entries where ticket_id = t.id and event_date_id = d.id for update;
  for c in
    select q.* from (
      select ef.id, ef.direction as dir, greatest(1, coalesce(ef.asked_n, nullif(ef.orig_admits, 0), 1))::int as asked, ef.at_eff as eff, ef.at_server as srv, ef.door_name as door,
             ef.result, ef.resolution, ef.admits_n::int as admits_n, ef.first_n::int as first_n, ef.manual_reason as manual, false as nuevo
        from ticket_scans_ef ef
       where ef.ticket_id = t.id and ef.event_date_id = d.id and ef.kind = 'ticket'
         and ((not ef.offline and ef.orig_resolution = 'accepted') or (ef.offline and ef.local_in and ef.orig_result in ('valid', 'manual', 'already_used', 'not_inside')))
      union all
      select p_scan, p_dir, p_asked, p_eff, clock_timestamp(), s.door_name, null, null, null, null, p_manual, true
    ) q order by q.eff, q.srv, q.id
  loop
    if c.dir = 'in' then
      if ent < t.admits then k := least(c.asked, t.admits - ent); f := k; ent := ent + k; dentro := dentro + k; res := case when c.manual is not null then 'manual' else 'valid' end; resl := 'accepted';
      elsif e.reentry and dentro < ent then k := least(c.asked, ent - dentro); f := 0; dentro := dentro + k; res := case when c.manual is not null then 'manual' else 'valid' end; resl := 'accepted';
      else k := 0; f := 0; res := 'already_used'; resl := 'duplicate';
      end if;
    elsif dentro > 0 then k := least(c.asked, dentro); f := 0; dentro := dentro - k; res := 'valid'; resl := 'accepted';
    else k := 0; f := 0; res := 'not_inside'; resl := 'rejected';
    end if;
    if resl = 'accepted' and c.dir = 'in' then
      if pa is null then pa := c.eff; pd := c.door; gana := c.id; gana_door := c.door; gana_at := c.eff; end if;
      ua := c.eff; ud := c.door;
    end if;
    if resl = 'duplicate' then pierden := pierden || c.id; end if;
    if c.nuevo then nres := res; nresl := resl; nk := k; nf := f;
    elsif (c.result, c.resolution, c.admits_n, c.first_n) is distinct from (res, resl, k, f) then
      perform set_config('tl.puerta', 'si', true);
      insert into ticket_scan_fixes (scan_id, event_date_id, city_id, ticket_id, result, resolution, admits_n, first_n, sync_id) values (c.id, d.id, d.city_id, t.id, res, resl, k, f, p_sync);
    end if;
  end loop;
  nsc := puerta_registrar_offline(p_scan, s, 'ticket', t.id, null, null, p_dir, nk, nf, nres, nresl, p_manual, p_at_device, p_eff, p_offset, p_skew, p_asked, true, p_local_res, p_sync);
  perform set_config('tl.puerta', 'si', true);
  update ticket_entries set entered_n = greatest(entered_n, ent), inside_n = least(greatest(dentro, 0), greatest(entered_n, ent)),
                            first_at = coalesce(pa, first_at), first_door = coalesce(pd, first_door), last_at = coalesce(ua, last_at), last_door = coalesce(ud, last_door)
   where ticket_id = t.id and event_date_id = d.id;
  if t.status = 'valid' and ent > 0 then update tickets set status = 'used' where id = t.id; end if;
  -- Un duplicado no deshace nada (la persona ya entró): una incidencia por escaneo de más, con quién ganó (puerta y hora).
  foreach z in array pierden loop
    insert into door_incidents (event_date_id, event_id, business_id, city_id, session_id, ticket_id, kind, note, by_user, scan_id, other_scan_id, auto)
    select d.id, e.id, e.business_id, d.city_id, x2.session_id, t.id, 'duplicado', '', s.user_id, z, gana, true from ticket_scans x2 where x2.id = z
    on conflict (scan_id, kind) where auto do nothing;
  end loop;
  perform set_config('tl.puerta', '', true);
  return nsc;
end $$;

-- ── Un escaneo de la cola sin conexión (QR o entrada a mano de un boleto) ──
-- p_offset_ms: el desfase del reloj del teléfono medido en ESTA subida (hora del servidor − hora del teléfono). p_local_in: si el teléfono lo
-- dejó entrar (o salir). p_local_res: lo que decidió. La hora que cuenta queda dentro de la sesión y nunca en el futuro.
create or replace function puerta_offline(p_scan uuid, p_session bigint, p_user uuid, p_ticket bigint, p_ver int, p_code_hash text, p_dir text, p_n int, p_manual text,
                                          p_at_device timestamptz, p_offset_ms int, p_forged boolean, p_local_in boolean, p_local_res text, p_sync bigint) returns ticket_scans language plpgsql as $$
declare sc ticket_scans; s door_sessions; d event_dates; e events; t tickets; r text; eff timestamptz; sk boolean; asked int; lr text;
begin
  sc := puerta_repetido(p_scan);
  if sc.id is not null then
    if sc.session_id <> p_session then raise exception 'puerta_id_ajeno: ese escaneo es de otra puerta'; end if;
    return sc;
  end if;
  s := puerta_sesion_cola(p_session, p_user);
  if p_dir not in ('in', 'out') then raise exception 'puerta_direccion'; end if;
  select * into d from event_dates where id = s.event_date_id;
  select * into e from events where id = d.event_id;
  eff := p_at_device + make_interval(secs => coalesce(p_offset_ms, 0) / 1000.0);
  sk := p_at_device is null or abs(coalesce(p_offset_ms, 0)) > cfg_int('puerta_reloj_desvio_seg') * 1000
        or eff < s.started_at - interval '1 minute' or eff > coalesce(s.ended_at, now()) + interval '1 minute';
  eff := least(greatest(coalesce(eff, now()), s.started_at), coalesce(s.ended_at, now()), now());
  asked := greatest(1, least(coalesce(p_n, 1), 20));
  lr := case when p_local_res in ('already_used', 'wrong_event', 'wrong_day', 'not_found', 'forged', 'void', 'refunded', 'replaced', 'pending_transfer', 'over_capacity', 'door_closed', 'not_inside', 'no_reentry')
             then p_local_res else 'already_used' end;
  if p_ticket is not null then
    select * into t from tickets where id = p_ticket for update;
    if not found then p_ticket := null; end if;
  end if;
  if p_ticket is null then
    r := case when p_forged then 'forged' else 'not_found' end;
    sc := puerta_registrar_offline(p_scan, s, 'unknown', null, null, p_code_hash, p_dir, 0, 0, r, 'rejected', null, p_at_device, eff, p_offset_ms, sk, asked, coalesce(p_local_in, false), p_local_res, p_sync);
  else
    -- Lo que valía AL SUBIR (como en línea): otro evento, anulado, devuelto, versión vieja o reemplazado, en transferencia, otro día.
    if t.event_id <> d.event_id then r := 'wrong_event';
    elsif t.status = 'void' then r := 'void';
    elsif t.status = 'refunded' then r := 'refunded';
    elsif t.status = 'replaced' or (p_ver is not null and p_ver <> t.qr_ver) then r := 'replaced';
    elsif exists (select 1 from ticket_transfers z where z.ticket_id = t.id and z.status = 'pending' and z.kind = 'transfer') then r := 'pending_transfer';
    elsif not bol_vale_en(t.id, d.id) then r := 'wrong_day';
    elsif t.status not in ('valid', 'used') then r := 'void';
    elsif not coalesce(p_local_in, false) then r := lr;   -- el teléfono no lo dejó pasar: queda así (nunca «entró» sin haber entrado)
    end if;
    if r is null then return puerta_rehacer(t, d, e, s, p_scan, p_dir, asked, eff, p_manual, p_at_device, p_offset_ms, sk, p_local_res, p_sync); end if;
    sc := puerta_registrar_offline(p_scan, s, case when r = 'wrong_event' then 'unknown' else 'ticket' end, case when r = 'wrong_event' then null else t.id end, null,
                                   case when r = 'wrong_event' then p_code_hash end, p_dir, 0, 0, r, 'rejected', null, p_at_device, eff, p_offset_ms, sk, asked, coalesce(p_local_in, false), p_local_res, p_sync);
  end if;
  -- El teléfono lo dejó entrar sin señal con algo que ya no valía (devuelto, anulado, transferido, falso…): rejected + incidencia.
  if coalesce(p_local_in, false) and p_dir = 'in' then
    perform set_config('tl.puerta', 'si', true);
    insert into door_incidents (event_date_id, event_id, business_id, city_id, session_id, ticket_id, kind, note, by_user, scan_id, auto)
    values (d.id, e.id, e.business_id, d.city_id, s.id, sc.ticket_id, 'sin_valor', '', s.user_id, sc.id, true)
    on conflict (scan_id, kind) where auto do nothing;
    perform set_config('tl.puerta', '', true);
  end if;
  return sc;
end $$;

commit;
