-- 0144 · Lo diferido del negocio, el Repartidor y la operación del Super Admin (Fase 9 · 9n; fase9-apertura.md §4 9n, §6 #20 y #21).
-- · Repartidor: PRUEBA DE ENTREGA (foto privada o el código del cliente; `delivery_proofs`, solo inserción) y CÓDIGO DE RECOGIDA del negocio
--   (`delivery_codes`, nacen solos cuando un delivery se acepta). Si el negocio pide prueba, la BASE no deja marcar «entregado» un pedido con
--   repartidor sin una prueba (trigger `operations_prueba`). OFERTA CON CUENTA REGRESIVA a los repartidores del negocio (`delivery_offers`, una
--   abierta por pedido; «Aceptar» es el paso que inicia la ruta; las respuestas, solo inserción). MENSAJES del repartidor al cliente dentro de la
--   app (`delivery_messages`, solo inserción): el repartidor nunca recibe el teléfono del cliente (§6 #20: sin llamada directa ni enmascarada).
-- · Super Admin › Repartidores (ADM-DLV): incidencias (`delivery_incidents`, con su cola «entrega») y sanciones del repartidor (`driver_sanctions`,
--   solo inserción salvo levantarla una vez). Sección «dlv» en la matriz de permisos.
-- · Colas: la visibilidad de cada cola por rol vive en la base (`queue_roles`, la edita un Admin con auditoría) y el plazo de cada cola en
--   Configuración › Colas (`cola_sla_*`); el «tomado» vence (`cola_tomado_min`); feriados del equipo (`staff_holidays`) que el plazo de Soporte salta.
-- · Horario: feriados, vacaciones, días propios y «Abro por temporada» sobre `special_hours` (nada se borra: `status`), el catálogo de feriados
--   del servidor (`holiday_catalog`), y `negocio_abierto` los mira.
-- · Panel › Ajustes › Avisos: lo que el negocio apaga (`business_notif_prefs`) por grupo de aviso (`notif_templates.biz_pref`).
-- Reglas: nada se borra (estados); lo de solo inserción lo impone la base; los CHECK que listan valores se AMPLÍAN (nunca una lista fija).
-- No depende de nada de 0145 (en el sandbox corre después de ella; en una base nueva, antes). Idempotente: dos veces no cambia nada.
begin;

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

create or replace function negocio_solo_insercion() returns trigger language plpgsql as $$
begin raise exception '% es solo de inserción', tg_table_name; end $$;

-- ════════════════════ REPARTIDOR ════════════════════
-- Lo que pide el negocio (Panel › Entrega): prueba al entregar y el código de recogida. Apagados de fábrica (REVISION 9n).
alter table delivery_settings add column if not exists proof boolean not null default false;
alter table delivery_settings add column if not exists pickup_code boolean not null default false;

-- Un código al azar de 4 cifras (gen_random_uuid usa el azar fuerte del servidor).
create or replace function codigo4() returns text language sql volatile as $$
  select lpad(((('x' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))::bit(32)::bigint) % 10000)::text, 4, '0')
$$;

-- Los dos códigos de un delivery: el del cliente (lo dice al recibir; solo lo ve el cliente) y el de recogida (lo dice el negocio al darle el
-- pedido al repartidor; solo lo ve el negocio). El repartidor escribe el que le dicen; nunca los recibe del servidor.
create table if not exists delivery_codes (
  operation_id      bigint primary key references operations (id),
  city_id           text not null references cities (id),
  cliente           text not null check (cliente ~ '^\d{4}$'),
  recogida          text not null check (recogida ~ '^\d{4}$'),
  intentos          integer not null default 0 check (intentos >= 0),            -- códigos del cliente equivocados
  recogida_intentos integer not null default 0 check (recogida_intentos >= 0),
  recogido_at       timestamptz,                                                 -- el código de recogida correcto
  created_at        timestamptz not null default now()
);
create or replace function operations_codigos() returns trigger language plpgsql as $$
begin
  if new.kind = 'order' and coalesce(new.mode, 'pickup') = 'delivery' and new.status = 'confirmed' then
    insert into delivery_codes (operation_id, city_id, cliente, recogida) values (new.id, new.city_id, codigo4(), codigo4()) on conflict (operation_id) do nothing;
  end if;
  return null;
end $$;
drop trigger if exists operations_codigos on operations;
create trigger operations_codigos after insert or update of status on operations for each row
  when (new.kind = 'order' and new.status = 'confirmed') execute function operations_codigos();
-- Los deliveries aceptados que ya estaban en curso reciben los suyos.
insert into delivery_codes (operation_id, city_id, cliente, recogida)
select o.id, o.city_id, codigo4(), codigo4() from operations o
 where o.kind = 'order' and coalesce(o.mode, 'pickup') = 'delivery' and o.status = 'confirmed'
on conflict (operation_id) do nothing;

-- La prueba de cada entrega: foto (privada, `privado/e/…`), el código del cliente, o el negocio que la marca él mismo (queda con su nombre).
create table if not exists delivery_proofs (
  id            bigint generated always as identity primary key,
  operation_id  bigint not null references operations (id),
  city_id       text not null references cities (id),
  kind          text not null check (kind in ('foto', 'codigo', 'negocio')),
  media_id      uuid references media (id),
  driver_id     bigint references delivery_drivers (id),
  actor_id      uuid references users (id),
  at            timestamptz not null default now(),
  check ((kind = 'foto') = (media_id is not null))
);
create unique index if not exists delivery_proofs_una on delivery_proofs (operation_id, kind);
drop trigger if exists delivery_proofs_no_cambia on delivery_proofs;
create trigger delivery_proofs_no_cambia before update or delete on delivery_proofs for each row execute function negocio_solo_insercion();

-- La base no deja cerrar sin prueba un delivery con repartidor de un negocio que la pide (guardián entregaConPrueba).
create or replace function operations_prueba() returns trigger language plpgsql as $$
begin
  if new.kind = 'order' and coalesce(new.mode, 'pickup') = 'delivery' and new.driver_id is not null and new.status = 'done' and old.status is distinct from 'done'
     and coalesce((select s.proof from delivery_settings s where s.business_id = new.business_id), false)
     and not exists (select 1 from delivery_proofs p where p.operation_id = new.id) then
    raise exception 'entrega sin prueba' using errcode = 'P0001', hint = 'sin_prueba';
  end if;
  return new;
end $$;
drop trigger if exists operations_prueba on operations;
create trigger operations_prueba before update of status on operations for each row when (new.status = 'done') execute function operations_prueba();

-- Media privada de una entrega.
do $$ begin perform pg_temp.ampliar_check('media', 'media_owner_kind_check', array['delivery']); end $$;

-- La oferta con cuenta regresiva: a un repartidor o a todos los del negocio en línea (driver_id null). El primero que acepta se la lleva.
create table if not exists delivery_offers (
  id              bigint generated always as identity primary key,
  operation_id    bigint not null references operations (id),
  business_id     text not null references businesses (id),
  city_id         text not null references cities (id),
  driver_id       bigint references delivery_drivers (id),
  status          text not null default 'open' check (status in ('open', 'accepted', 'expired', 'cancelled')),
  expires_at      timestamptz not null,
  accepted_driver bigint references delivery_drivers (id),
  created_by      uuid references users (id),
  created_at      timestamptz not null default now(),
  decided_at      timestamptz,
  check ((status = 'accepted') = (accepted_driver is not null))
);
create unique index if not exists delivery_offers_abierta on delivery_offers (operation_id) where status = 'open';
create index if not exists delivery_offers_vencen on delivery_offers (expires_at) where status = 'open';
create index if not exists delivery_offers_negocio on delivery_offers (business_id, created_at desc);
create or replace function delivery_offers_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'delivery_offers no se borra'; end if;
  if old.status <> 'open' then raise exception 'una oferta decidida no cambia'; end if;
  if new.operation_id <> old.operation_id or new.business_id <> old.business_id or new.expires_at <> old.expires_at or new.created_at <> old.created_at then
    raise exception 'una oferta solo cambia de estado';
  end if;
  new.decided_at := coalesce(new.decided_at, now());
  return new;
end $$;
drop trigger if exists delivery_offers_antes on delivery_offers;
create trigger delivery_offers_antes before update or delete on delivery_offers for each row execute function delivery_offers_antes();
create table if not exists delivery_offer_replies (
  offer_id   bigint not null references delivery_offers (id),
  driver_id  bigint not null references delivery_drivers (id),
  reply      text not null check (reply in ('rechazo')),
  reason     text check (char_length(reason) <= 120),
  at         timestamptz not null default now(),
  primary key (offer_id, driver_id)
);
drop trigger if exists delivery_offer_replies_no_cambia on delivery_offer_replies;
create trigger delivery_offer_replies_no_cambia before update or delete on delivery_offer_replies for each row execute function negocio_solo_insercion();

-- Lo que el repartidor le escribe al cliente (frases fijas o un texto corto sin números de teléfono). Solo inserción.
create table if not exists delivery_messages (
  id            bigint generated always as identity primary key,
  operation_id  bigint not null references operations (id),
  city_id       text not null references cities (id),
  driver_id     bigint not null references delivery_drivers (id),
  kind          text not null check (kind in ('afuera', 'puerta', 'direccion', 'cinco', 'texto')),
  body          text check (char_length(body) <= 140),
  at            timestamptz not null default now(),
  check ((kind = 'texto') = (body is not null))
);
create index if not exists delivery_messages_op on delivery_messages (operation_id, at);
drop trigger if exists delivery_messages_no_cambia on delivery_messages;
create trigger delivery_messages_no_cambia before update or delete on delivery_messages for each row execute function negocio_solo_insercion();

-- ── Super Admin › Repartidores: incidencias y sanciones ──
create table if not exists delivery_incidents (
  id            bigint generated always as identity primary key,
  operation_id  bigint references operations (id),
  driver_user   uuid not null references users (id),
  driver_id     bigint references delivery_drivers (id),
  business_id   text references businesses (id),
  city_id       text not null references cities (id),
  kind          text not null check (kind in ('accidente', 'codigo', 'reclamo', 'otro')),
  note          jsonb not null,                                            -- {es, en}
  status        text not null default 'open' check (status in ('open', 'resolved')),
  resolution    text check (char_length(resolution) <= 500),
  resolved_by   uuid references users (id),
  resolved_at   timestamptz,
  created_by    uuid references users (id),
  created_at    timestamptz not null default now(),
  check ((status = 'resolved') = (resolved_at is not null))
);
create index if not exists delivery_incidents_rep on delivery_incidents (driver_user, created_at desc);
create index if not exists delivery_incidents_abiertas on delivery_incidents (city_id, created_at) where status = 'open';
create unique index if not exists delivery_incidents_una on delivery_incidents (operation_id, kind) where operation_id is not null and status = 'open';
create or replace function delivery_incidents_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'delivery_incidents no se borra'; end if;
  if old.status = 'resolved' then raise exception 'una incidencia resuelta no cambia'; end if;
  if new.driver_user <> old.driver_user or new.kind <> old.kind or new.note <> old.note or new.created_at <> old.created_at then raise exception 'la incidencia solo se resuelve'; end if;
  return new;
end $$;
drop trigger if exists delivery_incidents_antes on delivery_incidents;
create trigger delivery_incidents_antes before update or delete on delivery_incidents for each row execute function delivery_incidents_antes();

create table if not exists driver_sanctions (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references users (id),
  city_id      text references cities (id),
  kind         text not null check (kind in ('aviso', 'suspension', 'baneo')),
  until        timestamptz,                                               -- la suspensión vence; el baneo no
  reason       text not null check (char_length(reason) between 3 and 500),
  incident_id  bigint references delivery_incidents (id),
  by_user      uuid not null references users (id),
  at           timestamptz not null default now(),
  lifted_at    timestamptz,
  lifted_by    uuid references users (id),
  lift_reason  text check (char_length(lift_reason) <= 500),
  check (kind <> 'suspension' or until is not null),
  check (kind <> 'baneo' or until is null)
);
create index if not exists driver_sanctions_user on driver_sanctions (user_id, at desc);
create or replace function driver_sanctions_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'driver_sanctions no se borra'; end if;
  if old.lifted_at is not null then raise exception 'una sanción levantada no cambia'; end if;
  if new.user_id <> old.user_id or new.kind <> old.kind or new.until is distinct from old.until or new.reason <> old.reason or new.by_user <> old.by_user or new.at <> old.at then
    raise exception 'una sanción solo se levanta';
  end if;
  if new.lifted_at is null or new.lifted_by is null then raise exception 'levantar pide quién y cuándo'; end if;
  if new.lifted_by = old.by_user and old.kind = 'baneo' then raise exception 'otra persona levanta un baneo'; end if;
  return new;
end $$;
drop trigger if exists driver_sanctions_antes on driver_sanctions;
create trigger driver_sanctions_antes before update or delete on driver_sanctions for each row execute function driver_sanctions_antes();
-- ¿Puede repartir ahora? (sin suspensión vigente ni baneo).
create or replace function repartidor_sancionado(u uuid) returns text language sql stable as $$
  select s.kind from driver_sanctions s where s.user_id = u and s.lifted_at is null and s.kind in ('suspension', 'baneo') and (s.until is null or s.until > now())
   order by (s.kind = 'baneo') desc limit 1
$$;

-- La cola «entrega» (incidencias de entrega).
do $$ begin
  perform pg_temp.ampliar_check('queue_items', 'queue_items_queue_check', array['entrega']);
  perform pg_temp.ampliar_check('queue_items', 'queue_items_subject_kind_check', array['delivery_incident']);
end $$;

-- La sección del Super Admin y sus permisos: ver; editar = trabajar incidencias; retirar = sancionar (el baneo, solo un Admin).
do $$ begin
  if not exists (select 1 from admin_sections where key = 'dlv') then
    update admin_sections set sort = sort + 1 where sort >= 5;
    insert into admin_sections (key, name, grp, icon, sort) values ('dlv', '{"es":"Repartidores","en":"Drivers"}', 'operar', 'truck', 5);
  end if;
end $$;
insert into role_permissions (role, section, action, allowed)
select r.key, 'dlv', a, (r.key = 'admin')
    or (r.key = 'ciudad' and a in ('ver', 'editar', 'retirar'))
    or (r.key = 'soporte' and a in ('ver', 'editar'))
    or (r.key = 'moderador' and a in ('ver', 'retirar'))
    or (r.key = 'lectura' and a = 'ver')
  from staff_roles r, unnest('{ver,editar,aprobar,retirar,exportar}'::text[]) a
on conflict (role, section, action) do nothing;

-- ════════════════════ COLAS ════════════════════
-- Quién ve cada cola (además de la matriz colas:ver y sus ciudades). La edita un Admin en Colas › Ajustes; queda en la auditoría.
create table if not exists queue_roles (
  queue       text not null,
  role        text not null references staff_roles (key),
  allowed     boolean not null,
  updated_by  uuid references users (id),
  updated_at  timestamptz not null default now(),
  primary key (queue, role)
);
with def(queue, roles) as (values
  ('sello', '{admin,verificador,lectura}'::text[]), ('nuevo', '{admin,ciudad,verificador,lectura}'), ('lic', '{admin,verificador,lectura}'),
  ('medios', '{admin,moderador,ciudad,lectura}'), ('cambio', '{admin,ciudad,soporte,lectura}'), ('rep', '{admin,moderador,lectura}'),
  ('chat', '{admin,moderador,lectura}'), ('disputa', '{admin,finanzas,lectura}'), ('sop', '{admin,soporte,ciudad,lectura}'),
  ('renta', '{admin,soporte,finanzas,ciudad,lectura}'), ('mesa', '{admin,soporte,ciudad,lectura}'), ('noid', '{admin,soporte,finanzas,ciudad,lectura}'),
  ('cuidado', '{admin,soporte}'), ('salir', '{admin,soporte,ciudad,lectura}'), ('grupo', '{admin,soporte,ciudad,lectura}'),
  ('plantones', '{admin,soporte,ciudad,lectura}'), ('estafa', '{admin,soporte,ciudad,lectura}'), ('vivienda', '{admin,moderador,soporte,ciudad,lectura}'),
  ('repUsr', '{admin,moderador,lectura}'), ('apel', '{admin,moderador,lectura}'), ('evt', '{admin,ciudad,lectura}'),
  ('evtcx', '{admin,soporte,ciudad,lectura}'), ('evtpago', '{admin,finanzas,lectura}'), ('ticket', '{admin,soporte,finanzas}'),
  ('rec', '{admin,ciudad,lectura}'), ('entrega', '{admin,soporte,ciudad,lectura}')
)
insert into queue_roles (queue, role, allowed)
select d.queue, r.key, r.key = any (d.roles) from def d, staff_roles r
on conflict (queue, role) do nothing;

-- Feriados del equipo: el plazo de Soporte (horas hábiles) no cuenta esos días. Nada se borra.
create table if not exists staff_holidays (
  id          bigint generated always as identity primary key,
  day         date not null,
  city_id     text references cities (id),                                -- null = todas
  name        jsonb not null,
  status      text not null default 'active' check (status in ('active', 'removed')),
  created_by  uuid references users (id),
  created_at  timestamptz not null default now(),
  removed_by  uuid references users (id),
  removed_at  timestamptz
);
create unique index if not exists staff_holidays_dia on staff_holidays (day, coalesce(city_id, '')) where status = 'active';
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
    -- 9n · Un feriado del equipo (de todas las ciudades o de esta) no cuenta.
    if extract(isodow from t) <= dias and not exists (select 1 from staff_holidays h where h.status = 'active' and h.day = t::date and (h.city_id is null or h.city_id = ciudad)) then
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

-- ════════════════════ HORARIO ════════════════════
-- Días especiales: nada se borra (se quitan con status). «Abro por temporada» = kind 'season' con el rango en que SÍ abre (fuera de él, cerrado).
alter table special_hours add column if not exists status text not null default 'active';
alter table special_hours add column if not exists created_by uuid references users (id);
alter table special_hours add column if not exists created_at timestamptz not null default now();
alter table special_hours add column if not exists removed_at timestamptz;
alter table special_hours add column if not exists holiday_key text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'special_hours_status_check') then
    alter table special_hours add constraint special_hours_status_check check (status in ('active', 'removed'));
  end if;
end $$;
do $$ begin perform pg_temp.ampliar_check('special_hours', 'special_hours_kind_check', array['vacation', 'own']); end $$;
create unique index if not exists special_hours_feriado on special_hours (business_id, holiday_key, date_from) where status = 'active' and holiday_key is not null;
-- El catálogo de feriados del servidor (EE. UU. y los que celebra la comunidad); el negocio marca los que cierra.
create table if not exists holiday_catalog (
  key   text not null,
  day   date not null,
  name  jsonb not null,
  primary key (key, day)
);
insert into holiday_catalog (key, day, name) values
  ('anio_nuevo', '2026-01-01', '{"es":"Año Nuevo","en":"New Year’s Day"}'), ('reyes', '2026-01-06', '{"es":"Día de Reyes","en":"Three Kings Day"}'),
  ('mlk', '2026-01-19', '{"es":"Día de Martin Luther King Jr.","en":"Martin Luther King Jr. Day"}'), ('presidentes', '2026-02-16', '{"es":"Día de los Presidentes","en":"Presidents’ Day"}'),
  ('madres', '2026-05-10', '{"es":"Día de las Madres","en":"Mother’s Day"}'), ('memorial', '2026-05-25', '{"es":"Memorial Day","en":"Memorial Day"}'),
  ('juneteenth', '2026-06-19', '{"es":"Juneteenth","en":"Juneteenth"}'), ('independencia', '2026-07-04', '{"es":"Día de la Independencia","en":"Independence Day"}'),
  ('trabajo', '2026-09-07', '{"es":"Día del Trabajo","en":"Labor Day"}'), ('accion_gracias', '2026-11-26', '{"es":"Día de Acción de Gracias","en":"Thanksgiving"}'),
  ('nochebuena', '2026-12-24', '{"es":"Nochebuena","en":"Christmas Eve"}'), ('navidad', '2026-12-25', '{"es":"Navidad","en":"Christmas Day"}'),
  ('nochevieja', '2026-12-31', '{"es":"Fin de Año","en":"New Year’s Eve"}'),
  ('anio_nuevo', '2027-01-01', '{"es":"Año Nuevo","en":"New Year’s Day"}'), ('reyes', '2027-01-06', '{"es":"Día de Reyes","en":"Three Kings Day"}'),
  ('mlk', '2027-01-18', '{"es":"Día de Martin Luther King Jr.","en":"Martin Luther King Jr. Day"}'), ('presidentes', '2027-02-15', '{"es":"Día de los Presidentes","en":"Presidents’ Day"}'),
  ('madres', '2027-05-09', '{"es":"Día de las Madres","en":"Mother’s Day"}'), ('memorial', '2027-05-31', '{"es":"Memorial Day","en":"Memorial Day"}'),
  ('juneteenth', '2027-06-19', '{"es":"Juneteenth","en":"Juneteenth"}'), ('independencia', '2027-07-04', '{"es":"Día de la Independencia","en":"Independence Day"}'),
  ('trabajo', '2027-09-06', '{"es":"Día del Trabajo","en":"Labor Day"}'), ('accion_gracias', '2027-11-25', '{"es":"Día de Acción de Gracias","en":"Thanksgiving"}'),
  ('nochebuena', '2027-12-24', '{"es":"Nochebuena","en":"Christmas Eve"}'), ('navidad', '2027-12-25', '{"es":"Navidad","en":"Christmas Day"}'),
  ('nochevieja', '2027-12-31', '{"es":"Fin de Año","en":"New Year’s Eve"}')
on conflict (key, day) do nothing;
-- El estado abierto/cerrado mira también los días especiales: un día cerrado (feriado, vacaciones, propio) cierra; uno con horas propias usa
-- sus horas; con una temporada activa, fuera de ella está cerrado.
create or replace function negocio_abierto(bid text, t timestamp) returns boolean language sql stable as $$
  with esp as (
    select s.closed, s.ranges from special_hours s
     where s.business_id = bid and s.status = 'active' and s.kind <> 'season' and t::date between s.date_from and s.date_to
     order by s.closed desc, s.id desc limit 1
  ), temporada as (
    select bool_or(t::date between s.date_from and s.date_to) as dentro from special_hours s where s.business_id = bid and s.status = 'active' and s.kind = 'season'
  )
  select not exists (select 1 from businesses b where b.id = bid and (b.closed_on = t::date or b.temp_closed_until > now()))
     and coalesce((select dentro from temporada), true)
     and not coalesce((select closed from esp), false)
     and case when exists (select 1 from esp where jsonb_array_length(ranges) > 0) then
       exists (select 1 from esp e, jsonb_array_elements(e.ranges) g
                where (g->>0)::time <= t::time and ((g->>1)::time > t::time or (g->>1)::time <= (g->>0)::time))
     else exists (
    select 1 from business_hours h, jsonb_array_elements(h.ranges) g
     where h.business_id = bid and h.module = '' and h.open
       and (
         (h.weekday = extract(dow from t)::int
           and (g->>0)::time <= t::time
           and ((g->>1)::time > t::time or (g->>1)::time <= (g->>0)::time))
         or
         (h.weekday = (extract(dow from t)::int + 6) % 7
           and (g->>1)::time <= (g->>0)::time and (g->>1)::time > '00:00'::time
           and t::time < (g->>1)::time)
       )) end
$$;

-- ════════════════════ PANEL › AJUSTES › AVISOS ════════════════════
alter table notif_templates add column if not exists biz_pref text;
create table if not exists business_notif_prefs (
  business_id  text not null references businesses (id),
  pref         text not null check (pref in ('pedidos', 'citas', 'reservas', 'eventos', 'resenas', 'mensajes', 'pagos', 'equipo', 'inventario')),
  off          boolean not null,
  updated_by   uuid references users (id),
  updated_at   timestamptz not null default now(),
  primary key (business_id, pref)
);
-- Qué grupo apaga cada aviso al negocio (lo que no tiene grupo no se apaga: dinero en disputa, sanciones, seguridad).
update notif_templates set biz_pref = case
    when key = 'biz_resena' then 'resenas'
    when key in ('evt_venta', 'evt_aforo90', 'evt_venta_congelada') then 'eventos'
    when key = 'biz_quedan_pocos' then 'inventario'
    when key ~ '^biz_(cita|apartado|hold_fallo|sal_(cita|cx|tarde|alt_ok|seg_ok)|pro_(cita|ok|no|cx)|preest|pq|est_ok|xtra_|precio_|vis($|_)|insc|fiesta|viaje|renta|plan_|em$|envio|mudanza|req)' or key ~ '^evp_biz_(pide|cx|ok|no|cambio_ok|cambio_no|recordatorio)' then 'citas'
    when key ~ '^biz_(rsv|noche)' then 'reservas'
    when key ~ '^biz_(merc|dlv_issue|oferta_)' then 'pedidos'
    when key = 'biz_msg' then 'mensajes'
    else null end
 where grp = 'biz' and biz_pref is null;

-- ════════════════════ AVISOS NUEVOS ════════════════════
insert into notif_templates (key, grp, pref, sms, sms_mode, push, app, title, body) values
  ('drv_oferta', 'biz', null, false, 'nunca', true, 'delivery', '{"es":"Pedido para llevar","en":"Delivery offer"}', '{"es":"{negocio} te ofrece el pedido #{num} para {calle}. Acéptalo antes de que venza.","en":"{negocio} offers you order #{num} to {calle}. Accept it before it expires."}'),
  ('drv_sancion', 'mod', null, true, 'sin_push', true, 'delivery', '{"es":"Tu cuenta de repartidor","en":"Your driver account"}', '{"es":"{que}. Motivo: {motivo}","en":"{que_en}. Reason: {motivo}"}'),
  ('biz_oferta_ok', 'biz', null, false, 'nunca', true, 'negocio', '{"es":"Aceptaron el pedido","en":"Order accepted"}', '{"es":"{repartidor} aceptó el pedido #{num} y va por él.","en":"{repartidor} accepted order #{num} and is heading there."}'),
  ('biz_oferta_vencio', 'biz', null, false, 'nunca', true, 'negocio', '{"es":"Nadie aceptó el pedido","en":"Nobody accepted the order"}', '{"es":"Nadie aceptó a tiempo el pedido #{num}. Asígnalo a alguien u ofrécelo otra vez.","en":"Nobody accepted order #{num} in time. Assign it or offer it again."}'),
  ('ord_rep_msg', 'tx', null, false, 'nunca', true, 'cliente', '{"es":"Tu repartidor te escribió","en":"Your driver wrote to you"}', '{"es":"{repartidor}: {texto}","en":"{repartidor}: {texto_en}"}')
on conflict (key) do nothing;
update notif_templates set biz_pref = 'pedidos' where key in ('biz_oferta_ok', 'biz_oferta_vencio') and biz_pref is null;

-- ════════════════════ CONFIGURACIÓN ════════════════════
do $$ begin perform pg_temp.ampliar_check('config_keys', 'config_keys_section_check', array['repartidor', 'colas']); end $$;
insert into config_keys (key, min, max, def, unit, section, label, help, editable, bloqueo, edit_in, sort) values
  ('oferta_seg', 20, 300, 60, '{"es":"segundos","en":"seconds"}', 'repartidor', '{"es":"Oferta al repartidor · tiempo para aceptar","en":"Driver offer · time to accept"}',
    '{"es":"La cuenta regresiva que ve el repartidor. Si nadie acepta, el negocio recibe el aviso y el pedido sigue sin repartidor.","en":"The countdown the driver sees. If nobody accepts, the business is told and the order stays without a driver."}', true, null, null, 1000),
  ('entrega_codigo_intentos', 3, 10, 5, '{"es":"intentos","en":"tries"}', 'repartidor', '{"es":"Código del cliente · intentos","en":"Customer code · tries"}',
    '{"es":"Después, el código deja de servir para ese pedido: la entrega se prueba con foto y queda una incidencia.","en":"After that the code stops working for that order: the delivery is proven with a photo and an incident is opened."}', true, null, null, 1001),
  ('entrega_foto_dias', 30, 365, 90, '{"es":"días","en":"days"}', 'repartidor', '{"es":"Foto de la entrega · cuánto se guarda","en":"Delivery photo · how long it is kept"}',
    '{"es":"Después se borra del almacenamiento (si hay una disputa abierta, espera a que se cierre).","en":"Then it is deleted from storage (if a dispute is open, it waits until it closes)."}', true, null, null, 1002),
  ('rep_mensajes_max', 1, 20, 6, '{"es":"mensajes","en":"messages"}', 'repartidor', '{"es":"Mensajes del repartidor al cliente · por pedido","en":"Driver messages to the customer · per order"}',
    null, true, null, null, 1003),
  ('cola_tomado_min', 10, 480, 60, '{"es":"minutos","en":"minutes"}', 'colas', '{"es":"Un caso tomado vuelve a la cola sin decisión después de","en":"A taken case returns to the queue without a decision after"}',
    '{"es":"Para que un caso no se quede con alguien que se fue. Queda en la auditoría.","en":"So a case is not stuck with someone who left. It is audited."}', true, null, null, 1100),
  ('cola_sla_sello', 1, 720, 48, '{"es":"horas","en":"hours"}', 'colas', '{"es":"Plazo · Sello de verificación","en":"Deadline · Verification badge"}', null, true, null, null, 1110),
  ('cola_sla_nuevo', 1, 720, 24, '{"es":"horas","en":"hours"}', 'colas', '{"es":"Plazo · Negocios nuevos","en":"Deadline · New businesses"}', null, true, null, null, 1111),
  ('cola_sla_lic', 1, 720, 72, '{"es":"horas","en":"hours"}', 'colas', '{"es":"Plazo · Licencias","en":"Deadline · Licenses"}', null, true, null, null, 1112),
  ('cola_sla_medios', 1, 720, 4, '{"es":"horas","en":"hours"}', 'colas', '{"es":"Plazo · Medios marcados","en":"Deadline · Flagged media"}', null, true, null, null, 1113),
  ('cola_sla_cambio', 1, 720, 48, '{"es":"horas","en":"hours"}', 'colas', '{"es":"Plazo · Cambios sensibles","en":"Deadline · Sensitive changes"}', null, true, null, null, 1114),
  ('cola_sla_rep', 1, 720, 24, '{"es":"horas","en":"hours"}', 'colas', '{"es":"Plazo · Reportes de contenido","en":"Deadline · Content reports"}', null, true, null, null, 1115),
  ('cola_sla_chat', 1, 720, 48, '{"es":"horas","en":"hours"}', 'colas', '{"es":"Plazo · Mensajes reportados","en":"Deadline · Reported messages"}', null, true, null, null, 1116),
  ('cola_sla_disputa', 1, 720, 120, '{"es":"horas","en":"hours"}', 'colas', '{"es":"Plazo · Disputas con el banco","en":"Deadline · Bank disputes"}', null, true, null, null, 1117),
  ('cola_sla_sop', 1, 720, 24, '{"es":"horas","en":"hours"}', 'colas', '{"es":"Plazo · Ayuda con pedidos y citas","en":"Deadline · Order and booking help"}', null, true, null, null, 1118),
  ('cola_sla_renta', 1, 720, 72, '{"es":"horas","en":"hours"}', 'colas', '{"es":"Plazo · Daños de rentas","en":"Deadline · Rental damage"}', null, true, null, null, 1119),
  ('cola_sla_mesa', 1, 720, 72, '{"es":"horas","en":"hours"}', 'colas', '{"es":"Plazo · Mesas no respetadas","en":"Deadline · Tables not honored"}', null, true, null, null, 1120),
  ('cola_sla_noid', 1, 720, 72, '{"es":"horas","en":"hours"}', 'colas', '{"es":"Plazo · Sin identificación","en":"Deadline · No ID at the door"}', null, true, null, null, 1121),
  ('cola_sla_cuidado', 1, 720, 4, '{"es":"horas","en":"hours"}', 'colas', '{"es":"Plazo · Cuidado de niños","en":"Deadline · Child care"}', null, true, null, null, 1122),
  ('cola_sla_salir', 1, 720, 48, '{"es":"horas","en":"hours"}', 'colas', '{"es":"Plazo · No me dejan cancelar","en":"Deadline · Will not let me cancel"}', null, true, null, null, 1123),
  ('cola_sla_grupo', 1, 720, 72, '{"es":"horas","en":"hours"}', 'colas', '{"es":"Plazo · Grupos que no abrieron","en":"Deadline · Groups that did not open"}', null, true, null, null, 1124),
  ('cola_sla_plantones', 1, 720, 72, '{"es":"horas","en":"hours"}', 'colas', '{"es":"Plazo · Plantones","en":"Deadline · No-shows"}', null, true, null, null, 1125),
  ('cola_sla_estafa', 1, 720, 8, '{"es":"horas","en":"hours"}', 'colas', '{"es":"Plazo · Posible estafa","en":"Deadline · Possible scam"}', null, true, null, null, 1126),
  ('cola_sla_vivienda', 1, 720, 72, '{"es":"horas","en":"hours"}', 'colas', '{"es":"Plazo · Vivienda justa","en":"Deadline · Fair housing"}', null, true, null, null, 1127),
  ('cola_sla_repusr', 1, 720, 24, '{"es":"horas","en":"hours"}', 'colas', '{"es":"Plazo · Reportes de usuario","en":"Deadline · User reports"}', null, true, null, null, 1128),
  ('cola_sla_apel', 1, 720, 72, '{"es":"horas","en":"hours"}', 'colas', '{"es":"Plazo · Apelaciones","en":"Deadline · Appeals"}', null, true, null, null, 1129),
  ('cola_sla_evtcx', 1, 720, 72, '{"es":"horas","en":"hours"}', 'colas', '{"es":"Plazo · Organizadores que cancelan","en":"Deadline · Organizers who cancel"}', null, true, null, null, 1130),
  ('cola_sla_evtpago', 1, 720, 48, '{"es":"horas","en":"hours"}', 'colas', '{"es":"Plazo · Pagos de eventos retenidos","en":"Deadline · Held event payouts"}', null, true, null, null, 1131),
  ('cola_sla_rec', 1, 720, 168, '{"es":"horas","en":"hours"}', 'colas', '{"es":"Plazo · Recomendaciones de vecinos","en":"Deadline · Neighbor recommendations"}', null, true, null, null, 1132),
  ('cola_sla_entrega', 1, 720, 24, '{"es":"horas","en":"hours"}', 'colas', '{"es":"Plazo · Incidencias de entrega","en":"Deadline · Delivery incidents"}', null, true, null, null, 1133)
on conflict (key) do nothing;

-- 9n · Lo que estaba «en solo lectura» y ya se lee en su texto: los grupos cancelados que abren un caso (Colas › Grupos que no abrieron dice el
-- número de Configuración, lib/colas.ts textoCola). Los demás siguen en solo lectura hasta que sus textos lean el valor (LAUNCH «Fase 9 · 9n»).
update config_keys set editable = true, bloqueo = null where key in ('insc_grupos_n', 'insc_grupos_dias') and not editable;

commit;
