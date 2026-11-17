/* Grupo A · SQL compartido: usuarios, funciones temporales que expanden la historia (pg_temp, mueren con la transacción) y el bloque
   estático de cada negocio. SOLO SANDBOX. Todo es repetible: llaves fijas y «on conflict do nothing». Nada se borra. */
import { q, j, arr, bi, photoUrl, logoUrl } from "./comun.mjs";
import { CLIENTES } from "./comun.mjs";

export const HEAD = (titulo) => `-- ${titulo}
-- GENERADO por scripts/semilla/demos/grupo-a.mjs (determinista: la misma entrada da el mismo SQL). SOLO SANDBOX; nunca corre en producción.
-- Negocios de demostración con is_demo = true: Pro, con su ficha nueva, «lo que vende» completo y ~10 años de historia (pedidos, reseñas con
-- respuestas, novedades, seguidores). Solo hechos base: lo derivado (★, conteos, filtros de la noche, métricas) lo recalculan las funciones de la
-- propia app (reviews_stats, perfil_fuerza, licencias_refrescar y el barrido). Repetible: llaves fijas, nada se borra.
begin;
set local statement_timeout = 0;
`;

/* Clientes y reseñistas (570-555-8xxx) y la tabla temporal idx → id. */
export const CLIENTES_SQL = () => {
  const rows = CLIENTES.map((c) => ({ p: c.phone, f: c.first, l: c.last, c: c.city, g: c.lang, i: c.idx }));
  return `insert into users (phone, phone_verified_at, first_name, last_name, home_city_id, lang, created_at)
select x->>'p', now() - interval '4 years', x->>'f', x->>'l', x->>'c', x->>'g', now() - make_interval(days => 200 + (x->>'i')::int * 7)
  from jsonb_array_elements($j$${JSON.stringify(rows)}$j$::jsonb) x
on conflict (phone) do nothing;
create temp table da_cli on commit drop as
  select (t.o - 1)::int as idx, u.id from jsonb_array_elements_text($j$${JSON.stringify(CLIENTES.map((c) => c.phone))}$j$::jsonb) with ordinality t(p, o) join users u on u.phone = t.p;
alter table da_cli add primary key (idx);
`;
};

/* Funciones temporales. `bz` = negocio. Las líneas y opciones ya vienen calculadas del generador (el servidor decide: aquí solo se escriben). */
export const FUNCIONES = String.raw`
create or replace function pg_temp.da_ev(op bigint, k text, a text, aid uuid, es text, en text, at timestamptz) returns void language sql as $f$
  insert into operation_events (operation_id, kind, actor, actor_id, note, at)
  values (op, k, a, aid, case when es is null then null else jsonb_build_object('es', es, 'en', coalesce(en, es)) end, at);
$f$;

create or replace function pg_temp.da_pago(op bigint, uid uuid, bz text, cid text, kind text, tag text, amt int, fee int, est text, t0 timestamptz, tcap timestamptz, held int, brand text, l4 text) returns bigint language plpgsql as $f$
declare pid bigint;
begin
  insert into payments (operation_id, user_id, business_id, city_id, kind, method, stripe_payment_intent, amount_cents, fee_cents, status, card_brand, card_last4,
                        held_at, captured_at, released_at, simulated, created_at, updated_at, held_cents, payment_method, card_fingerprint)
  values (op, uid, bz, cid, kind, 'card', 'pi_sim_dA_' || tag, amt, fee, est, brand, l4, t0, case when est = 'captured' then tcap end,
          case when est = 'released' then tcap end, true, t0, tcap, greatest(held, amt), 'pm_sim_' || brand || '_' || l4 || '_dA', 'fpsimdA' || l4 || brand)
  on conflict (stripe_payment_intent) do nothing returning id into pid;
  return pid;
end $f$;

-- Seguidores: ventana (inicio, cuántos, paso) sobre los 247 clientes; el paso es primo con 247 = 13 × 19.
create or replace function pg_temp.da_follows(bz text, st int, n int, stp int, span int) returns void language plpgsql as $f$
begin
  insert into follows (follower_user_id, target_kind, target_id, created_at)
  select c.id, 'business', bz, now() - make_interval(days => abs(hashtext(bz || c.idx::text)) % span, mins => abs(hashtext(c.idx::text || bz)) % 1440)
    from generate_series(0, n - 1) k join da_cli c on c.idx = ((st + k * stp) % 247)
  on conflict do nothing;
end $f$;

-- Novedades: {k, t, b, d (hace días), e (dura horas) , pin, it (ítem), was, now, poll, av, cu, v (votos)}.
create or replace function pg_temp.da_posts(bz text, ps jsonb) returns void language plpgsql as $f$
declare x jsonb; cid text; pid bigint; ow uuid; pub timestamptz; i int; nv int; itid bigint;
begin
  select city_id, owner_user_id into cid, ow from businesses where id = bz;
  for x in select value from jsonb_array_elements(ps) loop
    continue when exists (select 1 from business_posts where business_id = bz and title = x->>'t');
    pub := now() - make_interval(days => (x->>'d')::int, hours => (abs(hashtext(x->>'t')) % 9));
    itid := null;
    if x ? 'it' then select id into itid from da_it where biz = bz and ord = (x->>'it')::int; end if;
    insert into business_posts (business_id, city_id, kind, title, body, link_kind, item_id, price_was_cents, price_now_cents, aviso, poll, audience, publish_at, ends_at, status, pinned,
                                created_by, created_at, hoy_avisado_at, followers_notified_at, coupon_code, coupon_off_cents, coupon_min_cents, coupon_uses)
    values (bz, cid, x->>'k', x->>'t', coalesce(x->>'b', ''), case when itid is not null then 'item' else 'none' end, itid, (x->>'was')::int, (x->>'now')::int, x->'av',
            case when x ? 'poll' then array(select jsonb_array_elements_text(x->'poll')) end, coalesce(x->>'au', 'all'), pub,
            case when x ? 'e' then pub + make_interval(hours => (x->>'e')::int) end, 'live', coalesce((x->>'pin')::boolean, false), ow, pub, pub, pub,
            x->>'cc', (x->>'co')::int, (x->>'cm')::int, (x->>'cu')::int)
    returning id into pid;
    nv := coalesce((x->>'v')::int, 0);
    insert into post_votes (post_id, user_id, v, created_at)
    select pid, c.id, 1, pub + make_interval(mins => 30 + k * 17) from generate_series(0, nv - 1) k join da_cli c on c.idx = ((abs(hashtext(x->>'t')) + k * 5) % 247) on conflict do nothing;
    if x ? 'poll' then
      insert into post_poll_votes (post_id, user_id, opt, created_at)
      select pid, c.id, abs(hashtext(c.idx::text || (x->>'t'))) % jsonb_array_length(x->'poll'), pub + make_interval(mins => 20 + k * 11)
        from generate_series(0, greatest(nv, 6) - 1) k join da_cli c on c.idx = ((abs(hashtext(x->>'t')) + k * 3) % 247) on conflict do nothing;
    end if;
  end loop;
end $f$;

-- Reseñas: {o (operación), s, l, b, a (respuestas), f (hechos), r (respuesta), rl, d (días después), h (útiles), rc (ítems), src}.
create or replace function pg_temp.da_reviews(bz text, rv jsonb) returns void language plpgsql as $f$
declare x jsonb; op operations; rid bigint; ow uuid; ai int; ct timestamptz;
begin
  select owner_user_id into ow from businesses where id = bz;
  for x in select value from jsonb_array_elements(rv) loop
    select * into op from operations where business_id = bz and client_key = md5('dA:' || bz || ':' || (x->>'o'))::uuid limit 1;
    continue when op.id is null;
    ct := coalesce(op.done_at, op.sent_at) + make_interval(hours => 3 + (x->>'d')::int * 24 + abs(hashtext(x->>'b')) % 20);
    insert into reviews (business_id, city_id, user_id, operation_id, src, stars, body, lang, answers, facts, rec, reply, reply_at, reply_by, reply_lang, created_at)
    values (bz, op.city_id, op.user_id, op.id, x->>'src', (x->>'s')::int, x->>'b', x->>'l', coalesce(x->'a', '{}'::jsonb), coalesce(x->'f', '{}'::jsonb),
            coalesce(array(select it.id::text from da_it it where it.biz = bz and it.ord in (select jsonb_array_elements_text(x->'rc')::int)), '{}'::text[]),
            x->>'r', case when x->>'r' is not null then ct + make_interval(hours => 5 + abs(hashtext(x->>'r')) % 40) end, case when x->>'r' is not null then ow end, case when x->>'r' is not null then coalesce(x->>'rl', 'es') end, ct)
    on conflict do nothing returning id into rid;
    continue when rid is null;
    select idx into ai from da_cli where id = op.user_id;
    if coalesce((x->>'h')::int, 0) > 0 and ai is not null then
      insert into review_helpful (review_id, user_id, created_at)
      select rid, c.id, ct + make_interval(hours => 2 + k * 9) from generate_series(0, (x->>'h')::int - 1) k join da_cli c on c.idx = ((ai + 1 + k * 7) % 247) on conflict do nothing;
      update reviews set helpful_count = (select count(*) from review_helpful h where h.review_id = rid) where id = rid;
    end if;
  end loop;
end $f$;

-- Comida: {q, n, d, m, u, mo (p|d), pm (a|l|e), st, sub, tax, dlv, tip, tot, L [[ord, qty, unit, tax, opciones, nota]], nt, det, fut, prep, cb, cr, br, l4}.
create or replace function pg_temp.da_food(bz text, ops jsonb) returns void language plpgsql as $f$
declare x jsonb; ln jsonb; cid text; uid uuid; op bigint; t0 timestamptz; tz text := 'America/New_York'; st text; stg text; mo text; pmode text; ck uuid;
  hoy date := (now() at time zone 'America/New_York')::date; prep int; tot int; pst text;
begin
  select city_id into cid from businesses where id = bz;
  for x in select value from jsonb_array_elements(ops) loop
    ck := md5('dA:' || bz || ':' || (x->>'q'))::uuid;
    select id into uid from da_cli where idx = (x->>'u')::int;
    continue when exists (select 1 from operations where user_id = uid and client_key = ck);
    mo := case x->>'mo' when 'd' then 'delivery' else 'pickup' end;
    pmode := case x->>'pm' when 'a' then 'app' when 'e' then 'entrega' else 'local' end;
    st := x->>'st'; prep := coalesce((x->>'prep')::int, 20); tot := (x->>'tot')::int;
    t0 := case when x ? 'fut' then now() - interval '25 minutes' else ((hoy - (x->>'d')::int) + make_interval(mins => (x->>'m')::int)) at time zone tz end;
    stg := case st when 'done' then case mo when 'delivery' then 'delivered' else 'picked_up' end when 'confirmed' then 'accepted' else 'sent' end;
    pst := case when pmode <> 'app' then null when st = 'done' then 'captured' when st = 'confirmed' then 'held' else 'released' end;
    insert into operations (number, kind, city_id, business_id, user_id, status, stage, mode, scheduled_at, ready_at, customer_note, details, subtotal_cents, delivery_cents, tip_cents, tax_cents, total_cents,
                            pay_mode, pay_status, respond_by, sent_at, answered_at, confirmed_at, done_at, cancelled_at, cancelled_by, cancel_reason, client_key, is_test, updated_at)
    values (x->>'n', 'order', cid, bz, uid, st, stg, mo, case when x ? 'fut' then now() + make_interval(mins => (x->>'fut')::int) end,
            case when st in ('done', 'confirmed') then t0 + make_interval(mins => 2 + prep) end, x->>'nt', coalesce(x->'det', '{}'::jsonb),
            (x->>'sub')::int, coalesce((x->>'dlv')::int, 0), coalesce((x->>'tip')::int, 0), (x->>'tax')::int, tot, pmode, pst, t0 + interval '10 minutes', t0,
            case when st in ('done', 'confirmed', 'declined') then t0 + interval '2 minutes' end, case when st in ('done', 'confirmed') then t0 + interval '2 minutes' end,
            case when st = 'done' then t0 + make_interval(mins => 2 + prep + 6) end, case when st = 'cancelled' then t0 + interval '7 minutes' end,
            case when st = 'cancelled' then x->>'cb' end, case when st = 'cancelled' then x->>'cr' end, ck, true, t0 + interval '1 hour')
    returning id into op;
    for ln in select value from jsonb_array_elements(x->'L') loop
      insert into operation_lines (operation_id, item_id, name, qty, unit_price_cents, line_total_cents, tax_pct, options, instructions)
      select op, it.id, it.name, (ln->>1)::int, (ln->>2)::int, (ln->>1)::int * (ln->>2)::int, (ln->>3)::numeric, coalesce(ln->4, '[]'::jsonb), ln->>5
        from da_it it where it.biz = bz and it.ord = (ln->>0)::int;
    end loop;
    perform pg_temp.da_ev(op, 'sent', 'user', uid, null, null, t0);
    if st in ('done', 'confirmed') then
      perform pg_temp.da_ev(op, 'accepted', 'member', null, null, null, t0 + interval '2 minutes');
      if st = 'done' then
        perform pg_temp.da_ev(op, 'ready', 'member', null, null, null, t0 + make_interval(mins => 2 + prep));
        if mo = 'delivery' then
          perform pg_temp.da_ev(op, 'on_the_way', 'member', null, 'En camino', 'On the way', t0 + make_interval(mins => 4 + prep));
          perform pg_temp.da_ev(op, 'delivered', 'member', null, 'Entregado', 'Delivered', t0 + make_interval(mins => 2 + prep + 6));
        else perform pg_temp.da_ev(op, 'picked_up', 'member', null, null, null, t0 + make_interval(mins => 2 + prep + 6)); end if;
      end if;
    elsif st = 'declined' then perform pg_temp.da_ev(op, 'declined', 'member', null, 'El negocio no pudo tomarlo', 'The business could not take it', t0 + interval '2 minutes');
    elsif st = 'cancelled' then perform pg_temp.da_ev(op, 'cancelled', case x->>'cb' when 'user' then 'user' else 'member' end, null, null, null, t0 + interval '7 minutes');
    elsif st = 'expired' then perform pg_temp.da_ev(op, 'expired', 'system', null, 'Nadie contestó a tiempo', 'No one answered in time', t0 + interval '10 minutes'); end if;
    if pmode = 'app' then
      perform pg_temp.da_pago(op, uid, bz, cid, 'full', x->>'n', tot, round(tot * 0.10)::int, pst, t0, case when st = 'done' then t0 + make_interval(mins => 2 + prep + 6) else t0 + interval '10 minutes' end, tot, coalesce(x->>'br', 'visa'), coalesce(x->>'l4', '4242'));
      if st = 'done' then perform pg_temp.da_ev(op, 'payment_captured', 'system', null, 'Se cobraron $' || to_char(tot / 100.0, 'FM990.00'), '$' || to_char(tot / 100.0, 'FM990.00') || ' charged', t0 + make_interval(mins => 2 + prep + 6)); end if;
    end if;
  end loop;
end $f$;

-- Mercado: {q, n (M-), d, m, u, mo, st, sub (real), dlv, tot (real), est (retenido), L [[ord, qty, unit, tax, opciones, west, wfin, fin, estado, foto]], det, fut, cb, cr, br, l4}.
create or replace function pg_temp.da_merc(bz text, ops jsonb) returns void language plpgsql as $f$
declare x jsonb; ln jsonb; cid text; uid uuid; ow uuid; op bigint; lid bigint; t0 timestamptz; tz text := 'America/New_York'; st text; stg text; mo text; ck uuid; pmode text;
  hoy date := (now() at time zone 'America/New_York')::date; tot int; pst text; est int; nm text; wid uuid; peso boolean; tw timestamptz;
begin
  select city_id, owner_user_id into cid, ow from businesses where id = bz;
  for x in select value from jsonb_array_elements(ops) loop
    ck := md5('dA:' || bz || ':' || (x->>'q'))::uuid;
    select id into uid from da_cli where idx = (x->>'u')::int;
    continue when exists (select 1 from operations where user_id = uid and client_key = ck);
    mo := case x->>'mo' when 'd' then 'delivery' else 'pickup' end;
    pmode := case x->>'pm' when 'l' then 'local' else 'app' end;
    st := x->>'st'; tot := (x->>'tot')::int; est := (x->>'est')::int;
    t0 := case when x ? 'fut' then now() - interval '25 minutes' else ((hoy - (x->>'d')::int) + make_interval(mins => (x->>'m')::int)) at time zone tz end;
    tw := t0 + interval '25 minutes';
    stg := case st when 'done' then case mo when 'delivery' then 'delivered' else 'picked_up' end when 'confirmed' then 'accepted' else 'sent' end;
    pst := case when pmode <> 'app' then null when st = 'done' then 'captured' when st = 'confirmed' then 'held' else 'released' end;
    insert into operations (number, kind, city_id, business_id, user_id, status, stage, status_detail, mode, scheduled_at, ready_at, details, subtotal_cents, delivery_cents, tax_cents, total_cents,
                            pay_mode, pay_status, respond_by, sent_at, answered_at, confirmed_at, done_at, cancelled_at, cancelled_by, cancel_reason, client_key, is_test, updated_at)
    values (x->>'n', 'market_order', cid, bz, uid, st, stg, case when st = 'done' then 'done' end, mo,
            case when x ? 'fut' then now() + make_interval(mins => (x->>'fut')::int) else t0 + interval '90 minutes' end, case when st in ('done', 'confirmed') then tw + interval '5 minutes' end,
            coalesce(x->'det', '{}'::jsonb) || jsonb_build_object('sub', 'call', 'est_cents', tot, 'hold_est_cents', est), (x->>'sub')::int, coalesce((x->>'dlv')::int, 0), 0, tot, pmode, pst,
            t0 + interval '10 minutes', t0, case when st in ('done', 'confirmed', 'declined') then t0 + interval '2 minutes' end, case when st in ('done', 'confirmed') then t0 + interval '2 minutes' end,
            case when st = 'done' then tw + make_interval(mins => case mo when 'delivery' then 40 else 20 end) end, case when st = 'cancelled' then t0 + interval '9 minutes' end,
            case when st = 'cancelled' then x->>'cb' end, case when st = 'cancelled' then x->>'cr' end, ck, true, t0 + interval '2 hours')
    returning id into op;
    for ln in select value from jsonb_array_elements(x->'L') loop
      peso := ln->>6 is not null;
      lid := nextval('operation_lines_id_seq');
      wid := null;
      if peso and st = 'done' then
        wid := md5('dA:w:' || bz || ':' || (x->>'q') || ':' || (ln->>0))::uuid;
        insert into media (id, owner_kind, owner_id, url, w, h, credit, sort, uploaded_by, created_at) values (wid, 'line', lid::text, ln->>9, 1200, 800, 'Pexels', 0, ow, tw) on conflict (id) do nothing;
      end if;
      insert into operation_lines (id, operation_id, item_id, name, qty, unit_price_cents, line_total_cents, tax_pct, options, weight_est, weight_final, status, weigh_photo_id) overriding system value
      select lid, op, it.id, it.name, (ln->>1)::int, (ln->>2)::int, case when peso then round((ln->>2)::int * (ln->>5)::numeric)::int else (ln->>1)::int * (ln->>2)::int end, (ln->>3)::numeric,
             coalesce(ln->4, '[]'::jsonb), (ln->>5)::numeric, case when st = 'done' then (ln->>6)::numeric end, coalesce(ln->>8, 'ok'), wid
        from da_it it where it.biz = bz and it.ord = (ln->>0)::int;
      if peso and st = 'done' then
        select it.name->>'es' into nm from da_it it where it.biz = bz and it.ord = (ln->>0)::int;
        perform pg_temp.da_ev(op, 'line_weighed', 'member', null, nm || ': pidió ' || trim(to_char((ln->>5)::numeric, 'FM990.##')) || ' lb · pesó ' || trim(to_char((ln->>6)::numeric, 'FM990.00')) || ' lb',
                              nm || ': asked ' || trim(to_char((ln->>5)::numeric, 'FM990.##')) || ' lb · weighed ' || trim(to_char((ln->>6)::numeric, 'FM990.00')) || ' lb', tw);
      end if;
    end loop;
    perform pg_temp.da_ev(op, 'sent', 'user', uid, 'Se retuvieron $' || to_char(est / 100.0, 'FM990.00') || ' (estimado + 10 % de lo que va por peso)', '$' || to_char(est / 100.0, 'FM990.00') || ' held (estimate + 10% of by-weight items)', t0);
    if st in ('done', 'confirmed') then
      perform pg_temp.da_ev(op, 'accepted', 'member', null, 'Aceptado · lo están armando', 'Accepted · being prepared', t0 + interval '2 minutes');
      if st = 'done' then
        perform pg_temp.da_ev(op, 'weighed', 'member', null, 'Pesado · total real $' || to_char(tot / 100.0, 'FM990.00'), 'Weighed · real total $' || to_char(tot / 100.0, 'FM990.00'), tw + interval '2 minutes');
        perform pg_temp.da_ev(op, 'ready', 'member', null, case mo when 'delivery' then 'Listo · sale con el repartidor' else 'Listo para recoger' end, case mo when 'delivery' then 'Ready · goes out with the driver' else 'Ready for pickup' end, tw + interval '5 minutes');
        if mo = 'delivery' then
          perform pg_temp.da_ev(op, 'on_the_way', 'member', null, 'Va en camino · lo lleva el mercado', 'On the way · the market delivers it', tw + interval '10 minutes');
          perform pg_temp.da_ev(op, 'delivered', 'member', null, 'Entregado', 'Delivered', tw + interval '40 minutes');
        else perform pg_temp.da_ev(op, 'picked_up', 'member', null, 'Lo recogió', 'Picked up', tw + interval '20 minutes'); end if;
      end if;
    elsif st = 'declined' then perform pg_temp.da_ev(op, 'declined', 'member', null, 'El mercado no pudo armarlo', 'The market could not fill it', t0 + interval '2 minutes');
    elsif st = 'cancelled' then perform pg_temp.da_ev(op, 'cancelled', case x->>'cb' when 'user' then 'user' else 'member' end, null, null, null, t0 + interval '9 minutes');
    elsif st = 'expired' then perform pg_temp.da_ev(op, 'expired', 'system', null, 'Nadie contestó a tiempo', 'No one answered in time', t0 + interval '10 minutes'); end if;
    if pmode = 'app' then
      perform pg_temp.da_pago(op, uid, bz, cid, 'full', x->>'n', case when st = 'done' then tot else est end, round((case when st = 'done' then tot else est end) * 0.10)::int, pst, t0,
                              case when st = 'done' then tw + interval '20 minutes' else t0 + interval '10 minutes' end, est, coalesce(x->>'br', 'visa'), coalesce(x->>'l4', '4242'));
      if st = 'done' then perform pg_temp.da_ev(op, 'payment_captured', 'system', null, 'Se cobraron $' || to_char(tot / 100.0, 'FM990.00'), '$' || to_char(tot / 100.0, 'FM990.00') || ' charged', tw + interval '20 minutes'); end if;
    end if;
  end loop;
end $f$;

-- Tienda (apartado): {q, n (A-), d, m, u, co (tienda|envio), st, sub, dlv, tot, pm (l|a), L [[ord, qty, unit, etiqueta de talla|null, tax]], dia, hora, to, nt, fut, cb, cr, br, l4}.
create or replace function pg_temp.da_hold(bz text, ops jsonb) returns void language plpgsql as $f$
declare x jsonb; ln jsonb; cid text; uid uuid; op bigint; t0 timestamptz; tz text := 'America/New_York'; st text; stg text; mo text; ck uuid; pmode text; ev timestamptz;
  hoy date := (now() at time zone 'America/New_York')::date; tot int; pst text; hh int; vid bigint; vl text; envio boolean; tp timestamptz;
begin
  select city_id into cid from businesses where id = bz;
  select coalesce(s.hold_hours, 48) into hh from retail_settings s where s.business_id = bz;
  hh := coalesce(hh, 48);
  for x in select value from jsonb_array_elements(ops) loop
    ck := md5('dA:' || bz || ':' || (x->>'q'))::uuid;
    select id into uid from da_cli where idx = (x->>'u')::int;
    continue when exists (select 1 from operations where user_id = uid and client_key = ck);
    envio := x->>'co' = 'envio'; mo := case when envio then 'delivery' else 'pickup' end;
    pmode := case x->>'pm' when 'a' then 'app' else 'local' end;
    st := x->>'st'; tot := (x->>'tot')::int;
    t0 := case when x ? 'fut' then now() - interval '3 hours' else ((hoy - (x->>'d')::int) + make_interval(mins => (x->>'m')::int)) at time zone tz end;
    tp := t0 + make_interval(hours => 5 + abs(hashtext(x->>'n')) % 30);
    stg := case st when 'done' then case mo when 'delivery' then 'delivered' else 'picked_up' end when 'confirmed' then 'accepted' when 'expired' then case when x ? 'acc' then 'accepted' else 'sent' end else 'sent' end;
    pst := case when pmode <> 'app' then null when st = 'done' then 'captured' when st = 'confirmed' then 'held' else 'released' end;
    insert into operations (number, kind, city_id, business_id, user_id, status, stage, status_detail, mode, scheduled_at, ready_at, customer_note, details, subtotal_cents, delivery_cents, total_cents,
                            pay_mode, pay_status, respond_by, sent_at, answered_at, confirmed_at, done_at, cancelled_at, cancelled_by, cancel_reason, client_key, is_test, updated_at)
    values (x->>'n', 'hold', cid, bz, uid, st, stg, x->>'sd', mo, case when x ? 'fut' then now() + make_interval(hours => 20) else tp end,
            case when envio then t0 + interval '6 days' else (case when x ? 'fut' then now() + make_interval(hours => 20) else tp end) + make_interval(hours => hh) end, x->>'nt',
            coalesce(x->'det', '{}'::jsonb) || jsonb_build_object('sms', true, 'como', case when envio then 'envio' else 'tienda' end, 'hold_hours', hh), (x->>'sub')::int, coalesce((x->>'dlv')::int, 0), tot, pmode, pst,
            t0 + interval '4 hours', t0, case when st in ('done', 'confirmed') or x ? 'acc' then t0 + interval '40 minutes' end, case when st in ('done', 'confirmed') then t0 + interval '40 minutes' end,
            case when st = 'done' then tp + interval '30 minutes' end, case when st = 'cancelled' then t0 + interval '5 hours' end,
            case when st = 'cancelled' then x->>'cb' end, case when st = 'cancelled' then x->>'cr' end, ck, true, t0 + interval '2 days')
    returning id into op;
    for ln in select value from jsonb_array_elements(x->'L') loop
      vid := null; vl := null;
      if ln->>3 is not null then select v.id, v.label into vid, vl from da_var v where v.biz = bz and v.ord = (ln->>0)::int and v.label = ln->>3 limit 1; end if;
      insert into operation_lines (operation_id, item_id, name, qty, unit_price_cents, line_total_cents, tax_pct, variant_id, variant_label, status)
      select op, it.id, it.name, (ln->>1)::int, (ln->>2)::int, (ln->>1)::int * (ln->>2)::int, coalesce((ln->>4)::numeric, 0), vid, vl, 'ok'
        from da_it it where it.biz = bz and it.ord = (ln->>0)::int;
    end loop;
    perform pg_temp.da_ev(op, 'sent', 'user', uid, case when envio then 'Mandó el pedido con envío' else 'Apartó en la tienda · lo recoge y paga en la caja' end,
                          case when envio then 'Sent the order to ship' else 'Held in store · picks up and pays at the register' end, t0);
    if st in ('done', 'confirmed') or x ? 'acc' then perform pg_temp.da_ev(op, 'accepted', 'business', null, 'La tienda lo tiene: se lo guarda', 'The store has it: held', t0 + interval '40 minutes'); end if;
    if st = 'done' then
      if envio then
        perform pg_temp.da_ev(op, 'on_the_way', 'business', null, 'Lo envió · con enlace de seguimiento', 'Shipped · with tracking link', t0 + interval '1 day');
        perform pg_temp.da_ev(op, 'delivered', 'business', null, 'Entregado', 'Delivered', t0 + interval '4 days');
      else perform pg_temp.da_ev(op, 'picked_up', 'business', null, 'Lo recogió · pagó $' || to_char(tot / 100.0, 'FM990.00') || ' en la caja', 'Picked up · paid $' || to_char(tot / 100.0, 'FM990.00') || ' at the register', tp + interval '30 minutes'); end if;
    elsif st = 'declined' then perform pg_temp.da_ev(op, 'declined', 'business', null, 'No tenían ese artículo', 'The item was not available', t0 + interval '40 minutes');
    elsif st = 'cancelled' then perform pg_temp.da_ev(op, 'cancelled', case x->>'cb' when 'user' then 'user' else 'business' end, null, null, null, t0 + interval '5 hours');
    elsif st = 'expired' then perform pg_temp.da_ev(op, 'expired', 'system', null, case when x ? 'acc' then 'No pasó a recogerlo a tiempo' else 'Nadie contestó a tiempo' end, case when x ? 'acc' then 'Not picked up in time' else 'No one answered in time' end, t0 + interval '4 hours'); end if;
    if pmode = 'app' then
      perform pg_temp.da_pago(op, uid, bz, cid, 'full', x->>'n', tot, round(tot * 0.06)::int, pst, t0, case when st = 'done' then t0 + interval '1 day' else t0 + interval '4 hours' end, tot, coalesce(x->>'br', 'visa'), coalesce(x->>'l4', '4242'));
      if st = 'done' then perform pg_temp.da_ev(op, 'payment_captured', 'system', null, 'Se cobraron $' || to_char(tot / 100.0, 'FM990.00'), '$' || to_char(tot / 100.0, 'FM990.00') || ' charged', t0 + interval '1 day'); end if;
    end if;
  end loop;
end $f$;

-- Noche: {q, n (N-), nd (noche hace N días), k (lista|mesa|vip|fecha), it, pax, ar (min después del mediodía), st, sd, code, dep, ck, fut}.
create or replace function pg_temp.da_night(bz text, ops jsonb) returns void language plpgsql as $f$
declare x jsonb; cid text; uid uuid; op bigint; tz text := 'America/New_York'; st text; ck uuid; hoy date := ((now() - interval '6 hours') at time zone 'America/New_York')::date; nd date; tn timestamptz; ts timestamptz;
  itn jsonb; it_id bigint; dep int; k text; pid bigint; tcap timestamptz; lista boolean;
begin
  select city_id into cid from businesses where id = bz;
  for x in select value from jsonb_array_elements(ops) loop
    ck := md5('dA:' || bz || ':' || (x->>'q'))::uuid;
    select id into uid from da_cli where idx = (x->>'u')::int;
    continue when exists (select 1 from operations where user_id = uid and client_key = ck);
    st := x->>'st'; k := x->>'k'; lista := k = 'lista'; dep := coalesce((x->>'dep')::int, 0);
    nd := hoy - (x->>'nd')::int;
    tn := (nd + time '12:00' + make_interval(mins => (x->>'ar')::int)) at time zone tz;
    ts := least(now() - interval '10 minutes', tn - make_interval(hours => 4 + abs(hashtext(x->>'n')) % 60));
    select id, name into it_id, itn from da_it where biz = bz and ord = (x->>'it')::int;
    insert into operations (number, kind, city_id, business_id, user_id, status, status_detail, scheduled_at, duration_min, buffer_min, customer_note, details, party_size, night_date, door_code,
                            subtotal_cents, total_cents, deposit_cents, pay_mode, pay_status, respond_by, sent_at, answered_at, confirmed_at, done_at, cancelled_at, cancelled_by, cancel_reason, client_key, is_test, updated_at)
    values (x->>'n', 'night', cid, bz, uid, st, x->>'sd', tn, 60, 0, x->>'nt',
            jsonb_build_object('k', k, 'item', it_id, 'svc', itn, 'night', nd::text, 'arrive', (x->>'ar')::int, 'edad', coalesce((x->>'edad')::int, 21), 'hold', 30, 'sms', true,
                               'cut', case when lista then null else least(360, (x->>'ar')::int - 120) end, 'door_cents', x->'dc', 'cover_cents', x->'cv')
              || case when x->>'sd' = 'entro' then jsonb_build_object('in_n', (x->>'inn')::int, 'in_at', tn + interval '10 minutes') || case when lista then '{}'::jsonb else jsonb_build_object('llego', true) end else '{}'::jsonb end,
            (x->>'pax')::int, nd, x->>'code', 0, 0, dep, case when dep > 0 then 'app' else 'none' end, case when dep > 0 then (case when st = 'cancelled' or st = 'expired' then 'released' when st = 'confirmed' then 'held' else 'captured' end) end,
            case when st = 'pending' then now() + interval '30 minutes' else ts + interval '30 minutes' end, ts, case when st in ('done', 'confirmed') or lista then ts + interval '20 minutes' end,
            case when st in ('done', 'confirmed') then ts + interval '20 minutes' end, case when st = 'done' then tn + interval '4 hours' end,
            case when st = 'cancelled' then ts + interval '6 hours' end, case when st = 'cancelled' then x->>'cb' end, case when st = 'cancelled' then x->>'cr' end, ck, true, tn + interval '5 hours')
    returning id into op;
    insert into operation_lines (operation_id, item_id, name, qty, unit_price_cents, line_total_cents, tax_pct, options) values (op, it_id, itn, (x->>'pax')::int, 0, 0, 0, '[]'::jsonb);
    perform pg_temp.da_ev(op, case when lista then 'night_list' else 'night_sent' end, 'user', uid, null, null, ts);
    if st = 'done' and x->>'sd' = 'entro' then perform pg_temp.da_ev(op, 'night_in', 'member', null, 'Entraron ' || (x->>'inn') || ' de ' || (x->>'pax'), (x->>'inn') || ' of ' || (x->>'pax') || ' got in', tn + interval '10 minutes');
    elsif st = 'done' and x->>'sd' in ('nollegaron', 'noid') then perform pg_temp.da_ev(op, case x->>'sd' when 'noid' then 'night_noid' else 'night_noshow' end, 'member', null, null, null, tn + interval '45 minutes');
    elsif st = 'cancelled' then perform pg_temp.da_ev(op, 'cancelled', case x->>'cb' when 'user' then 'user' else 'member' end, null, null, null, ts + interval '6 hours');
    elsif st = 'expired' then perform pg_temp.da_ev(op, 'night_exp', 'system', null, 'El local no contestó a tiempo', 'The venue did not reply in time', ts + interval '30 minutes');
    elsif st = 'declined' then perform pg_temp.da_ev(op, 'declined', 'member', null, 'No había mesa esa noche', 'No table available that night', ts + interval '20 minutes'); end if;
    if dep > 0 and st in ('done', 'cancelled', 'confirmed') then
      tcap := case when st = 'done' then tn + interval '4 hours' else ts + interval '6 hours' end;
      perform pg_temp.da_pago(op, uid, bz, cid, 'deposit', x->>'n', dep, round(dep * 0.05)::int + 100, case st when 'done' then 'captured' when 'confirmed' then 'held' else 'released' end, ts, tcap, dep, coalesce(x->>'br', 'visa'), coalesce(x->>'l4', '4242'));
    end if;
  end loop;
end $f$;
`;

/* Bloque estático común de un negocio (antes de «lo que vende»). `b` = datos del negocio; `extra` = SQL de la categoría (usa b, s, i, gid, gk). */
export function bloqueNegocio(b, extra) {
  const geo = `st_geogfromtext('POINT(${b.addr.lng} ${b.addr.lat})')`;
  const o = b.owner;
  let sql = `do $$
declare b text := ${q(b.id)}; s bigint; i bigint; gid bigint; gk jsonb := '{}'::jsonb; ow uuid; mid uuid;
begin
  if exists (select 1 from businesses where id = b) then return; end if;
  insert into users (phone, phone_verified_at, first_name, last_name, lang, home_city_id, created_at) values (${q(o.phone)}, now() - interval '3 years', ${q(o.first)}, ${q(o.last)}, 'es', ${q(b.city)}, now() - interval '3 years') on conflict (phone) do nothing;
  select id into ow from users where phone = ${q(o.phone)};
  insert into businesses (id, city_id, category_id, subcategory_ids, name, status, origin, owner_user_id, operation, address, geo, works_from_home, phone, whatsapp, instagram, facebook, languages, about, founded_year, amenities, filter_values, payment_modes, category_attrs, logo_url, modules_on, is_demo)
  values (b, ${q(b.city)}, ${q(b.cat)}, ${arr(b.subs)}, ${q(b.name)}, 'active', 'self', ow, 'local', ${q(b.addr.text)}, ${geo}, false, ${q(b.phone)}, ${!!b.whatsapp}, ${q(b.instagram)}, ${q(b.facebook)}, ${arr(b.languages)}, ${j(b.about)}, ${b.founded},
          ${arr(b.amenities)}, ${arr(b.filter)}, ${arr(b.payModes)}, ${j(b.attrs)}, ${q(b.logo)}, ${arr(b.mods)}, true);
  insert into business_stats_cache (business_id, plan, verified, photo_count) values (b, 'pro', true, ${b.photos.length}) on conflict (business_id) do nothing;
${b.hours.map((h) => `  insert into business_hours (business_id, weekday, open, ranges) values (b, ${h.weekday}, ${h.open}, ${j(h.ranges)}) on conflict do nothing;`).join("\n")}
${b.photos.map((u, k) => `  insert into media (id, owner_kind, owner_id, url, credit, sort) values (md5(${q(`dA:${b.id}:${k}`)})::uuid, 'business', b, ${q(u)}, 'Pexels', ${k}) on conflict (id) do nothing;`).join("\n")}
${b.faqs.map((f, k) => `  insert into faqs (business_id, question, answer, sort) values (b, ${j(f.q)}, ${j(f.a)}, ${k});`).join("\n")}
  insert into business_members (business_id, user_id, kind, display_name, role, status, show_on_page, panel_access, since_year, sort, same_as_business_hours, languages, bio)
  values (b, ow, 'owner', ${q(`${o.first} ${o.last}`)}, ${j(o.role)}, 'active', true, '{all}', ${b.founded}, 0, true, ${arr(b.languages)}, ${j(o.bio)});
${b.team.map((t, k) => `  insert into business_members (business_id, kind, display_name, role, status, show_on_page, panel_access, since_year, sort, same_as_business_hours, languages)
  values (b, 'staff', ${q(t.name)}, ${j(t.role)}, 'active', true, '{}', ${t.since}, ${k + 1}, true, ${arr(t.langs ?? ["es"])});`).join("\n")}
  insert into stripe_accounts (business_id, stripe_account_id, status, charges_enabled, payouts_enabled, requirements, bank_last4, simulated) values (b, 'acct_sim_' || b, 'enabled', true, true, '[]'::jsonb, ${q(b.bank)}, true) on conflict (business_id) do nothing;
  insert into payment_methods (user_id, stripe_pm_id, brand, last4, exp, is_default, status, simulated) values (ow, 'pm_sim_visa_4242_dA' || substr(md5(b), 1, 8), 'visa', '4242', '12/30', true, 'active', true) on conflict do nothing;
  insert into subscriptions (business_id, status, cycle, price_cents, trial_started_at, trial_ends_at, trial_choice, payer_user_id, card_pm, current_period_end, created_at)
  values (b, 'active', 'month', 1499, now() - interval '${b.proDias} days', now() - interval '${b.proDias - 30} days', 'card', ow, 'pm_sim_visa_4242_dA' || substr(md5(b), 1, 8), now() + interval '${b.proFin} days', now() - interval '${b.proDias} days') on conflict (business_id) do nothing;
  insert into subscription_events (business_id, kind, amount_cents, note, idem_key, at) values
    (b, 'trial_start', null, '{"dias": 30}', 'dA:' || b || ':1', now() - interval '${b.proDias} days'),
    (b, 'decided_card', null, '{"ciclo": "month"}', 'dA:' || b || ':2', now() - interval '${b.proDias - 20} days'),
    (b, 'charged', 1499, '{"semilla": "demoA"}', 'dA:' || b || ':3', now() - interval '${b.proDias - 30} days'),
    (b, 'charged', 1499, '{"semilla": "demoA"}', 'dA:' || b || ':4', now() - interval '${30 - b.proFin} days') on conflict (idem_key) do nothing;
${extra}
end $$;
`;
  return sql;
}
