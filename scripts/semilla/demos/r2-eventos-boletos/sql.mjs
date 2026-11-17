/* Eventos con boletos · el SQL (bloques DO). SOLO SANDBOX. Todo lo que la app deriva lo deriva la base: fechas (evt_sincronizar_fechas), existencias
   (evt_sincronizar_venta), vendidos por fecha (tickets_despues), puerta (puerta_entrada / puerta_rsvp), liquidaciones (insert por fecha, como
   crearLiquidaciones). Las órdenes, líneas, boletos, cobros y devoluciones se escriben como lo hacen boletos.ts / boletos-despues.ts / evt-cambios.ts.
   Repetible: eventos por (negocio, título), órdenes por client_key, escaneos por id fijo, RSVP por (fecha, persona), patrocinios por evento. */

export const ENCABEZADO = `-- GENERADO por scripts/semilla/demos/r2-eventos-boletos.mjs (determinista: la misma entrada da el mismo SQL). SOLO SANDBOX; nunca corre en producción.
-- Eventos con boletos de los negocios demo de las 5 ciudades: de un día, series semanales / cada 2 semanas / mensuales, varios días con pases por día,
-- con tipos de boleto, mesas con depósito, extras y códigos; órdenes vendidas con comprador y QR (boletos.code), algunos agotados, cancelados y
-- pospuestos con las reglas de devolución de la app; eventos pasados con ventas y puerta; RSVP; patrocinios. Nada se borra; repetible.
begin;
set local statement_timeout = 0;
`;

export const FUNCIONES = String.raw`
-- Fechas ya pasadas de una serie (la base solo crea las que vienen; las de atrás las pone el organizador al crear la serie con fecha de inicio pasada).
create or replace function pg_temp.k20_pasados(sd date, rep jsonb, hoy date) returns setof date language plpgsql as $f$
declare x date; ws date; step int; dw int; nth int; i int; m0 date; dim int; dd int; maxn int := (rep->>'n')::int; cnt int := 0;
begin
  dw := extract(dow from sd)::int;
  if rep->>'k' in ('w', '2w') then
    step := case when rep->>'k' = '2w' then 2 else 1 end; ws := sd - extract(dow from sd)::int; x := sd;
    while x <= hoy and cnt < maxn loop
      if extract(dow from x)::int = dw and ((x - ws) / 7) % step = 0 then cnt := cnt + 1; return next x; end if;
      x := x + 1;
    end loop;
  else
    nth := ceil(extract(day from sd) / 7.0)::int;
    if extract(day from sd) + 7 > extract(day from (date_trunc('month', sd) + interval '1 month - 1 day')) and nth >= 4 then nth := 5; end if;
    for i in 0 .. maxn - 1 loop
      m0 := (date_trunc('month', sd) + make_interval(months => i))::date;
      dim := extract(day from (m0 + interval '1 month - 1 day'))::int;
      if nth = 5 then dd := dim - ((extract(dow from (m0 + dim - 1))::int - dw + 7) % 7);
      else dd := 1 + ((dw - extract(dow from m0)::int + 7) % 7) + (nth - 1) * 7; end if;
      continue when dd > dim;
      x := m0 + dd - 1;
      continue when x < sd;
      exit when x > hoy;
      return next x;
    end loop;
  end if;
end $f$;

-- Devolución de una orden de boletos (boletos-despues.ts: anotarDevolucion + ejecutarDevolucion). por = buyer | event_cancelled | event_moved.
-- Comprador: cada boleto menos su cargo (que se queda To'Latino). Organizador (cancelar o mover): el 100 % y To'Latino cede su comisión.
create or replace function pg_temp.k20_devolver(p_op bigint, p_por text, p_at timestamptz, p_idem text, p_actor uuid) returns int language plpgsql as $f$
declare pay payments; t record; l record; rf bigint; total int := 0; monto int := 0; fee_orig int := 0; cargo int := 0; ext int := 0; st text; compr boolean := p_por = 'buyer'; n int; resto int; q int;
begin
  select * into pay from payments where operation_id = p_op and kind = 'full' for update;
  if not found or pay.status not in ('captured', 'partially_refunded') then return 0; end if;
  if exists (select 1 from refunds where idem_key = p_idem) then return 0; end if;
  select count(*), coalesce(sum(case when compr then greatest(0, price_cents - fee_cents) else price_cents end), 0) into n, total
    from tickets where operation_id = p_op and kind = 'paid' and status in ('valid', 'used');
  if n = 0 then return 0; end if;
  select coalesce(sum(line_total_cents), 0) into monto from operation_lines ol where ol.operation_id = p_op and ol.options->0->>'k' = 'a' and not exists (select 1 from ticket_refund_lines r where r.line_id = ol.id);
  if monto > 0 then
    select coalesce(sum(fee_cents), 0) into fee_orig from tickets where operation_id = p_op;
    cargo := greatest(0, least(monto, pay.fee_cents - fee_orig)); ext := case when compr then monto - cargo else monto end;
  end if;
  total := least(total + ext, pay.amount_cents - pay.refunded_cents);
  if total <= 0 then return 0; end if;
  insert into refunds (payment_id, amount_cents, reason, initiated_by, actor_id, status, idem_key, fee_absorbed_by, created_at)
  values (pay.id, total, case p_por when 'buyer' then 'El comprador canceló sus boletos' when 'event_moved' then 'Cambió de fecha: devolución total' else 'Evento cancelado' end, p_por, p_actor, 'pending', p_idem, 'platform', p_at) returning id into rf;
  for t in select id, price_cents, fee_cents from tickets where operation_id = p_op and kind = 'paid' and status in ('valid', 'used') order by id loop
    insert into ticket_refund_lines (refund_id, operation_id, ticket_id, city_id, amount_cents, fee_kept_cents, fee_waived_cents, created_at)
    values (rf, p_op, t.id, pay.city_id, case when compr then greatest(0, t.price_cents - t.fee_cents) else t.price_cents end, case when compr then least(t.fee_cents, t.price_cents) else 0 end, case when compr then 0 else t.fee_cents end, p_at);
  end loop;
  if monto > 0 then
    resto := cargo;
    for l in select id, line_total_cents as t from operation_lines x where x.operation_id = p_op and x.options->0->>'k' = 'a' and not exists (select 1 from ticket_refund_lines r where r.line_id = x.id) order by id loop
      q := least(resto, l.t); resto := resto - q;
      insert into ticket_refund_lines (refund_id, operation_id, line_id, city_id, amount_cents, fee_kept_cents, fee_waived_cents, created_at)
      values (rf, p_op, l.id, pay.city_id, case when compr then l.t - q else l.t end, case when compr then q else 0 end, case when compr then 0 else q end, p_at);
    end loop;
  end if;
  update tickets set status = 'refunded' where operation_id = p_op and kind = 'paid' and status in ('valid', 'used');
  insert into ticket_log (ticket_id, operation_id, city_id, kind, by_user, by_kind, reason, at)
  select id, operation_id, city_id, case when compr then 'cancelado' else 'devuelto' end, p_actor, case when compr then 'user' else 'business' end,
         case p_por when 'buyer' then 'El comprador canceló sus boletos' when 'event_moved' then 'Cambió de fecha: devolución total' else 'Evento cancelado' end, p_at from tickets where operation_id = p_op and kind = 'paid';
  insert into operation_events (operation_id, kind, actor, actor_id, note, at)
  select p_op, case when compr then 'tickets_cancelled' else 'tickets_refunded' end, case when compr then 'user' else 'business' end, p_actor::text,
         jsonb_build_object('es', n || ' ' || case when n = 1 then 'boleto' else 'boletos' end || ' · se devuelven $' || to_char(total / 100.0, 'FM999990.00'), 'en', n || ' ' || case when n = 1 then 'ticket' else 'tickets' end || ' · $' || to_char(total / 100.0, 'FM999990.00') || ' refunded'), p_at;
  update refunds set status = 'done', stripe_refund_id = 're_sim_k20_' || md5(p_idem), done_at = p_at + interval '40 seconds' where id = rf;
  update payments set refunded_cents = refunded_cents + total, status = case when refunded_cents + total >= amount_cents then 'refunded' else 'partially_refunded' end, updated_at = p_at
   where id = pay.id returning status into st;
  update operations set pay_status = st, updated_at = p_at where id = p_op;
  update sim_intents set refunded_cents = refunded_cents + total where id = pay.stripe_payment_intent;
  insert into operation_events (operation_id, kind, actor, note, at)
  values (p_op, 'refunded', 'system', jsonb_build_object('es', 'Devolución de $' || to_char(total / 100.0, 'FM999990.00') || ' a la tarjeta', 'en', '$' || to_char(total / 100.0, 'FM999990.00') || ' refunded to the card'), p_at + interval '40 seconds');
  return total;
end $f$;
`;

export const crear = (datos) => String.raw`
create temp table k20_u (idx int primary key, id uuid) on commit drop;
create temp table k20_ev (key text primary key, spec jsonb) on commit drop;
create temp table k20_map (key text primary key, id bigint not null) on commit drop;
create temp table k20_ord (n int primary key, spec jsonb) on commit drop;
create temp table k20_rsvp (n int primary key, spec jsonb) on commit drop;

insert into users (phone, phone_verified_at, first_name, last_name, home_city_id, lang, created_at)
select x->>'phone', now() - interval '2 years', x->>'first', x->>'last', x->>'city', x->>'lang', now() - make_interval(days => 120 + (x->>'idx')::int)
  from jsonb_array_elements($k20$${datos.compradores}$k20$::jsonb) x
on conflict (phone) do nothing;
insert into k20_u select (x->>'idx')::int, u.id from jsonb_array_elements($k20$${datos.compradores}$k20$::jsonb) x join users u on u.phone = x->>'phone';
insert into k20_ev select x->>'key', x from jsonb_array_elements($k20$${datos.eventos}$k20$::jsonb) x;
insert into k20_ord select (x->>'n')::int, x from jsonb_array_elements($k20$${datos.ordenes}$k20$::jsonb) x;
insert into k20_rsvp select (x->>'n')::int, x from jsonb_array_elements($k20$${datos.rsvps}$k20$::jsonb) x;
`;

/* A · los eventos */
export const BLOQUE_EVENTOS = String.raw`
do $k20a$
declare
  x jsonb; b record; adm uuid; eid bigint; hoy date; sd date; base date; tz text; y date; s timestamptz; f timestamptz; foto record; kind text; ts0 timestamptz; rep jsonb; dh jsonb; kk jsonb; h0 int; h1 int; dbefore int;
begin
  select m.user_id into adm from staff_members m join users u on u.id = m.user_id where m.role = 'admin' and m.status = 'active' and u.phone = '+15705550199' limit 1;
  if adm is null then select user_id into adm from staff_members where role = 'admin' and status = 'active' limit 1; end if;
  if adm is null then raise notice 'k20: no hay una persona del equipo que apruebe: no se crean eventos'; return; end if;
  -- Desde 0107 un evento sale solo si su negocio tiene el módulo Eventos encendido (como 0051).
  update businesses nb set modules_on = array(select distinct z from unnest(coalesce(nb.modules_on, '{}'::text[]) || array['eventos']) z), modules_off = coalesce(nb.modules_off, '{}'::jsonb) - 'eventos'
   where nb.id in (select distinct spec->>'biz' from k20_ev)
     and not ('eventos' = any(coalesce(nb.modules_on, '{}'::text[])) and not (coalesce(nb.modules_off, '{}'::jsonb) ? 'eventos'));
  for x in select spec from k20_ev order by key loop
    select bz.id, bz.city_id, bz.geo, bz.owner_user_id, c.timezone into b from businesses bz join cities c on c.id = bz.city_id where bz.id = x->>'biz' and bz.status = 'active';
    if not found then continue; end if;
    select e.id into eid from events e where e.business_id = b.id and e.title->>'es' = x->'ti'->>'es' order by e.id limit 1;
    if eid is not null then insert into k20_map values (x->>'key', eid) on conflict do nothing; continue; end if;
    tz := b.timezone; hoy := (now() at time zone tz)::date; kind := x->>'kind'; h0 := (x->>'h0')::int; h1 := (x->>'h1')::int;
    rep := null; dh := null;
    if kind = 'series' then
      base := hoy + (((x->>'dow')::int - extract(dow from hoy)::int + 7) % 7);
      sd := base + 7 * (x->>'wk')::int;
      rep := jsonb_build_object('k', x->'rep'->>'k', 'days', '[]'::jsonb, 'n', (x->'rep'->>'n')::int, 'skip', '[]'::jsonb);
    elsif kind = 'span' then
      sd := hoy + (x->>'d')::int; sd := sd + (((x->>'dow')::int - extract(dow from sd)::int + 7) % 7);
      dh := (select jsonb_agg(jsonb_build_object('h0', (v->>0)::int, 'h1', (v->>1)::int)) from jsonb_array_elements(x->'dh') v);
    else
      sd := hoy + (x->>'d')::int;
    end if;
    ts0 := now() - make_interval(days => (x->>'cre')::int);
    insert into events (slug, city_id, business_id, format, title, description, genres, min_age, id_required, dress_code, kids, food_paid_at_venue, before_you_go, venue_mode, venue_name, venue_address, geom,
                        kind, start_date, start_min, end_min, doors_before_min, rep, span_days, day_hours, day_cap, entry, rsvp_capacity, party_max, tickets_cfg, tables_cfg, addons_cfg,
                        status, submitted_at, approved_at, approved_by, reviewed_at, reviewed_by, created_by, created_at)
    values ('', b.city_id, b.id, x->>'fmt', x->'ti', coalesce(x->'desc', '{"es":"","en":""}'), array(select jsonb_array_elements_text(coalesce(x->'gen', '[]'))), (x->>'age')::smallint, (x->>'age')::int > 0,
            nullif(x->'dress', 'null'::jsonb), nullif(x->>'kids', ''), coalesce((x->>'payAt')::boolean, false), coalesce(x->'before', '[]'),
            case when x ? 'venue' then 'other' else 'own' end, x->>'venue', x->>'addr', b.geo,
            kind, sd, h0, h1, (x->>'door')::smallint, rep, case when kind = 'span' then (x->>'span')::smallint else 1 end, dh, coalesce((x->>'dayCap')::int, 0), x->>'entry',
            coalesce((x->>'cap')::int, 0), coalesce((x->>'party')::smallint, 1), coalesce(x->'tks', '[]'), coalesce(x->'mesas', '[]'), coalesce(x->'adds', '[]'),
            'live', ts0, ts0 + interval '3 hours', adm, ts0 + interval '3 hours', adm, b.owner_user_id, ts0)
    returning id into eid;
    insert into k20_map values (x->>'key', eid);
    insert into event_lineup (event_id, at_min, who, role, sort)
    select eid, (l->>'h')::smallint, left(l->>'who', 60), l->'role', (o - 1)::smallint from jsonb_array_elements(coalesce(x->'lu', '[]')) with ordinality as t (l, o);
    select url, w, h into foto from media where owner_kind = 'business' and owner_id = b.id and status = 'visible' order by sort, created_at limit 1;
    if found then insert into media (owner_kind, owner_id, url, w, h, status, sort, uploaded_by) values ('event', eid::text, foto.url, foto.w, foto.h, 'visible', 0, b.owner_user_id); end if;
    -- Las fechas de atrás de una serie (la base solo crea las que vienen): una fila por fecha que ya terminó.
    if kind = 'series' then
      for y in select * from pg_temp.k20_pasados(sd, rep, hoy) loop
        s := (y::timestamp + make_interval(mins => h0)) at time zone tz; f := (y::timestamp + make_interval(mins => h1)) at time zone tz;
        exit when f > now();
        insert into event_dates (event_id, city_id, starts_at, ends_at, doors_at, local_date, day_index, geom, serie_dia)
        values (eid, b.city_id, s, f, s - make_interval(mins => (x->>'door')::int), y, 0, b.geo, y) on conflict do nothing;
      end loop;
    end if;
    perform evt_sincronizar_fechas(eid);
    -- Preventa: la venta de ese boleto cierra N días antes de la fecha (ticket_types.sales_end_at, 0108).
    if coalesce((x->>'eb')::int, 0) > 0 and kind = 'single' then
      update ticket_types t set sales_end_at = (select min(d.starts_at) from event_dates d where d.event_id = eid) - make_interval(days => (x->>'eb')::int) where t.event_id = eid and t.cfg_key = 'pre';
    end if;
    for kk in select value from jsonb_array_elements(coalesce(x->'codes', '[]')) loop
      insert into discount_codes (event_id, city_id, business_id, code, kind, value, uses_max, created_by) values (eid, b.city_id, b.id, kk->>'code', kk->>'kind', (kk->>'value')::int, (kk->>'max')::int, b.owner_user_id) on conflict (event_id, code) do nothing;
    end loop;
    insert into event_review_log (event_id, city_id, version, decision, by_user, by_kind, snapshot, at)
    values (eid, b.city_id, 1, 'submitted', b.owner_user_id, 'business', jsonb_build_object('title', x->'ti', 'status', 'review'), ts0),
           (eid, b.city_id, 1, 'approved', adm, 'staff', jsonb_build_object('title', x->'ti', 'status', 'live'), ts0 + interval '3 hours');
  end loop;
end $k20a$;
`;

/* B · las órdenes (como boletos.ts) */
export const BLOQUE_ORDENES = String.raw`
do $k20b$
declare
  r record; o jsonb; e events; d event_dates; u uuid; k uuid; eid bigint; op bigint; ts timestamptz; tt ticket_types; mt event_tables; ad event_addons; dc discount_codes; x jsonb; ak text;
  fr record; nT int; subTk int; subM int := 0; subA int := 0; sub int; descu int := 0; total int; restoD int; ix int; dsc int; pag int; f int; fee int; q int; se timestamptz; pi text; card int; tc timestamptz; city text;
  cards text[][] := array[array['visa','4242'], array['mc','4444'], array['visa','1881'], array['amex','0005'], array['mc','5100'], array['visa','0077']];
  creados int := 0;
begin
  select rate_bp, fixed_cents into fr from fee_rules where kind = 'bol' and effective_from <= now() order by effective_from desc, id desc limit 1;
  for r in select n, spec from k20_ord order by n loop
    o := r.spec;
    select m.id into eid from k20_map m where m.key = o->>'e';
    continue when eid is null;
    select * into e from events where id = eid;
    if e.kind = 'span' then select * into d from event_dates where id = evt_ancla(eid);
    else select * into d from event_dates where event_id = eid and status in ('scheduled', 'done') order by starts_at offset (o->>'d')::int limit 1; end if;
    continue when d.id is null;
    select id into u from k20_u where idx = (o->>'u')::int;
    continue when u is null;
    k := md5('k20ord:' || (o->>'e') || ':' || (o->>'i'))::uuid;
    continue when exists (select 1 from operations where (user_id = u and client_key = k) or number = 'B-' || (40000000 + r.n));
    -- Totales como el apartado: el descuento baja los boletos (no la mesa ni los extras) y nunca deja un boleto en menos de $2.
    select coalesce(sum(t.price_cents * (z->>1)::int), 0), coalesce(sum((z->>1)::int), 0) into subTk, nT from jsonb_array_elements(o->'t') z join ticket_types t on t.event_id = eid and t.cfg_key = z->>0;
    subM := 0; subA := 0; descu := 0;
    if o->>'m' is not null then select * into mt from event_tables where event_id = eid and cfg_key = o->>'m'; subM := mt.deposit_cents; end if;
    select coalesce(sum(a.price_cents), 0) into subA from jsonb_array_elements_text(coalesce(o->'a', '[]')) z join event_addons a on a.event_id = eid and a.cfg_key = z;
    if o->>'c' is not null then
      select * into dc from discount_codes where event_id = eid and code = o->>'c';
      if dc.id is not null and dc.used_n + dc.held_n < dc.uses_max then descu := greatest(0, least(case when dc.kind = 'pct' then round(subTk * dc.value / 100.0)::int else dc.value end, subTk - 200 * nT)); end if;
    end if;
    sub := subTk + subM + subA; total := sub - descu;
    continue when total <= 0;
    -- La hora de la compra: antes de la fecha (o de hoy), después de publicado y, si hay preventa, antes de que cierre.
    ts := least(d.starts_at, now()) - make_interval(hours => (o->>'ago')::int);
    select min(t.sales_end_at) into se from jsonb_array_elements(o->'t') z join ticket_types t on t.event_id = eid and t.cfg_key = z->>0 where t.sales_end_at is not null;
    if se is not null and ts > se - interval '1 hour' then ts := se - make_interval(mins => 60 + (r.n % 700)); end if;
    ts := greatest(ts, e.created_at + interval '1 hour' + make_interval(mins => r.n % 50));
    ts := least(ts, now() - interval '3 minutes' - make_interval(mins => r.n % 40));
    select c.timezone into city from cities c where c.id = d.city_id;
    insert into operations (number, kind, city_id, business_id, user_id, status, details, subtotal_cents, discount_cents, total_cents, pay_mode, sent_at, confirmed_at, client_key, is_test, pay_status, updated_at)
    values ('B-' || (40000000 + r.n), 'tickets', d.city_id, e.business_id, u, 'confirmed',
            jsonb_build_object('event_id', eid::text, 'event_date_id', d.id::text, 'title', e.title, 'venue', coalesce(e.venue_name, (select name from businesses where id = e.business_id)), 'local_date', d.local_date::text,
                               'h0', (extract(hour from d.starts_at at time zone city) * 60 + extract(minute from d.starts_at at time zone city))::int),
            sub, descu, total, 'app', ts, ts, k, true, 'captured', ts) returning id into op;
    fee := 0; ix := 0; restoD := descu;
    for x in select value from jsonb_array_elements(o->'t') loop
      select * into tt from ticket_types where event_id = eid and cfg_key = x->>0;
      q := (x->>1)::int;
      insert into operation_lines (operation_id, item_id, name, qty, unit_price_cents, line_total_cents, tax_pct, options) values (op, null, tt.name, q, tt.price_cents, tt.price_cents * q, 0, jsonb_build_array(jsonb_build_object('k', 't', 'id', tt.id::text)));
      update ticket_stock set sold_n = sold_n + q, updated_at = ts where ticket_type_id = tt.id and event_date_id = d.id;
      for i in 1 .. q loop
        ix := ix + 1;
        dsc := case when ix = nT then restoD else least(restoD, floor(descu * tt.price_cents / greatest(1, subTk))::int) end; restoD := restoD - dsc;
        pag := tt.price_cents - dsc; f := least(round(pag * fr.rate_bp / 10000.0)::int + fr.fixed_cents, pag); fee := fee + f;
        insert into tickets (event_date_id, event_id, city_id, ticket_type_id, operation_id, holder_user_id, holder_name, admits, kind, price_cents, fee_cents, discount_cents)
        values (d.id, eid, d.city_id, tt.id, op, u, left(o->'nm'->>(ix - 1), 40), 1, 'paid', pag, f, dsc);
      end loop;
    end loop;
    if mt.id is not null and o->>'m' is not null then
      insert into operation_lines (operation_id, item_id, name, qty, unit_price_cents, line_total_cents, tax_pct, options) values (op, null, mt.zone, 1, mt.deposit_cents, mt.deposit_cents, 0, jsonb_build_array(jsonb_build_object('k', 'm', 'id', mt.id::text)));
      update table_stock set sold_n = sold_n + 1, updated_at = ts where table_id = mt.id and event_date_id = d.id;
      f := least(round(mt.deposit_cents * fr.rate_bp / 10000.0)::int + fr.fixed_cents, mt.deposit_cents); fee := fee + f;
      insert into tickets (event_date_id, event_id, city_id, table_id, operation_id, holder_user_id, holder_name, admits, kind, price_cents, fee_cents)
      values (d.id, eid, d.city_id, mt.id, op, u, left(o->'nm'->>nT, 40), mt.seats, 'paid', mt.deposit_cents, f);
    end if;
    for ak in select value from jsonb_array_elements_text(coalesce(o->'a', '[]')) loop
      select * into ad from event_addons where event_id = eid and cfg_key = ak;
      insert into operation_lines (operation_id, item_id, name, qty, unit_price_cents, line_total_cents, tax_pct, options) values (op, null, ad.name, 1, ad.price_cents, ad.price_cents, 0, jsonb_build_array(jsonb_build_object('k', 'a', 'id', ad.id::text)));
      update event_addons set sold_n = sold_n + 1, updated_at = ts where id = ad.id;
    end loop;
    if subA > 0 then fee := fee + least(round(subA * fr.rate_bp / 10000.0)::int, subA); end if;
    if descu > 0 then update discount_codes set used_n = used_n + 1, updated_at = ts where id = dc.id; end if;
    card := 1 + ((o->>'u')::int + r.n) % 6;
    pi := 'pi_sim_k20_' || replace(k::text, '-', '');
    insert into sim_intents (id, amount_cents, fee_cents, destination, status, captured_cents, card, created_at) values (pi, total, 0, 'tolatino', 'succeeded', total, 'pm_sim_' || cards[card][1] || '_' || cards[card][2], ts) on conflict (id) do nothing;
    insert into payments (operation_id, user_id, business_id, city_id, kind, method, stripe_payment_intent, amount_cents, held_cents, fee_cents, status, card_brand, card_last4, held_at, captured_at, simulated, payment_method, transfer_group, created_at, updated_at)
    values (op, u, e.business_id, d.city_id, 'full', 'card', pi, total, total, least(fee, total), 'captured', cards[card][1], cards[card][2], ts, ts + interval '4 seconds', true, 'pm_sim_' || cards[card][1] || '_' || cards[card][2], 'evt-' || eid, ts, ts);
    insert into ticket_log (ticket_id, operation_id, city_id, kind, by_user, by_kind, at) select id, operation_id, city_id, 'emitido', u, 'user', ts from tickets where operation_id = op;
    insert into operation_events (operation_id, kind, actor, actor_id, at) values (op, 'tickets_sold', 'user', u::text, ts);
    insert into operation_events (operation_id, kind, actor, note, at) values (op, 'payment_captured', 'system', jsonb_build_object('es', 'Se cobraron ' || to_char(total / 100.0, 'FM999990.00') || ' dólares', 'en', to_char(total / 100.0, 'FM999990.00') || ' dollars charged'), ts + interval '4 seconds');
    -- El comprador cancela solo (hasta 24 h antes): cada boleto menos su cargo.
    if o->>'x' = 'b' then
      tc := ts + make_interval(hours => 3 + r.n % 30);
      if tc < d.starts_at - interval '25 hours' and tc < now() - interval '10 minutes' then perform pg_temp.k20_devolver(op, 'buyer', tc, 'bolcx-' || md5(k::text), u); end if;
    end if;
    creados := creados + 1;
  end loop;
  raise notice 'k20: % órdenes nuevas', creados;
end $k20b$;
`;

/* C · cancelados y pospuestos (evt-cambios.ts) */
export const BLOQUE_CAMBIOS = String.raw`
do $k20c$
declare
  r record; x jsonb; e events; d event_dates; ch bigint; cx bigint; at_ts timestamptz; op record; n int; tot int; dev int; costo int; why text; nota text; nd date; nstart timestamptz; nend timestamptz; ndoor timestamptz; tz text; old record;
  cho text; mot text;
begin
  for r in select m.key, m.id, k.spec from k20_map m join k20_ev k on k.key = m.key where (k.spec ? 'cancel' or k.spec ? 'move') order by m.key loop
    x := r.spec;
    select * into e from events where id = r.id;
    select c.timezone into tz from cities c where c.id = e.city_id;
    if x ? 'cancel' then
      continue when e.status <> 'live';
      select * into d from event_dates where event_id = e.id and status = 'scheduled' order by starts_at limit 1;
      continue when d.id is null;
      at_ts := least(d.starts_at, now()) - make_interval(hours => (x->'cancel'->>'hb')::int); at_ts := least(at_ts, now() - interval '20 minutes');
      why := x->'cancel'->>'why';
      nota := case why when 'clima' then 'Tormenta anunciada para esa noche: cuidamos a nuestro público.' when 'artista' then 'El artista no pudo viajar: lo sentimos mucho.' when 'planes' then 'Cambio de planes del organizador.' else 'El local no está disponible esa fecha.' end;
      insert into event_changes (event_id, event_date_id, city_id, kind, reason_key, note, by_user, by_kind, at) values (e.id, null, e.city_id, 'cancelled', why, nota, e.created_by, 'business', at_ts) returning id into ch;
      insert into event_cancellations (event_id, event_date_id, business_id, city_id, scope, change_id, reason_key, note, by_user, by_kind) values (e.id, null, e.business_id, e.city_id, 'event', ch, why, nota, e.created_by, 'business') returning id into cx;
      update event_dates set status = 'cancelled', cancel_reason = case why when 'clima' then 'Clima' when 'artista' then 'El artista no puede' when 'planes' then 'Cambio de planes' else 'El local' end where event_id = e.id and status = 'scheduled';
      update events set status = 'cancelled', cancelled_at = at_ts, cancelled_by = 'business', cancel_reason = left(case why when 'clima' then 'Clima' when 'artista' then 'El artista no puede' when 'planes' then 'Cambio de planes' else 'El local' end || ' · ' || nota, 500) where id = e.id;
      n := 0; tot := 0; costo := 0;
      for op in select o.id from operations o where o.kind = 'tickets' and o.status = 'confirmed' and (o.details->>'event_id')::bigint = e.id order by o.id loop
        dev := pg_temp.k20_devolver(op.id, 'event_cancelled', at_ts + make_interval(secs => 20 + n * 3), 'evtcx-' || cx || '-' || op.id, e.created_by);
        if dev > 0 then n := n + 1; tot := tot + dev; costo := costo + round(dev * 0.029)::int + 30; end if;
      end loop;
      update event_cancellations set orders_n = n, refunded_cents = tot, card_cost_cents = costo where id = cx;
      update event_cancellations set status = 'done' where id = cx;
      update waitlist set status = 'left', updated_at = at_ts where event_id = e.id and status in ('waiting', 'offered');
    elsif x ? 'move' then
      continue when e.status <> 'live' or exists (select 1 from event_changes where event_id = e.id and kind = 'moved');
      select * into d from event_dates where event_id = e.id and status = 'scheduled' order by starts_at limit 1;
      continue when d.id is null or d.starts_at < now() + interval '3 days';
      at_ts := least(d.starts_at, now()) - make_interval(hours => (x->'move'->>'hb')::int); at_ts := least(at_ts, now() - interval '20 minutes');
      nd := d.local_date + (x->'move'->>'dias')::int;
      nstart := (nd::timestamp + make_interval(mins => e.start_min)) at time zone tz; nend := (nd::timestamp + make_interval(mins => e.end_min)) at time zone tz; ndoor := nstart - make_interval(mins => e.doors_before_min);
      update event_dates set starts_at = nstart, ends_at = nend, doors_at = ndoor, local_date = nd where id = d.id;
      update events set start_date = nd where id = e.id and kind = 'single';
      insert into event_changes (event_id, event_date_id, city_id, kind, before, after, by_user, by_kind, at)
      values (e.id, d.id, e.city_id, 'moved', jsonb_build_object('dia', d.local_date::text, 'h0', e.start_min, 'h1', e.end_min), jsonb_build_object('dia', nd::text, 'h0', e.start_min, 'h1', e.end_min), e.created_by, 'business', at_ts) returning id into ch;
      n := 0;
      for op in select o.id, o.user_id, o.sent_at from operations o where o.kind = 'tickets' and o.status = 'confirmed' and (o.details->>'event_date_id')::bigint = d.id order by o.id loop
        n := n + 1;
        -- «Me quedo con la nueva fecha» (la mayoría) o «Devolución total» (algunos); el resto no contesta y se queda.
        if n % 7 = 0 then
          dev := pg_temp.k20_devolver(op.id, 'event_moved', at_ts + make_interval(hours => 2 + n % 20), 'evtmv-' || ch || '-' || op.id, op.user_id);
          insert into ticket_choices (operation_id, change_id, user_id, city_id, choice, refund_id, at)
          select op.id, ch, op.user_id, e.city_id, 'refund', (select max(rf.id) from refunds rf join payments p on p.id = rf.payment_id where p.operation_id = op.id and rf.idem_key = 'evtmv-' || ch || '-' || op.id), at_ts + make_interval(hours => 2 + n % 20) where dev > 0;
        elsif n % 3 = 0 then
          insert into ticket_choices (operation_id, change_id, user_id, city_id, choice, at) values (op.id, ch, op.user_id, e.city_id, 'keep', at_ts + make_interval(hours => 1 + n % 30));
        end if;
      end loop;
    end if;
  end loop;
end $k20c$;
`;

/* D · la puerta de las fechas que ya pasaron (puerta_entrada / puerta_rsvp), y RSVP */
export const BLOQUE_PUERTA = String.raw`
do $k20d$
declare
  r record; x jsonb; e events; d event_dates; sid bigint; u uuid; t record; rv record; sc ticket_scans; at_dev timestamptz; mins int; dur int; ord0 timestamptz; fin0 timestamptz; door0 timestamptz; est0 text; tz text;
  nsc int; fid bigint; occ int; k1 int;
begin
  -- 1) RSVP de las fechas que vienen (como rsvps_antes lo pide: la fecha publicada y antes del cierre).
  for r in select p.n, p.spec from k20_rsvp p order by p.n loop
    x := r.spec;
    select m.id into fid from k20_map m where m.key = x->>'e'; continue when fid is null;
    select * into e from events where id = fid; continue when e.status <> 'live' or e.entry <> 'rsvp';
    select * into d from event_dates where event_id = fid and status in ('scheduled', 'done') order by starts_at offset (x->>'d')::int limit 1;
    continue when d.id is null;
    select id into u from k20_u where idx = (x->>'u')::int; continue when u is null;
    continue when exists (select 1 from rsvps where event_date_id = d.id and user_id = u);
    continue when d.ends_at <= now();  -- las de fechas pasadas van en el paso 2
    continue when now() >= d.doors_at + make_interval(mins => cfg_int('rsvp_guarda_min'));
    continue when e.rsvp_capacity > 0 and d.rsvp_n + (x->>'p')::int > e.rsvp_capacity;
    insert into rsvps (event_date_id, event_id, city_id, user_id, party, status, hold_until, door_code) values (d.id, e.id, d.city_id, u, (x->>'p')::smallint, 'going', now(), '');
  end loop;
  -- 2) Fechas ya terminadas con gente: se abre la puerta (la fecha se acerca a «ahora» solo mientras dura; la base exige que la puerta esté dentro de su ventana) y se escanea.
  for d in select dd.* from event_dates dd join events ev on ev.id = dd.event_id where ev.id in (select id from k20_map) and ev.status = 'live' and dd.status in ('scheduled', 'done') and dd.ends_at < now() - interval '1 hour'
              and (exists (select 1 from tickets tq where tq.event_date_id = dd.id or (ev.kind = 'span' and tq.event_id = ev.id)) or exists (select 1 from k20_rsvp p join k20_map m on m.key = p.spec->>'e' where m.id = ev.id))
              and not exists (select 1 from ticket_scans s where s.event_date_id = dd.id)
            order by dd.starts_at, dd.id loop
    select * into e from events where id = d.event_id;
    select c.timezone into tz from cities c where c.id = d.city_id;
    ord0 := d.starts_at; fin0 := d.ends_at; door0 := d.doors_at; est0 := d.status;
    occ := (select count(*) from event_dates z where z.event_id = e.id and z.status in ('scheduled', 'done') and z.starts_at < ord0)::int;
    dur := greatest(30, extract(epoch from fin0 - ord0)::int / 60);
    select m.user_id into u from business_members m where m.business_id = e.business_id and m.kind = 'owner' and m.status = 'active' limit 1;
    continue when u is null;
    -- RSVP de esa fecha (pasada): se anotan con la fecha abierta y se marcan al llegar.
    update event_dates set starts_at = now() + interval '10 minutes', doors_at = now() - interval '5 minutes', ends_at = now() + interval '4 hours' where id = d.id;
    if e.entry = 'rsvp' then
      for r in select p.n, p.spec from k20_rsvp p join k20_map m on m.key = p.spec->>'e' where m.id = e.id order by p.n loop
        x := r.spec;
        continue when (x->>'d')::int <> occ;
        select id into u from k20_u where idx = (x->>'u')::int; continue when u is null;
        continue when exists (select 1 from rsvps where event_date_id = d.id and user_id = u);
        continue when e.rsvp_capacity > 0 and (select rsvp_n from event_dates where id = d.id) + (x->>'p')::int > e.rsvp_capacity;
        insert into rsvps (event_date_id, event_id, city_id, user_id, party, status, hold_until, door_code) values (d.id, e.id, d.city_id, u, (x->>'p')::smallint, 'going', now(), '');
      end loop;
    end if;
    select m.user_id into u from business_members m where m.business_id = e.business_id and m.kind = 'owner' and m.status = 'active' limit 1;
    insert into door_sessions (event_date_id, event_id, business_id, city_id, member_user_id, user_id, door_name) values (d.id, e.id, e.business_id, d.city_id, u, u, 'Puerta principal') returning id into sid;
    nsc := 0;
    perform set_config('tl.puerta', 'si', true);
    -- Boletos de esta fecha (en un varios días, los que valen ese día) · asiste ~88 %, las mesas a veces entran en dos tandas, unos pocos intentan pasar dos veces.
    -- Como puerta_entrada, pero escribiendo el escaneo (la base deriva puerta y fecha con ticket_scans_despues): puerta_entrada toma un candado por escaneo
    -- que dura toda la transacción, y esta semilla corre en una sola.
    for t in select tk.id, tk.code, tk.admits, tk.table_id from tickets tk
              where tk.status in ('valid', 'used') and tk.kind = 'paid'
                and ((e.kind = 'span' and tk.event_id = e.id and d.day_index = any(tk.valid_days)) or (e.kind <> 'span' and tk.event_date_id = d.id)) order by tk.id loop
      continue when (t.id * 7919) % 100 >= 88;
      mins := ((t.id * 37) % greatest(1, dur * 6 / 10))::int;
      at_dev := door0 + make_interval(mins => 5 + mins);
      k1 := case when t.table_id is not null and t.admits > 2 and (t.id % 3) = 0 then t.admits - 1 else t.admits end;
      insert into ticket_entries (ticket_id, event_date_id, city_id, admits, entered_n, inside_n, first_at, first_door, last_at, last_door)
      values (t.id, d.id, d.city_id, t.admits, t.admits, t.admits, at_dev, 'Puerta principal', case when k1 < t.admits then at_dev + interval '25 minutes' else at_dev end, 'Puerta principal');
      insert into ticket_scans (id, event_date_id, event_id, city_id, session_id, user_id, door_name, ticket_id, kind, direction, admits_n, first_n, result, at_device, offline, resolution)
      values (md5('k20scan:' || t.id || ':' || d.id || ':1')::uuid, d.id, e.id, d.city_id, sid, u, 'Puerta principal', t.id, 'ticket', 'in', k1, k1, 'valid', at_dev, true, 'accepted');
      if k1 < t.admits then
        insert into ticket_scans (id, event_date_id, event_id, city_id, session_id, user_id, door_name, ticket_id, kind, direction, admits_n, first_n, result, at_device, offline, resolution)
        values (md5('k20scan:' || t.id || ':' || d.id || ':2')::uuid, d.id, e.id, d.city_id, sid, u, 'Puerta principal', t.id, 'ticket', 'in', t.admits - k1, t.admits - k1, 'valid', at_dev + interval '25 minutes', true, 'accepted');
      elsif (t.id % 29) = 0 then
        insert into ticket_scans (id, event_date_id, event_id, city_id, session_id, user_id, door_name, ticket_id, kind, direction, admits_n, first_n, result, at_device, offline, resolution)
        values (md5('k20scan:' || t.id || ':' || d.id || ':dup')::uuid, d.id, e.id, d.city_id, sid, u, 'Puerta principal', t.id, 'ticket', 'in', 0, 0, 'already_used', at_dev + interval '40 minutes', true, 'rejected');
      end if;
      update tickets set status = 'used' where id = t.id and status = 'valid';
      nsc := nsc + 1;
    end loop;
    -- Un código que no existe (alguien intentó entrar con una captura vieja).
    if nsc > 12 then
      insert into ticket_scans (id, event_date_id, event_id, city_id, session_id, user_id, door_name, code_hash, kind, direction, admits_n, first_n, result, at_device, offline, resolution)
      values (md5('k20scan:desconocido:' || d.id)::uuid, d.id, e.id, d.city_id, sid, u, 'Puerta principal', encode(sha256(convert_to('TL-ZZZ-2222-' || d.id, 'UTF8')), 'hex'), 'unknown', 'in', 0, 0, 'not_found', door0 + interval '70 minutes', true, 'rejected');
    end if;
    -- RSVP: llegan ~80 % (a veces menos de los que dijeron); el resto no llegó (vence) y unos cancelaron.
    for rv in select v.id, v.party from rsvps v where v.event_date_id = d.id and v.status = 'going' order by v.id loop
      if (rv.id * 31) % 100 < 80 then
        k1 := case when (rv.id % 5) = 0 and rv.party > 1 then rv.party - 1 else rv.party end;
        insert into ticket_scans (id, event_date_id, event_id, city_id, session_id, user_id, door_name, rsvp_id, kind, direction, admits_n, first_n, result, at_device, offline, resolution)
        values (md5('k20rsvp:' || rv.id)::uuid, d.id, e.id, d.city_id, sid, u, 'Puerta principal', rv.id, 'rsvp', 'in', k1, k1, 'valid', door0 + make_interval(mins => (10 + (rv.id * 13) % greatest(1, dur * 6 / 10))::int), true, 'accepted');
        update rsvps set arrived_n = k1, status = 'attended' where id = rv.id;
      elsif (rv.id * 31) % 100 < 90 then update rsvps set status = 'cancelled' where id = rv.id;
      else update rsvps set status = 'expired' where id = rv.id; end if;
    end loop;
    perform set_config('tl.puerta', '', true);
    update door_sessions set ended_at = now(), ended_by = 'business' where id = sid and ended_at is null;
    -- La fecha vuelve a su hora de verdad.
    update event_dates set starts_at = ord0, ends_at = fin0, doors_at = door0 where id = d.id;
  end loop;
end $k20d$;
`;

/* E · lista de espera, patrocinios, liquidaciones y fechas pasadas de series */
export const BLOQUE_FINAL = String.raw`
do $k20e$
declare
  r record; x jsonb; e events; d event_dates; u uuid; pid bigint; sid bigint; dur text; precio int; ini timestamptz; fin timestamptz; payer uuid; pi text; k int := 0;
begin
  -- Lista de espera de lo agotado que viene (waitlist: solo quien quiere ir y ya no hay lugar).
  for r in select m.key, m.id, k.spec from k20_map m join k20_ev k on k.key = m.key where (k.spec->>'wl') = 'true' order by m.key loop
    select * into e from events where id = r.id; continue when e.status <> 'live';
    select * into d from event_dates where event_id = e.id and status = 'scheduled' and starts_at > now() + interval '2 days' order by starts_at limit 1; continue when d.id is null;
    for k in 1 .. 4 loop
      select id into u from k20_u where idx = (case e.city_id when 'hzl' then 0 when 'alw' then 100 when 'wbr' then 200 when 'scr' then 300 else 400 end) + 90 + k;
      continue when u is null or exists (select 1 from waitlist where event_date_id = d.id and user_id = u);
      insert into waitlist (event_date_id, event_id, city_id, user_id, party) values (d.id, e.id, d.city_id, u, 1 + (k % 3));
    end loop;
  end loop;
  -- Patrocinios de eventos (C-003): un cobro simulado por patrocinio; semana, mes o hasta el evento, uno ya terminado.
  for r in select m.key, m.id, k.spec from k20_map m join k20_ev k on k.key = m.key where (k.spec->>'spons') = 'true' order by m.key loop
    select * into e from events where id = r.id; continue when e.status <> 'live';
    continue when exists (select 1 from event_sponsorships where event_id = e.id);
    select m.user_id into payer from business_members m where m.business_id = e.business_id and m.kind = 'owner' and m.status = 'active' limit 1; continue when payer is null;
    select * into d from event_dates where event_id = e.id and listable and ends_at > now() order by starts_at limit 1; continue when d.id is null;
    k := k + 1;
    dur := case when k % 3 = 0 then 'month' else 'week' end;
    precio := case dur when 'month' then cfg_int('patrocinio_evt_mes_cents') else cfg_int('patrocinio_evt_semana_cents') end;
    ini := now() - make_interval(days => k % 4); fin := ini + case dur when 'month' then interval '30 days' else interval '7 days' end;
    begin
      insert into event_sponsorships (event_id, business_id, city_id, starts_at, ends_at, duration, status, price_cents, payer_user_id, card_pm, created_at) values (e.id, e.business_id, e.city_id, ini, fin, dur, 'activo', precio, payer, 'pm_sim_visa_4242', ini) returning id into sid;
      pi := 'pi_sim_k20_pat_' || sid;
      insert into sponsorship_payments (kind, ref_id, business_id, city_id, payer_user_id, amount_cents, pi, idem_key, card_brand, card_last4, reason, created_at)
      values ('evento', sid, e.business_id, e.city_id, payer, precio, pi, 'pat-evento-' || e.id || '-k20', 'visa', '4242', 'compra', ini);
    exception when others then raise notice 'k20: patrocinio omitido (%): %', e.id, sqlerrm; end;
  end loop;
  -- Liquidaciones de las fechas ya terminadas con cobros (crearLiquidaciones: una por fecha; una fecha cancelada, solo con su cancelación hecha).
  insert into event_settlements (event_date_id)
  select dx.id from event_dates dx join events ex on ex.id = dx.event_id
   where ex.id in (select id from k20_map) and dx.ends_at < now() and dx.ends_at > now() - interval '180 days' and not exists (select 1 from event_settlements s where s.event_date_id = dx.id)
     and exists (select 1 from operations o join payments p on p.operation_id = o.id and p.kind = 'full' and p.transfer_group is not null
                  where o.kind = 'tickets' and (o.details->>'event_date_id')::bigint = dx.id and p.status in ('captured', 'partially_refunded', 'refunded'))
     and (not (dx.status = 'cancelled' or ex.status = 'cancelled') or exists (select 1 from event_cancellations cx where cx.event_id = ex.id and (cx.event_date_id is null or cx.event_date_id = dx.id) and cx.status = 'done'))
   order by dx.ends_at on conflict (event_date_id) do nothing;
  -- Las fechas de una serie que ya pasaron quedan 'done' (evt_extender_series, el barrido de la app).
  update event_dates dy set status = 'done' from events ey where ey.id = dy.event_id and ey.kind = 'series' and ey.id in (select id from k20_map) and dy.status = 'scheduled' and dy.ends_at < now() - interval '12 hours';
end $k20e$;
`;

export const PIE = `
commit;
`;
