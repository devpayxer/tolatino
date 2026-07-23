-- 0114_events_read_rpcs.sql
-- Read side for the Events consumer handoff. Extends event_by_slug with the
-- detail extras (attrs, seating, per-tier seat flag, organizer meta, review
-- aggregate) and adds: seat_claims_by_slug (taken seats for the map),
-- event_reviews_by_slug (review list), post_event_review (own review upsert).
-- All SECURITY DEFINER / SQL where possible; public read. Idempotent.
-- Apply: node scripts/sbsql.mjs --file supabase/migrations/0114_events_read_rpcs.sql

drop function if exists public.event_by_slug(text);
create or replace function public.event_by_slug(in_slug text)
returns table(
  slug text, title_es text, title_en text, venue_es text, venue_en text, cat text, city text,
  starts_at timestamptz, ends_at timestamptz, time_label_es text, time_label_en text, price_label text,
  desc_es text, desc_en text, tile_a text, tile_b text, cover_url text, status text, going_count integer,
  lat double precision, lng double precision, organizer text, organizer_slug text, tiers jsonb,
  accepts_payments boolean, attrs jsonb, seating jsonb,
  organizer_verified boolean, organizer_rating numeric, organizer_events integer,
  review_avg numeric, review_count integer
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
         coalesce(e.attrs, '{}'::jsonb),
         e.seating,
         coalesce((select b.tier <> 'free' from public.businesses b where b.owner_id = e.owner_id order by b.created_at limit 1), false),
         (select round(avg(r.rating), 1) from public.reviews r
            join public.businesses b on b.id = r.business_id where b.owner_id = e.owner_id),
         (select count(*)::int from public.events ev where ev.owner_id = e.owner_id and ev.status = 'published'),
         (select round(avg(er.rating), 1) from public.event_reviews er where er.event_id = e.id),
         (select count(*)::int from public.event_reviews er where er.event_id = e.id)
  from public.events e where e.slug = in_slug and e.status <> 'draft' limit 1;
$fn$;
grant execute on function public.event_by_slug(text) to anon, authenticated;

-- Taken seats for the live seat map (public — the map must show what's gone).
create or replace function public.seat_claims_by_slug(in_slug text)
returns table(seat text)
language sql stable security definer set search_path to 'public' as $fn$
  select c.seat from public.event_seat_claims c
  join public.events e on e.id = c.event_id where e.slug = in_slug;
$fn$;
grant execute on function public.seat_claims_by_slug(text) to anon, authenticated;

-- Event reviews (public read, newest first).
create or replace function public.event_reviews_by_slug(in_slug text, max_results int default 20)
returns table(author_name text, author_initials text, rating int, body_es text, body_en text, created_at timestamptz)
language sql stable security definer set search_path to 'public' as $fn$
  select r.author_name, r.author_initials, r.rating, r.body_es, r.body_en, r.created_at
  from public.event_reviews r join public.events e on e.id = r.event_id
  where e.slug = in_slug order by r.created_at desc limit greatest(1, least(max_results, 50));
$fn$;
grant execute on function public.event_reviews_by_slug(text, int) to anon, authenticated;

-- Post/update the caller's own review (one per user+event). Only attendees who
-- hold a ticket may review — mirrors real ticketing platforms.
create or replace function public.post_event_review(in_slug text, in_rating int, in_body text)
returns void language plpgsql security definer set search_path to 'public' as $fn$
declare v_ev uuid; v_name text; v_init text;
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  if in_rating < 1 or in_rating > 5 then raise exception 'bad rating'; end if;
  select id into v_ev from public.events where slug = in_slug;
  if v_ev is null then raise exception 'event not found'; end if;
  if not exists (select 1 from public.event_tickets t where t.event_id = v_ev and t.user_id = auth.uid()) then
    raise exception 'ticket required' using errcode = 'check_violation';
  end if;
  select coalesce(nullif(btrim(display_name), ''), 'Cliente'), coalesce(nullif(btrim(initials), ''), 'TL')
    into v_name, v_init from public.profiles where id = auth.uid();
  insert into public.event_reviews (event_id, user_id, author_name, author_initials, rating, body_es, body_en)
  values (v_ev, auth.uid(), coalesce(v_name, 'Cliente'), coalesce(v_init, 'TL'), in_rating, nullif(btrim(in_body), ''), nullif(btrim(in_body), ''))
  on conflict (event_id, user_id) do update
    set rating = excluded.rating, body_es = excluded.body_es, body_en = excluded.body_en, created_at = now();
end $fn$;
grant execute on function public.post_event_review(text, int, text) to authenticated;

insert into public.schema_migrations (version) values ('0114_events_read_rpcs')
on conflict (version) do nothing;

notify pgrst, 'reload schema';
