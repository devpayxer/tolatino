-- 0111 · series_y_dias (6f · docs/diseno/plan/fase6-eventos.md §2 0111 y §4 6f; prototipo TLEvP.occ / repL / daysOf / perDay de
-- dash2-evt.js y evCalB / evDaysB / evView del Panel v2).
-- · Series: events.rep = { k: w | 2w | m, days: [0–6] (0 = domingo; el día de la primera fecha va siempre), n: cuántas fechas,
--   skip: ['YYYY-MM-DD', …] } (evt_rep_ok). m = el mismo «n-ésimo» día de la semana de cada mes, o «el último». n ≤ evt_fechas_max y
--   las fechas se crean hasta hoy + evt_dias_adelante (Configuración, leídas por la base en el momento: cfg_int); el barrido sigue
--   creando las que faltan cuando el horizonte avanza (evt_extender_series). Cada fecha recuerda de qué día de la regla salió
--   (event_dates.serie_dia): una fecha movida a mano (moved_at) no vuelve a su hora; una saltada queda 'skipped'; una cancelada no
--   vuelve. evt_generar_fechas NUNCA borra ni salta una fecha con gente (boletos vivos, RSVP, apartados): la deja como está.
-- · Varios días seguidos (kind 'span', 2–30 días ≤ evt_dias_seguidos_max): una fila de event_dates por día (day_index), con su horario
--   (events.day_hours: [{h0, h1}] por día; null = el mismo) y el aforo por día (events.day_cap → event_dates.day_capacity).
--   Boletos: «Vale para» un día (ticket_types.valid_day) o todos (pase, valid_day null). La existencia de un evento de varios días vive
--   en UNA fecha, el ancla = el último día (ticket_stock, la orden, los boletos, la liquidación y su martes: el martes después del
--   último día); el aforo de cada día se cuenta aparte en event_day_stock con check (sold_n + held_n <= capacity): el trigger
--   ticket_stock_dia suma lo apartado y lo vendido de cada tipo a cada día que vale (el pase, a todos). Así ninguna ruta de código
--   (apartar, pagar, cortesías, lista de espera, devolver) puede pasarse del aforo de un día: la base lo rechaza.
-- · Boletos: tickets.valid_days lo pone la base al emitir (tickets_dias); bol_fechas_validas(boleto) = las fechas en que entra
--   (gancho para la puerta 6g/6h: un pase entra una vez cada día). bol_tipo_hasta(tipo): un boleto de un día se vende hasta el corte
--   de su día (sales_until); el pase, hasta el del primer día.
-- · El programa de una fecha de la serie: event_dates.lineup_override («QUIÉN SE PRESENTA · SOLO ESTA FECHA»). Plantilla evt_artista
--   (push y en la app; sin SMS). Una fecha de una serie que ya pasó queda 'done' en el barrido.
-- Idempotente: if not exists, checks que se reemplazan, funciones y triggers que se recrean, catálogos on conflict. Nada se borra.
begin;

-- ── La forma del evento ──
create or replace function evt_rep_ok(r jsonb) returns boolean language plpgsql immutable as $$
begin
  if r is null then return true; end if;
  if jsonb_typeof(r) <> 'object' or coalesce(r->>'k', '') not in ('w', '2w', 'm') then return false; end if;
  if coalesce(r->>'n', '') !~ '^\d{1,3}$' or (r->>'n')::int not between 1 and 104 then return false; end if;
  if jsonb_typeof(coalesce(r->'days', '[]')) <> 'array' or jsonb_array_length(coalesce(r->'days', '[]')) > 7 then return false; end if;
  if exists (select 1 from jsonb_array_elements(coalesce(r->'days', '[]')) x where jsonb_typeof(x) <> 'number' or x::text !~ '^[0-6]$') then return false; end if;
  if jsonb_typeof(coalesce(r->'skip', '[]')) <> 'array' or jsonb_array_length(coalesce(r->'skip', '[]')) > 104 then return false; end if;
  if exists (select 1 from jsonb_array_elements(coalesce(r->'skip', '[]')) x where jsonb_typeof(x) <> 'string' or x #>> '{}' !~ '^\d{4}-\d{2}-\d{2}$') then return false; end if;
  return true;
end $$;
create or replace function evt_dias_ok(h jsonb, n int) returns boolean language plpgsql immutable as $$
begin
  if h is null then return true; end if;
  if jsonb_typeof(h) <> 'array' or jsonb_array_length(h) <> n then return false; end if;
  return not exists (select 1 from jsonb_array_elements(h) x
                      where jsonb_typeof(x) <> 'object' or coalesce(x->>'h0', '') !~ '^\d{1,4}$' or coalesce(x->>'h1', '') !~ '^\d{1,4}$'
                         or (x->>'h0')::int > 1439 or (x->>'h1')::int <= (x->>'h0')::int or (x->>'h1')::int > (x->>'h0')::int + 720);
end $$;

alter table events add column if not exists day_hours jsonb;
alter table events add column if not exists day_cap integer not null default 0;
alter table events add column if not exists dates_until date;   -- hasta dónde generó la base las fechas de la serie (el barrido sigue)
alter table events drop constraint if exists events_day_cap_check;
alter table events add constraint events_day_cap_check check (day_cap between 0 and 20000);
alter table events drop constraint if exists events_forma_check;
alter table events add constraint events_forma_check check (
  (kind = 'single' and span_days = 1 and rep is null and day_hours is null)
  or (kind = 'series' and span_days = 1 and rep is not null and evt_rep_ok(rep) and day_hours is null)
  or (kind = 'span' and span_days >= 2 and rep is null and evt_dias_ok(day_hours, span_days)));
-- Una mesa es de una noche: un evento de varios días no vende mesas (se arma como serie o como eventos aparte).
alter table events drop constraint if exists events_span_sin_mesas;
alter table events add constraint events_span_sin_mesas check (kind <> 'span' or tables_cfg = '[]'::jsonb);

-- Los topes de Configuración los decide la base en el momento; con boletos vendidos la duración no cambia.
create or replace function events_forma() returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' and (new.kind, new.rep, new.span_days, new.day_hours, new.start_date) is not distinct from (old.kind, old.rep, old.span_days, old.day_hours, old.start_date) then return new; end if;
  if new.kind = 'series' and (tg_op = 'INSERT' or new.rep is distinct from old.rep) and (new.rep->>'n')::int > cfg_int('evt_fechas_max') then
    raise exception 'evt_fechas_max: una serie tiene hasta % fechas', cfg_int('evt_fechas_max');
  end if;
  if new.kind = 'span' and (tg_op = 'INSERT' or new.span_days is distinct from old.span_days) and new.span_days > least(30, cfg_int('evt_dias_seguidos_max')) then
    raise exception 'evt_dias_max: hasta % días seguidos', least(30, cfg_int('evt_dias_seguidos_max'));
  end if;
  if tg_op = 'UPDATE' and (new.kind <> old.kind or (new.kind = 'span' and (new.span_days, new.start_date) is distinct from (old.span_days, old.start_date)))
     and exists (select 1 from tickets t where t.event_id = new.id and t.status in ('valid', 'used')) then
    raise exception 'evt_forma_vendida: ya hay boletos vendidos: la duración del evento no cambia (cancela y crea otro)';
  end if;
  return new;
end $$;
drop trigger if exists events_forma on events;
create trigger events_forma before insert or update on events for each row execute function events_forma();

-- ── Fechas: de qué día de la regla salió cada una y si se movió a mano ──
alter table event_dates add column if not exists serie_dia date;
alter table event_dates add column if not exists moved_at timestamptz;
create unique index if not exists event_dates_serie_dia on event_dates (event_id, serie_dia) where serie_dia is not null;
create index if not exists event_dates_dia_idx on event_dates (event_id, day_index) where status in ('scheduled', 'done');
alter table event_dates drop constraint if exists event_dates_lineup_override_check;
alter table event_dates add constraint event_dates_lineup_override_check check (lineup_override is null or (jsonb_typeof(lineup_override) = 'array' and jsonb_array_length(lineup_override) between 1 and 8));

-- Una fecha «con gente»: boletos vivos (también cortesías), RSVP vivos o algo apartado. Una fecha así nunca se salta ni se mueve sola.
create or replace function evt_fecha_con_gente(fid bigint) returns boolean language sql stable as $$
  select exists (select 1 from event_dates d where d.id = fid and (d.sold_n > 0 or d.rsvp_n > 0))
      or exists (select 1 from ticket_holds h where h.event_date_id = fid and h.status = 'held')
      or exists (select 1 from waitlist w where w.event_date_id = fid and w.status in ('waiting', 'offered'))
$$;
-- El ancla de un evento de varios días: el último día programado (ahí viven la existencia, las órdenes y la liquidación).
create or replace function evt_ancla(eid bigint) returns bigint language sql stable as $$
  select d.id from event_dates d join events e on e.id = d.event_id
   where d.event_id = eid and e.kind = 'span' and d.status in ('scheduled', 'done') order by d.day_index desc, d.starts_at desc limit 1
$$;

-- ── Aforo por día (varios días) ──
create table if not exists event_day_stock (
  event_date_id bigint primary key references event_dates (id),
  event_id      bigint not null references events (id),
  city_id       text not null references cities (id),
  capacity      integer not null default 0 check (capacity >= 0),        -- 0 = sin límite (se cuenta igual)
  sold_n        integer not null default 0 check (sold_n >= 0),
  held_n        integer not null default 0 check (held_n >= 0),
  updated_at    timestamptz not null default now(),
  constraint event_day_stock_cupo check (capacity = 0 or sold_n + held_n <= capacity)
);
create index if not exists event_day_stock_evento_idx on event_day_stock (event_id);

-- Lo apartado y lo vendido de un tipo cuenta en cada día que vale (el pase, en todos). Si un día no alcanza, la base rechaza todo el
-- update de ticket_stock (y la transacción de apartar, pagar, dar cortesía u ofrecer de la lista de espera).
create or replace function ticket_stock_dia() returns trigger language plpgsql as $$
declare dh int := new.held_n - old.held_n; ds int := new.sold_n - old.sold_n; t ticket_types; k text;
begin
  if dh = 0 and ds = 0 then return null; end if;
  select * into t from ticket_types where id = new.ticket_type_id;
  select kind into k from events where id = t.event_id;
  if k is distinct from 'span' then return null; end if;
  update event_day_stock s set held_n = s.held_n + dh, sold_n = s.sold_n + ds, updated_at = now()
    from event_dates d where d.id = s.event_date_id and d.event_id = t.event_id and d.status in ('scheduled', 'done') and (t.valid_day is null or d.day_index = t.valid_day);
  return null;
end $$;
drop trigger if exists ticket_stock_dia on ticket_stock;
create trigger ticket_stock_dia after update of held_n, sold_n on ticket_stock for each row execute function ticket_stock_dia();

-- ── Boletos: los días que vale cada uno (la base los pone al emitir) ──
create or replace function tickets_dias() returns trigger language plpgsql as $$
declare k text; n smallint; vd smallint;
begin
  select e.kind, e.span_days into k, n from event_dates d join events e on e.id = d.event_id where d.id = new.event_date_id;
  if k = 'span' and new.ticket_type_id is not null then
    select valid_day into vd from ticket_types where id = new.ticket_type_id;
    new.valid_days := case when vd is null then array(select generate_series(0, n - 1))::smallint[] else array[vd] end;
  else
    new.valid_days := '{0}';
  end if;
  return new;
end $$;
drop trigger if exists tickets_dias on tickets;
create trigger tickets_dias before insert on tickets for each row execute function tickets_dias();

-- Gancho de la puerta (6g/6h): las fechas en que entra un boleto. Una serie o un evento de una fecha: su fecha. Varios días: cada día
-- de valid_days (un pase, una entrada por día; la puerta cuenta las entradas por día).
create or replace function bol_fechas_validas(tid bigint) returns bigint[] language sql stable as $$
  select coalesce(array_agg(d.id order by d.starts_at), '{}'::bigint[])
    from tickets t join events e on e.id = t.event_id join event_dates d on d.event_id = t.event_id
   where t.id = tid and d.status in ('scheduled', 'done') and (case when e.kind = 'span' then d.day_index = any(t.valid_days) else d.id = t.event_date_id end)
$$;
create or replace function bol_vale_en(tid bigint, fid bigint) returns boolean language sql stable as $$
  select fid = any(bol_fechas_validas(tid))
$$;

-- Hasta cuándo se vende un tipo de boleto (además del corte de su fecha): en varios días, el de un día hasta el corte de ese día y el
-- pase hasta el del primer día. En una serie o una fecha: sin corte propio.
create or replace function bol_tipo_hasta(tid bigint) returns timestamptz language sql stable as $$
  select coalesce((select bol_venta_hasta(e, d) from ticket_types t join events e on e.id = t.event_id
                     join lateral (select * from event_dates z where z.event_id = e.id and z.day_index = coalesce(t.valid_day, 0) and z.status in ('scheduled', 'done') order by z.starts_at limit 1) d on true
                    where t.id = tid and e.kind = 'span'), 'infinity'::timestamptz)
$$;

-- ── Las fechas las genera la base ──
create or replace function evt_generar_fechas(eid bigint) returns integer language plpgsql as $$
declare
  e events; tz text; hoy date; tope date; maxn int; n int := 0; d event_dates; s timestamptz; f timestamptz; p timestamptz;
  dias date[] := '{}'; skip date[] := '{}'; x date; i int; step int; dws int[]; ws date; nth int; dw int; m0 date; dim int; dd int; h0 int; h1 int;
begin
  select * into e from events where id = eid for update;
  if not found or e.status in ('cancelled', 'rejected', 'done') then return 0; end if;
  select timezone into tz from cities where id = e.city_id;
  hoy := (now() at time zone tz)::date;
  tope := hoy + cfg_int('evt_dias_adelante');

  if e.kind = 'single' then
    -- Un día (0106): la fecha sale de la fila del evento; una fecha con ventas no se mueve aquí (eso es 6e, con avisos).
    s := (e.start_date::timestamp + make_interval(mins => e.start_min)) at time zone tz;
    f := (e.start_date::timestamp + make_interval(mins => e.end_min)) at time zone tz;
    p := s - make_interval(mins => e.doors_before_min);
    select * into d from event_dates where event_id = eid and day_index = 0 and status in ('scheduled', 'done') order by starts_at limit 1;
    if not found then
      insert into event_dates (event_id, city_id, starts_at, ends_at, doors_at, local_date, day_index, geom)
      values (eid, e.city_id, s, f, p, e.start_date, 0, e.geom) on conflict (event_id, starts_at) do nothing;
      n := 1;
    elsif d.sold_n = 0 and (d.starts_at, d.ends_at, d.doors_at, d.local_date) is distinct from (s, f, p, e.start_date) then
      update event_dates set starts_at = s, ends_at = f, doors_at = p, local_date = e.start_date, geom = e.geom where id = d.id;
      n := 1;
    end if;
    -- Lo que quedó de una serie o de varios días (un borrador que cambió de duración): sin gente, saltado.
    update event_dates z set status = 'skipped' where z.event_id = eid and z.status = 'scheduled' and z.starts_at > now()
       and z.id <> coalesce(d.id, (select min(y.id) from event_dates y where y.event_id = eid and y.day_index = 0 and y.status = 'scheduled'))
       and not evt_fecha_con_gente(z.id);
    return n;
  end if;

  if e.kind = 'span' then
    for i in 0 .. e.span_days - 1 loop
      x := e.start_date + i;
      h0 := coalesce((e.day_hours->i->>'h0')::int, e.start_min);
      h1 := coalesce((e.day_hours->i->>'h1')::int, e.end_min);
      s := (x::timestamp + make_interval(mins => h0)) at time zone tz;
      f := (x::timestamp + make_interval(mins => h1)) at time zone tz;
      p := s - make_interval(mins => e.doors_before_min);
      select * into d from event_dates where event_id = eid and day_index = i and status in ('scheduled', 'skipped', 'done') order by (status = 'scheduled') desc, starts_at limit 1;
      if not found then
        insert into event_dates (event_id, city_id, starts_at, ends_at, doors_at, local_date, day_index, geom, serie_dia, day_capacity)
        values (eid, e.city_id, s, f, p, x, i, e.geom, x, e.day_cap) on conflict do nothing;
        n := n + 1;
      else
        if d.status = 'skipped' then update event_dates set status = 'scheduled' where id = d.id; end if;
        if (d.starts_at, d.ends_at, d.doors_at, d.local_date, d.serie_dia, d.day_capacity) is distinct from (s, f, p, x, x, e.day_cap) then
          if evt_fecha_con_gente(d.id) or evt_fecha_con_gente(evt_ancla(eid)) then
            update event_dates set day_capacity = e.day_cap, serie_dia = coalesce(serie_dia, x) where id = d.id and (day_capacity, serie_dia) is distinct from (e.day_cap, x);
          else
            begin
              update event_dates set starts_at = s, ends_at = f, doors_at = p, local_date = x, serie_dia = x, day_capacity = e.day_cap, geom = e.geom where id = d.id;
            exception when unique_violation then null;
            end;
          end if;
          n := n + 1;
        end if;
      end if;
    end loop;
    -- Días que ya no son del evento (bajó la cantidad de días, o era de una fecha): sin gente, saltados.
    update event_dates z set status = 'skipped' where z.event_id = eid and z.status = 'scheduled' and (z.day_index >= e.span_days or z.serie_dia is null) and not evt_fecha_con_gente(z.id);
    -- El aforo de cada día: la capacidad del evento; lo apartado y lo vendido se cuentan desde la existencia del ancla.
    if e.day_cap > 0 and exists (select 1 from event_day_stock k join event_dates z on z.id = k.event_date_id where k.event_id = eid and z.status = 'scheduled' and k.sold_n + k.held_n > e.day_cap) then
      raise exception 'evt_aforo_bajo: ese día ya van más de %; el aforo no baja de ahí', e.day_cap;
    end if;
    insert into event_day_stock (event_date_id, event_id, city_id, capacity, sold_n, held_n)
    select z.id, eid, z.city_id, e.day_cap,
           coalesce((select sum(s2.sold_n) from ticket_stock s2 join ticket_types t on t.id = s2.ticket_type_id where t.event_id = eid and (t.valid_day is null or t.valid_day = z.day_index)), 0),
           coalesce((select sum(s2.held_n) from ticket_stock s2 join ticket_types t on t.id = s2.ticket_type_id where t.event_id = eid and (t.valid_day is null or t.valid_day = z.day_index)), 0)
      from event_dates z where z.event_id = eid and z.status = 'scheduled'
    on conflict (event_date_id) do update set capacity = excluded.capacity, updated_at = now() where event_day_stock.capacity <> excluded.capacity;
    return n;
  end if;

  -- Serie: los días de la regla desde la primera fecha, hasta n (Configuración) y hasta el horizonte (el barrido sigue después).
  maxn := least((e.rep->>'n')::int, cfg_int('evt_fechas_max'));
  skip := array(select (jsonb_array_elements_text(coalesce(e.rep->'skip', '[]')))::date);
  if e.rep->>'k' in ('w', '2w') then
    step := case when e.rep->>'k' = '2w' then 2 else 1 end;
    dws := array(select distinct v from (select (jsonb_array_elements_text(coalesce(e.rep->'days', '[]')))::int as v union select extract(dow from e.start_date)::int) z);
    ws := e.start_date - extract(dow from e.start_date)::int;
    x := e.start_date;
    while cardinality(dias) < maxn and x <= tope loop
      if extract(dow from x)::int = any(dws) and ((x - ws) / 7) % step = 0 then dias := dias || x; end if;
      x := x + 1;
    end loop;
  else
    -- Cada mes: el mismo «n-ésimo» día de la semana (o «el último», si la primera fecha es la última de su mes).
    dw := extract(dow from e.start_date)::int;
    nth := ceil(extract(day from e.start_date) / 7.0)::int;
    if extract(day from e.start_date) + 7 > extract(day from (date_trunc('month', e.start_date) + interval '1 month - 1 day'))
       and nth >= 4 then nth := 5; end if;
    for i in 0 .. maxn - 1 loop
      m0 := (date_trunc('month', e.start_date) + make_interval(months => i))::date;
      dim := extract(day from (m0 + interval '1 month - 1 day'))::int;
      if nth = 5 then dd := dim - ((extract(dow from (m0 + dim - 1))::int - dw + 7) % 7);
      else dd := 1 + ((dw - extract(dow from m0)::int + 7) % 7) + (nth - 1) * 7; end if;
      continue when dd > dim;
      x := m0 + dd - 1;
      continue when x < e.start_date;
      exit when x > tope;
      dias := dias || x;
    end loop;
  end if;
  -- La primera fecha de una serie que antes era de un día: la fila de antes sigue (con su gente) como el día de la regla que le toca.
  update event_dates z set serie_dia = z.local_date where z.event_id = eid and z.serie_dia is null and z.status in ('scheduled', 'skipped')
     and z.local_date = any(dias) and not exists (select 1 from event_dates y where y.event_id = eid and y.serie_dia = z.local_date);
  foreach x in array dias loop
    s := (x::timestamp + make_interval(mins => e.start_min)) at time zone tz;
    f := (x::timestamp + make_interval(mins => e.end_min)) at time zone tz;
    p := s - make_interval(mins => e.doors_before_min);
    select * into d from event_dates where event_id = eid and serie_dia = x;
    if not found then
      continue when x = any(skip) or f <= now();
      insert into event_dates (event_id, city_id, starts_at, ends_at, doors_at, local_date, day_index, geom, serie_dia)
      values (eid, e.city_id, s, f, p, x, 0, e.geom, x) on conflict do nothing;
      n := n + 1;
    elsif d.status in ('cancelled', 'done') then
      null;
    elsif x = any(skip) then
      if d.status = 'scheduled' and not evt_fecha_con_gente(d.id) then update event_dates set status = 'skipped' where id = d.id; n := n + 1; end if;
    else
      if d.status = 'skipped' then update event_dates set status = 'scheduled' where id = d.id; n := n + 1; end if;
      if d.moved_at is null and d.starts_at > now() and not evt_fecha_con_gente(d.id) and (d.starts_at, d.ends_at, d.doors_at, d.local_date) is distinct from (s, f, p, x) then
        begin
          update event_dates set starts_at = s, ends_at = f, doors_at = p, local_date = x, geom = e.geom where id = d.id;
          n := n + 1;
        exception when unique_violation then null;
        end;
      end if;
    end if;
  end loop;
  -- Fechas que ya no son de la regla (cambió el día, bajaron las fechas o el horizonte): sin gente, saltadas; con gente, siguen.
  update event_dates z set status = 'skipped' where z.event_id = eid and z.status = 'scheduled' and z.starts_at > now()
     and (z.serie_dia is null or not (z.serie_dia = any(dias))) and not evt_fecha_con_gente(z.id);
  update events set dates_until = tope where id = eid and dates_until is distinct from tope;
  return n;
end $$;

-- Lo que se vende sale de la configuración del evento (0108) + «Vale para» un día (dy; null = pase) en varios días. La existencia:
-- cada fecha programada de una serie la suya; un evento de varios días, solo en su ancla (el último día).
create or replace function evt_sincronizar_venta(eid bigint) returns void language plpgsql as $$
declare e events; x jsonb; i int := 0; n int; vd smallint; ancla bigint;
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
    vd := case when e.kind = 'span' and coalesce(x->>'dy', '') ~ '^\d{1,2}$' and (x->>'dy')::int < e.span_days then (x->>'dy')::smallint end;
    select coalesce(max(s.sold_n + s.held_n), 0) into n from ticket_stock s join ticket_types t on t.id = s.ticket_type_id where t.event_id = eid and t.cfg_key = x->>'id';
    if coalesce((x->>'cap')::int, 0) < n then raise exception 'bol_cantidad_baja: % ya están vendidos o apartados; la cantidad no baja de ahí', n; end if;
    if n > 0 and exists (select 1 from ticket_types t where t.event_id = eid and t.cfg_key = x->>'id' and t.valid_day is distinct from vd) then
      raise exception 'bol_dia_vendido: ese boleto ya se vendió: el día para el que vale no cambia';
    end if;
    insert into ticket_types (event_id, city_id, cfg_key, name, note, price_cents, quantity, valid_day, off, sort)
    values (eid, e.city_id, x->>'id', jsonb_build_object('es', left(btrim(x->'n'->>'es'), 40), 'en', left(coalesce(x->'n'->>'en', ''), 40)),
            jsonb_build_object('es', left(coalesce(x->'s'->>'es', ''), 80), 'en', left(coalesce(x->'s'->>'en', ''), 80)), (x->>'p')::int, greatest(0, coalesce((x->>'cap')::int, 0)), vd, coalesce((x->>'off')::boolean, false), i)
    on conflict (event_id, cfg_key) do update set name = excluded.name, note = excluded.note, price_cents = excluded.price_cents, quantity = excluded.quantity, valid_day = excluded.valid_day, off = excluded.off, sort = excluded.sort, updated_at = now()
     where (ticket_types.name, ticket_types.note, ticket_types.price_cents, ticket_types.quantity, ticket_types.valid_day, ticket_types.off, ticket_types.sort)
           is distinct from (excluded.name, excluded.note, excluded.price_cents, excluded.quantity, excluded.valid_day, excluded.off, excluded.sort);
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
  ancla := evt_ancla(eid);
  insert into ticket_stock (ticket_type_id, event_date_id, city_id, quantity)
  select t.id, d.id, d.city_id, t.quantity from ticket_types t join event_dates d on d.event_id = t.event_id
   where t.event_id = eid and d.status = 'scheduled' and (e.kind <> 'span' or d.id = ancla)
  on conflict (ticket_type_id, event_date_id) do update set quantity = excluded.quantity, updated_at = now() where ticket_stock.quantity <> excluded.quantity;
  insert into table_stock (table_id, event_date_id, city_id, quantity)
  select t.id, d.id, d.city_id, t.quantity from event_tables t join event_dates d on d.event_id = t.event_id where t.event_id = eid and d.status = 'scheduled'
  on conflict (table_id, event_date_id) do update set quantity = excluded.quantity, updated_at = now() where table_stock.quantity <> excluded.quantity;
end $$;

-- evt_sincronizar_fechas (0106/0108) = las fechas de la regla + lo que se vende de cada una.
create or replace function evt_sincronizar_fechas(eid bigint) returns void language plpgsql as $$
begin
  perform evt_generar_fechas(eid);
  perform evt_sincronizar_venta(eid);
end $$;

-- El barrido: las series siguen creando fechas cuando el horizonte avanza, y una fecha de una serie que ya pasó queda 'done'.
create or replace function evt_extender_series() returns integer language plpgsql as $$
declare r record; n int := 0;
begin
  for r in select e.id from events e join cities c on c.id = e.city_id
            where e.kind = 'series' and e.status in ('live', 'paused')
              and (e.dates_until is null or e.dates_until < (now() at time zone c.timezone)::date + cfg_int('evt_dias_adelante'))
            order by e.dates_until nulls first, e.id limit 200 loop
    perform evt_sincronizar_fechas(r.id);
    n := n + 1;
  end loop;
  update event_dates d set status = 'done' from events e where e.id = d.event_id and e.kind = 'series' and d.status = 'scheduled' and d.ends_at < now() - interval '12 hours';
  return n;
end $$;

-- ── Aviso de un cambio de artista solo en una fecha (push y en la app; sin SMS) ──
insert into notif_templates (key, grp, pref, sms, title, body) values
  ('evt_artista', 'tx', null, false, '{"es":"Cambio en el programa","en":"Program change"}',
    '{"es":"{evento} el {cuando}: ahora se presenta {quien}.","en":"{evento} on {cuando}: now performing {quien}."}')
on conflict (key) do nothing;

-- ── Configuración › Eventos: las claves de 6a ya sirven ──
insert into config_keys (key, min, max, def, unit, section, label, help, editable, bloqueo, edit_in, sort) values
  ('evt_fechas_max', 1, 104, 52, '{"es":"fechas","en":"dates"}', 'eventos', '{"es":"Fechas de una serie","en":"Dates in a series"}',
    '{"es":"Lo más que puede repetirse un evento (cada semana, cada 2 semanas o cada mes). La base no deja pasar de aquí.","en":"Most a recurring event can repeat (weekly, every 2 weeks or monthly). The database enforces it."}', true, null, null, 81),
  ('evt_dias_adelante', 30, 365, 180, '{"es":"días","en":"days"}', 'eventos', '{"es":"Se publica con anticipación de hasta","en":"Can be published up to"}',
    '{"es":"El calendario del editor muestra estos días hacia adelante. Una serie crea sus fechas hasta aquí y el barrido sigue cuando pasan los días.","en":"The editor calendar shows these days ahead. A series creates its dates up to here and the sweep continues as days pass."}', true, null, null, 82),
  ('evt_dias_seguidos_max', 2, 30, 30, '{"es":"días","en":"days"}', 'eventos', '{"es":"Días seguidos de un evento","en":"Consecutive days of an event"}',
    '{"es":"Una feria o festival de varios días: un pase para todos los días y boletos de un día, con aforo por día.","en":"A multi-day fair or festival: a pass for every day and single-day tickets, with a daily capacity."}', true, null, null, 84)
on conflict (key) do update set min = excluded.min, max = excluded.max, def = excluded.def, unit = excluded.unit, section = excluded.section, label = excluded.label,
  help = excluded.help, editable = excluded.editable, bloqueo = excluded.bloqueo, edit_in = excluded.edit_in, sort = excluded.sort;

-- ── Lo que ya existe: cada fecha de un día recuerda su día ──
update event_dates d set serie_dia = d.local_date from events e where e.id = d.event_id and e.kind <> 'single' and d.serie_dia is null
   and not exists (select 1 from event_dates y where y.event_id = d.event_id and y.serie_dia = d.local_date);

commit;
