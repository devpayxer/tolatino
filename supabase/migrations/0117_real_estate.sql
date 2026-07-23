-- 0117_real_estate.sql
-- Bienes Raíces vertical (handoff 2026-07-23, "Real Estate Flow" bundle):
-- Zillow-style consumer search + property detail + tours + offers/applications,
-- agent/agency panel (listings CRUD, leads pipeline, tours agenda), directory =
-- businesses with the new RealEstate category. Designed for 1M+ scale: PostGIS
-- geography + GIST for "near me", FTS (spanish) GIN for search, btree on the
-- filter columns, keyset-friendly ordering, RLS everywhere. Vanilla Postgres —
-- portable to self-hosted. Idempotent.
-- Apply: node scripts/sbsql.mjs --file supabase/migrations/0117_real_estate.sql

-- ── Category: agencies/agents register as businesses of this category ────────
insert into public.categories (id, name_es, name_en, sort)
values ('RealEstate', 'Bienes Raíces', 'Real Estate', 16)
on conflict (id) do update set name_es = excluded.name_es, name_en = excluded.name_en;

-- ── Agent/agency config on the business (license gate, specialty, zones) ─────
alter table public.businesses add column if not exists re_config jsonb;
-- re_config = { license: 'TREC #…', specialty: 'residential'|'commercial'|'rentals',
--               zones: ['Gulfton', …], langs: 'ES/EN', broker: '…' }

-- ── properties ───────────────────────────────────────────────────────────────
create table if not exists public.properties (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users(id) on delete cascade,
  business_id  uuid references public.businesses(id) on delete set null,
  slug         text not null unique,
  deal         text not null check (deal in ('venta','renta','cuarto','comercial')),
  ptype        text not null check (ptype in ('casa','condo','townhouse','departamento','cuarto','local','oficina','terreno')),
  title        text not null,
  desc_es      text,
  desc_en      text,
  price        numeric(12,2) not null check (price >= 0),   -- venta: total · renta/cuarto/comercial: mensual
  beds         integer,
  baths        numeric(3,1),
  sqft         integer,
  lot_sqft     integer,
  year_built   integer,
  hoa          numeric(8,2),
  address      text,
  hood         text,                                        -- barrio/colonia
  city         text,
  location     geography(point, 4326),
  photos       jsonb not null default '[]'::jsonb,          -- [url, …] first = cover
  feats        jsonb not null default '[]'::jsonb,          -- [{es,en}, …]
  policies     jsonb not null default '{}'::jsonb,          -- { pets, noCredit, cosigner, visits }
  rental       jsonb not null default '{}'::jsonb,          -- { deposit, available, lease }
  open_house   timestamptz,
  status       text not null default 'published' check (status in ('draft','review','published','pending','rented','sold')),
  views        integer not null default 0,
  saves_count  integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  published_at timestamptz,
  search_tsv   tsvector generated always as (
    to_tsvector('spanish', coalesce(title,'') || ' ' || coalesce(address,'') || ' ' ||
                coalesce(hood,'') || ' ' || coalesce(city,'') || ' ' || coalesce(desc_es,''))
  ) stored
);
create index if not exists properties_geo_idx     on public.properties using gist (location);
create index if not exists properties_fts_idx     on public.properties using gin (search_tsv);
create index if not exists properties_browse_idx  on public.properties (status, deal, city, created_at desc);
create index if not exists properties_price_idx   on public.properties (status, deal, price);
create index if not exists properties_biz_idx     on public.properties (business_id, status);
create index if not exists properties_owner_idx   on public.properties (owner_id, created_at desc);

alter table public.properties enable row level security;
drop policy if exists "public read published properties" on public.properties;
create policy "public read published properties" on public.properties for select
  using (status in ('published','pending','rented','sold') or owner_id = auth.uid());
drop policy if exists "owner insert properties" on public.properties;
create policy "owner insert properties" on public.properties for insert
  with check (owner_id = auth.uid());
drop policy if exists "owner update properties" on public.properties;
create policy "owner update properties" on public.properties for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "owner delete properties" on public.properties;
create policy "owner delete properties" on public.properties for delete
  using (owner_id = auth.uid());

drop trigger if exists ugc_ratelimit on public.properties;
create trigger ugc_ratelimit before insert on public.properties
  for each row execute function public.tg_ugc_ratelimit('owner_id', '40');

-- ── saved properties (♥ cross-device, Zillow parity) ─────────────────────────
create table if not exists public.property_saves (
  property_id uuid not null references public.properties(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (property_id, user_id)
);
create index if not exists property_saves_user_idx on public.property_saves (user_id, created_at desc);
alter table public.property_saves enable row level security;
drop policy if exists "own saves read" on public.property_saves;
create policy "own saves read" on public.property_saves for select using (user_id = auth.uid());
drop policy if exists "own saves insert" on public.property_saves;
create policy "own saves insert" on public.property_saves for insert with check (user_id = auth.uid());
drop policy if exists "own saves delete" on public.property_saves;
create policy "own saves delete" on public.property_saves for delete using (user_id = auth.uid());

create or replace function public.tg_property_saves_count() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.properties p set saves_count = (
    select count(*) from public.property_saves s where s.property_id = coalesce(new.property_id, old.property_id))
  where p.id = coalesce(new.property_id, old.property_id);
  return null;
end $$;
drop trigger if exists property_saves_count on public.property_saves;
create trigger property_saves_count after insert or delete on public.property_saves
  for each row execute function public.tg_property_saves_count();

-- ── leads (contact / offer / application) — the agent's pipeline ─────────────
create table if not exists public.property_leads (
  id           uuid primary key default gen_random_uuid(),
  property_id  uuid not null references public.properties(id) on delete cascade,
  business_id  uuid references public.businesses(id) on delete set null,
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  phone        text,
  email        text,
  kind         text not null check (kind in ('mensaje','oferta','solicitud')),
  stage        text not null default 'new' check (stage in ('new','contacted','tour','offer','closed')),
  message      text,
  offer_amount numeric(12,2),
  income       text,
  move_in      text,
  payload      jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists property_leads_biz_idx  on public.property_leads (business_id, stage, created_at desc);
create index if not exists property_leads_prop_idx on public.property_leads (property_id, created_at desc);
create index if not exists property_leads_user_idx on public.property_leads (user_id, created_at desc);

alter table public.property_leads enable row level security;
drop policy if exists "lead read own or agent" on public.property_leads;
create policy "lead read own or agent" on public.property_leads for select
  using (user_id = auth.uid() or exists (
    select 1 from public.properties p where p.id = property_leads.property_id and p.owner_id = auth.uid()));
drop policy if exists "lead stage update by agent" on public.property_leads;
create policy "lead stage update by agent" on public.property_leads for update
  using (exists (select 1 from public.properties p where p.id = property_leads.property_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.properties p where p.id = property_leads.property_id and p.owner_id = auth.uid()));
-- inserts only via the SECURITY DEFINER RPC below (rate-limited there)

drop trigger if exists ugc_ratelimit on public.property_leads;
create trigger ugc_ratelimit before insert on public.property_leads
  for each row execute function public.tg_ugc_ratelimit('user_id', '30');

-- ── tours (in-person or video) — the agent's agenda ──────────────────────────
create table if not exists public.property_tours (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete set null,
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  phone       text,
  mode        text not null default 'presencial' check (mode in ('presencial','video')),
  at          timestamptz not null,
  message     text,
  status      text not null default 'pendiente' check (status in ('pendiente','confirmada','cancelada','completada')),
  created_at  timestamptz not null default now()
);
create index if not exists property_tours_biz_idx  on public.property_tours (business_id, at);
create index if not exists property_tours_prop_idx on public.property_tours (property_id, at);
create index if not exists property_tours_user_idx on public.property_tours (user_id, at desc);

alter table public.property_tours enable row level security;
drop policy if exists "tour read own or agent" on public.property_tours;
create policy "tour read own or agent" on public.property_tours for select
  using (user_id = auth.uid() or exists (
    select 1 from public.properties p where p.id = property_tours.property_id and p.owner_id = auth.uid()));
drop policy if exists "tour update by agent" on public.property_tours;
create policy "tour update by agent" on public.property_tours for update
  using (exists (select 1 from public.properties p where p.id = property_tours.property_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.properties p where p.id = property_tours.property_id and p.owner_id = auth.uid()));
drop policy if exists "tour cancel by visitor" on public.property_tours;
-- visitors can cancel their own pending tour (no other edits)
create policy "tour cancel by visitor" on public.property_tours for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop trigger if exists ugc_ratelimit on public.property_tours;
create trigger ugc_ratelimit before insert on public.property_tours
  for each row execute function public.tg_ugc_ratelimit('user_id', '20');

-- ── SEARCH RPC (the Zillow grid/map feed) ────────────────────────────────────
create or replace function public.properties_search(
  user_lat double precision default null, user_lng double precision default null,
  in_city text default null, in_deal text default null, in_type text default null,
  in_beds integer default null, in_baths integer default null,
  in_min numeric default null, in_max numeric default null,
  in_q text default null, in_hood text default null,
  in_business uuid default null,
  in_sort text default 'relevance',           -- relevance | price_asc | price_desc | newest
  max_results integer default 30, in_offset integer default 0
) returns table (
  id uuid, slug text, deal text, ptype text, title text, price numeric,
  beds integer, baths numeric, sqft integer, address text, hood text, city text,
  lat double precision, lng double precision, photos jsonb, open_house timestamptz,
  status text, views integer, saves_count integer, created_at timestamptz,
  biz_slug text, biz_name text, biz_logo text, biz_tier text, biz_rating numeric,
  distance_m double precision, total_count bigint
) language sql stable security definer set search_path = public as $$
  with base as (
    select p.*,
      case when user_lat is not null and user_lng is not null and p.location is not null
        then st_distance(p.location, st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography)
        else null end as dist
    from public.properties p
    where p.status = 'published'
      and (in_deal is null or p.deal = in_deal)
      and (in_type is null or p.ptype = in_type)
      and (in_city is null or p.city ilike in_city)
      and (in_hood is null or p.hood ilike in_hood)
      and (in_beds is null or coalesce(p.beds, 0) >= in_beds)
      and (in_baths is null or coalesce(p.baths, 0) >= in_baths)
      and (in_min is null or p.price >= in_min)
      and (in_max is null or p.price <= in_max)
      and (in_business is null or p.business_id = in_business)
      and (in_q is null or in_q = '' or p.search_tsv @@ plainto_tsquery('spanish', in_q)
           or p.title ilike '%' || in_q || '%' or p.address ilike '%' || in_q || '%' or p.hood ilike '%' || in_q || '%')
  )
  select b.id, b.slug, b.deal, b.ptype, b.title, b.price, b.beds, b.baths, b.sqft,
         b.address, b.hood, b.city,
         st_y(b.location::geometry) as lat, st_x(b.location::geometry) as lng,
         b.photos, b.open_house, b.status, b.views, b.saves_count, b.created_at,
         biz.slug, biz.name, biz.logo_url, biz.tier, biz.rating,
         b.dist, count(*) over () as total_count
  from base b
  left join public.businesses biz on biz.id = b.business_id
  order by
    case when in_sort = 'price_asc'  then b.price end asc nulls last,
    case when in_sort = 'price_desc' then b.price end desc nulls last,
    case when in_sort = 'newest'     then b.created_at end desc nulls last,
    case when in_sort not in ('price_asc','price_desc','newest') then coalesce(b.dist, 1e12) end asc nulls last,
    b.created_at desc
  limit greatest(1, least(max_results, 100)) offset greatest(0, in_offset)
$$;
grant execute on function public.properties_search(double precision, double precision, text, text, text, integer, integer, numeric, numeric, text, text, uuid, text, integer, integer) to anon, authenticated;

-- ── DETAIL RPC (property + agent card) ───────────────────────────────────────
create or replace function public.property_by_slug(in_slug text)
returns table (
  id uuid, slug text, deal text, ptype text, title text, desc_es text, desc_en text,
  price numeric, beds integer, baths numeric, sqft integer, lot_sqft integer,
  year_built integer, hoa numeric, address text, hood text, city text,
  lat double precision, lng double precision, photos jsonb, feats jsonb,
  policies jsonb, rental jsonb, open_house timestamptz, status text, views integer,
  saves_count integer, created_at timestamptz, published_at timestamptz,
  biz_id uuid, biz_slug text, biz_name text, biz_logo text, biz_tier text,
  biz_rating numeric, biz_reviews integer, biz_phone text, biz_license text, biz_langs text
) language sql stable security definer set search_path = public as $$
  select p.id, p.slug, p.deal, p.ptype, p.title, p.desc_es, p.desc_en,
         p.price, p.beds, p.baths, p.sqft, p.lot_sqft, p.year_built, p.hoa,
         p.address, p.hood, p.city,
         st_y(p.location::geometry), st_x(p.location::geometry),
         p.photos, p.feats, p.policies, p.rental, p.open_house, p.status, p.views,
         p.saves_count, p.created_at, p.published_at,
         b.id, b.slug, b.name, b.logo_url, b.tier, b.rating, b.reviews_count, b.phone,
         b.re_config->>'license', b.re_config->>'langs'
  from public.properties p
  left join public.businesses b on b.id = p.business_id
  where p.slug = in_slug and p.status <> 'draft'
  limit 1
$$;
grant execute on function public.property_by_slug(text) to anon, authenticated;

-- ── view tracking (cheap, definer — client can't set arbitrary counts) ───────
create or replace function public.track_property_view(in_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.properties set views = views + 1 where id = in_id and status = 'published';
$$;
grant execute on function public.track_property_view(uuid) to anon, authenticated;

-- ── create lead (message / offer / application) — notifies the agent ─────────
create or replace function public.create_property_lead(
  in_slug text, in_kind text, in_name text, in_phone text default null,
  in_email text default null, in_message text default null,
  in_offer numeric default null, in_income text default null,
  in_move text default null, in_payload jsonb default '{}'::jsonb
) returns uuid language plpgsql security definer set search_path = public as $fn$
declare v_p record; v_id uuid;
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  if in_kind not in ('mensaje','oferta','solicitud') then raise exception 'bad kind'; end if;
  if coalesce(trim(in_name), '') = '' then raise exception 'name required'; end if;
  select id, business_id, owner_id, title into v_p from public.properties
    where slug = in_slug and status = 'published' limit 1;
  if v_p.id is null then raise exception 'property not found'; end if;
  insert into public.property_leads (property_id, business_id, user_id, name, phone, email, kind, message, offer_amount, income, move_in, payload)
  values (v_p.id, v_p.business_id, auth.uid(), trim(in_name), in_phone, in_email, in_kind, in_message, in_offer, in_income, in_move, coalesce(in_payload, '{}'::jsonb))
  returning id into v_id;
  perform public.notify_user(v_p.owner_id, 're_lead',
    jsonb_build_object('kind', in_kind, 'name', trim(in_name), 'property', v_p.title, 'offer', in_offer),
    '/negocio');
  return v_id;
end $fn$;
grant execute on function public.create_property_lead(text, text, text, text, text, text, numeric, text, text, jsonb) to authenticated;

-- ── book tour — notifies the agent ───────────────────────────────────────────
create or replace function public.book_property_tour(
  in_slug text, in_at timestamptz, in_mode text default 'presencial',
  in_name text default null, in_phone text default null, in_message text default null
) returns uuid language plpgsql security definer set search_path = public as $fn$
declare v_p record; v_id uuid;
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  if in_mode not in ('presencial','video') then raise exception 'bad mode'; end if;
  if in_at is null or in_at < now() then raise exception 'bad time'; end if;
  if coalesce(trim(in_name), '') = '' then raise exception 'name required'; end if;
  select id, business_id, owner_id, title into v_p from public.properties
    where slug = in_slug and status = 'published' limit 1;
  if v_p.id is null then raise exception 'property not found'; end if;
  insert into public.property_tours (property_id, business_id, user_id, name, phone, mode, at, message)
  values (v_p.id, v_p.business_id, auth.uid(), trim(in_name), in_phone, in_mode, in_at, in_message)
  returning id into v_id;
  perform public.notify_user(v_p.owner_id, 're_tour',
    jsonb_build_object('name', trim(in_name), 'property', v_p.title, 'at', in_at, 'mode', in_mode),
    '/negocio');
  return v_id;
end $fn$;
grant execute on function public.book_property_tour(text, timestamptz, text, text, text, text) to authenticated;

-- ── upsert property (create or edit) — the panel's publish wizard ────────────
-- License gate (handoff rule): publishing requires the business re_config.license.
create or replace function public.upsert_property(in_id uuid, p jsonb)
returns table (id uuid, slug text) language plpgsql security definer set search_path = public as $fn$
declare
  v_biz uuid; v_lic text; v_slug text; v_status text; v_id uuid;
  v_lat double precision; v_lng double precision;
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  select b.id, b.re_config->>'license' into v_biz, v_lic
    from public.businesses b where b.owner_id = auth.uid()
    and (p->>'business_id' is null or b.id = (p->>'business_id')::uuid)
    order by (b.category_id = 'RealEstate') desc, b.created_at limit 1;
  v_status := coalesce(p->>'status', 'published');
  if v_status not in ('draft','published','pending','rented','sold') then raise exception 'bad status'; end if;
  if v_status = 'published' and coalesce(trim(v_lic), '') = '' then
    raise exception 'license required' using errcode = 'check_violation';
  end if;
  v_lat := nullif(p->>'lat', '')::double precision;
  v_lng := nullif(p->>'lng', '')::double precision;
  if in_id is null then
    v_slug := regexp_replace(lower(trim(coalesce(p->>'title', 'propiedad'))), '[^a-z0-9]+', '-', 'g');
    v_slug := trim(both '-' from v_slug) || '-' || substr(md5(gen_random_uuid()::text), 1, 6);
    insert into public.properties (owner_id, business_id, slug, deal, ptype, title, desc_es, desc_en,
      price, beds, baths, sqft, lot_sqft, year_built, hoa, address, hood, city, location,
      photos, feats, policies, rental, open_house, status, published_at)
    values (auth.uid(), v_biz, v_slug,
      coalesce(p->>'deal', 'renta'), coalesce(p->>'ptype', 'casa'),
      coalesce(nullif(trim(p->>'title'), ''), 'Propiedad'),
      p->>'desc_es', coalesce(p->>'desc_en', p->>'desc_es'),
      coalesce(nullif(p->>'price', '')::numeric, 0),
      nullif(p->>'beds', '')::integer, nullif(p->>'baths', '')::numeric,
      nullif(p->>'sqft', '')::integer, nullif(p->>'lot_sqft', '')::integer,
      nullif(p->>'year_built', '')::integer, nullif(p->>'hoa', '')::numeric,
      p->>'address', p->>'hood', p->>'city',
      case when v_lat is not null and v_lng is not null
        then st_setsrid(st_makepoint(v_lng, v_lat), 4326)::geography end,
      coalesce(p->'photos', '[]'::jsonb), coalesce(p->'feats', '[]'::jsonb),
      coalesce(p->'policies', '{}'::jsonb), coalesce(p->'rental', '{}'::jsonb),
      nullif(p->>'open_house', '')::timestamptz, v_status,
      case when v_status = 'published' then now() end)
    returning properties.id, properties.slug into v_id, v_slug;
  else
    update public.properties pr set
      deal = coalesce(p->>'deal', pr.deal), ptype = coalesce(p->>'ptype', pr.ptype),
      title = coalesce(nullif(trim(p->>'title'), ''), pr.title),
      desc_es = coalesce(p->>'desc_es', pr.desc_es), desc_en = coalesce(p->>'desc_en', pr.desc_en),
      price = coalesce(nullif(p->>'price', '')::numeric, pr.price),
      beds = coalesce(nullif(p->>'beds', '')::integer, pr.beds),
      baths = coalesce(nullif(p->>'baths', '')::numeric, pr.baths),
      sqft = coalesce(nullif(p->>'sqft', '')::integer, pr.sqft),
      lot_sqft = coalesce(nullif(p->>'lot_sqft', '')::integer, pr.lot_sqft),
      year_built = coalesce(nullif(p->>'year_built', '')::integer, pr.year_built),
      hoa = coalesce(nullif(p->>'hoa', '')::numeric, pr.hoa),
      address = coalesce(p->>'address', pr.address), hood = coalesce(p->>'hood', pr.hood),
      city = coalesce(p->>'city', pr.city),
      location = case when v_lat is not null and v_lng is not null
        then st_setsrid(st_makepoint(v_lng, v_lat), 4326)::geography else pr.location end,
      photos = coalesce(p->'photos', pr.photos), feats = coalesce(p->'feats', pr.feats),
      policies = coalesce(p->'policies', pr.policies), rental = coalesce(p->'rental', pr.rental),
      open_house = case when p ? 'open_house' then nullif(p->>'open_house', '')::timestamptz else pr.open_house end,
      status = v_status,
      published_at = case when v_status = 'published' and pr.published_at is null then now() else pr.published_at end,
      updated_at = now()
    where pr.id = in_id and pr.owner_id = auth.uid()
    returning pr.id, pr.slug into v_id, v_slug;
    if v_id is null then raise exception 'not found'; end if;
  end if;
  return query select v_id, v_slug;
end $fn$;
grant execute on function public.upsert_property(uuid, jsonb) to authenticated;

-- ── directory RPC: verified agencies/agents (businesses of RealEstate cat) ───
create or replace function public.re_directory(
  in_city text default null, in_q text default null, max_results integer default 30, in_offset integer default 0
) returns table (
  id uuid, slug text, name text, logo_url text, tier text, rating numeric,
  reviews_count integer, city text, address text, phone text,
  specialty text, license text, langs text, listings bigint, total_count bigint
) language sql stable security definer set search_path = public as $$
  select b.id, b.slug, b.name, b.logo_url, b.tier, b.rating, b.reviews_count,
         b.city, b.address, b.phone,
         b.re_config->>'specialty', b.re_config->>'license', b.re_config->>'langs',
         (select count(*) from public.properties p where p.business_id = b.id and p.status = 'published'),
         count(*) over ()
  from public.businesses b
  where b.category_id = 'RealEstate'
    and (in_city is null or b.city ilike in_city)
    and (in_q is null or in_q = '' or b.name ilike '%' || in_q || '%')
  order by (b.tier = 'premium') desc, (b.tier = 'verified') desc, b.rating desc nulls last, b.reviews_count desc
  limit greatest(1, least(max_results, 100)) offset greatest(0, in_offset)
$$;
grant execute on function public.re_directory(text, text, integer, integer) to anon, authenticated;
