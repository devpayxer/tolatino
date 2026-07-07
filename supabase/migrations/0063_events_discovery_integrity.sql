-- To'Latino — Eventos P0 data-layer integrity. Three discovery/correctness holes:
--   1. events_near returned EVERY event regardless of date or status — past events
--      and drafts/cancelled ones polluted the "cerca de ti" feed forever. It also
--      ranked by st_distance (no index use). Now: only PUBLISHED, still-upcoming
--      events, geo-filtered with st_dwithin (GIST-index-accelerated for 1M+ scale).
--   2. event_by_slug resolved DRAFTS to the public (anyone with the slug saw an
--      unpublished event). Now drafts 404; cancelled still resolve so the detail
--      page can show a "Cancelado" banner (it already returns status).
--   3. RSVP ("Voy") inserted into event_attendance even for cancelled/draft events.
--      A BEFORE-INSERT guard now blocks attendance on anything not published — at
--      the DB, so every client path (app, realtime, future API) is covered.
-- Portable vanilla Postgres. Idempotent. Apply: paste into Supabase SQL Editor + Run.

-- ── 1. events_near: published + upcoming only, index-accelerated geo ──────────
-- "upcoming" keeps an event visible while it's in progress: use ends_at when set,
-- else assume a 3h duration, so a show that started an hour ago still shows today.
create or replace function public.events_near(
  user_lat double precision default null,
  user_lng double precision default null,
  radius_m double precision default 80000,
  max_results int default 50
) returns table (
  slug text, title_es text, title_en text, venue_es text, venue_en text,
  cat text, starts_at timestamptz, time_label_es text, time_label_en text,
  price_label text, going_count int, desc_es text, desc_en text,
  tile_a text, tile_b text
) language sql stable as $$
  with origin as (
    select case when user_lat is not null and user_lng is not null
                then st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography
           end as g
  )
  select e.slug, e.title_es, e.title_en, e.venue_es, e.venue_en,
         e.cat, e.starts_at, e.time_label_es, e.time_label_en,
         e.price_label, e.going_count, e.desc_es, e.desc_en, e.tile_a, e.tile_b
  from public.events e
  cross join origin o
  where e.status = 'published'
    and coalesce(e.ends_at, e.starts_at + interval '3 hours') >= now()
    and (o.g is null or radius_m is null or e.location is null
         or st_dwithin(e.location, o.g, radius_m))
  order by e.starts_at asc
  limit greatest(1, least(max_results, 100));
$$;
grant execute on function public.events_near to anon, authenticated;

-- partial index so the planner prunes to upcoming published events fast at scale
create index if not exists events_discovery_idx
  on public.events (starts_at)
  where status = 'published';

-- ── 2. event_by_slug: drafts 404, published + cancelled resolve ──────────────
create or replace function public.event_by_slug(in_slug text)
returns table (
  slug text, title_es text, title_en text, venue_es text, venue_en text,
  cat text, city text, starts_at timestamptz, ends_at timestamptz,
  time_label_es text, time_label_en text, price_label text,
  desc_es text, desc_en text, tile_a text, tile_b text, cover_url text,
  status text, going_count int, lat double precision, lng double precision,
  organizer text, tiers jsonb
)
language sql stable security definer set search_path = public as $$
  select e.slug, e.title_es, e.title_en, e.venue_es, e.venue_en,
         e.cat, e.city, e.starts_at, e.ends_at,
         e.time_label_es, e.time_label_en, e.price_label,
         e.desc_es, e.desc_en, e.tile_a, e.tile_b, e.cover_url,
         e.status, e.going_count,
         case when e.location is not null then st_y(e.location::geometry) end,
         case when e.location is not null then st_x(e.location::geometry) end,
         coalesce(
           (select b.name from public.businesses b where b.owner_id = e.owner_id order by b.created_at limit 1),
           (select p.display_name from public.profiles p where p.id = e.owner_id),
           'Organizador'),
         coalesce((
           select jsonb_agg(jsonb_build_object(
             'id', t.id, 'name_es', t.name_es, 'name_en', t.name_en,
             'price', t.price, 'capacity', t.capacity, 'sold', t.sold,
             'remaining', case when t.capacity is null then null else greatest(0, t.capacity - t.sold) end,
             'sales_start', t.sales_start, 'sales_end', t.sales_end
           ) order by t.sort, t.created_at)
           from public.event_tiers t where t.event_id = e.id and t.visible), '[]'::jsonb)
  from public.events e
  where e.slug = in_slug
    and e.status <> 'draft'
  limit 1;
$$;
grant execute on function public.event_by_slug(text) to anon, authenticated;

-- ── 3. block RSVP on anything not published (cancelled / draft) ───────────────
create or replace function public.tg_event_attendance_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_status text;
begin
  select status into v_status from public.events where id = new.event_id;
  if v_status is distinct from 'published' then
    raise exception 'event not open for RSVP' using errcode = 'check_violation';
  end if;
  return new;
end $$;
drop trigger if exists trg_event_attendance_guard on public.event_attendance;
create trigger trg_event_attendance_guard before insert on public.event_attendance
  for each row execute function public.tg_event_attendance_guard();

-- ── 4. organizer dashboard: real aggregate totals (no fake KPIs) ──────────────
-- One owner-scoped, indexed roll-up for the "Este mes" rail + top KPIs. Replaces
-- the hardcoded 186 / $14.2k / 212 placeholders with live numbers.
drop function if exists public.owner_events_summary();
create or replace function public.owner_events_summary()
returns table (upcoming int, tickets_sold int, revenue numeric, attendees int)
language sql stable security definer set search_path = public as $$
  select
    (select count(*) from public.events e
       where e.owner_id = auth.uid() and e.status = 'published'
         and coalesce(e.ends_at, e.starts_at + interval '3 hours') >= now())::int,
    coalesce((select sum(k.qty) from public.event_tickets k
       join public.events e on e.id = k.event_id
       where e.owner_id = auth.uid() and k.status in ('confirmed', 'used')), 0)::int,
    coalesce((select sum(k.total) from public.event_tickets k
       join public.events e on e.id = k.event_id
       where e.owner_id = auth.uid() and k.status in ('confirmed', 'used')), 0)::numeric,
    coalesce((select count(*) from public.event_attendance a
       join public.events e on e.id = a.event_id
       where e.owner_id = auth.uid()), 0)::int;
$$;
grant execute on function public.owner_events_summary() to authenticated;

-- ── 5. cancel an event the RIGHT way: soft-cancel + notify every attendee ─────
-- Hard delete cascades event_tickets away (buyers lose their tickets, no record).
-- Instead flip status→cancelled (consumer shows a "Cancelado" banner, discovery
-- drops it, new RSVP/buys are blocked) and notify everyone holding a ticket/RSVP.
create or replace function public.cancel_event(in_event_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_title text;
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  select owner_id, title_es into v_owner, v_title from public.events where id = in_event_id;
  if v_owner is null then raise exception 'event not found'; end if;
  if v_owner is distinct from auth.uid() then raise exception 'not your event'; end if;
  update public.events set status = 'cancelled' where id = in_event_id;
  perform public.notify_user(k.user_id, 'event_cancelled',
            jsonb_build_object('event', v_title), '/cuenta')
  from (
    select distinct user_id from public.event_tickets
      where event_id = in_event_id and status in ('confirmed', 'used')
    union
    select distinct user_id from public.event_attendance where event_id = in_event_id
  ) k;
end $$;
grant execute on function public.cancel_event(uuid) to authenticated;

notify pgrst, 'reload schema';
