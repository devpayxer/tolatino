-- 0108 · boletos_venta (6c · docs/diseno/plan/fase6-eventos.md §2 0108, §3 y §4 6c).
-- · Lo que se vende pasa de la configuración del evento (tickets_cfg, tables_cfg, addons_cfg: lo que guarda el editor y revisa
--   To'Latino) a sus tablas: ticket_types · event_tables · event_addons. La base las pone al día con evt_sincronizar_venta(), que
--   corre cada vez que el evento se pone al día (evt_sincronizar_fechas la llama): lo que se quita del editor queda apagado (off),
--   nunca se borra; la cantidad no baja de lo vendido ni de lo apartado ahora.
-- · Existencias por fecha: ticket_stock y table_stock (quantity, sold_n, held_n) con check (sold_n + held_n <= quantity): aun con un
--   error de código, la base no deja vender de más. Apartar y vender = update … where sold_n + held_n + q <= quantity (lib/boletos.ts).
--   Los extras con cantidad llevan el mismo check en event_addons.
-- · discount_codes: códigos del organizador (porcentaje o monto fijo, usos), el descuento sale de lo del organizador; usados + apartados
--   nunca pasan del tope (check). discount_attempts: los intentos (límite por persona; solo inserción).
-- · ticket_holds: el apartado de la compra (evt_apartado_min); vence en el barrido (y al leer). Nunca se borra (estados).
-- · tickets: un boleto por entrada (o uno por mesa con sus entradas), con código humano TL-XXX-0000 (sin 0/O/1/I), qr_ver (sube al
--   reemitir: el QR viejo deja de entrar) y estado valid · used · void · refunded · replaced. Lo comprado no cambia (trigger); no se borra.
--   event_dates.sold_n lo lleva la base (marca tl.evt_derivado). ticket_log: lo que pasa con cada boleto (solo inserción).
-- · qr_keys: SOLO la llave pública Ed25519 de cada entorno (la privada vive en los secretos del entorno: QR_LLAVE_PRIVADA).
-- · Orden B-9401… (secuencia); payments.transfer_group: el cobro de boletos queda en la plataforma y se transfiere al organizador
--   el martes después de la fecha (6e). Recibo por correo receipt_tickets. Plantillas bol_* y evt_venta; claves evt_* nuevas.
-- Idempotente: if not exists, checks que se reemplazan, triggers que se recrean, catálogos on conflict. Nada se borra.
begin;

-- ── Tipos de boleto, mesas y extras ──
create table if not exists ticket_types (
  id           bigint generated always as identity primary key,
  event_id     bigint not null references events (id),
  city_id      text not null references cities (id),
  cfg_key      text not null check (cfg_key ~ '^[A-Za-z0-9_-]{1,24}$'),
  name         jsonb not null check (char_length(btrim(coalesce(name->>'es', ''))) between 1 and 40 and char_length(coalesce(name->>'en', '')) <= 40),
  note         jsonb not null default '{"es":"","en":""}' check (char_length(coalesce(note->>'es', '')) <= 80 and char_length(coalesce(note->>'en', '')) <= 80),
  price_cents  integer not null check (price_cents between 100 and 50000),   -- lo que paga el cliente: cargos incluidos
  quantity     integer not null check (quantity between 0 and 5000),
  valid_day    smallint check (valid_day between 0 and 29),                   -- null = pase de todos los días (6f)
  sales_end_at timestamptz,                                                   -- preventa
  off          boolean not null default false,
  sort         smallint not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (event_id, cfg_key)
);
create table if not exists ticket_stock (
  ticket_type_id bigint not null references ticket_types (id),
  event_date_id  bigint not null references event_dates (id),
  city_id        text not null references cities (id),
  quantity       integer not null check (quantity >= 0),
  sold_n         integer not null default 0 check (sold_n >= 0),
  held_n         integer not null default 0 check (held_n >= 0),
  updated_at     timestamptz not null default now(),
  primary key (ticket_type_id, event_date_id),
  check (sold_n + held_n <= quantity)
);
create index if not exists ticket_stock_fecha_idx on ticket_stock (event_date_id);

create table if not exists event_tables (
  id              bigint generated always as identity primary key,
  event_id        bigint not null references events (id),
  city_id         text not null references cities (id),
  cfg_key         text not null check (cfg_key ~ '^[A-Za-z0-9_-]{1,24}$'),
  zone            jsonb not null check (char_length(btrim(coalesce(zone->>'es', ''))) between 1 and 40 and char_length(coalesce(zone->>'en', '')) <= 40),
  seats           smallint not null check (seats between 1 and 20),           -- entradas incluidas (un QR de grupo)
  min_spend_cents integer not null check (min_spend_cents >= 0),
  deposit_cents   integer not null check (deposit_cents > 0),
  quantity        integer not null check (quantity between 0 and 60),
  off             boolean not null default false,
  sort            smallint not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (event_id, cfg_key)
);
create table if not exists table_stock (
  table_id      bigint not null references event_tables (id),
  event_date_id bigint not null references event_dates (id),
  city_id       text not null references cities (id),
  quantity      integer not null check (quantity >= 0),
  sold_n        integer not null default 0 check (sold_n >= 0),
  held_n        integer not null default 0 check (held_n >= 0),
  updated_at    timestamptz not null default now(),
  primary key (table_id, event_date_id),
  check (sold_n + held_n <= quantity)
);
create index if not exists table_stock_fecha_idx on table_stock (event_date_id);

-- Un extra nunca es alcohol, botellas ni hookah (evt_extras_ok de 0106 sobre la fila).
create table if not exists event_addons (
  id          bigint generated always as identity primary key,
  event_id    bigint not null references events (id),
  city_id     text not null references cities (id),
  cfg_key     text not null check (cfg_key ~ '^[A-Za-z0-9_-]{1,24}$'),
  name        jsonb not null check (char_length(btrim(coalesce(name->>'es', ''))) between 1 and 40),
  descr       jsonb not null default '{"es":"","en":""}',
  price_cents integer not null check (price_cents between 100 and 100000),
  table_only  boolean not null default false,
  kind        text not null check (kind in ('detalle', 'material', 'servicio', 'otro')),
  quantity    integer check (quantity is null or quantity between 0 and 5000),
  sold_n      integer not null default 0 check (sold_n >= 0),
  held_n      integer not null default 0 check (held_n >= 0),
  off         boolean not null default false,
  sort        smallint not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (event_id, cfg_key),
  check (quantity is null or sold_n + held_n <= quantity),
  check (evt_extras_ok(jsonb_build_array(jsonb_build_object('name', name, 'desc', descr, 'kind', kind))))
);

-- ── Códigos de descuento del organizador ──
create table if not exists discount_codes (
  id          bigint generated always as identity primary key,
  event_id    bigint not null references events (id),
  city_id     text not null references cities (id),
  business_id text not null references businesses (id),
  code        text not null check (code ~ '^[A-Z0-9]{3,16}$'),
  kind        text not null check (kind in ('pct', 'amount')),
  value       integer not null,
  uses_max    integer not null check (uses_max between 1 and 10000),
  used_n      integer not null default 0 check (used_n >= 0),
  held_n      integer not null default 0 check (held_n >= 0),
  status      text not null default 'on' check (status in ('on', 'off')),
  created_by  uuid references users (id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (event_id, code),
  check (used_n + held_n <= uses_max),
  check ((kind = 'pct' and value between 5 and 90) or (kind = 'amount' and value between 100 and 50000))
);
create index if not exists discount_codes_negocio_idx on discount_codes (business_id, event_id);
create or replace function discount_codes_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'un código no se borra: se apaga'; end if;
  if tg_op = 'UPDATE' and (new.event_id, new.code, new.kind, new.value, new.business_id, new.created_at) is distinct from (old.event_id, old.code, old.kind, old.value, old.business_id, old.created_at) then
    raise exception 'de un código solo cambian los usos y si está encendido';
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists discount_codes_antes on discount_codes;
create trigger discount_codes_antes before insert or update or delete on discount_codes for each row execute function discount_codes_antes();

-- Intentos de aplicar un código (límite por persona y dispositivo contra quien adivina). Solo inserción.
create table if not exists discount_attempts (
  id       bigint generated always as identity primary key,
  user_id  uuid not null references users (id),
  device   uuid,
  event_id bigint not null references events (id),
  ok       boolean not null,
  at       timestamptz not null default now()
);
create index if not exists discount_attempts_persona_idx on discount_attempts (user_id, at desc);
create index if not exists discount_attempts_disp_idx on discount_attempts (device, at desc) where device is not null;
create or replace function discount_attempts_inmutable() returns trigger language plpgsql as $$
begin raise exception 'discount_attempts es solo de inserción'; end $$;
drop trigger if exists discount_attempts_no_cambia on discount_attempts;
create trigger discount_attempts_no_cambia before update or delete on discount_attempts for each row execute function discount_attempts_inmutable();

-- ── El apartado (8 min de Configuración; lo vence el barrido) ──
create table if not exists ticket_holds (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references users (id),
  device         uuid,
  event_id       bigint not null references events (id),
  event_date_id  bigint not null references event_dates (id),
  city_id        text not null references cities (id),
  lines          jsonb not null check (jsonb_typeof(lines) = 'array' and jsonb_array_length(lines) between 1 and 30),
  code_id        bigint references discount_codes (id),
  subtotal_cents integer not null check (subtotal_cents >= 0),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  total_cents    integer not null check (total_cents > 0),
  tickets_n      integer not null check (tickets_n >= 0),
  admits_n       integer not null check (admits_n >= 1),
  expires_at     timestamptz not null,
  status         text not null default 'held' check (status in ('held', 'converted', 'expired', 'released')),
  payment_intent text,                -- la autorización de la tarjeta (se anota antes de convertir: si algo se corta, el barrido la libera)
  pi_released_at timestamptz,
  pay_attempts   smallint not null default 0 check (pay_attempts between 0 and 1000),  -- autorizaciones liberadas: el siguiente intento es otro cobro
  operation_id   bigint references operations (id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (discount_cents <= subtotal_cents),
  check ((status = 'converted') = (operation_id is not null))
);
create index if not exists ticket_holds_vencen_idx on ticket_holds (expires_at) where status = 'held';
create index if not exists ticket_holds_persona_idx on ticket_holds (user_id, created_at desc);
create index if not exists ticket_holds_fecha_idx on ticket_holds (event_date_id) where status = 'held';
create index if not exists ticket_holds_codigo_idx on ticket_holds (code_id, user_id) where code_id is not null;
create or replace function ticket_holds_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'un apartado no se borra: vence, se suelta o se convierte'; end if;
  if tg_op = 'UPDATE' then
    if (new.user_id, new.event_id, new.event_date_id, new.lines, new.code_id, new.subtotal_cents, new.discount_cents, new.total_cents, new.created_at)
       is distinct from (old.user_id, old.event_id, old.event_date_id, old.lines, old.code_id, old.subtotal_cents, old.discount_cents, old.total_cents, old.created_at) then
      raise exception 'lo apartado y su precio no cambian';
    end if;
    -- Un apartado convertido o soltado no vuelve; uno vencido vuelve solo si se aparta otra vez al pagar (con su existencia).
    if old.status in ('converted', 'released') and new.status is distinct from old.status then raise exception 'ese apartado ya terminó'; end if;
    if old.status = 'expired' and new.status not in ('expired', 'held') then raise exception 'un apartado vencido solo vuelve a apartarse'; end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists ticket_holds_antes on ticket_holds;
create trigger ticket_holds_antes before insert or update or delete on ticket_holds for each row execute function ticket_holds_antes();

-- ── Orden B-9401… ──
create sequence if not exists ticket_order_seq start 9401;

-- ── Boletos ──
create or replace function bol_codigo() returns text language plpgsql volatile as $$
declare ab text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; dg text := '23456789'; c text; i int; k int;
begin
  for k in 1..30 loop
    c := 'TL-';
    for i in 1..3 loop c := c || substr(ab, 1 + floor(random() * length(ab))::int, 1); end loop;
    c := c || '-';
    for i in 1..4 loop c := c || substr(dg, 1 + floor(random() * length(dg))::int, 1); end loop;
    if not exists (select 1 from tickets where code = c) then return c; end if;
  end loop;
  raise exception 'no se pudo generar un código de boleto';
end $$;

create table if not exists tickets (
  id             bigint generated always as identity primary key,
  code           text not null unique check (code ~ '^TL-[A-HJ-NP-Z2-9]{3}-[2-9]{4}$'),
  event_id       bigint not null references events (id),
  event_date_id  bigint not null references event_dates (id),
  city_id        text not null references cities (id),
  valid_days     smallint[] not null default '{0}',
  ticket_type_id bigint references ticket_types (id),
  table_id       bigint references event_tables (id),
  operation_id   bigint not null references operations (id),
  holder_user_id uuid references users (id),
  holder_name    text check (char_length(holder_name) <= 40),
  admits         smallint not null default 1 check (admits between 1 and 20),
  kind           text not null default 'paid' check (kind in ('paid', 'comp')),
  price_cents    integer not null check (price_cents >= 0),       -- lo que se pagó por este boleto (después del descuento)
  fee_cents      integer not null default 0 check (fee_cents >= 0), -- la comisión de To'Latino de este boleto (fee_rules «bol»), copiada
  discount_cents integer not null default 0 check (discount_cents >= 0),
  status         text not null default 'valid' check (status in ('valid', 'used', 'void', 'refunded', 'replaced')),
  qr_ver         integer not null default 1 check (qr_ver >= 1),
  replaced_by    bigint references tickets (id),
  void_reason    text check (char_length(void_reason) <= 300),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check ((ticket_type_id is null) <> (table_id is null)),
  check (fee_cents <= price_cents or kind = 'comp')
);
create index if not exists tickets_fecha_idx on tickets (event_date_id, status);
create index if not exists tickets_persona_idx on tickets (holder_user_id, created_at desc);
create index if not exists tickets_orden_idx on tickets (operation_id);
create index if not exists tickets_evento_idx on tickets (event_id, created_at desc);

-- Lo comprado no cambia; un boleto no se borra. De un boleto solo cambian el estado, el nombre, la versión del QR y el reemplazo.
create or replace function tickets_antes() returns trigger language plpgsql as $$
declare d event_dates;
begin
  if tg_op = 'DELETE' then raise exception 'un boleto no se borra: se anula o se devuelve (estados)'; end if;
  if tg_op = 'INSERT' then
    if new.code is null or new.code = '' then new.code := bol_codigo(); end if;
    select * into d from event_dates where id = new.event_date_id;
    if not found then raise exception 'esa fecha no existe'; end if;
    new.event_id := d.event_id; new.city_id := d.city_id; new.status := 'valid'; new.qr_ver := 1; new.replaced_by := null; new.void_reason := null;
    new.created_at := now(); new.updated_at := now();
    return new;
  end if;
  if (new.code, new.event_id, new.event_date_id, new.city_id, new.ticket_type_id, new.table_id, new.operation_id, new.admits, new.kind, new.price_cents, new.fee_cents, new.discount_cents, new.created_at, new.valid_days)
     is distinct from (old.code, old.event_id, old.event_date_id, old.city_id, old.ticket_type_id, old.table_id, old.operation_id, old.admits, old.kind, old.price_cents, old.fee_cents, old.discount_cents, old.created_at, old.valid_days) then
    raise exception 'lo comprado en un boleto no cambia';
  end if;
  if new.status is distinct from old.status then
    if old.status in ('void', 'refunded', 'replaced') then raise exception 'un boleto anulado, devuelto o reemplazado no vuelve'; end if;
    if old.status = 'used' and new.status not in ('refunded', 'void') then raise exception 'un boleto usado solo se devuelve o se anula'; end if;
  end if;
  if new.qr_ver < old.qr_ver then raise exception 'la versión del QR solo sube'; end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists tickets_antes on tickets;
create trigger tickets_antes before insert or update or delete on tickets for each row execute function tickets_antes();

-- Vendidos de la fecha (derivado; solo con la marca de los triggers).
create or replace function tickets_despues() returns trigger language plpgsql as $$
declare dv int;
begin
  dv := (case when new.status in ('valid', 'used') then 1 else 0 end) - (case when tg_op = 'UPDATE' and old.status in ('valid', 'used') then 1 else 0 end);
  if dv = 0 then return null; end if;
  perform set_config('tl.evt_derivado', 'si', true);
  update event_dates set sold_n = greatest(0, sold_n + dv) where id = new.event_date_id;
  perform set_config('tl.evt_derivado', '', true);
  return null;
end $$;
drop trigger if exists tickets_despues on tickets;
create trigger tickets_despues after insert or update on tickets for each row execute function tickets_despues();

-- Lo que pasa con cada boleto (emitido, reenviado, reemitido, anulado). Solo inserción.
create table if not exists ticket_log (
  id           bigint generated always as identity primary key,
  ticket_id    bigint not null references tickets (id),
  operation_id bigint references operations (id),
  city_id      text not null references cities (id),
  kind         text not null check (kind in ('emitido', 'reenviado', 'reemitido', 'anulado', 'cobro_fallido')),
  by_user      uuid references users (id),
  by_kind      text not null check (by_kind in ('user', 'business', 'staff', 'system')),
  reason       text check (char_length(reason) <= 300),
  at           timestamptz not null default now()
);
create index if not exists ticket_log_boleto_idx on ticket_log (ticket_id, at desc);
create or replace function ticket_log_inmutable() returns trigger language plpgsql as $$
begin raise exception 'ticket_log es solo de inserción'; end $$;
drop trigger if exists ticket_log_no_cambia on ticket_log;
create trigger ticket_log_no_cambia before update or delete on ticket_log for each row execute function ticket_log_inmutable();

-- ── Llaves públicas del QR (Ed25519). La privada nunca está en la base. ──
create table if not exists qr_keys (
  kid        text primary key check (kid ~ '^[a-f0-9]{8}$'),
  public_key text not null check (public_key ~ '^[A-Za-z0-9_-]{43}$'),   -- 32 bytes en base64url
  created_at timestamptz not null default now(),
  retired_at timestamptz
);

-- ── El cobro de boletos queda en la plataforma (transfer_group = el evento) ──
alter table payments add column if not exists transfer_group text check (transfer_group ~ '^evt-\d{1,18}$');
create index if not exists payments_grupo_idx on payments (transfer_group) where transfer_group is not null;

-- ── Recibo por correo ──
alter table email_outbox drop constraint if exists email_outbox_tpl_check;
alter table email_outbox add constraint email_outbox_tpl_check check (tpl in ('verify', 'receipt_order', 'receipt_table', 'receipt_pro', 'receipt_tickets'));

-- ── Lo que se vende sale de la configuración del evento (la revisa To'Latino) ──
create or replace function evt_sincronizar_venta(eid bigint) returns void language plpgsql as $$
declare e events; x jsonb; i int := 0; n int;
begin
  select * into e from events where id = eid;
  if not found then return; end if;
  -- Un evento cancelado, no aprobado o terminado ya no cambia lo que vendió.
  if e.status in ('cancelled', 'rejected', 'done') then return; end if;
  if e.entry <> 'tickets' then
    update ticket_types set off = true, updated_at = now() where event_id = eid and not off;
    update event_tables set off = true, updated_at = now() where event_id = eid and not off;
    update event_addons set off = true, updated_at = now() where event_id = eid and not off;
    return;
  end if;
  for x in select value from jsonb_array_elements(e.tickets_cfg) loop
    i := i + 1;
    continue when coalesce(x->>'id', '') !~ '^[A-Za-z0-9_-]{1,24}$' or char_length(btrim(coalesce(x->'n'->>'es', ''))) < 1 or coalesce((x->>'p')::int, 0) < 100;
    select coalesce(max(s.sold_n + s.held_n), 0) into n from ticket_stock s join ticket_types t on t.id = s.ticket_type_id where t.event_id = eid and t.cfg_key = x->>'id';
    if coalesce((x->>'cap')::int, 0) < n then raise exception 'bol_cantidad_baja: % ya están vendidos o apartados; la cantidad no baja de ahí', n; end if;
    insert into ticket_types (event_id, city_id, cfg_key, name, note, price_cents, quantity, off, sort)
    values (eid, e.city_id, x->>'id', jsonb_build_object('es', left(btrim(x->'n'->>'es'), 40), 'en', left(coalesce(x->'n'->>'en', ''), 40)),
            jsonb_build_object('es', left(coalesce(x->'s'->>'es', ''), 80), 'en', left(coalesce(x->'s'->>'en', ''), 80)), (x->>'p')::int, greatest(0, coalesce((x->>'cap')::int, 0)), coalesce((x->>'off')::boolean, false), i)
    on conflict (event_id, cfg_key) do update set name = excluded.name, note = excluded.note, price_cents = excluded.price_cents, quantity = excluded.quantity, off = excluded.off, sort = excluded.sort, updated_at = now()
     where (ticket_types.name, ticket_types.note, ticket_types.price_cents, ticket_types.quantity, ticket_types.off, ticket_types.sort) is distinct from (excluded.name, excluded.note, excluded.price_cents, excluded.quantity, excluded.off, excluded.sort);
  end loop;
  update ticket_types set off = true, updated_at = now() where event_id = eid and not off and cfg_key not in (select coalesce(y->>'id', '') from jsonb_array_elements(e.tickets_cfg) y);
  i := 0;
  for x in select value from jsonb_array_elements(e.tables_cfg) loop
    i := i + 1;
    continue when coalesce(x->>'id', '') !~ '^[A-Za-z0-9_-]{1,24}$' or char_length(btrim(coalesce(x->'z'->>'es', ''))) < 1 or coalesce((x->>'dep')::int, 0) < 1;
    select coalesce(max(s.sold_n + s.held_n), 0) into n from table_stock s join event_tables t on t.id = s.table_id where t.event_id = eid and t.cfg_key = x->>'id';
    if coalesce((x->>'cap')::int, 0) < n then raise exception 'bol_cantidad_baja: % mesas ya están vendidas o apartadas; la cantidad no baja de ahí', n; end if;
    insert into event_tables (event_id, city_id, cfg_key, zone, seats, min_spend_cents, deposit_cents, quantity, sort)
    values (eid, e.city_id, x->>'id', jsonb_build_object('es', left(btrim(x->'z'->>'es'), 40), 'en', left(coalesce(x->'z'->>'en', ''), 40)), least(20, greatest(1, coalesce((x->>'seats')::int, 4))),
            greatest(0, coalesce((x->>'min')::int, 0)), (x->>'dep')::int, least(60, greatest(0, coalesce((x->>'cap')::int, 1))), i)
    on conflict (event_id, cfg_key) do update set zone = excluded.zone, seats = excluded.seats, min_spend_cents = excluded.min_spend_cents, deposit_cents = excluded.deposit_cents,
      quantity = excluded.quantity, off = false, sort = excluded.sort, updated_at = now()
     where (event_tables.zone, event_tables.seats, event_tables.min_spend_cents, event_tables.deposit_cents, event_tables.quantity, event_tables.off, event_tables.sort)
           is distinct from (excluded.zone, excluded.seats, excluded.min_spend_cents, excluded.deposit_cents, excluded.quantity, false, excluded.sort);
  end loop;
  update event_tables set off = true, updated_at = now() where event_id = eid and not off and cfg_key not in (select coalesce(y->>'id', '') from jsonb_array_elements(e.tables_cfg) y);
  i := 0;
  for x in select value from jsonb_array_elements(e.addons_cfg) loop
    i := i + 1;
    continue when coalesce(x->>'id', '') !~ '^[A-Za-z0-9_-]{1,24}$' or char_length(btrim(coalesce(x->'n'->>'es', ''))) < 1 or coalesce((x->>'p')::int, 0) < 100;
    insert into event_addons (event_id, city_id, cfg_key, name, descr, price_cents, table_only, kind, sort)
    values (eid, e.city_id, x->>'id', jsonb_build_object('es', left(btrim(x->'n'->>'es'), 40), 'en', left(coalesce(x->'n'->>'en', ''), 40)),
            jsonb_build_object('es', left(coalesce(x->'s'->>'es', ''), 80), 'en', left(coalesce(x->'s'->>'en', ''), 80)), (x->>'p')::int, coalesce((x->>'mesa')::boolean, false), coalesce(x->>'kind', 'otro'), i)
    on conflict (event_id, cfg_key) do update set name = excluded.name, descr = excluded.descr, price_cents = excluded.price_cents, table_only = excluded.table_only, kind = excluded.kind, off = false, sort = excluded.sort, updated_at = now()
     where (event_addons.name, event_addons.descr, event_addons.price_cents, event_addons.table_only, event_addons.kind, event_addons.off, event_addons.sort)
           is distinct from (excluded.name, excluded.descr, excluded.price_cents, excluded.table_only, excluded.kind, false, excluded.sort);
  end loop;
  update event_addons set off = true, updated_at = now() where event_id = eid and not off and cfg_key not in (select coalesce(y->>'id', '') from jsonb_array_elements(e.addons_cfg) y);
  -- La existencia de cada fecha programada (una serie: cada fecha la suya, 6f).
  insert into ticket_stock (ticket_type_id, event_date_id, city_id, quantity)
  select t.id, d.id, d.city_id, t.quantity from ticket_types t join event_dates d on d.event_id = t.event_id where t.event_id = eid and d.status = 'scheduled'
  on conflict (ticket_type_id, event_date_id) do update set quantity = excluded.quantity, updated_at = now() where ticket_stock.quantity <> excluded.quantity;
  insert into table_stock (table_id, event_date_id, city_id, quantity)
  select t.id, d.id, d.city_id, t.quantity from event_tables t join event_dates d on d.event_id = t.event_id where t.event_id = eid and d.status = 'scheduled'
  on conflict (table_id, event_date_id) do update set quantity = excluded.quantity, updated_at = now() where table_stock.quantity <> excluded.quantity;
end $$;

-- evt_sincronizar_fechas (0106) + lo que se vende al día. Mismo cuerpo; al final, la venta.
create or replace function evt_sincronizar_fechas(eid bigint) returns void language plpgsql as $$
declare e events; tz text; s timestamptz; f timestamptz; p timestamptz; d event_dates;
begin
  select * into e from events where id = eid for update;
  if not found then return; end if;
  select timezone into tz from cities where id = e.city_id;
  s := (e.start_date::timestamp + make_interval(mins => e.start_min)) at time zone tz;
  f := (e.start_date::timestamp + make_interval(mins => e.end_min)) at time zone tz;
  p := s - make_interval(mins => e.doors_before_min);
  select * into d from event_dates where event_id = eid and day_index = 0 and status in ('scheduled', 'done') order by starts_at limit 1;
  if not found then
    insert into event_dates (event_id, city_id, starts_at, ends_at, doors_at, local_date, day_index, geom)
    values (eid, e.city_id, s, f, p, e.start_date, 0, e.geom) on conflict (event_id, starts_at) do nothing;
  elsif d.sold_n = 0 and (d.starts_at, d.ends_at, d.doors_at, d.local_date) is distinct from (s, f, p, e.start_date) then
    update event_dates set starts_at = s, ends_at = f, doors_at = p, local_date = e.start_date, geom = e.geom where id = d.id;
  end if;
  perform evt_sincronizar_venta(eid);
end $$;

-- Hasta cuándo se vende una fecha (Panel › «SE VENDE EN LÍNEA HASTA»): al empezar, al abrir puertas o un día antes (medianoche local).
create or replace function bol_venta_hasta(e events, d event_dates) returns timestamptz language sql stable as $$
  select case e.sales_until when 'doors' then d.doors_at
                            when 'day_before' then (d.local_date::timestamp) at time zone (select timezone from cities where id = d.city_id)
                            else d.starts_at end
$$;

-- ── Avisos (boleto comprado: en la app + recibo por correo; sin SMS: los boletos viven en la app) ──
insert into notif_templates (key, grp, pref, sms, title, body) values
  ('bol_comprado', 'tx', null, false, '{"es":"Tus boletos para {evento}","en":"Your tickets for {evento}"}', '{"es":"¡Listo, vas! Orden {num}: {cuantos}. {cuando}. Tu QR está en Mi cuenta › Boletos y funciona sin señal.","en":"You are going! Order {num}: {cuantos}. {cuando}. Your QR is in My account › Tickets and works without signal."}'),
  ('bol_reemitido', 'tx', null, false, '{"es":"Tu boleto tiene un QR nuevo","en":"Your ticket has a new QR"}', '{"es":"{codigo} · {evento}: To''Latino emitió un QR nuevo. El anterior ya no entra.","en":"{codigo} · {evento}: To''Latino issued a new QR. The old one no longer works."}'),
  ('bol_anulado', 'tx', null, false, '{"es":"Un boleto tuyo se anuló","en":"One of your tickets was voided"}', '{"es":"{codigo} · {evento}: {motivo}. Si crees que es un error, escribe a Ayuda.","en":"{codigo} · {evento}: {motivo}. If you think this is a mistake, contact Help."}'),
  ('bol_reenviado', 'tx', null, false, '{"es":"Tus boletos de {evento}","en":"Your tickets for {evento}"}', '{"es":"Están en Mi cuenta › Boletos. Muéstralos en la puerta: sube el brillo.","en":"They are in My account › Tickets. Show them at the door: turn up the brightness."}'),
  ('evt_venta', 'biz', null, false, '{"es":"Vendiste boletos","en":"You sold tickets"}', '{"es":"{evento}: {cuantos} · orden {num}. Lo ves en Panel › Eventos.","en":"{evento}: {cuantos} · order {num}. See it in Dashboard › Events."}')
on conflict (key) do nothing;

-- ── Configuración › Eventos ──
insert into config_keys (key, min, max, def, unit, section, label, help, editable, bloqueo, edit_in, sort) values
  ('evt_apartado_min', 3, 30, 8, '{"es":"min","en":"min"}', 'eventos', '{"es":"Boletos guardados mientras pagas","en":"Tickets held while you pay"}',
    '{"es":"Al continuar a pagar, los boletos y la mesa quedan apartados este tiempo; después vuelven a la venta. Lo dicen la pantalla de boletos y la de pago.","en":"When you continue to pay, tickets and table are held this long; then they go back on sale. The tickets and payment screens say it."}', true, null, null, 86),
  ('evt_boletos_por_orden_max', 1, 50, 10, '{"es":"boletos","en":"tickets"}', 'eventos', '{"es":"Boletos por orden","en":"Tickets per order"}',
    '{"es":"Lo más que se compra en una sola orden (la mesa va aparte: una por orden).","en":"Most bought in one order (a table is separate: one per order)."}', true, null, null, 87),
  ('evt_boletos_persona_fecha_max', 1, 100, 20, '{"es":"entradas","en":"entries"}', 'eventos', '{"es":"Entradas por persona y fecha","en":"Entries per person and date"}',
    '{"es":"Cuenta, dispositivo y tarjeta juntos (las entradas de una mesa cuentan). El organizador puede bajarlo.","en":"Account, device and card together (table entries count). The organizer can lower it."}', true, null, null, 88),
  ('evt_codigo_intentos_max', 3, 50, 10, '{"es":"intentos","en":"attempts"}', 'eventos', '{"es":"Intentos de código en 15 minutos","en":"Code attempts in 15 minutes"}',
    '{"es":"Códigos que no existen, por persona o dispositivo; al pasarse, espera.","en":"Codes that do not exist, per person or device; past this, wait."}', true, null, null, 89),
  ('evt_apartados_vivos_max', 1, 10, 3, '{"es":"apartados","en":"holds"}', 'eventos', '{"es":"Apartados a la vez por persona","en":"Holds at once per person"}',
    '{"es":"Contra quien acapara boletos con varias compras abiertas.","en":"Against hoarding tickets with several open checkouts."}', true, null, null, 90)
on conflict (key) do update set min = excluded.min, max = excluded.max, def = excluded.def, unit = excluded.unit, section = excluded.section, label = excluded.label,
  help = excluded.help, editable = excluded.editable, bloqueo = excluded.bloqueo, edit_in = excluded.edit_in, sort = excluded.sort;

-- ── Backfill: lo que ya está configurado pasa a sus tablas (en producción no hay eventos todavía) ──
do $$ declare r record; begin
  for r in select id from events where entry = 'tickets' and status not in ('cancelled', 'rejected', 'done') loop perform evt_sincronizar_venta(r.id); end loop;
end $$;

commit;
