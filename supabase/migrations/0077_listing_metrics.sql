-- 0077_listing_metrics.sql — discovery metrics for the business dashboard.
--
-- The founder's core value prop: Latinos can FIND these businesses. So a listing
-- owner must see how many people view their page. Every view counts (no per-user
-- dedup — "cada vista cuenta"), but we store a DAILY ROLLUP per business, not one
-- row per view — bounded at businesses × days × kinds, so it holds at 1M+/mo.
--
--   business_metric_daily : (business_id, day, kind) → count
--   track_listing_view()  : +1 for a (slug, kind) today. SECURITY DEFINER so an
--                           anonymous visitor can record a view without any table
--                           write grant. `kind` is extensible (view/search/
--                           direction/save…); only 'view' is wired today.
--   business_metrics()    : the owner reads their own last-N-days rollup.
--
-- Idempotent. Bot/rate filtering and owner-self-view exclusion are deferred
-- (see docs/LAUNCH-CHECKLIST.md).

create table if not exists public.business_metric_daily (
  business_id uuid not null references public.businesses(id) on delete cascade,
  day date not null default current_date,
  kind text not null default 'view',
  count integer not null default 0,
  primary key (business_id, day, kind)
);
create index if not exists idx_bmd_biz_day on public.business_metric_daily (business_id, day desc);

alter table public.business_metric_daily enable row level security;

-- Only the owner can read their business's metrics (writes go through the
-- SECURITY DEFINER RPC below, never direct table access).
drop policy if exists bmd_owner_read on public.business_metric_daily;
create policy bmd_owner_read on public.business_metric_daily for select
  using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));

-- Record one view (or other event kind) for a listing, today.
create or replace function public.track_listing_view(in_slug text, in_kind text default 'view')
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare bid uuid;
begin
  select id into bid from public.businesses where slug = in_slug limit 1;
  if bid is null then return; end if;
  insert into public.business_metric_daily (business_id, day, kind, count)
  values (bid, current_date, coalesce(nullif(in_kind, ''), 'view'), 1)
  on conflict (business_id, day, kind)
  do update set count = business_metric_daily.count + 1;
end;
$function$;
grant execute on function public.track_listing_view(text, text) to anon, authenticated;

-- Owner-facing read: the last N days of metrics for their own listing.
create or replace function public.business_metrics(in_slug text, in_days integer default 30)
returns table(day date, kind text, count integer)
language sql
stable
security definer
set search_path = public
as $function$
  select d.day, d.kind, d.count
  from public.business_metric_daily d
  join public.businesses b on b.id = d.business_id
  where b.slug = in_slug
    and b.owner_id = auth.uid()
    and d.day >= current_date - (greatest(in_days, 1) - 1)
  order by d.day;
$function$;
grant execute on function public.business_metrics(text, integer) to authenticated;

notify pgrst, 'reload schema';
