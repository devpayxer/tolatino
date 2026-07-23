-- 0115_event_addons.sql
-- Organizer panel for seated events: table PACKAGES/add-ons (optional or
-- mandatory) + per-table photos. Some venues (nightclubs) require buying a
-- bottle/package to reserve a table — a `required` add-on scoped to seated
-- tickets enforces exactly that.
--
--  · events.addons jsonb — [{ id, es, en, descEs?, descEn?, price, required,
--      applyTo:'all'|'seated' }]. The organizer edits these in the panel.
--  · events.seating.tables[].photo — a table photo url (jsonb, no column change;
--      the panel writes it, the consumer seat picker shows it).
--  · event_tickets.addons jsonb — the RESOLVED add-ons stamped on the ticket
--      (server prices, never client-supplied).
--  · resolve_event_addons(ev, seated, ids) — the SINGLE re-pricing authority used
--      by BOTH the free path (buy_event_tickets_multi) and the online path
--      (marketplace-checkout, via REST): required applicable add-ons are ALWAYS
--      included; optional ones only when their id is in `ids`. Prices come from
--      events.addons, so a tampered client price can never take effect.
--  · _issue_tickets_multi / buy / fulfill gain in_addon_ids; the seated ticket(s)
--      get the resolved add-on list. create_event_full gains p_seating/p_attrs/
--      p_addons + honors each tier's `seat` flag.
-- Idempotent. Apply: node scripts/sbsql.mjs --file supabase/migrations/0115_event_addons.sql

alter table public.events        add column if not exists addons jsonb not null default '[]'::jsonb;
alter table public.event_tickets add column if not exists addons jsonb;

-- ── Re-pricing authority (server truth) ──────────────────────────────────────
create or replace function public.resolve_event_addons(in_ev uuid, in_seated boolean, in_ids text[])
returns jsonb language sql stable security definer set search_path to 'public' as $fn$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', a->>'id', 'es', a->>'es', 'en', coalesce(a->>'en', a->>'es'),
           'price', round((a->>'price')::numeric, 2), 'required', coalesce((a->>'required')::boolean, false)
         )), '[]'::jsonb)
  from public.events e, jsonb_array_elements(coalesce(e.addons, '[]'::jsonb)) a
  where e.id = in_ev
    and (coalesce(a->>'applyTo', 'all') = 'all' or (a->>'applyTo' = 'seated' and in_seated))
    and ( coalesce((a->>'required')::boolean, false)               -- mandatory → always
       or (a->>'id') = any (coalesce(in_ids, array[]::text[])) );  -- optional → only if chosen
$fn$;
grant execute on function public.resolve_event_addons(uuid, boolean, text[]) to anon, authenticated, service_role;

-- ── event_by_slug: also return addons ────────────────────────────────────────
drop function if exists public.event_by_slug(text);
create or replace function public.event_by_slug(in_slug text)
returns table(
  slug text, title_es text, title_en text, venue_es text, venue_en text, cat text, city text,
  starts_at timestamptz, ends_at timestamptz, time_label_es text, time_label_en text, price_label text,
  desc_es text, desc_en text, tile_a text, tile_b text, cover_url text, status text, going_count integer,
  lat double precision, lng double precision, organizer text, organizer_slug text, tiers jsonb,
  accepts_payments boolean, attrs jsonb, seating jsonb,
  organizer_verified boolean, organizer_rating numeric, organizer_events integer,
  review_avg numeric, review_count integer, addons jsonb
)
language sql stable security definer set search_path to 'public' as $fn$
  select e.slug, e.title_es, e.title_en, e.venue_es, e.venue_en, e.cat, e.city, e.starts_at, e.ends_at,
         e.time_label_es, e.time_label_en, e.price_label, e.desc_es, e.desc_en, e.tile_a, e.tile_b, e.cover_url,
         e.status, e.going_count,
         case when e.location is not null then st_y(e.location::geometry) end,
         case when e.location is not null then st_x(e.location::geometry) end,
         coalesce((select b.name from public.businesses b where b.owner_id = e.owner_id order by b.created_at limit 1),
           (select p.display_name from public.profiles p where p.id = e.owner_id), 'Organizador'),
         (select b.slug from public.businesses b where b.owner_id = e.owner_id order by b.created_at limit 1),
         coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'name_es', t.name_es, 'name_en', t.name_en,
             'price', t.price, 'capacity', t.capacity, 'sold', t.sold, 'seat', t.seat,
             'remaining', case when t.capacity is null then null else greatest(0, t.capacity - t.sold) end,
             'sales_start', t.sales_start, 'sales_end', t.sales_end) order by t.sort, t.created_at)
           from public.event_tiers t where t.event_id = e.id and t.visible), '[]'::jsonb),
         exists(select 1 from public.businesses b
                 where b.owner_id = e.owner_id and coalesce(b.connect_charges_enabled, false)
                   and b.stripe_account_id is not null),
         coalesce(e.attrs, '{}'::jsonb), e.seating,
         coalesce((select b.tier <> 'free' from public.businesses b where b.owner_id = e.owner_id order by b.created_at limit 1), false),
         (select round(avg(r.rating), 1) from public.reviews r join public.businesses b on b.id = r.business_id where b.owner_id = e.owner_id),
         (select count(*)::int from public.events ev where ev.owner_id = e.owner_id and ev.status = 'published'),
         (select round(avg(er.rating), 1) from public.event_reviews er where er.event_id = e.id),
         (select count(*)::int from public.event_reviews er where er.event_id = e.id),
         coalesce(e.addons, '[]'::jsonb)
  from public.events e where e.slug = in_slug and e.status <> 'draft' limit 1;
$fn$;
grant execute on function public.event_by_slug(text) to anon, authenticated;

-- ── _issue with add-ons (stamp resolved list on the seated ticket) ───────────
drop function if exists public._issue_tickets_multi(uuid, text, jsonb, text, jsonb);
create or replace function public._issue_tickets_multi(
  in_buyer uuid, in_slug text, in_items jsonb, in_promo text, in_seats jsonb default null, in_addons jsonb default null
) returns table(ticket_id uuid, code text, tier_id uuid)
language plpgsql security definer set search_path = public as $fn$
declare
  v_ev uuid; v_status text; v_owner uuid; v_title text; v_name text;
  v_tier record; v_matched int := 0; v_req int; v_total_qty int := 0;
  v_code text; p record; v_kind text := null; v_pvalue numeric := 0; v_scope uuid := null;
  v_promo_id uuid := null; v_access_tier uuid := null; v_factor numeric := 1; v_gross numeric := 0;
  v_seating jsonb; v_seated_qty int := 0; v_seat text; v_seat_label text := null;
  v_rows int; v_cols int; v_cap int; v_n int := 0;
begin
  if in_buyer is null then raise exception 'auth required'; end if;
  if in_items is null or jsonb_typeof(in_items) <> 'array' then raise exception 'no tickets selected'; end if;
  select id, status, seating into v_ev, v_status, v_seating from public.events where slug = in_slug;
  if v_ev is null then raise exception 'event not found'; end if;
  if v_status = 'cancelled' then raise exception 'event cancelled'; end if;
  if v_status <> 'published' then raise exception 'event not on sale'; end if;

  v_code := nullif(upper(btrim(coalesce(in_promo, ''))), '');
  if v_code is not null then
    select * into p from public.event_promo_codes
      where event_id = v_ev and upper(event_promo_codes.code) = v_code and active for update;
    if not found then raise exception 'promo invalid' using errcode = 'check_violation'; end if;
    if p.max_uses is not null and p.used >= p.max_uses then raise exception 'promo exhausted' using errcode = 'check_violation'; end if;
    v_promo_id := p.id; v_kind := p.kind; v_pvalue := p.value; v_scope := p.tier_id;
    if v_kind = 'access' then v_access_tier := p.tier_id;
    elsif v_kind = 'percent' then v_factor := greatest(0, 1 - v_pvalue/100.0); end if;
  end if;

  select count(*) into v_req from (select distinct coalesce(i->>'tier_id', i->>'tierId')::uuid from jsonb_array_elements(in_items) i where coalesce((i->>'qty')::int, 0) > 0) s;
  if v_req = 0 then raise exception 'no tickets selected'; end if;

  for v_tier in
    with req as (select coalesce(i->>'tier_id', i->>'tierId')::uuid as tier_id, least(greatest(sum((i->>'qty')::int), 1), 10) as qty
      from jsonb_array_elements(in_items) i where coalesce((i->>'qty')::int, 0) > 0 group by 1)
    select t.id, coalesce(nullif(btrim(t.name_es), ''), 'Boleto') as name_es, t.capacity, t.sold, t.sales_start, t.sales_end, t.visible, t.price, t.seat, r.qty
    from req r join public.event_tiers t on t.id = r.tier_id and t.event_id = v_ev
    order by t.id for update of t
  loop
    if not v_tier.visible and v_tier.id is distinct from v_access_tier then raise exception 'tier not found'; end if;
    if v_tier.sales_start is not null and now() < v_tier.sales_start then raise exception 'not on sale yet: %', v_tier.name_es using errcode = 'check_violation'; end if;
    if v_tier.sales_end is not null and now() > v_tier.sales_end then raise exception 'sales closed: %', v_tier.name_es using errcode = 'check_violation'; end if;
    if v_tier.capacity is not null and v_tier.sold + v_tier.qty > v_tier.capacity then raise exception 'sold out: %', v_tier.name_es using errcode = 'check_violation'; end if;
    v_matched := v_matched + 1; v_total_qty := v_total_qty + v_tier.qty;
    if coalesce(v_tier.seat, false) then v_seated_qty := v_seated_qty + v_tier.qty; end if;
    if v_kind in ('percent','amount') and (v_scope is null or v_scope = v_tier.id) then v_gross := v_gross + v_tier.price * v_tier.qty; end if;
  end loop;
  if v_matched <> v_req then raise exception 'tier not found'; end if;
  if v_kind = 'amount' then v_factor := case when v_gross > 0 then greatest(0, (v_gross - v_pvalue) / v_gross) else 1 end; end if;

  if v_seated_qty > 0 then
    if v_seating is null then v_seated_qty := 0;
    elsif in_seats is null or jsonb_typeof(in_seats) <> 'array' or jsonb_array_length(in_seats) = 0 then
      raise exception 'seats required' using errcode = 'check_violation';
    elsif v_seating->>'type' = 'seats' then
      if jsonb_array_length(in_seats) <> v_seated_qty then raise exception 'seat count mismatch' using errcode = 'check_violation'; end if;
      v_rows := coalesce((v_seating->>'rows')::int, 6); v_cols := coalesce((v_seating->>'cols')::int, 9);
      for v_seat in select distinct upper(btrim(value::text, ' "')) from jsonb_array_elements_text(in_seats) loop
        if v_seat !~ '^[A-Z][0-9]{1,2}$' then raise exception 'bad seat %', v_seat using errcode = 'check_violation'; end if;
        if (ascii(substr(v_seat,1,1)) - 64) > v_rows or substr(v_seat,2)::int > v_cols or substr(v_seat,2)::int < 1 then
          raise exception 'bad seat %', v_seat using errcode = 'check_violation'; end if;
        begin insert into public.event_seat_claims (event_id, seat, user_id) values (v_ev, v_seat, in_buyer);
        exception when unique_violation then raise exception 'seat taken: %', v_seat using errcode = 'check_violation'; end;
        v_n := v_n + 1;
      end loop;
      if v_n <> v_seated_qty then raise exception 'seat count mismatch' using errcode = 'check_violation'; end if;
      select string_agg(s, ' · ' order by s) into v_seat_label from (select distinct upper(btrim(value::text, ' "')) s from jsonb_array_elements_text(in_seats)) x;
    elsif v_seating->>'type' = 'tables' then
      if jsonb_array_length(in_seats) <> 1 then raise exception 'pick one table' using errcode = 'check_violation'; end if;
      v_seat := upper(btrim(in_seats->>0));
      if v_seat !~ '^T[0-9]{1,3}$' then raise exception 'bad table' using errcode = 'check_violation'; end if;
      select (t->>'cap')::int into v_cap from jsonb_array_elements(v_seating->'tables') t where 'T' || (t->>'n') = v_seat limit 1;
      if v_cap is null then raise exception 'bad table' using errcode = 'check_violation'; end if;
      if v_cap < v_seated_qty then raise exception 'table too small' using errcode = 'check_violation'; end if;
      begin insert into public.event_seat_claims (event_id, seat, user_id) values (v_ev, v_seat, in_buyer);
      exception when unique_violation then raise exception 'seat taken: %', v_seat using errcode = 'check_violation'; end;
      v_seat_label := 'Mesa ' || substr(v_seat, 2);
    end if;
  end if;

  select coalesce(nullif(btrim(display_name), ''), 'Cliente') into v_name from public.profiles where id = in_buyer;
  perform set_config('tolatino.bulk_ticket', 'on', true);

  return query
    with req as (select coalesce(i->>'tier_id', i->>'tierId')::uuid as tier_id, least(greatest(sum((i->>'qty')::int), 1), 10) as qty
      from jsonb_array_elements(in_items) i where coalesce((i->>'qty')::int, 0) > 0 group by 1)
    insert into public.event_tickets (event_id, user_id, customer_name, tier_id, qty, unit_price, total, status, promo_code, seat_label, addons)
    select v_ev, in_buyer, coalesce(v_name, 'Cliente'), t.id, r.qty,
           round(t.price * case when v_kind in ('percent','amount') and (v_scope is null or v_scope = t.id) then v_factor else 1 end, 2),
           round(t.price * r.qty * case when v_kind in ('percent','amount') and (v_scope is null or v_scope = t.id) then v_factor else 1 end, 2),
           'confirmed', v_code,
           case when coalesce(t.seat, false) then v_seat_label else null end,
           case when coalesce(t.seat, false) then in_addons else null end   -- add-ons ride on the seated ticket
    from req r join public.event_tiers t on t.id = r.tier_id and t.event_id = v_ev
    order by t.id
    returning event_tickets.id, event_tickets.code, event_tickets.tier_id;

  update public.event_seat_claims c
     set ticket_id = (select tk.id from public.event_tickets tk where tk.event_id = v_ev and tk.user_id = in_buyer and tk.seat_label is not null order by tk.created_at desc limit 1)
   where c.event_id = v_ev and c.user_id = in_buyer and c.ticket_id is null;

  if v_promo_id is not null then update public.event_promo_codes set used = used + 1 where id = v_promo_id; end if;
  select owner_id, title_es into v_owner, v_title from public.events where id = v_ev;
  perform public.notify_user(v_owner, 'ticket_new', jsonb_build_object('event', v_title, 'qty', v_total_qty, 'name', coalesce(v_name, 'Cliente'), 'promo', v_code), '/negocio');
end $fn$;
revoke execute on function public._issue_tickets_multi(uuid, text, jsonb, text, jsonb, jsonb) from public;

-- ── Wrappers: resolve add-ons server-side, then issue ────────────────────────
drop function if exists public.buy_event_tickets_multi(text, jsonb, text, jsonb);
create or replace function public.buy_event_tickets_multi(
  in_slug text, in_items jsonb, in_promo text default null, in_seats jsonb default null, in_addon_ids text[] default null
) returns table(ticket_id uuid, code text, tier_id uuid)
language plpgsql security definer set search_path = public as $fn$
declare v_ev uuid; v_pays boolean; v_paid boolean; v_seated boolean; v_addons jsonb;
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  select e.id, exists (select 1 from public.businesses b where b.owner_id = e.owner_id and coalesce(b.connect_charges_enabled, false))
    into v_ev, v_pays from public.events e where e.slug = in_slug limit 1;
  if v_ev is null then raise exception 'event not found'; end if;
  select exists (select 1 from jsonb_array_elements(in_items) it
    join public.event_tiers t on t.id = coalesce(it->>'tier_id', it->>'tierId')::uuid
    where coalesce((it->>'qty')::int, 0) > 0 and coalesce(t.price, 0) > 0) into v_paid;
  if v_paid and v_pays then raise exception 'payment required' using errcode = 'check_violation'; end if;
  select exists (select 1 from jsonb_array_elements(in_items) it
    join public.event_tiers t on t.id = coalesce(it->>'tier_id', it->>'tierId')::uuid
    where coalesce((it->>'qty')::int, 0) > 0 and coalesce(t.seat, false)) into v_seated;
  v_addons := public.resolve_event_addons(v_ev, v_seated, in_addon_ids);
  return query select * from public._issue_tickets_multi(auth.uid(), in_slug, in_items, in_promo, in_seats, v_addons);
end $fn$;
grant execute on function public.buy_event_tickets_multi(text, jsonb, text, jsonb, text[]) to authenticated;

drop function if exists public.fulfill_event_tickets_multi(uuid, text, jsonb, text, jsonb);
create or replace function public.fulfill_event_tickets_multi(
  in_buyer uuid, in_slug text, in_items jsonb, in_promo text default null, in_seats jsonb default null, in_addons jsonb default null
) returns table(ticket_id uuid, code text, tier_id uuid)
language plpgsql security definer set search_path = public as $fn$
begin
  return query select * from public._issue_tickets_multi(in_buyer, in_slug, in_items, in_promo, in_seats, in_addons);
end $fn$;
revoke execute on function public.fulfill_event_tickets_multi(uuid, text, jsonb, text, jsonb, jsonb) from public;
grant execute on function public.fulfill_event_tickets_multi(uuid, text, jsonb, text, jsonb, jsonb) to service_role;

-- ── create_event_full: seating / attrs / add-ons + per-tier seat ─────────────
drop function if exists public.create_event_full(text, text, text, timestamptz, timestamptz, text, text, text, text, double precision, double precision, text, text, text, jsonb);
create or replace function public.create_event_full(
  p_title text, p_desc text, p_cat text, p_starts_at timestamptz, p_ends_at timestamptz,
  p_time_label_es text, p_time_label_en text, p_venue text, p_city text,
  p_lat double precision, p_lng double precision, p_cover_url text, p_tile_a text, p_tile_b text, p_tiers jsonb,
  p_seating jsonb default null, p_attrs jsonb default '{}'::jsonb, p_addons jsonb default '[]'::jsonb
) returns text language plpgsql security definer set search_path = public as $fn$
declare v_id uuid; v_slug text; v_uid uuid := auth.uid(); t jsonb;
begin
  if v_uid is null then raise exception 'auth required'; end if;
  v_slug := trim(both '-' from regexp_replace(lower(trim(coalesce(p_title, 'evento'))), '[^a-z0-9]+', '-', 'g'));
  if v_slug = '' then v_slug := 'evento'; end if;
  v_slug := v_slug || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
  insert into public.events (slug, title_es, title_en, desc_es, desc_en, cat, starts_at, ends_at,
      time_label_es, time_label_en, venue_es, venue_en, city, price_label, cover_url, tile_a, tile_b,
      location, owner_id, status, seating, attrs, addons)
  values (v_slug, p_title, p_title, p_desc, p_desc, p_cat, p_starts_at, p_ends_at,
      p_time_label_es, p_time_label_en, p_venue, p_venue, coalesce(p_city, 'Houston, TX'), null, p_cover_url,
      coalesce(p_tile_a, '#EFEBFF'), coalesce(p_tile_b, '#7B61FF'),
      case when p_lat is not null and p_lng is not null then st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography end,
      v_uid, 'published', p_seating, coalesce(p_attrs, '{}'::jsonb), coalesce(p_addons, '[]'::jsonb))
  returning id into v_id;
  for t in select * from jsonb_array_elements(coalesce(p_tiers, '[]'::jsonb)) loop
    insert into public.event_tiers (event_id, name_es, name_en, price, capacity, seat, sort, visible)
    values (v_id, coalesce(t->>'name', 'General'), coalesce(t->>'name', 'General'),
            coalesce((t->>'price')::numeric, 0), nullif(t->>'capacity', '')::int,
            coalesce((t->>'seat')::boolean, false), coalesce((t->>'sort')::int, 0), true);
  end loop;
  return v_slug;
end $fn$;
grant execute on function public.create_event_full(text, text, text, timestamptz, timestamptz, text, text, text, text, double precision, double precision, text, text, text, jsonb, jsonb, jsonb, jsonb) to authenticated;

insert into public.schema_migrations (version) values ('0115_event_addons')
on conflict (version) do nothing;

notify pgrst, 'reload schema';
