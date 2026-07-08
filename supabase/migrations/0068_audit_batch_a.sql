-- 0068_audit_batch_a.sql — fixes from the live-DB whole-app audit (Batch A, DB side).
-- Idempotent. Portable vanilla Postgres. Apply: paste this WHOLE file + Run.
--
--   #1  buy_event_tickets: ambiguous "code" in RETURNING (same 42702 class that
--       broke buy_event_tickets_multi). Qualify the columns. LATENT: no button
--       calls the single-tier path yet, but it throws the instant one does.
--   #2  business_by_slug: add the `modules` jsonb column to the result so the
--       client can gate which detail tabs to show (stops real listings rendering
--       fixture taco menus / fake staff / fake rentals).
--   #3  chat messages: add a trigger so a new business_messages row notifies the
--       OTHER party in-app (the 'message' kind the bell already renders).
--   #10 event_waitlist: add to the realtime publication so Mi cuenta refreshes
--       live when a seat frees / organizer notifies (the client already subscribes).

-- ===========================================================================
-- #1 — buy_event_tickets: qualify the ambiguous RETURNING columns
-- ===========================================================================
create or replace function public.buy_event_tickets(in_slug text, in_tier_id uuid, in_qty integer)
returns table(ticket_id uuid, code text)
language plpgsql security definer set search_path to 'public' as $fn$
declare v_ev uuid; v_status text; v_name text; v_price numeric; v_cap int; v_sold int;
        v_start timestamptz; v_end timestamptz; v_id uuid; v_code text; q int;
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  q := greatest(1, least(coalesce(in_qty, 1), 10));
  select id, status into v_ev, v_status from public.events where slug = in_slug;
  if v_ev is null then raise exception 'event not found'; end if;
  if v_status = 'cancelled' then raise exception 'event cancelled'; end if;
  select price, capacity, sold, sales_start, sales_end into v_price, v_cap, v_sold, v_start, v_end
    from public.event_tiers where id = in_tier_id and event_id = v_ev for update;
  if not found then raise exception 'tier not found'; end if;
  if v_start is not null and now() < v_start then raise exception 'not on sale yet'; end if;
  if v_end   is not null and now() > v_end   then raise exception 'sales closed'; end if;
  if v_cap is not null and v_sold + q > v_cap then raise exception 'sold out'; end if;
  select coalesce(nullif(btrim(display_name), ''), 'Cliente') into v_name from public.profiles where id = auth.uid();
  insert into public.event_tickets (event_id, user_id, customer_name, tier_id, qty, unit_price, total, status)
    values (v_ev, auth.uid(), coalesce(v_name, 'Cliente'), in_tier_id, q, v_price, v_price * q, 'confirmed')
    returning event_tickets.id, event_tickets.code into v_id, v_code;  -- qualified: no collision with OUT "code"
  return query select v_id, v_code;
end $fn$;
grant execute on function public.buy_event_tickets(text, uuid, integer) to authenticated;

-- ===========================================================================
-- #2 — business_by_slug: append `modules` jsonb to the result (RETURNS TABLE
-- change requires DROP first). Everything else is byte-identical to live.
-- ===========================================================================
drop function if exists public.business_by_slug(text);
create function public.business_by_slug(in_slug text)
returns table(
  slug text, name text, category_id text, rating numeric, reviews_count integer,
  price_level text, is_open boolean, tier text, endorse_count integer, tile_a text, tile_b text,
  specialty_es text, specialty_en text, subcategories text[], features text[], card_features text[],
  hours jsonb, hours_exceptions jsonb, amenities_es text[], amenities_en text[],
  review_es text, review_en text, phone text, address text, city text, website text, logo_url text,
  accepts_messages boolean, message_channel text, message_phone text, about_es text, about_en text,
  distance_m double precision, modules jsonb
)
language sql stable as $fn$
  select b.slug, b.name, b.category_id,
         b.rating, b.reviews_count,
         b.price_level, b.is_open, b.tier,
         b.endorse_count, b.tile_a, b.tile_b,
         b.specialty_es, b.specialty_en,
         b.subcategories,
         b.features, b.card_features,
         b.hours, b.hours_exceptions,
         (select coalesce(array_agg(a.name_es order by a.id), '{}')
            from public.business_amenities ba join public.amenities a on a.id = ba.amenity_id
           where ba.business_id = b.id),
         (select coalesce(array_agg(a.name_en order by a.id), '{}')
            from public.business_amenities ba join public.amenities a on a.id = ba.amenity_id
           where ba.business_id = b.id),
         (select r.body_es from public.reviews r where r.business_id = b.id and r.featured order by r.created_at desc limit 1),
         (select r.body_en from public.reviews r where r.business_id = b.id and r.featured order by r.created_at desc limit 1),
         b.phone, b.address, b.city, b.website, b.logo_url,
         b.accepts_messages, b.message_channel, b.message_phone,
         b.about_es, b.about_en,
         null::double precision,
         b.modules
  from public.businesses b
  where b.slug = in_slug
  limit 1;
$fn$;
grant execute on function public.business_by_slug(text) to anon, authenticated;

-- ===========================================================================
-- #3 — chat messages notify the other party (the 'message' bell kind)
-- ===========================================================================
create or replace function public.tg_notify_message() returns trigger
language plpgsql security definer set search_path = public as $fn$
declare v_biz uuid; v_owner uuid; v_customer uuid; v_bizname text; v_custname text;
        v_recipient uuid; v_name text; v_link text;
begin
  select c.business_id, c.customer_user_id, c.customer_name
    into v_biz, v_customer, v_custname
    from public.business_conversations c where c.id = new.conversation_id;
  select b.owner_id, b.name into v_owner, v_bizname from public.businesses b where b.id = v_biz;
  if new.from_owner then
    v_recipient := v_customer; v_name := coalesce(nullif(btrim(v_bizname), ''), 'Negocio'); v_link := '/cuenta';
  else
    v_recipient := v_owner; v_name := coalesce(nullif(btrim(v_custname), ''), 'Cliente'); v_link := '/negocio';
  end if;
  if v_recipient is not null then
    perform public.notify_user(v_recipient, 'message',
      jsonb_build_object('name', v_name, 'preview', left(coalesce(new.body, ''), 80)), v_link);
  end if;
  return new;
end $fn$;
drop trigger if exists trg_notify_message on public.business_messages;
create trigger trg_notify_message after insert on public.business_messages
  for each row execute function public.tg_notify_message();

-- ===========================================================================
-- #10 — event_waitlist live updates (guarded add to the realtime publication)
-- ===========================================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'event_waitlist'
  ) then
    alter publication supabase_realtime add table public.event_waitlist;
  end if;
end $$;

notify pgrst, 'reload schema';
