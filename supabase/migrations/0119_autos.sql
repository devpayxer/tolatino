-- 0119_autos.sql — Autos / Dealer de carros vertical (handoff 2026-07-24).
-- CarGurus/AutoTrader-style consumer search + vehicle detail + test drives +
-- credit pre-qualification (soft, no-SSN) + trade-in, dealer/private-seller panel
-- (inventory, leads pipeline, test-drive agenda, financing apps, team). Directory =
-- businesses in the new CarDealer category. Same 1M+ shape as 0117: PostGIS geo +
-- GIST, spanish FTS + GIN, btree on filter cols, RLS everywhere, vanilla Postgres.
-- Idempotent. Apply: node scripts/sbsql.mjs --file supabase/migrations/0119_autos.sql

-- ── Category: dealers/private sellers register as businesses here ─────────────
insert into public.categories (id, name_es, name_en, sort)
values ('CarDealer', 'Dealer de carros', 'Car Dealers', 17)
on conflict (id) do update set name_es = excluded.name_es, name_en = excluded.name_en;

-- ── Dealer config on the business (license gate, BHPH, financing, seller type) ─
alter table public.businesses add column if not exists auto_config jsonb;
-- auto_config = { license, sellerType:'dealer'|'particular', bhph:bool,
--                 financing:bool, cash:bool, langs:'ES/EN', zones:[…] }

-- ── vehicles ──────────────────────────────────────────────────────────────────
create table if not exists public.vehicles (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users(id) on delete cascade,
  business_id  uuid references public.businesses(id) on delete set null,
  slug         text not null unique,
  cond         text not null check (cond in ('nuevo','seminuevo','usado','certificado')),
  vtype        text not null check (vtype in ('sedan','suv','pickup','hatchback','coupe','minivan','moto','comercial')),
  make         text not null,
  model        text not null,
  year         integer not null,
  price        numeric(12,2) not null check (price >= 0),
  down         numeric(12,2),                    -- suggested down payment
  miles        integer,
  trans        text check (trans in ('automatica','manual','cvt')),
  fuel         text check (fuel in ('gasolina','diesel','hibrido','electrico')),
  drivetrain   text check (drivetrain in ('fwd','rwd','awd','4wd')),
  mpg          integer,
  color_es     text,
  color_en     text,
  vin          text,
  desc_es      text,
  desc_en      text,
  city         text,
  location     geography(point, 4326),
  photos       jsonb not null default '[]'::jsonb,
  feats        jsonb not null default '[]'::jsonb,          -- [{es,en}, …]
  history      jsonb not null default '{}'::jsonb,          -- { cleanTitle, accidents, owners, serviced, report:[{t,d}] }
  bhph         boolean not null default false,              -- aquí pagas aquí (in-house financing, no credit)
  financing    boolean not null default true,               -- dealer offers financing
  trade_in     boolean not null default false,              -- accepts trade-in as down
  apr          numeric(5,2),                                 -- advertised APR (else calc default)
  status       text not null default 'published' check (status in ('draft','review','published','pending','sold')),
  views        integer not null default 0,
  saves_count  integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  published_at timestamptz,
  search_tsv   tsvector generated always as (
    to_tsvector('spanish', coalesce(make,'') || ' ' || coalesce(model,'') || ' ' ||
                coalesce(year::text,'') || ' ' || coalesce(color_es,'') || ' ' ||
                coalesce(city,'') || ' ' || coalesce(desc_es,''))
  ) stored
);
create index if not exists vehicles_geo_idx    on public.vehicles using gist (location);
create index if not exists vehicles_fts_idx    on public.vehicles using gin (search_tsv);
create index if not exists vehicles_browse_idx on public.vehicles (status, cond, city, created_at desc);
create index if not exists vehicles_price_idx  on public.vehicles (status, price);
create index if not exists vehicles_make_idx   on public.vehicles (status, make, model);
create index if not exists vehicles_biz_idx    on public.vehicles (business_id, status);
create index if not exists vehicles_owner_idx  on public.vehicles (owner_id, created_at desc);

alter table public.vehicles enable row level security;
drop policy if exists "public read published vehicles" on public.vehicles;
create policy "public read published vehicles" on public.vehicles for select
  using (status in ('published','pending','sold') or owner_id = auth.uid());
drop policy if exists "owner insert vehicles" on public.vehicles;
create policy "owner insert vehicles" on public.vehicles for insert with check (owner_id = auth.uid());
drop policy if exists "owner update vehicles" on public.vehicles;
create policy "owner update vehicles" on public.vehicles for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "owner delete vehicles" on public.vehicles;
create policy "owner delete vehicles" on public.vehicles for delete using (owner_id = auth.uid());

drop trigger if exists ugc_ratelimit on public.vehicles;
create trigger ugc_ratelimit before insert on public.vehicles
  for each row execute function public.tg_ugc_ratelimit('owner_id', '40');

-- ── saved vehicles (♥ cross-device) ──────────────────────────────────────────
create table if not exists public.vehicle_saves (
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (vehicle_id, user_id)
);
create index if not exists vehicle_saves_user_idx on public.vehicle_saves (user_id, created_at desc);
alter table public.vehicle_saves enable row level security;
drop policy if exists "own vsaves read" on public.vehicle_saves;
create policy "own vsaves read" on public.vehicle_saves for select using (user_id = auth.uid());
drop policy if exists "own vsaves insert" on public.vehicle_saves;
create policy "own vsaves insert" on public.vehicle_saves for insert with check (user_id = auth.uid());
drop policy if exists "own vsaves delete" on public.vehicle_saves;
create policy "own vsaves delete" on public.vehicle_saves for delete using (user_id = auth.uid());

create or replace function public.tg_vehicle_saves_count() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.vehicles v set saves_count = (
    select count(*) from public.vehicle_saves s where s.vehicle_id = coalesce(new.vehicle_id, old.vehicle_id))
  where v.id = coalesce(new.vehicle_id, old.vehicle_id);
  return null;
end $$;
drop trigger if exists vehicle_saves_count on public.vehicle_saves;
create trigger vehicle_saves_count after insert or delete on public.vehicle_saves
  for each row execute function public.tg_vehicle_saves_count();

-- ── leads (message / pre-qual / offer) — the dealer's pipeline ────────────────
create table if not exists public.vehicle_leads (
  id          uuid primary key default gen_random_uuid(),
  vehicle_id  uuid not null references public.vehicles(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete set null,
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  phone       text,
  email       text,
  kind        text not null check (kind in ('mensaje','prueba','prequal','oferta')),
  stage       text not null default 'new' check (stage in ('new','contacted','test','financing','sold')),
  message     text,
  offer_amount numeric(12,2),
  income      text,
  employ      text,
  credit      text,        -- self-reported credit level (soft, no SSN pulled)
  down        numeric(12,2),
  payload     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists vehicle_leads_biz_idx on public.vehicle_leads (business_id, stage, created_at desc);
create index if not exists vehicle_leads_veh_idx on public.vehicle_leads (vehicle_id, created_at desc);
create index if not exists vehicle_leads_user_idx on public.vehicle_leads (user_id, created_at desc);

alter table public.vehicle_leads enable row level security;
drop policy if exists "vlead read own or dealer" on public.vehicle_leads;
create policy "vlead read own or dealer" on public.vehicle_leads for select
  using (user_id = auth.uid() or exists (
    select 1 from public.vehicles v where v.id = vehicle_leads.vehicle_id and v.owner_id = auth.uid()));
drop policy if exists "vlead update by dealer" on public.vehicle_leads;
create policy "vlead update by dealer" on public.vehicle_leads for update
  using (exists (select 1 from public.vehicles v where v.id = vehicle_leads.vehicle_id and v.owner_id = auth.uid()))
  with check (exists (select 1 from public.vehicles v where v.id = vehicle_leads.vehicle_id and v.owner_id = auth.uid()));

drop trigger if exists ugc_ratelimit on public.vehicle_leads;
create trigger ugc_ratelimit before insert on public.vehicle_leads
  for each row execute function public.tg_ugc_ratelimit('user_id', '30');

-- ── test drives — the dealer's agenda ────────────────────────────────────────
create table if not exists public.vehicle_tests (
  id          uuid primary key default gen_random_uuid(),
  vehicle_id  uuid not null references public.vehicles(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete set null,
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  phone       text,
  at          timestamptz not null,
  message     text,
  status      text not null default 'pendiente' check (status in ('pendiente','confirmada','cancelada','completada')),
  created_at  timestamptz not null default now()
);
create index if not exists vehicle_tests_biz_idx on public.vehicle_tests (business_id, at);
create index if not exists vehicle_tests_veh_idx on public.vehicle_tests (vehicle_id, at);
create index if not exists vehicle_tests_user_idx on public.vehicle_tests (user_id, at desc);

alter table public.vehicle_tests enable row level security;
drop policy if exists "vtest read own or dealer" on public.vehicle_tests;
create policy "vtest read own or dealer" on public.vehicle_tests for select
  using (user_id = auth.uid() or exists (
    select 1 from public.vehicles v where v.id = vehicle_tests.vehicle_id and v.owner_id = auth.uid()));
drop policy if exists "vtest update by dealer" on public.vehicle_tests;
create policy "vtest update by dealer" on public.vehicle_tests for update
  using (exists (select 1 from public.vehicles v where v.id = vehicle_tests.vehicle_id and v.owner_id = auth.uid()))
  with check (exists (select 1 from public.vehicles v where v.id = vehicle_tests.vehicle_id and v.owner_id = auth.uid()));
drop policy if exists "vtest cancel by visitor" on public.vehicle_tests;
create policy "vtest cancel by visitor" on public.vehicle_tests for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop trigger if exists ugc_ratelimit on public.vehicle_tests;
create trigger ugc_ratelimit before insert on public.vehicle_tests
  for each row execute function public.tg_ugc_ratelimit('user_id', '20');

-- ── SEARCH RPC ───────────────────────────────────────────────────────────────
create or replace function public.vehicles_search(
  user_lat double precision default null, user_lng double precision default null,
  in_city text default null, in_cond text default null, in_type text default null,
  in_make text default null, in_min numeric default null, in_max numeric default null,
  in_year_min integer default null, in_miles_max integer default null,
  in_bhph boolean default null, in_q text default null, in_business uuid default null,
  in_sort text default 'relevance',       -- relevance | price_asc | price_desc | miles_asc | year_desc
  max_results integer default 30, in_offset integer default 0
) returns table (
  id uuid, slug text, cond text, vtype text, make text, model text, year integer,
  price numeric, down numeric, miles integer, trans text, fuel text, mpg integer,
  color_es text, color_en text, city text, lat double precision, lng double precision,
  photos jsonb, bhph boolean, financing boolean, apr numeric, status text,
  views integer, saves_count integer, created_at timestamptz,
  biz_slug text, biz_name text, biz_logo text, biz_tier text, biz_rating numeric,
  distance_m double precision, total_count bigint
) language sql stable security definer set search_path = public as $$
  with base as (
    select v.*,
      case when user_lat is not null and user_lng is not null and v.location is not null
        then st_distance(v.location, st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography)
        else null end as dist
    from public.vehicles v
    where v.status = 'published'
      and (in_cond is null or v.cond = in_cond)
      and (in_type is null or v.vtype = in_type)
      and (in_make is null or v.make ilike in_make)
      and (in_city is null or v.city ilike in_city || '%')
      and (in_min is null or v.price >= in_min)
      and (in_max is null or v.price <= in_max)
      and (in_year_min is null or v.year >= in_year_min)
      and (in_miles_max is null or coalesce(v.miles, 0) <= in_miles_max)
      and (in_bhph is null or v.bhph = in_bhph)
      and (in_business is null or v.business_id = in_business)
      and (in_q is null or in_q = '' or v.search_tsv @@ plainto_tsquery('spanish', in_q)
           or v.make ilike '%'||in_q||'%' or v.model ilike '%'||in_q||'%')
  )
  select b.id, b.slug, b.cond, b.vtype, b.make, b.model, b.year, b.price, b.down,
         b.miles, b.trans, b.fuel, b.mpg, b.color_es, b.color_en, b.city,
         st_y(b.location::geometry), st_x(b.location::geometry),
         b.photos, b.bhph, b.financing, b.apr, b.status, b.views, b.saves_count, b.created_at,
         biz.slug, biz.name, biz.logo_url, biz.tier, biz.rating,
         b.dist, count(*) over () as total_count
  from base b
  left join public.businesses biz on biz.id = b.business_id
  order by
    case when in_sort = 'price_asc'  then b.price end asc nulls last,
    case when in_sort = 'price_desc' then b.price end desc nulls last,
    case when in_sort = 'miles_asc'  then b.miles end asc nulls last,
    case when in_sort = 'year_desc'  then b.year end desc nulls last,
    case when in_sort not in ('price_asc','price_desc','miles_asc','year_desc') then coalesce(b.dist, 1e12) end asc nulls last,
    b.created_at desc
  limit greatest(1, least(max_results, 100)) offset greatest(0, in_offset)
$$;
grant execute on function public.vehicles_search(double precision, double precision, text, text, text, text, numeric, numeric, integer, integer, boolean, text, uuid, text, integer, integer) to anon, authenticated;

-- ── DETAIL RPC ───────────────────────────────────────────────────────────────
create or replace function public.vehicle_by_slug(in_slug text)
returns table (
  id uuid, slug text, cond text, vtype text, make text, model text, year integer,
  price numeric, down numeric, miles integer, trans text, fuel text, drivetrain text,
  mpg integer, color_es text, color_en text, vin text, desc_es text, desc_en text,
  city text, lat double precision, lng double precision, photos jsonb, feats jsonb,
  history jsonb, bhph boolean, financing boolean, trade_in boolean, apr numeric,
  status text, views integer, saves_count integer, created_at timestamptz, published_at timestamptz,
  biz_id uuid, biz_slug text, biz_name text, biz_logo text, biz_tier text,
  biz_rating numeric, biz_reviews integer, biz_phone text, biz_license text, biz_langs text
) language sql stable security definer set search_path = public as $$
  select v.id, v.slug, v.cond, v.vtype, v.make, v.model, v.year, v.price, v.down,
         v.miles, v.trans, v.fuel, v.drivetrain, v.mpg, v.color_es, v.color_en, v.vin,
         v.desc_es, v.desc_en, v.city,
         st_y(v.location::geometry), st_x(v.location::geometry),
         v.photos, v.feats, v.history, v.bhph, v.financing, v.trade_in, v.apr,
         v.status, v.views, v.saves_count, v.created_at, v.published_at,
         b.id, b.slug, b.name, b.logo_url, b.tier, b.rating, b.reviews_count, b.phone,
         b.auto_config->>'license', b.auto_config->>'langs'
  from public.vehicles v
  left join public.businesses b on b.id = v.business_id
  where v.slug = in_slug and v.status <> 'draft'
  limit 1
$$;
grant execute on function public.vehicle_by_slug(text) to anon, authenticated;

create or replace function public.track_vehicle_view(in_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.vehicles set views = views + 1 where id = in_id and status = 'published';
$$;
grant execute on function public.track_vehicle_view(uuid) to anon, authenticated;

-- ── create lead (message / test / pre-qual / offer) — notifies the dealer ────
create or replace function public.create_vehicle_lead(
  in_slug text, in_kind text, in_name text, in_phone text default null,
  in_email text default null, in_message text default null, in_offer numeric default null,
  in_income text default null, in_employ text default null, in_credit text default null,
  in_down numeric default null, in_payload jsonb default '{}'::jsonb
) returns uuid language plpgsql security definer set search_path = public as $fn$
declare v_v record; v_id uuid;
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  if in_kind not in ('mensaje','prueba','prequal','oferta') then raise exception 'bad kind'; end if;
  if coalesce(trim(in_name), '') = '' then raise exception 'name required'; end if;
  select id, business_id, owner_id, make, model, year into v_v from public.vehicles
    where slug = in_slug and status = 'published' limit 1;
  if v_v.id is null then raise exception 'vehicle not found'; end if;
  insert into public.vehicle_leads (vehicle_id, business_id, user_id, name, phone, email, kind, message, offer_amount, income, employ, credit, down, payload)
  values (v_v.id, v_v.business_id, auth.uid(), trim(in_name), in_phone, in_email, in_kind, in_message, in_offer, in_income, in_employ, in_credit, in_down, coalesce(in_payload,'{}'::jsonb))
  returning id into v_id;
  perform public.notify_user(v_v.owner_id, 'auto_lead',
    jsonb_build_object('kind', in_kind, 'name', trim(in_name), 'vehicle', v_v.year || ' ' || v_v.make || ' ' || v_v.model),
    '/negocio');
  return v_id;
end $fn$;
grant execute on function public.create_vehicle_lead(text, text, text, text, text, text, numeric, text, text, text, numeric, jsonb) to authenticated;

-- ── book test drive — notifies the dealer ────────────────────────────────────
create or replace function public.book_vehicle_test(
  in_slug text, in_at timestamptz, in_name text default null, in_phone text default null, in_message text default null
) returns uuid language plpgsql security definer set search_path = public as $fn$
declare v_v record; v_id uuid;
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  if in_at is null or in_at < now() then raise exception 'bad time'; end if;
  if coalesce(trim(in_name), '') = '' then raise exception 'name required'; end if;
  select id, business_id, owner_id, make, model, year into v_v from public.vehicles
    where slug = in_slug and status = 'published' limit 1;
  if v_v.id is null then raise exception 'vehicle not found'; end if;
  insert into public.vehicle_tests (vehicle_id, business_id, user_id, name, phone, at, message)
  values (v_v.id, v_v.business_id, auth.uid(), trim(in_name), in_phone, in_at, in_message)
  returning id into v_id;
  perform public.notify_user(v_v.owner_id, 'auto_test',
    jsonb_build_object('name', trim(in_name), 'vehicle', v_v.year || ' ' || v_v.make || ' ' || v_v.model, 'at', in_at),
    '/negocio');
  return v_id;
end $fn$;
grant execute on function public.book_vehicle_test(text, timestamptz, text, text, text) to authenticated;

-- ── upsert vehicle (create or edit) — the panel's publish wizard ─────────────
-- License gate: publishing requires the business auto_config.license.
create or replace function public.upsert_vehicle(in_id uuid, p jsonb)
returns table (id uuid, slug text) language plpgsql security definer set search_path = public as $fn$
declare v_biz uuid; v_lic text; v_slug text; v_status text; v_id uuid;
  v_lat double precision; v_lng double precision;
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  select b.id, b.auto_config->>'license' into v_biz, v_lic
    from public.businesses b where b.owner_id = auth.uid()
    and (p->>'business_id' is null or b.id = (p->>'business_id')::uuid)
    order by (b.category_id = 'CarDealer') desc, b.created_at limit 1;
  v_status := coalesce(p->>'status', 'published');
  if v_status not in ('draft','published','pending','sold') then raise exception 'bad status'; end if;
  if v_status = 'published' and coalesce(trim(v_lic), '') = '' then
    raise exception 'license required' using errcode = 'check_violation';
  end if;
  v_lat := nullif(p->>'lat','')::double precision;
  v_lng := nullif(p->>'lng','')::double precision;
  if in_id is null then
    v_slug := regexp_replace(lower(trim(coalesce(p->>'year','')||'-'||coalesce(p->>'make','auto')||'-'||coalesce(p->>'model',''))), '[^a-z0-9]+', '-', 'g');
    v_slug := trim(both '-' from v_slug) || '-' || substr(md5(gen_random_uuid()::text), 1, 6);
    insert into public.vehicles (owner_id, business_id, slug, cond, vtype, make, model, year,
      price, down, miles, trans, fuel, drivetrain, mpg, color_es, color_en, vin, desc_es, desc_en,
      city, location, photos, feats, history, bhph, financing, trade_in, apr, status, published_at)
    values (auth.uid(), v_biz, v_slug,
      coalesce(p->>'cond','usado'), coalesce(p->>'vtype','sedan'),
      coalesce(nullif(trim(p->>'make'),''),'Auto'), coalesce(nullif(trim(p->>'model'),''),''),
      coalesce(nullif(p->>'year','')::integer, 2020),
      coalesce(nullif(p->>'price','')::numeric, 0), nullif(p->>'down','')::numeric,
      nullif(p->>'miles','')::integer, p->>'trans', p->>'fuel', p->>'drivetrain',
      nullif(p->>'mpg','')::integer, p->>'color_es', coalesce(p->>'color_en', p->>'color_es'),
      p->>'vin', p->>'desc_es', coalesce(p->>'desc_en', p->>'desc_es'),
      p->>'city',
      case when v_lat is not null and v_lng is not null then st_setsrid(st_makepoint(v_lng, v_lat), 4326)::geography end,
      coalesce(p->'photos','[]'::jsonb), coalesce(p->'feats','[]'::jsonb), coalesce(p->'history','{}'::jsonb),
      coalesce((p->>'bhph')::boolean, false), coalesce((p->>'financing')::boolean, true),
      coalesce((p->>'trade_in')::boolean, false), nullif(p->>'apr','')::numeric,
      v_status, case when v_status = 'published' then now() end)
    returning vehicles.id, vehicles.slug into v_id, v_slug;
  else
    update public.vehicles vh set
      cond = coalesce(p->>'cond', vh.cond), vtype = coalesce(p->>'vtype', vh.vtype),
      make = coalesce(nullif(trim(p->>'make'),''), vh.make), model = coalesce(p->>'model', vh.model),
      year = coalesce(nullif(p->>'year','')::integer, vh.year),
      price = coalesce(nullif(p->>'price','')::numeric, vh.price),
      down = case when p ? 'down' then nullif(p->>'down','')::numeric else vh.down end,
      miles = coalesce(nullif(p->>'miles','')::integer, vh.miles),
      trans = coalesce(p->>'trans', vh.trans), fuel = coalesce(p->>'fuel', vh.fuel),
      drivetrain = coalesce(p->>'drivetrain', vh.drivetrain), mpg = coalesce(nullif(p->>'mpg','')::integer, vh.mpg),
      color_es = coalesce(p->>'color_es', vh.color_es), color_en = coalesce(p->>'color_en', vh.color_en),
      vin = coalesce(p->>'vin', vh.vin), desc_es = coalesce(p->>'desc_es', vh.desc_es), desc_en = coalesce(p->>'desc_en', vh.desc_en),
      city = coalesce(p->>'city', vh.city),
      location = case when v_lat is not null and v_lng is not null then st_setsrid(st_makepoint(v_lng, v_lat), 4326)::geography else vh.location end,
      photos = coalesce(p->'photos', vh.photos), feats = coalesce(p->'feats', vh.feats), history = coalesce(p->'history', vh.history),
      bhph = coalesce((p->>'bhph')::boolean, vh.bhph), financing = coalesce((p->>'financing')::boolean, vh.financing),
      trade_in = coalesce((p->>'trade_in')::boolean, vh.trade_in), apr = case when p ? 'apr' then nullif(p->>'apr','')::numeric else vh.apr end,
      status = v_status,
      published_at = case when v_status = 'published' and vh.published_at is null then now() else vh.published_at end,
      updated_at = now()
    where vh.id = in_id and vh.owner_id = auth.uid()
    returning vh.id, vh.slug into v_id, v_slug;
    if v_id is null then raise exception 'not found'; end if;
  end if;
  return query select v_id, v_slug;
end $fn$;
grant execute on function public.upsert_vehicle(uuid, jsonb) to authenticated;

-- ── dealer directory (businesses of CarDealer category) ──────────────────────
create or replace function public.auto_directory(
  in_city text default null, in_q text default null, max_results integer default 30, in_offset integer default 0
) returns table (
  id uuid, slug text, name text, logo_url text, tier text, rating numeric,
  reviews_count integer, city text, address text, phone text,
  seller_type text, license text, langs text, bhph boolean, inventory bigint, total_count bigint
) language sql stable security definer set search_path = public as $$
  select b.id, b.slug, b.name, b.logo_url, b.tier, b.rating, b.reviews_count,
         b.city, b.address, b.phone,
         b.auto_config->>'sellerType', b.auto_config->>'license', b.auto_config->>'langs',
         coalesce((b.auto_config->>'bhph')::boolean, false),
         (select count(*) from public.vehicles v where v.business_id = b.id and v.status = 'published'),
         count(*) over ()
  from public.businesses b
  where b.category_id = 'CarDealer'
    and (in_city is null or b.city ilike in_city || '%')
    and (in_q is null or in_q = '' or b.name ilike '%'||in_q||'%')
  order by (b.tier = 'premium') desc, (b.tier = 'verified') desc, b.rating desc nulls last, b.reviews_count desc
  limit greatest(1, least(max_results, 100)) offset greatest(0, in_offset)
$$;
grant execute on function public.auto_directory(text, text, integer, integer) to anon, authenticated;
