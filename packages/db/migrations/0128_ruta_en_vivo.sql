-- 0128 · Fase 8 · 8e · La ruta en vivo del repartidor (docs/diseno/plan/fase8-apps.md §2 «0129 ruta_en_vivo», §4 8e, §6 #14).
-- NUMERACIÓN: el plan decía 0129 (y la semilla 0045_ruta.sql). La última confirmada es 0127 (8f) y la última semilla 0045 (8f): 8e toma 0128 y la
-- semilla 0046_ruta.sql. 8b (enlaces) y 8d (passkeys, que el plan ponía en 0128) esperan el dominio y tomarán las siguientes libres. Nada asume
-- números contiguos (migrar.sh registra cada archivo por su nombre). Anotado en el plan y en REVISION.
--
-- La ubicación del repartidor es privada (Opus/high). Lo que esta migración pone en la base, además de lo que revisa lib/ruta.ts:
-- · delivery_tracks: la ruta de una entrega (operations kind 'order', mode 'delivery'); una sola abierta por entrega. Nace SOLO con el paso que inicia la entrega («Voy por el pedido» o
--   «Recogí», lib/repartidor.ts) y termina sola (trigger en operations) al entregar, cancelar, quitar o cambiar el repartidor; nunca se vuelve a
--   abrir. El token del teléfono se guarda como huella (sha256), cambia en cada arranque y se borra al terminar. Lo derivado (última posición,
--   distancia, cuántas) lo escribe SOLO el trigger de las posiciones; nadie lo edita. customer_from = desde cuándo la ve el cliente («Recogí»).
-- · delivery_positions: SOLO inserción. La base rechaza una posición si la entrega no está activa, no es de ese repartidor, no es de esa ciudad,
--   es de antes del inicio o del futuro, está fuera de la ciudad, o implica una velocidad imposible (ubic_vel_max_mps) desde la anterior.
--   Purga a los ubic_retener_dias (solo lo vencido; queda el resumen en la entrega). BRIN por received_at, GIST por geom.
-- · NOTIFY 'ruta' con el id de la entrega en cada posición y al terminar (como ticket_scans → 'puerta'): el SSE /api/ruta/vivo.
-- · Configuración › Apps: ubic_cada_s, ubic_min_m, ubic_retener_dias, ubic_cliente_desde, ubic_vel_max_mps, ubic_vieja_s. Interruptor
--   app.ubicacion_vivo (sandbox encendido; producción: Fase 9). Ver el recorrido en el Super Admin pide motivo y queda en audit_entries.
-- Idempotente: se puede aplicar dos veces. Nada se borra salvo la purga por retención de las posiciones.
begin;

create table if not exists delivery_tracks (
  id               bigint generated always as identity primary key,
  operation_id     bigint not null references operations (id),
  city_id          text not null references cities (id),
  business_id      text not null references businesses (id),
  rider_user_id    uuid not null references users (id),
  -- delivery_drivers.id al empezar (sin llave foránea: el repartidor puede salir del equipo; la entrega se cierra antes por el trigger).
  driver_id        bigint not null,
  started_step     text not null check (started_step in ('empezar', 'recogi')),
  token_hash       text check (token_hash ~ '^[a-f0-9]{64}$'),
  token_at         timestamptz,
  sharing_from     timestamptz not null default now(),
  sharing_until    timestamptz,
  ended_reason     text check (ended_reason in ('entregado', 'cancelado', 'reasignado', 'inactivo', 'admin')),
  customer_from    timestamptz,
  last_position_at timestamptz,
  last_geom        geography(Point, 4326),
  last_accuracy_m  real,
  distance_m       integer not null default 0 check (distance_m >= 0),
  positions_n      integer not null default 0 check (positions_n >= 0),
  rejected_n       integer not null default 0 check (rejected_n >= 0),
  purged_at        timestamptz,
  is_test          boolean not null default false,
  created_at       timestamptz not null default now(),
  check ((sharing_until is null) = (ended_reason is null)),
  check (sharing_until is null or token_hash is null)
);
-- Una sola ruta abierta por entrega (si el negocio la pasa a otro repartidor, la de antes se cierra y el nuevo abre otra).
create unique index if not exists delivery_tracks_una_abierta on delivery_tracks (operation_id) where sharing_until is null;
create index if not exists delivery_tracks_entrega on delivery_tracks (operation_id, sharing_from);
create index if not exists delivery_tracks_activas on delivery_tracks (rider_user_id) where sharing_until is null;
create index if not exists delivery_tracks_token on delivery_tracks (token_hash) where token_hash is not null;
create index if not exists delivery_tracks_ciudad on delivery_tracks (city_id, sharing_from desc);
create index if not exists delivery_tracks_purga on delivery_tracks (sharing_until) where purged_at is null and sharing_until is not null;

-- Lo derivado lo escribe solo el trigger de las posiciones (pg_trigger_depth() > 1) o la purga (tl.ruta_purga). Lo terminado no se reabre.
create or replace function delivery_tracks_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'una entrega con ruta no se borra'; end if;
  if tg_op = 'INSERT' then
    if new.last_position_at is not null or new.last_geom is not null or new.distance_m <> 0 or new.positions_n <> 0 then
      raise exception 'delivery_tracks: la ruta nace vacía (lo derivado lo escribe la base)';
    end if;
    return new;
  end if;
  if old.sharing_until is not null and new.sharing_until is null then raise exception 'delivery_tracks: una ruta terminada no se vuelve a abrir'; end if;
  if old.sharing_until is not null and new.token_hash is not null then raise exception 'delivery_tracks: una ruta terminada no tiene token'; end if;
  if (new.id, new.operation_id, new.city_id, new.business_id, new.rider_user_id, new.driver_id, new.started_step, new.sharing_from)
     is distinct from (old.id, old.operation_id, old.city_id, old.business_id, old.rider_user_id, old.driver_id, old.started_step, old.sharing_from) then
    raise exception 'delivery_tracks: de quién, dónde y desde cuándo no cambian';
  end if;
  if pg_trigger_depth() <= 1 and coalesce(current_setting('tl.ruta_purga', true), '') <> '1'
     and (new.last_position_at, new.last_geom::text, new.last_accuracy_m, new.distance_m, new.positions_n)
         is distinct from (old.last_position_at, old.last_geom::text, old.last_accuracy_m, old.distance_m, old.positions_n) then
    raise exception 'delivery_tracks: lo derivado (última posición, distancia, cuántas) lo escribe solo la base';
  end if;
  if coalesce(current_setting('tl.ruta_purga', true), '') <> '1' and new.purged_at is distinct from old.purged_at then
    raise exception 'delivery_tracks: purged_at lo pone solo la purga';
  end if;
  return new;
end $$;
drop trigger if exists delivery_tracks_antes on delivery_tracks;
create trigger delivery_tracks_antes before insert or update or delete on delivery_tracks for each row execute function delivery_tracks_antes();

create table if not exists delivery_positions (
  id            bigint generated always as identity primary key,
  operation_id  bigint not null references operations (id),
  rider_user_id uuid not null references users (id),
  city_id       text not null references cities (id),
  at            timestamptz not null,
  received_at   timestamptz not null default now(),
  geom          geography(Point, 4326) not null,
  accuracy_m    real check (accuracy_m >= 0 and accuracy_m <= 500),
  speed_mps     real check (speed_mps >= 0 and speed_mps <= 100),
  heading       real check (heading >= 0 and heading < 360),
  source        text not null check (source in ('app', 'web')),
  is_test       boolean not null default false
);
create index if not exists delivery_positions_recibida on delivery_positions using brin (received_at);
create index if not exists delivery_positions_geom on delivery_positions using gist (geom);
create index if not exists delivery_positions_entrega on delivery_positions (operation_id, at);

-- ¿Esta entrega está activa para este repartidor, en esta ciudad? (lo mismo que revisa lib/ruta.ts; la base lo vuelve a imponer)
create or replace function ruta_activa(op bigint, rider uuid, ciudad text) returns boolean language sql stable as $$
  select exists (
    select 1 from delivery_tracks t
      join operations o on o.id = t.operation_id
      join delivery_drivers d on d.id = o.driver_id
     where t.operation_id = op and t.sharing_until is null and t.rider_user_id = rider and t.city_id = ciudad
       and o.kind = 'order' and coalesce(o.mode, 'pickup') = 'delivery' and o.status = 'confirmed' and coalesce(o.stage, '') <> 'delivered'
       and o.city_id = ciudad and d.user_id = rider and d.status = 'active' and d.id = t.driver_id)
$$;

create or replace function delivery_positions_antes() returns trigger language plpgsql as $$
declare t delivery_tracks; c cities; seg double precision; m double precision;
begin
  if tg_op = 'UPDATE' then raise exception 'delivery_positions es solo de inserción'; end if;
  if tg_op = 'DELETE' then
    -- Solo la purga por retención: lo que pasó de ubic_retener_dias.
    if old.received_at >= now() - make_interval(days => cfg_int('ubic_retener_dias')) then
      raise exception 'delivery_positions: solo se purga lo vencido (ubic_retener_dias)';
    end if;
    return old;
  end if;
  new.received_at := now();
  if not exists (select 1 from feature_flags where key = 'app.ubicacion_vivo' and enabled) then raise exception 'ruta: la ubicación en vivo está apagada'; end if;
  if not ruta_activa(new.operation_id, new.rider_user_id, new.city_id) then raise exception 'ruta: la entrega no está activa para este repartidor en esta ciudad'; end if;
  select * into t from delivery_tracks where operation_id = new.operation_id and sharing_until is null for update;
  if new.at < t.sharing_from - interval '5 seconds' then raise exception 'ruta: posición de antes de empezar la entrega'; end if;
  if new.at > now() + interval '1 minute' then raise exception 'ruta: posición del futuro'; end if;
  select * into c from cities where id = new.city_id;
  if not st_dwithin(new.geom, c.center, 100000) then raise exception 'ruta: posición fuera de la ciudad'; end if;
  if t.last_geom is not null and t.last_position_at is not null then
    if new.at <= t.last_position_at then raise exception 'ruta: posición repetida o fuera de orden'; end if;
    seg := extract(epoch from (new.at - t.last_position_at));
    m := st_distance(t.last_geom, new.geom);
    -- Velocidad imposible: con un margen por la precisión del GPS (las dos lecturas).
    if (m - coalesce(t.last_accuracy_m, 0) - coalesce(new.accuracy_m, 0)) / greatest(seg, 1) > cfg_int('ubic_vel_max_mps') then
      raise exception 'ruta: velocidad imposible';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists delivery_positions_antes on delivery_positions;
create trigger delivery_positions_antes before insert or update or delete on delivery_positions for each row execute function delivery_positions_antes();

-- Lo derivado de la ruta y el aviso al SSE (como ticket_scans → 'puerta').
create or replace function delivery_positions_despues() returns trigger language plpgsql as $$
begin
  update delivery_tracks t set
    distance_m = t.distance_m + case when t.last_geom is null then 0 else round(st_distance(t.last_geom, new.geom))::int end,
    last_position_at = new.at, last_geom = new.geom, last_accuracy_m = new.accuracy_m, positions_n = t.positions_n + 1
  where t.operation_id = new.operation_id and t.sharing_until is null;
  perform pg_notify('ruta', new.operation_id::text);
  return null;
end $$;
drop trigger if exists delivery_positions_despues on delivery_positions;
create trigger delivery_positions_despues after insert on delivery_positions for each row execute function delivery_positions_despues();

-- La entrega termina sola: entregada, cancelada (o vencida, rechazada), sin repartidor o con otro. El cliente la ve desde «Recogí».
create or replace function operations_ruta() returns trigger language plpgsql as $$
declare motivo text;
begin
  if new.stage = 'on_the_way' and old.stage is distinct from 'on_the_way' then
    update delivery_tracks set customer_from = coalesce(customer_from, now()) where operation_id = new.id and sharing_until is null;
  end if;
  motivo := case when new.status = 'done' or new.stage = 'delivered' then 'entregado'
                 when new.status <> 'confirmed' then 'cancelado'
                 when new.driver_id is distinct from old.driver_id then 'reasignado' end;
  if motivo is not null then
    update delivery_tracks set sharing_until = now(), ended_reason = motivo, token_hash = null where operation_id = new.id and sharing_until is null;
    if found then perform pg_notify('ruta', new.id::text); end if;
  end if;
  return null;
end $$;
drop trigger if exists operations_ruta on operations;
create trigger operations_ruta after update of status, stage, driver_id on operations for each row
  when (new.kind = 'order' and (old.status is distinct from new.status or old.stage is distinct from new.stage or old.driver_id is distinct from new.driver_id))
  execute function operations_ruta();

-- La purga (la corre el barrido central): hasta `lim` posiciones vencidas por pasada; las entregas terminadas hace más de ubic_retener_dias se
-- quedan solo con el resumen (desde, hasta, distancia, cuántas): sin la última posición.
create or replace function ruta_purgar(lim integer default 5000) returns integer language plpgsql as $$
declare n integer;
begin
  with v as (select id from delivery_positions where received_at < now() - make_interval(days => cfg_int('ubic_retener_dias')) order by received_at limit lim),
       d as (delete from delivery_positions p using v where p.id = v.id returning 1)
  select count(*) into n from d;
  perform set_config('tl.ruta_purga', '1', true);
  update delivery_tracks set last_geom = null, last_accuracy_m = null, purged_at = now()
   where purged_at is null and sharing_until is not null and sharing_until < now() - make_interval(days => cfg_int('ubic_retener_dias'));
  perform set_config('tl.ruta_purga', '', true);
  return n;
end $$;

-- ── Configuración › Apps ──
insert into config_keys (key, min, max, def, unit, section, label, help, editable, bloqueo, edit_in, sort) values
  ('ubic_cada_s', 5, 60, 10, '{"es":"segundos","en":"seconds"}', 'apps', '{"es":"Ubicación del repartidor · cada cuánto","en":"Driver location · how often"}',
    '{"es":"Cada cuánto manda el teléfono del repartidor su posición durante una entrega (también si se movió ubic_min_m).","en":"How often the driver''s phone sends its position during a delivery (also when it moved ubic_min_m)."}', true, null, null, 360),
  ('ubic_min_m', 5, 200, 25, '{"es":"metros","en":"meters"}', 'apps', '{"es":"Ubicación del repartidor · distancia mínima","en":"Driver location · minimum distance"}',
    '{"es":"El teléfono anota una posición nueva cuando se movió al menos esto (o pasó el tiempo de «cada cuánto»).","en":"The phone records a new position once it moved at least this much (or the «how often» time passed)."}', true, null, null, 361),
  ('ubic_retener_dias', 1, 90, 14, '{"es":"días","en":"days"}', 'apps', '{"es":"Ubicación del repartidor · días que se guarda","en":"Driver location · days kept"}',
    '{"es":"Para disputas de entrega. Pasado este tiempo, el barrido borra cada posición y la entrega queda solo con su resumen (distancia y tiempo).","en":"For delivery disputes. After this time the sweep deletes each position and the delivery keeps only its summary (distance and time)."}', true, null, null, 362),
  ('ubic_cliente_desde', 0, 1, 1, '{"es":"1 = desde «Recogí» · 0 = nunca","en":"1 = from «Picked up» · 0 = never"}', 'apps', '{"es":"El cliente ve el mapa en vivo","en":"The customer sees the live map"}',
    '{"es":"1: el cliente ve el pin del repartidor desde que toca «Recogí» hasta que entrega. 0: solo lo ve el negocio. El negocio lo ve desde que empieza la entrega.","en":"1: the customer sees the driver pin from «Picked up» until delivery. 0: only the business sees it. The business sees it from the start of the delivery."}', true, null, null, 363),
  ('ubic_vel_max_mps', 15, 90, 45, '{"es":"metros por segundo","en":"meters per second"}', 'apps', '{"es":"Ubicación del repartidor · velocidad imposible","en":"Driver location · impossible speed"}',
    '{"es":"Una posición que implica ir más rápido que esto desde la anterior se rechaza (45 m/s ≈ 160 km/h).","en":"A position implying a speed above this since the previous one is rejected (45 m/s ≈ 100 mph)."}', true, null, null, 364),
  ('ubic_vieja_s', 30, 900, 120, '{"es":"segundos","en":"seconds"}', 'apps', '{"es":"Ubicación del repartidor · cuándo es vieja","en":"Driver location · when it is stale"}',
    '{"es":"Pasado esto sin posición nueva, el mapa dice «Última posición hace N min».","en":"After this without a new position, the map says «Last position N min ago»."}', true, null, null, 365)
on conflict (key) do update set min = excluded.min, max = excluded.max, def = excluded.def, unit = excluded.unit, section = excluded.section,
  label = excluded.label, help = excluded.help, editable = excluded.editable, bloqueo = excluded.bloqueo, edit_in = excluded.edit_in, sort = excluded.sort;

-- ── Interruptor (sandbox encendido; producción: Fase 9) ──
insert into feature_flags (key, enabled, note) values
  ('app.ubicacion_vivo', true, 'Apps · ubicación en vivo del repartidor durante la entrega (apagado: no se guarda ni se ve)')
on conflict (key) do nothing;

commit;
