-- 0110 · eventos_cambios_dinero (6e · docs/diseno/plan/fase6-eventos.md §2 0110, §3 «Dónde vive el dinero» y «Devoluciones», §4 6e,
-- §6 #2, #7, #16, #21, #24). Cambios del evento y el dinero del organizador.
-- · event_changes (solo inserción): pausar / reanudar la venta, mover la fecha o la hora, cancelar una fecha o el evento, congelar (admin).
-- · event_notices (solo inserción): AVISOS A LOS QUE VAN (≤ 160, push y en la app; tope por fecha de Configuración, lo cuenta la base).
-- · ticket_choices (solo inserción): «Me quedo con la nueva fecha» / «Devolución total» de una orden ante un cambio de fecha u hora.
-- · event_cancellations: cada cancelación (una fecha o todo el evento) con sus devoluciones en lote; idempotente por orden
--   (`evtcx-<cancelación>-<orden>`), reanudable por el barrido; status running → done (nada más cambia).
-- · event_settlements: lo que se le paga al organizador por FECHA, el martes después (evt_pago_dia). Los montos NO los pone la app:
--   al pasar a 'paying' la base los calcula del libro (payments, refunds, ticket_refund_lines, disputes) con evt_liq_calc() y descuenta
--   la deuda de ajustes posteriores (evt_liq_deuda); y solo deja pasar a 'paying' una fecha terminada, con su martes llegado, sin
--   disputas abiertas, sin devoluciones pendientes, sin cobros a medias, sin boletos vivos de una fecha cancelada, con la cuenta de
--   cobro habilitada y sin retener, y sin la retención del organizador nuevo (§6 #16). La llave de Stripe es una por fecha
--   (`evt-liq-<fecha>`): pagar dos veces no se puede (índice único + la misma llave). Una vez 'paying', los montos no cambian.
-- · event_settlement_reversals: si un ajuste (devolución o disputa perdida después de pagar) no tiene una liquidación siguiente donde
--   descontarse, se revierte la transferencia (dos pasos, la misma llave en cada reintento; nunca más de lo transferido).
-- · sim_transfers / sim_transfer_reversals: el simulador transfiere y revierte una sola vez por llave.
-- · Organizadores: payout_cleared_* (la retención del primer evento grande ya la miró Confianza). events.sales_frozen_* (To'Latino
--   congeló la venta: el organizador no la reabre).
-- · Colas «Organizadores que cancelan» (evtcx, §6 #24) y «Pagos de eventos retenidos» (evtpago, §6 #16). Plantillas evt_cancelado,
--   evt_fecha_cancelada, evt_movido, evt_hora_cambio (SMS, críticas), evt_aviso (sin SMS), evt_devolucion_total, evt_pago,
--   evt_pago_retenido, evt_venta_congelada. Claves evt_aviso_max, evt_pago_dia, evt_retener_nuevo_cents, evt_cancelaciones_confianza,
--   evt_cancelaciones_dias, evt_ajuste_dias, evt_cancelar_lote.
-- Idempotente: if not exists, checks que se reemplazan, funciones y triggers que se recrean, catálogos on conflict. Nada se borra.
begin;

-- ── Índices que la liquidación usa (fecha de una orden de boletos; disputas por cobro) ──
create index if not exists operations_fecha_boletos_idx on operations (((details->>'event_date_id')::bigint)) where kind = 'tickets';
create index if not exists disputes_pago_idx on disputes (payment_id);
create index if not exists event_dates_fin_idx on event_dates (ends_at);

-- ── To'Latino congela la venta (Super Admin): el organizador no la reabre ──
alter table events add column if not exists sales_frozen_at timestamptz;
alter table events add column if not exists sales_frozen_by uuid references users (id);
alter table events add column if not exists sales_frozen_reason text check (char_length(sales_frozen_reason) <= 300);
create or replace function events_congelado() returns trigger language plpgsql as $$
begin
  if new.status = 'live' and old.status = 'paused' and new.sales_frozen_at is not null then
    raise exception 'evt_congelado: To''Latino congeló la venta de este evento';
  end if;
  return new;
end $$;
drop trigger if exists events_congelado on events;
create trigger events_congelado before update of status on events for each row execute function events_congelado();

-- ── La retención del primer evento grande ya la miró Confianza ──
alter table event_organizers add column if not exists payout_cleared_at timestamptz;
alter table event_organizers add column if not exists payout_cleared_by uuid references users (id);
alter table event_organizers add column if not exists payout_cleared_note text check (char_length(payout_cleared_note) <= 300);

-- ── Cambios del evento (solo inserción) ──
create table if not exists event_changes (
  id            bigint generated always as identity primary key,
  event_id      bigint not null references events (id),
  event_date_id bigint references event_dates (id),
  city_id       text not null references cities (id),
  kind          text not null check (kind in ('paused', 'resumed', 'moved', 'time_changed', 'venue_changed', 'cancelled', 'date_cancelled', 'date_skipped',
                                              'lineup_changed', 'frozen', 'unfrozen')),
  before        jsonb,
  after         jsonb,
  reason_key    text check (reason_key in ('clima', 'artista', 'local', 'planes', 'admin')),
  note          text check (char_length(note) <= 500),
  by_user       uuid references users (id),
  by_kind       text not null check (by_kind in ('business', 'admin', 'system')),
  at            timestamptz not null default now()
);
create index if not exists event_changes_evento_idx on event_changes (event_id, at desc);
create index if not exists event_changes_fecha_idx on event_changes (event_date_id, at desc) where event_date_id is not null;
create or replace function event_changes_inmutable() returns trigger language plpgsql as $$
begin raise exception 'event_changes es solo de inserción'; end $$;
drop trigger if exists event_changes_no_cambia on event_changes;
create trigger event_changes_no_cambia before update or delete on event_changes for each row execute function event_changes_inmutable();

-- ── AVISOS A LOS QUE VAN (solo inserción; tope por fecha de Configuración, contado por la base con la fecha bloqueada) ──
create table if not exists event_notices (
  id            bigint generated always as identity primary key,
  event_id      bigint not null references events (id),
  event_date_id bigint not null references event_dates (id),
  city_id       text not null references cities (id),
  text          text not null check (char_length(btrim(text)) between 5 and 160),
  lang          text not null default 'es' check (lang in ('es', 'en')),
  by_user       uuid references users (id),
  by_kind       text not null default 'business' check (by_kind in ('business', 'admin')),
  sent_n        integer not null default 0 check (sent_n >= 0),
  at            timestamptz not null default now()
);
create index if not exists event_notices_fecha_idx on event_notices (event_date_id, at desc);
create or replace function event_notices_antes() returns trigger language plpgsql as $$
declare n int; d event_dates;
begin
  if tg_op <> 'INSERT' then raise exception 'event_notices es solo de inserción'; end if;
  select * into d from event_dates where id = new.event_date_id for update;
  if not found then raise exception 'esa fecha no existe'; end if;
  select count(*) into n from event_notices where event_date_id = new.event_date_id;
  if n >= cfg_int('evt_aviso_max') then raise exception 'evt_aviso_max: hasta % avisos por fecha', cfg_int('evt_aviso_max'); end if;
  new.event_id := d.event_id; new.city_id := d.city_id; new.at := now();
  return new;
end $$;
drop trigger if exists event_notices_antes on event_notices;
create trigger event_notices_antes before insert or update or delete on event_notices for each row execute function event_notices_antes();

-- ── «Me quedo» / «Devolución total» ante un cambio de fecha u hora (una por orden y cambio; solo inserción) ──
create table if not exists ticket_choices (
  id           bigint generated always as identity primary key,
  operation_id bigint not null references operations (id),
  change_id    bigint not null references event_changes (id),
  user_id      uuid not null references users (id),
  city_id      text not null references cities (id),
  choice       text not null check (choice in ('keep', 'refund')),
  refund_id    bigint references refunds (id),
  at           timestamptz not null default now(),
  unique (operation_id, change_id)
);
create or replace function ticket_choices_inmutable() returns trigger language plpgsql as $$
begin raise exception 'ticket_choices es solo de inserción'; end $$;
drop trigger if exists ticket_choices_no_cambia on ticket_choices;
create trigger ticket_choices_no_cambia before update or delete on ticket_choices for each row execute function ticket_choices_inmutable();

-- Las devoluciones por un cambio de fecha: 100 %, como cancelar.
alter table refunds drop constraint if exists refunds_initiated_by_check;
alter table refunds add constraint refunds_initiated_by_check check (initiated_by in ('business', 'admin', 'policy', 'event_cancelled', 'buyer', 'event_moved'));

-- ── Cancelaciones (una fecha o todo el evento): devoluciones en lote, idempotentes por orden, reanudables ──
create table if not exists event_cancellations (
  id            bigint generated always as identity primary key,
  event_id      bigint not null references events (id),
  event_date_id bigint references event_dates (id),          -- null = todo el evento
  business_id   text not null references businesses (id),
  city_id       text not null references cities (id),
  scope         text not null check (scope in ('date', 'event')),
  change_id     bigint references event_changes (id),
  reason_key    text not null check (reason_key in ('clima', 'artista', 'local', 'planes', 'admin')),
  note          text check (char_length(note) <= 500),
  by_user       uuid references users (id),
  by_kind       text not null check (by_kind in ('business', 'admin')),
  status        text not null default 'running' check (status in ('running', 'done')),
  orders_n      integer not null default 0 check (orders_n >= 0),   -- progreso (órdenes con devolución anotada)
  refunded_cents integer not null default 0 check (refunded_cents >= 0),
  card_cost_cents integer not null default 0 check (card_cost_cents >= 0), -- lo que To'Latino absorbe de la tarjeta (estimado, §6 #24)
  created_at    timestamptz not null default now(),
  done_at       timestamptz,
  check ((scope = 'date') = (event_date_id is not null))
);
create index if not exists event_cancellations_vivas_idx on event_cancellations (created_at) where status = 'running';
create index if not exists event_cancellations_negocio_idx on event_cancellations (business_id, created_at desc);
create unique index if not exists event_cancellations_una_idx on event_cancellations (event_id, coalesce(event_date_id, 0));
create or replace function event_cancellations_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'una cancelación no se borra'; end if;
  if tg_op = 'INSERT' then new.status := 'running'; new.orders_n := 0; new.refunded_cents := 0; new.card_cost_cents := 0; new.done_at := null; new.created_at := now(); return new; end if;
  if (new.event_id, new.event_date_id, new.business_id, new.city_id, new.scope, new.change_id, new.reason_key, new.note, new.by_user, new.by_kind, new.created_at)
     is distinct from (old.event_id, old.event_date_id, old.business_id, old.city_id, old.scope, old.change_id, old.reason_key, old.note, old.by_user, old.by_kind, old.created_at) then
    raise exception 'de una cancelación solo cambia su progreso';
  end if;
  if old.status = 'done' and new.status <> 'done' then raise exception 'una cancelación terminada no vuelve'; end if;
  if new.status = 'done' and old.status <> 'done' then new.done_at := now(); end if;
  return new;
end $$;
drop trigger if exists event_cancellations_antes on event_cancellations;
create trigger event_cancellations_antes before insert or update or delete on event_cancellations for each row execute function event_cancellations_antes();

-- ── La liquidación ──
-- El martes (evt_pago_dia, ISO: 1 = lunes … 7 = domingo) estrictamente después del día local en que termina la fecha.
create or replace function evt_pago_dia(d date) returns date language sql stable as $$
  select d + ((cfg_int('evt_pago_dia') - extract(isodow from d)::int + 6) % 7) + 1
$$;

-- Lo que dice el libro de una fecha: bruto, comisión de To'Latino, devuelto, perdido en disputas y lo del organizador (base), más lo que
-- impide pagar (disputas abiertas, devoluciones pendientes, cobros a medias, boletos vivos de una fecha cancelada). Por cobro:
--   base = cobrado − devuelto − perdido − comisión;  comisión = la copiada al comprar − la que To'Latino cedió (devolver el organizador,
--   cancelar o cambio de fecha: ticket_refund_lines.fee_waived_cents), nunca más que lo que queda del cobro; con una disputa perdida, 0.
-- Nunca negativo por cobro. Nada sale de la pantalla: solo de payments, refunds, ticket_refund_lines y disputes.
create or replace function evt_liq_calc(fid bigint, out gross int, out fee int, out refunded int, out disputed int, out base int,
                                        out abiertas int, out pendientes int, out retenidos int, out vivos_cx int)
language sql stable as $$
  with p as (
    select p.id, p.amount_cents as amt, p.fee_cents as fc, p.status, o.id as op
      from operations o join payments p on p.operation_id = o.id and p.kind = 'full' and p.transfer_group is not null
     where o.kind = 'tickets' and (o.details->>'event_date_id')::bigint = fid
  ), x as (
    select p.amt, p.fc,
           coalesce((select sum(r.amount_cents) from refunds r where r.payment_id = p.id and r.status in ('pending', 'done')), 0) as dev,
           coalesce((select sum(l.fee_waived_cents) from ticket_refund_lines l where l.operation_id = p.op), 0) as waived,
           coalesce((select sum(d.amount_cents) from disputes d where d.payment_id = p.id and d.status in ('lost', 'accepted')), 0) as lost
      from p where p.status in ('captured', 'partially_refunded', 'refunded')
  ), y as (
    select amt, dev, least(lost, greatest(0, amt - dev)) as lost2,
           case when lost > 0 then 0 else least(greatest(0, fc - waived), greatest(0, amt - dev)) end as fee2
      from x
  )
  select coalesce(sum(amt), 0)::int, coalesce(sum(fee2), 0)::int, coalesce(sum(dev), 0)::int, coalesce(sum(lost2), 0)::int,
         coalesce(sum(greatest(0, amt - dev - lost2 - fee2)), 0)::int,
         (select count(*)::int from disputes d join p on p.id = d.payment_id where d.status in ('needs_response', 'under_review')),
         (select count(*)::int from refunds r join p on p.id = r.payment_id where r.status = 'pending'),
         (select count(*)::int from p where p.status = 'held'),
         (select count(*)::int from tickets t join event_dates d on d.id = t.event_date_id join events e on e.id = d.event_id
           where t.event_date_id = fid and t.kind = 'paid' and t.status in ('valid', 'used') and (d.status = 'cancelled' or e.status = 'cancelled'))
    from y
$$;

create table if not exists event_settlements (
  id             bigint generated always as identity primary key,
  event_date_id  bigint not null unique references event_dates (id),
  event_id       bigint not null references events (id),
  business_id    text not null references businesses (id),
  city_id        text not null references cities (id),
  pay_on         date not null,
  status         text not null default 'pending' check (status in ('pending', 'held', 'paying', 'paid', 'reversed')),
  hold_kind      text check (hold_kind in ('disputa', 'nuevo', 'admin', 'cuenta')),
  hold_note      text check (char_length(hold_note) <= 300),
  held_at        timestamptz,
  held_by        uuid references users (id),
  released_at    timestamptz,
  released_by    uuid references users (id),
  release_note   text check (char_length(release_note) <= 300),
  gross_cents    integer not null default 0 check (gross_cents >= 0),
  fee_cents      integer not null default 0 check (fee_cents >= 0),
  refunded_cents integer not null default 0 check (refunded_cents >= 0),
  disputed_cents integer not null default 0 check (disputed_cents >= 0),
  base_cents     integer not null default 0 check (base_cents >= 0),   -- lo del organizador de ESTA fecha al pagar
  carry_cents    integer not null default 0 check (carry_cents >= 0),  -- lo que se descontó por ajustes de fechas ya pagadas
  net_cents      integer not null default 0 check (net_cents >= 0),    -- lo que se transfirió (base − carry)
  destination    text,
  idem_key       text not null unique check (idem_key ~ '^evt-liq-\d{1,18}$'),
  transfer_id    text unique,
  attempts       smallint not null default 0 check (attempts between 0 and 10000),
  last_error     text check (char_length(last_error) <= 120),
  paying_at      timestamptz,
  paid_at        timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (net_cents = base_cents - carry_cents),
  check ((status = 'held') = (hold_kind is not null)),
  check (status not in ('paying', 'paid', 'reversed') or (paying_at is not null and destination is not null)),
  check (status not in ('paid', 'reversed') or paid_at is not null),
  check (status <> 'paid' or net_cents = 0 or transfer_id is not null)
);
create index if not exists event_settlements_negocio_idx on event_settlements (business_id, status, pay_on);
create index if not exists event_settlements_cola_idx on event_settlements (pay_on) where status in ('pending', 'paying');
create index if not exists event_settlements_ciudad_idx on event_settlements (city_id, pay_on desc);

-- ¿El primer evento de un organizador nuevo pasa del tope? (§6 #16) Nuevo = nunca se le pagó un evento (otro evento con transferencia)
-- y Confianza todavía no lo miró (event_organizers.payout_cleared_at). El bruto es el de todo el evento (todas sus fechas).
create or replace function evt_liq_retener_nuevo(eid bigint, biz text) returns boolean language sql stable as $$
  select not exists (select 1 from event_organizers o where o.business_id = biz and o.payout_cleared_at is not null)
     and not exists (select 1 from event_settlements s where s.business_id = biz and s.event_id <> eid and s.status in ('paying', 'paid', 'reversed') and s.net_cents > 0)
     and coalesce((select sum(p.amount_cents) from payments p where p.transfer_group = 'evt-' || eid and p.status in ('captured', 'partially_refunded', 'refunded')), 0) > cfg_int('evt_retener_nuevo_cents')
$$;

-- Lo que el organizador debe por ajustes posteriores: por cada fecha ya pagada, lo que se le pagó como base − lo que hoy dice el libro;
-- menos lo ya descontado en liquidaciones siguientes y lo revertido. Nunca negativo.
create table if not exists event_settlement_reversals (
  id                 bigint generated always as identity primary key,
  settlement_id      bigint not null references event_settlements (id),
  business_id        text not null references businesses (id),
  city_id            text not null references cities (id),
  amount_cents       integer not null check (amount_cents > 0),
  idem_key           text not null unique check (idem_key ~ '^evt-rev-\d{1,18}-\d{1,6}$'),
  status             text not null default 'pending' check (status in ('pending', 'done')),
  stripe_reversal_id text unique,
  attempts           smallint not null default 0 check (attempts between 0 and 10000),
  last_error         text check (char_length(last_error) <= 120),
  created_at         timestamptz not null default now(),
  done_at            timestamptz
);
create index if not exists event_settlement_reversals_negocio_idx on event_settlement_reversals (business_id, created_at desc);
create or replace function evt_liq_deuda(biz text, sin bigint default null) returns integer language sql stable as $$
  select greatest(0,
    coalesce((select sum(s.base_cents - (evt_liq_calc(s.event_date_id)).base) from event_settlements s where s.business_id = biz and s.status in ('paying', 'paid', 'reversed') and s.id is distinct from sin), 0)
    - coalesce((select sum(s.carry_cents) from event_settlements s where s.business_id = biz and s.status in ('paying', 'paid', 'reversed') and s.id is distinct from sin), 0)
    - coalesce((select sum(r.amount_cents) from event_settlement_reversals r where r.business_id = biz), 0))::int
$$;

-- La liquidación la decide la base: la app solo pide «pagar» (status → 'paying'); los montos, el destino y el permiso salen de aquí.
create or replace function event_settlements_antes() returns trigger language plpgsql as $$
declare d event_dates; e events; tz text; k record; a stripe_accounts; deuda int;
begin
  if tg_op = 'DELETE' then raise exception 'una liquidación no se borra (estados)'; end if;
  if tg_op = 'INSERT' then
    select * into d from event_dates where id = new.event_date_id;
    if not found then raise exception 'esa fecha no existe'; end if;
    select * into e from events where id = d.event_id;
    select timezone into tz from cities where id = d.city_id;
    new.event_id := d.event_id; new.business_id := e.business_id; new.city_id := d.city_id;
    new.pay_on := evt_pago_dia((d.ends_at at time zone tz)::date);
    new.idem_key := 'evt-liq-' || new.event_date_id;
    new.status := 'pending'; new.hold_kind := null; new.hold_note := null; new.held_at := null; new.held_by := null;
    new.released_at := null; new.released_by := null; new.release_note := null;
    new.gross_cents := 0; new.fee_cents := 0; new.refunded_cents := 0; new.disputed_cents := 0; new.base_cents := 0; new.carry_cents := 0; new.net_cents := 0;
    new.destination := null; new.transfer_id := null; new.attempts := 0; new.last_error := null; new.paying_at := null; new.paid_at := null;
    new.created_at := now(); new.updated_at := now();
    return new;
  end if;
  if (new.event_date_id, new.event_id, new.business_id, new.city_id, new.idem_key, new.created_at) is distinct from (old.event_date_id, old.event_id, old.business_id, old.city_id, old.idem_key, old.created_at) then
    raise exception 'de una liquidación no cambia de qué fecha es';
  end if;
  new.updated_at := now();
  -- Ya en camino o pagada: lo calculado no cambia (los reintentos van con la misma llave y el mismo monto).
  if old.status in ('paying', 'paid', 'reversed') then
    if (new.gross_cents, new.fee_cents, new.refunded_cents, new.disputed_cents, new.base_cents, new.carry_cents, new.net_cents, new.destination, new.pay_on, new.paying_at)
       is distinct from (old.gross_cents, old.fee_cents, old.refunded_cents, old.disputed_cents, old.base_cents, old.carry_cents, old.net_cents, old.destination, old.pay_on, old.paying_at) then
      raise exception 'evt_liq_fija: lo que se transfiere ya quedó fijo';
    end if;
    if old.transfer_id is not null and new.transfer_id is distinct from old.transfer_id then raise exception 'evt_liq_fija: la transferencia ya quedó'; end if;
    if new.status is distinct from old.status and not ((old.status = 'paying' and new.status = 'paid') or (old.status = 'paid' and new.status = 'reversed')) then
      raise exception 'evt_liq_estado: % no pasa a %', old.status, new.status;
    end if;
    return new;
  end if;
  -- Pendiente o retenida: solo cambia el estado (y su motivo); los montos se escriben al pagar.
  if new.status is distinct from old.status and not ((old.status = 'pending' and new.status in ('held', 'paying')) or (old.status = 'held' and new.status = 'pending')) then
    raise exception 'evt_liq_estado: % no pasa a %', old.status, new.status;
  end if;
  if new.status <> 'paying' then
    new.gross_cents := old.gross_cents; new.fee_cents := old.fee_cents; new.refunded_cents := old.refunded_cents; new.disputed_cents := old.disputed_cents;
    new.base_cents := old.base_cents; new.carry_cents := old.carry_cents; new.net_cents := old.net_cents; new.destination := old.destination; new.pay_on := old.pay_on;
    new.paying_at := null; new.paid_at := null; new.transfer_id := null;
    return new;
  end if;
  -- → 'paying': todo lo que la regla pide, en la base.
  select * into d from event_dates where id = new.event_date_id;
  select * into e from events where id = d.event_id;
  select timezone into tz from cities where id = d.city_id;
  new.pay_on := old.pay_on;
  if d.ends_at > now() then raise exception 'evt_liq_antes: la fecha todavía no termina'; end if;
  if (now() at time zone tz)::date < old.pay_on then raise exception 'evt_liq_antes: se paga el % (el martes después de la fecha)', old.pay_on; end if;
  select * into k from evt_liq_calc(new.event_date_id);
  if k.abiertas > 0 then raise exception 'evt_liq_disputa: hay una disputa abierta en esta fecha'; end if;
  if k.pendientes > 0 then raise exception 'evt_liq_devolucion: hay devoluciones pendientes en esta fecha'; end if;
  if k.retenidos > 0 then raise exception 'evt_liq_cobro: hay cobros a medias en esta fecha'; end if;
  if k.vivos_cx > 0 then raise exception 'evt_liq_cancelada: la fecha se canceló y todavía hay boletos sin devolver'; end if;
  if evt_liq_retener_nuevo(new.event_id, new.business_id) then raise exception 'evt_liq_nuevo: primer evento de un organizador nuevo sobre el tope: lo revisa Confianza'; end if;
  select * into a from stripe_accounts where business_id = new.business_id;
  if not found or a.stripe_account_id is null or not a.payouts_enabled or a.payouts_paused then raise exception 'evt_liq_cuenta: la cuenta de cobro no recibe pagos'; end if;
  -- El candado de las liquidaciones del negocio: dos a la vez no descuentan la misma deuda.
  perform pg_advisory_xact_lock(hashtext('evt-liq:' || new.business_id));
  deuda := evt_liq_deuda(new.business_id, new.id);
  new.gross_cents := k.gross; new.fee_cents := k.fee; new.refunded_cents := k.refunded; new.disputed_cents := k.disputed; new.base_cents := k.base;
  new.carry_cents := least(k.base, deuda); new.net_cents := k.base - least(k.base, deuda);
  new.destination := a.stripe_account_id; new.paying_at := now(); new.hold_kind := null; new.hold_note := null; new.transfer_id := null; new.paid_at := null;
  return new;
end $$;
drop trigger if exists event_settlements_antes on event_settlements;
create trigger event_settlements_antes before insert or update or delete on event_settlements for each row execute function event_settlements_antes();

-- Revertir: nunca más de lo transferido en esa liquidación; solo cambia el estado (dos pasos).
create or replace function event_settlement_reversals_antes() returns trigger language plpgsql as $$
declare s event_settlements; ya int;
begin
  if tg_op = 'DELETE' then raise exception 'una reversión no se borra'; end if;
  if tg_op = 'INSERT' then
    select * into s from event_settlements where id = new.settlement_id for update;
    if not found or s.status not in ('paid', 'reversed') or s.transfer_id is null then raise exception 'evt_rev: solo se revierte una transferencia hecha'; end if;
    select coalesce(sum(amount_cents), 0) into ya from event_settlement_reversals where settlement_id = new.settlement_id;
    if ya + new.amount_cents > s.net_cents then raise exception 'evt_rev_de_mas: % + % pasa de lo transferido (%)', ya, new.amount_cents, s.net_cents; end if;
    new.business_id := s.business_id; new.city_id := s.city_id; new.status := 'pending'; new.stripe_reversal_id := null; new.attempts := 0; new.last_error := null;
    new.created_at := now(); new.done_at := null;
    return new;
  end if;
  if (new.settlement_id, new.business_id, new.city_id, new.amount_cents, new.idem_key, new.created_at) is distinct from (old.settlement_id, old.business_id, old.city_id, old.amount_cents, old.idem_key, old.created_at) then
    raise exception 'de una reversión solo cambia su estado';
  end if;
  if old.status = 'done' and new.status <> 'done' then raise exception 'una reversión hecha no vuelve'; end if;
  if new.status = 'done' and old.status <> 'done' then new.done_at := now(); end if;
  return new;
end $$;
drop trigger if exists event_settlement_reversals_antes on event_settlement_reversals;
create trigger event_settlement_reversals_antes before insert or update or delete on event_settlement_reversals for each row execute function event_settlement_reversals_antes();

-- Simulador de transferencias (solo sandbox): una sola vez por llave, como Stripe con Idempotency-Key.
create table if not exists sim_transfers (
  id             text primary key,
  destination    text not null,
  amount_cents   integer not null check (amount_cents > 0),
  transfer_group text,
  reversed_cents integer not null default 0 check (reversed_cents >= 0),
  created_at     timestamptz not null default now(),
  check (reversed_cents <= amount_cents)
);
create table if not exists sim_transfer_reversals (
  id           text primary key,
  transfer_id  text not null references sim_transfers (id),
  amount_cents integer not null check (amount_cents > 0),
  created_at   timestamptz not null default now()
);

-- ── Colas: Organizadores que cancelan (§6 #24) y Pagos de eventos retenidos (§6 #16) ──
alter table queue_items drop constraint if exists queue_items_queue_check;
alter table queue_items add constraint queue_items_queue_check check (queue = any (array['sello', 'nuevo', 'lic', 'medios', 'rec', 'cambio', 'rep', 'sop', 'chat', 'disputa', 'renta', 'mesa', 'noid',
  'cuidado', 'salir', 'grupo', 'plantones', 'estafa', 'vivienda', 'repUsr', 'apel', 'evt', 'evtcx', 'evtpago']));
alter table queue_items drop constraint if exists queue_items_subject_kind_check;
alter table queue_items add constraint queue_items_subject_kind_check check (subject_kind = any (array['verification_request', 'business', 'license', 'media', 'recommendation', 'claim',
  'sensitive_change', 'review', 'help_request', 'chat_thread', 'dispute', 'rental', 'listing', 'dm_thread', 'user', 'appeal', 'com_post', 'com_comment', 'event', 'event_settlement']));

-- ── Avisos (SMS solo lo crítico de la plataforma: cancelación y cambio de fecha u hora, §6 #7) ──
insert into notif_templates (key, grp, pref, sms, title, body) values
  ('evt_cancelado', 'crit', null, true, '{"es":"Se canceló un evento","en":"An event was cancelled"}',
    '{"es":"{evento} ({cuando}) se canceló: {motivo}. {dinero}","en":"{evento} ({cuando}) was cancelled: {motivo}. {dinero}"}'),
  ('evt_fecha_cancelada', 'crit', null, true, '{"es":"Se canceló una fecha","en":"A date was cancelled"}',
    '{"es":"{evento}: la fecha del {cuando} se canceló ({motivo}). {dinero}","en":"{evento}: the {cuando} date was cancelled ({motivo}). {dinero}"}'),
  ('evt_movido', 'crit', null, true, '{"es":"Tu evento cambió de fecha","en":"Your event changed its date"}',
    '{"es":"{evento} cambió de fecha: ahora es {cuando} (antes {antes}). Tus boletos valen igual, o pide la devolución total en tu orden hasta que empiece: {enlace}","en":"{evento} changed its date: it is now {cuando} (was {antes}). Your tickets still count, or ask for a full refund on your order until it starts: {enlace}"}'),
  ('evt_hora_cambio', 'crit', null, true, '{"es":"Tu evento cambió de hora","en":"Your event changed its time"}',
    '{"es":"{evento} cambió de hora: ahora es {cuando} (antes {antes}). Tus boletos valen igual, o pide la devolución total en tu orden hasta que empiece: {enlace}","en":"{evento} changed its time: it is now {cuando} (was {antes}). Your tickets still count, or ask for a full refund on your order until it starts: {enlace}"}'),
  ('evt_aviso', 'tx', null, false, '{"es":"Aviso del organizador","en":"Notice from the organizer"}',
    '{"es":"{evento} · {negocio}: {texto}","en":"{evento} · {negocio}: {texto}"}'),
  ('evt_devolucion_total', 'tx', null, false, '{"es":"Te devolvemos todo","en":"We refund everything"}',
    '{"es":"{evento}: te devolvemos {monto} completo, cargos incluidos. Llega a tu tarjeta en 3–5 días hábiles. Esos boletos ya no entran.","en":"{evento}: we refund {monto} in full, fees included. It reaches your card in 3–5 business days. Those tickets no longer get in."}'),
  ('evt_pago', 'biz', null, false, '{"es":"Te pagamos lo de tu evento","en":"We paid you for your event"}',
    '{"es":"{evento} ({cuando}): {monto} van a tu banco. Lo ves en Panel › Cobros.","en":"{evento} ({cuando}): {monto} is on its way to your bank. See it in Dashboard › Payouts."}'),
  ('evt_pago_retenido', 'biz', null, false, '{"es":"Retuvimos el pago de un evento","en":"We held an event payout"}',
    '{"es":"{evento} ({cuando}): el pago queda retenido. {motivo} No se pierde nada: sale cuando se resuelva.","en":"{evento} ({cuando}): the payout is held. {motivo} Nothing is lost: it goes out once resolved."}'),
  ('evt_venta_congelada', 'biz', null, false, '{"es":"To''Latino congeló la venta","en":"To''Latino froze sales"}',
    '{"es":"{evento}: la venta en línea queda congelada. Motivo: {motivo}. Los que compraron entran igual.","en":"{evento}: online sales are frozen. Reason: {motivo}. Buyers still get in."}')
on conflict (key) do nothing;

-- ── Configuración › Eventos ──
insert into config_keys (key, min, max, def, unit, section, label, help, editable, bloqueo, edit_in, sort) values
  ('evt_aviso_max', 1, 10, 3, '{"es":"avisos","en":"notices"}', 'eventos', '{"es":"Avisos del organizador por fecha","en":"Organizer notices per date"}',
    '{"es":"Avisos A LOS QUE VAN que un organizador manda por fecha (push y en la app; nunca SMS).","en":"NOTICES TO ATTENDEES an organizer sends per date (push and in the app; never text)."}', true, null, null, 96),
  ('evt_pago_dia', 1, 7, 2, '{"es":"día (1 = lunes)","en":"day (1 = Monday)"}', 'eventos', '{"es":"Día de pago de eventos","en":"Event payout day"}',
    '{"es":"El organizador cobra este día de la semana después de cada fecha (2 = martes). Lo dicen el panel y Publica tu evento.","en":"The organizer is paid on this weekday after each date (2 = Tuesday). The dashboard and Publish your event say it."}', true, null, null, 97),
  ('evt_retener_nuevo_cents', 0, 10000000, 200000, '{"es":"centavos","en":"cents"}', 'eventos', '{"es":"Retener el primer evento de un organizador nuevo desde","en":"Hold a new organizer''s first event from"}',
    '{"es":"Si el primer evento de un organizador nuevo vende más que esto, el pago espera a que Confianza lo mire.","en":"If a new organizer''s first event sells more than this, the payout waits for Trust and Safety to review it."}', true, null, null, 98),
  ('evt_cancelaciones_confianza', 1, 10, 2, '{"es":"cancelaciones","en":"cancellations"}', 'eventos', '{"es":"Cancelaciones que abren un caso en Confianza","en":"Cancellations that open a Trust case"}',
    '{"es":"Cuántas cancelaciones con boletos vendidos de un mismo organizador, en el plazo de abajo, abren un caso en Colas.","en":"How many cancellations with tickets sold by the same organizer, within the window below, open a case in Queues."}', true, null, null, 99),
  ('evt_cancelaciones_dias', 7, 365, 90, '{"es":"días","en":"days"}', 'eventos', '{"es":"Plazo para contar cancelaciones","en":"Window to count cancellations"}',
    '{"es":"Los días hacia atrás en que se cuentan las cancelaciones de un organizador.","en":"How many days back an organizer''s cancellations are counted."}', true, null, null, 100),
  ('evt_ajuste_dias', 1, 90, 14, '{"es":"días","en":"days"}', 'eventos', '{"es":"Esperar otra liquidación para un ajuste","en":"Wait for another payout to adjust"}',
    '{"es":"Si devolvemos algo de una fecha ya pagada y el organizador no tiene otra liquidación en estos días, se revierte la transferencia.","en":"If we refund something from a date already paid and the organizer has no other payout within these days, the transfer is reversed."}', true, null, null, 101),
  ('evt_cancelar_lote', 0, 500, 25, '{"es":"órdenes","en":"orders"}', 'eventos', '{"es":"Devoluciones al momento al cancelar","en":"Refunds right away when cancelling"}',
    '{"es":"Al cancelar, tantas órdenes se devuelven en el acto; el resto lo sigue el barrido de cada minuto (nada se devuelve dos veces).","en":"When cancelling, this many orders are refunded right away; the rest continue in the every-minute sweep (nothing is refunded twice)."}', true, null, null, 102)
on conflict (key) do update set min = excluded.min, max = excluded.max, def = excluded.def, unit = excluded.unit, section = excluded.section, label = excluded.label,
  help = excluded.help, editable = excluded.editable, bloqueo = excluded.bloqueo, edit_in = excluded.edit_in, sort = excluded.sort;

commit;
