-- To'Latino — let a signed-in owner create & manage their own events from the
-- business dashboard (Módulos → Eventos), and fix the consumer "Crear evento"
-- stub. Adds events.owner_id, owner update/delete RLS, and a create_event RPC
-- (generates a slug, stamps the owner + PostGIS location). Public read already
-- exists. Idempotent. Apply: paste into the Supabase SQL Editor and Run.

alter table public.events add column if not exists owner_id uuid references auth.users(id) on delete set null;
create index if not exists events_owner_idx on public.events (owner_id, starts_at desc);

drop policy if exists "owner update events" on public.events;
drop policy if exists "owner delete events" on public.events;
create policy "owner update events" on public.events
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "owner delete events" on public.events
  for delete using (auth.uid() = owner_id);

drop function if exists public.create_event(text, text, text, text, text, timestamptz, text, text, text, text, text, text, text, text, double precision, double precision);
create or replace function public.create_event(
  p_title_es      text,
  p_title_en      text,
  p_venue_es      text,
  p_venue_en      text,
  p_cat           text,
  p_starts_at     timestamptz,
  p_time_label_es text,
  p_time_label_en text,
  p_price_label   text,
  p_desc_es       text,
  p_desc_en       text,
  p_city          text,
  p_tile_a        text,
  p_tile_b        text,
  p_lat           double precision,
  p_lng           double precision
) returns text
language plpgsql security definer set search_path = public as $$
declare
  uid      uuid := auth.uid();
  new_slug text;
begin
  if uid is null then raise exception 'auth required'; end if;
  if coalesce(trim(p_title_es), '') = '' then raise exception 'title required'; end if;
  if p_cat not in ('musica', 'mercado', 'familia', 'comida') then raise exception 'invalid category'; end if;

  new_slug := trim(both '-' from regexp_replace(lower(trim(p_title_es)), '[^a-z0-9]+', '-', 'g'));
  if new_slug = '' then new_slug := 'evento'; end if;
  new_slug := new_slug || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);

  insert into events (
    slug, owner_id, title_es, title_en, venue_es, venue_en, cat, city, starts_at,
    time_label_es, time_label_en, price_label, desc_es, desc_en, tile_a, tile_b, location
  ) values (
    new_slug, uid, trim(p_title_es), coalesce(nullif(p_title_en, ''), trim(p_title_es)),
    nullif(p_venue_es, ''), nullif(p_venue_en, ''), p_cat,
    coalesce(nullif(p_city, ''), 'Houston, TX'), p_starts_at,
    nullif(p_time_label_es, ''), nullif(p_time_label_en, ''), nullif(p_price_label, ''),
    nullif(p_desc_es, ''), nullif(p_desc_en, ''),
    coalesce(nullif(p_tile_a, ''), '#EFEBFF'), coalesce(nullif(p_tile_b, ''), '#E5DEF9'),
    case when p_lat is not null and p_lng is not null then st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography end
  );
  return new_slug;
end $$;
grant execute on function public.create_event(text, text, text, text, text, timestamptz, text, text, text, text, text, text, text, text, double precision, double precision) to authenticated;
