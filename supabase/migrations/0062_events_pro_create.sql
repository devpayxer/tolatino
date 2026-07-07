-- To'Latino — professional event creation (Eventbrite-grade wizard backend). The
-- old wizard was thin: 4 fixed types, one flat ticket, free-text date/place, no
-- coordinates. This migration widens the category taxonomy and adds ONE atomic
-- create RPC that stores everything the pro wizard collects — cover photo, start
-- AND end time, real lat/lng (from our geo autofill), status, and an ARRAY of
-- ticket tiers — in a single call. Portable vanilla Postgres. Idempotent. Apply:
-- paste into the Supabase SQL Editor + Run.

-- 1) widen the event category set (keep the original 4 keys for existing rows).
alter table public.events drop constraint if exists events_cat_check;
alter table public.events drop constraint if exists events_cat_chk;
alter table public.events add constraint events_cat_chk check (cat in (
  'musica', 'nightlife', 'comida', 'familia', 'comunidad', 'arte',
  'deportes', 'negocios', 'salud', 'mercado', 'fe', 'taller', 'otro'
));

-- 2) create an event + its tiers atomically. p_tiers is a JSON array of
--    {name, price, capacity} objects (capacity '' / null = unlimited). Returns the
--    generated slug. SECURITY DEFINER; the event is owned by the caller.
create or replace function public.create_event_full(
  p_title        text,
  p_desc         text,
  p_cat          text,
  p_starts_at    timestamptz,
  p_ends_at      timestamptz,
  p_time_label_es text,
  p_time_label_en text,
  p_venue        text,
  p_city         text,
  p_lat          double precision,
  p_lng          double precision,
  p_cover_url    text,
  p_tile_a       text,
  p_tile_b       text,
  p_tiers        jsonb
) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_title text := btrim(coalesce(p_title, ''));
  v_slug  text;
  v_id    uuid;
  v_i     int := 0;
  t       jsonb;
  v_min   numeric;
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  if v_title = '' then raise exception 'title required'; end if;
  if p_cat is null or p_cat not in (
    'musica','nightlife','comida','familia','comunidad','arte',
    'deportes','negocios','salud','mercado','fe','taller','otro'
  ) then raise exception 'invalid category'; end if;
  if p_starts_at is null then raise exception 'start date required'; end if;

  -- slug: lowercase, non-alnum → '-', trim, + 6-hex suffix for uniqueness
  v_slug := regexp_replace(lower(v_title), '[^a-z0-9]+', '-', 'g');
  v_slug := btrim(v_slug, '-');
  if v_slug = '' then v_slug := 'evento'; end if;
  v_slug := left(v_slug, 40) || '-' || substr(md5(random()::text || clock_timestamp()::text), 1, 6);

  insert into public.events (
    slug, title_es, title_en, venue_es, venue_en, cat, city, starts_at, ends_at,
    time_label_es, time_label_en, price_label, desc_es, desc_en, tile_a, tile_b,
    cover_url, owner_id, location, status
  ) values (
    v_slug, v_title, v_title, coalesce(p_venue, ''), coalesce(p_venue, ''), p_cat,
    coalesce(nullif(btrim(p_city), ''), 'Houston, TX'), p_starts_at, p_ends_at,
    p_time_label_es, p_time_label_en, null, coalesce(p_desc, ''), coalesce(p_desc, ''),
    coalesce(nullif(p_tile_a, ''), '#EFEBFF'), coalesce(nullif(p_tile_b, ''), '#E5DEF9'),
    nullif(btrim(coalesce(p_cover_url, '')), ''), auth.uid(),
    case when p_lat is not null and p_lng is not null
         then st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography end,
    'published'
  ) returning id into v_id;

  -- tiers from the array (each an object with name/price/capacity)
  if p_tiers is not null and jsonb_typeof(p_tiers) = 'array' then
    for t in select * from jsonb_array_elements(p_tiers) loop
      insert into public.event_tiers (event_id, name_es, name_en, price, capacity, sort)
      values (
        v_id,
        coalesce(nullif(btrim(t->>'name'), ''), 'Entrada general'),
        coalesce(nullif(btrim(t->>'name'), ''), 'General admission'),
        coalesce((t->>'price')::numeric, 0),
        case when nullif(btrim(coalesce(t->>'capacity', '')), '') is null
             then null else (t->>'capacity')::int end,
        v_i
      );
      v_i := v_i + 1;
    end loop;
  end if;
  -- no tiers provided → seed a free "Entrada general" so the event is sellable
  if v_i = 0 then
    insert into public.event_tiers (event_id, name_es, name_en, price, capacity, sort)
    values (v_id, 'Entrada general', 'General admission', 0, null, 0);
  end if;

  -- card price_label = cheapest PAID tier ("$15" / "$15.5"), or null when free
  select min(price) into v_min from public.event_tiers where event_id = v_id and price > 0;
  update public.events set price_label = case
    when v_min is null then null
    when v_min = trunc(v_min) then '$' || trunc(v_min)::int::text
    else '$' || v_min::text end
  where id = v_id;

  return v_slug;
end $$;
grant execute on function public.create_event_full(
  text, text, text, timestamptz, timestamptz, text, text, text, text,
  double precision, double precision, text, text, text, jsonb
) to authenticated;

notify pgrst, 'reload schema';
