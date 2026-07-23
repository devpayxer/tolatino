-- 0113_events_experience.sql
-- Events handoff (2026-07-23, "Events Consumer Flow"): deep detail content,
-- event reviews, and REAL seat/table selection with anti-double-sell claims.
--
--  · events.attrs jsonb — detail extras the organizer edits in the panel:
--      { addr, age_es/en, includes_es/en, schedule_es/en, tags_es[], tags_en[],
--        lineup:[{t,es,en,des,den}], urgency:bool }
--  · events.seating jsonb — null = general admission (no seat step);
--      {"type":"seats","rows":6,"cols":9}  (rows→letters A.., cols→1..N)
--      {"type":"tables","tables":[{"n":1,"cap":4}, …]}
--  · event_tiers.seat — tier requires a seat/table pick (the design's "Asiento" badge).
--  · event_tickets.seat_label — display label ("A4 · A5" / "Mesa 3") on the ticket.
--  · event_reviews — per-user event reviews (public read, one per user+event,
--      rate-limited via tg_ugc_ratelimit like business reviews).
--  · event_seat_claims — ONE ROW PER CLAIMED SEAT with unique(event_id,seat):
--      the DB is the arbiter, so two buyers can never hold the same seat. Claims
--      are written ONLY inside _issue_tickets_multi (definer). If a paid buyer
--      loses the race, issuance raises → the webhook's existing fail path
--      auto-refunds them (verified in stripe-webhook).
--  · SECURITY FIX piggybacked: 0104's payment gate read items->>'tierId' but the
--      real client sends 'tier_id' → the gate NEVER fired on real calls (paid
--      tickets were still mintable free via direct RPC). Gate + issuer now accept
--      both keys.
--  · _issue_tickets_multi / buy_event_tickets_multi / fulfill_event_tickets_multi
--      gain in_seats jsonb (default null). Old overloads DROPPED (PostgREST
--      ambiguity precedent: 0065).
-- Idempotent. Apply: node scripts/sbsql.mjs --file supabase/migrations/0113_events_experience.sql

-- ── 1) Columns ───────────────────────────────────────────────────────────────
alter table public.events      add column if not exists attrs   jsonb not null default '{}'::jsonb;
alter table public.events      add column if not exists seating jsonb;
alter table public.event_tiers add column if not exists seat    boolean not null default false;
alter table public.event_tickets add column if not exists seat_label text;

-- ── 2) Event reviews ─────────────────────────────────────────────────────────
create table if not exists public.event_reviews (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  author_name     text not null,
  author_initials text,
  rating     int  not null check (rating between 1 and 5),
  body_es    text,
  body_en    text,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);
create index if not exists event_reviews_event_idx on public.event_reviews (event_id, created_at desc);

alter table public.event_reviews enable row level security;
drop policy if exists "public read event reviews" on public.event_reviews;
create policy "public read event reviews" on public.event_reviews for select using (true);
drop policy if exists "own insert event review" on public.event_reviews;
create policy "own insert event review" on public.event_reviews for insert
  with check (auth.uid() = user_id);
drop policy if exists "own update event review" on public.event_reviews;
create policy "own update event review" on public.event_reviews for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own delete event review" on public.event_reviews;
create policy "own delete event review" on public.event_reviews for delete
  using (auth.uid() = user_id);

drop trigger if exists ugc_ratelimit on public.event_reviews;
create trigger ugc_ratelimit before insert on public.event_reviews
  for each row execute function public.tg_ugc_ratelimit('user_id', '10');

-- ── 3) Seat claims (anti-double-sell) ────────────────────────────────────────
create table if not exists public.event_seat_claims (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id) on delete cascade,
  seat       text not null,                       -- 'A1'…'F9' or 'T3'
  ticket_id  uuid references public.event_tickets(id) on delete cascade,
  user_id    uuid,
  created_at timestamptz not null default now(),
  unique (event_id, seat)
);
create index if not exists event_seat_claims_event_idx on public.event_seat_claims (event_id);

alter table public.event_seat_claims enable row level security;
-- Public read: the seat map must show taken seats to every visitor.
drop policy if exists "public read seat claims" on public.event_seat_claims;
create policy "public read seat claims" on public.event_seat_claims for select using (true);
-- No API-role writes: claims are written only by the SECURITY DEFINER issue RPC.

-- ── 4) Issue RPC with seats ──────────────────────────────────────────────────
drop function if exists public._issue_tickets_multi(uuid, text, jsonb, text);
create or replace function public._issue_tickets_multi(
  in_buyer uuid, in_slug text, in_items jsonb, in_promo text, in_seats jsonb default null
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

  -- ── Seats: validate the pick against the event's seat map and CLAIM each one.
  -- unique(event_id,seat) makes the insert the race arbiter: the loser raises
  -- 'seat taken' (paid path → webhook auto-refund; free path → user re-picks).
  if v_seated_qty > 0 then
    if v_seating is null then
      v_seated_qty := 0;  -- tier flagged seat but event has no map → general admission
    elsif in_seats is null or jsonb_typeof(in_seats) <> 'array' or jsonb_array_length(in_seats) = 0 then
      raise exception 'seats required' using errcode = 'check_violation';
    elsif v_seating->>'type' = 'seats' then
      if jsonb_array_length(in_seats) <> v_seated_qty then
        raise exception 'seat count mismatch' using errcode = 'check_violation'; end if;
      v_rows := coalesce((v_seating->>'rows')::int, 6);
      v_cols := coalesce((v_seating->>'cols')::int, 9);
      for v_seat in select distinct upper(btrim(value::text, ' "')) from jsonb_array_elements_text(in_seats) loop
        if v_seat !~ '^[A-Z][0-9]{1,2}$' then raise exception 'bad seat %', v_seat using errcode = 'check_violation'; end if;
        if (ascii(substr(v_seat,1,1)) - 64) > v_rows or substr(v_seat,2)::int > v_cols or substr(v_seat,2)::int < 1 then
          raise exception 'bad seat %', v_seat using errcode = 'check_violation'; end if;
        begin
          insert into public.event_seat_claims (event_id, seat, user_id) values (v_ev, v_seat, in_buyer);
        exception when unique_violation then
          raise exception 'seat taken: %', v_seat using errcode = 'check_violation';
        end;
        v_n := v_n + 1;
      end loop;
      if v_n <> v_seated_qty then raise exception 'seat count mismatch' using errcode = 'check_violation'; end if;
      select string_agg(s, ' · ' order by s) into v_seat_label
        from (select distinct upper(btrim(value::text, ' "')) s from jsonb_array_elements_text(in_seats)) x;
    elsif v_seating->>'type' = 'tables' then
      if jsonb_array_length(in_seats) <> 1 then raise exception 'pick one table' using errcode = 'check_violation'; end if;
      v_seat := upper(btrim(in_seats->>0));
      if v_seat !~ '^T[0-9]{1,3}$' then raise exception 'bad table' using errcode = 'check_violation'; end if;
      select (t->>'cap')::int into v_cap from jsonb_array_elements(v_seating->'tables') t
        where 'T' || (t->>'n') = v_seat limit 1;
      if v_cap is null then raise exception 'bad table' using errcode = 'check_violation'; end if;
      if v_cap < v_seated_qty then raise exception 'table too small' using errcode = 'check_violation'; end if;
      begin
        insert into public.event_seat_claims (event_id, seat, user_id) values (v_ev, v_seat, in_buyer);
      exception when unique_violation then
        raise exception 'seat taken: %', v_seat using errcode = 'check_violation';
      end;
      v_seat_label := 'Mesa ' || substr(v_seat, 2);
    end if;
  end if;

  select coalesce(nullif(btrim(display_name), ''), 'Cliente') into v_name from public.profiles where id = in_buyer;
  perform set_config('tolatino.bulk_ticket', 'on', true);

  return query
    with req as (select coalesce(i->>'tier_id', i->>'tierId')::uuid as tier_id, least(greatest(sum((i->>'qty')::int), 1), 10) as qty
      from jsonb_array_elements(in_items) i where coalesce((i->>'qty')::int, 0) > 0 group by 1)
    insert into public.event_tickets (event_id, user_id, customer_name, tier_id, qty, unit_price, total, status, promo_code, seat_label)
    select v_ev, in_buyer, coalesce(v_name, 'Cliente'), t.id, r.qty,
           round(t.price * case when v_kind in ('percent','amount') and (v_scope is null or v_scope = t.id) then v_factor else 1 end, 2),
           round(t.price * r.qty * case when v_kind in ('percent','amount') and (v_scope is null or v_scope = t.id) then v_factor else 1 end, 2),
           'confirmed', v_code,
           case when coalesce(t.seat, false) then v_seat_label else null end
    from req r join public.event_tiers t on t.id = r.tier_id and t.event_id = v_ev
    order by t.id
    returning event_tickets.id, event_tickets.code, event_tickets.tier_id;

  -- Link the claims to the first seated ticket row (audit trail; cascade cleanup).
  update public.event_seat_claims c
     set ticket_id = (select tk.id from public.event_tickets tk
                       where tk.event_id = v_ev and tk.user_id = in_buyer and tk.seat_label is not null
                       order by tk.created_at desc limit 1)
   where c.event_id = v_ev and c.user_id = in_buyer and c.ticket_id is null;

  if v_promo_id is not null then update public.event_promo_codes set used = used + 1 where id = v_promo_id; end if;

  select owner_id, title_es into v_owner, v_title from public.events where id = v_ev;
  perform public.notify_user(v_owner, 'ticket_new', jsonb_build_object('event', v_title, 'qty', v_total_qty, 'name', coalesce(v_name, 'Cliente'), 'promo', v_code), '/negocio');
end $fn$;
revoke execute on function public._issue_tickets_multi(uuid, text, jsonb, text, jsonb) from public;

-- ── 5) Wrappers (drop old overloads → no PostgREST ambiguity) ────────────────
drop function if exists public.buy_event_tickets_multi(text, jsonb, text);
create or replace function public.buy_event_tickets_multi(
  in_slug text, in_items jsonb, in_promo text default null, in_seats jsonb default null
) returns table(ticket_id uuid, code text, tier_id uuid)
language plpgsql security definer set search_path = public as $fn$
declare v_ev uuid; v_pays boolean; v_paid boolean;
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  select e.id, exists (select 1 from public.businesses b
          where b.owner_id = e.owner_id and coalesce(b.connect_charges_enabled, false))
    into v_ev, v_pays from public.events e where e.slug = in_slug limit 1;
  if v_ev is null then raise exception 'event not found'; end if;
  select exists (
    select 1 from jsonb_array_elements(in_items) it
    join public.event_tiers t on t.id = coalesce(it->>'tier_id', it->>'tierId')::uuid
    where coalesce((it->>'qty')::int, 0) > 0 and coalesce(t.price, 0) > 0
  ) into v_paid;
  if v_paid and v_pays then
    raise exception 'payment required' using errcode = 'check_violation';
  end if;
  return query select * from public._issue_tickets_multi(auth.uid(), in_slug, in_items, in_promo, in_seats);
end $fn$;
grant execute on function public.buy_event_tickets_multi(text, jsonb, text, jsonb) to authenticated;

drop function if exists public.fulfill_event_tickets_multi(uuid, text, jsonb, text);
create or replace function public.fulfill_event_tickets_multi(
  in_buyer uuid, in_slug text, in_items jsonb, in_promo text default null, in_seats jsonb default null
) returns table(ticket_id uuid, code text, tier_id uuid)
language plpgsql security definer set search_path = public as $fn$
begin
  return query select * from public._issue_tickets_multi(in_buyer, in_slug, in_items, in_promo, in_seats);
end $fn$;
revoke execute on function public.fulfill_event_tickets_multi(uuid, text, jsonb, text, jsonb) from public;
grant execute on function public.fulfill_event_tickets_multi(uuid, text, jsonb, text, jsonb) to service_role;

insert into public.schema_migrations (version) values ('0113_events_experience')
on conflict (version) do nothing;

notify pgrst, 'reload schema';
