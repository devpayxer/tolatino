-- 0079_search_and_timezone.sql — close the discovery-metrics pendientes:
--   (1) search appearances ('search' kind), (2) business-timezone rollups.
--
-- WHY
--   • Google-Business "Searches" = how often you showed up when people searched.
--     We record ONE 'search' appearance per business per search event, in a single
--     BATCHED call (track_search_appearance) so a results page of 40 businesses is
--     one round-trip + one bulk upsert — scalable at 1M+/mo, not 40 RPCs.
--   • Timezone: 0077/0078 bucketed by the server's current_date (UTC), but the
--     owner reads the bars in THEIR local day. A late-night view could land a day
--     off. Fix: roll up in the BUSINESS's timezone so the stored day = the owner's
--     local day, and the dashboard windows line up exactly.
--
-- Owner self-actions stay excluded (0078). Idempotent.

-- 1) business timezone (IANA). Default to Central (our Houston fixture world);
--    the owner can set their real zone later. coalesce() keeps old NULL rows safe.
alter table public.businesses add column if not exists timezone text default 'America/Chicago';

-- 2) page views / customer actions — now bucketed by the business's local day.
create or replace function public.track_listing_view(in_slug text, in_kind text default 'view')
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare bid uuid; bowner uuid; btz text;
begin
  select id, owner_id, coalesce(timezone, 'America/Chicago')
    into bid, bowner, btz
    from public.businesses where slug = in_slug limit 1;
  if bid is null then return; end if;
  -- Don't count the owner's own visits/actions on their listing (self-view noise).
  if bowner is not null and bowner = auth.uid() then return; end if;
  insert into public.business_metric_daily (business_id, day, kind, count)
  values (bid, (now() at time zone btz)::date, coalesce(nullif(in_kind, ''), 'view'), 1)
  on conflict (business_id, day, kind)
  do update set count = business_metric_daily.count + 1;
end;
$function$;
grant execute on function public.track_listing_view(text, text) to anon, authenticated;

-- 3) search appearances — batched: +1 'search' for every business shown in a
--    search/browse result set, in one statement. Owner-owned listings excluded.
--    Joining businesses collapses duplicate slugs to one row per business, so the
--    ON CONFLICT never hits the same (business,day,kind) twice in one statement.
create or replace function public.track_search_appearance(in_slugs text[])
returns void
language plpgsql
security definer
set search_path = public
as $function$
begin
  if in_slugs is null or array_length(in_slugs, 1) is null then return; end if;
  insert into public.business_metric_daily (business_id, day, kind, count)
  select b.id, (now() at time zone coalesce(b.timezone, 'America/Chicago'))::date, 'search', 1
  from public.businesses b
  where b.slug = any(in_slugs)
    and (b.owner_id is null or b.owner_id <> auth.uid())
  on conflict (business_id, day, kind)
  do update set count = business_metric_daily.count + 1;
end;
$function$;
grant execute on function public.track_search_appearance(text[]) to anon, authenticated;

-- 4) owner read — window now anchored to the business's local "today".
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
    and d.day >= (now() at time zone coalesce(b.timezone, 'America/Chicago'))::date - (greatest(in_days, 1) - 1)
  order by d.day;
$function$;
grant execute on function public.business_metrics(text, integer) to authenticated;

notify pgrst, 'reload schema';
