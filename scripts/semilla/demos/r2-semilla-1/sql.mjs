/* r2-semilla-1 · SQL: funciones temporales (pg_temp) que expanden la historia de los negocios de la semilla. SOLO SANDBOX. Todo con llaves fijas; nada se borra ni se actualiza. */
export const NY = "America/New_York";

export const FUNCIONES = String.raw`
create or replace function pg_temp.k_ev(op bigint, k text, a text, aid uuid, es text, en text, at timestamptz) returns void language sql as $f$
  insert into operation_events (operation_id, kind, actor, actor_id, note, at)
  values (op, k, a, aid, case when es is null then null else jsonb_build_object('es', es, 'en', coalesce(en, es)) end, at);
$f$;

create or replace function pg_temp.k_pick(bz text, md text, a int, ks text[]) returns items language sql as $f$
  select it.* from items it where it.id = (
    select s.id from (select i.id, row_number() over (order by i.id) rn, count(*) over () c from items i
                       where i.business_id = bz and i.module = md and i.removed_at is null and not i.is_extra and i.sell and (ks is null or i.svc_kind = any(ks))) s
     where s.rn = 1 + (a % s.c) limit 1)
$f$;

-- Seguidores: ventana (inicio, cuántos, paso) sobre los 247 clientes.
create or replace function pg_temp.k_fol(bz text, st int, n int, stp int) returns void language plpgsql as $f$
begin
  insert into follows (follower_user_id, target_kind, target_id, created_at)
  select c.id, 'business', bz, now() - make_interval(days => abs(hashtext(bz || c.idx::text)) % 3000, mins => abs(hashtext(c.idx::text || bz)) % 1440)
    from generate_series(0, n - 1) k join k_cli c on c.idx = ((st + k * stp) % 247)
  on conflict do nothing;
end $f$;

-- Operaciones. kd = order | market_order | hold | appointment | enrollment | night; md = módulo de los ítems.
-- op: {q, n (número), u, st, sd, ts (enviada, hora de Nueva York), tw (cita/recogida), nd (noche hace N días), ar, a, b, qa, qb, mo (d|p), dlv, tip, m (miembro), pax, am (min de respuesta), cm (min hasta cancelar), cb, cr, inn}
create or replace function pg_temp.k_ops(bz text, kd text, md text, ops jsonb) returns void language plpgsql as $f$
declare x jsonb; cid text; uid uuid; op bigint; ck uuid; it items; it2 items; st text; stg text; mo text; ts timestamptz; tw timestamptz; tn timestamptz; ans timestamptz; dn timestamptz;
  sub int; tax int; dlv int; tip int; tot int; q1 int; q2 int; mem uuid; det jsonb; prep int; nd date; k text; sd text; lista boolean; hoy date := ((now() - interval '6 hours') at time zone 'America/New_York')::date;
  pax int; dur int; sched timestamptz; nm int; mm int; ready timestamptz;
begin
  select city_id into cid from businesses where id = bz;
  for x in select value from jsonb_array_elements(ops) loop
    ck := md5('k18:' || bz || ':' || (x->>'q'))::uuid;
    select id into uid from k_cli where idx = (x->>'u')::int;
    continue when exists (select 1 from operations where user_id = uid and client_key = ck);
    it := pg_temp.k_pick(bz, md, (x->>'a')::int, case when kd = 'night' then array['lista','cover','mesa','vip'] end);
    continue when it.id is null;
    st := x->>'st'; sd := x->>'sd';
    ts := ((x->>'ts')::timestamp) at time zone 'America/New_York';
    tw := case when x ? 'tw' then ((x->>'tw')::timestamp) at time zone 'America/New_York' end;
    ans := ts + make_interval(mins => coalesce((x->>'am')::int, 2));
    q1 := coalesce((x->>'qa')::int, 1); q2 := coalesce((x->>'qb')::int, 1);
    it2 := null;
    if kd in ('appointment', 'enrollment') then q1 := 1; end if;
    if x ? 'b' and kd in ('order', 'market_order') then it2 := pg_temp.k_pick(bz, md, (x->>'b')::int, null); if it2.id = it.id then it2 := null; end if; end if;
    dlv := coalesce((x->>'dlv')::int, 0); tip := coalesce((x->>'tip')::int, 0); mo := case x->>'mo' when 'd' then 'delivery' else 'pickup' end;
    mem := null; det := '{}'::jsonb; stg := null; sched := null; ready := null; pax := null; nd := null; dur := null; tax := 0; prep := 20;
    if kd in ('order', 'market_order', 'hold') then
      sub := it.price_cents * q1 + case when it2.id is not null then it2.price_cents * q2 else 0 end;
      if kd = 'order' then tax := round(it.price_cents * q1 * it.tax_pct / 100.0)::int + case when it2.id is not null then round(it2.price_cents * q2 * it2.tax_pct / 100.0)::int else 0 end; end if;
      if kd = 'hold' then mo := 'pickup'; dlv := 0; end if;
      tot := sub + tax + dlv + tip;
      stg := case st when 'done' then case mo when 'delivery' then 'delivered' else 'picked_up' end when 'confirmed' then 'accepted' else 'sent' end;
      if kd = 'order' then
        det := case when mo = 'delivery' then jsonb_build_object('address', (select address from businesses where id = bz)) else jsonb_build_object('pickupNote', jsonb_build_object('es', 'Pide en la caja con tu número de pedido.', 'en', 'Ask at the register with your order number.')) end;
        sched := null; ready := case when st in ('done', 'confirmed') then ts + make_interval(mins => 2 + prep) end;
      elsif kd = 'market_order' then
        det := jsonb_build_object('sub', 'call', 'est_cents', tot, 'hold_est_cents', tot); sched := ts + interval '90 minutes'; ready := case when st in ('done', 'confirmed') then ts + interval '30 minutes' end;
      else
        det := jsonb_build_object('dia', (tw at time zone 'America/New_York')::date::text, 'sms', true, 'como', 'tienda', 'hora', (extract(hour from (tw at time zone 'America/New_York')) * 60 + extract(minute from (tw at time zone 'America/New_York')))::int, 'hold_hours', 48);
        sched := tw; ready := tw + interval '48 hours';
      end if;
    elsif kd in ('appointment', 'enrollment') then
      sub := it.price_cents; tot := it.price_cents; sched := tw; dur := greatest(15, coalesce(it.duration_min, 30)); pax := case when kd = 'enrollment' then 1 end;
      select m.id into mem from business_members m where m.business_id = bz and m.status = 'active' and m.takes_bookings and (x->>'m') is not null order by m.id offset ((x->>'m')::int % greatest(1, (select count(*) from business_members z where z.business_id = bz and z.status = 'active' and z.takes_bookings))) limit 1;
      det := jsonb_build_object('svc', it.name, 'svcId', it.id::text, 'sms', true, 'k', it.svc_kind, 'para', 'me') || case when kd = 'enrollment' then jsonb_build_object('rubro', 'dep', 'for', 'yo', 'item_id', it.id::text, 'g1', false) else '{}'::jsonb end;
    else
      sub := 0; tot := 0; k := it.svc_kind; lista := k = 'lista'; pax := coalesce((x->>'pax')::int, 2); nd := hoy - (x->>'nd')::int;
      tn := (nd + time '12:00' + make_interval(mins => (x->>'ar')::int)) at time zone 'America/New_York'; sched := tn; dur := 60;
      det := jsonb_build_object('k', k, 'item', it.id, 'svc', it.name, 'night', nd::text, 'arrive', (x->>'ar')::int, 'edad', 21, 'hold', 30, 'sms', true, 'cut', case when lista then null else least(360, (x->>'ar')::int - 120) end)
             || case when sd = 'entro' then jsonb_build_object('in_n', (x->>'inn')::int, 'in_at', tn + interval '10 minutes') || case when lista then '{}'::jsonb else jsonb_build_object('llego', true) end else '{}'::jsonb end;
    end if;
    insert into operations (number, kind, city_id, business_id, user_id, member_id, status, stage, status_detail, mode, scheduled_at, ready_at, customer_note, details, subtotal_cents, delivery_cents, tip_cents, tax_cents, total_cents,
                            deposit_cents, pay_mode, respond_by, sent_at, answered_at, confirmed_at, done_at, cancelled_at, cancelled_by, cancel_reason, duration_min, party_size, night_date, door_code, client_key, is_test, updated_at)
    values (x->>'n', kd, cid, bz, uid, mem, st, stg, case when st = 'done' then coalesce(sd, 'done') else sd end, case when kd in ('order', 'market_order', 'hold') then mo end, sched, ready, null, det, sub, dlv, tip, tax, tot,
            0, 'local', case when st = 'pending' then now() + interval '3 hours' else ts + interval '30 minutes' end, ts,
            case when st in ('done', 'confirmed', 'declined') then ans end, case when st in ('done', 'confirmed') then ans end,
            case when st = 'done' then case kd when 'order' then ts + make_interval(mins => 2 + prep + 6) when 'market_order' then ts + interval '2 hours' when 'hold' then tw + interval '30 minutes' when 'night' then tn + interval '4 hours' else tw + make_interval(mins => dur) end end,
            case when st = 'cancelled' then ts + make_interval(mins => coalesce((x->>'cm')::int, 20)) end, case when st = 'cancelled' then x->>'cb' end, case when st = 'cancelled' then x->>'cr' end,
            dur, pax, nd, case when kd = 'night' then x->>'code' end, ck, true,
            coalesce(case when st = 'done' then case kd when 'order' then ts + make_interval(mins => 2 + prep + 6) when 'market_order' then ts + interval '2 hours' when 'hold' then tw + interval '30 minutes' when 'night' then tn + interval '4 hours' else tw + make_interval(mins => dur) end end,
                     case when st = 'cancelled' then ts + make_interval(mins => coalesce((x->>'cm')::int, 20)) end, ans, ts))
    returning id into op;
    if kd = 'night' then
      insert into operation_lines (operation_id, item_id, name, qty, unit_price_cents, line_total_cents, tax_pct, options) values (op, it.id, it.name, pax, 0, 0, 0, '[]'::jsonb);
    else
      insert into operation_lines (operation_id, item_id, name, qty, unit_price_cents, line_total_cents, tax_pct, options)
      values (op, it.id, it.name, q1, it.price_cents, it.price_cents * q1, case when kd = 'order' then it.tax_pct else 0 end, '[]'::jsonb);
      if it2.id is not null then
        insert into operation_lines (operation_id, item_id, name, qty, unit_price_cents, line_total_cents, tax_pct, options)
        values (op, it2.id, it2.name, q2, it2.price_cents, it2.price_cents * q2, case when kd = 'order' then it2.tax_pct else 0 end, '[]'::jsonb);
      end if;
    end if;
    -- eventos
    if kd = 'night' then
      perform pg_temp.k_ev(op, case when lista then 'night_list' else 'night_sent' end, 'user', uid, null, null, ts);
      if st = 'done' and sd = 'entro' then perform pg_temp.k_ev(op, 'night_in', 'member', null, 'Entraron ' || (x->>'inn') || ' de ' || pax, (x->>'inn') || ' of ' || pax || ' got in', tn + interval '10 minutes');
      elsif st = 'done' then perform pg_temp.k_ev(op, case sd when 'noid' then 'night_noid' else 'night_noshow' end, 'member', null, null, null, tn + interval '45 minutes');
      elsif st = 'cancelled' then perform pg_temp.k_ev(op, 'cancelled', case x->>'cb' when 'user' then 'user' else 'member' end, null, null, null, ts + make_interval(mins => coalesce((x->>'cm')::int, 20)));
      elsif st = 'expired' then perform pg_temp.k_ev(op, 'night_exp', 'system', null, 'El local no contestó a tiempo', 'The venue did not reply in time', ts + interval '30 minutes');
      elsif st = 'declined' then perform pg_temp.k_ev(op, 'declined', 'member', null, 'No había mesa esa noche', 'No table available that night', ans); end if;
    else
      perform pg_temp.k_ev(op, case when kd = 'enrollment' then 'insc_sent' else 'sent' end, 'user', uid, null, null, ts);
      if st in ('done', 'confirmed') then perform pg_temp.k_ev(op, 'accepted', 'member', null, null, null, ans); end if;
      if st = 'done' then
        if kd = 'order' then
          perform pg_temp.k_ev(op, 'ready', 'member', null, null, null, ts + make_interval(mins => 2 + prep));
          if mo = 'delivery' then perform pg_temp.k_ev(op, 'on_the_way', 'member', null, 'En camino', 'On the way', ts + make_interval(mins => 4 + prep)); perform pg_temp.k_ev(op, 'delivered', 'member', null, 'Entregado', 'Delivered', ts + make_interval(mins => 8 + prep));
          else perform pg_temp.k_ev(op, 'picked_up', 'member', null, null, null, ts + make_interval(mins => 8 + prep)); end if;
        elsif kd = 'market_order' then
          perform pg_temp.k_ev(op, 'ready', 'member', null, 'Listo', 'Ready', ts + interval '30 minutes');
          if mo = 'delivery' then perform pg_temp.k_ev(op, 'delivered', 'member', null, 'Entregado', 'Delivered', ts + interval '2 hours'); else perform pg_temp.k_ev(op, 'picked_up', 'member', null, 'Lo recogió', 'Picked up', ts + interval '2 hours'); end if;
        elsif kd = 'hold' then perform pg_temp.k_ev(op, 'picked_up', 'business', null, 'Lo recogió y pagó en la caja', 'Picked up and paid at the register', tw + interval '30 minutes');
        else perform pg_temp.k_ev(op, case when sd = 'noshow' then 'noshow' else 'done' end, 'member', null, case when sd = 'noshow' then 'No llegó' end, case when sd = 'noshow' then 'No-show' end, tw + make_interval(mins => dur)); end if;
      elsif st = 'declined' then perform pg_temp.k_ev(op, 'declined', 'member', null, 'No pudimos tomarlo', 'We could not take it', ans);
      elsif st = 'cancelled' then perform pg_temp.k_ev(op, 'cancelled', case x->>'cb' when 'user' then 'user' else 'member' end, null, null, null, ts + make_interval(mins => coalesce((x->>'cm')::int, 20)));
      elsif st = 'expired' then perform pg_temp.k_ev(op, 'expired', 'system', null, 'Nadie contestó a tiempo', 'No one answered in time', ts + interval '30 minutes'); end if;
    end if;
  end loop;
end $f$;

-- Reseñas: {q, s, l, b, r, rl, d (días después), h (útiles), src}.
create or replace function pg_temp.k_rev(bz text, rv jsonb) returns void language plpgsql as $f$
declare x jsonb; op operations; rid bigint; ai int; ct timestamptz;
begin
  for x in select value from jsonb_array_elements(rv) loop
    select * into op from operations where business_id = bz and client_key = md5('k18:' || bz || ':' || (x->>'q'))::uuid limit 1;
    continue when op.id is null or op.status <> 'done';
    ct := least(coalesce(op.done_at, op.sent_at) + make_interval(hours => 3 + (x->>'d')::int * 24 + abs(hashtext(x->>'b')) % 20), now() - interval '2 hours');
    insert into reviews (business_id, city_id, user_id, operation_id, src, stars, body, lang, answers, facts, reply, reply_at, reply_lang, created_at)
    values (bz, op.city_id, op.user_id, op.id, x->>'src', (x->>'s')::int, x->>'b', x->>'l', '{}'::jsonb, '{}'::jsonb, x->>'r',
            case when x->>'r' is not null then least(ct + make_interval(hours => 5 + abs(hashtext(x->>'r')) % 40), now() - interval '1 hour') end, case when x->>'r' is not null then coalesce(x->>'rl', 'es') end, ct)
    on conflict do nothing returning id into rid;
    continue when rid is null;
    select idx into ai from k_cli where id = op.user_id;
    if coalesce((x->>'h')::int, 0) > 0 and ai is not null then
      insert into review_helpful (review_id, user_id, created_at)
      select rid, c.id, ct + make_interval(hours => 2 + k * 9) from generate_series(0, (x->>'h')::int - 1) k join k_cli c on c.idx = ((ai + 1 + k * 7) % 247) on conflict do nothing;
      update reviews set helpful_count = (select count(*) from review_helpful h where h.review_id = rid) where id = rid;
    end if;
  end loop;
end $f$;

-- Novedades: {k, t, b, d (hace días), e (dura horas), pin, md (módulo), it (pick), poll, av, cc, co, cm, cu, v (votos)}.
create or replace function pg_temp.k_posts(bz text, md text, ps jsonb) returns void language plpgsql as $f$
declare x jsonb; cid text; pid bigint; pub timestamptz; nv int; it items; kd text; was int; nw int;
begin
  select city_id into cid from businesses where id = bz;
  for x in select value from jsonb_array_elements(ps) loop
    continue when exists (select 1 from business_posts where business_id = bz and title = x->>'t');
    pub := now() - make_interval(days => (x->>'d')::int, hours => (abs(hashtext(x->>'t')) % 9));
    kd := x->>'k'; it := null; was := null; nw := null;
    if x ? 'it' then it := pg_temp.k_pick(bz, md, (x->>'it')::int, null); end if;
    if kd = 'oferta' then
      if it.id is null or it.price_cents < 200 then kd := 'novedad'; else was := it.price_cents; nw := greatest(50, round(it.price_cents * 0.85 / 5.0)::int * 5); if nw >= was then kd := 'novedad'; was := null; nw := null; end if; end if;
    end if;
    insert into business_posts (business_id, city_id, kind, title, body, link_kind, item_id, price_was_cents, price_now_cents, aviso, poll, audience, publish_at, ends_at, status, pinned,
                                created_at, hoy_avisado_at, followers_notified_at, coupon_code, coupon_off_cents, coupon_min_cents, coupon_uses)
    values (bz, cid, kd, x->>'t', coalesce(x->>'b', ''), case when it.id is not null and kd in ('oferta', 'hoy') then 'item' else 'none' end, case when kd in ('oferta', 'hoy') then it.id end, was, nw, x->'av',
            case when x ? 'poll' then array(select jsonb_array_elements_text(x->'poll')) end, coalesce(x->>'au', 'all'), pub,
            case when x ? 'e' then pub + make_interval(hours => (x->>'e')::int) end, 'live', coalesce((x->>'pin')::boolean, false) and not exists (select 1 from business_posts z where z.business_id = bz and z.pinned and z.status = 'live'), pub, pub, pub,
            x->>'cc', (x->>'co')::int, (x->>'cm')::int, (x->>'cu')::int)
    returning id into pid;
    nv := coalesce((x->>'v')::int, 0);
    insert into post_votes (post_id, user_id, v, created_at)
    select pid, c.id, 1, pub + make_interval(mins => 30 + k * 17) from generate_series(0, nv - 1) k join k_cli c on c.idx = ((abs(hashtext(x->>'t')) + k * 5) % 247) on conflict do nothing;
    if x ? 'poll' then
      insert into post_poll_votes (post_id, user_id, opt, created_at)
      select pid, c.id, abs(hashtext(c.idx::text || (x->>'t'))) % jsonb_array_length(x->'poll'), pub + make_interval(mins => 20 + k * 11)
        from generate_series(0, greatest(nv, 6) - 1) k join k_cli c on c.idx = ((abs(hashtext(x->>'t')) + k * 3) % 247) on conflict do nothing;
    end if;
  end loop;
end $f$;
`;
