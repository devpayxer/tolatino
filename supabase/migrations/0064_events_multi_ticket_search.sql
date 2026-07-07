-- To'Latino — Eventos Phase 1: atomic multi-tier purchase + server-side event search.
-- TWO capabilities in ONE idempotent migration. Portable vanilla Postgres.
-- Apply: paste this WHOLE file into the Supabase SQL Editor and Run.
--
-- PART A — ATOMIC multi-tier ticket purchase (buy_event_tickets_multi).
--   Today the app buys a multi-tier order by calling buy_event_tickets() once per
--   tier (a client loop): if a later tier sells out mid-loop the earlier tiers are
--   already committed — a PARTIAL order. buy_event_tickets_multi() locks ALL
--   requested tiers in a deterministic order (by id → deadlock-free), validates
--   every capacity + sales window BEFORE issuing any ticket, then inserts them in
--   ONE statement (all-or-nothing). buy_event_tickets() is left UNTOUCHED
--   (back-compat). ONE aggregated organizer notice per order (Eventbrite-style),
--   via a txn-local flag that suppresses the per-row ticket notification.
--
-- PART B — Server-side EVENT search (search_events), mirroring Negocios FTS (0055).
--   Real Postgres full-text search over a maintained tsvector (widened to include
--   description + category) + trigram fuzzy fallback, PUBLISHED+UPCOMING only
--   (0063 predicate), geo-scoped via st_dwithin, category/free filters pushed into
--   SQL (so a filtered search can't under-return), ranked relevance then soonest,
--   paginated. Returns the SAME columns as events_near so the client reuses its row
--   mapper. Retires the narrow generated search_vector from 0002 (title+venue only).

-- ==========================================================================
-- PART A — atomic multi-tier ticket purchase
-- ==========================================================================

-- Suppress the per-row organizer ping during a bulk order (one aggregated notice
-- is sent by buy_event_tickets_multi instead). Single-tier buy_event_tickets()
-- never sets the flag → unchanged one-notification-per-sale behavior. This is the
-- ONLY change to existing SQL (a 3-line guard at the top of the INSERT branch).
create or replace function public.tg_notify_ticket() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_title text;
begin
  if tg_op = 'INSERT' then
    if coalesce(current_setting('tolatino.bulk_ticket', true), '') = 'on' then
      return new;  -- buy_event_tickets_multi emits ONE aggregated notice itself
    end if;
    select owner_id, title_es into v_owner, v_title from public.events where id = new.event_id;
    perform public.notify_user(v_owner, 'ticket_new',
      jsonb_build_object('event', v_title, 'qty', new.qty, 'name', new.customer_name, 'code', new.code), '/negocio');
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    select title_es into v_title from public.events where id = new.event_id;
    perform public.notify_user(new.user_id, 'ticket_status',
      jsonb_build_object('event', v_title, 'status', new.status, 'code', new.code), '/cuenta');
  end if;
  return new;
end $$;
-- trg_notify_ticket trigger already wired in 0061 → create-or-replace keeps it.

create or replace function public.buy_event_tickets_multi(in_slug text, in_items jsonb)
returns table (ticket_id uuid, code text, tier_id uuid)
language plpgsql security definer set search_path = public as $$
declare
  v_ev uuid; v_status text; v_owner uuid; v_title text; v_name text;
  v_tier record; v_matched int := 0; v_req int; v_total_qty int := 0;
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  -- defense-in-depth: adversarial/edge input fails cleanly, not with a raw SQLSTATE
  if in_items is null or jsonb_typeof(in_items) <> 'array' then
    raise exception 'no tickets selected';
  end if;

  select id, status into v_ev, v_status from public.events where slug = in_slug;
  if v_ev is null then raise exception 'event not found'; end if;
  if v_status = 'cancelled' then raise exception 'event cancelled'; end if;
  if v_status <> 'published' then raise exception 'event not on sale'; end if;

  -- how many DISTINCT tiers were requested with a positive qty
  select count(*) into v_req from (
    select distinct (i->>'tier_id')::uuid
    from jsonb_array_elements(in_items) i
    where coalesce((i->>'qty')::int, 0) > 0
  ) s;
  if v_req = 0 then raise exception 'no tickets selected'; end if;

  -- PHASE 1 — lock every requested tier in a DETERMINISTIC order (by id) to avoid
  -- deadlocks (ORDER BY is applied before the LockRows node, so all concurrent
  -- callers acquire tier locks in the same ascending-id order), and validate
  -- capacity + sales window for ALL before any insert.
  for v_tier in
    with req as (
      select (i->>'tier_id')::uuid as tier_id,
             least(greatest(sum((i->>'qty')::int), 1), 10) as qty
      from jsonb_array_elements(in_items) i
      where coalesce((i->>'qty')::int, 0) > 0
      group by 1
    )
    select t.id, coalesce(nullif(btrim(t.name_es), ''), 'Boleto') as name_es,
           t.capacity, t.sold, t.sales_start, t.sales_end, r.qty
    from req r
    join public.event_tiers t on t.id = r.tier_id and t.event_id = v_ev
    order by t.id
    for update of t
  loop
    if v_tier.sales_start is not null and now() < v_tier.sales_start then
      raise exception 'not on sale yet: %', v_tier.name_es using errcode = 'check_violation';
    end if;
    if v_tier.sales_end is not null and now() > v_tier.sales_end then
      raise exception 'sales closed: %', v_tier.name_es using errcode = 'check_violation';
    end if;
    if v_tier.capacity is not null and v_tier.sold + v_tier.qty > v_tier.capacity then
      raise exception 'sold out: %', v_tier.name_es using errcode = 'check_violation';
    end if;
    v_matched := v_matched + 1;
    v_total_qty := v_total_qty + v_tier.qty;
  end loop;

  -- a requested tier that isn't a real tier of THIS event → hard fail (no partial)
  if v_matched <> v_req then raise exception 'tier not found'; end if;

  select coalesce(nullif(btrim(display_name), ''), 'Cliente') into v_name
    from public.profiles where id = auth.uid();

  -- silence the per-row organizer ping; we send ONE aggregated notice below
  perform set_config('tolatino.bulk_ticket', 'on', true);

  -- PHASE 2 — all checks passed: issue every ticket in ONE statement (atomic).
  return query
    with req as (
      select (i->>'tier_id')::uuid as tier_id,
             least(greatest(sum((i->>'qty')::int), 1), 10) as qty
      from jsonb_array_elements(in_items) i
      where coalesce((i->>'qty')::int, 0) > 0
      group by 1
    )
    insert into public.event_tickets
      (event_id, user_id, customer_name, tier_id, qty, unit_price, total, status)
    select v_ev, auth.uid(), coalesce(v_name, 'Cliente'),
           t.id, r.qty, t.price, t.price * r.qty, 'confirmed'
    from req r
    join public.event_tiers t on t.id = r.tier_id and t.event_id = v_ev
    order by t.id
    returning event_tickets.id, event_tickets.code, event_tickets.tier_id;
  -- per-row triggers still run: tg_event_tier_sold re-sums each touched tier;
  -- tg_notify_ticket is suppressed by the flag above.

  -- ONE aggregated organizer notification for the whole order
  select owner_id, title_es into v_owner, v_title from public.events where id = v_ev;
  perform public.notify_user(v_owner, 'ticket_new',
    jsonb_build_object('event', v_title, 'qty', v_total_qty, 'name', coalesce(v_name, 'Cliente')), '/negocio');
end $$;
grant execute on function public.buy_event_tickets_multi(text, jsonb) to authenticated;

-- ==========================================================================
-- PART B — server-side event search
-- ==========================================================================

create extension if not exists pg_trgm;

-- Maintained search document: title + venue + description + category, both langs.
-- 'simple' = tokenize/lowercase, no stemming (works ES + EN + brand names). We use
-- a BEFORE trigger (not a generated column) NOT because of 42P17 —
-- to_tsvector('simple', <text>) with a CONSTANT regconfig IS immutable — but
-- because a generated column's expression cannot be ALTERed to widen it to include
-- desc/cat later; a trigger can. Mirrors the businesses pattern (0055).
alter table public.events add column if not exists search_tsv tsvector;

create or replace function public.tg_event_search_tsv() returns trigger
language plpgsql as $$
begin
  new.search_tsv := to_tsvector('simple',
    coalesce(new.title_es, '') || ' ' || coalesce(new.title_en, '') || ' ' ||
    coalesce(new.venue_es, '') || ' ' || coalesce(new.venue_en, '') || ' ' ||
    coalesce(new.desc_es,  '') || ' ' || coalesce(new.desc_en,  '') || ' ' ||
    coalesce(new.cat, ''));
  return new;
end $$;
drop trigger if exists trg_event_search_tsv on public.events;
create trigger trg_event_search_tsv before insert or update on public.events
  for each row execute function public.tg_event_search_tsv();

-- backfill existing rows (the trigger only fires on future writes)
update public.events set search_tsv = to_tsvector('simple',
  coalesce(title_es, '') || ' ' || coalesce(title_en, '') || ' ' ||
  coalesce(venue_es, '') || ' ' || coalesce(venue_en, '') || ' ' ||
  coalesce(desc_es,  '') || ' ' || coalesce(desc_en,  '') || ' ' ||
  coalesce(cat, ''));

create index if not exists events_search_tsv_gin on public.events using gin (search_tsv);
create index if not exists events_title_trgm     on public.events using gin (title_es gin_trgm_ops);

-- Retire the narrow generated column from 0002 (title+venue only; nothing queries
-- it — grep-confirmed). Dropping the column auto-drops its dependent GIN index
-- (events_search_gin). Metadata-only (brief ACCESS EXCLUSIVE lock, not a rewrite).
-- Idempotent.
alter table public.events drop column if exists search_vector;

-- search_events: FTS + trigram, published + upcoming, geo-scoped, category/free
-- filters pushed into SQL (so a filtered search returns the right rows, not the
-- top-N-then-client-filter under-return), paginated. SECURITY INVOKER (default) —
-- public-read RLS covers events; the status filter keeps drafts out regardless.
-- Same 15 columns/order as events_near (client reuses its row mapper). Rank by
-- relevance THEN starts_at asc (soonest) — NOT distance.
create or replace function public.search_events(
  in_q        text default null,
  user_lat    double precision default null,
  user_lng    double precision default null,
  radius_m    double precision default 80000,
  in_cat      text default null,
  in_free     boolean default null,
  max_results int default 30,
  in_offset   int default 0
) returns table (
  slug text, title_es text, title_en text, venue_es text, venue_en text,
  cat text, starts_at timestamptz, time_label_es text, time_label_en text,
  price_label text, going_count int, desc_es text, desc_en text,
  tile_a text, tile_b text
) language sql stable as $$
  with q as (select nullif(btrim(coalesce(in_q, '')), '') as t),
  origin as (
    select case when user_lat is not null and user_lng is not null
                then st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography end as g
  )
  select e.slug, e.title_es, e.title_en, e.venue_es, e.venue_en,
         e.cat, e.starts_at, e.time_label_es, e.time_label_en,
         e.price_label, e.going_count, e.desc_es, e.desc_en, e.tile_a, e.tile_b
  from public.events e
  cross join origin o
  cross join q
  where e.status = 'published'
    and coalesce(e.ends_at, e.starts_at + interval '3 hours') >= now()
    and (o.g is null or radius_m is null or e.location is null
         or st_dwithin(e.location, o.g, radius_m))
    and (in_cat is null or e.cat = in_cat)
    and (in_free is null
         or (in_free and e.price_label is null)
         or (not in_free and e.price_label is not null))
    and (
      q.t is null
      or e.search_tsv @@ websearch_to_tsquery('simple', q.t)
      or e.title_es ilike '%' || q.t || '%'
      or e.title_en ilike '%' || q.t || '%'
      or similarity(e.title_es, q.t) > 0.2
    )
  order by
    (case when q.t is not null then ts_rank(e.search_tsv, websearch_to_tsquery('simple', q.t)) end) desc nulls last,
    e.starts_at asc
  offset greatest(0, in_offset)
  limit greatest(1, least(max_results, 60));
$$;
grant execute on function public.search_events(text, double precision, double precision, double precision, text, boolean, int, int) to anon, authenticated;

notify pgrst, 'reload schema';
