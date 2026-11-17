/* Eventos gratis / RSVP · SQL. Todo con las funciones y tablas de la propia app: el evento se inserta como 0035 (en vivo, aprobado por una persona
   del equipo, con su bitácora de revisión y su cartel), las fechas las genera la base (evt_sincronizar_fechas), los RSVP entran por la tabla rsvps
   con sus disparadores (cupo, personas, derivados rsvp_n / going_n) y la asistencia la marca «la puerta» (tl.puerta = 'si', como en 0112/0113).
   Lo que la base no deja hacer a mano se respeta:
     · rsvps_antes exige que el RSVP se haga antes de la hora de puertas + rsvp_guarda_min: para fechas ya pasadas (o de hoy) la fecha se mueve un
       momento a un horario de marcador (hoy + 400 días), entran los RSVP y la fecha vuelve a su hora real; hold_until se corrige después.
     · Un RSVP se crea con created_at = now(): no se puede fechar en el pasado (el disparador lo fija); la fecha del evento sí es la real.
   Idempotente: un evento ya existe si hay uno con el mismo título en la ciudad; entonces no se toca nada. */

export const FUNCIONES = String.raw`
-- Organizador: entre los negocios activos de la ciudad y categoría (con las subcategorías que encajan, si las hay), uno estable por «off».
create or replace function pg_temp.eg_org(ciudad text, cat text, subs text[], off int) returns text language plpgsql as $f$
declare ids text[];
begin
  ids := array(select b.id from businesses b where b.city_id = ciudad and b.category_id = 'NEG-' || cat and b.status = 'active'
                 and cardinality(subs) > 0 and b.subcategory_ids && subs order by md5(b.id));
  if cardinality(ids) = 0 then
    ids := array(select b.id from businesses b where b.city_id = ciudad and b.category_id = 'NEG-' || cat and b.status = 'active' order by md5(b.id));
  end if;
  if cardinality(ids) = 0 then return null; end if;
  return ids[1 + off % cardinality(ids)];
end $f$;

-- Código de puerta de 6 caracteres (alfabeto de la app, sin I, O, 0 ni 1), estable por semilla.
create or replace function pg_temp.eg_code(seed text) returns text language sql immutable as $f$
  select translate(upper(substr(md5(seed), 1, 6)), '01', 'GH')
$f$;

-- RSVP, lista de espera y asistencia de las fechas de un evento.
create or replace function pg_temp.eg_fill(eid bigint, x jsonb, pool uuid[], hoy date) returns void language plpgsql as $f$
declare
  e events; dr event_dates; ended boolean; up int := 0; lead int; ex int; cap int; pm int; h int; base numeric; ratio numeric; tgt int; tot int; i int; j int;
  n int := cardinality(pool); pos int; uid uuid; p int; llena boolean; nwl int; r record; rr int; ph timestamptz; ent int; k text := x->>'k'; guarda int := cfg_int('rsvp_guarda_min');
begin
  select * into e from events where id = eid;
  if n = 0 then return; end if;
  cap := e.rsvp_capacity; pm := e.party_max; ex := coalesce((x->>'ex')::int, 60);
  for dr in select * from event_dates where event_id = eid and status = 'scheduled' order by starts_at loop
    ended := dr.ends_at < now();
    if not ended then up := up + 1; end if;
    lead := dr.local_date - hoy;
    h := abs(hashtext(k || dr.local_date::text));
    if e.entry = 'rsvp' and not (not ended and e.kind = 'series' and up > 3) then
      llena := coalesce((x->>'full')::boolean, false) and not ended and up = 1 and cap > 0;
      base := 0.45 + (h % 46) / 100.0;
      if ended then ratio := least(1.0, base + 0.1); else ratio := base * greatest(0.15, 1 - lead / 45.0); end if;
      tgt := greatest(1, round((case when cap > 0 then cap else ex end) * ratio)::int);
      if cap > 0 then tgt := least(tgt, cap); end if;
      if llena then tgt := cap; end if;
      -- La fecha se mueve un momento a un horario de marcador para que la base acepte los RSVP; vuelve enseguida a su hora real.
      ph := now() + interval '400 days';
      update event_dates set starts_at = ph, ends_at = ph + interval '1 hour', doors_at = ph where id = dr.id;
      tot := 0; i := 0; pos := h % n;
      while tot < tgt and i < n loop
        uid := pool[1 + (pos + i * 37) % n];
        rr := abs(hashtext(k || dr.local_date::text || i::text));
        p := least(1 + rr % least(pm, 4), tgt - tot);
        insert into rsvps (event_date_id, event_id, city_id, user_id, party, hold_until, door_code)
        values (dr.id, eid, dr.city_id, uid, p, ph, pg_temp.eg_code(k || dr.id::text || i::text));
        tot := tot + p; i := i + 1;
      end loop;
      update event_dates set starts_at = dr.starts_at, ends_at = dr.ends_at, doors_at = dr.doors_at where id = dr.id;
      update rsvps set hold_until = dr.doors_at + make_interval(mins => guarda) where event_date_id = dr.id;
      -- Quién llegó, quién no vino y quién canceló (la puerta marca la llegada).
      perform set_config('tl.puerta', 'si', true);
      j := 0;
      for r in select id, party from rsvps where event_date_id = dr.id and status = 'going' order by id loop
        j := j + 1;
        rr := abs(hashtext(k || dr.local_date::text || 's' || j::text)) % 100;
        if ended then
          if rr < 14 then update rsvps set status = 'expired' where id = r.id;
          elsif rr < 22 then update rsvps set status = 'cancelled' where id = r.id;
          else update rsvps set status = 'attended', arrived_n = case when r.party > 1 and rr % 5 = 0 then r.party - 1 else r.party end where id = r.id;
          end if;
        elsif not llena and rr < 6 then
          update rsvps set status = 'cancelled' where id = r.id;
        end if;
      end loop;
      perform set_config('tl.puerta', '', true);
      -- Fecha llena: lista de espera (alguien se sale de la fila).
      if llena then
        nwl := coalesce((x->>'wl')::int, 4);
        for j in 1 .. nwl loop
          insert into waitlist (event_date_id, event_id, city_id, user_id, party)
          values (dr.id, eid, dr.city_id, pool[1 + (pos + (i + j) * 37) % n], 1 + abs(hashtext(k || 'w' || j::text)) % least(pm, 3));
        end loop;
        if nwl >= 4 then update waitlist set status = 'left' where id = (select max(w.id) from waitlist w where w.event_date_id = dr.id and w.status = 'waiting'); end if;
      end if;
    end if;
    -- Asistencia contada en la puerta (eventos con «contar en la puerta»): lo que llegó, por la puerta «Entrada».
    if ended and e.door_count then
      ent := case when e.entry = 'rsvp' then coalesce((select sum(arrived_n) from rsvps where event_date_id = dr.id), 0)
                  else round(ex * (0.5 + (h % 40) / 100.0))::int end;
      if ent > 0 then
        perform set_config('tl.puerta', 'si', true); perform set_config('tl.evt_derivado', 'si', true);
        insert into door_counts (event_date_id, door_name, city_id, inside_n, entered_n, scans_n) values (dr.id, 'Entrada', dr.city_id, 0, ent, ent) on conflict do nothing;
        update event_dates set entered_n = ent where id = dr.id and entered_n = 0;
        perform set_config('tl.puerta', '', true); perform set_config('tl.evt_derivado', '', true);
      end if;
    end if;
    -- Como el barrido: una fecha de serie que terminó hace más de 12 horas queda 'done'.
    if ended and e.kind = 'series' and dr.ends_at < now() - interval '12 hours' then update event_dates set status = 'done' where id = dr.id; end if;
  end loop;
end $f$;
`;

export const USUARIOS_SQL = (us) => `
insert into users (phone, phone_verified_at, first_name, last_name, home_city_id, lang, created_at)
select x->>'p', now() - interval '3 years', x->>'f', x->>'l', x->>'c', x->>'g', now() - make_interval(days => 120 + ((x->>'i')::int * 5) % 900)
  from jsonb_array_elements($j$${JSON.stringify(us)}$j$::jsonb) x
on conflict (phone) do nothing;
`;

export const PRINCIPAL = (lista) => `
do $do$
declare
  lista jsonb := $j$${JSON.stringify(lista)}$j$;
  x jsonb; b record; adm uuid; eid bigint; bid text; hoy date; d0 date; xx date; s timestamptz; f timestamptz; p timestamptz; foto record; pool uuid[];
  st_ts timestamptz; ap timestamptz; hh jsonb; kind text; rep jsonb; nd int; h0 int; h1 int; nuevos int := 0; sin_org int := 0; fillkey text;
begin
  select m.user_id into adm from staff_members m join users u on u.id = m.user_id where m.role = 'admin' and m.status = 'active' and u.phone = '+15705550199' limit 1;
  if adm is null then select user_id into adm from staff_members where role = 'admin' and status = 'active' limit 1; end if;
  if adm is null then raise notice 'eventos gratis: sin persona del equipo que apruebe; no se siembra nada'; return; end if;
  for x in select value from jsonb_array_elements(lista) loop
    bid := pg_temp.eg_org(x->>'c', x->>'cat', array(select jsonb_array_elements_text(x->'subs')), (x->>'o')::int);
    if bid is null then sin_org := sin_org + 1; continue; end if;
    select bz.id, bz.city_id, bz.geo, bz.owner_user_id, c.timezone into b from businesses bz join cities c on c.id = bz.city_id where bz.id = bid;
    if exists (select 1 from events e where e.city_id = b.city_id and e.title->>'es' = x->'ti'->>'es') then continue; end if;
    hoy := (now() at time zone b.timezone)::date;
    kind := case x->>'t' when 'w' then 'series' when 'm' then 'series' when 'x' then 'span' else 'single' end;
    if x ? 'ph' then
      d0 := make_date(extract(year from hoy)::int, (x->'ph'->>0)::int, (x->'ph'->>1)::int);
      if d0 < hoy then d0 := (d0 + interval '1 year')::date; end if;
    elsif x->>'t' = 'w' then
      d0 := hoy - 7 * (x->>'pn')::int;
      d0 := d0 + ((x->>'dow')::int - extract(dow from d0)::int + 7) % 7;
    else
      d0 := hoy + (x->>'dd')::int;
    end if;
    rep := case x->>'t' when 'w' then jsonb_build_object('k', 'w', 'days', jsonb_build_array((x->>'dow')::int), 'n', 52, 'skip', '[]'::jsonb)
                        when 'm' then jsonb_build_object('k', 'm', 'days', '[]'::jsonb, 'n', 6, 'skip', '[]'::jsonb) end;
    nd := coalesce((x->>'nd')::int, 1);
    hh := null; h0 := (x->>'h0')::int; h1 := (x->>'h1')::int;
    if kind = 'span' then
      select jsonb_agg(jsonb_build_object('h0', (v->>0)::int, 'h1', (v->>1)::int) order by o) into hh from jsonb_array_elements(x->'dh') with ordinality t (v, o);
      h0 := (x->'dh'->0->>0)::int; h1 := (x->'dh'->0->>1)::int;
    end if;
    -- Antes que el evento: su negocio enciende el módulo Eventos (0051) para que sus fechas salgan en lo público.
    update businesses set modules_on = array(select distinct m from unnest(coalesce(modules_on, '{}'::text[]) || array['eventos']) m), modules_off = coalesce(modules_off, '{}'::jsonb) - 'eventos'
     where id = b.id and not ('eventos' = any(coalesce(modules_on, '{}'::text[])) and not (coalesce(modules_off, '{}'::jsonb) ? 'eventos'));
    ap := least(now() - interval '2 hours', d0::timestamp - interval '9 days');
    insert into events (slug, city_id, business_id, format, title, description, genres, min_age, id_required, kids, food_paid_at_venue, before_you_go, venue_mode, geom,
                        kind, rep, span_days, day_hours, door_count, start_date, start_min, end_min, doors_before_min, entry, rsvp_capacity, party_max,
                        status, submitted_at, approved_at, approved_by, reviewed_at, reviewed_by, created_by, created_at)
    values ('', b.city_id, b.id, x->>'f', x->'ti', x->'de', array(select jsonb_array_elements_text(coalesce(x->'gen', '[]'))), coalesce((x->>'age')::smallint, 0), coalesce((x->>'age')::int, 0) > 0,
            x->>'kids', coalesce((x->>'food')::boolean, false), coalesce(x->'bf', '[]'), 'own', b.geo,
            kind, rep, nd, hh, coalesce((x->>'dc')::boolean, false), d0, h0, h1, (x->>'dr')::smallint, x->>'en', coalesce((x->>'cap')::int, 0), coalesce((x->>'pm')::smallint, 1),
            'live', ap - interval '1 day', ap, adm, ap, adm, b.owner_user_id, ap - interval '2 days')
    returning id into eid;
    insert into event_lineup (event_id, at_min, who, role, sort)
    select eid, (l->>'h')::smallint, l->>'who', l->'role', (o - 1)::smallint from jsonb_array_elements(coalesce(x->'lu', '[]')) with ordinality as t (l, o);
    -- El cartel: la primera foto del negocio (otra fila de media, para no quitársela a su página).
    select url, w, h into foto from media where owner_kind = 'business' and owner_id = b.id and status = 'visible' order by sort, created_at limit 1;
    if found then insert into media (owner_kind, owner_id, url, w, h, status, sort, uploaded_by) values ('event', eid::text, foto.url, foto.w, foto.h, 'visible', 0, b.owner_user_id); end if;
    insert into event_review_log (event_id, city_id, version, decision, by_user, by_kind, snapshot, at)
    values (eid, b.city_id, 1, 'submitted', b.owner_user_id, 'business', jsonb_build_object('title', x->'ti', 'status', 'review'), ap - interval '1 day'),
           (eid, b.city_id, 1, 'approved', adm, 'staff', jsonb_build_object('title', x->'ti', 'status', 'live'), ap);
    perform evt_sincronizar_fechas(eid);
    -- Las fechas pasadas de una serie semanal (el barrido de la app no crea las que ya terminaron): se crean con la misma regla que la base usa.
    if x->>'t' = 'w' then
      xx := d0;
      while xx <= hoy loop
        s := (xx::timestamp + make_interval(mins => h0)) at time zone b.timezone;
        f := (xx::timestamp + make_interval(mins => h1)) at time zone b.timezone;
        p := s - make_interval(mins => (x->>'dr')::int);
        if f <= now() then
          insert into event_dates (event_id, city_id, starts_at, ends_at, doors_at, local_date, day_index, geom, serie_dia) values (eid, b.city_id, s, f, p, xx, 0, b.geo, xx) on conflict do nothing;
        end if;
        xx := xx + 7;
      end loop;
    end if;
    select array_agg(id order by phone) into pool from users where home_city_id = b.city_id and phone between '+17175557500' and '+17175557999';
    perform pg_temp.eg_fill(eid, x, coalesce(pool, '{}'::uuid[]), hoy);
    nuevos := nuevos + 1;
  end loop;
  raise notice 'eventos gratis: % eventos nuevos, % sin organizador disponible', nuevos, sin_org;
end $do$;
`;
