-- 0118_real_estate_calc.sql — make the mortgage calculator REAL (Fase 1 + 2).
--  Fase 1: per-property escrow inputs the agent enters (Zillow parity = county
--          record numbers). When present the calculator uses them verbatim;
--          otherwise it falls back to a per-STATE effective rate (client-side).
--  Fase 2: market_rates — the live national average mortgage rate (Freddie Mac
--          PMMS via FRED), refreshed weekly by the `fred-rates` edge function.
-- Idempotent. Apply: node scripts/sbsql.mjs --file supabase/migrations/0118_real_estate_calc.sql

-- ── Fase 1: real, agent-entered escrow numbers ───────────────────────────────
alter table public.properties add column if not exists annual_tax numeric(10,2);       -- real property tax /yr (county record)
alter table public.properties add column if not exists annual_insurance numeric(10,2); -- real/quoted home insurance /yr

-- ── Fase 2: market mortgage rates (national benchmark) ───────────────────────
create table if not exists public.market_rates (
  term       integer primary key,            -- 30 or 15 (year fixed)
  rate       numeric(5,3) not null,          -- annual %, e.g. 6.720
  source     text not null default 'Freddie Mac PMMS (FRED)',
  as_of      date not null,
  updated_at timestamptz not null default now()
);
alter table public.market_rates enable row level security;
drop policy if exists "public read market rates" on public.market_rates;
-- Public benchmark → world-readable; only the edge function (service role) writes.
create policy "public read market rates" on public.market_rates for select using (true);

-- Seed with a recent PMMS reading so the calculator is real from day one; the
-- weekly edge function overwrites these with the live value once FRED_API_KEY is
-- set. as_of is a fixed literal (migrations must be deterministic).
insert into public.market_rates (term, rate, as_of, source) values
  (30, 6.720, date '2026-07-16', 'Freddie Mac PMMS (seed)'),
  (15, 5.910, date '2026-07-16', 'Freddie Mac PMMS (seed)')
on conflict (term) do nothing;

-- ── property_by_slug: also return the real escrow numbers ────────────────────
drop function if exists public.property_by_slug(text); -- return type widened (2 new cols)
create or replace function public.property_by_slug(in_slug text)
returns table (
  id uuid, slug text, deal text, ptype text, title text, desc_es text, desc_en text,
  price numeric, beds integer, baths numeric, sqft integer, lot_sqft integer,
  year_built integer, hoa numeric, address text, hood text, city text,
  lat double precision, lng double precision, photos jsonb, feats jsonb,
  policies jsonb, rental jsonb, open_house timestamptz, status text, views integer,
  saves_count integer, created_at timestamptz, published_at timestamptz,
  biz_id uuid, biz_slug text, biz_name text, biz_logo text, biz_tier text,
  biz_rating numeric, biz_reviews integer, biz_phone text, biz_license text, biz_langs text,
  annual_tax numeric, annual_insurance numeric
) language sql stable security definer set search_path = public as $$
  select p.id, p.slug, p.deal, p.ptype, p.title, p.desc_es, p.desc_en,
         p.price, p.beds, p.baths, p.sqft, p.lot_sqft, p.year_built, p.hoa,
         p.address, p.hood, p.city,
         st_y(p.location::geometry), st_x(p.location::geometry),
         p.photos, p.feats, p.policies, p.rental, p.open_house, p.status, p.views,
         p.saves_count, p.created_at, p.published_at,
         b.id, b.slug, b.name, b.logo_url, b.tier, b.rating, b.reviews_count, b.phone,
         b.re_config->>'license', b.re_config->>'langs',
         p.annual_tax, p.annual_insurance
  from public.properties p
  left join public.businesses b on b.id = p.business_id
  where p.slug = in_slug and p.status <> 'draft'
  limit 1
$$;
grant execute on function public.property_by_slug(text) to anon, authenticated;

-- ── upsert_property: accept annual_tax / annual_insurance ────────────────────
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
      price, beds, baths, sqft, lot_sqft, year_built, hoa, annual_tax, annual_insurance, address, hood, city, location,
      photos, feats, policies, rental, open_house, status, published_at)
    values (auth.uid(), v_biz, v_slug,
      coalesce(p->>'deal', 'renta'), coalesce(p->>'ptype', 'casa'),
      coalesce(nullif(trim(p->>'title'), ''), 'Propiedad'),
      p->>'desc_es', coalesce(p->>'desc_en', p->>'desc_es'),
      coalesce(nullif(p->>'price', '')::numeric, 0),
      nullif(p->>'beds', '')::integer, nullif(p->>'baths', '')::numeric,
      nullif(p->>'sqft', '')::integer, nullif(p->>'lot_sqft', '')::integer,
      nullif(p->>'year_built', '')::integer, nullif(p->>'hoa', '')::numeric,
      nullif(p->>'annual_tax', '')::numeric, nullif(p->>'annual_insurance', '')::numeric,
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
      annual_tax = case when p ? 'annual_tax' then nullif(p->>'annual_tax', '')::numeric else pr.annual_tax end,
      annual_insurance = case when p ? 'annual_insurance' then nullif(p->>'annual_insurance', '')::numeric else pr.annual_insurance end,
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

-- ── upsert helper the edge function calls (service role) ─────────────────────
create or replace function public.set_market_rate(in_term integer, in_rate numeric, in_as_of date, in_source text)
returns void language sql security definer set search_path = public as $$
  insert into public.market_rates (term, rate, as_of, source, updated_at)
  values (in_term, round(in_rate, 3), in_as_of, coalesce(in_source, 'Freddie Mac PMMS (FRED)'), now())
  on conflict (term) do update set rate = excluded.rate, as_of = excluded.as_of,
    source = excluded.source, updated_at = now();
$$;
revoke all on function public.set_market_rate(integer, numeric, date, text) from public, anon, authenticated;
grant execute on function public.set_market_rate(integer, numeric, date, text) to service_role;
